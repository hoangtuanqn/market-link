# MarketLink — Quản lý Product và Danh mục

> **Giai đoạn tiếp theo sau Hồ sơ Farmer và duyệt tài khoản.**  
> Triển khai Danh mục trước, Product sau.  
> Mục tiêu: quản lý thông tin sản phẩm, ảnh, quyền sở hữu và kiểm duyệt; chuẩn bị để kết nối phiên bán và tồn kho.

## 1. Phạm vi

### Chức năng theo vai trò

- **Admin:** quản lý danh mục và gỡ sản phẩm vi phạm.
- **Farmer đã được duyệt:** thêm, xem, sửa, xóa và tạm ngừng bán sản phẩm.
- **Customer:** xem danh mục, xem và tìm sản phẩm công khai.

Theo SRS, thông tin sản phẩm gồm tên, danh mục, giá, đơn vị, số lượng có sẵn, mô tả và ảnh. Farmer còn phải quản lý stock theo tuần và đánh dấu hết hàng.

Trong giai đoạn này, hoàn thành thông tin sản phẩm và quyền quản lý trước. Số lượng khả dụng, hết hàng, stock theo tuần và giá áp dụng cho phiên được hoàn thành khi triển khai phiên bán và tồn kho.

**Phân biệt yêu cầu và thiết kế:** tên bảng, field, API, trạng thái và các quy tắc kỹ thuật dưới đây là đề xuất triển khai tối thiểu. SRS không quy định sẵn cấu trúc này. Thiết kế tiếp tục sử dụng mô hình tồn kho theo phiên đã đề xuất trước đó.

## 2. Model Category

Mỗi Product thuộc một Category. Một Category có nhiều Product. Chưa cần danh mục cha–con.

### Bảng `categories`

| Field | Kiểu dữ liệu gợi ý | Ý nghĩa |
| --- | --- | --- |
| `id` | BIGINT, PK | ID danh mục |
| `name` | VARCHAR(100) | Tên danh mục, bắt buộc và duy nhất |
| `created_at` | TIMESTAMP | Thời điểm tạo |
| `updated_at` | TIMESTAMP | Thời điểm cập nhật |

Chưa cần ảnh, mô tả, slug hoặc thứ tự hiển thị nếu giao diện chưa sử dụng.

### Chức năng của Admin

- Tạo danh mục.
- Xem danh sách và chi tiết.
- Đổi tên danh mục.
- Xóa danh mục chưa có sản phẩm tham chiếu.

### Quy tắc triển khai

- Tên không được rỗng sau khi bỏ khoảng trắng thừa.
- Không cho tạo tên trùng.
- Không cho xóa danh mục đang có Product tham chiếu, kể cả Product đã xóa mềm.
- Không xóa dây chuyền Product khi xóa Category.

Quy tắc xóa bảo vệ dữ liệu sản phẩm và các quan hệ lịch sử.

## 3. Model Product

### Bảng `products`

| Field | Kiểu dữ liệu gợi ý | Ý nghĩa |
| --- | --- | --- |
| `id` | BIGINT, PK | ID sản phẩm |
| `farmer_id` | BIGINT, FK | Tham chiếu `farmer_profiles.id` |
| `category_id` | BIGINT, FK | Tham chiếu `categories.id` |
| `name` | VARCHAR(150) | Tên sản phẩm |
| `description` | TEXT | Mô tả sản phẩm |
| `price` | DECIMAL(12,2) | Giá mặc định theo đơn vị bán |
| `unit` | VARCHAR(30) | Đơn vị bán |
| `image_path` | VARCHAR(500) | Đường dẫn hoặc khóa lưu ảnh |
| `status` | VARCHAR(20) | Trạng thái sản phẩm |
| `created_at` | TIMESTAMP | Thời điểm tạo |
| `updated_at` | TIMESTAMP | Thời điểm cập nhật |
| `deleted_at` | TIMESTAMP, nullable | Thời điểm Farmer xóa mềm |

### Quan hệ

- Một Farmer có nhiều Product.
- Một Category có nhiều Product.
- Một Product thuộc một Farmer và một Category.

### Ý nghĩa và cách sử dụng field

- **`farmer_id`:** backend xác định từ tài khoản đăng nhập; không tin ID Farmer do client gửi.
- **`category_id`:** phải tham chiếu danh mục tồn tại.
- **`price`:** giá của một đơn vị bán, ví dụ 25.000 đồng/kg; dùng kiểu thập phân chính xác.
- **`unit`:** ví dụ `kg`, `bó`, `hộp`, `quả`; chưa cần model Unit riêng.
- **`image_path`:** lưu vị trí ảnh, không lưu nội dung ảnh vào field này.
- **`deleted_at`:** giữ bản ghi để phục vụ quan hệ và lịch sử sau này, đồng thời loại sản phẩm khỏi danh sách sử dụng thông thường.

