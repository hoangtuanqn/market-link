package com.techx.intervue.modules.user.services.interfaces;

public interface RefreshTokenServiceInterface {
    public String generateRefreshTokenRaw();

    public IssuedToken issueRefreshToken(Long userId, boolean rememberMe);

    public RefreshResult rotateToken(String rawToken);

    public void revokeToken(String rawToken, Long userId);

    public record RefreshResult(Long userId, String newRefreshToken, boolean rememberMe) {}

    public record IssuedToken(String rawToken, Long tokenId) {}
}
