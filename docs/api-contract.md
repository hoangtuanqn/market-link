# API CONTRACT — MarketLink

Chủ sở hữu: **LEAD**. Chỉ Lead sửa (CLAUDE.md R-02).
BE phải trả đúng file này, FE phải gọi đúng file này. Lệch nhau thì **sửa bên sai, không sửa contract** (R-05).

## Quy ước — LEAD đã chốt 25/09/2026

| | Chốt | Ghi chú |
|---|---|---|
| Base path | `/api/v1` | Có số phiên bản để sau này đổi contract mà không phá bản cũ |
| Path | `kebab-case`, danh từ số nhiều | `/auth/reset-password`, `/farmer/stock-templates` |
| Field JSON | `camelCase` | `marketName`, `pickupDate`, `pageSize` |
| Cột database | `snake_case` | **Không đổi.** Đây là quy ước SQL, và các câu SQL của chatbot bám vào nó |
| Ngày giờ | ISO 8601 | `2026-09-25T07:30:00Z` |
| Auth | Header `Authorization: Bearer <accessToken>` | Refresh token đi trong cookie HttpOnly, không bao giờ trong body |

> Trước ngày 25/09/2026 file này ghi `/api` và `snake_case`, còn code viết `/api/v1` và `camelCase`.
> LEAD chốt theo code đang chạy để không phải sửa lại backend và frontend đã hoàn thành.
> Việc duy nhất cần nhớ: **JSON là camelCase, cột DB vẫn là snake_case.** Hai thứ khác nhau.

## Envelope — một hình dạng duy nhất

Mọi response, kể cả lỗi, đều là hình dạng này. Sinh ra từ `ApiResource<T>` phía backend.

```jsonc
// 2xx
{
  "success": true,
  "message": "Signed in.",
  "data": { },
  "error": null,
  "traceId": "8f3c1a…",
  "timestamp": "2026-09-25T07:30:00Z"
}

// lỗi
{
  "success": false,
  "message": "Some of the information you sent is not valid.",
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      { "field": "email", "message": "Enter a valid email address." },
      { "field": "password", "message": "Password must be 6 to 72 characters." }
    ]
  },
  "traceId": "8f3c1a…",
  "timestamp": "2026-09-25T07:30:00Z"
}

// danh sách có phân trang — data là một PageResource
{
  "success": true,
  "message": "",
  "data": { "items": [], "page": 1, "pageSize": 12, "total": 0 },
  "error": null,
  "traceId": "8f3c1a…",
  "timestamp": "2026-09-25T07:30:00Z"
}
```

- `message` là câu hiện thẳng cho người dùng, viết bằng tiếng Anh theo giọng văn trong design system.
- `error.details[]` là **mảng**, không phải object. Lỗi không gắn với field nào thì bỏ trống `field`.
- `traceId` lấy từ `TraceIdFilter`, cũng được trả trong header `X-Trace-Id`. Báo lỗi thì đính kèm mã này.
- FE đọc lỗi qua `Helper.getErrorMessage`, `Helper.getErrorCode` và `Helper.getFieldErrors`.

HTTP: 200 đọc · 201 tạo · 400 validation · 401 chưa đăng nhập · 403 sai quyền · 404 không thấy
· 409 xung đột trạng thái (hết hàng, slot đầy, quá cutoff) · 429 quá số lần cho phép.

---

## 1. Auth — FR-001…008

**Toàn bộ mục này đã chạy trong code.** Endpoint nào có dấu ⚑ là nhóm tự thêm, đề không yêu cầu.

### 1.1 Đăng ký, đăng nhập, phiên

| Method | Path | Role | Request | data trả về |
|---|---|---|---|---|
| POST | `/api/v1/auth/register` | Guest | `{ fullName, phone, email, address, password, confirmPassword }` | `{ accessToken, user }` · 201 |
| POST | `/api/v1/auth/login` | Guest | `{ email, password, rememberMe?, requiredRole? }` | `{ accessToken, user, mfaRequired, mfaToken }` |
| POST | `/api/v1/auth/refresh` ⚑ | Guest | — (đọc cookie `refresh_token`) | `{ accessToken, user }` |
| POST | `/api/v1/auth/logout` | All | — | `null` |

- Đăng ký và đăng nhập thành công đều trả kèm header `Set-Cookie: refresh_token=…; HttpOnly`.
- `rememberMe` không gửi thì coi như `true`. `false` thì cookie là cookie phiên, đóng trình duyệt là mất.
- `requiredRole` để trang đăng nhập admin gửi `"admin"` (FR-004). Sai vai thì **403**, và
  **không** cấp token hay cookie, để không ghi đè phiên đang có trong trình duyệt.
- `mfaRequired = true` nghĩa là chưa có phiên: `accessToken` là `null`, FE chuyển sang màn nhập mã.

### 1.2 Mật khẩu

