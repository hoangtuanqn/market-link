package com.techx.intervue.modules.achievement.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Ngưỡng lên hạng (app.tiers.*). Đồng là mặc định nên không có ngưỡng. Muốn lên một hạng phải đạt
 * đủ cả ba: số đơn hoàn tất, tổng tiền đã chi (₫, chỉ đơn hoàn tất) và tỉ lệ hoàn tất (%).
 */
@ConfigurationProperties(prefix = "app.tiers")
public record TierProperties(Threshold silver, Threshold gold, Threshold diamond) {

    public record Threshold(long minCompleted, long minSpent, int minCompletionRate) {}
}
