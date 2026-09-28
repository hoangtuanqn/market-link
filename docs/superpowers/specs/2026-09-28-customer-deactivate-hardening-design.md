# Deactivate/Reactivate Customer — siết chặt an toàn + audit — thiết kế

- Ngày: 28/09/2026 · Người duyệt: (chủ dự án, đang đóng vai QA/tester cho module Customer)
- FR: FR-072 (Admin xem/kích hoạt/vô hiệu hoá Customer — MUST hiện có). Phần **thời hạn ban, email tự động,
  audit log, tự động huỷ order** nằm **ngoài** phạm vi FR-072 hiện tại trong `.ai/REQUIREMENTS.md` — thực hiện
  theo yêu cầu trực tiếp của chủ dự án trong phiên làm việc 28/09/2026 (R-07: cần LEAD/QA xác nhận bổ sung vào
  REQUIREMENTS sau khi xong, xem §9).
- Nguồn quyết định: hội thoại brainstorming ngày 28/09/2026 (7 câu hỏi/xác nhận đã chốt qua từng phần thiết kế,
  xem §8).

## 1. Vấn đề hiện tại (đã verify bằng cách đọc code)

Test thủ công cho thấy 5 vấn đề, tất cả đã xác nhận đúng với code:

1. **Deactivate không thu hồi phiên đang mở.** `AdminCustomerService.setStatus` chỉ gọi
   `RefreshTokenService.revokeAllTokens()` (revoke refresh token trong DB) — không gọi
   `UserSessionCache.revokeAll()`. Access token (sống 15 phút) vẫn dùng được bình thường tới khi hết hạn tự
   nhiên. Cơ chế thu hồi tức thời (`UserSessionCache.revokeAll()` + marker "revoked-before" mà
   `JwtAuthFilter` kiểm tra mỗi request) **đã tồn tại sẵn**, đang dùng cho đổi/reset mật khẩu — chỉ chưa được
   áp dụng cho deactivate.
2. Login lần sau đã bị chặn đúng (`UserService.authenticate` check `status != ACTIVE`) — không phải bug.
3. **Không có audit log.** Comment trong `CustomerDetail/index.tsx` tự thừa nhận: "There is no
   account-history endpoint". `ReasonPicker` ở FE đã có UI nhập lý do nhưng **chỉ echo ra toast, không gửi
   lên server** — `CustomerStatusRequest` chỉ có field `status`.
4. **Không có khái niệm thời hạn** (permanent/temporary) — chỉ toggle `active`/`inactive`.
5. **Không có email tự động** khi deactivate — nhưng hạ tầng gửi email (`MailService` + `JavaMailSender`,
   pattern `JobHandler`/`RedisJobWorker` bất đồng bộ) đã hoạt động sẵn cho FR-007 (password reset).

## 2. Mục tiêu

Khi admin deactivate một Customer:

- Thu hồi phiên **ngay lập tức** (không đợi access token hết hạn), chặn mọi request tiếp theo.
- Người dùng đang browse bị đẩy về Home kèm toast giải thích lý do (khác với luồng hết-phiên thông thường).
- Có thể chọn **vĩnh viễn** hoặc **tạm thời** (theo phút/giờ/ngày, hoặc một thời điểm cụ thể); hết hạn tạm
  thời thì **tự động** reactivate qua cron, không cần admin can thiệp lại.
- Gửi **email tự động** (chuyên nghiệp, lịch sự) mỗi khi có quyết định deactivate/reactivate — kể cả khi cron
  tự mở lại.
- Trang chi tiết Customer có **section lịch sử** đầy đủ (ai, khi nào, lý do, thời hạn).
- Ban **vĩnh viễn** thì tự động huỷ mọi order đang `placed`/`accepted` của khách đó, hoàn trả tồn kho, và báo
  cho Farmer biết lý do thật (không để farmer hiểu lầm là khách tự huỷ).
- Login khi đang bị ban hiển thị đúng lý do + thời hạn (nếu tạm thời).

### Ngoài phạm vi

- Không đổi ý nghĩa `users.status = suspended` (đang không dùng, giữ nguyên ngoài phạm vi).
- Không đụng tới ràng buộc Orders/Reviews/Favorites/Profile khác ngoài việc huỷ order đang mở khi ban vĩnh
  viễn (đã liệt kê ở §2) — review cũ, favorites, dữ liệu profile giữ nguyên không xoá/ẩn.
- Ban **tạm thời** không tự huỷ order — khách có thể quay lại trước khi order tới hạn pickup.
- Không thêm WebSocket/real-time push riêng để đẩy người dùng ra ngay khi đang ở giữa trang — dựa vào lần gọi
  API tiếp theo của SPA (interceptor 401 đã có sẵn) là đủ, vì access token tối đa còn hiệu lực tới request kế
  tiếp bị chặn ngay (không phải đợi 15 phút — xem §3).

## 3. Thu hồi phiên + chặn request (backend)

`AdminCustomerService.setStatus`, khi `target == INACTIVE`, gọi thêm `userSessionCache.revokeAll(userId)`
(pattern y hệt `UserService`/`PasswordResetService` đang dùng cho đổi mật khẩu) bên cạnh
`refreshTokens.revokeAllTokens()` hiện có.

