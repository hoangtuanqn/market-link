# Chat Customer ↔ Farmer — Plan 3A/4: Ảnh đính kèm + chống lạm dụng · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Người trong một cuộc hội thoại gửi được ảnh cho nhau (FR-115), ảnh chỉ hai người đó xem được, và không ai spam được chat.

**Architecture:** Ảnh đi hai bước — `POST /api/v1/attachments` tải file lên trước và trả `attachmentId`, rồi `POST /api/v1/conversations/{id}/messages` với `kind: "image"` + `attachmentId` gắn nó vào một tin nhắn. File **không** nằm trong thư mục `/uploads` đang được phục vụ tĩnh công khai, mà trong một thư mục riêng lấy từ `CHAT_UPLOAD_DIR`, và chỉ ra ngoài qua `GET /api/v1/attachments/{id}` có kiểm tư cách thành viên. Rate limit dùng `bucket4j-redis` (đã có sẵn trong `pom.xml`) trên `RedisClient` Lettuce đã có sẵn bean.

**Tech Stack:** Spring Boot 4 / Java 25, JPA + Flyway (MySQL 8.4), Redis (Lettuce) + bucket4j 8.10.1, `javax.imageio` cho JPEG/PNG, đọc header RIFF thủ công cho WebP, JUnit 5 + Mockito + AssertJ.

**Spec:** `docs/superpowers/specs/2026-09-25-farmer-customer-chat-design.md` — mục 5.1 (`message_attachments`), 6.1 (API), 6.3 (mã lỗi), 8.1 (quyền), 8.2 (ảnh), 8.4 (chống lạm dụng), 12.2 (biến môi trường), 13 (kiểm thử).

**Phạm vi:** Đây là **Plan 3A**. Báo cáo tin nhắn + màn kiểm duyệt của admin (FR-116) là **Plan 3B**, viết sau khi 3A merge. UI (FR-115 phía người dùng, `MessageBubble`, prototype) là **Plan 4**.

---

## Global Constraints

Sao nguyên văn từ spec và từ luật repo. Mọi task đều phải thoả.

- **R-03 / CONTRIBUTING §7:** đổi DB chỉ qua migration Flyway mới `V<yyyyMMdd><nnn>__<mo_ta>.sql`; **không sửa file đã merge**. Migration mới nhất trên `dev` lúc viết plan là `V20260925010`; plan này dùng **`V20260925011`**. Trước khi commit Task 2, chạy `ls backend/src/main/resources/db/migration | sort | tail -3` — nếu `dev` đã có số 011 thì đổi lên 012 và sửa mọi chỗ nhắc tới số này.
- **Khoá ngoại tới `users` phải là `BIGINT UNSIGNED`** (khớp `users.id`), không CASCADE khi trỏ tới `users` (tài khoản không bao giờ xoá cứng — FR-072 chỉ vô hiệu hoá).
- **API:** `/api/v1`, JSON **camelCase**, mọi response bọc `ApiResource<T>` qua `ok(...)` / `created(...)` của `BaseController`. Controller mới `extends BaseController`.
- **R-06:** mọi endpoint có `{id}` kiểm tư cách sở hữu **trước khi** trả bất cứ dữ liệu nào.
- **Mã lỗi (spec §6.3):** 400 body sai · 401 chưa đăng nhập · 403 không thuộc thread / stall chưa mở · 404 không tồn tại · 409 stall bị đình chỉ · **413 ảnh quá 5 MB** · **415 không phải jpg/png/webp** · **429 gửi quá nhanh**.
- **Hạn mức (spec §8.4):** **30 tin/phút**, **10 ảnh/giờ**, **20 thread mới/giờ**, mỗi mức tính theo từng user.
- **Ảnh (spec §8.2):** tối đa **5 MB**; chỉ **jpg/png/webp**; kiểm **magic bytes**, **không tin `Content-Type`** client gửi; `storage_key` **sinh ngẫu nhiên**; lưu trên volume `chat-uploads` lấy đường dẫn từ `CHAT_UPLOAD_DIR`; **không** phục vụ như file tĩnh; ảnh upload rồi không gắn vào tin nào trong **24 giờ** thì job dọn đi.
- **CONTRIBUTING §6:** thêm biến môi trường thì sửa **cùng lúc** `.env.example`, `.env.production.example`, `application.yaml`, `docker-compose.yml`, `docker-compose.prod.yml`.
- **Copy tiếng Anh, sentence case.** Mọi message lỗi người dùng đọc được viết bằng tiếng Anh, một câu, nói rõ phải làm gì.
- **Format:** Spotless (google-java-format AOSP). `make be-format` trước mỗi commit; `make lint` và `make be-test` phải xanh trước khi mở PR.
- **Commit:** Conventional Commits có mã FR, ví dụ `feat(FR-115): upload a chat photo`. Giữ dòng `Co-Authored-By`.

---

## Review Focus

Năm lớp đầu vào spec ngầm định nhưng dễ rơi. Mỗi dòng đã được gắn một test trong task tương ứng.

1. **File đổi đuôi** — người dùng đổi tên `payload.pdf` thành `photo.jpg`. Kỳ vọng: **415**, không phải 500, và không có byte nào được ghi xuống đĩa. → Task 5, `rejectsAFileThatIsNotAnImageWhateverItsName`.
2. **Ảnh bom giải nén** — header khai 60000×60000 px, file chỉ vài KB. Kỳ vọng: **400** ngay sau khi đọc header, **trước khi** giải mã điểm ảnh (nếu không, một request làm sập cả JVM). → Task 5, `rejectsAnImageThatIsTooLargeInPixels`.
3. **`attachmentId` của người khác** — B đoán/nhặt được id ảnh A vừa upload và gắn vào tin của mình. Kỳ vọng: **403**, ảnh không bị đánh cắp và không bị gắn hai lần. → Task 6, `cannotAttachSomeoneElsesUpload` + `cannotReuseAnAttachmentThatIsAlreadyOnAMessage`.
4. **Redis chết lúc kiểm rate limit** — Kỳ vọng: chat **vẫn gửi được** (fail-open) kèm một dòng WARN, chứ không phải 500 hay 429 cho mọi người. Rate limit là lớp chống lạm dụng, không phải lớp bảo mật; Redis sập mà chat sập theo là đổi một phiền toái lấy một sự cố. → Task 3, `letsTheRequestThroughWhenRedisIsDown`.
5. **Ảnh của tin đã bị admin ẩn** — link ảnh vẫn nằm trong lịch sử trình duyệt của người báo cáo. Kỳ vọng: **404**, giống như tin đã bị bỏ khỏi danh sách. → Task 7, `hiddenMessageHidesItsPhotoToo`.

---

## Setup — worktree, Docker stack, baseline

Làm một lần trước Task 1. Không commit gì trong mục này (trừ chỗ nói rõ là commit).

- [ ] **Bước 1: Xác nhận worktree**

Worktree đã được tạo sẵn:

```bash
cd /Users/phong/projects/school/fpt-aptech/Code_project/techwiz7/market-link-chat3
git branch --show-current   # feature/FR-115-chat-attachments
git log --oneline -1        # 870bc91 (= origin/dev lúc tách nhánh)
```

- [ ] **Bước 2: Dọn container mồ côi của stack chat cũ**

Stack `market-link-chat` (Plan 2) đã bị xoá thư mục nhưng còn container `mlchat-backend` giữ cổng 8082.

```bash
docker rm -f mlchat-backend 2>/dev/null; docker compose ls
```

- [ ] **Bước 3: Tạo override compose cho stack riêng**

`container_name` trong `docker-compose.yml` bị đặt cứng (`intervue-*`) nên chạy stack thứ hai phải đổi tên, nếu không đụng stack `market-link` đang chạy ở cổng 8080. File này để **ngoài repo** (không phải file của dự án):

```bash
cat > ../compose.chat3-override.yml <<'YAML'
# Override chỉ dùng cho worktree market-link-chat3 (Plan 3A). Không thuộc repo.
# Đổi container_name để không đụng stack market-link, và không mở cổng hạ tầng ra host.
services:
  mysql:
    container_name: mlc3-mysql
    ports: !override []
  redis:
    container_name: mlc3-redis
    ports: !override []
  rabbitmq:
    container_name: mlc3-rabbitmq
    ports: !override []
  backend:
    container_name: mlc3-backend
    ports: !override
      - "8083:8080"
      - "5007:5005"
  frontend:
    container_name: mlc3-frontend
    ports: !override []
YAML
```

- [ ] **Bước 4: Chạy stack**

```bash
cp .env.example .env
docker compose -p market-link-chat3 -f docker-compose.yml -f ../compose.chat3-override.yml --profile app up -d --build
```

Đặt một alias cho các bước sau (viết đủ mỗi lần cũng được):

```bash
alias dc3='docker compose -p market-link-chat3 -f docker-compose.yml -f ../compose.chat3-override.yml'
```

- [ ] **Bước 5: Baseline phải xanh trước khi sửa gì**

```bash
docker compose -p market-link-chat3 -f docker-compose.yml -f ../compose.chat3-override.yml exec -T backend ./mvnw -B test
```

Expected: `BUILD SUCCESS`, 182 test, 0 failure. **Nếu đỏ: dừng lại, báo người dùng, không code tiếp** — baseline bẩn thì mọi lỗi sau này không biết của ai.

---

### Task 1: Stall bị đình chỉ không mở thread mới và không gửi thêm được

Spec §8.1 nói: stall `suspended` (D-09) thì **thread cũ đọc được**, **gửi thêm thì 409**, và **mở thread mới thì 403**. `StallAccessPolicy` hiện chỉ nhìn `users.role` + `users.status`, có comment "farmer_profiles chưa tồn tại" — bảng đó **đã có trên `dev`** từ PR #122 (migration 007–009), nên comment đó đã lỗi thời và lỗ hổng là thật.

Vì sao chỉ thiếu mỗi trường hợp `suspended`: `FarmerService.approve` mới đặt `users.role = FARMER`, còn `PENDING` và `REJECTED` giữ role `CUSTOMER` — nên hai trạng thái đó đã bị `assertCanBeMessaged` chặn sẵn qua `role != FARMER`. `suspend()` **không** đổi role (D-09: vẫn đăng nhập được), nên người bị đình chỉ vẫn lọt qua.

**Files:**
- Modify: `backend/src/main/java/com/techx/intervue/modules/conversation/services/impl/StallAccessPolicy.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/conversation/services/impl/StallAccessPolicyTest.java`

**Interfaces:**
- Consumes: `FarmerProfileRepository.findByUserId(Long)` → `Optional<FarmerProfile>`; `FarmerProfile.getApprovalStatus()` → `ApprovalStatus{PENDING, APPROVED, REJECTED, SUSPENDED}`.
- Produces: `StallAccessPolicy(FarmerProfileRepository farmerProfiles)` — constructor có **một** tham số. Mọi test `new StallAccessPolicy()` hiện có phải đổi sang `new StallAccessPolicy(farmerProfiles)`.

- [ ] **Bước 1: Viết test đỏ**

Mở file ra đọc trước — nó đã có sẵn `policy`, một `@BeforeEach` (hoặc khởi tạo tại chỗ) và có thể đã có helper dựng `User`:

```bash
cat backend/src/test/java/com/techx/intervue/modules/conversation/services/impl/StallAccessPolicyTest.java
```

Giữ nguyên các test đang có. Nếu file đã có helper tên `farmer(...)` / `customer(...)` thì **dùng lại cái có sẵn**, đừng khai báo trùng (sẽ không biên dịch). Nếu file khởi tạo `policy` tại chỗ (`StallAccessPolicy policy = new StallAccessPolicy();`) thì thay bằng `@BeforeEach` dưới đây.

```java
// thêm vào phần import
import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import java.util.Optional;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
```

```java
    FarmerProfileRepository farmerProfiles;

    @BeforeEach
    void setUp() {
        farmerProfiles = mock(FarmerProfileRepository.class);
        // Mặc định: mọi stall trong test cũ là stall đã duyệt
        when(farmerProfiles.findByUserId(anyLong()))
                .thenReturn(Optional.of(profileWith(ApprovalStatus.APPROVED)));
        policy = new StallAccessPolicy(farmerProfiles);
    }

    private static FarmerProfile profileWith(ApprovalStatus status) {
        FarmerProfile profile = new FarmerProfile();
        profile.setApprovalStatus(status);
        return profile;
    }

    private static User farmer(Long id) {
        return User.builder().id(id).role(RoleType.FARMER).status(UserStatus.ACTIVE).build();
    }

    private static User customer(Long id) {
        return User.builder().id(id).role(RoleType.CUSTOMER).status(UserStatus.ACTIVE).build();
    }

    @Test
    void aSuspendedStallCannotBeMessagedForTheFirstTime() {
        when(farmerProfiles.findByUserId(9L))
                .thenReturn(Optional.of(profileWith(ApprovalStatus.SUSPENDED)));

        assertThatThrownBy(() -> policy.assertCanBeMessaged(farmer(9L)))
                .isInstanceOf(StallNotOpenException.class);
    }

    @Test
    void aSuspendedStallCannotReceiveAnyMoreMessages() {
        when(farmerProfiles.findByUserId(9L))
                .thenReturn(Optional.of(profileWith(ApprovalStatus.SUSPENDED)));

        assertThatThrownBy(() -> policy.assertCanSend(customer(4L), farmer(9L)))
                .isInstanceOf(ConversationClosedException.class);
    }

    @Test
    void aSuspendedStallCannotSendEither() {
        when(farmerProfiles.findByUserId(9L))
                .thenReturn(Optional.of(profileWith(ApprovalStatus.SUSPENDED)));

        assertThatThrownBy(() -> policy.assertCanSend(farmer(9L), customer(4L)))
                .isInstanceOf(ConversationClosedException.class);
    }

    @Test
    void aFarmerWithoutAProfileRowIsTreatedAsNotOpen() {
        when(farmerProfiles.findByUserId(9L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> policy.assertCanBeMessaged(farmer(9L)))
                .isInstanceOf(StallNotOpenException.class);
    }

    @Test
    void twoCustomersMessagingEachOtherNeverTouchTheFarmerTable() {
        policy.assertCanSend(customer(4L), customer(5L));

        verifyNoInteractions(farmerProfiles);
    }
```

Thêm `import static org.mockito.Mockito.verifyNoInteractions;`.

- [ ] **Bước 2: Chạy để chắc chắn đỏ**

```bash
docker compose -p market-link-chat3 -f docker-compose.yml -f ../compose.chat3-override.yml exec -T backend ./mvnw -B test -Dtest=StompAuthInterceptorTest -DfailIfNoTests=false
```

