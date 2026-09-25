# Chat Customer ↔ Farmer — Plan 2/4: Realtime qua RabbitMQ + STOMP · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tin nhắn, số chưa đọc, "đã xem", "đang gõ" và online/offline tới trình duyệt ngay lập tức qua WebSocket/STOMP, phát qua RabbitMQ, xác thực bằng JWT ở frame CONNECT — không sửa service nghiệp vụ của Plan 1.

**Architecture:** Spring `@EnableWebSocketMessageBroker` với endpoint `/ws`; broker là RabbitMQ (`enableStompBrokerRelay`) khi `app.chat.rabbitmq.host` được đặt, còn không thì simple broker trong app (CI và test không cần Rabbit). Mọi sự kiện đi ra theo user (`/user/queue/...`), không có topic theo thread. `StompChatEventPublisher` thay bản ghi log của Plan 1 tại seam `ChatEventPublisherInterface`. Presence: tập session đang mở trong Redis + `user_presence.last_seen_at` trong MySQL.

**Tech Stack:** Spring Boot 4.1.1 · Spring Framework 7.0.9 (`spring-websocket`, `spring-messaging`) · `reactor-netty-core` (TCP client cho relay) · RabbitMQ 4 + plugin `rabbitmq_stomp` · Redis (`StringRedisTemplate`) · Flyway · JUnit 5 + Mockito · `WebSocketStompClient` cho test tích hợp.

**Spec:** `docs/superpowers/specs/2026-09-25-farmer-customer-chat-design.md` — plan này thực thi §5.1 (`user_presence`), §7 toàn bộ (7.1–7.5), §12.1–12.3 (RabbitMQ, biến môi trường, dependency), FR-111, FR-112, FR-113 phần realtime, và bước 4–6 của §14. Đọc spec trước.

Plan 1 (`docs/superpowers/plans/2026-09-25-chat-backend-conversations.md`) đã xong trên nhánh `feature/FR-110-chat-conversations` (PR #108). Plan này **tách nhánh mới từ nhánh đó** để PR #108 không phình.

## Global Constraints

- **R-01**: commit gắn `FR-111` (realtime), `FR-112` (đang gõ / đã xem / online), `FR-113` (badge realtime).
- **R-02**: không sửa `db/schema.sql`, `docs/api-contract.md`, `docs/decisions.md`.
- **R-03**: migration mới `V20260925010__create_user_presence_table.sql`. Số đổi hai lần trong lúc viết plan
  này: dev đã đổi `conversations`/`messages` từ 003/004 sang 005/006 (trùng `user_settings`, #107), rồi
  007–009 bị một PR khác (farmer_profiles) chiếm trong lúc rebase. `dev` đang merge rất nhanh — mỗi lần
  rebase phải soi lại số cao nhất thật sự, không tin số đã ghi trong tài liệu trước đó. Migration này
  chưa merge nên tự đổi số được, không phạm R-03.
- **R-04**: SQL tham số hoá; **R-06**: `/app/typing` kiểm tư cách thành viên trước khi chuyển tiếp.
- **R-08 / AGENTS.md**: nhánh `feature/FR-111-chat-realtime` tách từ `feature/FR-110-chat-conversations`; PR vào `dev` **sau khi** #108 merge (hoặc PR stacked, base = nhánh FR-110 — LEAD chọn). Không push `dev`/`main`.
- Spec §7.3: JWT ở header `Authorization` của frame `CONNECT`; **không** qua query string.
- Spec §7.4: chỉ destination theo user; client chỉ được SUBSCRIBE `/user/queue/**` và SEND `/app/**`; `/topic/**` và `/queue/**` thô bị từ chối.
- Spec §7.2: hai dòng `setUserDestinationBroadcast` / `setUserRegistryBroadcast` khi dùng relay.
- Spec §7.5: service nghiệp vụ không gọi `SimpMessagingTemplate`; chỉ `StompChatEventPublisher` được gọi.
- Spec §12.2 `VITE_WS_URL` là biến frontend → Plan 4 (UI). Plan này chỉ có biến backend/compose.
- CONTRIBUTING §6: biến môi trường mới cập nhật **cùng lúc** `.env.example`, `.env.production.example`, `application.yaml`, `application-prod.yaml.example`, `docker-compose.yml`, `docker-compose.prod.yml`. Prod **không** có `${VAR:default}` (CI Env guard).
- Copy trả người dùng: tiếng Anh, sentence case. Commit kết thúc bằng `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Lệnh Maven chạy trong container của stack `market-link-chat` (worktree `market-link-chat`, xem Plan 1 "Chuẩn bị"). Chạy một class: `docker compose exec -T backend ./mvnw -B test -Dtest=<Class>`.

## Review Focus

1. **Token hết hạn / bị thu hồi lúc CONNECT** → phải bị từ chối bằng lỗi STOMP rõ ràng, không được nối vào với principal null (một client không tên sẽ nhận `/user/queue/*` của… không ai, nhưng vẫn giữ kết nối và có thể SEND `/app/typing` không danh tính). → Task 3, test `connectWithRevokedTokenIsRejected` và `sendWithoutPrincipalIsRejected`.
2. **Client subscribe thẳng `/queue/messages-user<sessionId>` của người khác** (đoán session id) → phải bị chặn vì destination không bắt đầu bằng `/user/queue/`. → Task 3, test `subscribeOutsideUserQueueIsRejected`.
3. **`/app/typing` cho thread mình không thuộc** → không được chuyển tiếp gì, và không lộ thread có tồn tại hay không. → Task 5, test `typingForAForeignThreadIsDropped`.
4. **Mở hai tab rồi đóng một tab** → vẫn phải online; đóng tab cuối mới offline. → Task 6, test `closingOneOfTwoSessionsKeepsTheUserOnline`.
5. **Tin mới tới khi người nhận đang offline** → không được lỗi, không được mất tin (đã ở DB), badge đúng lần mở sau. → Task 4, test `publishingToAnOfflineRecipientDoesNotThrow` (SimpMessagingTemplate chỉ đẩy vào broker; không có subscriber thì broker bỏ — phải không throw).

Một thứ chỉ kiểm được bằng tay với Rabbit thật: relay rớt kết nối rồi Rabbit lên lại → backend tự nối lại. Ghim vào smoke tay Task 8.

---

### Task 1: Dependency, endpoint `/ws`, chọn broker theo cấu hình

**Files:**
- Modify: `backend/pom.xml` (thêm 2 dependency)
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/realtime/ChatRealtimeProperties.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/realtime/WebSocketConfig.java`
- Modify: `backend/src/main/java/com/techx/intervue/config/SecurityConfig.java` (permit `/ws`)
- Modify: `backend/src/main/resources/application.yaml` (khối `app.chat`)
- Test: `backend/src/test/java/com/techx/intervue/modules/conversation/realtime/WebSocketConfigTest.java`

**Interfaces:**
- Produces: property `app.chat.rabbitmq.host` (rỗng = simple broker), `app.chat.rabbitmq.stomp-port` (61613), `app.chat.rabbitmq.user`, `app.chat.rabbitmq.password`; endpoint `/ws`; prefix `/app` (inbound), `/user` (user destination), `/queue` + `/topic` (broker). `ChatRealtimeProperties` record với `boolean relayEnabled()`.

- [ ] **Step 1: Test — cấu hình phải có `SimpleBrokerMessageHandler` khi không có host, `StompBrokerRelayMessageHandler` khi có**

```java
package com.techx.intervue.modules.conversation.realtime;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.messaging.simp.broker.SimpleBrokerMessageHandler;
import org.springframework.messaging.simp.stomp.StompBrokerRelayMessageHandler;
import org.springframework.test.context.TestPropertySource;

class WebSocketConfigTest {

    @Nested
    @SpringBootTest
    @TestPropertySource(properties = "app.chat.rabbitmq.host=")
    class WithoutRabbit {
        @Autowired ApplicationContext ctx;

        @Test
        void usesTheSimpleBrokerSoCiAndTestsNeedNoRabbit() {
            // getBeansOfType bỏ qua NullBean: @Bean trả null cho broker không dùng vẫn có tên đăng ký
            assertThat(ctx.getBeansOfType(SimpleBrokerMessageHandler.class)).isNotEmpty();
            assertThat(ctx.getBeansOfType(StompBrokerRelayMessageHandler.class)).isEmpty();
        }
    }

    @Nested
    @SpringBootTest
    @TestPropertySource(
            properties = {"app.chat.rabbitmq.host=rabbitmq-that-does-not-exist", "app.chat.rabbitmq.stomp-port=61613"})
    class WithRabbitConfigured {
        @Autowired ApplicationContext ctx;

        /** Relay nối TCP bất đồng bộ và tự thử lại: host sai không được làm context không boot. */
        @Test
        void usesTheRelayAndStillBootsWhenTheBrokerIsUnreachable() {
            assertThat(ctx.getBeansOfType(StompBrokerRelayMessageHandler.class)).isNotEmpty();
            assertThat(ctx.getBeansOfType(SimpleBrokerMessageHandler.class)).isEmpty();
        }
    }
}
```

- [ ] **Step 2: Chạy, xác nhận thất bại**

Run: `docker compose exec -T backend ./mvnw -B -q test -Dtest='WebSocketConfigTest*'`
Expected: `BUILD FAILURE` — `package org.springframework.messaging.simp.broker does not exist` (chưa có starter websocket).

- [ ] **Step 3: Thêm dependency vào `backend/pom.xml`** (sau `spring-boot-starter-web`)

```xml
		<!-- FR-111: WebSocket + STOMP. reactor-netty-core là TCP client bắt buộc của enableStompBrokerRelay -->
		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-websocket</artifactId>
		</dependency>
		<dependency>
			<groupId>io.projectreactor.netty</groupId>
			<artifactId>reactor-netty-core</artifactId>
		</dependency>
