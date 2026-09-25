# MarketLink — Hồ sơ Farmer và duyệt tài khoản

> **Bước 3 trong roadmap backend**  
> Điều kiện bắt đầu: đã hoàn thành khởi tạo backend và Authentication.  
> Mục tiêu: Farmer quản lý được hồ sơ; Admin xem, duyệt và đình chỉ Farmer; backend xác định được Farmer nào có quyền đăng sản phẩm.

## 1. Phạm vi triển khai

Tập trung vào các chức năng:

- Tạo hồ sơ Farmer khi đăng ký.
- Farmer xem và cập nhật hồ sơ của mình.
- Admin xem danh sách và chi tiết Farmer.
- Admin duyệt Farmer.
- Admin đình chỉ Farmer.
- Kiểm tra trạng thái duyệt trước khi cho phép đăng sản phẩm.

Chợ, lịch bán, pickup window, sản phẩm và đơn hàng được triển khai ở các bước tiếp theo.

**Cơ sở yêu cầu:** SRS MarketLink yêu cầu Farmer cung cấp thông tin gian hàng khi đăng ký, quản lý hồ sơ và được Admin duyệt trước khi đăng sản phẩm. Admin có quyền xem, duyệt hoặc đình chỉ Farmer. Xác minh danh tính, giấy phép và chứng nhận không thuộc phạm vi hệ thống.

**Phân biệt yêu cầu và cách triển khai:** tên trạng thái, tên bảng, API và điều kiện chuyển trạng thái bên dưới là cách biểu diễn tối thiểu đề xuất cho các chức năng đó. SRS không quy định sẵn các tên kỹ thuật này.

## 2. Phân biệt tài khoản và hồ sơ Farmer

### 2.1. Tài khoản

Tài khoản phục vụ đăng nhập và phân quyền, đã được xử lý trong bước Authentication:

- Email và mật khẩu.
- Vai trò `FARMER`.
- Trạng thái hoạt động của tài khoản.
- Các thông tin cá nhân đã có trong thiết kế hiện tại.

### 2.2. Hồ sơ Farmer

Hồ sơ Farmer lưu thông tin gian hàng và trạng thái được phép đăng bán.

Các thông tin bắt buộc theo đề khi Farmer đăng ký:

- Tên gian hàng/doanh nghiệp.
- Người liên hệ.
- Số điện thoại.
- Email.
- Địa chỉ.

Nếu email, số điện thoại hoặc địa chỉ đã được lưu trong `users`, có thể dùng lại. Không cần lưu trùng nếu chưa có nhu cầu tách thông tin tài khoản và thông tin kinh doanh.

Nếu `users.name` chính là tên người liên hệ, có thể dùng trường này thay vì thêm `contact_person`.

**Quan hệ:** mỗi tài khoản Farmer có một hồ sơ Farmer; mỗi hồ sơ thuộc một tài khoản.

## 3. Trạng thái duyệt

| Trạng thái | Ý nghĩa | Được đăng sản phẩm? |
| --- | --- | --- |
| `PENDING` | Đã đăng ký, đang chờ Admin duyệt | Không |
| `APPROVED` | Đã được Admin duyệt | Có, nếu tài khoản vẫn được phép hoạt động |
| `SUSPENDED` | Bị Admin đình chỉ | Không |

Trạng thái duyệt thuộc hồ sơ Farmer và tách khỏi trạng thái hoạt động của tài khoản.

- Trạng thái tài khoản do module Auth/User kiểm soát.
- Trạng thái duyệt xác định Farmer có được phép đăng sản phẩm hay không.
- Đình chỉ Farmer không đồng nghĩa với xóa tài khoản hoặc xóa hồ sơ.

Các chuyển trạng thái triển khai trong bước này:

| Sự kiện | Trạng thái trước | Trạng thái sau |
| --- | --- | --- |
| Đăng ký Farmer thành công | Chưa có hồ sơ | `PENDING` |
| Admin duyệt | `PENDING` | `APPROVED` |
| Admin đình chỉ | `APPROVED` | `SUSPENDED` |

Không bổ sung `REJECTED`, quy trình nộp giấy tờ, eKYC hoặc duyệt lại hồ sơ trong phạm vi hiện tại. SRS chưa mô tả rõ khôi phục sau đình chỉ, nên chưa triển khai luồng này ở bước 3.

