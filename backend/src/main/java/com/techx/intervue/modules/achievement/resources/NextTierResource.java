package com.techx.intervue.modules.achievement.resources;

import com.techx.intervue.modules.achievement.enums.Tier;

/**
 * What is still missing to reach the next tier. completionRateNeeded is the rate that must be
 * reached, null if already reached.
 */
public record NextTierResource(
        Tier tier, long ordersNeeded, long spendNeeded, Integer completionRateNeeded) {}
