# Project Report — dàn ý (SRS §1.9)

> **QA/DOC viết phần chữ.** Dàn ý này chỉ nói mỗi mục cần gì và lấy số liệu ở đâu.
>
> Hai luật của đề, đọc lại trước khi viết:
> - *"Do not use AI tools to fully produce ready-made documentation. This is strictly forbidden."* (SRS tr.13)
> - *"Documentation should not contain any source code."* (SRS §1.9) — sơ đồ, bảng và ảnh màn hình thì được;
>   không dán đoạn code nào, kể cả câu SQL hay JSON.
>
> Nộp dưới dạng `.docx`. Hai mục **MANDATORY** là §6 và §7 — thiếu là mất điểm cứng.

---

## 1. Problem Definition

Lấy bối cảnh từ SRS §1.1 và viết lại **bằng lời của đội**, 2–3 đoạn:

- Khách không biết trước hôm nay ai bán ở chợ, còn hàng gì, giá bao nhiêu. Thông tin truyền miệng, bảng phấn,
  tờ rơi → đi chợ về tay không, hoặc tới nơi thì món cần mua đã hết.
- Nhà vườn không có cách công bố hàng tuần, không nhận đặt trước được, không giữ được khách quen.
- MarketLink gom cả hai phía vào một chỗ: sạp đăng hàng theo tuần, khách đặt trước và chọn giờ tới lấy.

Nêu rõ **ba thứ đề chủ động loại khỏi phạm vi** (SRS §1.5) — viết hẳn thành một đoạn, vì đó là lựa chọn thiết
kế chứ không phải thiếu sót:

| Không làm | Vì |
|---|---|
| Cổng thanh toán | Đề quy định trả tiền mặt tại sạp khi nhận hàng |
| Giao hàng / logistics | Đề chỉ hỗ trợ nhận tại chợ |
| Xác minh danh tính, giấy phép, chứng nhận organic của sạp | Đề ghi rõ không thuộc chức năng ứng dụng |

## 2. Design Specifications

- **Ba vai và ranh giới quyền**: `customer`, `farmer`, `admin`. Quyền kiểm ở server (`@PreAuthorize` + kiểm
  quyền sở hữu theo từng bản ghi), không chỉ ẩn nút ở giao diện.
- **Vòng đời đơn**: `placed → accepted → ready → completed`, hai nhánh rẽ `declined` và `cancelled`.
  Chuyển sai thứ tự → 409.
- **Trục thời gian** — thứ làm MarketLink khác một sàn bán hàng thường, nên viết kỹ:
  ngày họp chợ của từng chợ · ngày bán của từng sạp · khung giờ nhận hàng · **giờ chốt đơn (cutoff)** quyết
  định khách còn được sửa hay huỷ · **template tồn kho lặp theo tuần**.
- **Bảng module ↔ vai**: lấy từ `docs/requirements/MarketLink-Feature-Catalog-by-Module-and-Role.md`.
- **Kiến trúc**: React SPA → REST `/api/v1` → Spring Boot → MySQL. Ảnh sơ đồ ở §3.

## 3. Sơ đồ — vẽ ra PNG, để trong `docs/submission/diagrams/`

| File | Nội dung | Dựng từ |
|---|---|---|
| `flow-order.png` | Flowchart vòng đời đơn, đủ 6 trạng thái, có nhánh cutoff | `docs/decisions.md` D-04, D-05, D-07 |
| `dfd-level0.png` | DFD mức 0 — Customer / Farmer / Admin ↔ MarketLink ↔ MySQL | SRS trang 7 |
| `dfd-level1.png` | DFD mức 1 — tách theo module: auth, catalog, order, review, notification | `backend/.../modules/` |
| `erd.png` | ERD, khoá chính và khoá ngoại | `db/marketlink-schema-dump.sql` |

Kiểm trước khi nộp: mở từng PNG ở 100% phải đọc được chữ; in ra A4 vẫn phải đọc được.

## 4. Database Design

Số liệu thật (đếm ngày 27/09/2026):

| Chỉ số | Giá trị |
|---|---|
| Bảng trong thiết kế ban đầu `db/schema.sql` | 28 |
| Bảng thật đang chạy `db/marketlink-schema-dump.sql` | 41 |
| Migration Flyway | 41 |

Mô tả bảng chính và quan hệ **dưới dạng bảng chữ**, không dán câu `CREATE TABLE`.

**Một đoạn riêng, quan trọng — chỗ đội sửa khác gợi ý của đề.** SRS trang 16 gợi ý bảng `Orders` chứa thẳng
`product_id`, nghĩa là một đơn chỉ mua được một sản phẩm; điều đó mâu thuẫn với chính yêu cầu giỏ hàng ở §1.6.
Đội tách `order_items` và thêm `order_status_history` để lưu vết mọi lần đổi trạng thái. Đề cho phép
(*"you may design your own table structure as per your logic"*). Giám khảo nhiều khả năng sẽ hỏi chỗ này.

