package com.techx.intervue.modules.user.controllers;

import com.techx.intervue.config.AuthConfig;
import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.filters.JwtAuthFilter;
import com.techx.intervue.helpers.CookieHelper;
import com.techx.intervue.modules.user.requests.CustomerRegisterRequest;
import com.techx.intervue.modules.user.requests.LoginRequest;
import com.techx.intervue.modules.user.requests.SocialLoginRequest;
import com.techx.intervue.modules.user.resources.AuthResult;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import com.techx.intervue.modules.user.resources.LoginResource;
import com.techx.intervue.modules.user.resources.RefreshResource;
import com.techx.intervue.modules.user.resources.RegisterResource;
import com.techx.intervue.modules.user.services.impl.FacebookOAuthClient;
import com.techx.intervue.modules.user.services.impl.GoogleOAuthClient;
import com.techx.intervue.modules.user.services.interfaces.UserServiceInterface;
import com.techx.intervue.resources.ApiResource;
import jakarta.validation.Valid;
import java.time.Duration;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/v1/auth")
@AllArgsConstructor
public class AuthController extends BaseController {

    private final UserServiceInterface userService;
    private final AuthConfig authConfig;
    private final GoogleOAuthClient googleClient;
    private final FacebookOAuthClient facebookClient;

    /** FR-001 */
    @PostMapping("/register")
    public ResponseEntity<ApiResource<RegisterResource>> registerCustomer(
            @Valid @RequestBody CustomerRegisterRequest request) {
        AuthResult auth = userService.registerCustomer(request);
        ResponseCookie refreshCookie =
                CookieHelper.buildRefreshTokenCookie(
                        auth.refreshToken(), Duration.ofDays(authConfig.getRefreshTokenTTLDays()));

        RegisterResource body = new RegisterResource(auth.accessToken(), auth.user());
        return ResponseEntity.status(HttpStatus.CREATED)
                .header(HttpHeaders.SET_COOKIE, refreshCookie.toString())
                .body(ApiResource.success(body, "Đăng ký tài khoản thành công!"));
    }

    /** FR-003: dùng chung cho customer, farmer và admin — FE điều hướng theo user.role. */
    @PostMapping("/login")
    public ResponseEntity<ApiResource<LoginResource>> login(
            @Valid @RequestBody LoginRequest request) {
        return loggedIn(userService.authenticate(request));
    }

    /**
     * Đăng nhập Google: FE gửi authorization code (Google redirect về redirect_uri kèm ?code=...).
     * Backend tự đổi code lấy id_token bằng client_secret và verify id_token.
     */
    @PostMapping("/google")
    public ResponseEntity<ApiResource<LoginResource>> loginWithGoogle(
            @Valid @RequestBody SocialLoginRequest request) {
        return loggedIn(userService.loginWithSocial(googleClient.fetchProfile(request.code())));
    }

    /** Đăng nhập Facebook: như Google, backend tự đổi code lấy access token bằng app_secret. */
    @PostMapping("/facebook")
    public ResponseEntity<ApiResource<LoginResource>> loginWithFacebook(
            @Valid @RequestBody SocialLoginRequest request) {
        return loggedIn(userService.loginWithSocial(facebookClient.fetchProfile(request.code())));
    }

    private ResponseEntity<ApiResource<LoginResource>> loggedIn(AuthResult auth) {
        ResponseCookie refreshCookie =
                CookieHelper.buildRefreshTokenCookie(
                        auth.refreshToken(), Duration.ofDays(authConfig.getRefreshTokenTTLDays()));

        LoginResource body = new LoginResource(auth.accessToken(), auth.user());
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookie.toString())
                .body(ApiResource.success(body, "Đăng nhập thành công!"));
    }

    /**
     * FR-006: access token lấy từ header Bearer (JwtAuthFilter đã xác thực), refresh token lấy từ
     * cookie. Trả kèm cookie hết hạn ngay để trình duyệt xoá refresh_token.
     */
    @PostMapping("/logout")
    public ResponseEntity<ApiResource<Void>> logout(
            @AuthenticationPrincipal CustomUserDetails user,
            @RequestAttribute(JwtAuthFilter.TOKEN_ATTRIBUTE) String accessToken,
            @CookieValue(name = CookieHelper.REFRESH_TOKEN_COOKIE, required = false)
                    String refreshToken) {
        userService.logout(user.getId(), accessToken, refreshToken);
        ResponseCookie clearCookie = CookieHelper.buildRefreshTokenCookie("", Duration.ZERO);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, clearCookie.toString())
                .body(ApiResource.success(null, "Đăng xuất thành công!"));
    }

    /**
     * FR-003: gọi khi access token hết hạn. Refresh token chỉ đọc từ cookie HttpOnly (không nhận
     * qua body), trả access token mới và ghi đè cookie bằng refresh token mới.
     */
    @PostMapping("/refresh")
    public ResponseEntity<ApiResource<RefreshResource>> refresh(
            @CookieValue(name = CookieHelper.REFRESH_TOKEN_COOKIE, required = false)
                    String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new BadCredentialsException(
                    "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại!");
        }
        AuthResult auth = userService.refresh(refreshToken);
        ResponseCookie refreshCookie =
                CookieHelper.buildRefreshTokenCookie(
                        auth.refreshToken(), Duration.ofDays(authConfig.getRefreshTokenTTLDays()));

        RefreshResource body = new RefreshResource(auth.accessToken(), auth.user());
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookie.toString())
                .body(ApiResource.success(body, "Làm mới phiên đăng nhập thành công!"));
    }
}