| Method | Path | Role | Request | data trả về |
|---|---|---|---|---|
| POST | `/api/v1/auth/forgot-password` | Guest | `{ email }` | `null` |
| POST | `/api/v1/auth/reset-password/verify` ⚑ | Guest | `{ token }` | `{ email }` |
| POST | `/api/v1/auth/reset-password` | Guest | `{ token, newPassword, confirmPassword }` | `null` |
| POST | `/api/v1/auth/set-password` ⚑ | All | `{ password, confirmPassword }` | `null` |
| POST | `/api/v1/auth/change-password` ⚑ | All | `{ currentPassword, newPassword, confirmPassword }` | `null` |

- `forgot-password` luôn trả cùng một câu dù email có tồn tại hay không, kể cả khi đã vượt
  giới hạn 5 lần mỗi giờ. Không được để lộ email nào có trong hệ thống.
- `verify` chỉ đọc token chứ không tiêu nó, nên gọi xong vẫn dùng token đó để đặt lại mật khẩu được.
- `set-password` dành cho tài khoản tạo qua Google (`user.hasPassword = false`).
  Tài khoản đã có mật khẩu gọi vào thì **409** `PASSWORD_ALREADY_SET`.
- Đổi hoặc đặt lại mật khẩu thành công thì **mọi phiên bị huỷ**, kể cả phiên đang gọi.

### 1.3 Đăng nhập Google ⚑

| Method | Path | Role | Request | data trả về |
|---|---|---|---|---|
| GET | `/api/v1/auth/google/authorize-url` | Guest | query `state` | `{ url }` |
| POST | `/api/v1/auth/google` | Guest | `{ code }` | `{ accessToken, user, mfaRequired, mfaToken }` |

`state` do FE sinh ngẫu nhiên và giữ lại để so khớp khi Google trả về, chống CSRF.
`code` là authorization code Google trả về `redirect_uri` của frontend, dùng một lần.
Chưa cấu hình client id/secret thì trả **503**.

### 1.4 Hồ sơ cá nhân

| Method | Path | Role | Request | data trả về |
|---|---|---|---|---|
| GET | `/api/v1/auth/me` | All | — | `user` |
| PUT | `/api/v1/auth/me` ⚑ | All | `{ fullName, phone, address }` | `user` |

Id lấy từ access token nên không sửa được tài khoản người khác (R-06). Email không đổi được ở đây.

**Hình dạng `user`** dùng chung cho mọi endpoint trên:

```jsonc
{
  "id": 12,
  "email": "an@example.com",
  "fullName": "Nguyễn Văn An",
  "phone": "0912345678",
  "address": "12 Lê Lợi, Quận 1",
  "role": "customer",          // customer | farmer | admin — luôn viết thường
  "createdAt": "2026-09-20T03:11:00Z",
  "hasPassword": true          // false: tạo qua Google, chưa đặt mật khẩu
}
```

Trường `null` bị lược khỏi JSON (`@JsonInclude(NON_NULL)`), nên FE phải chịu được việc thiếu trường.

### 1.5 Xác thực hai bước cho admin — FR-008 ⚑

Đề không yêu cầu. Nhóm tự thêm, dùng TOTP theo cùng lý do đã chọn Leaflet ở D-12: không tài khoản,
không hạn mức, không API key trong source nộp cho giám khảo.

| Method | Path | Role | Request | data trả về |
|---|---|---|---|---|
| POST | `/api/v1/auth/mfa/verify` | Guest | `{ mfaToken, code?, recoveryCode? }` | `{ accessToken, user, mfaRequired, mfaToken }` |
| GET | `/api/v1/auth/mfa` | Admin | — | `{ enabled, recoveryCodesLeft }` |
| POST | `/api/v1/auth/mfa/setup` | Admin | — | `{ secret, otpauthUri }` |
| POST | `/api/v1/auth/mfa/enable` | Admin | `{ code }` | `{ codes: [] }` |
| POST | `/api/v1/auth/mfa/recovery-codes` | Admin | `{ code }` | `{ codes: [] }` |
| POST | `/api/v1/auth/mfa/disable` | Admin | `{ code }` | `null` |

- `verify` phải gửi **một trong hai**: `code` sáu số, hoặc `recoveryCode`. Thiếu cả hai thì 400.
- Mã sai trả **400** `MFA_CODE_INVALID`. Sai quá 5 lần trả **429** `MFA_LOCKED`.
- `otpauthUri` **chứa khoá bí mật**, nên FE phải tự vẽ QR trong trình duyệt.
  Tuyệt đối không gửi chuỗi này sang dịch vụ vẽ QR bên ngoài.
- `codes` chỉ trả về đúng một lần lúc bật hoặc lúc tạo lại. Backend chỉ lưu bản băm.

### 1.6 Chưa làm

