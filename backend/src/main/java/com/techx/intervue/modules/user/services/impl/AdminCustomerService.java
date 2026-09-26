package com.techx.intervue.modules.user.services.impl;

import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.enums.UserStatus;
import com.techx.intervue.modules.user.exceptions.CustomerNotFoundException;
import com.techx.intervue.modules.user.repositories.AdminCustomerQueryRepository;
import com.techx.intervue.modules.user.repositories.UserRepository;
import com.techx.intervue.modules.user.resources.AdminCustomerResource;
import com.techx.intervue.modules.user.services.interfaces.AdminCustomerServiceInterface;
import com.techx.intervue.resources.PageResource;
import java.util.Locale;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * FR-072. Deactivating sets {@code users.status = inactive}: {@code UserService.authenticate} and
 * the refresh path already refuse any status but {@code active}, and the refresh tokens are revoked
 * here so the session ends at the next refresh. Orders are left alone (the stall still has to hand
 * over or decline them).
 */
@Service
@AllArgsConstructor
public class AdminCustomerService implements AdminCustomerServiceInterface {

    private static final int MAX_PAGE_SIZE = 50;

    private final UserRepository userRepository;
    private final AdminCustomerQueryRepository queries;
    private final RefreshTokenService refreshTokens;

    @Override
    @Transactional(readOnly = true)
    public PageResource<AdminCustomerResource> list(
            String status, String query, int page, int pageSize) {
        String dbStatus = status == null || status.isBlank() ? null : parseStatus(status).value();
        return queries.search(
                dbStatus, query, Math.max(1, page), Math.min(MAX_PAGE_SIZE, Math.max(1, pageSize)));
    }

    @Override
    @Transactional
    public AdminCustomerResource setStatus(long userId, String status) {
        UserStatus target = parseStatus(status);
        User user = userRepository.findById(userId).orElseThrow(CustomerNotFoundException::new);
        if (user.getRole() != RoleType.CUSTOMER) {
            throw new IllegalArgumentException(
                    "Only customer accounts can be activated or deactivated here.");
        }
        user.setStatus(target);
        userRepository.saveAndFlush(user);
        if (target == UserStatus.INACTIVE) {
            refreshTokens.revokeAllTokens(userId);
        }
        return queries.findOne(userId).orElseThrow(CustomerNotFoundException::new);
    }

    /** Only the two values of contract §10; {@code suspended} is not an admin action here. */
    private static UserStatus parseStatus(String status) {
        String s = status == null ? "" : status.trim().toLowerCase(Locale.ROOT);
        return switch (s) {
            case "active" -> UserStatus.ACTIVE;
            case "inactive" -> UserStatus.INACTIVE;
            default -> throw new IllegalArgumentException("status must be 'active' or 'inactive'.");
        };
    }
}
