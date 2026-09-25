# Chat Customer ↔ Farmer — Plan 1/4: Backend REST lõi · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Người dùng đã đăng nhập mở được một thread với một stall, gửi và đọc tin nhắn chữ, đánh dấu đã đọc và đếm chưa đọc — qua REST, có kiểm quyền thành viên, chưa có realtime.

**Architecture:** Module mới `modules/conversation` theo đúng cấu trúc của `modules/user` và `modules/chat` (controllers · services/{interfaces,impl} · repositories · entities · requests · resources · enums · exceptions). Hai bảng `conversations` + `messages` qua Flyway. Việc phát sự kiện realtime nằm sau `ChatEventPublisherInterface` với bản cài đặt chỉ ghi log — Plan 2 (RabbitMQ/STOMP) thay bản cài đặt đó, không sửa service.

**Tech Stack:** Spring Boot 4.1.1 · Java 25 · Spring Data JPA · Flyway (MySQL 8.4) · Spring Security (JWT có sẵn) · JUnit 5 + Mockito + AssertJ (đã có trong `spring-boot-starter-test`) · Spotless google-java-format AOSP.

**Spec:** `docs/superpowers/specs/2026-09-25-farmer-customer-chat-design.md` — plan này thực thi mục 5.1 (hai bảng đầu), 6.1 (6 endpoint đầu), 7.5, 8.1, 8.5 và bước 1–3 của mục 14. Đọc spec trước; plan này viết theo nó.

Plan 2 = RabbitMQ + STOMP + presence/typing/read. Plan 3 = ảnh + báo cáo + kiểm duyệt + **rate limit** (spec 8.4, mã 429 — đi cùng upload vì upload là chỗ cần chặn nhất). Plan 4 = component design system + UI hai vai + prototype.

## Global Constraints

- **R-01**: mỗi commit gắn FR: dùng `FR-110` (thread), `FR-113` (đếm chưa đọc). Hai FR này **đang chờ QA/DOC thêm** vào `.ai/REQUIREMENTS.md` (spec mục 4) — ghi rõ trong PR.
- **R-02**: không sửa `db/schema.sql`, `docs/api-contract.md`, `docs/decisions.md`.
- **R-03**: DB chỉ qua migration mới `V<yyyyMMdd><nnn>__<mo_ta>.sql`; không sửa file đã merge. Số hiện tại mới nhất trên `origin/dev`: `V20260925002`. Nếu lúc merge có người đã dùng `003/004`, đổi số của mình lên (CONTRIBUTING §7).
- **R-04**: SQL luôn tham số hoá (JPA / JPQL với `:param`). Không nối chuỗi.
- **R-06**: mọi endpoint có `{id}` kiểm tư cách thành viên **trước khi** trả dữ liệu; sai → 403.
- **R-08 / AGENTS.md**: chỉ làm trên nhánh `feature/FR-110-chat-conversations` tách từ `origin/dev`. Không commit/push `dev`/`main`. Không `--no-verify`. Không đọc/in `.env` của máy khác.
- Khoá ngoại tới người dùng: `BIGINT UNSIGNED` khớp `users.id` (backend/CLAUDE.md). Khoá ngoại tới `users` **không** `ON DELETE CASCADE` (spec 5.1).
- Quy ước API: `/api/v1`, JSON camelCase, envelope `ApiResource` qua `ok(...)`/`created(...)` của `BaseController`. Request/response là `record`. Namespace `/api/v1/conversations` — **không** đụng `/api/v1/chat` (chatbot FR-090).
- Copy trả về cho người dùng: tiếng Anh, sentence case, không dấu chấm than.
- Test nghiệp vụ: JUnit 5 + Mockito thuần như `UserServiceTest` (không `@SpringBootTest`). `make be-test` và `make lint` phải xanh trước khi mở PR.
- Commit message kết thúc bằng `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` (CONTRIBUTING §4 yêu cầu giữ dòng này).

## Review Focus

Năm tình huống spec ngụ ý nhưng dễ bị bỏ sót; mỗi dòng có test ghim vào task sở hữu code:

1. **Body chỉ toàn khoảng trắng** (`"   "`) → phải bị chặn 400, không được lưu thành tin rỗng và không được cập nhật `last_message_text`. → Task 6, test `blankBodyIsRejectedBeforeAnythingIsSaved`.
2. **`before` là id của tin nhắn ở thread khác** → không được rò tin thread đó: truy vấn luôn lọc theo `conversationId` của thread đang đọc. → Task 7, test `listPassesTheConversationIdToTheRepositoryEvenWithBefore`.
3. **`farmerUserId` không tồn tại** → 404, không phải 500 hay 403 sai nghĩa. → Task 5, test `openWithUnknownTargetIsNotFound`.
4. **`size=500`** → phải bị kẹp về 50, không cho client kéo cả lịch sử một lần. → Task 7, test `listClampsPageSizeToFifty`.
5. **Tin dài 2000 ký tự** → preview trong danh sách thread phải cắt còn 160, không được làm hỏng cột `VARCHAR(160)`. → Task 6, test `previewIsCutToOneHundredSixtyCharacters`.

Ngoài ra, một tình huống chỉ kiểm được với DB thật: tin đã bị ẩn (`hidden_at`) không xuất hiện trong danh sách và không được đếm chưa đọc — ghim vào bước smoke test tay của Task 8.

---

## Chuẩn bị: cách chạy lệnh trong plan này

Host chỉ có JDK 21, dự án cần JDK 25 → **mọi lệnh Maven chạy trong container**. Worktree `market-link-dev` đang được một session khác dùng và stack Docker hiện tại mount source của nó, nên plan này dựng **worktree riêng + stack Docker riêng** (Task 0). Từ Task 1 trở đi, mọi lệnh chạy từ thư mục worktree mới:

```bash
cd /Users/phong/projects/school/fpt-aptech/Code_project/techwiz7/market-link-chat
```

Chạy một class test:

```bash
docker compose exec backend ./mvnw -B -q test -Dtest=ConversationServiceTest
```

Kết quả mong đợi khi xanh: dòng `Tests run: N, Failures: 0, Errors: 0` và `BUILD SUCCESS` (với `-q` chỉ thấy khi có lỗi; không có output = pass). Khi cần thấy rõ, bỏ `-q`.

Format Java trước khi commit (lefthook cũng tự chạy, nhưng chạy tay để CI không đỏ vì format):

```bash
docker compose exec backend ./mvnw -q spotless:apply
```

---

### Task 0: Worktree riêng, stack Docker riêng, đưa spec + plan vào nhánh

**Files:**
- Create (ngoài repo): `/Users/phong/projects/school/fpt-aptech/Code_project/techwiz7/compose.chat-override.yml`
- Create (git-ignore): `market-link-chat/.env`
- Copy vào nhánh: `docs/superpowers/specs/2026-09-25-farmer-customer-chat-design.md`, `docs/superpowers/plans/2026-09-25-chat-backend-conversations.md`

**Interfaces:**
- Produces: worktree `market-link-chat` trên nhánh `feature/FR-110-chat-conversations`, backend chạy ở `http://localhost:8082`, MySQL ở `localhost:3307`, project Compose `market-link-chat`.

- [ ] **Step 1: Tạo worktree từ `origin/dev`**

```bash
cd /Users/phong/projects/school/fpt-aptech/Code_project/techwiz7/market-link-dev
git fetch origin
git worktree add ../market-link-chat -b feature/FR-110-chat-conversations origin/dev
cd ../market-link-chat
git branch --show-current
```

Expected: in ra `feature/FR-110-chat-conversations`. `git status --short` trống.

- [ ] **Step 2: Tạo file override đặt tên container (ngoài repo, không bao giờ bị commit)**

```bash
cat > /Users/phong/projects/school/fpt-aptech/Code_project/techwiz7/compose.chat-override.yml <<'EOF'
# Stack Docker thứ hai cho worktree market-link-chat. docker-compose.yml đặt container_name cứng,
# nên project thứ hai phải đổi tên container mới chạy song song được với stack market-link.
services:
  mysql:        { container_name: chat-mysql }
  redis:        { container_name: chat-redis }
  backend:      { container_name: chat-backend }
  frontend:     { container_name: chat-frontend }
  adminer:      { container_name: chat-adminer }
  redisinsight: { container_name: chat-redisinsight }
EOF
```

- [ ] **Step 3: Tạo `.env` từ mẫu, đổi cổng và trỏ Compose sang project riêng**

```bash
cd /Users/phong/projects/school/fpt-aptech/Code_project/techwiz7/market-link-chat
cp .env.example .env
sed -i '' \
  -e 's/^MYSQL_PORT=.*/MYSQL_PORT=3307/' \
  -e 's/^REDIS_PORT=.*/REDIS_PORT=6380/' \
  -e 's/^BACKEND_PORT=.*/BACKEND_PORT=8082/' \
  -e 's/^BACKEND_DEBUG_PORT=.*/BACKEND_DEBUG_PORT=5006/' \
  -e 's/^FRONTEND_PORT=.*/FRONTEND_PORT=3001/' \
  -e 's/^ADMINER_PORT=.*/ADMINER_PORT=8083/' \
  -e 's/^REDISINSIGHT_PORT=.*/REDISINSIGHT_PORT=5541/' \
  -e 's#^CORS_ALLOWED_ORIGINS=.*#CORS_ALLOWED_ORIGINS=http://localhost:3001#' \
  .env
cat >> .env <<'EOF'

# ---------- Stack riêng cho worktree chat (không đụng stack market-link đang chạy) ----------
COMPOSE_PROJECT_NAME=market-link-chat
COMPOSE_FILE=docker-compose.yml:../compose.chat-override.yml
EOF
git status --short
```

Expected: `git status --short` vẫn trống (`.env` bị ignore).

- [ ] **Step 4: Dựng backend + MySQL + Redis của stack mới**

```bash
docker compose --profile app up -d --build backend
```

Lần đầu build image và tải Maven dependency: 3–8 phút. Rồi:

```bash
docker compose ps
```

Expected: `chat-mysql`, `chat-redis` ở trạng thái `healthy`, `chat-backend` `running`. Không thấy `intervue-*` trong danh sách (đó là stack kia, không bị đụng).

- [ ] **Step 5: Xác nhận backend lên và Flyway đã chạy các migration có sẵn**

```bash
curl -s http://localhost:8082/ping
docker compose logs backend 2>&1 | grep -E 'Successfully (applied|validated)' | tail -3
```

Expected: `{"status":true,"message":"Pong!"}` và một dòng `Successfully applied 9 migrations` (hoặc `Successfully validated 9 migrations`).

- [ ] **Step 6: Đưa spec và plan vào nhánh, commit**

