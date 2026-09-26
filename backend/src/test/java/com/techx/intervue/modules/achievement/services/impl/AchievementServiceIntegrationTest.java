package com.techx.intervue.modules.achievement.services.impl;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.achievement.enums.Tier;
import com.techx.intervue.modules.achievement.resources.AchievementResource;
import com.techx.intervue.modules.achievement.services.interfaces.AchievementServiceInterface;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.repositories.UserRepository;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

/**
 * Runs on real MySQL. Correct both before and after the orders migration exists: today the table
 * does not exist so available = false, later a new user has no orders yet — both cases are Bronze,
 * 0 orders, and no error is thrown outward.
 */
@SpringBootTest
@Transactional
class AchievementServiceIntegrationTest {

    @Autowired AchievementServiceInterface achievements;
    @Autowired UserRepository users;

    private User newCustomer() {
        String tag = UUID.randomUUID().toString().substring(0, 8);
        return users.save(
                User.builder()
                        .fullName("Test " + tag)
                        .email(tag + "@achievement.test")
                        .phone("09" + String.format("%08d", Math.abs(tag.hashCode()) % 100_000_000))
                        .passwordHash("x")
                        .role(RoleType.CUSTOMER)
                        .build());
    }

    @Test
    void aNewCustomerIsBronzeWithNoOrdersWhetherOrNotOrdersExistYet() {
        User customer = newCustomer();

        AchievementResource a = achievements.forUser(customer.getId());

        assertThat(a.tier()).isEqualTo(Tier.BRONZE);
        assertThat(a.completed()).isZero();
        assertThat(a.totalSpent()).isZero();
        assertThat(achievements.tiersFor(List.of(customer.getId())))
                .containsEntry(customer.getId(), Tier.BRONZE);
    }
}
