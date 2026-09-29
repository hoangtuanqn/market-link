package com.techx.intervue.modules.achievement.resources;

import com.techx.intervue.modules.achievement.enums.Tier;
import lombok.Builder;

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
