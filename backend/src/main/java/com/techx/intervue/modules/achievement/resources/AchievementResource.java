package com.techx.intervue.modules.achievement.resources;

import com.techx.intervue.modules.achievement.enums.Tier;
import lombok.Builder;

/**
 * Thành tích cá nhân trên trang Account. available = false khi chưa đọc được đơn hàng (bảng orders
 * chưa có hoặc DB lỗi): số liệu là 0 và hạng là Đồng, UI nói rõ là chưa có số liệu. next = null ở
 * hạng cao nhất.
 */
@Builder
public record AchievementResource(
        boolean available,
        Tier tier,
        long completed,
        long cancelled,
        long declined,
        long inProgress,
        long totalSpent,
        Integer completionRate,
        NextTierResource next) {}
