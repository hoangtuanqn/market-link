package com.techx.intervue.modules.conversation.realtime;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.user.SimpUser;
import org.springframework.messaging.simp.user.SimpUserRegistry;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Tập session online có TTL 30 phút chỉ được đặt lúc CONNECT (PresenceService). Ai mở tab lâu hơn
 * thế mà không reconnect sẽ bị coi là offline dù socket còn sống — job này làm mới TTL cho mọi user
 * còn trong SimpUserRegistry, mỗi 5 phút, để không xảy ra.
 */
@Component
@RequiredArgsConstructor
public class PresenceRefreshJob {

    private final SimpUserRegistry userRegistry;
    private final PresenceService presence;

    @Scheduled(fixedDelayString = "PT5M", initialDelayString = "PT5M")
    public void run() {
        List<Long> online =
                userRegistry.getUsers().stream()
                        .map(SimpUser::getName)
                        .map(Long::parseLong)
                        .toList();
        if (!online.isEmpty()) {
            presence.touch(online);
        }
    }
}
