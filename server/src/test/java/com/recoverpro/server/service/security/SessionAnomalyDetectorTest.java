package com.recoverpro.server.service.security;

import com.recoverpro.server.entity.RefreshToken;
import com.recoverpro.server.repository.RefreshTokenRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

/**
 * Device recognition must read session HISTORY, not the live (revoked=false) set.
 *
 * Rotation revokes the presenting token before the replacement is inspected, so
 * the live set never contains the device currently authenticating. Reading it
 * flagged every refresh from any user holding a second active session as a
 * brand-new device, and each flag raised a platform-admin notification.
 */
@ExtendWith(MockitoExtension.class)
class SessionAnomalyDetectorTest {

    @Mock private RefreshTokenRepository refreshTokenRepository;
    @Mock private GeoIpResolver geoIpResolver;

    @InjectMocks private SessionAnomalyDetector detector;

    private UUID userId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        ReflectionTestUtils.setField(detector, "impossibleTravelWindowMin", 30);
    }

    private RefreshToken issuing() {
        return RefreshToken.builder().build();
    }

    @Test
    void doesNotFlagDeviceAlreadyPresentInHistory() {
        when(geoIpResolver.resolveCountry(any())).thenReturn(null);
        when(refreshTokenRepository.findFirstByUser_IdOrderByCreatedAtDesc(userId))
                .thenReturn(Optional.of(RefreshToken.builder().createdAt(Instant.now()).build()));
        // The device is known from history even though rotation just revoked its token.
        when(refreshTokenRepository.existsByUser_IdAndDeviceId(userId, "device-A")).thenReturn(true);

        RefreshToken result = detector.inspect(issuing(), userId, "203.0.113.9", "UA", "device-A");

        assertThat(result.isAnomalyFlagged())
                .as("a returning device must not be reported as new on every refresh")
                .isFalse();
    }

    @Test
    void flagsDeviceNeverSeenBefore() {
        when(geoIpResolver.resolveCountry(any())).thenReturn(null);
        when(refreshTokenRepository.findFirstByUser_IdOrderByCreatedAtDesc(userId))
                .thenReturn(Optional.of(RefreshToken.builder().createdAt(Instant.now()).build()));
        when(refreshTokenRepository.existsByUser_IdAndDeviceId(userId, "device-NEW")).thenReturn(false);

        RefreshToken result = detector.inspect(issuing(), userId, "203.0.113.9", "UA", "device-NEW");

        assertThat(result.isAnomalyFlagged()).isTrue();
        assertThat(result.getAnomalyReason()).contains("new-device");
    }

    @Test
    void flagsFirstEverLoginFromUnknownDevice() {
        // No prior session at all. The old `last == null` early return skipped the
        // device check entirely here, so a first-ever login was never challenged.
        when(geoIpResolver.resolveCountry(any())).thenReturn(null);
        when(refreshTokenRepository.findFirstByUser_IdOrderByCreatedAtDesc(userId))
                .thenReturn(Optional.empty());
        when(refreshTokenRepository.existsByUser_IdAndDeviceId(userId, "device-NEW")).thenReturn(false);

        RefreshToken result = detector.inspect(issuing(), userId, "203.0.113.9", "UA", "device-NEW");

        assertThat(result.isAnomalyFlagged()).isTrue();
        assertThat(result.getAnomalyReason()).contains("new-device");
    }

    @Test
    void impossibleTravelOutranksDeviceSignal() {
        when(geoIpResolver.resolveCountry(eq("203.0.113.9"))).thenReturn("US");
        when(refreshTokenRepository.findFirstByUser_IdOrderByCreatedAtDesc(userId))
                .thenReturn(Optional.of(RefreshToken.builder()
                        .geoCountry("IN")
                        .createdAt(Instant.now().minusSeconds(300))
                        .build()));

        RefreshToken result = detector.inspect(issuing(), userId, "203.0.113.9", "UA", "device-NEW");

        assertThat(result.isAnomalyFlagged()).isTrue();
        assertThat(result.getAnomalyReason()).contains("impossible-travel");
    }

    @Test
    void nullDeviceIdIsNeverFlagged() {
        when(geoIpResolver.resolveCountry(any())).thenReturn(null);
        when(refreshTokenRepository.findFirstByUser_IdOrderByCreatedAtDesc(userId))
                .thenReturn(Optional.of(RefreshToken.builder().createdAt(Instant.now()).build()));

        RefreshToken result = detector.inspect(issuing(), userId, "203.0.113.9", "UA", null);

        assertThat(result.isAnomalyFlagged()).isFalse();
    }
}