```bash
mkdir -p docs/superpowers/specs docs/superpowers/plans
cp ../market-link-dev/docs/superpowers/specs/2026-09-25-farmer-customer-chat-design.md docs/superpowers/specs/
cp ../market-link-dev/docs/superpowers/plans/2026-09-25-chat-backend-conversations.md docs/superpowers/plans/
git add docs/superpowers/specs/2026-09-25-farmer-customer-chat-design.md docs/superpowers/plans/2026-09-25-chat-backend-conversations.md
git commit -m "docs(FR-110): chat design spec and backend plan 1/4

Customer-to-Farmer messaging is outside the SRS; the spec carries the
scope warning (R-07) and the FR-110..119 proposal for QA/DOC.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

Expected: hook `branch-guard` cho qua (không phải `main`/`dev`), commit thành công.

---

### Task 1: Migration hai bảng `conversations` và `messages`

**Files:**
- Create: `backend/src/main/resources/db/migration/V20260925003__create_conversations_table.sql`
- Create: `backend/src/main/resources/db/migration/V20260925004__create_messages_table.sql`

**Interfaces:**
- Produces: bảng `conversations(id, user_a_id, user_b_id, last_message_at, last_message_text, user_a_read_at, user_b_read_at, created_at)` và `messages(id, conversation_id, sender_id, kind, body, product_id, order_id, hidden_at, hidden_by, created_at)` — Task 2 map entity đúng tên cột này.

- [ ] **Step 1: Viết migration `conversations`**

```sql
-- FR-110: một thread cho một cặp người dùng. Khoá theo cặp user, không theo vai, vì
-- "A Farmer is a Customer with a stall" (prototype README): hai chủ stall mua qua lại của nhau
-- vẫn chỉ có một thread. user_a_id < user_b_id để cặp (3,7) và (7,3) là cùng một dòng.
-- Khoá ngoại tới users không CASCADE: tài khoản chỉ bị vô hiệu hoá (FR-072), không xoá cứng.
CREATE TABLE conversations (
    id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_a_id         BIGINT UNSIGNED NOT NULL,
    user_b_id         BIGINT UNSIGNED NOT NULL,
    last_message_at   DATETIME NULL,
    last_message_text VARCHAR(160) NULL,
    user_a_read_at    DATETIME NULL,
    user_b_read_at    DATETIME NULL,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_conversations_user_a FOREIGN KEY (user_a_id) REFERENCES users (id),
    CONSTRAINT fk_conversations_user_b FOREIGN KEY (user_b_id) REFERENCES users (id),
    CONSTRAINT uq_conversation_pair UNIQUE (user_a_id, user_b_id),
    CONSTRAINT chk_conversation_pair_order CHECK (user_a_id < user_b_id),
    INDEX idx_conv_a (user_a_id, last_message_at),
    INDEX idx_conv_b (user_b_id, last_message_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
```

- [ ] **Step 2: Viết migration `messages`**

```sql
-- FR-110, FR-114: tin nhắn trong một thread. product_id / order_id là ngữ cảnh ghim;
-- CHƯA đặt khoá ngoại vì bảng products / orders chưa tồn tại (roadmap backend bước 5, 8).
-- Một migration sau sẽ thêm FK khi hai bảng đó có mặt. hidden_at: admin ẩn, không xoá cứng.
CREATE TABLE messages (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    conversation_id BIGINT UNSIGNED NOT NULL,
    sender_id       BIGINT UNSIGNED NOT NULL,
    kind            ENUM ('text', 'image', 'offer', 'system') NOT NULL DEFAULT 'text',
    body            VARCHAR(2000) NULL,
    product_id      BIGINT UNSIGNED NULL,
    order_id        BIGINT UNSIGNED NULL,
    hidden_at       DATETIME NULL,
    hidden_by       BIGINT UNSIGNED NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_messages_conversation FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE,
    CONSTRAINT fk_messages_sender FOREIGN KEY (sender_id) REFERENCES users (id),
    CONSTRAINT fk_messages_hidden_by FOREIGN KEY (hidden_by) REFERENCES users (id) ON DELETE SET NULL,
    INDEX idx_messages_conv (conversation_id, id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
```

- [ ] **Step 3: Restart backend để Flyway áp dụng, kiểm tra log**

```bash
docker compose restart backend
sleep 25
docker compose logs --since 2m backend 2>&1 | grep -E 'Migrating schema|Successfully applied|ERROR' | tail -5
```

Expected: `Migrating schema \`intervue_db\` to version "20260925003 - create conversations table"`, `... "20260925004 - create messages table"`, rồi `Successfully applied 2 migrations`. Không có `ERROR`.

- [ ] **Step 4: Xem bảng đã đúng chưa**

```bash
docker compose exec mysql mysql -uintervue -pintervue_pass intervue_db -e 'SHOW CREATE TABLE conversations\G' | grep -E 'uq_conversation_pair|chk_conversation_pair_order|fk_conversations_user_a'
docker compose exec mysql mysql -uintervue -pintervue_pass intervue_db -e 'DESCRIBE messages' | grep -E '^(kind|body|hidden_at)'
```

(Mật khẩu `intervue_pass` là giá trị trong `.env.example`, không phải bí mật.) Expected: thấy 3 constraint và các cột `kind enum('text','image','offer','system')`, `body varchar(2000)`, `hidden_at datetime`.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/resources/db/migration/V20260925003__create_conversations_table.sql backend/src/main/resources/db/migration/V20260925004__create_messages_table.sql
git commit -m "feat(FR-110): add conversations and messages tables

One thread per pair of users (user_a_id < user_b_id, unique). Message
context pins have no FK yet because products/orders do not exist.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Enum, entity và repository

**Files:**
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/enums/MessageKind.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/entities/Conversation.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/entities/Message.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/repositories/ConversationRepository.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/repositories/MessageRepository.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/conversation/entities/ConversationTest.java`

**Interfaces:**
- Produces:
  - `enum MessageKind { TEXT, IMAGE, OFFER, SYSTEM }` với `value()` chữ thường và `DbConverter`.
  - `Conversation.between(Long x, Long y)`, `boolean hasMember(Long)`, `Long otherMember(Long)`, `Instant readAtOf(Long)`, `void markRead(Long userId, Instant at)`, `void noteNewMessage(String preview, Instant at)`; getter/setter Lombok cho `id, userAId, userBId, lastMessageAt, lastMessageText, userAReadAt, userBReadAt, createdAt`.
  - `Message` builder với `conversationId, senderId, kind, body, productId, orderId, hiddenAt, hiddenBy`; `boolean isHidden()`.
  - `ConversationRepository.findByUserAIdAndUserBId(Long, Long): Optional<Conversation>`; `findMine(Long me, Pageable): Page<Conversation>`.
  - `MessageRepository.findByConversationIdAndHiddenAtIsNullOrderByIdDesc(Long, Pageable): List<Message>`; `findByConversationIdAndIdLessThanAndHiddenAtIsNullOrderByIdDesc(Long, Long, Pageable): List<Message>`; `countUnreadByConversation(Long me, Collection<Long> ids): List<UnreadRow>` với `UnreadRow { Long getConversationId(); long getTotal(); }`; `countUnread(Long me): long`.

- [ ] **Step 1: Viết test entity (thất bại vì chưa có class)**

```java
package com.techx.intervue.modules.conversation.entities;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import org.junit.jupiter.api.Test;

class ConversationTest {

    @Test
    void betweenAlwaysStoresTheSmallerIdFirst() {
        Conversation c = Conversation.between(7L, 3L);

        assertThat(c.getUserAId()).isEqualTo(3L);
        assertThat(c.getUserBId()).isEqualTo(7L);
    }

    @Test
    void betweenRefusesTheSameUserTwice() {
        assertThatThrownBy(() -> Conversation.between(5L, 5L))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void membershipAndOtherMemberFollowThePair() {
        Conversation c = Conversation.between(3L, 7L);

        assertThat(c.hasMember(3L)).isTrue();
        assertThat(c.hasMember(7L)).isTrue();
        assertThat(c.hasMember(9L)).isFalse();
        assertThat(c.hasMember(null)).isFalse();
        assertThat(c.otherMember(3L)).isEqualTo(7L);
        assertThat(c.otherMember(7L)).isEqualTo(3L);
    }

    @Test
    void markReadWritesTheColumnOfThatMemberOnly() {
        Conversation c = Conversation.between(3L, 7L);
        Instant at = Instant.parse("2026-09-25T06:00:00Z");

        c.markRead(7L, at);

        assertThat(c.readAtOf(7L)).isEqualTo(at);
        assertThat(c.readAtOf(3L)).isNull();
    }

    @Test
    void noteNewMessageUpdatesPreviewAndTime() {
        Conversation c = Conversation.between(3L, 7L);
        Instant at = Instant.parse("2026-09-25T06:00:00Z");

        c.noteNewMessage("Five bunches left", at);

        assertThat(c.getLastMessageText()).isEqualTo("Five bunches left");
        assertThat(c.getLastMessageAt()).isEqualTo(at);
    }
}
```

- [ ] **Step 2: Chạy test, xác nhận thất bại**

Run: `docker compose exec backend ./mvnw -B -q test -Dtest=ConversationTest`
Expected: `BUILD FAILURE` — `cannot find symbol: class Conversation`.

- [ ] **Step 3: Viết `MessageKind`**

```java
package com.techx.intervue.modules.conversation.enums;

import com.fasterxml.jackson.annotation.JsonValue;
import com.techx.intervue.converters.LowercaseEnumConverter;
import jakarta.persistence.Converter;
import java.util.Locale;

/** Khớp ENUM('text','image','offer','system') trong migration V20260925004. */
public enum MessageKind {
    TEXT,
    IMAGE,
    OFFER,
    SYSTEM;

    @JsonValue
    public String value() {
        return name().toLowerCase(Locale.ROOT);
    }

    @Converter(autoApply = true)
    public static class DbConverter extends LowercaseEnumConverter<MessageKind> {
        public DbConverter() {
            super(MessageKind.class);
        }
    }
}
```

- [ ] **Step 4: Viết entity `Conversation`**

```java
package com.techx.intervue.modules.conversation.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * FR-110: một thread cho một cặp người dùng. Luôn giữ userAId < userBId để (3,7) và (7,3) là
 * cùng một dòng; ai là "stall" trong thread được quyết lúc hiển thị, theo vai của người đối diện.
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "conversations")
public class Conversation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_a_id", nullable = false, updatable = false)
    private Long userAId;

    @Column(name = "user_b_id", nullable = false, updatable = false)
    private Long userBId;

    @Column(name = "last_message_at")
    private Instant lastMessageAt;

    @Column(name = "last_message_text", length = 160)
    private String lastMessageText;

    @Column(name = "user_a_read_at")
    private Instant userAReadAt;

    @Column(name = "user_b_read_at")
    private Instant userBReadAt;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreated() {
        createdAt = Instant.now();
    }

    /** Cặp đã chuẩn hoá thứ tự; hai id giống nhau là lỗi lập trình, không phải lỗi người dùng. */
    public static Conversation between(Long x, Long y) {
        if (x.equals(y)) {
            throw new IllegalArgumentException("A conversation needs two different users.");
        }
        return Conversation.builder().userAId(Math.min(x, y)).userBId(Math.max(x, y)).build();
    }

    public boolean hasMember(Long userId) {
        return userId != null && (userId.equals(userAId) || userId.equals(userBId));
    }

    public Long otherMember(Long userId) {
        return userId.equals(userAId) ? userBId : userAId;
    }

    public Instant readAtOf(Long userId) {
        return userId.equals(userAId) ? userAReadAt : userBReadAt;
    }

    public void markRead(Long userId, Instant at) {
        if (userId.equals(userAId)) {
            userAReadAt = at;
        } else {
            userBReadAt = at;
        }
    }

    public void noteNewMessage(String preview, Instant at) {
        lastMessageText = preview;
        lastMessageAt = at;
    }
}
```

- [ ] **Step 5: Viết entity `Message`**

```java
package com.techx.intervue.modules.conversation.entities;

import com.techx.intervue.modules.conversation.enums.MessageKind;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** FR-110, FR-114. productId / orderId là ngữ cảnh ghim, chưa có FK (xem migration). */
@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "messages")
public class Message {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "conversation_id", nullable = false, updatable = false)
    private Long conversationId;

    @Column(name = "sender_id", nullable = false, updatable = false)
    private Long senderId;

    @Convert(converter = MessageKind.DbConverter.class)
    @Column(nullable = false)
    @Builder.Default
    private MessageKind kind = MessageKind.TEXT;

    @Column(length = 2000)
    private String body;

    @Column(name = "product_id")
    private Long productId;

    @Column(name = "order_id")
    private Long orderId;

    /** Admin ẩn (Plan 3). Không bao giờ xoá cứng. */
    @Column(name = "hidden_at")
    private Instant hiddenAt;

    @Column(name = "hidden_by")
    private Long hiddenBy;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreated() {
        createdAt = Instant.now();
    }

    public boolean isHidden() {
        return hiddenAt != null;
    }
}
```

- [ ] **Step 6: Viết `ConversationRepository`**

```java
package com.techx.intervue.modules.conversation.repositories;

import com.techx.intervue.modules.conversation.entities.Conversation;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    /** Gọi với cặp đã chuẩn hoá (userAId < userBId), xem Conversation.between. */
    Optional<Conversation> findByUserAIdAndUserBId(Long userAId, Long userBId);

    /** Thread của chính mình, mới nhất trước; thread chưa có tin nào xếp theo lúc tạo. */
    @Query(
            "select c from Conversation c where c.userAId = :me or c.userBId = :me"
                    + " order by coalesce(c.lastMessageAt, c.createdAt) desc, c.id desc")
    Page<Conversation> findMine(@Param("me") Long me, Pageable pageable);
}
```

- [ ] **Step 7: Viết `MessageRepository`**

```java
package com.techx.intervue.modules.conversation.repositories;

