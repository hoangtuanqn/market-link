package com.techx.intervue.modules.achievement.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Tier thresholds (app.tiers.*). Bronze is the default, so it has no threshold. To reach a tier a
 * buyer must meet all three: completed orders, total money spent (₫, completed orders only) and
 * completion rate (%).
 */
@ConfigurationProperties(prefix = "app.tiers")
public record TierProperties(Threshold silver, Threshold gold, Threshold diamond) {

    public record Threshold(long minCompleted, long minSpent, int minCompletionRate) {}
}
