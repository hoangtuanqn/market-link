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
    /**
     * Two tabs refresh with one cookie: the request that arrives later sees the token was just
     * rotated. Within this window only reject, do not treat it as theft (do not revoke all of the
     * user's tokens).
     */
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
                        .tokenHash(tokenHash) // hashed token
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

    /**
     * FR-003: exchange the old refresh token for a new one (rotation). Reusing an old token →
     * treated as stolen, revoke all of the user's tokens. dontRollbackOn so that revocation is not
     * rolled back with the exception.
     */
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

    /**
     * FR-006: revoke the refresh token on logout. Only revoke the token of that user themself
     * (R-06). A token that does not exist or is already revoked is skipped so calling logout
     * several times still succeeds.
     */
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
            // revoke every refresh token of the user
            repository.revokeAllRefreshTokenByUser(entity.getUserId());
            log.error("Refresh token reuse detected, revoked all tokens of the user.");
            throw new BadCredentialsException("Refresh token is not valid.");
        }
    }

    /** A token revoked by rotation (not by logout) and just rotated. */
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
