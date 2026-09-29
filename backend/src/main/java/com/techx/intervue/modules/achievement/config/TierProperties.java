package com.techx.intervue.modules.achievement.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.tiers")
public record TierProperties(Threshold silver, Threshold gold, Threshold diamond) {

    public record Threshold(long minCompleted, long minSpent, int minCompletionRate) {}
}
