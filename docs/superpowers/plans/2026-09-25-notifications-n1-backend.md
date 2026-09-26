# Thông báo realtime — N1 Backend lõi · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Backend lưu, phân phối và đẩy realtime thông báo (admin đăng, sự kiện Farmer, tin nhắn chat) theo cài đặt từng người, qua STOMP `/user/topic/notifications`.

**Architecture:** Module mới `modules/notification`. Mọi nguồn gọi `NotificationService.dispatch(recipients, NotificationEvent)`: lưu nếu kind cần lưu (text dịch sẵn theo ngôn ngữ người nhận), tính `Alert` từ cài đặt + giờ yên tĩnh, sau commit đẩy qua `NotificationDeliveryInterface` (N1: STOMP; N3 bọc thêm Web Push). Thông báo admin fan-out bằng một câu `INSERT … SELECT`.

**Tech Stack:** Spring Boot 4.1 · Java 25 · JPA + Flyway (MySQL 8) · Spring Messaging STOMP (simple broker trong test) · Redis (`StringRedisTemplate`) · JUnit 5 + Mockito + AssertJ.

**Spec:** `docs/superpowers/specs/2026-09-25-realtime-notifications-design.md`

## Global Constraints

- Path `/api/v1/...`, JSON camelCase, envelope `ApiResource` qua `ok(...)`/`created(...)` của `BaseController`.
- Migration mới: `V20260925012`, `013`, `014` (011 đã thuộc chat Plan 3). FK tới `users` là `BIGINT UNSIGNED`.
- Sai chủ sở hữu → **403**, id không tồn tại → 404 (R-06). Sai input → 400 `VALIDATION_ERROR`.
- STOMP đích dùng `/topic/...` (không `/queue`), gửi bằng `convertAndSendToUser`, lỗi gửi chỉ log.
- Đẩy realtime **sau commit** (`TransactionHelper.afterCommit`).
- Text thông báo 10 ngôn ngữ: `en vi zh ja ko fr es de th id`; ngôn ngữ lạ/thiếu key → English.
- Giờ yên tĩnh tính theo `Asia/Ho_Chi_Minh`, định dạng `HH:mm`, khoảng qua nửa đêm hợp lệ, `from == to` = không yên tĩnh.
- Không sửa migration đã merge. Format Spotless (AOSP) trước mỗi commit.
- Chạy Maven trong container, DB riêng `ml_notify_test`: `SP/be-mvn.sh <goals>` (xem Task 0). Không chạy test vào `intervue_db`.

## Review Focus

1. **Giờ yên tĩnh qua nửa đêm** (22:00→07:00, lúc 23:30 và 06:59 là yên tĩnh, 07:00 thì không) — test trong Task 3.
2. **Admin đăng thông báo khi có user bị `suspended`/`inactive` hoặc là admin** — chỉ user active đúng audience nhận; test trong Task 6.
3. **Đánh dấu đã đọc thông báo của người khác** → 403, id không có → 404, read-all không đụng dòng của người khác — test trong Task 5.
4. **Tin nhắn chat không tạo dòng `notifications`** nhưng vẫn tới STOMP; ảnh → "… sent a photo" — test trong Task 8.
5. **Người dùng có ngôn ngữ `vi` nhận text tiếng Việt, ngôn ngữ lạ (`xx`) nhận English** — test trong Task 2 và Task 7.

---

## File Structure

```
backend/src/main/resources/db/migration/
  V20260925012__create_notifications_table.sql
  V20260925013__create_announcements_table.sql
  V20260925014__create_notification_preferences_tables.sql
backend/src/main/resources/i18n/notifications{,_vi,_zh,_ja,_ko,_fr,_es,_de,_th,_id}.properties
backend/src/main/java/com/techx/intervue/modules/notification/
  enums/        NotificationKind, NotificationCategory, Audience
  entities/     Notification, Announcement, NotificationPreference (+Id), NotificationSettings
  repositories/ NotificationRepository, AnnouncementRepository, NotificationPreferenceRepository, NotificationSettingsRepository
  config/       NotificationMessagesConfig
  services/interfaces/ NotificationServiceInterface, NotificationPreferenceServiceInterface, AnnouncementServiceInterface, NotificationDeliveryInterface
  services/impl/ NotificationTextRenderer, NotificationPreferenceService, NotificationService, StompNotificationDelivery, AnnouncementService, ChatNotificationListener
  requests/     UpdateNotificationPreferencesRequest, AnnouncementRequest
  resources/    NotificationResource, NotificationPayload, Alert, NotificationPreferencesResource, AnnouncementResource, RenderedText, NotificationEvent
  exceptions/   NotificationAccessDeniedException, InvalidNotificationPreferenceException, TestNotificationTooSoonException, InvalidAnnouncementException
  controllers/  NotificationController, AdminAnnouncementController, PublicAnnouncementController, NotificationExceptionHandler
modules/conversation/realtime/ChatMessageCreatedEvent.java   (mới) + StompChatEventPublisher (1 dòng publish)
modules/farmer/services/impl/FarmerService.java               (gọi dispatch ở 5 chỗ)
config/SecurityConfig.java                                     (permit GET /api/v1/announcements/active)
docs/api-contract.md, db/schema.sql                            (Task 10)
```

---

### Task 0: Môi trường test

- [ ] **Step 1:** DB riêng đã tạo: `ml_notify_test` (quyền cho `MYSQL_USER`). Script `SP/be-mvn.sh` (SP = scratchpad của phiên) chạy `./mvnw -B -q <goals>` trong image `market-link-backend:dev`, mount `backend/` của worktree, network `market-link_default`, `RABBITMQ_HOST=` (simple broker).
- [ ] **Step 2:** Chạy nền: `SP/be-mvn.sh test` → exit 0, surefire 212 test, 0 lỗi.

---

### Task 1: Migrations + entities + repositories

**Files:**
- Create: 3 migration ở trên; `enums/NotificationKind.java`, `enums/NotificationCategory.java`, `enums/Audience.java`; 4 entity; 4 repository
- Test: `backend/src/test/java/com/techx/intervue/modules/notification/repositories/NotificationRepositoryTest.java`

**Interfaces:**
- Produces: `NotificationKind` (`code()`, `category()`, `persistent()`), `NotificationCategory` (`code()`, `fromCode(String)`, `forRole(RoleType)`), `Audience` (`roles()`), entities như dưới, `NotificationRepository.fanOutAnnouncement(...)`, `recipientsOf(announcementId)`, `unreadCounts(ids)`, `activeAdminIds()`, `markAllRead(userId)`.

- [ ] **Step 1: Viết test (đỏ)**

```java
package com.techx.intervue.modules.notification.repositories;

@SpringBootTest
@Transactional
class NotificationRepositoryTest {
    @Autowired NotificationRepository notifications;
    @Autowired AnnouncementRepository announcements;
    @Autowired UserRepository users;

    private User user(RoleType role, UserStatus status) {
        String tag = UUID.randomUUID().toString().substring(0, 8);
        User u = User.builder().fullName("N " + tag).email(tag + "@notif.test")
                .phone("07" + String.format("%08d", Math.abs(tag.hashCode()) % 100_000_000))
                .passwordHash("x").role(role).build();
        u.setStatus(status);
        return users.save(u);
    }

    @Test
    void fanOutReachesOnlyActiveUsersOfTheAudienceWithARoleSpecificLink() {
        User customer = user(RoleType.CUSTOMER, UserStatus.ACTIVE);
        User farmer = user(RoleType.FARMER, UserStatus.ACTIVE);
        User suspended = user(RoleType.CUSTOMER, UserStatus.SUSPENDED);
        User admin = user(RoleType.ADMIN, UserStatus.ACTIVE);
        Announcement a = announcements.save(Announcement.builder().title("Closed Sunday")
                .content("Thảo Điền closes on 04/10").audience(Audience.ALL).createdBy(admin.getId()).build());

        int inserted = notifications.fanOutAnnouncement(a.getId(), a.getTitle(), a.getContent(),
                Audience.ALL.roleCodes());

        List<NotificationRepository.Recipient> got = notifications.recipientsOf(a.getId());
        assertThat(got).extracting(NotificationRepository.Recipient::getUserId)
                .contains(customer.getId(), farmer.getId())
                .doesNotContain(suspended.getId(), admin.getId());
        assertThat(inserted).isEqualTo(got.size());
        Notification forFarmer = notifications.findAll().stream()
                .filter(n -> n.getUserId().equals(farmer.getId())).findFirst().orElseThrow();
        assertThat(forFarmer.getLink()).isEqualTo("/farmer/notifications");
        assertThat(forFarmer.getKind()).isEqualTo(NotificationKind.ANNOUNCEMENT);
        assertThat(forFarmer.isRead()).isFalse();
    }

    @Test
    void markAllReadTouchesOnlyTheOwnersRowsAndCountsFollow() {
        User me = user(RoleType.CUSTOMER, UserStatus.ACTIVE);
        User other = user(RoleType.CUSTOMER, UserStatus.ACTIVE);
        notifications.save(Notification.builder().userId(me.getId()).kind(NotificationKind.FARMER_APPROVED)
                .title("t").message("m").build());
        notifications.save(Notification.builder().userId(other.getId()).kind(NotificationKind.FARMER_APPROVED)
                .title("t").message("m").build());

        assertThat(notifications.markAllRead(me.getId())).isEqualTo(1);
        assertThat(notifications.countByUserIdAndReadFalse(me.getId())).isZero();
        assertThat(notifications.countByUserIdAndReadFalse(other.getId())).isEqualTo(1);
        assertThat(notifications.unreadCounts(List.of(me.getId(), other.getId())))
                .extracting(NotificationRepository.UnreadRow::getUserId).containsExactly(other.getId());
    }
}
```

