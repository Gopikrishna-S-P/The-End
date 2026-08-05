package com.recoverpro.server.security.jwt;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Component
public class JwtTokenProvider {

    private final SecretKey signingKey;
    private final long accessTokenExpiryMs;

    private static final String KNOWN_PLACEHOLDER_SECRET = "change-me-in-production-min-256-bits";
    private static final int MIN_SECRET_BITS = 256;

    public JwtTokenProvider(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.access-token-expiry-ms}") long accessTokenExpiryMs) {
        validateSecret(secret);
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessTokenExpiryMs = accessTokenExpiryMs;
    }

    private static void validateSecret(String secret) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException(
                    "app.jwt.secret (JWT_SECRET) is not set. Refusing to start: JWTs cannot be signed "
                            + "without a secret.");
        }
        if (KNOWN_PLACEHOLDER_SECRET.equals(secret)) {
            throw new IllegalStateException(
                    "app.jwt.secret (JWT_SECRET) is set to the well-known placeholder value. Refusing to "
                            + "start: this value is public and produces forgeable tokens.");
        }
        int bits = secret.getBytes(StandardCharsets.UTF_8).length * 8;
        if (bits < MIN_SECRET_BITS) {
            throw new IllegalStateException(
                    "app.jwt.secret (JWT_SECRET) is only " + bits + " bits; at least " + MIN_SECRET_BITS
                            + " bits are required.");
        }
    }

    public String generateAccessToken(UserDetails userDetails, UUID userId) {
        List<String> roles = userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .filter(a -> a.startsWith("ROLE_"))
                .collect(Collectors.toList());

        List<String> permissions = userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .filter(a -> !a.startsWith("ROLE_"))
                .collect(Collectors.toList());

        Date now = new Date();
        return Jwts.builder()
                .subject(userDetails.getUsername())
                .claim("userId", userId.toString())
                .claim("roles", roles)
                .claim("permissions", permissions)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + accessTokenExpiryMs))
                .signWith(signingKey)
                .compact();
    }

    public String extractUsername(String token) {
        return parseClaims(token).getSubject();
    }

    public UUID extractUserId(String token) {
        return UUID.fromString(parseClaims(token).get("userId", String.class));
    }

    @SuppressWarnings("unchecked")
    public List<String> extractRoles(String token) {
        return (List<String>) parseClaims(token).get("roles", List.class);
    }

    public Date extractExpiration(String token) {
        return parseClaims(token).getExpiration();
    }

    public boolean validateToken(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (ExpiredJwtException e)      { log.debug("JWT expired"); }
        catch (UnsupportedJwtException e)    { log.warn("Unsupported JWT"); }
        catch (MalformedJwtException e)      { log.warn("Malformed JWT"); }
        catch (SecurityException e)          { log.warn("Invalid JWT signature"); }
        catch (IllegalArgumentException e)   { log.warn("Empty JWT claims"); }
        return false;
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
