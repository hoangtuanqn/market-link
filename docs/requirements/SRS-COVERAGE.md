# SRS §1.6 → FR → màn hình — bảng đối chiếu và kịch bản video demo

Cập nhật 27/09/2026 (Task 13, sau khi Task 3–10 nối API xong). Mỗi dòng của SRS mục 1.6 ứng với
FR trong `.ai/REQUIREMENTS.md`, URL trên `localhost:3000`, và hai trạng thái:

- **Backend**: endpoint đã có và đã kiểm bằng test + curl (`✓`), chưa có (`✗`).
- **Màn hình**: `nối API` = trang gọi API thật · `—` = không có màn riêng. Mọi màn trước đây ghi `demo`
  (chạy trên `src/data/*`) nay đã nối API thật (Task 3–10); About/Contact nối API nhưng còn chờ dữ liệu
  thật của đội (Task 11).

Cột **Đã quay** để QA tick khi quay video (đề mục 1.9: video phải đi qua **mọi** dòng dưới đây).

## Customer

| SRS §1.6 | FR | URL | Backend | Màn hình | Đã quay |
|---|---|---|---|---|---|
| Register / log in / dashboard | 001, 003, 006 | `/register/customer`, `/login`, `/dashboard` | ✓ | nối API | ☐ |
| Name, phone, e-mail, address khi đăng ký | 001 | `/register/customer` | ✓ | nối API | ☐ |
| Save multiple favorite Farmers and products | 040 | `/favorites` | ✓ (C7) | nối API | ☐ |
| Browse markets by location & day, list Farmers per market | 010 | `/markets`, `/markets/:id` | ✓ | nối API | ☐ |
| Farmer profile: stall, location, days, weekly stock | 011 | `/stalls/:id` | ✓ | nối API | ☐ |
| Embedded map, markers, directions | 012, 013 | `/map`, `/markets/:id` | ✓ | nối API | ☐ |
| Browse categories, filter price/category/market/day | 020, 021 | `/products` | ✓ | nối API | ☐ |
| Product detail: price, unit, quantity, Farmer | 022 | `/products/:id` | ✓ (kèm `reviewsSummary` thật) | nối API | ☐ |
| Cart → pre-order against available stock | 030, 031 | `/cart` | ✓ (C5) | nối API | ☐ |
| Pickup date + time slot within Farmer windows | 032 | `/cart` | ✓ | nối API | ☐ |
| Order status placed/accepted/ready/completed; cancel/modify before cutoff | 033, 034, 035 | `/orders`, `/orders/:code`, `/orders/:code/edit` | ✓ | nối API | ☐ |
| View / modify / cancel orders | 036 | `/orders/:code` | ✓ | nối API | ☐ |
| Order history + quick reorder | 037 | `/orders` | ✓ (C6) | nối API | ☐ |
| Favorites for quick access + restock alerts | 040, 041 | `/favorites` | ✓ (C7) | nối API | ☐ |
| Save preferred market locations, route-friendly pickup | 014, 013 | `/favorites`, `/markets/:id` | ✓ | nối API | ☐ |
| AI assistant: find items, FAQ (optional) | 090, 091, 092 | `/assistant` | ✓ (11.1) | nối API | ☐ |
| Rate & review Farmers and products after completed order | 050, 051 | `/orders/:code/review` | ✓ (C8) | nối API | ☐ |
| View reviews left by others before ordering | 052 | `/products/:id`, `/stalls/:id` | ✓ | nối API | ☐ |

## Farmer

| SRS §1.6 | FR | URL | Backend | Màn hình | Đã quay |
|---|---|---|---|---|---|
| Register: stall name, contact person, phone, e-mail, address | 002 | `/become-farmer` | ✓ | nối API | ☐ |
| Profile: markets, operating days, pickup windows, address, map pin, lat/lng | 060, 061 | `/farmer/stall` | ✓ | nối API | ☐ |
| Add/edit/view/delete products (name, category, price, unit, qty, description, image) | 062 | `/farmer/products`, `/farmer/products/new` | ✓ | nối API | ☐ |
| Recurring weekly stock template | 063 | `/farmer/stock` | ✓ (C6) | nối API | ☐ |
| Mark sold out / temporarily unavailable | 064 | `/farmer/products` | ✓ | nối API | ☐ |
| View incoming pre-orders, accept/decline, mark ready | 065, 066 | `/farmer/orders`, `/farmer/orders/:code` | ✓ (C5) | nối API | ☐ |
| Order cut-off time, pickup slots | 067 | `/farmer/stall`, `/farmer/slots` | ✓ (C4) | nối API | ☐ |
| Past sales, order history, best sellers; Total / Pending / Revenue | 068, 069 | `/farmer`, `/farmer/history` | ✓ (C9) | nối API | ☐ |
| View and respond to reviews | 053 | `/farmer/reviews` | ✓ (C8) | nối API | ☐ |