import com.techx.intervue.modules.conversation.entities.Message;
import java.util.Collection;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {

    /** Trang đầu: mới nhất trước, bỏ tin đã bị ẩn. Pageable chỉ mang page size. */
    List<Message> findByConversationIdAndHiddenAtIsNullOrderByIdDesc(
            Long conversationId, Pageable pageable);

    /** Các trang sau: keyset theo id, để cuộn lên không bị trùng khi có tin mới chen vào. */
    List<Message> findByConversationIdAndIdLessThanAndHiddenAtIsNullOrderByIdDesc(
            Long conversationId, Long before, Pageable pageable);

    interface UnreadRow {
        Long getConversationId();

        long getTotal();
    }

    /**
     * Chưa đọc = tin của người kia, chưa bị ẩn, tạo sau mốc read_at của mình trong thread đó.
     * Gộp theo thread cho một trang danh sách; ids không được rỗng (service tự chặn).
     */
    @Query(
            "select m.conversationId as conversationId, count(m) as total"
                    + " from Message m, Conversation c"
                    + " where c.id = m.conversationId and c.id in :ids"
                    + " and m.hiddenAt is null and m.senderId <> :me"
                    + " and ((c.userAId = :me and (c.userAReadAt is null or m.createdAt > c.userAReadAt))"
                    + "   or (c.userBId = :me and (c.userBReadAt is null or m.createdAt > c.userBReadAt)))"
                    + " group by m.conversationId")
    List<UnreadRow> countUnreadByConversation(
            @Param("me") Long me, @Param("ids") Collection<Long> ids);

    /** FR-113: tổng chưa đọc trên mọi thread của mình, cho badge header. */
    @Query(
            "select count(m) from Message m, Conversation c"
                    + " where c.id = m.conversationId"
                    + " and (c.userAId = :me or c.userBId = :me)"
                    + " and m.hiddenAt is null and m.senderId <> :me"
                    + " and ((c.userAId = :me and (c.userAReadAt is null or m.createdAt > c.userAReadAt))"
                    + "   or (c.userBId = :me and (c.userBReadAt is null or m.createdAt > c.userBReadAt)))")
    long countUnread(@Param("me") Long me);
}
```

- [ ] **Step 8: Chạy test entity, xác nhận pass**

Run: `docker compose exec backend ./mvnw -B -q test -Dtest=ConversationTest`
Expected: không có output lỗi (5 test pass).

- [ ] **Step 9: Restart backend để Hibernate validate entity với bảng thật**

```bash
docker compose restart backend && sleep 25 && curl -s http://localhost:8082/ping
docker compose logs --since 1m backend 2>&1 | grep -iE 'exception|error' | head -5
```

Expected: `Pong!` và không có dòng lỗi (đặc biệt không có `Schema-validation` hay `Unknown column`).

- [ ] **Step 10: Format và commit**

```bash
docker compose exec backend ./mvnw -q spotless:apply
git add backend/src/main/java/com/techx/intervue/modules/conversation backend/src/test/java/com/techx/intervue/modules/conversation
git commit -m "feat(FR-110): conversation and message entities with repositories

Conversation normalises the pair so one thread exists per two users.
Unread counting is a JPQL query per member read marker.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Exception và chính sách "ai được nhắn cho ai"

**Files:**
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/exceptions/ConversationAccessDeniedException.java`
- Create: `.../exceptions/StallNotOpenException.java`
- Create: `.../exceptions/AccountRestrictedException.java`
- Create: `.../exceptions/ConversationClosedException.java`
- Create: `.../exceptions/SelfConversationException.java`
- Create: `.../exceptions/UnsupportedMessageKindException.java`
- Create: `.../exceptions/EmptyMessageException.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/services/interfaces/StallAccessPolicyInterface.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/services/impl/StallAccessPolicy.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/conversation/services/impl/StallAccessPolicyTest.java`

**Interfaces:**
- Consumes: `User` (`getRole(): RoleType`, `getStatus(): UserStatus`) từ `modules/user`.
- Produces: `StallAccessPolicyInterface { void assertCanStart(User me); void assertCanBeMessaged(User target); void assertCanSend(User sender, User recipient); }` và 7 exception (đều `RuntimeException`, message cố định).

- [ ] **Step 1: Viết test chính sách (thất bại vì chưa có class)**

```java
package com.techx.intervue.modules.conversation.services.impl;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.techx.intervue.modules.conversation.exceptions.AccountRestrictedException;
import com.techx.intervue.modules.conversation.exceptions.ConversationClosedException;
import com.techx.intervue.modules.conversation.exceptions.StallNotOpenException;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.enums.UserStatus;
import org.junit.jupiter.api.Test;

class StallAccessPolicyTest {

    private final StallAccessPolicy policy = new StallAccessPolicy();

    private static User user(RoleType role, UserStatus status) {
        return User.builder().id(1L).role(role).status(status).build();
    }

    @Test
    void anActiveFarmerCanBeMessaged() {
        assertThatCode(() -> policy.assertCanBeMessaged(user(RoleType.FARMER, UserStatus.ACTIVE)))
                .doesNotThrowAnyException();
    }

    @Test
    void aCustomerCannotBeTheTargetOfANewThread() {
        assertThatThrownBy(
                        () -> policy.assertCanBeMessaged(user(RoleType.CUSTOMER, UserStatus.ACTIVE)))
                .isInstanceOf(StallNotOpenException.class);
    }

    @Test
    void anAdminCannotBeTheTargetOfANewThread() {
        assertThatThrownBy(() -> policy.assertCanBeMessaged(user(RoleType.ADMIN, UserStatus.ACTIVE)))
                .isInstanceOf(StallNotOpenException.class);
    }

    @Test
    void aSuspendedFarmerIsNotOpenForNewThreads() {
        assertThatThrownBy(
                        () -> policy.assertCanBeMessaged(user(RoleType.FARMER, UserStatus.SUSPENDED)))
                .isInstanceOf(StallNotOpenException.class);
    }

    @Test
    void anInactiveAccountCannotStartOrSend() {
        User me = user(RoleType.CUSTOMER, UserStatus.INACTIVE);
        User stall = user(RoleType.FARMER, UserStatus.ACTIVE);

        assertThatThrownBy(() -> policy.assertCanStart(me))
                .isInstanceOf(AccountRestrictedException.class);
        assertThatThrownBy(() -> policy.assertCanSend(me, stall))
                .isInstanceOf(AccountRestrictedException.class);
    }

    @Test
    void sendingToASuspendedRecipientIsClosedNotForbidden() {
        User me = user(RoleType.CUSTOMER, UserStatus.ACTIVE);
        User stall = user(RoleType.FARMER, UserStatus.SUSPENDED);

        assertThatThrownBy(() -> policy.assertCanSend(me, stall))
                .isInstanceOf(ConversationClosedException.class);
    }

    @Test
    void aFarmerMayReplyToACustomer() {
        User stall = user(RoleType.FARMER, UserStatus.ACTIVE);
        User customer = user(RoleType.CUSTOMER, UserStatus.ACTIVE);

        assertThatCode(() -> policy.assertCanSend(stall, customer)).doesNotThrowAnyException();
    }
}
```

- [ ] **Step 2: Chạy test, xác nhận thất bại**

Run: `docker compose exec backend ./mvnw -B -q test -Dtest=StallAccessPolicyTest`
Expected: `BUILD FAILURE` — `cannot find symbol: class StallAccessPolicy`.

- [ ] **Step 3: Viết 7 exception**

`ConversationAccessDeniedException.java`:

```java
package com.techx.intervue.modules.conversation.exceptions;

/** R-06: không phải thành viên của thread → 403. */
public class ConversationAccessDeniedException extends RuntimeException {
    public ConversationAccessDeniedException() {
        super("You are not part of this conversation.");
    }
}
```

`StallNotOpenException.java`:

```java
package com.techx.intervue.modules.conversation.exceptions;

/** Đối tượng được nhắn không phải một stall đang mở → 403. */
public class StallNotOpenException extends RuntimeException {
    public StallNotOpenException() {
        super("This stall is not open yet.");
    }
}
```

`AccountRestrictedException.java`:

```java
package com.techx.intervue.modules.conversation.exceptions;

/** Tài khoản của chính người gọi không còn hoạt động → 403. */
public class AccountRestrictedException extends RuntimeException {
    public AccountRestrictedException() {
        super("Your account cannot send messages.");
    }
}
```

`ConversationClosedException.java`:

```java
package com.techx.intervue.modules.conversation.exceptions;

/** D-09: thread cũ đọc được nhưng không gửi thêm được → 409. */
public class ConversationClosedException extends RuntimeException {
    public ConversationClosedException() {
        super("This stall is not taking messages right now. You can still read older messages.");
    }
}
```

`SelfConversationException.java`:

```java
package com.techx.intervue.modules.conversation.exceptions;

/** Mở thread với chính mình → 400. */
public class SelfConversationException extends RuntimeException {
    public SelfConversationException() {
        super("You cannot message yourself.");
    }
}
```

`UnsupportedMessageKindException.java`:

```java
package com.techx.intervue.modules.conversation.exceptions;

import com.techx.intervue.modules.conversation.enums.MessageKind;

/** Plan 1 chỉ nhận tin chữ; ảnh và ra giá tới ở Plan 3 / đợt 2 → 400. */
public class UnsupportedMessageKindException extends RuntimeException {
    public UnsupportedMessageKindException(MessageKind kind) {
        super("Messages of kind \"" + kind.value() + "\" are not supported yet.");
    }
}
```

`EmptyMessageException.java`:

```java
package com.techx.intervue.modules.conversation.exceptions;

/** Body rỗng hoặc chỉ toàn khoảng trắng → 400. */
public class EmptyMessageException extends RuntimeException {
    public EmptyMessageException() {
        super("Type a message before sending.");
    }
}
```

- [ ] **Step 4: Viết interface chính sách**

```java
package com.techx.intervue.modules.conversation.services.interfaces;

import com.techx.intervue.modules.user.entities.User;

/**
 * Ai được mở thread với ai, ai còn được gửi. Đây là chỗ DUY NHẤT sẽ đọc
 * farmer_profiles.approval_status khi bảng đó xuất hiện (roadmap backend bước 3):
 * PENDING → StallNotOpenException, SUSPENDED → ConversationClosedException khi gửi.
 */
public interface StallAccessPolicyInterface {

