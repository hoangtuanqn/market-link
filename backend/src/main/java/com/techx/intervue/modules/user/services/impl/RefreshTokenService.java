package com.techx.intervue.modules.user.services.impl;

import com.techx.intervue.config.AuthConfig;
import com.techx.intervue.helpers.TokenHashUtil;
import com.techx.intervue.modules.user.entities.RefreshToken;
import com.techx.intervue.modules.user.repositories.RefreshTokenRepository;
import com.techx.intervue.modules.user.services.interfaces.JwtServiceInterface;
import com.techx.intervue.modules.user.services.interfaces.RefreshTokenServiceInterface;
import jakarta.transaction.Transactional;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;

@Service
@Slf4j
@AllArgsConstructor
public class RefreshTokenService implements RefreshTokenServiceInterface {
    static final Duration ROTATION_GRACE = Duration.ofSeconds(30);

    private JwtServiceInterface jwtService;
    private RefreshTokenRepository repository;
    private AuthConfig authConfig;
    private TokenHashUtil utils;

    @Override
    public String generateRefreshTokenRaw() {
        return UUID.randomUUID().toString();
    }

    @Override
    public IssuedToken issueRefreshToken(Long userId, boolean rememberMe) {
        String token = this.generateRefreshTokenRaw();
        String tokenHash = utils.hash(token);
        RefreshToken entity =
                RefreshToken.builder()
                        .tokenHash(tokenHash)
                        .userId(userId)
                        .expiryDate(
                                Instant.now()
                                        .plus(authConfig.getRefreshTokenTTLDays(), ChronoUnit.DAYS))
                        .revoked(false)
                        .rememberMe(rememberMe)
                        .build();
        repository.save(entity);

        return new IssuedToken(token, entity.getId());
    }

    @Override
    @Transactional(dontRollbackOn = BadCredentialsException.class)
    public RefreshResult rotateToken(String rawToken) {
        RefreshToken existing =
                repository
                        .findByTokenHashForUpdate(utils.hash(rawToken))
                        .orElseThrow(
                                () -> new BadCredentialsException("Refresh token is not valid."));
        this.checkIsRevoked(existing);
        this.checkExpiryDate(existing);
        existing.setRevoked(true);
        IssuedToken newToken =
                this.issueRefreshToken(existing.getUserId(), existing.isRememberMe());
        existing.setReplacedByTokenId(newToken.tokenId());
        repository.save(existing);
        return new RefreshResult(
                existing.getUserId(), newToken.rawToken(), existing.isRememberMe());
    }

    @Override
    @Transactional
    public void revokeToken(String rawToken, Long userId) {
        repository
                .findByTokenHash(utils.hash(rawToken))
                .filter(token -> token.getUserId().equals(userId) && !token.isRevoked())
                .ifPresent(
                        token -> {
                            token.setRevoked(true);
                            repository.save(token);
                        });
    }

    @Override
    public void revokeAllTokens(Long userId) {
        repository.revokeAllRefreshTokenByUser(userId);
    }

    private void checkIsRevoked(RefreshToken entity) {
        if (entity.isRevoked()) {
            if (isJustRotated(entity)) {
                log.warn("Refresh token was just rotated, rejected without revoking the user.");
                throw new BadCredentialsException("Refresh token is not valid.");
            }
            repository.revokeAllRefreshTokenByUser(entity.getUserId());
            log.error("Refresh token reuse detected, revoked all tokens of the user.");
            throw new BadCredentialsException("Refresh token is not valid.");
        }
    }

    private static boolean isJustRotated(RefreshToken entity) {
        return entity.getReplacedByTokenId() != null
                && entity.getUpdatedAt() != null
                && entity.getUpdatedAt().isAfter(Instant.now().minus(ROTATION_GRACE));
    }

    private void checkExpiryDate(RefreshToken entity) {
        if (entity.getExpiryDate().isBefore(Instant.now())) {
            throw new BadCredentialsException("Refresh token is not valid.");
        }
    }
}