Một ảnh cho mỗi Product đủ cho phạm vi cốt lõi hiện tại; chưa cần bảng `product_images`.

## 4. Phân biệt Product và tồn kho

Do thiết kế đã chọn tồn kho theo phiên bán, không thêm một `stock_quantity` độc lập trên Product rồi duy trì thêm một lượng tồn khác ở phiên.

- **Product:** Farmer bán sản phẩm gì.
- **Stock của phiên:** phiên đó bán bao nhiêu, còn bao nhiêu và giá áp dụng là bao nhiêu.

Ví dụ:

- Product: cà chua, đơn vị kg, giá mặc định 25.000 đồng.
- Phiên Chủ nhật: mở bán 30 kg cà chua với giá 25.000 đồng/kg.

### Giá mặc định và giá phiên

- `products.price` dùng làm giá mặc định khi tạo hàng cho phiên.
- Sau khi tạo phiên, giá thực tế được quản lý tại phiên.
- Thay giá mặc định không tự đổi giá phiên đã tạo hoặc đơn cũ.

### Phần làm sau

- Số lượng khả dụng.
- Hết hàng trong từng phiên.
- Mẫu stock theo tuần.
- Điều chỉnh và giữ tồn.

**Product CRUD chưa đồng nghĩa hoàn thành toàn bộ chức năng “Manage Weekly Stock and Pricing” trong SRS.** Phần còn lại được thực hiện ở bước tồn kho.

## 5. Trạng thái Product

| Trạng thái | Ý nghĩa | Ai điều khiển? |
| --- | --- | --- |
| `ACTIVE` | Có thể dùng sản phẩm để đăng bán | Farmer |
| `INACTIVE` | Farmer tạm ngừng bán | Farmer |
| `REMOVED` | Admin gỡ vì vi phạm | Admin |

`deleted_at` biểu diễn riêng việc Farmer xóa mềm sản phẩm.

### Quy tắc

- Product mới có trạng thái mặc định `ACTIVE`.
- Farmer được chuyển `ACTIVE` sang `INACTIVE` và ngược lại.
- Admin được gỡ sản phẩm bằng trạng thái `REMOVED`.
- Farmer không được tự chuyển `REMOVED` về `ACTIVE`.
- Chưa xây quy trình kháng nghị, gửi duyệt lại hoặc khôi phục.

**Không cần trạng thái chờ duyệt Product:** đề yêu cầu duyệt Farmer, không yêu cầu duyệt từng sản phẩm trước khi đăng.

Không đặt `SOLD_OUT` trên Product trong mô hình này: một sản phẩm có thể hết ở phiên này nhưng còn ở phiên khác. Tình trạng hết hàng thuộc stock của phiên.

## 6. Farmer tạo Product

### Dữ liệu đầu vào

- `category_id`.
- `name`.
- `description`.
- `price`.
- `unit`.
- Ảnh sản phẩm.

### Trình tự xử lý

1. Kiểm tra đăng nhập và role Farmer.
2. Kiểm tra tài khoản đang hoạt động.
3. Kiểm tra hồ sơ Farmer là `APPROVED`.
4. Kiểm tra Category tồn tại.
5. Validate nội dung và ảnh.
6. Lấy `farmer_id` từ hồ sơ của tài khoản đăng nhập.
7. Lưu ảnh và thông tin Product.
8. Gán trạng thái mặc định `ACTIVE`.
9. Trả Product vừa tạo.

Client không quyết định chủ sở hữu hoặc quyền kiểm duyệt. Nếu lưu Product thất bại sau khi upload ảnh, dọn ảnh mới để tránh file rác.

## 7. Farmer xem sản phẩm của mình

- Danh sách chỉ trả Product thuộc Farmer đang đăng nhập.
- Có phân trang.
- Có thể hiển thị Product `ACTIVE`, `INACTIVE` và `REMOVED` để Farmer biết trạng thái quản lý.
- Loại Product đã xóa mềm khỏi danh sách thông thường.
- API chi tiết phải kiểm tra quyền sở hữu giống API danh sách.

Không để Farmer truy cập Product của người khác qua API quản lý chỉ vì biết ID.

## 8. Farmer sửa Product

### Điều kiện

- Farmer được phép đăng bán.
- Product tồn tại và chưa xóa mềm.
- Product thuộc Farmer đang đăng nhập.
- Product không ở trạng thái `REMOVED`.

### Các trường được sửa

- Danh mục.
- Tên.
- Mô tả.
- Giá mặc định.
- Đơn vị.
- Ảnh.
- Trạng thái `ACTIVE` hoặc `INACTIVE`.

### Các trường không được sửa trực tiếp từ request