- [ ] **Step 2: Chạy, xác nhận đỏ** — `SP/be-mvn.sh test -Dtest=NotificationRepositoryTest` → lỗi biên dịch (chưa có class).

- [ ] **Step 3: Migrations**

`V20260925012__create_notifications_table.sql`
```sql
-- FR-042 / D-11: thông báo lưu lại cho từng người. kind là VARCHAR (enum Java NotificationKind) để thêm
-- loại mới (đơn hàng, restock) không cần migration. Text đã dịch sẵn theo ngôn ngữ người nhận lúc tạo.
CREATE TABLE notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    kind VARCHAR(40) NOT NULL,
    title VARCHAR(150) NOT NULL,
    message VARCHAR(500) NOT NULL,
    link VARCHAR(255) NULL,
    announcement_id BIGINT UNSIGNED NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_notif_user (user_id, is_read, created_at)
);
```

`V20260925013__create_announcements_table.sql`
```sql
-- FR-077: admin đăng thông báo toàn nền tảng. Đăng = mỗi user active thuộc audience nhận một dòng notifications;
-- is_active/starts_at/ends_at chỉ điều khiển banner ở trang public.
CREATE TABLE announcements (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    content VARCHAR(1000) NOT NULL,
    audience VARCHAR(20) NOT NULL DEFAULT 'all',
    created_by BIGINT UNSIGNED NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    starts_at TIMESTAMP NULL,
    ends_at TIMESTAMP NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

ALTER TABLE notifications
    ADD CONSTRAINT fk_notifications_announcement
        FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE SET NULL;
```

`V20260925014__create_notification_preferences_tables.sql`
```sql
-- Settings → Thông báo: bật/tắt theo nhóm × kênh, âm thanh, giờ yên tĩnh (Asia/Ho_Chi_Minh). Chưa có dòng = mặc định
-- (mọi nhóm bật cả hai kênh, âm thanh bật, không yên tĩnh). Server đọc để quyết định popup và Web Push.
CREATE TABLE notification_preferences (
    user_id BIGINT UNSIGNED NOT NULL,
    category VARCHAR(30) NOT NULL,
    in_app BOOLEAN NOT NULL DEFAULT TRUE,
    browser BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (user_id, category),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE notification_settings (
    user_id BIGINT UNSIGNED PRIMARY KEY,
    sound BOOLEAN NOT NULL DEFAULT TRUE,
    quiet_on BOOLEAN NOT NULL DEFAULT FALSE,
    quiet_from CHAR(5) NOT NULL DEFAULT '22:00',
    quiet_to CHAR(5) NOT NULL DEFAULT '07:00',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

- [ ] **Step 4: Enums**

```java
// NotificationCategory.java
public enum NotificationCategory {
    MESSAGES("messages", EnumSet.of(RoleType.CUSTOMER, RoleType.FARMER)),
    ANNOUNCEMENTS("announcements", EnumSet.of(RoleType.CUSTOMER, RoleType.FARMER)),
    ACCOUNT("account", EnumSet.of(RoleType.CUSTOMER, RoleType.FARMER)),
    FARMER_APPLICATIONS("farmerApplications", EnumSet.of(RoleType.ADMIN));

    private final String code;
    private final Set<RoleType> roles;
    NotificationCategory(String code, Set<RoleType> roles) { this.code = code; this.roles = roles; }
    @JsonValue public String code() { return code; }
    public boolean visibleTo(RoleType role) { return roles.contains(role); }
    public static List<NotificationCategory> forRole(RoleType role) {
        return Arrays.stream(values()).filter(c -> c.visibleTo(role)).toList();
    }
    public static Optional<NotificationCategory> fromCode(String code) {
        return Arrays.stream(values()).filter(c -> c.code.equals(code)).findFirst();
    }
    @Converter(autoApply = true)
    public static class DbConverter implements AttributeConverter<NotificationCategory, String> {
        public String convertToDatabaseColumn(NotificationCategory c) { return c == null ? null : c.code; }
        public NotificationCategory convertToEntityAttribute(String v) { return v == null ? null : fromCode(v).orElseThrow(); }
    }
}

// NotificationKind.java
public enum NotificationKind {
    ANNOUNCEMENT(NotificationCategory.ANNOUNCEMENTS, true),
    FARMER_APPLICATION(NotificationCategory.FARMER_APPLICATIONS, true),
    FARMER_APPROVED(NotificationCategory.ACCOUNT, true),
    FARMER_REJECTED(NotificationCategory.ACCOUNT, true),
    FARMER_SUSPENDED(NotificationCategory.ACCOUNT, true),
    FARMER_REINSTATED(NotificationCategory.ACCOUNT, true),
    MESSAGE(NotificationCategory.MESSAGES, false),
    /** Nút "Gửi thử" — không thuộc nhóm nào, luôn hiện. */
    TEST(null, false);

    private final NotificationCategory category;
    private final boolean persistent;
    NotificationKind(NotificationCategory category, boolean persistent) { this.category = category; this.persistent = persistent; }
    public NotificationCategory category() { return category; }
    public boolean persistent() { return persistent; }
    @JsonValue public String code() { return name().toLowerCase(Locale.ROOT); }
    @Converter(autoApply = true)
    public static class DbConverter extends LowercaseEnumConverter<NotificationKind> {
        public DbConverter() { super(NotificationKind.class); }
    }
}

// Audience.java
public enum Audience {
    ALL(RoleType.CUSTOMER, RoleType.FARMER), CUSTOMERS(RoleType.CUSTOMER), FARMERS(RoleType.FARMER);
    private final List<RoleType> roles;
    Audience(RoleType... roles) { this.roles = List.of(roles); }
    /** Giá trị cột users.role (chữ thường) cho câu fan-out. */
    public List<String> roleCodes() { return roles.stream().map(r -> r.name().toLowerCase(Locale.ROOT)).toList(); }
    @JsonValue public String code() { return name().toLowerCase(Locale.ROOT); }
    @JsonCreator public static Audience fromCode(String v) { return valueOf(v.toUpperCase(Locale.ROOT)); }
    @Converter(autoApply = true)
    public static class DbConverter extends LowercaseEnumConverter<Audience> {
        public DbConverter() { super(Audience.class); }
    }
}
```

- [ ] **Step 5: Entities** (Lombok `@Entity @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder` như `UserSettings`)

```java
@Table(name = "notifications")
public class Notification {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "user_id", nullable = false) private Long userId;
    @Column(nullable = false) private NotificationKind kind;
    @Column(nullable = false) private String title;
    @Column(nullable = false) private String message;
    private String link;
    @Column(name = "announcement_id") private Long announcementId;
    @Builder.Default @Column(name = "is_read", nullable = false) private boolean read = false;
    @Column(name = "created_at", updatable = false) private Instant createdAt;
    @PrePersist void onCreated() { if (createdAt == null) createdAt = Instant.now(); }
}

@Table(name = "announcements")
public class Announcement {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    private String title;
    private String content;
    @Builder.Default private Audience audience = Audience.ALL;
    @Column(name = "created_by") private Long createdBy;
    @Builder.Default @Column(name = "is_active") private boolean active = true;
    @Column(name = "starts_at") private Instant startsAt;
    @Column(name = "ends_at") private Instant endsAt;
    @Column(name = "created_at", updatable = false) private Instant createdAt;
    @PrePersist void onCreated() { if (createdAt == null) createdAt = Instant.now(); }
}

@Table(name = "notification_preferences")
@IdClass(NotificationPreference.Key.class)
public class NotificationPreference {
    @Id @Column(name = "user_id") private Long userId;
    @Id private NotificationCategory category;
    @Column(name = "in_app") private boolean inApp;
    private boolean browser;
    @Data @NoArgsConstructor @AllArgsConstructor
    public static class Key implements Serializable { private Long userId; private NotificationCategory category; }
}

