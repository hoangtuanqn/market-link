package com.techx.intervue.modules.achievement.services.impl;

import com.techx.intervue.modules.achievement.config.TierProperties;
import com.techx.intervue.modules.achievement.config.TierProperties.Threshold;
import com.techx.intervue.modules.achievement.enums.Tier;
import com.techx.intervue.modules.achievement.resources.NextTierResource;
import com.techx.intervue.modules.achievement.resources.OrderStats;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Ranking rule: the tier is the highest level at which the buyer meets all three thresholds. No
 * "keeping a tier" — cancelling a lot drops the rate, and the tier drops with it.
 */
@Component
@RequiredArgsConstructor
public class TierPolicy {

    private final TierProperties properties;

    public Tier tierOf(OrderStats stats) {
        Tier result = Tier.BRONZE;
        for (Tier tier : Tier.values()) {
            Threshold threshold = threshold(tier);
            if (threshold != null && meets(stats, threshold)) {
                result = tier;
            }
        }
        return result;
    }

    /**
     * The tier right above the current one and what is still missing; null when already at the
     * highest tier.
     */
    public NextTierResource next(OrderStats stats) {
        int current = tierOf(stats).ordinal();
        if (current == Tier.values().length - 1) {
            return null;
        }
        Tier tier = Tier.values()[current + 1];
        Threshold threshold = threshold(tier);
        return new NextTierResource(
                tier,
                Math.max(0, threshold.minCompleted() - stats.completed()),
                Math.max(0, threshold.minSpent() - stats.totalSpent()),
                rateMet(stats, threshold) ? null : threshold.minCompletionRate());
    }

    private boolean meets(OrderStats stats, Threshold threshold) {
        return stats.completed() >= threshold.minCompleted()
                && stats.totalSpent() >= threshold.minSpent()
                && rateMet(stats, threshold);
    }

    private static boolean rateMet(OrderStats stats, Threshold threshold) {
        Integer rate = stats.completionRate();
        return rate != null && rate >= threshold.minCompletionRate();
    }

    private Threshold threshold(Tier tier) {
        return switch (tier) {
            case BRONZE -> null;
            case SILVER -> properties.silver();
            case GOLD -> properties.gold();
            case DIAMOND -> properties.diamond();
        };
    }
}
