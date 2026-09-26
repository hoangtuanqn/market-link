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
import com.techx.intervue.modules.user.services.impl.GoogleOAuthClient;
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

    /** FR-003: shared by customer, farmer and admin — the FE routes by user.role. */
    @PostMapping("/login")
    public ResponseEntity<ApiResource<LoginResource>> login(
            @Valid @RequestBody LoginRequest request) {
        return loggedIn(userService.authenticate(request));
    }

    /**
     * Google sign-in: the FE sends the authorization code (Google redirects to redirect_uri with
     * ?code=...). The backend exchanges the code for an id_token itself with client_secret and
     * verifies the id_token.
     */
    /**
     * Step 1 of Google sign-in: returns the URL of the Google sign-in page. state (a random string
     * the FE generates and keeps) is attached to the URL, and Google returns it unchanged to the
     * callback page so the FE can compare it.
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

    /**
     * FR-008: step 2 of admin sign-in with two-step verification on. A correct code → issue the
     * session + cookie like a normal sign-in; wrong → 400 MFA_CODE_INVALID, more than 5 wrong → 429
     * MFA_LOCKED.
     */
    @PostMapping("/mfa/verify")
    public ResponseEntity<ApiResource<LoginResource>> verifyMfa(
            @Valid @RequestBody MfaVerifyRequest request) {
        return loggedIn(
                userService.completeMfaLogin(
                        request.mfaToken(), request.code(), request.recoveryCode()));
    }

    private ResponseEntity<ApiResource<LoginResource>> loggedIn(AuthResult auth) {
        if (auth.mfaRequired()) {
            // no session yet: do not set the cookie, the FE moves to the code entry screen
            LoginResource pending = new LoginResource(null, auth.user(), true, auth.mfaToken());
            return ok(pending, "Enter the code from your authenticator.");
        }
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
     * FR-006: the access token comes from the Bearer header (already authenticated by
     * JwtAuthFilter), the refresh token comes from the cookie. Returns an immediately-expired
     * cookie so the browser deletes refresh_token.
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
     * Set a password for the first time after Google sign-in (user.hasPassword = false). Needs an
     * access token; an account that already has a password → 409 PASSWORD_ALREADY_SET.
     */
    @PostMapping("/set-password")
    public ResponseEntity<ApiResource<Void>> setPassword(
            @AuthenticationPrincipal CustomUserDetails user,
            @Valid @RequestBody SetPasswordRequest request) {
        userService.setPassword(user.getId(), request);
        return ok(null, "Password saved. You can now also sign in with your email.");
    }

    /**
     * Change the password on the Account page. Afterwards every session (including the current one)
     * is revoked, the refresh_token cookie is deleted — the user signs in again with the new
     * password.
     */
    @PostMapping("/change-password")
    public ResponseEntity<ApiResource<Void>> changePassword(
            @AuthenticationPrincipal CustomUserDetails user,
            @Valid @RequestBody ChangePasswordRequest request) {
        userService.changePassword(user.getId(), request);
        ResponseCookie clearCookie = CookieHelper.buildRefreshTokenCookie("", Duration.ZERO);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, clearCookie.toString())
                .body(
                        ApiResource.success(
                                null, "Your password has been changed. Please sign in again."));
    }

    /**
     * FR-003: called when the access token expires. The refresh token is only read from the
     * HttpOnly cookie (not accepted in the body), returns a new access token and overwrites the
     * cookie with a new refresh token.
     */
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
     * FR-007 step A: always returns the same sentence whether or not the email exists, even after
     * passing the limit of 5 per hour. Creating the token and sending the mail run in the
     * background through the Redis queue.
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResource<Void>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request, HttpServletRequest httpRequest) {
        passwordResetService.requestReset(request.email(), IpHelper.getClientIp(httpRequest));
        return ok(null, "If that email is registered, you will receive a password reset link.");
    }

    /**
     * FR-007 step C (before showing the form): check the link is still usable and return the
     * account's email. Only reads the token, does not delete it — the token can still be used for
     * /reset-password.
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
     * FR-007 steps C + D: the token is single-use. Once changed, every old session is revoked and
     * the FE goes back to the sign-in page.
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

    /** The profile of the signed-in user themself (Account page). */
    @GetMapping("/me")
    public ResponseEntity<ApiResource<UserResource>> me(
            @AuthenticationPrincipal CustomUserDetails user) {
        return ok(userService.getProfile(user.getId()), "Profile loaded.");
    }

    /**
     * Edit your own full name, phone number, address — the id comes from the access token so
     * another account cannot be edited (R-06). The email cannot be changed here.
     */
    @PutMapping("/me")
    public ResponseEntity<ApiResource<UserResource>> updateMe(
            @AuthenticationPrincipal CustomUserDetails user,
            @Valid @RequestBody UpdateProfileRequest request) {
        return ok(userService.updateProfile(user.getId(), request), "Your details are saved.");
    }
}