```

- [ ] **Step 4: Properties record**

```java
package com.techx.intervue.modules.conversation.realtime;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * app.chat.rabbitmq.host rỗng → simple broker trong app (CI, test, máy dev không có Rabbit).
 * Có host → relay sang RabbitMQ (docker compose, production).
 */
@ConfigurationProperties(prefix = "app.chat")
public record ChatRealtimeProperties(Rabbitmq rabbitmq) {

    public record Rabbitmq(String host, int stompPort, String user, String password) {}

    public boolean relayEnabled() {
        return rabbitmq != null && rabbitmq.host() != null && !rabbitmq.host().isBlank();
    }
}
```

- [ ] **Step 5: `WebSocketConfig`**

```java
package com.techx.intervue.modules.conversation.realtime;

import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/** Spec 7.2 / 7.4. Endpoint /ws, WebSocket thuần (không SockJS), mọi sự kiện đi ra theo user. */
@Slf4j
@Configuration
@EnableWebSocketMessageBroker
@EnableConfigurationProperties(ChatRealtimeProperties.class)
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    public static final String ENDPOINT = "/ws";
    public static final String APP_PREFIX = "/app";
    public static final String USER_PREFIX = "/user";

    private final ChatRealtimeProperties props;

    @Value("${app.cors.allowed-origins}")
    private List<String> allowedOrigins;

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint(ENDPOINT).setAllowedOriginPatterns(allowedOrigins.toArray(String[]::new));
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.setApplicationDestinationPrefixes(APP_PREFIX);
        registry.setUserDestinationPrefix(USER_PREFIX);
        if (props.relayEnabled()) {
            ChatRealtimeProperties.Rabbitmq r = props.rabbitmq();
            registry.enableStompBrokerRelay("/queue", "/topic")
                    .setRelayHost(r.host())
                    .setRelayPort(r.stompPort())
                    .setClientLogin(r.user())
                    .setClientPasscode(r.password())
                    .setSystemLogin(r.user())
                    .setSystemPasscode(r.password())
                    // Thiếu hai dòng này thì /user/queue/* chỉ tới người nối vào đúng instance (spec 7.2)
                    .setUserDestinationBroadcast("/topic/unresolved-user")
                    .setUserRegistryBroadcast("/topic/user-registry");
            log.info("Chat realtime: STOMP relay via RabbitMQ at {}:{}", r.host(), r.stompPort());
        } else {
            registry.enableSimpleBroker("/queue", "/topic");
            log.warn("Chat realtime: app.chat.rabbitmq.host is empty, using the in-app simple broker (single instance only)");
        }
    }
}
```

- [ ] **Step 6: `SecurityConfig` — handshake `/ws` là public (JWT kiểm ở frame CONNECT, spec 7.3)**

Trong `securityFilterChain`, ngay trước `.requestMatchers("/ping")`:

```java
                                        // FR-111: WebSocket handshake không mang header Authorization;
                                        // JWT được kiểm ở frame STOMP CONNECT (StompAuthInterceptor)
                                        .requestMatchers("/ws", "/ws/**")
                                        .permitAll()
```

- [ ] **Step 7: `application.yaml` — khối `app.chat`** (dưới `app.mfa`)

```yaml
  # FR-111: chat realtime. Host rỗng = simple broker trong app (CI/test); docker compose và prod
  # đặt RABBITMQ_HOST để relay sang RabbitMQ (plugin rabbitmq_stomp, cổng 61613).
  chat:
    rabbitmq:
      host: ${RABBITMQ_HOST:}
      stomp-port: ${RABBITMQ_STOMP_PORT:61613}
      user: ${RABBITMQ_USER:guest}
      password: ${RABBITMQ_PASSWORD:guest}
```

- [ ] **Step 8: Chạy test, xác nhận pass**

Run: `docker compose exec -T backend ./mvnw -B test -Dtest='WebSocketConfigTest*'`
Expected: `Tests run: 2, Failures: 0`. Nếu `WithRabbitConfigured` **không boot** (context fail vì relay không nối được) thì spec §7.2 "backend không khởi động" là đúng — ghi ledger, đổi test thành `@Disabled` kèm lý do, và giữ nguyên cảnh báo trong README (Task 8). Nếu boot được (dự kiến: relay tự thử lại, log `TCP connection failure`) thì sửa câu đó trong spec §7.2 và §16 ở Task 8.

- [ ] **Step 9: Restart backend của stack chat, xác nhận `/ws` không còn 401**

```bash
docker compose restart backend && sleep 20
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8082/ws
```

Expected: `400` (Bad Request — thiếu header Upgrade, tức đã qua Security), **không phải** `401`.

- [ ] **Step 10: Format, commit**

```bash
docker compose exec -T backend ./mvnw -q spotless:apply
git add backend/pom.xml backend/src/main/java/com/techx/intervue/modules/conversation/realtime backend/src/main/java/com/techx/intervue/config/SecurityConfig.java backend/src/main/resources/application.yaml backend/src/test/java/com/techx/intervue/modules/conversation/realtime
git commit -m "feat(FR-111): STOMP endpoint /ws with RabbitMQ relay or in-app broker

Relay when app.chat.rabbitmq.host is set (compose, prod); simple broker
otherwise so CI and tests need no RabbitMQ. Handshake is public; the
JWT is checked on the STOMP CONNECT frame (next task).

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: RabbitMQ vào Docker, biến môi trường, Makefile

**Files:**
- Modify: `docker-compose.yml` (service `rabbitmq`, volume, `depends_on` + env của backend)
- Modify: `docker-compose.prod.yml` (rabbitmq không mở cổng, secret bắt buộc)
- Modify: `.env.example`, `.env.production.example`, `backend/src/main/resources/application-prod.yaml.example`
- Modify: `Makefile` (`infra` thêm rabbitmq)
- Modify (local, git-ignore): `.env` của worktree `market-link-chat` (thêm `RABBITMQ_UI_PORT=15673`)

**Interfaces:**
- Produces: container `rabbitmq` (dev: `intervue-rabbitmq`, stack chat: `mlchat-rabbitmq` qua override), STOMP 61613 trong network, UI 15672 → host `${RABBITMQ_UI_PORT:-15672}`; env `RABBITMQ_HOST=rabbitmq`, `RABBITMQ_USER`, `RABBITMQ_PASSWORD`.

- [ ] **Step 1: `docker-compose.yml` — service `rabbitmq`** (sau `redis`)

```yaml
  # FR-111: broker STOMP cho chat realtime. Plugin rabbitmq_stomp không bật sẵn trong image
  # nên bật offline trước khi start. UI quản trị: http://localhost:${RABBITMQ_UI_PORT:-15672}
  rabbitmq:
    image: rabbitmq:4-management-alpine
    container_name: intervue-rabbitmq
    restart: unless-stopped
    command: ["sh", "-c", "rabbitmq-plugins enable --offline rabbitmq_stomp && rabbitmq-server"]
    environment:
      RABBITMQ_DEFAULT_USER: ${RABBITMQ_USER:-marketlink}
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD:-marketlink_pass}
      TZ: ${TZ:-Asia/Ho_Chi_Minh}
    ports:
      - "${RABBITMQ_UI_PORT:-15672}:15672"
    volumes:
      - rabbitmq-data:/var/lib/rabbitmq
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "-q", "check_port_connectivity"]
      interval: 10s
      timeout: 10s
      retries: 10
      start_period: 20s
```

Trong `backend.environment` thêm:

```yaml
      RABBITMQ_HOST: rabbitmq
      RABBITMQ_STOMP_PORT: 61613
      RABBITMQ_USER: ${RABBITMQ_USER:-marketlink}
      RABBITMQ_PASSWORD: ${RABBITMQ_PASSWORD:-marketlink_pass}
```

Trong `backend.depends_on` thêm:

```yaml
      rabbitmq:
        condition: service_healthy
```

Trong `volumes:` cuối file thêm `  rabbitmq-data:`.

- [ ] **Step 2: `docker-compose.prod.yml`** (sau `redis`)

```yaml
  rabbitmq:
    container_name: marketlink-prod-rabbitmq
    environment:
      RABBITMQ_DEFAULT_USER: ${RABBITMQ_USER:?Thiếu RABBITMQ_USER trong .env.production}
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD:?Thiếu RABBITMQ_PASSWORD trong .env.production}
    ports: !reset []
```

Trong `backend.environment` của prod thêm:

```yaml
      RABBITMQ_HOST: rabbitmq
      RABBITMQ_STOMP_PORT: 61613
      RABBITMQ_USER: ${RABBITMQ_USER:?Thiếu RABBITMQ_USER trong .env.production}
      RABBITMQ_PASSWORD: ${RABBITMQ_PASSWORD:?Thiếu RABBITMQ_PASSWORD trong .env.production}
```

- [ ] **Step 3: Ba file env / yaml mẫu**

`.env.example`, sau khối Backend:

```env
# ---------- RabbitMQ (FR-111: chat realtime, plugin STOMP) ----------
RABBITMQ_USER=marketlink
RABBITMQ_PASSWORD=marketlink_pass
```

và trong khối cổng: `RABBITMQ_UI_PORT=15672`.

`.env.production.example`, sau `MYSQL_PASSWORD`:

```env
# ---------- RabbitMQ (không mở cổng ra ngoài, chỉ backend truy cập) ----------
RABBITMQ_USER=marketlink
RABBITMQ_PASSWORD=<openssl rand -base64 24>
```

`application-prod.yaml.example`, cuối file (không có mặc định — CI Env guard):

```yaml
  # FR-111: chat realtime qua RabbitMQ; bắt buộc ở prod
  chat:
    rabbitmq:
      host: ${RABBITMQ_HOST}
      stomp-port: ${RABBITMQ_STOMP_PORT}
      user: ${RABBITMQ_USER}
      password: ${RABBITMQ_PASSWORD}
```

