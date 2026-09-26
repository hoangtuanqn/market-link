package com.techx.intervue.modules.conversation.realtime;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.user.SimpUser;
import org.springframework.messaging.simp.user.SimpUserRegistry;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * The set of online sessions has a 30-minute TTL that is only set at CONNECT (PresenceService).
 * Someone who keeps a tab open longer than that without reconnecting would be seen as offline even
 * though the socket is alive — this job refreshes the TTL for every user still in SimpUserRegistry,
 * every 5 minutes, so that does not happen.
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
