# Chat Customer ↔ Farmer — Plan 3B/4: Báo cáo tin nhắn và kiểm duyệt của admin · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Người dùng báo cáo một tin nhắn xấu (FR-116), admin đọc đúng tin đó cùng vài tin xung quanh rồi ẩn nó đi — và không đọc được gì hơn thế.

**Architecture:** Báo cáo là một hàng `message_reports` do thành viên trong thread tạo, một người một lần cho mỗi tin. Admin có hai endpoint đọc (`/api/v1/admin/message-reports` và chi tiết kèm ±5 tin ngữ cảnh) và hai endpoint ghi (ẩn tin, bỏ qua báo cáo). Quyền của admin **bắt nguồn từ báo cáo**, không phải từ vai: không có báo cáo thì không có gì để đọc. Ẩn tin là ẩn mềm (`hidden_at`/`hidden_by`), không bao giờ xoá cứng, và phát một sự kiện realtime để hai người trong thread thấy tin biến mất ngay.

**Tech Stack:** Spring Boot 4 / Java 25, JPA + Flyway (MySQL 8.4), STOMP qua `ChatEventPublisherInterface` đã có, Redis + bucket4j 8.10.1 đã có, JUnit 5 + Mockito + AssertJ.

**Spec:** `docs/superpowers/specs/2026-09-25-farmer-customer-chat-design.md` — mục 5.1 (`message_reports`), 6.1 (API), 6.3 (mã lỗi), 8.3 (admin đọc tới đâu), 8.5 (những thứ cố tình không làm), 9.4 (màn kiểm duyệt).

**Phạm vi:** Đây là **Plan 3B**, phần backend cuối của đợt 1. Plan 3A (ảnh + rate limit) **đã merge** vào `dev` qua PR #129. Giao diện — `MessageBubble`, màn Customer/Farmer, tab "Reported messages" trên `admin/moderation.html`, popover header, prototype — là **Plan 4**.

---

## Global Constraints

Sao nguyên văn từ spec và từ luật repo. Mọi task đều phải thoả.

- **R-03 / CONTRIBUTING §7:** đổi DB chỉ qua migration Flyway mới `V<yyyyMMdd><nnn>__<mo_ta>.sql`; **không sửa file đã merge**. Migration mới nhất trên `dev` lúc viết plan là `V20260926003`; plan này dùng **`V20260926005`**. Trước khi commit Task 1, chạy `git fetch origin && git ls-tree -r --name-only origin/dev -- backend/src/main/resources/db/migration | sort | tail -3` — có ai chiếm 004 thì đổi lên số kế tiếp và sửa mọi chỗ nhắc số này.
  ⚠️ Worktree `market-link-notify` (agent khác) đang giữ `V20260925012`, `013`, `014` **chưa merge**. Số của họ thấp hơn `dev` hiện tại; đó là việc của họ, nhưng đừng lấy ba số đó.
- **Khoá ngoại tới `users` phải là `BIGINT UNSIGNED`** và để RESTRICT mặc định (tài khoản không bao giờ xoá cứng — FR-072 chỉ vô hiệu hoá). Khoá ngoại tới `messages` thì `ON DELETE CASCADE`.
- **API:** `/api/v1`, JSON **camelCase**, response bọc `ApiResource<T>` qua `ok(...)` / `created(...)` của `BaseController`. Controller mới `extends BaseController`. Controller admin mang `@PreAuthorize("hasRole('ADMIN')")` ở mức class.
- **R-06:** mọi endpoint có `{id}` kiểm tư cách **trước khi** trả bất cứ dữ liệu nào.
- **Spec §8.3 — ranh giới của admin:** admin **chỉ đọc được tin đã bị báo cáo**, cùng **tối đa 5 tin liền trước và 5 tin liền sau**. **Không có màn "duyệt toàn bộ hộp thư".** Mỗi lần ẩn ghi `hiddenBy` + `hiddenAt`.
- **Spec §8.5 — cố tình không làm:** người gửi **không xoá được** tin; **không sửa** tin đã gửi; **không chặn người dùng**; **không nhóm chat**. Đừng thêm endpoint nào cho bốn thứ này.
- **Mã lỗi (spec §6.3):** 400 body sai · 401 chưa đăng nhập · 403 không thuộc thread / không đủ quyền · 404 không tồn tại · 409 xung đột trạng thái · 429 quá nhanh.
- **Copy tiếng Anh, sentence case.** Mọi message người dùng đọc được là tiếng Anh, một câu, nói rõ phải làm gì.
- **Format:** Spotless (google-java-format AOSP). `make be-format` trước mỗi commit.
- **Chạy test đúng stack của mình**, không phải stack chung: `make lint` và `make be-test` trỏ vào `docker compose` mặc định (project `market-link`, cổng 8080) nên **không dùng được** ở đây. Mọi lệnh test trong plan này đã viết đủ `-p market-link-chat3b -f ... -f ...`.
- **Commit:** Conventional Commits có mã FR. Giữ dòng `Co-Authored-By`.

---

## Review Focus

Năm lớp đầu vào spec ngầm định nhưng dễ rơi. Mỗi dòng đã được gắn một test trong task tương ứng.

1. **Admin mò id thread bất kỳ** — đây là toàn bộ lý do spec §8.3 tồn tại. Kỳ vọng: không có endpoint nào cho admin đọc một `conversationId` tuỳ ý; đọc được đúng những tin nằm trong bán kính ±5 quanh một tin **đã bị báo cáo**, và **403** cho mọi thứ khác. → Task 4, `adminCannotReachAThreadThatHasNoReport`.
2. **Ảnh của tin ngữ cảnh** — admin xem được ảnh của tin **bị báo cáo** (quyết định của LEAD 26/09), nhưng ±5 tin xung quanh là ngữ cảnh, không phải đối tượng bị tố. Kỳ vọng: ảnh của tin ngữ cảnh vẫn **403** với admin. → Task 7, `adminSeesThePhotoOfTheReportedMessageButNotOfItsNeighbours`.
3. **Báo cáo hai lần** — người dùng bấm nút hai lần, hoặc hai tab. Kỳ vọng: **409** với lý do bằng chữ, không phải 500 từ ràng buộc UNIQUE, và không tạo hàng thứ hai. → Task 2, `reportingTheSameMessageTwiceIsRefused`.
4. **Ẩn một tin đã bị ẩn** — hai admin cùng xử lý một hàng đợi. Kỳ vọng: **không ghi đè** `hiddenBy`/`hiddenAt` của người ẩn trước (mất dấu vết kiểm toán), trả về trạng thái hiện tại. → Task 5, `hidingAnAlreadyHiddenMessageKeepsTheFirstAdminOnRecord`.
5. **Frame `/app/typing` dị dạng hoặc rải liên tục** — `conversationId` null, JSON hỏng, hoặc một client bug gửi 50 frame/giây. Kỳ vọng: không có exception nào chưa xử lý trong log, và vượt ngưỡng thì frame bị bỏ **im lặng** (STOMP không có mã HTTP để trả). → Task 8, `ignoresAFrameWithNoConversationId` + `dropsTypingFramesOnceTheLimitIsReached`.

---

## Setup — worktree, Docker stack, baseline

Làm một lần trước Task 1. Không commit gì trong mục này.

- [ ] **Bước 1: Xác nhận worktree**

Worktree đã được tạo sẵn từ `origin/dev`:

```bash
cd /Users/phong/projects/school/fpt-aptech/Code_project/techwiz7/market-link-chat3b
git branch --show-current   # feature/FR-116-chat-reports
git log --oneline -1        # 29e657a (= origin/dev lúc tách nhánh)
```

- [ ] **Bước 2: Tạo override compose cho stack riêng**

`container_name` trong `docker-compose.yml` bị đặt cứng (`intervue-*`) nên chạy stack thứ hai phải đổi tên, nếu không đụng stack `market-link` đang chạy ở cổng 8080. File này để **ngoài repo**:

```bash
cat > ../compose.chat3b-override.yml <<'YAML'
# Override chỉ dùng cho worktree market-link-chat3b (Plan 3B). Không thuộc repo.
services:
  mysql:
    container_name: mlc3b-mysql
    ports: !override []
  redis:
    container_name: mlc3b-redis
    ports: !override []
  rabbitmq:
    container_name: mlc3b-rabbitmq
    ports: !override []
  backend:
    container_name: mlc3b-backend
    ports: !override
      - "8084:8080"
      - "5008:5005"
  frontend:
    container_name: mlc3b-frontend
    ports: !override []
YAML
```

- [ ] **Bước 3: Chạy stack**

```bash
cp .env.example .env
docker compose -p market-link-chat3b -f docker-compose.yml -f ../compose.chat3b-override.yml --profile app up -d --build
```

Mọi lệnh test dưới đây viết tắt bằng `DC`:

```bash
DC='docker compose -p market-link-chat3b -f docker-compose.yml -f ../compose.chat3b-override.yml'
```

- [ ] **Bước 4: Baseline phải xanh trước khi sửa gì**

```bash
docker compose -p market-link-chat3b -f docker-compose.yml -f ../compose.chat3b-override.yml exec -T backend ./mvnw -B test
```

Expected: `BUILD SUCCESS`, 0 failure. **Nếu đỏ: dừng lại, báo người dùng, không code tiếp** — baseline bẩn thì mọi lỗi sau này không biết của ai.

---

### Task 1: Migration, entity và repository cho `message_reports`

**Files:**
- Create: `backend/src/main/resources/db/migration/V20260926005__create_message_reports_table.sql`
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/enums/ReportReason.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/enums/ReportStatus.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/entities/MessageReport.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/repositories/MessageReportRepository.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/conversation/repositories/MessageReportRepositoryTest.java`

**Interfaces:**
- Consumes: `Message` và `Conversation` (đã có), `LowercaseEnumConverter` (đã có, xem `MessageKind`).
- Produces:
  - `enum ReportReason { SPAM, ABUSE, SCAM, OTHER }` và `enum ReportStatus { NEW, REVIEWED, ACTIONED }`, cả hai có `@JsonValue value()` trả chữ thường và `DbConverter` như `MessageKind`.
  - `MessageReport` (Lombok `@Builder`, `@Getter`, `@Setter`): `Long id`, `Long messageId`, `Long reportedBy`, `ReportReason reason`, `String note`, `ReportStatus status`, `Long reviewedBy`, `Instant reviewedAt`, `Instant createdAt`.
  - `MessageReportRepository extends JpaRepository<MessageReport, Long>` với `boolean existsByMessageIdAndReportedBy(Long, Long)`, `boolean existsByMessageId(Long)`, `Page<MessageReport> findByStatusOrderByCreatedAtDesc(ReportStatus, Pageable)`, `Page<MessageReport> findAllByOrderByCreatedAtDesc(Pageable)`, `List<MessageReport> findByMessageId(Long)`.

- [ ] **Bước 1: Kiểm tra số version chưa bị chiếm**

```bash
git fetch origin && git ls-tree -r --name-only origin/dev -- backend/src/main/resources/db/migration | sort | tail -3
```

Expected: số lớn nhất là `V20260926003`. Nếu đã có `004`, đổi tên file của mình lên số kế tiếp và sửa mọi chỗ nhắc số này trong plan.

- [ ] **Bước 2: Viết migration**

```sql
-- V20260926005__create_message_reports_table.sql
-- FR-116 (spec §5.1). Admin chỉ đọc được tin ĐÃ có hàng ở bảng này (spec §8.3) — quyền đọc của
-- admin bắt nguồn từ báo cáo, không phải từ vai.
CREATE TABLE message_reports (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  message_id  BIGINT UNSIGNED NOT NULL,
  reported_by BIGINT UNSIGNED NOT NULL,
  reason      ENUM('spam','abuse','scam','other') NOT NULL,
  note        VARCHAR(255) NULL,
  status      ENUM('new','reviewed','actioned') NOT NULL DEFAULT 'new',
  reviewed_by BIGINT UNSIGNED NULL,
  reviewed_at DATETIME(6) NULL,
  created_at  DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_report_message FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  -- Tài khoản không bao giờ xoá cứng (FR-072 chỉ vô hiệu hoá) nên để RESTRICT mặc định
  CONSTRAINT fk_report_reporter FOREIGN KEY (reported_by) REFERENCES users(id),
  CONSTRAINT fk_report_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id),
  -- Một người báo một tin đúng một lần (spec §5.1)
  CONSTRAINT uq_report_once UNIQUE (message_id, reported_by),
  INDEX idx_reports_status (status, created_at)
) ENGINE=InnoDB;
```

`DATETIME(6)` chứ không phải `DATETIME`: `messages` và `message_attachments` đều dùng độ chính xác micro giây, và Plan 1 từng có lỗi vì mốc thời gian chỉ chính xác tới giây.

- [ ] **Bước 3: Viết test đỏ**

`MessageReportRepositoryTest.java`. Chạy trên MySQL thật như `MessageAttachmentRepositoryTest` cùng package — khoá ngoại và UNIQUE phải được thi hành thật.

```java
package com.techx.intervue.modules.conversation.repositories;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.techx.intervue.modules.conversation.entities.Conversation;
import com.techx.intervue.modules.conversation.entities.Message;
import com.techx.intervue.modules.conversation.entities.MessageReport;
import com.techx.intervue.modules.conversation.enums.ReportReason;
import com.techx.intervue.modules.conversation.enums.ReportStatus;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.repositories.UserRepository;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class MessageReportRepositoryTest {

    @Autowired MessageReportRepository reports;
    @Autowired ConversationRepository conversations;
    @Autowired MessageRepository messages;
    @Autowired UserRepository users;

    @Test
    void onePersonCanReportOneMessageOnlyOnce() {
        User customer = user(RoleType.CUSTOMER);
        Long messageId = messageFrom(customer);

        reports.saveAndFlush(report(messageId, customer.getId(), ReportReason.SPAM));

        assertThatThrownBy(
                        () ->
                                reports.saveAndFlush(
                                        report(messageId, customer.getId(), ReportReason.ABUSE)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void twoDifferentPeopleCanReportTheSameMessage() {
        User a = user(RoleType.CUSTOMER);
        User b = user(RoleType.CUSTOMER);
        Long messageId = messageFrom(a);

        reports.saveAndFlush(report(messageId, a.getId(), ReportReason.SPAM));
        reports.saveAndFlush(report(messageId, b.getId(), ReportReason.SCAM));

        assertThat(reports.findByMessageId(messageId)).hasSize(2);
    }

    @Test
    void knowsWhetherAPersonAlreadyReportedAMessage() {
        User customer = user(RoleType.CUSTOMER);
        Long messageId = messageFrom(customer);
        reports.saveAndFlush(report(messageId, customer.getId(), ReportReason.OTHER));

        assertThat(reports.existsByMessageIdAndReportedBy(messageId, customer.getId())).isTrue();
        assertThat(reports.existsByMessageIdAndReportedBy(messageId, 999_999L)).isFalse();
    }

    /** Spec §8.3: quyền đọc của admin bắt nguồn từ câu hỏi này. */
    @Test
    void knowsWhetherAMessageHasAnyReportAtAll() {
        User customer = user(RoleType.CUSTOMER);
        Long reported = messageFrom(customer);
        Long untouched = messageFrom(customer);
        reports.saveAndFlush(report(reported, customer.getId(), ReportReason.SPAM));

        assertThat(reports.existsByMessageId(reported)).isTrue();
        assertThat(reports.existsByMessageId(untouched)).isFalse();
    }

    @Test
    void listsOnlyTheStatusAskedFor() {
        User customer = user(RoleType.CUSTOMER);
        MessageReport fresh =
                reports.saveAndFlush(
                        report(messageFrom(customer), customer.getId(), ReportReason.SPAM));
        MessageReport done =
                report(messageFrom(customer), customer.getId(), ReportReason.ABUSE);
        done.setStatus(ReportStatus.ACTIONED);
        reports.saveAndFlush(done);

        assertThat(reports.findByStatusOrderByCreatedAtDesc(ReportStatus.NEW, PageRequest.of(0, 20)))
                .extracting(MessageReport::getId)
                .contains(fresh.getId())
                .doesNotContain(done.getId());
    }

    private Long messageFrom(User sender) {
        Conversation c =
                conversations.saveAndFlush(
                        Conversation.between(sender.getId(), user(RoleType.FARMER).getId()));
        return messages.saveAndFlush(
                        Message.builder()
                                .conversationId(c.getId())
                                .senderId(sender.getId())
                                .body("hello")
                                .build())
                .getId();
    }

    private static MessageReport report(Long messageId, Long reportedBy, ReportReason reason) {
        return MessageReport.builder()
                .messageId(messageId)
                .reportedBy(reportedBy)
                .reason(reason)
                .build();
    }

    private User user(RoleType role) {
        String tag = UUID.randomUUID().toString().substring(0, 8);
        return users.saveAndFlush(
                User.builder()
                        .fullName("Test " + tag)
                        .email(tag + "@report.test")
                        .phone("04" + String.format("%08d", Math.abs(tag.hashCode()) % 100_000_000))
                        .passwordHash("x")
                        .role(role)
                        .build());
    }
}
```

- [ ] **Bước 4: Chạy để chắc chắn đỏ**

```bash
docker compose -p market-link-chat3b -f docker-compose.yml -f ../compose.chat3b-override.yml exec -T backend ./mvnw -B test -Dtest=MessageReportRepositoryTest
```

Expected: FAIL — `cannot find symbol: class MessageReport`.

- [ ] **Bước 5: Viết hai enum**

```java
package com.techx.intervue.modules.conversation.enums;

import com.fasterxml.jackson.annotation.JsonValue;
import com.techx.intervue.converters.LowercaseEnumConverter;
import jakarta.persistence.Converter;
import java.util.Locale;

/** Khớp ENUM('spam','abuse','scam','other') trong migration V20260926005. */
public enum ReportReason {
    SPAM,
    ABUSE,
    SCAM,
    OTHER;

    @JsonValue
    public String value() {
        return name().toLowerCase(Locale.ROOT);
    }

    @Converter(autoApply = true)
    public static class DbConverter extends LowercaseEnumConverter<ReportReason> {
        public DbConverter() {
            super(ReportReason.class);
        }
    }
}
```

```java
package com.techx.intervue.modules.conversation.enums;

import com.fasterxml.jackson.annotation.JsonValue;
import com.techx.intervue.converters.LowercaseEnumConverter;
import jakarta.persistence.Converter;
import java.util.Locale;

/**
 * new = chưa ai xem · reviewed = admin đã xem và quyết định không ẩn · actioned = đã ẩn tin. Khớp
 * ENUM trong migration V20260926005.
 */
public enum ReportStatus {
    NEW,
    REVIEWED,
    ACTIONED;

    @JsonValue
    public String value() {
        return name().toLowerCase(Locale.ROOT);
    }

    @Converter(autoApply = true)
    public static class DbConverter extends LowercaseEnumConverter<ReportStatus> {
        public DbConverter() {
            super(ReportStatus.class);
        }
    }
}
```

- [ ] **Bước 6: Viết entity**

```java
package com.techx.intervue.modules.conversation.entities;

import com.techx.intervue.modules.conversation.enums.ReportReason;
import com.techx.intervue.modules.conversation.enums.ReportStatus;
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

/** FR-116. Không bao giờ xoá báo cáo: nó là dấu vết kiểm toán của một quyết định kiểm duyệt. */
@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "message_reports")
public class MessageReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "message_id", nullable = false, updatable = false)
    private Long messageId;

    @Column(name = "reported_by", nullable = false, updatable = false)
    private Long reportedBy;

    @Convert(converter = ReportReason.DbConverter.class)
    @Column(nullable = false, updatable = false)
    private ReportReason reason;

    @Column(length = 255, updatable = false)
    private String note;

    @Convert(converter = ReportStatus.DbConverter.class)
    @Column(nullable = false)
    @Builder.Default
    private ReportStatus status = ReportStatus.NEW;

    @Column(name = "reviewed_by")
    private Long reviewedBy;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    /** Giống Message: không ghi đè khi đã có giá trị, để test đặt được mốc thời gian. */
    @PrePersist
    protected void onCreated() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    /** Ghi lại ai đã xử lý và lúc nào; gọi một lần, không ghi đè người xử lý trước. */
    public void markHandledBy(Long adminId, ReportStatus outcome, Instant at) {
        if (this.status != ReportStatus.NEW) {
            return;
        }
        this.status = outcome;
        this.reviewedBy = adminId;
        this.reviewedAt = at;
    }
}
```

- [ ] **Bước 7: Viết repository**

```java
package com.techx.intervue.modules.conversation.repositories;

