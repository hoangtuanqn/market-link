# Thông báo realtime — thiết kế

- Ngày: 25/09/2026 · Người duyệt: LEAD
- FR: FR-042 (thông báo in-app, D-11), FR-077 (admin publish thông báo toàn nền tảng), FR-117 (popover chuông — dùng chung dữ liệu)
- Liên quan: chat Customer↔Farmer (`2026-09-25-farmer-customer-chat-design.md`) — STOMP/RabbitMQ đã có từ Plan 2

## 1. Mục tiêu

Người dùng đang đăng nhập nhận thông báo **ngay lúc nó xảy ra**, kể cả khi đã đóng tab MarketLink:

| Nguồn | Ví dụ | Lưu vào danh sách `/notifications`? |
|---|---|---|
| Admin đăng thông báo (FR-077) | "Chợ Thảo Điền nghỉ Chủ nhật 04/10" | Có |
| Sự kiện tự sinh của hệ thống | Đơn Farmer được duyệt / bị từ chối / bị tạm khoá / được mở lại; admin nhận "có đơn Farmer mới" | Có |
| Tin nhắn chat Customer ↔ Farmer | "Cô Tư Garden: Mai còn xoài không chị?" | **Không** — số chưa đọc lấy từ chat |
| (Sau này) các mốc đơn hàng D-11 | đơn accepted / declined / ready, restock | Có — gắn vào cùng `dispatch`, không làm trong đợt này |

Cách hiện:

- Tab MarketLink **đang được nhìn** → toast trong trang (sonner, đã có).
- Tab **ẩn / ở nền** → thông báo của hệ điều hành (Notification API qua service worker).
- **Không còn tab nào** → Web Push, service worker hiện thông báo của hệ điều hành.
- Bấm vào thông báo → mở đúng trang (đoạn chat, `/notifications`, `/farmer`…).
- Đang mở đúng đoạn chat đó → không bật popup cho tin nhắn của đoạn chat ấy.

Sau khi đăng nhập, một banner nhỏ mời bật thông báo trình duyệt; hộp xin quyền của trình duyệt chỉ hiện khi người dùng bấm **Bật**.

Settings có phần **Thông báo** đầy đủ: từng loại × từng kênh, trạng thái quyền trình duyệt, âm thanh, giờ yên tĩnh, nút gửi thử.

### Ngoài phạm vi

- Email (D-11: NICE, làm sau H84).
- Các mốc đơn hàng và restock (chờ module `orders`/`products`) — chỉ để sẵn chỗ gắn.
- Popover xem nhanh ở chuông (FR-117) — thuộc chat Plan 4; nó đọc lại API của spec này.
- Ứng dụng di động, SMS.

## 2. Kiến trúc

```
 sự kiện (farmer duyệt, admin đăng, tin nhắn chat, …)
        │
        ▼
 NotificationService.dispatch(recipients, NotificationEvent)
        │ 1. loại cần lưu → INSERT notifications (text đã dịch theo ngôn ngữ người nhận)
        │ 2. đọc NotificationPreferences + giờ yên tĩnh → alert = {inApp, browser}
        │ 3. sau commit:
        ├── người nhận online (PresenceService) ──► STOMP /user/topic/notifications
        │                                           tab nhìn thấy: toast · tab ẩn: OS notification
        └── người nhận offline, browser=bật, không yên tĩnh ──► Web Push tới mọi push_subscriptions
                                                              service worker: OS notification
```

Lý do chọn (phương án A đã duyệt): không trùng thông báo; người từ chối quyền trình duyệt vẫn có toast; dùng lại
kênh STOMP có sẵn. Chỉ dùng Web Push cho mọi trường hợp (phương án B) bị loại vì toast trong trang phải đi vòng
qua dịch vụ push và người từ chối quyền sẽ không nhận được gì.

