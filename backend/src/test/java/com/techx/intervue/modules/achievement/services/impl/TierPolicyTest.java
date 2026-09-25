package com.techx.intervue.modules.achievement.services.impl;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.achievement.config.TierProperties;
import com.techx.intervue.modules.achievement.config.TierProperties.Threshold;
import com.techx.intervue.modules.achievement.enums.Tier;
import com.techx.intervue.modules.achievement.resources.NextTierResource;
import com.techx.intervue.modules.achievement.resources.OrderStats;
import org.junit.jupiter.api.Test;

class TierPolicyTest {

    private final TierPolicy policy =
            new TierPolicy(
                    new TierProperties(
                            new Threshold(5, 500_000, 60),
                            new Threshold(15, 2_000_000, 75),
                            new Threshold(40, 6_000_000, 85)));

    private static OrderStats stats(long completed, long cancelled, long spent) {
        return new OrderStats(completed, cancelled, 0, 0, spent);
    }

    @Test
    void aNewCustomerIsBronze() {
        assertThat(policy.tierOf(OrderStats.EMPTY)).isEqualTo(Tier.BRONZE);
    }

    @Test
    void reachingEveryThresholdOfATierGivesThatTier() {
        assertThat(policy.tierOf(stats(5, 0, 500_000))).isEqualTo(Tier.SILVER);
        assertThat(policy.tierOf(stats(15, 5, 2_000_000))).isEqualTo(Tier.GOLD);
        assertThat(policy.tierOf(stats(40, 7, 6_000_000))).isEqualTo(Tier.DIAMOND);
    }

    @Test
    void missingAnyOneThresholdKeepsTheLowerTier() {
        // đủ đơn, thiếu tiền
        assertThat(policy.tierOf(stats(20, 0, 1_999_999))).isEqualTo(Tier.SILVER);
        // đủ tiền, thiếu đơn
        assertThat(policy.tierOf(stats(4, 0, 9_000_000))).isEqualTo(Tier.BRONZE);
    }

    @Test
    void cancellingTooOftenLowersTheTier() {
        // 40 hoàn tất, 10 huỷ → 80%: đủ Vàng (75%) nhưng thiếu Kim cương (85%)
        assertThat(policy.tierOf(stats(40, 10, 8_000_000))).isEqualTo(Tier.GOLD);
        // 15 hoàn tất, 11 huỷ → 57%: dưới cả mức Bạc
        assertThat(policy.tierOf(stats(15, 11, 3_000_000))).isEqualTo(Tier.BRONZE);
    }

    @Test
    void ordersTheStallDeclinedDoNotCountAgainstTheCustomer() {
        OrderStats stats = new OrderStats(5, 0, 30, 0, 500_000);

        assertThat(stats.completionRate()).isEqualTo(100);
        assertThat(policy.tierOf(stats)).isEqualTo(Tier.SILVER);
    }

    @Test
    void completionRateIsEmptyUntilAnOrderIsFinished() {
        assertThat(new OrderStats(0, 0, 3, 2, 0).completionRate()).isNull();
        assertThat(stats(2, 1, 0).completionRate()).isEqualTo(66);
    }

    @Test
    void nextTierSaysWhatIsStillMissing() {
        NextTierResource next = policy.next(stats(12, 5, 1_750_000));

        // 12 + 5 → 70%: đang ở Bạc, kế tiếp là Vàng
        assertThat(next.tier()).isEqualTo(Tier.GOLD);
        assertThat(next.ordersNeeded()).isEqualTo(3);
        assertThat(next.spendNeeded()).isEqualTo(250_000);
        assertThat(next.completionRateNeeded()).isEqualTo(75);
    }

    @Test
    void nextTierLeavesOutARateThatIsAlreadyMet() {
        NextTierResource next = policy.next(stats(1, 0, 100_000));

        assertThat(next.tier()).isEqualTo(Tier.SILVER);
        assertThat(next.ordersNeeded()).isEqualTo(4);
        assertThat(next.spendNeeded()).isEqualTo(400_000);
        assertThat(next.completionRateNeeded()).isNull();
    }

    @Test
    void diamondHasNoNextTier() {
        assertThat(policy.next(stats(50, 0, 9_000_000))).isNull();
    }
}