- `farmer_id`.
- `created_at`.
- `deleted_at`.
- Trạng thái thành `REMOVED`.

### Thay ảnh

1. Lưu ảnh mới.
2. Cập nhật Product thành công.
3. Dọn ảnh cũ nếu ảnh đó không dùng chung.

Nếu cập nhật thất bại, giữ tham chiếu ảnh cũ và dọn ảnh mới chưa được sử dụng.

### Lưu ý khi tích hợp tồn kho

Khi Product đã có trong một phiên đang bán, đổi đơn vị có thể làm sai ý nghĩa số lượng. Khi triển khai phiên bán, chặn đổi đơn vị trong trường hợp đó; không âm thầm đổi “kg” thành “hộp” cho stock hiện có.

## 9. Farmer xóa và Admin gỡ Product

### 9.1. Farmer xóa Product của mình

1. Kiểm tra đăng nhập, role và quyền sở hữu.
2. Kiểm tra Product chưa bị xóa.
3. Gán `deleted_at`.
4. Loại Product khỏi danh sách sử dụng thông thường.
5. Giữ bản ghi để không phá lịch sử liên quan.

Xóa mềm là cách triển khai chức năng xóa trong thiết kế này. Việc xóa mềm không khôi phục quyền hiển thị của sản phẩm đã bị Admin gỡ.

### 9.2. Admin gỡ Product vi phạm

1. Kiểm tra quyền Admin.
2. Kiểm tra Product tồn tại và chưa bị xóa.
3. Chuyển sang `REMOVED`.
4. Product không còn xuất hiện công khai.
5. Farmer vẫn thấy trạng thái bị gỡ trong danh sách quản lý.

Farmer không được tự kích hoạt lại Product bị gỡ. Các tác động đến stock đang mở và đơn đã đặt cần được xử lý khi tích hợp module tương ứng; không tự xóa lịch sử giao dịch.

## 10. API cần triển khai

Các endpoint là tên gợi ý; thêm prefix chung như `/api` theo cấu trúc dự án.

### 10.1. Danh mục

| Method | Endpoint | Chức năng |
| --- | --- | --- |
| `GET` | `/categories` | Danh sách danh mục |
| `GET` | `/categories/{id}` | Chi tiết danh mục |
| `POST` | `/admin/categories` | Admin tạo danh mục |
| `PATCH` | `/admin/categories/{id}` | Admin sửa danh mục |
| `DELETE` | `/admin/categories/{id}` | Admin xóa danh mục chưa có Product tham chiếu |

### 10.2. Product của Farmer

| Method | Endpoint | Chức năng |
| --- | --- | --- |
| `GET` | `/farmer/products` | Danh sách Product của mình |
| `GET` | `/farmer/products/{id}` | Chi tiết Product của mình |
| `POST` | `/farmer/products` | Tạo Product |
| `PATCH` | `/farmer/products/{id}` | Sửa thông tin, bật/tắt Product |
| `DELETE` | `/farmer/products/{id}` | Xóa mềm Product |

### 10.3. Xem công khai và quản trị

| Method | Endpoint | Chức năng |
| --- | --- | --- |
| `GET` | `/products` | Danh sách công khai, tìm kiếm và lọc |
| `GET` | `/products/{id}` | Chi tiết công khai |
| `GET` | `/admin/products` | Admin xem danh sách quản lý |
| `GET` | `/admin/products/{id}` | Admin xem chi tiết |
| `POST` | `/admin/products/{id}/remove` | Admin gỡ Product |

### Tìm kiếm và lọc trong giai đoạn này

- Tìm theo tên Product.
- Lọc theo Category.
- Phân trang danh sách.

Lọc theo chợ, ngày bán, lượng khả dụng và giá của phiên được triển khai khi có dữ liệu phiên bán.

## 11. Điều kiện hiển thị công khai

Chỉ hiển thị Product khi đồng thời thỏa mãn:

- `status = ACTIVE`.
- `deleted_at` chưa có giá trị.
- Hồ sơ Farmer là `APPROVED`.
- Tài khoản Farmer đang hoạt động.

Áp dụng cùng điều kiện cho cả API danh sách và chi tiết. Product bị gỡ không được xem công khai bằng cách truy cập trực tiếp ID.

**Hiển thị thông tin Product chưa có nghĩa là được đặt hàng.** Sau khi tích hợp tồn kho, Customer chỉ đặt được khi có phiên bán, khung giờ và lượng hàng hợp lệ.

## 12. Validation tối thiểu

- Tên Product không rỗng sau khi bỏ khoảng trắng thừa.
- Category tồn tại.
- Giá không âm và nằm trong giới hạn kiểu dữ liệu.
- Đơn vị không rỗng.
- Mô tả và ảnh có dữ liệu theo quy ước nhập sản phẩm của nhóm.
- Ảnh có loại nội dung hợp lệ và không vượt giới hạn kích thước đã cấu hình.
- Request Farmer chỉ được đặt trạng thái `ACTIVE` hoặc `INACTIVE`.
- Các field đầu vào tuân thủ giới hạn độ dài của database.

