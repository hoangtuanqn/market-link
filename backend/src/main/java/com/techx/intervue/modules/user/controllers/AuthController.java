package com.techx.intervue.modules.user.controllers;

import com.techx.intervue.config.AuthConfig;
import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.filters.JwtAuthFilter;
import com.techx.intervue.helpers.CookieHelper;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import com.techx.intervue.modules.user.requests.CustomerRegisterRequest;
import com.techx.intervue.modules.user.requests.ForgotPasswordRequest;
import com.techx.intervue.modules.user.requests.LoginRequest;
import com.techx.intervue.modules.user.requests.ResetPasswordRequest;
import com.techx.intervue.modules.user.requests.SetPasswordRequest;
import com.techx.intervue.modules.user.requests.SocialLoginRequest;
import com.techx.intervue.modules.user.requests.UpdateProfileRequest;
import com.techx.intervue.modules.user.requests.VerifyResetTokenRequest;
import com.techx.intervue.modules.user.resources.AuthResult;
import com.techx.intervue.modules.user.resources.AuthorizeUrlResource;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import com.techx.intervue.modules.user.resources.LoginResource;
import com.techx.intervue.modules.user.resources.RefreshResource;
import com.techx.intervue.modules.user.resources.RegisterResource;
import com.techx.intervue.modules.user.resources.ResetTokenResource;
import com.techx.intervue.modules.user.resources.UserResource;
import com.techx.intervue.modules.user.services.impl.FacebookOAuthClient;
import com.techx.intervue.modules.user.services.impl.GoogleOAuthClient;
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
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/v1/auth")
@AllArgsConstructor
public class AuthController extends BaseController {

    private final UserServiceInterface userService;
    private final PasswordResetServiceInterface passwordResetService;
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
                        auth.refreshToken(),
                        Duration.ofDays(authConfig.getRefreshTokenTTLDays()),
                        auth.rememberMe());

        RegisterResource body = new RegisterResource(auth.accessToken(), auth.user());
        return ResponseEntity.status(HttpStatus.CREATED)
                .header(HttpHeaders.SET_COOKIE, refreshCookie.toString())
                .body(ApiResource.success(body, "Account created."));
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
    /**
     * Bước 1 của đăng nhập Google: trả URL trang đăng nhập Google. state (chuỗi ngẫu nhiên FE sinh
     * và giữ lại) được gắn vào URL, Google trả nguyên về trang callback để FE so khớp.
     */
    @GetMapping("/google/authorize-url")
    public ResponseEntity<ApiResource<AuthorizeUrlResource>> googleAuthorizeUrl(
            @RequestParam(required = false) String state) {
        if (!StringUtils.hasText(state) || state.length() > 128) {
            throw new InvalidFieldException("state", "State is missing or too long.");
        }
        return ok(
                new AuthorizeUrlResource(googleClient.authorizeUrl(state)),
                "Redirecting to Google.");
    }

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
                        auth.refreshToken(),
                        Duration.ofDays(authConfig.getRefreshTokenTTLDays()),
                        auth.rememberMe());

        LoginResource body = new LoginResource(auth.accessToken(), auth.user());
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookie.toString())
                .body(ApiResource.success(body, "Signed in."));
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
                .body(ApiResource.success(null, "Signed out."));
    }

    /**
     * FR-003: gọi khi access token hết hạn. Refresh token chỉ đọc từ cookie HttpOnly (không nhận
     * qua body), trả access token mới và ghi đè cookie bằng refresh token mới.
     */
    /**
     * Đặt mật khẩu lần đầu sau khi đăng nhập Google/Facebook (user.hasPassword = false). Cần access
     * token; tài khoản đã có mật khẩu → 409 PASSWORD_ALREADY_SET.
     */
    @PostMapping("/set-password")
    public ResponseEntity<ApiResource<Void>> setPassword(
            @AuthenticationPrincipal CustomUserDetails user,
            @Valid @RequestBody SetPasswordRequest request) {
        userService.setPassword(user.getId(), request);
        return ok(null, "Password saved. You can now also sign in with your email.");
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResource<RefreshResource>> refresh(
            @CookieValue(name = CookieHelper.REFRESH_TOKEN_COOKIE, required = false)
                    String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new BadCredentialsException("Your session has expired. Please sign in again.");
        }
        AuthResult auth = userService.refresh(refreshToken);
        ResponseCookie refreshCookie =
                CookieHelper.buildRefreshTokenCookie(
                        auth.refreshToken(),
                        Duration.ofDays(authConfig.getRefreshTokenTTLDays()),
                        auth.rememberMe());

        RefreshResource body = new RefreshResource(auth.accessToken(), auth.user());
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookie.toString())
                .body(ApiResource.success(body, "Session refreshed."));
    }

    /**
     * FR-007 bước A: luôn trả cùng một câu dù email có tồn tại hay không, kể cả khi đã vượt giới
     * hạn 5 lần/giờ. Tạo token và gửi mail chạy ngầm qua hàng đợi Redis.
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResource<Void>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request) {
        passwordResetService.requestReset(request.email());
        return ok(null, "If that email is registered, you will receive a password reset link.");
    }

    /**
     * FR-007 bước C (trước khi hiện form): kiểm tra link còn dùng được và trả email của tài khoản.
     * Chỉ đọc token, không xoá — token vẫn dùng được cho /reset-password.
     */
    @PostMapping("/reset-password/verify")
    public ResponseEntity<ApiResource<ResetTokenResource>> verifyResetToken(
            @Valid @RequestBody VerifyResetTokenRequest request) {
        String email = passwordResetService.verifyToken(request.token());
        return ResponseEntity.ok()
                .header("Referrer-Policy", "no-referrer")
                .body(ApiResource.success(new ResetTokenResource(email), "This link is valid."));
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
                                null, "Your password has been reset. Please sign in again."));
    }

    /** Hồ sơ của chính user đang đăng nhập (trang Account). */
    @GetMapping("/me")
    public ResponseEntity<ApiResource<UserResource>> me(
            @AuthenticationPrincipal CustomUserDetails user) {
        return ok(userService.getProfile(user.getId()), "Profile loaded.");
    }

    /**
     * Sửa họ tên, số điện thoại, địa chỉ của chính mình — id lấy từ access token nên không sửa được
     * tài khoản khác (R-06). Email không đổi được ở đây.
     */
    @PutMapping("/me")
    public ResponseEntity<ApiResource<UserResource>> updateMe(
            @AuthenticationPrincipal CustomUserDetails user,
            @Valid @RequestBody UpdateProfileRequest request) {
        return ok(userService.updateProfile(user.getId(), request), "Your details are saved.");
    }
}
