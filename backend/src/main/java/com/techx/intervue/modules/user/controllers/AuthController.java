package com.techx.intervue.modules.user.controllers;

import com.techx.intervue.config.AuthConfig;
import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.filters.JwtAuthFilter;
import com.techx.intervue.helpers.CookieHelper;
import com.techx.intervue.helpers.IpHelper;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import com.techx.intervue.modules.user.requests.ChangePasswordRequest;
import com.techx.intervue.modules.user.requests.CustomerRegisterRequest;
import com.techx.intervue.modules.user.requests.ForgotPasswordRequest;
import com.techx.intervue.modules.user.requests.LoginRequest;
import com.techx.intervue.modules.user.requests.MfaVerifyRequest;
import com.techx.intervue.modules.user.requests.ResetPasswordRequest;
import com.techx.intervue.modules.user.requests.SetPasswordRequest;
import com.techx.intervue.modules.user.requests.SignupResendRequest;
import com.techx.intervue.modules.user.requests.SignupVerifyRequest;
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
import com.techx.intervue.modules.user.resources.SignupStartedResource;
import com.techx.intervue.modules.user.resources.UserResource;
import com.techx.intervue.modules.user.services.impl.GoogleOAuthClient;
import com.techx.intervue.modules.user.services.impl.LoginRateLimiter;
import com.techx.intervue.modules.user.services.interfaces.EmailVerificationServiceInterface;
import com.techx.intervue.modules.user.services.interfaces.PasswordResetServiceInterface;
import com.techx.intervue.modules.user.services.interfaces.UserServiceInterface;
import com.techx.intervue.resources.ApiResource;
import jakarta.servlet.http.HttpServletRequest;
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
    private final EmailVerificationServiceInterface emailVerification;
    private final LoginRateLimiter loginRateLimiter;

    @PostMapping("/register")
    public ResponseEntity<ApiResource<SignupStartedResource>> registerCustomer(
            @Valid @RequestBody CustomerRegisterRequest request, HttpServletRequest httpRequest) {
        SignupStartedResource started =
                userService.registerCustomer(request, IpHelper.getClientIp(httpRequest));
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(ApiResource.success(started, "We sent a 6-digit code to your email."));
    }

    @PostMapping("/register/verify")
    public ResponseEntity<ApiResource<RegisterResource>> verifySignup(
            @Valid @RequestBody SignupVerifyRequest request) {
        AuthResult auth =
                userService.completeSignup(request.email(), request.code(), request.signupToken());
        ResponseCookie refreshCookie =
                CookieHelper.buildRefreshTokenCookie(
                        auth.refreshToken(),
                        Duration.ofDays(authConfig.getRefreshTokenTTLDays()),
                        auth.rememberMe(),
                        authConfig.isCookieSecure());
        RegisterResource body = new RegisterResource(auth.accessToken(), auth.user());
        return ResponseEntity.status(HttpStatus.CREATED)
                .header(HttpHeaders.SET_COOKIE, refreshCookie.toString())
                .body(ApiResource.success(body, "Account created."));
    }

    @PostMapping("/register/resend")
    public ResponseEntity<ApiResource<SignupStartedResource>> resendSignupCode(
            @Valid @RequestBody SignupResendRequest request, HttpServletRequest httpRequest) {
        return ok(
                emailVerification.resend(
                        request.email(), request.signupToken(), IpHelper.getClientIp(httpRequest)),
                "We sent a new code to your email.");
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResource<LoginResource>> login(
            @Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        String clientIp = IpHelper.getClientIp(httpRequest);
        loginRateLimiter.ensureAllowed(request.email(), clientIp);
        AuthResult auth;
        try {
            auth = userService.authenticate(request);
        } catch (BadCredentialsException e) {
            loginRateLimiter.recordFailure(request.email(), clientIp);
            throw e;
        }
        loginRateLimiter.reset(request.email());
        return loggedIn(auth);
    }

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

    @PostMapping("/mfa/verify")
    public ResponseEntity<ApiResource<LoginResource>> verifyMfa(
            @Valid @RequestBody MfaVerifyRequest request) {
        return loggedIn(
                userService.completeMfaLogin(
                        request.mfaToken(), request.code(), request.recoveryCode()));
    }

    private ResponseEntity<ApiResource<LoginResource>> loggedIn(AuthResult auth) {
        if (auth.mfaRequired()) {
            LoginResource pending = new LoginResource(null, auth.user(), true, auth.mfaToken());
            return ok(pending, "Enter the code from your authenticator.");
        }
        ResponseCookie refreshCookie =
                CookieHelper.buildRefreshTokenCookie(
                        auth.refreshToken(),
                        Duration.ofDays(authConfig.getRefreshTokenTTLDays()),
                        auth.rememberMe(),
                        authConfig.isCookieSecure());

        LoginResource body =
                new LoginResource(
                        auth.accessToken(), auth.user(), false, null, auth.mfaSetupRequired());
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookie.toString())
                .body(ApiResource.success(body, "Signed in."));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResource<Void>> logout(
            @AuthenticationPrincipal CustomUserDetails user,
            @RequestAttribute(JwtAuthFilter.TOKEN_ATTRIBUTE) String accessToken,
            @CookieValue(name = CookieHelper.REFRESH_TOKEN_COOKIE, required = false)
                    String refreshToken) {
        userService.logout(user.getId(), accessToken, refreshToken);
        ResponseCookie clearCookie =
                CookieHelper.buildRefreshTokenCookie(
                        "", Duration.ZERO, authConfig.isCookieSecure());
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, clearCookie.toString())
                .body(ApiResource.success(null, "Signed out."));
    }

    @PostMapping("/set-password")
    public ResponseEntity<ApiResource<Void>> setPassword(
            @AuthenticationPrincipal CustomUserDetails user,
            @Valid @RequestBody SetPasswordRequest request) {
        userService.setPassword(user.getId(), request);
        return ok(null, "Password saved. You can now also sign in with your email.");
    }

    @PostMapping("/change-password")
    public ResponseEntity<ApiResource<Void>> changePassword(
            @AuthenticationPrincipal CustomUserDetails user,
            @Valid @RequestBody ChangePasswordRequest request) {
        userService.changePassword(user.getId(), request);
        ResponseCookie clearCookie =
                CookieHelper.buildRefreshTokenCookie(
                        "", Duration.ZERO, authConfig.isCookieSecure());
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, clearCookie.toString())
                .body(
                        ApiResource.success(
                                null, "Your password has been changed. Please sign in again."));
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
                        auth.rememberMe(),
                        authConfig.isCookieSecure());

        RefreshResource body = new RefreshResource(auth.accessToken(), auth.user());
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookie.toString())
                .body(ApiResource.success(body, "Session refreshed."));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResource<Void>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request, HttpServletRequest httpRequest) {
        passwordResetService.requestReset(request.email(), IpHelper.getClientIp(httpRequest));
        return ok(null, "If that email is registered, you will receive a password reset link.");
    }

    @PostMapping("/reset-password/verify")
    public ResponseEntity<ApiResource<ResetTokenResource>> verifyResetToken(
            @Valid @RequestBody VerifyResetTokenRequest request) {
        String email = passwordResetService.verifyToken(request.token());
        return ResponseEntity.ok()
                .header("Referrer-Policy", "no-referrer")
                .body(ApiResource.success(new ResetTokenResource(email), "This link is valid."));
    }

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

    @GetMapping("/me")
    public ResponseEntity<ApiResource<UserResource>> me(
            @AuthenticationPrincipal CustomUserDetails user) {
        return ok(userService.getProfile(user.getId()), "Profile loaded.");
    }

    @PutMapping("/me")
    public ResponseEntity<ApiResource<UserResource>> updateMe(
            @AuthenticationPrincipal CustomUserDetails user,
            @Valid @RequestBody UpdateProfileRequest request) {
        return ok(userService.updateProfile(user.getId(), request), "Your details are saved.");
    }
}