**Mã lỗi mới `ACCOUNT_DEACTIVATED`:** trong `JwtAuthFilter`, ở đúng 2 nhánh hiện đang trả "Your session has
expired" (`session == null` hoặc `userSessionCache.isRevoked(...)` = true), đọc thêm
`users.deactivated_until`/`deactivation_reason` của `userId` đó (chỉ 1 lần, đúng lúc token bị từ chối — không
phải mỗi request hợp lệ) — nếu `status == INACTIVE`, trả mã `ACCOUNT_DEACTIVATED` kèm lý do + thời hạn thay vì
message chung.

FE (`axiosInstance.ts`, interceptor response hiện có) bắt riêng mã `ACCOUNT_DEACTIVATED`: show toast nêu lý
do, `Session.clear()`, điều hướng `navigate('/')` — khác với luồng hết-phiên thông thường (đổi mật khẩu, hết
hạn 30 ngày) vẫn để `RequireAuth` tự đưa về `/login` như cũ, không đổi hành vi đó.

## 4. Data model (migration mới)

Thêm vào `users` (migration `V20260928003__add_customer_deactivation_fields.sql` — kế tiếp
`V20260928002__create_platform_status_table.sql`):

```sql
ALTER TABLE users
  ADD COLUMN deactivated_until DATETIME NULL COMMENT 'NULL = permanent when status=inactive',
  ADD COLUMN deactivation_reason VARCHAR(255) NULL;
```

Bảng mới `user_status_history` (theo đúng khuôn `order_status_history`/`farmer_application_history`):

