# Chat Plan 4B — báo cáo, kiểm duyệt, header, lối vào chat

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hoàn tất đợt 1 của chat người–người: báo cáo tin nhắn và kiểm duyệt của admin (FR-116), số chưa đọc và popover trên header (FR-113, FR-117), nút "Message this stall" kèm ghim sản phẩm (FR-114), cùng các chỗ hở Plan 4A để lại.

**Architecture:** Backend thêm bốn trường/đổi một body (LEAD duyệt 26/09): mở thread bằng `farmerId` (id stall), participant farmer có `stallName` + `farmerId`, thread có `otherReadAt`, tin trong cửa sổ kiểm duyệt có `attachmentId`. Frontend dùng lại đúng các khối của 4A (`useChat`, `merge.ts`, `ConversationPanel`, `realtime`), thêm một kho số chưa đọc theo mẫu `NotificationStore`, một component popover dùng chung cho chuông và bong bóng, và một tab mới trong trang kiểm duyệt đang có.

**Tech Stack:** Spring Boot 4.1 / Java 25 / JUnit 5 + Mockito · React 19 / Vite 8 / TypeScript / Tailwind 4 / Vitest 5 + Testing Library · STOMP qua `lib/realtime/stompClient.ts`.

**Spec:** `docs/superpowers/specs/2026-09-25-farmer-customer-chat-design.md` (§4 FR-113/114/116/117, §6.1, §8.3, §9.1–9.6, §11). Plan trước: `docs/superpowers/plans/2026-09-26-chat-ui-customer-farmer.md` (4A, PR #144).

**Quyết định của LEAD (26/09/2026):**
1. Tách nhánh 4B từ `dev` **sau khi** #144 merge (H-5).
2. Đổi contract đủ ba chỗ: `POST /conversations` nhận `farmerId`; participant farmer có `stallName` + `farmerId`; `ConversationResource.otherReadAt`.
3. Prototype cập nhật ở task cuối.

**Không làm trong plan này:**

| Việc | Vì sao |
|---|---|
| Nút nhắn tin ở chi tiết đơn, ghim đơn vào tin (phần "đơn" của FR-114) | `dev` chưa có module `order` (core-commerce đang làm ở worktree khác). Làm khi có `GET /orders/{id}` |
| Offer giá (FR-118, FR-119) | Đợt 2 |
| Chặn người dùng, xoá/sửa tin | Spec §8.5 cố ý không làm |

---

## Global Constraints

Chép từ spec, `CLAUDE.md`, `frontend/CLAUDE.md`, `backend/CLAUDE.md`. Mọi task đều phải thoả.

- **R-02**: `docs/api-contract.md` chỉ LEAD sửa — lần này LEAD đã duyệt ba thay đổi ở trên; task nào đổi API thì sửa đúng dòng của nó trong §12 của contract.
- **R-05**: FE và BE lệch thì sửa bên sai. Hình dạng API đọc từ file `.java`, không đoán.
- **R-06**: quyền thật ở server; ẩn nút ở FE chỉ là UX.
- Backend theo `backend/CLAUDE.md` đúng từng chữ (tên package, `*Interface`, `ApiResource`, message tiếng Anh). `./mvnw spotless:apply` trước commit.
- **Palette Tailwind mặc định đã tắt**: chỉ token (`bg-surface`, `bg-surface-raised`, `text-ink`, `text-ink-muted`, `border-line-strong`, `bg-brand text-on-brand`, `bg-accent text-on-accent`, `text-danger`, `bg-danger-bg`). **Không có** `text-danger-ink`.
- Spacing `p-1/2/3/4/6/8/12/16`. Không `p-5`, `p-7`, `p-[18px]`.
- `font-hand` chỉ cho tên chợ/stall, giá, nhãn. Tiêu đề trang dùng `text-h1` thường.
- Copy không viết cứng trong TSX; dịch đủ **10 ngôn ngữ** `en vi zh ja ko fr es de th id`. Sửa JSON locale bằng **gộp** (không gán đè cả khối). Plural `_one` chỉ cho `en fr es de`.
- Giờ/ngày qua `lib/format.ts`; mốc chat dùng `chatWhen` (`lib/chat/time.ts`). `formatClock` chỉ nhận `"07:30"`.
- `Helper.cn` chỉ nối chuỗi, **không** gộp class xung đột như tailwind-merge — đừng đè `border-*` bằng class thứ hai.
- ESLint React 19: không `setState` đồng bộ trong effect; reset theo prop bằng "adjust state during render"; effect tải dữ liệu thì `eslint-disable-next-line react-hooks/set-state-in-effect -- <lý do>` như `ProfileForm`.
- **Một kết nối STOMP** cho cả app (`realtime`), không tạo `Client` thứ hai.
- Popover (spec §9.1): mở bằng hover **và** click/phím; đóng bằng `Esc` hoặc click ra ngoài; nút mang `aria-expanded`; panel `shadow-pop`, `z-50` (trên header `z-40`).
- FR-084 đủ 4 trạng thái; FR-080 không tràn ngang ở 375 / 768 / 1440.
- Admin **chỉ** đọc tin đã bị báo cáo + 5 tin mỗi bên (spec §8.3) — ghi thẳng ra màn cho admin đọc.
- Commit: Conventional Commits có mã FR, kết bằng `Co-Authored-By`. Trước commit FE: `npx prettier --write src && npm run lint`.
- **KHÔNG dựng stack Docker mới.** Backend test chạy `./mvnw -q test -Dtest=<lớp>` trên host (Java 25). Frontend test `npm --prefix frontend test`.

---

## Review Focus

1. **Id stall ≠ id người dùng.** Trang sản phẩm/stall chỉ biết `farmerId` (id `farmer_profiles`); gửi nhầm vào chỗ cần `users.id` sẽ mở thread với **người khác**. → Task 1 `openResolvesTheStallToItsOwner`, `openUsesTheStallOwnerNotTheProfileId`.
2. **Bấm "Message this stall" trên sạp của chính mình.** Farmer xem stall mình → 400 tự nhắn. Kỳ vọng: không mở trang lỗi, báo bằng chữ. → Task 8 `explains that you cannot message your own stall`.
3. **Tin bị ẩn khi đang mở thread.** Kỳ vọng: biến mất ở cả hai bên ngay, không cần tải lại; dòng xem trước của danh sách không còn nội dung đã ẩn. → Task 4 `removes a message an admin hid`, `refreshes the preview when a message is hidden`.
4. **Báo cáo lần hai cùng một tin** → 409. Kỳ vọng: coi như đã báo, không hiện lỗi đỏ. → Task 5 `treats a second report as already reported`.
5. **Popover bằng bàn phím và trên điện thoại** (không có hover). Kỳ vọng: Enter/Space mở, Esc đóng và trả focus về nút, bấm ra ngoài đóng. → Task 7 `opens on click and keyboard, closes on Escape and outside click`.
6. **Stall bị đình chỉ / gửi quá nhanh** → 409 / 429 khi gửi. Kỳ vọng: câu báo đúng lý do, không phải "Your message was not sent" chung chung. → Task 4 `sendErrorKey`.
7. **Tab ở nền** thì chưa được tính là "đã xem". → Task 4 `waits until the tab is visible before marking read`.

---

## File map

| File | Trách nhiệm | Task |
|---|---|---|
| `backend/.../conversation/requests/OpenConversationRequest.java` | body `{ farmerId }` | 1 |
| `backend/.../conversation/services/impl/ConversationService.java` | stall → chủ stall; participant có stall; `otherReadAt` | 1, 2 |
| `backend/.../conversation/resources/ParticipantResource.java` | + `farmerId`, `stallName` | 2 |
| `backend/.../conversation/resources/ConversationResource.java` | + `otherReadAt` | 2 |
| `backend/.../farmer/repositories/FarmerProfileRepository.java` | + `findAllByUserIdIn` | 2 |
| `backend/.../conversation/resources/ModeratedMessageResource.java` + `ModerationService.java` | + `attachmentId` | 2 |
| `frontend/src/types/chat.types.ts`, `api-requests/conversation.requests.ts` | kiểu + client mới | 3 |
| `frontend/src/api-requests/moderation.requests.ts` | API kiểm duyệt của admin | 3 |
| `frontend/src/lib/chat/names.ts` | tên hiển thị: tên stall trước, tên người sau | 3 |
| `frontend/src/lib/chat/merge.ts`, `useChat.ts`, `errors.ts` | `hidden`, đọc khi tab hiện, lỗi gửi, tải thêm thread | 4 |
| `frontend/src/components/chat/ReportDialog.tsx`, `MessageBubble.tsx` | báo cáo | 5 |
| `frontend/src/pages/admin/Moderation/ReportedMessages.tsx` | tab kiểm duyệt | 6 |
| `frontend/src/lib/chat/unreadStore.ts`, `components/chat/ChatUnreadCenter.tsx`, `hooks/useChatUnread.ts` | số chưa đọc toàn app | 7 |
| `frontend/src/components/ui/popover.tsx`, `components/Header/*`, `components/notifications/NotificationBell.tsx`, `layout/FarmerLayout.tsx` | popover + badge | 7 |
| `frontend/src/components/chat/MessageStallButton.tsx`, `ProductPin.tsx`, pages `ProductDetail`, `StallProfile` | lối vào chat, ghim sản phẩm | 8 |
| `frontend/src/locales/*` | dịch | 9 |
| `docs/prototype/*` (6 file) | prototype | 10 |

---

### Task 1: Mở thread bằng id stall

**Files:**
- Modify: `backend/src/main/java/com/techx/intervue/modules/conversation/requests/OpenConversationRequest.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/conversation/services/impl/ConversationService.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/conversation/services/impl/ConversationServiceTest.java`
- Modify: `docs/api-contract.md` (dòng `POST /api/v1/conversations` ở §12)

**Interfaces:**
- Produces: `POST /api/v1/conversations` body `{ "farmerId": number }` — `farmerId` là `farmer_profiles.id`, đúng id mà `GET /api/v1/farmers/{id}` và `ProductType.farmerId` dùng.

- [ ] **Bước 1: Test đỏ**

Trong `ConversationServiceTest`: thêm mock `FarmerProfileRepository farmerProfiles`, truyền vào constructor (sau `users`), và stub hồ sơ stall id **30** thuộc người dùng **3** (id khác nhau có chủ đích — Review Focus #1):

```java
farmerProfiles = mock(FarmerProfileRepository.class);
FarmerProfile stall = FarmerProfile.builder().id(30L).userId(3L).stallName("Cô Tư Garden").build();
when(farmerProfiles.findById(30L)).thenReturn(Optional.of(stall));
```

Đổi mọi `new OpenConversationRequest(3L)` thành `new OpenConversationRequest(30L)`, rồi thêm:

```java
/** Review Focus #1: id stall và id người dùng là hai dãy số khác nhau. */
@Test
void openUsesTheStallOwnerNotTheProfileId() {
    when(conversations.findByUserAIdAndUserBId(3L, 7L)).thenReturn(Optional.empty());

    ConversationResource result = service.open(7L, new OpenConversationRequest(30L));

    assertThat(result.other().userId()).isEqualTo(3L);
    verify(users, never()).findById(30L);
}

@Test
void openWithUnknownStallIsNotFound() {
    when(farmerProfiles.findById(99L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.open(7L, new OpenConversationRequest(99L)))
            .isInstanceOf(EntityNotFoundException.class)
            .hasMessage("Stall not found.");
    verify(conversations, never()).save(any());
}

/** Review Focus #2: Farmer bấm "Message this stall" trên chính sạp mình. */
@Test
void openRefusesMessagingYourOwnStall() {
    assertThatThrownBy(() -> service.open(3L, new OpenConversationRequest(30L)))
            .isInstanceOf(SelfConversationException.class);
    verify(conversations, never()).save(any());
}
```

Xoá hai test cũ `openRefusesMessagingYourself` (dùng id người dùng) và `openWithUnknownTargetIsNotFound` — hai test mới ở trên thay chúng. Kiểm `FarmerProfile` có `@Builder`: `grep -n "@Builder" backend/src/main/java/com/techx/intervue/modules/farmer/entities/FarmerProfile.java`; không có thì dựng bằng `new FarmerProfile()` + setter.

- [ ] **Bước 2: Chạy thấy đỏ**

```bash
cd backend && ./mvnw -q test -Dtest=ConversationServiceTest
```

Expected: FAIL biên dịch — constructor `ConversationService` chưa nhận `FarmerProfileRepository`.

- [ ] **Bước 3: Code**

`OpenConversationRequest.java`:

```java
/**
 * FR-110. `farmerId` là id stall (farmer_profiles.id) — đúng id mà trang sản phẩm và trang stall có
 * sẵn. Server tự tra chủ stall; client không bao giờ phải biết users.id của Farmer.
 */
public record OpenConversationRequest(@NotNull(message = "Choose a stall to message.") Long farmerId) {}
```

`ConversationService`: thêm field `private final FarmerProfileRepository farmerProfiles;` ngay sau `users` (constructor do `@RequiredArgsConstructor` sinh — thứ tự field là thứ tự tham số, khớp test). Đầu `open()`:

```java
FarmerProfile stall =
        farmerProfiles
                .findById(request.farmerId())
                .orElseThrow(() -> new EntityNotFoundException("Stall not found."));
Long targetId = stall.getUserId();
if (meId.equals(targetId)) {
    throw new SelfConversationException();
}
User me = requireUser(meId, "Account not found.");
User target = requireUser(targetId, "Stall not found.");
```

(bỏ hai dòng cũ dùng `request.farmerUserId()`). Grep mọi chỗ khác gọi `farmerUserId()`: `grep -rn "farmerUserId" backend/src` — sửa hết (kể cả test tích hợp STOMP nếu có).

- [ ] **Bước 4: Chạy thấy xanh**

```bash
cd backend && ./mvnw -q spotless:apply && ./mvnw -q test -Dtest='ConversationServiceTest,ChatStompIntegrationTest'
```

Expected: PASS. (`ChatStompIntegrationTest` cần Testcontainers — nếu máy không đủ RAM, chạy riêng `ConversationServiceTest` và ghi vào ledger.)

- [ ] **Bước 5: Contract**

`docs/api-contract.md` §12, dòng `POST /api/v1/conversations`: đổi `{ farmerUserId }` thành `{ farmerId }` và thêm câu "id stall (`farmer_profiles.id`), như `GET /farmers/{id}`; server tự tra chủ stall. Đổi 26/09 theo quyết định LEAD." Frontend: `ConversationApi.open` đổi ở Task 3.

- [ ] **Bước 6: Commit**

```bash
git add backend docs/api-contract.md
git commit -m "feat(FR-114): open a conversation from the stall id every page already has"
```

---

### Task 2: Tên stall, mốc đọc, và ảnh cho admin trong tài nguyên

**Files:**
- Modify: `backend/.../conversation/resources/ParticipantResource.java`, `ConversationResource.java`, `ModeratedMessageResource.java`
- Modify: `backend/.../conversation/services/impl/ConversationService.java`, `ModerationService.java`
- Modify: `backend/.../farmer/repositories/FarmerProfileRepository.java`
- Test: `ConversationServiceTest.java`, `ModerationServiceTest.java`
- Modify: `docs/api-contract.md`

**Interfaces:**
- Produces: `ParticipantResource { userId, fullName, role, image, online, lastSeenAt, farmerId?, stallName? }` — hai trường cuối chỉ có khi người kia là Farmer có hồ sơ stall (NON_NULL: vắng mặt, không phải `null`).
- Produces: `ConversationResource.otherReadAt?: Instant` — lúc người kia đọc tới gần nhất (vắng nếu chưa đọc).
- Produces: `ModeratedMessageResource.attachmentId?: Long` — có khi `hasPhoto`.

- [x] **Bước 1: Test đỏ** (`ConversationServiceTest`)

```java
@Test
void aFarmerParticipantCarriesTheirStall() {
    Conversation c = Conversation.between(3L, 7L);
    c.setId(42L);
    when(conversations.findMine(eq(7L), any())).thenReturn(new PageImpl<>(List.of(c)));
    when(users.findAllById(List.of(3L))).thenReturn(List.of(farmer));
    when(farmerProfiles.findAllByUserIdIn(List.of(3L)))
            .thenReturn(List.of(FarmerProfile.builder().id(30L).userId(3L).stallName("Cô Tư Garden").build()));

    var other = service.listMine(7L, 1, 20).items().get(0).other();

    assertThat(other.stallName()).isEqualTo("Cô Tư Garden");
    assertThat(other.farmerId()).isEqualTo(30L);
}

@Test
void aCustomerParticipantHasNoStall() {
    Conversation c = Conversation.between(3L, 7L);
    c.setId(42L);
    when(conversations.findMine(eq(3L), any())).thenReturn(new PageImpl<>(List.of(c)));
    when(users.findAllById(List.of(7L))).thenReturn(List.of(customer));
    when(farmerProfiles.findAllByUserIdIn(List.of(7L))).thenReturn(List.of());

    var other = service.listMine(3L, 1, 20).items().get(0).other();

    assertThat(other.stallName()).isNull();
    assertThat(other.farmerId()).isNull();
}

/** "Seen" phải còn sau khi tải lại trang: mốc đọc của NGƯỜI KIA, không phải của mình. */
@Test
void theThreadCarriesWhenTheOtherPersonLastRead() {
    Conversation c = Conversation.between(3L, 7L);
    c.setId(42L);
    c.markRead(3L, NOW.minusSeconds(60));
    c.markRead(7L, NOW);
    when(conversations.findMine(eq(7L), any())).thenReturn(new PageImpl<>(List.of(c)));
    when(users.findAllById(List.of(3L))).thenReturn(List.of(farmer));
    when(farmerProfiles.findAllByUserIdIn(List.of(3L))).thenReturn(List.of());

    assertThat(service.listMine(7L, 1, 20).items().get(0).otherReadAt()).isEqualTo(NOW.minusSeconds(60));
}
```

Trong `ModerationServiceTest`, tìm test đang kiểm cửa sổ ngữ cảnh có ảnh (`grep -n "hasPhoto" ModerationServiceTest.java`) và thêm khẳng định `assertThat(photoRow.attachmentId()).isEqualTo(<id ảnh trong fixture>)`; nếu chưa có test nào có ảnh, viết một test theo đúng fixture của file đó: một tin `kind=image` có `MessageAttachment` id 5 → dòng tương ứng có `hasPhoto=true`, `attachmentId=5`.

- [x] **Bước 2: Chạy thấy đỏ**

```bash
cd backend && ./mvnw -q test -Dtest='ConversationServiceTest,ModerationServiceTest'
```

Expected: FAIL biên dịch (`findAllByUserIdIn`, `stallName()`, `otherReadAt()`, `attachmentId()` chưa có).

- [x] **Bước 3: Code**

`FarmerProfileRepository`: `List<FarmerProfile> findAllByUserIdIn(Collection<Long> userIds);`

`ParticipantResource` — thêm hai thành phần cuối và nhận hồ sơ (có thể null):

```java
public record ParticipantResource(
        Long userId, String fullName, RoleType role, String image, boolean online, Instant lastSeenAt,
        Long farmerId, String stallName) {

    /** `stall` null khi người kia không có hồ sơ stall (Customer) — hai trường cuối vắng mặt. */
    public static ParticipantResource from(User user, PresenceService.PresenceInfo presence, FarmerProfile stall) {
        return ParticipantResource.builder()
                .userId(user.getId())
                .fullName(user.getFullName())
                .role(user.getRole())
                .image(user.getImage())
                .online(presence != null && presence.online())
                .lastSeenAt(presence == null ? null : presence.lastSeenAt())
                .farmerId(stall == null ? null : stall.getId())
                .stallName(stall == null ? null : stall.getStallName())
                .build();
    }
}
```

Giữ nguyên annotation của record (`@Builder`, `@JsonInclude(NON_NULL)` nếu có — nếu chưa có `@JsonInclude(JsonInclude.Include.NON_NULL)` thì thêm để Customer không mang `stallName: null`).

`ConversationResource`: thêm `Instant otherReadAt` sau `createdAt`.

`ConversationService`:
- `listMine`: sau `others`, `Map<Long, FarmerProfile> stalls = stallsOf(others.keySet());` rồi truyền `stalls.get(c.otherMember(meId))` vào `toResource`.
- `open`: `toResource(conversation, target, unread, live, stall)` (đã có `stall` từ Task 1).
- helper:

```java
/** Hồ sơ stall của những người trong trang, một truy vấn; ai không phải Farmer thì không có trong map. */
private Map<Long, FarmerProfile> stallsOf(Collection<Long> userIds) {
    if (userIds.isEmpty()) {
        return Map.of();
    }
    return farmerProfiles.findAllByUserIdIn(userIds).stream()
            .collect(Collectors.toMap(FarmerProfile::getUserId, Function.identity()));
}
```

- `toResource(Conversation c, User other, long unread, PresenceInfo live, FarmerProfile stall)`: `.other(other == null ? null : ParticipantResource.from(other, live, stall))` và `.otherReadAt(other == null ? null : c.readAtOf(other.getId()))`.
- Grep `ParticipantResource.from(` toàn backend, sửa mọi chỗ gọi khác (truyền `null` nếu chỗ đó không cần stall, kèm comment vì sao).

`ModeratedMessageResource`: thêm `Long attachmentId` ngay sau `hasPhoto`. Trong `ModerationService` (chỗ `new ModeratedMessageResource(` ~dòng 167): truyền id ảnh của tin nếu có, `null` nếu không — lấy từ chính nguồn đang dùng để tính `hasPhoto`.

- [x] **Bước 4: Chạy thấy xanh**

```bash
cd backend && ./mvnw -q spotless:apply && ./mvnw -q test -Dtest='ConversationServiceTest,ModerationServiceTest,StompChatEventPublisherTest'
```

Expected: PASS.

- [x] **Bước 5: Contract** — §12 của `docs/api-contract.md`: mô tả `ConversationResource` thêm `otherReadAt`, `other.farmerId`, `other.stallName` (chỉ khi người kia là Farmer); `ModeratedMessageResource` thêm `attachmentId` (có khi `hasPhoto`; admin mở qua `GET /attachments/{id}`, server chỉ cho với tin đã bị báo cáo).

- [x] **Bước 6: Commit**

```bash
git add backend docs/api-contract.md
git commit -m "feat(FR-112): name the stall, keep the read marker, and let an admin open a reported photo"
```

---

### Task 3: Tầng dữ liệu frontend

**Files:**
- Modify: `frontend/src/types/chat.types.ts`, `frontend/src/api-requests/conversation.requests.ts` (+ test)
- Create: `frontend/src/api-requests/moderation.requests.ts` (+ test)
- Create: `frontend/src/lib/chat/names.ts` (+ test)
- Modify: `frontend/src/components/chat/ThreadList.tsx`, `ConversationPanel.tsx` (dùng `displayName`)

**Interfaces:**
- Produces:
  - `ChatParticipant` thêm `farmerId?: number; stallName?: string`; `ConversationSummary` thêm `otherReadAt?: string`.
  - `ConversationApi.open(farmerId: number)`; `ConversationApi.report(messageId: number, body: { reason: ReportReason; note?: string })`.
  - `type ReportReason = 'spam' | 'abuse' | 'scam' | 'other'`; `type ReportStatus = 'new' | 'reviewed' | 'actioned'`.
  - `ModerationApi.reports({ status?: ReportStatus; page: number; pageSize: number })` → `PageType<ReportListItem>`; `ModerationApi.report(id)` → `ReportDetail`; `ModerationApi.hide(messageId)`; `ModerationApi.dismiss(reportId)`.
  - `displayName(p: ChatParticipant): string` — `stallName` nếu có, không thì `fullName`.

- [x] **Bước 1: Đọc hình dạng thật** (luật 4A): `sed -n '/record/,/)/p'` trên `AdminReportListItemResource.java`, `AdminReportDetailResource.java`, `ModeratedMessageResource.java`, `MessageReportResource.java`; và đọc `AdminMessageReportController` (param `status`, `page`, `pageSize`) + `AdminMessageController` (`PATCH /admin/messages/{id}/hide`), `MessageReportController` (`POST /messages/{id}/report`).

- [x] **Bước 2: Test đỏ**

`frontend/src/lib/chat/names.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { displayName } from './names';

const person = { userId: 3, fullName: 'Nguyễn Thị Tư', role: 'farmer', image: null, online: false, lastSeenAt: null };

describe('displayName', () => {
  /** Khách nhắn cho một sạp, không nhắn cho một cái tên người. */
  it('prefers the stall name', () => {
    expect(displayName({ ...person, farmerId: 30, stallName: 'Cô Tư Garden' })).toBe('Cô Tư Garden');
  });

  it('falls back to the person for a customer', () => {
    expect(displayName({ ...person, role: 'customer' })).toBe('Nguyễn Thị Tư');
  });
});
```

Thêm vào `conversation.requests.test.ts` (theo đúng mẫu mock `privateApi` đang có trong file):

```ts
it('opens a thread with the stall id', async () => {
  await ConversationApi.open(30);
  expect(privateApi.post).toHaveBeenCalledWith('/conversations', { farmerId: 30 });
});

it('reports a message with a reason and an optional note', async () => {
  await ConversationApi.report(55, { reason: 'scam', note: 'asks for a deposit' });
  expect(privateApi.post).toHaveBeenCalledWith('/messages/55/report', { reason: 'scam', note: 'asks for a deposit' });
});
```

Sửa test cũ của `open` (nếu đang kiểm `{ farmerUserId }`).

`frontend/src/api-requests/moderation.requests.test.ts` — cùng mẫu mock:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ModerationApi from './moderation.requests';
import { privateApi } from '@/utils/axiosInstance';

vi.mock('@/utils/axiosInstance', () => ({
  privateApi: { get: vi.fn(), patch: vi.fn() },
}));

describe('ModerationApi', () => {
  beforeEach(() => {
    vi.mocked(privateApi.get).mockResolvedValue({ data: { success: true, data: null } });
    vi.mocked(privateApi.patch).mockResolvedValue({ data: { success: true, data: null } });
  });

  it('lists reports by status', async () => {
    await ModerationApi.reports({ status: 'new', page: 1, pageSize: 20 });
    expect(privateApi.get).toHaveBeenCalledWith('/admin/message-reports', {
      params: { status: 'new', page: 1, pageSize: 20 },
    });
  });

  it('opens one report with its context', async () => {
    await ModerationApi.report(9);
    expect(privateApi.get).toHaveBeenCalledWith('/admin/message-reports/9');
  });

  it('hides the message, not the report', async () => {
    await ModerationApi.hide(55);
    expect(privateApi.patch).toHaveBeenCalledWith('/admin/messages/55/hide');
  });

  it('dismisses the report', async () => {
    await ModerationApi.dismiss(9);
    expect(privateApi.patch).toHaveBeenCalledWith('/admin/message-reports/9/dismiss');
  });
});
```

- [x] **Bước 3: Chạy thấy đỏ** — `cd frontend && npm test -- names conversation.requests moderation.requests`. Expected: FAIL (module/hàm chưa có).

- [x] **Bước 4: Code**

`chat.types.ts` — thêm:

```ts
export type ReportReason = 'spam' | 'abuse' | 'scam' | 'other';
export type ReportStatus = 'new' | 'reviewed' | 'actioned';

/** Hàng đợi của admin (AdminReportListItemResource). */
export type ReportListItem = {
  reportId: number;
  messageId: number;
  conversationId: number;
  reason: ReportReason;
  note?: string;
  status: ReportStatus;
  reporterName: string;
  senderName: string;
  preview?: string;
  reportedAt: string;
};

/** Một tin trong cửa sổ ngữ cảnh (spec §8.3: tin bị báo + tối đa 5 tin mỗi bên). */
export type ModeratedMessage = {
  id: number;
  senderId: number;
  senderName: string;
  kind: 'text' | 'image';
  body?: string;
  hasPhoto: boolean;
  attachmentId?: number;
  reported: boolean;
  hidden: boolean;
  createdAt: string;
};

export type ReportDetail = Omit<ReportListItem, 'senderName' | 'preview'> & { context: ModeratedMessage[] };
```

và `ChatParticipant` + `farmerId?: number; stallName?: string;`, `ConversationSummary` + `otherReadAt?: string;`. (So từng tên trường với file `.java` ở Bước 1 — lệch thì theo `.java`.)

`conversation.requests.ts`: `open = async (farmerId: number)` gửi `{ farmerId }`; thêm

```ts
/** FR-116. Báo lần hai cùng một tin → 409 (uq_report_once). */
static report = async (messageId: number, body: { reason: ReportReason; note?: string }) => {
  const response = await privateApi.post<ApiResponse<unknown>>(`/messages/${messageId}/report`, body);
  return response.data;
};
```

`moderation.requests.ts`:

```ts
import type { ApiResponse, PageType } from '@/types/api.types';
import type { ReportDetail, ReportListItem, ReportStatus } from '@/types/chat.types';
import { privateApi } from '@/utils/axiosInstance';

/** FR-116 — kiểm duyệt tin nhắn của admin. Admin chỉ đọc được tin đã bị báo cáo (spec §8.3). */
class ModerationApi {
  static reports = async (params: { status?: ReportStatus; page: number; pageSize: number }) => {
    const response = await privateApi.get<ApiResponse<PageType<ReportListItem>>>('/admin/message-reports', {
      params,
    });
    return response.data;
  };

  static report = async (reportId: number) => {
    const response = await privateApi.get<ApiResponse<ReportDetail>>(`/admin/message-reports/${reportId}`);
    return response.data;
  };

  /** Ẩn mềm tin nhắn: cả hai người trong thread thấy nó biến mất qua sự kiện "hidden". */
  static hide = async (messageId: number) => {
    const response = await privateApi.patch<ApiResponse<unknown>>(`/admin/messages/${messageId}/hide`);
    return response.data;
  };

  static dismiss = async (reportId: number) => {
    const response = await privateApi.patch<ApiResponse<unknown>>(`/admin/message-reports/${reportId}/dismiss`);
    return response.data;
  };
}

export default ModerationApi;
```

`lib/chat/names.ts`:

```ts
import type { ChatParticipant } from '@/types/chat.types';

/** Khách nhắn cho một sạp: hiện tên stall; người kia là khách thì hiện tên người. */
export const displayName = (p: ChatParticipant) => p.stallName ?? p.fullName;
```

Thay `thread.other.fullName` (ThreadList) và `other.fullName` (ConversationPanel: tiêu đề, `aria-label`, `senderName`, dòng "đang gõ") bằng `displayName(...)`.

- [x] **Bước 5: Chạy thấy xanh** — `npm test` (cả suite: test cũ của ThreadList/Panel vẫn xanh vì fixture không có `stallName`). Rồi `npx prettier --write src && npm run lint`.

- [x] **Bước 6: Commit** — `feat(FR-116): chat data layer for reports, moderation and stall names`.

---

### Task 4: Hook — tin bị ẩn, "đã xem" khi tab hiện, lỗi gửi, tải thêm thread, "Seen" sau tải lại

**Files:**
- Modify: `frontend/src/lib/chat/merge.ts` (+ test), `useChat.ts` (+ test)
- Create: `frontend/src/lib/chat/errors.ts` (+ test)
- Modify: `frontend/src/components/chat/Composer.tsx` (+ test), `ConversationPanel.tsx`, `ThreadList.tsx` (+ test), `MessagesLayout.tsx`

**Interfaces:**
- Produces: `removeMessage(list, id)`; `sendErrorKey(error: unknown, what: 'text' | 'photo'): string` (key i18n dưới `chat.`); `useConversation(conversationId, opts?: { otherReadAt?: string })`; `useThreadList(activeId)` trả thêm `{ hasMore, loadMore, loadingMore }`; `<ThreadList … hasMore onLoadMore loadingMore />`.

- [ ] **Bước 1: Test đỏ — `merge.test.ts`**

```ts
describe('removeMessage', () => {
  it('drops the hidden message', () => {
    expect(removeMessage([msg(1), msg(2), msg(3)], 2).map((m) => m.id)).toEqual([1, 3]);
  });

  it('returns the same array when the message is not loaded', () => {
    const list = [msg(1)];
    expect(removeMessage(list, 9)).toBe(list);
  });
});
```

- [ ] **Bước 2: Test đỏ — `errors.test.ts`**

```ts
import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';
import { sendErrorKey } from './errors';

const http = (status: number) =>
  new AxiosError('x', 'ERR', undefined, undefined, {
    status, statusText: '', headers: {}, config: { headers: new AxiosHeaders() }, data: {},
  });

describe('sendErrorKey', () => {
  /** Review Focus #6: stall bị đình chỉ (D-09) — thread đọc được nhưng không gửi được. */
  it('says the stall is not taking messages on 409', () => {
    expect(sendErrorKey(http(409), 'text')).toBe('chat.closed');
  });

  it('asks to slow down on 429', () => {
    expect(sendErrorKey(http(429), 'text')).toBe('chat.tooFast');
  });

  it('names the photo problem on 413 and 415', () => {
    expect(sendErrorKey(http(413), 'photo')).toBe('chat.photoTooBig');
    expect(sendErrorKey(http(415), 'photo')).toBe('chat.photoType');
  });

  it('falls back to the plain message for anything else', () => {
    expect(sendErrorKey(new Error('network'), 'text')).toBe('chat.sendFailed');
    expect(sendErrorKey(new Error('network'), 'photo')).toBe('chat.photoFailed');
  });
});
```

- [ ] **Bước 3: Test đỏ — `useChat.test.ts`** (dùng đúng `emit`, `ok`, `summary`, `page` đang có trong file):

```ts
/** Review Focus #3: admin ẩn một tin → cả hai bên thấy nó biến mất ngay. */
it('removes a message an admin hid', async () => {
  const { result } = renderHook(() => useConversation(42));
  await waitFor(() => expect(result.current.messages).toHaveLength(3));

  emit('/user/topic/conversations', { type: 'hidden', conversationId: 42, messageId: 2 });

  expect(result.current.messages.map((m) => m.id)).toEqual([1, 3]);
});

/** Review Focus #7: tab ở nền thì chưa "xem"; hiện tab lên mới đánh dấu. */
it('waits until the tab is visible before marking read', async () => {
  const { result } = renderHook(() => useConversation(42));
  await waitFor(() => expect(result.current.messages).toHaveLength(3));
  vi.mocked(ConversationApi.markRead).mockClear();
  const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');

  emit('/user/topic/messages', msg(4));
  expect(ConversationApi.markRead).not.toHaveBeenCalled();

  visibility.mockReturnValue('visible');
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(ConversationApi.markRead).toHaveBeenCalledWith(42);
  visibility.mockRestore();
});

/** "Seen" còn sau khi tải lại: bắt đầu từ mốc đọc mà danh sách thread đã có. */
it('starts from the read marker the thread list already has', () => {
  const { result } = renderHook(() => useConversation(42, { otherReadAt: '2026-09-26T10:05:00Z' }));

  expect(result.current.otherReadAt).toBe('2026-09-26T10:05:00Z');
});
```

và trong `describe('useThreadList')`:

```ts
/** Review Focus #3: dòng xem trước có thể chính là tin vừa bị ẩn. */
it('refreshes the preview when a message is hidden', async () => {
  const { result } = renderHook(() => useThreadList());
  await waitFor(() => expect(result.current.threads).toHaveLength(1));
  vi.mocked(ConversationApi.list).mockClear();

  emit('/user/topic/conversations', { type: 'hidden', conversationId: 42, messageId: 5 });

  await waitFor(() => expect(ConversationApi.list).toHaveBeenCalled());
});

it('loads the next page of threads and knows when there is no more', async () => {
  vi.mocked(ConversationApi.list).mockResolvedValueOnce(
    ok({ items: [summary(42)], page: 1, pageSize: 20, total: 2 }),
  );
  const { result } = renderHook(() => useThreadList());
  await waitFor(() => expect(result.current.hasMore).toBe(true));
  vi.mocked(ConversationApi.list).mockResolvedValueOnce(
    ok({ items: [summary(43)], page: 2, pageSize: 20, total: 2 }),
  );

  await act(() => result.current.loadMore());

  expect(ConversationApi.list).toHaveBeenLastCalledWith({ page: 2, size: 20 });
  expect(result.current.threads.map((t) => t.id)).toEqual([42, 43]);
  expect(result.current.hasMore).toBe(false);
});
```

Thêm vào `Composer.test.tsx`:

```ts
it('says why a message could not be sent', async () => {
  const onSend = vi.fn().mockRejectedValue(Object.assign(new Error('x'), { isAxiosError: true, response: { status: 409 } }));
  render(<Composer onSend={onSend} onSendPhoto={vi.fn()} disabled={false} />);

  await userEvent.type(screen.getByLabelText('Write a message'), 'hi{Enter}');

  expect(await screen.findByRole('alert')).toHaveTextContent('This stall is not taking messages right now');
});
```

- [ ] **Bước 4: Chạy thấy đỏ** — `npm test -- merge errors useChat Composer`.

- [ ] **Bước 5: Code**

`merge.ts`:

```ts
/** Admin ẩn một tin (FR-116): bỏ nó khỏi thread đang mở. Không có thì trả đúng mảng cũ. */
export function removeMessage(list: ChatMessageItem[], messageId: number): ChatMessageItem[] {
  return list.some((m) => m.id === messageId) ? list.filter((m) => m.id !== messageId) : list;
}
```

`errors.ts`:

```ts
import { isAxiosError } from 'axios';

/** Lỗi gửi → key i18n dưới `chat.` nói đúng lý do (spec §6.3). */
export function sendErrorKey(error: unknown, what: 'text' | 'photo'): string {
  const status = isAxiosError(error) ? error.response?.status : undefined;
  if (status === 409) return 'chat.closed';
  if (status === 429) return 'chat.tooFast';
  if (what === 'photo' && status === 413) return 'chat.photoTooBig';
  if (what === 'photo' && status === 415) return 'chat.photoType';
  return what === 'photo' ? 'chat.photoFailed' : 'chat.sendFailed';
}
```

`useChat.ts`:
- `useConversation(conversationId, opts: { otherReadAt?: string } = {})`: `useState<string | null>(opts.otherReadAt ?? null)`; trong khối reset theo `shownFor`, `setOtherReadAt(opts.otherReadAt ?? null)`.
- Trong handler `CONVERSATIONS` của `useConversation`: `if (frame?.type === 'hidden' && frame.conversationId === id && frame.messageId) setMessages((c) => removeMessage(c, frame.messageId!));`.
- Đánh dấu đọc khi tab hiện: thay `markRead(id)` trong handler `MESSAGES` bằng `readWhenVisible(id)`:

```ts
const pendingRead = useRef<number | null>(null);
// …trong effect socket:
const readWhenVisible = () => {
  if (document.visibilityState === 'visible') markRead(id);
  else pendingRead.current = id;
};
const onVisible = () => {
  if (document.visibilityState === 'visible' && pendingRead.current === id) {
    pendingRead.current = null;
    markRead(id);
  }
};
document.addEventListener('visibilitychange', onVisible);
// cleanup: document.removeEventListener('visibilitychange', onVisible);
```

- `useThreadList`: giữ `pageRef = useRef(1)` và `total` state; `fetchList` đặt `pageRef.current = 1`, `setTotal(response.data.total)`; thêm

```ts
const [loadingMore, setLoadingMore] = useState(false);
const loadMore = useCallback(async () => {
  if (loadingMore) return;
  setLoadingMore(true);
  try {
    const next = pageRef.current + 1;
    const response = await ConversationApi.list({ page: next, size: THREAD_PAGE });
    pageRef.current = next;
    // Thread nhảy lên đầu giữa hai trang có thể xuất hiện hai lần: khử trùng theo id
    setThreads((current) => {
      const have = new Set(current.map((t) => t.id));
      return clearUnread([...current, ...response.data.items.filter((t) => !have.has(t.id))], activeRef.current);
    });
    setTotal(response.data.total);
  } catch {
    /* giữ nguyên; bấm lại là thử lại */
  } finally {
    setLoadingMore(false);
  }
}, [loadingMore]);
const hasMore = threads.length < total;
```

và trong handler `CONVERSATIONS` của `useThreadList`: `if (frame.type === 'hidden') { refresh(); return; }`.
- `Composer`: `setFailed(t(sendErrorKey(error, 'text')))` trong `catch (error)` của `submit`; tương tự `'photo'` trong `pickPhoto`.
- `ConversationPanel`: `useConversation(conversationId, { otherReadAt: other?.otherReadAt })` — **sai chỗ**: `otherReadAt` nằm ở `ConversationSummary`, không ở participant. Đổi prop của panel thành `thread: ConversationSummary | null` thay cho `other`, đọc `thread.other` và `thread.otherReadAt`; `MessagesLayout` truyền `thread={active}`. Sửa test Panel/Pages theo prop mới.
- `ThreadList`: props mới `hasMore?: boolean; loadingMore?: boolean; onLoadMore?: () => void`; cuối `<ul>`: `{hasMore ? <li className="p-3"><Button variant="secondary" size="sm" disabled={loadingMore} onClick={onLoadMore}>{t('chat.moreThreads')}</Button></li> : null}`. Test: `shows a way to load more conversations`.
- Key en mới (gộp vào khối `chat`): `closed` "This stall is not taking messages right now.", `tooFast` "You are sending too fast. Wait a moment and try again.", `photoTooBig` "That photo is over 5 MB. Choose a smaller one.", `photoType` "Choose a JPEG, PNG or WebP photo.", `moreThreads` "Load more conversations".

- [ ] **Bước 6: Chạy thấy xanh** — `npm test`, prettier, lint.
- [ ] **Bước 7: Commit** — `feat(FR-116): drop hidden messages live, read only when seen, and say why a send failed`.

---

### Task 5: Báo cáo một tin nhắn

**Files:**
- Create: `frontend/src/components/chat/ReportDialog.tsx` (+ test)
- Modify: `frontend/src/components/chat/MessageBubble.tsx`, `ConversationPanel.tsx` (+ test)

**Interfaces:**
- Produces: `<ReportDialog messageId={number | null} onClose={() => void} onReported={(messageId: number) => void} />`; `MessageBubble` thêm `onReport?: () => void; reported?: boolean` (chỉ có nghĩa với tin của người kia).

- [ ] **Bước 1: Test đỏ — `ReportDialog.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReportDialog from './ReportDialog';
import ConversationApi from '@/api-requests/conversation.requests';

vi.mock('@/api-requests/conversation.requests', () => ({ default: { report: vi.fn() } }));

// jsdom chưa có showModal / close của <dialog>
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) { this.open = true; });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) { this.open = false; });
  vi.mocked(ConversationApi.report).mockReset();
});

