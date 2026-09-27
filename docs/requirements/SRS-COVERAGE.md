# SRS §1.6 → FR → màn hình — bảng đối chiếu và kịch bản video demo

Cập nhật 26/09/2026 trên nhánh `feature/FR-050-reviews` (sau khi C5–C7 vào `dev`). Mỗi dòng của SRS mục 1.6 ứng với
FR trong `.ai/REQUIREMENTS.md`, URL trên `localhost:3000`, và hai trạng thái:

- **Backend**: endpoint đã có và đã kiểm bằng test + curl (`✓`), chưa có (`✗`).
- **Màn hình**: `nối API` = trang gọi API thật · `demo` = trang còn chạy trên `src/data/*` (ẩn sau `SHOW_WIP`, bản build
  production hiện "Coming soon") · `—` = không có màn riêng.

Cột **Đã quay** để QA tick khi quay video (đề mục 1.9: video phải đi qua **mọi** dòng dưới đây).

## Customer

| SRS §1.6 | FR | URL | Backend | Màn hình | Đã quay |
|---|---|---|---|---|---|
| Register / log in / dashboard | 001, 003, 006 | `/register/customer`, `/login`, `/dashboard` | ✓ | nối API (dashboard: demo) | ☐ |
| Name, phone, e-mail, address khi đăng ký | 001 | `/register/customer` | ✓ | nối API | ☐ |
| Save multiple favorite Farmers and products | 040 | `/favorites` | ✓ (C7) | demo | ☐ |
| Browse markets by location & day, list Farmers per market | 010 | `/markets`, `/markets/:id` | ✓ | nối API | ☐ |
| Farmer profile: stall, location, days, weekly stock | 011 | `/stalls/:id` | ✓ | nối API (review/rating: demo) | ☐ |
| Embedded map, markers, directions | 012, 013 | `/map`, `/markets/:id` | ✓ | nối API | ☐ |
| Browse categories, filter price/category/market/day | 020, 021 | `/products` | ✓ | nối API | ☐ |
| Product detail: price, unit, quantity, Farmer | 022 | `/products/:id` | ✓ (kèm `reviewsSummary` thật) | nối API (khối review: demo) | ☐ |
| Cart → pre-order against available stock | 030, 031 | `/cart` | ✓ (C5) | demo | ☐ |
| Pickup date + time slot within Farmer windows | 032 | `/cart` | ✓ | demo | ☐ |
| Order status placed/accepted/ready/completed; cancel/modify before cutoff | 033, 034, 035 | `/orders`, `/orders/:code`, `/orders/:code/edit` | ✓ | demo | ☐ |
| View / modify / cancel orders | 036 | `/orders/:code` | ✓ | demo | ☐ |
| Order history + quick reorder | 037 | `/orders` | ✓ (C6) | demo | ☐ |
| Favorites for quick access + restock alerts | 040, 041 | `/favorites` | ✓ (C7) | demo | ☐ |
| Save preferred market locations, route-friendly pickup | 014, 013 | `/favorites`, `/markets/:id` | ✓ | demo | ☐ |
| AI assistant: find items, FAQ (optional) | 090, 091, 092 | `/assistant` | ✓ (11.1) | demo (kịch bản cứng) | ☐ |
| Rate & review Farmers and products after completed order | 050, 051 | `/orders/:code/review` | ✓ (C8) | demo | ☐ |
| View reviews left by others before ordering | 052 | `/products/:id`, `/stalls/:id` | ✓ | demo | ☐ |

## Farmer

