package com.techx.intervue.modules.achievement.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.achievement.config.TierProperties;
import com.techx.intervue.modules.achievement.config.TierProperties.Threshold;
import com.techx.intervue.modules.achievement.enums.Tier;
import com.techx.intervue.modules.achievement.repositories.OrderStatsRepository;
import com.techx.intervue.modules.achievement.resources.AchievementResource;
import com.techx.intervue.modules.achievement.resources.OrderStats;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.BadSqlGrammarException;

class AchievementServiceTest {

    private OrderStatsRepository repository;
    private AchievementService service;

    @BeforeEach
    void setUp() {
        repository = mock(OrderStatsRepository.class);
        TierPolicy policy =
                new TierPolicy(
                        new TierProperties(
                                new Threshold(5, 500_000, 60),
                                new Threshold(15, 2_000_000, 75),
                                new Threshold(40, 6_000_000, 85)));
        service = new AchievementService(repository, policy);
    }

    @Test
    void summarisesTheCustomersOwnOrders() {
        when(repository.statsFor(List.of(7L)))
                .thenReturn(Map.of(7L, new OrderStats(6, 1, 2, 3, 820_000)));

        AchievementResource a = service.forUser(7L);

        assertThat(a.available()).isTrue();
        assertThat(a.tier()).isEqualTo(Tier.SILVER);
        assertThat(a.completed()).isEqualTo(6);
        assertThat(a.cancelled()).isEqualTo(1);
        assertThat(a.declined()).isEqualTo(2);
        assertThat(a.inProgress()).isEqualTo(3);
        assertThat(a.totalSpent()).isEqualTo(820_000);
        assertThat(a.completionRate()).isEqualTo(85);
        assertThat(a.next().tier()).isEqualTo(Tier.GOLD);
    }

    @Test
    void aCustomerWithNoOrdersIsBronzeWithNothingCounted() {
        when(repository.statsFor(List.of(7L))).thenReturn(Map.of());

        AchievementResource a = service.forUser(7L);

        assertThat(a.available()).isTrue();
        assertThat(a.tier()).isEqualTo(Tier.BRONZE);
        assertThat(a.completed()).isZero();
        assertThat(a.completionRate()).isNull();
        assertThat(a.next().tier()).isEqualTo(Tier.SILVER);
    }

    @Test
    void saysTheFiguresAreUnavailableWhenOrdersCannotBeRead() {
        // bảng orders chưa có (lõi đơn hàng chưa làm) hoặc DB lỗi: không để lộ 500 ra trang Account
        when(repository.statsFor(any()))
                .thenThrow(
                        new BadSqlGrammarException("stats", "SELECT", new java.sql.SQLException()));

        AchievementResource a = service.forUser(7L);

        assertThat(a.available()).isFalse();
        assertThat(a.tier()).isEqualTo(Tier.BRONZE);
        assertThat(a.completed()).isZero();
        assertThat(a.next()).isNull();
    }

    @Test
    void tiersForSeveralPeopleComeFromOneLookup() {
        when(repository.statsFor(List.of(1L, 2L, 3L)))
                .thenReturn(
                        Map.of(
                                1L, new OrderStats(40, 0, 0, 0, 7_000_000),
                                2L, new OrderStats(5, 0, 0, 0, 600_000)));

        Map<Long, Tier> tiers = service.tiersFor(List.of(1L, 2L, 3L));

        assertThat(tiers)
                .containsEntry(1L, Tier.DIAMOND)
                .containsEntry(2L, Tier.SILVER)
                .containsEntry(3L, Tier.BRONZE);
    }

    @Test
    void tiersFallBackToBronzeWhenOrdersCannotBeRead() {
        when(repository.statsFor(any()))
                .thenThrow(
                        new BadSqlGrammarException("stats", "SELECT", new java.sql.SQLException()));

        assertThat(service.tiersFor(List.of(1L, 2L)))
                .containsEntry(1L, Tier.BRONZE)
                .containsEntry(2L, Tier.BRONZE);
    }
}