Trước tiên chạy lệnh trên chỉ để chắc container còn biên dịch được. Rồi:

```bash
docker compose -p market-link-chat3 -f docker-compose.yml -f ../compose.chat3-override.yml exec -T backend ./mvnw -B test -Dtest=StallAccessPolicyTest
```

Expected: FAIL — `constructor StallAccessPolicy() cannot be applied to given types` (chưa có tham số).

> ⚠️ Bài học từ Plan 2 (ledger): **không để một test không biên dịch nằm trên đĩa trong lúc container dev khởi động lại** — `spring-boot:run` chạy `test-compile` trước và backend sẽ vào vòng lặp restart. Viết test đỏ xong là chạy ngay.

- [ ] **Bước 3: Viết code tối thiểu cho xanh**

Thay toàn bộ `StallAccessPolicy.java`:

```java
package com.techx.intervue.modules.conversation.services.impl;

import com.techx.intervue.modules.conversation.exceptions.AccountRestrictedException;
import com.techx.intervue.modules.conversation.exceptions.ConversationClosedException;
import com.techx.intervue.modules.conversation.exceptions.StallNotOpenException;
import com.techx.intervue.modules.conversation.services.interfaces.StallAccessPolicyInterface;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.enums.UserStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Spec §8.1. PENDING và REJECTED không lọt tới đây được: FarmerService chỉ đặt users.role = FARMER
 * lúc approve, nên hai trạng thái đó vẫn là CUSTOMER và bị chặn ở kiểm tra role. SUSPENDED thì
 * khác — D-09 giữ nguyên role để người ta còn đăng nhập được, nên phải tra farmer_profiles.
 */
@Service
@RequiredArgsConstructor
public class StallAccessPolicy implements StallAccessPolicyInterface {

    private final FarmerProfileRepository farmerProfiles;

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
        if (!isOpenStall(target)) {
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
        // D-09: thread cũ vẫn đọc được (list không gọi hàm này), chỉ chặn gửi thêm. Chặn cả hai
        // chiều: stall bị đình chỉ thì không bán tiếp, mà khách cũng không đặt tiếp được.
        if (!isOpenStall(sender) || !isOpenStall(recipient)) {
            throw new ConversationClosedException();
        }
    }

    /** Người không phải Farmer luôn "mở" — khách với khách nhắn nhau không liên quan tới stall. */
    private boolean isOpenStall(User user) {
        if (user.getRole() != RoleType.FARMER) {
            return true;
        }
        return farmerProfiles
                .findByUserId(user.getId())
                .map(profile -> profile.getApprovalStatus() == ApprovalStatus.APPROVED)
                .orElse(false);
    }
}
```

- [ ] **Bước 4: Sửa chỗ khác đang gọi `new StallAccessPolicy()`**

```bash
grep -rn 'new StallAccessPolicy(' backend/src
```

Chỉ `StallAccessPolicyTest` được phép còn lại (đã sửa ở Bước 1). Các service khác nhận `StallAccessPolicyInterface` qua Spring nên không đổi.

- [ ] **Bước 5: Chạy lại cho xanh**

```bash
docker compose -p market-link-chat3 -f docker-compose.yml -f ../compose.chat3-override.yml exec -T backend ./mvnw -B test -Dtest=StallAccessPolicyTest,ConversationServiceTest,MessageServiceTest
```

Expected: PASS.

- [ ] **Bước 6: Commit**

```bash
make be-format
git add backend/src/main/java/com/techx/intervue/modules/conversation/services/impl/StallAccessPolicy.java \
        backend/src/test/java/com/techx/intervue/modules/conversation/services/impl/StallAccessPolicyTest.java
git commit -m "fix(FR-110): stop a suspended stall from opening or continuing a chat

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Migration, entity và repository cho `message_attachments`

**Files:**
- Create: `backend/src/main/resources/db/migration/V20260925011__create_message_attachments_table.sql`
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/entities/MessageAttachment.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/repositories/MessageAttachmentRepository.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/conversation/repositories/MessageAttachmentRepositoryTest.java`

**Interfaces:**
- Produces:
  - `MessageAttachment` (Lombok `@Builder`, `@Getter`, `@Setter`): `Long id`, `Long messageId` (nullable), `Long uploaderId`, `String storageKey`, `String mime`, `Integer sizeBytes`, `Integer width`, `Integer height`, `Instant createdAt`.
  - `MessageAttachmentRepository extends JpaRepository<MessageAttachment, Long>` với `List<MessageAttachment> findByMessageIdIn(Collection<Long> messageIds)`, `List<MessageAttachment> findByMessageIdIsNullAndCreatedAtBefore(Instant cutoff)`, `Optional<MessageAttachment> findByStorageKey(String storageKey)`.

- [ ] **Bước 1: Viết migration**

```sql
-- V20260925011__create_message_attachments_table.sql
-- FR-115 (spec §5.1). message_id NULL = vừa upload, chưa gắn vào tin nào; job dọn sau 24 giờ.
-- storage_key là tên sinh ngẫu nhiên, KHÔNG phải tên người dùng đặt (spec §8.2).
CREATE TABLE message_attachments (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  message_id  BIGINT UNSIGNED NULL,
  uploader_id BIGINT UNSIGNED NOT NULL,
  storage_key VARCHAR(255) NOT NULL UNIQUE,
  mime        VARCHAR(50) NOT NULL,
  size_bytes  INT NOT NULL,
  width       INT NULL,
  height      INT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_attach_message FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  -- Tài khoản không bao giờ xoá cứng (FR-072 chỉ vô hiệu hoá) nên để RESTRICT mặc định
  CONSTRAINT fk_attach_uploader FOREIGN KEY (uploader_id) REFERENCES users(id),
  INDEX idx_attach_orphan (message_id, created_at)
) ENGINE=InnoDB;
```

- [ ] **Bước 2: Kiểm tra số version chưa bị chiếm**

```bash
git fetch origin && git ls-tree -r --name-only origin/dev -- backend/src/main/resources/db/migration | sort | tail -3
```

Expected: số lớn nhất là `V20260925010`. Nếu đã có `011`, đổi tên file của mình lên `012` (CONTRIBUTING §7) và sửa mọi chỗ nhắc số này trong plan.

- [ ] **Bước 3: Viết test đỏ**

`backend/src/test/java/com/techx/intervue/modules/conversation/repositories/MessageAttachmentRepositoryTest.java`. Xem `MessageRepositoryTest` hiện có để copy đúng annotation của repo (`@DataJpaTest` + profile test).

```java
package com.techx.intervue.modules.conversation.repositories;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.conversation.entities.MessageAttachment;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

@DataJpaTest
class MessageAttachmentRepositoryTest {

    @Autowired MessageAttachmentRepository attachments;

    @Test
    void findsUploadsThatWereNeverAttachedAndAreOlderThanTheCutoff() {
        Instant old = Instant.now().minus(30, ChronoUnit.HOURS);
        Instant fresh = Instant.now().minus(1, ChronoUnit.HOURS);

        MessageAttachment orphan = attachments.save(upload("a-old", 7L, old));
        attachments.save(upload("b-fresh", 7L, fresh));

        List<MessageAttachment> found =
                attachments.findByMessageIdIsNullAndCreatedAtBefore(
                        Instant.now().minus(24, ChronoUnit.HOURS));

        assertThat(found).extracting(MessageAttachment::getId).containsExactly(orphan.getId());
    }

    @Test
    void doesNotReturnAnUploadThatIsAlreadyOnAMessage() {
        MessageAttachment attached = upload("c-old", 7L, Instant.now().minus(30, ChronoUnit.HOURS));
        attached.setMessageId(1L);
        attachments.save(attached);

        assertThat(
                        attachments.findByMessageIdIsNullAndCreatedAtBefore(
                                Instant.now().minus(24, ChronoUnit.HOURS)))
                .isEmpty();
    }

    private static MessageAttachment upload(String key, Long uploaderId, Instant createdAt) {
        return MessageAttachment.builder()
                .uploaderId(uploaderId)
                .storageKey(key)
                .mime("image/jpeg")
                .sizeBytes(1234)
                .width(800)
                .height(600)
                .createdAt(createdAt)
                .build();
    }
}
```

> Nếu `MessageRepositoryTest` dùng annotation khác `@DataJpaTest` (ví dụ `@SpringBootTest` + `@Transactional` vì test chạy trên MySQL thật trong container), **dùng đúng annotation đó** thay vì `@DataJpaTest`. Mở file ra xem trước khi viết:
> ```bash
> head -30 backend/src/test/java/com/techx/intervue/modules/conversation/repositories/MessageRepositoryTest.java
> ```
> `doesNotReturnAnUploadThatIsAlreadyOnAMessage` cần `messages.id = 1` tồn tại nếu khoá ngoại được bật; nếu test đang chạy trên MySQL thật thì tạo trước một `Conversation` + `Message` như `MessageRepositoryTest` đang làm, và dùng id của tin đó thay cho `1L`.

- [ ] **Bước 4: Chạy để chắc chắn đỏ**

```bash
docker compose -p market-link-chat3 -f docker-compose.yml -f ../compose.chat3-override.yml exec -T backend ./mvnw -B test -Dtest=MessageAttachmentRepositoryTest
```

Expected: FAIL — `package com.techx.intervue.modules.conversation.entities does not contain MessageAttachment`.

- [ ] **Bước 5: Viết entity**

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
 * FR-115. messageId NULL = đã upload nhưng chưa gắn vào tin nào; ChatAttachmentCleanupJob dọn sau
 * 24 giờ. storageKey là tên file trên đĩa, sinh ngẫu nhiên, không bao giờ lấy từ người dùng.
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "message_attachments")
public class MessageAttachment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "message_id")
    private Long messageId;

    @Column(name = "uploader_id", nullable = false, updatable = false)
    private Long uploaderId;

    @Column(name = "storage_key", nullable = false, updatable = false, length = 255)
    private String storageKey;

    @Column(nullable = false, length = 50, updatable = false)
    private String mime;

    @Column(name = "size_bytes", nullable = false, updatable = false)
    private Integer sizeBytes;

    @Column(updatable = false)
    private Integer width;

    @Column(updatable = false)
    private Integer height;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    /** Giống Message: không ghi đè khi đã có giá trị, để test đặt được mốc thời gian. */
    @PrePersist
    protected void onCreated() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
```

- [ ] **Bước 6: Viết repository**

```java
package com.techx.intervue.modules.conversation.repositories;

import com.techx.intervue.modules.conversation.entities.MessageAttachment;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MessageAttachmentRepository extends JpaRepository<MessageAttachment, Long> {

    /** Gắn ảnh vào danh sách tin của một trang, không N+1. ids không được rỗng. */
    List<MessageAttachment> findByMessageIdIn(Collection<Long> messageIds);

    /** Ảnh upload rồi bỏ đó — ChatAttachmentCleanupJob dọn (spec §8.2). */
    List<MessageAttachment> findByMessageIdIsNullAndCreatedAtBefore(Instant cutoff);

    Optional<MessageAttachment> findByStorageKey(String storageKey);
}
```

- [ ] **Bước 7: Chạy cho xanh**

```bash
docker compose -p market-link-chat3 -f docker-compose.yml -f ../compose.chat3-override.yml exec -T backend ./mvnw -B test -Dtest=MessageAttachmentRepositoryTest
```

Expected: PASS. Nếu Flyway báo lỗi migration, đọc log `docker compose ... logs backend | tail -40` — thường là kiểu khoá ngoại không khớp `BIGINT UNSIGNED`.

- [ ] **Bước 8: Commit**

```bash
make be-format
git add backend/src/main/resources/db/migration/V20260925011__create_message_attachments_table.sql \
        backend/src/main/java/com/techx/intervue/modules/conversation/entities/MessageAttachment.java \
        backend/src/main/java/com/techx/intervue/modules/conversation/repositories/MessageAttachmentRepository.java \
        backend/src/test/java/com/techx/intervue/modules/conversation/repositories/MessageAttachmentRepositoryTest.java
git commit -m "feat(FR-115): add the message_attachments table

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Rate limit bằng bucket4j trên Redis

Spec §8.4: 30 tin/phút, 10 ảnh/giờ, 20 thread mới/giờ cho mỗi user; vượt thì 429. `bucket4j-redis` 8.10.1 **đã có trong `pom.xml`** và `RedisConfig` **đã có bean `RedisClient`** (Lettuce) — không thêm thư viện nào.

**Files:**
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/exceptions/RateLimitedException.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/services/interfaces/ChatRateLimiterInterface.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/services/impl/Bucket4jChatRateLimiter.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/ChatLimitsProperties.java`
- Modify: `backend/src/main/resources/application.yaml` (khối `app.chat`)
- Modify: `backend/src/main/java/com/techx/intervue/modules/conversation/controllers/ConversationExceptionHandler.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/conversation/services/impl/Bucket4jChatRateLimiterTest.java`

**Interfaces:**
- Produces:
  - `enum ChatRateLimiterInterface.Action { MESSAGE, IMAGE, CONVERSATION }`
  - `void ChatRateLimiterInterface.check(Long userId, Action action)` — ném `RateLimitedException` khi hết lượt.
  - `RateLimitedException extends RuntimeException` với `getMessage()` là câu tiếng Anh đưa thẳng cho người dùng.
  - `ChatLimitsProperties(int messagesPerMinute, int imagesPerHour, int conversationsPerHour)` đọc từ `app.chat.limits.*`.
- Consumes: `io.lettuce.core.RedisClient` (bean có sẵn trong `RedisConfig`).

- [ ] **Bước 1: Viết test đỏ**

```java
package com.techx.intervue.modules.conversation.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.conversation.ChatLimitsProperties;
import com.techx.intervue.modules.conversation.exceptions.RateLimitedException;
import com.techx.intervue.modules.conversation.services.interfaces.ChatRateLimiterInterface.Action;
import io.github.bucket4j.BucketConfiguration;
import io.github.bucket4j.distributed.BucketProxy;
import io.github.bucket4j.distributed.proxy.ProxyManager;
import io.github.bucket4j.distributed.proxy.RemoteBucketBuilder;
import java.util.function.Supplier;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.QueryTimeoutException;

class Bucket4jChatRateLimiterTest {

