# Kiểm tương thích trình duyệt

Rubric End-to-End, mục Compatibility (5 điểm): *"Test with at least 3 to 4 browsers: Firefox, Chrome, Edge,
and Opera. The site should work well and consistently across all popular browsers."*

Năm điểm này gần như cho không — chỉ cần mở đủ bốn trình duyệt, xem ba màn, chụp ảnh.

- Ngày kiểm: ⟨điền⟩
- Bản: nhánh ⟨điền⟩ @ ⟨commit⟩
- Chạy tại `http://localhost:3000` sau `make up` + `make seed`
- Tài khoản: `docs/DEMO_CREDENTIALS.md`, mật khẩu chung `Demo@1234`

## Ba màn đại diện

Chọn ba màn vì chúng đại diện ba kiểu giao diện khác nhau, không phải vì chúng dễ:

| Màn | URL | Kiểm cái gì |
|---|---|---|
| Danh sách chợ có bản đồ | `/markets` | Leaflet, ghim bản đồ, nút chỉ đường |
| Giỏ hàng và đặt đơn | `/cart` (đăng nhập `customer@marketlink.vn`) | Form, tính tiền, chọn ngày và khung giờ |
| Bảng quản trị | `/admin/farmers` (đăng nhập `admin@marketlink.vn` ở `/admin/login`) | Bảng nhiều cột, hộp thoại, bộ lọc |

## Cách kiểm mỗi ô

1. Trang render đúng — bản đồ hiện ghim, giỏ tính ra tiền, bảng hiện đủ dòng.
2. Console không có lỗi đỏ (`F12` → Console).
3. Chụp màn hình lưu vào `docs/submission/screenshots/<browser>-<page>.png`
   (ví dụ `firefox-markets.png`, `edge-cart.png`, `opera-admin-farmers.png`).

Điền `OK` hoặc mô tả lỗi vào ô tương ứng.

## Kết quả

| Trình duyệt | Bản | `/markets` | `/cart` | `/admin/farmers` | Ghi chú |
|---|---|---|---|---|---|
| Chrome | | | | | |
| Firefox | | | | | |
| Edge | | | | | |
| Opera | | | | | |

## Nếu gặp lỗi riêng của một trình duyệt

Sửa ở `frontend/src`, ghi nguyên nhân vào cột Ghi chú, rồi **đo lại cả bốn** trình duyệt — một bản vá cho
Firefox có thể làm hỏng Chrome.

Lỗi hay gặp nhất với stack này là một thuộc tính CSS mới mà một trình duyệt chưa hiểu. Kiểm nhanh trên
caniuse.com trước khi đổi cách làm.
