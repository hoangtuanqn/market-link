package com.techx.intervue.modules.user.services.interfaces;

import com.techx.intervue.modules.user.requests.ChangePasswordRequest;
import com.techx.intervue.modules.user.requests.CustomerRegisterRequest;
import com.techx.intervue.modules.user.requests.LoginRequest;
import com.techx.intervue.modules.user.requests.SetPasswordRequest;
import com.techx.intervue.modules.user.requests.UpdateProfileRequest;
import com.techx.intervue.modules.user.resources.AuthResult;
import com.techx.intervue.modules.user.resources.SocialProfile;
import com.techx.intervue.modules.user.resources.UserResource;

public interface UserServiceInterface {
    AuthResult authenticate(LoginRequest request);

    /** FR-008: step 2 of admin sign-in with two-step verification on. */
    AuthResult completeMfaLogin(String mfaToken, String code, String recoveryCode);

    AuthResult registerCustomer(CustomerRegisterRequest request);

    void logout(Long userId, String accessToken, String refreshToken);

    AuthResult refresh(String rawRefreshToken);

    AuthResult loginWithSocial(SocialProfile profile);

    /**
     * Set a password for the first time for an account with no password (created through Google).
     */
    void setPassword(Long userId, SetPasswordRequest request);

    /** Change the password (needs the current password), then sign out of every device. */
    void changePassword(Long userId, ChangePasswordRequest request);

    /** Information about the signed-in user themself (GET /auth/me). */
    UserResource getProfile(Long userId);

    /**
     * Update the full name, phone number, address of the signed-in user themself (PUT /auth/me).
     */
    UserResource updateProfile(Long userId, UpdateProfileRequest request);

    // Optional<User> findById(Long userId);

    // Optional<User> findByEmail(String email);

    // UserResource getMe(Long userId);
}