## Admin

> **Trước khi quay:** admin chưa cài 2FA sẽ bị chặn ở `/admin/setup-2fa` (FR-008, không có nút bỏ qua).
> Cài trước theo `docs/DEMO_CREDENTIALS.md`, hoặc tắt ở `/admin/security` để quay một mạch không bị ngắt.

| SRS §1.6 | FR | URL | Backend | Màn hình | Đã quay |
|---|---|---|---|---|---|
| Dedicated admin login, separate dashboard | 004 | `/admin/login`, `/admin` | ✓ | nối API | ☐ |
| Dashboard: total Farmers, customers, markets, orders | 070 | `/admin` | ✓ (C9) | nối API | ☐ |
| Approve / suspend Farmer registrations before listing | 071 | `/admin/farmers` | ✓ | nối API | ☐ |
| View, activate, deactivate customer accounts | 072 | `/admin/customers` | ✓ (C9) | nối API | ☐ |
| Add/edit/remove markets: name, address, days, timings, coordinates | 073 | `/admin/markets` | ✓ | nối API | ☐ |
| Remove inappropriate product listings / reviews | 074 | `/admin/moderation` | ✓ (product: C3, review: C8) | nối API | ☐ |
| Reports: total orders, revenue across markets, most active Farmers | 075 | `/admin/reports`, `/admin/revenue`, `/admin/orders` | ✓ (C9) | nối API | ☐ |
| Master data: product categories | 076 | `/admin/categories` | ✓ | nối API | ☐ |
| Platform-wide announcements | 077 | `/admin/announcements` | ✓ | nối API | ☐ |

## Other features

| SRS §1.6 | FR | URL | Backend | Màn hình | Đã quay |
|---|---|---|---|---|---|
| Role-based access control | 005 | mọi route | ✓ (`@PreAuthorize` + ownership 403) | `RequireAuth role=…` (PR #158) | ☐ |
| Search, sort, filter with map-based results | 023 | `/search` | ✓ | nối API | ☐ |
| Responsive design | 080 | 375 / 768 / 1440 | — | QA kiểm tay | ☐ |
| Notifications: order confirmation, ready for pickup (in-app) | 042 | `/notifications` | ✓ (C5) | nối API | ☐ |
| Feedback and ratings | 050–052, 081 | `/orders/:code/review`, `/feedback`, `/admin/feedback` | ✓ (C8, C10) | nối API | ☐ |
| About Us | 082 | `/about` | — | nối API (chờ dữ liệu thật của đội — Task 11) | ☐ |
| Contact Us with map | 083 | `/contact` | — | nối API (chờ dữ liệu thật của đội — Task 11) | ☐ |

## Việc còn lại để video đi qua đủ mọi dòng

- **About Us / Contact Us** (082, 083): còn chờ địa chỉ, số điện thoại, email thật và tên thành viên đội
  (dữ liệu của LEAD, Task 11) trước khi quay được hai dòng này.
- **Deliverables ngoài repo** (đề mục 1.9, QA/DOC, không thuộc plan code): project report (problem
  definition, design, DFD, DB design, test data, install, credentials, phân công), video `.mp4` đi qua
  đủ mọi dòng của bảng này theo đúng thứ tự, hosting URL nếu có.

## Deliverables đề mục 1.9

| Yêu cầu | Ở đâu |
|---|---|
| SQL scripts (database + table definitions) | `db/schema.sql` (thiết kế LEAD) · `db/marketlink-schema-dump.sql` (bảng thật đang chạy, `mysqldump --no-data`) · `db/seed.sql` (dữ liệu demo) |
| User credentials for all roles (MANDATORY) | `docs/DEMO_CREDENTIALS.md` |
| Installation instructions (MANDATORY) | `README.md` §3b (`make init` → `make up` → `make seed`) |
| ReadMe.doc assumptions | `docs/ASSUMPTIONS.md` |
| AI-tool acknowledgement | `README.md` §"AI tools used" |
| Project report, DFD, video .mp4, hosting URL | chưa có trong repo — QA/DOC (ngoài phạm vi code) |
