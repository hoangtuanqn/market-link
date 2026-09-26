package com.techx.intervue.modules.achievement.services.interfaces;

import com.techx.intervue.modules.achievement.enums.Tier;
import com.techx.intervue.modules.achievement.resources.AchievementResource;
import java.util.Collection;
import java.util.Map;

public interface AchievementServiceInterface {

    /** The full achievements of the signed-in user (Account page). */
    AchievementResource forUser(Long userId);

    /**
     * Tier only, for places where other people see it (reviews, messages, stall-side orders): never
     * exposes the number of orders or the amounts. Every id in the input is present in the result.
     */
    Map<Long, Tier> tiersFor(Collection<Long> userIds);
}