const setup = () => {
  const onReported = vi.fn();
  render(<ReportDialog messageId={55} onClose={vi.fn()} onReported={onReported} />);
  return { onReported };
};

describe('ReportDialog', () => {
  it('sends the reason and the note', async () => {
    vi.mocked(ConversationApi.report).mockResolvedValue({} as never);
    const { onReported } = setup();

    await userEvent.click(screen.getByLabelText(/scam/i));
    await userEvent.type(screen.getByLabelText(/tell us more/i), 'asks for a deposit');
    await userEvent.click(screen.getByRole('button', { name: /^report$/i }));

    expect(ConversationApi.report).toHaveBeenCalledWith(55, { reason: 'scam', note: 'asks for a deposit' });
    expect(onReported).toHaveBeenCalledWith(55);
  });

  it('will not send without a reason, and says why', async () => {
    setup();

    expect(screen.getByRole('button', { name: /^report$/i })).toBeDisabled();
    expect(screen.getByText(/choose a reason/i)).toBeInTheDocument();
  });

  /** Review Focus #4: báo lần hai → 409 → coi như đã báo. */
  it('treats a second report as already reported', async () => {
    vi.mocked(ConversationApi.report).mockRejectedValue(
      Object.assign(new Error('x'), { isAxiosError: true, response: { status: 409 } }),
    );
    const { onReported } = setup();

    await userEvent.click(screen.getByLabelText(/spam/i));
    await userEvent.click(screen.getByRole('button', { name: /^report$/i }));

    expect(onReported).toHaveBeenCalledWith(55);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps the dialog open and says so when the report fails', async () => {
    vi.mocked(ConversationApi.report).mockRejectedValue(new Error('network'));
    const { onReported } = setup();

    await userEvent.click(screen.getByLabelText(/abuse/i));
    await userEvent.click(screen.getByRole('button', { name: /^report$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not send the report/i);
    expect(onReported).not.toHaveBeenCalled();
  });
});
```

Thêm vào `ConversationPanel.test.tsx`:

```tsx
/** Chỉ báo cáo được tin của người kia; tin của mình không có nút. */
it('offers Report only on the other person’s messages', () => {
  useConversation.mockReturnValue(state({ messages: [mine(1, 1), { ...mine(2, 2), senderId: 3 }] }));
  render(<ConversationPanel conversationId={42} thread={thread} />);

  expect(screen.getAllByRole('button', { name: /report this message/i })).toHaveLength(1);
});
```

(`thread` là fixture `ConversationSummary` bọc `other` — tạo cùng Task 4 khi đổi prop.)

- [ ] **Bước 2: Chạy thấy đỏ** — `npm test -- ReportDialog ConversationPanel`.

- [ ] **Bước 3: Code — `ReportDialog.tsx`**

```tsx
import { isAxiosError } from 'axios';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ConversationApi from '@/api-requests/conversation.requests';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import type { ReportReason } from '@/types/chat.types';

const REASONS: ReportReason[] = ['spam', 'abuse', 'scam', 'other'];
const NOTE_MAX = 255;

type Props = { messageId: number | null; onClose: () => void; onReported: (messageId: number) => void };

/** FR-116. Mở khi `messageId` khác null. Người dùng dựng lại bằng `key={messageId}` nên state tự sạch mỗi lần mở. */
export default function ReportDialog({ messageId, onClose, onReported }: Props) {
  const { t } = useTranslation('common');
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const submit = async () => {
    if (messageId === null || !reason || busy) return;
    setBusy(true);
    setFailed(false);
    try {
      await ConversationApi.report(messageId, { reason, note: note.trim() || undefined });
      onReported(messageId);
    } catch (error) {
      // uq_report_once: đã báo rồi thì kết quả với người dùng là như nhau
      if (isAxiosError(error) && error.response?.status === 409) onReported(messageId);
      else setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={messageId !== null}
      title={t('chat.reportTitle')}
      onClose={onClose}
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>{t('chat.cancel')}</Button>
          <Button variant="danger" disabled={!reason || busy} onClick={() => void submit()}>
            {t('chat.report')}
          </Button>
        </>
      }
    >
      <fieldset className="flex flex-col gap-2 border-0 p-0">
        <legend className="text-small text-ink-muted mb-2">{t('chat.reportWhy')}</legend>
        {REASONS.map((r) => (
          <label key={r} className="flex items-center gap-2 font-sans">
            <input type="radio" name="report-reason" value={r} checked={reason === r} onChange={() => setReason(r)} />
            {t(`chat.reason.${r}`)}
          </label>
        ))}
      </fieldset>
      <label className="mt-4 flex flex-col gap-1 font-sans">
        <span>{t('chat.reportNote')}</span>
        <textarea
          value={note}
          maxLength={NOTE_MAX}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className="border-line-strong bg-surface text-ink rounded-md border p-2"
        />
        <span className="text-small text-ink-muted">{t('chat.noteLeft', { count: NOTE_MAX - note.length })}</span>
      </label>
      {!reason ? <p className="text-small text-ink-muted mt-2">{t('chat.chooseReason')}</p> : null}
      {failed ? <p role="alert" className="text-small text-danger mt-2">{t('chat.reportFailed')}</p> : null}
    </Dialog>
  );
}
```

`MessageBubble`: trong `.ml-msg-meta`, sau giờ: `{!mine && onReport ? (reported ? <span>{t('chat.reported')}</span> : <button type="button" className="text-ink-muted underline" aria-label={t('chat.reportThis')} onClick={onReport}>{t('chat.report')}</button>) : null}`.

`ConversationPanel`: state `reportingId: number | null`, `reportedIds: Set<number>`; truyền `onReport={() => setReportingId(message.id)}` và `reported={reportedIds.has(message.id)}` cho tin của người kia; render `<ReportDialog key={reportingId ?? 'none'} messageId={reportingId} onClose={() => setReportingId(null)} onReported={(id) => { setReportedIds((s) => new Set(s).add(id)); setReportingId(null); Notification.success({ text: t('chat.reportThanks') }); }} />`. (Kiểm `Notification.success` nhận `{ text }` — `grep -n "static success" src/utils/notification.ts`.)

Key en (gộp): `reportTitle` "Report this message", `reportWhy` "Why are you reporting it?", `reason.spam` "Spam or advertising", `reason.abuse` "Rude or abusive", `reason.scam` "Scam or asks for money", `reason.other` "Something else", `reportNote` "Tell us more (optional)", `noteLeft_one`/`_other` "{{count}} character left"/"{{count}} characters left", `chooseReason` "Choose a reason to send the report.", `report` "Report", `reportThis` "Report this message", `reported` "Reported", `reportFailed` "We could not send the report. Try again.", `reportThanks` "Thanks. An admin will look at this message.", `cancel` "Cancel".

- [ ] **Bước 4: Chạy thấy xanh** — `npm test`, prettier, lint, build.
- [ ] **Bước 5: Commit** — `feat(FR-116): let a member report a message`.

---

### Task 6: Tab "Reported messages" của admin

**Files:**
- Create: `frontend/src/pages/admin/Moderation/ReportedMessages.tsx` (+ test `ReportedMessages.test.tsx`)
- Modify: `frontend/src/pages/admin/Moderation/index.tsx` (thêm tab), `frontend/src/locales/en/AdminModeration.json`

**Interfaces:**
- Consumes: `ModerationApi` (Task 3), `ChatPhoto` (4A), `useRequest`, `Tabs`, `Dialog`, `DataState`/`LoadError`, `chatWhen`.
- Produces: `<ReportedMessages />` — tự tải, không nhận prop.

- [ ] **Bước 1: Đọc** `pages/admin/Moderation/index.tsx`: cách khai báo `tabs` cho `<Tabs>`, và namespace `AdminModeration`.

- [ ] **Bước 2: Test đỏ — `ReportedMessages.test.tsx`**

```tsx
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReportedMessages from './ReportedMessages';
import ModerationApi from '@/api-requests/moderation.requests';

vi.mock('@/api-requests/moderation.requests', () => ({
  default: { reports: vi.fn(), report: vi.fn(), hide: vi.fn(), dismiss: vi.fn() },
}));
vi.mock('@/components/chat/ChatPhoto', () => ({ default: () => <span>photo</span> }));

const ok = <T,>(data: T) => ({ success: true, message: 'OK', data, timestamp: '' }) as never;
const row = {
  reportId: 9, messageId: 55, conversationId: 42, reason: 'scam', status: 'new',
  reporterName: 'An', senderName: 'Cô Tư', preview: 'Chuyển khoản trước 500k', reportedAt: '2026-09-26T09:00:00Z',
};
const detail = {
  ...row,
  context: [
    { id: 54, senderId: 7, senderName: 'An', kind: 'text', body: 'Còn rau không?', hasPhoto: false, reported: false, hidden: false, createdAt: '2026-09-26T08:58:00Z' },
    { id: 55, senderId: 3, senderName: 'Cô Tư', kind: 'text', body: 'Chuyển khoản trước 500k', hasPhoto: false, reported: true, hidden: false, createdAt: '2026-09-26T08:59:00Z' },
  ],
};

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) { this.open = true; });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) { this.open = false; });
  vi.mocked(ModerationApi.reports).mockResolvedValue(ok({ items: [row], page: 1, pageSize: 20, total: 1 }));
  vi.mocked(ModerationApi.report).mockResolvedValue(ok(detail));
  vi.mocked(ModerationApi.hide).mockResolvedValue(ok(null));
  vi.mocked(ModerationApi.dismiss).mockResolvedValue(ok(null));
});

