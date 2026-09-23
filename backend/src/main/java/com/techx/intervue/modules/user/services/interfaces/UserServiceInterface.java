package com.techx.intervue.modules.user.services.interfaces;

import com.techx.intervue.modules.user.requests.RegisterRequest;
import com.techx.intervue.modules.user.resources.AuthResult;

public interface UserServiceInterface {
    // AuthResult authenticate(LoginRequest request);

    AuthResult register(RegisterRequest request, String ip);

    // Optional<User> findById(Long userId);

    // Optional<User> findByEmail(String email);

    // UserResource getMe(Long userId);
}
