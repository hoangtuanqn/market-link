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
| Admin | `admin@marketlink.vn` | `/admin/login` | Dashboard tổng (`/admin`), duyệt Farmer, chợ, danh mục, kiểm duyệt sản phẩm và review, báo cáo doanh thu theo chợ / Farmer bán chạy, quản tài khoản Customer, hàng đợi góp ý, thông báo toàn nền tảng, tab Báo hàng hư trong Moderation |
| Customer | `customer@marketlink.vn` | `/login` | Duyệt chợ và sản phẩm, giỏ hàng tách theo sạp, 13 đơn đủ 6 trạng thái (5 đơn `completed` để viết review), báo hàng hư trên đơn `ML-20260920-0013`, yêu thích + restock alert, đặt lại nhanh, chatbot, nhắn tin với sạp, thông báo |
| Farmer | `farmer@marketlink.vn` | `/login` | Hồ sơ sạp "Vườn Út Hiền", sản phẩm, chợ bán và khung giờ nhận hàng, slot, đơn đến (accept/decline/ready/complete), template tồn kho tuần, dashboard doanh thu + best-seller, trả lời review, tab Báo hàng hư trong Reviews (2/3 lỗi hạn dùng) |
| Farmer (thứ 2) | `farmer2@marketlink.vn` | `/login` | Sạp "Trái cây Ba Tơ" — giỏ có hàng của 2 Farmer tách thành 2 đơn (D-01) |

Customer demo: Nguyễn Văn An · `0900000002`.