Không bắt tên Product duy nhất: nhiều Farmer có thể bán sản phẩm cùng tên.

Chưa thêm giá khuyến mãi, SKU, biến thể, thương hiệu hoặc chứng nhận vào phạm vi hiện tại.

## 13. Thứ tự triển khai

1. **Tạo Category model và migration.**
2. **Làm API Category:** tạo, xem, sửa, xóa; kiểm tra tên trùng và danh mục đang được sử dụng.
3. **Tạo Product model và migration:** khai báo quan hệ Farmer–Product–Category.
4. **Làm upload ảnh:** dùng cơ chế backend hiện có, validate file và xử lý dọn ảnh khi lỗi.
5. **Làm API tạo Product:** áp dụng kiểm tra Farmer `APPROVED`.
6. **Làm API Farmer xem danh sách và chi tiết:** kiểm tra quyền sở hữu.
7. **Làm API sửa và bật/tắt Product.**
8. **Làm xóa mềm Product.**
9. **Làm API Admin xem và gỡ Product.**
10. **Làm API công khai:** tìm tên, lọc danh mục và phân trang.
11. **Kiểm thử quyền, trạng thái, validation và ảnh.**

## 14. Checklist kiểm thử

### Category

- [ ] Tạo được danh mục hợp lệ.
- [ ] Tên rỗng hoặc trùng bị chặn.
- [ ] Chỉ Admin được tạo, sửa và xóa danh mục.
- [ ] Xóa được danh mục chưa có Product tham chiếu.
- [ ] Không xóa được danh mục đang có Product tham chiếu.
- [ ] Xóa Category không xóa dây chuyền Product.

### Quyền quản lý Product

- [ ] Farmer `APPROVED` với tài khoản hợp lệ tạo được Product.
- [ ] Farmer `PENDING` hoặc `SUSPENDED` không tạo được Product.
- [ ] Farmer A không xem qua API quản lý, sửa hoặc xóa Product của Farmer B.
- [ ] Client gửi `farmer_id` người khác không làm đổi chủ sở hữu.
- [ ] Farmer không tự gán `REMOVED` hoặc khôi phục Product bị Admin gỡ.
- [ ] Customer và Farmer không gọi được API gỡ Product của Admin.

### Dữ liệu và trạng thái

- [ ] Category không tồn tại bị chặn khi tạo hoặc sửa Product.
- [ ] Giá âm, tên rỗng và đơn vị rỗng bị chặn.
- [ ] Farmer chuyển được `ACTIVE` và `INACTIVE` cho Product hợp lệ của mình.
- [ ] Xóa mềm giữ bản ghi và loại Product khỏi danh sách thông thường.
- [ ] Product bị tắt, xóa hoặc gỡ không xuất hiện công khai.
- [ ] Farmer bị đình chỉ hoặc tài khoản bị vô hiệu hóa thì Product không xuất hiện công khai.
- [ ] API chi tiết công khai có cùng điều kiện hiển thị với API danh sách.

### Ảnh và danh sách

- [ ] Chặn ảnh sai loại hoặc quá kích thước.
- [ ] Lưu Product thất bại không để lại ảnh mới không sử dụng.
- [ ] Thay ảnh thành công giữ đúng ảnh mới và dọn ảnh cũ an toàn.
- [ ] Tìm theo tên, lọc Category và phân trang hoạt động đúng.

## 15. Tiêu chí hoàn thành

Giai đoạn này hoàn thành khi:

- Có model `Category` và `Product` với quan hệ đúng.
- Admin quản lý được danh mục và gỡ Product vi phạm.
- Farmer đã được duyệt quản lý được Product của mình.
- Upload và thay ảnh hoạt động đúng.
- API công khai hiển thị đúng sản phẩm được phép xem.
- Các kiểm tra quyền sở hữu, trạng thái và dữ liệu đầu vào được thực hiện ở backend.

**Phần nối tiếp:** dùng Product để tạo hàng cho phiên bán, bổ sung tồn kho, giá phiên và trạng thái hết hàng. Các chức năng đó cần hoàn thành để đáp ứng đầy đủ yêu cầu quản lý stock trong SRS.

---

**Nguồn đối chiếu:** *MarketLink — Software Requirements Specification, Version 1.0*, mục 1.6: Search, Browse, and Filter Products; Manage Weekly Stock and Pricing; Content Moderation; System Configuration. Tài liệu tổng hợp hướng triển khai đã thảo luận, phân biệt rõ yêu cầu đề và thiết kế đề xuất.