import com.techx.intervue.modules.conversation.entities.MessageReport;
import com.techx.intervue.modules.conversation.enums.ReportStatus;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MessageReportRepository extends JpaRepository<MessageReport, Long> {

    /** Một người báo một tin đúng một lần — kiểm trước để trả 409 thay vì để UNIQUE ném 500. */
    boolean existsByMessageIdAndReportedBy(Long messageId, Long reportedBy);

    /** Spec §8.3: câu hỏi quyết định admin có được đọc một tin hay không. */
    boolean existsByMessageId(Long messageId);

    Page<MessageReport> findByStatusOrderByCreatedAtDesc(ReportStatus status, Pageable pageable);

    Page<MessageReport> findAllByOrderByCreatedAtDesc(Pageable pageable);

    List<MessageReport> findByMessageId(Long messageId);
}
```

- [ ] **Bước 8: Chạy cho xanh**

```bash
docker compose -p market-link-chat3b -f docker-compose.yml -f ../compose.chat3b-override.yml exec -T backend ./mvnw -B test -Dtest=MessageReportRepositoryTest
```

Expected: PASS (5 test). Flyway lỗi thì đọc `docker compose -p market-link-chat3b -f docker-compose.yml -f ../compose.chat3b-override.yml logs backend | tail -40` — thường là kiểu khoá ngoại không khớp `BIGINT UNSIGNED`.

- [ ] **Bước 9: Commit**

```bash
make be-format
git add backend/src/main/resources/db/migration/V20260926005__create_message_reports_table.sql \
        backend/src/main/java/com/techx/intervue/modules/conversation/enums/ReportReason.java \
        backend/src/main/java/com/techx/intervue/modules/conversation/enums/ReportStatus.java \
        backend/src/main/java/com/techx/intervue/modules/conversation/entities/MessageReport.java \
        backend/src/main/java/com/techx/intervue/modules/conversation/repositories/MessageReportRepository.java \
        backend/src/test/java/com/techx/intervue/modules/conversation/repositories/MessageReportRepositoryTest.java
git commit -m "feat(FR-116): add the message_reports table

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: `POST /api/v1/messages/{id}/report` — người dùng báo cáo một tin

**Files:**
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/requests/ReportMessageRequest.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/resources/MessageReportResource.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/exceptions/AlreadyReportedException.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/exceptions/CannotReportOwnMessageException.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/services/interfaces/MessageReportServiceInterface.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/services/impl/MessageReportService.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/controllers/MessageReportController.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/conversation/controllers/ConversationExceptionHandler.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/conversation/services/impl/MessageReportServiceTest.java`

**Interfaces:**
- Consumes: `MessageReportRepository` (Task 1), `MessageRepository`, `ConversationLookup.requireMember(Long meId, Long conversationId)` (ném `ConversationAccessDeniedException` hoặc `EntityNotFoundException`), `Clock`.
- Produces:
  - `record ReportMessageRequest(ReportReason reason, String note)` — `reason` bắt buộc, `note` tối đa 255 ký tự.
  - `record MessageReportResource(Long id, Long messageId, ReportReason reason, String note, ReportStatus status, Instant createdAt)` + `static MessageReportResource from(MessageReport)`.
  - `MessageReportResource MessageReportServiceInterface.report(Long meId, Long messageId, ReportMessageRequest request)`.

**Luật (spec §8.3, §8.5):**

| Tình huống | Kết quả |
|---|---|
| Người trong thread báo tin của người kia | 201 |
| Báo tin của **chính mình** | **400** — báo cáo là để tố người khác, không phải để tự xoá tin (spec §8.5: người gửi không xoá được tin) |
| Người **ngoài** thread báo | **403** — kiểm trước cả "đã bị ẩn", xem chú thích trong code |
| Tin không tồn tại | **404** |
| Tin **đã bị ẩn** (người trong thread) | **404** — nó đã biến mất khỏi danh sách của bạn rồi |
| Báo lần thứ hai | **409** |

- [ ] **Bước 1: Viết test đỏ**

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
import com.techx.intervue.modules.conversation.entities.MessageReport;
import com.techx.intervue.modules.conversation.enums.MessageKind;
import com.techx.intervue.modules.conversation.enums.ReportReason;
import com.techx.intervue.modules.conversation.enums.ReportStatus;
import com.techx.intervue.modules.conversation.exceptions.AlreadyReportedException;
import com.techx.intervue.modules.conversation.exceptions.CannotReportOwnMessageException;
import com.techx.intervue.modules.conversation.exceptions.ConversationAccessDeniedException;
import com.techx.intervue.modules.conversation.repositories.ConversationRepository;
import com.techx.intervue.modules.conversation.repositories.MessageReportRepository;
import com.techx.intervue.modules.conversation.repositories.MessageRepository;
import com.techx.intervue.modules.conversation.requests.ReportMessageRequest;
import com.techx.intervue.modules.conversation.resources.MessageReportResource;
import jakarta.persistence.EntityNotFoundException;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class MessageReportServiceTest {

    static final Instant NOW = Instant.parse("2026-09-26T06:00:00Z");

    MessageReportRepository reports;
    MessageRepository messages;
    ConversationRepository conversations;
    MessageReportService service;
    Conversation thread;

    @BeforeEach
    void setUp() {
        reports = mock(MessageReportRepository.class);
        messages = mock(MessageRepository.class);
        conversations = mock(ConversationRepository.class);
        service =
                new MessageReportService(
                        reports,
                        messages,
                        new ConversationLookup(conversations),
                        Clock.fixed(NOW, ZoneId.of("Asia/Ho_Chi_Minh")));

        thread = Conversation.between(3L, 7L);
        thread.setId(42L);
        when(conversations.findById(42L)).thenReturn(Optional.of(thread));
        when(messages.findById(101L)).thenReturn(Optional.of(messageFrom(3L, null)));
        when(reports.save(any(MessageReport.class)))
                .thenAnswer(
                        inv -> {
                            MessageReport r = inv.getArgument(0);
                            r.setId(9L);
                            return r;
                        });
    }

    @Test
    void aMemberCanReportTheOtherPersonsMessage() {
        MessageReportResource created =
                service.report(7L, 101L, new ReportMessageRequest(ReportReason.SCAM, "asked for a deposit"));

        assertThat(created.id()).isEqualTo(9L);
        assertThat(created.messageId()).isEqualTo(101L);
        assertThat(created.reason()).isEqualTo(ReportReason.SCAM);
        assertThat(created.status()).isEqualTo(ReportStatus.NEW);
    }

    /** Review Focus #3. */
    @Test
    void reportingTheSameMessageTwiceIsRefused() {
        when(reports.existsByMessageIdAndReportedBy(101L, 7L)).thenReturn(true);

        assertThatThrownBy(
                        () ->
                                service.report(
                                        7L, 101L, new ReportMessageRequest(ReportReason.SPAM, null)))
                .isInstanceOf(AlreadyReportedException.class);
        verify(reports, never()).save(any(MessageReport.class));
    }

    /** Spec §8.5: người gửi không xoá được tin, nên cũng không tự báo cáo tin của mình. */
    @Test
    void youCannotReportYourOwnMessage() {
        assertThatThrownBy(
                        () ->
                                service.report(
                                        3L, 101L, new ReportMessageRequest(ReportReason.SPAM, null)))
                .isInstanceOf(CannotReportOwnMessageException.class);
        verify(reports, never()).save(any(MessageReport.class));
    }

    @Test
    void someoneOutsideTheThreadCannotReport() {
        assertThatThrownBy(
                        () ->
                                service.report(
                                        99L, 101L, new ReportMessageRequest(ReportReason.SPAM, null)))
                .isInstanceOf(ConversationAccessDeniedException.class);
        verify(reports, never()).save(any(MessageReport.class));
    }

    @Test
    void anUnknownMessageIsNotFound() {
        when(messages.findById(101L)).thenReturn(Optional.empty());

        assertThatThrownBy(
                        () ->
                                service.report(
                                        7L, 101L, new ReportMessageRequest(ReportReason.SPAM, null)))
                .isInstanceOf(EntityNotFoundException.class);
    }

    /** Tin đã bị ẩn đã biến mất khỏi danh sách rồi; không có gì để báo cáo nữa. */
    @Test
    void anAlreadyHiddenMessageIsNotFound() {
        when(messages.findById(101L)).thenReturn(Optional.of(messageFrom(3L, NOW)));

        assertThatThrownBy(
                        () ->
                                service.report(
                                        7L, 101L, new ReportMessageRequest(ReportReason.SPAM, null)))
                .isInstanceOf(EntityNotFoundException.class);
    }

    private static Message messageFrom(Long senderId, Instant hiddenAt) {
        return Message.builder()
                .id(101L)
                .conversationId(42L)
                .senderId(senderId)
                .kind(MessageKind.TEXT)
                .body("hi")
                .hiddenAt(hiddenAt)
                .createdAt(NOW)
                .build();
    }
}
```

- [ ] **Bước 2: Chạy để chắc chắn đỏ**

```bash
docker compose -p market-link-chat3b -f docker-compose.yml -f ../compose.chat3b-override.yml exec -T backend ./mvnw -B test -Dtest=MessageReportServiceTest
```

Expected: FAIL — `cannot find symbol: class MessageReportService`.

> ⚠️ Bài học từ Plan 2 và 3A (ledger): **không để một test không biên dịch nằm trên đĩa trong lúc container dev khởi động lại** — `spring-boot:run` chạy `test-compile` trước và backend sẽ vào vòng lặp restart. Viết test đỏ xong là chạy ngay.

- [ ] **Bước 3: Viết hai exception**

```java
package com.techx.intervue.modules.conversation.exceptions;

/** Spec §5.1 uq_report_once — 409. */
public class AlreadyReportedException extends RuntimeException {
    public AlreadyReportedException() {
        super("You have already reported this message.");
    }
}
```

```java
package com.techx.intervue.modules.conversation.exceptions;

/** Spec §8.5: người gửi không xoá được tin của mình, nên cũng không tự báo cáo. 400. */
public class CannotReportOwnMessageException extends RuntimeException {
    public CannotReportOwnMessageException() {
        super("You cannot report your own message.");
    }
}
```