| Method | Path | Ghi chú |
|---|---|---|
| POST | `/api/v1/auth/register/farmer` | FR-002. Chưa quyết là đăng ký riêng, hay nâng cấp từ tài khoản customer đang có qua màn "Become a Farmer". LEAD chốt khi làm tới. |

---

## 2. Health

| Method | Path | Role | data trả về |
|---|---|---|---|
| GET | `/ping` | Public | `{ status: true, message: "Pong!" }` |

Nằm ngoài `/api/v1` vì là health check hạ tầng, không phải API nghiệp vụ.

---

## 3. Markets — FR-010, 012, 073

> **Chưa triển khai.** Thiết kế để BE và FE bám theo. Bảng `markets` chưa có migration.

| Method | Path | Role | Ghi chú |
|---|---|---|---|
| GET | `/api/v1/markets` | Public | query: `q, day, city, district, page, pageSize` → `{ marketId, marketName, address, district, city, latitude, longitude, openingTime, closingTime, operatingDays:[0..6], farmerCount }` |
| GET | `/api/v1/markets/{id}` | Public | kèm `farmers[]` đang bán tại chợ |
| GET | `/api/v1/markets/{id}/farmers` | Public | query: `day` |
| POST | `/api/v1/admin/markets` | Admin | `{ marketName, address, district, city, latitude, longitude, openingTime, closingTime, operatingDays:[] }` |
| PUT | `/api/v1/admin/markets/{id}` | Admin | như trên |
| DELETE | `/api/v1/admin/markets/{id}` | Admin | xoá mềm bằng `isActive = false` |

`operatingDays` là mảng số 0…6, trong đó 0 là Chủ nhật, khớp cột `market_operating_days.day_of_week`.
`latitude` và `longitude` là số thập phân, không phải chuỗi.

---

## 4. Farmers — FR-011, 060, 061, 071

> **Chưa triển khai.**

| Method | Path | Role | Ghi chú |
|---|---|---|---|
| GET | `/api/v1/farmers` | Public | query: `q, marketId, day, page` — chỉ trả `approvalStatus = "approved"` |
| GET | `/api/v1/farmers/{id}` | Public | `{ farmerId, stallName, description, logoUrl, ratingAvg, ratingCount, markets:[{ marketId, marketName, stallCode, operatingDays:[{ dayOfWeek, pickupStartTime, pickupEndTime }] }] }` |
| GET | `/api/v1/farmers/{id}/products` | Public | tồn kho tuần hiện tại |
| GET | `/api/v1/farmer/profile` | Farmer | hồ sơ của chính mình |
| PUT | `/api/v1/farmer/profile` | Farmer | `{ stallName, contactPerson, description, orderCutoffHours }` |
| POST | `/api/v1/farmer/markets` | Farmer | `{ marketId, stallCode, stallLatitude, stallLongitude }` |
| DELETE | `/api/v1/farmer/markets/{farmerMarketId}` | Farmer | |
| PUT | `/api/v1/farmer/markets/{farmerMarketId}/days` | Farmer | `{ days:[{ dayOfWeek, pickupStartTime, pickupEndTime }] }` |

Farmer đăng nhập được ngay sau khi đăng ký, nhưng `approvalStatus != "approved"` thì mọi endpoint
tạo hoặc sửa sản phẩm trả **403** kèm message "Your stall is pending admin approval" (D-09).

---

## 5. Categories & Products — FR-020…023, 062…064, 076

> **Chưa triển khai.**

| Method | Path | Role | Ghi chú |
|---|---|---|---|
| GET | `/api/v1/categories` | Public | |
| POST/PUT/DELETE | `/api/v1/admin/categories/{id}?` | Admin | master data |
| GET | `/api/v1/products` | Public | query: `q, categoryId, marketId, farmerId, day, minPrice, maxPrice, sort, page, pageSize` |
| GET | `/api/v1/products/{id}` | Public | kèm `farmer`, `reviewsSummary` |
| POST | `/api/v1/farmer/products` | Farmer | `{ categoryId, name, description, price, unit, stockQuantity, imageUrl }` |
| PUT | `/api/v1/farmer/products/{id}` | Farmer | chỉ sản phẩm của chính mình, ngược lại 403 |
| DELETE | `/api/v1/farmer/products/{id}` | Farmer | xoá mềm `isDeleted = true` |
| PATCH | `/api/v1/farmer/products/{id}/status` | Farmer | `{ status: "available" \| "sold_out" \| "unavailable" }` |

`sort` nhận `price_asc`, `price_desc`, `newest`, `rating`.

> Giá trị enum trong JSON giữ nguyên `snake_case` (`sold_out`), vì chúng là giá trị lưu thẳng
> xuống cột ENUM của database. Chỉ **tên field** mới là camelCase.

### Template tồn kho tuần — FR-063