(khối `chat:` nằm dưới `app:` đã có `mfa:`.)

- [ ] **Step 4: `Makefile`** — `infra` thành `$(COMPOSE) up -d mysql redis rabbitmq`; mô tả `tools` thêm "RabbitMQ UI :15672 chạy sẵn cùng stack".

- [ ] **Step 5: Stack chat — override + `.env`**

Thêm vào `/Users/phong/projects/school/fpt-aptech/Code_project/techwiz7/compose.chat-override.yml`: `  rabbitmq:     { container_name: mlchat-rabbitmq }`. Thêm vào `.env` của worktree: `RABBITMQ_UI_PORT=15673`.

- [ ] **Step 6: Dựng và xác nhận relay nối được**

```bash
docker compose --profile app up -d --build backend
sleep 40
docker compose ps --format '{{.Name}}\t{{.Status}}' | grep -E 'rabbitmq|backend'
docker compose logs --since 3m backend 2>&1 | grep -E 'Chat realtime|TCP connection|BrokerAvailabilityEvent|relay' | tail -5
docker compose exec -T rabbitmq rabbitmqctl list_connections user 2>/dev/null | tail -3
```

Expected: `mlchat-rabbitmq ... (healthy)`; log backend `Chat realtime: STOMP relay via RabbitMQ at rabbitmq:61613`; `rabbitmqctl list_connections` có ít nhất 1 connection của user `marketlink` (system session của relay).

- [ ] **Step 7: Env guard + commit**

```bash
bash scripts/check-env-separation.sh
git add docker-compose.yml docker-compose.prod.yml .env.example .env.production.example backend/src/main/resources/application-prod.yaml.example Makefile
git commit -m "chore(FR-111): RabbitMQ with the STOMP plugin in the dev and prod stacks

Backend waits for rabbitmq to be healthy; prod requires RABBITMQ_USER and
RABBITMQ_PASSWORD and exposes no port.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

Expected: env guard in `Môi trường dev và production tách biệt đúng luật.`

---

### Task 3: Xác thực JWT ở frame CONNECT, chặn SUBSCRIBE / SEND ngoài luồng

**Files:**
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/realtime/StompAuthInterceptor.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/conversation/realtime/WebSocketConfig.java` (đăng ký interceptor vào `clientInboundChannel`)
- Test: `backend/src/test/java/com/techx/intervue/modules/conversation/realtime/StompAuthInterceptorTest.java`

**Interfaces:**
- Consumes: `JwtServiceInterface.extractJti/extractSubject/extractIssuedAt(String)`, `BlacklistServiceInterface.isRevoked(String): Boolean`, `UserSessionCache.get(Long): SessionData(email, Set<RoleType>)`, `UserSessionCache.isRevoked(Long, Instant)`.
- Produces: sau CONNECT, `Principal.getName()` của phiên là **`userId` dạng chuỗi** (ví dụ `"7"`); Task 4–6 dùng `convertAndSendToUser("7", ...)` và `Long.parseLong(principal.getName())`. Hằng `StompAuthInterceptor.USER_QUEUE_PREFIX = "/user/queue/"`.

- [ ] **Step 1: Test (thất bại vì chưa có class)**

```java
package com.techx.intervue.modules.conversation.realtime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.services.impl.UserSessionCache;
import com.techx.intervue.modules.user.services.impl.UserSessionCache.SessionData;
import com.techx.intervue.modules.user.services.interfaces.JwtServiceInterface;
import com.techx.intervue.services.interfaces.BlacklistServiceInterface;
import io.jsonwebtoken.ExpiredJwtException;
import java.time.Instant;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.access.AccessDeniedException;

class StompAuthInterceptorTest {

    JwtServiceInterface jwt;
    BlacklistServiceInterface blacklist;
    UserSessionCache sessions;
    StompAuthInterceptor interceptor;
    MessageChannel channel = mock(MessageChannel.class);

    @BeforeEach
    void setUp() {
        jwt = mock(JwtServiceInterface.class);
        blacklist = mock(BlacklistServiceInterface.class);
        sessions = mock(UserSessionCache.class);
        interceptor = new StompAuthInterceptor(jwt, blacklist, sessions);
        when(jwt.extractJti("good")).thenReturn("jti-1");
        when(jwt.extractSubject("good")).thenReturn(7L);
        when(jwt.extractIssuedAt("good")).thenReturn(Instant.parse("2026-09-25T06:00:00Z"));
        when(blacklist.isRevoked("jti-1")).thenReturn(false);
        when(sessions.get(7L)).thenReturn(new SessionData("an@x.test", Set.of(RoleType.CUSTOMER)));
        when(sessions.isRevoked(7L, Instant.parse("2026-09-25T06:00:00Z"))).thenReturn(false);
    }

    private static Message<byte[]> frame(StompCommand cmd, String authHeader, String destination) {
        StompHeaderAccessor a = StompHeaderAccessor.create(cmd);
        a.setSessionId("s1");
        a.setLeaveMutable(true);
        if (authHeader != null) a.setNativeHeader("Authorization", authHeader);
        if (destination != null) a.setDestination(destination);
        return MessageBuilder.createMessage(new byte[0], a.getMessageHeaders());
    }

    @Test
    void connectWithAValidTokenSetsTheUserIdAsPrincipalName() {
        Message<?> out = interceptor.preSend(frame(StompCommand.CONNECT, "Bearer good", null), channel);

        assertThat(StompHeaderAccessor.wrap(out).getUser().getName()).isEqualTo("7");
    }

    @Test
    void connectWithoutAuthorizationIsRejected() {
        assertThatThrownBy(() -> interceptor.preSend(frame(StompCommand.CONNECT, null, null), channel))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void connectWithRevokedTokenIsRejected() {
        when(blacklist.isRevoked("jti-1")).thenReturn(true);

        assertThatThrownBy(() -> interceptor.preSend(frame(StompCommand.CONNECT, "Bearer good", null), channel))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void connectWithExpiredTokenIsRejected() {
        when(jwt.extractJti("old")).thenThrow(new ExpiredJwtException(null, null, "expired"));

        assertThatThrownBy(() -> interceptor.preSend(frame(StompCommand.CONNECT, "Bearer old", null), channel))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void connectWhoseSessionWasLoggedOutEverywhereIsRejected() {
        when(sessions.get(7L)).thenReturn(null);

        assertThatThrownBy(() -> interceptor.preSend(frame(StompCommand.CONNECT, "Bearer good", null), channel))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void subscribeToOwnUserQueueIsAllowed() {
        Message<byte[]> sub = frame(StompCommand.SUBSCRIBE, null, "/user/queue/messages");
        assertThat(interceptor.preSend(withUser(sub, "7"), channel)).isNotNull();
    }

    @Test
    void subscribeOutsideUserQueueIsRejected() {
        for (String dest : new String[] {"/queue/messages-user9abc", "/topic/conversations/42", "/user/topic/x"}) {
            assertThatThrownBy(() -> interceptor.preSend(withUser(frame(StompCommand.SUBSCRIBE, null, dest), "7"), channel))
                    .as(dest)
                    .isInstanceOf(AccessDeniedException.class);
        }
    }

    @Test
    void sendOutsideAppPrefixIsRejected() {
        assertThatThrownBy(() -> interceptor.preSend(withUser(frame(StompCommand.SEND, null, "/queue/messages-user9abc"), "7"), channel))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void sendWithoutPrincipalIsRejected() {
        assertThatThrownBy(() -> interceptor.preSend(frame(StompCommand.SEND, null, "/app/typing"), channel))
                .isInstanceOf(AccessDeniedException.class);
    }

    private static Message<byte[]> withUser(Message<byte[]> m, String userId) {
        StompHeaderAccessor a = StompHeaderAccessor.wrap(m);
        a.setLeaveMutable(true);
        a.setUser(StompAuthInterceptor.principalFor(userId, Set.of(RoleType.CUSTOMER)));
        return MessageBuilder.createMessage(m.getPayload(), a.getMessageHeaders());
    }
}
```

- [ ] **Step 2: Chạy, xác nhận thất bại**

Run: `docker compose exec -T backend ./mvnw -B -q test -Dtest=StompAuthInterceptorTest`
Expected: `cannot find symbol: class StompAuthInterceptor`.

- [ ] **Step 3: `StompAuthInterceptor`**