@Table(name = "notification_settings")
public class NotificationSettings {
    @Id @Column(name = "user_id") private Long userId;
    private boolean sound;
    @Column(name = "quiet_on") private boolean quietOn;
    @Column(name = "quiet_from") private String quietFrom;
    @Column(name = "quiet_to") private String quietTo;
    public static NotificationSettings defaults(Long userId) {
        return new NotificationSettings(userId, true, false, "22:00", "07:00");
    }
}
```

- [ ] **Step 6: Repositories**

```java
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    Page<Notification> findByUserIdOrderByCreatedAtDescIdDesc(Long userId, Pageable pageable);
    Page<Notification> findByUserIdAndReadOrderByCreatedAtDescIdDesc(Long userId, boolean read, Pageable pageable);
    long countByUserIdAndReadFalse(Long userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update Notification n set n.read = true where n.userId = :userId and n.read = false")
    int markAllRead(@Param("userId") Long userId);

    /** Một câu cho cả audience: user active, đúng role; link theo khu của từng vai. */
    @Modifying(flushAutomatically = true)
    @Query(nativeQuery = true, value = """
            INSERT INTO notifications (user_id, kind, title, message, link, announcement_id)
            SELECT u.id, 'announcement', :title, :message,
                   CASE u.role WHEN 'farmer' THEN '/farmer/notifications' ELSE '/notifications' END,
                   :announcementId
            FROM users u WHERE u.status = 'active' AND u.role IN (:roles)""")
    int fanOutAnnouncement(@Param("announcementId") Long announcementId, @Param("title") String title,
            @Param("message") String message, @Param("roles") Collection<String> roles);

    interface Recipient { Long getUserId(); Long getId(); String getLink(); Instant getCreatedAt(); }
    @Query(nativeQuery = true, value = "SELECT user_id AS userId, id, link, created_at AS createdAt FROM notifications WHERE announcement_id = :id")
    List<Recipient> recipientsOf(@Param("id") Long announcementId);

    interface UnreadRow { Long getUserId(); long getTotal(); }
    @Query("select n.userId as userId, count(n) as total from Notification n where n.read = false and n.userId in :ids group by n.userId")
    List<UnreadRow> unreadCounts(@Param("ids") Collection<Long> userIds);

    @Query(nativeQuery = true, value = "SELECT id FROM users WHERE role = 'admin' AND status = 'active'")
    List<Long> activeAdminIds();
}

public interface AnnouncementRepository extends JpaRepository<Announcement, Long> {
    Page<Announcement> findAllByOrderByCreatedAtDescIdDesc(Pageable pageable);
    @Query("""
            select a from Announcement a where a.active = true
              and (a.startsAt is null or a.startsAt <= :now) and (a.endsAt is null or a.endsAt > :now)
            order by a.createdAt desc, a.id desc""")
    List<Announcement> findLive(@Param("now") Instant now, Pageable pageable);
}

public interface NotificationPreferenceRepository extends JpaRepository<NotificationPreference, NotificationPreference.Key> {
    List<NotificationPreference> findByUserId(Long userId);
    Optional<NotificationPreference> findByUserIdAndCategory(Long userId, NotificationCategory category);
}
public interface NotificationSettingsRepository extends JpaRepository<NotificationSettings, Long> {}
```

- [ ] **Step 7:** `SP/be-mvn.sh spotless:apply test -Dtest=NotificationRepositoryTest` → PASS (2 test).
- [ ] **Step 8: Commit** `feat(FR-042,FR-077): notification, announcement and preference tables`

---

### Task 2: Text thông báo 10 ngôn ngữ

**Files:**
- Create: `config/NotificationMessagesConfig.java`, `services/impl/NotificationTextRenderer.java`, `resources/RenderedText.java`, `resources/NotificationEvent.java`, `src/main/resources/i18n/notifications*.properties` (10 file)
- Test: `.../notification/services/impl/NotificationTextRendererTest.java`

**Interfaces:**
- Produces: `record NotificationEvent(NotificationKind kind, Map<String,String> params, String link, Long conversationId, String title, String message)` với factory `NotificationEvent.of(kind, link, params)`; `record RenderedText(String title, String message)`; `NotificationTextRenderer.render(NotificationEvent e, String language) → RenderedText` (title/message có sẵn trong event thì giữ nguyên; thiếu thì lấy key `notification.<code>.title|message`, thay `{name}` bằng params; message cắt 500, title cắt 150).

- [ ] **Step 1: Test (đỏ)**

```java
class NotificationTextRendererTest {
    NotificationTextRenderer renderer = new NotificationTextRenderer(new NotificationMessagesConfig().notificationMessages());

    @Test void rendersVietnameseWithParams() {
        RenderedText t = renderer.render(NotificationEvent.of(NotificationKind.FARMER_APPROVED, "/farmer", Map.of("stall", "Cô Tư Garden")), "vi");
        assertThat(t.title()).isEqualTo("Sạp của bạn đã được duyệt");
        assertThat(t.message()).contains("Cô Tư Garden");
    }
    @Test void unknownLanguageFallsBackToEnglish() {
        assertThat(renderer.render(NotificationEvent.of(NotificationKind.TEST, "/settings", Map.of()), "xx").title())
                .isEqualTo("Notifications are working");
    }
    @Test void literalTextIsKeptAndOnlyTheMissingPartIsLookedUp() {
        NotificationEvent photo = new NotificationEvent(NotificationKind.MESSAGE, Map.of("sender", "Cô Tư"), "/messages?c=1", 1L, "Cô Tư", null);
        assertThat(renderer.render(photo, "en")).isEqualTo(new RenderedText("Cô Tư", "Cô Tư sent a photo"));
    }
    @Test void everyLanguageHasEveryKey() {
        for (String lang : List.of("en","vi","zh","ja","ko","fr","es","de","th","id"))
            for (NotificationKind k : List.of(NotificationKind.FARMER_APPLICATION, NotificationKind.FARMER_APPROVED,
                    NotificationKind.FARMER_REJECTED, NotificationKind.FARMER_SUSPENDED, NotificationKind.FARMER_REINSTATED, NotificationKind.TEST)) {
                RenderedText t = renderer.render(NotificationEvent.of(k, "/", Map.of("stall", "S", "reason", "R")), lang);
                assertThat(t.title()).as(lang + " " + k).doesNotStartWith("notification.").isNotBlank();
                assertThat(t.message()).as(lang + " " + k).doesNotContain("{").isNotBlank();
            }
    }
}
```

- [ ] **Step 2:** chạy → đỏ (chưa có class).
- [ ] **Step 3: Code**

```java
@Configuration
public class NotificationMessagesConfig {
    /** Bundle riêng cho text thông báo (không đụng messages.properties của validation). */
    @Bean
    public MessageSource notificationMessages() {
        ResourceBundleMessageSource source = new ResourceBundleMessageSource();
        source.setBasename("i18n/notifications");
        source.setDefaultEncoding("UTF-8");
        source.setFallbackToSystemLocale(false);   // ngôn ngữ thiếu → notifications.properties (English)
        source.setUseCodeAsDefaultMessage(true);
        return source;
    }
}

@Component
public class NotificationTextRenderer {
    private final MessageSource messages;
    public NotificationTextRenderer(@Qualifier("notificationMessages") MessageSource messages) { this.messages = messages; }

    public RenderedText render(NotificationEvent e, String language) {
        Locale locale = Locale.forLanguageTag(language == null ? "en" : language);
        String title = e.title() != null ? e.title() : lookup(e, "title", locale);
        String message = e.message() != null ? e.message() : lookup(e, "message", locale);
        return new RenderedText(cut(title, 150), cut(message, 500));
    }
    private String lookup(NotificationEvent e, String part, Locale locale) {
        String text = messages.getMessage("notification." + e.kind().code() + "." + part, null, locale);
        for (Map.Entry<String, String> p : e.params().entrySet()) text = text.replace("{" + p.getKey() + "}", p.getValue());
        return text;
    }
    private static String cut(String s, int max) { return s.length() <= max ? s : s.substring(0, max - 1) + "…"; }
}

