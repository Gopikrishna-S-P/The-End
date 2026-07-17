package com.recoverpro.server.service.security;

import com.recoverpro.server.entity.RefreshToken;
import com.recoverpro.server.repository.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
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

            List<RefreshToken> recent = refreshTokenRepository.findByUser_IdAndRevokedFalse(userId);
            RefreshToken last = recent.stream()
                    .filter(t -> t.getCreatedAt() != null)
                    .max(Comparator.comparing(RefreshToken::getCreatedAt))
                    .orElse(null);

            if (last == null) return issuing;

            if (issuing.getGeoCountry() != null && last.getGeoCountry() != null
                    && !issuing.getGeoCountry().equals(last.getGeoCountry())) {
                Duration delta = Duration.between(last.getCreatedAt(), Instant.now());
                if (delta.toMinutes() <= impossibleTravelWindowMin) {
                    flag(issuing, "impossible-travel: "
                            + last.getGeoCountry() + " -> " + issuing.getGeoCountry()
                            + " in " + delta.toMinutes() + " minutes");
                    return issuing;
                }
            }

            if (deviceId != null && !deviceId.isBlank()) {
                boolean knownDevice = recent.stream().anyMatch(t -> deviceId.equals(t.getDeviceId()));
                if (!knownDevice) {
                    flag(issuing, "new-device fingerprint, OTP step-up recommended");
                }
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
