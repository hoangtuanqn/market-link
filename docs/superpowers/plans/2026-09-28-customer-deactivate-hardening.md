# Customer Deactivate Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Admin → Customer deactivate actually cut a customer off immediately, support permanent/temporary
bans with auto-expiry, email the customer, keep a visible audit trail, and auto-cancel their open orders on a
permanent ban.

**Architecture:** Backend: extend the existing `AdminCustomerService.setStatus` single door to persist a
reason/expiry, revoke the live Redis session (reusing the exact mechanism already used for password
change/reset), write an append-only `user_status_history` row, enqueue an async email job, and — on a
permanent ban — delegate to `OrderService` to cancel the customer's open orders through the existing
`transition()` door. A new `@Scheduled` job reactivates expired temporary bans by calling the same
`setStatus`, so the reactivate path (manual or automatic) never diverges. `JwtAuthFilter` gets a new
`ACCOUNT_DEACTIVATED` error code so a live session gets a real reason instead of a generic "session expired".
Frontend: a shared ban-duration control, a required reason, a new axios interceptor branch for the new error
code, and a read-only "Account history" panel.

**Tech Stack:** Spring Boot 4.1 / Java 25 / MySQL 8 / Redis / Flyway (backend); React 19 / TypeScript / Tailwind
4 (frontend). No new libraries.

**Spec:** `docs/superpowers/specs/2026-09-28-customer-deactivate-hardening-design.md`

## Global Constraints

- R-04: every SQL statement uses bound parameters (`NamedParameterJdbcTemplate` / JPA) — never string
  concatenation.
- R-09: every code comment (Java, TS/TSX, SQL, properties) is 100% English.
- R-10: every commit message is 100% English, `<type>(FR-072): <description>`, ≤ 70 char subject.
- Migration file: `V20260928003__add_customer_deactivation_fields.sql` (next after
  `V20260928002__create_platform_status_table.sql`); never edit a migration once written by an earlier task.
- A foreign key to `users` is `BIGINT UNSIGNED`, matching `users.id`.
- FE screens with data keep all 4 states — loading / empty / error / data (FR-084).
- `reason` is required (client + server) whenever `status=inactive`; `until`, if present, must be strictly in
  the future — validated server-side regardless of what the client sends.
- A **temporary** ban never cancels orders. Only a **permanent** ban (`until == null`) triggers
  `OrderService.cancelAllForDeactivatedCustomer`.
- The cron auto-reactivate job calls the same `AdminCustomerService.setStatus` the controller calls — it must
  never duplicate the reactivate logic.

## Review Focus

- Deactivating a customer with no live Redis session (never signed in, or the session naturally expired
  already) — `userSessionCache.revokeAll()` must be a safe no-op, not throw. (Task 1)
- `until` sent in the past (or equal to now) via a direct API call, bypassing the UI's own validation — server
  must 400 it. (Task 1)
- Reactivating an account clears `deactivated_until`/`deactivation_reason` completely — a later unrelated
  re-deactivation must never see a stale expiry from a previous ban cycle. (Task 1)
- Calling deactivate twice in a row on the same already-inactive customer must not throw, double-cancel their
  orders, or write a corrupt `from_status == to_status` history row in a way that breaks the timeline read.
  (Task 1)
- `GET /admin/customers/{id}/status-history` for an id that is not a customer (farmer/admin) or does not exist
  must 404 like every other endpoint in this controller — not silently return an empty page. (Task 6)

---

## File Structure

**Backend — create:**
- `backend/src/main/resources/db/migration/V20260928003__add_customer_deactivation_fields.sql`
- `backend/src/main/java/com/techx/intervue/modules/user/entities/UserStatusHistory.java`
- `backend/src/main/java/com/techx/intervue/modules/user/repositories/UserStatusHistoryRepository.java`
- `backend/src/main/java/com/techx/intervue/modules/user/services/impl/UserStatusHistoryWriter.java`
- `backend/src/main/java/com/techx/intervue/modules/user/services/impl/DeactivationMessage.java`
- `backend/src/main/java/com/techx/intervue/modules/user/services/impl/AccountDeactivatedNoticeJob.java`
- `backend/src/main/java/com/techx/intervue/modules/user/services/impl/AccountReactivatedNoticeJob.java`
- `backend/src/main/java/com/techx/intervue/modules/user/services/impl/CustomerBanExpiryJob.java`
- `backend/src/main/java/com/techx/intervue/modules/user/repositories/AdminCustomerStatusHistoryQueryRepository.java`
- `backend/src/main/java/com/techx/intervue/modules/user/resources/AdminCustomerStatusHistoryResource.java`

**Backend — modify:**
- `backend/src/main/java/com/techx/intervue/modules/user/entities/User.java` — add `deactivatedUntil`,
  `deactivationReason`.
- `backend/src/main/java/com/techx/intervue/modules/user/requests/CustomerStatusRequest.java` — add `reason`,
  `until`.
- `backend/src/main/java/com/techx/intervue/modules/user/services/interfaces/AdminCustomerServiceInterface.java`
  — `setStatus` new signature, add `statusHistory`.
- `backend/src/main/java/com/techx/intervue/modules/user/services/impl/AdminCustomerService.java` — core
  rewrite (Task 1), order-cancellation wiring (Task 5), status-history delegation (Task 6).
- `backend/src/main/java/com/techx/intervue/modules/user/controllers/AdminCustomerController.java` — pass
  actor id, new `reason`/`until`, new `GET .../status-history`.
- `backend/src/main/java/com/techx/intervue/modules/user/services/impl/UserService.java` — dynamic login
  message.
- `backend/src/main/java/com/techx/intervue/filters/JwtAuthFilter.java` — `ACCOUNT_DEACTIVATED` code (Task 2).
- `backend/src/main/java/com/techx/intervue/modules/order/repositories/OrderRepository.java` —
  `findByCustomerIdAndStatusIn`.
- `backend/src/main/java/com/techx/intervue/modules/order/services/interfaces/OrderServiceInterface.java` —
  `cancelAllForDeactivatedCustomer`.
- `backend/src/main/java/com/techx/intervue/modules/order/services/impl/OrderService.java` — implement it.
- `backend/src/main/java/com/techx/intervue/modules/notification/enums/NotificationKind.java` — add
  `ORDER_CANCELLED_ACCOUNT_DEACTIVATED`.
- `backend/src/main/resources/i18n/notifications.properties` + all 9 `notifications_*.properties` — new key.

**Backend — tests modify/create:**
- `backend/src/test/java/com/techx/intervue/modules/user/services/impl/AdminCustomerServiceTest.java` (Task 1,
  5, 6)
- `backend/src/test/java/com/techx/intervue/filters/JwtAuthFilterTest.java` (Task 2)
- `backend/src/test/java/com/techx/intervue/modules/user/services/impl/AccountDeactivatedNoticeJobTest.java`
  (create, Task 3)
- `backend/src/test/java/com/techx/intervue/modules/user/services/impl/AccountReactivatedNoticeJobTest.java`
  (create, Task 3)
- `backend/src/test/java/com/techx/intervue/modules/user/services/impl/CustomerBanExpiryJobTest.java` (create,
  Task 4)

**Frontend — create:**
- `frontend/src/components/BanDurationPicker.tsx`

**Frontend — modify:**
- `frontend/src/utils/axiosInstance.ts` (Task 7)
- `frontend/src/api-requests/report.requests.ts` (Task 8)
- `frontend/src/pages/admin/Customers/index.tsx` (Task 8)
- `frontend/src/pages/admin/CustomerDetail/index.tsx` (Task 8, 9)
- `frontend/src/locales/en/AdminCustomers.json`, `frontend/src/locales/en/AdminCustomerDetail.json`,
  `frontend/src/locales/en/common.json` (Task 8, 9), plus the same 3 files under `vi zh ja ko fr es de th id`
  (Task 10).

---

### Task 1: Data model + `setStatus` core rewrite (revoke session, reason/until, history, login message)

**Files:**
- Create: `backend/src/main/resources/db/migration/V20260928003__add_customer_deactivation_fields.sql`
- Create: `backend/src/main/java/com/techx/intervue/modules/user/entities/UserStatusHistory.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/user/repositories/UserStatusHistoryRepository.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/user/services/impl/UserStatusHistoryWriter.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/user/services/impl/DeactivationMessage.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/user/entities/User.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/user/requests/CustomerStatusRequest.java`
- Modify:
  `backend/src/main/java/com/techx/intervue/modules/user/services/interfaces/AdminCustomerServiceInterface.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/user/services/impl/AdminCustomerService.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/user/controllers/AdminCustomerController.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/user/services/impl/UserService.java:192-195`
- Test: `backend/src/test/java/com/techx/intervue/modules/user/services/impl/AdminCustomerServiceTest.java`

**Interfaces:**
- Produces: `AdminCustomerServiceInterface.setStatus(long userId, String status, String reason, Instant until, Long actorId): AdminCustomerResource`
  — `status` is `"active"` or `"inactive"`; `reason`/`until` only apply when `"inactive"`; `actorId` is the
  admin's `users.id`, or `null` when the system (cron, Task 4) reactivates.
- Produces: `DeactivationMessage.of(User user): String` — the one sentence both the login flow and
  `JwtAuthFilter` show when an account is `INACTIVE`.
- Produces: `User.getDeactivatedUntil(): Instant` (nullable), `User.getDeactivationReason(): String` (nullable).
- Consumes (existing): `RefreshTokenService.revokeAllTokens(Long userId)`, `UserSessionCache.revokeAll(Long userId)`.

- [ ] **Step 1: Write the migration**

```sql
-- V20260928003__add_customer_deactivation_fields.sql
-- FR-072: an expiry and a reason for the current deactivation, plus an append-only history of every
-- deactivate/reactivate so the admin can see who did what and why.

ALTER TABLE users
  ADD COLUMN deactivated_until DATETIME NULL COMMENT 'NULL = permanent when status = inactive',
  ADD COLUMN deactivation_reason VARCHAR(255) NULL;

CREATE TABLE user_status_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  from_status VARCHAR(20) NOT NULL,
  to_status VARCHAR(20) NOT NULL,
  reason VARCHAR(255) NULL,
  until DATETIME NULL,
  changed_by BIGINT UNSIGNED NULL COMMENT 'NULL = the system (cron auto-reactivate)',
  changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user_status_history_user (user_id, changed_at),
  CONSTRAINT fk_user_status_history_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_user_status_history_actor FOREIGN KEY (changed_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

- [ ] **Step 2: Add the two columns to the `User` entity**

Edit `backend/src/main/java/com/techx/intervue/modules/user/entities/User.java`, right after the `status`
field (after line 62):

```java
    @Column(name = "deactivated_until")
    private Instant deactivatedUntil;

    @Column(name = "deactivation_reason", length = 255)
    private String deactivationReason;
