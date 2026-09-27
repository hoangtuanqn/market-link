# BÀN GIAO — plan SRS gap-closure · 27/09/2026

Phiên trước (controller subagent-driven) dừng vì hết token. Phiên mới **thay thế hoàn toàn**, đọc file này rồi làm tiếp.

## 1. Đã xong và đã gộp vào nhánh `feature/FR-030-srs-gap-closure` (HEAD `37a51f4`, đã push)

| Task | Nội dung | Review |
|---|---|---|
| 1 | Backend: `customerId/customerName` trên danh sách đơn, admin đọc `GET /orders/{id}`, `GET /admin/reviews`, `GET /farmer/reviews`, `GET /admin/customers/{id}`, `orders?customerId`, `GET /admin/reports/top-products` (suite 849/849) | sạch |
| 2 | Cart store `lib/cart.ts`, `toOrderCard`/`toOrder` mở rộng, `OrderTicket` Cancel/Reorder thật, badge giỏ, `ChatApi`, `pickupLabel/cutoffLabel` | sạch sau 1 vòng sửa |
| 3 | Cart → preview/place thật, Add to cart, OrderPlaced | sạch |
| 4 | Customer Orders / OrderEdit / Dashboard | sạch |
| 5 | Favorites + FavoriteButton thật (MarketCard/ProductCard) | sạch sau 1 vòng sửa |
| 6 | Reviews: form khách, list public, farmer trả lời, tab admin | sạch |
| 7 | Farmer Orders / OrderDetail / Overview / History + badge sidebar | sạch sau 1 vòng sửa |
| 8 | Farmer Slots + Pending | sạch |
| 9 | Admin Home / Reports / Orders / OrderDetail / Customers / CustomerDetail / Feedback + form Feedback public | sạch sau 1 vòng sửa |
| 10 | Assistant trên `/chat` thật | sạch |

`App.tsx` không còn `SHOW_WIP`/`ComingSoon`. FE: `npx tsc -b && npx eslint src && npx vitest run` → 35 file / 211 test xanh. Chưa chạy review toàn nhánh cuối, chưa mở PR.

## 2. Còn lại

- **Task 12** (worktree `market-link-gap-t12`, nhánh `feature/gap-task-12` từ `37a51f4`, brief `.superpowers/sdd/2026-09-27-srs-gap-closure/task-12-brief.md`): xoá `frontend/src/data/{admin,catalog,customer,farmer,home}.ts` (còn 3 importer: `api-requests/catalog.requests.ts`, `components/StallCard.tsx`, `pages/admin/MarketForm/index.tsx` — chuyển `ClosureHandling/ClosureType/CLOSURE_HANDLINGS` sang `types/market.types.ts`), gỡ `SHOW_WIP` còn sót ở `StallCard`, `MarketForm`, `customer/OrderDetail` (nút Edit), `public/ProductDetail`, xoá `config/wip.ts`, `components/ComingSoon.tsx`, `VITE_SHOW_WIP`; kèm 11.3 thay `MapPlaceholder` ở ProductDetail bằng `<img src={p.imageUrl}>`; dọn `toOrderView`, `ProductType.favorite`, `MarketType.saved`, key mồ côi `cutoffNote`, `table.off`. **Chưa có commit** (agent bị ngắt).
- **Task 13** (worktree `market-link-gap-t13`, nhánh `feature/gap-task-13`, brief `task-13-brief.md`): `.ai/REQUIREMENTS.md` cột TT → `STAGING` cho FR đã nối (082/083 = WIP chờ dữ liệu, 043/085 TODO), `docs/SRS-COVERAGE.md` cột "Màn hình" → `nối API`, tạo `docs/ASSUMPTIONS.md`, README mục "AI tools used". **Chưa có commit.**
- **Task 11.1/11.2**: Contact (email/SĐT/địa chỉ/toạ độ) + About (6 tên thành viên) — **chờ LEAD cung cấp**; sửa `locales/*/Contact.json`, `About.json` + `About/index.tsx:88`.
- **Review toàn nhánh** (`review-package` từ `9535b39` tới HEAD, model mạnh nhất), 1 đợt fix, rồi PR `feature/FR-030-srs-gap-closure → dev`.
- Ngoài repo: project report, DFD, video .mp4, hosting.

## 3. Rulings đã đặt (chi tiết ở ledger `market-link-gap/.superpowers/sdd/2026-09-27-srs-gap-closure/progress.md`, git-ignore)

1 nhánh cho cả plan · task 3–10 chạy song song trên worktree riêng rồi merge tay (App.tsx) · `reviewed` = có ≥1 review, 1 phiên review/đơn · Farmer Pending chỉ tới được khi suspended (pending/rejected đi qua `/become-farmer`) · generateSlots không bật lại slot đã tắt (đề xuất LEAD `GET /farmer/slots`) · Cart giữ nguyên khi place 409 · admin đọc đơn (read-only) · deactivate customer thu hồi refresh token, lý do chỉ ở toast · bỏ Away days, Export, so sánh tháng trước, filter "reported review" (không có API/đề không đòi).

Đề xuất LEAD (contract §7/§8/§10 additive): 5 endpoint Task 1; `GET /farmer/slots` (kèm slot tắt); `GET /admin/products?hidden=true`; `GET /favorites/ids`; `deactivate_reason` nếu cần lưu lý do.

## 4. Môi trường

- Stack Docker `mlgap`: backend `:8094` (đã seed), frontend container stop; override `techwiz7/compose.gap-override.yml`, `.env` COMPOSE_PROJECT_NAME=mlgap.
- FE lint/test chạy trên host: `market-link-gap/frontend/node_modules` là bản `npm ci` thật; các worktree `-tN` symlink tới đó.
- Test BE: `docker compose exec -T -e MAVEN_OPTS=-Xmx256m backend ./mvnw -B test -DargLine="-Xmx768m -XX:MaxMetaspaceSize=256m -XX:+UseSerialGC"` (viết tường minh, không để trong biến zsh). Host: `/bin/rm -f`, không có `timeout`.
- Worktree đã xong có thể xoá: `market-link-gap-t3…t10` (nhánh `feature/gap-task-N` đã merge).