public record NotificationEvent(NotificationKind kind, Map<String, String> params, String link,
        Long conversationId, String title, String message) {
    public NotificationEvent { params = params == null ? Map.of() : Map.copyOf(params); }
    public static NotificationEvent of(NotificationKind kind, String link, Map<String, String> params) {
        return new NotificationEvent(kind, params, link, null, null, null);
    }
}
public record RenderedText(String title, String message) {}
```

`notifications.properties` (English, cũng là fallback):
```properties
notification.farmer_application.title=New Farmer application
notification.farmer_application.message={stall} applied to sell on MarketLink.
notification.farmer_approved.title=Your stall is approved
notification.farmer_approved.message={stall} is approved. Sign in again to open your stall panel.
notification.farmer_rejected.title=Your stall application was not approved
notification.farmer_rejected.message=Reason: {reason}
notification.farmer_suspended.title=Your stall is suspended
notification.farmer_suspended.message={stall} is hidden from customers for now. Orders already placed still go ahead.
notification.farmer_reinstated.title=Your stall is open again
notification.farmer_reinstated.message={stall} is visible to customers again.
notification.message.message={sender} sent a photo
notification.test.title=Notifications are working
notification.test.message=This is how MarketLink notifications will look.
```
Chín file còn lại dịch đủ 13 key (vi dùng "sạp", "nhà vườn"; zh "摊位/农户"): xem file trong commit.

- [ ] **Step 4:** `SP/be-mvn.sh spotless:apply test -Dtest=NotificationTextRendererTest` → PASS.
- [ ] **Step 5: Commit** `feat(FR-042): notification text in 10 languages`

---

### Task 3: Cài đặt thông báo + quyết định `Alert`

**Files:**
- Create: `services/interfaces/NotificationPreferenceServiceInterface.java`, `services/impl/NotificationPreferenceService.java`, `resources/Alert.java`, `resources/NotificationPreferencesResource.java`, `requests/UpdateNotificationPreferencesRequest.java`, `exceptions/InvalidNotificationPreferenceException.java`
- Test: `.../services/impl/NotificationPreferenceServiceTest.java` (Mockito)

**Interfaces:**
- Consumes: repos Task 1, `UserRepository`.
- Produces:
  - `record Alert(boolean inApp, boolean browser, boolean sound)`
  - `record NotificationPreferencesResource(List<CategoryPreference> categories, boolean sound, boolean quietOn, String quietFrom, String quietTo)` với `record CategoryPreference(String category, boolean inApp, boolean browser)`
  - `NotificationPreferencesResource get(Long userId)`; `NotificationPreferencesResource update(Long userId, UpdateNotificationPreferencesRequest r)`; `Alert alertFor(Long userId, NotificationKind kind, Instant now)`; `static boolean inQuietHours(String from, String to, LocalTime t)`.

- [ ] **Step 1: Test (đỏ)** — các case:

```java
@ExtendWith(MockitoExtension.class)
class NotificationPreferenceServiceTest {
    @Mock NotificationPreferenceRepository prefs; @Mock NotificationSettingsRepository settings; @Mock UserRepository users;
    NotificationPreferenceService service;
    static final ZoneId VN = ZoneId.of("Asia/Ho_Chi_Minh");
    @BeforeEach void setUp() { service = new NotificationPreferenceService(prefs, settings, users); }
    Instant at(String hhmm) { return LocalDate.of(2026, 9, 25).atTime(LocalTime.parse(hhmm)).atZone(VN).toInstant(); }

    @ParameterizedTest
    @CsvSource({"22:00,07:00,23:30,true", "22:00,07:00,06:59,true", "22:00,07:00,07:00,false",
                "22:00,07:00,21:59,false", "13:00,14:00,13:30,true", "13:00,14:00,14:00,false", "08:00,08:00,08:00,false"})
    void quietHours(String from, String to, String now, boolean quiet) {
        assertThat(NotificationPreferenceService.inQuietHours(from, to, LocalTime.parse(now))).isEqualTo(quiet);
    }
    @Test void defaultsWhenNothingSaved() {
        when(prefs.findByUserIdAndCategory(1L, NotificationCategory.MESSAGES)).thenReturn(Optional.empty());
        when(settings.findById(1L)).thenReturn(Optional.empty());
        assertThat(service.alertFor(1L, NotificationKind.MESSAGE, at("12:00"))).isEqualTo(new Alert(true, true, true));
    }
    @Test void quietHoursSilenceEverythingButTest() {
        when(settings.findById(1L)).thenReturn(Optional.of(new NotificationSettings(1L, true, true, "22:00", "07:00")));
        when(prefs.findByUserIdAndCategory(1L, NotificationCategory.ACCOUNT)).thenReturn(Optional.empty());
        assertThat(service.alertFor(1L, NotificationKind.FARMER_APPROVED, at("23:00"))).isEqualTo(new Alert(false, false, false));
        assertThat(service.alertFor(1L, NotificationKind.TEST, at("23:00"))).isEqualTo(new Alert(true, true, true));
    }
    @Test void aDisabledChannelStaysOff() {
        when(settings.findById(1L)).thenReturn(Optional.empty());
        when(prefs.findByUserIdAndCategory(1L, NotificationCategory.MESSAGES))
                .thenReturn(Optional.of(new NotificationPreference(1L, NotificationCategory.MESSAGES, true, false)));
        assertThat(service.alertFor(1L, NotificationKind.MESSAGE, at("12:00"))).isEqualTo(new Alert(true, false, true));
    }
    @Test void getListsOnlyTheRolesCategoriesWithDefaults() {
        when(users.findById(1L)).thenReturn(Optional.of(User.builder().id(1L).role(RoleType.ADMIN).build()));
        when(prefs.findByUserId(1L)).thenReturn(List.of());
        when(settings.findById(1L)).thenReturn(Optional.empty());
        assertThat(service.get(1L).categories()).extracting(CategoryPreference::category).containsExactly("farmerApplications");
    }
    @Test void updateRejectsACategoryOfAnotherRole() {
        when(users.findById(1L)).thenReturn(Optional.of(User.builder().id(1L).role(RoleType.CUSTOMER).build()));
        var r = new UpdateNotificationPreferencesRequest(List.of(new CategoryPreference("farmerApplications", true, true)), true, false, "22:00", "07:00");
        assertThatThrownBy(() -> service.update(1L, r)).isInstanceOf(InvalidNotificationPreferenceException.class);
    }
    @Test void updateSavesRowsAndSettings() {
        when(users.findById(1L)).thenReturn(Optional.of(User.builder().id(1L).role(RoleType.CUSTOMER).build()));
        var r = new UpdateNotificationPreferencesRequest(List.of(new CategoryPreference("messages", false, true)), false, true, "21:30", "06:00");
        when(prefs.findByUserId(1L)).thenReturn(List.of(new NotificationPreference(1L, NotificationCategory.MESSAGES, false, true)));
        when(settings.findById(1L)).thenReturn(Optional.of(new NotificationSettings(1L, false, true, "21:30", "06:00")));
        NotificationPreferencesResource out = service.update(1L, r);
        verify(prefs).saveAll(argThat(list -> ((List<?>) list).size() == 1));
        verify(settings).save(new NotificationSettings(1L, false, true, "21:30", "06:00"));
        assertThat(out.quietFrom()).isEqualTo("21:30");
    }
}
```
(`NotificationSettings` dùng `@EqualsAndHashCode` để so trong `verify`.)

- [ ] **Step 2:** chạy → đỏ.
- [ ] **Step 3: Code**

```java
public record UpdateNotificationPreferencesRequest(
        @NotNull @Size(max = 10) List<@Valid CategoryPreference> categories,
        @NotNull Boolean sound, @NotNull Boolean quietOn,
        @NotNull @Pattern(regexp = HHMM, message = "Use HH:mm.") String quietFrom,
        @NotNull @Pattern(regexp = HHMM, message = "Use HH:mm.") String quietTo) {
    public static final String HHMM = "^([01]\\d|2[0-3]):[0-5]\\d$";
}

@Service @RequiredArgsConstructor
public class NotificationPreferenceService implements NotificationPreferenceServiceInterface {
    static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private final NotificationPreferenceRepository prefs;
    private final NotificationSettingsRepository settings;
    private final UserRepository users;

    @Override @Transactional(readOnly = true)
    public NotificationPreferencesResource get(Long userId) {
        RoleType role = roleOf(userId);
        Map<NotificationCategory, NotificationPreference> saved = prefs.findByUserId(userId).stream()
                .collect(Collectors.toMap(NotificationPreference::getCategory, p -> p));
        NotificationSettings s = settings.findById(userId).orElse(NotificationSettings.defaults(userId));
        List<CategoryPreference> rows = NotificationCategory.forRole(role).stream().map(c -> {
            NotificationPreference p = saved.get(c);
            return new CategoryPreference(c.code(), p == null || p.isInApp(), p == null || p.isBrowser());
        }).toList();
        return new NotificationPreferencesResource(rows, s.isSound(), s.isQuietOn(), s.getQuietFrom(), s.getQuietTo());
    }

    @Override @Transactional
    public NotificationPreferencesResource update(Long userId, UpdateNotificationPreferencesRequest r) {
        RoleType role = roleOf(userId);
        List<NotificationPreference> rows = r.categories().stream().map(c -> {
            NotificationCategory cat = NotificationCategory.fromCode(c.category())
                    .filter(x -> x.visibleTo(role))
                    .orElseThrow(() -> new InvalidNotificationPreferenceException("Unknown notification group: " + c.category()));
            return new NotificationPreference(userId, cat, c.inApp(), c.browser());
        }).toList();
        prefs.saveAll(rows);
        settings.save(new NotificationSettings(userId, r.sound(), r.quietOn(), r.quietFrom(), r.quietTo()));
        return get(userId);
    }

    @Override @Transactional(readOnly = true)
    public Alert alertFor(Long userId, NotificationKind kind, Instant now) {
        if (kind == NotificationKind.TEST) return new Alert(true, true, true);
        NotificationSettings s = settings.findById(userId).orElse(NotificationSettings.defaults(userId));
        boolean quiet = s.isQuietOn() && inQuietHours(s.getQuietFrom(), s.getQuietTo(), LocalTime.ofInstant(now, ZONE));
        if (quiet) return new Alert(false, false, false);
        NotificationPreference p = prefs.findByUserIdAndCategory(userId, kind.category()).orElse(null);
        boolean inApp = p == null || p.isInApp();
        boolean browser = p == null || p.isBrowser();
        return new Alert(inApp, browser, s.isSound() && (inApp || browser));
    }