- [ ] **Bước 4: Viết request và resource**

```java
package com.techx.intervue.modules.conversation.requests;

import com.techx.intervue.modules.conversation.enums.ReportReason;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** FR-116. note là lời kể thêm của người báo, không bắt buộc. */
public record ReportMessageRequest(
        @NotNull(message = "Choose a reason for reporting this message.") ReportReason reason,
        @Size(max = 255, message = "The note can be at most 255 characters.") String note) {}
```

```java
package com.techx.intervue.modules.conversation.resources;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.techx.intervue.modules.conversation.entities.MessageReport;
import com.techx.intervue.modules.conversation.enums.ReportReason;
import com.techx.intervue.modules.conversation.enums.ReportStatus;
import java.time.Instant;

/** Trả về cho chính người báo. Không mang thông tin của admin (reviewedBy / reviewedAt). */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record MessageReportResource(
        Long id,
        Long messageId,
        ReportReason reason,
        String note,
        ReportStatus status,
        Instant createdAt) {

    public static MessageReportResource from(MessageReport r) {
        return new MessageReportResource(
                r.getId(),
                r.getMessageId(),
                r.getReason(),
                r.getNote(),
                r.getStatus(),
                r.getCreatedAt());
    }
}
```

- [ ] **Bước 5: Viết interface và service**

```java
package com.techx.intervue.modules.conversation.services.interfaces;

import com.techx.intervue.modules.conversation.requests.ReportMessageRequest;
import com.techx.intervue.modules.conversation.resources.MessageReportResource;

public interface MessageReportServiceInterface {

    /** FR-116. Chỉ thành viên trong thread báo được, và chỉ báo tin của người kia. */
    MessageReportResource report(Long meId, Long messageId, ReportMessageRequest request);
}
```

```java
package com.techx.intervue.modules.conversation.services.impl;

import com.techx.intervue.modules.conversation.entities.Message;
import com.techx.intervue.modules.conversation.entities.MessageReport;
import com.techx.intervue.modules.conversation.exceptions.AlreadyReportedException;
import com.techx.intervue.modules.conversation.exceptions.CannotReportOwnMessageException;
import com.techx.intervue.modules.conversation.repositories.MessageReportRepository;
import com.techx.intervue.modules.conversation.repositories.MessageRepository;
import com.techx.intervue.modules.conversation.requests.ReportMessageRequest;
import com.techx.intervue.modules.conversation.resources.MessageReportResource;
import com.techx.intervue.modules.conversation.services.interfaces.MessageReportServiceInterface;
import jakarta.persistence.EntityNotFoundException;
import java.time.Clock;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** FR-116, spec §8.3. */
@Service
@RequiredArgsConstructor
public class MessageReportService implements MessageReportServiceInterface {

    private final MessageReportRepository reports;
    private final MessageRepository messages;
    private final ConversationLookup lookup;
    private final Clock clock;

    @Override
    @Transactional
    public MessageReportResource report(
            Long meId, Long messageId, ReportMessageRequest request) {
        Message message =
                messages.findById(messageId)
                        .orElseThrow(() -> new EntityNotFoundException("Message not found."));
        // R-06 TRƯỚC mọi kiểm tra khác. Nếu kiểm "đã bị ẩn" trước, người ngoài thread sẽ nhận 404
        // cho tin đã ẩn và 403 cho tin đang hiện — tức là đoán được trạng thái kiểm duyệt của một
        // tin họ không có quyền biết là có tồn tại.
        lookup.requireMember(meId, message.getConversationId());
        // Tin đã bị ẩn đã biến mất khỏi danh sách của người dùng; đừng để họ báo cáo một bóng ma
        if (message.isHidden()) {
            throw new EntityNotFoundException("Message not found.");
        }
        if (message.getSenderId().equals(meId)) {
            throw new CannotReportOwnMessageException();
        }
        if (reports.existsByMessageIdAndReportedBy(messageId, meId)) {
            throw new AlreadyReportedException();
        }

        MessageReport saved =
                reports.save(
                        MessageReport.builder()
                                .messageId(messageId)
                                .reportedBy(meId)
                                .reason(request.reason())
                                .note(note(request))
                                .createdAt(clock.instant())
                                .build());
        return MessageReportResource.from(saved);
    }

    private static String note(ReportMessageRequest request) {
        if (request.note() == null) {
            return null;
        }
        String trimmed = request.note().strip();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
```

- [ ] **Bước 6: Viết controller**

```java
package com.techx.intervue.modules.conversation.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.conversation.requests.ReportMessageRequest;
import com.techx.intervue.modules.conversation.resources.MessageReportResource;
import com.techx.intervue.modules.conversation.services.interfaces.MessageReportServiceInterface;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import com.techx.intervue.resources.ApiResource;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * FR-116. Đường dẫn theo tin nhắn chứ không theo thread (spec §6.1): client đang cầm sẵn messageId
 * từ danh sách tin, không cần bắt nó nhắc lại conversationId.
 */
@RestController
@RequestMapping("/api/v1/messages")
@AllArgsConstructor
public class MessageReportController extends BaseController {

    private final MessageReportServiceInterface reportService;

    @PostMapping("/{id}/report")
    public ResponseEntity<ApiResource<MessageReportResource>> report(
            @PathVariable Long id,
            @Valid @RequestBody ReportMessageRequest request,
            @AuthenticationPrincipal CustomUserDetails me) {
        return created(reportService.report(me.getId(), id, request), "Report received.");
    }
}
```

- [ ] **Bước 7: Nối vào exception handler**

`ConversationExceptionHandler` hiện khai ba controller. Thêm `MessageReportController` vào `assignableTypes` — **không sửa bằng phép thay chuỗi mù**, mở file ra và sửa tay, vì Spotless đã gộp/tách dòng annotation này một lần và làm hỏng một phép thay thế ở Plan 3A:

```java
@RestControllerAdvice(
        assignableTypes = {
            ConversationController.class,
            AttachmentController.class,
            AttachmentDownloadController.class,
            MessageReportController.class
        })
```

Thêm hai handler:

```java
    /** Spec §8.5 — 400. */
    @ExceptionHandler(CannotReportOwnMessageException.class)
    ResponseEntity<ApiResource<Void>> ownMessage(CannotReportOwnMessageException e) {
        return error(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", e.getMessage(), List.of());
    }

    /** uq_report_once — 409. */
    @ExceptionHandler(AlreadyReportedException.class)
    ResponseEntity<ApiResource<Void>> alreadyReported(AlreadyReportedException e) {
        return error(HttpStatus.CONFLICT, "ALREADY_REPORTED", e.getMessage(), List.of());
    }
```

Và trong `integrity(...)` (handler của `DataIntegrityViolationException`), thêm nhánh cho trường hợp hai request đồng thời lọt qua `existsBy...`:

```java
        if (cause.contains("uq_report_once")) {
            return error(
                    HttpStatus.CONFLICT,
                    "ALREADY_REPORTED",
                    new AlreadyReportedException().getMessage(),
                    List.of());
        }
```

Thêm import cho `AlreadyReportedException` và `CannotReportOwnMessageException`.

- [ ] **Bước 8: Cập nhật `ConversationExceptionHandlerScopeTest`**

Test này ghim đúng danh sách controller (Plan 3A thêm nó sau khi một controller bị sót làm mọi lỗi thành 500). Thêm `MessageReportController.class` vào `containsExactlyInAnyOrder(...)`.

- [ ] **Bước 9: Chạy cho xanh**

```bash
docker compose -p market-link-chat3b -f docker-compose.yml -f ../compose.chat3b-override.yml exec -T backend ./mvnw -B test -Dtest=MessageReportServiceTest,ConversationExceptionHandlerScopeTest
```

Expected: PASS (6 + 1 test).

- [ ] **Bước 10: Commit**

```bash
make be-format
git add -A backend/src
git commit -m "feat(FR-116): let a member report a message in their conversation

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: `GET /api/v1/admin/message-reports` — hàng đợi kiểm duyệt

**Files:**
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/resources/AdminReportListItemResource.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/services/interfaces/ModerationServiceInterface.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/services/impl/ModerationService.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/controllers/AdminMessageReportController.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/conversation/controllers/ConversationExceptionHandler.java` (thêm vào `assignableTypes`)
- Modify: `backend/src/test/java/com/techx/intervue/modules/conversation/controllers/ConversationExceptionHandlerScopeTest.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/conversation/services/impl/ModerationServiceTest.java`

**Interfaces:**
- Consumes: `MessageReportRepository.findByStatusOrderByCreatedAtDesc(ReportStatus, Pageable)` và `findAllByOrderByCreatedAtDesc(Pageable)` (Task 1), `MessageRepository`, `UserRepository`, `PageResource` (đã có).
- Produces:
  - `record AdminReportListItemResource(Long reportId, Long messageId, Long conversationId, ReportReason reason, String note, ReportStatus status, String reporterName, String senderName, String preview, Instant reportedAt)`.
  - `PageResource<AdminReportListItemResource> ModerationServiceInterface.list(ReportStatus status, int page, int pageSize)` — `status` null = tất cả.

**Vì sao danh sách có `preview` mà không có toàn văn:** hàng đợi là nơi admin quyết định *có mở ra xem không*. Đưa nguyên nội dung vào danh sách biến nó thành một màn đọc hàng loạt — đúng thứ spec §8.3 cấm. `preview` cắt 80 ký tự, và tin ảnh hiện `Photo`.

- [ ] **Bước 1: Viết test đỏ**

```java
package com.techx.intervue.modules.conversation.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.conversation.entities.Message;
import com.techx.intervue.modules.conversation.entities.MessageReport;
import com.techx.intervue.modules.conversation.enums.MessageKind;
import com.techx.intervue.modules.conversation.enums.ReportReason;
import com.techx.intervue.modules.conversation.enums.ReportStatus;
import com.techx.intervue.modules.conversation.repositories.MessageReportRepository;
import com.techx.intervue.modules.conversation.repositories.MessageRepository;
import com.techx.intervue.modules.conversation.resources.AdminReportListItemResource;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.repositories.UserRepository;
import com.techx.intervue.resources.PageResource;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

class ModerationServiceTest {

    static final Instant NOW = Instant.parse("2026-09-26T06:00:00Z");

    MessageReportRepository reports;
    MessageRepository messages;
    UserRepository users;
    ModerationService service;

    @BeforeEach
    void setUp() {
        reports = mock(MessageReportRepository.class);
        messages = mock(MessageRepository.class);
        users = mock(UserRepository.class);
        service =
                new ModerationService(
                        reports, messages, users, Clock.fixed(NOW, ZoneId.of("UTC")));

        when(messages.findById(101L)).thenReturn(Optional.of(textMessage("Send me a deposit first")));
        when(users.findById(3L)).thenReturn(Optional.of(named(3L, "Seller Sam")));
        when(users.findById(7L)).thenReturn(Optional.of(named(7L, "Buyer Bea")));
    }

    @Test
    void showsWhoReportedWhatAndAShortPreview() {
        when(reports.findByStatusOrderByCreatedAtDesc(any(), any(Pageable.class)))
                .thenReturn(onePage(report(ReportStatus.NEW)));

        PageResource<AdminReportListItemResource> page = service.list(ReportStatus.NEW, 1, 20);

        assertThat(page.items()).singleElement().satisfies(item -> {
            assertThat(item.reportId()).isEqualTo(9L);
            assertThat(item.messageId()).isEqualTo(101L);
            assertThat(item.conversationId()).isEqualTo(42L);
            assertThat(item.reason()).isEqualTo(ReportReason.SCAM);
            assertThat(item.reporterName()).isEqualTo("Buyer Bea");
            assertThat(item.senderName()).isEqualTo("Seller Sam");
            assertThat(item.preview()).isEqualTo("Send me a deposit first");
        });
        assertThat(page.page()).isEqualTo(1);
        assertThat(page.total()).isEqualTo(1);
    }

    @Test
    void anImageMessageShowsAWordNotAnEmptyPreview() {
        when(messages.findById(101L))
                .thenReturn(
                        Optional.of(
                                Message.builder()
                                        .id(101L)
                                        .conversationId(42L)
                                        .senderId(3L)
                                        .kind(MessageKind.IMAGE)
                                        .createdAt(NOW)
                                        .build()));
        when(reports.findByStatusOrderByCreatedAtDesc(any(), any(Pageable.class)))
                .thenReturn(onePage(report(ReportStatus.NEW)));

        assertThat(service.list(ReportStatus.NEW, 1, 20).items())
                .singleElement()
                .satisfies(item -> assertThat(item.preview()).isEqualTo("Photo"));
    }

    @Test
    void aVeryLongMessageIsCutInTheQueue() {
        when(messages.findById(101L)).thenReturn(Optional.of(textMessage("a".repeat(500))));
        when(reports.findByStatusOrderByCreatedAtDesc(any(), any(Pageable.class)))
                .thenReturn(onePage(report(ReportStatus.NEW)));

        assertThat(service.list(ReportStatus.NEW, 1, 20).items())
                .singleElement()
                .satisfies(item -> assertThat(item.preview()).hasSize(ModerationService.PREVIEW_LENGTH));
    }

    @Test
    void noStatusFilterListsEverything() {
        when(reports.findAllByOrderByCreatedAtDesc(any(Pageable.class)))
                .thenReturn(onePage(report(ReportStatus.ACTIONED)));

        service.list(null, 1, 20);

        verify(reports).findAllByOrderByCreatedAtDesc(any(Pageable.class));
    }

    @Test
    void pageNumbersAreOneBasedOnTheWayInAndOnTheWayOut() {
        when(reports.findByStatusOrderByCreatedAtDesc(any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(2, 20), 0));

        PageResource<AdminReportListItemResource> page = service.list(ReportStatus.NEW, 3, 20);

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(reports).findByStatusOrderByCreatedAtDesc(any(), pageable.capture());
        assertThat(pageable.getValue().getPageNumber()).isEqualTo(2); // 1-based → 0-based
        assertThat(page.page()).isEqualTo(3);
    }

    private static Page<MessageReport> onePage(MessageReport report) {
        return new PageImpl<>(List.of(report), PageRequest.of(0, 20), 1);
    }

    private static MessageReport report(ReportStatus status) {
        return MessageReport.builder()
                .id(9L)
                .messageId(101L)
                .reportedBy(7L)
                .reason(ReportReason.SCAM)
                .note("asked for a deposit")
                .status(status)
                .createdAt(NOW)
                .build();
    }

    private static Message textMessage(String body) {
        return Message.builder()
                .id(101L)
                .conversationId(42L)
                .senderId(3L)
                .kind(MessageKind.TEXT)
                .body(body)
                .createdAt(NOW)
                .build();
    }

    private static User named(Long id, String fullName) {
        return User.builder().id(id).fullName(fullName).build();
    }
}
```

- [ ] **Bước 2: Chạy để chắc chắn đỏ**

```bash
docker compose -p market-link-chat3b -f docker-compose.yml -f ../compose.chat3b-override.yml exec -T backend ./mvnw -B test -Dtest=ModerationServiceTest
```

Expected: FAIL — `cannot find symbol: class ModerationService`.

- [ ] **Bước 3: Viết resource**