**Trùng giữa nhiều tab:** mọi tab đều nhận khung STOMP. Toast chỉ hiện ở tab `visibilityState === 'visible'`;
thông báo hệ điều hành dùng `tag = <kind>:<id>` nên nhiều tab cùng gọi cũng chỉ còn một thông báo.

**Online nhưng socket vừa rớt:** có thể lỡ popup; loại cần lưu vẫn nằm trong danh sách và số chưa đọc, nên chấp nhận.

## 3. Loại thông báo (`kind`)

| kind | Người nhận | Lưu | Text (en) | Link |
|---|---|---|---|---|
| `announcement` | audience admin chọn (all / customers / farmers) | có | tiêu đề + nội dung do admin viết | `/notifications` |
| `farmer_application` | mọi admin | có | "New Farmer application: {stall}" | `/admin/farmers/{id}` |
| `farmer_approved` | chủ đơn | có | "Your stall {stall} is approved. Sign in again to open your stall panel." | `/farmer` |
| `farmer_rejected` | chủ đơn | có | "Your stall application was not approved: {reason}" | `/become-farmer` |
| `farmer_suspended` | chủ đơn | có | "Your stall {stall} is suspended." | `/farmer/pending` |
| `farmer_reinstated` | chủ đơn | có | "Your stall {stall} is open again." | `/farmer` |
| `message` | người còn lại trong thread | **không** | "{sender}: {text 120 ký tự}" / "{sender} sent a photo" | `/messages?c={id}` hoặc `/farmer/messages?c={id}` (tham số `c` do chat Plan 4 đọc) |
| `test` | chính mình | không | "Notifications are working" | `/settings` |

Text lưu vào DB được **dịch sẵn theo `user_settings.language` của người nhận** lúc tạo (bundle
`messages_<lang>.properties` của Spring, 10 ngôn ngữ) — vì Web Push được hiện bởi service worker, không có i18n của
app. `announcement` giữ nguyên chữ admin viết.

**Nhóm trong Settings** (người dùng bật/tắt theo nhóm, không theo từng kind):

| Nhóm | Kinds | Vai thấy nhóm này |
|---|---|---|
| `messages` | `message` | customer, farmer |
| `announcements` | `announcement` | customer, farmer |
| `account` | `farmer_approved`, `farmer_rejected`, `farmer_suspended`, `farmer_reinstated` | customer, farmer |
| `farmerApplications` | `farmer_application` | admin |

`test` luôn gửi, bỏ qua nhóm (nhưng vẫn theo quyền trình duyệt). Khi có module orders sẽ thêm nhóm `orders`.

## 4. Dữ liệu (migration Flyway, bắt đầu từ `V20260925012` vì chat Plan 3 đã dùng 011)