```

- [ ] **Step 3: Create the `UserStatusHistory` entity**

```java
package com.techx.intervue.modules.user.entities;

import com.techx.intervue.modules.user.enums.UserStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** FR-072: one deactivate/reactivate. {@code changedBy} is null when the system (cron) did it. */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "user_status_history")
public class UserStatusHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Convert(converter = UserStatus.DbConverter.class)
    @Column(name = "from_status", nullable = false, length = 20)
    private UserStatus fromStatus;

    @Convert(converter = UserStatus.DbConverter.class)
    @Column(name = "to_status", nullable = false, length = 20)
    private UserStatus toStatus;

    @Column(length = 255)
    private String reason;

    private Instant until;

    @Column(name = "changed_by")
    private Long changedBy;

    @Column(name = "changed_at", insertable = false, updatable = false)
    private Instant changedAt;
}
```

- [ ] **Step 4: Create the repository and the writer**

```java
package com.techx.intervue.modules.user.repositories;

import com.techx.intervue.modules.user.entities.UserStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserStatusHistoryRepository extends JpaRepository<UserStatusHistory, Long> {}
```

```java
package com.techx.intervue.modules.user.services.impl;

import com.techx.intervue.modules.user.entities.UserStatusHistory;
import com.techx.intervue.modules.user.enums.UserStatus;
import com.techx.intervue.modules.user.repositories.UserStatusHistoryRepository;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** FR-072: the only place that writes user_status_history — mirrors OrderStatusHistoryWriter. */
@Component
@RequiredArgsConstructor
public class UserStatusHistoryWriter {

    private final UserStatusHistoryRepository repository;

    public void record(
            long userId, UserStatus from, UserStatus to, String reason, Instant until, Long changedBy) {
        UserStatusHistory row = new UserStatusHistory();
        row.setUserId(userId);
        row.setFromStatus(from);
        row.setToStatus(to);
        row.setReason(reason);
        row.setUntil(until);
        row.setChangedBy(changedBy);
        repository.save(row);
    }
}
```

- [ ] **Step 5: Create `DeactivationMessage`**

```java
package com.techx.intervue.modules.user.services.impl;

import com.techx.intervue.modules.user.entities.User;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

/**
 * FR-072: one wording for "why can't I sign in", read by both the login flow (UserService) and a
 * live session cut off mid-use (JwtAuthFilter) — so both say exactly the same thing.
 */
public final class DeactivationMessage {

    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");
    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private DeactivationMessage() {}

    public static String of(User user) {
        String reason =
                user.getDeactivationReason() == null ? "not specified" : user.getDeactivationReason();
        if (user.getDeactivatedUntil() == null) {
            return "Your account has been deactivated. Reason: "
                    + reason
                    + ". Please contact an administrator.";
        }
        return "Your account has been temporarily suspended until "
                + TIME.format(user.getDeactivatedUntil().atZone(ZONE))
                + ". Reason: "
                + reason
                + ".";
    }
}
```

- [ ] **Step 6: Add `reason`/`until` to the request record**

```java
package com.techx.intervue.modules.user.requests;

import jakarta.validation.constraints.NotBlank;
import java.time.Instant;

/**
 * {@code PATCH /admin/customers/{id}/status} — {@code "active"} or {@code "inactive"}. {@code reason} and
 * {@code until} only apply to {@code "inactive"} (required reason, optional expiry — null means permanent);
 * AdminCustomerService enforces this, not bean validation, since it is conditional on {@code status}.
 */
