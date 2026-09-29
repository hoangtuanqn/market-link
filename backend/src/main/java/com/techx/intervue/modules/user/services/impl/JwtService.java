package com.techx.intervue.modules.user.services.impl;

import com.techx.intervue.config.AuthConfig;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import com.techx.intervue.modules.user.services.interfaces.JwtServiceInterface;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.time.Instant;
import java.util.*;
import java.util.function.Function;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;

@Service
public class JwtService implements JwtServiceInterface {
    private static final String ISSUED_AT_MS = "iat_ms";
    private final Long expirationTime;
    private final String issuer;
    private final SecretKey key;

    public JwtService(AuthConfig authConfig) {
        expirationTime = authConfig.getExpirationTime();
        issuer = authConfig.getIssuer();
        this.key = Keys.hmacShaKeyFor(Base64.getDecoder().decode(authConfig.getSecretKey()));
    }

    @Override
    public String generateToken(Long userId) {
        Date now = new Date();
        Date expiredAt = new Date(now.getTime() + expirationTime);

        return Jwts.builder()
                .subject(userId.toString())
                .claim("jti", UUID.randomUUID().toString())
                .issuer(issuer)
                .issuedAt(now)
                .claim(ISSUED_AT_MS, now.getTime())
                .expiration(expiredAt)
                .signWith(key)
                .compact();
    }

    @Override
    public boolean isTokenValid(String token, CustomUserDetails userDetails) {
        Long userId = extractSubject(token);
        return userId.equals(userDetails.getId()) && !isTokenExpired(token);
    }

    @Override
    public boolean isTokenExpired(String token) {
        Date expiration = extractClaim(token, Claims::getExpiration);
        return expiration.before(new Date());
    }

    @Override
    public Long extractSubject(String token) {
        return Long.valueOf(extractClaim(token, Claims::getSubject));
    }

    @Override
    public String extractJti(String token) {
        Claims claims = extractAllClaims(token);
        return claims.get("jti", String.class);
    }

    @Override
    public Instant extractIssuedAt(String token) {
        Claims claims = extractAllClaims(token);
        Long millis = claims.get(ISSUED_AT_MS, Long.class);
        return millis != null ? Instant.ofEpochMilli(millis) : claims.getIssuedAt().toInstant();
    }

    @Override
    public Map<String, Object> extractRevoke(String token) {
        Claims claims = extractAllClaims(token);
        return Map.of(
                "jti",
                claims.get("jti", String.class),
                "expiresAt",
                claims.getExpiration().toInstant());
    }

    @Override
    public Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith((SecretKey) this.key)
                .requireIssuer(issuer)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }
}
