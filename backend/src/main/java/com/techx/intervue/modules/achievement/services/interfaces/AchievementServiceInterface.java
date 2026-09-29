package com.techx.intervue.modules.achievement.services.interfaces;

import com.techx.intervue.modules.achievement.enums.Tier;
import com.techx.intervue.modules.achievement.resources.AchievementResource;
import java.util.Collection;
import java.util.Map;

public interface AchievementServiceInterface {

    AchievementResource forUser(Long userId);

    Map<Long, Tier> tiersFor(Collection<Long> userIds);
}