    /** Người mở thread phải là tài khoản đang hoạt động. */
    void assertCanStart(User me);

    /** Đối tượng của thread mới phải là một stall đang mở nhận tin. */
    void assertCanBeMessaged(User target);

    /** Trước mỗi lần gửi: người gửi còn hoạt động, người nhận chưa bị khoá hay đình chỉ. */
    void assertCanSend(User sender, User recipient);
}
```

- [ ] **Step 5: Viết `StallAccessPolicy`**

```java
package com.techx.intervue.modules.conversation.services.impl;

import com.techx.intervue.modules.conversation.exceptions.AccountRestrictedException;
import com.techx.intervue.modules.conversation.exceptions.ConversationClosedException;
import com.techx.intervue.modules.conversation.exceptions.StallNotOpenException;
import com.techx.intervue.modules.conversation.services.interfaces.StallAccessPolicyInterface;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.enums.UserStatus;
import org.springframework.stereotype.Service;

/**
 * Bản hiện tại chỉ dựa vào users.role và users.status vì farmer_profiles chưa tồn tại. Khi bảng đó
 * có, thêm kiểm tra approval_status vào đúng hai method dưới, không sửa service nào khác.
 */
@Service
public class StallAccessPolicy implements StallAccessPolicyInterface {

    @Override
    public void assertCanStart(User me) {
        if (me.getStatus() != UserStatus.ACTIVE) {
            throw new AccountRestrictedException();
        }
    }

    @Override
    public void assertCanBeMessaged(User target) {
        if (target.getRole() != RoleType.FARMER || target.getStatus() != UserStatus.ACTIVE) {
            throw new StallNotOpenException();
        }
    }

    @Override
    public void assertCanSend(User sender, User recipient) {
        if (sender.getStatus() != UserStatus.ACTIVE) {
            throw new AccountRestrictedException();
        }
        // Không kiểm role người nhận: stall trả lời khách cũng đi qua đây.
        if (recipient.getStatus() != UserStatus.ACTIVE) {
            throw new ConversationClosedException();
        }
    }
}
```

- [ ] **Step 6: Chạy test, xác nhận pass**

Run: `docker compose exec backend ./mvnw -B -q test -Dtest=StallAccessPolicyTest`
Expected: 7 test pass, không output lỗi.

- [ ] **Step 7: Format và commit**

```bash
docker compose exec backend ./mvnw -q spotless:apply
git add backend/src/main/java/com/techx/intervue/modules/conversation backend/src/test/java/com/techx/intervue/modules/conversation
git commit -m "feat(FR-110): stall access policy and conversation exceptions

Who may open a thread and who may still send, in one place, so the
farmer_profiles approval check lands here later without touching services.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Request, resource và cổng phát sự kiện

**Files:**
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/requests/OpenConversationRequest.java`
- Create: `.../requests/SendMessageRequest.java`
- Create: `.../resources/ParticipantResource.java`
- Create: `.../resources/ConversationResource.java`
- Create: `.../resources/MessageResource.java`
- Create: `.../resources/PagedResource.java`
- Create: `.../resources/UnreadCountResource.java`
- Create: `.../services/interfaces/ChatEventPublisherInterface.java`
- Create: `.../services/impl/LoggingChatEventPublisher.java`

**Interfaces:**
- Produces:
  - `record OpenConversationRequest(Long farmerUserId)`
  - `record SendMessageRequest(MessageKind kind, String body, Long productId, Long orderId)`
  - `record ParticipantResource(Long userId, String fullName, RoleType role, String image)` + `static from(User)`
  - `record ConversationResource(Long id, ParticipantResource other, String lastMessageText, Instant lastMessageAt, long unreadCount, Instant createdAt)`
  - `record MessageResource(Long id, Long conversationId, Long senderId, MessageKind kind, String body, Long productId, Long orderId, Instant createdAt)` + `static from(Message)`
  - `record PagedResource<T>(List<T> items, int page, int pageSize, long total)`
  - `record UnreadCountResource(long count)`
  - `ChatEventPublisherInterface { void messageCreated(Conversation conversation, MessageResource message); void conversationRead(Conversation conversation, Long readerId, Instant readAt); }`

Không có test riêng: đây là record thuần và một bean ghi log; hành vi được test qua Task 5–7.

- [ ] **Step 1: Viết hai request**

`OpenConversationRequest.java`:

```java
package com.techx.intervue.modules.conversation.requests;

import jakarta.validation.constraints.NotNull;

/** FR-110. Ghim sản phẩm đi theo tin nhắn đầu tiên (SendMessageRequest), không theo thread. */
public record OpenConversationRequest(
        @NotNull(message = "Choose a stall to message.") Long farmerUserId) {}
```

`SendMessageRequest.java`:

```java
package com.techx.intervue.modules.conversation.requests;

import com.techx.intervue.modules.conversation.enums.MessageKind;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * FR-110, FR-114. kind bỏ trống = text. Plan 1 chỉ nhận text, nên body bắt buộc; Plan 3 nới cho ảnh.
 * productId / orderId là ngữ cảnh ghim, chưa kiểm tồn tại vì hai bảng đó chưa có.
 */
public record SendMessageRequest(
        MessageKind kind,
        @NotBlank(message = "Type a message before sending.")
                @Size(max = 2000, message = "A message can be at most 2000 characters.")
                String body,
        Long productId,
        Long orderId) {}
```

- [ ] **Step 2: Viết năm resource**

`ParticipantResource.java`:

```java
package com.techx.intervue.modules.conversation.resources;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import lombok.Builder;

/** Người đối diện trong một thread. Không lộ email, phone, address. */
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ParticipantResource(Long userId, String fullName, RoleType role, String image) {

    public static ParticipantResource from(User user) {
        return ParticipantResource.builder()
                .userId(user.getId())
                .fullName(user.getFullName())
                .role(user.getRole())
                .image(user.getImage())
                .build();
    }
}
```

`ConversationResource.java`:

```java
package com.techx.intervue.modules.conversation.resources;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import lombok.Builder;

@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ConversationResource(
        Long id,
        ParticipantResource other,
        String lastMessageText,
        Instant lastMessageAt,
        long unreadCount,
        Instant createdAt) {}
```

`MessageResource.java`:

```java
package com.techx.intervue.modules.conversation.resources;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.techx.intervue.modules.conversation.entities.Message;
import com.techx.intervue.modules.conversation.enums.MessageKind;
import java.time.Instant;
import lombok.Builder;

@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public record MessageResource(
        Long id,
        Long conversationId,
        Long senderId,
        MessageKind kind,
        String body,
        Long productId,
        Long orderId,
        Instant createdAt) {

    public static MessageResource from(Message m) {
        return MessageResource.builder()
                .id(m.getId())
                .conversationId(m.getConversationId())
                .senderId(m.getSenderId())
                .kind(m.getKind())
                .body(m.getBody())
                .productId(m.getProductId())
                .orderId(m.getOrderId())
                .createdAt(m.getCreatedAt())
                .build();
    }
}
```

`PagedResource.java`:

```java
package com.techx.intervue.modules.conversation.resources;

import java.util.List;

/** Trang dữ liệu; page bắt đầu từ 1 để khớp query string. */
public record PagedResource<T>(List<T> items, int page, int pageSize, long total) {}
```

`UnreadCountResource.java`:

```java
package com.techx.intervue.modules.conversation.resources;

/** FR-113. */
public record UnreadCountResource(long count) {}
```

- [ ] **Step 3: Viết cổng phát sự kiện và bản ghi log**

`ChatEventPublisherInterface.java`:

```java
package com.techx.intervue.modules.conversation.services.interfaces;

import com.techx.intervue.modules.conversation.entities.Conversation;
import com.techx.intervue.modules.conversation.resources.MessageResource;
import java.time.Instant;

/**
 * Spec 7.5: service nghiệp vụ chỉ nói "có tin mới" / "đã đọc"; ai nhận và qua đường nào là việc của
 * bản cài đặt. Plan 1 chỉ ghi log; Plan 2 thay bằng STOMP qua RabbitMQ mà không sửa service.
 */
public interface ChatEventPublisherInterface {

    void messageCreated(Conversation conversation, MessageResource message);

    void conversationRead(Conversation conversation, Long readerId, Instant readAt);
}
```

`LoggingChatEventPublisher.java`:

```java
package com.techx.intervue.modules.conversation.services.impl;

import com.techx.intervue.modules.conversation.entities.Conversation;
import com.techx.intervue.modules.conversation.resources.MessageResource;
import com.techx.intervue.modules.conversation.services.interfaces.ChatEventPublisherInterface;
import java.time.Instant;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/** Plan 1: chưa có realtime, chỉ ghi log để thấy sự kiện đã được phát ra đúng chỗ. */
@Slf4j
@Service
public class LoggingChatEventPublisher implements ChatEventPublisherInterface {

    @Override
    public void messageCreated(Conversation conversation, MessageResource message) {
        log.debug(
                "chat event: message {} in conversation {} from user {}",
                message.id(),
                conversation.getId(),
                message.senderId());
    }

    @Override
    public void conversationRead(Conversation conversation, Long readerId, Instant readAt) {
        log.debug(
                "chat event: conversation {} read by user {} at {}",
                conversation.getId(),
                readerId,
                readAt);
    }
}
```

- [ ] **Step 4: Biên dịch để chắc không lỗi**

Run: `docker compose exec backend ./mvnw -B -q compile`
Expected: không output (BUILD SUCCESS).

- [ ] **Step 5: Format và commit**

```bash
docker compose exec backend ./mvnw -q spotless:apply
git add backend/src/main/java/com/techx/intervue/modules/conversation
git commit -m "feat(FR-110): conversation request/response records and event port

ChatEventPublisherInterface is the seam Plan 2 fills with STOMP; for now
it only logs.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: `ConversationService.open` — mở thread idempotent

