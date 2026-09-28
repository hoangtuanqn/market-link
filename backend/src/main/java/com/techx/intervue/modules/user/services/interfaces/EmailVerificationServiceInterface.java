package com.techx.intervue.modules.user.services.interfaces;

import com.techx.intervue.modules.user.resources.IssuedSignupCode;
import com.techx.intervue.modules.user.resources.PendingSignup;
import com.techx.intervue.modules.user.resources.SignupStartedResource;
import com.techx.intervue.modules.user.resources.VerifiedSignup;
import java.util.Optional;

/** FR-009: the 6-digit code that proves a sign-up owns its email address. */
public interface EmailVerificationServiceInterface {

    /**
     * Park the form and queue a code mail. `signupToken` is the token this browser got the first
     * time (null for a new sign-up): with it the form is corrected in place; without it the form
     * may only replace one waiting for this address after its cooldown, and gets a new token.
     */
    SignupStartedResource start(PendingSignup pending, String signupToken, String clientIp);

    /** The same answer as start, with no side effect: the honeypot field was filled in. */
    SignupStartedResource decoy(String email);

    SignupStartedResource resend(String email, String signupToken, String clientIp);

    /** Worker side: a new code for a sign-up that is still waiting. */
    Optional<IssuedSignupCode> issueCode(String email);

    /** Checks the token and the code; on success the code is used up. */
    VerifiedSignup verify(String email, String code, String signupToken);

    /** The account now exists (or never can): forget the sign-up. */
    void discard(String email);

    /** Saving the account failed: give the code back so the person can try again. */
    void restore(VerifiedSignup verified);
}
