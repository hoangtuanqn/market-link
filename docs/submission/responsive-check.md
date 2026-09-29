# Kiểm responsive — 375 / 768 / 1440 (FR-080)

- Ngày đo: 27/09/2026 · nhánh `feature/FR-082-submission-readiness` (cắt từ `origin/dev` @ `597f2a92`)
- Chạy tại `http://localhost:3210` (Vite dev), backend `http://localhost:8080`, dữ liệu `make seed`
- Tài khoản: `docs/DEMO_CREDENTIALS.md` (mật khẩu chung `Demo@1234`)

## Cách đo

Mở trang, đặt bề rộng, rồi chạy trong console:

```js
document.documentElement.scrollWidth - document.documentElement.clientWidth
```

`0` là đạt; lớn hơn `0` là trang bị tràn ngang.

Dùng `clientWidth` chứ không phải `innerWidth`: `innerWidth` cộng cả thanh cuộn dọc, nên một trang tràn nhẹ
vẫn có thể ra `0` và lọt lưới.

## Kết quả cuối — 51 trang × 3 bề rộng, tất cả `0`

| Nhóm | Số trang | 375 | 768 | 1440 |
|---|---|---|---|---|
| Public (`/`, markets, market detail, products, product detail, stall, search, map, about, contact, feedback, terms, privacy) | 13 | 0 | 0 | 0 |
| Customer (dashboard, cart, orders, order detail, order edit, favorites, notifications, settings, account, assistant, messages, become-farmer) | 12 | 0 | 0 | 0 |
| Farmer (overview, orders, products, product form, stock, stall, slots, history, reviews, settings, notifications, messages) | 12 | 0 | 0 | 0 |
| Admin (dashboard, farmers, customers, markets, market form, moderation, reports, orders, categories, announcements, feedback, security, settings, account) | 14 | 0 | 0 | 0 |

## Bốn chỗ tràn đã tìm ra và sửa

| Trang | Bề rộng | Tràn | Nguyên nhân | Cách sửa |
|---|---|---|---|---|
| `/` (hero) | 375 | 51px | Dưới `lg` hero là grid một cột `auto`, cột co theo phần tử rộng nhất; thanh tìm kiếm có `<select>` và nút không chịu co | `[&>*]:min-w-0` trên section hero (`pages/public/Home/Hero.tsx`) |
| `/admin/categories` | 375 | 106px | Cột flex chứa bảng mặc định `min-width: auto`, nên nó phình theo bảng và `overflow-x-auto` của bảng không bao giờ được dùng | `min-w-0` trên cột flex |
| `/admin/categories` | 1440 | 12px | Hai ô "shelf life" mỗi ô `min-w-55` (220px) trong grid 2 cột nằm trong sidebar 380px | `[&>*]:min-w-0` trên grid đó |
| `/farmer/settings`, `/settings`, `/admin/settings` | 375 | 30–52px | Bảng tuỳ chọn thông báo không co được dưới `min-content` của 3 cột; và hai ô giờ "From/To" mỗi ô `min-w-55` | Bọc bảng trong `w-full overflow-x-auto`; `[&>*]:min-w-0` cho hàng From/To (`components/notifications/NotificationSettingsCard.tsx`) |

Ba trong bốn chỗ là cùng một nguyên nhân: phần tử con của flex/grid mặc định `min-width: auto`, nên nó không
bao giờ nhỏ hơn nội dung và đẩy cả trang ra ngoài. Gặp lại kiểu này thì thêm `min-w-0` cho phần tử con, và
bọc vùng cuộn cho thứ thật sự không co được (bảng nhiều cột).
