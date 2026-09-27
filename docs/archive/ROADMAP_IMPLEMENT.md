# MarketLink Backend Core Roadmap

## 1. Khởi tạo backend và quy ước chung (Đã xong)

Kết nối database, cấu hình môi trường.
Thiết lập migration và seed dữ liệu.
Chia module: Auth, User, Farmer, Market, Product, Inventory, Order…
Thống nhất cấu trúc response, validation và xử lý lỗi.
Thiết lập phân trang, cách lưu thời gian và upload ảnh.

**Đầu ra:** backend chạy được, kết nối database và có cấu trúc rõ ràng.

---

## 2. Authentication và User (Đã xong)

Đăng ký Customer.
Đăng ký Farmer cùng thông tin gian hàng.
Đăng nhập, đăng xuất, lấy thông tin tài khoản hiện tại.
Phân quyền `CUSTOMER`, `FARMER`, `ADMIN`.
Cập nhật thông tin cá nhân.
Chặn tài khoản bị vô hiệu hóa.
Seed tài khoản Admin; không mở API đăng ký Admin công khai.

**Đầu ra:** đăng nhập được bằng ba vai trò, API kiểm tra đúng quyền.

---

## 3. Hồ sơ Farmer và duyệt tài khoản

Farmer xem, cập nhật hồ sơ gian hàng.
Farmer mới đăng ký ở trạng thái chờ duyệt.
Admin xem danh sách và chi tiết Farmer.
Admin duyệt hoặc đình chỉ Farmer.
Chặn Farmer chưa được duyệt đăng bán.
Admin xem, kích hoạt hoặc vô hiệu hóa Customer.

**Đầu ra:** có Farmer đã được duyệt để triển khai các bước bán hàng.

---

## 4. Danh mục và chợ

Admin thêm, sửa, xem và ngừng sử dụng danh mục.
Admin thêm, sửa, xem và ngừng hoạt động chợ.
Lưu địa chỉ, tọa độ, ngày và giờ hoạt động.
Farmer chọn các chợ mình tham gia.
Farmer khai báo gian hàng và điểm nhận tại từng chợ.

**Đầu ra:** xác định được Farmer nào bán tại chợ nào.

---

## 5. Product — thông tin sản phẩm

Farmer thêm, sửa, xem và lưu trữ sản phẩm.
Quản lý tên, danh mục, mô tả, ảnh, đơn vị và giá mặc định.
Bật/tắt sản phẩm.
Kiểm tra Farmer chỉ quản lý sản phẩm của mình.
Admin gỡ sản phẩm vi phạm.

Ở bước này, **Product mô tả bán cái gì**. Lượng hàng cho từng ngày bán xử lý ở bước tiếp theo.

**Đầu ra:** Farmer có danh sách sản phẩm hợp lệ để đưa vào phiên bán.

---

## 6. Phiên bán, khung giờ nhận và tồn kho

Theo mô hình đề xuất ở trên:

Farmer tạo phiên bán tại một chợ vào ngày cụ thể.
Cấu hình thời gian bán và hạn chốt đơn.
Tạo các khung giờ nhận hàng.
Chọn sản phẩm đưa vào phiên.
Nhập giá và số lượng của từng sản phẩm trong phiên.
Cho phép điều chỉnh tồn hoặc tạm ngừng nhận đặt.
Kiểm tra lịch và số lượng hợp lệ.

Ví dụ:

```text
Farmer A → chợ X → sáng Chủ nhật → cà chua 30 kg → nhận lúc 08:00–09:00
```

**Đầu ra:** xác định được bán gì, bao nhiêu, ở đâu và lúc nào.

---

## 7. API để Customer tìm và xem hàng

Danh sách, chi tiết chợ.
Danh sách Farmer tại chợ.
Hồ sơ Farmer và các phiên đang mở.
Danh sách, chi tiết sản phẩm đang bán.
Tìm kiếm và lọc theo danh mục, giá, chợ, ngày.
Trả dữ liệu tọa độ và điểm nhận cho bản đồ.
Phân trang.

