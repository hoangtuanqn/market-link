package com.techx.intervue.modules.conversation.realtime;

import com.techx.intervue.modules.conversation.entities.UserPresence;
import com.techx.intervue.modules.conversation.repositories.UserPresenceRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

/**
 * Spec 5.1: online = tập session STOMP đang mở của user trong Redis (hai tab không làm sai trạng
 * thái); TTL 30 phút để app chết bất ngờ không để lại "online" mãi. Offline → ghi last_seen_at
 * xuống MySQL, không quá một lần mỗi 60 giây cho mỗi user.
 */
@Service
@RequiredArgsConstructor
public class PresenceService {

    public record PresenceInfo(boolean online, Instant lastSeenAt) {}

    static final Duration ONLINE_TTL = Duration.ofMinutes(30);
    static final Duration LAST_SEEN_THROTTLE = Duration.ofSeconds(60);

    private final StringRedisTemplate redis;
    private final UserPresenceRepository presences;
    private final Clock clock;

    static String onlineKey(Long userId) {
        return "chat:online:" + userId;
    }

    static String throttleKey(Long userId) {
        return "chat:lastseen-written:" + userId;
    }

    /**
     * @return true nếu đây là session đầu tiên — user vừa chuyển sang online.
     */
    public boolean connected(Long userId, String sessionId) {
        String key = onlineKey(userId);
        Long before = redis.opsForSet().size(key);
        redis.opsForSet().add(key, sessionId);
        redis.expire(key, ONLINE_TTL);
        return before == null || before == 0;
    }

    /**
     * @return true nếu không còn session nào — user vừa chuyển sang offline.
     */
    public boolean disconnected(Long userId, String sessionId) {
        String key = onlineKey(userId);
        redis.opsForSet().remove(key, sessionId);
        Long left = redis.opsForSet().size(key);
        boolean offline = left == null || left == 0;
        if (offline) {
            redis.delete(key);
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