```java
package com.techx.intervue.modules.conversation.realtime;

import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.services.impl.UserSessionCache;
import com.techx.intervue.modules.user.services.interfaces.JwtServiceInterface;
import com.techx.intervue.services.interfaces.BlacklistServiceInterface;
import io.jsonwebtoken.JwtException;
import java.security.Principal;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;

/**
 * Spec 7.3 / 7.4. CONNECT: JWT ở header Authorization, kiểm đúng như JwtAuthFilter (blacklist jti,
 * session trong Redis, mốc revoke). Principal.getName() = userId để service phát tin theo id.
 * SUBSCRIBE: chỉ /user/queue/**. SEND: chỉ /app/**. Ném exception → Spring trả frame ERROR và
 * đóng kết nối; client chưa xác thực không bao giờ được giữ phiên.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class StompAuthInterceptor implements ChannelInterceptor {

    public static final String USER_QUEUE_PREFIX = "/user/queue/";
    private static final String APP_PREFIX = "/app/";

    private final JwtServiceInterface jwtService;
    private final BlacklistServiceInterface blacklistService;
    private final UserSessionCache userSessionCache;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) {
            return message;
        }
        switch (accessor.getCommand()) {
            case CONNECT -> accessor.setUser(authenticate(accessor.getFirstNativeHeader("Authorization")));
            case SUBSCRIBE -> requireUser(accessor);
            case SEND -> requireUser(accessor);
            default -> {}
        }
        if (accessor.getCommand() == StompCommand.SUBSCRIBE) {
            String dest = accessor.getDestination();
            if (dest == null || !dest.startsWith(USER_QUEUE_PREFIX)) {
                throw new AccessDeniedException("You can only subscribe to your own queues.");
            }
        }
        if (accessor.getCommand() == StompCommand.SEND) {
            String dest = accessor.getDestination();
            if (dest == null || !dest.startsWith(APP_PREFIX)) {
                throw new AccessDeniedException("Messages are sent over the REST API.");
            }
        }
        return message;
    }

    private Principal authenticate(String header) {
        if (header == null || !header.startsWith("Bearer ")) {
            throw new BadCredentialsException("Sign in to use chat.");
        }
        String token = header.substring(7);
        try {
            if (Boolean.TRUE.equals(blacklistService.isRevoked(jwtService.extractJti(token)))) {
                throw new BadCredentialsException("Your token is not valid.");
            }
            Long userId = jwtService.extractSubject(token);
            UserSessionCache.SessionData session = userSessionCache.get(userId);
            if (session == null
                    || userSessionCache.isRevoked(userId, jwtService.extractIssuedAt(token))) {
                throw new BadCredentialsException("Your session has expired.");
            }
            return principalFor(String.valueOf(userId), session.roles());
        } catch (JwtException e) {
            throw new BadCredentialsException("Token authentication failed.");
        }
    }

    private static void requireUser(StompHeaderAccessor accessor) {
        if (accessor.getUser() == null) {
            throw new AccessDeniedException("Sign in to use chat.");
        }
    }

    /** Name = userId. Task 4–6 dùng convertAndSendToUser(userId, ...) và Long.parseLong(name). */
    static Principal principalFor(String userId, Set<RoleType> roles) {
        return new UsernamePasswordAuthenticationToken(
                userId,
                null,
                roles.stream()
                        .map(r -> new SimpleGrantedAuthority("ROLE_" + r))
                        .collect(Collectors.toSet()));
    }
}
```

- [ ] **Step 4: Đăng ký vào `WebSocketConfig`** — thêm field `private final StompAuthInterceptor authInterceptor;` và:

```java
    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(authInterceptor);
    }
```

(import `org.springframework.messaging.simp.config.ChannelRegistration`.)

- [ ] **Step 5: Chạy test, pass**

Run: `docker compose exec -T backend ./mvnw -B test -Dtest=StompAuthInterceptorTest`
Expected: `Tests run: 9, Failures: 0`.

- [ ] **Step 6: Format, commit**

```bash
docker compose exec -T backend ./mvnw -q spotless:apply
git add backend/src/main/java/com/techx/intervue/modules/conversation/realtime backend/src/test/java/com/techx/intervue/modules/conversation/realtime
git commit -m "feat(FR-111): authenticate STOMP CONNECT with the JWT, confine subscriptions to /user/queue

Same checks as JwtAuthFilter (blacklist, Redis session, revoke mark).
Principal name is the user id so events can be addressed by id.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Sự kiện và `StompChatEventPublisher`

**Files:**
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/resources/ConversationEvent.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/realtime/StompChatEventPublisher.java`
- Delete: `backend/src/main/java/com/techx/intervue/modules/conversation/services/impl/LoggingChatEventPublisher.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/conversation/realtime/StompChatEventPublisherTest.java`

**Interfaces:**
- Consumes: `ChatEventPublisherInterface.messageCreated(Conversation, MessageResource)`, `.conversationRead(Conversation, Long, Instant)`; `MessageRepository.countUnreadByConversation(Long me, Collection<Long>)`.
- Produces: `record ConversationEvent(String type, Long conversationId, String lastMessageText, Instant lastMessageAt, long unreadCount, Long readerId, Instant readAt)` với `type` ∈ `"updated" | "read"`; destination `/queue/messages` (payload `MessageResource`), `/queue/conversations` (payload `ConversationEvent`). Hằng `StompChatEventPublisher.MESSAGES = "/queue/messages"`, `CONVERSATIONS = "/queue/conversations"`, `TYPING = "/queue/typing"`, `PRESENCE = "/queue/presence"`.

- [ ] **Step 1: Test**

```java
package com.techx.intervue.modules.conversation.realtime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.conversation.entities.Conversation;
import com.techx.intervue.modules.conversation.enums.MessageKind;
import com.techx.intervue.modules.conversation.repositories.MessageRepository;
import com.techx.intervue.modules.conversation.resources.ConversationEvent;
import com.techx.intervue.modules.conversation.resources.MessageResource;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.SimpMessagingTemplate;

class StompChatEventPublisherTest {

    static final Instant NOW = Instant.parse("2026-09-25T06:00:00Z");
    SimpMessagingTemplate template;
    MessageRepository messages;
    StompChatEventPublisher publisher;
    Conversation thread;

    @BeforeEach
    void setUp() {
        template = mock(SimpMessagingTemplate.class);
        messages = mock(MessageRepository.class);
        publisher = new StompChatEventPublisher(template, messages);
        thread = Conversation.between(3L, 7L);
        thread.setId(42L);
        thread.noteNewMessage("Five bunches left", NOW);
        MessageRepository.UnreadRow row = mock(MessageRepository.UnreadRow.class);
        when(row.getConversationId()).thenReturn(42L);
        when(row.getTotal()).thenReturn(2L);
        when(messages.countUnreadByConversation(eq(3L), anyCollection())).thenReturn(List.of(row));
        when(messages.countUnreadByConversation(eq(7L), anyCollection())).thenReturn(List.of());
    }

    private static MessageResource msg(Long sender) {
        return MessageResource.builder().id(100L).conversationId(42L).senderId(sender).kind(MessageKind.TEXT).body("hi").createdAt(NOW).build();
    }

    @Test
    void newMessageGoesToTheRecipientQueueAndBothConversationQueues() {
        publisher.messageCreated(thread, msg(7L));

        verify(template).convertAndSendToUser("3", "/queue/messages", msg(7L));
        ArgumentCaptor<ConversationEvent> ev = ArgumentCaptor.forClass(ConversationEvent.class);
        verify(template).convertAndSendToUser(eq("3"), eq("/queue/conversations"), ev.capture());
        assertThat(ev.getValue().type()).isEqualTo("updated");
        assertThat(ev.getValue().unreadCount()).isEqualTo(2L);
        assertThat(ev.getValue().lastMessageText()).isEqualTo("Five bunches left");
        verify(template).convertAndSendToUser(eq("7"), eq("/queue/conversations"), any(ConversationEvent.class));
    }

    @Test
    void theSenderDoesNotReceiveTheirOwnMessageOnTheMessagesQueue() {
        publisher.messageCreated(thread, msg(7L));

        verify(template, never()).convertAndSendToUser(eq("7"), eq("/queue/messages"), any());
    }

    @Test
    void readReceiptGoesOnlyToTheOtherMember() {
        publisher.conversationRead(thread, 3L, NOW);

        ArgumentCaptor<ConversationEvent> ev = ArgumentCaptor.forClass(ConversationEvent.class);
        verify(template).convertAndSendToUser(eq("7"), eq("/queue/conversations"), ev.capture());
        assertThat(ev.getValue().type()).isEqualTo("read");
        assertThat(ev.getValue().readerId()).isEqualTo(3L);
        assertThat(ev.getValue().readAt()).isEqualTo(NOW);
        verify(template, never()).convertAndSendToUser(eq("3"), any(), any());
    }

    @Test
    void publishingToAnOfflineRecipientDoesNotThrow() {
        doThrow(new MessagingException("no session")).when(template).convertAndSendToUser(eq("3"), eq("/queue/messages"), any());

        assertThatCode(() -> publisher.messageCreated(thread, msg(7L))).doesNotThrowAnyException();
    }
}
```

- [ ] **Step 2: Chạy, xác nhận thất bại** — `cannot find symbol: class StompChatEventPublisher`.

- [ ] **Step 3: `ConversationEvent`**

```java
package com.techx.intervue.modules.conversation.resources;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import lombok.Builder;

/** Đẩy tới /user/queue/conversations. type: "updated" (tin mới / preview / unread) hoặc "read". */
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ConversationEvent(
        String type,
        Long conversationId,
        String lastMessageText,
        Instant lastMessageAt,
        long unreadCount,
        Long readerId,
        Instant readAt) {
    public static final String UPDATED = "updated";
    public static final String READ = "read";
}
```

- [ ] **Step 4: `StompChatEventPublisher`** (xoá `LoggingChatEventPublisher` cùng bước này)

```java
package com.techx.intervue.modules.conversation.realtime;

import com.techx.intervue.modules.conversation.entities.Conversation;
import com.techx.intervue.modules.conversation.repositories.MessageRepository;
import com.techx.intervue.modules.conversation.resources.ConversationEvent;
import com.techx.intervue.modules.conversation.resources.MessageResource;
import com.techx.intervue.modules.conversation.services.interfaces.ChatEventPublisherInterface;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

/**
 * Spec 7.4: mọi sự kiện theo user. Được gọi SAU commit (TransactionHelper.afterCommit trong service),
 * nên đọc unread ở đây là thấy tin vừa ghi. Lỗi gửi không được lan ra request REST đã thành công.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class StompChatEventPublisher implements ChatEventPublisherInterface {

    public static final String MESSAGES = "/queue/messages";
    public static final String CONVERSATIONS = "/queue/conversations";
    public static final String TYPING = "/queue/typing";
    public static final String PRESENCE = "/queue/presence";

    private final SimpMessagingTemplate template;
    private final MessageRepository messages;

    @Override
    public void messageCreated(Conversation conversation, MessageResource message) {
        Long recipient = conversation.otherMember(message.senderId());
        send(recipient, MESSAGES, message);
        send(recipient, CONVERSATIONS, updated(conversation, unreadFor(recipient, conversation)));
        send(message.senderId(), CONVERSATIONS, updated(conversation, 0L));
    }

    @Override
    public void conversationRead(Conversation conversation, Long readerId, Instant readAt) {
        send(
                conversation.otherMember(readerId),
                CONVERSATIONS,
                ConversationEvent.builder()
                        .type(ConversationEvent.READ)
                        .conversationId(conversation.getId())
                        .readerId(readerId)
                        .readAt(readAt)
                        .build());
    }

    /** Dùng chung cho Task 5–6: đẩy payload bất kỳ tới một user. */
    public void send(Long userId, String destination, Object payload) {
        try {
            template.convertAndSendToUser(String.valueOf(userId), destination, payload);
        } catch (MessagingException e) {
            // Người nhận offline hoặc broker vừa rớt: tin đã nằm trong DB, lần mở sau sẽ thấy.
            log.warn("Could not push {} to user {}: {}", destination, userId, e.getMessage());
        }
    }

    private long unreadFor(Long userId, Conversation c) {
        return messages.countUnreadByConversation(userId, List.of(c.getId())).stream()
                .filter(r -> c.getId().equals(r.getConversationId()))
                .mapToLong(MessageRepository.UnreadRow::getTotal)
                .findFirst()
                .orElse(0L);
    }

    private static ConversationEvent updated(Conversation c, long unread) {
        return ConversationEvent.builder()
                .type(ConversationEvent.UPDATED)
                .conversationId(c.getId())
                .lastMessageText(c.getLastMessageText())
                .lastMessageAt(c.getLastMessageAt())
                .unreadCount(unread)
                .build();
    }
}
```

