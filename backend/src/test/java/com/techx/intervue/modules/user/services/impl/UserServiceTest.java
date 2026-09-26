package com.techx.intervue.modules.user.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
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
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.enums.SocialProvider;
import com.techx.intervue.modules.user.exceptions.DuplicateAccountException;
import com.techx.intervue.modules.user.repositories.SocialAccountRepository;
import com.techx.intervue.modules.user.repositories.UserRepository;
import com.techx.intervue.modules.user.requests.ChangePasswordRequest;
import com.techx.intervue.modules.user.requests.CustomerRegisterRequest;
import com.techx.intervue.modules.user.resources.AuthResult;
import com.techx.intervue.modules.user.resources.SocialProfile;
import com.techx.intervue.modules.user.services.interfaces.MfaServiceInterface;
import com.techx.intervue.modules.user.services.interfaces.RefreshTokenServiceInterface.IssuedToken;
import com.techx.intervue.services.interfaces.BlacklistServiceInterface;
import com.techx.intervue.services.interfaces.JobQueueInterface;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import org.springframework.security.crypto.password.PasswordEncoder;

class UserServiceTest {

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
                        jobQueue,
                        // FR-008: nobody has 2FA on → sign in as before
                        mock(MfaServiceInterface.class));
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

    private static SocialProfile googleProfile() {
        return new SocialProfile(SocialProvider.GOOGLE, "google-sub-1", EMAIL, true, "An", null);
    }

    @Test
    void googleClaimWipesPresetPasswordAndRevokesSessionsBeforeIssuingTokens() {
        User user = existingUser(RoleType.CUSTOMER);
        when(socialAccountRepository.findByProviderAndProviderUserId(any(), any()))
                .thenReturn(Optional.empty());

        AuthResult result = service.loginWithSocial(googleProfile());

        assertThat(user.getPasswordHash()).isNull();
        assertThat(result.user().hasPassword()).isFalse();
        InOrder order = inOrder(refreshTokenService, sessionCache);
        order.verify(refreshTokenService).revokeAllTokens(1L);
        order.verify(sessionCache).revokeAll(1L);
        order.verify(refreshTokenService).issueRefreshToken(eq(1L), anyBoolean());
        order.verify(sessionCache).set(eq(1L), any(), any(), any());
    }

    @Test
    void googleClaimKeepsSessionsWhenAccountHasNoPassword() {
        User user = existingUser(RoleType.CUSTOMER);
        user.setPasswordHash(null);
        when(socialAccountRepository.findByProviderAndProviderUserId(any(), any()))
                .thenReturn(Optional.empty());

        service.loginWithSocial(googleProfile());

        verify(refreshTokenService, never()).revokeAllTokens(anyLong());
        verify(sessionCache, never()).revokeAll(anyLong());
    }

    @Test
    void changePasswordRevokesEverySessionAndNotifies() {
        User user = existingUser(RoleType.CUSTOMER);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("newpass123", "hash")).thenReturn(false);
        when(passwordEncoder.encode("newpass123")).thenReturn("new-hash");

        service.changePassword(1L, new ChangePasswordRequest(PASSWORD, "newpass123", "newpass123"));

        assertThat(user.getPasswordHash()).isEqualTo("new-hash");
        verify(refreshTokenService).revokeAllTokens(1L);
        verify(sessionCache).revokeAll(1L);
        verify(jobQueue).enqueue(PasswordResetService.JOB_NOTIFY_CHANGED, Map.of("email", EMAIL));
    }

    private static CustomerRegisterRequest signUp(String email, String phone) {
        return new CustomerRegisterRequest(
                "Nguyen Van An", phone, email, "12 Le Loi, Quan 1", PASSWORD, PASSWORD);
    }

    /** QA E2E v2 BUG-005 (RETEST-002): both taken fields are reported in one answer. */
    @Test
    void signUpReportsEmailAndPhoneTogetherWhenBothAreTaken() {
        when(userRepository.existsByEmail(EMAIL)).thenReturn(true);
        when(userRepository.existsByPhone("0900000002")).thenReturn(true);

        DuplicateAccountException e =
                catchThrowableOfType(
                        DuplicateAccountException.class,
                        () -> service.registerCustomer(signUp(EMAIL, "0900000002")));

        assertThat(e.getFields())
                .containsExactly(
                        Map.entry("email", "This email is already registered."),
                        Map.entry("phone", "This phone number is already registered."));
        verify(userRepository, never()).save(any());
    }

    @Test
    void signUpReportsOnlyThePhoneWhenOnlyThePhoneIsTaken() {
        when(userRepository.existsByPhone("0900000002")).thenReturn(true);

        DuplicateAccountException e =
                catchThrowableOfType(
                        DuplicateAccountException.class,
                        () -> service.registerCustomer(signUp(EMAIL, "0900000002")));

        assertThat(e.getFields()).containsOnlyKeys("phone");
    }
}