    ProxyManager<String> buckets;
    RemoteBucketBuilder<String> builder;
    BucketProxy bucket;
    Bucket4jChatRateLimiter limiter;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        buckets = mock(ProxyManager.class);
        builder = mock(RemoteBucketBuilder.class);
        bucket = mock(BucketProxy.class);
        when(buckets.builder()).thenReturn(builder);
        when(builder.build(any(String.class), any(Supplier.class))).thenReturn(bucket);
        limiter = new Bucket4jChatRateLimiter(buckets, new ChatLimitsProperties(30, 10, 20));
    }

    @Test
    void letsTheRequestThroughWhileThereAreTokensLeft() {
        when(bucket.tryConsume(1)).thenReturn(true);

        assertThatCode(() -> limiter.check(7L, Action.MESSAGE)).doesNotThrowAnyException();
    }

    @Test
    void refusesWithAReasonOnceTheBucketIsEmpty() {
        when(bucket.tryConsume(1)).thenReturn(false);

        assertThatThrownBy(() -> limiter.check(7L, Action.IMAGE))
                .isInstanceOf(RateLimitedException.class)
                .hasMessage("You are sending photos too quickly. Wait a moment and try again.");
    }

    @Test
    void eachActionHasItsOwnBucketKey() {
        when(bucket.tryConsume(1)).thenReturn(true);
        limiter.check(7L, Action.MESSAGE);
        limiter.check(7L, Action.IMAGE);

        org.mockito.ArgumentCaptor<String> keys =
                org.mockito.ArgumentCaptor.forClass(String.class);
        org.mockito.Mockito.verify(builder, org.mockito.Mockito.times(2))
                .build(keys.capture(), any(Supplier.class));
        assertThat(keys.getAllValues())
                .containsExactly("chat:rate:message:7", "chat:rate:image:7");
    }

    /** Review Focus #4: Redis chết thì chat vẫn chạy, chỉ mất lớp chống spam. */
    @Test
    void letsTheRequestThroughWhenRedisIsDown() {
        when(bucket.tryConsume(1)).thenThrow(new QueryTimeoutException("redis is gone"));

        assertThatCode(() -> limiter.check(7L, Action.MESSAGE)).doesNotThrowAnyException();
    }
}
```

- [ ] **Bước 2: Chạy để chắc chắn đỏ**

```bash
docker compose -p market-link-chat3 -f docker-compose.yml -f ../compose.chat3-override.yml exec -T backend ./mvnw -B test -Dtest=Bucket4jChatRateLimiterTest
```

Expected: FAIL — `cannot find symbol: class Bucket4jChatRateLimiter`.

- [ ] **Bước 3: Viết exception**

```java
package com.techx.intervue.modules.conversation.exceptions;

/** Spec §8.4 — 429. Thông điệp đi thẳng ra cho người dùng đọc. */
public class RateLimitedException extends RuntimeException {
    public RateLimitedException(String message) {
        super(message);
    }
}
```

- [ ] **Bước 4: Viết properties**

```java
package com.techx.intervue.modules.conversation;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Spec §8.4. Mỗi mức tính riêng cho từng user. */
@ConfigurationProperties(prefix = "app.chat.limits")
public record ChatLimitsProperties(
        int messagesPerMinute, int imagesPerHour, int conversationsPerHour) {}
```

Thêm vào `application.yaml` **bên trong khối `app.chat` đang có** (ngay dưới `rabbitmq:`), giữ nguyên thụt lề 4 khoảng trắng của khối đó:

```yaml
    # Spec §8.4: chống rải tin. Mỗi user một bucket trên Redis (bucket4j).
    limits:
      messages-per-minute: ${CHAT_MESSAGES_PER_MINUTE:30}
      images-per-hour: ${CHAT_IMAGES_PER_HOUR:10}
      conversations-per-hour: ${CHAT_CONVERSATIONS_PER_HOUR:20}
```

Kiểm tra `@ConfigurationPropertiesScan` hoặc `@EnableConfigurationProperties` đang bật ở đâu cho `ChatRealtimeProperties` và làm y hệt cho `ChatLimitsProperties`:

```bash
grep -rn 'ConfigurationPropertiesScan\|EnableConfigurationProperties' backend/src/main/java
```

- [ ] **Bước 5: Viết interface**

```java
package com.techx.intervue.modules.conversation.services.interfaces;

/**
 * Spec §8.4. Tách interface để service nghiệp vụ và test của nó không phải biết Redis hay bucket4j.
 */
public interface ChatRateLimiterInterface {

    enum Action {
        MESSAGE,
        IMAGE,
        CONVERSATION
    }

    /** Hết lượt thì ném RateLimitedException (→ 429). */
    void check(Long userId, Action action);
}
```

- [ ] **Bước 6: Viết bản cài đặt**

```java
package com.techx.intervue.modules.conversation.services.impl;