| Method | Path | Role |
|---|---|---|
| GET | `/api/v1/farmer/stock-templates` | Farmer |
| PUT | `/api/v1/farmer/stock-templates` | Farmer — `{ items:[{ productId, dayOfWeek, defaultQuantity, defaultPrice }] }` |
| POST | `/api/v1/farmer/stock-templates/apply` | Farmer — `{ targetDate }` → nạp tồn kho theo template của thứ tương ứng |

---

## 6. Slots — FR-032, 067

> **Chưa triển khai.**

| Method | Path | Role | Ghi chú |
|---|---|---|---|
| GET | `/api/v1/farmers/{id}/slots` | Public | query: `marketId, date` → `{ slotId, startTime, endTime, maxOrders, bookedCount, isFull }` |
| POST | `/api/v1/farmer/slots/generate` | Farmer | `{ farmerMarketId, fromDate, toDate, slotMinutes, maxOrders }` sinh slot từ operating days |
| PATCH | `/api/v1/farmer/slots/{id}` | Farmer | `{ maxOrders, isActive }` |

---

## 7. Cart & Orders — FR-030…039, 065…067 ⭐ lõi

> **Chưa triển khai.**

Giỏ hàng giữ ở **client** (localStorage). Server chỉ nhận lúc checkout và tự tách theo Farmer (D-01).

| Method | Path | Role | Ghi chú |
|---|---|---|---|
| POST | `/api/v1/orders/preview` | Customer | `{ items:[{ productId, quantity }] }` → **các nhóm đơn sẽ được tách** `{ groups:[{ farmerId, stallName, marketId, items[], subtotal }] }` |
| POST | `/api/v1/orders` | Customer | `{ groups:[{ farmerId, marketId, slotId, pickupDate, items:[{ productId, quantity }], customerNote }] }` → `{ orders:[{ orderId, orderCode, status, cutoffAt }] }`. **Trừ tồn kho trong cùng transaction** (D-02). Hết hàng hoặc slot đầy → **409** |
| GET | `/api/v1/orders` | Customer | query: `status, page` — đơn của chính mình |
| GET | `/api/v1/orders/{id}` | Customer/Farmer | kèm `items[]`, `statusHistory[]`, `canCancel`, `canModify` |
| PATCH | `/api/v1/orders/{id}/cancel` | Customer | 409 nếu quá `cutoffAt`. Hoàn tồn kho |
| PUT | `/api/v1/orders/{id}/items` | Customer | `{ items:[{ productId, quantity }] }` — chỉ sửa số lượng hoặc bỏ item, **không thêm mới** (D-07). Đơn về `placed` |
| POST | `/api/v1/orders/{id}/reorder` | Customer | tạo giỏ mới từ đơn cũ |
| GET | `/api/v1/farmer/orders` | Farmer | query: `status, date, page` |
| PATCH | `/api/v1/farmer/orders/{id}/accept` | Farmer | `placed → accepted` |
| PATCH | `/api/v1/farmer/orders/{id}/decline` | Farmer | `placed → declined` + `{ reason }`, hoàn tồn kho |
| PATCH | `/api/v1/farmer/orders/{id}/ready` | Farmer | `accepted → ready` |
| PATCH | `/api/v1/farmer/orders/{id}/complete` | Farmer | `ready → completed` (D-03) |

> **Mọi endpoint đổi trạng thái phải kiểm tra chuyển tiếp hợp lệ theo D-04 và ghi `order_status_history`.**
> Chuyển sai thứ tự → **409**, không phải 400.

Giá trị `status` giữ nguyên dạng lưu trong DB: `placed`, `accepted`, `ready`, `completed`,
`declined`, `cancelled`.

---

## 8. Reviews — FR-050…053

> **Chưa triển khai.**

| Method | Path | Role | Ghi chú |
|---|---|---|---|
| GET | `/api/v1/products/{id}/reviews` | Public | |
| GET | `/api/v1/farmers/{id}/reviews` | Public | |
| POST | `/api/v1/reviews` | Customer | `{ orderId, targetType: "product" \| "farmer", productId?, farmerId?, rating, comment }` — **403 nếu đơn chưa `completed` hoặc không thuộc về mình**, 409 nếu đã review |
| POST | `/api/v1/farmer/reviews/{id}/response` | Farmer | `{ responseText }` |
| PATCH | `/api/v1/admin/reviews/{id}/hide` | Admin | kiểm duyệt |

---

## 9. Favorites & Notifications — FR-040…042

> Favorites: **chưa triển khai**. Notifications: **đã có** (spec `docs/superpowers/specs/2026-09-25-realtime-notifications-design.md`).

