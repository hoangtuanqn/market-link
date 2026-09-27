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
import com.techx.intervue.modules.geo.entities.AddressColumns;
import com.techx.intervue.modules.geo.enums.AddressPolicy;
import com.techx.intervue.modules.geo.requests.AddressPartsRequest;
import com.techx.intervue.modules.geo.services.impl.ResolvedAddress;
import com.techx.intervue.modules.geo.services.interfaces.AddressServiceInterface;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.enums.SocialProvider;
import com.techx.intervue.modules.user.exceptions.DuplicateAccountException;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import com.techx.intervue.modules.user.repositories.SocialAccountRepository;
import com.techx.intervue.modules.user.repositories.UserRepository;
import com.techx.intervue.modules.user.requests.ChangePasswordRequest;
import com.techx.intervue.modules.user.requests.CustomerRegisterRequest;
import com.techx.intervue.modules.user.requests.UpdateProfileRequest;
import com.techx.intervue.modules.user.resources.AuthResult;
import com.techx.intervue.modules.user.resources.SocialProfile;
import com.techx.intervue.modules.user.resources.UserResource;
import com.techx.intervue.modules.user.services.interfaces.MfaServiceInterface;
import com.techx.intervue.modules.user.services.interfaces.RefreshTokenServiceInterface.IssuedToken;
import com.techx.intervue.services.interfaces.BlacklistServiceInterface;
import com.techx.intervue.services.interfaces.JobQueueInterface;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
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
    private AddressServiceInterface addressService;
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
        addressService = mock(AddressServiceInterface.class);
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
                        mock(MfaServiceInterface.class),
                        addressService);
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

    private static final AddressPartsRequest BEN_THANH =
            new AddressPartsRequest("VN", "79", "26743", "Lê Lợi", "12", null, null);

    private static final String BEN_THANH_TEXT =
            "12 Lê Lợi, Phường Bến Thành, Thành phố Hồ Chí Minh";

    private static CustomerRegisterRequest signUp(String email, String phone) {
        return new CustomerRegisterRequest(
                "Nguyen Van An", phone, email, BEN_THANH, PASSWORD, PASSWORD);
    }

    /**
     * What AddressService answers for BEN_THANH; its own rules are pinned in AddressServiceTest.
     */
    private void addressResolves() {
        when(addressService.resolve(BEN_THANH, AddressPolicy.ACCOUNT))
                .thenReturn(
                        new ResolvedAddress(
                                new AddressColumns("VN", "79", "26743", "Lê Lợi", "12", null, null),
                                BEN_THANH_TEXT,
                                "Phường Bến Thành",
                                "Thành phố Hồ Chí Minh"));
    }

    @Test
    void signUpStoresTheComposedAddressAndItsParts() {
        addressResolves();
        when(userRepository.save(any(User.class)))
                .thenAnswer(
                        call -> {
                            User saved = call.getArgument(0);
                            saved.setId(1L);
                            return saved;
                        });

        AuthResult result = service.registerCustomer(signUp(EMAIL, "0900000002"));

        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(saved.capture());
        assertThat(saved.getValue().getAddress()).isEqualTo(BEN_THANH_TEXT);
        assertThat(saved.getValue().getAddressParts().getWardCode()).isEqualTo("26743");
        assertThat(result.user().address()).isEqualTo(BEN_THANH_TEXT);
        assertThat(result.user().addressParts().streetName()).isEqualTo("Lê Lợi");
    }

    @Test
    void adminProfileUpdateWithoutAnAddressKeepsTheOldOne() {
        User admin = existingUser(RoleType.ADMIN);
        admin.setAddress("Quận 1, TP. Hồ Chí Minh");
        when(userRepository.findById(1L)).thenReturn(Optional.of(admin));
        when(userRepository.saveAndFlush(admin)).thenReturn(admin);

        UserResource updated =
                service.updateProfile(1L, new UpdateProfileRequest("Admin", "0900000001", null));

        assertThat(updated.address()).isEqualTo("Quận 1, TP. Hồ Chí Minh");
        assertThat(updated.fullName()).isEqualTo("Admin");
        verify(addressService, never()).resolve(any(), any());
    }

    @Test
    void customerProfileUpdateWithoutAnAddressIsRejected() {
        User customer = existingUser(RoleType.CUSTOMER);
        when(userRepository.findById(1L)).thenReturn(Optional.of(customer));

        InvalidFieldException e =
                catchThrowableOfType(
                        InvalidFieldException.class,
                        () ->
                                service.updateProfile(
                                        1L, new UpdateProfileRequest("An", "0900000002", null)));

        assertThat(e.getField()).isEqualTo("addressParts");
        verify(userRepository, never()).saveAndFlush(any());
    }

    @Test
    void profileUpdateStoresTheNewAddress() {
        addressResolves();
        User customer = existingUser(RoleType.CUSTOMER);
        when(userRepository.findById(1L)).thenReturn(Optional.of(customer));
        when(userRepository.saveAndFlush(customer)).thenReturn(customer);

        UserResource updated =
                service.updateProfile(1L, new UpdateProfileRequest("An", "0900000002", BEN_THANH));

        assertThat(updated.address()).isEqualTo(BEN_THANH_TEXT);
        assertThat(updated.addressParts().wardCode()).isEqualTo("26743");
    }

    @Test
    void aProfileSavedBeforeAddressPartsHasNoParts() {
        User legacy = existingUser(RoleType.CUSTOMER);
        legacy.setAddress("12 Le Loi, Quan 1");
        when(userRepository.findById(1L)).thenReturn(Optional.of(legacy));

        UserResource profile = service.getProfile(1L);

        assertThat(profile.address()).isEqualTo("12 Le Loi, Quan 1");
        assertThat(profile.addressParts()).isNull();
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
