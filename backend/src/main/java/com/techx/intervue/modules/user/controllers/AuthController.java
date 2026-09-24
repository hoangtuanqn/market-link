package com.techx.intervue.modules.user.controllers;

import com.techx.intervue.config.AuthConfig;
import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.filters.JwtAuthFilter;
import com.techx.intervue.helpers.CookieHelper;
import com.techx.intervue.modules.user.requests.CustomerRegisterRequest;
import com.techx.intervue.modules.user.requests.ForgotPasswordRequest;
import com.techx.intervue.modules.user.requests.LoginRequest;
import com.techx.intervue.modules.user.requests.ResetPasswordRequest;
import com.techx.intervue.modules.user.resources.AuthResult;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import com.techx.intervue.modules.user.resources.LoginResource;
import com.techx.intervue.modules.user.resources.RefreshResource;
import com.techx.intervue.modules.user.resources.RegisterResource;
import com.techx.intervue.modules.user.services.interfaces.PasswordResetServiceInterface;
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
    private final PasswordResetServiceInterface passwordResetService;
    private final AuthConfig authConfig;

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
        AuthResult auth = userService.authenticate(request);
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

    /**
     * FR-007 bước A: luôn trả cùng một câu dù email có tồn tại hay không, kể cả khi đã vượt giới
     * hạn 5 lần/giờ. Tạo token và gửi mail chạy ngầm qua hàng đợi Redis.
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResource<Void>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request) {
        passwordResetService.requestReset(request.email());
        return ok(null, "Nếu email tồn tại, bạn sẽ nhận được link đặt lại mật khẩu.");
    }

    /**
     * FR-007 bước C + D: token dùng một lần. Đổi xong thì mọi phiên đăng nhập cũ bị huỷ, FE chuyển
     * về trang đăng nhập.
     */
    @PostMapping("/reset-password")
    public ResponseEntity<ApiResource<Void>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {
        passwordResetService.resetPassword(request);
        return ResponseEntity.ok()
                .header("Referrer-Policy", "no-referrer")
                .body(
                        ApiResource.success(
                                null, "Đặt lại mật khẩu thành công, vui lòng đăng nhập lại!"));
    }
}
