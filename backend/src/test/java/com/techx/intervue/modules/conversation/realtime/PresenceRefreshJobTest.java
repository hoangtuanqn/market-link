package com.techx.intervue.modules.conversation.realtime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.user.SimpUser;
import org.springframework.messaging.simp.user.SimpUserRegistry;

class PresenceRefreshJobTest {

    @Test
    void refreshesTheTtlOfEveryConnectedUser() {
        SimpUserRegistry registry = mock(SimpUserRegistry.class);
        SimpUser u7 = mock(SimpUser.class);
        SimpUser u9 = mock(SimpUser.class);
        when(u7.getName()).thenReturn("7");
        when(u9.getName()).thenReturn("9");
        when(registry.getUsers()).thenReturn(Set.of(u7, u9));
        PresenceService presence = mock(PresenceService.class);

        new PresenceRefreshJob(registry, presence).run();

        verify(presence)
                .touch(
                        org.mockito.ArgumentMatchers.argThat(
                                ids -> ids.containsAll(List.of(7L, 9L)) && ids.size() == 2));
    }

    @Test
    void nobodyConnectedTouchesNothing() {
        SimpUserRegistry registry = mock(SimpUserRegistry.class);
        when(registry.getUsers()).thenReturn(Set.of());
        PresenceService presence = mock(PresenceService.class);

        new PresenceRefreshJob(registry, presence).run();

        verify(presence, never()).touch(any());
    }
}
