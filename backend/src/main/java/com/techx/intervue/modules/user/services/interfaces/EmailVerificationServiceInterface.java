package com.techx.intervue.modules.user.services.interfaces;

import com.techx.intervue.modules.user.resources.IssuedSignupCode;
import com.techx.intervue.modules.user.resources.PendingSignup;
import com.techx.intervue.modules.user.resources.SignupStartedResource;
import com.techx.intervue.modules.user.resources.VerifiedSignup;
import java.util.Optional;

public interface EmailVerificationServiceInterface {

    SignupStartedResource start(PendingSignup pending, String signupToken, String clientIp);

    SignupStartedResource decoy(String email);

    SignupStartedResource resend(String email, String signupToken, String clientIp);

    Optional<IssuedSignupCode> issueCode(String email);

    VerifiedSignup verify(String email, String code, String signupToken);

    void discard(String email);

    void restore(VerifiedSignup verified);
}