| Method | Path | Role | Trạng thái | Body / query | data |
|---|---|---|---|---|---|
| GET | `/api/v1/favorites` | Customer | Chưa làm | query `targetType` | |
| POST | `/api/v1/favorites` | Customer | Chưa làm | `{ targetType, farmerId?, productId?, marketId? }` | |
| DELETE | `/api/v1/favorites/{id}` | Customer | Chưa làm | | |
| GET | `/api/v1/notifications` | All | **Đã có** | query `isRead?`, `page` (từ 1), `size` (1–50, mặc định 20) | `{ items: NotificationResource[], page, pageSize, total }`, mới nhất trước |
| GET | `/api/v1/notifications/unread-count` | All | **Đã có** | | `{ count }` |
| PATCH | `/api/v1/notifications/{id}/read` | All | **Đã có** | | `null`; không có → 404, của người khác → **403** |
| PATCH | `/api/v1/notifications/read-all` | All | **Đã có** | | `{ updated }` |
| GET | `/api/v1/notifications/preferences` | All | **Đã có** | | `NotificationPreferences` (chỉ nhóm của vai mình) |
| PUT | `/api/v1/notifications/preferences` | All | **Đã có** | `NotificationPreferences` | như GET; nhóm lạ/không thuộc vai hoặc giờ sai `HH:mm` → 400 |
| POST | `/api/v1/notifications/test` | All | **Đã có** | | `null`; gửi kind `test` cho chính mình, không lưu; bấm lại trong 10 giây → **429** |
| GET | `/api/v1/notifications/push/public-key` | All | **Đã có** | | `{ publicKey }` (VAPID, base64url) hoặc `{ publicKey: null }` khi server chưa bật Web Push |
| POST | `/api/v1/notifications/push-subscriptions` | All | **Đã có** | `{ endpoint (http/https, ≤500), keys: { p256dh, auth } }` = `PushSubscription.toJSON()` | `null`; cùng endpoint → cập nhật, đổi chủ nếu tài khoản khác đăng nhập |
| DELETE | `/api/v1/notifications/push-subscriptions` | All | **Đã có** | `{ endpoint }` | `null`; chỉ xoá của mình (của người khác thì bỏ qua) |

`NotificationResource`: `{ id, kind, title, message, link, isRead, createdAt }`. `title`/`message` đã dịch theo
ngôn ngữ người nhận (`user_settings.language`) lúc tạo.

`kind`: `announcement` · `farmer_application` (tới admin) · `farmer_approved` · `farmer_rejected` · `farmer_suspended` ·
`farmer_reinstated` — đều được lưu. `message` (tin nhắn chat) và `test` chỉ đẩy realtime, **không lưu**.
Các mốc đơn hàng của D-11 sẽ thêm kind mới khi có module orders.

`NotificationPreferences`:

```json
{ "categories": [ { "category": "messages", "inApp": true, "browser": false } ],
  "sound": true, "quietOn": true, "quietFrom": "22:00", "quietTo": "07:00" }
```

- Nhóm: `messages`, `announcements`, `account` (customer, farmer); `farmerApplications` (admin).
- Chưa lưu = bật cả hai kênh, âm thanh bật, không giờ yên tĩnh.
- Giờ yên tĩnh theo `Asia/Ho_Chi_Minh`, khoảng `[from, to)`, qua nửa đêm được, `from == to` = tắt. Trong giờ yên
  tĩnh không popup, không âm thanh, không Web Push; vẫn lưu và vẫn tăng số chưa đọc.

### Realtime — STOMP `/user/topic/notifications`

Cùng kết nối `/ws` với chat (JWT ở frame CONNECT). Mỗi thông báo tới mọi tab đang mở của người nhận:

```json
{ "id": 123, "kind": "farmer_approved", "title": "…", "message": "…", "link": "/farmer",
  "createdAt": "2026-09-25T11:00:00Z", "persistent": true, "unreadCount": 4,
  "alert": { "inApp": true, "browser": true, "sound": true }, "conversationId": null }
```

- `id` là `null` với kind không lưu; `conversationId` chỉ có với `message` (FE không popup khi đang mở đúng thread).
- `alert` do server tính từ preferences + giờ yên tĩnh. FE: tab đang nhìn + `inApp` → toast; tab ẩn + `browser` +
  quyền trình duyệt → thông báo hệ điều hành.
- Link theo vai: customer `/notifications`, `/messages?c={id}`; farmer `/farmer/notifications`, `/farmer/messages?c={id}`.

### Web Push (khi đã đóng hết tab)

Người nhận **không có phiên STOMP nào** và `alert.browser` bật → server gửi Web Push (RFC 8291 `aes128gcm`, VAPID
RFC 8292) tới mọi subscription của họ. Nội dung service worker nhận: `{ kind, title, message, link, tag }`. Dịch vụ push
trả 404/410 → subscription bị xoá. Web Push chỉ chạy trên HTTPS (localhost được miễn).

---

## 10. Admin — FR-070…077

> **Chưa triển khai.**

