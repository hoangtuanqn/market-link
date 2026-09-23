package com.techx.intervue.modules.user.controllers;

import com.techx.intervue.config.AuthConfig;
import com.techx.intervue.modules.helpers.CookieHelper;
import com.techx.intervue.modules.helpers.IpHelper;
import com.techx.intervue.modules.user.requests.RegisterRequest;
import com.techx.intervue.modules.user.resources.AuthResult;
import com.techx.intervue.modules.user.resources.RegisterResource;
import com.techx.intervue.modules.user.services.impl.UserService;
import com.techx.intervue.resources.ApiResource;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.time.Duration;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/v1/auth")
@AllArgsConstructor
public class AuthController {

    private final UserService userService;
    private final AuthConfig authConfig;

    @PostMapping("/register")
    public ResponseEntity<ApiResource<RegisterResource>> login(
            @Valid @RequestBody RegisterRequest request, HttpServletRequest req) {
        AuthResult auth = userService.register(request, IpHelper.getClientIp(req));
        ResponseCookie refreshCookie =
                CookieHelper.buildRefreshTokenCookie(
                        auth.refreshToken(), Duration.ofDays(authConfig.getRefreshTokenTTLDays()));

        RegisterResource body = new RegisterResource(auth.accessToken(), auth.user());
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookie.toString())
                .body(ApiResource.success(body, "Register account successfully!"));
    }
}