```bash
git rm -q backend/src/main/java/com/techx/intervue/modules/conversation/services/impl/LoggingChatEventPublisher.java
```

- [ ] **Step 5: Chạy test, pass** — `Tests run: 4, Failures: 0`. Rồi chạy `MessageServicePublishTimingTest` (dùng `@MockitoBean` thay bean thật, vẫn phải xanh) và `IntervueApplicationTests` (context boot với bean mới).

- [ ] **Step 6: Format, commit**

```bash
docker compose exec -T backend ./mvnw -q spotless:apply
git add -A backend/src/main/java/com/techx/intervue/modules/conversation backend/src/test/java/com/techx/intervue/modules/conversation
git commit -m "feat(FR-111,FR-113): push new messages, thread updates and read receipts over STOMP

StompChatEventPublisher replaces the logging seam implementation. Every
event is addressed to a user queue; a failed push is logged, never
propagated into the REST request that already committed.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: "Đang gõ" — inbound `/app/typing`

**Files:**
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/realtime/TypingController.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/conversation/realtime/TypingControllerTest.java`

**Interfaces:**
- Consumes: `ConversationLookup.requireMember(Long, Long)` (ném `EntityNotFoundException` / `ConversationAccessDeniedException`), `StompChatEventPublisher.send(Long, String, Object)`, `StompChatEventPublisher.TYPING`.
- Produces: inbound `/app/typing` body `{ conversationId, typing }`; outbound `/user/queue/typing` payload `TypingEvent(conversationId, userId, typing)`.

- [ ] **Step 1: Test**

```java
package com.techx.intervue.modules.conversation.realtime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.conversation.entities.Conversation;
import com.techx.intervue.modules.conversation.exceptions.ConversationAccessDeniedException;
import com.techx.intervue.modules.conversation.realtime.TypingController.TypingEvent;
import com.techx.intervue.modules.conversation.realtime.TypingController.TypingRequest;
import com.techx.intervue.modules.conversation.services.impl.ConversationLookup;
import jakarta.persistence.EntityNotFoundException;
import java.security.Principal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class TypingControllerTest {

    ConversationLookup lookup;
    StompChatEventPublisher publisher;
    TypingController controller;
    Principal me = () -> "7";

    @BeforeEach
    void setUp() {
        lookup = mock(ConversationLookup.class);
        publisher = mock(StompChatEventPublisher.class);
        controller = new TypingController(lookup, publisher);
    }

    @Test
    void typingIsForwardedToTheOtherMemberOnly() {
        Conversation c = Conversation.between(3L, 7L);
        c.setId(42L);
        when(lookup.requireMember(7L, 42L)).thenReturn(c);

        controller.typing(new TypingRequest(42L, true), me);

        verify(publisher).send(3L, StompChatEventPublisher.TYPING, new TypingEvent(42L, 7L, true));
        verify(publisher, times(1)).send(anyLong(), anyString(), any()); // đúng một người nhận
    }

    @Test
    void typingForAForeignThreadIsDropped() {
        when(lookup.requireMember(7L, 42L)).thenThrow(new ConversationAccessDeniedException());

        controller.typing(new TypingRequest(42L, true), me);

        verify(publisher, never()).send(anyLong(), anyString(), any());
    }

    @Test
    void typingForAnUnknownThreadIsDroppedWithoutRevealingAnything() {
        when(lookup.requireMember(7L, 999L)).thenThrow(new EntityNotFoundException("x"));

        controller.typing(new TypingRequest(999L, true), me);

        verify(publisher, never()).send(anyLong(), anyString(), any());
    }
}
```

- [ ] **Step 2: Chạy, xác nhận thất bại** — `cannot find symbol: class TypingController`.

- [ ] **Step 3: `TypingController`**

```java
package com.techx.intervue.modules.conversation.realtime;

import com.techx.intervue.modules.conversation.entities.Conversation;
import com.techx.intervue.modules.conversation.exceptions.ConversationAccessDeniedException;
import com.techx.intervue.modules.conversation.services.impl.ConversationLookup;
import jakarta.persistence.EntityNotFoundException;
import java.security.Principal;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

/**
 * FR-112. Sự kiện tạm, không chạm DB (spec 7.1). Không phải thành viên hoặc thread không tồn tại
 * → im lặng: không có gì để "lộ" cho người đoán id.
 */
@Controller
@RequiredArgsConstructor
public class TypingController {

    public record TypingRequest(Long conversationId, boolean typing) {}

    public record TypingEvent(Long conversationId, Long userId, boolean typing) {}

    private final ConversationLookup lookup;
    private final StompChatEventPublisher publisher;

    @MessageMapping("/typing")
    public void typing(@Payload TypingRequest request, Principal principal) {
        Long me = Long.parseLong(principal.getName());
        Conversation conversation;
        try {
            conversation = lookup.requireMember(me, request.conversationId());
        } catch (EntityNotFoundException | ConversationAccessDeniedException e) {
            return;
        }
        publisher.send(
                conversation.otherMember(me),
                StompChatEventPublisher.TYPING,
                new TypingEvent(conversation.getId(), me, request.typing()));
    }
}
```

- [ ] **Step 4: Chạy test, pass** — `Tests run: 3, Failures: 0`.

- [ ] **Step 5: Format, commit**

```bash
docker compose exec -T backend ./mvnw -q spotless:apply
git add backend/src/main/java/com/techx/intervue/modules/conversation/realtime backend/src/test/java/com/techx/intervue/modules/conversation/realtime
git commit -m "feat(FR-112): forward typing indicators to the other member

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Online / offline / "hoạt động lần cuối"

**Files:**
- Create: `backend/src/main/resources/db/migration/V20260925010__create_user_presence_table.sql`
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/entities/UserPresence.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/repositories/UserPresenceRepository.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/conversation/repositories/ConversationRepository.java` (thêm `findOtherMemberIds`)
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/realtime/PresenceService.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/realtime/PresenceEventListener.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/conversation/resources/ParticipantResource.java` (+`online`, `lastSeenAt`)
- Modify: `backend/src/main/java/com/techx/intervue/modules/conversation/services/impl/ConversationService.java` (inject `PresenceService`, điền 2 trường)
- Modify: `backend/src/test/java/com/techx/intervue/modules/conversation/services/impl/ConversationServiceTest.java` (constructor + stub)
- Test: `backend/src/test/java/com/techx/intervue/modules/conversation/realtime/PresenceServiceTest.java` (Redis + MySQL thật)
- Test: `backend/src/test/java/com/techx/intervue/modules/conversation/realtime/PresenceEventListenerTest.java`

**Interfaces:**
- Consumes: `StringRedisTemplate` (bean Boot), `StompChatEventPublisher.send/PRESENCE`, `Clock`.
- Produces: `PresenceService.connected(Long userId, String sessionId): boolean` (true = vừa online), `disconnected(Long, String): boolean` (true = vừa offline), `snapshot(Collection<Long>): Map<Long, PresenceInfo>`, `record PresenceInfo(boolean online, Instant lastSeenAt)`; `record PresenceEvent(Long userId, boolean online, Instant lastSeenAt)`; `ConversationRepository.findOtherMemberIds(Long me): List<Long>`; `ParticipantResource(userId, fullName, role, image, boolean online, Instant lastSeenAt)` với `from(User, PresenceInfo)`.

- [ ] **Step 1: Migration**

```sql
-- FR-112: "hoạt động 12 phút trước" phải sống qua restart Redis. Online-ngay-lúc-này ở Redis
-- (tập session đang mở); mốc cuối ghi xuống đây khi ngắt kết nối, tiết chế 60 giây/user.
CREATE TABLE user_presence (
    user_id      BIGINT UNSIGNED PRIMARY KEY,
    last_seen_at DATETIME(6) NOT NULL,
    CONSTRAINT fk_user_presence_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
```

Restart backend, kiểm `docker compose logs backend | grep 'Successfully applied'` → `1 migration`.

- [ ] **Step 2: Test tích hợp `PresenceService` (thất bại vì chưa có class)**

```java
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
        u = users.save(User.builder().fullName("P " + tag).email(tag + "@presence.test")
                .phone("06" + String.format("%08d", Math.abs(tag.hashCode()) % 100_000_000))
                .passwordHash("x").role(RoleType.CUSTOMER).build());
    }

    @AfterEach
    void tearDown() {
        redis.delete(List.of(PresenceService.onlineKey(u.getId()), PresenceService.throttleKey(u.getId())));
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
        assertThat(presence.connected(u.getId(), "s2")).as("second tab is not a new 'online'").isFalse();

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
```

- [ ] **Step 3: Chạy, xác nhận thất bại** — `cannot find symbol: class PresenceService`.

- [ ] **Step 4: Entity + repository + query thành viên**

`UserPresence.java`:

```java
package com.techx.intervue.modules.conversation.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** FR-112: mốc hoạt động cuối, ghi khi ngắt kết nối (PresenceService). */
@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "user_presence")
public class UserPresence {
    @Id
    @Column(name = "user_id")
    private Long userId;