Chỉ hiển thị hàng được phép công khai; khi đặt vẫn phải kiểm tra lại khả dụng.

**Đầu ra:** Customer tìm được mặt hàng và phiên bán muốn đặt.

---

## 8. Giỏ hàng và tạo đơn

Thêm, sửa số lượng, xóa sản phẩm khỏi giỏ.
Nhóm hàng theo Farmer và phiên bán.
Chọn khung giờ nhận.
Kiểm tra lại giá, tồn, trạng thái bán và cutoff.
Tạo `orders` và `order_items`.
Lưu thông tin sản phẩm, giá và điểm nhận tại thời điểm đặt.
Giữ tồn trong cùng transaction tạo đơn.
Chống tạo đơn trùng khi gửi lại request.

**Quy tắc đề xuất:** một đơn thuộc một Farmer, một phiên bán và một khung giờ nhận.

**Đầu ra:** Customer đặt được đơn, tồn khả dụng giảm đúng và không bán vượt tồn khi đặt đồng thời.

---

## 9. Hoàn chỉnh vòng đời đơn hàng

Triển khai theo thứ tự:

Customer và Farmer xem danh sách, chi tiết đơn của mình.
Farmer chấp nhận hoặc từ chối đơn.
Customer hủy trước cutoff → giải phóng tồn.
Farmer đánh dấu sẵn sàng nhận.
Farmer xác nhận đã giao → hoàn tất.
Customer sửa đơn trước cutoff → điều chỉnh phần tồn chênh lệch.
Lưu lịch sử chuyển trạng thái và chỉnh sửa.

Mỗi hành động phải kiểm tra **quyền sở hữu, trạng thái hiện tại và thời hạn**.

**Đầu ra:** chạy được trọn luồng đặt → xác nhận → chuẩn bị → nhận hàng, cùng các nhánh sửa/hủy/từ chối.

> Đến đây, backend giao dịch cốt lõi đã hình thành. Nên kiểm thử chắc phần này trước khi làm tiếp.

---

## 10. Mẫu stock theo tuần và đặt lại đơn

Farmer tạo, sửa mẫu sản phẩm và số lượng theo tuần.
Tạo phiên mới từ mẫu, cho phép điều chỉnh trước khi mở bán.
Chống sinh trùng phiên.
Customer đặt lại từ đơn cũ.
Khi đặt lại, kiểm tra phiên mới, giá mới, tồn và chọn lại giờ nhận.

**Đầu ra:** Farmer không phải nhập lại hàng mỗi tuần; Customer mua lại thuận tiện.

---

## 11. Favorites, đánh giá và thông báo

Yêu thích Farmer, sản phẩm và lưu chợ.
Đánh giá Farmer/sản phẩm từ đơn đã hoàn tất.
Admin gỡ đánh giá vi phạm.
Thông báo xác nhận đơn và sẵn sàng nhận.
Thông báo hàng yêu thích có trở lại.
Admin đăng thông báo toàn hệ thống.

Có thể làm **thông báo in-app trước** để hoàn thành luồng đơn giản.

**Đầu ra:** hoàn thiện tương tác sau đặt hàng và các chức năng bổ trợ bắt buộc.

---

## 12. Dashboard, báo cáo và kiểm thử bàn giao

Farmer: tổng đơn, đơn chờ, giá trị đơn hoàn tất, sản phẩm bán chạy.
Admin: tổng người dùng, chợ, đơn, báo cáo theo chợ và Farmer.
Kiểm thử phân quyền, tranh chấp tồn kho, request trùng, cutoff và chuyển trạng thái sai.
Rà soát validation, pagination, index và log.
Hoàn thiện tài liệu API, seed demo và hướng dẫn chạy.

**AI để sau cùng**, vì là tùy chọn trong đề.