```java
package com.techx.intervue.modules.conversation.resources;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.techx.intervue.modules.conversation.enums.ReportReason;
import com.techx.intervue.modules.conversation.enums.ReportStatus;
import java.time.Instant;

/**
 * Một dòng trong hàng đợi kiểm duyệt. Chỉ có `preview` chứ không có toàn văn: hàng đợi là nơi admin
 * quyết định có mở ra xem không, không phải nơi đọc hàng loạt (spec §8.3).
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record AdminReportListItemResource(
        Long reportId,
        Long messageId,
        Long conversationId,
        ReportReason reason,
        String note,
        ReportStatus status,
        String reporterName,
        String senderName,
        String preview,
        Instant reportedAt) {}
```

- [ ] **Bước 4: Viết interface và service**

```java
package com.techx.intervue.modules.conversation.services.interfaces;

import com.techx.intervue.modules.conversation.enums.ReportStatus;
import com.techx.intervue.modules.conversation.resources.AdminReportListItemResource;
import com.techx.intervue.resources.PageResource;

public interface ModerationServiceInterface {

    /** Hàng đợi kiểm duyệt. status null = mọi trạng thái. */
    PageResource<AdminReportListItemResource> list(ReportStatus status, int page, int pageSize);
}
```

```java
package com.techx.intervue.modules.conversation.services.impl;

import com.techx.intervue.modules.conversation.entities.Message;
import com.techx.intervue.modules.conversation.entities.MessageReport;
import com.techx.intervue.modules.conversation.enums.MessageKind;
import com.techx.intervue.modules.conversation.enums.ReportStatus;
import com.techx.intervue.modules.conversation.repositories.MessageReportRepository;
import com.techx.intervue.modules.conversation.repositories.MessageRepository;
import com.techx.intervue.modules.conversation.resources.AdminReportListItemResource;
import com.techx.intervue.modules.user.repositories.UserRepository;
import com.techx.intervue.resources.PageResource;
import java.time.Clock;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** FR-116, spec §8.3. Admin đọc tới đâu là do bảng message_reports quyết, không do vai quyết. */
@Service
@RequiredArgsConstructor
public class ModerationService implements ModerationServiceInterface {

    /** Đủ để nhận ra tin nào, không đủ để đọc cả hộp thư. */
    static final int PREVIEW_LENGTH = 80;

    static final String IMAGE_PREVIEW = "Photo";

    private final MessageReportRepository reports;
    private final MessageRepository messages;
    private final UserRepository users;
    private final Clock clock;

    @Override
    @Transactional(readOnly = true)
    public PageResource<AdminReportListItemResource> list(
            ReportStatus status, int page, int pageSize) {
        Pageable pageable = PageRequest.of(Math.max(page - 1, 0), pageSize);
        Page<MessageReport> found =
                status == null
                        ? reports.findAllByOrderByCreatedAtDesc(pageable)
                        : reports.findByStatusOrderByCreatedAtDesc(status, pageable);

        List<AdminReportListItemResource> items = found.getContent().stream().map(this::toItem).toList();
        return PageResource.<AdminReportListItemResource>builder()
                .items(items)
                .page(page)
                .pageSize(pageSize)
                .total(found.getTotalElements())
                .build();
    }

    private AdminReportListItemResource toItem(MessageReport report) {
        Message message = messages.findById(report.getMessageId()).orElse(null);
        return new AdminReportListItemResource(
                report.getId(),
                report.getMessageId(),
                message == null ? null : message.getConversationId(),
                report.getReason(),
                report.getNote(),
                report.getStatus(),
                nameOf(report.getReportedBy()),
                message == null ? null : nameOf(message.getSenderId()),
                preview(message),
                report.getCreatedAt());
    }

    /** Tài khoản bị vô hiệu hoá vẫn còn hàng trong users (FR-072), nên hiếm khi rơi vào nhánh null. */
    private String nameOf(Long userId) {
        return users.findById(userId).map(u -> u.getFullName()).orElse("Unknown user");
    }

    static String preview(Message message) {
        if (message == null) {
            return null;
        }
        if (message.getKind() == MessageKind.IMAGE) {
            return IMAGE_PREVIEW;
        }
        String body = message.getBody() == null ? "" : message.getBody();
        return body.length() <= PREVIEW_LENGTH ? body : body.substring(0, PREVIEW_LENGTH);
    }
}
```

`clock` chưa dùng ở task này nhưng Task 5 dùng; khai sẵn để constructor không đổi giữa chừng — test ở Bước 1 đã truyền nó.

- [ ] **Bước 5: Viết controller**

```java
package com.techx.intervue.modules.conversation.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.conversation.enums.ReportStatus;
import com.techx.intervue.modules.conversation.resources.AdminReportListItemResource;
import com.techx.intervue.modules.conversation.services.interfaces.ModerationServiceInterface;
import com.techx.intervue.resources.ApiResource;
import com.techx.intervue.resources.PageResource;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.Locale;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * FR-116 — chỉ Admin. **Không có endpoint nào đọc một conversationId tuỳ ý** (spec §8.3): mọi thứ
 * admin thấy đều bắt đầu từ một báo cáo.
 */
@Validated
@RestController
@RequestMapping("/api/v1/admin/message-reports")
@PreAuthorize("hasRole('ADMIN')")
@AllArgsConstructor
public class AdminMessageReportController extends BaseController {

    private final ModerationServiceInterface moderation;

    @GetMapping
    public ResponseEntity<ApiResource<PageResource<AdminReportListItemResource>>> list(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(50) int pageSize) {
        return ok(moderation.list(parseStatus(status), page, pageSize), "Reports loaded.");
    }

    /** Giá trị lạ → 400 qua handler, không âm thầm trả về cả danh sách. */
    private static ReportStatus parseStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        try {
            return ReportStatus.valueOf(status.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new com.techx.intervue.modules.user.exceptions.InvalidFieldException(
                    "status", "Status must be one of: new, reviewed, actioned.");
        }
    }
}
```

- [ ] **Bước 6: Nối vào exception handler và test phạm vi**

Mở `ConversationExceptionHandler` và thêm `AdminMessageReportController.class` vào `assignableTypes` (sửa tay, xem cảnh báo ở Task 2 Bước 7). `InvalidFieldException` đã có handler trong advice này từ Plan 3A.

Thêm `AdminMessageReportController.class` vào `ConversationExceptionHandlerScopeTest`.

- [ ] **Bước 7: Chạy cho xanh**

```bash
docker compose -p market-link-chat3b -f docker-compose.yml -f ../compose.chat3b-override.yml exec -T backend ./mvnw -B test -Dtest=ModerationServiceTest,ConversationExceptionHandlerScopeTest
```

Expected: PASS (5 + 1 test).

- [ ] **Bước 8: Commit**

```bash
make be-format
git add -A backend/src
git commit -m "feat(FR-116): list reported messages for an admin

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Chi tiết báo cáo kèm ±5 tin ngữ cảnh — ranh giới của admin

Đây là task quan trọng nhất của plan. Spec §8.3 là một **chính sách riêng tư**, và task này là chỗ duy nhất nó được thi hành.

**Files:**
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/resources/AdminReportDetailResource.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/resources/ModeratedMessageResource.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/conversation/services/interfaces/ModerationServiceInterface.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/conversation/services/impl/ModerationService.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/conversation/repositories/MessageRepository.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/conversation/controllers/AdminMessageReportController.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/conversation/services/impl/ModerationServiceTest.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/conversation/repositories/MessageRepositoryContextTest.java`

**Interfaces:**
- Consumes: `MessageReportRepository.findById`, `MessageReportRepository.findByMessageId(Long)`.
- Produces:
  - `record ModeratedMessageResource(Long id, Long senderId, String senderName, MessageKind kind, String body, boolean hasPhoto, boolean reported, boolean hidden, Instant createdAt)`.
  - `record AdminReportDetailResource(Long reportId, Long messageId, Long conversationId, ReportReason reason, String note, ReportStatus status, String reporterName, Instant reportedAt, List<ModeratedMessageResource> context)`.
  - `AdminReportDetailResource ModerationServiceInterface.detail(Long reportId)`.
  - `MessageRepository.findByConversationIdAndIdLessThanOrderByIdDesc(Long, Long, Pageable)` và `findByConversationIdAndIdGreaterThanOrderByIdAsc(Long, Long, Pageable)` — **không** lọc `hiddenAt`: admin phải thấy được tin mình vừa ẩn, khác hẳn hai method mà `MessageService.list` dùng.

**Ranh giới (spec §8.3):**

| | |
|---|---|
| Cửa vào duy nhất | `reportId`. Không có endpoint nào nhận `conversationId`. |
| Phạm vi đọc | Tin bị báo + **tối đa 5 tin liền trước** + **tối đa 5 tin liền sau**, trong đúng thread đó. |
| Tin bị ẩn | Admin **thấy** (khác người dùng thường), kèm cờ `hidden: true` để UI hiện khác đi. |
| Ảnh | Chỉ trả cờ `hasPhoto`; byte ảnh đi qua `GET /attachments/{id}` ở Task 7. |
| `reported` | Cờ đánh dấu tin nào trong ngữ cảnh cũng đang có báo cáo — Task 7 dùng nó để quyết cho xem ảnh hay không. |

- [ ] **Bước 1: Viết test đỏ cho repository**

```java
package com.techx.intervue.modules.conversation.repositories;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.conversation.entities.Conversation;
import com.techx.intervue.modules.conversation.entities.Message;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.repositories.UserRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;

/**
 * Hai truy vấn ngữ cảnh của admin (spec §8.3) KHÔNG lọc hidden_at, khác hẳn hai truy vấn mà
 * MessageService.list dùng — admin phải thấy được tin mình vừa ẩn.
 */
@SpringBootTest
@Transactional
class MessageRepositoryContextTest {

    @Autowired MessageRepository messages;
    @Autowired ConversationRepository conversations;
    @Autowired UserRepository users;

    @Test
    void takesAtMostFiveMessagesOnEachSideOfTheReportedOne() {
        Conversation thread = thread();
        List<Long> ids = new java.util.ArrayList<>();
        for (int i = 0; i < 13; i++) {
            ids.add(message(thread, "m" + i, null));
        }
        Long middle = ids.get(6);

        assertThat(
                        messages.findByConversationIdAndIdLessThanOrderByIdDesc(
                                thread.getId(), middle, PageRequest.of(0, 5)))
                .hasSize(5)
                .extracting(Message::getId)
                .containsExactly(ids.get(5), ids.get(4), ids.get(3), ids.get(2), ids.get(1));

        assertThat(
                        messages.findByConversationIdAndIdGreaterThanOrderByIdAsc(
                                thread.getId(), middle, PageRequest.of(0, 5)))
                .hasSize(5)
                .extracting(Message::getId)
                .containsExactly(ids.get(7), ids.get(8), ids.get(9), ids.get(10), ids.get(11));
    }

    @Test
    void includesHiddenMessagesUnlikeTheMemberFacingQueries() {
        Conversation thread = thread();
        Long before = message(thread, "hidden one", Instant.now());
        Long middle = message(thread, "reported", null);

        assertThat(
                        messages.findByConversationIdAndIdLessThanOrderByIdDesc(
                                thread.getId(), middle, PageRequest.of(0, 5)))
                .extracting(Message::getId)
                .containsExactly(before);
        // Trong khi truy vấn của người dùng thường thì bỏ nó đi
        assertThat(
                        messages.findByConversationIdAndIdLessThanAndHiddenAtIsNullOrderByIdDesc(
                                thread.getId(), middle, PageRequest.of(0, 5)))
                .isEmpty();
    }

    @Test
    void neverCrossesIntoAnotherThread() {
        Conversation mine = thread();
        Conversation other = thread();
        Long middle = message(mine, "reported", null);
        message(other, "someone else's business", null);

        assertThat(
                        messages.findByConversationIdAndIdGreaterThanOrderByIdAsc(
                                mine.getId(), middle, PageRequest.of(0, 5)))
                .isEmpty();
    }

    private Conversation thread() {
        return conversations.saveAndFlush(
                Conversation.between(user(RoleType.CUSTOMER).getId(), user(RoleType.FARMER).getId()));
    }

    private Long message(Conversation c, String body, Instant hiddenAt) {
        return messages.saveAndFlush(
                        Message.builder()
                                .conversationId(c.getId())
                                .senderId(c.getUserAId())
                                .body(body)
                                .hiddenAt(hiddenAt)
                                .build())
                .getId();
    }

    private User user(RoleType role) {
        String tag = UUID.randomUUID().toString().substring(0, 8);
        return users.saveAndFlush(
                User.builder()
                        .fullName("Test " + tag)
                        .email(tag + "@context.test")
                        .phone("03" + String.format("%08d", Math.abs(tag.hashCode()) % 100_000_000))
                        .passwordHash("x")
                        .role(role)
                        .build());
    }
}
```

- [ ] **Bước 2: Chạy để chắc chắn đỏ**

```bash
docker compose -p market-link-chat3b -f docker-compose.yml -f ../compose.chat3b-override.yml exec -T backend ./mvnw -B test -Dtest=MessageRepositoryContextTest
```

Expected: FAIL — `cannot find symbol: method findByConversationIdAndIdLessThanOrderByIdDesc`.

- [ ] **Bước 3: Thêm hai truy vấn vào `MessageRepository`**

```java
    /**
     * Ngữ cảnh cho admin (spec §8.3) — KHÔNG lọc hiddenAt: admin phải thấy được tin mình vừa ẩn.
     * Đừng dùng hai method này cho người dùng thường; hai method có `HiddenAtIsNull` ở trên mới là
     * của họ.
     */
    List<Message> findByConversationIdAndIdLessThanOrderByIdDesc(
            Long conversationId, Long before, Pageable pageable);

    List<Message> findByConversationIdAndIdGreaterThanOrderByIdAsc(
            Long conversationId, Long after, Pageable pageable);
```

- [ ] **Bước 4: Chạy repository test cho xanh**

```bash
docker compose -p market-link-chat3b -f docker-compose.yml -f ../compose.chat3b-override.yml exec -T backend ./mvnw -B test -Dtest=MessageRepositoryContextTest
```

Expected: PASS (3 test).

- [ ] **Bước 5: Viết test đỏ cho `detail`**

Thêm vào `ModerationServiceTest`:

```java
    @Test
    void detailPutsTheReportedMessageInTheMiddleOfItsNeighbours() {
        when(reports.findById(9L)).thenReturn(Optional.of(report(ReportStatus.NEW)));
        when(reports.findByMessageId(101L)).thenReturn(List.of(report(ReportStatus.NEW)));
        when(messages.findByConversationIdAndIdLessThanOrderByIdDesc(eq(42L), eq(101L), any()))
                .thenReturn(List.of(textMessageWithId(100L, "before")));
        when(messages.findByConversationIdAndIdGreaterThanOrderByIdAsc(eq(42L), eq(101L), any()))
                .thenReturn(List.of(textMessageWithId(102L, "after")));

        AdminReportDetailResource detail = service.detail(9L);

        assertThat(detail.reportId()).isEqualTo(9L);
        assertThat(detail.conversationId()).isEqualTo(42L);
        assertThat(detail.context()).extracting(ModeratedMessageResource::id)
                .containsExactly(100L, 101L, 102L);
        assertThat(detail.context()).filteredOn(ModeratedMessageResource::reported)
                .extracting(ModeratedMessageResource::id)
                .containsExactly(101L);
    }

    @Test
    void detailAsksForAtMostFiveMessagesOnEachSide() {
        when(reports.findById(9L)).thenReturn(Optional.of(report(ReportStatus.NEW)));
        when(reports.findByMessageId(101L)).thenReturn(List.of(report(ReportStatus.NEW)));
        when(messages.findByConversationIdAndIdLessThanOrderByIdDesc(eq(42L), eq(101L), any()))
                .thenReturn(List.of());
        when(messages.findByConversationIdAndIdGreaterThanOrderByIdAsc(eq(42L), eq(101L), any()))
                .thenReturn(List.of());

        service.detail(9L);

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(messages)
                .findByConversationIdAndIdLessThanOrderByIdDesc(eq(42L), eq(101L), pageable.capture());
        assertThat(pageable.getValue().getPageSize()).isEqualTo(ModerationService.CONTEXT_RADIUS);
        assertThat(ModerationService.CONTEXT_RADIUS).isEqualTo(5);
    }

    @Test
    void detailShowsWhetherAContextMessageCarriesAPhotoWithoutLeakingIt() {
        when(reports.findById(9L)).thenReturn(Optional.of(report(ReportStatus.NEW)));
        when(reports.findByMessageId(101L)).thenReturn(List.of(report(ReportStatus.NEW)));
        when(messages.findByConversationIdAndIdLessThanOrderByIdDesc(eq(42L), eq(101L), any()))
                .thenReturn(
                        List.of(
                                Message.builder()
                                        .id(100L)
                                        .conversationId(42L)
                                        .senderId(3L)
                                        .kind(MessageKind.IMAGE)
                                        .createdAt(NOW)
                                        .build()));
        when(messages.findByConversationIdAndIdGreaterThanOrderByIdAsc(eq(42L), eq(101L), any()))
                .thenReturn(List.of());

        AdminReportDetailResource detail = service.detail(9L);

        assertThat(detail.context())
                .filteredOn(m -> m.id().equals(100L))
                .singleElement()
                .satisfies(m -> {
                    assertThat(m.hasPhoto()).isTrue();
                    assertThat(m.body()).isNull();
                });
    }

    @Test
    void anUnknownReportIsNotFound() {
        when(reports.findById(9L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.detail(9L)).isInstanceOf(EntityNotFoundException.class);
    }

    /**
     * Review Focus #1. Thứ cần ghim ở đây là **sự vắng mặt** của một khả năng, nên test soi chính
     * bề mặt API: không method nào của service nhận một conversationId, và không đường dẫn nào của
     * controller admin nhắc tới conversation. Thêm một endpoint như vậy là phá spec §8.3, và test
     * này sẽ đỏ ngay.
     */
    @Test
    void adminCannotReachAThreadThatHasNoReport() {
        assertThat(ModerationServiceInterface.class.getDeclaredMethods())
                .describedAs("cửa vào duy nhất của admin là reportId / messageId")
                .noneMatch(m -> m.getName().toLowerCase(Locale.ROOT).contains("conversation"));

        String base =
                AdminMessageReportController.class
                        .getAnnotation(RequestMapping.class)
                        .value()[0];
        assertThat(base).isEqualTo("/api/v1/admin/message-reports");
        assertThat(AdminMessageReportController.class.getDeclaredMethods())
                .allSatisfy(
                        m -> {
                            GetMapping get = m.getAnnotation(GetMapping.class);
                            PatchMapping patch = m.getAnnotation(PatchMapping.class);
                            String path =
                                    get != null && get.value().length > 0
                                            ? get.value()[0]
                                            : patch != null && patch.value().length > 0
                                                    ? patch.value()[0]
                                                    : "";
                            assertThat(path.toLowerCase(Locale.ROOT)).doesNotContain("conversation");
                        });
    }

    private static Message textMessageWithId(Long id, String body) {
        return Message.builder()
                .id(id)
                .conversationId(42L)
                .senderId(3L)
                .kind(MessageKind.TEXT)
                .body(body)
                .createdAt(NOW)
                .build();
    }
```

Thêm import: `eq` từ `org.mockito.ArgumentMatchers`, `assertThatThrownBy`, `EntityNotFoundException`, `java.util.Locale`, `AdminReportDetailResource`, `ModeratedMessageResource`, `ModerationServiceInterface`, `AdminMessageReportController`, và `org.springframework.web.bind.annotation.{RequestMapping, GetMapping, PatchMapping}`.

> Test này soi annotation chứ không soi tên tham số, nên **không** phụ thuộc vào cờ biên dịch `-parameters`. Nó phải được viết **sau** khi Task 5 thêm endpoint `dismiss` vào controller, nếu không `PatchMapping` chưa có method nào để duyệt — viết ở Task 4 vẫn đúng vì nó chỉ khẳng định *mọi* method đều không nhắc conversation, và lúc đó controller mới có `list` + `detail`.

- [ ] **Bước 6: Chạy để chắc chắn đỏ**

```bash
docker compose -p market-link-chat3b -f docker-compose.yml -f ../compose.chat3b-override.yml exec -T backend ./mvnw -B test -Dtest=ModerationServiceTest
```

Expected: FAIL — `cannot find symbol: method detail(java.lang.Long)`.

- [ ] **Bước 7: Viết hai resource**

```java
package com.techx.intervue.modules.conversation.resources;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.techx.intervue.modules.conversation.enums.MessageKind;
import java.time.Instant;

/**
 * Một tin trong cửa sổ ngữ cảnh của admin. Ảnh chỉ hiện bằng cờ `hasPhoto`; byte ảnh đi qua
 * GET /api/v1/attachments/{id}, nơi kiểm quyền riêng.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ModeratedMessageResource(
        Long id,
        Long senderId,
        String senderName,
        MessageKind kind,
        String body,
        boolean hasPhoto,
        boolean reported,
        boolean hidden,
        Instant createdAt) {}
```

```java
package com.techx.intervue.modules.conversation.resources;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.techx.intervue.modules.conversation.enums.ReportReason;
import com.techx.intervue.modules.conversation.enums.ReportStatus;
import java.time.Instant;
import java.util.List;

/**
 * Spec §8.3. `context` là tin bị báo cáo cùng tối đa 5 tin mỗi bên, xếp theo id tăng dần. Đây là
 * TOÀN BỘ những gì admin đọc được trong thread đó.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record AdminReportDetailResource(
        Long reportId,
        Long messageId,
        Long conversationId,
        ReportReason reason,
        String note,
        ReportStatus status,
        String reporterName,
        Instant reportedAt,
        List<ModeratedMessageResource> context) {}
```

- [ ] **Bước 8: Viết `detail` trong `ModerationService`**

Thêm vào interface:

```java
    /** Spec §8.3: tin bị báo cáo + tối đa 5 tin mỗi bên. Cửa vào duy nhất là reportId. */
    AdminReportDetailResource detail(Long reportId);
```

Thêm vào service:

```java
    /** Spec §8.3: "tối đa 5 tin liền trước và 5 tin liền sau". */
    static final int CONTEXT_RADIUS = 5;

    @Override
    @Transactional(readOnly = true)
    public AdminReportDetailResource detail(Long reportId) {
        MessageReport report =
                reports.findById(reportId)
                        .orElseThrow(() -> new EntityNotFoundException("Report not found."));
        Message reported =
                messages.findById(report.getMessageId())
                        .orElseThrow(() -> new EntityNotFoundException("Message not found."));

        Pageable window = PageRequest.of(0, CONTEXT_RADIUS);
        List<Message> before =
                new ArrayList<>(
                        messages.findByConversationIdAndIdLessThanOrderByIdDesc(
                                reported.getConversationId(), reported.getId(), window));
        Collections.reverse(before); // truy vấn trả mới→cũ, hiển thị thì cũ→mới
        List<Message> after =
                messages.findByConversationIdAndIdGreaterThanOrderByIdAsc(
                        reported.getConversationId(), reported.getId(), window);

        List<Message> window2 = new ArrayList<>(before);
        window2.add(reported);
        window2.addAll(after);

        List<ModeratedMessageResource> context =
                window2.stream().map(m -> toModerated(m, m.getId().equals(reported.getId()))).toList();

        return new AdminReportDetailResource(
                report.getId(),
                report.getMessageId(),
                reported.getConversationId(),
                report.getReason(),
                report.getNote(),
                report.getStatus(),
                nameOf(report.getReportedBy()),
                report.getCreatedAt(),
                context);
    }

    /**
     * `reported` đúng cho tin trung tâm, và cũng đúng cho tin ngữ cảnh nào đang có báo cáo riêng —
     * Task 7 dùng cờ này để quyết cho admin xem ảnh hay không.
     */
    private ModeratedMessageResource toModerated(Message m, boolean isCentre) {
        boolean hasPhoto = m.getKind() == MessageKind.IMAGE;
        return new ModeratedMessageResource(
                m.getId(),
                m.getSenderId(),
                nameOf(m.getSenderId()),
                m.getKind(),
                m.getBody(),
                hasPhoto,
                isCentre || reports.existsByMessageId(m.getId()),
                m.isHidden(),
                m.getCreatedAt());
    }
```

Thêm import: `java.util.ArrayList`, `java.util.Collections`, `jakarta.persistence.EntityNotFoundException`, `AdminReportDetailResource`, `ModeratedMessageResource`, `MessageReport`.

- [ ] **Bước 9: Thêm endpoint vào controller**

```java
    @GetMapping("/{id}")
    public ResponseEntity<ApiResource<AdminReportDetailResource>> detail(@PathVariable Long id) {
        return ok(moderation.detail(id), "Report loaded.");
    }
```

Thêm import `AdminReportDetailResource` và `org.springframework.web.bind.annotation.PathVariable`.

- [ ] **Bước 10: Chạy cho xanh**

```bash
docker compose -p market-link-chat3b -f docker-compose.yml -f ../compose.chat3b-override.yml exec -T backend ./mvnw -B test -Dtest=ModerationServiceTest,MessageRepositoryContextTest
```

Expected: PASS.

- [ ] **Bước 11: Commit**

```bash
make be-format
git add -A backend/src
git commit -m "feat(FR-116): show an admin the reported message and five on each side

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Ẩn tin và bỏ qua báo cáo

**Files:**
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/controllers/AdminMessageController.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/conversation/services/interfaces/ModerationServiceInterface.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/conversation/services/impl/ModerationService.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/conversation/controllers/AdminMessageReportController.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/conversation/controllers/ConversationExceptionHandler.java`
- Modify: `backend/src/test/java/com/techx/intervue/modules/conversation/controllers/ConversationExceptionHandlerScopeTest.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/conversation/services/impl/ModerationServiceTest.java`

**Interfaces:**
- Produces:
  - `ModeratedMessageResource ModerationServiceInterface.hide(Long adminId, Long messageId)`.
  - `MessageReportResource ModerationServiceInterface.dismiss(Long adminId, Long reportId)`.

**Vì sao có `dismiss` dù bảng API của spec §6.1 không liệt kê:** hàng đợi lọc theo `status=new`. Không có cách chuyển một báo cáo sang `reviewed` thì mọi báo cáo admin xem rồi quyết định **không** ẩn sẽ nằm lại `new` mãi mãi, và hàng đợi trở nên vô dụng sau vài ngày. Đây là bổ sung có chủ ý so với bảng trong spec; ghi vào ledger và vào mô tả PR.

**Luật:**