```sql
-- 012
CREATE TABLE notifications (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      BIGINT UNSIGNED NOT NULL,
  kind         VARCHAR(40) NOT NULL,          -- enum Java NotificationKind; VARCHAR để thêm kind không cần migration
  title        VARCHAR(150) NOT NULL,
  message      VARCHAR(500) NOT NULL,
  link         VARCHAR(255) NULL,
  announcement_id BIGINT UNSIGNED NULL,
  is_read      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notif_user (user_id, is_read, created_at)
);

-- 013
CREATE TABLE announcements (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(150) NOT NULL,
  content     VARCHAR(1000) NOT NULL,
  audience    VARCHAR(20) NOT NULL DEFAULT 'all',   -- all | customers | farmers
  created_by  BIGINT UNSIGNED NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,        -- còn hiện banner ở trang public
  starts_at   TIMESTAMP NULL,
  ends_at     TIMESTAMP NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);
-- FK notifications.announcement_id → announcements(id) ON DELETE SET NULL thêm ở đây

-- 014
CREATE TABLE notification_preferences (
  user_id    BIGINT UNSIGNED NOT NULL,
  category   VARCHAR(30) NOT NULL,               -- messages | announcements | account | farmerApplications
  in_app     BOOLEAN NOT NULL DEFAULT TRUE,
  browser    BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (user_id, category),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE notification_settings (
  user_id     BIGINT UNSIGNED PRIMARY KEY,
  sound       BOOLEAN NOT NULL DEFAULT TRUE,
  quiet_on    BOOLEAN NOT NULL DEFAULT FALSE,
  quiet_from  CHAR(5) NOT NULL DEFAULT '22:00',  -- HH:mm, giờ Asia/Ho_Chi_Minh
  quiet_to    CHAR(5) NOT NULL DEFAULT '07:00',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 015 (N3)
CREATE TABLE push_subscriptions (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     BIGINT UNSIGNED NOT NULL,
  endpoint    VARCHAR(500) NOT NULL UNIQUE,
  p256dh      VARCHAR(200) NOT NULL,
  auth        VARCHAR(100) NOT NULL,
  user_agent  VARCHAR(255) NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

- Chưa có dòng preferences/settings = mặc định (mọi nhóm bật cả hai kênh, âm thanh bật, không giờ yên tĩnh).
- Admin đăng thông báo = **ghi một dòng `notifications` cho mỗi user** thuộc audience có `status = active`
  (`INSERT … SELECT`, một câu), rồi đẩy STOMP cho người online và Web Push cho người offline (N3). Đọc/chưa đọc tính
  riêng từng người, đúng contract `PATCH /notifications/{id}/read`.
- Các ô tích "note.*" cũ trong `user_settings.extras` (ghi chú "MarketLink chưa gửi thông báo") bị thay bằng bảng
  trên; FE bỏ đọc/ghi `note.*`, dữ liệu cũ để nguyên, không dùng.
- `db/schema.sql` (file đích) cập nhật cho khớp: bảng `notifications` đổi `type ENUM` → `kind VARCHAR(40)`, thêm `link`,
  `announcement_id`; thêm `audience` cho `announcements`; thêm 3 bảng mới.

## 5. Quyết định gửi (`alert`)

Với mỗi người nhận và mỗi sự kiện, server tính:

```
pref      = preferences[category(kind)] (mặc định bật cả hai)
quiet     = settings.quiet_on && now (Asia/Ho_Chi_Minh) nằm trong [quiet_from, quiet_to)   -- khoảng qua nửa đêm được
inApp     = kind == test || (pref.in_app  && !quiet)
browser   = kind == test || (pref.browser && !quiet)
```

- Online: luôn đẩy STOMP (để badge và danh sách cập nhật), khung mang `alert: {inApp, browser, sound}`; FE làm theo.
- Offline: gửi Web Push chỉ khi `browser` đúng. Không có gì khác để gửi (loại cần lưu đã nằm trong danh sách).
- Giờ yên tĩnh chỉ chặn popup, âm thanh và push; không chặn việc lưu và số chưa đọc.

## 6. API (thêm vào `docs/api-contract.md` §9 và §10)

Mọi path dưới `/api/v1`, JSON camelCase, envelope `ApiResource` như các module khác.

| Method | Path | Role | Ghi chú |
|---|---|---|---|
| GET | `/notifications` | All | query `isRead?`, `page`, `size` (≤50) → `PagedResource<NotificationResource>` mới nhất trước |
| GET | `/notifications/unread-count` | All | `{ count }` |
| PATCH | `/notifications/{id}/read` | All | không tồn tại → 404; của người khác → **403** (R-06) |
| PATCH | `/notifications/read-all` | All | `{ updated }` |
| GET | `/notifications/preferences` | All | `{ categories: [{category, inApp, browser}], sound, quietOn, quietFrom, quietTo }` — chỉ nhóm của vai mình |
| PUT | `/notifications/preferences` | All | cùng dạng; nhóm không thuộc vai → 400; giờ sai `HH:mm` → 400 |
| POST | `/notifications/test` | All | gửi kind `test` cho chính mình, không lưu; tối đa 1 lần / 10 giây (khoá Redis `notif:test:<userId>` TTL 10s), vượt → 429 |
| GET | `/notifications/push/public-key` | All | `{ publicKey }` VAPID; chưa cấu hình → `{ publicKey: null }` (N3) |
| POST | `/notifications/push-subscriptions` | All | `{ endpoint, keys: { p256dh, auth } }`; endpoint đã có → cập nhật chủ (N3) |
| DELETE | `/notifications/push-subscriptions` | All | `{ endpoint }` — gọi khi đăng xuất hoặc tắt trong Settings (N3) |
| GET | `/announcements/active` | Public | thông báo đang hiệu lực mới nhất cho banner (thay dữ liệu mẫu trong `MainLayout`) |
| GET | `/admin/announcements` | Admin | phân trang |
| POST | `/admin/announcements` | Admin | `{ title, content, audience, startsAt?, endsAt? }` → tạo **và** gửi ngay |
| PUT | `/admin/announcements/{id}` | Admin | sửa banner; không sửa các thông báo đã gửi |
| DELETE | `/admin/announcements/{id}` | Admin | `is_active = false` (gỡ banner), không xoá thông báo đã gửi |

`NotificationResource`: `{ id, kind, title, message, link, isRead, createdAt }`.

**STOMP** — đích mới `/user/topic/notifications` (cùng quy ước `/topic` thay `/queue` như chat, xem
`StompChatEventPublisher`):

```json
{ "id": 123, "kind": "farmer_approved", "title": "…", "message": "…", "link": "/farmer",
  "createdAt": "2026-09-25T11:00:00Z", "persistent": true, "unreadCount": 4,
  "alert": { "inApp": true, "browser": true, "sound": true },
  "conversationId": null }