| Method | Path | Ghi chú |
|---|---|---|
| GET | `/api/v1/admin/dashboard` | `{ totalFarmers, totalCustomers, totalMarkets, totalOrders, revenueTotal, pendingFarmers }` |
| GET | `/api/v1/admin/farmers` | query `approvalStatus` |
| PATCH | `/api/v1/admin/farmers/{id}/approve` | |
| PATCH | `/api/v1/admin/farmers/{id}/reject` | `{ reason }` |
| PATCH | `/api/v1/admin/farmers/{id}/suspend` | D-09: ẩn sản phẩm, đơn đang chạy vẫn chạy |
| GET | `/api/v1/admin/customers` | |
| PATCH | `/api/v1/admin/customers/{id}/status` | `{ status: "active" \| "inactive" }` |
| PATCH | `/api/v1/admin/products/{id}/hide` | kiểm duyệt listing |
| GET | `/api/v1/admin/reports/orders` | query `from, to, marketId` |
| GET | `/api/v1/admin/reports/revenue` | doanh thu theo chợ |
| GET | `/api/v1/admin/reports/top-farmers` | |
| GET | `/api/v1/admin/announcements` | **Đã có** — query `page`, `size` (≤50); mới nhất trước |
| POST | `/api/v1/admin/announcements` | **Đã có** — `{ title (≤150), content (≤1000), audience: "all" \| "customers" \| "farmers", startsAt?, endsAt? }` → 201 `AnnouncementResource`; **gửi ngay** một thông báo cho mọi user `active` thuộc audience (admin không nhận) |
| PUT | `/api/v1/admin/announcements/{id}` | **Đã có** — cùng body; chỉ sửa banner, **không** sửa thông báo đã gửi |
| DELETE | `/api/v1/admin/announcements/{id}` | **Đã có** — gỡ banner (`active = false`); thông báo đã gửi vẫn giữ |
| GET | `/api/v1/announcements/active` | **Đã có**, **Public** — banner đang hiệu lực mới nhất **mà người xem thuộc audience**, `null` nếu không có. Gửi kèm access token thì lọc theo role của phiên (customer: `all` + `customers`, farmer: `all` + `farmers`); khách vãng lai và admin chỉ thấy `all` |

`AnnouncementResource`: `{ id, title, content, audience, active, startsAt, endsAt, createdAt }`. `endsAt` phải sau
`startsAt` (400). Banner hiện khi `active` và `startsAt ≤ now < endsAt` (null = không giới hạn phía đó).

---

## 11. Feedback & Chatbot — FR-081, 090…092

| Method | Path | Role | Trạng thái | Body / query | data |
|---|---|---|---|---|---|
| POST | `/api/v1/feedbacks` | Public | Chưa làm | `{ type: "bug" \| "suggestion" \| "query", message }` | `null` |
| GET | `/api/v1/admin/feedbacks` | Admin | Chưa làm | | |
| POST | `/api/v1/chat` | Public | **Đã có** | `{ sessionKey, message }` | `{ reply, intent, results[] }` |
| GET | `/api/v1/chat/history` | Public | **Đã có** | query `sessionKey` | `[{ role, message, intent, createdAt }]` |

- `sessionKey` do FE sinh (UUID) và giữ trong localStorage, 8–64 ký tự `[A-Za-z0-9_-]`.
  `message` dài 1–500 ký tự.
- `results[]` có dạng `{ type: "product" | "market" | "farmer", id, title, subtitle }`.
- Intent được phân loại bằng luật từ khoá rồi map sang **câu SQL viết sẵn có tham số**.
  **LLM không bao giờ sinh SQL** (R-04). Chi tiết trong `docs/chatbot-design.md`.
- Có token thì backend gắn `user_id` vào lịch sử; khách vãng lai vẫn hỏi được.

---

## 12. Chat người–người — FR-110…117 (ngoài đề)

> **Không nhầm với chatbot ở mục 11.** Đây là nhắn tin giữa hai con người (Customer ↔ Farmer),
> đường dẫn `/api/v1/conversations`, bảng `conversations` / `messages`. Chatbot FR-090 ở
> `/api/v1/chat`, bảng `chat_messages`. Tính năng này **không có trong đề** — thiết kế và cảnh báo
> phạm vi ở `docs/superpowers/specs/2026-09-25-farmer-customer-chat-design.md`.

Mọi endpoint dưới đây **đều yêu cầu đăng nhập**. Khách vãng lai không có chat.

