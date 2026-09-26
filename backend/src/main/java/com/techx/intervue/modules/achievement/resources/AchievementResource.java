package com.techx.intervue.modules.achievement.resources;

import com.techx.intervue.modules.achievement.enums.Tier;
import lombok.Builder;

/**
 * Personal achievements on the Account page. available = false when orders cannot be read yet (the
 * orders table does not exist or the DB failed): the figures are 0 and the tier is Bronze, and the
 * UI says clearly that there is no data. next = null at the highest tier.
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