## 4. Luồng đăng ký Farmer

Bổ sung tạo hồ sơ vào API đăng ký Farmer đã có, không tạo thêm một quy trình đăng ký riêng.

### Trình tự xử lý

1. Validate các thông tin đăng ký bắt buộc.
2. Tạo tài khoản với role `FARMER`.
3. Tạo hồ sơ Farmer liên kết với tài khoản vừa tạo.
4. Backend tự gán `approval_status = PENDING`.
5. Lưu tài khoản và hồ sơ trong cùng một transaction.
6. Trả kết quả theo cấu trúc response của backend hiện tại.

### Quy tắc

- Client không được tự gán trạng thái duyệt.
- Một tài khoản không được có nhiều hồ sơ Farmer.
- Nếu tạo hồ sơ thất bại, rollback việc tạo tài khoản.
- Việc đăng ký thành công chưa cấp quyền đăng sản phẩm.

**Kết quả:** có tài khoản Farmer và hồ sơ `PENDING`, dữ liệu được tạo đầy đủ hoặc không được tạo.

## 5. Farmer xem và cập nhật hồ sơ

### 5.1. Xem hồ sơ của mình

Backend lấy tài khoản từ phiên đăng nhập, sau đó tìm hồ sơ Farmer tương ứng.

Thông tin trả về gồm:

- Thông tin gian hàng.
- Thông tin liên hệ đang được sử dụng.
- Trạng thái duyệt hiện tại.

Không nhận `user_id` từ client để quyết định hồ sơ cá nhân cần đọc.

### 5.2. Cập nhật hồ sơ của mình

Farmer được cập nhật các trường thông tin hồ sơ được phép, chẳng hạn:

- Tên gian hàng/doanh nghiệp.
- Người liên hệ.
- Số điện thoại.
- Địa chỉ.

Quy tắc xử lý:

1. Kiểm tra người gọi có role Farmer.
2. Xác định hồ sơ từ tài khoản đăng nhập.
3. Validate dữ liệu gửi lên.
4. Chỉ cập nhật các trường được cho phép.
5. Lưu thay đổi và trả hồ sơ cập nhật.

Không cho phép sửa qua API hồ sơ:

- `user_id`.
- Role.
- Trạng thái hoạt động tài khoản.
- `approval_status`.

**Cập nhật hồ sơ không tự đổi trạng thái duyệt.** SRS không yêu cầu Farmer sửa hồ sơ phải được duyệt lại.

Nếu email dùng để đăng nhập, việc đổi email đi theo cơ chế Auth hiện có, không cập nhật tùy tiện qua API hồ sơ Farmer.

## 6. Admin xem Farmer

### 6.1. Danh sách Farmer

API trả danh sách có phân trang và cho phép lọc theo trạng thái duyệt để Admin tìm các hồ sơ đang chờ.

Thông tin hiển thị phù hợp:

- ID hồ sơ Farmer.
- Tên gian hàng.
- Người liên hệ.
- Email.
- Trạng thái duyệt.
- Ngày đăng ký.

### 6.2. Chi tiết Farmer

Admin xem đầy đủ thông tin đăng ký và trạng thái hiện tại để thực hiện duyệt hoặc đình chỉ.

Backend phải kiểm tra quyền Admin, không chỉ dựa vào việc giao diện có hiển thị nút quản trị hay không.

## 7. Admin duyệt Farmer

### Điều kiện

- Người gọi là Admin.
- Hồ sơ Farmer tồn tại.
- Trạng thái hiện tại là `PENDING`.

### Trình tự xử lý

1. Kiểm tra quyền Admin.
2. Tìm hồ sơ Farmer theo ID.
3. Kiểm tra trạng thái hiện tại.
4. Chuyển từ `PENDING` sang `APPROVED`.
5. Lưu và trả hồ sơ cập nhật.

**Kết quả:** Farmer được phép đăng sản phẩm nếu tài khoản vẫn hoạt động hợp lệ.

Admin duyệt dựa trên thông tin đăng ký. Không xây chức năng xác minh danh tính, giấy phép hoặc chứng nhận vì đề loại trừ các chức năng này.

## 8. Admin đình chỉ Farmer

### Điều kiện trong luồng tối thiểu này