**Files:**
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/services/impl/ConversationLookup.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/services/interfaces/ConversationServiceInterface.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/services/impl/ConversationService.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/conversation/services/impl/ConversationServiceTest.java`

**Interfaces:**
- Consumes: `ConversationRepository`, `MessageRepository`, `UserRepository.findById`, `StallAccessPolicyInterface`, `ChatEventPublisherInterface`, bean `Clock` (đã có: `ChatConfig.chatClock`).
- Produces:
  - `ConversationLookup.requireMember(Long meId, Long conversationId): Conversation` — 404 nếu không có, `ConversationAccessDeniedException` nếu không phải thành viên. Task 6–7 dùng lại.
  - `ConversationServiceInterface { ConversationResource open(Long meId, OpenConversationRequest request); PagedResource<ConversationResource> listMine(Long meId, int page, int size); UnreadCountResource unreadCount(Long meId); void markRead(Long meId, Long conversationId); }` — cả 4 method được viết đủ ngay ở Task này (Step 5), để class biên dịch được và không có method giả; Task 7 chỉ bổ sung test cho `listMine`, `unreadCount`, `markRead`.

- [ ] **Step 1: Viết test cho `open` (thất bại vì chưa có class)**

```java
package com.techx.intervue.modules.conversation.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.conversation.entities.Conversation;
import com.techx.intervue.modules.conversation.exceptions.SelfConversationException;
import com.techx.intervue.modules.conversation.exceptions.StallNotOpenException;
import com.techx.intervue.modules.conversation.repositories.ConversationRepository;
import com.techx.intervue.modules.conversation.repositories.MessageRepository;
import com.techx.intervue.modules.conversation.requests.OpenConversationRequest;
import com.techx.intervue.modules.conversation.resources.ConversationResource;
import com.techx.intervue.modules.conversation.services.interfaces.ChatEventPublisherInterface;
import com.techx.intervue.modules.conversation.services.interfaces.StallAccessPolicyInterface;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.enums.UserStatus;
import com.techx.intervue.modules.user.repositories.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class ConversationServiceTest {

    static final Instant NOW = Instant.parse("2026-09-25T06:00:00Z");

    ConversationRepository conversations;
    MessageRepository messages;
    UserRepository users;
    StallAccessPolicyInterface policy;
    ChatEventPublisherInterface events;
    ConversationService service;

    User customer = User.builder().id(7L).fullName("An").role(RoleType.CUSTOMER).status(UserStatus.ACTIVE).build();
    User farmer = User.builder().id(3L).fullName("Cô Tư").role(RoleType.FARMER).status(UserStatus.ACTIVE).build();

    @BeforeEach
    void setUp() {
        conversations = mock(ConversationRepository.class);
        messages = mock(MessageRepository.class);
        users = mock(UserRepository.class);
        policy = mock(StallAccessPolicyInterface.class);
        events = mock(ChatEventPublisherInterface.class);
        Clock clock = Clock.fixed(NOW, ZoneId.of("Asia/Ho_Chi_Minh"));
        service =
                new ConversationService(
                        conversations,
                        messages,
                        users,
                        policy,
                        events,
                        new ConversationLookup(conversations),
                        clock);
        when(users.findById(7L)).thenReturn(Optional.of(customer));
        when(users.findById(3L)).thenReturn(Optional.of(farmer));
        when(messages.countUnreadByConversation(anyLong(), anyCollection())).thenReturn(List.of());
        when(conversations.save(any(Conversation.class)))
                .thenAnswer(
                        inv -> {
                            Conversation c = inv.getArgument(0);
                            c.setId(42L);
                            return c;
                        });
    }

    @Test
    void openCreatesTheNormalisedPairWhenNoneExists() {
        when(conversations.findByUserAIdAndUserBId(3L, 7L)).thenReturn(Optional.empty());

        ConversationResource result = service.open(7L, new OpenConversationRequest(3L));

        ArgumentCaptor<Conversation> saved = ArgumentCaptor.forClass(Conversation.class);
        verify(conversations).save(saved.capture());
        assertThat(saved.getValue().getUserAId()).isEqualTo(3L);
        assertThat(saved.getValue().getUserBId()).isEqualTo(7L);
        assertThat(result.id()).isEqualTo(42L);
        assertThat(result.other().userId()).isEqualTo(3L);
        assertThat(result.other().fullName()).isEqualTo("Cô Tư");
        assertThat(result.unreadCount()).isZero();
    }

    @Test
    void openReturnsTheExistingThreadWithoutSavingAgain() {
        Conversation existing = Conversation.between(3L, 7L);
        existing.setId(9L);
        when(conversations.findByUserAIdAndUserBId(3L, 7L)).thenReturn(Optional.of(existing));

        ConversationResource result = service.open(7L, new OpenConversationRequest(3L));

        assertThat(result.id()).isEqualTo(9L);
        verify(conversations, never()).save(any());
    }

    @Test
    void openRefusesMessagingYourself() {
        assertThatThrownBy(() -> service.open(7L, new OpenConversationRequest(7L)))
                .isInstanceOf(SelfConversationException.class);
        verify(conversations, never()).save(any());
    }

    @Test
    void openWithUnknownTargetIsNotFound() {
        when(users.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.open(7L, new OpenConversationRequest(99L)))
                .isInstanceOf(EntityNotFoundException.class);
        verify(conversations, never()).save(any());
    }

    @Test
    void openAsksThePolicyBeforeTouchingTheRepository() {
        doThrow(new StallNotOpenException()).when(policy).assertCanBeMessaged(farmer);

        assertThatThrownBy(() -> service.open(7L, new OpenConversationRequest(3L)))
                .isInstanceOf(StallNotOpenException.class);
        verify(policy).assertCanStart(customer);
        verify(conversations, never()).findByUserAIdAndUserBId(anyLong(), anyLong());
        verify(conversations, never()).save(any());
    }
}
```

- [ ] **Step 2: Chạy test, xác nhận thất bại**

Run: `docker compose exec backend ./mvnw -B -q test -Dtest=ConversationServiceTest`
Expected: `BUILD FAILURE` — `cannot find symbol: class ConversationService`.

- [ ] **Step 3: Viết `ConversationLookup`**

```java
package com.techx.intervue.modules.conversation.services.impl;

import com.techx.intervue.modules.conversation.entities.Conversation;
import com.techx.intervue.modules.conversation.exceptions.ConversationAccessDeniedException;
import com.techx.intervue.modules.conversation.repositories.ConversationRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** R-06: mọi endpoint có {id} đi qua đây trước khi trả bất cứ thứ gì. */
@Component
@RequiredArgsConstructor
public class ConversationLookup {

    private final ConversationRepository conversations;

    public Conversation requireMember(Long meId, Long conversationId) {
        Conversation conversation =
                conversations
                        .findById(conversationId)
                        .orElseThrow(() -> new EntityNotFoundException("Conversation not found."));
        if (!conversation.hasMember(meId)) {
            throw new ConversationAccessDeniedException();
        }
        return conversation;
    }
}
```

- [ ] **Step 4: Viết interface service**

```java
package com.techx.intervue.modules.conversation.services.interfaces;

import com.techx.intervue.modules.conversation.requests.OpenConversationRequest;
import com.techx.intervue.modules.conversation.resources.ConversationResource;
import com.techx.intervue.modules.conversation.resources.PagedResource;
import com.techx.intervue.modules.conversation.resources.UnreadCountResource;

public interface ConversationServiceInterface {

    /** FR-110: idempotent — cặp đã có thread thì trả lại thread đó. */
    ConversationResource open(Long meId, OpenConversationRequest request);

    /** Thread của chính mình, mới nhất trước. page bắt đầu từ 1. */
    PagedResource<ConversationResource> listMine(Long meId, int page, int size);

    /** FR-113: tổng chưa đọc cho badge header. */
    UnreadCountResource unreadCount(Long meId);

    /** Đánh dấu đã đọc tới hiện tại; chỉ thành viên. */
    void markRead(Long meId, Long conversationId);
}
```

- [ ] **Step 5: Viết `ConversationService` đủ cả 4 method**

(Task 7 chỉ *test* `listMine`, `unreadCount`, `markRead`; code viết luôn ở đây để class biên dịch được và không có method giả.)

```java
package com.techx.intervue.modules.conversation.services.impl;

import com.techx.intervue.modules.conversation.entities.Conversation;
import com.techx.intervue.modules.conversation.exceptions.SelfConversationException;
import com.techx.intervue.modules.conversation.repositories.ConversationRepository;
import com.techx.intervue.modules.conversation.repositories.MessageRepository;
import com.techx.intervue.modules.conversation.repositories.MessageRepository.UnreadRow;
import com.techx.intervue.modules.conversation.requests.OpenConversationRequest;
import com.techx.intervue.modules.conversation.resources.ConversationResource;
import com.techx.intervue.modules.conversation.resources.PagedResource;
import com.techx.intervue.modules.conversation.resources.ParticipantResource;
import com.techx.intervue.modules.conversation.resources.UnreadCountResource;
import com.techx.intervue.modules.conversation.services.interfaces.ChatEventPublisherInterface;
import com.techx.intervue.modules.conversation.services.interfaces.ConversationServiceInterface;
import com.techx.intervue.modules.conversation.services.interfaces.StallAccessPolicyInterface;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.repositories.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import java.time.Clock;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ConversationService implements ConversationServiceInterface {

    private final ConversationRepository conversations;
    private final MessageRepository messages;
    private final UserRepository users;
    private final StallAccessPolicyInterface policy;
    private final ChatEventPublisherInterface events;
    private final ConversationLookup lookup;
    private final Clock clock;

    @Override
    @Transactional
    public ConversationResource open(Long meId, OpenConversationRequest request) {
        if (meId.equals(request.farmerUserId())) {
            throw new SelfConversationException();
        }
        User me = requireUser(meId, "Account not found.");
        User target = requireUser(request.farmerUserId(), "Stall not found.");
        policy.assertCanStart(me);
        policy.assertCanBeMessaged(target);

        Conversation pair = Conversation.between(meId, target.getId());
        Conversation conversation =
                conversations
                        .findByUserAIdAndUserBId(pair.getUserAId(), pair.getUserBId())
                        .orElseGet(() -> conversations.save(pair));
        long unread = unreadFor(meId, List.of(conversation)).getOrDefault(conversation.getId(), 0L);
        return toResource(conversation, target, unread);
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResource<ConversationResource> listMine(Long meId, int page, int size) {
        Page<Conversation> found = conversations.findMine(meId, PageRequest.of(page - 1, size));
        Map<Long, Long> unread = unreadFor(meId, found.getContent());
        Map<Long, User> others = othersOf(meId, found.getContent());
        List<ConversationResource> items =
                found.getContent().stream()
                        .map(
                                c ->
                                        toResource(
                                                c,
                                                others.get(c.otherMember(meId)),
                                                unread.getOrDefault(c.getId(), 0L)))
                        .toList();
        return new PagedResource<>(items, page, size, found.getTotalElements());
    }

    @Override
    @Transactional(readOnly = true)
    public UnreadCountResource unreadCount(Long meId) {
        return new UnreadCountResource(messages.countUnread(meId));
    }

    @Override
    @Transactional
    public void markRead(Long meId, Long conversationId) {
        Conversation conversation = lookup.requireMember(meId, conversationId);
        Instant now = clock.instant();
        conversation.markRead(meId, now);
        conversations.save(conversation);
        events.conversationRead(conversation, meId, now);
    }

    private User requireUser(Long id, String message) {
        return users.findById(id).orElseThrow(() -> new EntityNotFoundException(message));
    }

    /** Một truy vấn cho cả trang; danh sách rỗng thì không hỏi DB (JPQL "in ()" là lỗi). */
    private Map<Long, Long> unreadFor(Long meId, Collection<Conversation> page) {
        if (page.isEmpty()) {
            return Map.of();
        }
        List<Long> ids = page.stream().map(Conversation::getId).toList();
        return messages.countUnreadByConversation(meId, ids).stream()
                .collect(Collectors.toMap(UnreadRow::getConversationId, UnreadRow::getTotal));
    }

    private Map<Long, User> othersOf(Long meId, Collection<Conversation> page) {
        if (page.isEmpty()) {
            return Map.of();
        }
        List<Long> ids = page.stream().map(c -> c.otherMember(meId)).toList();
        return users.findAllById(ids).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));
    }

    private static ConversationResource toResource(Conversation c, User other, long unread) {
        return ConversationResource.builder()
                .id(c.getId())
                .other(other == null ? null : ParticipantResource.from(other))
                .lastMessageText(c.getLastMessageText())
                .lastMessageAt(c.getLastMessageAt())
                .unreadCount(unread)
                .createdAt(c.getCreatedAt())
                .build();
    }
}
```

- [ ] **Step 6: Chạy test, xác nhận pass**

Run: `docker compose exec backend ./mvnw -B -q test -Dtest=ConversationServiceTest`
Expected: 5 test pass.

- [ ] **Step 7: Format và commit**

```bash
docker compose exec backend ./mvnw -q spotless:apply
git add backend/src/main/java/com/techx/intervue/modules/conversation backend/src/test/java/com/techx/intervue/modules/conversation
git commit -m "feat(FR-110): open a conversation idempotently, list, unread, mark read

Opening asks StallAccessPolicy first and never creates a second thread
for the same pair. Membership is enforced in ConversationLookup (R-06).

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: `MessageService.send` — gửi tin chữ

