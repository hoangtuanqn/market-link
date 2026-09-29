package com.techx.intervue.modules.user.services.interfaces;

import com.techx.intervue.modules.user.requests.ResetPasswordRequest;
import java.util.Optional;

public interface PasswordResetServiceInterface {
    void requestReset(String email, String clientIp);

    Optional<IssuedResetToken> issueToken(String email);

    String verifyToken(String rawToken);

    void resetPassword(ResetPasswordRequest request);

    record IssuedResetToken(String email, String fullName, String rawToken) {}
}
