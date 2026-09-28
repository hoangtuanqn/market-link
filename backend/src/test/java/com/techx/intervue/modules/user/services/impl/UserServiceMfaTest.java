package com.techx.intervue.modules.user.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.config.AuthConfig;
import com.techx.intervue.modules.geo.services.interfaces.AddressServiceInterface;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.enums.UserStatus;
import com.techx.intervue.modules.user.repositories.SocialAccountRepository;
import com.techx.intervue.modules.user.repositories.UserRepository;
import com.techx.intervue.modules.user.requests.LoginRequest;
import com.techx.intervue.modules.user.resources.AuthResult;
import com.techx.intervue.modules.user.resources.SocialProfile;
import com.techx.intervue.modules.user.services.interfaces.EmailVerificationServiceInterface;
import com.techx.intervue.modules.user.services.interfaces.MfaServiceInterface;
import com.techx.intervue.modules.user.services.interfaces.MfaServiceInterface.PendingLogin;
import com.techx.intervue.modules.user.services.interfaces.RefreshTokenServiceInterface.IssuedToken;
import com.techx.intervue.services.interfaces.BlacklistServiceInterface;
import com.techx.intervue.services.interfaces.JobQueueInterface;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.crypto.password.PasswordEncoder;

/** FR-008: an admin with 2FA on gets no session from the password step. */
class UserServiceMfaTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final SocialAccountRepository socialAccountRepository =
            mock(SocialAccountRepository.class);
    private final PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
    private final JwtService jwtService = mock(JwtService.class);
    private final RefreshTokenService refreshTokenService = mock(RefreshTokenService.class);
    private final UserSessionCache userSessionCache = mock(UserSessionCache.class);
    private final AuthConfig authConfig = mock(AuthConfig.class);
    private final MfaServiceInterface mfaService = mock(MfaServiceInterface.class);

    private UserService service;

    @BeforeEach
    void setUp() {
        service =
                new UserService(
                        userSessionCache,
                        userRepository,
                        socialAccountRepository,
                        passwordEncoder,
                        jwtService,
                        refreshTokenService,
                        mock(BlacklistServiceInterface.class),
                        authConfig,
                        mock(JobQueueInterface.class),
                        mfaService,
                        mock(AddressServiceInterface.class),
                        mock(EmailVerificationServiceInterface.class));
        when(passwordEncoder.matches("secret", "hash")).thenReturn(true);
        when(authConfig.getExpirationTime()).thenReturn(900_000L);
        when(jwtService.generateToken(anyLong())).thenReturn("access");
        when(refreshTokenService.issueRefreshToken(anyLong(), anyBoolean()))
                .thenReturn(new IssuedToken("refresh", 9L));
    }

    @Test
    void adminWithMfaGetsPendingTokenInsteadOfSession() {
        User admin = user(1L, RoleType.ADMIN);
        when(mfaService.isEnabled(1L)).thenReturn(true);
        when(mfaService.startChallenge(1L, false)).thenReturn("pending-token");

        AuthResult result =
                service.authenticate(new LoginRequest(admin.getEmail(), "secret", false, null));

        assertThat(result.mfaRequired()).isTrue();
        assertThat(result.mfaToken()).isEqualTo("pending-token");
        assertThat(result.accessToken()).isNull();
        assertThat(result.refreshToken()).isNull();
        verify(refreshTokenService, never()).issueRefreshToken(anyLong(), anyBoolean());
    }

    @Test
    void adminWithoutMfaSignsInAsBefore() {
        user(1L, RoleType.ADMIN);
        when(mfaService.isEnabled(1L)).thenReturn(false);

        AuthResult result =
                service.authenticate(new LoginRequest("u1@marketlink.local", "secret", true, null));

        assertThat(result.mfaRequired()).isFalse();
        assertThat(result.accessToken()).isEqualTo("access");
    }

    @Test
    void customerNeverGoesThroughMfa() {
        user(2L, RoleType.CUSTOMER);

        AuthResult result =
                service.authenticate(new LoginRequest("u2@marketlink.local", "secret", true, null));

        assertThat(result.accessToken()).isEqualTo("access");
        verify(mfaService, never()).isEnabled(anyLong());
    }

    @Test
    void googleSignInCannotSkipTheSecondStep() {
        User admin = user(1L, RoleType.ADMIN);
        when(socialAccountRepository.findByProviderAndProviderUserId(
                        org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any()))
                .thenReturn(
                        Optional.of(
                                com.techx.intervue.modules.user.entities.SocialAccount.builder()
                                        .userId(admin.getId())
                                        .build()));
        when(mfaService.isEnabled(1L)).thenReturn(true);
        when(mfaService.startChallenge(1L, true)).thenReturn("pending-token");

        AuthResult result = service.loginWithSocial(mock(SocialProfile.class));

        assertThat(result.mfaRequired()).isTrue();
        verify(refreshTokenService, never()).issueRefreshToken(anyLong(), anyBoolean());
    }

    @Test
    void verifiedCodeIssuesSessionWithRememberedChoice() {
        user(1L, RoleType.ADMIN);
        when(mfaService.verifyChallenge("pending-token", "123456", null))
                .thenReturn(new PendingLogin(1L, false));

        AuthResult result = service.completeMfaLogin("pending-token", "123456", null);

        assertThat(result.accessToken()).isEqualTo("access");
        assertThat(result.rememberMe()).isFalse();
        verify(refreshTokenService).issueRefreshToken(1L, false);
    }

    @Test
    void accountLockedAfterPasswordStepCannotFinishSignIn() {
        User admin = user(1L, RoleType.ADMIN);
        admin.setStatus(UserStatus.SUSPENDED);
        when(mfaService.verifyChallenge("pending-token", "123456", null))
                .thenReturn(new PendingLogin(1L, true));

        assertThatThrownBy(() -> service.completeMfaLogin("pending-token", "123456", null))
                .isInstanceOf(DisabledException.class);
    }

    /**
     * FR-008: a session opened with only the password before 2FA was turned on must not become a
     * full admin session afterwards — every earlier session is signed out, like a password change,
     * and only the caller gets a new one (not remembered, like the admin sign-in).
     */
    @Test
    void turningTwoStepOnSignsOutEveryEarlierSession() {
        user(1L, RoleType.ADMIN);

        AuthResult result = service.restartSession(1L);

        InOrder order = inOrder(refreshTokenService, userSessionCache, jwtService);
        order.verify(refreshTokenService).revokeAllTokens(1L);
        // the revoked-before marker must be written before the new token is signed
        order.verify(userSessionCache).revokeAll(1L);
        order.verify(jwtService).generateToken(1L);
        order.verify(userSessionCache).set(eq(1L), any(), any(), any());
        verify(refreshTokenService).issueRefreshToken(1L, false);
        assertThat(result.accessToken()).isEqualTo("access");
        assertThat(result.refreshToken()).isEqualTo("refresh");
        assertThat(result.rememberMe()).isFalse();
    }

    private User user(Long id, RoleType role) {
        User user =
                User.builder()
                        .id(id)
                        .email("u" + id + "@marketlink.local")
                        .fullName("User " + id)
                        .passwordHash("hash")
                        .role(role)
                        .build();
        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(userRepository.findById(id)).thenReturn(Optional.of(user));
        return user;
    }
}
