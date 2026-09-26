# Tài khoản demo — MarketLink

Mọi tài khoản dưới đây dùng chung mật khẩu: **`Demo@1234`**

Nạp dữ liệu demo bằng `make seed` sau khi stack đã chạy (`make up`, chờ Flyway chạy xong). Không có `make` thì chạy
lệnh tương đương ở thư mục gốc:

```bash
docker compose exec -T mysql sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' < db/seed.sql
```

`db/seed.sql` chạy lại nhiều lần được (chỉ thêm hoặc cập nhật), nên nạp lại bất cứ lúc nào để đưa mật khẩu về `Demo@1234`.

## Tài khoản theo vai (FR-102)

| Vai | Email | Đăng nhập ở | Dùng để xem |
|---|---|---|---|
| Admin | `admin@marketlink.vn` | `/admin/login` | Dashboard tổng (`/admin`), duyệt Farmer, chợ, danh mục, kiểm duyệt sản phẩm và review, báo cáo doanh thu theo chợ / Farmer bán chạy, quản tài khoản Customer, hàng đợi góp ý, thông báo toàn nền tảng |
| Customer | `customer@marketlink.vn` | `/login` | Duyệt chợ và sản phẩm, giỏ hàng tách theo sạp, 12 đơn đủ 6 trạng thái (4 đơn `completed` để viết review), yêu thích + restock alert, đặt lại nhanh, chatbot, nhắn tin với sạp, thông báo |
| Farmer | `farmer@marketlink.vn` | `/login` | Hồ sơ sạp "Vườn Út Hiền", sản phẩm, chợ bán và khung giờ nhận hàng, slot, đơn đến (accept/decline/ready/complete), template tồn kho tuần, dashboard doanh thu + best-seller, trả lời review |
| Farmer (thứ 2) | `farmer2@marketlink.vn` | `/login` | Sạp "Trái cây Ba Tơ" — giỏ có hàng của 2 Farmer tách thành 2 đơn (D-01) |

Customer demo: Nguyễn Văn An · `0900000002`.

Tài khoản admin **không** bật xác thực hai bước: `admin@marketlink.vn` chỉ cần mật khẩu. MFA là tuỳ chọn, bật trong
Settings → Security.

## Dữ liệu demo đi kèm (FR-100, FR-101)

Sau `make seed` trên database trống: 4 chợ TP.HCM toạ độ thật · 10 sạp đã duyệt · 51 sản phẩm (1 bị admin ẩn để demo
kiểm duyệt) · slot nhận hàng 4 tuần · 12 đơn của `customer@marketlink.vn` (`ML-20260920-0001…0012`) đủ 6 trạng thái
placed / accepted / ready / completed / declined / cancelled · 8 review (1 bị ẩn, 1 có phản hồi của sạp) · 6 yêu thích ·
48 dòng template tồn kho tuần · 3 góp ý (bug / suggestion / query). Seed chạy lại được, không nhân đôi.

## 10 sạp Farmer đã duyệt (FR-100)

Cả 10 sạp đều `approved`, khung giờ nhận hàng 07:00–11:00, slot 60 phút cho 4 tuần tới, tối đa 5 đơn/slot.

| Email | Sạp | Chợ (mã quầy) | Cutoff |
|---|---|---|---|
| `farmer@marketlink.vn` | Vườn Út Hiền | Bà Chiểu (A-12), Thảo Điền (T-03) | 12 giờ |
| `farmer2@marketlink.vn` | Trái cây Ba Tơ | Bến Thành (B-07), Tân Định (C-02) | 24 giờ |
| `farmer3@marketlink.vn` | Sữa bò Mai Long Thành | Thảo Điền (T-08) | 12 giờ |
| `farmer4@marketlink.vn` | Củ quả Đức Củ Chi | Bà Chiểu (A-20), Bến Thành (B-15) | 6 giờ |
| `farmer5@marketlink.vn` | Rau thơm Cô Lan | Tân Định (C-11) | 12 giờ |
| `farmer6@marketlink.vn` | Lò bánh Tuấn Anh | Thảo Điền (T-12), Bến Thành (B-22) | 12 giờ |
| `farmer7@marketlink.vn` | Nông trại Hoa Đà Lạt | Bà Chiểu (A-05) | 24 giờ |
| `farmer8@marketlink.vn` | Trứng gà Khánh Hòa | Tân Định (C-19), Bà Chiểu (A-31) | 12 giờ |
| `farmer9@marketlink.vn` | Nấm sạch Thu Thảo | Thảo Điền (T-21) | 12 giờ |
| `farmer10@marketlink.vn` | Mật ong U Minh | Bến Thành (B-30), Tân Định (C-25) | 48 giờ |

Dữ liệu dựng sẵn cho vài kịch bản:

- Sản phẩm hết hàng (`sold_out`) và tạm ngưng (`unavailable`) rải ở nhiều sạp (FR-064).
- "Sáp ong nguyên chất" của `farmer10@` đã bị admin ẩn, có lý do (FR-074) — dùng để xem màn kiểm duyệt.

## Lưu ý

- **Mật khẩu admin.** Backend tự tạo `admin@marketlink.vn` với mật khẩu `Admin@123` khi khởi động lần đầu
  (`AdminSeeder`, profile `dev`/`local`). `make seed` ghi đè thành `Demo@1234` cho khớp bảng này. Chưa chạy seed thì
  vẫn là `Admin@123`.
- **Xác thực hai bước.** Seed không bật 2FA cho tài khoản nào. Nếu ai đó đã bật 2FA cho admin trên máy của mình thì
  vẫn phải nhập mã; nạp lại seed không tắt 2FA.
- **Chưa có trong seed** (FR-101 còn TODO): đơn hàng đủ 6 trạng thái, review, yêu thích. Khi bổ sung thì cập nhật
  bảng trên.