> ⚠️ **Tài khoản admin bắt buộc cài xác thực hai bước ở lần đăng nhập đầu tiên.** Mật khẩu thôi là chưa đủ —
> xem [Đăng nhập admin lần đầu](#đăng-nhập-admin-lần-đầu--bắt-buộc-cài-2fa) ngay dưới đây trước khi bắt đầu.
> Hai tài khoản Customer và Farmer chỉ cần mật khẩu, không vướng gì.

## Đăng nhập admin lần đầu — bắt buộc cài 2FA

FR-008: admin nào chưa từng cài xác thực hai bước thì ngay sau khi nhập đúng mật khẩu sẽ bị đưa tới
`/admin/setup-2fa`. Màn đó **không có nút bỏ qua** — chưa cài xong thì không vào được `/admin`.

**Cần chuẩn bị:** một ứng dụng sinh mã trên điện thoại. Google Authenticator, Microsoft Authenticator, Authy hay
1Password đều được. Không có điện thoại thì dùng tiện ích TOTP trên trình duyệt cũng chạy.

### Các bước

1. Vào `/admin/login`, nhập `admin@marketlink.vn` / `Demo@1234`, bấm **Sign in**.
2. Trang **Set up two-step verification** hiện ra, có mã QR.
   - **Có điện thoại:** mở app xác thực → thêm tài khoản → quét mã QR.
   - **Không quét được:** bấm **Copy key**, rồi trong app chọn nhập khoá bằng tay và dán vào.
   - Khoá này **sinh riêng cho từng database**, nên nó không nằm sẵn trong tài liệu này. Mỗi lần dựng DB mới
     là một khoá mới.
3. App hiện một mã 6 chữ số, đổi mỗi 30 giây. Gõ mã đó vào ô **Six-digit code** rồi bấm **Confirm**.
4. Màn hiện **Save your recovery codes** — 10 mã khôi phục, mỗi mã dùng được một lần.
   **Chép hoặc tải về ngay**, vì chúng chỉ hiện đúng một lần. Mất điện thoại thì đây là đường vào duy nhất.
5. Bấm **I have saved them** → vào thẳng dashboard admin.

Từ lần đăng nhập sau, admin nhập mật khẩu rồi nhập thêm mã 6 số. Không có điện thoại trong tay thì dùng một
mã khôi phục thay cho mã 6 số.

### Tắt 2FA sau khi đã cài

Nếu thấy vướng khi demo hay khi quay video: vào `/admin/security` → **Turn off two-step verification**.
Tắt rồi thì hệ thống **không bắt cài lại nữa** — lần sau chỉ cần mật khẩu. Đây là cách gọn nhất để quay
phần admin một mạch.

### Khi máy khác cần cài lại từ đầu

`make seed` **không** đụng tới 2FA — nạp lại seed không tắt được nó. Muốn đưa admin về trạng thái chưa cài
(để diễn lại luồng này, hoặc khi mất cả điện thoại lẫn mã khôi phục):

```bash
make mysql
```

```sql
DELETE FROM admin_mfa WHERE user_id = (SELECT id FROM users WHERE email = 'admin@marketlink.vn');
```

Lần đăng nhập kế tiếp sẽ quay lại bước 1.

## Dữ liệu demo đi kèm (FR-100, FR-101)

Sau `make seed` trên database trống: 4 chợ TP.HCM toạ độ thật · 10 sạp đã duyệt · 51 sản phẩm (1 bị admin ẩn để demo
kiểm duyệt) · slot nhận hàng 4 tuần · 13 đơn của `customer@marketlink.vn` (`ML-20260920-0001…0013`) đủ 6 trạng thái
placed / accepted / ready / completed / declined / cancelled · 8 review (1 bị ẩn, 1 có phản hồi của sạp) · 6 yêu thích ·
48 dòng template tồn kho tuần · 3 báo hàng hư (1 chờ admin, 2 đã xác nhận) và 2 lỗi hạn dùng của Vườn Út Hiền · 3 góp ý
(bug / suggestion / query). Seed chạy lại được, không nhân đôi.

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
- Báo hàng hư (FR-122, FR-123): xác nhận báo cáo "Rau muống" của đơn `ML-20260920-0007` là lỗi thứ 3 trong 90 ngày của
  `farmer@` → sạp bị khoá kéo dài hạn dùng và thẻ báo cáo hiện nút "Suspend stall". `make seed` đưa về trạng thái ban
  đầu.

## Lưu ý

- **Mật khẩu admin.** Backend tự tạo `admin@marketlink.vn` với mật khẩu `Admin@123` khi khởi động lần đầu
  (`AdminSeeder`, profile `dev`/`local`). `make seed` ghi đè thành `Demo@1234` cho khớp bảng này. Chưa chạy seed thì
  vẫn là `Admin@123`.
- **Xác thực hai bước.** Seed không tạo sẵn 2FA cho tài khoản nào, nhưng admin vẫn **bị bắt cài ở lần đăng nhập
  đầu** (FR-008) — xem [mục hướng dẫn](#đăng-nhập-admin-lần-đầu--bắt-buộc-cài-2fa). Cài xong rồi thì `make seed`
  không tắt được; muốn tắt thì vào `/admin/security`, muốn xoá hẳn thì xoá dòng trong bảng `admin_mfa`.

## Giảm giá sắp hết hạn (FR-124, FR-125)

`make seed` đưa 2 ngày giảm giá vào sạp "Trứng gà Khánh Hòa" (`farmer8@marketlink.vn`), luôn ở các ngày còn đặt được:

- "Trứng vịt" giảm 20% vào ngày nhận đầu tiên từ hôm nay + 2, "Trứng cút" giảm 40% vào ngày nhận đầu tiên từ hôm nay + 3.
  Hạn của lô tính từ hạn dùng của sản phẩm, nên thẻ ở `/deals` ghi rõ còn dùng tốt tới ngày nào.
- Đăng nhập `farmer8@` → Products: khối "On sale (2)", nút "Near-expiry deal" ở từng sản phẩm để đăng thêm.
- Khách (`customer@marketlink.vn`) thêm một món từ `/deals`: giỏ chọn sẵn đúng ngày giảm giá và tính giá của ngày đó.
- Chạy lại `make seed` thì 2 ngày giảm giá dời về các ngày gần nhất và giảm giá cũ của hai sản phẩm này kết thúc.
