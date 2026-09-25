package com.techx.intervue.modules.user.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.config.AuthConfig;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.exceptions.RoleMismatchException;
import com.techx.intervue.modules.user.repositories.SocialAccountRepository;
import com.techx.intervue.modules.user.repositories.UserRepository;
import com.techx.intervue.modules.user.requests.LoginRequest;
import com.techx.intervue.modules.user.resources.AuthResult;
import com.techx.intervue.modules.user.services.interfaces.RefreshTokenServiceInterface.IssuedToken;
import com.techx.intervue.services.interfaces.BlacklistServiceInterface;
import com.techx.intervue.services.interfaces.JobQueueInterface;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

/** FR-004: đăng nhập kèm requiredRole (trang admin). */
class UserServiceLoginTest {

    private static final String EMAIL = "an@example.com";
    private static final String PASSWORD = "secret123";

    private UserSessionCache sessionCache;
    private UserRepository userRepository;
    private SocialAccountRepository socialAccountRepository;
    private PasswordEncoder passwordEncoder;
    private JwtService jwtService;
    private RefreshTokenService refreshTokenService;
    private AuthConfig authConfig;
    private JobQueueInterface jobQueue;
    private UserService service;

    @BeforeEach
    void setUp() {
        sessionCache = mock(UserSessionCache.class);
        userRepository = mock(UserRepository.class);
        socialAccountRepository = mock(SocialAccountRepository.class);
        passwordEncoder = mock(PasswordEncoder.class);
        jwtService = mock(JwtService.class);
        refreshTokenService = mock(RefreshTokenService.class);
        authConfig = mock(AuthConfig.class);
        jobQueue = mock(JobQueueInterface.class);
        service =
                new UserService(
                        sessionCache,
                        userRepository,
                        socialAccountRepository,
                        passwordEncoder,
                        jwtService,
                        refreshTokenService,
                        mock(BlacklistServiceInterface.class),
                        authConfig,
                        jobQueue);
        when(authConfig.getExpirationTime()).thenReturn(900_000L);
        when(passwordEncoder.matches(PASSWORD, "hash")).thenReturn(true);
        when(jwtService.generateToken(anyLong())).thenReturn("access");
        when(refreshTokenService.issueRefreshToken(anyLong(), anyBoolean()))
                .thenReturn(new IssuedToken("refresh", 10L));
    }

    private User existingUser(RoleType role) {
        User user =
                User.builder()
                        .id(1L)
                        .email(EMAIL)
                        .fullName("An")
                        .passwordHash("hash")
                        .role(role)
                        .build();
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        return user;
    }

    @Test
    void adminLoginRejectsNonAdminWithoutIssuingTokens() {
        existingUser(RoleType.CUSTOMER);

        assertThatThrownBy(
                        () ->
                                service.authenticate(
                                        new LoginRequest(EMAIL, PASSWORD, false, RoleType.ADMIN)))
                .isInstanceOf(RoleMismatchException.class);
        verify(refreshTokenService, never()).issueRefreshToken(anyLong(), anyBoolean());
        verify(sessionCache, never()).set(anyLong(), any(), any(), any());
    }

    @Test
    void adminLoginAcceptsAdmin() {
        existingUser(RoleType.ADMIN);

        AuthResult result =
                service.authenticate(new LoginRequest(EMAIL, PASSWORD, false, RoleType.ADMIN));

        assertThat(result.user().role()).isEqualTo(RoleType.ADMIN);
        assertThat(result.refreshToken()).isEqualTo("refresh");
    }

    @Test
    void loginWithoutRequiredRoleAcceptsAnyRole() {
        existingUser(RoleType.FARMER);

        AuthResult result = service.authenticate(new LoginRequest(EMAIL, PASSWORD, null, null));

        assertThat(result.accessToken()).isEqualTo("access");
        assertThat(result.rememberMe()).isTrue();
    }
}
