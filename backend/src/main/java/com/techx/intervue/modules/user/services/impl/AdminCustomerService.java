package com.techx.intervue.modules.user.services.impl;

import com.techx.intervue.helpers.TransactionHelper;
import com.techx.intervue.modules.order.services.interfaces.OrderServiceInterface;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.enums.UserStatus;
import com.techx.intervue.modules.user.exceptions.CustomerNotFoundException;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import com.techx.intervue.modules.user.repositories.AdminCustomerQueryRepository;
import com.techx.intervue.modules.user.repositories.AdminCustomerStatusHistoryQueryRepository;
import com.techx.intervue.modules.user.repositories.UserRepository;
import com.techx.intervue.modules.user.resources.AdminCustomerResource;
import com.techx.intervue.modules.user.resources.AdminCustomerStatusHistoryResource;
import com.techx.intervue.modules.user.services.interfaces.AdminCustomerServiceInterface;
import com.techx.intervue.resources.PageResource;
import com.techx.intervue.services.interfaces.JobQueueInterface;
import java.time.Clock;
import java.time.Instant;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@AllArgsConstructor
public class AdminCustomerService implements AdminCustomerServiceInterface {

    public static final String JOB_NOTIFY_DEACTIVATED = "customer.notify-deactivated";
    public static final String JOB_NOTIFY_REACTIVATED = "customer.notify-reactivated";

    private static final int MAX_PAGE_SIZE = 50;

    private final UserRepository userRepository;
    private final AdminCustomerQueryRepository queries;
    private final RefreshTokenService refreshTokens;
    private final UserSessionCache sessionCache;
    private final UserStatusHistoryWriter history;
    private final JobQueueInterface jobQueue;
    private final Clock clock;
    private final OrderServiceInterface orders;
    private final AdminCustomerStatusHistoryQueryRepository statusHistoryQueries;

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
    public AdminCustomerResource setStatus(
            long userId, String status, String reason, Instant until, Long actorId) {
        UserStatus target = parseStatus(status);
        User user = userRepository.findById(userId).orElseThrow(CustomerNotFoundException::new);
        if (user.getRole() != RoleType.CUSTOMER) {
            throw new IllegalArgumentException(
                    "Only customer accounts can be activated or deactivated here.");
        }
        UserStatus from = user.getStatus();

        if (target == UserStatus.INACTIVE) {
            deactivate(user, reason, until, actorId, from);
        } else {
            reactivate(user, actorId, from);
        }
        return queries.findOne(userId).orElseThrow(CustomerNotFoundException::new);
    }

    private void deactivate(
            User user, String reason, Instant until, Long actorId, UserStatus from) {
        if (reason == null || reason.isBlank()) {
            throw new InvalidFieldException(
                    "reason", "A reason is required to deactivate an account.");
        }
        if (until != null && !until.isAfter(Instant.now(clock))) {
            throw new InvalidFieldException("until", "The ban end time must be in the future.");
        }
        user.setStatus(UserStatus.INACTIVE);
        user.setDeactivationReason(reason);
        user.setDeactivatedUntil(until);
        userRepository.saveAndFlush(user);

        refreshTokens.revokeAllTokens(user.getId());
        history.record(user.getId(), from, UserStatus.INACTIVE, reason, until, actorId);

        if (until == null) {
            orders.cancelAllForDeactivatedCustomer(user.getId(), actorId);
        }

        Long userId = user.getId();
        String email = user.getEmail();
        String fullName = user.getFullName();
        TransactionHelper.afterCommit(
                () -> {
                    sessionCache.revokeAll(userId);
                    Map<String, String> payload = new HashMap<>();
                    payload.put("userId", String.valueOf(userId));
                    payload.put("email", email);
                    payload.put("fullName", fullName);
                    payload.put("reason", reason);
                    payload.put("until", until == null ? "" : until.toString());
                    jobQueue.enqueue(JOB_NOTIFY_DEACTIVATED, payload);
                });
    }

    private void reactivate(User user, Long actorId, UserStatus from) {
        Long reactivatedId = user.getId();
        user.setStatus(UserStatus.ACTIVE);
        user.setDeactivationReason(null);
        user.setDeactivatedUntil(null);
        userRepository.saveAndFlush(user);

        history.record(user.getId(), from, UserStatus.ACTIVE, null, null, actorId);

        String email = user.getEmail();
        String fullName = user.getFullName();
        TransactionHelper.afterCommit(
                () -> {
                    Map<String, String> payload = new HashMap<>();
                    payload.put("userId", String.valueOf(reactivatedId));
                    payload.put("email", email);
                    payload.put("fullName", fullName);
                    jobQueue.enqueue(JOB_NOTIFY_REACTIVATED, payload);
                });
    }

    @Override
    @Transactional(readOnly = true)
    public AdminCustomerResource detail(long userId) {
        return queries.findOne(userId).orElseThrow(CustomerNotFoundException::new);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResource<AdminCustomerStatusHistoryResource> statusHistory(
            long userId, int page, int pageSize) {
        detail(userId);
        return statusHistoryQueries.search(
                userId, Math.max(1, page), Math.min(MAX_PAGE_SIZE, Math.max(1, pageSize)));
    }

    private static UserStatus parseStatus(String status) {
        String s = status == null ? "" : status.trim().toLowerCase(Locale.ROOT);
        return switch (s) {
            case "active" -> UserStatus.ACTIVE;
            case "inactive" -> UserStatus.INACTIVE;
            default -> throw new IllegalArgumentException("status must be 'active' or 'inactive'.");
        };
    }
}