| Method | Path | Role | Trạng thái | Body / query | data |
|---|---|---|---|---|---|
| POST | `/api/v1/conversations` | Thành viên | **Đã có** | `{ farmerUserId }` | Thread; idempotent — có rồi thì trả lại cái cũ |
| GET | `/api/v1/conversations` | Thành viên | **Đã có** | query `page`, `size` | `{ items[], page, size, total }`, mới nhất trước |
| GET | `/api/v1/conversations/unread-count` | Thành viên | **Đã có** | | `{ count }` |
| GET | `/api/v1/conversations/{id}/messages` | Thành viên | **Đã có** | query `before`, `size` | `[MessageResource]`, keyset, mới nhất trước |
| POST | `/api/v1/conversations/{id}/messages` | Thành viên | **Đã có** | `{ kind?, body?, productId?, orderId?, attachmentId? }` | 201 · `MessageResource` |
| POST | `/api/v1/conversations/{id}/read` | Thành viên | **Đã có** | | `null` |
| POST | `/api/v1/attachments` | Thành viên | **Đã có** | `multipart/form-data`, field `file` | 201 · `{ attachmentId, url, width, height }` |
| GET | `/api/v1/attachments/{id}` | Thành viên | **Đã có** | | **File nhị phân** — xem ghi chú |
| POST | `/api/v1/messages/{id}/report` | Thành viên | **Đã có** | `{ reason: "spam"｜"abuse"｜"scam"｜"other", note? }` | 201 · `{ id, messageId, reason, note, status, createdAt }` |
| GET | `/api/v1/admin/message-reports` | Admin | **Đã có** | query `status`, `page`, `pageSize` | `{ items[], page, pageSize, total }` |
| GET | `/api/v1/admin/message-reports/{id}` | Admin | **Đã có** | | Chi tiết + `context[]` (tin bị báo + tối đa 5 tin mỗi bên) |
| PATCH | `/api/v1/admin/message-reports/{id}/dismiss` | Admin | **Đã có** | | Báo cáo chuyển `reviewed`, tin không đổi |
| PATCH | `/api/v1/admin/messages/{id}/hide` | Admin | **Đã có** | | Ẩn mềm, ghi `hiddenBy` + `hiddenAt`; idempotent |

**`MessageResource`**

```json
{
  "id": 36, "conversationId": 61, "senderId": 124,
  "kind": "text",
  "body": "Rau còn tươi không chị?",
  "productId": null, "orderId": null,
  "attachment": null,
  "createdAt": "2026-09-25T11:50:35.546035Z"
}
```

- `kind` là `"text"` | `"image"` (`"offer"` và `"system"` là đợt 2, gửi lên bây giờ trả 400).
- `kind: "text"` cần `body`; `kind: "image"` cần `attachmentId` và **không** cần `body`.
- `attachment` chỉ có mặt khi tin là ảnh: `{ attachmentId, url, width, height }`.
  Trường nào `null` thì **vắng mặt hẳn** khỏi JSON (`@JsonInclude(NON_NULL)`).
- Tin bị admin ẩn **không xuất hiện** trong danh sách, và ảnh của nó trả 404.

**Kiểm duyệt — ranh giới của admin (spec §8.3)**

> **Không có endpoint nào nhận `conversationId`.** Mọi thứ admin đọc được đều bắt đầu từ một báo
> cáo. Không có màn "duyệt toàn bộ hộp thư".

- `GET /api/v1/admin/message-reports/{id}` trả `context[]`: tin bị báo cáo cùng **tối đa 5 tin liền
  trước và 5 tin liền sau**, trong đúng thread đó, xếp theo `id` tăng dần. Đó là **toàn bộ** những
  gì admin đọc được trong thread.
- Mỗi phần tử `context[]`: `{ id, senderId, senderName, kind, body, hasPhoto, reported, hidden, createdAt }`.
  Tin bị admin ẩn **vẫn hiện với admin** kèm `hidden: true` (khác người dùng thường, vốn không thấy nó nữa).
- Hàng đợi chỉ trả `preview` cắt **80 ký tự**, không trả toàn văn — nó là nơi quyết định có mở ra
  xem không, không phải nơi đọc hàng loạt. Tin ảnh hiện `Photo`.
- `PATCH .../hide` **idempotent**: ẩn một tin đã bị ẩn trả 200 và **không ghi đè** `hiddenBy` /
  `hiddenAt` của admin trước — người xử lý trước là người chịu trách nhiệm.
- Ẩn một tin **chưa ai báo cáo** → **403 `MODERATION_OUT_OF_SCOPE`**.
- `PATCH .../dismiss` là bổ sung ngoài bảng gốc của thiết kế: không có nó thì báo cáo admin xem rồi
  quyết định không ẩn sẽ nằm lại `new` mãi và hàng đợi không bao giờ vơi.
- **Ảnh:** admin xem được ảnh của tin **đã bị báo cáo**, **không** xem được ảnh của ±5 tin ngữ cảnh.
  Mỗi lần mở ghi một dòng log. Hệ quả có chủ ý: admin đồng thời là khách hàng trong một thread sẽ
  đi nhánh admin và không xem được ảnh riêng của chính mình ở đó nếu tin chưa bị báo cáo.

**Ảnh — `GET /api/v1/attachments/{id}`**

- Trả **file nhị phân**, **không** bọc `ApiResource`. Đây là ngoại lệ có chủ ý của quy ước envelope,
  giống mọi endpoint tải file. Lỗi thì vẫn trả envelope bình thường.