**Files:**
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/services/interfaces/MessageServiceInterface.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/services/impl/MessageService.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/conversation/services/impl/MessageServiceTest.java`

**Interfaces:**
- Consumes: `ConversationLookup.requireMember`, `StallAccessPolicyInterface.assertCanSend`, `ChatEventPublisherInterface.messageCreated`, `MessageRepository`, `ConversationRepository.save`, `UserRepository.findById`, `Clock`.
- Produces: `MessageServiceInterface { MessageResource send(Long meId, Long conversationId, SendMessageRequest request); List<MessageResource> list(Long meId, Long conversationId, Long before, int size); }`, hằng `MessageService.PREVIEW_LENGTH = 160`, `MessageService.MAX_PAGE = 50`.

- [ ] **Step 1: Viết test cho `send` (thất bại vì chưa có class)**

```java
package com.techx.intervue.modules.conversation.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.conversation.entities.Conversation;
import com.techx.intervue.modules.conversation.entities.Message;
import com.techx.intervue.modules.conversation.enums.MessageKind;
import com.techx.intervue.modules.conversation.exceptions.ConversationAccessDeniedException;
import com.techx.intervue.modules.conversation.exceptions.EmptyMessageException;
import com.techx.intervue.modules.conversation.exceptions.UnsupportedMessageKindException;
import com.techx.intervue.modules.conversation.repositories.ConversationRepository;
import com.techx.intervue.modules.conversation.repositories.MessageRepository;
import com.techx.intervue.modules.conversation.requests.SendMessageRequest;
import com.techx.intervue.modules.conversation.resources.MessageResource;
import com.techx.intervue.modules.conversation.services.interfaces.ChatEventPublisherInterface;
import com.techx.intervue.modules.conversation.services.interfaces.StallAccessPolicyInterface;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.enums.UserStatus;
import com.techx.intervue.modules.user.repositories.UserRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class MessageServiceTest {

    static final Instant NOW = Instant.parse("2026-09-25T06:00:00Z");

    MessageRepository messages;
    ConversationRepository conversations;
    UserRepository users;
    StallAccessPolicyInterface policy;
    ChatEventPublisherInterface events;
    MessageService service;
    Conversation thread;

    @BeforeEach
    void setUp() {
        messages = mock(MessageRepository.class);
        conversations = mock(ConversationRepository.class);
        users = mock(UserRepository.class);
        policy = mock(StallAccessPolicyInterface.class);
        events = mock(ChatEventPublisherInterface.class);
        Clock clock = Clock.fixed(NOW, ZoneId.of("Asia/Ho_Chi_Minh"));
        service =
                new MessageService(
                        messages,
                        conversations,
                        users,
                        policy,
                        events,
                        new ConversationLookup(conversations),
                        clock);

        thread = Conversation.between(3L, 7L);
        thread.setId(42L);
        when(conversations.findById(42L)).thenReturn(Optional.of(thread));
        when(users.findById(7L))
                .thenReturn(Optional.of(User.builder().id(7L).role(RoleType.CUSTOMER).status(UserStatus.ACTIVE).build()));
        when(users.findById(3L))
                .thenReturn(Optional.of(User.builder().id(3L).role(RoleType.FARMER).status(UserStatus.ACTIVE).build()));
        when(messages.save(any(Message.class)))
                .thenAnswer(
                        inv -> {
                            Message m = inv.getArgument(0);
                            m.setId(100L);
                            return m;
                        });
    }

    private static SendMessageRequest text(String body) {
        return new SendMessageRequest(null, body, null, null);
    }

    @Test
    void sendSavesTheMessageUpdatesThePreviewAndPublishesOnce() {
        MessageResource result = service.send(7L, 42L, text("  Are the tomatoes still fresh?  "));

        assertThat(result.id()).isEqualTo(100L);
        assertThat(result.body()).isEqualTo("Are the tomatoes still fresh?");
        assertThat(result.kind()).isEqualTo(MessageKind.TEXT);
        assertThat(thread.getLastMessageText()).isEqualTo("Are the tomatoes still fresh?");
        assertThat(thread.getLastMessageAt()).isEqualTo(NOW);
        assertThat(thread.readAtOf(7L)).isEqualTo(NOW);
        verify(conversations).save(thread);
        verify(events).messageCreated(thread, result);
    }

    @Test
    void sendKeepsTheContextPins() {
        MessageResource result =
                service.send(7L, 42L, new SendMessageRequest(MessageKind.TEXT, "Is this one?", 15L, 21L));

        assertThat(result.productId()).isEqualTo(15L);
        assertThat(result.orderId()).isEqualTo(21L);
    }

    @Test
    void sendFromANonMemberIsForbiddenAndSavesNothing() {
        assertThatThrownBy(() -> service.send(9L, 42L, text("hello")))
                .isInstanceOf(ConversationAccessDeniedException.class);
        verify(messages, never()).save(any());
        verify(events, never()).messageCreated(any(), any());
    }

    @Test
    void sendAsksThePolicyWithSenderAndRecipient() {
        service.send(3L, 42L, text("Yes, picked this morning."));

        ArgumentCaptor<User> sender = ArgumentCaptor.forClass(User.class);
        ArgumentCaptor<User> recipient = ArgumentCaptor.forClass(User.class);
        verify(policy).assertCanSend(sender.capture(), recipient.capture());
        assertThat(sender.getValue().getId()).isEqualTo(3L);
        assertThat(recipient.getValue().getId()).isEqualTo(7L);
    }

    @Test
    void blankBodyIsRejectedBeforeAnythingIsSaved() {
        assertThatThrownBy(() -> service.send(7L, 42L, text("   \n\t ")))
                .isInstanceOf(EmptyMessageException.class);
        verify(messages, never()).save(any());
        assertThat(thread.getLastMessageText()).isNull();
    }

    @Test
    void nonTextKindsAreNotSupportedYet() {
        assertThatThrownBy(
                        () -> service.send(7L, 42L, new SendMessageRequest(MessageKind.IMAGE, "x", null, null)))
                .isInstanceOf(UnsupportedMessageKindException.class);
        verify(messages, never()).save(any());
    }

    @Test
    void previewIsCutToOneHundredSixtyCharacters() {
        String longBody = "a".repeat(2000);

        service.send(7L, 42L, text(longBody));

        assertThat(thread.getLastMessageText()).hasSize(MessageService.PREVIEW_LENGTH);
        ArgumentCaptor<Message> saved = ArgumentCaptor.forClass(Message.class);
        verify(messages).save(saved.capture());
        assertThat(saved.getValue().getBody()).hasSize(2000);
    }
}
```

- [ ] **Step 2: Chạy test, xác nhận thất bại**

Run: `docker compose exec backend ./mvnw -B -q test -Dtest=MessageServiceTest`
Expected: `BUILD FAILURE` — `cannot find symbol: class MessageService`.

- [ ] **Step 3: Viết interface**

```java
package com.techx.intervue.modules.conversation.services.interfaces;

import com.techx.intervue.modules.conversation.requests.SendMessageRequest;
import com.techx.intervue.modules.conversation.resources.MessageResource;
import java.util.List;

public interface MessageServiceInterface {

    /** FR-110: chỉ thành viên; kiểm chính sách gửi; cập nhật preview thread; phát sự kiện. */
    MessageResource send(Long meId, Long conversationId, SendMessageRequest request);

    /** Mới nhất trước; before = id của tin cũ nhất đang có để cuộn lên; size kẹp về 1..50. */
    List<MessageResource> list(Long meId, Long conversationId, Long before, int size);
}
```

- [ ] **Step 4: Viết `MessageService` (cả `send` và `list`; `list` được test ở Task 7)**

```java
package com.techx.intervue.modules.conversation.services.impl;

import com.techx.intervue.modules.conversation.entities.Conversation;
import com.techx.intervue.modules.conversation.entities.Message;
import com.techx.intervue.modules.conversation.enums.MessageKind;
import com.techx.intervue.modules.conversation.exceptions.EmptyMessageException;
import com.techx.intervue.modules.conversation.exceptions.UnsupportedMessageKindException;
import com.techx.intervue.modules.conversation.repositories.ConversationRepository;
import com.techx.intervue.modules.conversation.repositories.MessageRepository;
import com.techx.intervue.modules.conversation.requests.SendMessageRequest;
import com.techx.intervue.modules.conversation.resources.MessageResource;
import com.techx.intervue.modules.conversation.services.interfaces.ChatEventPublisherInterface;
import com.techx.intervue.modules.conversation.services.interfaces.MessageServiceInterface;
import com.techx.intervue.modules.conversation.services.interfaces.StallAccessPolicyInterface;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.repositories.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MessageService implements MessageServiceInterface {

    /** Khớp VARCHAR(160) của conversations.last_message_text. */
    static final int PREVIEW_LENGTH = 160;

    /** Không cho client kéo cả lịch sử một lần. */
    static final int MAX_PAGE = 50;

    private final MessageRepository messages;
    private final ConversationRepository conversations;
    private final UserRepository users;
    private final StallAccessPolicyInterface policy;
    private final ChatEventPublisherInterface events;
    private final ConversationLookup lookup;
    private final Clock clock;

    @Override
    @Transactional
    public MessageResource send(Long meId, Long conversationId, SendMessageRequest request) {
        MessageKind kind = request.kind() == null ? MessageKind.TEXT : request.kind();
        if (kind != MessageKind.TEXT) {
            throw new UnsupportedMessageKindException(kind);
        }
        String body = request.body() == null ? "" : request.body().strip();
        if (body.isEmpty()) {
            throw new EmptyMessageException();
        }

        Conversation conversation = lookup.requireMember(meId, conversationId);
        User me = requireUser(meId);
        User other = requireUser(conversation.otherMember(meId));
        policy.assertCanSend(me, other);

        Instant now = clock.instant();
        Message saved =
                messages.save(
                        Message.builder()
                                .conversationId(conversation.getId())
                                .senderId(meId)
                                .kind(kind)
                                .body(body)
                                .productId(request.productId())
                                .orderId(request.orderId())
                                .build());

        conversation.noteNewMessage(preview(body), now);
        // Người gửi đương nhiên đã đọc tới đây; unread của người kia tính theo mốc của họ.
        conversation.markRead(meId, now);
        conversations.save(conversation);

        MessageResource resource = MessageResource.from(saved);
        events.messageCreated(conversation, resource);
        return resource;
    }

    @Override
    @Transactional(readOnly = true)
    public List<MessageResource> list(Long meId, Long conversationId, Long before, int size) {
        lookup.requireMember(meId, conversationId);
        Pageable page = PageRequest.of(0, Math.min(Math.max(size, 1), MAX_PAGE));
        List<Message> found =
                before == null
                        ? messages.findByConversationIdAndHiddenAtIsNullOrderByIdDesc(
                                conversationId, page)
                        : messages.findByConversationIdAndIdLessThanAndHiddenAtIsNullOrderByIdDesc(
                                conversationId, before, page);
        return found.stream().map(MessageResource::from).toList();
    }

    private User requireUser(Long id) {
        return users.findById(id).orElseThrow(() -> new EntityNotFoundException("Account not found."));
    }

    static String preview(String body) {
        return body.length() <= PREVIEW_LENGTH ? body : body.substring(0, PREVIEW_LENGTH);
    }
}
```

- [ ] **Step 5: Chạy test, xác nhận pass**

Run: `docker compose exec backend ./mvnw -B -q test -Dtest=MessageServiceTest`
Expected: 7 test pass.

- [ ] **Step 6: Format và commit**

```bash
docker compose exec backend ./mvnw -q spotless:apply
git add backend/src/main/java/com/techx/intervue/modules/conversation backend/src/test/java/com/techx/intervue/modules/conversation
git commit -m "feat(FR-110): send a text message and keep the thread preview

