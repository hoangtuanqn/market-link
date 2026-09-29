package com.techx.intervue.modules.platform;

import com.techx.intervue.modules.user.entities.AdminMfa;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.repositories.AdminMfaRepository;
import com.techx.intervue.modules.user.repositories.UserRepository;
import com.techx.intervue.modules.user.services.impl.UserSessionCache;
import com.techx.intervue.modules.user.services.interfaces.JwtServiceInterface;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Creates a user with a real session and makes real HTTP calls (the repo has no MockMvc on the Boot
 * 4 classpath yet).
 */
public class PlatformTestSupport {

    private final UserRepository users;
    private final UserSessionCache sessions;
    private final JwtServiceInterface jwt;
    private final AdminMfaRepository adminMfa;
    private final int port;
    private final HttpClient http = HttpClient.newHttpClient();
    private final List<User> created = new ArrayList<>();

    public PlatformTestSupport(
            UserRepository users,
            UserSessionCache sessions,
            JwtServiceInterface jwt,
            AdminMfaRepository adminMfa,
            int port) {
        this.users = users;
        this.sessions = sessions;
        this.jwt = jwt;
        this.adminMfa = adminMfa;
        this.port = port;
    }

    public User user(RoleType role) {
        String tag = UUID.randomUUID().toString().substring(0, 8);
        User u =
                User.builder()
                        .fullName("Platform " + tag)
                        .email(tag + "@platform-api.test")
                        .phone("07" + String.format("%08d", Math.abs(tag.hashCode()) % 100_000_000))
                        .passwordHash("x")
                        .role(role)
                        .build();
        u = users.save(u);
        if (role == RoleType.ADMIN) {
            // FR-008: SecurityConfig refuses /api/v1/admin/** to an admin whose two-step
            // verification is not set up, so a test admin has to be one that finished it.
            adminMfa.save(
                    AdminMfa.builder()
                            .userId(u.getId())
                            .secretEncrypted("test-secret")
                            .enabledAt(Instant.now())
                            .build());
        }
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

    public void cleanUp() {
        for (User u : created) {
            sessions.evict(u.getId());
            users.deleteById(u.getId());
        }
        created.clear();
    }
}
