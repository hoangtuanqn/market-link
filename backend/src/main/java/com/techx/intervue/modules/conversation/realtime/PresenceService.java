package com.techx.intervue.modules.conversation.realtime;

import com.techx.intervue.modules.conversation.entities.UserPresence;
import com.techx.intervue.modules.conversation.repositories.UserPresenceRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PresenceService {

    public record PresenceInfo(boolean online, Instant lastSeenAt) {}

    static final Duration ONLINE_TTL = Duration.ofMinutes(30);
    static final Duration LAST_SEEN_THROTTLE = Duration.ofSeconds(60);

    private static final DefaultRedisScript<Long> CONNECT =
            new DefaultRedisScript<>(
                    "local before = redis.call('SCARD', KEYS[1]);"
                            + " redis.call('SADD', KEYS[1], ARGV[1]);"
                            + " redis.call('EXPIRE', KEYS[1], ARGV[2]);"
                            + " return before",
                    Long.class);

    private static final DefaultRedisScript<Long> DISCONNECT =
            new DefaultRedisScript<>(
                    "redis.call('SREM', KEYS[1], ARGV[1]); return redis.call('SCARD', KEYS[1])",
                    Long.class);

    private final StringRedisTemplate redis;
    private final UserPresenceRepository presences;
    private final Clock clock;

    static String onlineKey(Long userId) {
        return "chat:online:" + userId;
    }

    static String throttleKey(Long userId) {
        return "chat:lastseen-written:" + userId;
    }

    public boolean connected(Long userId, String sessionId) {
        Long before =
                redis.execute(
                        CONNECT,
                        List.of(onlineKey(userId)),
                        sessionId,
                        String.valueOf(ONLINE_TTL.toSeconds()));
        return before == null || before == 0;
    }

    public void touch(Collection<Long> userIds) {
        for (Long id : userIds) {
            redis.expire(onlineKey(id), ONLINE_TTL);
        }
    }

    public boolean disconnected(Long userId, String sessionId) {
        Long left = redis.execute(DISCONNECT, List.of(onlineKey(userId)), sessionId);
        boolean offline = left == null || left == 0;
        if (offline) {
            recordLastSeen(userId);
        }
        return offline;
    }

    public Map<Long, PresenceInfo> snapshot(Collection<Long> userIds) {
        if (userIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, Instant> lastSeen =
                presences.findAllById(userIds).stream()
                        .collect(
                                Collectors.toMap(
                                        UserPresence::getUserId, UserPresence::getLastSeenAt));
        Map<Long, PresenceInfo> out = new HashMap<>();
        for (Long id : userIds) {
            Long size = redis.opsForSet().size(onlineKey(id));
            boolean online = size != null && size > 0;
            out.put(id, new PresenceInfo(online, lastSeen.get(id)));
        }
        return out;
    }

    public Instant lastSeen(Long userId) {
        return presences.findById(userId).map(UserPresence::getLastSeenAt).orElse(null);
    }

    private void recordLastSeen(Long userId) {
        Boolean first =
                redis.opsForValue().setIfAbsent(throttleKey(userId), "1", LAST_SEEN_THROTTLE);
        if (Boolean.TRUE.equals(first)) {
            presences.save(new UserPresence(userId, clock.instant()));
        }
    }
}