describe('ReportedMessages', () => {
  /** Spec §8.3/§9.4: ranh giới của admin phải ghi thẳng trên màn. */
  it('tells the admin what they can and cannot read', async () => {
    render(<ReportedMessages />);
    expect(await screen.findByText(/only messages someone reported/i)).toBeInTheDocument();
  });

  it('lists new reports first, with the reason and who reported it', async () => {
    render(<ReportedMessages />);
    expect(await screen.findByText('Chuyển khoản trước 500k')).toBeInTheDocument();
    expect(ModerationApi.reports).toHaveBeenCalledWith({ status: 'new', page: 1, pageSize: 20 });
    expect(screen.getByText(/scam/i)).toBeInTheDocument();
    expect(screen.getByText(/an/i)).toBeInTheDocument();
  });

  it('opens the report with the messages around it, the reported one marked', async () => {
    render(<ReportedMessages />);
    await userEvent.click(await screen.findByRole('button', { name: /review/i }));

    const context = await screen.findByRole('list', { name: /messages around/i });
    expect(within(context).getAllByRole('listitem')).toHaveLength(2);
    expect(within(context).getByText('Chuyển khoản trước 500k').closest('li')).toHaveAttribute('aria-current', 'true');
  });

  it('hides the message after confirming, and drops the row from the queue', async () => {
    render(<ReportedMessages />);
    await userEvent.click(await screen.findByRole('button', { name: /review/i }));
    await userEvent.click(await screen.findByRole('button', { name: /hide message/i }));
    await userEvent.click(screen.getByRole('button', { name: /^hide$/i }));

    expect(ModerationApi.hide).toHaveBeenCalledWith(55);
    expect(screen.queryByText('Chuyển khoản trước 500k')).not.toBeInTheDocument();
  });

  it('dismisses the report without hiding anything', async () => {
    render(<ReportedMessages />);
    await userEvent.click(await screen.findByRole('button', { name: /review/i }));
    await userEvent.click(await screen.findByRole('button', { name: /dismiss/i }));

    expect(ModerationApi.dismiss).toHaveBeenCalledWith(9);
    expect(ModerationApi.hide).not.toHaveBeenCalled();
  });

  it('shows an empty queue with something useful to say', async () => {
    vi.mocked(ModerationApi.reports).mockResolvedValue(ok({ items: [], page: 1, pageSize: 20, total: 0 }));
    render(<ReportedMessages />);
    expect(await screen.findByText(/no reported messages/i)).toBeInTheDocument();
  });
});
```

- [ ] **Bước 3: Chạy thấy đỏ.**

- [ ] **Bước 4: Code — `ReportedMessages.tsx`**

Cấu trúc (đủ 4 trạng thái FR-084):
- `Banner` (hoặc đoạn `text-ink-muted`) trên cùng: `t('messages.boundary')`.
- Bộ lọc trạng thái bằng `SelectField` (`new` mặc định, `reviewed`, `actioned`) → `useRequest(\`reports:${status}\`, () => ModerationApi.reports({ status, page: 1, pageSize: 20 }).then((r) => r.data.items))`.
- Loading: `role="status"`; error: `<LoadError noun={t('messages.noun')} onRetry={retry} />`; rỗng: `DataState` `t('messages.emptyTitle')`/`t('messages.emptyText')`.
- Mỗi dòng: preview (hoặc `t('messages.photo')`), `t(\`messages.reason.${reason}\`)`, người báo, người gửi, `chatWhen(reportedAt)`, nút **Review** (`aria-label` "Review report from {{name}}").
- Review → `ModerationApi.report(reportId)` → khối chi tiết: `<ol aria-label={t('messages.context')}>` từng tin `<li aria-current={m.reported ? 'true' : undefined}>` với tên người gửi, giờ, `body`, `m.hasPhoto && m.attachmentId ? <ChatPhoto key={m.attachmentId} attachment={{ attachmentId: m.attachmentId, url: '', width: null, height: null }} alt={…} /> : null`, và nhãn `t('messages.hidden')` nếu `hidden`. Tin bị báo có viền `border-danger`.
- Hai nút: **Hide message** (`variant="danger"`) mở `Dialog tone="danger"` xác nhận → `ModerationApi.hide(messageId)` → `mutate((items) => items.filter((r) => r.reportId !== reportId))`, đóng chi tiết, `Notification.success`; **Dismiss** (`variant="secondary"`) → `ModerationApi.dismiss(reportId)` → bỏ dòng khỏi hàng đợi. Lỗi → `Notification.error` với `Helper` message chuẩn của dự án (`grep -n "static error\|errorMessage" src/utils/*.ts`).
- Chỉ lọc khỏi danh sách khi đang xem `status === 'new'`.

`index.tsx`: thêm `{ value: 'messages', label: t('tabs.messages') }` vào `tabs`, và `{tab === 'messages' ? <ReportedMessages /> : null}` cạnh hai tab cũ.

Key en `AdminModeration.json` (gộp): `tabs.messages` "Reported messages", `messages.boundary` "You can read only messages someone reported, plus up to five on each side for context. Nothing else in a conversation is open to admins.", `messages.noun` "reports", `messages.emptyTitle` "No reported messages", `messages.emptyText` "When a customer or a stall reports a message, it waits here for you.", `messages.photo` "Photo", `messages.reason.spam|abuse|scam|other`, `messages.reportedBy` "Reported by {{name}}", `messages.sentBy` "Sent by {{name}}", `messages.review` "Review", `messages.reviewLabel` "Review report from {{name}}", `messages.context` "Messages around the reported one", `messages.hidden` "Hidden", `messages.hide` "Hide message", `messages.hideTitle` "Hide this message?", `messages.hideText` "Both people in the conversation stop seeing it. The report is marked as actioned.", `messages.hideConfirm` "Hide", `messages.dismiss` "Dismiss report", `messages.hidden_toast` "Message hidden.", `messages.dismissed_toast` "Report dismissed.", `messages.status.new|reviewed|actioned` "New"/"Reviewed"/"Actioned", `messages.statusLabel` "Status".

- [ ] **Bước 5: Chạy thấy xanh** — `npm test`, prettier, lint, build.
- [ ] **Bước 6: Commit** — `feat(FR-116): reported messages tab for admins`.

---

### Task 7: Số chưa đọc trên header và popover (FR-113, FR-117)

**Files:**
- Create: `frontend/src/lib/chat/unreadStore.ts` (+ test), `frontend/src/hooks/useChatUnread.ts`, `frontend/src/components/chat/ChatUnreadCenter.tsx` (+ test)
- Create: `frontend/src/components/ui/popover.tsx` (+ test), `frontend/src/components/chat/MessagesPreview.tsx` (+ test), `frontend/src/components/notifications/NotificationsPreview.tsx` (+ test)
- Modify: `frontend/src/App.tsx` (gắn `ChatUnreadCenter` cạnh `NotificationCenter`), `frontend/src/components/Header/index.tsx`, `frontend/src/components/notifications/NotificationBell.tsx`, `frontend/src/layout/FarmerLayout.tsx`

**Interfaces:**
- Produces: `ChatUnreadStore { getUnread(): number; setUnread(n: number): void; subscribe(cb): () => void }`; `useChatUnread(): number`; `<Popover label={string} trigger={ReactNode} to={string} badge?: number>{panel}</Popover>`; `<MessagesPreview to={string} />`; `<NotificationsPreview to={string} />`.

- [ ] **Bước 1: Test đỏ**

`unreadStore.test.ts` — giống hệt hành vi `NotificationStore` (setUnread chặn số âm, không phát sự kiện khi không đổi):

```ts
import { describe, expect, it, vi } from 'vitest';
import { ChatUnreadStore } from './unreadStore';

describe('ChatUnreadStore', () => {
  it('tells subscribers when the count changes, and only then', () => {
    const cb = vi.fn();
    const off = ChatUnreadStore.subscribe(cb);
    ChatUnreadStore.setUnread(3);
    ChatUnreadStore.setUnread(3);
    off();
    expect(cb).toHaveBeenCalledTimes(1);
    expect(ChatUnreadStore.getUnread()).toBe(3);
  });

  it('never goes below zero', () => {
    ChatUnreadStore.setUnread(-2);
    expect(ChatUnreadStore.getUnread()).toBe(0);
  });
});
```

`ChatUnreadCenter.test.tsx` — mock `ConversationApi.unreadCount`, `realtime` (subscribe + onConnect như `useChat.test.ts`), `useSession` trả user:

```tsx
it('loads the count, then refreshes it when a conversation event arrives', async () => {
  vi.mocked(ConversationApi.unreadCount).mockResolvedValueOnce(ok({ count: 2 })).mockResolvedValueOnce(ok({ count: 5 }));
  render(<ChatUnreadCenter />);
  await waitFor(() => expect(ChatUnreadStore.getUnread()).toBe(2));

  emit('/user/topic/conversations', { type: 'updated', conversationId: 42, unreadCount: 3 });

  await waitFor(() => expect(ChatUnreadStore.getUnread()).toBe(5));
});

it('catches up after the socket reconnects', async () => { /* onConnect listener → unreadCount gọi lại */ });

it('resets to zero when nobody is signed in', () => { /* useSession user=null → 0, không gọi API */ });
```

`popover.test.tsx` (Review Focus #5):

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { Popover } from './popover';

const setup = () =>
  render(
    <MemoryRouter>
      <button>before</button>
      <Popover label="Messages" to="/messages" trigger={<span>icon</span>}>
        <p>panel body</p>
      </Popover>
    </MemoryRouter>,
  );

describe('Popover', () => {
  it('opens on click and keyboard, closes on Escape and outside click', async () => {
    setup();
    const button = screen.getByRole('button', { name: 'Messages' });
    expect(button).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(button);
    expect(screen.getByText('panel body')).toBeVisible();
    expect(button).toHaveAttribute('aria-expanded', 'true');

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByText('panel body')).not.toBeInTheDocument();
    expect(button).toHaveFocus();

    button.focus();
    await userEvent.keyboard('{Enter}');
    expect(screen.getByText('panel body')).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'before' }));
    expect(screen.queryByText('panel body')).not.toBeInTheDocument();
  });

  it('opens on hover for a mouse', async () => {
    setup();
    await userEvent.hover(screen.getByRole('button', { name: 'Messages' }));
    expect(screen.getByText('panel body')).toBeVisible();
  });

  it('always offers the full page', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Messages' }));
    expect(screen.getByRole('link', { name: /see all/i })).toHaveAttribute('href', '/messages');
  });
});
```

`MessagesPreview.test.tsx`: mock `ConversationApi.list` → 5 thread → hiện **4** thread đầu (tên stall qua `displayName`, dòng cuối, `chatWhen`, chấm chưa đọc có chữ sr-only); lỗi → câu lỗi ngắn; rỗng → câu rỗng. `NotificationsPreview.test.tsx`: tương tự với `NotificationApi.list({ page: 1, size: 4 })` (kiểm chữ ký thật: `grep -n "static list" src/api-requests/notification.requests.ts`).

Header test (thêm vào file test của Header nếu có, không thì tạo `components/Header/Header.test.tsx`): mock `useChatUnread` → 3 → nút tin nhắn có tên "Messages, 3 unread".

- [ ] **Bước 2: Chạy thấy đỏ.**

- [ ] **Bước 3: Code**

`unreadStore.ts` — chép đúng mẫu `lib/notifications/store.ts` (biến module `unread`, sự kiện `chat-unread` trên `window`), bỏ phần frame.

`useChatUnread.ts`:

```ts
import { useSyncExternalStore } from 'react';
import { ChatUnreadStore } from '@/lib/chat/unreadStore';