public record CustomerStatusRequest(@NotBlank String status, String reason, Instant until) {}
```

- [ ] **Step 7: Write the failing tests (extend `AdminCustomerServiceTest`)**

Replace the file's two `setStatus` calls that used the 2-arg form with the new 5-arg one, and add the new
behavior tests. Full replacement content:

```java
package com.techx.intervue.modules.user.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.techx.intervue.modules.report.services.impl.ReportFixture;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.exceptions.CustomerNotFoundException;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import com.techx.intervue.modules.user.requests.LoginRequest;
import com.techx.intervue.modules.user.resources.AdminCustomerResource;
import com.techx.intervue.modules.user.services.interfaces.AdminCustomerServiceInterface;
import com.techx.intervue.modules.user.services.interfaces.UserServiceInterface;
import com.techx.intervue.resources.PageResource;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Set;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * FR-072 on MySQL: deactivating a customer must block their next sign-in through the real {@code
 * UserService.authenticate}, cut off any live session immediately, record why, and must not touch
 * an already-`placed` order that stays `placed` after a temporary ban (permanent-ban cancellation
 * is Task 5's own tests).
 */
@SpringBootTest
class AdminCustomerServiceTest {

    private static final String PASSWORD = "Secret@123";

    @Autowired private AdminCustomerServiceInterface customers;
    @Autowired private UserServiceInterface users;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private UserSessionCache sessionCache;

    private ReportFixture fx;
    private long customerId;
    private long adminUserId;
    private String email;
    private long orderId;
    private long farmerUserId;

    @BeforeEach
    void setUp() {
        fx = new ReportFixture(jdbc);
        long category = fx.category();
        long market = fx.market("Market");
        customerId = fx.user("customer", "Locked customer", passwordEncoder.encode(PASSWORD));
        adminUserId = fx.user("admin", "Admin", "x");
        email =
                jdbc.queryForObject(
                        "SELECT email FROM users WHERE id = ?", String.class, customerId);
        farmerUserId = fx.user("farmer", "Farmer", "x");
        long farmer = fx.farmer(farmerUserId, "Stall", "approved");
        long product = fx.product(farmer, category, "Product", 10000);
        orderId = fx.order(customerId, farmer, market, "placed", 10000, LocalDate.of(2026, 10, 1));
        fx.item(orderId, product, 10000, 1);
    }

    @AfterEach
    void tearDown() {
        fx.cleanUp();
    }

    @Test
    void deactivatingACustomerBlocksTheirLoginWithTheReason() {
        assertThat(users.authenticate(new LoginRequest(email, PASSWORD, false, null))).isNotNull();

        AdminCustomerResource updated =
                customers.setStatus(customerId, "inactive", "No-shows repeatedly", null, adminUserId);

        assertThat(updated.status()).isEqualTo("inactive");
        assertThatThrownBy(() -> users.authenticate(new LoginRequest(email, PASSWORD, false, null)))
                .isInstanceOf(DisabledException.class)
                .hasMessageContaining("No-shows repeatedly")
                .hasMessageContaining("deactivated");

        customers.setStatus(customerId, "active", null, null, adminUserId);
        assertThat(users.authenticate(new LoginRequest(email, PASSWORD, false, null))).isNotNull();
    }

    @Test
    void temporaryBanMessageNamesTheReturnTime() {
        Instant until = Instant.now().plus(Duration.ofDays(3)).truncatedTo(ChronoUnit.SECONDS);

        customers.setStatus(customerId, "inactive", "Abusive messages", until, adminUserId);

        assertThatThrownBy(() -> users.authenticate(new LoginRequest(email, PASSWORD, false, null)))
                .hasMessageContaining("temporarily suspended")
                .hasMessageContaining("Abusive messages");
    }

    @Test
    void deactivatingCutsOffALiveSessionRightAway() {
        sessionCache.set(customerId, email, Set.of(RoleType.CUSTOMER), Duration.ofMinutes(15));
        assertThat(sessionCache.get(customerId)).isNotNull();

        customers.setStatus(customerId, "inactive", "Fake account", null, adminUserId);

        assertThat(sessionCache.get(customerId)).isNull();
    }

    @Test
    void deactivatingACustomerWithNoLiveSessionDoesNotThrow() {
        assertThat(sessionCache.get(customerId)).isNull();

        assertThat(customers.setStatus(customerId, "inactive", "Fake reviews", null, adminUserId).status())
                .isEqualTo("inactive");
    }

    @Test
    void reasonIsRequiredToDeactivate() {
        assertThatThrownBy(() -> customers.setStatus(customerId, "inactive", " ", null, adminUserId))
                .isInstanceOf(InvalidFieldException.class);
        assertThatThrownBy(() -> customers.setStatus(customerId, "inactive", null, null, adminUserId))
                .isInstanceOf(InvalidFieldException.class);
    }

    @Test
    void untilMustBeInTheFuture() {
        Instant past = Instant.now().minus(Duration.ofMinutes(1));

        assertThatThrownBy(() -> customers.setStatus(customerId, "inactive", "No-shows", past, adminUserId))
                .isInstanceOf(InvalidFieldException.class);
    }

    @Test
    void reactivatingClearsTheReasonAndExpiryEvenAfterAnEarlierBan() {
        customers.setStatus(
                customerId, "inactive", "Owner request", Instant.now().plusSeconds(3600), adminUserId);

        AdminCustomerResource reactivated = customers.setStatus(customerId, "active", null, null, adminUserId);

        assertThat(reactivated.status()).isEqualTo("active");
        String reason =
                jdbc.queryForObject(
                        "SELECT deactivation_reason FROM users WHERE id = ?", String.class, customerId);
        assertThat(reason).isNull();
        // A later, unrelated deactivation must not see the earlier ban's expiry.
        customers.setStatus(customerId, "inactive", "New violation", null, adminUserId);
        assertThatThrownBy(() -> users.authenticate(new LoginRequest(email, PASSWORD, false, null)))
                .hasMessageContaining("deactivated") // permanent wording, not "temporarily suspended"
                .hasMessageNotContaining("temporarily");
    }

    @Test
    void deactivatingTwiceInARowDoesNotThrow() {
        customers.setStatus(customerId, "inactive", "No-shows", null, adminUserId);

        assertThat(customers.setStatus(customerId, "inactive", "No-shows again", null, adminUserId).status())
                .isEqualTo("inactive");
    }

    @Test
    void temporaryBanLeavesOpenOrdersAlone() {
        customers.setStatus(
                customerId, "inactive", "Owner request", Instant.now().plusSeconds(3600), adminUserId);

        String status =
                jdbc.queryForObject(
                        "SELECT status FROM orders WHERE id = ?", String.class, orderId);
        assertThat(status).isEqualTo("placed");
    }

    @Test
    void everyStatusChangeIsRecordedInHistory() {
        customers.setStatus(customerId, "inactive", "No-shows", null, adminUserId);
        customers.setStatus(customerId, "active", null, null, adminUserId);

        Integer rows =
                jdbc.queryForObject(
                        "SELECT COUNT(*) FROM user_status_history WHERE user_id = ?",
                        Integer.class,
                        customerId);
        assertThat(rows).isEqualTo(2);
        String lastChangedBy =
                jdbc.queryForObject(
                        "SELECT changed_by FROM user_status_history WHERE user_id = ? ORDER BY id DESC LIMIT 1",
                        String.class,
                        customerId);
        assertThat(lastChangedBy).isEqualTo(String.valueOf(adminUserId));
    }

    @Test
    void listShowsStatusAndOrderCount() {
        customers.setStatus(customerId, "inactive", "No-shows", null, adminUserId);

        PageResource<AdminCustomerResource> page = customers.list("inactive", fx.tag, 1, 20);

        assertThat(page.items()).hasSize(1);
        AdminCustomerResource row = page.items().get(0);
        assertThat(row.userId()).isEqualTo(customerId);
        assertThat(row.orderCount()).isEqualTo(1);
        assertThat(row.status()).isEqualTo("inactive");
    }

    /** FR-072: {@code GET /admin/customers/{id}} — one customer, 404 for a non-customer account. */
    @Test
    void detailReturnsOneCustomerAndRefusesAStall() {
        assertThat(customers.detail(customerId).email()).isEqualTo(email);
        assertThatThrownBy(() -> customers.detail(farmerUserId))
                .isInstanceOf(CustomerNotFoundException.class);
    }

    @Test
    void statusChangeIsOnlyForCustomerAccounts() {
        long farmerUserId =
                jdbc.queryForObject(
                        "SELECT user_id FROM farmer_profiles WHERE stall_name = ?",
                        Long.class,
                        "Stall " + fx.tag);

        assertThatThrownBy(
                        () -> customers.setStatus(farmerUserId, "inactive", "No-shows", null, adminUserId))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                        () -> customers.setStatus(customerId, "suspended", "No-shows", null, adminUserId))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
```

- [ ] **Step 8: Run the tests to verify they fail**

Run: `docker compose exec backend ./mvnw test -Dtest=AdminCustomerServiceTest`
Expected: compile error — `setStatus(long, String)` does not accept 5 arguments; once the interface is
touched this becomes real assertion failures (message text, session, history table missing).

- [ ] **Step 9: Update the interface**

```java
package com.techx.intervue.modules.user.services.interfaces;

import com.techx.intervue.modules.user.resources.AdminCustomerResource;
import com.techx.intervue.resources.PageResource;
import java.time.Instant;

/** FR-072 — view, activate or deactivate customer accounts (contract §10). */
public interface AdminCustomerServiceInterface {

    /** {@code status} null = any; {@code query} matches name, email or phone. */
    PageResource<AdminCustomerResource> list(String status, String query, int page, int pageSize);

    /**
     * {@code "active"} | {@code "inactive"}; other values and non-customer accounts are a 400.
     * {@code reason} is required and {@code until} (nullable = permanent) must be in the future when
     * {@code status="inactive"}; both are ignored when reactivating. {@code actorId} is the admin doing
     * this, or {@code null} when the system (auto-reactivate) does it.
     */
    AdminCustomerResource setStatus(long userId, String status, String reason, Instant until, Long actorId);

    /** {@code GET /admin/customers/{id}} — 404 when the id is not a customer account. */
    AdminCustomerResource detail(long userId);
}
```

- [ ] **Step 10: Rewrite `AdminCustomerService.setStatus`**

```java
package com.techx.intervue.modules.user.services.impl;

import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.enums.UserStatus;
import com.techx.intervue.modules.user.exceptions.CustomerNotFoundException;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import com.techx.intervue.modules.user.repositories.AdminCustomerQueryRepository;
import com.techx.intervue.modules.user.repositories.UserRepository;
import com.techx.intervue.modules.user.resources.AdminCustomerResource;
import com.techx.intervue.modules.user.services.interfaces.AdminCustomerServiceInterface;
import com.techx.intervue.resources.PageResource;
import com.techx.intervue.services.interfaces.JobQueueInterface;
import java.time.Clock;
import java.time.Instant;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * FR-072. Deactivating sets {@code users.status = inactive}, stores the reason/expiry, revokes the
 * refresh token (DB) and the live Redis session (JwtAuthFilter rejects the access token on the very
 * next request), writes a {@code user_status_history} row, and — only for a permanent ban — cancels
 * the customer's open orders (Task 5). Reactivating (manual or the auto-reactivate cron, Task 4)
 * clears the reason/expiry and goes through this exact same method, so the two never diverge.
 */
@Service
@AllArgsConstructor
public class AdminCustomerService implements AdminCustomerServiceInterface {

    public static final String JOB_NOTIFY_DEACTIVATED = "customer.notify-deactivated";
    public static final String JOB_NOTIFY_REACTIVATED = "customer.notify-reactivated";

    private static final int MAX_PAGE_SIZE = 50;

    private final UserRepository userRepository;
    private final AdminCustomerQueryRepository queries;
    private final RefreshTokenService refreshTokens;
    private final UserSessionCache sessionCache;
    private final UserStatusHistoryWriter history;
    private final JobQueueInterface jobQueue;
    private final Clock clock;

    @Override
    @Transactional(readOnly = true)
    public PageResource<AdminCustomerResource> list(
            String status, String query, int page, int pageSize) {
        String dbStatus = status == null || status.isBlank() ? null : parseStatus(status).value();
        return queries.search(
                dbStatus, query, Math.max(1, page), Math.min(MAX_PAGE_SIZE, Math.max(1, pageSize)));
    }

    @Override
    @Transactional
    public AdminCustomerResource setStatus(
            long userId, String status, String reason, Instant until, Long actorId) {
        UserStatus target = parseStatus(status);
        User user = userRepository.findById(userId).orElseThrow(CustomerNotFoundException::new);
        if (user.getRole() != RoleType.CUSTOMER) {
            throw new IllegalArgumentException(
                    "Only customer accounts can be activated or deactivated here.");
        }
        UserStatus from = user.getStatus();

        if (target == UserStatus.INACTIVE) {
            deactivate(user, reason, until, actorId, from);
        } else {
            reactivate(user, actorId, from);
        }
        return queries.findOne(userId).orElseThrow(CustomerNotFoundException::new);
    }

    private void deactivate(User user, String reason, Instant until, Long actorId, UserStatus from) {
        if (reason == null || reason.isBlank()) {
            throw new InvalidFieldException("reason", "A reason is required to deactivate an account.");
        }
        if (until != null && !until.isAfter(Instant.now(clock))) {
            throw new InvalidFieldException("until", "The ban end time must be in the future.");
        }
        user.setStatus(UserStatus.INACTIVE);
        user.setDeactivationReason(reason);
        user.setDeactivatedUntil(until);
        userRepository.saveAndFlush(user);

        refreshTokens.revokeAllTokens(user.getId());
        sessionCache.revokeAll(user.getId());
        history.record(user.getId(), from, UserStatus.INACTIVE, reason, until, actorId);

        Map<String, String> payload = new HashMap<>();
        payload.put("email", user.getEmail());
        payload.put("fullName", user.getFullName());
        payload.put("reason", reason);
        payload.put("until", until == null ? "" : until.toString());
        jobQueue.enqueue(JOB_NOTIFY_DEACTIVATED, payload);
    }

    private void reactivate(User user, Long actorId, UserStatus from) {
        user.setStatus(UserStatus.ACTIVE);
        user.setDeactivationReason(null);
        user.setDeactivatedUntil(null);
        userRepository.saveAndFlush(user);

        history.record(user.getId(), from, UserStatus.ACTIVE, null, null, actorId);

        Map<String, String> payload = new HashMap<>();
        payload.put("email", user.getEmail());
        payload.put("fullName", user.getFullName());
        jobQueue.enqueue(JOB_NOTIFY_REACTIVATED, payload);
    }

    @Override
    @Transactional(readOnly = true)
    public AdminCustomerResource detail(long userId) {
        return queries.findOne(userId).orElseThrow(CustomerNotFoundException::new);
    }

    /** Only the two values of contract §10; {@code suspended} is not an admin action here. */
    private static UserStatus parseStatus(String status) {
        String s = status == null ? "" : status.trim().toLowerCase(Locale.ROOT);
        return switch (s) {
            case "active" -> UserStatus.ACTIVE;
            case "inactive" -> UserStatus.INACTIVE;
            default -> throw new IllegalArgumentException("status must be 'active' or 'inactive'.");
        };
    }
}
```

- [ ] **Step 11: Update `UserService.authenticate`'s login message**

Edit `backend/src/main/java/com/techx/intervue/modules/user/services/impl/UserService.java:192-195`:

```java
        if (user.getStatus() == UserStatus.INACTIVE) {
            throw new DisabledException(DeactivationMessage.of(user));
        }
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new DisabledException(
                    "Your account has been locked. Please contact an administrator.");
        }
```

- [ ] **Step 12: Wire the controller (actor id, reason, until)**

```java
    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResource<AdminCustomerResource>> setStatus(
            @PathVariable long id,
            @Valid @RequestBody CustomerStatusRequest request,
            @AuthenticationPrincipal CustomUserDetails admin) {
        AdminCustomerResource updated =
                customers.setStatus(
                        id, request.status(), request.reason(), request.until(), admin.getId());
        return ok(
                updated,
                "inactive".equals(updated.status())
                        ? "Account deactivated. They can no longer sign in."
                        : "Account active again.");
    }
```

Add the two new imports to `AdminCustomerController.java`:
`com.techx.intervue.modules.user.resources.CustomUserDetails` and
`org.springframework.security.core.annotation.AuthenticationPrincipal`.

- [ ] **Step 13: Run the tests to verify they pass**

Run: `docker compose exec backend ./mvnw test -Dtest=AdminCustomerServiceTest,UserServiceTest`
Expected: PASS, no other test in the module broken by the signature change (grep confirmed
`AdminCustomerServiceTest` is the only caller of `setStatus` outside production code).

- [ ] **Step 14: Commit**

```bash
git add backend/src/main/resources/db/migration/V20260928003__add_customer_deactivation_fields.sql \
  backend/src/main/java/com/techx/intervue/modules/user/entities/User.java \
  backend/src/main/java/com/techx/intervue/modules/user/entities/UserStatusHistory.java \
  backend/src/main/java/com/techx/intervue/modules/user/repositories/UserStatusHistoryRepository.java \
  backend/src/main/java/com/techx/intervue/modules/user/services/impl/UserStatusHistoryWriter.java \
  backend/src/main/java/com/techx/intervue/modules/user/services/impl/DeactivationMessage.java \
  backend/src/main/java/com/techx/intervue/modules/user/services/impl/AdminCustomerService.java \
  backend/src/main/java/com/techx/intervue/modules/user/services/impl/UserService.java \
  backend/src/main/java/com/techx/intervue/modules/user/services/interfaces/AdminCustomerServiceInterface.java \
  backend/src/main/java/com/techx/intervue/modules/user/requests/CustomerStatusRequest.java \
  backend/src/main/java/com/techx/intervue/modules/user/controllers/AdminCustomerController.java \
  backend/src/test/java/com/techx/intervue/modules/user/services/impl/AdminCustomerServiceTest.java
git commit -m "feat(FR-072): revoke sessions and record reason/expiry on deactivate"
```

---

### Task 2: `JwtAuthFilter` — `ACCOUNT_DEACTIVATED` error code

**Files:**
- Modify: `backend/src/main/java/com/techx/intervue/filters/JwtAuthFilter.java`
- Test: `backend/src/test/java/com/techx/intervue/filters/JwtAuthFilterTest.java`

**Interfaces:**
- Consumes: `DeactivationMessage.of(User)` (Task 1), `UserRepository.findById(Long): Optional<User>`
  (existing).
- Produces: HTTP 401 with `error.code = "ACCOUNT_DEACTIVATED"` instead of the generic `"UNAUTHORIZED"` when the
  session/token was rejected **and** the user's current `status` is `INACTIVE`.

- [ ] **Step 1: Write the failing test**

Add to `JwtAuthFilterTest.java`. First add the new mock field and stub it in `setUp` (the existing
`tokenIssuedBeforeRevokeAllIsRejected` test must keep meaning "revoked for a reason other than a ban", so give
it an explicit empty stub):

```java
    private UserRepository userRepository;
```

In `setUp()`, after `mfaService = mock(MfaServiceInterface.class);`:

```java
        userRepository = mock(UserRepository.class);
```

Change the `filter = new JwtAuthFilter(...)` call to pass `userRepository` as the last constructor argument
(Task 2 Step 3 below adds that parameter).

Change `tokenIssuedBeforeRevokeAllIsRejected` to stub the lookup explicitly:

```java
    @Test
    void tokenIssuedBeforeRevokeAllIsRejected() throws Exception {
        when(sessionCache.get(1L)).thenReturn(new SessionData("a@b.c", Set.of(RoleType.CUSTOMER)));
        when(sessionCache.isRevoked(1L, ISSUED_AT)).thenReturn(true);
        when(userRepository.findById(1L)).thenReturn(Optional.empty());

        filter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(response.getContentAsString()).contains("\"code\":\"UNAUTHORIZED\"");
        verify(chain, never()).doFilter(any(), any());
    }

    @Test
    void tokenIssuedBeforeRevokeAllReturnsAccountDeactivatedWhenTheUserIsBanned() throws Exception {
        when(sessionCache.get(1L)).thenReturn(new SessionData("a@b.c", Set.of(RoleType.CUSTOMER)));
        when(sessionCache.isRevoked(1L, ISSUED_AT)).thenReturn(true);
        User banned =
                User.builder()
                        .id(1L)
                        .status(UserStatus.INACTIVE)
                        .deactivationReason("No-shows")
                        .build();
        when(userRepository.findById(1L)).thenReturn(Optional.of(banned));

        filter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(response.getContentAsString())
                .contains("\"code\":\"ACCOUNT_DEACTIVATED\"")
                .contains("No-shows");
        verify(chain, never()).doFilter(any(), any());
    }
```

Add the imports: `com.techx.intervue.modules.user.entities.User`,
`com.techx.intervue.modules.user.enums.UserStatus`,
`com.techx.intervue.modules.user.repositories.UserRepository`, `java.util.Optional`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `docker compose exec backend ./mvnw test -Dtest=JwtAuthFilterTest`
Expected: compile error — `JwtAuthFilter` has no 6-argument constructor yet.

- [ ] **Step 3: Add the dependency and the deactivation-aware error branches**

In `JwtAuthFilter.java`, add the new imports:

```java
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.UserStatus;
import com.techx.intervue.modules.user.repositories.UserRepository;
import com.techx.intervue.modules.user.services.impl.DeactivationMessage;
import java.util.Optional;
```

Add the field (Lombok `@RequiredArgsConstructor` picks it up automatically — just declare the field, last so
the existing positional test-constructor calls only need one argument appended):

```java
    private final UserRepository userRepository;
```

Replace the two existing `writeErrorResponse(response, "Your session has expired.")` call sites (the
`session == null` branch and the `isRevoked` branch) with:

```java
                if (session == null) {
                    writeDeactivationAwareError(response, userId);
                    return;
                }

                // Token issued before the sign-out of all devices (password change / reset / ban)
                if (userSessionCache.isRevoked(userId, jwtService.extractIssuedAt(token))) {
                    writeDeactivationAwareError(response, userId);
                    return;
                }
```

Add the new private method (near `writeErrorResponse`):

```java
    /**
     * The session/token was rejected — usually just an expired or evicted session, but if the user is
     * currently INACTIVE it is a ban: say so with the real reason (FR-072) instead of the generic
     * message, so the FE can send the page home instead of retrying a refresh that can never succeed.
     */
    private void writeDeactivationAwareError(HttpServletResponse response, Long userId)
            throws IOException {
        Optional<User> banned =
                userId == null
                        ? Optional.empty()
                        : userRepository.findById(userId).filter(u -> u.getStatus() == UserStatus.INACTIVE);
        if (banned.isPresent()) {
            writeErrorResponse(
                    response,
                    HttpServletResponse.SC_UNAUTHORIZED,
                    "ACCOUNT_DEACTIVATED",
                    DeactivationMessage.of(banned.get()));
            return;
        }
        writeErrorResponse(response, "Your session has expired.");
    }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `docker compose exec backend ./mvnw test -Dtest=JwtAuthFilterTest`
Expected: PASS, all 8 tests (6 existing + 2 new).

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/techx/intervue/filters/JwtAuthFilter.java \
  backend/src/test/java/com/techx/intervue/filters/JwtAuthFilterTest.java
git commit -m "feat(FR-072): tell a live session it was deactivated, not just expired"
```

---

### Task 3: Deactivate/reactivate email jobs

**Files:**
- Create: `backend/src/main/java/com/techx/intervue/modules/user/services/impl/AccountDeactivatedNoticeJob.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/user/services/impl/AccountReactivatedNoticeJob.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/user/services/impl/AccountDeactivatedNoticeJobTest.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/user/services/impl/AccountReactivatedNoticeJobTest.java`

**Interfaces:**
- Consumes: `AdminCustomerService.JOB_NOTIFY_DEACTIVATED` / `JOB_NOTIFY_REACTIVATED` (Task 1), payload keys
  `email`, `fullName`, `reason`, `until` (deactivated only — `until` is `""` when permanent).
- Consumes (existing): `MailServiceInterface.sendHtml(String to, String subject, String html)`.
- Produces: two `@Component` beans implementing `JobHandler`, auto-picked up by `RedisJobWorker`'s
  `List<JobHandler>` injection — no manual registration needed.

- [ ] **Step 1: Write the failing tests**

```java
package com.techx.intervue.modules.user.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.techx.intervue.services.interfaces.MailServiceInterface;
import java.util.Map;
import org.junit.jupiter.api.Test;

class AccountDeactivatedNoticeJobTest {

    private final MailServiceInterface mail = mock(MailServiceInterface.class);
    private final AccountDeactivatedNoticeJob job = new AccountDeactivatedNoticeJob(mail);

    @Test
    void typeMatchesTheQueuedJobName() {
        assertThat(job.type()).isEqualTo(AdminCustomerService.JOB_NOTIFY_DEACTIVATED);
    }

    @Test
    void permanentBanEmailSaysPermanentlyAndNamesTheReason() {
        job.handle(
                Map.of(
                        "email", "a@b.c",
                        "fullName", "Jane Doe",
                        "reason", "Fake reviews",
                        "until", ""));

        verify(mail)
                .sendHtml(eq("a@b.c"), contains("deactivated"), contains("Fake reviews"));
        verify(mail).sendHtml(eq("a@b.c"), org.mockito.ArgumentMatchers.anyString(), contains("permanently"));
    }

    @Test
    void temporaryBanEmailNamesTheReturnTime() {
        job.handle(
                Map.of(
                        "email", "a@b.c",
                        "fullName", "Jane Doe",
                        "reason", "No-shows",
                        "until", "2026-10-05T09:00:00Z"));

        verify(mail)
                .sendHtml(eq("a@b.c"), org.mockito.ArgumentMatchers.anyString(), contains("No-shows"));
    }
}
```

```java
package com.techx.intervue.modules.user.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.techx.intervue.services.interfaces.MailServiceInterface;
import java.util.Map;
import org.junit.jupiter.api.Test;

class AccountReactivatedNoticeJobTest {

    private final MailServiceInterface mail = mock(MailServiceInterface.class);
    private final AccountReactivatedNoticeJob job = new AccountReactivatedNoticeJob(mail);

    @Test
    void typeMatchesTheQueuedJobName() {
        assertThat(job.type()).isEqualTo(AdminCustomerService.JOB_NOTIFY_REACTIVATED);
    }

    @Test
    void sendsAnActiveAgainEmail() {
        job.handle(Map.of("email", "a@b.c", "fullName", "Jane Doe"));

        verify(mail).sendHtml(eq("a@b.c"), contains("active"), org.mockito.ArgumentMatchers.anyString());
    }
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `docker compose exec backend ./mvnw test -Dtest=AccountDeactivatedNoticeJobTest,AccountReactivatedNoticeJobTest`
Expected: compile error — the two job classes do not exist yet.

- [ ] **Step 3: Implement the two jobs**

```java
package com.techx.intervue.modules.user.services.impl;

import com.techx.intervue.services.interfaces.JobHandler;
import com.techx.intervue.services.interfaces.MailServiceInterface;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Component;

/** FR-072 step: tell the customer their account was deactivated and why. */
@Component
@AllArgsConstructor
public class AccountDeactivatedNoticeJob implements JobHandler {

    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");
    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final MailServiceInterface mailService;

    @Override
    public String type() {
        return AdminCustomerService.JOB_NOTIFY_DEACTIVATED;
    }

    @Override
    public void handle(Map<String, String> payload) {
        String until = payload.get("until");
        String whenClause =
                until == null || until.isBlank()
                        ? "permanently"
                        : "until " + TIME.format(Instant.parse(until).atZone(ZONE));
        mailService.sendHtml(
                payload.get("email"),
                "Your MarketLink account has been deactivated",
                """
                <p>Dear %s,</p>
                <p>Your MarketLink account has been deactivated %s.</p>
                <p>Reason: %s</p>
                <p>You have been signed out on every device and cannot sign in while this is in effect.</p>
                <p>If you believe this is a mistake, please contact an administrator.</p>
                <p>MarketLink</p>
                """
                        .formatted(payload.get("fullName"), whenClause, payload.get("reason")));
    }
}
```

```java
package com.techx.intervue.modules.user.services.impl;

import com.techx.intervue.services.interfaces.JobHandler;
import com.techx.intervue.services.interfaces.MailServiceInterface;
import java.util.Map;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Component;

/** FR-072 step: tell the customer their account is active again (manual or auto-reactivate). */
@Component
@AllArgsConstructor
public class AccountReactivatedNoticeJob implements JobHandler {

    private final MailServiceInterface mailService;

    @Override
    public String type() {
        return AdminCustomerService.JOB_NOTIFY_REACTIVATED;
    }

    @Override
    public void handle(Map<String, String> payload) {
        mailService.sendHtml(
                payload.get("email"),
                "Your MarketLink account is active again",
                """
                <p>Dear %s,</p>
                <p>Your MarketLink account is active again — you can sign in and place orders right away.</p>
                <p>MarketLink</p>
                """
                        .formatted(payload.get("fullName")));
    }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `docker compose exec backend ./mvnw test -Dtest=AccountDeactivatedNoticeJobTest,AccountReactivatedNoticeJobTest`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/techx/intervue/modules/user/services/impl/AccountDeactivatedNoticeJob.java \
  backend/src/main/java/com/techx/intervue/modules/user/services/impl/AccountReactivatedNoticeJob.java \
  backend/src/test/java/com/techx/intervue/modules/user/services/impl/AccountDeactivatedNoticeJobTest.java \
  backend/src/test/java/com/techx/intervue/modules/user/services/impl/AccountReactivatedNoticeJobTest.java
git commit -m "feat(FR-072): email the customer on deactivate and reactivate"
```

---

### Task 4: Cron auto-reactivate expired temporary bans

**Files:**
- Create: `backend/src/main/java/com/techx/intervue/modules/user/services/impl/CustomerBanExpiryJob.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/user/repositories/UserRepository.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/user/services/impl/CustomerBanExpiryJobTest.java`

**Interfaces:**
- Consumes: `UserRepository.findByStatusAndDeactivatedUntilLessThanEqual(UserStatus, Instant): List<User>`
  (new), `AdminCustomerServiceInterface.setStatus` (Task 1) — called with `actorId = null`, which Task 1
  already records as "the system" and still enqueues the reactivate email (Task 3), so this job stays a thin
  scheduler with no duplicated business logic.

- [ ] **Step 1: Add the repository query**

Add to `UserRepository.java`:

```java
    List<User> findByStatusAndDeactivatedUntilLessThanEqual(UserStatus status, Instant now);
```

(add imports `java.time.Instant`, `java.util.List`, `com.techx.intervue.modules.user.enums.UserStatus` if not
already present in the file).

- [ ] **Step 2: Write the failing test**

```java
package com.techx.intervue.modules.user.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.UserStatus;
import com.techx.intervue.modules.user.repositories.UserRepository;
import com.techx.intervue.modules.user.services.interfaces.AdminCustomerServiceInterface;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.Test;

class CustomerBanExpiryJobTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final AdminCustomerServiceInterface customers = mock(AdminCustomerServiceInterface.class);
    private final Clock clock = Clock.fixed(Instant.parse("2026-10-05T09:00:00Z"), ZoneOffset.UTC);
    private final CustomerBanExpiryJob job = new CustomerBanExpiryJob(userRepository, customers, clock);

    @Test
    void reactivatesEveryUserWhoseBanExpired() {
        User expired = User.builder().id(7L).status(UserStatus.INACTIVE).build();
        when(userRepository.findByStatusAndDeactivatedUntilLessThanEqual(
                        eq(UserStatus.INACTIVE), eq(Instant.parse("2026-10-05T09:00:00Z"))))
                .thenReturn(List.of(expired));

        job.reactivateExpiredBans();

        verify(customers).setStatus(7L, "active", null, null, null);
    }

    @Test
    void doesNothingWhenNoBanHasExpired() {
        when(userRepository.findByStatusAndDeactivatedUntilLessThanEqual(any(), any()))
                .thenReturn(List.of());

        job.reactivateExpiredBans();

        verify(customers, never()).setStatus(anyLong(), any(), any(), any(), any());
    }
}
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `docker compose exec backend ./mvnw test -Dtest=CustomerBanExpiryJobTest`
Expected: compile error — `CustomerBanExpiryJob` does not exist.

- [ ] **Step 4: Implement the job**

```java
package com.techx.intervue.modules.user.services.impl;

import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.UserStatus;
import com.techx.intervue.modules.user.repositories.UserRepository;
import com.techx.intervue.modules.user.services.interfaces.AdminCustomerServiceInterface;
import java.time.Clock;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * FR-072: every minute, reactivates any customer whose temporary ban's {@code deactivated_until}
 * has passed. Goes through {@link AdminCustomerServiceInterface#setStatus} with {@code actorId =
 * null} — the exact same reactivate path a manual admin click takes (clears reason/expiry, writes
 * history, enqueues the "active again" email) — so this job never duplicates that logic.
 */
@Component
@RequiredArgsConstructor
public class CustomerBanExpiryJob {

    private final UserRepository userRepository;
    private final AdminCustomerServiceInterface customers;
    private final Clock clock;

    @Scheduled(fixedDelayString = "PT60S")
    public void reactivateExpiredBans() {
        for (User user :
                userRepository.findByStatusAndDeactivatedUntilLessThanEqual(
                        UserStatus.INACTIVE, Instant.now(clock))) {
            customers.setStatus(user.getId(), "active", null, null, null);
        }
    }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `docker compose exec backend ./mvnw test -Dtest=CustomerBanExpiryJobTest`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/techx/intervue/modules/user/services/impl/CustomerBanExpiryJob.java \
  backend/src/main/java/com/techx/intervue/modules/user/repositories/UserRepository.java \
  backend/src/test/java/com/techx/intervue/modules/user/services/impl/CustomerBanExpiryJobTest.java
git commit -m "feat(FR-072): auto-reactivate expired temporary bans every minute"
```

---

### Task 5: Auto-cancel open orders on a permanent ban

**Files:**
- Modify: `backend/src/main/java/com/techx/intervue/modules/order/repositories/OrderRepository.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/order/services/interfaces/OrderServiceInterface.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/order/services/impl/OrderService.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/notification/enums/NotificationKind.java`
- Modify: `backend/src/main/resources/i18n/notifications.properties` and all 9
  `backend/src/main/resources/i18n/notifications_*.properties`
- Modify: `backend/src/main/java/com/techx/intervue/modules/user/services/impl/AdminCustomerService.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/user/services/impl/AdminCustomerServiceTest.java`

**Interfaces:**
- Consumes: `OrderService.transition(Order, OrderStatus, Long, String)` (existing private single door),
  `notifyFarmer(Order, NotificationKind, Map)` (existing private helper).
- Produces: `OrderServiceInterface.cancelAllForDeactivatedCustomer(long customerId, Long adminActorId): void`.

- [ ] **Step 1: Write the failing test (extend `AdminCustomerServiceTest`)**

Add to the same test class as Task 1 (it already has `orderId` at status `placed`):

```java
    @Test
    void permanentBanCancelsOpenOrdersAndRestoresStock() {
        customers.setStatus(customerId, "inactive", "Fake account", null, adminUserId);

        String status =
                jdbc.queryForObject(
                        "SELECT status FROM orders WHERE id = ?", String.class, orderId);
        assertThat(status).isEqualTo("cancelled");
    }

    @Test
    void permanentBanLeavesAnotherCustomersOrdersAlone() {
        long otherCustomer = fx.user("customer", "Other customer", passwordEncoder.encode(PASSWORD));
        long farmer =
                jdbc.queryForObject(
                        "SELECT id FROM farmer_profiles WHERE stall_name = ?",
                        Long.class,
                        "Stall " + fx.tag);
        long otherOrder =
                fx.order(otherCustomer, farmer, fx.market("Second market"), "placed", 5000, LocalDate.of(2026, 10, 2));

        customers.setStatus(customerId, "inactive", "Fake account", null, adminUserId);

        String status =
                jdbc.queryForObject(
                        "SELECT status FROM orders WHERE id = ?", String.class, otherOrder);
        assertThat(status).isEqualTo("placed");
    }
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `docker compose exec backend ./mvnw test -Dtest=AdminCustomerServiceTest`
Expected: FAIL — order status stays `placed` (nothing cancels it yet).

- [ ] **Step 3: Add the repository query**

Add to `OrderRepository.java` (imports `java.util.Collection`, `java.util.List`):

```java
    List<Order> findByCustomerIdAndStatusIn(Long customerId, Collection<OrderStatus> statuses);
```

- [ ] **Step 4: Add the notification kind and its i18n text**

In `NotificationKind.java`, right after `ORDER_CANCELLED(NotificationCategory.ORDERS, true),`:

```java
    /** FR-072: an admin permanently deactivated the customer — distinct wording from ORDER_CANCELLED
     * so the Farmer is not told the customer cancelled it themselves. */
    ORDER_CANCELLED_ACCOUNT_DEACTIVATED(NotificationCategory.ORDERS, true),
```

Add to `backend/src/main/resources/i18n/notifications.properties`, right after the existing
`notification.order_cancelled.*` pair:

```properties
notification.order_cancelled_account_deactivated.title=An order was cancelled
notification.order_cancelled_account_deactivated.message=Order {order} was cancelled — the customer's account was deactivated.
```

Add the same two keys, translated, to each of the 9 other `notifications_*.properties` files (`vi zh ja ko fr
es de th id`) — Task 10 owns getting every other new/changed FE and BE-i18n string translated together in one
pass; for this task it is enough that the **default** `notifications.properties` (English) carries the key, so
the feature works end-to-end in English before translation.

- [ ] **Step 5: Add the interface method and implement it**

Add to `OrderServiceInterface.java` (near the other Farmer-facing methods):

```java
    /**
     * FR-072: an admin permanently deactivated this customer — cancel every order of theirs still
     * {@code placed}/{@code accepted} (D-02 restores stock through the same door every other
     * cancellation uses), and tell each Farmer why so they do not think the customer cancelled it.
     */
    void cancelAllForDeactivatedCustomer(long customerId, Long adminActorId);
```

Add the implementation to `OrderService.java`, near `cancel(...)`:

```java
    @Override
    @Transactional
    public void cancelAllForDeactivatedCustomer(long customerId, Long adminActorId) {
        List<Order> openOrders =
                orderRepository.findByCustomerIdAndStatusIn(
                        customerId, List.of(OrderStatus.PLACED, OrderStatus.ACCEPTED));
        for (Order summary : openOrders) {
            Order order = orderRepository.lockById(summary.getId()).orElseThrow();
            transition(
                    order,
                    OrderStatus.CANCELLED,
                    adminActorId,
                    "Cancelled: customer account permanently deactivated.");
            notifyFarmer(order, NotificationKind.ORDER_CANCELLED_ACCOUNT_DEACTIVATED, Map.of());
        }
    }
```

- [ ] **Step 6: Wire it into `AdminCustomerService.deactivate`**

Add the import `com.techx.intervue.modules.order.services.interfaces.OrderServiceInterface` and the
dependency in `AdminCustomerService.java`:

```java
    private final OrderServiceInterface orders;
```

At the end of the `deactivate(...)` method (after the `jobQueue.enqueue(JOB_NOTIFY_DEACTIVATED, payload);`
line):

```java
        if (until == null) {
            orders.cancelAllForDeactivatedCustomer(user.getId(), actorId);
        }
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `docker compose exec backend ./mvnw test -Dtest=AdminCustomerServiceTest`
Expected: PASS, including `temporaryBanLeavesOpenOrdersAlone` from Task 1 (still true — only `until == null`
cancels).

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/java/com/techx/intervue/modules/order/repositories/OrderRepository.java \
  backend/src/main/java/com/techx/intervue/modules/order/services/interfaces/OrderServiceInterface.java \
  backend/src/main/java/com/techx/intervue/modules/order/services/impl/OrderService.java \
  backend/src/main/java/com/techx/intervue/modules/notification/enums/NotificationKind.java \
  backend/src/main/resources/i18n/notifications.properties \
  backend/src/main/java/com/techx/intervue/modules/user/services/impl/AdminCustomerService.java \
  backend/src/test/java/com/techx/intervue/modules/user/services/impl/AdminCustomerServiceTest.java
git commit -m "feat(FR-072): cancel open orders when a customer is permanently deactivated"
```

---

### Task 6: `GET /admin/customers/{id}/status-history`

**Files:**
- Create: `backend/src/main/java/com/techx/intervue/modules/user/resources/AdminCustomerStatusHistoryResource.java`
- Create:
  `backend/src/main/java/com/techx/intervue/modules/user/repositories/AdminCustomerStatusHistoryQueryRepository.java`
- Modify:
  `backend/src/main/java/com/techx/intervue/modules/user/services/interfaces/AdminCustomerServiceInterface.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/user/services/impl/AdminCustomerService.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/user/controllers/AdminCustomerController.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/user/services/impl/AdminCustomerServiceTest.java`

**Interfaces:**
- Produces: `AdminCustomerServiceInterface.statusHistory(long userId, int page, int pageSize): PageResource<AdminCustomerStatusHistoryResource>`
  — 404 (`CustomerNotFoundException`) when `userId` is not a customer account, same as `detail`.

- [ ] **Step 1: Write the failing test**

Add to `AdminCustomerServiceTest.java`:

```java
    @Test
    void statusHistoryListsEveryChangeNewestFirstWithTheActorName() {
        customers.setStatus(customerId, "inactive", "No-shows", null, adminUserId);
        customers.setStatus(customerId, "active", null, null, adminUserId);

        PageResource<AdminCustomerStatusHistoryResource> page = customers.statusHistory(customerId, 1, 20);

        assertThat(page.items()).hasSize(2);
        assertThat(page.items().get(0).toStatus()).isEqualTo("active");
        assertThat(page.items().get(0).changedByName()).isEqualTo("Admin " + fx.tag);
        assertThat(page.items().get(1).toStatus()).isEqualTo("inactive");
        assertThat(page.items().get(1).reason()).isEqualTo("No-shows");
    }

    @Test
    void statusHistoryRefusesANonCustomerAccount() {
        assertThatThrownBy(() -> customers.statusHistory(farmerUserId, 1, 20))
                .isInstanceOf(CustomerNotFoundException.class);
    }
```

Add the import `com.techx.intervue.modules.user.resources.AdminCustomerStatusHistoryResource` and
`com.techx.intervue.resources.PageResource` (already imported) to the test file.

- [ ] **Step 2: Run the test to verify it fails**

Run: `docker compose exec backend ./mvnw test -Dtest=AdminCustomerServiceTest`
Expected: compile error — `statusHistory` does not exist on the interface.

- [ ] **Step 3: Create the resource and the query repository**

```java
package com.techx.intervue.modules.user.resources;

/** {@code GET /admin/customers/{id}/status-history} row — {@code changedByName} null = the system. */
public record AdminCustomerStatusHistoryResource(
        Long id,
        String fromStatus,
        String toStatus,
        String reason,
        String until,
        String changedByName,
        String changedAt) {}
```

```java
package com.techx.intervue.modules.user.repositories;

import com.techx.intervue.modules.user.resources.AdminCustomerStatusHistoryResource;
import com.techx.intervue.resources.PageResource;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/** FR-072: the deactivate/reactivate audit trail for one customer, newest first. */
@Repository
@RequiredArgsConstructor
public class AdminCustomerStatusHistoryQueryRepository {

    private static final String LIST_SQL =
            """
            SELECT h.id, h.from_status, h.to_status, h.reason, h.until, h.changed_at, a.full_name AS changed_by_name
            FROM user_status_history h
            LEFT JOIN users a ON a.id = h.changed_by
            WHERE h.user_id = :userId
            ORDER BY h.changed_at DESC, h.id DESC
            LIMIT :limit OFFSET :offset
            """;

    private static final String COUNT_SQL =
            "SELECT COUNT(*) FROM user_status_history WHERE user_id = :userId";

    private final NamedParameterJdbcTemplate jdbc;

    public PageResource<AdminCustomerStatusHistoryResource> search(long userId, int page, int pageSize) {
        MapSqlParameterSource params =
                new MapSqlParameterSource()
                        .addValue("userId", userId)
                        .addValue("limit", pageSize)
                        .addValue("offset", (page - 1) * pageSize);
        List<AdminCustomerStatusHistoryResource> items =
                jdbc.query(LIST_SQL, params, AdminCustomerStatusHistoryQueryRepository::map);
        Long total =
                jdbc.queryForObject(
                        COUNT_SQL, new MapSqlParameterSource("userId", userId), Long.class);
        return new PageResource<>(items, page, pageSize, total == null ? 0 : total);
    }

    private static AdminCustomerStatusHistoryResource map(ResultSet rs, int rowNum) throws SQLException {
        Timestamp until = rs.getTimestamp("until");
        return new AdminCustomerStatusHistoryResource(
                rs.getLong("id"),
                rs.getString("from_status"),
                rs.getString("to_status"),
                rs.getString("reason"),
                until == null ? null : until.toInstant().toString(),
                rs.getString("changed_by_name"),
                rs.getTimestamp("changed_at").toInstant().toString());
    }
}
```

- [ ] **Step 4: Add the interface method and the service implementation**

Add the import `com.techx.intervue.modules.user.resources.AdminCustomerStatusHistoryResource` and the method
to `AdminCustomerServiceInterface.java`:

```java
    /** {@code GET /admin/customers/{id}/status-history} — 404 when the id is not a customer account. */
    PageResource<AdminCustomerStatusHistoryResource> statusHistory(long userId, int page, int pageSize);
```

Add to `AdminCustomerService.java` the imports
`com.techx.intervue.modules.user.repositories.AdminCustomerStatusHistoryQueryRepository` and
`com.techx.intervue.modules.user.resources.AdminCustomerStatusHistoryResource`, and the new field:

```java
    private final AdminCustomerStatusHistoryQueryRepository statusHistoryQueries;
```

```java
    @Override
    @Transactional(readOnly = true)
    public PageResource<AdminCustomerStatusHistoryResource> statusHistory(
            long userId, int page, int pageSize) {
        detail(userId); // 404s for a missing or non-customer id, same rule as every other endpoint here
        return statusHistoryQueries.search(
                userId, Math.max(1, page), Math.min(MAX_PAGE_SIZE, Math.max(1, pageSize)));
    }
```

- [ ] **Step 5: Add the controller endpoint**

Add to `AdminCustomerController.java`:

```java
    @GetMapping("/{id}/status-history")
    public ResponseEntity<ApiResource<PageResource<AdminCustomerStatusHistoryResource>>> statusHistory(
            @PathVariable long id,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize) {
        return ok(customers.statusHistory(id, page, pageSize), "Account history loaded.");
    }
```

Add the import `com.techx.intervue.modules.user.resources.AdminCustomerStatusHistoryResource`.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `docker compose exec backend ./mvnw test -Dtest=AdminCustomerServiceTest`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/techx/intervue/modules/user/resources/AdminCustomerStatusHistoryResource.java \
  backend/src/main/java/com/techx/intervue/modules/user/repositories/AdminCustomerStatusHistoryQueryRepository.java \
  backend/src/main/java/com/techx/intervue/modules/user/services/interfaces/AdminCustomerServiceInterface.java \
  backend/src/main/java/com/techx/intervue/modules/user/services/impl/AdminCustomerService.java \
  backend/src/main/java/com/techx/intervue/modules/user/controllers/AdminCustomerController.java \
  backend/src/test/java/com/techx/intervue/modules/user/services/impl/AdminCustomerServiceTest.java
git commit -m "feat(FR-072): add the customer deactivate/reactivate audit trail endpoint"
```

---

### Task 7: Frontend — `ACCOUNT_DEACTIVATED` redirects to Home with a toast

**Files:**
- Modify: `frontend/src/utils/axiosInstance.ts`

**Interfaces:**
- Consumes: the `ACCOUNT_DEACTIVATED` error code (Task 2), `error.response.data.error.message` (the server's
  full sentence from `DeactivationMessage.of`).
- Produces: on that code, the interceptor clears the session, shows an error toast with the server's message,
  and hard-navigates to `/` — distinct from every other 401 path, which still goes through the existing
  refresh → `RequireAuth`-redirects-to-`/login` flow untouched.

**No new dependency**: `axios-mock-adapter` is not in `frontend/package.json` and this task does not add it.
`watchForMaintenanceMode` (the existing sibling interceptor in this same file) is already written as a plain
`(error: unknown) => Promise<never>` function with no HTTP layer involved — `watchForAccountDeactivated`
follows the exact same shape, so it is tested the same way: call it directly with a constructed `AxiosError`.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/utils/axiosInstance.test.ts` (no existing test file for this module):

```typescript
import { AxiosError } from 'axios';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { watchForAccountDeactivated } from './axiosInstance';
import Session from './session';
import Notification from './notification';

describe('watchForAccountDeactivated', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    Session.clear();
  });

  it('clears the session, toasts the server message, and redirects home', async () => {
    Session.save({ accessToken: 'stale-token', user: { id: 1 } as never }, false);
    const toastSpy = vi.spyOn(Notification, 'error').mockImplementation(() => {});
    const assignSpy = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign: assignSpy });
    const error = new AxiosError('Unauthorized');
    error.response = {
      status: 401,
      statusText: 'Unauthorized',
      headers: {},
      config: {} as never,
      data: {
        error: {
          code: 'ACCOUNT_DEACTIVATED',
          message: 'Your account has been deactivated. Reason: No-shows.',
        },
      },
    };

    await expect(watchForAccountDeactivated(error)).rejects.toBe(error);

    expect(Session.getAccessToken()).toBeNull();
    expect(toastSpy).toHaveBeenCalledWith({ text: 'Your account has been deactivated. Reason: No-shows.' });
    expect(assignSpy).toHaveBeenCalledWith('/');
  });

  it('leaves every other error alone', async () => {
    Session.save({ accessToken: 'still-valid', user: { id: 1 } as never }, false);
    const toastSpy = vi.spyOn(Notification, 'error').mockImplementation(() => {});
    const error = new AxiosError('Server error');
    error.response = {
      status: 500,
      statusText: 'Internal Server Error',
      headers: {},
      config: {} as never,
      data: {},
    };

    await expect(watchForAccountDeactivated(error)).rejects.toBe(error);

    expect(toastSpy).not.toHaveBeenCalled();
    expect(Session.getAccessToken()).toBe('still-valid');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/utils/axiosInstance.test.ts`
Expected: FAIL — `watchForAccountDeactivated` is not exported (does not exist yet).

- [ ] **Step 3: Add and export the `ACCOUNT_DEACTIVATED` branch**

Edit `axiosInstance.ts` — add right after the `watchForMaintenanceMode` interceptor (same file, same pattern),
exported so the test can call it directly:

```typescript
/**
 * FR-072: an already-open session gets 401'd the moment an admin deactivates that account (JwtAuthFilter
 * rejects the token right away, see ACCOUNT_DEACTIVATED). Unlike every other 401 — which retries through
 * /auth/refresh and, if that also fails, lets RequireAuth send the page to /login — this one is final: no
 * retry will ever succeed, so go straight to Home with the server's own reason in a toast.
 */
export const watchForAccountDeactivated = (error: unknown) => {
  if (error instanceof AxiosError && error.response?.data?.error?.code === 'ACCOUNT_DEACTIVATED') {
    Session.clear();
    Notification.error({ text: error.response.data.error.message });
    window.location.assign('/');
  }
  return Promise.reject(error);
};

publicApi.interceptors.response.use((res) => res, watchForAccountDeactivated);
privateApi.interceptors.response.use((res) => res, watchForAccountDeactivated);
```

Add the import `Notification` (`@/utils/notification`, matching the pattern already used in
`CustomerDetail/index.tsx`) at the top of the file, next to the existing `Session` import.

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/utils/axiosInstance.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/utils/axiosInstance.ts frontend/src/utils/axiosInstance.test.ts
git commit -m "feat(FR-072): send a deactivated session home with the reason, not to login"
```

---

### Task 8: Frontend — required reason + ban duration in both dialogs

**Files:**
- Create: `frontend/src/components/BanDurationPicker.tsx`
- Modify: `frontend/src/api-requests/report.requests.ts`
- Modify: `frontend/src/pages/admin/Customers/index.tsx`
- Modify: `frontend/src/pages/admin/CustomerDetail/index.tsx`
- Modify: `frontend/src/locales/en/AdminCustomers.json`, `frontend/src/locales/en/AdminCustomerDetail.json`

**Interfaces:**
- Produces: `BanDurationPicker` — `{ value: BanDuration; onChange: (v: BanDuration) => void }` where
  `type BanDuration = { kind: 'permanent' } | { kind: 'temporary'; until: string }` (`until` an ISO datetime
  string, always in the future by construction of the control).
- Consumes: `ReasonPicker` (existing, now used with `required`), `composeReason` (existing).
- Produces: `AdminReportApi.setCustomerStatus(userId, status, reason, until)` — `until: string | null`.

- [ ] **Step 1: Write the failing test for `BanDurationPicker`**

Create `frontend/src/components/BanDurationPicker.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BanDurationPicker, { type BanDuration } from './BanDurationPicker';

describe('BanDurationPicker', () => {
  it('starts permanent and switches to temporary with a future default', () => {
    const onChange = vi.fn();
    render(<BanDurationPicker value={{ kind: 'permanent' }} onChange={onChange} />);

    fireEvent.click(screen.getByRole('radio', { name: /temporary/i }));

    const [[next]] = onChange.mock.calls as [BanDuration][];
    expect(next.kind).toBe('temporary');
    if (next.kind === 'temporary') {
      expect(new Date(next.until).getTime()).toBeGreaterThan(Date.now());
    }
  });

  it('quick-duration buttons compute an absolute future timestamp', () => {
    const onChange = vi.fn();
    render(<BanDurationPicker value={{ kind: 'temporary', until: new Date().toISOString() }} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: /7 days/i }));

    const [[next]] = onChange.mock.calls as [BanDuration][];
    expect(next.kind).toBe('temporary');
    if (next.kind === 'temporary') {
      const days = (new Date(next.until).getTime() - Date.now()) / 86_400_000;
      expect(days).toBeGreaterThan(6.9);
      expect(days).toBeLessThan(7.1);
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/components/BanDurationPicker.test.tsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `BanDurationPicker`**

```tsx
import { useTranslation } from 'react-i18next';
import { Field } from '@/components/ui/input';

export type BanDuration = { kind: 'permanent' } | { kind: 'temporary'; until: string };

type BanDurationPickerProps = {
  value: BanDuration;
  onChange: (next: BanDuration) => void;
};

const QUICK_DAYS = [1, 3, 7, 30] as const;

const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

/**
 * FR-072: permanent vs. temporary deactivation. Temporary starts from a sensible 7-day default the
 * moment it is selected (never an invalid past value), with quick-pick day buttons plus a free
 * datetime field for an exact end time.
 */
export default function BanDurationPicker({ value, onChange }: BanDurationPickerProps) {
  const { t } = useTranslation();
  const isTemporary = value.kind === 'temporary';

  return (
    <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
      <legend className="text-small text-ink mb-1 p-0 font-bold">{t('banDuration.label')}</legend>
      <div role="radiogroup" className="flex gap-4">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            role="radio"
            name="ban-duration-kind"
            checked={!isTemporary}
            onChange={() => onChange({ kind: 'permanent' })}
          />
          {t('banDuration.permanent')}
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            role="radio"
            name="ban-duration-kind"
            checked={isTemporary}
            onChange={() => onChange({ kind: 'temporary', until: inDays(7) })}
          />
          {t('banDuration.temporary')}
        </label>
      </div>
      {isTemporary && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            {QUICK_DAYS.map((days) => (
              <button
                key={days}
                type="button"
                className="ml-chip"
                onClick={() => onChange({ kind: 'temporary', until: inDays(days) })}
              >
                {t('banDuration.days', { count: days })}
              </button>
            ))}
          </div>
          <Field
            id="ban-until"
            type="datetime-local"
            label={t('banDuration.specificTime')}
            min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
            value={value.until.slice(0, 16)}
            onChange={(e) => onChange({ kind: 'temporary', until: new Date(e.target.value).toISOString() })}
          />
        </div>
      )}
    </fieldset>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/components/BanDurationPicker.test.tsx`
Expected: PASS.

- [ ] **Step 5: Update the API client**

Edit `frontend/src/api-requests/report.requests.ts` — replace the `setCustomerStatus` method:

```typescript
  static setCustomerStatus = async (
    userId: number,
    status: 'active' | 'inactive',
    reason: string | null = null,
    until: string | null = null,
  ) => {
    const response = await privateApi.patch<ApiResponse<AdminCustomerDto>>(`/admin/customers/${userId}/status`, {
      status,
      reason,
      until,
    });
    return response.data.data;
  };

  static customerStatusHistory = async (userId: number, page = 1, pageSize = 20) => {
    const response = await privateApi.get<ApiResponse<PageType<AdminCustomerStatusHistoryDto>>>(
      `/admin/customers/${userId}/status-history`,
      { params: { page, pageSize } },
    );
    return response.data.data;
  };
```

Add the type, next to `AdminCustomerDto`:

```typescript
export type AdminCustomerStatusHistoryDto = {
  id: number;
  fromStatus: string;
  toStatus: string;
  reason: string | null;
  until: string | null;
  changedByName: string | null;
  changedAt: string;
};
```

- [ ] **Step 6: Wire the dialog in `Customers/index.tsx`**

In the component, add ban-duration state next to the existing `reason` state:

```typescript
  const [duration, setDuration] = useState<BanDuration>({ kind: 'permanent' });
```

Reset it alongside `reason` wherever the dialog opens (same place `setReason(emptyReason)` is called).

Replace the confirm handler's status-setting call:

```typescript
      const trimmedReason = composeReason('deactivate', reason);
      const until = confirmAction === 'deactivate' && duration.kind === 'temporary' ? duration.until : null;
      const updated = await AdminReportApi.setCustomerStatus(
        row.userId,
        confirmAction === 'deactivate' ? 'inactive' : 'active',
        confirmAction === 'deactivate' ? trimmedReason : null,
        until,
      );
```

In the dialog body, make `ReasonPicker` required and drop the `reasonHint` line that claims nothing is saved:

```tsx
          {confirmAction === 'deactivate' && (
            <>
              <BanDurationPicker value={duration} onChange={setDuration} />
              <ReasonPicker
                id="deactivate-reason"
                kind="deactivate"
                label={t('deactivate.reason')}
                value={reason}
                onChange={setReason}
                required
                error={!composeReason('deactivate', reason) ? t('deactivate.reasonRequired') : undefined}
              />
            </>
          )}
```

Disable the confirm button while the reason is empty (add to its existing `disabled` expression):
`|| (confirmAction === 'deactivate' && !composeReason('deactivate', reason))`.

Import `BanDurationPicker` and its `BanDuration` type at the top of the file.

- [ ] **Step 7: Mirror the same wiring in `CustomerDetail/index.tsx`**

Add the duration state next to the existing `reason` state (`AdminCustomerDetailPage`):

```typescript
  const [duration, setDuration] = useState<BanDuration>({ kind: 'permanent' });
```

In `openConfirm`, reset it alongside `reason`:

```typescript
  const openConfirm = (kind: ConfirmKind) => {
    setReason(emptyReason());
    setDuration({ kind: 'permanent' });
    setConfirmKind(kind);
  };
```

In `runConfirmedAction`, replace the status-setting call:

```typescript
    const status = confirmKind === 'deactivate' ? 'inactive' : 'active';
    const trimmedReason = composeReason('deactivate', reason);
    const until = confirmKind === 'deactivate' && duration.kind === 'temporary' ? duration.until : null;
    setBusy(true);
    try {
      const updated = await AdminReportApi.setCustomerStatus(
        customer.userId,
        status,
        confirmKind === 'deactivate' ? trimmedReason : null,
        until,
      );
```

In the dialog body, add `BanDurationPicker` above `ReasonPicker` and make `ReasonPicker` required, dropping the
`reasonHint` line:

```tsx
          {confirmKind === 'deactivate' && (
            <div className="flex flex-col gap-3">
              <BanDurationPicker value={duration} onChange={setDuration} />
              <ReasonPicker
                id="deactivate-reason"
                kind="deactivate"
                label={t('deactivate.reason')}
                value={reason}
                onChange={setReason}
                required
                error={!composeReason('deactivate', reason) ? t('deactivate.reasonRequired') : undefined}
              />
            </div>
          )}
```

Disable the confirm button while the reason is empty (add to its existing `disabled` expression):
`|| (confirmKind === 'deactivate' && !composeReason('deactivate', reason))`.

Import `BanDurationPicker` and its `BanDuration` type at the top of the file.

- [ ] **Step 8: Update the EN locale copy**

In `frontend/src/locales/en/common.json`, add:

```json
  "banDuration": {
    "label": "Duration",
    "permanent": "Permanent",
    "temporary": "Temporary",
    "days_one": "{{count}} day",
    "days_other": "{{count}} days",
    "specificTime": "Or pick an exact end time"
  },
```

In both `frontend/src/locales/en/AdminCustomers.json` and `frontend/src/locales/en/AdminCustomerDetail.json`,
replace the two stale lines and add the required-error string:

```json
    "reason": "Reason",
    "reasonRequired": "Choose at least one reason or add a note.",
```

(removes `"reasonHint": "The server does not store a reason yet..."` — now false).

- [ ] **Step 9: Manual verification**

Run: `make up` then open `/admin/customers`, deactivate a customer with Temporary + 3 days + a reason, confirm
the request body in devtools carries `reason` and a future `until`; confirm the button is disabled with no
reason picked.

- [ ] **Step 10: Commit**

```bash
git add frontend/src/components/BanDurationPicker.tsx frontend/src/components/BanDurationPicker.test.tsx \
  frontend/src/api-requests/report.requests.ts \
  frontend/src/pages/admin/Customers/index.tsx frontend/src/pages/admin/CustomerDetail/index.tsx \
  frontend/src/locales/en/common.json frontend/src/locales/en/AdminCustomers.json \
  frontend/src/locales/en/AdminCustomerDetail.json
git commit -m "feat(FR-072): require a reason and offer permanent/temporary duration"
```

---

### Task 9: Frontend — "Account history" section on Customer Detail

**Files:**
- Modify: `frontend/src/pages/admin/CustomerDetail/index.tsx`
- Modify: `frontend/src/locales/en/AdminCustomerDetail.json`

**Interfaces:**
- Consumes: `AdminReportApi.customerStatusHistory` (Task 8), `useRequest` (existing hook), `Table` (existing
  component).

- [ ] **Step 1: Add the data load**

In `AdminCustomerDetailPage`, next to the existing `reviewsLoad`:

```typescript
  const { state: historyLoad, retry: retryHistory } = useRequest(`admin-customer-history:${id}`, () =>
    Number.isFinite(id) ? AdminReportApi.customerStatusHistory(id, 1, 20) : Promise.reject(new Error('n/a')),
  );
```

- [ ] **Step 2: Render the section (4 states)**

Add a new `<section>` in the left column, after the reviews section:

```tsx
          <section className="flex flex-col gap-3">
            <h2 className="text-h2">{t('history.title')}</h2>
            {historyLoad.kind === 'loading' ? (
              <div className="border-line-strong bg-surface-raised min-h-[140px] w-full animate-pulse rounded-md border-[1.5px] p-6" />
            ) : historyLoad.kind === 'error' ? (
              <LoadError noun={t('history.noun')} onRetry={retryHistory} />
            ) : historyLoad.data.items.length ? (
              <Table
                columns={[
                  {
                    key: 'when',
                    label: t('history.col.when'),
                    render: (h) => formatDate(new Date(h.changedAt)),
                  },
                  {
                    key: 'action',
                    label: t('history.col.action'),
                    render: (h) => t(`history.action.${h.toStatus}`),
                  },
                  { key: 'reason', label: t('history.col.reason'), render: (h) => h.reason ?? '—' },
                  {
                    key: 'until',
                    label: t('history.col.until'),
                    render: (h) => (h.until ? formatDate(new Date(h.until)) : '—'),
                  },
                  {
                    key: 'by',
                    label: t('history.col.by'),
                    render: (h) => h.changedByName ?? t('history.system'),
                  },
                ]}
                rows={historyLoad.data.items}
              />
            ) : (
              <DataState
                center
                title={t('history.empty.title')}
                text={t('history.empty.text')}
                className="w-full max-w-none min-h-[140px] py-6"
              />
            )}
          </section>
```

- [ ] **Step 3: Add the EN locale keys**

In `frontend/src/locales/en/AdminCustomerDetail.json`, add:

```json
  "history": {
    "title": "Account history",
    "noun": "account history",
    "system": "System (auto)",
    "col": {
      "when": "When",
      "action": "Action",
      "reason": "Reason",
      "until": "Until",
      "by": "By"
    },
    "action": {
      "active": "Reactivated",
      "inactive": "Deactivated"
    },
    "empty": {
      "title": "No history yet",
      "text": "Every deactivate or reactivate on this account will show up here."
    }
  },
```

- [ ] **Step 4: Manual verification**

Run: `make up`, open a customer detail page, deactivate then reactivate, refresh, confirm both rows appear
newest-first with the right reason/duration/actor; confirm the section's empty state on a customer never
touched.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/admin/CustomerDetail/index.tsx frontend/src/locales/en/AdminCustomerDetail.json
git commit -m "feat(FR-072): show the deactivate/reactivate history on Customer Detail"
```

---

### Task 10: Translate every new/changed string to the other 9 languages

**Files:**
- Modify: `frontend/src/locales/{vi,zh,ja,ko,fr,es,de,th,id}/common.json`
- Modify: `frontend/src/locales/{vi,zh,ja,ko,fr,es,de,th,id}/AdminCustomers.json`
- Modify: `frontend/src/locales/{vi,zh,ja,ko,fr,es,de,th,id}/AdminCustomerDetail.json`
- Modify: `backend/src/main/resources/i18n/notifications_{vi,zh,ja,ko,fr,es,de,th,id}.properties`

**Interfaces:** none — pure content, no code.

- [ ] **Step 1: Diff the EN files against each target locale**

For each of the 9 languages, `common.json`/`AdminCustomers.json`/`AdminCustomerDetail.json` need the exact same
new keys Task 8/9 added to the EN files: `banDuration.*` (in `common.json`), `reason`/`reasonRequired`
replacing the old `reasonHint` line (in both `AdminCustomers.json` and `AdminCustomerDetail.json`), and the
whole `history.*` block (in `AdminCustomerDetail.json` only). Copy each EN value and translate it — keep every
`{{placeholder}}` token and the `_one`/`_other` plural-key suffix pattern already used elsewhere in each
locale file (per `frontend/CLAUDE.md`, a missing key silently falls back to English rather than breaking the
page, so do this language by language and verify with Step 2 after each one rather than all at once).

- [ ] **Step 2: Verify no key is missing**

Run: `cd frontend && npm run lint` (the project's i18n key-parity check, if configured as a lint rule) —
otherwise run: `cd frontend && npm run build` and watch for any runtime warning about a missing translation key
printed to the console during `npm run dev` on each language via Settings → Language.

- [ ] **Step 3: Translate the two new notification properties keys**

For each of the 9 `notifications_*.properties` files, add (translated, matching that file's existing style for
`notification.order_cancelled.*`):

```properties
notification.order_cancelled_account_deactivated.title=<translated "An order was cancelled">
notification.order_cancelled_account_deactivated.message=<translated "Order {order} was cancelled — the customer's account was deactivated.">
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/locales frontend/src/locales/*/common.json frontend/src/locales/*/AdminCustomers.json \
  frontend/src/locales/*/AdminCustomerDetail.json backend/src/main/resources/i18n/notifications_*.properties
git commit -m "i18n(FR-072): translate the ban-duration and account-history strings"
```

---

## Post-plan: flag to LEAD/QA (not a task — do not implement)

After all 10 tasks land, tell the user to raise two things with LEAD/QA per R-02/R-07:

1. `docs/api-contract.md` needs the `reason`/`until` fields on `PATCH .../status` and the new
   `GET .../status-history` endpoint documented.
2. `.ai/REQUIREMENTS.md`'s FR-072 currently only says "view, activate, deactivate" — ban duration, the email,
   and the audit log go beyond that MUST line and should be added so the requirement matches what shipped.