Blank bodies and non-text kinds are refused before anything is written;
the sender's read marker moves with their own message.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Đọc tin, danh sách thread, đếm chưa đọc, đánh dấu đã đọc — test

**Files:**
- Modify: `backend/src/test/java/com/techx/intervue/modules/conversation/services/impl/MessageServiceTest.java` (thêm 3 test)
- Modify: `backend/src/test/java/com/techx/intervue/modules/conversation/services/impl/ConversationServiceTest.java` (thêm 4 test)

**Interfaces:**
- Consumes: mọi thứ đã có ở Task 5–6. Không tạo file mới; nếu test phát hiện code sai thì sửa code ở đúng file của Task 5/6.

- [ ] **Step 1: Thêm 3 test vào `MessageServiceTest`** (đặt sau test cuối, trong class)

```java
    @Test
    void listWithoutBeforeUsesTheFirstPageQuery() {
        Message m = Message.builder().id(5L).conversationId(42L).senderId(3L).body("hi").build();
        when(messages.findByConversationIdAndHiddenAtIsNullOrderByIdDesc(
                        org.mockito.ArgumentMatchers.eq(42L), any()))
                .thenReturn(java.util.List.of(m));

        java.util.List<MessageResource> result = service.list(7L, 42L, null, 30);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).id()).isEqualTo(5L);
        verify(messages, never())
                .findByConversationIdAndIdLessThanAndHiddenAtIsNullOrderByIdDesc(any(), any(), any());
    }

    @Test
    void listPassesTheConversationIdToTheRepositoryEvenWithBefore() {
        service.list(7L, 42L, 500L, 30);

        ArgumentCaptor<Long> conversationId = ArgumentCaptor.forClass(Long.class);
        verify(messages)
                .findByConversationIdAndIdLessThanAndHiddenAtIsNullOrderByIdDesc(
                        conversationId.capture(), org.mockito.ArgumentMatchers.eq(500L), any());
        assertThat(conversationId.getValue()).isEqualTo(42L);
    }

    @Test
    void listClampsPageSizeToFifty() {
        service.list(7L, 42L, null, 500);

        ArgumentCaptor<org.springframework.data.domain.Pageable> page =
                ArgumentCaptor.forClass(org.springframework.data.domain.Pageable.class);
        verify(messages).findByConversationIdAndHiddenAtIsNullOrderByIdDesc(
                org.mockito.ArgumentMatchers.eq(42L), page.capture());
        assertThat(page.getValue().getPageSize()).isEqualTo(MessageService.MAX_PAGE);
    }
```

Rồi đưa các import dài lên đầu file cho sạch: `import static org.mockito.ArgumentMatchers.eq;`, `import java.util.List;`, `import org.springframework.data.domain.Pageable;` — và bỏ tiền tố đầy đủ trong 3 test.

- [ ] **Step 2: Thêm 4 test vào `ConversationServiceTest`**

```java
    @Test
    void listMineMapsTheOtherParticipantAndUnreadCount() {
        Conversation c = Conversation.between(3L, 7L);
        c.setId(42L);
        c.noteNewMessage("Five bunches left", NOW);
        when(conversations.findMine(org.mockito.ArgumentMatchers.eq(7L), any()))
                .thenReturn(new org.springframework.data.domain.PageImpl<>(List.of(c)));
        when(users.findAllById(List.of(3L))).thenReturn(List.of(farmer));
        MessageRepository.UnreadRow row = mock(MessageRepository.UnreadRow.class);
        when(row.getConversationId()).thenReturn(42L);
        when(row.getTotal()).thenReturn(2L);
        when(messages.countUnreadByConversation(7L, List.of(42L))).thenReturn(List.of(row));

        var page = service.listMine(7L, 1, 20);

        assertThat(page.total()).isEqualTo(1);
        assertThat(page.page()).isEqualTo(1);
        assertThat(page.items()).hasSize(1);
        assertThat(page.items().get(0).other().fullName()).isEqualTo("Cô Tư");
        assertThat(page.items().get(0).lastMessageText()).isEqualTo("Five bunches left");
        assertThat(page.items().get(0).unreadCount()).isEqualTo(2L);
    }

    @Test
    void listMineWithNoThreadsDoesNotQueryUnreadOrUsers() {
        when(conversations.findMine(org.mockito.ArgumentMatchers.eq(7L), any()))
                .thenReturn(org.springframework.data.domain.Page.empty());

        var page = service.listMine(7L, 1, 20);

        assertThat(page.items()).isEmpty();
        verify(messages, never()).countUnreadByConversation(anyLong(), anyCollection());
        verify(users, never()).findAllById(any());
    }

    @Test
    void unreadCountComesStraightFromTheRepository() {
        when(messages.countUnread(7L)).thenReturn(4L);

        assertThat(service.unreadCount(7L).count()).isEqualTo(4L);
    }

    @Test
    void markReadSetsTheCallersMarkerAndPublishes() {
        Conversation c = Conversation.between(3L, 7L);
        c.setId(42L);
        when(conversations.findById(42L)).thenReturn(Optional.of(c));

        service.markRead(7L, 42L);

        assertThat(c.readAtOf(7L)).isEqualTo(NOW);
        assertThat(c.readAtOf(3L)).isNull();
        verify(conversations).save(c);
        verify(events).conversationRead(c, 7L, NOW);
    }

    @Test
    void markReadByANonMemberIsForbidden() {
        Conversation c = Conversation.between(3L, 7L);
        c.setId(42L);
        when(conversations.findById(42L)).thenReturn(Optional.of(c));

        assertThatThrownBy(() -> service.markRead(9L, 42L))
                .isInstanceOf(
                        com.techx.intervue.modules.conversation.exceptions
                                .ConversationAccessDeniedException.class);
        verify(conversations, never()).save(any());
    }
```

Đưa import lên đầu file: `eq`, `PageImpl`, `Page`, `ConversationAccessDeniedException`; bỏ tiền tố đầy đủ.

- [ ] **Step 3: Chạy cả hai class, xác nhận pass**

Run: `docker compose exec backend ./mvnw -B -q test -Dtest='ConversationServiceTest,MessageServiceTest'`
Expected: 10 + 10 test pass.

Nếu `listMineMapsTheOtherParticipantAndUnreadCount` đỏ vì `PageImpl` không có `getTotalElements` đúng: `new PageImpl<>(List.of(c))` trả total = 1, đúng như kỳ vọng.

- [ ] **Step 4: Chạy toàn bộ test của module + format + commit**

```bash
docker compose exec backend ./mvnw -B -q test -Dtest='com.techx.intervue.modules.conversation.**'
docker compose exec backend ./mvnw -q spotless:apply
git add backend/src/test/java/com/techx/intervue/modules/conversation
git commit -m "test(FR-110,FR-113): cover listing, paging clamp, unread and read marker

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: Controller, exception handler, smoke test tay và PR

**Files:**
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/controllers/ConversationController.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/controllers/ConversationExceptionHandler.java`

**Interfaces:**
- Consumes: `ConversationServiceInterface`, `MessageServiceInterface`, `CustomUserDetails.getId()`, `BaseController.ok/created`.
- Produces: 6 endpoint của spec mục 6.1 (chưa có attachments/report/admin). Không cần sửa `SecurityConfig`: `anyRequest().authenticated()` đã bao `/api/v1/conversations/**`.

- [ ] **Step 1: Viết controller**

```java
package com.techx.intervue.modules.conversation.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.conversation.requests.OpenConversationRequest;
import com.techx.intervue.modules.conversation.requests.SendMessageRequest;
import com.techx.intervue.modules.conversation.resources.ConversationResource;
import com.techx.intervue.modules.conversation.resources.MessageResource;
import com.techx.intervue.modules.conversation.resources.PagedResource;
import com.techx.intervue.modules.conversation.resources.UnreadCountResource;
import com.techx.intervue.modules.conversation.services.interfaces.ConversationServiceInterface;
import com.techx.intervue.modules.conversation.services.interfaces.MessageServiceInterface;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import com.techx.intervue.resources.ApiResource;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.List;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * FR-110, FR-113, FR-114 — chat người-với-người. Khác hẳn chatbot ở /api/v1/chat (FR-090).
 * Mọi route đều cần đăng nhập (SecurityConfig: anyRequest().authenticated()).
 */
@Validated
@RestController
@RequestMapping("/api/v1/conversations")
@AllArgsConstructor
public class ConversationController extends BaseController {

    private final ConversationServiceInterface conversationService;
    private final MessageServiceInterface messageService;

    @PostMapping
    public ResponseEntity<ApiResource<ConversationResource>> open(
            @Valid @RequestBody OpenConversationRequest request,
            @AuthenticationPrincipal CustomUserDetails me) {
        return created(conversationService.open(me.getId(), request), "Conversation ready.");
    }

    @GetMapping
    public ResponseEntity<ApiResource<PagedResource<ConversationResource>>> listMine(
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size,
            @AuthenticationPrincipal CustomUserDetails me) {
        return ok(conversationService.listMine(me.getId(), page, size), "OK");
    }

    @GetMapping("/unread-count")
    public ResponseEntity<ApiResource<UnreadCountResource>> unreadCount(
            @AuthenticationPrincipal CustomUserDetails me) {
        return ok(conversationService.unreadCount(me.getId()), "OK");
    }

    @GetMapping("/{id}/messages")
    public ResponseEntity<ApiResource<List<MessageResource>>> messages(
            @PathVariable Long id,
            @RequestParam(required = false) Long before,
            @RequestParam(defaultValue = "30") @Min(1) @Max(50) int size,
            @AuthenticationPrincipal CustomUserDetails me) {
        return ok(messageService.list(me.getId(), id, before, size), "OK");
    }

    @PostMapping("/{id}/messages")
    public ResponseEntity<ApiResource<MessageResource>> send(
            @PathVariable Long id,
            @Valid @RequestBody SendMessageRequest request,
            @AuthenticationPrincipal CustomUserDetails me) {
        return created(messageService.send(me.getId(), id, request), "Sent.");
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<ApiResource<Void>> markRead(
            @PathVariable Long id, @AuthenticationPrincipal CustomUserDetails me) {
        conversationService.markRead(me.getId(), id);
        return ok(null, "Marked as read.");
    }
}
```

- [ ] **Step 2: Viết exception handler (bám `ChatExceptionHandler` + `AuthExceptionHandler`)**