/** FR-113: tổng số tin chưa đọc, tự cập nhật khi đang ở trang khác. */
const useChatUnread = () => useSyncExternalStore(ChatUnreadStore.subscribe, ChatUnreadStore.getUnread, () => 0);
export default useChatUnread;
```

`ChatUnreadCenter.tsx` — không render gì; `useSession()`; có user thì: gọi `ConversationApi.unreadCount()` → `setUnread`; `realtime.subscribe('/user/topic/conversations', …)` → mỗi khung `updated`/`read`/`hidden` gọi lại `unreadCount()` (gộp các khung tới dồn dập bằng một `setTimeout` 300 ms); `realtime.onConnect(refresh)`. Không có user → `setUnread(0)`. **Không** gọi `realtime.start()/stop()` — `NotificationCenter` đã giữ vòng đời kết nối.

`popover.tsx`:

```tsx
import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import Helper from '@/utils/helper';

type Props = {
  label: string;
  trigger: ReactNode;
  /** Trang đầy đủ; panel luôn có link "See all" tới đây (điện thoại không hover được). */
  to: string;
  children: ReactNode;
  buttonClassName?: string;
};

/**
 * Popover của header (spec §9.1): hover **và** click/phím, Esc hoặc bấm ra ngoài để đóng, `aria-expanded` trên nút.
 * Panel `shadow-pop`, `z-50` — trên header (`z-40`).
 */
