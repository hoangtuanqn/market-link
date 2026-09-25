package com.techx.intervue.modules.user.services.impl;

import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.enums.UserStatus;
import com.techx.intervue.modules.user.repositories.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * FR-102: không có API đăng ký admin công khai (roadmap bước 2), nên tài khoản admin đầu tiên phải
 * do seed tạo. Chỉ chạy ở profile dev và local — prod không bao giờ có tài khoản mật khẩu mặc định.
 *
 * <p>Bỏ qua nếu email đã tồn tại, nên đổi mật khẩu admin trong DB rồi khởi động lại không bị ghi
 * đè. Thông tin lấy từ {@code app.seed.admin.*}, đổi được qua biến môi trường SEED_ADMIN_*.
 */
@Slf4j
@Component
@Profile({"dev", "local"})
public class AdminSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final String email;
    private final String password;
    private final String fullName;
    private final String phone;

    public AdminSeeder(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.seed.admin.email}") String email,
            @Value("${app.seed.admin.password}") String password,
            @Value("${app.seed.admin.full-name}") String fullName,
            @Value("${app.seed.admin.phone}") String phone) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.email = email;
        this.password = password;
        this.fullName = fullName;
        this.phone = phone;
    }

    @Override
    public void run(String... args) {
        if (userRepository.existsByEmail(email)) {
            log.info("Admin seed skipped: {} already exists.", email);
            return;
        }
        // users.phone là UNIQUE — đâm vào số của tài khoản khác thì backend chết lúc khởi động,
        // đắt hơn nhiều so với việc bỏ qua một tiện ích của dev.
        if (userRepository.existsByPhone(phone)) {
            log.warn("Admin seed skipped: phone {} belongs to another account.", phone);
            return;
        }
        userRepository.save(
                User.builder()
                        .fullName(fullName)
                        .email(email)
                        .phone(phone)
                        .passwordHash(passwordEncoder.encode(password))
                        .role(RoleType.ADMIN)
                        .status(UserStatus.ACTIVE)
                        .build());
        log.info("Seeded admin account {}", email);
    }
}