- Người gọi là Admin.
- Hồ sơ Farmer tồn tại.
- Trạng thái hiện tại là `APPROVED`.

### Trình tự xử lý

1. Kiểm tra quyền Admin.
2. Tìm hồ sơ Farmer theo ID.
3. Kiểm tra trạng thái hiện tại.
4. Chuyển từ `APPROVED` sang `SUSPENDED`.
5. Lưu và trả hồ sơ cập nhật.

**Kết quả:** Farmer không được đăng sản phẩm mới.

Thao tác đình chỉ không xóa tài khoản hoặc hồ sơ. Không tự thêm hành vi xóa sản phẩm, hủy đơn hoặc xử lý đơn đang mở trong bước này. Những ảnh hưởng đến sản phẩm và đơn phải được chốt tại module tương ứng.

## 9. Thiết kế dữ liệu tối thiểu

### Bảng `farmer_profiles`

| Trường | Mục đích | Ràng buộc chính |
| --- | --- | --- |
| `id` | ID hồ sơ | Khóa chính |
| `user_id` | Tài khoản sở hữu | Khóa ngoại tới `users`, duy nhất, không rỗng |
| `business_name` | Tên gian hàng/doanh nghiệp | Bắt buộc |
| `contact_person` | Người liên hệ | Bắt buộc nếu không dùng `users.name` |
| `approval_status` | Trạng thái duyệt | Bắt buộc, mặc định `PENDING` |
| `created_at` | Thời điểm tạo | Theo quy ước chung |
| `updated_at` | Thời điểm cập nhật | Theo quy ước chung |

### Nguyên tắc bố trí thông tin liên hệ

- Email, số điện thoại và địa chỉ bắt buộc phải có trong dữ liệu đăng ký Farmer.
- Có thể lưu ở `users` hoặc `farmer_profiles`, phù hợp thiết kế đã có.
- Mỗi thông tin cần có một nguồn dữ liệu chính, tránh hai bản sao bị lệch nhau.
- Không tự đổi schema Auth đã hoàn thành nếu có thể dùng lại dữ liệu hiện tại.

## 10. Các API cần triển khai

Trong các API Admin dưới đây, `{id}` được hiểu là ID hồ sơ Farmer. Dùng nhất quán cách định danh này trong request và response.

| Method | Endpoint | Quyền | Chức năng |
| --- | --- | --- | --- |
| `GET` | `/farmer/profile` | Farmer | Xem hồ sơ của mình |
| `PATCH` | `/farmer/profile` | Farmer | Cập nhật hồ sơ của mình |
| `GET` | `/admin/farmers` | Admin | Danh sách, lọc trạng thái và phân trang |
| `GET` | `/admin/farmers/{id}` | Admin | Xem chi tiết |
| `POST` | `/admin/farmers/{id}/approve` | Admin | Duyệt Farmer đang chờ |
| `POST` | `/admin/farmers/{id}/suspend` | Admin | Đình chỉ Farmer đã được duyệt |

Ngoài sáu API trên, cập nhật API đăng ký Farmer hiện có để tạo hồ sơ `PENDING`.

Tên endpoint là đề xuất triển khai; có thể thêm prefix chung như `/api` theo cấu trúc dự án.

## 11. Quy tắc backend phải bảo đảm

- Role và trạng thái duyệt phải được kiểm tra ở backend.
- Farmer chỉ xem và sửa hồ sơ cá nhân qua API dành cho mình.
- Chỉ Admin được duyệt hoặc đình chỉ Farmer.
- Client không được tự thay đổi trạng thái duyệt qua đăng ký hoặc cập nhật hồ sơ.
- Trạng thái chỉ chuyển theo các luồng đã xác định.
- Cập nhật hồ sơ giữ nguyên trạng thái duyệt.
- `PENDING` và `SUSPENDED` không được đăng sản phẩm.
- `APPROVED` không bỏ qua các kiểm tra tài khoản bị vô hiệu hóa của Auth.
- Đăng ký tài khoản và tạo hồ sơ phải cùng thành công hoặc cùng thất bại.

Chuẩn bị một phần kiểm tra dùng chung cho quyền đăng sản phẩm: tài khoản hợp lệ, role Farmer, có hồ sơ và trạng thái `APPROVED`. Khi làm module Product, áp dụng kiểm tra này ở API đăng sản phẩm.

