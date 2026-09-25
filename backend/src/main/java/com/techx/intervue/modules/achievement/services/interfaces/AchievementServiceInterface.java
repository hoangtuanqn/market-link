package com.techx.intervue.modules.achievement.services.interfaces;

import com.techx.intervue.modules.achievement.enums.Tier;
import com.techx.intervue.modules.achievement.resources.AchievementResource;
import java.util.Collection;
import java.util.Map;

public interface AchievementServiceInterface {

    /** Thành tích đầy đủ của chính người đang đăng nhập (trang Account). */
    AchievementResource forUser(Long userId);

    /**
     * Chỉ hạng, cho những chỗ người khác thấy (đánh giá, tin nhắn, đơn phía sạp): không bao giờ lộ
     * số đơn hay số tiền. Mọi id trong đầu vào đều có mặt trong kết quả.
     */
    Map<Long, Tier> tiersFor(Collection<Long> userIds);
}