## 5. Test Data

`make seed` nạp `db/seed.sql`, chạy lại nhiều lần được. Nội dung: 4 chợ TP.HCM toạ độ thật · 10 sạp đã duyệt ·
51 sản phẩm (1 bị admin ẩn để demo kiểm duyệt) · 12 đơn rải đủ 6 trạng thái, trong đó 4 đơn `completed` để mở
khoá phần đánh giá. Mô tả đầy đủ ở `docs/DEMO_CREDENTIALS.md`.

Tuỳ chọn: `db/seed-extended.sql` thêm 6 tháng lịch sử để báo cáo doanh thu có số liệu (`db/README.md`).

## 6. Installation Instructions — **MANDATORY**

Chép từ `README.md` §Quick start và `docs/setup.md`, rút thành các bước đánh số:

1. Yêu cầu máy: Docker Desktop; cổng 3000, 8080, 3306 phải rảnh.
2. `make init` → tạo `.env`.
3. `make up` → mysql, redis, rabbitmq, backend :8080, frontend :3000.
4. Chờ Flyway chạy xong (`make logs s=backend`).
5. `make seed` → nạp dữ liệu demo.
6. Mở `http://localhost:3000`.

Thêm mục xử lý sự cố ngắn: cổng bận, Flyway chưa xong, `make down` rồi `make up`.

## 7. User Credentials — **MANDATORY**

Chép nguyên bảng ở `docs/DEMO_CREDENTIALS.md`: bốn tài khoản, mật khẩu chung `Demo@1234`.
Giữ cột **"đăng nhập ở đâu"** — admin vào `/admin/login`, không phải `/login`.

**Chép cả mục "Đăng nhập admin lần đầu — bắt buộc cài 2FA" sang báo cáo.** Admin bị chặn ở
`/admin/setup-2fa` cho tới khi cài xong xác thực hai bước, và màn đó không có nút bỏ qua. Giám khảo không
đọc được hướng dẫn này thì không vào được dashboard, nghĩa là không chấm được FR-004 và FR-070…077.
Nhắc luôn cách tắt ở `/admin/security` cho người chỉ muốn xem nhanh.

## 8. Tasks Allotted to Team

Sáu dòng. Tên lấy từ hằng `MEMBERS` trong `frontend/src/pages/public/About/index.tsx`; phần việc lấy từ cột
`Vai` và `Owner` trong `.ai/REQUIREMENTS.md`.

| Vai | Tên | Phụ trách |
|---|---|---|
| LEAD | | Lược đồ dữ liệu, hợp đồng API, 13 quyết định D-01…D-13 |
| BE1 | | Đăng nhập, phân quyền, vòng đời đơn hàng |
| BE2 | | Sản phẩm, chợ, tồn kho tuần, báo cáo, dữ liệu seed |
| FE1 | | Design system, trang public, bản đồ, dashboard Customer |
| FE2 | | Dashboard Farmer và Admin, toàn bộ form |
| QA/DOC | | Danh sách yêu cầu, dữ liệu kiểm thử, tài liệu nộp bài |

## 9. Testing

| Loại | Kết quả |
|---|---|
| Test tự động frontend | 286 test (`npx vitest run`), 49 file |
| Test tự động backend | 134 file test (`make be-test`) |
| Responsive 375 / 768 / 1440 | 51 trang, không trang nào tràn ngang — `docs/submission/responsive-check.md` |
| Tương thích 4 trình duyệt | `docs/submission/browser-check.md` + 12 ảnh màn hình |

## 10. AI Tools Used

Chép từ `README.md` §"AI tools used". Đề **bắt buộc** phải khai (SRS tr.13).

## 11. Assumptions

Chép từ `docs/ASSUMPTIONS.md`. Kiểm xem đã có đủ bốn điều sau chưa, thiếu thì bổ sung:

- "Vendor" trong flow diagram của đề = "Farmer" trong ứng dụng; đội dùng một từ xuyên suốt.
- Sạp không đăng ký thành tài khoản riêng: đăng ký làm Customer rồi nộp hồ sơ ở `/become-farmer`. Năm trường
  đề yêu cầu (stall name, contact person, phone, email, address) đều được thu thập.
- Một tài khoản một người; đề để ngỏ việc chia sẻ tài khoản trong gia đình (optional), đội không làm.
- Thông tin liên hệ trên trang Contact là dữ liệu mẫu của đồ án *(bỏ dòng này nếu đội thay bằng dữ liệu thật)*.

---

## Quy mô dự án — số liệu để trích dẫn

| Chỉ số | Giá trị |
|---|---|
| Module backend | 15 |
| Controller | 50 |
| Endpoint REST | 149 |
| File Java (main) | 561 |
| File test Java | 134 |
| Trang frontend | 70 |
| Ngôn ngữ giao diện | 10 |
| Test frontend | 286 |

Đếm lại trước khi nộp bằng các lệnh ở `docs/submission/` — số phải khớp bản nộp, không ước lượng.
