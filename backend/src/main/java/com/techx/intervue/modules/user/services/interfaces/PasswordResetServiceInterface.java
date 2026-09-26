package com.techx.intervue.modules.user.services.interfaces;

import com.techx.intervue.modules.user.requests.ResetPasswordRequest;
import java.util.Optional;

public interface PasswordResetServiceInterface {
    /**
     * Step A: rate limit (by email and by IP) then push the job onto the queue. Does not reveal
     * whether the email exists.
     */
    void requestReset(String email, String clientIp);

    /**
     * Step B (runs in the worker): create a new token for the email, delete the old one. Returns
     * the raw token for the mail, empty if the email does not belong to an active account.
     */
    Optional<IssuedResetToken> issueToken(String email);

    /**
     * Check that the token is still valid without consuming it (GET, not GETDEL) so the FE only
     * shows the form when the link is valid. Returns the account's email; a wrong/expired token
     * throws InvalidResetTokenException.
     */
    String verifyToken(String rawToken);

    /**
     * Steps C + D: change the password with the token, revoke every sign-in session, send a
     * notification email.
     */
    void resetPassword(ResetPasswordRequest request);

    record IssuedResetToken(String email, String fullName, String rawToken) {}
}
