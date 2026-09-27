# Assumptions — MarketLink

Nguồn cho phần "Assumptions" của `ReadMe.doc` nộp bài (SRS mục 1.9). Mỗi dòng một giả định, đối chiếu với
`docs/decisions.md` (D-01…D-13) và `CLAUDE.md`. Không bàn lại các quyết định đã chốt — xem `docs/decisions.md`
để biết lý do.

- Thanh toán khi nhận hàng tại sạp, hệ thống không tích hợp cổng thanh toán trực tuyến (đề miễn trừ).
- Chỉ nhận hàng tại sạp (pickup), không có giao hàng/logistics.
- Không xác thực danh tính hay chứng nhận organic của Farmer (đề miễn trừ, SRS §1.5).
- Tài khoản admin được seed sẵn (`admin@marketlink.vn`), không có luồng tự đăng ký tài khoản admin.
- Một tài khoản gắn với một vai trò; khách hàng muốn bán hàng đăng ký qua `/become-farmer` và chờ admin
  duyệt, hệ thống không hỗ trợ nhiều hồ sơ trong một tài khoản (D-08).
- Giờ hệ thống theo múi giờ `Asia/Ho_Chi_Minh`, tiền tệ VND.
- Cutoff đặt/sửa/huỷ đơn tính theo cấu hình riêng của từng sạp (`orderCutoffHours`, mặc định 12 giờ).
- Đơn hàng chỉ sửa hoặc huỷ được trước thời điểm cutoff của chính đơn đó; sau cutoff chỉ Farmer đổi
  được trạng thái.
- Review/rating (Farmer và sản phẩm) chỉ mở khoá sau khi đơn chuyển `completed`, và mỗi đơn chỉ có
  một lượt review.
- Restock alert cho sản phẩm yêu thích là thông báo trong ứng dụng (in-app), không gửi email thật.
- Chatbot phân loại câu hỏi theo luật (intent) rồi map sang câu SQL viết sẵn có tham số; LLM không
  bao giờ được dùng để sinh SQL.
- Dữ liệu demo nạp bằng `make seed`; danh sách tài khoản và mật khẩu demo ở `docs/DEMO_CREDENTIALS.md`.
- Trình duyệt được kiểm: Chrome, Firefox, Edge, Opera bản mới nhất.
