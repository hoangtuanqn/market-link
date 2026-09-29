package com.techx.intervue.modules.achievement.resources;

import com.techx.intervue.modules.achievement.enums.Tier;

public record NextTierResource(
        Tier tier, long ordersNeeded, long spendNeeded, Integer completionRateNeeded) {}