    @Column(name = "last_seen_at", nullable = false)
    private Instant lastSeenAt;
}
```

`UserPresenceRepository.java`:

```java
package com.techx.intervue.modules.conversation.repositories;

import com.techx.intervue.modules.conversation.entities.UserPresence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserPresenceRepository extends JpaRepository<UserPresence, Long> {}
```

Thêm vào `ConversationRepository`:

```java
    /** Những người đã từng nhắn với :me — để báo online/offline cho đúng họ, không broadcast. */
    @Query(
            "select case when c.userAId = :me then c.userBId else c.userAId end"
                    + " from Conversation c where c.userAId = :me or c.userBId = :me")
    List<Long> findOtherMemberIds(@Param("me") Long me);
```

(import `java.util.List`.)

- [ ] **Step 5: `PresenceService`**

```java
package com.techx.intervue.modules.conversation.realtime;

import com.techx.intervue.modules.conversation.entities.UserPresence;
import com.techx.intervue.modules.conversation.repositories.UserPresenceRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;
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

    public record PresenceInfo(boolean online, Instant lastSeenAt) {
        static final PresenceInfo OFFLINE_UNKNOWN = new PresenceInfo(false, null);
    }

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

    /** @return true nếu đây là session đầu tiên — user vừa chuyển sang online. */
    public boolean connected(Long userId, String sessionId) {
        String key = onlineKey(userId);
        Long before = redis.opsForSet().size(key);
        redis.opsForSet().add(key, sessionId);
        redis.expire(key, ONLINE_TTL);
        return before == null || before == 0;
    }

    /** @return true nếu không còn session nào — user vừa chuyển sang offline. */
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
                        .collect(Collectors.toMap(UserPresence::getUserId, UserPresence::getLastSeenAt));
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
```

- [ ] **Step 6: Chạy `PresenceServiceTest`, pass** — `Tests run: 4, Failures: 0`. Nếu `goingOfflineRecordsLastSeen...` đỏ vì throttle của test trước cùng user: mỗi test tạo user mới nên không; nếu vẫn đỏ, `tearDown` đã xoá throttle key.

- [ ] **Step 7: Test listener (unit)**

```java
package com.techx.intervue.modules.conversation.realtime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.conversation.realtime.PresenceEventListener.PresenceEvent;
import com.techx.intervue.modules.conversation.repositories.ConversationRepository;
import java.security.Principal;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

class PresenceEventListenerTest {

    PresenceService presence;
    ConversationRepository conversations;
    StompChatEventPublisher publisher;
    PresenceEventListener listener;
    Principal me = () -> "7";

    @BeforeEach
    void setUp() {
        presence = mock(PresenceService.class);
        conversations = mock(ConversationRepository.class);
        publisher = mock(StompChatEventPublisher.class);
        listener = new PresenceEventListener(presence, conversations, publisher);
        when(conversations.findOtherMemberIds(7L)).thenReturn(List.of(3L, 5L));
    }

    private SessionConnectedEvent connected(String sessionId) {
        StompHeaderAccessor a = StompHeaderAccessor.create(StompCommand.CONNECTED);
        a.setSessionId(sessionId);
        a.setUser(me);
        return new SessionConnectedEvent(this, MessageBuilder.createMessage(new byte[0], a.getMessageHeaders()), me);
    }

    @Test
    void goingOnlineTellsEveryoneYouHaveTalkedTo() {
        when(presence.connected(7L, "s1")).thenReturn(true);

        listener.onConnected(connected("s1"));

        verify(publisher).send(3L, StompChatEventPublisher.PRESENCE, new PresenceEvent(7L, true, null));
        verify(publisher).send(5L, StompChatEventPublisher.PRESENCE, new PresenceEvent(7L, true, null));
    }

    @Test
    void aSecondTabIsSilent() {
        when(presence.connected(7L, "s2")).thenReturn(false);

        listener.onConnected(connected("s2"));

        verify(publisher, never()).send(anyLong(), anyString(), any());
    }

    @Test
    void goingOfflineSendsLastSeen() {
        when(presence.disconnected(7L, "s1")).thenReturn(true);
        java.time.Instant at = java.time.Instant.parse("2026-09-25T06:00:00Z");
        when(presence.lastSeen(7L)).thenReturn(at);

        listener.onDisconnected(new SessionDisconnectEvent(this, MessageBuilder.withPayload(new byte[0]).build(), "s1", CloseStatus.NORMAL, me));

        verify(publisher).send(3L, StompChatEventPublisher.PRESENCE, new PresenceEvent(7L, false, at));
    }

    @Test
    void disconnectWithoutPrincipalIsIgnored() {
        listener.onDisconnected(new SessionDisconnectEvent(this, MessageBuilder.withPayload(new byte[0]).build(), "s1", CloseStatus.NORMAL, null));

        verify(presence, never()).disconnected(anyLong(), anyString());
    }
}
```

- [ ] **Step 8: Chạy, thất bại** — `cannot find symbol: class PresenceEventListener`.

- [ ] **Step 9: `PresenceEventListener`**

```java
package com.techx.intervue.modules.conversation.realtime;

import com.techx.intervue.modules.conversation.repositories.ConversationRepository;
import java.security.Principal;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

/** FR-112. Online/offline suy ra từ CONNECT/DISCONNECT (spec 7.4); báo cho những người đã từng nhắn. */
@Component
@RequiredArgsConstructor
public class PresenceEventListener {

    public record PresenceEvent(Long userId, boolean online, Instant lastSeenAt) {}

    private final PresenceService presence;
    private final ConversationRepository conversations;
    private final StompChatEventPublisher publisher;

    @EventListener
    public void onConnected(SessionConnectedEvent event) {
        Principal user = event.getUser();
        if (user == null) {
            return;
        }
        Long userId = Long.parseLong(user.getName());
        String sessionId = StompHeaderAccessor.wrap(event.getMessage()).getSessionId();
        if (presence.connected(userId, sessionId)) {
            broadcast(userId, new PresenceEvent(userId, true, null));
        }
    }

    @EventListener
    public void onDisconnected(SessionDisconnectEvent event) {
        Principal user = event.getUser();
        if (user == null) {
            return;
        }
        Long userId = Long.parseLong(user.getName());
        if (presence.disconnected(userId, event.getSessionId())) {
            broadcast(userId, new PresenceEvent(userId, false, presence.lastSeen(userId)));
        }
    }

    private void broadcast(Long userId, PresenceEvent event) {
        for (Long other : conversations.findOtherMemberIds(userId)) {
            publisher.send(other, StompChatEventPublisher.PRESENCE, event);
        }
    }
}
```

- [ ] **Step 10: Chạy `PresenceEventListenerTest`, pass** — 4/4.

- [ ] **Step 11: `ParticipantResource` + `ConversationService` (RED → GREEN qua `ConversationServiceTest`)**

Thêm vào `ConversationServiceTest`: field `PresenceService presence;`, trong `setUp` `presence = mock(PresenceService.class); when(presence.snapshot(any())).thenReturn(Map.of());` và constructor `new ConversationService(conversations, messages, users, policy, events, new ConversationLookup(conversations), presence, clock)`. Thêm test:

```java
    @Test
    void listMineCarriesPresenceOfTheOtherParticipant() {
        Conversation c = Conversation.between(3L, 7L);
        c.setId(42L);
        when(conversations.findMine(eq(7L), any())).thenReturn(new PageImpl<>(List.of(c)));
        when(users.findAllById(List.of(3L))).thenReturn(List.of(farmer));
        Instant seen = Instant.parse("2026-09-25T05:48:00Z");
        when(presence.snapshot(List.of(3L))).thenReturn(Map.of(3L, new PresenceService.PresenceInfo(false, seen)));

        var page = service.listMine(7L, 1, 20);

        assertThat(page.items().get(0).other().online()).isFalse();
        assertThat(page.items().get(0).other().lastSeenAt()).isEqualTo(seen);
    }
```

Chạy → compile fail (`online()` không tồn tại). Rồi sửa:

`ParticipantResource`:

```java
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ParticipantResource(
        Long userId, String fullName, RoleType role, String image, boolean online, Instant lastSeenAt) {

    public static ParticipantResource from(User user, PresenceService.PresenceInfo presence) {
        return ParticipantResource.builder()
                .userId(user.getId())
                .fullName(user.getFullName())
                .role(user.getRole())
                .image(user.getImage())
                .online(presence != null && presence.online())
                .lastSeenAt(presence == null ? null : presence.lastSeenAt())
                .build();
    }
}
```

(import `java.time.Instant`, `com.techx.intervue.modules.conversation.realtime.PresenceService`.)

`ConversationService`: field `private final PresenceService presence;` **đặt ngay trước `clock`** (thứ tự constructor); `open` → `toResource(conversation, target, unread, presence.snapshot(List.of(target.getId())).get(target.getId()))`; `listMine` → tính `Map<Long, PresenceInfo> live = presence.snapshot(others.keySet())` rồi truyền `live.get(c.otherMember(meId))`; `toResource(Conversation c, User other, long unread, PresenceInfo info)` gọi `ParticipantResource.from(other, info)`.

Chạy `ConversationServiceTest` → 12/12.

- [ ] **Step 12: Full module + commit**

```bash
docker compose exec -T backend ./mvnw -B test -Dtest='ConversationServiceTest,PresenceServiceTest,PresenceEventListenerTest,MessageRepositoryTest'
docker compose exec -T backend ./mvnw -q spotless:apply
git add backend/src/main/resources/db/migration/V20260925010__create_user_presence_table.sql backend/src/main/java/com/techx/intervue/modules/conversation backend/src/test/java/com/techx/intervue/modules/conversation
git commit -m "feat(FR-112): online, offline and last-seen presence