```java
package com.techx.intervue.modules.conversation.controllers;

import com.techx.intervue.modules.conversation.exceptions.AccountRestrictedException;
import com.techx.intervue.modules.conversation.exceptions.ConversationAccessDeniedException;
import com.techx.intervue.modules.conversation.exceptions.ConversationClosedException;
import com.techx.intervue.modules.conversation.exceptions.EmptyMessageException;
import com.techx.intervue.modules.conversation.exceptions.SelfConversationException;
import com.techx.intervue.modules.conversation.exceptions.StallNotOpenException;
import com.techx.intervue.modules.conversation.exceptions.UnsupportedMessageKindException;
import com.techx.intervue.resources.ApiResource;
import com.techx.intervue.resources.ErrorResource;
import com.techx.intervue.resources.FieldErrorResource;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.ConstraintViolationException;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/** Mã HTTP theo spec mục 6.3. Chỉ áp cho ConversationController (repo chưa có handler chung). */
@Slf4j
@RestControllerAdvice(assignableTypes = ConversationController.class)
public class ConversationExceptionHandler {

    private static final String INVALID_MESSAGE = "Some of the information you sent is not valid.";

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiResource<Void>> invalidBody(MethodArgumentNotValidException e) {
        List<FieldErrorResource> details =
                e.getBindingResult().getFieldErrors().stream()
                        .map(
                                f ->
                                        FieldErrorResource.builder()
                                                .field(f.getField())
                                                .message(f.getDefaultMessage())
                                                .build())
                        .toList();
        return error(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", INVALID_MESSAGE, details);
    }

    @ExceptionHandler({
        HandlerMethodValidationException.class,
        ConstraintViolationException.class,
        MissingServletRequestParameterException.class,
        MethodArgumentTypeMismatchException.class,
        HttpMessageNotReadableException.class
    })
    ResponseEntity<ApiResource<Void>> invalidRequest(Exception e) {
        return error(
                HttpStatus.BAD_REQUEST,
                "VALIDATION_ERROR",
                INVALID_MESSAGE,
                List.of(FieldErrorResource.builder().message(INVALID_MESSAGE).build()));
    }

    @ExceptionHandler({
        SelfConversationException.class,
        EmptyMessageException.class,
        UnsupportedMessageKindException.class
    })
    ResponseEntity<ApiResource<Void>> badRequest(RuntimeException e) {
        return error(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", e.getMessage(), List.of());
    }

    @ExceptionHandler(EntityNotFoundException.class)
    ResponseEntity<ApiResource<Void>> notFound(EntityNotFoundException e) {
        return error(HttpStatus.NOT_FOUND, "NOT_FOUND", e.getMessage(), List.of());
    }

    /** R-06: sai chủ sở hữu → 403, không phải 404, để FE hiện đúng lý do. */
    @ExceptionHandler(ConversationAccessDeniedException.class)
    ResponseEntity<ApiResource<Void>> notAMember(ConversationAccessDeniedException e) {
        return error(HttpStatus.FORBIDDEN, "NOT_A_MEMBER", e.getMessage(), List.of());
    }

    @ExceptionHandler(StallNotOpenException.class)
    ResponseEntity<ApiResource<Void>> stallNotOpen(StallNotOpenException e) {
        return error(HttpStatus.FORBIDDEN, "STALL_NOT_OPEN", e.getMessage(), List.of());
    }

    @ExceptionHandler(AccountRestrictedException.class)
    ResponseEntity<ApiResource<Void>> accountRestricted(AccountRestrictedException e) {
        return error(HttpStatus.FORBIDDEN, "ACCOUNT_RESTRICTED", e.getMessage(), List.of());
    }

    /** D-09: thread cũ đọc được, gửi thêm thì 409 kèm lý do bằng chữ. */
    @ExceptionHandler(ConversationClosedException.class)
    ResponseEntity<ApiResource<Void>> closed(ConversationClosedException e) {
        return error(HttpStatus.CONFLICT, "CONVERSATION_CLOSED", e.getMessage(), List.of());
    }

    /** Hai request mở cùng một cặp đúng lúc → UNIQUE chặn một cái; client gọi lại là có thread. */
    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ApiResource<Void>> integrity(DataIntegrityViolationException e) {
        String cause = String.valueOf(e.getMostSpecificCause().getMessage());
        if (cause.contains("uq_conversation_pair")) {
            return error(
                    HttpStatus.CONFLICT,
                    "CONVERSATION_EXISTS",
                    "This conversation was just created. Please try again.",
                    List.of());
        }
        log.warn("Data integrity violation: {}", cause);
        return error(
                HttpStatus.BAD_REQUEST,
                "VALIDATION_ERROR",
                INVALID_MESSAGE,
                List.of(FieldErrorResource.builder().message(INVALID_MESSAGE).build()));
    }

    private static ResponseEntity<ApiResource<Void>> error(
            HttpStatus status, String code, String message, List<FieldErrorResource> details) {
        ErrorResource error = ErrorResource.builder().code(code).details(details).build();
        return ResponseEntity.status(status).body(ApiResource.error(error, message));
    }
}
```

- [ ] **Step 3: Restart backend, mở Swagger, xác nhận 6 endpoint có mặt**

```bash
docker compose restart backend && sleep 25
curl -s http://localhost:8082/v3/api-docs | python3 -c "import json,sys; d=json.load(sys.stdin); print('\n'.join(sorted(p for p in d['paths'] if p.startswith('/api/v1/conversations'))))"
```

Expected:

```
/api/v1/conversations
/api/v1/conversations/unread-count
/api/v1/conversations/{id}/messages
/api/v1/conversations/{id}/read
```

- [ ] **Step 4: Smoke test tay — hai tài khoản, một thread, đủ mã lỗi**

Tạo hai tài khoản (endpoint đăng ký hiện chỉ có customer; nâng một tài khoản lên farmer bằng SQL — dev DB riêng của stack này, không phải dữ liệu ai):

```bash
API=http://localhost:8082/api/v1
curl -s -X POST $API/auth/register -H 'Content-Type: application/json' -d '{"fullName":"An Customer","email":"an@chat.test","phone":"0901000001","address":"12 Le Loi","password":"secret123","confirmPassword":"secret123"}' >/dev/null
curl -s -X POST $API/auth/register -H 'Content-Type: application/json' -d '{"fullName":"Cô Tư","email":"tu@chat.test","phone":"0901000002","address":"Thao Dien","password":"secret123","confirmPassword":"secret123"}' >/dev/null
docker compose exec mysql mysql -uintervue -pintervue_pass intervue_db -e "UPDATE users SET role='farmer' WHERE email='tu@chat.test'; SELECT id,email,role FROM users WHERE email LIKE '%chat.test';"
```

Lấy `id` của hai người vào biến shell, rồi đăng nhập **sau khi** đổi role (role được nạp vào Redis lúc đăng nhập):

```bash
AN=$(docker compose exec mysql mysql -N -uintervue -pintervue_pass intervue_db -e "SELECT id FROM users WHERE email='an@chat.test'")
TU=$(docker compose exec mysql mysql -N -uintervue -pintervue_pass intervue_db -e "SELECT id FROM users WHERE email='tu@chat.test'")
echo "AN=$AN TU=$TU"
```

```bash
AN_TOKEN=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' -d '{"email":"an@chat.test","password":"secret123"}' | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['accessToken'])")
TU_TOKEN=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' -d '{"email":"tu@chat.test","password":"secret123"}' | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['accessToken'])")
```

Kịch bản và mã mong đợi:

```bash
# 1. An mở thread với Cô Tư → 201, giữ id vào CID
CID=$(curl -s -X POST $API/conversations -H "Authorization: Bearer $AN_TOKEN" -H 'Content-Type: application/json' -d "{\"farmerUserId\":$TU}" | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['id'])")
echo "CID=$CID"
# 2. Mở lại → 201 nhưng cùng id (idempotent)
# 3. Cô Tư mở thread với An (customer) → 403 STALL_NOT_OPEN
curl -s -w '\n%{http_code}\n' -X POST $API/conversations -H "Authorization: Bearer $TU_TOKEN" -H 'Content-Type: application/json' -d "{\"farmerUserId\":$AN}"
# 4. An tự nhắn mình → 400
# 5. An gửi tin → 201; body toàn khoảng trắng → 400; kind "image" → 400
curl -s -w '\n%{http_code}\n' -X POST $API/conversations/$CID/messages -H "Authorization: Bearer $AN_TOKEN" -H 'Content-Type: application/json' -d '{"body":"Are the tomatoes still fresh?"}'
# 6. Cô Tư đếm chưa đọc → {"count":1}; đọc tin → 1 tin; đánh dấu đã đọc → 200; đếm lại → 0
curl -s $API/conversations/unread-count -H "Authorization: Bearer $TU_TOKEN"
# 7. Không đăng nhập → 401; đổi CID sang 999999 → 404
# 8. Tài khoản thứ ba đọc thread của hai người → 403 NOT_A_MEMBER (đăng ký thêm một tài khoản nữa rồi thử)
# 9. size=500 → 400 (Max 50); page=0 → 400
```

Kiểm tra tin bị ẩn (Review Focus, chỉ làm được với DB thật):

```bash
docker compose exec mysql mysql -uintervue -pintervue_pass intervue_db -e "UPDATE messages SET hidden_at=NOW(), hidden_by=$TU WHERE conversation_id=$CID;"
curl -s $API/conversations/$CID/messages -H "Authorization: Bearer $TU_TOKEN"     # items rỗng
curl -s $API/conversations/unread-count -H "Authorization: Bearer $TU_TOKEN"      # count 0
```

Expected: đúng từng mã như ghi trong comment. Sai chỗ nào thì quay lại task sở hữu code, sửa, chạy lại test.

- [ ] **Step 5: Toàn bộ kiểm tra của Definition of Done điều 6**

```bash
docker compose exec backend ./mvnw -q spotless:apply
docker compose exec backend ./mvnw -B test
docker compose exec backend ./mvnw -q spotless:check
```

Expected: `Tests run: <tổng>, Failures: 0, Errors: 0`, `BUILD SUCCESS`, spotless không báo file nào. (`make lint` còn chạy ESLint frontend — plan này không sửa frontend nên không cần.)

- [ ] **Step 6: Commit và mở PR vào `dev`**

```bash
git add backend/src/main/java/com/techx/intervue/modules/conversation/controllers
git commit -m "feat(FR-110,FR-113): REST endpoints for conversations and messages

POST /api/v1/conversations, GET /api/v1/conversations, GET .../unread-count,
GET|POST .../{id}/messages, POST .../{id}/read. Membership → 403, stall not
open → 403, closed → 409, unknown → 404, bad input → 400 (spec 6.3).

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git fetch origin && git rebase origin/dev
git push -u origin feature/FR-110-chat-conversations
gh pr create --base dev --title "feat(FR-110): Customer–Farmer chat, plan 1/4 — REST core" --body "$(cat <<'EOF'
## Phạm vi
Plan 1/4 của spec `docs/superpowers/specs/2026-09-25-farmer-customer-chat-design.md`: hai bảng, module `conversation`, 6 endpoint REST. Chưa có realtime (Plan 2), ảnh/báo cáo (Plan 3), UI (Plan 4).

## ⚠️ Ngoài phạm vi đề
FR-110/FR-113 là **đề xuất**, chưa có trong `.ai/REQUIREMENTS.md` (R-07). Spec mục 2 và 15 liệt kê 8 việc cần LEAD/QA quyết. PR này để LEAD xem và quyết, không tự coi là đã duyệt.

## Đã test
- 32 unit test Mockito (entity 5, policy 7, hai service 10 + 10).
- Smoke test tay đủ mã 201/200/400/401/403/404/409 theo spec 6.3.
- `./mvnw test` + `spotless:check` xanh trong container.

## Không đụng
`db/schema.sql`, `docs/api-contract.md`, `SecurityConfig`, chatbot `/api/v1/chat`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: hook pre-push cho qua (đích là nhánh feature), PR mở vào `dev`, CI `Backend · format + test` xanh.

---

## Ghi chú cho người thực thi

- **Không bao giờ `git add -A` hay `git add .`** trong plan này. Worktree `market-link-chat` sạch từ đầu, nhưng thói quen đó sẽ gây tai nạn ở worktree khác.
- Nếu Flyway ở Task 1 báo trùng version (`Found more than one migration with version 20260925003`): ai đó đã merge số này vào `dev` trong lúc bạn làm. Đổi tên hai file sang `V20260926001`/`002` (hoặc số lớn hơn số mới nhất), sửa comment trong plan, chạy lại. **Không** sửa file của người khác.
- Nếu `docker compose exec backend` báo `service "backend" is not running`: `docker compose --profile app up -d backend` rồi thử lại. Nếu vẫn không lên, `docker compose logs backend` — thường là MySQL chưa `healthy`.
- Sau khi xong Plan 1, **giữ nguyên** worktree và stack `market-link-chat`: Plan 2 tiếp tục ở đó.