    /** [from, to); khoảng qua nửa đêm khi from > to; from == to = không yên tĩnh. */
    public static boolean inQuietHours(String from, String to, LocalTime t) {
        LocalTime f = LocalTime.parse(from), e = LocalTime.parse(to);
        if (f.equals(e)) return false;
        return f.isBefore(e) ? !t.isBefore(f) && t.isBefore(e) : !t.isBefore(f) || t.isBefore(e);
    }

    private RoleType roleOf(Long userId) {
        return users.findById(userId).map(User::getRole).orElseThrow(() -> new EntityNotFoundException("User not found."));
    }
}
```

- [ ] **Step 4:** `SP/be-mvn.sh spotless:apply test -Dtest=NotificationPreferenceServiceTest` → PASS.
- [ ] **Step 5: Commit** `feat(FR-042): per-group, per-channel notification settings with quiet hours`

---

### Task 4: `dispatch` + đẩy STOMP

**Files:**
- Create: `services/interfaces/NotificationServiceInterface.java`, `services/interfaces/NotificationDeliveryInterface.java`, `services/impl/NotificationService.java`, `services/impl/StompNotificationDelivery.java`, `resources/NotificationPayload.java`, `resources/NotificationResource.java`
- Test: `.../services/impl/NotificationServiceDispatchTest.java` (Mockito)

**Interfaces:**
- Consumes: Task 1–3; `UserSettingsRepository` (ngôn ngữ).
- Produces:
  - `NotificationDeliveryInterface.deliver(Long userId, NotificationPayload payload)`; `StompNotificationDelivery.DESTINATION = "/topic/notifications"`.
  - `record NotificationPayload(Long id, String kind, String title, String message, String link, Instant createdAt, boolean persistent, long unreadCount, Alert alert, Long conversationId)`.
  - `record NotificationResource(Long id, String kind, String title, String message, String link, boolean isRead, Instant createdAt)` + `static from(Notification)`.
  - `NotificationServiceInterface`: `void dispatch(Collection<Long> recipients, NotificationEvent e)`, `void notifyAdmins(NotificationEvent e)`, `void broadcastAnnouncement(Announcement a)` (Task 6 dùng), cộng các hàm đọc ở Task 5.

- [ ] **Step 1: Test (đỏ)**

```java
@ExtendWith(MockitoExtension.class)
class NotificationServiceDispatchTest {
    @Mock NotificationRepository notifications; @Mock NotificationPreferenceServiceInterface prefs;
    @Mock NotificationDeliveryInterface delivery; @Mock UserSettingsRepository userSettings;
    @Mock StringRedisTemplate redis;
    Clock clock = Clock.fixed(Instant.parse("2026-09-25T05:00:00Z"), ZoneOffset.UTC);
    NotificationService service;
    @BeforeEach void setUp() {
        service = new NotificationService(notifications, prefs, delivery, userSettings,
                new NotificationTextRenderer(new NotificationMessagesConfig().notificationMessages()), redis, clock);
    }

    @Test void aPersistentKindIsSavedInTheRecipientsLanguageAndPushed() {
        when(userSettings.findAllById(List.of(7L))).thenReturn(List.of(UserSettings.builder().userId(7L).language("vi").build()));
        when(notifications.save(any())).thenAnswer(i -> { Notification n = i.getArgument(0); n.setId(99L); return n; });
        when(notifications.countByUserIdAndReadFalse(7L)).thenReturn(3L);
        when(prefs.alertFor(eq(7L), eq(NotificationKind.FARMER_APPROVED), any())).thenReturn(new Alert(true, false, true));

        service.dispatch(List.of(7L), NotificationEvent.of(NotificationKind.FARMER_APPROVED, "/farmer", Map.of("stall", "Cô Tư")));

        ArgumentCaptor<NotificationPayload> sent = ArgumentCaptor.forClass(NotificationPayload.class);
        verify(delivery).deliver(eq(7L), sent.capture());
        assertThat(sent.getValue().id()).isEqualTo(99L);
        assertThat(sent.getValue().title()).isEqualTo("Sạp của bạn đã được duyệt");
        assertThat(sent.getValue().unreadCount()).isEqualTo(3L);
        assertThat(sent.getValue().alert()).isEqualTo(new Alert(true, false, true));
        assertThat(sent.getValue().persistent()).isTrue();
    }
    @Test void aMessageIsPushedButNeverSaved() {
        when(userSettings.findAllById(List.of(8L))).thenReturn(List.of());
        when(notifications.countByUserIdAndReadFalse(8L)).thenReturn(0L);
        when(prefs.alertFor(eq(8L), eq(NotificationKind.MESSAGE), any())).thenReturn(new Alert(true, true, true));
        service.dispatch(List.of(8L), new NotificationEvent(NotificationKind.MESSAGE, Map.of(), "/messages?c=5", 5L, "Cô Tư", "Còn xoài không?"));
        verify(notifications, never()).save(any());
        verify(delivery).deliver(eq(8L), argThat(p -> p.id() == null && p.conversationId() == 5L && !p.persistent()));
    }
    @Test void aFailingDeliveryDoesNotStopTheOthers() {
        when(userSettings.findAllById(any())).thenReturn(List.of());
        when(notifications.save(any())).thenAnswer(i -> i.getArgument(0));
        when(prefs.alertFor(anyLong(), any(), any())).thenReturn(new Alert(true, true, true));
        doThrow(new RuntimeException("boom")).when(delivery).deliver(eq(1L), any());
        service.dispatch(List.of(1L, 2L), NotificationEvent.of(NotificationKind.FARMER_APPLICATION, "/admin/farmers/3", Map.of("stall", "S")));
        verify(delivery).deliver(eq(2L), any());
    }
}
```

- [ ] **Step 2:** chạy → đỏ.
- [ ] **Step 3: Code**

```java
@Slf4j @Service @RequiredArgsConstructor
public class StompNotificationDelivery implements NotificationDeliveryInterface {
    /** /topic thay /queue: cùng lý do như StompChatEventPublisher (queue exclusive auto-delete trên RabbitMQ). */
    public static final String DESTINATION = "/topic/notifications";
    private final SimpMessagingTemplate template;
    @Override public void deliver(Long userId, NotificationPayload payload) {
        try { template.convertAndSendToUser(String.valueOf(userId), DESTINATION, payload); }
        catch (MessagingException e) { log.warn("Could not push notification to user {}: {}", userId, e.getMessage()); }
    }
}

@Slf4j @Service @RequiredArgsConstructor
public class NotificationService implements NotificationServiceInterface {
    private final NotificationRepository notifications;
    private final NotificationPreferenceServiceInterface prefs;
    private final NotificationDeliveryInterface delivery;
    private final UserSettingsRepository userSettings;
    private final NotificationTextRenderer renderer;
    private final StringRedisTemplate redis;
    private final Clock clock;

    @Override @Transactional
    public void dispatch(Collection<Long> recipients, NotificationEvent e) {
        Map<Long, String> languages = userSettings.findAllById(recipients).stream()
                .collect(Collectors.toMap(UserSettings::getUserId, UserSettings::getLanguage));
        for (Long userId : new LinkedHashSet<>(recipients)) {
            RenderedText text = renderer.render(e, languages.getOrDefault(userId, "en"));
            Notification saved = e.kind().persistent()
                    ? notifications.save(Notification.builder().userId(userId).kind(e.kind())
                            .title(text.title()).message(text.message()).link(e.link()).build())
                    : null;
            Instant createdAt = saved != null ? saved.getCreatedAt() : clock.instant();
            TransactionHelper.afterCommit(() -> push(userId, e, text, saved == null ? null : saved.getId(), createdAt));
        }
    }

    @Override @Transactional
    public void notifyAdmins(NotificationEvent e) { dispatch(notifications.activeAdminIds(), e); }

