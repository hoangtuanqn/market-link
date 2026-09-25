package com.techx.intervue.modules.achievement.services.impl;

import com.techx.intervue.modules.achievement.enums.Tier;
import com.techx.intervue.modules.achievement.repositories.OrderStatsRepository;
import com.techx.intervue.modules.achievement.resources.AchievementResource;
import com.techx.intervue.modules.achievement.resources.OrderStats;
import com.techx.intervue.modules.achievement.services.interfaces.AchievementServiceInterface;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;

/**
 * Thành tích cá nhân — không có trong SRS, LEAD yêu cầu (26/09/2026). Tính mỗi lần gọi từ bảng
 * orders, không lưu hạng ở đâu cả, nên đổi ngưỡng trong app.tiers là có hiệu lực ngay.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AchievementService implements AchievementServiceInterface {

    private final OrderStatsRepository repository;
    private final TierPolicy policy;

    @Override
    public AchievementResource forUser(Long userId) {
        OrderStats stats;
        try {
            stats = repository.statsFor(List.of(userId)).getOrDefault(userId, OrderStats.EMPTY);
        } catch (DataAccessException e) {
            // Bảng orders chưa có hoặc DB lỗi: vẫn trả trang Account, không để lộ 500
            log.warn("Order stats unavailable for user {}", userId, e);
            return unavailable();
        }
        return AchievementResource.builder()
                .available(true)
                .tier(policy.tierOf(stats))
                .completed(stats.completed())
                .cancelled(stats.cancelled())
                .declined(stats.declined())
                .inProgress(stats.inProgress())
                .totalSpent(stats.totalSpent())
                .completionRate(stats.completionRate())
                .next(policy.next(stats))
                .build();
    }

    @Override
    public Map<Long, Tier> tiersFor(Collection<Long> userIds) {
        Map<Long, OrderStats> stats;
        try {
            stats = repository.statsFor(List.copyOf(userIds));
        } catch (DataAccessException e) {
            log.warn("Order stats unavailable for {} users", userIds.size(), e);
            stats = Map.of();
        }
        Map<Long, Tier> tiers = new LinkedHashMap<>();
        for (Long id : userIds) {
            tiers.put(id, policy.tierOf(stats.getOrDefault(id, OrderStats.EMPTY)));
        }
        return tiers;
    }

    private static AchievementResource unavailable() {
        return AchievementResource.builder().available(false).tier(Tier.BRONZE).build();
    }
}
