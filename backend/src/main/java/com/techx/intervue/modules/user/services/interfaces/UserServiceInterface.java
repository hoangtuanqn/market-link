package com.techx.intervue.modules.user.services.interfaces;

import com.techx.intervue.modules.user.requests.CustomerRegisterRequest;
import com.techx.intervue.modules.user.requests.LoginRequest;
import com.techx.intervue.modules.user.requests.SetPasswordRequest;
import com.techx.intervue.modules.user.resources.AuthResult;
import com.techx.intervue.modules.user.resources.SocialProfile;

public interface UserServiceInterface {
    AuthResult authenticate(LoginRequest request);

    AuthResult registerCustomer(CustomerRegisterRequest request);

    void logout(Long userId, String accessToken, String refreshToken);

    AuthResult refresh(String rawRefreshToken);

    AuthResult loginWithSocial(SocialProfile profile);

    /** Đặt mật khẩu lần đầu cho tài khoản chưa có mật khẩu (tạo qua Google/Facebook). */
    void setPassword(Long userId, SetPasswordRequest request);

    // Optional<User> findById(Long userId);

    // Optional<User> findByEmail(String email);

    // UserResource getMe(Long userId);
}