```

`id` là `null` với kind không lưu (`message`, `test`); `conversationId` có với `message` để FE không popup khi đang
mở đúng thread.

**Web Push payload** (mã hoá theo RFC 8291 bởi thư viện): `{ kind, title, message, link, tag }`.

## 7. Backend (module `modules/notification`)

Theo `backend/CLAUDE.md`: `controllers · services/{interfaces,impl} · repositories · entities · requests · resources · enums`.

- `NotificationKind` (enum: kind, category, persistent), `NotificationCategory`.
- `NotificationEvent` (record: kind, params, link, conversationId?) — người gọi không tự viết text.
- `NotificationTextRenderer` — `MessageSource` + ngôn ngữ người nhận → title/message.
- `NotificationService.dispatch(Collection<Long> recipients, NotificationEvent)` — lưu (nếu persistent), tính `alert`,
  `TransactionHelper.afterCommit` rồi gọi `NotificationDelivery`.
- `NotificationDelivery` — hỏi `PresenceService.snapshot`, online → `StompNotificationPublisher`, offline →
  `WebPushSender` (N3; N1 dùng bản no-op).
- `NotificationPreferenceService` — đọc/ghi 2 bảng, mặc định khi chưa có dòng, `alertFor(userId, kind, now)`.
- `AnnouncementService` — CRUD, publish = fan-out + dispatch tới người online.
- Điểm gắn sự kiện (mỗi chỗ một dòng gọi, sau commit):
  - `FarmerService.apply` → `farmer_application` tới mọi admin.
  - `FarmerService.approve / reject / suspend / reinstate` → kind tương ứng tới chủ đơn.
  - `MessageService.send` → phát `MessageSentEvent` (Spring event); `ChatNotificationListener`
    (`@TransactionalEventListener`) gọi `dispatch` kind `message`. Dùng event để ít đụng file chat Plan 3 đang sửa.
- `WebPushSender` (N3): `nl.martijndwars:web-push` + BouncyCastle; `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
  `VAPID_SUBJECT` trong `.env` (thêm vào `.env.example` và `scripts/check-env-separation.sh`). Thiếu khoá → push tắt,
  log một dòng lúc khởi động, như `RABBITMQ_HOST` rỗng. Gửi bất đồng bộ (executor riêng), lỗi 404/410 → xoá subscription,
  lỗi khác → log, không retry. Task đầu của N3 là **spike**: thư viện chạy được trên Java 25 / Spring Boot 4 không; nếu
  không, dùng `com.interaso:webpush`.

