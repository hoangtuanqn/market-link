package com.techx.intervue.modules.user.services.interfaces;

public interface RefreshTokenServiceInterface {
    public String generateRefreshTokenRaw();

    public IssuedToken issueRefreshToken(Long userId);

    public RefreshResult rotateToken(String rawToken);

    public void revokeToken(String rawToken, Long userId);

    public record RefreshResult(Long userId, String newRefreshToken) {}

    public record IssuedToken(String rawToken, Long tokenId) {}
}
