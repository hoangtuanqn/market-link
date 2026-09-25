package com.techx.intervue.modules.conversation.realtime;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.conversation.repositories.UserPresenceRepository;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.repositories.UserRepository;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.redis.core.StringRedisTemplate;

/** Redis + MySQL thật (như CI). Online = tập session; offline cuối cùng ghi last_seen_at. */
@SpringBootTest
class PresenceServiceTest {

    @Autowired PresenceService presence;
    @Autowired UserRepository users;
    @Autowired UserPresenceRepository presences;
    @Autowired StringRedisTemplate redis;
    User u;

    @BeforeEach
    void setUp() {
        String tag = UUID.randomUUID().toString().substring(0, 8);
        u =
                users.save(
                        User.builder()
                                .fullName("P " + tag)
                                .email(tag + "@presence.test")
                                .phone(
                                        "06"
                                                + String.format(
                                                        "%08d",
                                                        Math.abs(tag.hashCode()) % 100_000_000))
                                .passwordHash("x")
                                .role(RoleType.CUSTOMER)
                                .build());
    }

    @AfterEach
    void tearDown() {
        redis.delete(
                List.of(
                        PresenceService.onlineKey(u.getId()),
                        PresenceService.throttleKey(u.getId())));
        presences.deleteById(u.getId());
        users.deleteById(u.getId());
    }

    @Test
    void firstConnectionMakesTheUserOnlineAndLastConnectionMakesThemOffline() {
        assertThat(presence.connected(u.getId(), "s1")).isTrue();
        assertThat(presence.snapshot(List.of(u.getId())).get(u.getId()).online()).isTrue();
        assertThat(presence.disconnected(u.getId(), "s1")).isTrue();
        assertThat(presence.snapshot(List.of(u.getId())).get(u.getId()).online()).isFalse();
    }

    @Test
    void closingOneOfTwoSessionsKeepsTheUserOnline() {
        presence.connected(u.getId(), "s1");
        assertThat(presence.connected(u.getId(), "s2"))
                .as("second tab is not a new 'online'")
                .isFalse();

        assertThat(presence.disconnected(u.getId(), "s1")).as("one tab still open").isFalse();
        assertThat(presence.snapshot(List.of(u.getId())).get(u.getId()).online()).isTrue();
    }

    @Test
    void goingOfflineRecordsLastSeenInTheDatabase() {
        presence.connected(u.getId(), "s1");
        presence.disconnected(u.getId(), "s1");

        assertThat(presences.findById(u.getId())).isPresent();
        assertThat(presence.snapshot(List.of(u.getId())).get(u.getId()).lastSeenAt()).isNotNull();
    }

    @Test
    void unknownUsersAreOfflineWithNoLastSeen() {
        PresenceService.PresenceInfo info = presence.snapshot(List.of(999_999L)).get(999_999L);
        assertThat(info.online()).isFalse();
        assertThat(info.lastSeenAt()).isNull();
    }
}