## 12. Thứ tự triển khai

1. **Rà soát dữ liệu Auth hiện có:** xác định các trường liên hệ đã nằm ở đâu.
2. **Tạo bảng/entity hồ sơ Farmer:** thiết lập quan hệ với User, trạng thái và ràng buộc duy nhất.
3. **Cập nhật đăng ký Farmer:** tạo hồ sơ `PENDING` trong cùng transaction với tài khoản.
4. **Làm API xem hồ sơ cá nhân:** lấy hồ sơ theo tài khoản đăng nhập.
5. **Làm API cập nhật hồ sơ:** validate và giới hạn trường được sửa.
6. **Làm API Admin xem danh sách và chi tiết:** có phân trang và lọc trạng thái.
7. **Làm API duyệt:** chỉ chuyển `PENDING` sang `APPROVED`.
8. **Làm API đình chỉ:** chỉ chuyển `APPROVED` sang `SUSPENDED`.
9. **Chuẩn bị kiểm tra quyền đăng sản phẩm:** dùng trạng thái duyệt kết hợp Auth hiện có.
10. **Kiểm thử các luồng chính và các trường hợp bị chặn.**

## 13. Checklist kiểm thử

### Đăng ký và dữ liệu

- [ ] Đăng ký Farmer thành công tạo đủ tài khoản và hồ sơ.
- [ ] Hồ sơ mới luôn có trạng thái `PENDING`.
- [ ] Thiếu thông tin bắt buộc bị báo lỗi validation.
- [ ] Không tạo được hai hồ sơ cho một tài khoản.
- [ ] Lỗi tạo hồ sơ khiến thao tác tạo tài khoản được rollback.
- [ ] Client không thể tự gửi `APPROVED` để có quyền đăng bán.

### Hồ sơ cá nhân

- [ ] Farmer xem được đúng hồ sơ của mình.
- [ ] Farmer cập nhật được các trường được phép.
- [ ] Không sửa được hồ sơ người khác.
- [ ] Không sửa được role, chủ sở hữu hoặc trạng thái duyệt.
- [ ] Cập nhật thông tin không đổi trạng thái duyệt.

### Quản trị và phân quyền

- [ ] Admin xem được danh sách, lọc trạng thái và xem chi tiết.
- [ ] Customer và Farmer không gọi được API quản trị.
- [ ] Duyệt hợp lệ chuyển `PENDING` sang `APPROVED`.
- [ ] Đình chỉ hợp lệ chuyển `APPROVED` sang `SUSPENDED`.
- [ ] Chuyển trạng thái ngoài luồng bị chặn.
- [ ] ID hồ sơ không tồn tại được xử lý theo chuẩn lỗi chung.
- [ ] Đình chỉ không xóa tài khoản hoặc hồ sơ.

### Điều kiện đăng sản phẩm

- [ ] Farmer `PENDING` không vượt qua kiểm tra quyền đăng sản phẩm.
- [ ] Farmer `SUSPENDED` không vượt qua kiểm tra quyền đăng sản phẩm.
- [ ] Farmer `APPROVED` và tài khoản hợp lệ vượt qua kiểm tra.
- [ ] Tài khoản bị vô hiệu hóa vẫn bị chặn dù hồ sơ đã `APPROVED`.

Kiểm tra trực tiếp trên API tạo sản phẩm được thực hiện khi module Product hoàn thành.

## 14. Tiêu chí hoàn thành bước 3

Bước này hoàn thành khi:

- Farmer đăng ký được với đầy đủ thông tin và trạng thái chờ duyệt.
- Farmer xem, cập nhật được hồ sơ cá nhân.
- Admin xem, duyệt và đình chỉ được Farmer.
- Backend bảo vệ đúng quyền và các chuyển trạng thái.
- Có kiểm tra dùng chung để xác định Farmer được phép đăng sản phẩm.

**Bước tiếp theo:** triển khai danh mục và chợ theo roadmap.

---

**Nguồn đối chiếu:** *MarketLink — Software Requirements Specification, Version 1.0*, mục 1.5 Constraints và mục 1.6 Functional Requirements: Farmer Registration and Profile Management; Manage Farmers and Customers. Tài liệu này tổng hợp hướng triển khai đã thảo luận cho bước 3, không bổ sung chức năng mở rộng.
