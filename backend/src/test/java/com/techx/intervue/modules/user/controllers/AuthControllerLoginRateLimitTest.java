package com.techx.intervue.modules.user.controllers;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.config.AuthConfig;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.exceptions.LoginRateLimitedException;
import com.techx.intervue.modules.user.requests.LoginRequest;
import com.techx.intervue.modules.user.resources.AuthResult;
import com.techx.intervue.modules.user.resources.UserResource;
import com.techx.intervue.modules.user.services.impl.GoogleOAuthClient;
import com.techx.intervue.modules.user.services.impl.LoginRateLimiter;
import com.techx.intervue.modules.user.services.interfaces.EmailVerificationServiceInterface;
import com.techx.intervue.modules.user.services.interfaces.PasswordResetServiceInterface;
import com.techx.intervue.modules.user.services.interfaces.UserServiceInterface;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.BadCredentialsException;

class AuthControllerLoginRateLimitTest {

    private static final String EMAIL = "an@example.com";

    private UserServiceInterface userService;
    private LoginRateLimiter limiter;
    private AuthController controller;
    private MockHttpServletRequest http;

    @BeforeEach
    void setUp() {
        userService = mock(UserServiceInterface.class);
        limiter = mock(LoginRateLimiter.class);
        AuthConfig authConfig = mock(AuthConfig.class);
        when(authConfig.getRefreshTokenTTLDays()).thenReturn(14);
        controller =
                new AuthController(
                        userService,
                        mock(PasswordResetServiceInterface.class),
                        authConfig,
                        mock(GoogleOAuthClient.class),
                        mock(EmailVerificationServiceInterface.class),
                        limiter);
        http = new MockHttpServletRequest("POST", "/api/v1/auth/login");
        http.setRemoteAddr("203.0.113.9");
    }

    private static LoginRequest request(String password) {
        return new LoginRequest(EMAIL, password, true, null);
    }

    @Test
    void aWrongPasswordIsCounted() {
        when(userService.authenticate(any()))
                .thenThrow(new BadCredentialsException("Email or password is incorrect."));

        assertThatThrownBy(() -> controller.login(request("wrong"), http))
                .isInstanceOf(BadCredentialsException.class);
        verify(limiter).recordFailure(EMAIL, "203.0.113.9");
        verify(limiter, never()).reset(anyString());
    }

    @Test
    void theRightPasswordClearsTheCounter() {
        UserResource user =
                UserResource.builder().id(1L).email(EMAIL).role(RoleType.CUSTOMER).build();
        when(userService.authenticate(any()))
                .thenReturn(new AuthResult("access", "refresh", user, true));

        controller.login(request("right"), http);

        verify(limiter).reset(EMAIL);
        verify(limiter, never()).recordFailure(anyString(), anyString());
    }

    @Test
    void onceLockedEvenTheRightPasswordIsNotChecked() {
        doThrow(new LoginRateLimitedException(600))
                .when(limiter)
                .ensureAllowed(EMAIL, "203.0.113.9");

        assertThatThrownBy(() -> controller.login(request("right"), http))
                .isInstanceOf(LoginRateLimitedException.class);
        verify(userService, never()).authenticate(any());
    }
}