| SRS §1.6 | FR | URL | Backend | Màn hình | Đã quay |
|---|---|---|---|---|---|
| Register: stall name, contact person, phone, e-mail, address | 002 | `/become-farmer` | ✓ | nối API | ☐ |
| Profile: markets, operating days, pickup windows, address, map pin, lat/lng | 060, 061 | `/farmer/stall` | ✓ | nối API | ☐ |
| Add/edit/view/delete products (name, category, price, unit, qty, description, image) | 062 | `/farmer/products`, `/farmer/products/new` | ✓ | nối API | ☐ |
| Recurring weekly stock template | 063 | `/farmer/stock` | ✓ (C6) | demo | ☐ |
| Mark sold out / temporarily unavailable | 064 | `/farmer/products` | ✓ | nối API | ☐ |
| View incoming pre-orders, accept/decline, mark ready | 065, 066 | `/farmer/orders`, `/farmer/orders/:code` | ✓ (C5) | demo | ☐ |
| Order cut-off time, pickup slots | 067 | `/farmer/stall`, `/farmer/slots` | ✓ (C4) | stall: nối API · slots: demo | ☐ |
| Past sales, order history, best sellers; Total / Pending / Revenue | 068, 069 | `/farmer`, `/farmer/history` | ✓ (C9) | demo | ☐ |
| View and respond to reviews | 053 | `/farmer/reviews` | ✓ (C8) | demo | ☐ |

## Admin

| SRS §1.6 | FR | URL | Backend | Màn hình | Đã quay |
|---|---|---|---|---|---|
| Dedicated admin login, separate dashboard | 004 | `/admin/login`, `/admin` | ✓ | login: nối API · dashboard: demo | ☐ |
| Dashboard: total Farmers, customers, markets, orders | 070 | `/admin` | ✓ (C9) | demo | ☐ |
| Approve / suspend Farmer registrations before listing | 071 | `/admin/farmers` | ✓ | nối API | ☐ |
| View, activate, deactivate customer accounts | 072 | `/admin/customers` | ✓ (C9) | demo | ☐ |
| Add/edit/remove markets: name, address, days, timings, coordinates | 073 | `/admin/markets` | ✓ | nối API | ☐ |
| Remove inappropriate product listings / reviews | 074 | `/admin/moderation` | ✓ (product: C3, review: C8) | product: nối API · review: demo | ☐ |
| Reports: total orders, revenue across markets, most active Farmers | 075 | `/admin/reports`, `/admin/revenue`, `/admin/orders` | ✓ (C9) | demo | ☐ |
| Master data: product categories | 076 | `/admin/categories` | ✓ | nối API | ☐ |
| Platform-wide announcements | 077 | `/admin/announcements` | ✓ | nối API | ☐ |

## Other features

| SRS §1.6 | FR | URL | Backend | Màn hình | Đã quay |
|---|---|---|---|---|---|
| Role-based access control | 005 | mọi route | ✓ (`@PreAuthorize` + ownership 403) | `RequireAuth role=…` (PR #158) | ☐ |
| Search, sort, filter with map-based results | 023 | `/search` | ✓ | nối API | ☐ |
| Responsive design | 080 | 375 / 768 / 1440 | — | QA kiểm tay | ☐ |
| Notifications: order confirmation, ready for pickup (in-app) | 042 | `/notifications` | ✓ (C5) | nối API | ☐ |
| Feedback and ratings | 050–052, 081 | `/orders/:code/review`, `/feedback`, `/admin/feedback` | ✓ (C8, C10) | demo | ☐ |
| About Us | 082 | `/about` | — | nối API | ☐ |
| Contact Us with map | 083 | `/contact` | — | nối API | ☐ |

## Việc còn lại để video đi qua đủ mọi dòng

Mọi dòng ghi **demo** cần bạn FE nối trang vào `frontend/src/api-requests/*.ts` (đã có đủ hàm: `order`, `stall`,
`product`, `review`, `report`, `feedback`, `favorite`, `stock-template`…) rồi bỏ màn đó khỏi danh sách `SHOW_WIP` trong
`App.tsx`. Khi không còn màn nào import `src/data/*`, xoá các file đó (Task 11.4).

## Deliverables đề mục 1.9

| Yêu cầu | Ở đâu |
|---|---|
| SQL scripts (database + table definitions) | `db/schema.sql` (thiết kế LEAD) · `db/marketlink-schema-dump.sql` (bảng thật đang chạy, `mysqldump --no-data`) · `db/seed.sql` (dữ liệu demo) |
| User credentials for all roles (MANDATORY) | `docs/DEMO_CREDENTIALS.md` |
| Installation instructions (MANDATORY) | `README.md` §3b (`make init` → `make up` → `make seed`) |
| ReadMe.doc assumptions, project report, DFD, video .mp4, AI-tool acknowledgement | chưa có trong repo — QA/DOC |
