# Đình chỉ Farmer — siết chặt theo D-09 + email, thời hạn, audit — thiết kế

- Ngày: 28/09/2026 · Người duyệt: (chủ dự án, đang test và hoàn chỉnh từng module)
- FR: FR-071 (Duyệt / từ chối / **đình chỉ** đăng ký Farmer — MUST hiện có). Phần **thời hạn đình chỉ, email,
  audit log, khoá panel** nằm **ngoài** dòng FR-071 hiện tại trong `.ai/REQUIREMENTS.md` — thực hiện theo yêu
  cầu trực tiếp của chủ dự án ngày 28/09/2026 (R-07: cần LEAD/QA bổ sung vào REQUIREMENTS, xem §9).
- Quyết định nền: **D-09** (`docs/decisions.md`) — không bàn lại, thiết kế này bám sát nó.
- Tiền lệ: FR-072 (deactivate Customer) vừa hoàn thành — tái dùng nguyên hạ tầng, xem §8.

## 1. Hiện trạng (đã verify bằng đọc code, không phải suy đoán)

Chủ dự án báo 3 điểm; kiểm chứng cho thấy:

| Báo cáo | Thực tế |
|---|---|
| Vẫn là role `farmer`, vào được panel | **Đúng hiện tượng, nhưng là CỐ Ý** — `FarmerService.suspend()` chỉ ghi `farmer_profiles`, không đụng `users.role`; D-09 yêu cầu farmer vẫn đăng nhập được |
| "Chưa chặn truy cập" | **Chưa chính xác** — mọi thao tác **ghi** đã bị chặn ở tầng service qua `requireApproved()` (sản phẩm, sạp, slot, tồn kho); đơn mới vào sạp cũng bị chặn |
| Không có email | **Đúng** — chỉ có notification chuông + web push (`FARMER_SUSPENDED` được dispatch thật); không job email nào cho farmer |
| Không có dialog | **Đúng** |

**Khoảng hở thật so với D-09:** D-09 chốt *"Farmer vẫn đăng nhập được nhưng **chỉ thấy đơn cũ**"*, nhưng panel
hiện vẫn hiện **đầy đủ menu và mọi trang đọc**. Dự án đã có sẵn `FarmerPendingPage` hiển thị banner đỏ kèm lý
do, nhưng **không có gì tự điều hướng farmer tới đó**.

**Đã có sẵn, không cần làm lại:** `farmer_profiles.suspend_reason` / `suspended_by` / `suspended_at`, reason
được FE gửi và BE lưu thật, notification chuông.

## 2. Mục tiêu

- Panel bị khoá đúng D-09: chỉ còn đơn hàng, các mục khác ẩn ở FE **và** chặn ở server.
- Hiệu lực **ngay lập tức**, kèm **dialog** nêu lý do — không phải đợi farmer tự phát hiện.
- **Email** chuyên nghiệp khi bị đình chỉ và khi được mở lại.
- Đình chỉ **vĩnh viễn hoặc tạm thời**, hết hạn thì cron tự mở lại.
- **Audit log** đầy đủ cho admin.

### Ngoài phạm vi (quyết định có chủ ý)

- **KHÔNG đổi `users.role`.** Chủ dự án ban đầu muốn đổi sang `customer`; điều đó mâu thuẫn trực tiếp D-09
  (`FarmerOrderController` yêu cầu `hasRole('FARMER')` → farmer không thể hoàn tất đơn khách đã đặt, khách mất
  hàng), đồng thời cắt chat sạp (`StallAccessPolicy`) và phá bất biến "role=FARMER ⇔ có `farmer_profiles`".
  Đã trình bày và chủ dự án chọn phương án bám D-09.
- Không đụng tới việc ẩn sản phẩm khỏi trang public (đã chạy đúng).
- Không đụng chat sạp — D-09 không nói tới, giữ nguyên hành vi.
- Không đụng luồng apply/approve/reject.

## 3. Data model (migration `V20260928004__add_farmer_suspension_fields.sql`)