export function Popover({ label, trigger, to, children, buttonClassName }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Rê chuột từ nút sang panel đi qua một khe nhỏ: đợi một nhịp trước khi đóng
  const enter = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const leave = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  };

  return (
    <div ref={root} className="relative" onPointerEnter={(e) => e.pointerType === 'mouse' && enter()} onPointerLeave={(e) => e.pointerType === 'mouse' && leave()}>
      <button
        ref={button}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={buttonClassName}
      >
        {trigger}
      </button>
      {open ? (
        <div id={panelId} className="bg-surface-raised text-ink shadow-pop border-line-strong absolute top-full right-0 z-50 mt-2 w-80 max-w-[calc(100vw-32px)] rounded-md border p-2">
          {children}
          <Link to={to} onClick={() => setOpen(false)} className={Helper.cn('text-brand block p-2 text-center font-sans font-semibold')}>
            {t('header.seeAll')}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
```

(userEvent.hover phát `pointerType: 'mouse'`. Nếu test hover đỏ vì jsdom không đặt `pointerType`, đổi sang `onMouseEnter`/`onMouseLeave` và ledger lại.)

`MessagesPreview.tsx`: `useRequest('chat-preview', () => ConversationApi.list({ page: 1, size: 4 }).then((r) => r.data.items))`; mỗi thread là `<Link to={\`${to}?c=${id}\`}>` với `displayName`, `lastMessageText`, `chatWhen(lastMessageAt)`, chấm `bg-accent` + `<span className="sr-only">{t('chat.unreadCount', { count })}</span>` (thay `aria-label` trên `span` — minor của 4A). Làm mới khi `useChatUnread()` đổi (đưa số vào key của `useRequest`).

`NotificationsPreview.tsx`: cùng khuôn với `NotificationApi.list(... size 4)`; mỗi dòng mở `item.link` như `NotificationList` đang làm.

Header (`components/Header/index.tsx`):
- Thay `Link` tin nhắn bằng `<Popover label={chatUnread ? t('header.messagesUnread', { count: chatUnread }) : t('header.messages')} to={messagesTo} buttonClassName={iconButton} trigger={<><ChatIcon />{chatUnread > 0 && <span aria-hidden="true" className={badge}>{chatUnread > 99 ? '99+' : chatUnread}</span>}</>}><MessagesPreview to={messagesTo} /></Popover>`, `chatUnread = useChatUnread()`.
- Chuông tương tự với `NotificationsPreview` và `unreadCount` đang có.
- **Sửa tràn ngang 768px** (phát hiện ở 4A): nav chính `hidden lg:block` (thay `md:block`), nút menu `lg:hidden` (thay `md:hidden`), tìm kiếm `max-lg:hidden`. Kiểm `MenuMobile` vẫn chứa đủ mục nav.

`NotificationBell.tsx` (DashboardShell của Farmer/Admin): bọc bằng `Popover` + `NotificationsPreview`, giữ badge.

`FarmerLayout.tsx`: `count: 1` → `count: useChatUnread() || undefined`.

`App.tsx`: `<ChatUnreadCenter />` ngay sau `<NotificationCenter />`.

Key en `common.json` (gộp, khối `header`): `seeAll` "See all", `messagesUnread_one` "Messages, {{count}} unread", `messagesUnread_other` "Messages, {{count}} unread"; khối `chat`: `previewEmpty` "No conversations yet.", `previewError` "Could not load your conversations."; khối `notify` hoặc `header`: `notificationsEmpty` "No notifications yet.", `notificationsError` "Could not load notifications." (đặt vào khối đang dùng cho chuông — xem `NotificationList`).

- [ ] **Bước 4: Chạy thấy xanh** — `npm test`, prettier, lint, build.
- [ ] **Bước 5: Commit** — `feat(FR-117): live unread counts and header previews for messages and notifications`.

---

### Task 8: "Message this stall" và ghim sản phẩm

**Files:**
- Create: `frontend/src/components/chat/MessageStallButton.tsx` (+ test), `frontend/src/components/chat/ProductPin.tsx` (+ test)
- Modify: `frontend/src/pages/public/ProductDetail/index.tsx`, `frontend/src/pages/public/StallProfile/index.tsx`
- Modify: `frontend/src/components/chat/MessagesLayout.tsx`, `ConversationPanel.tsx`, `Composer.tsx`, `MessageBubble.tsx`, `frontend/src/lib/chat/useChat.ts` (+ tests)

**Interfaces:**
- Consumes: `ConversationApi.open(farmerId)` (Task 3), `ProductApi.get(id)`.
- Produces: `<MessageStallButton farmerId={number} productId?={number} />`; `/messages?c=<conversationId>&product=<productId>` mở thẳng thread và ghim sản phẩm vào ô soạn; `send(body, { productId })`; `<ProductPin productId={number} />`.

- [ ] **Bước 1: Test đỏ — `MessageStallButton.test.tsx`**

```tsx
it('opens the thread and lands on it with the product pinned', async () => {
  vi.mocked(ConversationApi.open).mockResolvedValue(ok({ id: 42, other: {...}, unreadCount: 0, ... }));
  render(<MemoryRouter><MessageStallButton farmerId={30} productId={8} /><Routes>…</Routes></MemoryRouter>);
  await userEvent.click(screen.getByRole('button', { name: /message this stall/i }));
  expect(ConversationApi.open).toHaveBeenCalledWith(30);
  expect(location.pathname + location.search).toBe('/messages?c=42&product=8');
});

it('sends a signed-out visitor to sign in first, then back here', …)

/** Review Focus #2 */
it('explains that you cannot message your own stall', async () => {
  vi.mocked(ConversationApi.open).mockRejectedValue(axios400);
  … expect(await screen.findByText(/this is your own stall/i)).toBeInTheDocument();
});

it('says so when the stall is not taking new conversations (403)', …)
```

(Dùng `MemoryRouter` + một route bắt `*` ghi `useLocation()` ra màn để khẳng định URL; `useSession` mock có/không có user. Trang đăng nhập: kiểm tham số redirect dự án đang dùng — `grep -rn "redirect" src/pages/auth/Login/index.tsx`.)

`ProductPin.test.tsx`: mock `ProductApi.get` → hiện tên, `perUnit(price, unit)`, link `/products/8`; lỗi 404 → "This product is no longer listed." (không vỡ bong bóng).

`useChat.test.ts`: `send('hi', { productId: 8 })` → `ConversationApi.send(42, { body: 'hi', productId: 8 })`.

`Composer.test.tsx`: có `pinnedProductId={8}` → hiện chip ghim có nút "Remove"; gửi → `onSend('hi', { productId: 8 })`; gửi xong chip biến mất (ghim đi theo **một** tin).

`MessagesLayout` test (trong `pages/customer/Messages/index.test.tsx`): render ở `/messages?c=42` → mở sẵn thread 42 (`useThreadList` được gọi với 42); có `location.state.thread` thì dùng nó khi thread chưa có trong danh sách.

- [ ] **Bước 2: Chạy thấy đỏ.**

- [ ] **Bước 3: Code**

`MessageStallButton.tsx`:

```tsx
/** FR-114, spec §9.5. Chỉ Customer mở được thread (Farmer vẫn giữ quyền Customer — FR-005); server kiểm lại. */
export default function MessageStallButton({ farmerId, productId }: { farmerId: number; productId?: number }) {
  const { t } = useTranslation('common');
  const { user } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const open = async () => {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`);
      return;
    }
    setBusy(true);
    setProblem(null);
    try {
      const response = await ConversationApi.open(farmerId);
      const thread = response.data;
      const to = user.role === 'farmer' ? '/farmer/messages' : '/messages';
      const query = new URLSearchParams({ c: String(thread.id), ...(productId ? { product: String(productId) } : {}) });
      navigate(`${to}?${query}`, { state: { thread } });
    } catch (error) {
      const status = isAxiosError(error) ? error.response?.status : undefined;
      setProblem(t(status === 400 ? 'chat.ownStall' : status === 403 ? 'chat.stallClosed' : 'chat.openFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <Button variant="secondary" disabled={busy} onClick={() => void open()}>{t('chat.messageStall')}</Button>
      {problem ? <p role="alert" className="text-small text-ink-muted">{problem}</p> : null}
    </div>
  );
}
```

(Tham số redirect: dùng đúng tên dự án đang dùng, tìm ở Bước 1. Giá trị role: so với `USER_ROLE.FARMER` trong `@/constants`.)

`MessagesLayout`: `const [params, setParams] = useSearchParams()`; `activeId` khởi tạo từ `Number(params.get('c')) || null`; `pinnedProductId = Number(params.get('product')) || undefined`; `const fallback = (useLocation().state as { thread?: ConversationSummary } | null)?.thread`; `active = threads.find(…) ?? (fallback?.id === activeId ? fallback : null)`. Chọn thread khác hoặc Back → `setParams({})` (bỏ `product` để ghim không đi theo sang thread khác). Truyền `pinnedProductId` cho `ConversationPanel` → `Composer`.

`useChat.send(body: string, extra: { productId?: number } = {})` → `ConversationApi.send(id, { body, ...extra })`.

`Composer`: prop `pinnedProductId?: number` + `onUnpin?: () => void`; chip `<ProductPin productId compact />` + nút "Remove" (gọi `onUnpin`); `onSend(text, pinnedProductId ? { productId: pinnedProductId } : {})`; gửi thành công → `onUnpin?.()`.

`ProductPin.tsx`: `useRequest(\`product:${productId}\`, () => ProductApi.get(productId))` → thẻ nhỏ `bg-surface border-line-strong rounded-md p-2` với tên (`font-sans font-semibold`), giá `font-hand` qua `perUnit`, link `/products/${productId}`; lỗi → `t('chat.productGone')`.

`MessageBubble`: `message.productId ? <ProductPin productId={message.productId} /> : null` phía trên phần chữ.

Trang: `ProductDetail` đặt `<MessageStallButton farmerId={p.farmerId} productId={p.id} />` cạnh link tên stall (chỉ khi `p.farmerId`); `StallProfile` thay `<ButtonLink to="/messages">{t('message')}</ButtonLink>` bằng `<MessageStallButton farmerId={stall.farmerId} />` và xoá key `message` khỏi namespace nếu không còn chỗ dùng (grep trước).

Key en `chat` (gộp): `messageStall` "Message this stall", `ownStall` "This is your own stall.", `stallClosed` "This stall is not taking new conversations right now.", `openFailed` "We could not open the conversation. Try again.", `pinned` "Asking about", `unpin` "Remove", `productGone` "This product is no longer listed."

- [ ] **Bước 4: Chạy thấy xanh** — `npm test`, prettier, lint, build.
- [ ] **Bước 5: Commit** — `feat(FR-114): message a stall from its page, with the product pinned`.

---

### Task 9: Dịch mười ngôn ngữ

**Files:** `frontend/src/locales/{vi,zh,ja,ko,fr,es,de,th,id}/{common,AdminModeration,…}.json`

- [ ] **Bước 1:** Liệt kê key en mới so với `origin/dev` cho **mọi** namespace đã đụng:

```bash
cd frontend && python3 - <<'PY'
import json, subprocess, glob
def flat(d, p=''):
    out = {}
    for k, v in d.items():
        out.update(flat(v, p + k + '.') if isinstance(v, dict) else {p + k: v})
    return out
for path in sorted(glob.glob('src/locales/en/*.json')):
    try:
        base = json.loads(subprocess.check_output(['git', 'show', f'origin/dev:frontend/{path}']))
    except subprocess.CalledProcessError:
        base = {}
    new = sorted(set(flat(json.load(open(path)))) - set(flat(base)))
    if new: print(path, new)
PY
```

- [ ] **Bước 2:** Dịch và **gộp** vào 9 ngôn ngữ (script gộp chỉ thêm key thiếu, không ghi đè). Plural `_one` chỉ `fr es de`.
- [ ] **Bước 3:** Kiểm: với mỗi namespace và ngôn ngữ, tập key = tập key en (trừ `_one` ở ngôn ngữ không có); và **không mất key** nào so với `HEAD`.
- [ ] **Bước 4:** `npm test && npx prettier --check src && npm run lint && npm run build`.
- [ ] **Bước 5: Commit** — `feat(FR-116): translate the moderation, report and header chat copy`.

---

### Task 10: Prototype (spec §11)

**Files:** `docs/prototype/customer/messages.html`, `farmer/messages.html`, `admin/moderation.html`, `prototype.js`, `public/product.html`, `public/stall.html`, `customer/order.html`, `index.html`

Prototype là bản hướng dẫn (frontend/CLAUDE.md): class `pt-*` và công tắc trạng thái chỉ ở đây. Không test tự động; kiểm bằng mở file.

- [ ] **Bước 1:** `customer/messages.html` — bỏ banner "ngoài phạm vi"; thêm bong bóng ảnh, dấu "Seen", "Online / Last seen", thẻ ghim sản phẩm, nút "Report" trên tin của người kia, và công tắc 4 trạng thái.
- [ ] **Bước 2:** `farmer/messages.html` — như trên, tiêu đề thread là tên khách, nút "Make an offer" **bị khoá kèm lý do** "Offers come in phase 2" (đợt 2).
- [ ] **Bước 3:** `admin/moderation.html` — tab "Reported messages": dòng ranh giới §8.3, hàng đợi, khối ngữ cảnh 5+5, nút Hide (xác nhận) / Dismiss.
- [ ] **Bước 4:** `prototype.js` — popover chuông + popover tin nhắn cho cả ba vai (hover + click + Esc), dùng lại markup của app.
- [ ] **Bước 5:** `public/product.html`, `public/stall.html` — nút "Message this stall". `customer/order.html` — nút đó **bị khoá**, chip TODO "Chờ module order (FR-114 phần đơn)".
- [ ] **Bước 6:** `index.html` — bảng phủ FR: FR-110…117 ở trạng thái đã có trong app (trừ phần "đơn" của FR-114), thêm câu hỏi mở: "FR-110…119 chưa vào `.ai/REQUIREMENTS.md`".
- [ ] **Bước 7:** Mở từng file bằng `python3 -m http.server` trong `docs/prototype` (hoặc launch `prototype` :8765), bấm thử popover/tab; rồi commit `docs(FR-117): prototype for reports, moderation, header previews and the stall button`.

---

### Task 11: Chạy lần cuối và PR

- [ ] **Bước 1:** `cd frontend && npm test && npx prettier --check src && npm run lint && npm run build`; `cd backend && ./mvnw -q spotless:check && ./mvnw -q test -Dtest='Conversation*Test,Moderation*Test,MessageReport*Test,StompChatEventPublisherTest'`.
- [ ] **Bước 2:** `git fetch origin && git rebase origin/dev`, chạy lại Bước 1.
- [ ] **Bước 3:** `git push -u origin feature/FR-116-chat-moderation`; `gh pr create --base dev --title "feat(FR-116): chat reports, moderation, header previews and the stall button"`. Mô tả nêu: ba thay đổi contract (LEAD duyệt 26/09) + `attachmentId`; FR-110…119 chưa vào REQUIREMENTS; phần "đơn" của FR-114 chờ module order; popover sửa luôn tràn ngang 768px của header; cách thử bằng hai tài khoản.
- [ ] **Bước 4:** Ledger + memory `chat-feature-plan.md`.

---

## Self-review

- **Spec coverage:** FR-113 → T7; FR-114 → T1, T3, T8 (phần đơn: chặn, ghi rõ); FR-116 → T2, T3, T4 (hidden), T5, T6; FR-117 → T7; §8.3 ranh giới → T6; §9.1 popover → T7; §9.2 tên stall/link → T3 (`displayName`), T2; §9.4 → T6; §9.5 → T8; §11 → T10. Minor 4A: đọc khi tab ẩn → T4; `aria-label` trên span → T7 (`MessagesPreview`) — **ThreadList badge vẫn còn**: sửa luôn trong T4 khi chạm ThreadList (sr-only thay aria-label).
- **Type consistency:** `ConversationPanel` đổi prop `other` → `thread` ở T4, T5/T8 dùng `thread`. `send(body, extra)` T8. `useThreadList(activeId)` giữ nguyên, thêm `hasMore/loadMore/loadingMore` (T4).
- **Placeholder scan:** các chỗ "grep trước" là lệnh kiểm có thật, không phải TBD.

---

## Bổ sung khi làm (26/09/2026)

Người dùng giao một AI khác làm tiếp sau Task 1. AI đó commit Task 2–3 và để dở Task 4–8 chưa commit. Phiên nhận lại đã kiểm từng task so với plan, và sửa những gì sau (mỗi lỗi có test đỏ → xanh, trừ khi ghi khác):

| Task | Lỗ hổng | Cách vá | Test |
|---|---|---|---|
| 4 | `sendErrorKey` trả `string`: `t()` có kiểu chặt từ chối, build đỏ TS2345 | trả union `SendErrorKey` | tsc |
| 7 | Header và chuông gọi cứng key `*Unread_one`: ở fr/es/de hiện câu số ít cho mọi số | gọi key gốc kèm `count` | `lets the language pick the plural form of the unread labels` |
| 7 | Popover: rê chuột thì mở, bấm vào biểu tượng lại đóng | giữ mở khi đang hover | `stays open when a mouse user clicks after hovering` |
| 7 | Bản xem trước viết cứng `Loading...`, không `role="status"`; chấm chưa đọc không đọc được | key i18n có sẵn, `role="status"`, chữ `sr-only` | `says it is loading, in the reader’s language` |
| 7 | Chưa có test Header, chưa có test reset badge khi đăng xuất | thêm | `shows how many messages are unread`, `resets to zero when nobody is signed in` |
| 8 | Khách chưa đăng nhập bị đưa tới `/login?redirect=`, nhưng Login đọc `location.state.from` → đăng nhập xong về trang chủ | `LoginRedirectState` như `RequireAuth`, `FavoriteButton` | `sends a signed-out visitor to sign in first, then back here` (test cũ khẳng định sai) |
| 8 | `ProductPin` đặt `p-2` rồi đè `p-1` (Helper.cn không gộp), dùng token không có `border-line-stronger` | chọn một padding; `hover:border-ink` | — |
| 4 | Thiếu test "load more conversations" | thêm | `shows a way to load more conversations` |

**Hạ tầng:** host không có JDK 25, nên test backend chạy trong container dùng-một-lần từ image `market-link-backend:dev` (`--rm`, giới hạn RAM). `@SpringBootTest` cần MySQL nên để CI chạy.

**Prototype (Task 10)** kiểm bằng jsdom, không E2E: 7 trang không lỗi JS; popover mở bằng click, đóng bằng Esc và bấm ra ngoài; Report mở hộp thoại.