    private void push(Long userId, NotificationEvent e, RenderedText text, Long id, Instant createdAt) {
        try {
            Alert alert = prefs.alertFor(userId, e.kind(), clock.instant());
            long unread = notifications.countByUserIdAndReadFalse(userId);
            delivery.deliver(userId, new NotificationPayload(id, e.kind().code(), text.title(), text.message(),
                    e.link(), createdAt, e.kind().persistent(), unread, alert, e.conversationId()));
        } catch (RuntimeException ex) {
            // Đã lưu (nếu cần lưu); lỗi đẩy của một người không được chặn người khác hay request đã thành công.
            log.warn("Notification push to user {} failed: {}", userId, ex.getMessage());
        }
    }
}
```
`Clock`: dùng bean `Clock` có sẵn (MessageService đã inject `Clock`); nếu chưa có bean thì kiểm `config/AppConfig` trước, có rồi thì dùng lại.

- [ ] **Step 4:** `SP/be-mvn.sh spotless:apply test -Dtest=NotificationServiceDispatchTest` → PASS.
- [ ] **Step 5: Commit** `feat(FR-042): dispatch saves, renders per language and pushes over STOMP after commit`

---

### Task 5: REST `/api/v1/notifications`

**Files:**
- Modify: `NotificationServiceInterface` + `NotificationService` (thêm `list`, `unreadCount`, `markRead`, `markAllRead`, `sendTest`)
- Create: `controllers/NotificationController.java`, `controllers/NotificationExceptionHandler.java`, `exceptions/NotificationAccessDeniedException.java`, `exceptions/TestNotificationTooSoonException.java`
- Test: `.../controllers/NotificationControllerTest.java` (`@SpringBootTest @AutoConfigureMockMvc`, token thật như `ChatStompIntegrationTest`)

**Interfaces:**
- Produces: `PageResource<NotificationResource> list(Long userId, Boolean isRead, int page, int size)`; `long unreadCount(Long userId)`; `void markRead(Long userId, Long id)`; `int markAllRead(Long userId)`; `void sendTest(Long userId)`.
- Endpoints: `GET /api/v1/notifications?isRead&page=1&size=20`, `GET /unread-count` → `{count}`, `PATCH /{id}/read`, `PATCH /read-all` → `{updated}`, `GET|PUT /preferences`, `POST /test` (429 khi bấm lại trong 10 giây).

- [ ] **Step 1: Test (đỏ)** — dùng `MockMvc`, tạo user + `sessions.set(...)` + `jwt.generateToken(id)` như `ChatStompIntegrationTest.newUser`:

```java
@Test void listShowsOnlyMineNewestFirstAndFiltersUnread() { /* 2 dòng của me (1 đã đọc), 1 của other → GET ?isRead=false trả 1 item của me */ }
@Test void markingSomeoneElsesNotificationIs403AndAMissingOneIs404() {
    mvc.perform(patch("/api/v1/notifications/" + othersId + "/read").header("Authorization", bearer(me)))
       .andExpect(status().isForbidden());
    mvc.perform(patch("/api/v1/notifications/999999999/read").header("Authorization", bearer(me)))
       .andExpect(status().isNotFound());
}
@Test void readAllReturnsHowManyChangedAndUnreadCountDropsToZero() { /* PATCH read-all → data.updated == 2; GET unread-count → data.count == 0 */ }
@Test void preferencesRoundTripAndABadTimeIs400() {
    mvc.perform(put("/api/v1/notifications/preferences").header("Authorization", bearer(me)).contentType(JSON)
        .content("{\"categories\":[{\"category\":\"messages\",\"inApp\":true,\"browser\":false}],\"sound\":true,\"quietOn\":true,\"quietFrom\":\"25:00\",\"quietTo\":\"07:00\"}"))
       .andExpect(status().isBadRequest());
    /* hợp lệ → 200, GET trả lại đúng browser=false cho messages */
}
@Test void testNotificationIsRateLimited() {
    mvc.perform(post("/api/v1/notifications/test").header("Authorization", bearer(me))).andExpect(status().isOk());
    mvc.perform(post("/api/v1/notifications/test").header("Authorization", bearer(me))).andExpect(status().isTooManyRequests());
}
@Test void anonymousIs401() { mvc.perform(get("/api/v1/notifications")).andExpect(status().isUnauthorized()); }
```
Mỗi test tự dọn: `@AfterEach` xoá user (FK `ON DELETE CASCADE` xoá notifications/preferences), `redis.delete("notif:test:" + me.getId())`.

- [ ] **Step 2:** chạy → đỏ.
- [ ] **Step 3: Code**

```java
// NotificationService (thêm)
@Override @Transactional(readOnly = true)
public PageResource<NotificationResource> list(Long userId, Boolean isRead, int page, int size) {
    Pageable p = PageRequest.of(page - 1, size);
    Page<Notification> result = isRead == null
            ? notifications.findByUserIdOrderByCreatedAtDescIdDesc(userId, p)
            : notifications.findByUserIdAndReadOrderByCreatedAtDescIdDesc(userId, isRead, p);
    return PageResource.<NotificationResource>builder().items(result.map(NotificationResource::from).getContent())
            .page(page).pageSize(size).total(result.getTotalElements()).build();
}
@Override @Transactional(readOnly = true) public long unreadCount(Long userId) { return notifications.countByUserIdAndReadFalse(userId); }
@Override @Transactional
public void markRead(Long userId, Long id) {
    Notification n = notifications.findById(id).orElseThrow(() -> new EntityNotFoundException("Notification not found."));
    if (!n.getUserId().equals(userId)) throw new NotificationAccessDeniedException();
    n.setRead(true);
}
@Override @Transactional public int markAllRead(Long userId) { return notifications.markAllRead(userId); }
@Override
public void sendTest(Long userId) {
    Boolean first = redis.opsForValue().setIfAbsent("notif:test:" + userId, "1", Duration.ofSeconds(10));
    if (!Boolean.TRUE.equals(first)) throw new TestNotificationTooSoonException();
    dispatch(List.of(userId), NotificationEvent.of(NotificationKind.TEST, "/settings", Map.of()));
}

// NotificationController
@Validated @RestController @RequestMapping("/api/v1/notifications") @AllArgsConstructor
public class NotificationController extends BaseController {
    private final NotificationServiceInterface notifications;
    private final NotificationPreferenceServiceInterface preferences;

    @GetMapping
    public ResponseEntity<ApiResource<PageResource<NotificationResource>>> list(@RequestParam(required = false) Boolean isRead,
            @RequestParam(defaultValue = "1") @Min(1) int page, @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size,
            @AuthenticationPrincipal CustomUserDetails me) {
        return ok(notifications.list(me.getId(), isRead, page, size), "OK");
    }
    @GetMapping("/unread-count")
    public ResponseEntity<ApiResource<Map<String, Long>>> unread(@AuthenticationPrincipal CustomUserDetails me) {
        return ok(Map.of("count", notifications.unreadCount(me.getId())), "OK");
    }
    @PatchMapping("/{id}/read")
    public ResponseEntity<ApiResource<Void>> read(@PathVariable Long id, @AuthenticationPrincipal CustomUserDetails me) {
        notifications.markRead(me.getId(), id); return ok(null, "Marked as read.");
    }
    @PatchMapping("/read-all")
    public ResponseEntity<ApiResource<Map<String, Integer>>> readAll(@AuthenticationPrincipal CustomUserDetails me) {
        return ok(Map.of("updated", notifications.markAllRead(me.getId())), "All marked as read.");
    }
    @GetMapping("/preferences")
    public ResponseEntity<ApiResource<NotificationPreferencesResource>> prefs(@AuthenticationPrincipal CustomUserDetails me) {
        return ok(preferences.get(me.getId()), "OK");
    }
    @PutMapping("/preferences")
    public ResponseEntity<ApiResource<NotificationPreferencesResource>> savePrefs(
            @Valid @RequestBody UpdateNotificationPreferencesRequest r, @AuthenticationPrincipal CustomUserDetails me) {
        return ok(preferences.update(me.getId(), r), "Notification settings saved.");
    }
    @PostMapping("/test")
    public ResponseEntity<ApiResource<Void>> test(@AuthenticationPrincipal CustomUserDetails me) {
        notifications.sendTest(me.getId()); return ok(null, "Test notification sent.");
    }
}
```
`NotificationExceptionHandler` (`@RestControllerAdvice(assignableTypes = {NotificationController.class, AdminAnnouncementController.class, PublicAnnouncementController.class})`): chép nguyên khối validation của `ConversationExceptionHandler` (MethodArgumentNotValid → 400 kèm field, các lỗi tham số → 400), cộng: `EntityNotFoundException` → 404 `NOT_FOUND`; `NotificationAccessDeniedException` → 403 `NOT_YOURS`; `InvalidNotificationPreferenceException`, `InvalidAnnouncementException` → 400 `VALIDATION_ERROR`; `TestNotificationTooSoonException` → 429 `TOO_MANY_REQUESTS` "Wait a few seconds before sending another test.". Hàm `error(...)` chép từ `ConversationExceptionHandler`.

- [ ] **Step 4:** `SP/be-mvn.sh spotless:apply test -Dtest='Notification*Test'` → PASS.
- [ ] **Step 5: Commit** `feat(FR-042): notifications REST — list, unread count, read, read-all, settings, test`

---

### Task 6: Thông báo của admin (FR-077)

**Files:**
- Create: `services/interfaces/AnnouncementServiceInterface.java`, `services/impl/AnnouncementService.java`, `requests/AnnouncementRequest.java`, `resources/AnnouncementResource.java`, `exceptions/InvalidAnnouncementException.java`, `controllers/AdminAnnouncementController.java`, `controllers/PublicAnnouncementController.java`
- Modify: `NotificationService` (thêm `broadcastAnnouncement`), `config/SecurityConfig.java` (permit `GET /api/v1/announcements/active`)
- Test: `.../controllers/AnnouncementControllerTest.java` (MockMvc)

**Interfaces:**
- `AnnouncementRequest(@NotBlank @Size(max=150) String title, @NotBlank @Size(max=1000) String content, @NotNull Audience audience, Instant startsAt, Instant endsAt)`; `endsAt <= startsAt` → `InvalidAnnouncementException`.
- `AnnouncementResource(Long id, String title, String content, String audience, boolean active, Instant startsAt, Instant endsAt, Instant createdAt)`.
- `AnnouncementServiceInterface`: `create(Long adminId, AnnouncementRequest)`, `list(int page, int size)`, `update(Long id, AnnouncementRequest)`, `deactivate(Long id)`, `Optional<AnnouncementResource> live()`.
- `NotificationService.broadcastAnnouncement(Announcement a)`: `fanOutAnnouncement(...)`, rồi sau commit đẩy STOMP cho từng `recipientsOf(a.getId())` với `unreadCounts` gom một câu; `alertFor` từng người.

- [ ] **Step 1: Test (đỏ)**

```java
@Test void adminPublishesAndEveryActiveCustomerGetsARow() {
    mvc.perform(post("/api/v1/admin/announcements").header("Authorization", bearer(admin)).contentType(JSON)
        .content("{\"title\":\"Closed Sunday\",\"content\":\"Thảo Điền closes 04/10\",\"audience\":\"customers\"}"))
       .andExpect(status().isCreated()).andExpect(jsonPath("$.data.audience").value("customers"));
    assertThat(notifications.countByUserIdAndReadFalse(customer.getId())).isEqualTo(1);
    assertThat(notifications.countByUserIdAndReadFalse(farmer.getId())).isZero();
    assertThat(notifications.countByUserIdAndReadFalse(suspendedCustomer.getId())).isZero();
}
@Test void aCustomerCannotPublish() { /* POST với token customer → 403 */ }
@Test void liveBannerIsPublicAndRespectsTheWindowAndDeactivation() {
    /* tạo 1 thông báo endsAt = now - 1h → GET /api/v1/announcements/active (không token) → data null;
       tạo 1 thông báo không giới hạn → trả đúng tiêu đề; DELETE /admin/announcements/{id} → active trả null */
}
@Test void endsBeforeStartsIs400() { /* startsAt = 10:00, endsAt = 09:00 → 400 */ }
@Test void unknownAudienceIs400() { /* "audience":"everyone" → 400 */ }
```

- [ ] **Step 2:** chạy → đỏ.
- [ ] **Step 3: Code**

```java
// NotificationService
@Override @Transactional
public void broadcastAnnouncement(Announcement a) {
    notifications.fanOutAnnouncement(a.getId(), a.getTitle(), a.getContent(), a.getAudience().roleCodes());
    TransactionHelper.afterCommit(() -> {
        List<NotificationRepository.Recipient> rs = notifications.recipientsOf(a.getId());
        Map<Long, Long> unread = notifications.unreadCounts(rs.stream().map(NotificationRepository.Recipient::getUserId).toList())
                .stream().collect(Collectors.toMap(NotificationRepository.UnreadRow::getUserId, NotificationRepository.UnreadRow::getTotal));
        Instant now = clock.instant();
        for (NotificationRepository.Recipient r : rs) {
            try {
                delivery.deliver(r.getUserId(), new NotificationPayload(r.getId(), NotificationKind.ANNOUNCEMENT.code(),
                        a.getTitle(), a.getContent(), r.getLink(), r.getCreatedAt(), true,
                        unread.getOrDefault(r.getUserId(), 0L), prefs.alertFor(r.getUserId(), NotificationKind.ANNOUNCEMENT, now), null));
            } catch (RuntimeException ex) { log.warn("Announcement push to user {} failed: {}", r.getUserId(), ex.getMessage()); }
        }
    });
}
```
`r.getLink()` là link đã lưu theo vai lúc fan-out (`/notifications` hoặc `/farmer/notifications`).

```java
@Service @RequiredArgsConstructor
public class AnnouncementService implements AnnouncementServiceInterface {
    private final AnnouncementRepository announcements;
    private final NotificationServiceInterface notifications;
    private final Clock clock;