import com.techx.intervue.modules.conversation.ChatLimitsProperties;
import com.techx.intervue.modules.conversation.exceptions.RateLimitedException;
import com.techx.intervue.modules.conversation.services.interfaces.ChatRateLimiterInterface;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.BucketConfiguration;
import io.github.bucket4j.distributed.proxy.ProxyManager;
import java.time.Duration;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Spec §8.4. Bucket sống trên Redis nên nhiều instance backend dùng chung một hạn mức.
 *
 * <p>Redis hỏng thì cho request đi qua (fail-open): rate limit là lớp chống lạm dụng, không phải
 * lớp bảo mật — để Redis kéo cả chat sập là đổi một phiền toái lấy một sự cố.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class Bucket4jChatRateLimiter implements ChatRateLimiterInterface {

    static final String KEY_PREFIX = "chat:rate:";

    private final ProxyManager<String> buckets;
    private final ChatLimitsProperties limits;

    @Override
    public void check(Long userId, Action action) {
        String key = KEY_PREFIX + action.name().toLowerCase(java.util.Locale.ROOT) + ":" + userId;
        boolean allowed;
        try {
            allowed = buckets.builder().build(key, () -> configFor(action)).tryConsume(1);
        } catch (RuntimeException e) {
            // Bắt rộng: DataAccessException của Spring, RedisException của Lettuce và
            // BucketExecutionException của bucket4j đều là RuntimeException và đều nghĩa là
            // "không hỏi được Redis". RateLimitedException ném SAU khối này nên không bị nuốt.
            log.warn("Chat rate limit check skipped, Redis unavailable: {}", e.getMessage());
            return;
        }
        if (!allowed) {
            throw new RateLimitedException(reasonFor(action));
        }
    }

    private BucketConfiguration configFor(Action action) {
        return switch (action) {
            case MESSAGE ->
                    bucket(limits.messagesPerMinute(), Duration.ofMinutes(1));
            case IMAGE -> bucket(limits.imagesPerHour(), Duration.ofHours(1));
            case CONVERSATION -> bucket(limits.conversationsPerHour(), Duration.ofHours(1));
        };
    }

    private static BucketConfiguration bucket(int capacity, Duration window) {
        return BucketConfiguration.builder()
                .addLimit(Bandwidth.builder().capacity(capacity).refillGreedy(capacity, window).build())
                .build();
    }

    private static String reasonFor(Action action) {
        return switch (action) {
            case MESSAGE -> "You are sending messages too quickly. Wait a moment and try again.";
            case IMAGE -> "You are sending photos too quickly. Wait a moment and try again.";
            case CONVERSATION ->
                    "You have started too many conversations in the last hour. Try again later.";
        };
    }
}
```

> Ba chữ ký dùng ở trên đã được kiểm bằng `javap` trên jar 8.10.1 thật: `Bandwidth.builder()` → `capacity(long)` → `refillGreedy(long, Duration)` → `build()`, và `BucketConfiguration.builder().addLimit(Bandwidth).build()`. Không cần API dự phòng.

- [ ] **Bước 7: Bean `ProxyManager<String>`**

Thêm vào `backend/src/main/java/com/techx/intervue/config/RedisConfig.java`:

```java
    /**
     * FR-115 / spec §8.4: bucket4j lưu bucket trên Redis qua RedisClient đã có. Khoá là chuỗi nên
     * bọc ProxyManager<byte[]> lại bằng withMapper để service không phải tự đổi kiểu.
     */
    @Bean
    public io.github.bucket4j.distributed.proxy.ProxyManager<String> chatRateLimitBuckets(
            io.lettuce.core.RedisClient redisClient) {
        return io.github.bucket4j.redis.lettuce.cas.LettuceBasedProxyManager.builderFor(redisClient)
                .withExpirationStrategy(
                        io.github.bucket4j.distributed.ExpirationAfterWriteStrategy
                                .basedOnTimeForRefillingBucketUpToMax(java.time.Duration.ofHours(2)))
                .build()
                .withMapper(key -> key.getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }
```

> `basedOnTimeForRefillingBucketUpToMax(Duration)` đã được kiểm bằng `javap` là có trong 8.10.1. TTL chỉ để key không sống mãi trong Redis; 2 giờ là gấp đôi cửa sổ dài nhất (1 giờ).

Import gọn lại theo Spotless sau khi chạy `make be-format`.

- [ ] **Bước 8: 429 trong exception handler**

Thêm vào `ConversationExceptionHandler`:

```java
    /** Spec §8.4 — vượt hạn mức. Lý do viết thẳng bằng chữ để FE hiện nguyên câu. */
    @ExceptionHandler(RateLimitedException.class)
    ResponseEntity<ApiResource<Void>> tooManyRequests(RateLimitedException e) {
        return error(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMITED", e.getMessage(), List.of());
    }
```

Thêm import `com.techx.intervue.modules.conversation.exceptions.RateLimitedException;`.

- [ ] **Bước 9: Chạy cho xanh**

```bash
docker compose -p market-link-chat3 -f docker-compose.yml -f ../compose.chat3-override.yml exec -T backend ./mvnw -B test -Dtest=Bucket4jChatRateLimiterTest
```

Expected: PASS (4 test).

- [ ] **Bước 10: Cắm vào hai chỗ đã có**

`ConversationService.open(...)`: thêm `ChatRateLimiterInterface rateLimiter` vào constructor (Lombok `@RequiredArgsConstructor` — chỉ cần thêm field `private final`), và gọi **ngay đầu** method `open`:

```java
        rateLimiter.check(meId, ChatRateLimiterInterface.Action.CONVERSATION);
```

`MessageService.send(...)`: thêm field tương tự và gọi ngay đầu method:

```java
        rateLimiter.check(meId, ChatRateLimiterInterface.Action.MESSAGE);
```

Sửa `ConversationServiceTest` và `MessageServiceTest`: thêm `mock(ChatRateLimiterInterface.class)` vào đúng vị trí trong constructor. **Thứ tự tham số phải khớp thứ tự khai báo field** — đặt `rateLimiter` **cuối cùng** trong cả hai class để chỉ phải thêm một tham số vào cuối lời gọi constructor trong test.

Thêm vào `MessageServiceTest` một test mới:

```java
    @Test
    void refusesToSendWhenTheUserIsOverTheRateLimit() {
        org.mockito.Mockito.doThrow(new RateLimitedException("too fast"))
                .when(rateLimiter)
                .check(7L, ChatRateLimiterInterface.Action.MESSAGE);

        assertThatThrownBy(() -> service.send(7L, 42L, new SendMessageRequest(null, "hi", null, null)))
                .isInstanceOf(RateLimitedException.class);
        verify(messages, never()).save(any(Message.class));
    }
```

- [ ] **Bước 11: Chạy lại toàn bộ test của module**

```bash
docker compose -p market-link-chat3 -f docker-compose.yml -f ../compose.chat3-override.yml exec -T backend ./mvnw -B test -Dtest='*Conversation*,*Message*,Bucket4jChatRateLimiterTest'
```

Expected: PASS.

- [ ] **Bước 12: Commit**

```bash
make be-format
git add -A backend/src backend/src/main/resources/application.yaml
git commit -m "feat(FR-115): rate limit chat messages, photos and new conversations

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Kho ảnh riêng, tách khỏi `/uploads` công khai

**Vì sao phải tách:** `application.yaml` đặt `app.storage.dir=${STORAGE_DIR:./uploads}` và `app.uploads.dir=${UPLOAD_DIR:uploads}`; trong Docker `STORAGE_DIR=/app/uploads` còn `UPLOAD_DIR` không được đặt nên mặc định `uploads` tương đối với `/app` — **cùng một thư mục**. `AppConfig` map thư mục đó ra `/uploads/**` và `SecurityConfig` để `/uploads/**` là `permitAll`. Nghĩa là mọi thứ `LocalFileStorageService` ghi ra đều tải về được không cần đăng nhập. Ảnh chat **không được** nằm ở đó (spec §8.2).

**Files:**
- Modify: `backend/src/main/java/com/techx/intervue/services/impl/LocalFileStorageService.java` (thêm `@Primary`)
- Modify: `backend/src/main/java/com/techx/intervue/modules/conversation/ChatConfig.java` — **tạo mới** nếu chưa có (chú ý: đã có một `ChatConfig` khác ở `modules/chat/`, của chatbot FR-090; file mới nằm ở `modules/conversation/`)
- Modify: `backend/src/main/resources/application.yaml`
- Modify: `.env.example`, `.env.production.example`, `docker-compose.yml`, `docker-compose.prod.yml`
- Test: `backend/src/test/java/com/techx/intervue/modules/conversation/ChatAttachmentStorageTest.java`

**Interfaces:**
- Produces: bean `FileStorageServiceInterface chatFileStorage` — gốc là `app.chat.upload-dir`, tách hẳn khỏi bean mặc định. Task 5 và 7 inject bằng `@Qualifier("chatFileStorage")`.

- [ ] **Bước 1: Viết test đỏ**

```java
package com.techx.intervue.modules.conversation;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.services.interfaces.FileStorageServiceInterface;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class ChatAttachmentStorageTest {

    @Test
    void writesUnderTheChatRootItWasGivenAndNowhereElse(@TempDir Path chatDir) throws Exception {
        FileStorageServiceInterface chat = new ChatConfig().chatFileStorage(chatDir.toString());

        chat.store("images", "abc-123.jpg", new byte[] {1, 2, 3});

        assertThat(Files.readAllBytes(chatDir.resolve("images").resolve("abc-123.jpg")))
                .containsExactly(1, 2, 3);
        assertThat(chat.find("images", "abc-123.jpg")).isPresent();
    }

    @Test
    void refusesAStorageKeyThatTriesToEscapeTheFolder(@TempDir Path chatDir) {
        FileStorageServiceInterface chat = new ChatConfig().chatFileStorage(chatDir.toString());

        assertThat(chat.find("images", "../../etc/passwd")).isEmpty();
    }
}
```

- [ ] **Bước 2: Chạy để chắc chắn đỏ**

```bash
docker compose -p market-link-chat3 -f docker-compose.yml -f ../compose.chat3-override.yml exec -T backend ./mvnw -B test -Dtest=ChatAttachmentStorageTest
```

Expected: FAIL — `cannot find symbol: class ChatConfig` (trong package `modules.conversation`).

- [ ] **Bước 3: Viết config**

```java
package com.techx.intervue.modules.conversation;

import com.techx.intervue.services.impl.LocalFileStorageService;
import com.techx.intervue.services.interfaces.FileStorageServiceInterface;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Spec §8.2: ảnh chat KHÔNG được nằm trong app.storage.dir — thư mục đó được AppConfig map ra
 * /uploads/** và SecurityConfig cho permitAll, nên ai có link cũng tải được. Bean này dùng lại
 * đúng logic đường dẫn an toàn của LocalFileStorageService nhưng cắm vào một gốc khác.
 *
 * <p>Không nhầm với com.techx.intervue.modules.chat.ChatConfig — đó là chatbot FR-090.
 */
@Configuration
public class ChatConfig {

    @Bean
    public FileStorageServiceInterface chatFileStorage(
            @Value("${app.chat.upload-dir}") String dir) {
        return new LocalFileStorageService(dir);
    }
}
```

- [ ] **Bước 4: Đánh dấu bean mặc định là `@Primary`**

Hai bean cùng kiểu `FileStorageServiceInterface` sẽ làm `AvatarService` và `FarmerUploadService` (đang inject không có qualifier) không biết chọn cái nào. Thêm `@Primary` vào `LocalFileStorageService`:

```java
import org.springframework.context.annotation.Primary;
...
@Slf4j
@Service
@Primary
public class LocalFileStorageService implements FileStorageServiceInterface {
```

- [ ] **Bước 5: Thêm cấu hình và biến môi trường**

`application.yaml`, trong khối `app.chat` (cùng chỗ với `limits` vừa thêm):

```yaml
    # Spec §8.2: ảnh chat nằm TÁCH khỏi app.storage.dir (thư mục đó phục vụ công khai qua /uploads).
    # Docker: volume chat-uploads ở /var/lib/marketlink/chat.
    upload-dir: ${CHAT_UPLOAD_DIR:./chat-uploads}
    max-upload-bytes: ${CHAT_MAX_UPLOAD_BYTES:5242880}
```

`.env.example` — thêm vào khối chat đang có (cạnh `RABBITMQ_*`):

```bash
# FR-115: ảnh trong chat. Thư mục này TÁCH khỏi /uploads, chỉ ra ngoài qua GET /api/v1/attachments/{id}.
CHAT_UPLOAD_DIR=/var/lib/marketlink/chat
CHAT_MAX_UPLOAD_BYTES=5242880
CHAT_MESSAGES_PER_MINUTE=30
CHAT_IMAGES_PER_HOUR=10
CHAT_CONVERSATIONS_PER_HOUR=20
```

`.env.production.example` — cùng các biến, cùng giá trị (spec §12.2 ghi "như dev"), kèm một dòng chú thích rằng đây là đường dẫn trong container, không phải trên host.

`docker-compose.yml`, service `backend`:

```yaml
      CHAT_UPLOAD_DIR: ${CHAT_UPLOAD_DIR:-/var/lib/marketlink/chat}
      CHAT_MAX_UPLOAD_BYTES: ${CHAT_MAX_UPLOAD_BYTES:-5242880}
      CHAT_MESSAGES_PER_MINUTE: ${CHAT_MESSAGES_PER_MINUTE:-30}
      CHAT_IMAGES_PER_HOUR: ${CHAT_IMAGES_PER_HOUR:-10}
      CHAT_CONVERSATIONS_PER_HOUR: ${CHAT_CONVERSATIONS_PER_HOUR:-20}
```

và trong `volumes:` của service `backend`:

```yaml
      - chat-uploads:/var/lib/marketlink/chat # FR-115: ảnh chat, tách khỏi uploads-data công khai
```

và trong khối `volumes:` cuối file, cạnh `uploads-data:`:

```yaml
  chat-uploads:
```

`docker-compose.prod.yml`: y hệt (cùng biến, cùng volume, cùng mount).

- [ ] **Bước 6: Kiểm tra env guard vẫn xanh**

```bash
make check-env
```

Expected: xanh. Script này so `.env.example` với `.env.production.example`; thiếu biến ở một bên là đỏ.

- [ ] **Bước 7: Dựng lại stack và chạy test**

```bash
docker compose -p market-link-chat3 -f docker-compose.yml -f ../compose.chat3-override.yml --profile app up -d --build backend
docker compose -p market-link-chat3 -f docker-compose.yml -f ../compose.chat3-override.yml exec -T backend ./mvnw -B test -Dtest=ChatAttachmentStorageTest
```

Expected: PASS. Kiểm bằng mắt rằng thư mục tồn tại và **không** nằm trong `/app/uploads`:

```bash
docker compose -p market-link-chat3 -f docker-compose.yml -f ../compose.chat3-override.yml exec -T backend sh -c 'echo $CHAT_UPLOAD_DIR && ls -la /var/lib/marketlink'
```

- [ ] **Bước 8: Commit**

```bash
make be-format
git add -A
git commit -m "feat(FR-115): store chat photos outside the public uploads folder

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: `POST /api/v1/attachments` — tải ảnh lên

**Files:**
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/services/interfaces/AttachmentServiceInterface.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/services/impl/AttachmentService.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/services/impl/ImageProbe.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/controllers/AttachmentController.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/resources/AttachmentResource.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/exceptions/AttachmentTooLargeException.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/exceptions/UnsupportedImageTypeException.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/conversation/controllers/ConversationExceptionHandler.java` (đổi `assignableTypes` để bao cả controller mới, thêm 413/415)
- Test: `backend/src/test/java/com/techx/intervue/modules/conversation/services/impl/ImageProbeTest.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/conversation/services/impl/AttachmentServiceTest.java`

**Interfaces:**
- Produces:
  - `record AttachmentResource(Long attachmentId, String url, Integer width, Integer height)` — `url` = `"/api/v1/attachments/" + id`.
  - `AttachmentResource AttachmentServiceInterface.upload(Long meId, MultipartFile file)`
  - `record ImageProbe.Probed(String mime, int width, int height)` và `static Probed ImageProbe.probe(byte[] bytes)` — ném `UnsupportedImageTypeException` (415) nếu không phải jpg/png/webp, `InvalidFieldException` nếu kích thước pixel vượt trần.
  - `static byte[] ImageProbe.normalize(byte[] bytes, String mime)` — jpg/png → JPEG mã hoá lại (rụng EXIF); webp → trả nguyên bytes.

- [ ] **Bước 1: Viết test đỏ cho `ImageProbe`**

```java
package com.techx.intervue.modules.conversation.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.techx.intervue.modules.conversation.exceptions.UnsupportedImageTypeException;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;

class ImageProbeTest {

    @Test
    void readsTheSizeOfAPng() throws Exception {
        ImageProbe.Probed probed = ImageProbe.probe(png(40, 25));

        assertThat(probed.mime()).isEqualTo("image/png");
        assertThat(probed.width()).isEqualTo(40);
        assertThat(probed.height()).isEqualTo(25);
    }

    @Test
    void readsTheSizeOfALossyWebpWithoutDecodingIt() {
        ImageProbe.Probed probed = ImageProbe.probe(lossyWebp(300, 200));

        assertThat(probed.mime()).isEqualTo("image/webp");
        assertThat(probed.width()).isEqualTo(300);
        assertThat(probed.height()).isEqualTo(200);
    }

    /** Review Focus #1. */
    @Test
    void rejectsAFileThatIsNotAnImageWhateverItsName() {
        byte[] pdf = "%PDF-1.7\n%âãÏÓ\n".getBytes(StandardCharsets.ISO_8859_1);

        assertThatThrownBy(() -> ImageProbe.probe(pdf))
                .isInstanceOf(UnsupportedImageTypeException.class);
    }

    @Test
    void rejectsAnEmptyFile() {
        assertThatThrownBy(() -> ImageProbe.probe(new byte[0]))
                .isInstanceOf(UnsupportedImageTypeException.class);
    }

    /** Review Focus #2: header khai kích thước khổng lồ, không được giải mã điểm ảnh. */
    @Test
    void rejectsAnImageThatIsTooLargeInPixels() {
        byte[] bomb = lossyWebp(16000, 16000);

        assertThatThrownBy(() -> ImageProbe.probe(bomb))
                .isInstanceOf(InvalidFieldException.class)
                .hasMessageContaining("4096");
    }

    @Test
    void reEncodingAPngStripsEverythingButThePixels() throws Exception {
        byte[] jpeg = ImageProbe.normalize(png(10, 10), "image/png");

        assertThat(jpeg[0] & 0xFF).isEqualTo(0xFF);
        assertThat(jpeg[1] & 0xFF).isEqualTo(0xD8);
        assertThat(ImageIO.read(new java.io.ByteArrayInputStream(jpeg)).getWidth()).isEqualTo(10);
    }

    @Test
    void aWebpIsStoredExactlyAsItArrived() {
        byte[] original = lossyWebp(20, 10);

        assertThat(ImageProbe.normalize(original, "image/webp")).isEqualTo(original);
    }

    private static byte[] png(int w, int h) throws Exception {
        BufferedImage image = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, "png", out);
        return out.toByteArray();
    }

    /** RIFF….WEBP + chunk "VP8 " lossy: sync code 9d 01 2a rồi width/height 14 bit little-endian. */
    private static byte[] lossyWebp(int w, int h) {
        byte[] payload = new byte[10 + 20];
        ByteBuffer body = ByteBuffer.wrap(payload).order(ByteOrder.LITTLE_ENDIAN);
        body.put(new byte[] {0x00, 0x00, 0x00}); // frame tag
        body.put(new byte[] {(byte) 0x9d, 0x01, 0x2a}); // sync code
        body.putShort((short) w);
        body.putShort((short) h);

        ByteBuffer riff =
                ByteBuffer.allocate(12 + 8 + payload.length).order(ByteOrder.LITTLE_ENDIAN);
        riff.put("RIFF".getBytes(StandardCharsets.US_ASCII));
        riff.putInt(4 + 8 + payload.length);
        riff.put("WEBP".getBytes(StandardCharsets.US_ASCII));
        riff.put("VP8 ".getBytes(StandardCharsets.US_ASCII));
        riff.putInt(payload.length);
        riff.put(payload);
        return riff.array();
    }
}
```

- [ ] **Bước 2: Chạy để chắc chắn đỏ**

```bash
docker compose -p market-link-chat3 -f docker-compose.yml -f ../compose.chat3-override.yml exec -T backend ./mvnw -B test -Dtest=ImageProbeTest
```

Expected: FAIL — `cannot find symbol: class ImageProbe`.

- [ ] **Bước 3: Viết hai exception**

```java
package com.techx.intervue.modules.conversation.exceptions;

/** Spec §6.3 — 413. */
public class AttachmentTooLargeException extends RuntimeException {
    public AttachmentTooLargeException(long maxBytes) {
        super("The photo must be " + (maxBytes / (1024 * 1024)) + " MB or smaller.");
    }
}
```

```java
package com.techx.intervue.modules.conversation.exceptions;

/** Spec §6.3 — 415. Không tin Content-Type client gửi; đây là kết luận sau khi đọc magic bytes. */
public class UnsupportedImageTypeException extends RuntimeException {
    public UnsupportedImageTypeException() {
        super("Send a JPEG, PNG or WebP photo.");
    }
}
```

- [ ] **Bước 4: Viết `ImageProbe`**

```java
package com.techx.intervue.modules.conversation.services.impl;

import com.techx.intervue.modules.conversation.exceptions.UnsupportedImageTypeException;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;
import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageInputStream;
import javax.imageio.stream.ImageOutputStream;

/**
 * Spec §8.2: kiểu ảnh kết luận từ magic bytes, không từ Content-Type. JPEG/PNG được giải mã rồi mã
 * hoá lại thành JPEG nên EXIF (có thể chứa toạ độ GPS) rụng hết — giống AvatarService.
 *
 * <p>WebP: OpenJDK không có plugin ImageIO nào đọc được WebP (đã kiểm trên JDK 21 và 25), nên kích
 * thước đọc thẳng từ header RIFF và file được lưu nguyên vẹn. Hệ quả: khối EXIF/XMP trong một WebP
 * mở rộng không bị bóc. Ảnh chỉ ra ngoài qua endpoint có kiểm quyền và chỉ tới đúng người nhận mà
 * người gửi đã chọn, nên đây là đánh đổi có ý thức, không phải sót.
 */
public final class ImageProbe {

    /** Chặn ảnh "bom giải nén": kết luận từ header, trước khi cấp phát bộ nhớ cho điểm ảnh. */
    static final int MAX_SIDE = 4096;

    static final String JPEG = "image/jpeg";
    static final String PNG = "image/png";
    static final String WEBP = "image/webp";

    private static final float JPEG_QUALITY = 0.85f;

    private ImageProbe() {}

    public record Probed(String mime, int width, int height) {}

    public static Probed probe(byte[] bytes) {
        String mime = sniff(bytes);
        Probed probed = WEBP.equals(mime) ? probeWebp(bytes) : probeWithImageIo(bytes, mime);
        if (probed.width() > MAX_SIDE || probed.height() > MAX_SIDE) {
            throw new InvalidFieldException(
                    "file", "The photo must be at most " + MAX_SIDE + " pixels on each side.");
        }
        return probed;
    }

    /** JPEG/PNG → JPEG mã hoá lại. WebP → nguyên si (không có bộ mã hoá nào trong JDK). */
    public static byte[] normalize(byte[] bytes, String mime) {
        if (WEBP.equals(mime)) {
            return bytes;
        }
        return encodeJpeg(decode(bytes));
    }

    private static String sniff(byte[] b) {
        if (isJpeg(b)) {
            return JPEG;
        }
        if (isPng(b)) {
            return PNG;
        }
        if (isWebp(b)) {
            return WEBP;
        }
        throw new UnsupportedImageTypeException();
    }

    private static boolean isJpeg(byte[] b) {
        return b.length > 3
                && (b[0] & 0xFF) == 0xFF
                && (b[1] & 0xFF) == 0xD8
                && (b[2] & 0xFF) == 0xFF;
    }

    private static boolean isPng(byte[] b) {
        byte[] sig = {(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'};
        if (b.length < sig.length) {
            return false;
        }
        for (int i = 0; i < sig.length; i++) {
            if (b[i] != sig[i]) {
                return false;
            }
        }
        return true;
    }

    private static boolean isWebp(byte[] b) {
        return b.length > 15
                && ascii(b, 0, 4).equals("RIFF")
                && ascii(b, 8, 4).equals("WEBP");
    }

    private static String ascii(byte[] b, int from, int length) {
        return new String(b, from, length, StandardCharsets.US_ASCII);
    }

    /** Ba biến thể chunk của WebP; xem RFC 9649 §2. */
    private static Probed probeWebp(byte[] b) {
        String chunk = ascii(b, 12, 4);
        try {
            return switch (chunk) {
                case "VP8 " -> {
                    // 20: frame tag (3) + sync code (3) = 6 byte sau chunk header ở 20
                    int width = le16(b, 26) & 0x3FFF;
                    int height = le16(b, 28) & 0x3FFF;
                    yield new Probed(WEBP, width, height);
                }
                case "VP8L" -> {
                    int bits = le32(b, 21);
                    yield new Probed(WEBP, (bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1);
                }
                case "VP8X" -> new Probed(WEBP, le24(b, 24) + 1, le24(b, 27) + 1);
                default -> throw new UnsupportedImageTypeException();
            };
        } catch (ArrayIndexOutOfBoundsException e) {
            throw new UnsupportedImageTypeException();
        }
    }

    private static int le16(byte[] b, int at) {
        return (b[at] & 0xFF) | ((b[at + 1] & 0xFF) << 8);
    }

    private static int le24(byte[] b, int at) {
        return le16(b, at) | ((b[at + 2] & 0xFF) << 16);
    }

    private static int le32(byte[] b, int at) {
        return le24(b, at) | ((b[at + 3] & 0xFF) << 24);
    }

    private static Probed probeWithImageIo(byte[] bytes, String mime) {
        try (ImageInputStream in =
                ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
            Iterator<ImageReader> readers = in == null ? null : ImageIO.getImageReaders(in);
            if (readers == null || !readers.hasNext()) {
                throw new UnsupportedImageTypeException();
            }
            ImageReader reader = readers.next();
            try {
                reader.setInput(in, true, true);
                return new Probed(mime, reader.getWidth(0), reader.getHeight(0));
            } finally {
                reader.dispose();
            }
        } catch (IOException e) {
            throw new UnsupportedImageTypeException();
        }
    }

    private static BufferedImage decode(byte[] bytes) {
        try {
            BufferedImage image = ImageIO.read(new ByteArrayInputStream(bytes));
            if (image == null) {
                throw new UnsupportedImageTypeException();
            }
            return image;
        } catch (IOException e) {
            throw new UnsupportedImageTypeException();
        }
    }

    /** JPEG không có kênh alpha: phần trong suốt của PNG thành nền trắng. */
    private static byte[] encodeJpeg(BufferedImage source) {
        BufferedImage flat =
                new BufferedImage(
                        source.getWidth(), source.getHeight(), BufferedImage.TYPE_INT_RGB);
        java.awt.Graphics2D g = flat.createGraphics();
        try {
            g.setColor(java.awt.Color.WHITE);
            g.fillRect(0, 0, flat.getWidth(), flat.getHeight());
            g.drawImage(source, 0, 0, null);
        } finally {
            g.dispose();
        }

        ImageWriter writer = ImageIO.getImageWritersByFormatName("jpeg").next();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (ImageOutputStream ios = ImageIO.createImageOutputStream(out)) {
            writer.setOutput(ios);
            ImageWriteParam param = writer.getDefaultWriteParam();
            param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
            param.setCompressionQuality(JPEG_QUALITY);
            writer.write(null, new IIOImage(flat, null, null), param);
        } catch (IOException e) {
            throw new IllegalStateException("Could not encode the photo", e);
        } finally {
            writer.dispose();
        }
        return out.toByteArray();
    }
}
```

- [ ] **Bước 5: Chạy `ImageProbeTest` cho xanh**

```bash
docker compose -p market-link-chat3 -f docker-compose.yml -f ../compose.chat3-override.yml exec -T backend ./mvnw -B test -Dtest=ImageProbeTest
```

Expected: PASS (7 test). Nếu `readsTheSizeOfALossyWebpWithoutDecodingIt` lệch offset, in ra `HexFormat.of().formatHex(lossyWebp(300,200))` trong test và đếm lại byte — phần header RIFF là 12 byte, chunk header là 8 byte, nên frame tag bắt đầu ở 20 và width ở 26.

- [ ] **Bước 6: Viết test đỏ cho `AttachmentService`**

```java
package com.techx.intervue.modules.conversation.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.conversation.ChatLimitsProperties;
import com.techx.intervue.modules.conversation.entities.MessageAttachment;
import com.techx.intervue.modules.conversation.exceptions.AttachmentTooLargeException;
import com.techx.intervue.modules.conversation.exceptions.UnsupportedImageTypeException;
import com.techx.intervue.modules.conversation.repositories.MessageAttachmentRepository;
import com.techx.intervue.modules.conversation.resources.AttachmentResource;
import com.techx.intervue.modules.conversation.services.interfaces.ChatRateLimiterInterface;
import com.techx.intervue.services.interfaces.FileStorageServiceInterface;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockMultipartFile;

class AttachmentServiceTest {

    static final long MAX_BYTES = 5L * 1024 * 1024;

    MessageAttachmentRepository attachments;
    FileStorageServiceInterface storage;
    ChatRateLimiterInterface rateLimiter;
    AttachmentService service;

    @BeforeEach
    void setUp() {
        attachments = mock(MessageAttachmentRepository.class);
        storage = mock(FileStorageServiceInterface.class);
        rateLimiter = mock(ChatRateLimiterInterface.class);
        when(attachments.save(any(MessageAttachment.class)))
                .thenAnswer(
                        inv -> {
                            MessageAttachment a = inv.getArgument(0);
                            a.setId(55L);
                            return a;
                        });
        service = new AttachmentService(attachments, storage, rateLimiter, MAX_BYTES);
    }

    @Test
    void storesThePhotoUnderARandomKeyAndReturnsItsSize() throws Exception {
        AttachmentResource resource =
                service.upload(7L, new MockMultipartFile("file", "holiday.png", "image/png", png(40, 25)));

        assertThat(resource.attachmentId()).isEqualTo(55L);
        assertThat(resource.url()).isEqualTo("/api/v1/attachments/55");
        assertThat(resource.width()).isEqualTo(40);
        assertThat(resource.height()).isEqualTo(25);

        ArgumentCaptor<String> fileName = ArgumentCaptor.forClass(String.class);
        verify(storage).store(anyString(), fileName.capture(), any(byte[].class));
        // Tên file không được lấy từ người dùng (spec §8.2)
        assertThat(fileName.getValue()).doesNotContain("holiday").endsWith(".jpg");
    }

    @Test
    void refusesAPhotoOverTheLimitWithoutTouchingTheDisk() {
        byte[] tooBig = new byte[(int) MAX_BYTES + 1];

        assertThatThrownBy(
                        () ->
                                service.upload(
                                        7L,
                                        new MockMultipartFile(
                                                "file", "big.jpg", "image/jpeg", tooBig)))
                .isInstanceOf(AttachmentTooLargeException.class);

        verify(storage, never()).store(anyString(), anyString(), any(byte[].class));
        verify(attachments, never()).save(any(MessageAttachment.class));
    }

    /** Review Focus #1 ở tầng service: không ghi byte nào xuống đĩa. */
    @Test
    void refusesAFileThatIsNotAnImageWhateverItsName() {
        byte[] pdf = "%PDF-1.7".getBytes(StandardCharsets.ISO_8859_1);

        assertThatThrownBy(
                        () ->
                                service.upload(
                                        7L,
                                        new MockMultipartFile(
                                                "file", "photo.jpg", "image/jpeg", pdf)))
                .isInstanceOf(UnsupportedImageTypeException.class);

        verify(storage, never()).store(anyString(), anyString(), any(byte[].class));
    }

    @Test
    void checksTheHourlyPhotoLimitBeforeDoingAnyWork() {
        org.mockito.Mockito.doThrow(
                        new com.techx.intervue.modules.conversation.exceptions.RateLimitedException(
                                "slow down"))
                .when(rateLimiter)
                .check(7L, ChatRateLimiterInterface.Action.IMAGE);

        assertThatThrownBy(
                        () ->
                                service.upload(
                                        7L,
                                        new MockMultipartFile(
                                                "file", "a.png", "image/png", new byte[] {1})))
                .isInstanceOf(
                        com.techx.intervue.modules.conversation.exceptions.RateLimitedException
                                .class);

        verify(storage, never()).store(anyString(), anyString(), any(byte[].class));
    }

    private static byte[] png(int w, int h) throws Exception {
        BufferedImage image = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, "png", out);
        return out.toByteArray();
    }
}
```

- [ ] **Bước 7: Chạy để chắc chắn đỏ**

```bash
docker compose -p market-link-chat3 -f docker-compose.yml -f ../compose.chat3-override.yml exec -T backend ./mvnw -B test -Dtest=AttachmentServiceTest
```

Expected: FAIL — `cannot find symbol: class AttachmentService`.

- [ ] **Bước 8: Viết resource, interface và service**

```java
package com.techx.intervue.modules.conversation.resources;

/** FR-115. url là đường dẫn tương đối tới endpoint có kiểm quyền, không phải link tĩnh. */
public record AttachmentResource(Long attachmentId, String url, Integer width, Integer height) {

    public static final String URL_PREFIX = "/api/v1/attachments/";

    public static AttachmentResource of(Long id, Integer width, Integer height) {
        return new AttachmentResource(id, URL_PREFIX + id, width, height);
    }
}
```

```java
package com.techx.intervue.modules.conversation.services.interfaces;

import com.techx.intervue.modules.conversation.resources.AttachmentResource;
import org.springframework.web.multipart.MultipartFile;

public interface AttachmentServiceInterface {

    /** Tải ảnh lên, chưa gắn vào tin nào. Gắn xảy ra lúc gửi tin (MessageService). */
    AttachmentResource upload(Long meId, MultipartFile file);
}
```

```java
package com.techx.intervue.modules.conversation.services.impl;

import com.techx.intervue.modules.conversation.entities.MessageAttachment;
import com.techx.intervue.modules.conversation.exceptions.AttachmentTooLargeException;
import com.techx.intervue.modules.conversation.exceptions.UnsupportedImageTypeException;
import com.techx.intervue.modules.conversation.repositories.MessageAttachmentRepository;
import com.techx.intervue.modules.conversation.resources.AttachmentResource;
import com.techx.intervue.modules.conversation.services.interfaces.AttachmentServiceInterface;
import com.techx.intervue.modules.conversation.services.interfaces.ChatRateLimiterInterface;
import com.techx.intervue.services.interfaces.FileStorageServiceInterface;
import java.io.IOException;
import java.util.Locale;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/** FR-115, spec §8.2. */
@Service
public class AttachmentService implements AttachmentServiceInterface {

    /** Một thư mục phẳng dưới CHAT_UPLOAD_DIR; tên file là UUID nên không đụng nhau. */
    static final String FOLDER = "images";

    private final MessageAttachmentRepository attachments;
    private final FileStorageServiceInterface storage;
    private final ChatRateLimiterInterface rateLimiter;
    private final long maxBytes;

    public AttachmentService(
            MessageAttachmentRepository attachments,
            @Qualifier("chatFileStorage") FileStorageServiceInterface storage,
            ChatRateLimiterInterface rateLimiter,
            @Value("${app.chat.max-upload-bytes}") long maxBytes) {
        this.attachments = attachments;
        this.storage = storage;
        this.rateLimiter = rateLimiter;
        this.maxBytes = maxBytes;
    }

    @Override
    @Transactional
    public AttachmentResource upload(Long meId, MultipartFile file) {
        rateLimiter.check(meId, ChatRateLimiterInterface.Action.IMAGE);
        byte[] bytes = readWithinLimit(file);
        ImageProbe.Probed probed = ImageProbe.probe(bytes);
        byte[] stored = ImageProbe.normalize(bytes, probed.mime());
        // Ảnh WebP giữ nguyên; JPEG/PNG đã thành JPEG nên mime lưu xuống phải theo file thật
        String mime = "image/webp".equals(probed.mime()) ? probed.mime() : "image/jpeg";
        String storageKey = UUID.randomUUID().toString().toLowerCase(Locale.ROOT) + extension(mime);

        storage.store(FOLDER, storageKey, stored);
        MessageAttachment saved =
                attachments.save(
                        MessageAttachment.builder()
                                .uploaderId(meId)
                                .storageKey(storageKey)
                                .mime(mime)
                                .sizeBytes(stored.length)
                                .width(probed.width())
                                .height(probed.height())
                                .build());
        return AttachmentResource.of(saved.getId(), saved.getWidth(), saved.getHeight());
    }

    private byte[] readWithinLimit(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new UnsupportedImageTypeException();
        }
        if (file.getSize() > maxBytes) {
            throw new AttachmentTooLargeException(maxBytes);
        }
        try {
            return file.getBytes();
        } catch (IOException e) {
            throw new UnsupportedImageTypeException();
        }
    }

    private static String extension(String mime) {
        return "image/webp".equals(mime) ? ".webp" : ".jpg";
    }
}
```

- [ ] **Bước 9: Viết controller**

```java
package com.techx.intervue.modules.conversation.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.conversation.resources.AttachmentResource;
import com.techx.intervue.modules.conversation.services.interfaces.AttachmentServiceInterface;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import com.techx.intervue.resources.ApiResource;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * FR-115. Ảnh tải lên trước, gắn vào tin sau — client cần biết kích thước để chừa chỗ trong khung
 * chat trước khi ảnh tải xong. GET nằm ở AttachmentDownloadController (khác kiểu trả về).
 */
@RestController
@RequestMapping("/api/v1/attachments")
@AllArgsConstructor
public class AttachmentController extends BaseController {

    private final AttachmentServiceInterface attachmentService;

    @PostMapping
    public ResponseEntity<ApiResource<AttachmentResource>> upload(
            @RequestParam MultipartFile file, @AuthenticationPrincipal CustomUserDetails me) {
        return created(attachmentService.upload(me.getId(), file), "Photo uploaded.");
    }
}
```

- [ ] **Bước 10: Mở rộng exception handler**

Đổi dòng annotation của `ConversationExceptionHandler`:

```java
@RestControllerAdvice(
        assignableTypes = {ConversationController.class, AttachmentController.class})
```

> Chỉ hai class. `AttachmentDownloadController` chưa tồn tại ở bước này — viết sẵn tên một class chưa có thì không biên dịch được. Task 7 Bước 5 thêm nó vào danh sách.

Thêm hai handler:

```java
    /** Spec §6.3 — 413. */
    @ExceptionHandler(AttachmentTooLargeException.class)
    ResponseEntity<ApiResource<Void>> tooLarge(AttachmentTooLargeException e) {
        return error(HttpStatus.PAYLOAD_TOO_LARGE, "ATTACHMENT_TOO_LARGE", e.getMessage(), List.of());
    }

    /** Spec §6.3 — 415. */
    @ExceptionHandler(UnsupportedImageTypeException.class)
    ResponseEntity<ApiResource<Void>> unsupportedType(UnsupportedImageTypeException e) {
        return error(
                HttpStatus.UNSUPPORTED_MEDIA_TYPE, "UNSUPPORTED_IMAGE_TYPE", e.getMessage(), List.of());
    }

    /** Vượt trần multipart của Tomcat trước khi vào service — vẫn phải là 413, không phải 500. */
    @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
    ResponseEntity<ApiResource<Void>> multipartTooLarge(Exception e) {
        return error(
                HttpStatus.PAYLOAD_TOO_LARGE,
                "ATTACHMENT_TOO_LARGE",
                "The photo must be 5 MB or smaller.",
                List.of());
    }
```

`InvalidFieldException` (ném từ `ImageProbe` khi ảnh quá lớn về pixel) chưa có handler ở advice này — kiểm xem `modules/user` có advice toàn cục bắt nó không:

```bash
grep -rn 'InvalidFieldException' backend/src/main/java --include='*Handler*'
```

Nếu advice kia không áp cho controller này, thêm handler trả **400**:

```java
    @ExceptionHandler(com.techx.intervue.modules.user.exceptions.InvalidFieldException.class)
    ResponseEntity<ApiResource<Void>> invalidField(
            com.techx.intervue.modules.user.exceptions.InvalidFieldException e) {
        return error(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", e.getMessage(), List.of());
    }
```

- [ ] **Bước 11: Chạy cho xanh**

```bash
docker compose -p market-link-chat3 -f docker-compose.yml -f ../compose.chat3-override.yml exec -T backend ./mvnw -B test -Dtest=AttachmentServiceTest,ImageProbeTest
```

Expected: PASS.

- [ ] **Bước 12: Thử tay qua HTTP**

```bash
# Lấy token của một user có sẵn (xem README hoặc seed). Thay <TOKEN>.
curl -s -X POST http://localhost:8083/api/v1/attachments \
  -H "Authorization: Bearer <TOKEN>" \
  -F "file=@/path/to/photo.jpg" | jq
```

Expected: 201, `data.attachmentId`, `data.url` = `/api/v1/attachments/<id>`, `data.width`/`height` đúng. Rồi kiểm file nằm đúng chỗ:

```bash
docker compose -p market-link-chat3 -f docker-compose.yml -f ../compose.chat3-override.yml exec -T backend ls -la /var/lib/marketlink/chat/images
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8083/uploads/images/<storage_key>
```

Expected: file có trong `/var/lib/marketlink/chat/images`; `curl` tới `/uploads/...` trả **404** (không phải 200 — nếu 200 thì tách kho thất bại, quay lại Task 4).

- [ ] **Bước 13: Commit**

```bash
make be-format
git add -A backend/src
git commit -m "feat(FR-115): upload a chat photo with magic-byte and size checks

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Gửi tin nhắn `kind: "image"`

**Files:**
- Modify: `backend/src/main/java/com/techx/intervue/modules/conversation/requests/SendMessageRequest.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/conversation/resources/MessageResource.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/conversation/services/impl/MessageService.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/exceptions/AttachmentNotYoursException.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/exceptions/AttachmentAlreadyUsedException.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/conversation/controllers/ConversationExceptionHandler.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/conversation/services/impl/MessageServiceTest.java`

**Interfaces:**
- Consumes: `MessageAttachmentRepository`, `AttachmentResource.of(...)` từ Task 2 và 5.
- Produces:
  - `SendMessageRequest(MessageKind kind, String body, Long productId, Long orderId, Long attachmentId)` — **thêm tham số thứ 5**. Mọi chỗ gọi `new SendMessageRequest(...)` trong test phải thêm một `null`.
  - `MessageResource` thêm trường `AttachmentResource attachment` (null khi tin là text — record đã có `@JsonInclude(NON_NULL)` nên trường biến mất khỏi JSON).
  - `MessageResource.from(Message)` giữ nguyên chữ ký; thêm `MessageResource.from(Message, MessageAttachment)`.

- [ ] **Bước 1: Viết test đỏ**

Thêm vào `MessageServiceTest`:

```java
    @Test
    void sendsAnImageMessageWithNoBody() {
        MessageAttachment upload = upload(55L, 7L, null);
        when(attachments.findById(55L)).thenReturn(Optional.of(upload));

        MessageResource sent =
                service.send(7L, 42L, new SendMessageRequest(MessageKind.IMAGE, null, null, null, 55L));

        assertThat(sent.kind()).isEqualTo(MessageKind.IMAGE);
        assertThat(sent.attachment().attachmentId()).isEqualTo(55L);
        assertThat(sent.attachment().url()).isEqualTo("/api/v1/attachments/55");
        assertThat(upload.getMessageId()).isEqualTo(sent.id());
        assertThat(thread.getLastMessageText()).isEqualTo("Photo");
    }

    @Test
    void anImageMessageNeedsAnAttachment() {
        assertThatThrownBy(
                        () ->
                                service.send(
                                        7L,
                                        42L,
                                        new SendMessageRequest(MessageKind.IMAGE, null, null, null, null)))
                .isInstanceOf(EmptyMessageException.class);
    }

    /** Review Focus #3. */
    @Test
    void cannotAttachSomeoneElsesUpload() {
        when(attachments.findById(55L)).thenReturn(Optional.of(upload(55L, 3L, null)));

        assertThatThrownBy(
                        () ->
                                service.send(
                                        7L,
                                        42L,
                                        new SendMessageRequest(MessageKind.IMAGE, null, null, null, 55L)))
                .isInstanceOf(AttachmentNotYoursException.class);
        verify(messages, never()).save(any(Message.class));
    }

    /** Review Focus #3, nửa sau: một ảnh chỉ gắn được vào đúng một tin. */
    @Test
    void cannotReuseAnAttachmentThatIsAlreadyOnAMessage() {
        when(attachments.findById(55L)).thenReturn(Optional.of(upload(55L, 7L, 900L)));

        assertThatThrownBy(
                        () ->
                                service.send(
                                        7L,
                                        42L,
                                        new SendMessageRequest(MessageKind.IMAGE, null, null, null, 55L)))
                .isInstanceOf(AttachmentAlreadyUsedException.class);
    }

    @Test
    void anUnknownAttachmentIdIsNotFound() {
        when(attachments.findById(55L)).thenReturn(Optional.empty());

        assertThatThrownBy(
                        () ->
                                service.send(
                                        7L,
                                        42L,
                                        new SendMessageRequest(MessageKind.IMAGE, null, null, null, 55L)))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void listingAThreadCarriesThePhotoOfEachImageMessage() {
        Message image =
                Message.builder()
                        .id(101L)
                        .conversationId(42L)
                        .senderId(3L)
                        .kind(MessageKind.IMAGE)
                        .createdAt(NOW)
                        .build();
        when(messages.findByConversationIdAndHiddenAtIsNullOrderByIdDesc(eq(42L), any(Pageable.class)))
                .thenReturn(List.of(image));
        when(attachments.findByMessageIdIn(List.of(101L)))
                .thenReturn(List.of(upload(55L, 3L, 101L)));

        List<MessageResource> page = service.list(7L, 42L, null, 30);

        assertThat(page).singleElement().satisfies(m ->
                assertThat(m.attachment().attachmentId()).isEqualTo(55L));
    }

    private static MessageAttachment upload(Long id, Long uploaderId, Long messageId) {
        return MessageAttachment.builder()
                .id(id)
                .uploaderId(uploaderId)
                .messageId(messageId)
                .storageKey(id + "-key.jpg")
                .mime("image/jpeg")
                .sizeBytes(100)
                .width(800)
                .height(600)
                .build();
    }
```

Thêm field `MessageAttachmentRepository attachments;` vào test, khởi tạo bằng `mock(...)` trong `setUp`, và truyền vào constructor `MessageService`. Sửa **mọi** `new SendMessageRequest(...)` đang có trong file (thêm `null` cuối).

- [ ] **Bước 2: Chạy để chắc chắn đỏ**

```bash
docker compose -p market-link-chat3 -f docker-compose.yml -f ../compose.chat3-override.yml exec -T backend ./mvnw -B test -Dtest=MessageServiceTest
```

Expected: FAIL — `constructor SendMessageRequest ... cannot be applied`.

- [ ] **Bước 3: Hai exception mới**

```java
package com.techx.intervue.modules.conversation.exceptions;

/** R-06 — ảnh của người khác. 403, không phải 404: nói thẳng là không được phép. */
public class AttachmentNotYoursException extends RuntimeException {
    public AttachmentNotYoursException() {
        super("This photo is not yours to send.");
    }
}
```

```java
package com.techx.intervue.modules.conversation.exceptions;

/** Một ảnh chỉ gắn vào đúng một tin nhắn. 409. */
public class AttachmentAlreadyUsedException extends RuntimeException {
    public AttachmentAlreadyUsedException() {
        super("This photo has already been sent. Upload it again to send it once more.");
    }
}
```

Thêm vào `ConversationExceptionHandler`:

```java
    @ExceptionHandler(AttachmentNotYoursException.class)
    ResponseEntity<ApiResource<Void>> notYourAttachment(AttachmentNotYoursException e) {
        return error(HttpStatus.FORBIDDEN, "ATTACHMENT_NOT_YOURS", e.getMessage(), List.of());
    }

    @ExceptionHandler(AttachmentAlreadyUsedException.class)
    ResponseEntity<ApiResource<Void>> attachmentUsed(AttachmentAlreadyUsedException e) {
        return error(HttpStatus.CONFLICT, "ATTACHMENT_ALREADY_USED", e.getMessage(), List.of());
    }
```

- [ ] **Bước 4: Nới `SendMessageRequest`**

```java
package com.techx.intervue.modules.conversation.requests;

import com.techx.intervue.modules.conversation.enums.MessageKind;
import jakarta.validation.constraints.Size;

/**
 * FR-110, FR-114, FR-115. kind bỏ trống = text.
 *
 * <p>body không còn @NotBlank vì tin ảnh không có chữ: "phải có gì đó để gửi" là luật nghiệp vụ
 * phụ thuộc kind, nên MessageService quyết (text cần body, image cần attachmentId) và vẫn trả 400
 * qua EmptyMessageException — mã HTTP không đổi so với trước.
 */
public record SendMessageRequest(
        MessageKind kind,
        @Size(max = 2000, message = "A message can be at most 2000 characters.") String body,
        Long productId,
        Long orderId,
        Long attachmentId) {}
```

- [ ] **Bước 5: Thêm ảnh vào `MessageResource`**

```java
package com.techx.intervue.modules.conversation.resources;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.techx.intervue.modules.conversation.entities.Message;
import com.techx.intervue.modules.conversation.entities.MessageAttachment;
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
        AttachmentResource attachment,
        Instant createdAt) {

    public static MessageResource from(Message m) {
        return from(m, null);
    }

    public static MessageResource from(Message m, MessageAttachment attachment) {
        return MessageResource.builder()
                .id(m.getId())
                .conversationId(m.getConversationId())
                .senderId(m.getSenderId())
                .kind(m.getKind())
                .body(m.getBody())
                .productId(m.getProductId())
                .orderId(m.getOrderId())
                .attachment(
                        attachment == null
                                ? null
                                : AttachmentResource.of(
                                        attachment.getId(),
                                        attachment.getWidth(),
                                        attachment.getHeight()))
                .createdAt(m.getCreatedAt())
                .build();
    }
}
```

- [ ] **Bước 6: Sửa `MessageService`**

Thêm field `private final MessageAttachmentRepository attachments;` **ở cuối danh sách field**, ngay sau `rateLimiter` mà Task 3 đã thêm. Thứ tự tham số constructor `MessageService` sau task này phải là:

```
messages, conversations, users, policy, events, lookup, clock, rateLimiter, attachments
```

Mọi test dựng `new MessageService(...)` chỉ việc nối thêm một mock vào cuối. Rồi thay `send` và `list`:

```java
    /** Xem trước của tin ảnh trong danh sách thread — không có chữ nào để hiện. */
    static final String IMAGE_PREVIEW = "Photo";

    @Override
    @Transactional
    public MessageResource send(Long meId, Long conversationId, SendMessageRequest request) {
        rateLimiter.check(meId, ChatRateLimiterInterface.Action.MESSAGE);
        MessageKind kind = request.kind() == null ? MessageKind.TEXT : request.kind();
        if (kind != MessageKind.TEXT && kind != MessageKind.IMAGE) {
            throw new UnsupportedMessageKindException(kind);
        }
        String body = request.body() == null ? "" : request.body().strip();
        if (kind == MessageKind.TEXT && body.isEmpty()) {
            throw new EmptyMessageException();
        }
        if (kind == MessageKind.IMAGE && request.attachmentId() == null) {
            throw new EmptyMessageException();
        }

        Conversation conversation = lookup.requireMember(meId, conversationId);
        User me = requireUser(meId);
        User other = requireUser(conversation.otherMember(meId));
        policy.assertCanSend(me, other);

        // R-06: kiểm ảnh trước khi ghi tin, để một ảnh không phải của mình không tạo ra tin rỗng
        MessageAttachment attachment =
                kind == MessageKind.IMAGE ? requireOwnUnusedAttachment(meId, request.attachmentId()) : null;

        Instant now = clock.instant();
        Message saved =
                messages.save(
                        Message.builder()
                                .conversationId(conversation.getId())
                                .senderId(meId)
                                .kind(kind)
                                .body(body.isEmpty() ? null : body)
                                .productId(request.productId())
                                .orderId(request.orderId())
                                .build());

        if (attachment != null) {
            attachment.setMessageId(saved.getId());
            attachments.save(attachment);
        }

        conversation.noteNewMessage(
                kind == MessageKind.IMAGE ? IMAGE_PREVIEW : preview(body), now);
        conversation.markRead(meId, now);
        conversations.save(conversation);

        MessageResource resource = MessageResource.from(saved, attachment);
        TransactionHelper.afterCommit(() -> events.messageCreated(conversation, resource));
        TransactionHelper.afterCommit(() -> events.conversationRead(conversation, meId, now));
        return resource;
    }

    private MessageAttachment requireOwnUnusedAttachment(Long meId, Long attachmentId) {
        MessageAttachment attachment =
                attachments
                        .findById(attachmentId)
                        .orElseThrow(() -> new EntityNotFoundException("Photo not found."));
        if (!attachment.getUploaderId().equals(meId)) {
            throw new AttachmentNotYoursException();
        }
        if (attachment.getMessageId() != null) {
            throw new AttachmentAlreadyUsedException();
        }
        return attachment;
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
        // Một truy vấn cho cả trang, không N+1
        List<Long> imageIds =
                found.stream()
                        .filter(m -> m.getKind() == MessageKind.IMAGE)
                        .map(Message::getId)
                        .toList();
        Map<Long, MessageAttachment> byMessage =
                imageIds.isEmpty()
                        ? Map.of()
                        : attachments.findByMessageIdIn(imageIds).stream()
                                .collect(
                                        Collectors.toMap(
                                                MessageAttachment::getMessageId, a -> a, (a, b) -> a));
        return found.stream().map(m -> MessageResource.from(m, byMessage.get(m.getId()))).toList();
    }
```

Thêm import: `java.util.Map`, `java.util.stream.Collectors`, `MessageAttachment`, `MessageAttachmentRepository`, hai exception mới.

- [ ] **Bước 7: Chạy cho xanh**

```bash
docker compose -p market-link-chat3 -f docker-compose.yml -f ../compose.chat3-override.yml exec -T backend ./mvnw -B test -Dtest='*Message*,*Conversation*'
```

Expected: PASS. `MessageServicePublishTimingTest` cũng phải xanh — nếu nó đỏ vì constructor đổi, thêm tham số mock vào cuối y như các test kia.

- [ ] **Bước 8: Commit**

```bash
make be-format
git add -A backend/src
git commit -m "feat(FR-115): send a photo as a chat message

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: `GET /api/v1/attachments/{id}` — phục vụ ảnh có kiểm quyền

**Files:**
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/controllers/AttachmentDownloadController.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/conversation/services/interfaces/AttachmentServiceInterface.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/conversation/services/impl/AttachmentService.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/conversation/controllers/ConversationExceptionHandler.java` (thêm `AttachmentDownloadController` vào `assignableTypes`)
- Test: `backend/src/test/java/com/techx/intervue/modules/conversation/services/impl/AttachmentServiceTest.java`

**Interfaces:**
- Produces: `record AttachmentServiceInterface.StoredFile(Resource body, String mime, long sizeBytes)` và `StoredFile AttachmentServiceInterface.read(Long meId, Long attachmentId)`.

**Luật kiểm quyền (R-06):**

| Tình huống | Kết quả |
|---|---|
| Ảnh chưa gắn vào tin nào, người xem là người upload | Cho xem (client hiện ngay sau khi upload, trước khi bấm gửi) |
| Ảnh chưa gắn, người xem là người khác | **403** |
| Ảnh đã gắn, người xem là thành viên của thread | Cho xem |
| Ảnh đã gắn, người xem không thuộc thread | **403** |
| Tin đã bị admin ẩn (`hidden_at` khác null) | **404** — khớp với việc tin đó đã bị bỏ khỏi `list` |
| Không có bản ghi, hoặc file mất trên đĩa | **404** |

- [ ] **Bước 1: Viết test đỏ**

`AttachmentService` nhận thêm hai dependency ở task này, nên **sửa `setUp` của `AttachmentServiceTest` trước**:

```java
    MessageRepository messages;
    ConversationLookup lookup;
    @TempDir Path tmp;
    Path fileOnDisk;

    @BeforeEach
    void setUp() throws Exception {
        attachments = mock(MessageAttachmentRepository.class);
        storage = mock(FileStorageServiceInterface.class);
        rateLimiter = mock(ChatRateLimiterInterface.class);
        messages = mock(MessageRepository.class);
        lookup = mock(ConversationLookup.class);
        fileOnDisk = Files.write(tmp.resolve("x.jpg"), new byte[] {1, 2, 3});
        when(attachments.save(any(MessageAttachment.class)))
                .thenAnswer(
                        inv -> {
                            MessageAttachment a = inv.getArgument(0);
                            a.setId(55L);
                            return a;
                        });
        // Thứ tự khớp constructor: attachments, storage, rateLimiter, maxBytes, messages, lookup
        service =
                new AttachmentService(
                        attachments, storage, rateLimiter, MAX_BYTES, messages, lookup);
    }
```

`ConversationLookup` là class cụ thể (`@Component`, không có interface) nên Mockito mock được trực tiếp.

Rồi thêm các test sau:

```java
    @Test
    void theUploaderCanSeeTheirOwnPhotoBeforeItIsSent() {
        MessageAttachment upload = stored(55L, 7L, null);
        when(attachments.findById(55L)).thenReturn(Optional.of(upload));
        when(storage.find(AttachmentService.FOLDER, upload.getStorageKey()))
                .thenReturn(Optional.of(fileOnDisk));

        AttachmentServiceInterface.StoredFile file = service.read(7L, 55L);

        assertThat(file.mime()).isEqualTo("image/jpeg");
    }

    @Test
    void nobodyElseCanSeeAnUploadThatIsNotOnAMessageYet() {
        when(attachments.findById(55L)).thenReturn(Optional.of(stored(55L, 7L, null)));

        assertThatThrownBy(() -> service.read(3L, 55L))
                .isInstanceOf(ConversationAccessDeniedException.class);
    }

    @Test
    void amemberOfTheThreadCanSeeAPhotoTheyDidNotUpload() {
        MessageAttachment upload = stored(55L, 7L, 101L);
        when(attachments.findById(55L)).thenReturn(Optional.of(upload));
        when(messages.findById(101L)).thenReturn(Optional.of(messageIn(101L, 42L, null)));
        when(storage.find(AttachmentService.FOLDER, upload.getStorageKey()))
                .thenReturn(Optional.of(fileOnDisk));

        assertThat(service.read(3L, 55L).mime()).isEqualTo("image/jpeg");
        verify(lookup).requireMember(3L, 42L);
    }

    @Test
    void someoneOutsideTheThreadGetsRefused() {
        when(attachments.findById(55L)).thenReturn(Optional.of(stored(55L, 7L, 101L)));
        when(messages.findById(101L)).thenReturn(Optional.of(messageIn(101L, 42L, null)));
        org.mockito.Mockito.doThrow(new ConversationAccessDeniedException())
                .when(lookup)
                .requireMember(99L, 42L);

        assertThatThrownBy(() -> service.read(99L, 55L))
                .isInstanceOf(ConversationAccessDeniedException.class);
    }

    /** Review Focus #5. */
    @Test
    void hiddenMessageHidesItsPhotoToo() {
        when(attachments.findById(55L)).thenReturn(Optional.of(stored(55L, 7L, 101L)));
        when(messages.findById(101L)).thenReturn(Optional.of(messageIn(101L, 42L, Instant.now())));

        assertThatThrownBy(() -> service.read(3L, 55L))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void aRecordWithNoFileOnDiskIsNotFound() {
        MessageAttachment upload = stored(55L, 7L, null);
        when(attachments.findById(55L)).thenReturn(Optional.of(upload));
        when(storage.find(AttachmentService.FOLDER, upload.getStorageKey()))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.read(7L, 55L)).isInstanceOf(EntityNotFoundException.class);
    }

    private static MessageAttachment stored(Long id, Long uploaderId, Long messageId) {
        return MessageAttachment.builder()
                .id(id)
                .uploaderId(uploaderId)
                .messageId(messageId)
                .storageKey(id + "-key.jpg")
                .mime("image/jpeg")
                .sizeBytes(100)
                .width(800)
                .height(600)
                .build();
    }

    private static Message messageIn(Long id, Long conversationId, Instant hiddenAt) {
        return Message.builder()
                .id(id)
                .conversationId(conversationId)
                .senderId(7L)
                .kind(MessageKind.IMAGE)
                .hiddenAt(hiddenAt)
                .build();
    }
```

Import thêm: `java.nio.file.Files`, `java.nio.file.Path`, `java.time.Instant`, `java.util.Optional`, `org.junit.jupiter.api.io.TempDir`, `MessageRepository`, `Message`, `MessageKind`, `ConversationLookup`, `ConversationAccessDeniedException`, `jakarta.persistence.EntityNotFoundException`.

- [ ] **Bước 2: Chạy để chắc chắn đỏ**

```bash
docker compose -p market-link-chat3 -f docker-compose.yml -f ../compose.chat3-override.yml exec -T backend ./mvnw -B test -Dtest=AttachmentServiceTest
```

Expected: FAIL — `cannot find symbol: method read(...)`.

- [ ] **Bước 3: Mở rộng interface**

```java
    /** Spec §8.2: file chỉ ra ngoài qua đây, sau khi kiểm tư cách thành viên. */
    StoredFile read(Long meId, Long attachmentId);

    record StoredFile(org.springframework.core.io.Resource body, String mime, long sizeBytes) {}
```

- [ ] **Bước 4: Viết `read` trong `AttachmentService`**

Thêm hai dependency vào **cuối** constructor — thứ tự phải là `(attachments, storage, rateLimiter, maxBytes, messages, lookup)`, khớp lời gọi trong test ở Bước 1:

```java
    private final MessageRepository messages;
    private final ConversationLookup lookup;

    public AttachmentService(
            MessageAttachmentRepository attachments,
            @Qualifier("chatFileStorage") FileStorageServiceInterface storage,
            ChatRateLimiterInterface rateLimiter,
            @Value("${app.chat.max-upload-bytes}") long maxBytes,
            MessageRepository messages,
            ConversationLookup lookup) {
        this.attachments = attachments;
        this.storage = storage;
        this.rateLimiter = rateLimiter;
        this.maxBytes = maxBytes;
        this.messages = messages;
        this.lookup = lookup;
    }
```

rồi thêm method:

```java
    @Override
    @Transactional(readOnly = true)
    public StoredFile read(Long meId, Long attachmentId) {
        MessageAttachment attachment =
                attachments
                        .findById(attachmentId)
                        .orElseThrow(() -> new EntityNotFoundException("Photo not found."));

        if (attachment.getMessageId() == null) {
            // Chưa gắn vào tin nào: chỉ người vừa upload được xem (để hiện preview trước khi gửi)
            if (!attachment.getUploaderId().equals(meId)) {
                throw new ConversationAccessDeniedException();
            }
        } else {
            Message message =
                    messages.findById(attachment.getMessageId())
                            .orElseThrow(() -> new EntityNotFoundException("Photo not found."));
            // Tin bị admin ẩn thì ảnh biến mất theo, y như tin biến mất khỏi danh sách
            if (message.isHidden()) {
                throw new EntityNotFoundException("Photo not found.");
            }
            lookup.requireMember(meId, message.getConversationId());
        }

        Path file =
                storage.find(FOLDER, attachment.getStorageKey())
                        .orElseThrow(() -> new EntityNotFoundException("Photo not found."));
        return new StoredFile(new FileSystemResource(file), attachment.getMime(), attachment.getSizeBytes());
    }
```

Import `java.nio.file.Path`, `org.springframework.core.io.FileSystemResource`, `EntityNotFoundException`, `ConversationAccessDeniedException`, `Message`, `MessageRepository`.

- [ ] **Bước 5: Viết controller**

```java
package com.techx.intervue.modules.conversation.controllers;

import com.techx.intervue.modules.conversation.services.interfaces.AttachmentServiceInterface;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import lombok.AllArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

/**
 * FR-115, spec §8.2. Trả file nhị phân nên KHÔNG bọc ApiResource — đây là ngoại lệ duy nhất của
 * quy ước envelope, giống mọi endpoint tải file. Lỗi thì ConversationExceptionHandler vẫn trả
 * envelope bình thường.
 *
 * <p>Cache-Control private: ảnh riêng tư, proxy dùng chung không được giữ lại.
 */
@RestController
@RequestMapping("/api/v1/attachments")
@AllArgsConstructor
public class AttachmentDownloadController {

    private final AttachmentServiceInterface attachmentService;

    @GetMapping("/{id}")
    public ResponseEntity<Resource> download(
            @PathVariable Long id, @AuthenticationPrincipal CustomUserDetails me) {
        AttachmentServiceInterface.StoredFile file = attachmentService.read(me.getId(), id);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(file.mime()))
                .contentLength(file.sizeBytes())
                .cacheControl(CacheControl.maxAge(Duration.ofDays(1)).cachePrivate())
                .header("Content-Disposition", "inline")
                .header("X-Content-Type-Options", "nosniff")
                .body(file.body());
    }
}
```

Thêm `AttachmentDownloadController.class` vào `assignableTypes` của `ConversationExceptionHandler`.

- [ ] **Bước 6: Chạy cho xanh**

```bash
docker compose -p market-link-chat3 -f docker-compose.yml -f ../compose.chat3-override.yml exec -T backend ./mvnw -B test -Dtest=AttachmentServiceTest
```

Expected: PASS.

- [ ] **Bước 7: Thử tay — đúng người xem được, người ngoài bị chặn**

```bash
# A upload rồi gửi ảnh cho B; C là người thứ ba không thuộc thread.
curl -s -o /dev/null -w 'uploader: %{http_code}\n'  -H "Authorization: Bearer <TOKEN_A>" http://localhost:8083/api/v1/attachments/<ID>
curl -s -o /dev/null -w 'member:   %{http_code}\n'  -H "Authorization: Bearer <TOKEN_B>" http://localhost:8083/api/v1/attachments/<ID>
curl -s -o /dev/null -w 'outsider: %{http_code}\n'  -H "Authorization: Bearer <TOKEN_C>" http://localhost:8083/api/v1/attachments/<ID>
curl -s -o /dev/null -w 'anon:     %{http_code}\n'  http://localhost:8083/api/v1/attachments/<ID>
```

Expected: `200`, `200`, `403`, `401`.

- [ ] **Bước 8: Commit**

```bash
make be-format
git add -A backend/src
git commit -m "feat(FR-115): serve chat photos only to the two people in the thread

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: Dọn ảnh tải lên rồi bỏ đó

Spec §8.2: ảnh upload mà 24 giờ không gắn vào tin nào thì job dọn đi. Nếu không, mỗi lần người dùng chọn ảnh rồi đổi ý là một file nằm lại mãi trên volume.

**Files:**
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/ChatAttachmentCleanupJob.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/conversation/ChatAttachmentCleanupJobTest.java`

**Interfaces:**
- Consumes: `MessageAttachmentRepository.findByMessageIdIsNullAndCreatedAtBefore(Instant)`, `FileStorageServiceInterface` (`@Qualifier("chatFileStorage")`), `Clock`.
- Produces: `void ChatAttachmentCleanupJob.run()` — `@Scheduled(fixedDelayString = "PT1H", initialDelayString = "PT10M")`.

- [ ] **Bước 1: Viết test đỏ**

```java
package com.techx.intervue.modules.conversation;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.conversation.entities.MessageAttachment;
import com.techx.intervue.modules.conversation.repositories.MessageAttachmentRepository;
import com.techx.intervue.modules.conversation.services.impl.AttachmentService;
import com.techx.intervue.services.interfaces.FileStorageServiceInterface;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class ChatAttachmentCleanupJobTest {

    static final Instant NOW = Instant.parse("2026-09-26T08:00:00Z");

    MessageAttachmentRepository attachments;
    FileStorageServiceInterface storage;
    ChatAttachmentCleanupJob job;

    @BeforeEach
    void setUp() {
        attachments = mock(MessageAttachmentRepository.class);
        storage = mock(FileStorageServiceInterface.class);
        job = new ChatAttachmentCleanupJob(attachments, storage, Clock.fixed(NOW, ZoneId.of("UTC")));
    }

    @Test
    void deletesTheFileAndTheRowForAnUploadOlderThanADay() {
        MessageAttachment orphan =
                MessageAttachment.builder().id(1L).uploaderId(7L).storageKey("abc.jpg").build();
        when(attachments.findByMessageIdIsNullAndCreatedAtBefore(NOW.minusSeconds(86400)))
                .thenReturn(List.of(orphan));

        job.run();

        verify(storage).delete(AttachmentService.FOLDER, "abc.jpg");
        verify(attachments).deleteAll(List.of(orphan));
    }

    @Test
    void doesNothingWhenThereIsNothingToClean() {
        when(attachments.findByMessageIdIsNullAndCreatedAtBefore(NOW.minusSeconds(86400)))
                .thenReturn(List.of());

        job.run();

        verifyNoInteractions(storage);
        verify(attachments, never()).deleteAll(org.mockito.ArgumentMatchers.anyList());
    }

    /** Một file xoá hỏng không được chặn những file còn lại. */
    @Test
    void keepsGoingWhenOneFileCannotBeDeleted() {
        MessageAttachment a =
                MessageAttachment.builder().id(1L).uploaderId(7L).storageKey("a.jpg").build();
        MessageAttachment b =
                MessageAttachment.builder().id(2L).uploaderId(7L).storageKey("b.jpg").build();
        when(attachments.findByMessageIdIsNullAndCreatedAtBefore(NOW.minusSeconds(86400)))
                .thenReturn(List.of(a, b));
        org.mockito.Mockito.doThrow(new RuntimeException("disk error"))
                .when(storage)
                .delete(AttachmentService.FOLDER, "a.jpg");

        job.run();

        verify(storage).delete(AttachmentService.FOLDER, "b.jpg");
        ArgumentCaptor<List<MessageAttachment>> deleted = ArgumentCaptor.forClass(List.class);
        verify(attachments).deleteAll(deleted.capture());
        org.assertj.core.api.Assertions.assertThat(deleted.getValue()).containsExactly(a, b);
    }
}
```

- [ ] **Bước 2: Chạy để chắc chắn đỏ**

```bash
docker compose -p market-link-chat3 -f docker-compose.yml -f ../compose.chat3-override.yml exec -T backend ./mvnw -B test -Dtest=ChatAttachmentCleanupJobTest
```

Expected: FAIL — `cannot find symbol: class ChatAttachmentCleanupJob`.

- [ ] **Bước 3: Viết job**

```java
package com.techx.intervue.modules.conversation;

import com.techx.intervue.modules.conversation.entities.MessageAttachment;
import com.techx.intervue.modules.conversation.repositories.MessageAttachmentRepository;
import com.techx.intervue.modules.conversation.services.impl.AttachmentService;
import com.techx.intervue.services.interfaces.FileStorageServiceInterface;
import java.time.Clock;
import java.time.Duration;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Spec §8.2: người dùng chọn ảnh rồi đổi ý thì file nằm lại trên volume mãi. Mỗi giờ quét một lần,
 * xoá ảnh chưa gắn vào tin nào và cũ hơn 24 giờ. @EnableScheduling đã bật ở AppConfig.
 */
@Slf4j
@Component
public class ChatAttachmentCleanupJob {

    static final Duration KEEP_ORPHANS_FOR = Duration.ofHours(24);

    private final MessageAttachmentRepository attachments;
    private final FileStorageServiceInterface storage;
    private final Clock clock;

    public ChatAttachmentCleanupJob(
            MessageAttachmentRepository attachments,
            @Qualifier("chatFileStorage") FileStorageServiceInterface storage,
            Clock clock) {
        this.attachments = attachments;
        this.storage = storage;
        this.clock = clock;
    }

    @Scheduled(fixedDelayString = "PT1H", initialDelayString = "PT10M")
    @Transactional
    public void run() {
        List<MessageAttachment> orphans =
                attachments.findByMessageIdIsNullAndCreatedAtBefore(
                        clock.instant().minus(KEEP_ORPHANS_FOR));
        if (orphans.isEmpty()) {
            return;
        }
        for (MessageAttachment orphan : orphans) {
            try {
                storage.delete(AttachmentService.FOLDER, orphan.getStorageKey());
            } catch (RuntimeException e) {
                // Một file hỏng không được giữ lại cả mẻ; hàng DB vẫn xoá, file thừa chỉ tốn chỗ
                log.warn("Could not delete orphan chat photo {}: {}", orphan.getStorageKey(), e.getMessage());
            }
        }
        attachments.deleteAll(orphans);
        log.info("Cleaned up {} chat photos that were never sent", orphans.size());
    }
}
```

> `Clock` phải là bean. Kiểm: `grep -rn 'Clock' backend/src/main/java/com/techx/intervue/config/` — `MessageService` đã inject `Clock` nên bean này chắc chắn có; nếu không thấy, tìm chỗ khai báo bằng `grep -rn 'Clock.system' backend/src/main/java`.

- [ ] **Bước 4: Chạy cho xanh**

```bash
docker compose -p market-link-chat3 -f docker-compose.yml -f ../compose.chat3-override.yml exec -T backend ./mvnw -B test -Dtest=ChatAttachmentCleanupJobTest
```

Expected: PASS (3 test).

- [ ] **Bước 5: Commit**

```bash
make be-format
git add -A backend/src
git commit -m "feat(FR-115): delete chat photos that were uploaded but never sent

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: Tài liệu, chạy thử toàn bộ, mở PR

**Files:**
- Modify: `docs/api-contract.md`
- Modify: `README.md` (mục Troubleshooting / biến môi trường, nếu có mục chat)
- Modify: `.ai/REQUIREMENTS.md` — **chỉ khi QA/DOC đã thêm FR-115**; nếu chưa, không tự thêm (R-07), ghi vào phần mô tả PR thay vì sửa file.

- [ ] **Bước 1: Cập nhật `docs/api-contract.md`**

`docs/api-contract.md` do LEAD giữ (R-02/R-05). Người đang thực thi plan này **là LEAD** (xem ghi chú cuối plan), nên sửa trực tiếp; nếu không phải, mở issue thay vì sửa. Thêm vào mục chat:

| Method | Path | Vai | Body / query | Trả về |
|---|---|---|---|---|
| POST | `/api/v1/attachments` | Thành viên | `multipart/form-data`, field `file` | 201 · `{ attachmentId, url, width, height }` |
| GET | `/api/v1/attachments/{id}` | Thành viên | — | File nhị phân (**không** bọc `ApiResource`), `Cache-Control: private` |

và ghi rõ:
- `POST /api/v1/conversations/{id}/messages` nhận thêm `attachmentId`; `kind: "image"` cần `attachmentId`, không cần `body`.
- `MessageResource` có thêm `attachment: { attachmentId, url, width, height }`, vắng mặt khi tin không phải ảnh.
- Mã lỗi mới: **413** `ATTACHMENT_TOO_LARGE`, **415** `UNSUPPORTED_IMAGE_TYPE`, **429** `RATE_LIMITED`, **403** `ATTACHMENT_NOT_YOURS`, **409** `ATTACHMENT_ALREADY_USED`.
- **Ghi chú cho frontend (Plan 4):** JWT đi trong header `Authorization`, **không** trong cookie, nên `<img src="/api/v1/attachments/5">` sẽ trả 401. Client phải `fetch` kèm header rồi `URL.createObjectURL(blob)`.

- [ ] **Bước 2: Ghi vào README hai điều người khác cần biết**

- Biến `CHAT_UPLOAD_DIR` / `CHAT_MAX_UPLOAD_BYTES` / ba biến `CHAT_*_PER_*`, và volume `chat-uploads`.
- Một dòng Troubleshooting: *"Ảnh chat 404 sau khi dựng lại container → volume `chat-uploads` bị xoá; bản ghi DB còn nhưng file mất. `docker compose down` (không `-v`) để giữ volume."*

- [ ] **Bước 3: Chạy toàn bộ test + lint**

```bash
docker compose -p market-link-chat3 -f docker-compose.yml -f ../compose.chat3-override.yml exec -T backend ./mvnw -B test
make lint
make check-env
```

Expected: `BUILD SUCCESS`, tất cả xanh. **Đây là bằng chứng bắt buộc trước khi mở PR** — chép dòng kết quả vào mô tả PR.

- [ ] **Bước 4: Chạy thử tay đầu-cuối**

Ghi lại kết quả từng bước vào scratchpad `chat-plan3/smoke.log`:

1. A upload ảnh JPEG 200 KB → 201, `width`/`height` đúng.
2. A gửi ảnh vào thread với B → 201, `kind: "image"`, có `attachment`.
3. B mở thread → thấy tin ảnh kèm `attachment`.
4. B tải ảnh → 200; C (ngoài thread) tải → 403; không token → 401.
5. Upload file PDF đổi đuôi `.jpg` → **415**.
6. Upload ảnh 6 MB → **413**.
7. Upload 11 ảnh trong một giờ → ảnh thứ 11 trả **429**.
8. Gửi lại đúng `attachmentId` lần hai → **409**.
9. `docker compose ... exec backend ls /var/lib/marketlink/chat/images` → có file; `curl http://localhost:8083/uploads/images/<key>` → **404**.
10. Stall bị admin `suspend` → khách gửi tin vào thread cũ trả **409**, nhưng `GET .../messages` vẫn **200**.

- [ ] **Bước 5: Rebase theo `dev` rồi đẩy**

```bash
git fetch origin && git rebase origin/dev
# Nếu dev đã có migration V20260925011: đổi tên file migration của mình lên số kế tiếp (CONTRIBUTING §7)
docker compose -p market-link-chat3 -f docker-compose.yml -f ../compose.chat3-override.yml exec -T backend ./mvnw -B test
git push -u origin feature/FR-115-chat-attachments
```

- [ ] **Bước 6: Mở PR**

```bash
gh pr create --base dev --title "feat(FR-115): chat photo attachments and abuse limits" --body "$(cat <<'MD'
## Làm gì

Plan 3A của chat người–người: gửi ảnh trong hội thoại (FR-115), cộng lớp chống lạm dụng của spec §8.4.

- `POST /api/v1/attachments` — tải ảnh lên (jpg/png/webp, ≤5 MB, kiểm **magic bytes** chứ không tin `Content-Type`), JPEG/PNG được mã hoá lại nên EXIF rụng hết.
- `GET /api/v1/attachments/{id}` — phục vụ ảnh **có kiểm tư cách thành viên**. Ảnh **không** nằm trong `/uploads` công khai mà trên volume riêng `chat-uploads`.
- `kind: "image"` cho tin nhắn, kèm `attachmentId`; `MessageResource` có thêm `attachment`.
- Rate limit trên Redis (bucket4j, đã có sẵn trong pom): 30 tin/phút, 10 ảnh/giờ, 20 thread mới/giờ. Redis chết thì **fail-open**.
- Job dọn ảnh tải lên mà 24 giờ không gửi.
- **Sửa lỗi kèm theo:** stall bị `suspended` trước đây vẫn mở được thread mới và vẫn nhắn được (spec §8.1). `StallAccessPolicy` giờ tra `farmer_profiles` — bảng đó đã có từ PR #122, comment "chưa tồn tại" trong code đã lỗi thời.

## Test thế nào

- `make be-test` — toàn bộ suite xanh (xem log trong mô tả commit cuối).
- Test mới: `ImageProbeTest`, `AttachmentServiceTest`, `Bucket4jChatRateLimiterTest`, `ChatAttachmentCleanupJobTest`, `MessageAttachmentRepositoryTest`, `ChatAttachmentStorageTest`, cộng ca mới trong `MessageServiceTest` và `StallAccessPolicyTest`.
- Chạy tay 10 bước (415 / 413 / 429 / 409 / 403 / 401, và ảnh không tải được qua `/uploads`).

## Người review chú ý

- **R-06:** `GET /api/v1/attachments/{id}` là chỗ dễ hở nhất — xem bảng quyền trong plan Task 7.
- **Ngoại lệ envelope:** `AttachmentDownloadController` trả file nhị phân, không bọc `ApiResource`. Cố ý.
- **Giới hạn đã biết:** WebP không bị bóc EXIF/XMP vì JDK không có bộ giải mã WebP nào. Ảnh chỉ tới đúng người nhận mà người gửi đã chọn. Ghi rõ trong javadoc `ImageProbe`.
- **Ngoài đề:** cả tính năng chat người–người không có trong SRS (R-07). FR-110…117 là đề xuất trong `docs/superpowers/specs/2026-09-25-farmer-customer-chat-design.md` §4, **chưa** được QA/DOC đưa vào `.ai/REQUIREMENTS.md`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
MD
)"
```

- [ ] **Bước 7: Cập nhật ledger và bộ nhớ**

Ghi vào scratchpad `chat-plan3/progress-plan3a.md`: số PR, các phát hiện, các mục hoãn lại. Cập nhật memory `chat-feature-plan.md`: Plan 3A xong, còn 3B (báo cáo + kiểm duyệt) và Plan 4 (UI).

---

## Việc cố tình để lại cho plan sau

| Việc | Ở đâu |
|---|---|
| Báo cáo tin nhắn (`POST /api/v1/messages/{id}/report`), màn kiểm duyệt admin, sự kiện "tin bị ẩn" | **Plan 3B** |
| `MessageBubble` vào design system, UI Customer/Farmer, popover header, prototype | **Plan 4** |
| Ảnh hiện trong `<img>` — FE phải `fetch` + blob vì JWT ở header | **Plan 4** |
| 9 việc nhỏ hoãn từ review Plan 2 (typing null-guard, DataAccessException lúc CONNECT, pipeline SCARD, lọc presence theo người online, mount `enabled_plugins`, env-guard thêm rabbitmq, contract test Jackson 2 vs 3, bỏ `Thread.sleep` trong e2e, kịch bản 2 trình duyệt vào README) | **Plan 3B** hoặc một PR `chore` riêng — quyết lúc viết Plan 3B |
| Rate limit cho frame `/app/typing` (STOMP, không qua REST) | **Plan 3B** |
| `price_offers` (FR-118, FR-119) | Đợt 2, chờ `products` và `orders` |
