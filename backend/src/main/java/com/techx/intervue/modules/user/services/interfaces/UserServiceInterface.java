package com.techx.intervue.modules.user.services.interfaces;

import com.techx.intervue.modules.user.requests.CustomerRegisterRequest;
import com.techx.intervue.modules.user.requests.LoginRequest;
import com.techx.intervue.modules.user.requests.UpdateProfileRequest;
import com.techx.intervue.modules.user.resources.AuthResult;
import com.techx.intervue.modules.user.resources.SocialProfile;
import com.techx.intervue.modules.user.resources.UserResource;

public interface UserServiceInterface {
    AuthResult authenticate(LoginRequest request);

    AuthResult registerCustomer(CustomerRegisterRequest request);

    void logout(Long userId, String accessToken, String refreshToken);

    AuthResult refresh(String rawRefreshToken);

    AuthResult loginWithSocial(SocialProfile profile);

    /** Thông tin của chính user đang đăng nhập (GET /auth/me). */
    UserResource getProfile(Long userId);

    /** Cập nhật họ tên, số điện thoại, địa chỉ của chính user đang đăng nhập (PUT /auth/me). */
    UserResource updateProfile(Long userId, UpdateProfileRequest request);

    // Optional<User> findById(Long userId);

    // Optional<User> findByEmail(String email);

    // UserResource getMe(Long userId);
}
