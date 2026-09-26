package com.techx.intervue.modules.notification;

import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.enums.UserStatus;
import com.techx.intervue.modules.user.repositories.UserRepository;
import com.techx.intervue.modules.user.services.impl.UserSessionCache;
import com.techx.intervue.modules.user.services.interfaces.JwtServiceInterface;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Creates a user with a real session and makes real HTTP calls (the repo has no MockMvc on the Boot
 * 4 classpath yet).
 */
public class NotificationTestSupport {

    private final UserRepository users;
    private final UserSessionCache sessions;
    private final JwtServiceInterface jwt;
    private final int port;
    private final HttpClient http = HttpClient.newHttpClient();
    private final List<User> created = new ArrayList<>();

    public NotificationTestSupport(
            UserRepository users, UserSessionCache sessions, JwtServiceInterface jwt, int port) {
        this.users = users;
        this.sessions = sessions;
        this.jwt = jwt;
        this.port = port;
    }

    public User user(RoleType role) {
        return user(role, UserStatus.ACTIVE);
    }

    public User user(RoleType role, UserStatus status) {
        String tag = UUID.randomUUID().toString().substring(0, 8);
        User u =
                User.builder()
                        .fullName("Notif " + tag)
                        .email(tag + "@notif-api.test")
                        .phone("06" + String.format("%08d", Math.abs(tag.hashCode()) % 100_000_000))
                        .passwordHash("x")
                        .role(role)
                        .build();
        u.setStatus(status);
        u = users.save(u);
        sessions.set(u.getId(), u.getEmail(), Set.of(role), Duration.ofMinutes(5));
        created.add(u);
        return u;
    }

    public String token(User u) {
        return jwt.generateToken(u.getId());
    }

    public HttpResponse<String> send(String method, String path, User as, String json) {
        HttpRequest.Builder b =
                HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
                        .method(
                                method,
                                json == null
                                        ? HttpRequest.BodyPublishers.noBody()
                                        : HttpRequest.BodyPublishers.ofString(json))
                        .header("Content-Type", "application/json");
        if (as != null) {
            b.header("Authorization", "Bearer " + token(as));
        }
        try {
            return http.send(b.build(), HttpResponse.BodyHandlers.ofString());
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    /**
     * Delete the users created; FK ON DELETE CASCADE deletes notifications / preferences /
     * settings.
     */
    public void cleanUp() {
        for (User u : created) {
            sessions.evict(u.getId());
            users.deleteById(u.getId());
        }
        created.clear();
    }
}