Bảo mật: mọi endpoint lọc theo `userId` của principal (R-06); admin endpoints `hasRole('ADMIN')`; nội dung admin
viết được escape khi hiện (FE render text, không HTML).

## 8. Frontend

- `lib/realtime/stompClient.ts` — **một** client STOMP dùng chung (`@stomp/stompjs`, JWT ở CONNECT như
  `StompAuthInterceptor` yêu cầu, tự nối lại, đổi token khi refresh). Chat Plan 4 dùng lại client này.
- `RealtimeProvider` (bọc app khi đã đăng nhập) — mở kết nối, subscribe `/user/topic/notifications`, đóng khi đăng xuất.
- `useNotifier` — nhận khung: cập nhật `unreadCount` (store dùng chung cho chuông ở Header, FarmerLayout, AdminLayout),
  rồi theo `alert`: tab nhìn thấy + `inApp` → toast (bấm → `link`), âm thanh ngắn nếu `sound`; tab ẩn + `browser` +
  quyền `granted` → `registration.showNotification` với `tag`. Bỏ popup `message` khi đang ở đúng thread.
- `public/sw.js` — service worker: `push` → `showNotification`; `notificationclick` → focus tab đang mở và điều hướng,
  không có thì `clients.openWindow(link)`. Đăng ký ở N2 (cho thông báo khi tab ẩn), thêm `push` ở N3.
- `NotificationPermissionBanner` — hiện ngay sau đăng nhập (và khi tải app lúc đang đăng nhập) nếu trình duyệt hỗ
  trợ, `Notification.permission === 'default'` và chưa bấm "Để sau" trong 7 ngày (`localStorage`, bọc try/catch).
  **Bật** → `requestPermission()` → `granted` thì đăng ký push (N3). `denied` → ẩn banner; Settings hướng dẫn mở lại
  trong cài đặt trình duyệt.
- Settings: thay khối ô tích "Notifications" trong `SettingsPanel` bằng `NotificationSettingsCard` (lưu ngay khi đổi,
  qua `/notifications/preferences`, không dính nút Save chung):
  - Quyền trình duyệt: Đã bật / Chưa bật [Bật] / Đã chặn (hướng dẫn) / Trình duyệt không hỗ trợ.
  - Bảng nhóm × {Trong trang, Trình duyệt} theo vai.
  - Âm thanh; Giờ yên tĩnh (bật + từ/đến); nút **Gửi thử**.
  - Admin Settings cũng có (nhóm `farmerApplications`).
- `/notifications` (customer) và `/farmer/notifications`: thay dữ liệu mẫu bằng API — lọc Tất cả / Chưa đọc, đánh
  dấu đã đọc khi bấm, "Đánh dấu tất cả đã đọc", phân trang "Xem thêm", đủ 4 trạng thái FR-084, tự thêm dòng mới khi có khung STOMP.
- Admin: trang `/admin/announcements` — danh sách, form soạn (tiêu đề, nội dung, đối tượng, thời gian hiện banner), gỡ banner. Thêm vào menu admin.
- Banner thông báo public (`AnnouncementBanner`) đọc `/announcements/active` thay `data/home`.
- Đăng xuất: huỷ push subscription của thiết bị này (N3), đóng STOMP.
- Mọi chữ mới vào `locales/<lang>/*.json` đủ 10 ngôn ngữ.

## 9. Chia việc

