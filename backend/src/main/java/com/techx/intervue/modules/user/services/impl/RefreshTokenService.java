package com.techx.intervue.modules.user.services.impl;

import com.techx.intervue.config.AuthConfig;
import com.techx.intervue.helpers.TokenHashUtil;
import com.techx.intervue.modules.user.entities.RefreshToken;
import com.techx.intervue.modules.user.repositories.RefreshTokenRepository;
import com.techx.intervue.modules.user.services.interfaces.JwtServiceInterface;
import com.techx.intervue.modules.user.services.interfaces.RefreshTokenServiceInterface;
import jakarta.transaction.Transactional;
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
    private JwtServiceInterface jwtService;
    private RefreshTokenRepository repository;
    private AuthConfig authConfig;
    private TokenHashUtil utils;

    @Override
    public String generateRefreshTokenRaw() {
        return UUID.randomUUID().toString();
    }

    @Override
    public IssuedToken issueRefreshToken(Long userId) {
        String token = this.generateRefreshTokenRaw();
        String tokenHash = utils.hash(token);
        RefreshToken entity =
                RefreshToken.builder()
                        .tokenHash(tokenHash) // token đã hash
                        .userId(userId)
                        .expiryDate(
                                Instant.now()
                                        .plus(authConfig.getRefreshTokenTTLDays(), ChronoUnit.DAYS))
                        .revoked(false)
                        .build();
        repository.save(entity);

        return new IssuedToken(token, entity.getId());
    }

    /**
     * FR-003: đổi refresh token cũ lấy token mới (rotation). Token cũ bị dùng lại → coi như bị đánh
     * cắp, thu hồi toàn bộ token của user. dontRollbackOn để việc thu hồi đó không bị rollback theo
     * exception.
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
        IssuedToken newToken = this.issueRefreshToken(existing.getUserId());
        existing.setReplacedByTokenId(newToken.tokenId());
        repository.save(existing);
        return new RefreshResult(existing.getUserId(), newToken.rawToken());
    }

    /**
     * FR-006: thu hồi refresh token khi logout. Chỉ thu hồi token của chính user đó (R-06). Token
     * không tồn tại hoặc đã thu hồi thì bỏ qua để gọi logout nhiều lần vẫn thành công.
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

    private void checkIsRevoked(RefreshToken entity) {
        if (entity.isRevoked()) {
            // revoked hết tất cả những refresh token của người dùng
            repository.revokeAllRefreshTokenByUser(entity.getUserId());
            log.error("Refresh token reuse detected, revoked all tokens of the user.");
            throw new BadCredentialsException("Refresh token is not valid.");
        }
    }

    private void checkExpiryDate(RefreshToken entity) {
        if (entity.getExpiryDate().isBefore(Instant.now())) {
            throw new BadCredentialsException("Refresh token is not valid.");
        }
    }
}
