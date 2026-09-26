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
 * FR-102: there is no public admin sign-up API (roadmap step 2), so the first admin account must be
 * created by the seed. Only runs in the dev and local profiles — prod never has a default-password
 * account.
 *
 * <p>Skipped if the email already exists, so changing the admin password in the DB and restarting
 * does not get overwritten. The values come from {@code app.seed.admin.*}, changeable through the
 * SEED_ADMIN_* environment variables.
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
        // users.phone is UNIQUE — colliding with another account's number makes the backend die at
        // startup,
        // far more costly than skipping a dev convenience.
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
