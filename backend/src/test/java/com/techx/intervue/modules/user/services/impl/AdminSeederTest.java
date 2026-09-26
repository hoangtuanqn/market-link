package com.techx.intervue.modules.user.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.enums.UserStatus;
import com.techx.intervue.modules.user.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/** FR-102: không có API đăng ký admin, nên tài khoản admin đầu tiên phải do seed tạo. */
class AdminSeederTest {

    private static final String EMAIL = "admin@marketlink.vn";
    private static final String PASSWORD = "Admin@123";
    private static final String PHONE = "0900000001";

    private UserRepository userRepository;
    private PasswordEncoder passwordEncoder;
    private AdminSeeder seeder;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        passwordEncoder = new BCryptPasswordEncoder();
        seeder =
                new AdminSeeder(
                        userRepository,
                        passwordEncoder,
                        EMAIL,
                        PASSWORD,
                        "MarketLink Admin",
                        PHONE);
    }

    private User seedAndCapture() {
        seeder.run();
        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(saved.capture());
        return saved.getValue();
    }

    @Test
    void createsAnActiveAdminWhenTheAccountIsMissing() {
        when(userRepository.existsByEmail(EMAIL)).thenReturn(false);
        when(userRepository.existsByPhone(PHONE)).thenReturn(false);

        User admin = seedAndCapture();

        assertThat(admin.getEmail()).isEqualTo(EMAIL);
        assertThat(admin.getRole()).isEqualTo(RoleType.ADMIN);
        assertThat(admin.getStatus()).isEqualTo(UserStatus.ACTIVE);
        assertThat(admin.getFullName()).isEqualTo("MarketLink Admin");
        assertThat(admin.getPhone()).isEqualTo(PHONE);
    }

    /** Mật khẩu phải qua PasswordEncoder, nếu không thì authenticate() không bao giờ khớp. */
    @Test
    void storesThePasswordHashedSoLoginMatchesIt() {
        when(userRepository.existsByEmail(EMAIL)).thenReturn(false);
        when(userRepository.existsByPhone(PHONE)).thenReturn(false);

        User admin = seedAndCapture();

        assertThat(admin.getPasswordHash()).isNotEqualTo(PASSWORD);
        assertThat(passwordEncoder.matches(PASSWORD, admin.getPasswordHash())).isTrue();
    }

    /** Chạy mỗi lần khởi động: đổi mật khẩu admin trong DB rồi restart không bị ghi đè lại. */
    @Test
    void doesNothingWhenTheAdminEmailAlreadyExists() {
        when(userRepository.existsByEmail(EMAIL)).thenReturn(true);

        seeder.run();

        verify(userRepository, never()).save(any());
    }

    /**
     * users.phone là UNIQUE: chèn đè số của tài khoản khác sẽ làm backend chết lúc khởi động, đắt
     * hơn nhiều so với việc bỏ qua một tiện ích của dev.
     */
    @Test
    void skipsWhenThePhoneBelongsToAnotherAccount() {
        when(userRepository.existsByEmail(EMAIL)).thenReturn(false);
        when(userRepository.existsByPhone(PHONE)).thenReturn(true);

        seeder.run();

        verify(userRepository, never()).save(any());
    }
}