Open STOMP sessions per user live in Redis (30 min TTL); the last-seen
mark is written to user_presence on the final disconnect, at most once a
minute. Presence changes go only to people the user has talked to.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Trả lời cũng là "đã xem"; test end-to-end qua WebSocket thật

**Files:**
- Modify: `backend/src/main/java/com/techx/intervue/modules/conversation/services/impl/MessageService.java` (phát `conversationRead` khi gửi — minor #4 của review Plan 1)
- Modify: `backend/src/test/java/com/techx/intervue/modules/conversation/services/impl/MessageServiceTest.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/conversation/realtime/ChatStompIntegrationTest.java`

**Interfaces:**
- Consumes: `UserSessionCache.set(Long, String, Set<RoleType>, Duration)`, `JwtServiceInterface.generateToken(Long)`, `MessageServiceInterface.send`, `WebSocketConfig.ENDPOINT`.
- Produces: không có interface mới; đây là bằng chứng tự động cho toàn bộ đường đi REST → afterCommit → STOMP → client.

- [ ] **Step 1: Sửa test `sendSavesTheMessageUpdatesThePreviewAndPublishesOnce`** — thêm dòng cuối:

```java
        verify(events).conversationRead(thread, 7L, NOW);
```

Chạy `MessageServiceTest` → 1 fail (`Wanted but not invoked: conversationRead`).

- [ ] **Step 2: `MessageService.send`** — ngay sau `TransactionHelper.afterCommit(() -> events.messageCreated(...))`:

```java
        // Trả lời nghĩa là đã đọc tới đây: bên kia thấy "đã xem" mà không cần ta gọi /read.
        TransactionHelper.afterCommit(() -> events.conversationRead(conversation, meId, now));
```

Chạy `MessageServiceTest` → 10/10.

- [ ] **Step 3: Test end-to-end (thất bại lần đầu chỉ nếu Task 1–4 sai; đây là test hệ thống, viết sau khi các mảnh đã xanh — mục đích là chứng minh chúng ghép được với nhau)**

```java
package com.techx.intervue.modules.conversation.realtime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.techx.intervue.modules.conversation.entities.Conversation;
import com.techx.intervue.modules.conversation.repositories.ConversationRepository;
import com.techx.intervue.modules.conversation.requests.SendMessageRequest;
import com.techx.intervue.modules.conversation.services.interfaces.MessageServiceInterface;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.repositories.UserRepository;
import com.techx.intervue.modules.user.services.impl.UserSessionCache;
import com.techx.intervue.modules.user.services.interfaces.JwtServiceInterface;
import java.lang.reflect.Type;
import java.time.Duration;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.messaging.converter.SimpleMessageConverter;
import org.springframework.util.MimeTypeUtils;
import java.nio.charset.StandardCharsets;
import org.springframework.messaging.simp.stomp.StompFrameHandler;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.test.context.TestPropertySource;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;

/** Simple broker (host rỗng) để CI không cần Rabbit; đường đi qua Rabbit kiểm bằng tay ở Task 8. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestPropertySource(properties = "app.chat.rabbitmq.host=")
class ChatStompIntegrationTest {

    @LocalServerPort int port;
    @Autowired UserRepository users;
    @Autowired ConversationRepository conversations;
    @Autowired MessageServiceInterface messageService;
    @Autowired UserSessionCache sessions;
    @Autowired JwtServiceInterface jwt;

    User customer;
    User farmer;
    Conversation thread;
    WebSocketStompClient client;

    @BeforeEach
    void setUp() {
        customer = newUser(RoleType.CUSTOMER);
        farmer = newUser(RoleType.FARMER);
        thread = conversations.save(Conversation.between(customer.getId(), farmer.getId()));
        client = new WebSocketStompClient(new StandardWebSocketClient());
        client.setMessageConverter(new SimpleMessageConverter()); // byte[] hai chiều, không kén content-type
    }

    @AfterEach
    void tearDown() {
        client.stop();
        conversations.deleteById(thread.getId());
        sessions.evict(customer.getId());
        sessions.evict(farmer.getId());
        users.deleteById(customer.getId());
        users.deleteById(farmer.getId());
    }

    private User newUser(RoleType role) {
        String tag = UUID.randomUUID().toString().substring(0, 8);
        User u = users.save(User.builder().fullName("E2E " + tag).email(tag + "@e2e.test")
                .phone("05" + String.format("%08d", Math.abs(tag.hashCode()) % 100_000_000))
                .passwordHash("x").role(role).build());
        sessions.set(u.getId(), u.getEmail(), Set.of(role), Duration.ofMinutes(5));
        return u;
    }

    private StompSession connectAs(User u) throws Exception {
        StompHeaders headers = new StompHeaders();
        headers.add("Authorization", "Bearer " + jwt.generateToken(u.getId()));
        return client.connectAsync("ws://localhost:" + port + WebSocketConfig.ENDPOINT, (WebSocketHttpHeaders) null, headers, new StompSessionHandlerAdapter() {})
                .get(5, TimeUnit.SECONDS);
    }

    private static BlockingQueue<String> subscribe(StompSession s, String destination) {
        BlockingQueue<String> q = new LinkedBlockingQueue<>();
        s.subscribe(destination, new StompFrameHandler() {
            @Override public Type getPayloadType(StompHeaders h) { return byte[].class; }
            @Override public void handleFrame(StompHeaders h, Object payload) { q.add(new String((byte[]) payload, StandardCharsets.UTF_8)); }
        });
        return q;
    }

    @Test
    void aMessageSentOverRestArrivesAtTheRecipientOverStomp() throws Exception {
        StompSession farmerSession = connectAs(farmer);
        BlockingQueue<String> inbox = subscribe(farmerSession, "/user/queue/messages");
        BlockingQueue<String> threads = subscribe(farmerSession, "/user/queue/conversations");
        Thread.sleep(300); // để SUBSCRIBE tới broker trước khi gửi

        messageService.send(customer.getId(), thread.getId(), new SendMessageRequest(null, "Still fresh?", null, null));

        String frame = inbox.poll(5, TimeUnit.SECONDS);
        assertThat(frame).isNotNull().contains("\"body\":\"Still fresh?\"").contains("\"kind\":\"text\"");
        String update = threads.poll(5, TimeUnit.SECONDS);
        assertThat(update).isNotNull().contains("\"type\":\"updated\"").contains("\"unreadCount\":1");
    }

    @Test
    void theSenderGetsAThreadUpdateButNotTheirOwnMessage() throws Exception {
        StompSession customerSession = connectAs(customer);
        BlockingQueue<String> inbox = subscribe(customerSession, "/user/queue/messages");
        BlockingQueue<String> threads = subscribe(customerSession, "/user/queue/conversations");
        Thread.sleep(300);

        messageService.send(customer.getId(), thread.getId(), new SendMessageRequest(null, "hello", null, null));

        assertThat(threads.poll(5, TimeUnit.SECONDS)).isNotNull().contains("\"unreadCount\":0");
        assertThat(inbox.poll(1, TimeUnit.SECONDS)).isNull();
    }

    @Test
    void connectingWithABadTokenIsRefused() {
        StompHeaders headers = new StompHeaders();
        headers.add("Authorization", "Bearer not-a-jwt");

        assertThatThrownBy(() ->
                        client.connectAsync("ws://localhost:" + port + WebSocketConfig.ENDPOINT, (WebSocketHttpHeaders) null, headers, new StompSessionHandlerAdapter() {})
                                .get(5, TimeUnit.SECONDS))
                .isInstanceOf(ExecutionException.class);
    }

    @Test
    void typingReachesTheOtherMember() throws Exception {
        StompSession customerSession = connectAs(customer);
        StompSession farmerSession = connectAs(farmer);
        BlockingQueue<String> typing = subscribe(farmerSession, "/user/queue/typing");
        Thread.sleep(300);

        StompHeaders h = new StompHeaders();
        h.setDestination("/app/typing");
        h.setContentType(MimeTypeUtils.APPLICATION_JSON);
        customerSession.send(h, ("{\"conversationId\":" + thread.getId() + ",\"typing\":true}").getBytes(StandardCharsets.UTF_8));

        assertThat(typing.poll(5, TimeUnit.SECONDS)).isNotNull().contains("\"typing\":true").contains("\"userId\":" + customer.getId());
    }
}
```

`SimpleMessageConverter` ở *client* truyền `byte[]` nguyên vẹn hai chiều và không kén `content-type`; frame `/app/typing` mang `content-type: application/json` để converter Jackson phía server map vào `TypingRequest`.

- [ ] **Step 4: Chạy** — `docker compose exec -T backend ./mvnw -B test -Dtest=ChatStompIntegrationTest`
Expected: 4/4. Lỗi thường gặp và cách đọc: `ExecutionException ... 403/401 handshake` → Task 1 Step 6 chưa vào SecurityConfig; `frame null` → sự kiện phát *trước* commit (không có tx ở đây nên không phải), hoặc SUBSCRIBE chưa tới broker (tăng sleep 300 → 800); `unreadCount":0` ở test 1 → `countUnreadByConversation` gọi cho sai người.

- [ ] **Step 5: Format, commit**

```bash
docker compose exec -T backend ./mvnw -q spotless:apply
git add backend/src/main/java/com/techx/intervue/modules/conversation backend/src/test/java/com/techx/intervue/modules/conversation
git commit -m "feat(FR-111,FR-112): replying marks the thread read; end-to-end STOMP test

WebSocketStompClient connects with a JWT, subscribes to its user queues
and receives the message, the thread update and typing over a real
WebSocket, against the in-app broker.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: Tài liệu, smoke qua RabbitMQ thật, PR

**Files:**
- Modify: `README.md` (mục Docker: RabbitMQ; Troubleshooting: 2 dòng)
- Modify: `docs/superpowers/specs/2026-09-25-farmer-customer-chat-design.md` §7.2 và §16 theo kết quả Task 1 Step 8
- Create (ngoài repo, scratchpad): `stomp-smoke.mjs`

- [ ] **Step 1: README** — trong bảng lệnh mục 3b thêm dòng `RabbitMQ UI` `http://localhost:15672` (user/pass trong `.env`); Troubleshooting thêm:

| Error | Cause | Fix |
|---|---|---|
| Backend log `Chat realtime: app.chat.rabbitmq.host is empty` khi chạy trên máy (cách A) | Chạy BE ngoài Docker, chưa đặt `RABBITMQ_HOST` | Chat vẫn hoạt động với simple broker; muốn relay thì `export RABBITMQ_HOST=localhost` và mở cổng 61613 trong `docker-compose.yml` |
| `TCP connection failure in session _system_` lặp lại | RabbitMQ chưa healthy hoặc plugin STOMP chưa bật | `docker compose logs rabbitmq`; xác nhận dòng `rabbitmq_stomp` trong `rabbitmq-plugins list -e` |

- [ ] **Step 2: Spec** — nếu Task 1 Step 8 cho thấy backend **vẫn boot** khi relay không nối được: sửa §7.2 "nếu relay không kết nối được, backend không khởi động" thành "relay tự thử lại; trong lúc đó REST vẫn chạy, chỉ realtime im lặng", và hàng đầu của bảng §16 hạ mức "Cao" → "Trung bình". Ngược lại giữ nguyên.

- [ ] **Step 3: Smoke qua Rabbit thật (stack chat, relay bật)**

Client STOMP tối giản trong scratchpad (không vào repo):

```bash
SCR=/private/tmp/claude-501/-Users-phong-projects-school-fpt-aptech-Code-project-techwiz7/06415480-f5c1-4935-81d4-4caf7a10cb05/scratchpad/chat-plan2
mkdir -p $SCR && cd $SCR && npm init -y >/dev/null && npm i --silent @stomp/stompjs ws
```

```js
// stomp-smoke.mjs — node stomp-smoke.mjs <jwt> ; in mọi frame nhận được trên 4 queue
import { Client } from '@stomp/stompjs';
import WebSocket from 'ws';
Object.assign(globalThis, { WebSocket });
const token = process.argv[2];
const c = new Client({ brokerURL: 'ws://localhost:8082/ws', connectHeaders: { Authorization: `Bearer ${token}` },
  onConnect: () => { for (const q of ['messages', 'conversations', 'typing', 'presence'])
      c.subscribe(`/user/queue/${q}`, f => console.log(new Date().toISOString(), q, f.body)); console.log('connected'); },
  onStompError: f => console.error('ERROR', f.headers.message), onWebSocketClose: () => console.log('closed') });
c.activate();
```

Kịch bản (dùng lại `smoke.sh` của Plan 1 để lấy token/CID):
1. Terminal A: `node stomp-smoke.mjs $TU_TOKEN` → `connected`.
2. An `POST .../messages` qua REST → A in `messages {...body...}` và `conversations {"type":"updated","unreadCount":1}` trong < 1 giây.
3. Tú `POST .../read` (curl) → không có gì ở A (Tú là người đọc); mở terminal B với `$AN_TOKEN` → B in `conversations {"type":"read"}`.
4. Trong Rabbit UI (`http://localhost:15673`, user `marketlink`) tab Connections: thấy 1 connection `_system_` của relay + 1 mỗi client.
5. Dừng terminal B → A in `presence {"userId":<AN>,"online":false,"lastSeenAt":"..."}`. Mở lại B → A in `online:true`.
6. Token sai: `node stomp-smoke.mjs xxx` → `ERROR Token authentication failed.` rồi `closed`.
7. **Reconnect**: `docker compose stop rabbitmq`; An gửi tin qua REST → vẫn **201** (tin trong DB); backend log `TCP connection failure`. `docker compose start rabbitmq`; đợi 30s; A phải nối lại được (client stompjs tự reconnect) và tin mới sau đó tới bình thường. Ghi kết quả vào ledger.

- [ ] **Step 4: Toàn bộ kiểm tra**

```bash
docker compose exec -T backend ./mvnw -q spotless:apply
docker compose exec -T backend ./mvnw -B test
docker compose exec -T backend ./mvnw -q spotless:check
bash scripts/check-env-separation.sh
```

Expected: `Tests run: 170, Failures: 0` (140 của Plan 1 + 30 mới; ghi số thật vào PR body thay `<N>`), spotless sạch, env guard xanh.

- [ ] **Step 5: Commit tài liệu, PR**

Base của PR — quyết bằng lệnh: `gh pr view 108 --json state -q .state` in `MERGED` → `git fetch origin && git rebase origin/dev` rồi `BASE=dev`; in `OPEN` → `BASE=feature/FR-110-chat-conversations` (PR stacked, body ghi "Merge sau #108").

```bash
git add README.md docs/superpowers/specs/2026-09-25-farmer-customer-chat-design.md docs/superpowers/plans/2026-09-25-chat-realtime-stomp.md
git commit -m "docs(FR-111): RabbitMQ in the setup guide; realtime plan 2/4

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push -u origin feature/FR-111-chat-realtime
cat > /tmp/pr-body-plan2.md <<'PRBODY'
## Làm gì

- **FR-111** — tin nhắn và cập nhật thread tới trình duyệt ngay qua WebSocket/STOMP (`/ws`), phát qua RabbitMQ (relay) — CI/test dùng simple broker trong app
- **FR-112** — đang gõ (`/app/typing` → `/user/queue/typing`), đã xem (`/user/queue/conversations` type `read`), online/offline + hoạt động lần cuối (`/user/queue/presence`, bảng `user_presence`)
- **FR-113** — badge chưa đọc cập nhật realtime (`unreadCount` trong sự kiện `updated`)

Plan **2/4** của spec `docs/superpowers/specs/2026-09-25-farmer-customer-chat-design.md` (§7, §12). Nối tiếp #108. Chưa có UI (Plan 4).

> ⚠️ Vẫn **ngoài phạm vi đề** như #108 (R-07). Thêm **RabbitMQ** vào stack nộp bài — LEAD quyết (spec §15 mục 5).

**Bảo mật:** JWT kiểm ở frame STOMP `CONNECT` (blacklist, session Redis, mốc revoke — như `JwtAuthFilter`); client chỉ SUBSCRIBE được `/user/queue/**` và SEND `/app/**`; `/app/typing` kiểm tư cách thành viên, sai thì im lặng. Handshake `/ws` là public trong `SecurityConfig` (không có header Authorization ở handshake).

**Hạ tầng:** service `rabbitmq` (plugin STOMP bật lúc start), backend `depends_on: service_healthy`; prod không mở cổng, bắt buộc `RABBITMQ_USER/PASSWORD`. Không có Rabbit (`RABBITMQ_HOST` rỗng) thì backend vẫn chạy với simple broker và ghi WARN.

## Test thế nào

- `./mvnw -B test`: <N> test, 0 fail — mới: `WebSocketConfigTest` (chọn broker), `StompAuthInterceptorTest` (9), `StompChatEventPublisherTest` (4), `TypingControllerTest` (3), `PresenceServiceTest` (4, Redis+MySQL thật), `PresenceEventListenerTest` (4), `ChatStompIntegrationTest` (4, WebSocket thật qua `WebSocketStompClient`).
- Smoke với RabbitMQ thật trên stack Docker: client `@stomp/stompjs` nhận tin < 1s sau REST; read receipt; presence khi đóng/mở tab; token sai bị từ chối; dừng/chạy lại Rabbit → REST vẫn 201, relay tự nối lại (kết quả ghi trong plan Task 8).
- `spotless:check` sạch, `scripts/check-env-separation.sh` xanh.

## Checklist (CONTRIBUTING.md §5)

- [x] PR vào đúng nhánh
- [ ] CI xanh (chờ run)
- [x] Không có file bí mật
- [x] Đổi DB → migration mới `V20260925010__create_user_presence_table.sql`
- [ ] Đổi API → `docs/api-contract.md` chưa có STOMP; spec §7.4 là đề xuất cho LEAD
- [x] Thêm biến môi trường → đã cập nhật `.env.example`, `.env.production.example`, `application.yaml`, `application-prod.yaml.example`, hai file compose
- [x] UI: không áp dụng

🤖 Generated with [Claude Code](https://claude.com/claude-code)
PRBODY
gh pr create --base "$BASE" --title "feat(FR-111): Customer–Farmer chat, plan 2/4 — realtime over RabbitMQ/STOMP" --body-file /tmp/pr-body-plan2.md
```

---

## Ghi chú cho người thực thi

- **Tách nhánh trước Task 1:** trong worktree `market-link-chat`: `git switch -c feature/FR-111-chat-realtime` (đang ở `feature/FR-110-chat-conversations`, tree sạch). Stack Docker `market-link-chat` dùng tiếp; Task 2 thêm container `mlchat-rabbitmq`.
- `mvnw test` trong container làm devtools của app hot-restart (Plan 1 đã gặp): sau mỗi lượt test, đợi `curl :8082/ping` trước khi smoke.
- Test `@SpringBootTest(webEnvironment = RANDOM_PORT)` mở cổng ngẫu nhiên *trong container* — không đụng 8080 của app dev đang chạy.
- Không bao giờ `git add -A` ở gốc repo; các bước đã ghi đường dẫn cụ thể.
