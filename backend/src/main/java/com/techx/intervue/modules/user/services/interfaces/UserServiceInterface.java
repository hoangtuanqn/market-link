package com.techx.intervue.modules.user.services.interfaces;

import com.techx.intervue.modules.user.requests.ChangePasswordRequest;
import com.techx.intervue.modules.user.requests.CustomerRegisterRequest;
import com.techx.intervue.modules.user.requests.LoginRequest;
import com.techx.intervue.modules.user.requests.SetPasswordRequest;
import com.techx.intervue.modules.user.requests.UpdateProfileRequest;
import com.techx.intervue.modules.user.resources.AuthResult;
import com.techx.intervue.modules.user.resources.SignupStartedResource;
import com.techx.intervue.modules.user.resources.SocialProfile;
import com.techx.intervue.modules.user.resources.UserResource;

public interface UserServiceInterface {
    AuthResult authenticate(LoginRequest request);

    AuthResult completeMfaLogin(String mfaToken, String code, String recoveryCode);

    SignupStartedResource registerCustomer(CustomerRegisterRequest request, String clientIp);

    AuthResult completeSignup(String email, String code, String signupToken);

    void logout(Long userId, String accessToken, String refreshToken);

    AuthResult refresh(String rawRefreshToken);

    AuthResult loginWithSocial(SocialProfile profile);

    void setPassword(Long userId, SetPasswordRequest request);

    void changePassword(Long userId, ChangePasswordRequest request);

    AuthResult restartSession(Long userId);

    UserResource getProfile(Long userId);

    UserResource updateProfile(Long userId, UpdateProfileRequest request);
}
