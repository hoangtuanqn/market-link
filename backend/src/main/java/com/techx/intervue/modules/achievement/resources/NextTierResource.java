package com.techx.intervue.modules.achievement.resources;

import com.techx.intervue.modules.achievement.enums.Tier;

/**
 * Còn thiếu gì để lên hạng kế tiếp. completionRateNeeded là mức tỉ lệ phải đạt, null nếu đã đạt.
 */
public record NextTierResource(
        Tier tier, long ordersNeeded, long spendNeeded, Integer completionRateNeeded) {}