- Header: `Content-Type` theo file thật, `Cache-Control: max-age=86400, private`,
  `Content-Disposition: inline`, `X-Content-Type-Options: nosniff`.
- Kiểm quyền: ảnh chưa gắn vào tin nào thì **chỉ người upload** xem được; ảnh đã gắn thì **cả hai
  thành viên** của thread xem được, người ngoài nhận 403.
- Ảnh **không** phục vụ qua `/uploads/**`. Thư mục lưu là `CHAT_UPLOAD_DIR`, tách hẳn khỏi
  `app.storage.dir`, nên không có đường dẫn tĩnh nào đoán được.
- Upload: jpg/png/webp, tối đa **5 MB**, kiểu kết luận từ **magic bytes** chứ không từ
  `Content-Type` client gửi. JPEG/PNG được mã hoá lại thành JPEG nên EXIF rụng hết.
  Ảnh upload mà 24 giờ không gửi thì job dọn đi.

⚠️ **Ghi chú cho frontend:** JWT đi trong header `Authorization`, **không** trong cookie, nên
`<img src="/api/v1/attachments/5">` sẽ trả **401**. Client phải `fetch` kèm header rồi
`URL.createObjectURL(blob)`.

**Realtime — `/ws`**

- WebSocket thuần (không SockJS), client dùng `@stomp/stompjs`. JWT gửi ở header `Authorization`
  của frame `CONNECT`, không phải ở handshake HTTP.
- Nhận sự kiện tại `/user/topic/messages` (tin mới), `/user/topic/conversations`
  (`{ type: "updated" | "read" | "hidden", … }`), `/user/topic/presence`, `/user/topic/typing`.
- `{ type: "hidden", conversationId, messageId }` (FR-116): admin vừa ẩn một tin — **cả hai** người
  trong thread nhận, kể cả người gửi tin đó, và client bỏ nó khỏi khung chat mà không cần tải lại.
- Gửi "đang gõ" tại `/app/typing`. Đây là thứ duy nhất đi *vào* bằng STOMP; tin nhắn luôn gửi
  bằng REST rồi server mới phát đi.

**Mã lỗi riêng của khối này** (ngoài các mã chung ở đầu tài liệu)

| Mã | `error.code` | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Tự nhắn cho chính mình · tin text rỗng · `kind` chưa hỗ trợ · ảnh quá 4096 px mỗi cạnh |
| 403 | `NOT_A_MEMBER` | Không thuộc thread |
| 403 | `STALL_NOT_OPEN` | Stall chưa được duyệt hoặc đang bị đình chỉ — không mở thread mới được |
| 403 | `ACCOUNT_RESTRICTED` | Tài khoản không còn `active` |
| 400 | `VALIDATION_ERROR` | Tự báo cáo tin của chính mình (spec §8.5: người gửi không gỡ được tin của mình) |
| 403 | `ATTACHMENT_NOT_YOURS` | Gắn ảnh của người khác vào tin của mình · xin ảnh chưa gắn tin của người khác |
| 403 | `MODERATION_OUT_OF_SCOPE` | Admin thao tác trên tin chưa ai báo cáo, hoặc xin ảnh của tin ngữ cảnh |
| 409 | `ALREADY_REPORTED` | Báo cáo một tin mình đã báo rồi |
| 409 | `CONVERSATION_CLOSED` | Stall bị đình chỉ — thread cũ vẫn **đọc** được, chỉ không gửi thêm (D-09) |
| 409 | `ATTACHMENT_ALREADY_USED` | Một ảnh chỉ gắn được vào đúng một tin |
| 413 | `ATTACHMENT_TOO_LARGE` | Ảnh quá 5 MB (trần của endpoint) |
| 413 | `PAYLOAD_TOO_LARGE` | File quá 40 MB — Tomcat chặn khi đọc body, trước khi biết controller nào nhận (`UploadExceptionHandler` toàn cục) |
| 415 | `UNSUPPORTED_IMAGE_TYPE` | Không phải jpg/png/webp (kết luận từ magic bytes) |
| 429 | `RATE_LIMITED` | 30 tin/phút · 10 ảnh/giờ · 20 thread mới/giờ, mỗi mức tính theo từng user. Thêm **120 frame `/app/typing`/phút**, nhưng frame vượt ngưỡng **bị bỏ im lặng** — STOMP không có mã HTTP để trả |

---

**Quy tắc bổ sung:** mọi endpoint có `{id}` phải kiểm tra quyền sở hữu trước khi trả dữ liệu.
Farmer chỉ thấy đơn của mình, Customer chỉ thấy đơn của mình. Giám khảo sẽ test bằng cách đổi id
trên URL.

**Route public phải khai báo trong `SecurityConfig`.** Không khai thì Spring Security mặc định là
`authenticated()` và endpoint trả 401 dù contract ghi là Public.