| Tình huống | Kết quả |
|---|---|
| Ẩn một tin đang hiện | 200, ghi `hiddenAt` + `hiddenBy`, mọi báo cáo của tin đó chuyển `actioned` |
| Ẩn một tin **đã bị ẩn** | 200, **không ghi đè** `hiddenBy`/`hiddenAt` của admin trước (Review Focus #4) |
| Ẩn một tin không tồn tại | 404 |
| Ẩn một tin **chưa ai báo cáo** | **403** — quyền của admin bắt nguồn từ báo cáo (spec §8.3) |
| Bỏ qua một báo cáo `new` | 200, chuyển `reviewed` |
| Bỏ qua một báo cáo đã xử lý | 200, giữ nguyên (`markHandledBy` tự bỏ qua) |

- [ ] **Bước 1: Viết test đỏ**

Thêm vào `ModerationServiceTest`:

```java
    @Test
    void hidingAMessageRecordsWhoDidItAndActionsItsReports() {
        Message message = textMessageWithId(101L, "Send me a deposit first");
        MessageReport open = report(ReportStatus.NEW);
        when(messages.findById(101L)).thenReturn(Optional.of(message));
        when(reports.existsByMessageId(101L)).thenReturn(true);
        when(reports.findByMessageId(101L)).thenReturn(List.of(open));

        ModeratedMessageResource hidden = service.hide(55L, 101L);

        assertThat(hidden.hidden()).isTrue();
        assertThat(message.getHiddenBy()).isEqualTo(55L);
        assertThat(message.getHiddenAt()).isEqualTo(NOW);
        assertThat(open.getStatus()).isEqualTo(ReportStatus.ACTIONED);
        assertThat(open.getReviewedBy()).isEqualTo(55L);
        verify(messages).save(message);
    }

    /** Review Focus #4: hai admin cùng xử lý một hàng đợi. */
    @Test
    void hidingAnAlreadyHiddenMessageKeepsTheFirstAdminOnRecord() {
        Message message = textMessageWithId(101L, "Send me a deposit first");
        message.setHiddenAt(Instant.parse("2026-09-26T05:00:00Z"));
        message.setHiddenBy(11L);
        when(messages.findById(101L)).thenReturn(Optional.of(message));
        when(reports.existsByMessageId(101L)).thenReturn(true);
        when(reports.findByMessageId(101L)).thenReturn(List.of());

        service.hide(55L, 101L);

        assertThat(message.getHiddenBy()).isEqualTo(11L);
        assertThat(message.getHiddenAt()).isEqualTo(Instant.parse("2026-09-26T05:00:00Z"));
    }

    /** Spec §8.3: không có báo cáo thì admin không có việc gì ở đây. */
    @Test
    void anAdminCannotHideAMessageNobodyReported() {
        when(messages.findById(101L)).thenReturn(Optional.of(textMessageWithId(101L, "fine")));
        when(reports.existsByMessageId(101L)).thenReturn(false);

        assertThatThrownBy(() -> service.hide(55L, 101L))
                .isInstanceOf(ModerationOutOfScopeException.class);
        verify(messages, never()).save(any(Message.class));
    }

    @Test
    void hidingAnUnknownMessageIsNotFound() {
        when(messages.findById(101L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.hide(55L, 101L)).isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void dismissingAReportMarksItReviewedWithoutTouchingTheMessage() {
        MessageReport open = report(ReportStatus.NEW);
        when(reports.findById(9L)).thenReturn(Optional.of(open));

        MessageReportResource result = service.dismiss(55L, 9L);

        assertThat(result.status()).isEqualTo(ReportStatus.REVIEWED);
        assertThat(open.getReviewedBy()).isEqualTo(55L);
        verify(messages, never()).save(any(Message.class));
    }

    @Test
    void dismissingAnAlreadyHandledReportChangesNothing() {
        MessageReport done = report(ReportStatus.ACTIONED);
        done.setReviewedBy(11L);
        when(reports.findById(9L)).thenReturn(Optional.of(done));

        service.dismiss(55L, 9L);

        assertThat(done.getStatus()).isEqualTo(ReportStatus.ACTIONED);
        assertThat(done.getReviewedBy()).isEqualTo(11L);
    }
```

Thêm import `MessageReportResource`, `ModerationOutOfScopeException`, `never`.

- [ ] **Bước 2: Chạy để chắc chắn đỏ**

```bash
docker compose -p market-link-chat3b -f docker-compose.yml -f ../compose.chat3b-override.yml exec -T backend ./mvnw -B test -Dtest=ModerationServiceTest
```

Expected: FAIL — `cannot find symbol: class ModerationOutOfScopeException`.

- [ ] **Bước 3: Viết exception**

```java
package com.techx.intervue.modules.conversation.exceptions;

/**
 * Spec §8.3: quyền đọc và ẩn của admin bắt nguồn từ một báo cáo, không từ vai. Tin chưa ai báo cáo
 * thì nằm ngoài tầm với — 403, và thông điệp nói thẳng ranh giới đó để chính admin biết.
 */
public class ModerationOutOfScopeException extends RuntimeException {
    public ModerationOutOfScopeException() {
        super("Admins can only act on messages that have been reported.");
    }
}
```

Thêm handler vào `ConversationExceptionHandler`:

```java
    /** Spec §8.3 — 403. */
    @ExceptionHandler(ModerationOutOfScopeException.class)
    ResponseEntity<ApiResource<Void>> outOfScope(ModerationOutOfScopeException e) {
        return error(HttpStatus.FORBIDDEN, "MODERATION_OUT_OF_SCOPE", e.getMessage(), List.of());
    }
```

- [ ] **Bước 4: Viết `hide` và `dismiss`**

Thêm vào interface:

```java
    /** Ẩn mềm; chỉ được phép khi tin đã có báo cáo (spec §8.3). Idempotent. */
    ModeratedMessageResource hide(Long adminId, Long messageId);

    /** Admin xem rồi quyết định không ẩn — báo cáo chuyển sang reviewed để rời hàng đợi. */
    MessageReportResource dismiss(Long adminId, Long reportId);
```

Thêm vào service:

```java
    @Override
    @Transactional
    public ModeratedMessageResource hide(Long adminId, Long messageId) {
        Message message =
                messages.findById(messageId)
                        .orElseThrow(() -> new EntityNotFoundException("Message not found."));
        if (!reports.existsByMessageId(messageId)) {
            throw new ModerationOutOfScopeException();
        }

        Instant now = clock.instant();
        // Idempotent: hai admin cùng xử lý một hàng đợi thì người ẩn TRƯỚC là người chịu trách
        // nhiệm; ghi đè sẽ xoá mất dấu vết kiểm toán đó.
        if (!message.isHidden()) {
            message.setHiddenAt(now);
            message.setHiddenBy(adminId);
            messages.save(message);
        }
        reports.findByMessageId(messageId)
                .forEach(r -> r.markHandledBy(adminId, ReportStatus.ACTIONED, now));

        return toModerated(message, true);
    }

    @Override
    @Transactional
    public MessageReportResource dismiss(Long adminId, Long reportId) {
        MessageReport report =
                reports.findById(reportId)
                        .orElseThrow(() -> new EntityNotFoundException("Report not found."));
        report.markHandledBy(adminId, ReportStatus.REVIEWED, clock.instant());
        return MessageReportResource.from(report);
    }
```

`markHandledBy` tự bỏ qua khi `status != NEW`, nên cả hai method đều an toàn khi gọi lại. Các entity đang trong persistence context nên JPA tự flush thay đổi của `MessageReport`; `messages.save(...)` gọi tường minh để test khẳng định được.

Thêm import: `java.time.Instant`, `ModerationOutOfScopeException`, `MessageReportResource`.

- [ ] **Bước 5: Viết controller ẩn tin**

```java
package com.techx.intervue.modules.conversation.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.conversation.resources.ModeratedMessageResource;
import com.techx.intervue.modules.conversation.services.interfaces.ModerationServiceInterface;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import com.techx.intervue.resources.ApiResource;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * FR-116 — chỉ Admin. Ẩn mềm, không bao giờ xoá cứng (spec §8.5): xoá được nghĩa là xoá được bằng
 * chứng lừa đảo. Không có endpoint bỏ ẩn — chưa ai cần, và thêm nó là thêm một trạng thái phải
 * kiểm ở mọi chỗ.
 */
@RestController
@RequestMapping("/api/v1/admin/messages")
@PreAuthorize("hasRole('ADMIN')")
@AllArgsConstructor
public class AdminMessageController extends BaseController {

    private final ModerationServiceInterface moderation;

    @PatchMapping("/{id}/hide")
    public ResponseEntity<ApiResource<ModeratedMessageResource>> hide(
            @PathVariable Long id, @AuthenticationPrincipal CustomUserDetails admin) {
        return ok(moderation.hide(admin.getId(), id), "Message hidden.");
    }
}
```

Thêm endpoint `dismiss` vào `AdminMessageReportController`:

```java
    @PatchMapping("/{id}/dismiss")
    public ResponseEntity<ApiResource<MessageReportResource>> dismiss(
            @PathVariable Long id, @AuthenticationPrincipal CustomUserDetails admin) {
        return ok(moderation.dismiss(admin.getId(), id), "Report dismissed.");
    }
```

Thêm import `PatchMapping`, `AuthenticationPrincipal`, `CustomUserDetails`, `MessageReportResource`.

- [ ] **Bước 6: Nối `AdminMessageController` vào handler và test phạm vi**

Thêm `AdminMessageController.class` vào `assignableTypes` của `ConversationExceptionHandler` (sửa tay) và vào `ConversationExceptionHandlerScopeTest`.

- [ ] **Bước 7: Chạy cho xanh**

```bash
docker compose -p market-link-chat3b -f docker-compose.yml -f ../compose.chat3b-override.yml exec -T backend ./mvnw -B test -Dtest=ModerationServiceTest,ConversationExceptionHandlerScopeTest
```

Expected: PASS.

- [ ] **Bước 8: Commit**

```bash
make be-format
git add -A backend/src
git commit -m "feat(FR-116): let an admin hide a reported message or dismiss the report

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Sự kiện realtime "tin đã bị ẩn"

Không có sự kiện này thì tin bị ẩn vẫn nằm trên màn hình của hai người cho tới khi họ tải lại trang — và người bị tố vẫn tưởng tin của mình còn đó.

**Files:**
- Modify: `backend/src/main/java/com/techx/intervue/modules/conversation/resources/ConversationEvent.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/conversation/services/interfaces/ChatEventPublisherInterface.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/conversation/realtime/StompChatEventPublisher.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/conversation/services/impl/ModerationService.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/conversation/realtime/StompChatEventPublisherTest.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/conversation/services/impl/ModerationServiceTest.java`

**Interfaces:**
- Consumes: `StompChatEventPublisher.CONVERSATIONS = "/topic/conversations"` (đã có), `TransactionHelper.afterCommit(Runnable)` (đã có).
- Produces:
  - `ConversationEvent` thêm trường `Long messageId` và hằng `HIDDEN = "hidden"`.
  - `void ChatEventPublisherInterface.messageHidden(Conversation conversation, Long messageId)`.

**Vì sao dùng lại `/topic/conversations` chứ không mở destination mới:** client đã đăng ký sẵn kênh đó cho `updated`/`read` và đã có nhánh xử lý theo `type`. Thêm một `type` là thêm một nhánh `switch`; thêm một destination là thêm một vòng đăng ký, một chỗ để quên, và một hàng đợi nữa trên broker.

- [ ] **Bước 1: Viết test đỏ**

Thêm vào `StompChatEventPublisherTest`:

```java
    @Test
    void bothMembersAreToldWhenAMessageIsHidden() {
        Conversation thread = Conversation.between(3L, 7L);
        thread.setId(42L);

        publisher.messageHidden(thread, 101L);

        ArgumentCaptor<ConversationEvent> event = ArgumentCaptor.forClass(ConversationEvent.class);
        verify(template)
                .convertAndSendToUser(
                        eq("3"), eq(StompChatEventPublisher.CONVERSATIONS), event.capture());
        verify(template)
                .convertAndSendToUser(
                        eq("7"), eq(StompChatEventPublisher.CONVERSATIONS), any(ConversationEvent.class));
        assertThat(event.getValue().type()).isEqualTo(ConversationEvent.HIDDEN);
        assertThat(event.getValue().conversationId()).isEqualTo(42L);
        assertThat(event.getValue().messageId()).isEqualTo(101L);
        // Sự kiện "ẩn" không mang unreadCount: client không được lấy nó làm cớ đổi badge
        assertThat(event.getValue().unreadCount()).isNull();
    }
```

Chữ ký mock của `template` và cách dựng `publisher` lấy y theo các test đang có trong file — mở file ra đọc trước khi viết.

Thêm vào `ModerationServiceTest`:

```java
    @Test
    void hidingAMessagePublishesItToBothMembers() {
        Message message = textMessageWithId(101L, "Send me a deposit first");
        Conversation thread = Conversation.between(3L, 7L);
        thread.setId(42L);
        when(messages.findById(101L)).thenReturn(Optional.of(message));
        when(conversations.findById(42L)).thenReturn(Optional.of(thread));
        when(reports.existsByMessageId(101L)).thenReturn(true);
        when(reports.findByMessageId(101L)).thenReturn(List.of());

        service.hide(55L, 101L);

        verify(events).messageHidden(thread, 101L);
    }

    @Test
    void hidingAnAlreadyHiddenMessageDoesNotPublishAgain() {
        Message message = textMessageWithId(101L, "Send me a deposit first");
        message.setHiddenAt(Instant.parse("2026-09-26T05:00:00Z"));
        message.setHiddenBy(11L);
        Conversation thread = Conversation.between(3L, 7L);
        thread.setId(42L);
        when(messages.findById(101L)).thenReturn(Optional.of(message));
        when(conversations.findById(42L)).thenReturn(Optional.of(thread));
        when(reports.existsByMessageId(101L)).thenReturn(true);
        when(reports.findByMessageId(101L)).thenReturn(List.of());

        service.hide(55L, 101L);

        verify(events, never()).messageHidden(any(), any());
    }
```

`ModerationService` giờ nhận thêm hai dependency — `ConversationRepository conversations` và `ChatEventPublisherInterface events`. Đặt chúng **cuối** danh sách field, và sửa `setUp` của `ModerationServiceTest` thành:

```java
        service =
                new ModerationService(
                        reports, messages, users, Clock.fixed(NOW, ZoneId.of("UTC")), conversations, events);
```

với `conversations = mock(ConversationRepository.class);` và `events = mock(ChatEventPublisherInterface.class);`.

- [ ] **Bước 2: Chạy để chắc chắn đỏ**

```bash
docker compose -p market-link-chat3b -f docker-compose.yml -f ../compose.chat3b-override.yml exec -T backend ./mvnw -B test -Dtest=StompChatEventPublisherTest,ModerationServiceTest
```

Expected: FAIL — `cannot find symbol: method messageHidden`.

- [ ] **Bước 3: Mở rộng `ConversationEvent`**

```java
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ConversationEvent(
        String type,
        Long conversationId,
        Long messageId,
        String lastMessageText,
        Instant lastMessageAt,
        Long unreadCount,
        Long readerId,
        Instant readAt) {
    public static final String UPDATED = "updated";
    public static final String READ = "read";

    /** Admin đã ẩn một tin; client bỏ nó khỏi thread mà không cần tải lại (FR-116). */
    public static final String HIDDEN = "hidden";
}
```

`@Builder` nên thêm một trường vào giữa không phá chỗ gọi nào. Chạy `grep -rn 'ConversationEvent.builder()' backend/src` để xác nhận mọi chỗ đều dùng builder.

- [ ] **Bước 4: Mở rộng interface và publisher**

Thêm vào `ChatEventPublisherInterface`:

```java
    /** FR-116: admin ẩn một tin; cả hai người trong thread bỏ nó khỏi màn hình ngay. */
    void messageHidden(Conversation conversation, Long messageId);
```

Thêm vào `StompChatEventPublisher`:

```java
    @Override
    public void messageHidden(Conversation conversation, Long messageId) {
        ConversationEvent event =
                ConversationEvent.builder()
                        .type(ConversationEvent.HIDDEN)
                        .conversationId(conversation.getId())
                        .messageId(messageId)
                        .build();
        send(conversation.getUserAId(), CONVERSATIONS, event);
        send(conversation.getUserBId(), CONVERSATIONS, event);
    }
```

- [ ] **Bước 5: Phát sự kiện từ `ModerationService.hide`**

Trong nhánh `if (!message.isHidden())`, sau `messages.save(message)`:

```java
            // Chỉ phát khi đã commit, giống MessageService: không phát một thay đổi có thể bị rollback
            Conversation thread =
                    conversations
                            .findById(message.getConversationId())
                            .orElseThrow(() -> new EntityNotFoundException("Conversation not found."));
            TransactionHelper.afterCommit(() -> events.messageHidden(thread, messageId));
```

Thêm import `Conversation`, `ConversationRepository`, `ChatEventPublisherInterface`, `TransactionHelper`.

- [ ] **Bước 6: Chạy cho xanh**

```bash
docker compose -p market-link-chat3b -f docker-compose.yml -f ../compose.chat3b-override.yml exec -T backend ./mvnw -B test -Dtest=StompChatEventPublisherTest,ModerationServiceTest
```

Expected: PASS. Nếu `ChatStompIntegrationTest` hoặc `MessageServicePublishTimingTest` đỏ vì interface có thêm method, đó là do chúng mock interface — Mockito tự trả mặc định nên không cần sửa; đỏ thì đọc kỹ thông báo thật.

- [ ] **Bước 7: Commit**

```bash
make be-format
git add -A backend/src
git commit -m "feat(FR-116): tell both members in real time when a message is hidden

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Admin xem được ảnh của tin bị báo cáo

**Quyết định của LEAD (26/09/2026):** admin xem được ảnh của tin **đã bị báo cáo**. Không thế thì báo cáo một bức ảnh khiêu dâm hay ảnh lừa đảo là vô dụng — admin nhìn thấy một ô trống rồi phải quyết định mù. **Ảnh của tin ngữ cảnh thì không**: ±5 tin là để hiểu bối cảnh, không phải đối tượng bị tố.

**Files:**
- Modify: `backend/src/main/java/com/techx/intervue/modules/conversation/services/impl/AttachmentService.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/conversation/services/impl/AttachmentServiceTest.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/conversation/controllers/AttachmentDownloadControllerTest.java`

**Interfaces:**
- Consumes: `MessageReportRepository.existsByMessageId(Long)` (Task 1), `CustomUserDetails.getAuthorities()`.
- Produces: `AttachmentService` constructor nhận thêm `MessageReportRepository reports` ở **cuối**: `(attachments, storage, rateLimiter, maxBytes, messages, lookup, reports)`.

**Quy tắc mới trong `AttachmentService.read`:**

| Người xem | Ảnh chưa gắn tin | Ảnh gắn vào tin thường | Ảnh gắn vào tin **đã bị báo cáo** | Ảnh gắn vào tin đã bị ẩn |
|---|---|---|---|---|
| Người upload | 200 | 200 | 200 | 404 |
| Thành viên kia | 403 | 200 | 200 | 404 |
| Người ngoài | 403 | 403 | 403 | 404 |
| **Admin** | 403 | **403** | **200** | **200** (ẩn rồi vẫn xem lại được) |

Admin **không** đi qua `lookup.requireMember` — họ không phải thành viên. Đường của họ là một nhánh riêng, và mỗi lần đi qua đều ghi log.

- [ ] **Bước 1: Viết test đỏ**

Thêm vào `AttachmentServiceTest` (khai thêm `MessageReportRepository reports = mock(...)` và truyền vào constructor ở `setUp`):

```java
    /** Quyết định LEAD 26/09: admin xem được ảnh của tin đã bị báo cáo. */
    @Test
    void anAdminCanSeeThePhotoOfAReportedMessage() {
        MessageAttachment upload = stored(55L, 7L, 101L);
        when(attachments.findById(55L)).thenReturn(Optional.of(upload));
        when(messages.findById(101L)).thenReturn(Optional.of(messageIn(101L, 42L, null)));
        when(reports.existsByMessageId(101L)).thenReturn(true);
        when(storage.find(AttachmentService.FOLDER, upload.getStorageKey()))
                .thenReturn(Optional.of(fileOnDisk));

        assertThat(service.readAsAdmin(55L, 55L).mime()).isEqualTo("image/jpeg");
        verify(lookup, never()).requireMember(any(), any());
    }

    /** Review Focus #2: ±5 tin là ngữ cảnh, không phải đối tượng bị tố. */
    @Test
    void adminSeesThePhotoOfTheReportedMessageButNotOfItsNeighbours() {
        MessageAttachment neighbour = stored(56L, 7L, 102L);
        when(attachments.findById(56L)).thenReturn(Optional.of(neighbour));
        when(messages.findById(102L)).thenReturn(Optional.of(messageIn(102L, 42L, null)));
        when(reports.existsByMessageId(102L)).thenReturn(false);

        assertThatThrownBy(() -> service.readAsAdmin(55L, 56L))
                .isInstanceOf(ModerationOutOfScopeException.class);
        verify(storage, never()).find(anyString(), anyString());
    }

    /** Admin vừa ẩn tin xong vẫn phải xem lại được ảnh để kiểm chứng quyết định của mình. */
    @Test
    void anAdminStillSeesThePhotoAfterHidingTheMessage() {
        MessageAttachment upload = stored(55L, 7L, 101L);
        when(attachments.findById(55L)).thenReturn(Optional.of(upload));
        when(messages.findById(101L))
                .thenReturn(Optional.of(messageIn(101L, 42L, Instant.parse("2026-09-26T06:00:00Z"))));
        when(reports.existsByMessageId(101L)).thenReturn(true);
        when(storage.find(AttachmentService.FOLDER, upload.getStorageKey()))
                .thenReturn(Optional.of(fileOnDisk));

        assertThat(service.readAsAdmin(55L, 55L).mime()).isEqualTo("image/jpeg");
    }

    @Test
    void anAdminCannotSeeAnUploadThatIsNotOnAnyMessage() {
        when(attachments.findById(55L)).thenReturn(Optional.of(stored(55L, 7L, null)));

        assertThatThrownBy(() -> service.readAsAdmin(55L, 55L))
                .isInstanceOf(ModerationOutOfScopeException.class);
    }

    /** Người dùng thường không được hưởng nhánh admin dù tin có bị báo cáo. */
    @Test
    void aReportDoesNotOpenThePhotoToEveryone() {
        when(attachments.findById(55L)).thenReturn(Optional.of(stored(55L, 7L, 101L)));
        when(messages.findById(101L)).thenReturn(Optional.of(messageIn(101L, 42L, null)));
        Mockito.doThrow(new ConversationAccessDeniedException())
                .when(lookup)
                .requireMember(99L, 42L);

        assertThatThrownBy(() -> service.read(99L, 55L))
                .isInstanceOf(ConversationAccessDeniedException.class);
    }
```

- [ ] **Bước 2: Chạy để chắc chắn đỏ**

```bash
docker compose -p market-link-chat3b -f docker-compose.yml -f ../compose.chat3b-override.yml exec -T backend ./mvnw -B test -Dtest=AttachmentServiceTest
```

Expected: FAIL — `cannot find symbol: method readAsAdmin`.

- [ ] **Bước 3: Viết `readAsAdmin`**

Thêm vào `AttachmentServiceInterface`:

```java
    /**
     * Spec §8.3 + quyết định LEAD 26/09: admin xem được ảnh của tin ĐÃ bị báo cáo, và chỉ tin đó —
     * không phải ảnh của ±5 tin ngữ cảnh. Không đi qua kiểm tư cách thành viên vì admin không phải
     * thành viên; đây là một con đường riêng, hẹp hơn.
     */
    StoredFile readAsAdmin(Long adminId, Long attachmentId);
```

Thêm vào `AttachmentService` (và thêm `MessageReportRepository reports` vào cuối constructor):

```java
    @Override
    @Transactional(readOnly = true)
    public StoredFile readAsAdmin(Long adminId, Long attachmentId) {
        MessageAttachment attachment =
                attachments
                        .findById(attachmentId)
                        .orElseThrow(() -> new EntityNotFoundException("Photo not found."));
        if (attachment.getMessageId() == null) {
            // Ảnh chưa gắn tin nào thì chưa ai báo cáo được; không có việc gì cho admin ở đây
            throw new ModerationOutOfScopeException();
        }
        Message message =
                messages.findById(attachment.getMessageId())
                        .orElseThrow(() -> new EntityNotFoundException("Photo not found."));
        if (!reports.existsByMessageId(message.getId())) {
            throw new ModerationOutOfScopeException();
        }
        // Khác người dùng thường: tin bị ẩn KHÔNG chặn admin — họ phải xem lại được quyết định của
        // chính mình.

        Path file =
                storage.find(FOLDER, attachment.getStorageKey())
                        .orElseThrow(() -> new EntityNotFoundException("Photo not found."));
        // Mọi lần admin mở một bức ảnh riêng tư đều để lại dấu vết
        log.info(
                "Admin {} opened photo {} on reported message {}",
                adminId,
                attachmentId,
                message.getId());
        return new StoredFile(
                new FileSystemResource(file), attachment.getMime(), attachment.getSizeBytes());
    }
```

Thêm `@Slf4j` lên class `AttachmentService` và import `lombok.extern.slf4j.Slf4j`, `ModerationOutOfScopeException`.

- [ ] **Bước 4: Định tuyến trong controller theo vai**

Sửa `AttachmentDownloadController.download`:

```java
    @GetMapping("/{id}")
    public ResponseEntity<Resource> download(
            @PathVariable Long id, @AuthenticationPrincipal CustomUserDetails me) {
        // Admin đi con đường riêng (spec §8.3): hẹp hơn, chỉ mở với tin đã bị báo cáo, và có log.
        AttachmentServiceInterface.StoredFile file =
                isAdmin(me)
                        ? attachmentService.readAsAdmin(me.getId(), id)
                        : attachmentService.read(me.getId(), id);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(file.mime()))
                .contentLength(file.sizeBytes())
                .cacheControl(CacheControl.maxAge(Duration.ofDays(1)).cachePrivate())
                .header("Content-Disposition", "inline")
                .header("X-Content-Type-Options", "nosniff")
                .body(file.body());
    }

    private static boolean isAdmin(CustomUserDetails me) {
        return me.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
    }
```

> Hệ quả có chủ ý: một admin **cũng** là khách hàng trong một thread nào đó sẽ đi nhánh admin và **không** xem được ảnh riêng của chính mình trong thread đó nếu tin chưa bị báo cáo. Đây là đánh đổi đúng hướng — ranh giới của admin hẹp hơn, không rộng hơn. Ghi vào ledger.

- [ ] **Bước 5: Thêm test qua HTTP thật**

Thêm vào `AttachmentDownloadControllerTest` (file này chạy `@SpringBootTest(RANDOM_PORT)` + `java.net.http.HttpClient` + JWT thật; Spring Boot 4 không còn `@AutoConfigureMockMvc` lẫn `TestRestTemplate`):

```java
    @Autowired MessageReportRepository reports;

    @Test
    void anAdminGetsThePhotoOnceTheMessageIsReported() throws Exception {
        User admin = newUser(RoleType.ADMIN);
        try {
            assertThat(download(url(), admin).statusCode()).isEqualTo(403);

            reports.saveAndFlush(
                    MessageReport.builder()
                            .messageId(imageMessage.getId())
                            .reportedBy(recipient.getId())
                            .reason(ReportReason.ABUSE)
                            .build());

            assertThat(downloadBytes(url(), admin).statusCode()).isEqualTo(200);
        } finally {
            reports.deleteAll(reports.findByMessageId(imageMessage.getId()));
            users.deleteById(admin.getId());
        }
    }
```

`newUser(RoleType.ADMIN)` nạp phiên vào `UserSessionCache` với role ADMIN, nên `ROLE_ADMIN` có trong authorities của token — kiểm lại helper `newUser` trong file, nó đã làm việc đó từ Plan 3A.

- [ ] **Bước 6: Chạy cho xanh**

```bash
docker compose -p market-link-chat3b -f docker-compose.yml -f ../compose.chat3b-override.yml exec -T backend ./mvnw -B test -Dtest=AttachmentServiceTest,AttachmentDownloadControllerTest
```

Expected: PASS.

- [ ] **Bước 7: Commit**

```bash
make be-format
git add -A backend/src
git commit -m "feat(FR-116): let an admin open the photo on a reported message only

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: Rate limit và null-guard cho frame `/app/typing`

Gộp hai việc hoãn từ review Plan 2: **"TypingController null conversationId / malformed JSON → exception chưa xử lý trong log"** và **"chưa có rate limit cho frame /app/typing"**.

**Files:**
- Modify: `backend/src/main/java/com/techx/intervue/modules/conversation/realtime/TypingController.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/conversation/services/interfaces/ChatRateLimiterInterface.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/conversation/services/impl/Bucket4jChatRateLimiter.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/conversation/ChatLimitsProperties.java`
- Modify: `backend/src/main/resources/application.yaml`, `.env.example`, `.env.production.example`, `docker-compose.yml`, `docker-compose.prod.yml`
- Test: `backend/src/test/java/com/techx/intervue/modules/conversation/realtime/TypingControllerTest.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/conversation/services/impl/Bucket4jChatRateLimiterTest.java`

**Interfaces:**
- Produces: `ChatRateLimiterInterface.Action` thêm hằng `TYPING`; `ChatLimitsProperties` thêm `int typingFramesPerMinute`.

**Vì sao STOMP im lặng chứ không báo lỗi:** frame `/app/typing` không có mã HTTP để trả, và "đang gõ" mất một sự kiện thì không ai thấy gì (spec §7.1 đã nói vậy). Ném exception ra khỏi `@MessageMapping` chỉ đổ một stack trace vào log rồi thôi.

- [ ] **Bước 1: Viết test đỏ**

Thêm vào `TypingControllerTest` (mở file ra xem cách nó dựng `controller` và `principal`):

```java
    /** Review Focus #5: client bug hoặc frame bịa. */
    @Test
    void ignoresAFrameWithNoConversationId() {
        assertThatCode(() -> controller.typing(new TypingController.TypingRequest(null, true), principal(7L)))
                .doesNotThrowAnyException();

        verifyNoInteractions(publisher);
    }

    @Test
    void ignoresAnEmptyFrame() {
        assertThatCode(() -> controller.typing(null, principal(7L))).doesNotThrowAnyException();

        verifyNoInteractions(publisher);
    }

    /** Review Focus #5, nửa sau: rải frame liên tục. */
    @Test
    void dropsTypingFramesOnceTheLimitIsReached() {
        org.mockito.Mockito.doThrow(new RateLimitedException("too fast"))
                .when(rateLimiter)
                .check(7L, ChatRateLimiterInterface.Action.TYPING);

        assertThatCode(
                        () ->
                                controller.typing(
                                        new TypingController.TypingRequest(42L, true), principal(7L)))
                .doesNotThrowAnyException();

        verifyNoInteractions(publisher);
    }

    @Test
    void checksTheLimitBeforeTouchingTheDatabase() {
        org.mockito.Mockito.doThrow(new RateLimitedException("too fast"))
                .when(rateLimiter)
                .check(7L, ChatRateLimiterInterface.Action.TYPING);

        controller.typing(new TypingController.TypingRequest(42L, true), principal(7L));

        verifyNoInteractions(conversations);
    }
```

`TypingController` nhận thêm `ChatRateLimiterInterface rateLimiter` ở cuối constructor; sửa chỗ dựng controller trong test.

Thêm vào `Bucket4jChatRateLimiterTest`:

```java
    @Test
    void typingHasItsOwnBucketAndCapacity() {
        when(bucket.tryConsume(1)).thenReturn(true);
        limiter = new Bucket4jChatRateLimiter(buckets, new ChatLimitsProperties(30, 10, 20, 120));

        limiter.check(7L, Action.TYPING);

        ArgumentCaptor<String> key = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Supplier<BucketConfiguration>> config = ArgumentCaptor.forClass(Supplier.class);
        verify(builder).build(key.capture(), config.capture());
        assertThat(key.getValue()).isEqualTo("chat:rate:typing:7");
        assertThat(config.getValue().get().getBandwidths()[0].getCapacity()).isEqualTo(120);
    }
```

Mọi chỗ khác trong file đang gọi `new ChatLimitsProperties(30, 10, 20)` phải thêm tham số thứ tư.

- [ ] **Bước 2: Chạy để chắc chắn đỏ**

```bash
docker compose -p market-link-chat3b -f docker-compose.yml -f ../compose.chat3b-override.yml exec -T backend ./mvnw -B test -Dtest=TypingControllerTest,Bucket4jChatRateLimiterTest
```

Expected: FAIL — `constructor ChatLimitsProperties ... cannot be applied` và `cannot find symbol: variable TYPING`.

- [ ] **Bước 3: Mở rộng hạn mức**

`ChatLimitsProperties`:

```java
/** Spec §8.4. Mỗi mức tính riêng cho từng user. */
@ConfigurationProperties(prefix = "app.chat.limits")
public record ChatLimitsProperties(
        int messagesPerMinute,
        int imagesPerHour,
        int conversationsPerHour,
        int typingFramesPerMinute) {}
```

`ChatRateLimiterInterface.Action`: thêm `TYPING`.

`Bucket4jChatRateLimiter`:

```java
            case TYPING -> bucket(limits.typingFramesPerMinute(), Duration.ofMinutes(1));
```

trong `configFor`, và trong `reasonFor`:

```java
            case TYPING -> "You are typing too fast for us to keep up.";
```

Thông điệp này không bao giờ tới người dùng (frame bị bỏ im lặng) nhưng `switch` phải đủ nhánh, và nếu sau này có ai trả nó ra thì nó đã là một câu tử tế.

Thêm vào constructor, cạnh ba dòng `requirePositive` đang có:

```java
        requirePositive("app.chat.limits.typing-frames-per-minute", limits.typingFramesPerMinute());
```

- [ ] **Bước 4: Thêm biến môi trường (CONTRIBUTING §6 — cùng lúc cả 5 chỗ)**

`application.yaml`, trong khối `app.chat.limits`:

```yaml
      typing-frames-per-minute: ${CHAT_TYPING_FRAMES_PER_MINUTE:120}
```

`.env.example` và `.env.production.example`, trong khối chat đang có:

```bash
CHAT_TYPING_FRAMES_PER_MINUTE=120
```

`docker-compose.yml`, service `backend`:

```yaml
      CHAT_TYPING_FRAMES_PER_MINUTE: ${CHAT_TYPING_FRAMES_PER_MINUTE:-120}
```

`docker-compose.prod.yml`, service `backend`:

```yaml
      CHAT_TYPING_FRAMES_PER_MINUTE: ${CHAT_TYPING_FRAMES_PER_MINUTE:?Thiếu CHAT_TYPING_FRAMES_PER_MINUTE trong .env.production}
```

Rồi chạy `make check-env` — script này so hai file `.env*.example`, thiếu một bên là đỏ.

- [ ] **Bước 5: Sửa `TypingController`**

```java
    @MessageMapping("/typing")
    public void typing(@Payload TypingRequest request, Principal principal) {
        // Frame bịa hoặc client bug: không có gì để làm, và cũng không có mã lỗi nào để trả —
        // STOMP không phải HTTP (spec §7.1). Im lặng bỏ qua thay vì đổ stack trace vào log.
        if (request == null || request.conversationId() == null) {
            return;
        }
        Long me = Long.parseLong(principal.getName());
        try {
            rateLimiter.check(me, ChatRateLimiterInterface.Action.TYPING);
        } catch (RateLimitedException e) {
            return;
        }
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
```

Thêm field `private final ChatRateLimiterInterface rateLimiter;` (đặt cuối) và import `RateLimitedException`, `ChatRateLimiterInterface`.

- [ ] **Bước 6: Chạy cho xanh**

```bash
docker compose -p market-link-chat3b -f docker-compose.yml -f ../compose.chat3b-override.yml exec -T backend ./mvnw -B test -Dtest=TypingControllerTest,Bucket4jChatRateLimiterTest
make check-env
```

Expected: PASS, và env guard xanh.

- [ ] **Bước 7: Commit**

```bash
make be-format
git add -A backend .env.example .env.production.example docker-compose.yml docker-compose.prod.yml
git commit -m "fix(FR-112): guard and rate limit the typing frame

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: Bốn việc dọn còn lại, tài liệu, chạy thử, PR

Bốn việc hoãn còn lại nằm đúng trên file task này động tới. Mười bốn việc kia để một PR `chore/` riêng.

**Files:**
- Modify: `backend/src/main/java/com/techx/intervue/modules/conversation/controllers/ConversationExceptionHandler.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/conversation/resources/MessageResource.java`
- Modify: `docs/api-contract.md`, `README.md`
- Test: `backend/src/test/java/com/techx/intervue/modules/conversation/controllers/ConversationExceptionHandlerScopeTest.java`

- [ ] **Bước 1: Bỏ handler `MaxUploadSizeExceededException` trùng (minor Plan 3A #1)**

`ConversationExceptionHandler` và `UploadExceptionHandler` (toàn cục) cùng bắt exception này, không cái nào khai `@Order`, nên `error.code` của một file >40MB là **không xác định** — lúc `ATTACHMENT_TOO_LARGE`, lúc `PAYLOAD_TOO_LARGE`.

`UploadExceptionHandler` là handler đúng chỗ: Tomcat chặn file khi đọc body, **trước khi** biết controller nào nhận, nên advice theo controller vốn không đáng tin cho trường hợp này. Xoá hẳn method `multipartTooLarge` và import `MaxUploadSizeExceededException` khỏi `ConversationExceptionHandler`.

Sửa luôn javadoc của class — câu "repo chưa có handler chung" là sai từ lúc `UploadExceptionHandler` tồn tại:

```java
/**
 * Mã HTTP theo spec mục 6.3, cho các controller của module chat. Lỗi multipart quá cỡ do
 * UploadExceptionHandler toàn cục xử lý (Tomcat chặn trước khi biết controller nào nhận), nên đừng
 * thêm lại ở đây.
 *
 * <p>Thêm controller mới vào module thì phải thêm vào assignableTypes dưới đây, nếu không mọi
 * exception của nó thành 500 — ConversationExceptionHandlerScopeTest ghim điều đó.
 */
```

Và sửa `docs/api-contract.md` §12: file >40MB trả `error.code` là `PAYLOAD_TOO_LARGE`, còn `ATTACHMENT_TOO_LARGE` là mức 5 MB của chính endpoint.

- [ ] **Bước 2: Thống nhất mã 403 cho ảnh không phải của mình (minor Plan 3A #2)**

`AttachmentService.read` ném `ConversationAccessDeniedException` → `NOT_A_MEMBER` khi ai đó xin ảnh **chưa gắn tin** của người khác; `MessageService` ném `AttachmentNotYoursException` → `ATTACHMENT_NOT_YOURS` khi gắn ảnh của người khác. Cùng một ý, hai mã.

Đổi nhánh trong `AttachmentService.read` sang `AttachmentNotYoursException`:

```java
        if (attachment.getMessageId() == null) {
            // Chưa gắn vào tin nào: chỉ người vừa upload được xem, để hiện preview trước khi gửi
            if (!attachment.getUploaderId().equals(meId)) {
                throw new AttachmentNotYoursException();
            }
        }
```

Sửa `AttachmentServiceTest.nobodyElseCanSeeAnUploadThatIsNotOnAMessageYet` sang `AttachmentNotYoursException`, và `docs/api-contract.md` §12 ghi `ATTACHMENT_NOT_YOURS` cho cả hai đường.

Giữ nguyên `NOT_A_MEMBER` cho ảnh **đã gắn tin** mà người xin không thuộc thread — đó đúng là "bạn không ở trong cuộc trò chuyện này", một ý khác.

- [ ] **Bước 3: Xoá `MessageResource.from(Message)` một tham số (minor Plan 3A #4)**

Không còn ai gọi (kiểm: `grep -rn 'MessageResource.from(' backend/src`), và nó âm thầm trả `attachment: null` nên là bẫy cho người gọi tiếp theo. Xoá overload một tham số, giữ `from(Message, MessageAttachment)`.

- [ ] **Bước 4: Chạy test sau ba việc dọn**

```bash
docker compose -p market-link-chat3b -f docker-compose.yml -f ../compose.chat3b-override.yml exec -T backend ./mvnw -B test
```

Expected: `BUILD SUCCESS`. Đỏ ở đây gần như chắc chắn là một chỗ gọi bị sót — đọc tên test rồi sửa chỗ gọi, đừng sửa test.

- [ ] **Bước 5: Cập nhật `docs/api-contract.md` §12 (minor Plan 2 #9 đi kèm ở bước 6)**

Thêm vào bảng endpoint của mục 12, thay ba dòng "Chưa làm":

| Method | Path | Role | Trạng thái | Body / query | data |
|---|---|---|---|---|---|
| POST | `/api/v1/messages/{id}/report` | Thành viên | **Đã có** | `{ reason: "spam"｜"abuse"｜"scam"｜"other", note? }` | 201 · `{ id, messageId, reason, note, status, createdAt }` |
| GET | `/api/v1/admin/message-reports` | Admin | **Đã có** | query `status`, `page`, `pageSize` | `{ items[], page, pageSize, total }` |
| GET | `/api/v1/admin/message-reports/{id}` | Admin | **Đã có** | — | Chi tiết + `context[]` (tin bị báo + tối đa 5 tin mỗi bên) |
| PATCH | `/api/v1/admin/message-reports/{id}/dismiss` | Admin | **Đã có** | — | Báo cáo chuyển `reviewed` |
| PATCH | `/api/v1/admin/messages/{id}/hide` | Admin | **Đã có** | — | Tin ẩn mềm, ghi `hiddenBy` + `hiddenAt` |

Và ghi rõ:
- **Ranh giới của admin (spec §8.3):** không có endpoint nào nhận `conversationId`. Admin chỉ đọc được tin **đã bị báo cáo** cùng tối đa **5 tin mỗi bên**. Ảnh: xem được ảnh của tin **bị báo cáo**, **không** xem được ảnh của tin ngữ cảnh; mỗi lần mở đều ghi log.
- **Sự kiện realtime mới:** `/user/topic/conversations` nhận thêm `{ type: "hidden", conversationId, messageId }`.
- Mã lỗi mới: **400** `VALIDATION_ERROR` (tự báo cáo tin mình), **403** `MODERATION_OUT_OF_SCOPE`, **409** `ALREADY_REPORTED`.
- **429** thêm mức `typing`: 120 frame/phút, và frame vượt ngưỡng **bị bỏ im lặng** (STOMP không có mã trả về).

- [ ] **Bước 6: README — kịch bản hai trình duyệt (minor Plan 2 #9)**

Spec §13 yêu cầu đường đi realtime được kiểm bằng một kịch bản tay ghi trong README; hiện nó chỉ nằm trong scratchpad. Thêm vào mục Troubleshooting hoặc một mục "Manual checks" ngắn:

```markdown
### Chat — manual two-browser check (FR-111, FR-116)

1. Open two browsers, sign in as a customer in one and as an approved farmer in the other.
2. Customer opens the stall and sends a message → it appears in the farmer's window within a second, no reload.
3. Farmer types → the customer sees the typing dots; stop typing → they disappear.
4. Farmer sends a photo → the customer sees it. Copy the photo URL and open it in a third browser signed in as someone else → **403**.
5. Customer reports the farmer's message. Sign in as an admin, open **Reported messages**, open the report → you see the message plus at most five on each side, and nothing else from that conversation.
6. Admin hides the message → it disappears from both windows **without a reload**.
7. Still as admin, open the photo URL of the reported message → **200**. Open the photo URL of a neighbouring message → **403**.
```

Thêm một dòng Troubleshooting:

| Vấn đề | Nguyên nhân | Cách xử lý |
|---|---|---|
| `PATCH /api/v1/admin/messages/{id}/hide` trả 403 `MODERATION_OUT_OF_SCOPE` | Tin chưa ai báo cáo | Đúng thiết kế (spec §8.3): admin chỉ thao tác trên tin đã bị báo cáo. Không có màn duyệt toàn bộ hộp thư. |

- [ ] **Bước 7: Chạy toàn bộ và lint (đúng stack của mình)**

```bash
docker compose -p market-link-chat3b -f docker-compose.yml -f ../compose.chat3b-override.yml exec -T backend ./mvnw -B test
docker compose -p market-link-chat3b -f docker-compose.yml -f ../compose.chat3b-override.yml exec -T backend ./mvnw -q spotless:check
docker compose -p market-link-chat3b -f docker-compose.yml -f ../compose.chat3b-override.yml exec -T frontend npm run lint
make check-env
```

Expected: tất cả xanh. **Đây là bằng chứng bắt buộc trước khi mở PR** — chép dòng kết quả vào mô tả PR. `make lint` và `make be-test` trỏ vào stack chung nên **không** dùng thay được.

- [ ] **Bước 8: Chạy thử tay đầu-cuối**

Ghi kết quả vào scratchpad `chat-plan3b/smoke.log`. Dùng cổng **8084**.

| # | Việc | Kỳ vọng |
|---|---|---|
| 1 | A và B nhắn nhau; A báo cáo tin của B | 201 |
| 2 | A báo cáo lại đúng tin đó | **409** `ALREADY_REPORTED` |
| 3 | A báo cáo tin của **chính A** | **400** |
| 4 | C (ngoài thread) báo cáo tin đó | **403** |
| 5 | Admin `GET /admin/message-reports?status=new` | thấy báo cáo, `preview` bị cắt |
| 6 | Admin mở chi tiết | tin bị báo ở giữa, tối đa 5 tin mỗi bên, không có tin nào của thread khác |
| 7 | Admin `PATCH /admin/messages/{id}/hide` | 200; `GET messages` của A và B **không** còn tin đó |
| 8 | Admin ẩn lại lần nữa | 200, `hiddenBy` **không đổi** |
| 9 | Admin ẩn một tin chưa ai báo cáo | **403** `MODERATION_OUT_OF_SCOPE` |
| 10 | Admin mở ảnh của tin **bị báo cáo** / của tin **ngữ cảnh** | **200** / **403** |
| 11 | Báo cáo một tin đã bị ẩn | **404** |
| 12 | Admin `PATCH /admin/message-reports/{id}/dismiss` | 200, `status: reviewed`, rời hàng đợi `status=new` |

- [ ] **Bước 9: Rebase theo `dev` rồi đẩy**

```bash
git fetch origin && git rebase origin/dev
# dev đã có V20260926005? Đổi tên migration của mình lên số kế tiếp (CONTRIBUTING §7)
ls backend/src/main/resources/db/migration | sort | tail -3
docker compose -p market-link-chat3b -f docker-compose.yml -f ../compose.chat3b-override.yml exec -T backend ./mvnw -B test
git push -u origin feature/FR-116-chat-reports
```

- [ ] **Bước 10: Mở PR**

`gh pr create --base dev`, tiêu đề `feat(FR-116): report a message and let an admin moderate it`. Mô tả theo template `.github/pull_request_template.md`, và **phải** nêu bốn điểm sau cho người review:

1. **Ranh giới của admin là điểm cần soi kỹ nhất.** Không có endpoint nào nhận `conversationId`; quyền đọc bắt nguồn từ `message_reports`. Xem bảng ở Task 4 và test `adminCannotReachAThreadThatHasNoReport`.
2. **Quyết định của LEAD 26/09:** admin xem được ảnh của tin **bị báo cáo**, không xem được ảnh của ±5 tin ngữ cảnh. Mỗi lần mở đều ghi log. Đây là nới so với spec §8.3 (spec chỉ nói về tin, không nói về ảnh).
3. **`dismiss` là bổ sung ngoài bảng API của spec §6.1** — không có nó thì hàng đợi `status=new` không bao giờ vơi.
4. **Chính sách "admin chỉ đọc tin bị báo cáo" phải vào phần Assumptions của ReadMe** (spec §8.3 và mục 15 việc #4 — cần LEAD + QA gật). Chưa làm trong PR này; ghi thành việc còn lại.

- [ ] **Bước 11: Cập nhật ledger và bộ nhớ**

Ghi vào ledger: số PR, các phát hiện, các mục hoãn. Cập nhật memory `chat-feature-plan.md`: Plan 3B xong, còn Plan 4 và một PR `chore/` cho 14 minor.

---

## Việc cố tình để lại cho sau

| Việc | Ở đâu |
|---|---|
| `MessageBubble` vào design system, UI Customer/Farmer, tab "Reported messages" trên `admin/moderation.html`, popover header, prototype | **Plan 4** |
| Ảnh hiện trong `<img>` — FE phải `fetch` kèm header rồi `URL.createObjectURL(blob)` vì JWT ở header | **Plan 4** |
| Dòng Assumptions trong ReadMe về ranh giới đọc của admin (spec §8.3, mục 15 việc #4) | LEAD + QA, trước khi nộp |
| Thêm FR-110…117 vào `.ai/REQUIREMENTS.md` (R-07) | QA/DOC |
| 14 minor còn lại của hai vòng review (pipeline SCARD, presence lọc theo người online, `enabled_plugins` cho Rabbit, env-guard thêm rabbitmq, contract test Jackson 2 vs 3, bỏ `Thread.sleep` trong e2e, khoá cho cleanup job nhiều instance, trần heap khi mã hoá lại ảnh, đóng kết nối Lettuce, `Content-Length` từ đĩa, …) | Một PR `chore/chat-review-followups` riêng |
| `price_offers` (FR-118, FR-119) | Đợt 2, chờ `products` và `orders` |