    @Override @Transactional
    public AnnouncementResource create(Long adminId, AnnouncementRequest r) {
        checkWindow(r);
        Announcement a = announcements.save(Announcement.builder().title(r.title().strip()).content(r.content().strip())
                .audience(r.audience()).createdBy(adminId).startsAt(r.startsAt()).endsAt(r.endsAt()).build());
        notifications.broadcastAnnouncement(a);
        return AnnouncementResource.from(a);
    }
    @Override @Transactional(readOnly = true)
    public PageResource<AnnouncementResource> list(int page, int size) { /* findAllByOrderByCreatedAtDescIdDesc */ }
    @Override @Transactional
    public AnnouncementResource update(Long id, AnnouncementRequest r) {
        checkWindow(r);
        Announcement a = announcements.findById(id).orElseThrow(() -> new EntityNotFoundException("Announcement not found."));
        a.setTitle(r.title().strip()); a.setContent(r.content().strip()); a.setAudience(r.audience());
        a.setStartsAt(r.startsAt()); a.setEndsAt(r.endsAt());
        return AnnouncementResource.from(a);   // không gửi lại thông báo
    }
    @Override @Transactional
    public void deactivate(Long id) {
        announcements.findById(id).orElseThrow(() -> new EntityNotFoundException("Announcement not found.")).setActive(false);
    }
    @Override @Transactional(readOnly = true)
    public Optional<AnnouncementResource> live() {
        return announcements.findLive(clock.instant(), PageRequest.of(0, 1)).stream().findFirst().map(AnnouncementResource::from);
    }
    private static void checkWindow(AnnouncementRequest r) {
        if (r.startsAt() != null && r.endsAt() != null && !r.endsAt().isAfter(r.startsAt()))
            throw new InvalidAnnouncementException("The end time must be after the start time.");
    }
}

@RestController @RequestMapping("/api/v1/admin/announcements") @PreAuthorize("hasRole('ADMIN')") @AllArgsConstructor
public class AdminAnnouncementController extends BaseController {
    private final AnnouncementServiceInterface announcements;
    @GetMapping public ResponseEntity<ApiResource<PageResource<AnnouncementResource>>> list(
            @RequestParam(defaultValue = "1") @Min(1) int page, @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size) {
        return ok(announcements.list(page, size), "OK"); }
    @PostMapping public ResponseEntity<ApiResource<AnnouncementResource>> create(@Valid @RequestBody AnnouncementRequest r,
            @AuthenticationPrincipal CustomUserDetails me) { return created(announcements.create(me.getId(), r), "Announcement published."); }
    @PutMapping("/{id}") public ResponseEntity<ApiResource<AnnouncementResource>> update(@PathVariable Long id,
            @Valid @RequestBody AnnouncementRequest r) { return ok(announcements.update(id, r), "Announcement updated."); }
    @DeleteMapping("/{id}") public ResponseEntity<ApiResource<Void>> remove(@PathVariable Long id) {
        announcements.deactivate(id); return ok(null, "Announcement taken down."); }
}

@RestController @RequestMapping("/api/v1/announcements") @AllArgsConstructor
public class PublicAnnouncementController extends BaseController {
    private final AnnouncementServiceInterface announcements;
    @GetMapping("/active") public ResponseEntity<ApiResource<AnnouncementResource>> active() {
        return ok(announcements.live().orElse(null), "OK"); }
}
```
SecurityConfig: thêm trước `.anyRequest()`:
```java
// FR-077: banner thông báo ở trang public
.requestMatchers(HttpMethod.GET, "/api/v1/announcements/active")
.permitAll()
```
Audience sai → Jackson `@JsonCreator` ném `IllegalArgumentException` bọc trong `HttpMessageNotReadableException` → 400 (đã có trong handler).

- [ ] **Step 4:** `SP/be-mvn.sh spotless:apply test -Dtest='Announcement*Test,Notification*Test'` → PASS.
- [ ] **Step 5: Commit** `feat(FR-077): admins publish announcements to every active customer or farmer`

---

### Task 7: Gắn sự kiện duyệt Farmer

**Files:**
- Modify: `modules/farmer/services/impl/FarmerService.java` (thêm dependency `NotificationServiceInterface notifications`; gọi ở `apply`, `approve`, `reject`, `suspend`, `reinstate`)
- Modify test: `FarmerServiceTest.java` (constructor thêm mock `notifications`; verify từng chỗ)
- Test mới: `.../notification/FarmerNotificationIntegrationTest.java` (1 test DB thật: approve → 1 dòng `farmer_approved` tiếng Việt cho chủ đơn có `language = vi`)

**Interfaces:** Consumes `NotificationServiceInterface.dispatch`, `notifyAdmins`, `NotificationEvent.of`.

- [ ] **Step 1: Test (đỏ)** trong `FarmerServiceTest`:

```java
@Test void approvingTellsTheOwner() {
    /* arrange như test approve hiện có */
    service.approve(10L, 1L);
    verify(notifications).dispatch(eq(List.of(OWNER_ID)), argThat(e -> e.kind() == NotificationKind.FARMER_APPROVED
            && e.link().equals("/farmer") && e.params().get("stall").equals("Cô Tư Garden")));
}
@Test void rejectingSendsTheReason() { /* kind FARMER_REJECTED, link /become-farmer, params.reason */ }
@Test void suspendingAndReinstatingTellTheOwner() { /* FARMER_SUSPENDED → /farmer/pending; FARMER_REINSTATED → /farmer */ }
@Test void applyingTellsTheAdmins() { /* verify(notifications).notifyAdmins(argThat(e -> e.kind()==FARMER_APPLICATION && e.link().equals("/admin/farmers/" + savedId))) */ }
@Test void aRejectedTransitionSendsNothing() { /* approve khi đã APPROVED → ném InvalidApprovalTransitionException, verifyNoInteractions(notifications) */ }
```

- [ ] **Step 2:** chạy → đỏ.
- [ ] **Step 3: Code** — mỗi hàm thêm một lời gọi ngay trước `return`, ví dụ `approve`:

```java
notifications.dispatch(List.of(owner.getId()),
        NotificationEvent.of(NotificationKind.FARMER_APPROVED, "/farmer", Map.of("stall", profile.getStallName())));
