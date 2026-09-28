# Farmer Suspension Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make "Admin suspends a Farmer" behave the way D-09 says — panel locked down to orders only — and add a
suspension duration, a branded email, an immediate dialog, and an audit trail.

**Architecture:** The suspend/reinstate pair in `FarmerService` gains a `until` expiry, a history row, a Redis
session revoke and an email job — mirroring FR-072's `AdminCustomerService.setStatus`. The approval check that
is currently copy-pasted into five services is replaced by one shared guard that throws a *distinct* exception
for "suspended" (carrying the admin's reason) versus "not yet approved", so the frontend can tell a banned
stall from a pending one. A cron reinstates expired suspensions through the same `reinstate()` an admin click
takes. `users.role` is deliberately **not** touched — see the spec's §2.

**Tech Stack:** Spring Boot 4.1 / Java 25 / MySQL 8 / Redis / Flyway; React 19 / TypeScript / Tailwind 4. No
new libraries.

**Spec:** `docs/superpowers/specs/2026-09-28-farmer-suspension-hardening-design.md`

## Global Constraints

- R-04: bound parameters only — never string-concatenate SQL.
- R-09: all code comments in English. R-10: commit subjects English, `<type>(FR-071): …`, ≤ 70 chars.
- Migration `V20260928004__add_farmer_suspension_fields.sql`; never edit a merged migration. FKs to `users` /
  `farmer_profiles` are `BIGINT UNSIGNED`.
- FR-084: every new data screen has loading / empty / error / data.
- **D-09 is binding and must not be relitigated**: a suspended Farmer still signs in, still sees and completes
  orders already accepted, and their products stay hidden from the public. Never block `FarmerOrderController`.
- `users.role` stays `farmer` for a suspended stall. Any task that changes it is out of scope.
- Reason is required (already enforced by `SuspendFarmerRequest`'s `@NotBlank` + `@Size(max = 255)`); `until`,
  when present, must be strictly in the future — validated server-side regardless of the client.

## Review Focus

- Suspending a Farmer who has no live Redis session (never signed in, or it expired) — `revokeAll` must be a
  safe no-op, not throw. (Task 2)
- `until` in the past or exactly now, sent straight to the API bypassing the picker — must be a 400, not a 500.
  (Task 2)
- Reinstating must clear `suspended_until` as well as the reason, so a later unrelated suspension never
  inherits a stale expiry. (Task 2)
- A suspended Farmer must still be able to accept / mark ready / complete an order that was already placed —
  the one thing D-09 guarantees. A guard added too broadly breaks it. (Task 3)
- `GET /admin/farmers/{id}/status-history` for an id that is not a farmer, or does not exist, must 404 like the
  rest of that controller — not return an empty page. (Task 6)

---

## File Structure

**Backend — create:** `entities/FarmerStatusHistory.java`, `repositories/FarmerStatusHistoryRepository.java`,
`services/impl/FarmerStatusHistoryWriter.java`, `services/impl/StallSuspensionMessage.java`,
`exceptions/StallSuspendedException.java` (in `modules/stall/exceptions`, beside `StallNotApprovedException`),
`services/impl/StallStatusMail.java`, `services/impl/StallSuspendedNoticeJob.java`,
`services/impl/StallReinstatedNoticeJob.java`, `FarmerSuspensionExpiryJob.java`,
`repositories/AdminFarmerStatusHistoryQueryRepository.java`,
`resources/AdminFarmerStatusHistoryResource.java`, `resources/mail/stall-suspended.{html,txt}`,
`resources/mail/stall-reinstated.{html,txt}`, migration.

**Backend — modify:** `FarmerProfile.java`, `SuspendFarmerRequest.java`, `FarmerService.java` +
`FarmerServiceInterface.java`, `AdminFarmerController.java`, `FarmerExceptionHandler.java`,
`ProductExceptionHandler.java`, `StallExceptionHandler.java`, the five services holding `requireApproved`
(`ProductService`, `StallService`, `SlotService`, `StockTemplateService`, `FarmerDailyStockService`),
`FarmerProductController`+service read paths, `FarmerReportController`, `i18n/mail*.properties`.

**Frontend — create:** `components/StallSuspendedDialog.tsx` (+ test).
**Frontend — modify:** `utils/axiosInstance.ts`, `utils/accountDeactivatedNotice.ts` (generalise),
`layout/FarmerLayout.tsx`, `pages/admin/FarmerDetail/index.tsx`, `api-requests/admin-farmer.requests.ts`,
`App.tsx`, locales.

---

### Task 1: Data model + one shared approval guard

**Files:** migration; `FarmerProfile.java`; new `FarmerStatusHistory.java`,
`FarmerStatusHistoryRepository.java`, `FarmerStatusHistoryWriter.java`, `StallSuspendedException.java`,
`StallSuspensionMessage.java`; the five services that duplicate `requireApproved`.
**Test:** `backend/src/test/java/com/techx/intervue/modules/farmer/services/impl/StallSuspensionMessageTest.java`

**Interfaces:**
- Produces `StallSuspensionMessage.assertUsable(FarmerProfile)` — no-op when `APPROVED`; throws
  `StallSuspendedException(message)` when `SUSPENDED`; throws the existing `StallNotApprovedException` for
  `PENDING`/`REJECTED`.
- Produces `StallSuspensionMessage.of(FarmerProfile): String` — the sentence shown to the Farmer.
- Produces `FarmerStatusHistoryWriter.record(long farmerId, ApprovalStatus from, ApprovalStatus to, String reason, Instant until, Long changedBy)`.

- [ ] **Step 1: Migration** — exactly the SQL in the spec §3 (one `ALTER TABLE` + one `CREATE TABLE`).

- [ ] **Step 2: Entity fields** — add to `FarmerProfile.java`, next to `suspendedAt`:
```java
    @Column(name = "suspended_until")
    private Instant suspendedUntil;
```

- [ ] **Step 3: History entity + repository + writer** — mirror the committed FR-072 trio
  (`modules/user/entities/UserStatusHistory.java`, `repositories/UserStatusHistoryRepository.java`,
  `services/impl/UserStatusHistoryWriter.java`) with `farmerId` instead of `userId` and
  `ApprovalStatus` (converter `ApprovalStatus.DbConverter`) instead of `UserStatus`.

- [ ] **Step 4: Write the failing test**
```java
package com.techx.intervue.modules.farmer.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.stall.exceptions.StallNotApprovedException;
import com.techx.intervue.modules.stall.exceptions.StallSuspendedException;
import java.time.Instant;
import org.junit.jupiter.api.Test;

/**
 * FR-071/D-09: the approval check lived in five services as a copy-paste. One of them getting a new
 * rule and the others not is exactly how FR-072's Google sign-in kept the wrong wording, so it is
 * one guard here — and a suspended stall is told apart from one that was never approved, because
 * the two need different words.
 */
class StallSuspensionMessageTest {

    private static FarmerProfile profile(ApprovalStatus status, String reason, Instant until) {
        FarmerProfile p = new FarmerProfile();
        p.setApprovalStatus(status);
        p.setSuspendReason(reason);
        p.setSuspendedUntil(until);
        return p;
    }

    @Test
    void anApprovedStallPassesThrough() {
        assertThatCode(() -> StallSuspensionMessage.assertUsable(profile(ApprovalStatus.APPROVED, null, null)))
                .doesNotThrowAnyException();
    }

    @Test
    void aSuspendedStallIsRefusedWithTheReason() {
        assertThatThrownBy(
                        () ->
                                StallSuspensionMessage.assertUsable(
                                        profile(ApprovalStatus.SUSPENDED, "Missed pickups", null)))
                .isInstanceOf(StallSuspendedException.class)
                .hasMessageContaining("Missed pickups");
    }

    @Test
    void aTemporarySuspensionSaysWhenItLifts() {
        String message =
                StallSuspensionMessage.of(
                        profile(
                                ApprovalStatus.SUSPENDED,
                                "Complaints",
                                Instant.parse("2026-10-05T02:00:00Z")));

        assertThat(message).contains("09:00 05/10/2026").contains("Complaints");
    }

    /** Pending/rejected is not a ban: it keeps the older, separate exception and wording. */
    @Test
    void aStallThatWasNeverApprovedKeepsTheOtherException() {
        assertThatThrownBy(
                        () -> StallSuspensionMessage.assertUsable(profile(ApprovalStatus.PENDING, null, null)))
                .isInstanceOf(StallNotApprovedException.class);
    }
}
```

- [ ] **Step 5: Run it, watch it fail**
Run: `cd backend && MYSQL_USER=market-link MYSQL_PASSWORD=112233 MYSQL_DATABASE=market-link ./mvnw -o test -Dtest=StallSuspensionMessageTest`
Expected: compile error — `StallSuspensionMessage` / `StallSuspendedException` do not exist.

- [ ] **Step 6: Implement**
`StallSuspendedException extends RuntimeException` taking a message (beside `StallNotApprovedException`).
`StallSuspensionMessage` mirrors `modules/user/services/impl/DeactivationMessage.java`: same
`DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy")` and `ZoneId.of("Asia/Ho_Chi_Minh")`, wording
*"Your stall is suspended. Reason: X. Orders you already accepted must still be completed."* for a permanent
one and *"…suspended until HH:mm dd/MM/yyyy. Reason: X…"* for a temporary one.

- [ ] **Step 7: Replace the five duplicates** — in `ProductService`, `StallService`, `SlotService`,
`StockTemplateService`, `FarmerDailyStockService`, delete each private `requireApproved` and call
`StallSuspensionMessage.assertUsable(profile)` at the same sites. Behaviour for pending/rejected is unchanged;
suspended now carries the reason.

- [ ] **Step 8: Map the new exception to 403 `STALL_SUSPENDED`** in `ProductExceptionHandler`,
`StallExceptionHandler` and `FarmerExceptionHandler`, right beside the existing `STALL_NOT_APPROVED` handler
and with the same shape.

- [ ] **Step 9: Run tests, then commit**
Run the test above plus `-Dtest=ProductServiceTest,StallServiceTest` — expect PASS.
```bash
git commit -m "refactor(FR-071): one approval guard, and name a suspended stall"
```

---

### Task 2: suspend/reinstate — duration, history, session revoke, email job

**Files:** `SuspendFarmerRequest.java`, `FarmerService.java`, `FarmerServiceInterface.java`,
`AdminFarmerController.java`.
**Test:** `backend/src/test/java/com/techx/intervue/modules/farmer/services/impl/FarmerSuspensionTest.java` (new,
`@SpringBootTest`, MySQL + Redis — model it on the committed `AdminCustomerServiceTest`).

**Interfaces:**
- Produces `SuspendFarmerRequest(String reason, Instant until)` — `until` null = permanent.
- Produces `FarmerServiceInterface.suspend(Long farmerId, SuspendFarmerRequest request, Long adminUserId)`
  (unchanged signature) and `reinstate(Long farmerId, Long actorId)` — **`actorId` is new**, `null` = the cron.
- Consumes `UserSessionCache.revokeAll`, `RefreshTokenService.revokeAllTokens`, `JobQueueInterface.enqueue`,
  `TransactionHelper.afterCommit`, `FarmerStatusHistoryWriter`.
- Produces job names `FarmerService.JOB_NOTIFY_SUSPENDED = "farmer.notify-suspended"` and
  `JOB_NOTIFY_REINSTATED = "farmer.notify-reinstated"`; payload keys `userId`, `email`, `fullName`,
  `stallName`, `reason`, `until` (`""` = permanent).

- [ ] **Step 1: Failing test** covering, against the real DB + Redis: (a) suspending stores
`suspended_until` and writes one `farmer_status_history` row with `changed_by` = the admin; (b) a live Redis
session for the farmer is gone afterwards; (c) suspending with no live session does not throw; (d) `until` in
the past throws `InvalidFieldException`; (e) reinstating clears reason **and** `suspended_until`, and a later
permanent suspension does not inherit the old expiry; (f) **an order already `accepted` can still be completed
by the suspended farmer** (D-09). Use `ReportFixture` for fixtures as `AdminCustomerServiceTest` does.

- [ ] **Step 2: Run it, watch it fail** — compile error on the 2-arg `SuspendFarmerRequest`.

- [ ] **Step 3: Add `until` to the request record**
```java
public record SuspendFarmerRequest(
        @NotBlank(message = "Say why the stall is suspended.")
                @Size(max = 255, message = "Keep the reason under 255 characters.")
                String reason,
        Instant until) {}
```

- [ ] **Step 4: Rewrite `suspend()`** — keep the existing `APPROVED`-only transition check and the
`tellOwner(... FARMER_SUSPENDED ...)` call, then add, in this order: reject a non-future `until` with
`new InvalidFieldException("until", "The suspension end time must be in the future.")`; set
`suspendedUntil`; save; `refreshTokens.revokeAllTokens(userId)`; `history.record(...)`; and finally, inside
`TransactionHelper.afterCommit(...)`, `sessionCache.revokeAll(userId)` **and** `jobQueue.enqueue(JOB_NOTIFY_SUSPENDED, payload)`.
Ordering matters: DB work rolls back together, Redis and mail only happen once the transaction commits — the
lesson from FR-072's review.

- [ ] **Step 5: Rewrite `reinstate(farmerId, actorId)`** — existing status check and field clearing, plus
`profile.setSuspendedUntil(null)`, a history row (`changed_by = actorId`, null for the cron), and an
`afterCommit` enqueue of `JOB_NOTIFY_REINSTATED`. Update `AdminFarmerController.reinstate` to pass
`admin.getId()`.

- [ ] **Step 6: Run tests, commit**
```bash
git commit -m "feat(FR-071): give a suspension a duration, a trail and an email"
```

---

### Task 3: Lock the panel down to what D-09 allows

**Files:** `FarmerProductController` + `ProductService` read methods, `FarmerSlotController`/`SlotService`,
`FarmerStallController`/`StallService`, `FarmerStockTemplateController`, `FarmerReportController`.
**Test:** extend `FarmerSuspensionTest`.

**Interfaces:** consumes `StallSuspensionMessage.assertUsable` from Task 1.

- [ ] **Step 1: Failing test** — a suspended farmer gets `StallSuspendedException` from: listing their
products, reading their stock week, listing their slots, reading their stall profile, and the farmer
dashboard/report; **and does not** get it from listing their orders, reading one order, or completing an
accepted one.

- [ ] **Step 2: Run it, watch it fail** — the read paths currently succeed.

- [ ] **Step 3: Add the guard to the read paths only.** In each service's read method that loads the caller's
own `FarmerProfile`, call `StallSuspensionMessage.assertUsable(profile)` immediately after the profile is
resolved. **Do not touch** `OrderService` / `FarmerOrderController` — D-09 depends on them staying open.

- [ ] **Step 4: Run the whole farmer + order suites** to prove D-09 still holds:
`-Dtest=FarmerSuspensionTest,OrderServiceTest,ProductServiceTest,SlotServiceTest,StallServiceTest`

- [ ] **Step 5: Commit**
```bash
git commit -m "feat(FR-071): show a suspended stall only its orders, as D-09 says"
```

---

### Task 4: The two emails

**Files:** `resources/mail/stall-suspended.{html,txt}`, `resources/mail/stall-reinstated.{html,txt}`,
`services/impl/StallStatusMail.java`, `StallSuspendedNoticeJob.java`, `StallReinstatedNoticeJob.java`,
`i18n/mail.properties`.
**Test:** `StallStatusMailTest.java` + `StallStatusNoticeJobsTest.java` — mirror the committed
`AccountStatusMailTest` / `AccountStatusNoticeJobsTest`.

**Interfaces:** produces `StallStatusMail.suspended(fullName, stallName, reason, until, language): Content` and
`.reinstated(fullName, stallName, language): Content`, each `Content(subject, html, text)`.

- [ ] **Step 1: Failing tests** — the letter is branded (`<!doctype html>`, `MarketLink`), names the reason,
says "permanently" or the lift time, contains `admin@marketlink.vn`, the text part is a real letter (no
`<table`), an HTML reason is escaped, and an unknown language falls back to English.

- [ ] **Step 2: Run, watch fail.**

- [ ] **Step 3: Copy the templates** — start from the committed `resources/mail/account-deactivated.html` /
`.txt` and `account-reactivated.html` / `.txt`; keep the markup identical and change only the placeholder
names: add `{{stallName}}`, and for the suspended letter a details block with `{{reasonLabel}}/{{reason}}` and
`{{durationLabel}}/{{duration}}`, plus one line stating that orders already accepted must still be completed.

- [ ] **Step 4: Copy is EN-only for now**, in `i18n/mail.properties`, keys `stallSuspended.*` /
`stallReinstated.*` matching the placeholder names (Task 10 translates the other nine).

- [ ] **Step 5: `StallStatusMail`** — mirror `modules/user/services/impl/AccountStatusMail.java` exactly
(`@Qualifier("mailMessages") MessageSource`, `MailTemplates`, `@Value("${app.mail.sign-in-url}")`,
`@Value("${app.mail.support-email}")`).

- [ ] **Step 6: The two jobs** — mirror `AccountDeactivatedNoticeJob` / `AccountReactivatedNoticeJob`,
including resolving the recipient's language through `UserSettingsRepository.findById(userId)` and sending with
`mailService.send(to, subject, html, text)`.

- [ ] **Step 7: Run tests, commit**
```bash
git commit -m "feat(FR-071): email the farmer when the stall is suspended or back"
```

---

### Task 5: Cron auto-reinstate

**Files:** `FarmerSuspensionExpiryJob.java`, `FarmerProfileRepository.java`.
**Test:** `FarmerSuspensionExpiryJobTest.java` — mirror the committed `CustomerBanExpiryJobTest`.

- [ ] **Step 1: Repository query**
```java
    List<FarmerProfile> findByApprovalStatusAndSuspendedUntilLessThanEqual(
            ApprovalStatus status, Instant now);
```

- [ ] **Step 2: Failing test** — reinstates every profile whose suspension expired; does nothing when none
have; **and one failing profile does not stop the rest** (the FR-072 review finding — assert the second one is
still reinstated when the first throws).

- [ ] **Step 3: Run, watch fail.**

- [ ] **Step 4: Implement** — `@Scheduled(fixedDelayString = "PT60S")`, loops calling
`farmerService.reinstate(profile.getId(), null)` inside a per-profile `try/catch` that logs and continues.

- [ ] **Step 5: Run, commit**
```bash
git commit -m "feat(FR-071): lift an expired suspension automatically"
```

---

### Task 6: `GET /admin/farmers/{id}/status-history`

**Files:** `AdminFarmerStatusHistoryResource.java`, `AdminFarmerStatusHistoryQueryRepository.java`,
`FarmerServiceInterface.java`, `FarmerService.java`, `AdminFarmerController.java`.
**Test:** extend `FarmerSuspensionTest`.

**Interfaces:** produces `statusHistory(long farmerId, int page, int pageSize): PageResource<AdminFarmerStatusHistoryResource>`
— 404s for an id that is not a farmer, the same rule as the rest of the controller.

- [ ] **Step 1: Failing test** — two actions produce two rows, newest first, with the admin's name resolved;
an unknown id throws `FarmerProfileNotFoundException`.

- [ ] **Step 2: Run, watch fail.**

- [ ] **Step 3: Implement** — resource record `(id, fromStatus, toStatus, reason, until, changedByName, changedAt)`;
query repository mirroring the committed `AdminCustomerStatusHistoryQueryRepository` (named parameters,
`LEFT JOIN users a ON a.id = h.changed_by`, `ORDER BY h.changed_at DESC, h.id DESC`); service method calls the
existing detail lookup first so a bad id 404s; controller `@GetMapping("/{id}/status-history")`.

- [ ] **Step 4: Run, commit**
```bash
git commit -m "feat(FR-071): add the stall suspension audit trail endpoint"
```

---

### Task 7: Frontend — `STALL_SUSPENDED` dialog

**Files:** `utils/accountDeactivatedNotice.ts` → generalise, `utils/axiosInstance.ts`,
`components/StallSuspendedDialog.tsx` (+ test), `App.tsx`, `locales/en/common.json`.

- [ ] **Step 1: Generalise the stash.** Rename `accountDeactivatedNotice.ts` to `utils/blockedNotice.ts`
keeping `stash/peek/clear` but storing `{ kind: 'account' | 'stall'; message: string }` as JSON. Update
`AccountDeactivatedDialog` and its test to read `kind === 'account'`. Run the existing
`AccountDeactivatedDialog.test.tsx` + `axiosInstance.test.ts` — they must stay green.

- [ ] **Step 2: Failing test for the new dialog** — mirrors `AccountDeactivatedDialog.test.tsx`: shows the
reason from a `stall` stash, renders no "undefined" when the message is empty, renders nothing on a normal
visit, closes on acknowledge.

- [ ] **Step 3: Interceptor branch** in `axiosInstance.ts`, beside `watchForAccountDeactivated`:
```typescript
export const watchForStallSuspended = (error: unknown) => {
  if (error instanceof AxiosError && error.response?.data?.error?.code === 'STALL_SUSPENDED') {
    const reason = error.response.data?.message;
    BlockedNotice.stash('stall', typeof reason === 'string' ? reason : '');
    window.location.assign('/farmer/pending');
  }
  return Promise.reject(error);
};
```
Register it on `publicApi` and `privateApi` exactly like the sibling. Note it does **not** clear the session —
a suspended farmer stays signed in (D-09).

- [ ] **Step 4: `StallSuspendedDialog.tsx`** — same shape as `AccountDeactivatedDialog.tsx` (lazy `useState`
initializer reading `peek`, `clear` in an effect, `dismissed` state — the project's lint forbids `setState`
inside an effect), copy from the new `stallSuspended.*` keys, link to `admin@marketlink.vn`. Render it next to
`<AccountDeactivatedDialog />` in `App.tsx`.

- [ ] **Step 5: EN copy** in `locales/en/common.json`:
```json
  "stallSuspended": {
    "title": "Your stall is suspended",
    "generic": "An administrator suspended this stall, so it is hidden from customers for now.",
    "whatNow": "Orders customers already placed still run to the end — please complete them. You cannot list produce, change stock or take new orders until the suspension is lifted.",
    "contactIntro": "If you believe this is a mistake, contact us at",
    "acknowledge": "I understand"
  },
```

- [ ] **Step 6: Run `npx vitest run`, `npx tsc --noEmit -p tsconfig.app.json`, `npx eslint` on the touched
files, commit**
```bash
git commit -m "feat(FR-071): tell a suspended farmer why, on screen"
```

---

### Task 8: Frontend — lock the Farmer menu

**Files:** `layout/FarmerLayout.tsx`.

- [ ] **Step 1: Hide the locked groups.** `FarmerLayout` already loads the profile
(`useRequest('farmer-layout-profile', () => StallApi.myProfile())`) and already reads
`profile?.approvalStatus`. Derive `const suspended = profile?.approvalStatus === 'suspended';` and, when true,
filter `NAV` down to the groups that D-09 leaves open — orders, inbox/messages, notifications, account,
settings and the approval-status page — dropping products, stock, slots and stall profile.

- [ ] **Step 2: Manual check** — `make up`, suspend a farmer from the admin panel, sign in as them: the menu
shows only the allowed entries, and navigating to `/farmer/products` by typing the URL still fails at the
server with the dialog from Task 7 (hiding the menu is UX; the server is the gate).

- [ ] **Step 3: Commit**
```bash
git commit -m "feat(FR-071): hide the locked panel sections while suspended"
```

---

### Task 9: Frontend — duration picker + Stall history

**Files:** `api-requests/admin-farmer.requests.ts`, `pages/admin/FarmerDetail/index.tsx`,
`locales/en/AdminFarmerDetail.json` (or the file that page uses).

- [ ] **Step 1: API client** — `suspend(id, reason, until = null)` sends `{ reason, until }`; add
`farmerStatusHistory(id, page = 1, pageSize = 20)` hitting `/admin/farmers/${id}/status-history`, with a
`AdminFarmerStatusHistoryDto` type mirroring `AdminCustomerStatusHistoryDto`.

- [ ] **Step 2: Reuse `BanDurationPicker`** (committed at `components/BanDurationPicker.tsx`) in the suspend
dialog on the admin Farmer detail page, exactly as `pages/admin/CustomerDetail/index.tsx` does: `duration`
state reset when the dialog opens, `until` computed as
`duration.kind === 'temporary' ? duration.until : null`.

- [ ] **Step 3: "Stall history" section** — mirror the committed Account history block in
`pages/admin/CustomerDetail/index.tsx`, including all four FR-084 states and `cutoffLabel` (date **and** time)
for the `when` and `until` columns. Call `retryHistory()` in the success branch of the suspend/reinstate
handler so the panel is not stale.

- [ ] **Step 4: Run `npx tsc --noEmit`, `npx eslint`, commit**
```bash
git commit -m "feat(FR-071): pick a suspension duration and read the stall history"
```

---

### Task 10: Translate everything new into the other 9 locales

**Files:** `backend/src/main/resources/i18n/mail_{vi,zh,ja,ko,fr,es,de,th,id}.properties`;
`frontend/src/locales/{vi,zh,ja,ko,fr,es,de,th,id}/common.json` and the admin farmer page's locale file.

- [ ] **Step 1: Back-end mail copy** — add the same `stallSuspended.*` / `stallReinstated.*` keys to all nine
bundles. `mail.properties` states the rule: keep the same keys in all 10 files, and a literal apostrophe is
doubled (`''`) because every line goes through `MessageFormat`.

- [ ] **Step 2: Front-end copy** — `stallSuspended.*` in each `common.json`, plus the new admin page strings.

- [ ] **Step 3: Verify parity** — every bundle must report the same count:
```bash
cd backend/src/main/resources/i18n
for f in mail.properties mail_*.properties; do printf "%-24s %s\n" "$f" "$(grep -cE '^(stallSuspended|stallReinstated)\.' $f)"; done
```
and each `common.json` must parse (`python3 -c "import json;json.load(open(...))"`).

- [ ] **Step 4: `npx prettier --write` the touched JSON, `npm run lint`, commit**
```bash
git commit -m "i18n(FR-071): translate the suspension strings"
```

---

## Post-plan: raise with LEAD (not a task — do not implement)

Per R-02 / R-07, after the tasks land tell the user to ask LEAD for:
1. `docs/api-contract.md` — `until` on `PATCH /admin/farmers/{id}/suspend`, the new
   `GET /admin/farmers/{id}/status-history`, and the `STALL_SUSPENDED` error code.
2. `.ai/REQUIREMENTS.md` FR-071 — currently only "duyệt / từ chối / đình chỉ"; the duration, email, audit log
   and panel lockdown go beyond it and should be written in so scope matches what shipped.
