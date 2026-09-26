package com.techx.intervue.modules.user.services.interfaces;

import com.techx.intervue.modules.user.resources.MfaSetupResource;
import com.techx.intervue.modules.user.resources.MfaStatusResource;
import java.util.List;

/** FR-008: TOTP two-step verification for admins. */
public interface MfaServiceInterface {

    /** The person who just passed the password step, waiting to enter the code. */
    record PendingLogin(Long userId, boolean rememberMe) {}

    boolean isEnabled(Long userId);

    /** After the password step: store a pending token in Redis, return the raw token to the FE. */
    String startChallenge(Long userId, boolean rememberMe);

    /**
     * Check the TOTP code or recovery code; if correct, cancel the pending token and return the
     * signed-in person.
     */
    PendingLogin verifyChallenge(String mfaToken, String code, String recoveryCode);

    MfaStatusResource status(Long userId);

    /** Create a new key (not yet on) to scan as a QR. */
    MfaSetupResource setup(Long userId, String email);

    /** Confirm the first code then turn on; returns the recovery codes once. */
    List<String> enable(Long userId, String code);

    void disable(Long userId, String code);

    /**
     * Create 10 new recovery codes (needs the current TOTP code), the old codes become invalid
     * immediately.
     */
    List<String> regenerateRecoveryCodes(Long userId, String code);
}