```sql
ALTER TABLE farmer_profiles
  ADD COLUMN suspended_until DATETIME NULL COMMENT 'NULL = permanent while approval_status = suspended';

CREATE TABLE farmer_status_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  farmer_id BIGINT UNSIGNED NOT NULL,
  from_status VARCHAR(20) NOT NULL,
  to_status VARCHAR(20) NOT NULL,
  reason VARCHAR(255) NULL,
  until DATETIME NULL,
  changed_by BIGINT UNSIGNED NULL COMMENT 'NULL = the system (auto-reinstate cron)',
  changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_farmer_status_history_farmer (farmer_id, changed_at),
  CONSTRAINT fk_farmer_status_history_farmer FOREIGN KEY (farmer_id) REFERENCES farmer_profiles (id) ON DELETE CASCADE,
  CONSTRAINT fk_farmer_status_history_actor FOREIGN KEY (changed_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

Ba cột `suspend_reason` / `suspended_by` / `suspended_at` **tái dùng nguyên**, chỉ thêm thời hạn.

## 4. Khoá panel theo D-09

**Server** — mã lỗi mới `STALL_SUSPENDED` (403) kèm lý do + thời hạn, trả ra từ một guard dùng chung
`StallSuspensionMessage.assertNotSuspended(profile)` (cùng khuôn `DeactivationMessage.assertActive` của
FR-072, để một luồng mới không thể copy check mà quên message).

| Khu vực | Khi bị đình chỉ |
|---|---|
| Đơn hàng (xem + accept/decline/ready/complete) | **Mở** — D-09: đơn đang chạy phải chạy hết |
| Thông báo, Tin nhắn, Cài đặt, Tài khoản, trang trạng thái duyệt | **Mở** |
| Sản phẩm, Tồn kho, Slot, Hồ sơ sạp, Dashboard | **Chặn** (đọc lẫn ghi) |

Ghi đã bị chặn sẵn qua `requireApproved()`; phần thêm mới là chặn **đọc** ở các endpoint trên.

**Frontend** — `FarmerLayout` ẩn các mục menu bị khoá khi `approvalStatus === 'suspended'`, và điều hướng về
trang trạng thái. Ẩn nút chỉ là UX; quyền thật do server chặn (luật dự án).

## 5. Hiệu lực tức thì + dialog

`FarmerService.suspend()` gọi thêm `UserSessionCache.revokeAll(userId)` + revoke refresh token (đúng pattern
FR-072). Request kế tiếp của farmer bị từ chối → FE nhận `STALL_SUSPENDED` → hiện **dialog** nêu lý do, thời
hạn, email liên hệ, rồi đưa về trang trạng thái. Farmer **vẫn đăng nhập lại được** (D-09), chỉ là panel đã khoá.

Tái dùng cơ chế stash-qua-reload đã dựng cho FR-072 (`accountDeactivatedNotice` → tổng quát hoá), vì
`window.location.assign` phá React tree trước khi toast/dialog kịp vẽ.

## 6. Email

Tái dùng `MailTemplates` + `JobHandler`/`RedisJobWorker`:

- 2 template mới `mail/stall-suspended.html|txt`, `mail/stall-reinstated.html|txt` — cùng bộ nhận diện
  (header xanh MarketLink, card kem), multipart HTML + text.
- Copy trong `i18n/mail*.properties`, **đủ 10 ngôn ngữ**, gửi theo ngôn ngữ farmer chọn (`user_settings.language`).
- Nội dung: lý do, thời hạn (vĩnh viễn / tới thời điểm cụ thể), **nói rõ đơn đã nhận vẫn phải hoàn tất** (D-09),
  email liên hệ.
- Giá trị đi qua `MailTemplates` nên **tự động HTML-escape** — lý do admin gõ tay không thể chèn markup.

Giữ nguyên notification chuông `FARMER_SUSPENDED` / `FARMER_REINSTATED` đang có.

## 7. Thời hạn + tự mở lại

`FarmerSuspensionExpiryJob` (`@Scheduled(fixedDelayString = "PT60S")`, khuôn `CustomerBanExpiryJob`): tìm
`approval_status = 'suspended' AND suspended_until <= NOW()`, gọi **đúng `reinstate()`** mà admin bấm tay với
`actorId = null` — không nhân bản logic. Có try/catch **từng farmer** để một dòng lỗi không làm kẹt cả hàng đợi
(bài học từ review FR-072).

## 8. Audit

`GET /admin/farmers/{id}/status-history` → `PageResource`, join lấy tên admin thực hiện. FE: section
**"Stall history"** trên trang chi tiết Farmer của admin, đủ 4 trạng thái FR-084, hiển thị ngày **và giờ**
(`cutoffLabel`, không phải `formatDate` — bài học từ review FR-072).

## 9. Definition of Done

1. Chạy đúng trên `make up`.
2. Contract mới cần LEAD duyệt (R-02) — xem §10.
3. Quyền: `@PreAuthorize` giữ nguyên + guard `STALL_SUSPENDED` ở server, không chỉ ẩn menu.
4. Validate client + server: reason bắt buộc, `until` phải ở tương lai, max 255 ký tự (bài học FR-072: phải có
   `@Size` và handler cho `InvalidFieldException`, nếu không lỗi rơi ra 500).
5. UI đủ 4 trạng thái cho "Stall history".
6. Test: revoke session tức thì, cron tự mở lại, guard chặn đúng các trang, cho qua đúng đơn hàng (D-09),
   validate `until`, email render đủ placeholder. `make be-test` + `make lint` xanh.
7. Seed demo không bắt buộc.

## 10. Việc LEAD cần chốt (R-02 / R-07)

- `.ai/REQUIREMENTS.md` FR-071 hiện chỉ có *"Duyệt / từ chối / đình chỉ đăng ký Farmer"* — thời hạn, email,
  audit log, khoá panel cần được ghi vào để scope khớp với thứ đã làm.
- `docs/api-contract.md`: `PATCH /admin/farmers/{id}/suspend` thêm `until`; endpoint mới
  `GET /admin/farmers/{id}/status-history`; mã lỗi mới `STALL_SUSPENDED`.

## 11. Câu hỏi đã chốt với chủ dự án (28/09/2026)

1. **Role**: giữ `farmer`, khoá panel theo D-09 — *không* đổi sang `customer` (đã giải thích xung đột D-09).
2. **Thời hạn**: có cả vĩnh viễn và tạm thời, cron tự gỡ — giống FR-072.
3. **Thông báo**: email + dialog, giữ notification chuông.
4. **Audit**: có bảng lịch sử + section trên trang admin, giống Customer.
