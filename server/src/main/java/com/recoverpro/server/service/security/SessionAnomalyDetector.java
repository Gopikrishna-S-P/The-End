package com.recoverpro.server.service.security;

import com.recoverpro.server.entity.RefreshToken;
import com.recoverpro.server.repository.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class SessionAnomalyDetector {

    private final RefreshTokenRepository refreshTokenRepository;
    private final GeoIpResolver geoIpResolver;

    @Value("${app.security.impossible-travel-window-min:30}")
    private int impossibleTravelWindowMin;

    public RefreshToken inspect(RefreshToken issuing, UUID userId,
                                String ipAddress, String userAgent, String deviceId) {
        try {
            issuing.setIpAddress(ipAddress);
            issuing.setUserAgent(userAgent);
            issuing.setDeviceId(deviceId);

            String country = geoIpResolver.resolveCountry(ipAddress);
            if (country != null && !country.isBlank()) {
                issuing.setGeoCountry(country.toUpperCase(Locale.ROOT));
            }

            // Both signals read session HISTORY, not the live (revoked=false) set.
            // Rotation revokes the presenting token before this runs, so the live
            // set is missing the very session being inspected — reading it made
            // every refresh look like a new device for any user with a second
            // active session, firing a platform notification each time.
            RefreshToken last = refreshTokenRepository
                    .findFirstByUser_IdOrderByCreatedAtDesc(userId)
                    .filter(t -> t.getCreatedAt() != null)
                    .orElse(null);

            if (last != null
                    && issuing.getGeoCountry() != null && last.getGeoCountry() != null
                    && !issuing.getGeoCountry().equals(last.getGeoCountry())) {
                Duration delta = Duration.between(last.getCreatedAt(), Instant.now());
                if (delta.toMinutes() <= impossibleTravelWindowMin) {
                    // Travel outranks the device signal — a relocated session is
                    // the more severe finding, so it wins the single reason slot.
                    flag(issuing, "impossible-travel: "
                            + last.getGeoCountry() + " -> " + issuing.getGeoCountry()
                            + " in " + delta.toMinutes() + " minutes");
                    return issuing;
                }
            }

            // Runs even when the user has no prior session at all: a first-ever
            // login from an unknown device is exactly what this should catch, and
            // the old `last == null` early return skipped it.
            if (deviceId != null && !deviceId.isBlank()
                    && !refreshTokenRepository.existsByUser_IdAndDeviceId(userId, deviceId)) {
                flag(issuing, "new-device fingerprint, OTP step-up recommended");
            }

            return issuing;
        } catch (Exception e) {
            log.warn("Session anomaly check failed for user {}: {}", userId, e.getMessage());
            return issuing;
        }
    }

    private void flag(RefreshToken token, String reason) {
        token.setAnomalyFlagged(true);
        token.setAnomalyReason(reason);
        log.warn("Session anomaly: {}", reason);
    }
}