```sql
CREATE TABLE user_status_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  from_status VARCHAR(20) NOT NULL,
  to_status VARCHAR(20) NOT NULL,
  reason VARCHAR(255) NULL,
  until DATETIME NULL,              -- snapshot của deactivated_until tại thời điểm hành động
  changed_by BIGINT UNSIGNED NULL,  -- NULL = hệ thống (cron tự reactivate)
  changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_status_history_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_status_history_actor FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL,
  KEY idx_user_status_history_user (user_id, changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

Mỗi lần deactivate/reactivate (kể cả tự động bởi cron) insert 1 dòng — nguồn duy nhất cho audit log (§7).

## 5. Admin UI: thời hạn + lý do (được gửi thật)

Dialog Deactivate ở `Customers/index.tsx` (list) và `CustomerDetail/index.tsx` thêm:

- Radio **Permanent / Temporary** (mặc định Permanent — giữ hành vi hiện tại).
- Temporary: ô nhập số + dropdown đơn vị (phút/giờ/ngày) **hoặc** tab chọn thời điểm cụ thể (datetime
  picker) — cả hai quy về một giá trị `until` (ISO datetime, phải ở tương lai) gửi lên server.
- `ReasonPicker` đã có sẵn (5 lý do dựng sẵn + note) — đổi thành **bắt buộc** (`required`, hiện đang không
  set prop này) và **giờ thật sự gửi lên server** thay vì chỉ echo ra toast (sửa kèm bug nhỏ này): email
  (§6) và audit log (§7) cần một lý do thật, không thể để trống.

Backend: `CustomerStatusRequest` thêm 2 field optional ở mức bean validation — `reason: String`,
`until: Instant` — nhưng bắt buộc theo logic nghiệp vụ trong service: khi `status=inactive`, `reason` không
được rỗng (ném lỗi 400 nếu thiếu, kiểm tra thủ công trong `AdminCustomerService.setStatus` vì Bean Validation
không hỗ trợ tốt "bắt buộc có điều kiện" giữa 2 field). Nếu có `until` thì phải ở tương lai. Khi
`status=active` (reactivate), cả 2 field bị bỏ qua nếu có gửi kèm — không lỗi, reactivate không cần lý do bắt
buộc (giữ đúng UI hiện tại, xem §7). `AdminCustomerService.setStatus`
nhận thêm 2 tham số, ghi vào `users.deactivation_reason`/`deactivated_until`, insert 1 dòng
`user_status_history`.

**`docs/api-contract.md` (LEAD-owned, R-02):** đề xuất bổ sung 2 field trên vào request `PATCH
/admin/customers/{id}/status` + endpoint mới `GET /admin/customers/{id}/status-history` (§7) — đề xuất, không
tự sửa file.

## 6. Thông báo lúc login lại + email

**Login (`UserService.authenticate`):** thay message cứng bằng message động đọc `deactivation_reason` +
`deactivated_until`:

- Permanent: "Your account has been deactivated. Reason: {reason}. Please contact an administrator."
- Temporary: "Your account has been temporarily suspended until {dd/MM/yyyy HH:mm}. Reason: {reason}."

**Email (bất đồng bộ, pattern `JobHandler`/`RedisJobWorker` giống `PasswordChangedNoticeJob`):**

- Deactivate (permanent hoặc temporary) → email nêu lý do, thời hạn cụ thể (nếu tạm thời) hoặc "permanently"
  (nếu vĩnh viễn), hướng dẫn liên hệ admin nếu khiếu nại.
- Reactivate — **cả thủ công lẫn tự động bởi cron** — đều gửi email báo tài khoản đã hoạt động lại (đồng bộ
  hành vi giữa 2 trường hợp theo yêu cầu).
- Nội dung tiếng Anh (R-09, theo đúng pattern `PasswordChangedNoticeJob` hiện tại).

## 7. Audit log UI (Customer Detail)

Section mới **"Account history"** trong `CustomerDetail/index.tsx`, hiển thị `user_status_history` của
customer đó, mới nhất trước — cột: Thời gian / Hành động / Lý do / Thời hạn / Thực hiện bởi (tên admin, hoặc
"System (auto)" khi `changed_by IS NULL`).

Backend: `GET /admin/customers/{id}/status-history` — `PageResource`, đọc `user_status_history` join `users`
lấy tên admin thực hiện. FE dùng `useRequest` load riêng, đủ 4 trạng thái loading/empty/error/data (FR-084).

## 8. Cron tự động reactivate

`@Scheduled(fixedDelayString = "PT60S")` job mới (theo pattern `ChatSessionSweeper`/`RefreshTokenCleanupJob`):
mỗi phút, query `users WHERE status='inactive' AND deactivated_until IS NOT NULL AND deactivated_until <=
NOW()`; với mỗi user: `status=active`, xoá `deactivated_until`/`deactivation_reason`, insert
`user_status_history` (`changed_by=NULL`), enqueue email reactivate (§6).

## 9. Tự động huỷ order khi ban vĩnh viễn

Chỉ áp dụng khi **Permanent**. Tái dùng "single door" `OrderService.transition()` sẵn có (đã xử lý D-02
restore stock + FR-038 ghi `order_status_history` cùng một chỗ):

- `OrderService` thêm method `cancelAllForDeactivatedCustomer(customerId, adminActorId)`: tìm mọi order của
  customer có status `PLACED`/`ACCEPTED`, mỗi order — lock order →
  `transition(order, CANCELLED, adminActorId, "Cancelled: customer account permanently deactivated.")` (stock
  tự động cộng trả) → `notifyFarmer(order, ORDER_CANCELLED_ACCOUNT_DEACTIVATED, Map.of())`.
- `NotificationKind` thêm giá trị mới `ORDER_CANCELLED_ACCOUNT_DEACTIVATED` (khác `ORDER_CANCELLED` vì message
  hiện tại "The customer cancelled order {order}." sai ngữ cảnh — farmer sẽ hiểu lầm khách tự huỷ). Thêm key
  `notification.order_cancelled_account_deactivated.{title,message}` vào cả 10 file
  `i18n/notifications_*.properties`. Note trong `order_status_history` cũng hiện sẵn trong timeline order
  detail của farmer (UI đã có, không cần dựng thêm).
- Chạy đồng bộ trong cùng transaction với hành động deactivate (số order `PLACED`/`ACCEPTED` của 1 customer
  tại 1 thời điểm luôn rất ít).
- `AdminCustomerService.setStatus` gọi method này khi `target == INACTIVE && until == null` (permanent), sau
  khi đã set status + revoke session.

## 10. Định nghĩa "Done" cho phần này (7 điều kiện, theo CLAUDE.md gốc)

1. Chạy đúng trên `make up`.
2. Đúng contract mới được đề xuất — cần LEAD duyệt trước khi merge (R-02).
3. Quyền: chỉ `ROLE_ADMIN` gọi được các endpoint mới (đã có `@PreAuthorize` ở `AdminCustomerController`, giữ
   nguyên).
4. Validate cả client (`ReasonPicker` bắt buộc, `until` phải ở tương lai) và server (§5).
5. UI đủ 4 trạng thái (loading/empty/error/data) cho "Account history".
6. Test cho: revoke session ngay lập tức, cron auto-reactivate, huỷ order + restore stock khi ban vĩnh viễn,
   validate `until` tương lai, message login động. `make be-test` + `make lint` xanh.
7. Seed data: thêm 1-2 dòng `user_status_history` mẫu (tuỳ chọn, không bắt buộc) để trang audit log không rỗng
   khi demo.

## 11. Câu hỏi đã chốt trong phiên brainstorming (28/09/2026)

1. Hết hạn ban tạm thời → tự động reactivate qua **cron**, không phải kiểm tra lazy lúc login/request.
2. Redirect khi bị kick giữa phiên → **Home ("/") kèm toast lý do**, khác luồng hết-phiên thường (vẫn về
   `/login`).
3. Cron reactivate **cũng gửi email**, đồng bộ với reactivate thủ công.
4. Giữ nguyên ràng buộc Orders (trừ auto-cancel dưới đây)/Reviews/Favorites/Profile.
5. Ban vĩnh viễn → tự động huỷ order `placed`/`accepted`, hoàn kho, báo Farmer đúng lý do (không phải "khách
   tự huỷ") — đặc biệt với `accepted` farmer cần biết rõ để không chuẩn bị hàng vô ích.