| Phần | Nội dung | Phụ thuộc |
|---|---|---|
| **N1 · Backend lõi** | migration 012–014, module notification, REST §6 (trừ push), announcements admin + public, gắn sự kiện Farmer + chat, STOMP publisher, text 10 ngôn ngữ, cập nhật contract + schema, test | — |
| **N2 · Frontend realtime** | STOMP client dùng chung, RealtimeProvider, notifier (toast + OS notification qua SW), chuông + trang notifications thật, banner xin quyền, NotificationSettingsCard, trang admin announcements, banner public | N1 |
| **N3 · Web Push** | spike thư viện, migration 015, VAPID env, push-subscriptions API, `WebPushSender`, `push` trong `sw.js`, đăng ký/huỷ ở FE, dọn 410 | N1, N2 |

Mỗi phần: một plan trong `docs/superpowers/plans/`, một nhánh `feature/FR-042-notifications-n{1,2,3}`, một PR vào `dev`.

## 10. Kiểm thử

- **Unit (BE):** ma trận `alertFor` (nhóm tắt/bật × kênh × giờ yên tĩnh gồm khoảng qua nửa đêm × kind `test`);
  renderer đủ 10 ngôn ngữ, thiếu key → English; `NotificationKind` → category.
- **Integration (BE, MySQL test như các module khác):** REST §6 gồm 403 khi đánh dấu thông báo của người khác (R-06), 404 khi id không tồn tại, read-all,
  phân trang, preferences sai vai/sai giờ → 400; admin publish fan-out đúng audience và bỏ user `suspended`;
  gắn sự kiện approve → 1 dòng cho chủ đơn; tin nhắn chat → không có dòng nào.
- **STOMP (BE):** như `ChatStompIntegrationTest` — người online nhận khung trên `/user/topic/notifications`, người
  khác không nhận.
- **Web Push (BE, N3):** `WebPushSender` với HTTP giả: 201 → cập nhật `last_used_at`, 410 → xoá subscription.
- **E2E thủ công (checklist trong PR):** hai trình duyệt (customer + admin):
  1. Customer đăng nhập → banner → Bật → trình duyệt hỏi → cho phép.
  2. Admin đăng thông báo → customer thấy toast (tab đang nhìn), chuông +1, dòng mới trong `/notifications`.
  3. Customer chuyển sang tab khác → admin đăng tiếp → hiện thông báo hệ điều hành; bấm → mở `/notifications`.
  4. Đóng hết tab customer → admin duyệt đơn Farmer của customer → Web Push hiện; bấm → mở `/farmer` (N3).
  5. Farmer nhắn customer → toast; đang mở đúng thread → không toast.
  6. Settings: tắt "Trình duyệt" nhóm Tin nhắn → tab ẩn không còn thông báo tin nhắn; bật giờ yên tĩnh bao giờ hiện tại → không popup nhưng chuông vẫn tăng; Gửi thử → hiện ngay.
  7. Đăng xuất → không còn Web Push trên thiết bị đó.

## 11. Rủi ro

- **Web Push cần HTTPS** trên máy thật (localhost được miễn). Deploy phải có TLS.
- **Safari** (macOS 13+/iOS 16.4+): iOS chỉ nhận push khi web được "Thêm vào màn hình chính"; ghi rõ trong README.
- **Thư viện web-push Java** cũ (BouncyCastle, HttpAsyncClient) — spike ở đầu N3.
- **Xung đột với các phiên khác:** chat Plan 3 sửa `MessageService` (chỉ thêm một dòng publish event); chat Plan 4
  sẽ cần STOMP client — dùng client của N2. Settings đang có phiên khác chuyển mục mật khẩu sang — `SettingsPanel`
  có thể xung đột nhỏ, gộp khi merge.
- **Fan-out** một dòng mỗi user: với vài trăm user của đồ án là một câu `INSERT … SELECT`; nếu lớn hơn nhiều mới cần bảng đọc riêng.
