# Quản trị MarketLink (dành cho Admin)

Hướng dẫn cho quản trị viên: duyệt nhà vườn, quản tài khoản, quản chợ và danh mục, kiểm duyệt nội dung,
đăng thông báo toàn sàn và đọc báo cáo.

## Đăng nhập khu vực admin

Khu vực admin **tách riêng** khỏi giao diện khách hàng và nhà vườn, và đăng nhập theo hai bước:

1. Nhập email và mật khẩu ở trang đăng nhập admin.
2. Nhập **sáu chữ số** từ ứng dụng xác thực, hoặc một **mã khôi phục**.

Mỗi mã khôi phục chỉ dùng được một lần. Mã sáu số liên tục sai thì kiểm tra xem đồng hồ điện thoại có đúng
giờ không — mã tính theo thời gian. Nhập sai quá nhiều lần thì tài khoản bị khoá tạm.

## Bảng điều khiển

Trang chủ admin hiện bốn con số của toàn sàn: số **nhà vườn** (kèm số đang chờ duyệt), số **khách hàng**,
số **chợ**, và số **đơn hàng** (kèm doanh thu từ các đơn đã hoàn tất).

Mục **Cần chú ý** gom những việc đang chờ người xử lý, ví dụ số đơn đăng ký nhà vườn đang chờ duyệt.

## Duyệt, từ chối và tạm ngưng nhà vườn

Vào **Nhà vườn** (`Farmers`). Danh sách chia theo trạng thái: Chờ duyệt · Đã duyệt · Tạm ngưng · Đã từ chối.

Mở một đơn đăng ký để xem chi tiết rồi quyết định:

- **Duyệt** — vai trò của họ chuyển thành Farmer và bảng điều khiển sạp mở trong tài khoản của họ.
  Họ vẫn giữ mọi tính năng khách hàng đang có. **Khách mua chưa thấy gì** cho tới khi họ thêm sản phẩm và
  đặt khung giờ nhận hàng.
- **Từ chối** — nêu lý do; người đăng ký thấy lý do này trên trang sạp của họ.
- **Tạm ngưng** — sản phẩm của sạp bị ẩn và sạp ngừng nhận đơn mới. Các đơn đang chạy **vẫn hoàn tất bình thường**.

Sạp phải được duyệt trước thì sản phẩm mới lên sàn được.

## Quản lý tài khoản khách hàng

Vào **Khách hàng** (`Customers`). Tìm theo tên, email hoặc số điện thoại; lọc theo Đang hoạt động / Đã vô hiệu hoá.

**Vô hiệu hoá** khi tài khoản vi phạm chính sách: tài khoản đó không đăng nhập và không đặt hàng được nữa.
**Kích hoạt lại** khi đã xử lý xong. Đơn hàng cũ vẫn giữ nguyên với các sạp.

## Quản lý chợ

Vào **Chợ** (`Markets`). Mỗi chợ có tên, địa chỉ, ngày họp, giờ mở cửa và **toạ độ bản đồ**.

Toạ độ là thứ quyết định chợ hiện ở đâu trên bản đồ cho khách, nên phải điền đúng.

Gỡ một chợ thì chợ đó **ẩn với khách hàng**, còn lịch sử vẫn giữ.

## Danh mục sản phẩm

Vào **Danh mục** (`Categories`). Đây là **danh sách duy nhất** mà mọi sạp chọn khi thêm sản phẩm, nên sửa ở đây
ảnh hưởng toàn sàn. Bảng cho biết mỗi danh mục đang có bao nhiêu sản phẩm và bao nhiêu sạp dùng.

Đơn vị bán (bó, kg, hũ, lít, ổ, cái, túi) là danh sách cố định đi kèm ứng dụng, không sửa ở đây.

## Kiểm duyệt nội dung

Vào **Kiểm duyệt** (`Moderation`). Hàng chờ chia thành: Đánh giá · Sản phẩm đăng bán · Đã ẩn · Tin nhắn bị báo cáo.

Với đánh giá, lọc nhanh theo **1 hoặc 2 sao** hoặc theo mới nhất.

Ẩn một sản phẩm hoặc một đánh giá vi phạm nguyên tắc cộng đồng. Nội dung bị ẩn **vẫn nằm trong cơ sở dữ liệu
kèm lý do**, và chủ nội dung được báo. Thẻ **Đã ẩn** cho phép xem lại và bỏ ẩn.

## Thông báo toàn sàn

Vào **Thông báo** (`Announcements`). Một thông báo là một thông điệp cho toàn sàn, hiện ở **dải màu xanh phía trên
header** và trong phần thông báo của mọi người.

Mỗi lần chỉ nên chạy **một** thông báo — nhiều quá thì không ai đọc.

Thông báo cần tiêu đề ngắn và rõ việc, ví dụ *"Chợ Thủ Đức mở cửa từ 06:00 kể từ tháng 10"*. Viết theo giọng
của sản phẩm: câu ngắn, xưng "bạn", không cảm thán, và luôn nói rõ điều gì sẽ xảy ra.

## Báo cáo

Vào **Báo cáo** (`Reports`), chọn khoảng thời gian **Từ** — **Đến**. Trang hiện:

- Tổng đơn hàng (toàn thời gian, mọi trạng thái) và **doanh thu từ đơn đã hoàn tất**.
- Đơn và doanh thu **chia theo từng chợ**.
- Các **nhà vườn bán chạy nhất**: số đơn hoàn tất, doanh thu, điểm đánh giá trung bình.
- Các **sản phẩm bán chạy nhất**: đơn vị bán, giá, số lượng đã bán.

Doanh thu là tiền khách trả **trực tiếp cho sạp**, không đi qua MarketLink.

## Cài đặt nền tảng

Vào **Cài đặt** (`Settings`) trong khu vực admin. Ngoài tuỳ chọn riêng của bạn, ở đây có các **giá trị mặc định
của nền tảng**: giờ chốt đơn mặc định, số đơn mặc định mỗi khung giờ, và múi giờ.

Mọi ngày giờ trên nền tảng được hiểu theo múi giờ này.