```
`apply`: `notifications.notifyAdmins(NotificationEvent.of(NotificationKind.FARMER_APPLICATION, "/admin/farmers/" + profile.getId(), Map.of("stall", profile.getStallName())));`
`reject`: `Map.of("stall", …, "reason", profile.getRejectReason())`, link `/become-farmer`. `suspend` → `/farmer/pending`, `reinstate` → `/farmer`.
(Đẩy STOMP tự chạy sau commit vì `dispatch` dùng `afterCommit` và các hàm này đã `@Transactional`.)

- [ ] **Step 4:** `SP/be-mvn.sh spotless:apply test -Dtest='FarmerServiceTest,FarmerNotificationIntegrationTest'` → PASS.
- [ ] **Step 5: Commit** `feat(FR-071,FR-042): tell the owner and the admins about Farmer application decisions`

---

### Task 8: Tin nhắn chat → popup (không lưu)

**Files:**
- Create: `modules/conversation/realtime/ChatMessageCreatedEvent.java` (`record ChatMessageCreatedEvent(Long conversationId, Long recipientId, MessageResource message)`), `modules/notification/services/impl/ChatNotificationListener.java`
- Modify: `StompChatEventPublisher` (thêm `ApplicationEventPublisher appEvents`, một dòng `appEvents.publishEvent(...)` cuối `messageCreated`); `StompChatEventPublisherTest` (constructor)
- Test: `.../notification/services/impl/ChatNotificationListenerTest.java` (Mockito)

**Interfaces:** Consumes `NotificationServiceInterface.dispatch`, `UserRepository`, `FarmerProfileRepository.findByUserId`.

- [ ] **Step 1: Test (đỏ)**

```java
@Test void aTextFromAFarmerShowsTheStallNameAndTheText() {
    when(users.findById(FARMER)).thenReturn(Optional.of(User.builder().id(FARMER).fullName("Nguyễn Thị Tư").role(RoleType.FARMER).build()));
    when(users.findById(CUSTOMER)).thenReturn(Optional.of(User.builder().id(CUSTOMER).role(RoleType.CUSTOMER).build()));
    when(farmers.findByUserId(FARMER)).thenReturn(Optional.of(FarmerProfile.builder().stallName("Cô Tư Garden").build()));
    listener.on(new ChatMessageCreatedEvent(5L, CUSTOMER, msg(FARMER, MessageKind.TEXT, "Mai còn xoài không chị?")));
    verify(notifications).dispatch(eq(List.of(CUSTOMER)), argThat(e -> e.kind() == NotificationKind.MESSAGE
            && e.title().equals("Cô Tư Garden") && e.message().equals("Mai còn xoài không chị?")
            && e.link().equals("/messages?c=5") && e.conversationId() == 5L));
}
@Test void aPhotoLeavesTheMessageToTheRenderer() { /* kind IMAGE → e.message() == null, e.params().get("sender") == tên */ }
@Test void aFarmerRecipientGetsTheFarmerLink() { /* recipient role FARMER → link /farmer/messages?c=5 */ }
@Test void longTextIsCutTo120() { /* body 300 ký tự → message dài 120, kết thúc bằng … */ }
```
Thêm vào `ChatStompIntegrationTest` hiện có một test: gửi tin qua `messageService.send` → farmer nhận khung trên `/user/topic/notifications` có `"kind":"message"` và `select count(*) from notifications where user_id = farmer` = 0.

- [ ] **Step 2:** chạy → đỏ.
- [ ] **Step 3: Code**

```java
@Component @RequiredArgsConstructor
public class ChatNotificationListener {
    private static final int PREVIEW = 120;
    private final NotificationServiceInterface notifications;
    private final UserRepository users;
    private final FarmerProfileRepository farmers;

    /** Chạy sau commit (StompChatEventPublisher được gọi trong afterCommit). */
    @EventListener
    public void on(ChatMessageCreatedEvent e) {
        User sender = users.findById(e.message().senderId()).orElse(null);
        User recipient = users.findById(e.recipientId()).orElse(null);
        if (sender == null || recipient == null) return;
        String name = sender.getRole() == RoleType.FARMER
                ? farmers.findByUserId(sender.getId()).map(FarmerProfile::getStallName).orElse(sender.getFullName())
                : sender.getFullName();
        String base = recipient.getRole() == RoleType.FARMER ? "/farmer/messages?c=" : "/messages?c=";
        String text = e.message().kind() == MessageKind.TEXT ? preview(e.message().body()) : null;
        notifications.dispatch(List.of(recipient.getId()), new NotificationEvent(NotificationKind.MESSAGE,
                Map.of("sender", name), base + e.conversationId(), e.conversationId(), name, text));
    }
    private static String preview(String body) {
        String s = body == null ? "" : body.strip();
        return s.length() <= PREVIEW ? s : s.substring(0, PREVIEW - 1) + "…";
    }
}
```
`StompChatEventPublisher.messageCreated` cuối hàm: `appEvents.publishEvent(new ChatMessageCreatedEvent(conversation.getId(), recipient, message));`

- [ ] **Step 4:** `SP/be-mvn.sh spotless:apply test -Dtest='ChatNotificationListenerTest,StompChatEventPublisherTest,ChatStompIntegrationTest'` → PASS.
- [ ] **Step 5: Commit** `feat(FR-111,FR-042): a new chat message pops up for the other member without being stored`

---

### Task 9: Kiểm STOMP đầu–cuối

**Files:**
- Test: `.../notification/NotificationStompIntegrationTest.java` (`RANDOM_PORT`, `app.chat.rabbitmq.host=`, helper `connectAs/subscribe` như `ChatStompIntegrationTest`)

- [ ] **Step 1: Test**

```java
@Test void theOwnerSeesTheApprovalLiveAndNobodyElseDoes() {
    StompSession ownerS = connectAs(owner); BlockingQueue<String> ownerQ = subscribe(ownerS, "/user/topic/notifications");
    StompSession otherS = connectAs(other); BlockingQueue<String> otherQ = subscribe(otherS, "/user/topic/notifications");
    Thread.sleep(300); // đợi SUBSCRIBE tới broker (giống test chat hiện có)
    farmerService.approve(profile.getId(), admin.getId());
    String frame = ownerQ.poll(5, TimeUnit.SECONDS);
    assertThat(frame).contains("\"kind\":\"farmer_approved\"").contains("\"persistent\":true").contains("\"unreadCount\":1");
    assertThat(otherQ.poll(500, TimeUnit.MILLISECONDS)).isNull();
}
@Test void theTestButtonArrivesWithAlertsOn() {
    /* notificationService.sendTest(owner.getId()) → frame chứa "kind":"test" và "inApp":true,"browser":true */
}
```

- [ ] **Step 2:** `SP/be-mvn.sh spotless:apply test -Dtest=NotificationStompIntegrationTest` → PASS (nếu đỏ: sửa code của Task 4/7, không sửa test).
- [ ] **Step 3: Commit** `test(FR-042): notifications reach only their owner over STOMP`

---

### Task 10: Tài liệu + chạy toàn bộ

**Files:**
- Modify: `docs/api-contract.md` §9 (bỏ "Chưa triển khai" cho phần notifications, thêm bảng endpoint + `NotificationResource` + khung STOMP `/user/topic/notifications`), §10 (announcements admin + `GET /api/v1/announcements/active`)
- Modify: `db/schema.sql` (bảng `notifications` theo migration 012; `announcements` thêm `audience`; thêm `notification_preferences`, `notification_settings`)
- Modify: `README.md` mục realtime (một đoạn: đích mới, cách thử bằng nút Gửi thử)

- [ ] **Step 1:** Sửa 3 file trên.
- [ ] **Step 2:** `SP/be-mvn.sh spotless:check test` → exit 0; surefire: 212 test cũ + test mới, 0 lỗi.
- [ ] **Step 3:** Kiểm DB dev không bị đụng: `select max(version) from intervue_db.flyway_schema_history` vẫn `20260925010`.
- [ ] **Step 4: Commit** `docs(FR-042,FR-077): notifications and announcements in the API contract and schema`
- [ ] **Step 5:** Push nhánh `feature/FR-042-notifications-n1`, mở PR vào `dev` (checklist CONTRIBUTING §5, ghi rõ migration 012–014 và phụ thuộc số 011 của chat Plan 3).
