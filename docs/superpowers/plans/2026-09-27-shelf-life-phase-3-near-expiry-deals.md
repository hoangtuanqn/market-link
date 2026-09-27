# Giai đoạn 3 — Giảm giá hàng sắp hết hạn (FR-124, FR-125) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Farmer đưa một ngày nhận của sản phẩm vào diện "giảm giá sắp hết hạn" (app gợi ý mức giảm, Farmer chỉnh được), khách xem các ngày đó ở trang `/deals`, trang chủ và trang sản phẩm, và giỏ hàng tính giá đúng ngày nhận đã chọn.

**Architecture:** Giảm giá là 4 cột mới trên dòng `product_daily_stock` của đúng một ngày nhận (`list_price`, `discount_percent`, `packed_on`, `best_before`); `unit_price` của dòng đó là giá sau giảm, nên logic đặt đơn gần như giữ nguyên. Luật (điều kiện, mức gợi ý, làm tròn) là hàm thuần `DealPolicy` ở backend và `lib/deals.ts` ở frontend, test bằng cùng một bảng số. Đăng giảm giá khoá dòng tồn kho bằng khoá tự nhiên như `OrderService.place`, và "ngày còn đặt được" dùng lại `SlotQueryRepository.orderableDates`. Preview giỏ nhận thêm `pickupDates` để tính theo ngày khách chọn; đặt đơn chụp `list_price` và `best_before` của lô vào `order_items`.

**Tech Stack:** Spring Boot 4.1 · Java 25 · MySQL 8.4 · Flyway · NamedParameterJdbcTemplate · JUnit 5 + Mockito + AssertJ · React 19 · Vite · TypeScript · Tailwind 4 · react-i18next · vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-27-shelf-life-deals-design.md` — §4.5 (4.5.1–4.5.5), §5 (migration 5 và 2 ngày giảm giá demo), §6 (các dòng FR-124/125), §7, §8, §9, §10. LEAD duyệt 27/09/2026.

## Global Constraints

- Làm trên nhánh `feature/FR-120-shelf-life-deals` (hoặc nhánh cắt từ nó) **sau khi giai đoạn 1 đã vào nhánh này**. Không commit, push hay merge vào `dev`/`main` (R-08). Trước khi sửa file: `git branch --show-current`.
- Giai đoạn này dùng tên do giai đoạn 1 tạo ra (`docs/superpowers/plans/2026-09-27-shelf-life-phase-1-guidance.md`): `catalog.enums.StorageMode` (có `value()`), `Product.getStorageMode()`, `Product.getShelfLifeDays()`, `catalog.services.impl.ShelfLifePolicy.bestBefore(LocalDate firstDay, int days)`, `OrderItem.snapshot(Product, BigDecimal unitPrice, int quantity, BigDecimal subtotal, LocalDate pickupDate)`, `OrderItem.setListPrice(..)`/`setBestBefore(..)`; frontend `StorageMode` trong `api-requests/shelf-life.requests.ts`, `components/BestBeforeLine.tsx` (props `bestBefore`, `storageMode`), key chung `storageMode.room`, `storageMode.chilled`, `bestBefore.line`. Chưa có thì dừng lại và báo, không tự tạo.
- Commit dạng `<type>(FR-124|FR-125): <English>`, toàn bộ tiếng Anh (R-01, R-10). FR-124 = Farmer giảm giá: dữ liệu, luật, API Farmer, chụp vào đơn, UI Farmer. FR-125 = trang `/deals` và API public, giỏ tính theo ngày nhận, seed, contract.
- Comment trong code 100% tiếng Anh (R-09). Dữ liệu seed và dữ liệu mẫu trong test được viết tiếng Việt.
- DB chỉ đổi bằng một migration mới `V20260927007__daily_stock_deals.sql` (R-03). **Trước khi tạo file** chạy `ls backend/src/main/resources/db/migration | tail -3`; nếu version đó hoặc một version mới hơn đã có thì lấy số `V<yyyyMMdd><nnn>` kế tiếp, giữ nguyên phần mô tả (Flyway từ chối version cũ hơn version đã chạy). SQL luôn có tham số (R-04).
- Quyền (R-06): sản phẩm của sạp khác → 403 `FORBIDDEN`; sạp chưa duyệt hoặc đang đình chỉ mà ghi → 403 `STALL_NOT_APPROVED` (D-09, spec §8); ngày không còn đặt được → 409.
- Không sửa `db/schema.sql`, `docs/decisions.md` (R-02). `docs/api-contract.md` chỉ **thêm** dòng, ở Task 14.
- Luật nghiệp vụ (spec §4.5, chép nguyên): H = ngày thu hoạch/đóng gói, P = ngày nhận, N = hạn dùng **hiện tại** của sản phẩm. `B = H + N − 1`, `L = B − P + 1`. Được giảm khi `H < P`, `H ≤ hôm nay`, `1 ≤ L ≤ ⌈N/2⌉`. `L < 1` → 400 `EXPIRED_BEFORE_PICKUP`; `H ≥ P` hoặc `L > ⌈N/2⌉` → 400 `NOT_NEAR_EXPIRY`; mức giảm ngoài 5–70 hoặc H sau hôm nay → 400 `VALIDATION_ERROR`; ngày không còn slot đặt được → 409 `DATE_NOT_ORDERABLE`. Gợi ý: 40% khi `L = 1` hoặc `L/N ≤ 0,2`; 30% khi `L/N ≤ 0,35`; còn lại 20%. Farmer chỉnh 5–70%, mỗi bước 5%. Giá mới = `giá gốc × (100 − %) / 100`, làm tròn tới cent, thấp nhất $0.01. Mỗi sản phẩm một giá mỗi ngày. `/deals` xếp theo ngày nhận gần nhất rồi mức giảm lớn nhất. Cửa sổ 14 ngày như `ProductAvailabilityResolver`.
- Tỉ lệ so bằng số nguyên ở cả hai phía, không dùng số thực: `L/N ≤ 0,2` ⇔ `5·L ≤ N`; `L/N ≤ 0,35` ⇔ `20·L ≤ 7·N`; `⌈N/2⌉` = `(N + 1) / 2` (chia nguyên). Làm tròn nửa lên: backend `BigDecimal` + `RoundingMode.HALF_UP`, frontend tính theo cent nguyên.
- Backend: controller extends `BaseController` (`ok(data, message)`), `@PreAuthorize` theo role, request/response là `record`, lỗi nghiệp vụ là exception map trong `product/controllers/ProductExceptionHandler.java` (envelope `ApiResource.error(ErrorResource.builder().code(..).details(..).build(), message)`), `InvalidFieldException(field, message)` → 400 `VALIDATION_ERROR` kèm field. Principal `@AuthenticationPrincipal CustomUserDetails user` → `user.getId()`. Bean `Clock` của app là Asia/Ho_Chi_Minh (`modules/chat/ChatConfig.java`). Tham số `LocalDate` trên path/query có `@DateTimeFormat(iso = DateTimeFormat.ISO.DATE)` như `FarmerOrderController`.
- Test: backend unit bằng Mockito (mẫu `product/services/impl/FarmerDailyStockServiceTest.java`, `order/services/impl/OrderServiceTest.java`); test MySQL bằng `@SpringBootTest` + `@Transactional` (rollback sau mỗi test, mẫu `order/services/impl/PlaceOrderOpenDaysTest.java`) với `report/services/impl/ReportFixture.java` hoặc insert bằng `JdbcTemplate`. Frontend: vitest + Testing Library, `vi.mock` module api-requests (mẫu `pages/farmer/ProductForm/index.test.tsx`), dialog thì stub `HTMLDialogElement.prototype.showModal/close` (mẫu `pages/customer/OrderDetail/index.test.tsx`).
- UI: màn có dữ liệu đủ 4 trạng thái loading / empty / error / có data (FR-084); responsive 375 / 768 / 1440 px, không tràn ngang (FR-080); chỉ class token của design system (`bg-surface`, `text-ink-muted`, `bg-danger text-on-danger`, `text-warning-ink`…, không hex, không palette mặc định của Tailwind); spacing token `1/2/3/4/6/8/12/16`; component trong `src/components/ui`.
- Chữ hiển thị chỉ đi qua `frontend/src/locales/<lang>/<Namespace>.json`, đủ 10 ngôn ngữ `en vi zh ja ko fr es de th id`. Plan ghi sẵn bản `en` và `vi`; 8 ngôn ngữ còn lại dịch từ bản `en`, giữ nguyên `{{…}}`, dấu `−` và `→`, định dạng JSON 2 dấu cách, dòng trống cuối file. Namespace mới cần thêm một dòng trong `frontend/src/i18n/resources.ts`. Tiếng Anh viết sentence case, không emoji, không dấu chấm than; nút bị khoá có dòng lý do bên cạnh.
- Tiền qua `money()` / `perUnit()` / `PriceTag` (USD, D-13). Ngày `yyyy-MM-dd` hiển thị qua `stockDay()` (`components/stockDay.ts`, ra "Sat 03/10").
- Lệnh (stack Docker riêng của worktree, viết đúng như sau):
  - test backend tập trung: `docker compose exec -T -e MAVEN_OPTS=-Xmx256m backend ./mvnw -B test -Dtest='ClassName' -Dsurefire.failIfNoSpecifiedTests=false -DargLine="-Xmx768m -XX:MaxMetaspaceSize=256m -XX:+UseSerialGC"`
  - format backend: `docker compose exec -T -e MAVEN_OPTS=-Xmx256m backend ./mvnw -B -q spotless:apply`
  - test frontend: `docker compose exec -T frontend sh -c 'npx vitest run src/path/file.test.tsx'`
  - trước mỗi commit frontend: `docker compose exec -T frontend sh -c 'npx prettier --write <files> && npx tsc -b && npx eslint src'`
  - cuối plan: `make be-test` và `docker compose exec -T frontend sh -c 'npx vitest run'`.
  - Hook `frontend-format` của lefthook cần `frontend/node_modules` trên host. Host không có thì, sau khi đã chạy prettier trong container, commit bằng `LEFTHOOK_EXCLUDE=frontend-format git commit …`.

## Rulings

Spec im lặng hoặc lệch với code ở các chỗ dưới đây. Mỗi mục là lựa chọn nhỏ nhất còn đúng; task sở hữu có test ghim lại.

1. **Thêm một endpoint đọc cho dialog: `GET /api/v1/farmer/products/{id}/daily-stock`** (⚑ chờ LEAD duyệt, ghi trong PR). Dialog cần các ngày còn đặt được trong 14 ngày tới, "hiện đang mở bán 30 kg" và giá của đúng ngày đó. FE không tự tính đúng được: một ngày đã sinh dòng thì giữ giá lúc sinh dòng (Farmer sửa giá sản phẩm sau đó không đổi dòng), và số còn lại đã trừ các đơn. Endpoint chỉ đọc, dùng lại `ProductAvailabilityResolver`, cùng họ đường dẫn với `PATCH .../daily-stock/{date}` đang có. (Task 3, 4, 5.)
2. **`GET /api/v1/deals` nhận thêm `productId` (tuỳ chọn)** cho khối "Đang giảm giá" ở trang chi tiết sản phẩm (spec §4.5.4). Chỉ thêm, không đổi các tham số spec đã ghi. (Task 7.)
3. **"Ngày còn đặt được"** = `SlotQueryRepository.orderableDates` (slot còn chỗ, trước cutoff, chợ và sạp cùng mở), trong 14 ngày từ hôm nay — đúng luật `ProductAvailabilityResolver`. `day` là thứ 0 = CN … 6 = T7 như `GET /products`. `marketId` giữ một ngày khi sạp có mặt ở chợ đó đúng thứ đó (và chợ họp thứ đó); `marketNames` là các chợ sạp có mặt vào thứ của ngày nhận. (Task 7.)
4. **Sản phẩm không ở trạng thái `available` không hiện ở `/deals`** (tạm ngừng hay "hết hàng" do Farmer đặt thì không đặt được: `placeGroup` đòi `sellable`). Server vẫn cho đăng giảm giá cho sản phẩm đó (spec không cấm); FE chỉ hiện nút cho sản phẩm `available`, không bị ẩn, có `nextDate`. (Task 7, 10.)
5. **"Menu của mỗi dòng" → một nút.** Dòng sản phẩm của Farmer hiện không có menu, chỉ có nút Sửa/Xoá; nút "Near-expiry deal" đứng cạnh hai nút đó. "Chỉ hiện khi có lịch tồn kho tuần" được hiểu là có `nextDate` (có template đang bật **và** có ngày khách còn đặt được); không có ngày nào thì dialog cũng không có gì để chọn. (Task 10.)
6. **Số lượng mang tới ≥ 1.** Ngày P phải nằm trong 14 ngày tới và còn đặt được, nếu không → 409 `DATE_NOT_ORDERABLE`. Thứ của P không có template đang bật (materialize không tạo được dòng) cũng → 409 `DATE_NOT_ORDERABLE`: sản phẩm không bán ngày đó. (Task 4.)
7. **Thứ tự kiểm tra khi đăng:** 403/404 (sạp đã duyệt, sản phẩm của mình) → 400 (mức giảm, ngày thu hoạch, luật sắp hết hạn) → 409 (ngày còn đặt được, có template). (Task 4.)
8. **Đăng lại cho một ngày đang giảm giá** giữ `list_price` đầu tiên; mức giảm mới luôn tính trên giá thường, không cộng dồn. (Task 1, 4.)
9. **Giá sau giảm không bao giờ cao hơn giá gốc**: thấp nhất $0.01 như spec, riêng giá gốc $0.00 thì giữ $0.00. (Task 2, 9.)
10. **`PATCH .../daily-stock/{date}` có `unitPrice` sẽ kết thúc giảm giá của ngày đó** (giá Farmer gõ tay thắng); PATCH chỉ đổi số lượng thì giữ giảm giá. Không vậy thì `/deals` hiện "−20%" với một giá không còn giảm 20%. (Task 1.)
11. **`DELETE .../deal` không lỗi khi ngày không giảm giá** (200, không đổi gì); vẫn đòi sạp đã duyệt như mọi thao tác ghi sản phẩm (D-09). **`GET /api/v1/farmer/deals`** trả các ngày giảm giá từ hôm nay của sản phẩm chưa xoá, ở mọi trạng thái duyệt (chỉ đọc). (Task 4.)
12. **Preview:** `pickupDates` chỉ đổi cách tính của các sạp có trong danh sách; một sạp ghi hai lần thì lấy lần cuối; ngày không bị kiểm lại là còn đặt được (giỏ chỉ đưa ra ngày có slot, đặt đơn vẫn kiểm). Mỗi món trả thêm `listPrice`, `discountPercent` (chỉ khi ngày đó giảm giá), `bestBefore` (của lô giảm giá, không thì ngày nhận + N − 1, đúng như đơn sẽ chụp) và `storageMode` (cho `BestBeforeLine`). Không có `pickupDates` thì vẫn tính ngày gần nhất như cũ và điền các field này cho ngày đó. (Task 8.)
13. **Ngày mặc định trong giỏ:** bộ chọn ngày của sạp chọn sẵn ngày giảm giá nếu ngày đó còn trong danh sách slot; preview tính mỗi sạp theo `ngày khách đã chọn ?? ngày giảm giá`. Trường hợp hiếm là ngày giảm giá không còn slot: bộ chọn về ngày đầu tiên và hiện dòng báo, preview vẫn tính ngày giảm giá cho tới khi khách bấm một khung giờ. Đặt đơn bắt buộc bấm khung giờ, và việc đó ghi ngày và tính lại giá; nút Đặt bị khoá trong lúc tính lại. (Task 13.)
14. **Khối phụ:** dải giảm giá ở trang chủ không hiện gì khi đang tải, lỗi hoặc trống (đủ 4 trạng thái nằm ở trang `/deals`). Khối "Đang giảm giá" ở trang sản phẩm ẩn khi đang tải hoặc trống, hiện `LoadError` khi lỗi (giống khối review). Khối "On sale" ở trang Farmer Products ẩn khi trống, hiện `LoadError` khi lỗi, và giữ danh sách cũ trên màn hình trong lúc đọc lại. (Task 10, 12.)
15. **`Dialog` dùng `useId()` cho id của tiêu đề.** Trang Farmer Products có hai dialog (xoá và giảm giá); với id cố định `dialog-title`, dialog thứ hai bị đọc bằng tiêu đề của dialog thứ nhất. (Task 10.)
16. **Seed:** 2 ngày giảm giá cho "Trứng vịt" (20%) và "Trứng cút" (40%) của `farmer8@marketlink.vn` ("Trứng gà Khánh Hòa"): sạp mở mọi ngày, hai sản phẩm không có trong đơn seed nào, hạn 10 ngày theo seed giai đoạn 1. Ngày và lô tính từ hôm nay và hạn dùng thật của sản phẩm, kèm điều kiện của chính luật giảm giá; chạy lại seed thì kết thúc giảm giá cũ trước. (Task 14.)

## Review Focus

1. **Khách thêm món từ `/deals` rồi chọn ngày nhận khác.** Kỳ vọng: giá của sạp về giá thường của ngày mới, nhãn giảm giá biến mất, có dòng "The deal only applies to Sun 04/10."; nút Đặt bị khoá tới khi giá mới về. → Task 13, test `re-prices a stall when another day is picked and says the deal is for its own day`.
2. **Farmer đăng lại giảm giá cho một ngày đang giảm (20% → 40%).** Kỳ vọng: 40% tính trên giá thường ($0.60 → $0.36), không tính trên giá đã giảm. → Task 1 `postingAgainKeepsTheFirstListPrice`; Task 4 `postingAgainTakesTheNewDiscountOffTheNormalPrice`.
3. **Giá sau giảm ở dialog khác giá server lưu vì làm tròn.** Kỳ vọng: $1.90 giảm 15% ra $1.62 ở cả hai phía, $0.05 giảm 70% ra $0.02, $0.01 giữ $0.01. → Task 2 `roundsTheDealPriceToTheCent`; Task 9 cùng bảng trong `lib/deals.test.ts`.
4. **Farmer sửa hạn dùng sản phẩm sau khi đã đăng giảm giá.** Kỳ vọng: `best_before` của lô và của đơn đặt sau đó giữ nguyên như lúc đăng (spec §8). → Task 6 `editingTheShelfLifeLaterKeepsTheBatchBestBefore`.
5. **Ngày giảm giá hết slot hoặc qua cutoff.** Kỳ vọng: ngày đó biến mất khỏi `/deals` và tổng số; đăng giảm giá cho ngày đó → 409; trong giỏ có dòng báo và bộ chọn về ngày khác. → Task 7 `keepsOnlyDealDaysCustomersCanStillOrderNearestDayFirstThenTheBiggestDiscount`; Task 4 `postRefusesADayCustomersCanNoLongerOrder`; Task 13 `says so when the deal day can no longer be picked`.

---

## File Structure

**Backend — tạo mới** (`backend/src/main/java/com/techx/intervue/modules/…`):

| File | Trách nhiệm |
|---|---|
| `backend/src/main/resources/db/migration/V20260927007__daily_stock_deals.sql` | 4 cột giảm giá của `product_daily_stock` + 2 CHECK + index |
| `product/services/impl/DealPolicy.java` | Hàm thuần: điều kiện, `B`, `L`, mức gợi ý, giá sau giảm, mức giảm hợp lệ |
| `product/exceptions/NotNearExpiryException.java`, `ExpiredBeforePickupException.java`, `DateNotOrderableException.java` | 400 / 400 / 409 |
| `product/requests/DealRequest.java`, `DealSearchCriteria.java` | Body của Farmer, query của `/deals` |
| `product/resources/FarmerDealResource.java`, `DealResource.java` | Dòng của khối "On sale", thẻ của `/deals` |
| `product/repositories/DealQueryRepository.java` | SQL: ngày giảm giá của sạp, ngày giảm giá công khai, chợ theo thứ |
| `product/services/interfaces/FarmerDealServiceInterface.java`, `product/services/impl/FarmerDealService.java` | Đăng / bỏ giảm giá, danh sách của sạp, các ngày cho dialog |
| `product/services/interfaces/DealQueryServiceInterface.java`, `product/services/impl/DealQueryService.java` | `/deals`: lọc ngày còn đặt được, phân trang |
| `product/controllers/FarmerDealController.java`, `DealController.java` | REST Farmer, REST public |
| `order/requests/PickupDateInput.java` | `{ farmerId, date }` của preview |

**Backend — sửa:** `product/entities/ProductDailyStock.java`, `product/resources/DailyStockResource.java`, `product/services/impl/FarmerDailyStockService.java`, `product/services/impl/ProductAvailabilityResolver.java`, `product/controllers/ProductExceptionHandler.java`, `config/SecurityConfig.java`, `order/requests/PreviewRequest.java`, `order/resources/PreviewItemResource.java`, `order/services/impl/OrderService.java`, `order/services/interfaces/OrderServiceInterface.java`.

**Backend — test** (`backend/src/test/java/com/techx/intervue/modules/…`): mới `product/entities/ProductDailyStockTest.java`, `product/services/impl/DealPolicyTest.java`, `product/services/impl/FarmerDealServiceTest.java`, `product/repositories/FarmerDealsQueryTest.java`, `product/controllers/DealHttpMappingTest.java`, `product/controllers/DealsPublicAccessTest.java`, `product/services/impl/DealSearchIntegrationTest.java`, `order/services/impl/DealOrderFlowTest.java`; sửa `product/repositories/ProductDailyStockRepositoryTest.java`, `product/services/impl/FarmerDailyStockServiceTest.java`, `product/services/impl/ProductAvailabilityResolverTest.java`, `order/services/impl/OrderServiceTest.java`.

**Frontend — tạo mới** (`frontend/src/…`): `lib/deals.ts` (+ `.test.ts`), `api-requests/deal.requests.ts`, `components/ui/dialog.test.tsx`, `pages/farmer/Products/ActiveDeals.tsx`, `pages/farmer/Products/DealDialog.tsx` (+ `.test.tsx`), `pages/farmer/Products/index.test.tsx`, `components/DealCard.tsx`, `pages/public/Deals/index.tsx` (+ `.test.tsx`), `components/Footer.test.tsx`, `pages/public/Home/DealsStrip.tsx` (+ `.test.tsx`), `pages/public/ProductDetail/ProductDeals.tsx` (+ `.test.tsx`), `pages/customer/Cart/DealNote.tsx`, `locales/<10 ngôn ngữ>/Deals.json`.

**Frontend — sửa:** `lib/cart.ts` (+ `cart.test.ts`), `components/ui/dialog.tsx`, `pages/farmer/Products/index.tsx`, `constants/nav.ts`, `components/Footer.tsx`, `components/Header/Header.test.tsx`, `App.tsx`, `i18n/resources.ts`, `pages/public/Home/index.tsx`, `pages/public/ProductDetail/index.tsx`, `api-requests/order.requests.ts`, `components/CartGroup.tsx`, `pages/customer/Cart/index.tsx` (+ `index.test.tsx`); locale `common`, `FarmerProducts`, `Home`, `ProductDetail`, `CustomerCart` (10 ngôn ngữ mỗi file).

**Khác:** `db/seed.sql`, `docs/api-contract.md`.

Thứ tự task: FR-124 trước (Task 1–6 backend, 9–10 frontend), FR-125 sau (Task 7–8 backend, 11–13 frontend), rồi seed và contract. Nếu reviewer muốn PR dưới ~400 dòng, cắt được thành hai PR tại ranh giới đó.

---

### Task 1: Cột giảm giá trên dòng tồn kho theo ngày (FR-124)

**Files:**
- Create: `backend/src/main/resources/db/migration/V20260927007__daily_stock_deals.sql`
- Modify: `backend/src/main/java/com/techx/intervue/modules/product/entities/ProductDailyStock.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/product/resources/DailyStockResource.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/product/services/impl/FarmerDailyStockService.java` (cuối `override(...)`)
- Test: `backend/src/test/java/com/techx/intervue/modules/product/entities/ProductDailyStockTest.java` (mới)
- Test: `backend/src/test/java/com/techx/intervue/modules/product/repositories/ProductDailyStockRepositoryTest.java` (thêm test)
- Test: `backend/src/test/java/com/techx/intervue/modules/product/services/impl/FarmerDailyStockServiceTest.java` (thêm test)

**Interfaces:**
- Consumes: bảng `product_daily_stock` (V20260926018).
- Produces: cột `list_price DECIMAL(10,2)`, `discount_percent TINYINT`, `packed_on DATE`, `best_before DATE` (cùng NULL hoặc cùng có giá trị, CHECK `ck_pds_deal_all_or_none`, `ck_pds_deal_percent`); trên `ProductDailyStock`: field `listPrice`, `discountPercent` (Integer), `packedOn`, `bestBefore` + `boolean hasDeal()`, `BigDecimal basePrice()`, `void startDeal(BigDecimal dealPrice, int percent, LocalDate packedOn, LocalDate bestBefore)`, `void endDeal()`; `DailyStockResource(Long productId, LocalDate stockDate, int quantityAvailable, BigDecimal unitPrice, BigDecimal listPrice, Integer discountPercent, LocalDate packedOn, LocalDate bestBefore)` + `static DailyStockResource of(ProductDailyStock row)`.

- [ ] **Step 1: Viết test của entity**

`backend/src/test/java/com/techx/intervue/modules/product/entities/ProductDailyStockTest.java`:

```java
package com.techx.intervue.modules.product.entities;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

/** FR-124 (spec §4.5.3): a pickup day on a near-expiry deal, and back. */
class ProductDailyStockTest {

    private static final LocalDate PACKED = LocalDate.of(2026, 9, 29);
    private static final LocalDate BEST_BEFORE = LocalDate.of(2026, 10, 5);

    private static ProductDailyStock day(String price) {
        ProductDailyStock row = new ProductDailyStock();
        row.setQuantityAvailable(30);
        row.setUnitPrice(new BigDecimal(price));
        return row;
    }

    @Test
    void aDealKeepsTheNormalPriceAndDescribesTheBatch() {
        ProductDailyStock row = day("0.60");

        row.startDeal(new BigDecimal("0.48"), 20, PACKED, BEST_BEFORE);

        assertThat(row.hasDeal()).isTrue();
        assertThat(row.getListPrice()).isEqualByComparingTo("0.60");
        assertThat(row.getUnitPrice()).isEqualByComparingTo("0.48");
        assertThat(row.getDiscountPercent()).isEqualTo(20);
        assertThat(row.getPackedOn()).isEqualTo(PACKED);
        assertThat(row.getBestBefore()).isEqualTo(BEST_BEFORE);
        assertThat(row.getQuantityAvailable()).isEqualTo(30);
    }

    /** Posting again for the same day never compounds: the normal price stays the reference. */
    @Test
    void postingAgainKeepsTheFirstListPrice() {
        ProductDailyStock row = day("0.60");
        row.startDeal(new BigDecimal("0.48"), 20, PACKED, BEST_BEFORE);

        row.startDeal(new BigDecimal("0.36"), 40, PACKED.minusDays(1), BEST_BEFORE.minusDays(1));

        assertThat(row.getListPrice()).isEqualByComparingTo("0.60");
        assertThat(row.basePrice()).isEqualByComparingTo("0.60");
        assertThat(row.getUnitPrice()).isEqualByComparingTo("0.36");
        assertThat(row.getDiscountPercent()).isEqualTo(40);
    }

    @Test
    void endingADealRestoresThePriceAndKeepsTheQuantity() {
        ProductDailyStock row = day("0.60");
        row.startDeal(new BigDecimal("0.48"), 20, PACKED, BEST_BEFORE);
        row.setQuantityAvailable(12);

        row.endDeal();

        assertThat(row.hasDeal()).isFalse();
        assertThat(row.getUnitPrice()).isEqualByComparingTo("0.60");
        assertThat(row.getListPrice()).isNull();
        assertThat(row.getPackedOn()).isNull();
        assertThat(row.getBestBefore()).isNull();
        assertThat(row.getQuantityAvailable()).isEqualTo(12);
    }

    @Test
    void endingADayWithoutADealChangesNothing() {
        ProductDailyStock row = day("0.60");

        row.endDeal();

        assertThat(row.getUnitPrice()).isEqualByComparingTo("0.60");
        assertThat(row.basePrice()).isEqualByComparingTo("0.60");
    }
}
```

- [ ] **Step 2: Thêm test MySQL vào `ProductDailyStockRepositoryTest`**

Thêm import `static org.assertj.core.api.Assertions.assertThatThrownBy`, `com.techx.intervue.modules.product.entities.ProductDailyStock`, `java.math.BigDecimal`, `org.springframework.dao.DataIntegrityViolationException`, rồi thêm 3 test (trước helper `insert`):

```java
    /** V20260927007: a deal day round-trips with its four columns. */
    @Test
    void aDealDayIsStoredWithItsFourColumns() {
        repository.saveAndFlush(dealDay(20));

        ProductDailyStock saved =
                repository.findByProductIdAndStockDate(productId, MONDAY).orElseThrow();
        assertThat(saved.getListPrice()).isEqualByComparingTo("0.60");
        assertThat(saved.getUnitPrice()).isEqualByComparingTo("0.48");
        assertThat(saved.getDiscountPercent()).isEqualTo(20);
        assertThat(saved.getPackedOn()).isEqualTo(MONDAY.minusDays(4));
        assertThat(saved.getBestBefore()).isEqualTo(MONDAY.plusDays(2));
    }

    /** ck_pds_deal_all_or_none: a deal is never half set, even by a bug. */
    @Test
    void theDatabaseRefusesAHalfSetDeal() {
        ProductDailyStock row = plainDay();
        row.setListPrice(new BigDecimal("0.60"));

        assertThatThrownBy(() -> repository.saveAndFlush(row))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    /** ck_pds_deal_percent: 5–70 only. */
    @Test
    void theDatabaseRefusesADiscountAbove70() {
        assertThatThrownBy(() -> repository.saveAndFlush(dealDay(80)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    private ProductDailyStock plainDay() {
        ProductDailyStock row = new ProductDailyStock();
        row.setProductId(productId);
        row.setStockDate(MONDAY);
        row.setQuantityAvailable(12);
        row.setUnitPrice(new BigDecimal("0.60"));
        return row;
    }

    private ProductDailyStock dealDay(int percent) {
        ProductDailyStock row = plainDay();
        row.startDeal(new BigDecimal("0.48"), percent, MONDAY.minusDays(4), MONDAY.plusDays(2));
        return row;
    }
```

(`tearDown` có sẵn đã xoá `product_daily_stock` của sản phẩm test.)

- [ ] **Step 3: Thêm test vào `FarmerDailyStockServiceTest`**

Thêm 2 test (cuối class):

```java
    /**
     * FR-124: an explicit price for the day ends its near-expiry deal, so the percent shown on
     * /deals always matches what customers pay.
     */
    @Test
    void overrideWithAPriceEndsTheDeal() {
        approvedStall();
        ProductDailyStock row = dealRow();
        when(dailyStock.findByProductIdAndStockDate(PRODUCT_ID, DATE)).thenReturn(Optional.of(row));
        when(dailyStock.save(any())).thenAnswer(i -> i.getArgument(0));

        DailyStockResource result =
                service.override(
                        USER_ID,
                        PRODUCT_ID,
                        DATE,
                        new FarmerDailyStockRequest(15, new BigDecimal("0.55")));

        assertThat(result.unitPrice()).isEqualByComparingTo("0.55");
        assertThat(result.listPrice()).isNull();
        assertThat(result.discountPercent()).isNull();
        assertThat(row.hasDeal()).isFalse();
    }

    /** Changing only the quantity keeps the deal and its price. */
    @Test
    void overrideWithoutAPriceKeepsTheDeal() {
        approvedStall();
        ProductDailyStock row = dealRow();
        when(dailyStock.findByProductIdAndStockDate(PRODUCT_ID, DATE)).thenReturn(Optional.of(row));
        when(dailyStock.save(any())).thenAnswer(i -> i.getArgument(0));

        DailyStockResource result =
                service.override(USER_ID, PRODUCT_ID, DATE, new FarmerDailyStockRequest(15, null));

        assertThat(result.quantityAvailable()).isEqualTo(15);
        assertThat(result.unitPrice()).isEqualByComparingTo("0.48");
        assertThat(result.listPrice()).isEqualByComparingTo("0.60");
        assertThat(result.discountPercent()).isEqualTo(20);
    }

    private static ProductDailyStock dealRow() {
        ProductDailyStock row = new ProductDailyStock();
        row.setId(500L);
        row.setProductId(PRODUCT_ID);
        row.setStockDate(DATE);
        row.setQuantityAvailable(12);
        row.setUnitPrice(new BigDecimal("0.60"));
        row.startDeal(new BigDecimal("0.48"), 20, DATE.minusDays(4), DATE.plusDays(2));
        return row;
    }
```

- [ ] **Step 4: Chạy test để thấy fail**

Run: `docker compose exec -T -e MAVEN_OPTS=-Xmx256m backend ./mvnw -B test -Dtest='ProductDailyStockTest,ProductDailyStockRepositoryTest,FarmerDailyStockServiceTest' -Dsurefire.failIfNoSpecifiedTests=false -DargLine="-Xmx768m -XX:MaxMetaspaceSize=256m -XX:+UseSerialGC"`
Expected: FAIL lúc biên dịch test — `cannot find symbol: method startDeal(...)`, `method listPrice()`.

- [ ] **Step 5: Viết migration**

Chạy `ls backend/src/main/resources/db/migration | tail -3` trước (xem Global Constraints). `backend/src/main/resources/db/migration/V20260927007__daily_stock_deals.sql`:

```sql
-- FR-124 (proposed; spec docs/superpowers/specs/2026-09-27-shelf-life-deals-design.md §4.5.3): a
-- near-expiry deal is one pickup day of a product sold cheaper. That day's row keeps the price the
-- deal replaced (list_price), the discount, when the batch brought for the day was harvested or
-- packed (packed_on) and the batch's last good day (best_before, fixed when the deal is posted).
-- unit_price is then the deal price, so placing an order needs no change to read it. The four
-- columns are all set or all empty. LEAD reconciles db/schema.sql (R-02).
ALTER TABLE product_daily_stock
    ADD COLUMN list_price       DECIMAL(10, 2) NULL AFTER unit_price,
    ADD COLUMN discount_percent TINYINT        NULL AFTER list_price,
    ADD COLUMN packed_on        DATE           NULL AFTER discount_percent,
    ADD COLUMN best_before      DATE           NULL AFTER packed_on,
    ADD CONSTRAINT ck_pds_deal_all_or_none CHECK (
        (list_price IS NULL AND discount_percent IS NULL AND packed_on IS NULL AND best_before IS NULL)
        OR (list_price IS NOT NULL AND discount_percent IS NOT NULL AND packed_on IS NOT NULL
            AND best_before IS NOT NULL)),
    ADD CONSTRAINT ck_pds_deal_percent CHECK (discount_percent BETWEEN 5 AND 70),
    -- GET /deals scans deal days by date; almost no row has a deal
    ADD INDEX idx_pds_deals (discount_percent, stock_date);
```

- [ ] **Step 6: Sửa entity `ProductDailyStock`**

Thêm vào cuối Javadoc của class một đoạn:

```java
 *
 * <p>FR-124: a day can be on a near-expiry deal (V20260927007). Its four deal columns are set and
 * cleared together (ck_pds_deal_all_or_none); {@code unitPrice} is then the deal price.
```

Thêm sau field `unitPrice`:

```java
    /** The day's price before its near-expiry deal; null when the day has no deal. */
    @Column(name = "list_price", precision = 10, scale = 2)
    private BigDecimal listPrice;

    /** 5–70, in steps of 5 (DealPolicy). */
    @Column(name = "discount_percent")
    private Integer discountPercent;

    /** When the batch brought for this day was harvested or packed. */
    @Column(name = "packed_on")
    private LocalDate packedOn;

    /**
     * The batch's last good day, fixed when the deal is posted: changing the product's shelf life
     * later leaves it alone (spec §8).
     */
    @Column(name = "best_before")
    private LocalDate bestBefore;

    public boolean hasDeal() {
        return discountPercent != null;
    }

    /** The day's normal price: the one a deal replaced, else the current one. */
    public BigDecimal basePrice() {
        return hasDeal() ? listPrice : unitPrice;
    }

    /**
     * Puts the day on a deal. Posting again keeps the first list price, so a new discount is taken
     * off the normal price and never compounds.
     */
    public void startDeal(
            BigDecimal dealPrice, int percent, LocalDate packedOn, LocalDate bestBefore) {
        this.listPrice = basePrice();
        this.unitPrice = dealPrice;
        this.discountPercent = percent;
        this.packedOn = packedOn;
        this.bestBefore = bestBefore;
    }

    /** Back to the normal price; the quantity stays as it is. A day without a deal is left alone. */
    public void endDeal() {
        if (!hasDeal()) {
            return;
        }
        this.unitPrice = listPrice;
        this.listPrice = null;
        this.discountPercent = null;
        this.packedOn = null;
        this.bestBefore = null;
    }
```

- [ ] **Step 7: Mở rộng `DailyStockResource`**

Thay cả file bằng:

```java
package com.techx.intervue.modules.product.resources;

import com.techx.intervue.modules.product.entities.ProductDailyStock;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * A single product_daily_stock row: after a Farmer's per-date override, after a near-expiry deal
 * (FR-124), or as one pickup day the deal dialog offers. The four deal fields are null when the
 * day has no deal.
 */
public record DailyStockResource(
        Long productId,
        LocalDate stockDate,
        int quantityAvailable,
        BigDecimal unitPrice,
        BigDecimal listPrice,
        Integer discountPercent,
        LocalDate packedOn,
        LocalDate bestBefore) {

    public static DailyStockResource of(ProductDailyStock row) {
        return new DailyStockResource(
                row.getProductId(),
                row.getStockDate(),
                row.getQuantityAvailable(),
                row.getUnitPrice(),
                row.getListPrice(),
                row.getDiscountPercent(),
                row.getPackedOn(),
                row.getBestBefore());
    }
}
```

- [ ] **Step 8: PATCH có giá thì kết thúc giảm giá (Ruling 10)**

Trong `FarmerDailyStockService.override`, thay đoạn từ `row.setQuantityAvailable(request.quantityAvailable());` tới hết `return new DailyStockResource(...);` bằng:

```java
        row.setQuantityAvailable(request.quantityAvailable());
        if (request.unitPrice() != null) {
            // An explicit price for the day replaces its near-expiry deal (FR-124): the deal's
            // percent would no longer match the price customers pay
            row.endDeal();
            row.setUnitPrice(request.unitPrice());
        }
        ProductDailyStock saved = dailyStock.save(row);
        restock.afterChange(product, wasOrderable, restock.isOrderable(product));

        return DailyStockResource.of(saved);
```

- [ ] **Step 9: Chạy lại test**

Run: `docker compose exec -T -e MAVEN_OPTS=-Xmx256m backend ./mvnw -B test -Dtest='ProductDailyStockTest,ProductDailyStockRepositoryTest,FarmerDailyStockServiceTest' -Dsurefire.failIfNoSpecifiedTests=false -DargLine="-Xmx768m -XX:MaxMetaspaceSize=256m -XX:+UseSerialGC"`
Expected: `Tests run: 19, Failures: 0, Errors: 0` (4 + 7 + 8), `BUILD SUCCESS`. Log Flyway có dòng `Migrating schema ... to version "20260927007 - daily stock deals"` ở lần chạy đầu.

- [ ] **Step 10: Format và commit**

```bash
docker compose exec -T -e MAVEN_OPTS=-Xmx256m backend ./mvnw -B -q spotless:apply
git add backend/src/main/resources/db/migration/V20260927007__daily_stock_deals.sql \
  backend/src/main/java/com/techx/intervue/modules/product/entities/ProductDailyStock.java \
  backend/src/main/java/com/techx/intervue/modules/product/resources/DailyStockResource.java \
  backend/src/main/java/com/techx/intervue/modules/product/services/impl/FarmerDailyStockService.java \
  backend/src/test/java/com/techx/intervue/modules/product/entities/ProductDailyStockTest.java \
  backend/src/test/java/com/techx/intervue/modules/product/repositories/ProductDailyStockRepositoryTest.java \
  backend/src/test/java/com/techx/intervue/modules/product/services/impl/FarmerDailyStockServiceTest.java
git commit -m "feat(FR-124): store near-expiry deal columns on the daily stock row"
```

---

### Task 2: `DealPolicy` — luật giảm giá dùng chung (FR-124)

**Files:**
- Create: `backend/src/main/java/com/techx/intervue/modules/product/services/impl/DealPolicy.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/product/services/impl/DealPolicyTest.java`

**Interfaces:**
- Consumes: `ShelfLifePolicy.bestBefore(LocalDate firstDay, int days)` (giai đoạn 1).
- Produces: `DealPolicy.MIN_PERCENT = 5`, `MAX_PERCENT = 70`, `STEP = 5`; `enum DealPolicy.Problem { PACKED_IN_FUTURE, FRESH, NOT_NEAR_EXPIRY, EXPIRED_BEFORE_PICKUP }`; `record DealPolicy.Check(LocalDate bestBefore, int daysLeft, Problem problem)` (`problem == null` là được giảm); `static Check check(int shelfLifeDays, LocalDate packedOn, LocalDate pickupDate, LocalDate today)`; `static int daysLeft(LocalDate bestBefore, LocalDate pickupDate)`; `static int suggestedPercent(int daysLeft, int shelfLifeDays)`; `static boolean validPercent(int percent)`; `static BigDecimal dealPrice(BigDecimal listPrice, int percent)`. Bảng số trong test này được chép sang `frontend/src/lib/deals.test.ts` ở Task 9.

- [ ] **Step 1: Viết test (bảng số dùng chung)**

```java
package com.techx.intervue.modules.product.services.impl;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/**
 * FR-124 (spec §4.5.1–4.5.2). The same rows run in frontend/src/lib/deals.test.ts, so the dialog
 * and the server always agree. Rows 1–2 are the spec's examples (tomato, eggs).
 */
class DealPolicyTest {

    /** Shelf life N, packed on H, pickup P, today → best-before B, days left L, outcome, suggestion. */
    @ParameterizedTest(name = "N={0} H={1} P={2} today={3} → {6}")
    @CsvSource({
        "7,  2026-09-29, 2026-10-03, 2026-09-30, 2026-10-05,  3, OK,                    20",
        "21, 2026-09-14, 2026-10-03, 2026-09-30, 2026-10-04,  2, OK,                    40",
        "7,  2026-09-30, 2026-10-03, 2026-09-30, 2026-10-06,  4, OK,                    20",
        "10, 2026-09-25, 2026-10-03, 2026-09-30, 2026-10-04,  2, OK,                    40",
        "20, 2026-09-20, 2026-10-03, 2026-09-30, 2026-10-09,  7, OK,                    30",
        "20, 2026-09-21, 2026-10-03, 2026-09-30, 2026-10-10,  8, OK,                    20",
        "2,  2026-10-02, 2026-10-03, 2026-10-02, 2026-10-03,  1, OK,                    40",
        "5,  2026-09-29, 2026-10-02, 2026-09-30, 2026-10-03,  2, OK,                    20",
        "7,  2026-12-29, 2027-01-02, 2026-12-30, 2027-01-04,  3, OK,                    20",
        "1,  2026-10-02, 2026-10-03, 2026-10-02, 2026-10-02,  0, EXPIRED_BEFORE_PICKUP,  0",
        "7,  2026-09-20, 2026-10-03, 2026-09-30, 2026-09-26, -6, EXPIRED_BEFORE_PICKUP,  0",
        "3,  2026-10-03, 2026-10-03, 2026-10-03, 2026-10-05,  3, FRESH,                  0",
        "7,  2026-10-01, 2026-10-03, 2026-09-30, 2026-10-07,  5, PACKED_IN_FUTURE,       0",
        "7,  2026-10-02, 2026-10-03, 2026-10-02, 2026-10-08,  6, NOT_NEAR_EXPIRY,        0",
    })
    void checksABatchForAPickupDay(
            int shelfLife,
            LocalDate packedOn,
            LocalDate pickup,
            LocalDate today,
            LocalDate bestBefore,
            int daysLeft,
            String outcome,
            int suggested) {
        DealPolicy.Check check = DealPolicy.check(shelfLife, packedOn, pickup, today);

        assertThat(check.bestBefore()).isEqualTo(bestBefore);
        assertThat(check.daysLeft()).isEqualTo(daysLeft);
        if ("OK".equals(outcome)) {
            assertThat(check.problem()).isNull();
            assertThat(DealPolicy.suggestedPercent(daysLeft, shelfLife)).isEqualTo(suggested);
        } else {
            assertThat(check.problem()).isEqualTo(DealPolicy.Problem.valueOf(outcome));
        }
    }

    /** Rounded half up to the cent, at least $0.01, never above the list price. */
    @ParameterizedTest(name = "{0} at {1}% → {2}")
    @CsvSource({
        "0.60, 20, 0.48",
        "2.60, 40, 1.56",
        "10.00, 5, 9.50",
        "1.90, 15, 1.62",
        "0.05, 70, 0.02",
        "0.01, 70, 0.01",
        "0.00, 50, 0.00",
    })
    void roundsTheDealPriceToTheCent(BigDecimal listPrice, int percent, BigDecimal expected) {
        assertThat(DealPolicy.dealPrice(listPrice, percent)).isEqualByComparingTo(expected);
    }

    @ParameterizedTest(name = "{0}% → {1}")
    @CsvSource({
        "5, true", "20, true", "70, true", "0, false", "4, false", "33, false", "75, false",
        "100, false"
    })
    void takesADiscountFrom5To70InStepsOf5(int percent, boolean valid) {
        assertThat(DealPolicy.validPercent(percent)).isEqualTo(valid);
    }
}
```

- [ ] **Step 2: Chạy test để thấy fail**

Run: `docker compose exec -T -e MAVEN_OPTS=-Xmx256m backend ./mvnw -B test -Dtest='DealPolicyTest' -Dsurefire.failIfNoSpecifiedTests=false -DargLine="-Xmx768m -XX:MaxMetaspaceSize=256m -XX:+UseSerialGC"`
Expected: FAIL lúc biên dịch — `cannot find symbol: class DealPolicy`.

- [ ] **Step 3: Viết `DealPolicy`**

```java
package com.techx.intervue.modules.product.services.impl;

import com.techx.intervue.modules.catalog.services.impl.ShelfLifePolicy;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/**
 * FR-124 (spec §4.5.1–4.5.2): when a batch may go on a near-expiry deal for a pickup day, the
 * suggested discount and the deal price. Pure functions, no I/O; frontend/src/lib/deals.ts is the
 * same rules for the dialog. Ratios are compared in whole numbers ({@code L/N ≤ 0.2} is {@code 5L ≤
 * N}) so both sides round the same way.
 */
public final class DealPolicy {

    public static final int MIN_PERCENT = 5;
    public static final int MAX_PERCENT = 70;
    public static final int STEP = 5;

    private static final BigDecimal ONE_CENT = new BigDecimal("0.01");
    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    /** Why a batch cannot go on a deal for that day. */
    public enum Problem {
        /** H is after today. */
        PACKED_IN_FUTURE,
        /** H is the pickup day itself (or later): the produce is fresh. */
        FRESH,
        /** More than half of the shelf life is left on the pickup day. */
        NOT_NEAR_EXPIRY,
        /** The batch is no longer good on the pickup day. */
        EXPIRED_BEFORE_PICKUP
    }

    /**
     * {@code bestBefore} = B, {@code daysLeft} = L (the pickup day counts); {@code problem} is null
     * when the batch may go on a deal.
     */
    public record Check(LocalDate bestBefore, int daysLeft, Problem problem) {}

    private DealPolicy() {}

    /** B = H + N − 1, L = B − P + 1; eligible when H < P, H ≤ today and 1 ≤ L ≤ ⌈N/2⌉. */
    public static Check check(
            int shelfLifeDays, LocalDate packedOn, LocalDate pickupDate, LocalDate today) {
        LocalDate bestBefore = ShelfLifePolicy.bestBefore(packedOn, shelfLifeDays);
        int daysLeft = daysLeft(bestBefore, pickupDate);
        Problem problem = null;
        if (packedOn.isAfter(today)) {
            problem = Problem.PACKED_IN_FUTURE;
        } else if (!packedOn.isBefore(pickupDate)) {
            problem = Problem.FRESH;
        } else if (daysLeft < 1) {
            problem = Problem.EXPIRED_BEFORE_PICKUP;
        } else if (daysLeft > (shelfLifeDays + 1) / 2) {
            problem = Problem.NOT_NEAR_EXPIRY;
        }
        return new Check(bestBefore, daysLeft, problem);
    }

    /** Days the customer can still use the batch, the pickup day included. */
    public static int daysLeft(LocalDate bestBefore, LocalDate pickupDate) {
        return (int) ChronoUnit.DAYS.between(pickupDate, bestBefore) + 1;
    }

    /** 40% at one day left or L/N ≤ 0.2, 30% at L/N ≤ 0.35, else 20%. */
    public static int suggestedPercent(int daysLeft, int shelfLifeDays) {
        if (daysLeft <= 1 || 5 * daysLeft <= shelfLifeDays) {
            return 40;
        }
        if (20 * daysLeft <= 7 * shelfLifeDays) {
            return 30;
        }
        return 20;
    }

    public static boolean validPercent(int percent) {
        return percent >= MIN_PERCENT && percent <= MAX_PERCENT && percent % STEP == 0;
    }

    /**
     * list × (100 − percent) / 100, rounded half up to the cent, at least $0.01 — but never above
     * the list price, so a free product stays free.
     */
    public static BigDecimal dealPrice(BigDecimal listPrice, int percent) {
        BigDecimal price =
                listPrice
                        .multiply(BigDecimal.valueOf(100L - percent))
                        .divide(HUNDRED, 2, RoundingMode.HALF_UP);
        return price.max(ONE_CENT).min(listPrice.setScale(2, RoundingMode.HALF_UP));
    }
}
```

- [ ] **Step 4: Chạy lại test**

Run: `docker compose exec -T -e MAVEN_OPTS=-Xmx256m backend ./mvnw -B test -Dtest='DealPolicyTest' -Dsurefire.failIfNoSpecifiedTests=false -DargLine="-Xmx768m -XX:MaxMetaspaceSize=256m -XX:+UseSerialGC"`
Expected: `Tests run: 29, Failures: 0, Errors: 0` (14 + 7 + 8).

- [ ] **Step 5: Format và commit**

```bash
docker compose exec -T -e MAVEN_OPTS=-Xmx256m backend ./mvnw -B -q spotless:apply
git add backend/src/main/java/com/techx/intervue/modules/product/services/impl/DealPolicy.java \
  backend/src/test/java/com/techx/intervue/modules/product/services/impl/DealPolicyTest.java
git commit -m "feat(FR-124): deal policy for eligibility, suggested discount and price"
```

---

### Task 3: `ProductAvailabilityResolver` biết giảm giá của một ngày và liệt kê các ngày còn đặt được (FR-124)

**Files:**
- Modify: `backend/src/main/java/com/techx/intervue/modules/product/services/impl/ProductAvailabilityResolver.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/product/services/impl/ProductAvailabilityResolverTest.java` (thêm test)

**Interfaces:**
- Consumes: Task 1 (`ProductDailyStock.hasDeal()`, `getListPrice()`…).
- Produces: `static final int LOOKAHEAD_DAYS = 14` (package-private, bỏ `private`); `record ProductAvailabilityResolver.Deal(BigDecimal listPrice, int discountPercent, LocalDate packedOn, LocalDate bestBefore)`; `record Availability(LocalDate date, int quantity, BigDecimal price, Deal deal)` **giữ constructor 3 tham số** `Availability(LocalDate, int, BigDecimal)` (deal = null) để mọi test đang dựng `Availability` 3 tham số vẫn biên dịch; `List<Availability> upcoming(Product product)`; hàm riêng `Optional<Availability> lookup(Long productId, LocalDate date, List<WeeklyStockTemplate> active, BigDecimal basePrice)` mà Task 8 dùng lại.

- [ ] **Step 1: Thêm test**

Trong `ProductAvailabilityResolverTest`, thêm helper và 2 test:

```java
    private static Product product() {
        Product p = new Product();
        p.setId(PRODUCT_ID);
        p.setFarmerId(FARMER_ID);
        p.setPrice(new BigDecimal("12000"));
        return p;
    }

    /** FR-124: the nearest day on a near-expiry deal reports the deal price and the batch. */
    @Test
    void resolveCarriesTheDealOfTheDay() {
        LocalDate monday = LocalDate.of(2026, 9, 28);
        when(templates.findByProductIdAndActiveTrue(PRODUCT_ID))
                .thenReturn(List.of(template(1, 40, null)));
        ProductDailyStock onDeal = new ProductDailyStock();
        onDeal.setQuantityAvailable(12);
        onDeal.setUnitPrice(new BigDecimal("0.60"));
        onDeal.startDeal(
                new BigDecimal("0.48"), 20, LocalDate.of(2026, 9, 24), LocalDate.of(2026, 9, 30));
        when(dailyStock.findByProductIdAndStockDate(PRODUCT_ID, monday))
                .thenReturn(Optional.of(onDeal));

        ProductAvailabilityResolver.Availability a =
                resolver.resolve(Map.of(PRODUCT_ID, new BigDecimal("0.60"))).get(PRODUCT_ID);

        assertThat(a.price()).isEqualByComparingTo("0.48");
        assertThat(a.deal().listPrice()).isEqualByComparingTo("0.60");
        assertThat(a.deal().discountPercent()).isEqualTo(20);
        assertThat(a.deal().packedOn()).isEqualTo(LocalDate.of(2026, 9, 24));
        assertThat(a.deal().bestBefore()).isEqualTo(LocalDate.of(2026, 9, 30));
    }

    /**
     * The days the deal dialog offers: every orderable day of the lookahead the product is sold
     * on, nearest first, each with its own numbers.
     */
    @Test
    void upcomingListsEveryOrderableDayNearestFirst() {
        // TODAY (26/09) is a Saturday = 6; the product sells on Saturday (30) and Monday (20)
        when(templates.findByProductIdAndActiveTrue(PRODUCT_ID))
                .thenReturn(List.of(template(6, 30, null), template(1, 20, null)));
        when(dailyStock.findByProductIdAndStockDate(any(), any())).thenReturn(Optional.empty());
        // Today is past its cutoff; Mon 28/09, Sat 03/10 and Mon 05/10 still take orders
        openDates(Set.of(TODAY.plusDays(2), TODAY.plusDays(7), TODAY.plusDays(9)));

        List<ProductAvailabilityResolver.Availability> days = resolver.upcoming(product());

        assertThat(days)
                .extracting(ProductAvailabilityResolver.Availability::date)
                .containsExactly(TODAY.plusDays(2), TODAY.plusDays(7), TODAY.plusDays(9));
        assertThat(days)
                .extracting(ProductAvailabilityResolver.Availability::quantity)
                .containsExactly(20, 30, 20);
        assertThat(days.getFirst().deal()).isNull();
    }
```

- [ ] **Step 2: Chạy test để thấy fail**

Run: `docker compose exec -T -e MAVEN_OPTS=-Xmx256m backend ./mvnw -B test -Dtest='ProductAvailabilityResolverTest' -Dsurefire.failIfNoSpecifiedTests=false -DargLine="-Xmx768m -XX:MaxMetaspaceSize=256m -XX:+UseSerialGC"`
Expected: FAIL lúc biên dịch — `cannot find symbol: method deal()`, `method upcoming(Product)`.

- [ ] **Step 3: Sửa resolver**

1. Đổi `private static final int LOOKAHEAD_DAYS = 14;` thành (bỏ `private`, `FarmerDealService` và `DealQueryService` cùng package dùng lại):

```java
    /** Package-visible: the deal services use the same window. */
    static final int LOOKAHEAD_DAYS = 14;
```

2. Thay dòng `public record Availability(LocalDate date, int quantity, BigDecimal price) {}` bằng:

```java
    /** A near-expiry deal on one pickup day (FR-124); see ProductDailyStock. */
    public record Deal(
            BigDecimal listPrice, int discountPercent, LocalDate packedOn, LocalDate bestBefore) {}

    /** {@code deal} is null when the day sells at its normal price. */
    public record Availability(LocalDate date, int quantity, BigDecimal price, Deal deal) {

        public Availability(LocalDate date, int quantity, BigDecimal price) {
            this(date, quantity, price, null);
        }
    }
```

3. Thay cả hàm `resolveOne(...)` bằng ba hàm sau:

```java
    private Availability resolveOne(
            Long productId,
            LocalDate date,
            List<WeeklyStockTemplate> active,
            BigDecimal basePrice) {
        // candidateDates only offers weekdays with an active template, so one always exists here
        return lookup(productId, date, active, basePrice).orElseThrow();
    }

    /**
     * One pickup day's numbers without creating its row: the row when it exists, else the active
     * template of that weekday; empty when neither exists (the product is not sold that day).
     */
    private Optional<Availability> lookup(
            Long productId,
            LocalDate date,
            List<WeeklyStockTemplate> active,
            BigDecimal basePrice) {
        Optional<ProductDailyStock> existing =
                dailyStock.findByProductIdAndStockDate(productId, date);
        if (existing.isPresent()) {
            return Optional.of(fromRow(date, existing.get()));
        }
        int dayOfWeek = date.getDayOfWeek().getValue() % 7;
        return active.stream()
                .filter(t -> t.getDayOfWeek() == dayOfWeek)
                .findFirst()
                .map(
                        t ->
                                new Availability(
                                        date,
                                        t.getDefaultQuantity(),
                                        t.getDefaultPrice() != null
                                                ? t.getDefaultPrice()
                                                : basePrice));
    }

    private static Availability fromRow(LocalDate date, ProductDailyStock row) {
        Deal deal =
                row.hasDeal()
                        ? new Deal(
                                row.getListPrice(),
                                row.getDiscountPercent(),
                                row.getPackedOn(),
                                row.getBestBefore())
                        : null;
        return new Availability(date, row.getQuantityAvailable(), row.getUnitPrice(), deal);
    }
```

4. Thêm hàm public (ngay sau `resolve(...)`):

```java
    /**
     * FR-124: every day of the lookahead a customer can still order this product for, nearest
     * first, with that day's numbers — the pickup days the near-expiry deal dialog offers.
     */
    public List<Availability> upcoming(Product product) {
        LocalDate today = LocalDate.now(clock);
        Set<LocalDate> open =
                slots.orderableDates(
                                Set.of(product.getFarmerId()),
                                today,
                                today.plusDays(LOOKAHEAD_DAYS - 1),
                                LocalDateTime.now(clock))
                        .getOrDefault(product.getFarmerId(), Set.of());
        List<WeeklyStockTemplate> active = templates.findByProductIdAndActiveTrue(product.getId());
        return candidateDates(today, active).stream()
                .filter(open::contains)
                .map(date -> resolveOne(product.getId(), date, active, product.getPrice()))
                .toList();
    }
```

- [ ] **Step 4: Chạy lại test của resolver và các test dựng `Availability`**

Run: `docker compose exec -T -e MAVEN_OPTS=-Xmx256m backend ./mvnw -B test -Dtest='ProductAvailabilityResolverTest,ProductQueryServiceTest,RestockNotifierTest,ReorderTest,OrderServiceTest,ChatServiceTest,AssistantToolsTest' -Dsurefire.failIfNoSpecifiedTests=false -DargLine="-Xmx768m -XX:MaxMetaspaceSize=256m -XX:+UseSerialGC"`
Expected: toàn bộ PASS (`ProductAvailabilityResolverTest`: `Tests run: 13`), `BUILD SUCCESS`.

- [ ] **Step 5: Format và commit**

```bash
docker compose exec -T -e MAVEN_OPTS=-Xmx256m backend ./mvnw -B -q spotless:apply
git add backend/src/main/java/com/techx/intervue/modules/product/services/impl/ProductAvailabilityResolver.java \
  backend/src/test/java/com/techx/intervue/modules/product/services/impl/ProductAvailabilityResolverTest.java
git commit -m "feat(FR-124): availability carries a day's deal and lists orderable days"
```

---

### Task 4: Farmer đăng và bỏ giảm giá (FR-124)

**Files:**
- Create: `backend/src/main/java/com/techx/intervue/modules/product/exceptions/NotNearExpiryException.java`, `ExpiredBeforePickupException.java`, `DateNotOrderableException.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/product/requests/DealRequest.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/product/resources/FarmerDealResource.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/product/repositories/DealQueryRepository.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/product/services/interfaces/FarmerDealServiceInterface.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/product/services/impl/FarmerDealService.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/product/services/impl/FarmerDealServiceTest.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/product/repositories/FarmerDealsQueryTest.java`

**Interfaces:**
- Consumes: Task 1 (`startDeal`, `endDeal`, `basePrice`, `DailyStockResource.of`), Task 2 (`DealPolicy`), Task 3 (`ProductAvailabilityResolver.upcoming`, `Availability.deal()`, `LOOKAHEAD_DAYS`); có sẵn: `ProductDailyStockRepository.materialize/lockByProductIdAndStockDate`, `SlotQueryRepository.orderableDates(Collection<Long>, LocalDate, LocalDate, LocalDateTime)`, `RestockNotifier`, `InvalidFieldException`, `StallNotApprovedException`, `ProductNotFoundException`, `ProductNotYoursException`.
- Produces: `DealRequest(Integer quantityAvailable, LocalDate packedOn, Integer discountPercent)`; `FarmerDealResource(Long productId, String productName, String unit, String stockDate, int quantityAvailable, BigDecimal listPrice, BigDecimal unitPrice, int discountPercent, String packedOn, String bestBefore, int daysLeft)`; `DealQueryRepository.farmerDeals(long farmerId, LocalDate fromDate)`; `FarmerDealServiceInterface` với `DailyStockResource post(long userId, long productId, LocalDate date, DealRequest request)`, `void remove(long userId, long productId, LocalDate date)`, `List<FarmerDealResource> mine(long userId)`, `List<DailyStockResource> upcomingDays(long userId, long productId)`; 3 exception (Task 5 map sang HTTP).

- [ ] **Step 1: Viết test của service (Mockito)**

`backend/src/test/java/com/techx/intervue/modules/product/services/impl/FarmerDealServiceTest.java`:

```java
package com.techx.intervue.modules.product.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.favorite.services.impl.RestockNotifier;
import com.techx.intervue.modules.product.entities.Product;
import com.techx.intervue.modules.product.entities.ProductDailyStock;
import com.techx.intervue.modules.product.exceptions.DateNotOrderableException;
import com.techx.intervue.modules.product.exceptions.ExpiredBeforePickupException;
import com.techx.intervue.modules.product.exceptions.NotNearExpiryException;
import com.techx.intervue.modules.product.exceptions.ProductNotYoursException;
import com.techx.intervue.modules.product.repositories.DealQueryRepository;
import com.techx.intervue.modules.product.repositories.ProductDailyStockRepository;
import com.techx.intervue.modules.product.repositories.ProductRepository;
import com.techx.intervue.modules.product.requests.DealRequest;
import com.techx.intervue.modules.product.resources.DailyStockResource;
import com.techx.intervue.modules.product.resources.FarmerDealResource;
import com.techx.intervue.modules.stall.exceptions.StallNotApprovedException;
import com.techx.intervue.modules.stall.repositories.SlotQueryRepository;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/**
 * FR-124 (spec §4.5.1, §4.5.3, §8). Today (by Clock) is Wednesday 30/09/2026, 10:00 Vietnam time;
 * the pickup day is Saturday 03/10; the product keeps 7 days and sells at $0.60.
 */
class FarmerDealServiceTest {

    private static final ZoneId HCM = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final LocalDate TODAY = LocalDate.of(2026, 9, 30);
    private static final LocalDate PICKUP = LocalDate.of(2026, 10, 3);
    private static final LocalDate HARVESTED = LocalDate.of(2026, 9, 29);
    private static final long USER_ID = 1L;
    private static final long FARMER_ID = 10L;
    private static final long PRODUCT_ID = 100L;

    private ProductDailyStockRepository dailyStock;
    private ProductRepository products;
    private FarmerProfileRepository farmers;
    private SlotQueryRepository slots;
    private ProductAvailabilityResolver availability;
    private DealQueryRepository deals;
    private FarmerDealService service;
    private ProductDailyStock row;

    @BeforeEach
    void setUp() {
        dailyStock = mock(ProductDailyStockRepository.class);
        products = mock(ProductRepository.class);
        farmers = mock(FarmerProfileRepository.class);
        slots = mock(SlotQueryRepository.class);
        availability = mock(ProductAvailabilityResolver.class);
        deals = mock(DealQueryRepository.class);
        Clock clock =
                Clock.fixed(ZonedDateTime.of(TODAY, LocalTime.of(10, 0), HCM).toInstant(), HCM);
        service =
                new FarmerDealService(
                        dailyStock,
                        products,
                        farmers,
                        slots,
                        availability,
                        deals,
                        mock(RestockNotifier.class),
                        clock);

        when(farmers.findByUserId(USER_ID))
                .thenReturn(Optional.of(stall(ApprovalStatus.APPROVED)));
        when(products.findByIdAndDeletedFalse(PRODUCT_ID))
                .thenReturn(Optional.of(product(FARMER_ID, 7)));
        when(slots.orderableDates(anyCollection(), any(), any(), any()))
                .thenReturn(Map.of(FARMER_ID, Set.of(PICKUP)));
        row = new ProductDailyStock();
        row.setId(500L);
        row.setProductId(PRODUCT_ID);
        row.setStockDate(PICKUP);
        row.setQuantityAvailable(30);
        row.setUnitPrice(new BigDecimal("0.60"));
        when(dailyStock.lockByProductIdAndStockDate(PRODUCT_ID, PICKUP))
                .thenReturn(Optional.of(row));
        when(dailyStock.save(any())).thenAnswer(i -> i.getArgument(0));
    }

    private static FarmerProfile stall(ApprovalStatus status) {
        return FarmerProfile.builder().id(FARMER_ID).userId(USER_ID).approvalStatus(status).build();
    }

    private static Product product(long farmerId, int shelfLifeDays) {
        Product p = new Product();
        p.setId(PRODUCT_ID);
        p.setFarmerId(farmerId);
        p.setPrice(new BigDecimal("0.60"));
        p.setShelfLifeDays(shelfLifeDays);
        return p;
    }

    /** Spec §4.5.2 example: harvested 29/09, picked up Sat 03/10 → good until 05/10, 3 days. */
    private static DealRequest request(int percent) {
        return new DealRequest(12, HARVESTED, percent);
    }

    @Test
    void postPutsTheLockedDayOnTheDeal() {
        DailyStockResource result = service.post(USER_ID, PRODUCT_ID, PICKUP, request(20));

        assertThat(result.quantityAvailable()).isEqualTo(12);
        assertThat(result.listPrice()).isEqualByComparingTo("0.60");
        assertThat(result.unitPrice()).isEqualByComparingTo("0.48");
        assertThat(result.discountPercent()).isEqualTo(20);
        assertThat(result.packedOn()).isEqualTo(HARVESTED);
        assertThat(result.bestBefore()).isEqualTo(LocalDate.of(2026, 10, 5));
        // Created when missing, then locked by its natural key, like placing an order (spec §8)
        verify(dailyStock).materialize(PRODUCT_ID, PICKUP, 6);
        verify(dailyStock).lockByProductIdAndStockDate(PRODUCT_ID, PICKUP);
        verify(dailyStock, never()).findByProductIdAndStockDate(any(), any());
    }

    @Test
    void postingAgainTakesTheNewDiscountOffTheNormalPrice() {
        service.post(USER_ID, PRODUCT_ID, PICKUP, request(20));

        DailyStockResource again = service.post(USER_ID, PRODUCT_ID, PICKUP, request(40));

        assertThat(again.listPrice()).isEqualByComparingTo("0.60");
        assertThat(again.unitPrice()).isEqualByComparingTo("0.36");
    }

    /** D-09, spec §8: a suspended stall cannot post a deal. */
    @Test
    void postRefusesAStallThatIsNotApproved() {
        when(farmers.findByUserId(USER_ID))
                .thenReturn(Optional.of(stall(ApprovalStatus.SUSPENDED)));

        assertThatThrownBy(() -> service.post(USER_ID, PRODUCT_ID, PICKUP, request(20)))
                .isInstanceOf(StallNotApprovedException.class);
        verify(dailyStock, never()).lockByProductIdAndStockDate(any(), any());
    }

    /** R-06: another stall's product → 403, even though the id is real. */
    @Test
    void postRefusesAnotherStallsProduct() {
        when(products.findByIdAndDeletedFalse(PRODUCT_ID))
                .thenReturn(Optional.of(product(99L, 7)));

        assertThatThrownBy(() -> service.post(USER_ID, PRODUCT_ID, PICKUP, request(20)))
                .isInstanceOf(ProductNotYoursException.class);
    }

    @ParameterizedTest
    @ValueSource(ints = {0, 4, 33, 75})
    void postRefusesADiscountOutsideTheSteps(int percent) {
        assertThatThrownBy(() -> service.post(USER_ID, PRODUCT_ID, PICKUP, request(percent)))
                .isInstanceOfSatisfying(
                        InvalidFieldException.class,
                        e -> assertThat(e.getField()).isEqualTo("discountPercent"));
    }

    @Test
    void postRefusesAPackingDateAfterToday() {
        assertThatThrownBy(
                        () ->
                                service.post(
                                        USER_ID,
                                        PRODUCT_ID,
                                        PICKUP,
                                        new DealRequest(12, TODAY.plusDays(1), 20)))
                .isInstanceOfSatisfying(
                        InvalidFieldException.class,
                        e -> assertThat(e.getField()).isEqualTo("packedOn"));
    }

    /** Packed today for pickup tomorrow: 6 of 7 days are still left, so it is not near expiry. */
    @Test
    void postRefusesProduceWithMoreThanHalfItsShelfLifeLeft() {
        assertThatThrownBy(
                        () ->
                                service.post(
                                        USER_ID,
                                        PRODUCT_ID,
                                        TODAY.plusDays(1),
                                        new DealRequest(12, TODAY, 20)))
                .isInstanceOf(NotNearExpiryException.class);
    }

    /** Picked on the pickup day itself is fresh produce. */
    @Test
    void postRefusesProducePickedOnThePickupDay() {
        assertThatThrownBy(
                        () ->
                                service.post(
                                        USER_ID, PRODUCT_ID, TODAY, new DealRequest(12, TODAY, 20)))
                .isInstanceOf(NotNearExpiryException.class);
    }

    /** Packed 20/09 with 7 days: good until 26/09, before the pickup day. */
    @Test
    void postRefusesABatchThatIsGoneBeforePickup() {
        assertThatThrownBy(
                        () ->
                                service.post(
                                        USER_ID,
                                        PRODUCT_ID,
                                        PICKUP,
                                        new DealRequest(12, LocalDate.of(2026, 9, 20), 20)))
                .isInstanceOf(ExpiredBeforePickupException.class);
    }

    /** No free slot before the cutoff that day (or the market or the stall is closed). */
    @Test
    void postRefusesADayCustomersCanNoLongerOrder() {
        when(slots.orderableDates(anyCollection(), any(), any(), any())).thenReturn(Map.of());

        assertThatThrownBy(() -> service.post(USER_ID, PRODUCT_ID, PICKUP, request(20)))
                .isInstanceOf(DateNotOrderableException.class);
        verify(dailyStock, never()).materialize(any(), any(), anyInt());
    }

    /** Beyond the 14-day window the public pages show, even when a slot exists. */
    @Test
    void postRefusesADayBeyondTheFourteenDayWindow() {
        when(products.findByIdAndDeletedFalse(PRODUCT_ID))
                .thenReturn(Optional.of(product(FARMER_ID, 30)));
        LocalDate far = TODAY.plusDays(14);
        when(slots.orderableDates(anyCollection(), any(), any(), any()))
                .thenReturn(Map.of(FARMER_ID, Set.of(far)));

        // 30 days, packed 29/09: good until 28/10, 15 of 30 days left on 14/10 — near expiry
        assertThatThrownBy(() -> service.post(USER_ID, PRODUCT_ID, far, request(20)))
                .isInstanceOf(DateNotOrderableException.class);
    }

    /** No weekly template for that weekday: the product is not sold that day. */
    @Test
    void postRefusesADayWithoutAWeeklyTemplate() {
        when(dailyStock.lockByProductIdAndStockDate(PRODUCT_ID, PICKUP))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.post(USER_ID, PRODUCT_ID, PICKUP, request(20)))
                .isInstanceOf(DateNotOrderableException.class);
    }

    @Test
    void removeRestoresTheNormalPriceAndKeepsTheQuantity() {
        row.startDeal(new BigDecimal("0.48"), 20, HARVESTED, LocalDate.of(2026, 10, 5));
        row.setQuantityAvailable(12);

        service.remove(USER_ID, PRODUCT_ID, PICKUP);

        assertThat(row.hasDeal()).isFalse();
        assertThat(row.getUnitPrice()).isEqualByComparingTo("0.60");
        assertThat(row.getQuantityAvailable()).isEqualTo(12);
        verify(dailyStock).save(row);
    }

    @Test
    void removeOnADayWithoutADealChangesNothing() {
        service.remove(USER_ID, PRODUCT_ID, PICKUP);

        verify(dailyStock, never()).save(any());
    }

    @Test
    void removeRefusesAnotherStallsProduct() {
        when(products.findByIdAndDeletedFalse(PRODUCT_ID))
                .thenReturn(Optional.of(product(99L, 7)));

        assertThatThrownBy(() -> service.remove(USER_ID, PRODUCT_ID, PICKUP))
                .isInstanceOf(ProductNotYoursException.class);
        verify(dailyStock, never()).lockByProductIdAndStockDate(any(), any());
    }

    /** Read-only: a suspended stall still sees its deals (D-09 blocks writes only). */
    @Test
    void mineListsTheStallsDealsFromToday() {
        when(farmers.findByUserId(USER_ID))
                .thenReturn(Optional.of(stall(ApprovalStatus.SUSPENDED)));
        List<FarmerDealResource> rows =
                List.of(
                        new FarmerDealResource(
                                PRODUCT_ID,
                                "Cà chua bi",
                                "kg",
                                "2026-10-03",
                                12,
                                new BigDecimal("0.60"),
                                new BigDecimal("0.48"),
                                20,
                                "2026-09-29",
                                "2026-10-05",
                                3));
        when(deals.farmerDeals(FARMER_ID, TODAY)).thenReturn(rows);

        assertThat(service.mine(USER_ID)).isEqualTo(rows);
    }

    @Test
    void upcomingDaysGivesEachOrderableDayWithItsDeal() {
        when(availability.upcoming(any()))
                .thenReturn(
                        List.of(
                                new ProductAvailabilityResolver.Availability(
                                        PICKUP,
                                        12,
                                        new BigDecimal("0.48"),
                                        new ProductAvailabilityResolver.Deal(
                                                new BigDecimal("0.60"),
                                                20,
                                                HARVESTED,
                                                LocalDate.of(2026, 10, 5))),
                                new ProductAvailabilityResolver.Availability(
                                        PICKUP.plusDays(1), 20, new BigDecimal("0.60"))));

        List<DailyStockResource> days = service.upcomingDays(USER_ID, PRODUCT_ID);

        assertThat(days)
                .extracting(DailyStockResource::stockDate)
                .containsExactly(PICKUP, PICKUP.plusDays(1));
        assertThat(days.getFirst().discountPercent()).isEqualTo(20);
        assertThat(days.getFirst().listPrice()).isEqualByComparingTo("0.60");
        assertThat(days.get(1).listPrice()).isNull();
        assertThat(days.get(1).quantityAvailable()).isEqualTo(20);
    }

    @Test
    void upcomingDaysRefusesAnotherStallsProduct() {
        when(products.findByIdAndDeletedFalse(PRODUCT_ID))
                .thenReturn(Optional.of(product(99L, 7)));

        assertThatThrownBy(() -> service.upcomingDays(USER_ID, PRODUCT_ID))
                .isInstanceOf(ProductNotYoursException.class);
    }
}
```

- [ ] **Step 2: Viết test SQL của danh sách giảm giá của sạp (MySQL)**

`backend/src/test/java/com/techx/intervue/modules/product/repositories/FarmerDealsQueryTest.java`:

```java
package com.techx.intervue.modules.product.repositories;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.product.resources.FarmerDealResource;
import com.techx.intervue.modules.report.services.impl.ReportFixture;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

/** FR-124 on real MySQL: the "On sale" block lists this stall's deal days from today on. */
@SpringBootTest
@Transactional
class FarmerDealsQueryTest {

    private static final LocalDate TODAY = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));

    @Autowired private DealQueryRepository deals;
    @Autowired private JdbcTemplate jdbc;

    private ReportFixture fx;

    @BeforeEach
    void setUp() {
        // Rows are rolled back with the test transaction; no clean-up needed
        fx = new ReportFixture(jdbc);
    }

    @Test
    void listsOnlyThisStallsDealDaysFromTodayByDayThenName() {
        long category = fx.category();
        long stall = fx.farmer(fx.user("farmer", "Deal seller", "x"), "Deal stall", "approved");
        long other = fx.farmer(fx.user("farmer", "Other seller", "x"), "Other stall", "approved");
        long tomato = fx.product(stall, category, "Tomato", 2);
        long eggs = fx.product(stall, category, "Eggs", 3);
        long gone = fx.product(stall, category, "Gone", 1);
        long theirs = fx.product(other, category, "Theirs", 1);
        jdbc.update("UPDATE products SET is_deleted = TRUE WHERE id = ?", gone);
        deal(eggs, TODAY.plusDays(3), 40);
        deal(tomato, TODAY.plusDays(3), 20);
        deal(tomato, TODAY.plusDays(2), 20);
        deal(tomato, TODAY.minusDays(1), 20);
        deal(gone, TODAY.plusDays(2), 20);
        deal(theirs, TODAY.plusDays(2), 20);
        jdbc.update(
                "INSERT INTO product_daily_stock (product_id, stock_date, quantity_available,"
                        + " unit_price) VALUES (?, ?, 30, 3)",
                eggs,
                TODAY.plusDays(2));

        List<FarmerDealResource> rows = deals.farmerDeals(stall, TODAY);

        assertThat(rows)
                .extracting(r -> r.productName().split(" ")[0] + "@" + r.stockDate())
                .containsExactly(
                        "Tomato@" + TODAY.plusDays(2),
                        "Eggs@" + TODAY.plusDays(3),
                        "Tomato@" + TODAY.plusDays(3));
        FarmerDealResource first = rows.getFirst();
        assertThat(first.unit()).isEqualTo("kg");
        assertThat(first.listPrice()).isEqualByComparingTo("2.00");
        assertThat(first.unitPrice()).isEqualByComparingTo("1.60");
        assertThat(first.discountPercent()).isEqualTo(20);
        assertThat(first.quantityAvailable()).isEqualTo(5);
        assertThat(first.packedOn()).isEqualTo(TODAY.minusDays(3).toString());
        assertThat(first.bestBefore()).isEqualTo(TODAY.plusDays(3).toString());
        assertThat(first.daysLeft()).isEqualTo(2);
    }

    /** A deal day: 5 left, packed 3 days ago, good until the day after pickup. */
    private void deal(long productId, LocalDate day, int percent) {
        BigDecimal list =
                jdbc.queryForObject(
                        "SELECT price FROM products WHERE id = ?", BigDecimal.class, productId);
        BigDecimal price =
                list.multiply(BigDecimal.valueOf(100 - percent))
                        .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        jdbc.update(
                "INSERT INTO product_daily_stock (product_id, stock_date, quantity_available,"
                        + " unit_price, list_price, discount_percent, packed_on, best_before)"
                        + " VALUES (?, ?, 5, ?, ?, ?, ?, ?)",
                productId,
                day,
                price,
                list,
                percent,
                TODAY.minusDays(3),
                day.plusDays(1));
    }
}
```

- [ ] **Step 3: Chạy 2 test để thấy fail**

Run: `docker compose exec -T -e MAVEN_OPTS=-Xmx256m backend ./mvnw -B test -Dtest='FarmerDealServiceTest,FarmerDealsQueryTest' -Dsurefire.failIfNoSpecifiedTests=false -DargLine="-Xmx768m -XX:MaxMetaspaceSize=256m -XX:+UseSerialGC"`
Expected: FAIL lúc biên dịch — `cannot find symbol: class FarmerDealService`, `class DealQueryRepository`, `class DealRequest`…

- [ ] **Step 4: Viết 3 exception**

`product/exceptions/NotNearExpiryException.java`:

```java
package com.techx.intervue.modules.product.exceptions;

/**
 * FR-124 (spec §4.5.1): the batch is fresh on that pickup day — picked on the day itself, or more
 * than half of its shelf life is left — so it cannot go on a near-expiry deal → 400.
 */
public class NotNearExpiryException extends RuntimeException {
    public NotNearExpiryException(String message) {
        super(message);
    }
}
```

`product/exceptions/ExpiredBeforePickupException.java`:

```java
package com.techx.intervue.modules.product.exceptions;

/** FR-124: the batch's last good day is before the pickup day → 400. */
public class ExpiredBeforePickupException extends RuntimeException {
    public ExpiredBeforePickupException() {
        super("This batch is no longer good on that pickup day.");
    }
}
```

`product/exceptions/DateNotOrderableException.java`:

```java
package com.techx.intervue.modules.product.exceptions;

/**
 * FR-124: customers can no longer order for that pickup day — no free slot before its cutoff, the
 * market or the stall is closed, no weekly template for that weekday, or beyond the 14-day window
 * → 409.
 */
public class DateNotOrderableException extends RuntimeException {
    public DateNotOrderableException() {
        super("Customers can no longer order for that pickup day.");
    }
}
```

- [ ] **Step 5: Viết request và resource**

`product/requests/DealRequest.java`:

```java
package com.techx.intervue.modules.product.requests;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

/**
 * Body of PUT /api/v1/farmer/products/{id}/daily-stock/{date}/deal (FR-124): how much the stall
 * brings for that day, when that batch was harvested or packed, and the discount. The discount
 * steps and the batch rules are checked by DealPolicy in the service, so each error names its
 * field.
 */
public record DealRequest(
        @NotNull(message = "Enter how much you bring.")
                @Min(value = 1, message = "Bring at least 1.")
                Integer quantityAvailable,
        @NotNull(message = "Enter the harvest or packing date.") LocalDate packedOn,
        @NotNull(message = "Choose a discount.") Integer discountPercent) {}
```

`product/resources/FarmerDealResource.java`:

```java
package com.techx.intervue.modules.product.resources;

import java.math.BigDecimal;

/**
 * One deal day of the Farmer's own stall (GET /api/v1/farmer/deals, FR-124). Dates are
 * "yyyy-MM-dd"; {@code daysLeft} counts the pickup day itself.
 */
public record FarmerDealResource(
        Long productId,
        String productName,
        String unit,
        String stockDate,
        int quantityAvailable,
        BigDecimal listPrice,
        BigDecimal unitPrice,
        int discountPercent,
        String packedOn,
        String bestBefore,
        int daysLeft) {}
```

- [ ] **Step 6: Viết `DealQueryRepository` (phần của Farmer)**

`product/repositories/DealQueryRepository.java`:

```java
package com.techx.intervue.modules.product.repositories;

import com.techx.intervue.modules.product.resources.FarmerDealResource;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Reads of near-expiry deals (FR-124, FR-125). JdbcTemplate because they join the stock row with
 * its product and stall; every value goes through parameters (R-04).
 */
@Repository
@RequiredArgsConstructor
public class DealQueryRepository {

    /** The stall's deal days from {@code fromDate} on, for its "On sale" block. */
    public static final String FARMER_DEALS_SQL =
            """
            SELECT d.product_id, p.name, p.unit, d.stock_date, d.quantity_available, d.list_price,
                   d.unit_price, d.discount_percent, d.packed_on, d.best_before,
                   DATEDIFF(d.best_before, d.stock_date) + 1 AS days_left
            FROM product_daily_stock d
            JOIN products p ON p.id = d.product_id
            WHERE p.farmer_id = :farmerId
              AND p.is_deleted = FALSE
              AND d.discount_percent IS NOT NULL
              AND d.stock_date >= :fromDate
            ORDER BY d.stock_date, p.name, d.product_id
            """;

    private final NamedParameterJdbcTemplate jdbc;

    public List<FarmerDealResource> farmerDeals(long farmerId, LocalDate fromDate) {
        MapSqlParameterSource params =
                new MapSqlParameterSource()
                        .addValue("farmerId", farmerId)
                        .addValue("fromDate", fromDate);
        return jdbc.query(
                FARMER_DEALS_SQL,
                params,
                (rs, i) ->
                        new FarmerDealResource(
                                rs.getLong("product_id"),
                                rs.getString("name"),
                                rs.getString("unit"),
                                rs.getObject("stock_date", LocalDate.class).toString(),
                                rs.getInt("quantity_available"),
                                rs.getBigDecimal("list_price"),
                                rs.getBigDecimal("unit_price"),
                                rs.getInt("discount_percent"),
                                rs.getObject("packed_on", LocalDate.class).toString(),
                                rs.getObject("best_before", LocalDate.class).toString(),
                                rs.getInt("days_left")));
    }
}
```

- [ ] **Step 7: Viết interface và service**

`product/services/interfaces/FarmerDealServiceInterface.java`:

```java
package com.techx.intervue.modules.product.services.interfaces;

import com.techx.intervue.modules.product.requests.DealRequest;
import com.techx.intervue.modules.product.resources.DailyStockResource;
import com.techx.intervue.modules.product.resources.FarmerDealResource;
import java.time.LocalDate;
import java.util.List;

/** FR-124 — near-expiry deals of the Farmer's own products (spec §4.5.3). */
public interface FarmerDealServiceInterface {

    /** PUT …/daily-stock/{date}/deal: posts or changes that day's deal, returns the day's row. */
    DailyStockResource post(long userId, long productId, LocalDate date, DealRequest request);

    /** DELETE …/daily-stock/{date}/deal: back to the normal price; no deal → nothing changes. */
    void remove(long userId, long productId, LocalDate date);

    /** GET /farmer/deals: the stall's deal days from today on. */
    List<FarmerDealResource> mine(long userId);

    /** GET /farmer/products/{id}/daily-stock: the days the deal dialog can offer. */
    List<DailyStockResource> upcomingDays(long userId, long productId);
}
```

`product/services/impl/FarmerDealService.java`:

```java
package com.techx.intervue.modules.product.services.impl;

import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.farmer.exceptions.FarmerProfileNotFoundException;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.favorite.services.impl.RestockNotifier;
import com.techx.intervue.modules.product.entities.Product;
import com.techx.intervue.modules.product.entities.ProductDailyStock;
import com.techx.intervue.modules.product.exceptions.DateNotOrderableException;
import com.techx.intervue.modules.product.exceptions.ExpiredBeforePickupException;
import com.techx.intervue.modules.product.exceptions.NotNearExpiryException;
import com.techx.intervue.modules.product.exceptions.ProductNotFoundException;
import com.techx.intervue.modules.product.exceptions.ProductNotYoursException;
import com.techx.intervue.modules.product.repositories.DealQueryRepository;
import com.techx.intervue.modules.product.repositories.ProductDailyStockRepository;
import com.techx.intervue.modules.product.repositories.ProductRepository;
import com.techx.intervue.modules.product.requests.DealRequest;
import com.techx.intervue.modules.product.resources.DailyStockResource;
import com.techx.intervue.modules.product.resources.FarmerDealResource;
import com.techx.intervue.modules.product.services.interfaces.FarmerDealServiceInterface;
import com.techx.intervue.modules.stall.exceptions.StallNotApprovedException;
import com.techx.intervue.modules.stall.repositories.SlotQueryRepository;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * FR-124 (spec §4.5.3) — a Farmer puts one pickup day of their own product on a near-expiry deal.
 * The day's row is created when missing and locked by its natural key, the same lock placing an
 * order takes, so a deal and an order for that day never interleave (spec §8). Orders already
 * placed keep the price they copied.
 */
@Service
@AllArgsConstructor
public class FarmerDealService implements FarmerDealServiceInterface {

    private final ProductDailyStockRepository dailyStock;
    private final ProductRepository products;
    private final FarmerProfileRepository farmers;
    private final SlotQueryRepository slots;
    private final ProductAvailabilityResolver availability;
    private final DealQueryRepository deals;
    private final RestockNotifier restock;
    private final Clock clock;

    /** Checks run cheapest first: 403/404, then the request (400), then the day itself (409). */
    @Override
    @Transactional
    public DailyStockResource post(
            long userId, long productId, LocalDate date, DealRequest request) {
        FarmerProfile profile = profileOf(userId);
        requireApproved(profile);
        Product product = owned(profile, productId);

        int percent = request.discountPercent();
        if (!DealPolicy.validPercent(percent)) {
            throw new InvalidFieldException(
                    "discountPercent", "Choose a discount from 5% to 70%, in steps of 5.");
        }
        LocalDate today = LocalDate.now(clock);
        DealPolicy.Check check =
                DealPolicy.check(product.getShelfLifeDays(), request.packedOn(), date, today);
        if (check.problem() != null) {
            throw switch (check.problem()) {
                case PACKED_IN_FUTURE ->
                        new InvalidFieldException(
                                "packedOn", "The harvest or packing date cannot be after today.");
                case FRESH ->
                        new NotNearExpiryException(
                                "Produce picked on the pickup day is fresh. Deals are for batches"
                                        + " past half their shelf life.");
                case NOT_NEAR_EXPIRY ->
                        new NotNearExpiryException(
                                "More than half of the shelf life is left on that pickup day.");
                case EXPIRED_BEFORE_PICKUP -> new ExpiredBeforePickupException();
            };
        }
        requireOrderable(profile.getId(), date, today);

        dailyStock.materialize(productId, date, date.getDayOfWeek().getValue() % 7);
        // Nothing to lock: no active template covers that weekday, the product is not sold then
        ProductDailyStock row =
                dailyStock
                        .lockByProductIdAndStockDate(productId, date)
                        .orElseThrow(DateNotOrderableException::new);

        boolean wasOrderable = restock.isOrderable(product);
        row.startDeal(
                DealPolicy.dealPrice(row.basePrice(), percent),
                percent,
                request.packedOn(),
                check.bestBefore());
        row.setQuantityAvailable(request.quantityAvailable());
        ProductDailyStock saved = dailyStock.save(row);
        // FR-041: bringing stock for a sold-out day can make the product orderable again
        restock.afterChange(product, wasOrderable, restock.isOrderable(product));
        return DailyStockResource.of(saved);
    }

    @Override
    @Transactional
    public void remove(long userId, long productId, LocalDate date) {
        FarmerProfile profile = profileOf(userId);
        requireApproved(profile);
        owned(profile, productId);
        dailyStock
                .lockByProductIdAndStockDate(productId, date)
                .filter(ProductDailyStock::hasDeal)
                .ifPresent(
                        row -> {
                            row.endDeal();
                            dailyStock.save(row);
                        });
    }

    /** Read-only: a suspended stall still sees its deals (D-09 blocks writes only). */
    @Override
    public List<FarmerDealResource> mine(long userId) {
        return deals.farmerDeals(profileOf(userId).getId(), LocalDate.now(clock));
    }

    @Override
    public List<DailyStockResource> upcomingDays(long userId, long productId) {
        Product product = owned(profileOf(userId), productId);
        return availability.upcoming(product).stream()
                .map(a -> toResource(productId, a))
                .toList();
    }

    /**
     * The same "can still be ordered" rule the public pages use (ProductAvailabilityResolver): a
     * free slot before its cutoff on a day the market and the stall both open, inside the 14-day
     * lookahead.
     */
    private void requireOrderable(long farmerId, LocalDate date, LocalDate today) {
        boolean inWindow =
                !date.isBefore(today)
                        && date.isBefore(today.plusDays(ProductAvailabilityResolver.LOOKAHEAD_DAYS));
        boolean open =
                inWindow
                        && slots.orderableDates(
                                        Set.of(farmerId), date, date, LocalDateTime.now(clock))
                                .getOrDefault(farmerId, Set.of())
                                .contains(date);
        if (!open) {
            throw new DateNotOrderableException();
        }
    }

    private static DailyStockResource toResource(
            long productId, ProductAvailabilityResolver.Availability a) {
        ProductAvailabilityResolver.Deal deal = a.deal();
        return new DailyStockResource(
                productId,
                a.date(),
                a.quantity(),
                a.price(),
                deal == null ? null : deal.listPrice(),
                deal == null ? null : deal.discountPercent(),
                deal == null ? null : deal.packedOn(),
                deal == null ? null : deal.bestBefore());
    }

    /** R-06: the profile always comes from the token's user, never from the request. */
    private FarmerProfile profileOf(long userId) {
        return farmers.findByUserId(userId).orElseThrow(FarmerProfileNotFoundException::new);
    }

    private static void requireApproved(FarmerProfile profile) {
        if (profile.getApprovalStatus() != ApprovalStatus.APPROVED) {
            throw new StallNotApprovedException();
        }
    }

    /** Missing or deleted → 404; another stall's product → 403 (R-06). */
    private Product owned(FarmerProfile profile, long productId) {
        Product product =
                products.findByIdAndDeletedFalse(productId)
                        .orElseThrow(() -> new ProductNotFoundException(productId));
        if (!product.getFarmerId().equals(profile.getId())) {
            throw new ProductNotYoursException();
        }
        return product;
    }
}
```

- [ ] **Step 8: Chạy lại test**

Run: `docker compose exec -T -e MAVEN_OPTS=-Xmx256m backend ./mvnw -B test -Dtest='FarmerDealServiceTest,FarmerDealsQueryTest' -Dsurefire.failIfNoSpecifiedTests=false -DargLine="-Xmx768m -XX:MaxMetaspaceSize=256m -XX:+UseSerialGC"`
Expected: `Tests run: 22, Failures: 0, Errors: 0` (21 + 1), `BUILD SUCCESS`.

- [ ] **Step 9: Format và commit**

```bash
docker compose exec -T -e MAVEN_OPTS=-Xmx256m backend ./mvnw -B -q spotless:apply
git add backend/src/main/java/com/techx/intervue/modules/product/exceptions \
  backend/src/main/java/com/techx/intervue/modules/product/requests/DealRequest.java \
  backend/src/main/java/com/techx/intervue/modules/product/resources/FarmerDealResource.java \
  backend/src/main/java/com/techx/intervue/modules/product/repositories/DealQueryRepository.java \
  backend/src/main/java/com/techx/intervue/modules/product/services/interfaces/FarmerDealServiceInterface.java \
  backend/src/main/java/com/techx/intervue/modules/product/services/impl/FarmerDealService.java \
  backend/src/test/java/com/techx/intervue/modules/product/services/impl/FarmerDealServiceTest.java \
  backend/src/test/java/com/techx/intervue/modules/product/repositories/FarmerDealsQueryTest.java
git commit -m "feat(FR-124): farmers post and remove near-expiry deals"
```

---

### Task 5: Endpoint giảm giá của Farmer và mã lỗi (FR-124)

**Files:**
- Create: `backend/src/main/java/com/techx/intervue/modules/product/controllers/FarmerDealController.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/product/controllers/ProductExceptionHandler.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/product/controllers/DealHttpMappingTest.java`

**Interfaces:**
- Consumes: Task 4 (`FarmerDealServiceInterface`, 3 exception, `DealRequest`, `FarmerDealResource`), Task 1 (`DailyStockResource`).
- Produces: `GET /api/v1/farmer/deals`, `GET /api/v1/farmer/products/{id}/daily-stock`, `PUT /api/v1/farmer/products/{id}/daily-stock/{date}/deal`, `DELETE` cùng path (role FARMER). Mã lỗi: 400 `NOT_NEAR_EXPIRY`, 400 `EXPIRED_BEFORE_PICKUP`, 409 `DATE_NOT_ORDERABLE`, 400 `VALIDATION_ERROR` cho giá trị sai kiểu (`{date}` không phải `yyyy-MM-dd`). Handler method tên `notNearExpiry`, `expiredBeforePickup`, `dateNotOrderable`, `wrongType` (Task 7 thêm `DealController` vào cùng handler).

- [ ] **Step 1: Viết test**

`backend/src/test/java/com/techx/intervue/modules/product/controllers/DealHttpMappingTest.java`:

```java
package com.techx.intervue.modules.product.controllers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import com.techx.intervue.modules.product.exceptions.DateNotOrderableException;
import com.techx.intervue.modules.product.exceptions.ExpiredBeforePickupException;
import com.techx.intervue.modules.product.exceptions.NotNearExpiryException;
import com.techx.intervue.resources.ApiResource;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/** FR-124: the deal errors keep the envelope and the codes of spec §4.5.3. */
class DealHttpMappingTest {

    private final ProductExceptionHandler handler = new ProductExceptionHandler();

    private static void assertError(ResponseEntity<ApiResource<Void>> r, int status, String code) {
        assertThat(r.getStatusCode().value()).isEqualTo(status);
        assertThat(r.getBody()).isNotNull();
        assertThat(r.getBody().getError().getCode()).isEqualTo(code);
    }

    @Test
    void theBatchRulesAre400() {
        assertError(handler.notNearExpiry(new NotNearExpiryException("fresh")), 400, "NOT_NEAR_EXPIRY");
        assertError(
                handler.expiredBeforePickup(new ExpiredBeforePickupException()),
                400,
                "EXPIRED_BEFORE_PICKUP");
    }

    /** A day that no longer takes orders conflicts with the current state → 409, like a full slot. */
    @Test
    void aDayCustomersCanNoLongerOrderIs409() {
        assertError(
                handler.dateNotOrderable(new DateNotOrderableException()), 409, "DATE_NOT_ORDERABLE");
    }

    /** "2026-13-40" as {date}: the envelope with 400, not Spring's default error body. */
    @Test
    void aValueOfTheWrongTypeIs400() {
        assertError(
                handler.wrongType(mock(MethodArgumentTypeMismatchException.class)),
                400,
                "VALIDATION_ERROR");
    }

    /**
     * The module's handler must cover the new controller, or its errors escape as 500 (the bug
     * ConversationExceptionHandlerScopeTest pins for another module).
     */
    @Test
    void theFarmerDealControllerIsCoveredAndIsForFarmersOnly() {
        List<Class<?>> covered =
                Arrays.asList(
                        ProductExceptionHandler.class
                                .getAnnotation(RestControllerAdvice.class)
                                .assignableTypes());

        assertThat(covered).contains(FarmerProductController.class, FarmerDealController.class);
        assertThat(FarmerDealController.class.getAnnotation(PreAuthorize.class).value())
                .isEqualTo("hasRole('FARMER')");
    }
}
```

- [ ] **Step 2: Chạy test để thấy fail**

Run: `docker compose exec -T -e MAVEN_OPTS=-Xmx256m backend ./mvnw -B test -Dtest='DealHttpMappingTest' -Dsurefire.failIfNoSpecifiedTests=false -DargLine="-Xmx768m -XX:MaxMetaspaceSize=256m -XX:+UseSerialGC"`
Expected: FAIL lúc biên dịch — `cannot find symbol: method notNearExpiry(...)`, `class FarmerDealController`.

- [ ] **Step 3: Viết controller**

`product/controllers/FarmerDealController.java`:

```java
package com.techx.intervue.modules.product.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.product.requests.DealRequest;
import com.techx.intervue.modules.product.resources.DailyStockResource;
import com.techx.intervue.modules.product.resources.FarmerDealResource;
import com.techx.intervue.modules.product.services.interfaces.FarmerDealServiceInterface;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import com.techx.intervue.resources.ApiResource;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import lombok.AllArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * FR-124 — near-expiry deals on the Farmer's own products (spec §4.5.3). Everything is looked up
 * by the token's user (R-06).
 */
@RestController
@RequestMapping("/api/v1/farmer")
@PreAuthorize("hasRole('FARMER')")
@AllArgsConstructor
public class FarmerDealController extends BaseController {

    private final FarmerDealServiceInterface deals;

    /** The stall's deal days from today on, for the "On sale" block. */
    @GetMapping("/deals")
    public ResponseEntity<ApiResource<List<FarmerDealResource>>> mine(
            @AuthenticationPrincipal CustomUserDetails user) {
        return ok(deals.mine(user.getId()), "");
    }

    /** The days of the next 14 a customer can still order this product for, with their numbers. */
    @GetMapping("/products/{id}/daily-stock")
    public ResponseEntity<ApiResource<List<DailyStockResource>>> upcomingDays(
            @AuthenticationPrincipal CustomUserDetails user, @PathVariable long id) {
        return ok(deals.upcomingDays(user.getId(), id), "");
    }

    @PutMapping("/products/{id}/daily-stock/{date}/deal")
    public ResponseEntity<ApiResource<DailyStockResource>> post(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable long id,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @Valid @RequestBody DealRequest request) {
        return ok(deals.post(user.getId(), id, date, request), "Deal posted.");
    }

    @DeleteMapping("/products/{id}/daily-stock/{date}/deal")
    public ResponseEntity<ApiResource<Void>> remove(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable long id,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        deals.remove(user.getId(), id, date);
        return ok(null, "Deal removed.");
    }
}
```

- [ ] **Step 4: Sửa `ProductExceptionHandler`**

1. Import `com.techx.intervue.modules.product.exceptions.DateNotOrderableException`, `…ExpiredBeforePickupException`, `…NotNearExpiryException`, `org.springframework.web.method.annotation.MethodArgumentTypeMismatchException`.
2. Trong `assignableTypes`, thêm `FarmerDealController.class` sau `FarmerStockTemplateController.class,`:

```java
            FarmerStockTemplateController.class,
            FarmerDealController.class,
            AdminProductController.class
```

3. Thêm 4 handler ngay trước handler `forbidden(AccessDeniedException e)`:

```java
    /** FR-124: the batch is fresh on that day, or more than half of its shelf life is left. */
    @ExceptionHandler(NotNearExpiryException.class)
    ResponseEntity<ApiResource<Void>> notNearExpiry(NotNearExpiryException e) {
        return error(HttpStatus.BAD_REQUEST, "NOT_NEAR_EXPIRY", e.getMessage(), List.of());
    }

    /** FR-124: the batch is no longer good on the pickup day. */
    @ExceptionHandler(ExpiredBeforePickupException.class)
    ResponseEntity<ApiResource<Void>> expiredBeforePickup(ExpiredBeforePickupException e) {
        return error(HttpStatus.BAD_REQUEST, "EXPIRED_BEFORE_PICKUP", e.getMessage(), List.of());
    }

    /** FR-124: customers can no longer order for that day — a state conflict, like a full slot. */
    @ExceptionHandler(DateNotOrderableException.class)
    ResponseEntity<ApiResource<Void>> dateNotOrderable(DateNotOrderableException e) {
        return error(HttpStatus.CONFLICT, "DATE_NOT_ORDERABLE", e.getMessage(), List.of());
    }

    /** A path or query value of the wrong type, e.g. a {date} that is not yyyy-MM-dd → 400. */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    ResponseEntity<ApiResource<Void>> wrongType(MethodArgumentTypeMismatchException e) {
        return error(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", INVALID_MESSAGE, List.of());
    }
```

- [ ] **Step 5: Chạy lại test**

Run: `docker compose exec -T -e MAVEN_OPTS=-Xmx256m backend ./mvnw -B test -Dtest='DealHttpMappingTest' -Dsurefire.failIfNoSpecifiedTests=false -DargLine="-Xmx768m -XX:MaxMetaspaceSize=256m -XX:+UseSerialGC"`
Expected: `Tests run: 4, Failures: 0, Errors: 0`.

- [ ] **Step 6: Format và commit**

```bash
docker compose exec -T -e MAVEN_OPTS=-Xmx256m backend ./mvnw -B -q spotless:apply
git add backend/src/main/java/com/techx/intervue/modules/product/controllers/FarmerDealController.java \
  backend/src/main/java/com/techx/intervue/modules/product/controllers/ProductExceptionHandler.java \
  backend/src/test/java/com/techx/intervue/modules/product/controllers/DealHttpMappingTest.java
git commit -m "feat(FR-124): farmer deal endpoints and error codes"
```

---

### Task 6: Đơn đặt vào ngày giảm giá chụp giá gốc và hạn của lô (FR-124)

**Files:**
- Modify: `backend/src/main/java/com/techx/intervue/modules/order/services/impl/OrderService.java` (dòng `items.add(OrderItem.snapshot(…))` trong `placeGroup`)
- Test: `backend/src/test/java/com/techx/intervue/modules/order/services/impl/OrderServiceTest.java` (thêm test)
- Test: `backend/src/test/java/com/techx/intervue/modules/order/services/impl/DealOrderFlowTest.java` (mới, MySQL)

**Interfaces:**
- Consumes: giai đoạn 1 (`OrderItem.snapshot(p, unitPrice, qty, subtotal, pickupDate)`, `OrderItem.setListPrice/setBestBefore`, cột `order_items.list_price/best_before`); Task 1 (`ProductDailyStock.hasDeal/getListPrice/getBestBefore`, `startDeal`); Task 4 (`FarmerDealServiceInterface.post/remove`, `DealRequest`).
- Produces: dòng `order_items` của ngày giảm giá có `unit_price` = giá giảm, `list_price` = giá thường, `best_before` = hạn của lô (spec §4.3, §4.5.5). Đơn ngày thường giữ `list_price = NULL` và `best_before` của giai đoạn 1.

- [ ] **Step 1: Thêm test đặt đơn (Mockito)**

Trong `OrderServiceTest`, gần các test `place…`:

```java
    /**
     * FR-124 (spec §4.3, §4.5.5): a line bought on a deal day pays the deal price and keeps the
     * price it replaced and that batch's own best-before, which is earlier than a fresh batch's.
     */
    @Test
    void placeOnADealDayKeepsTheListPriceAndTheBatchBestBefore() {
        products.get(RAU_MUONG).setShelfLifeDays(3);
        dailyStock
                .get(RAU_MUONG + "@" + PICKUP)
                .startDeal(
                        new BigDecimal("7200"),
                        40,
                        LocalDate.of(2026, 9, 26),
                        LocalDate.of(2026, 9, 30));

        service.place(CUSTOMER_ID, aValidRequest());

        OrderItem line = items.getFirst();
        assertThat(line.getUnitPrice()).isEqualByComparingTo("7200");
        assertThat(line.getListPrice()).isEqualByComparingTo("12000");
        assertThat(line.getBestBefore()).isEqualTo(LocalDate.of(2026, 9, 30));
        assertThat(orders.getFirst().getTotalAmount()).isEqualByComparingTo("14400");
    }

    @Test
    void placeOnADayWithoutADealLeavesTheListPriceEmpty() {
        products.get(RAU_MUONG).setShelfLifeDays(3);

        service.place(CUSTOMER_ID, aValidRequest());

        assertThat(items.getFirst().getListPrice()).isNull();
        assertThat(items.getFirst().getBestBefore()).isEqualTo(PICKUP.plusDays(2));
    }
```

- [ ] **Step 2: Viết test luồng thật trên MySQL**

`backend/src/test/java/com/techx/intervue/modules/order/services/impl/DealOrderFlowTest.java`:

```java
package com.techx.intervue.modules.order.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.techx.intervue.modules.order.requests.CartLine;
import com.techx.intervue.modules.order.requests.OrderGroupInput;
import com.techx.intervue.modules.order.requests.PlaceOrderRequest;
import com.techx.intervue.modules.product.exceptions.DateNotOrderableException;
import com.techx.intervue.modules.product.requests.DealRequest;
import com.techx.intervue.modules.product.services.interfaces.FarmerDealServiceInterface;
import com.techx.intervue.modules.report.services.impl.ReportFixture;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

/**
 * FR-124 on real MySQL (spec §8, §9): posting a deal, then placing orders for that day through the
 * real locking path. The product keeps 7 days and sells at $2.00; a batch packed today is past half
 * of its shelf life on PICKUP (4 of 7 days left). Rolled back after each test.
 */
@SpringBootTest
@Transactional
class DealOrderFlowTest {

    private static final LocalDate TODAY = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
    private static final LocalDate PICKUP = TODAY.plusDays(3);

    @Autowired private OrderService orders;
    @Autowired private FarmerDealServiceInterface deals;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private EntityManager entityManager;

    private ReportFixture fx;
    private long farmerUser;
    private long stall;
    private long market;
    private long customer;
    private long product;
    private long slot;

    @BeforeEach
    void setUp() {
        fx = new ReportFixture(jdbc);
        farmerUser = fx.user("farmer", "Deal seller", "x");
        stall = fx.farmer(farmerUser, "Deal stall", "approved");
        market = fx.market("Deal market");
        customer = fx.user("customer", "Deal buyer", "x");
        product = fx.product(stall, fx.category(), "Tomato", 2);
        jdbc.update("UPDATE products SET shelf_life_days = 7 WHERE id = ?", product);
        fx.everyDayTemplate(stall, product, 20);
        // A free 07:00 slot on every day from today+2 to today+13
        fx.sellsEveryDay(stall, market);
        slot =
                jdbc.queryForObject(
                        "SELECT s.id FROM pickup_slots s JOIN farmer_markets fm ON fm.id ="
                                + " s.farmer_market_id WHERE fm.farmer_id = ? AND s.slot_date = ?",
                        Long.class,
                        stall,
                        PICKUP);
    }

    @Test
    void anOrderOnADealDayPaysTheDealPriceAndKeepsTheBatchPromise() {
        deals.post(farmerUser, product, PICKUP, new DealRequest(5, TODAY, 40));

        orders.place(customer, order(2));
        entityManager.flush();

        Map<String, Object> line =
                jdbc.queryForMap(
                        "SELECT unit_price, list_price, best_before FROM order_items WHERE"
                                + " product_id = ?",
                        product);
        assertThat((BigDecimal) line.get("unit_price")).isEqualByComparingTo("1.20");
        assertThat((BigDecimal) line.get("list_price")).isEqualByComparingTo("2.00");
        assertThat(line.get("best_before").toString()).isEqualTo(TODAY.plusDays(6).toString());
        assertThat(quantityOn(PICKUP)).isEqualTo(3);
    }

    /** Spec §8: an order placed before the deal keeps its price; the next one pays the deal. */
    @Test
    void anOrderPlacedBeforeTheDealKeepsItsPrice() {
        orders.place(customer, order(1));
        deals.post(farmerUser, product, PICKUP, new DealRequest(5, TODAY, 40));
        orders.place(fx.user("customer", "Second buyer", "x"), order(1));
        entityManager.flush();

        List<Map<String, Object>> lines =
                jdbc.queryForList(
                        "SELECT unit_price, list_price FROM order_items WHERE product_id = ?"
                                + " ORDER BY id",
                        product);
        assertThat((BigDecimal) lines.get(0).get("unit_price")).isEqualByComparingTo("2.00");
        assertThat(lines.get(0).get("list_price")).isNull();
        assertThat((BigDecimal) lines.get(1).get("unit_price")).isEqualByComparingTo("1.20");
        assertThat((BigDecimal) lines.get(1).get("list_price")).isEqualByComparingTo("2.00");
    }

    /** Spec §8: editing the product's shelf life after posting leaves the batch's best-before. */
    @Test
    void editingTheShelfLifeLaterKeepsTheBatchBestBefore() {
        deals.post(farmerUser, product, PICKUP, new DealRequest(5, TODAY, 40));
        entityManager.flush();
        jdbc.update("UPDATE products SET shelf_life_days = 3 WHERE id = ?", product);
        // Read the product again, as a later request would
        entityManager.clear();

        orders.place(customer, order(1));
        entityManager.flush();

        assertThat(
                        jdbc.queryForObject(
                                "SELECT best_before FROM order_items WHERE product_id = ?",
                                LocalDate.class,
                                product))
                .isEqualTo(TODAY.plusDays(6));
    }

    @Test
    void removingTheDealRestoresThePriceAndKeepsTheQuantity() {
        deals.post(farmerUser, product, PICKUP, new DealRequest(5, TODAY, 40));
        deals.remove(farmerUser, product, PICKUP);
        entityManager.flush();

        Map<String, Object> row =
                jdbc.queryForMap(
                        "SELECT quantity_available, unit_price, list_price, discount_percent,"
                                + " packed_on, best_before FROM product_daily_stock WHERE"
                                + " product_id = ? AND stock_date = ?",
                        product,
                        PICKUP);
        assertThat(row.get("quantity_available")).isEqualTo(5);
        assertThat((BigDecimal) row.get("unit_price")).isEqualByComparingTo("2.00");
        assertThat(row.get("list_price")).isNull();
        assertThat(row.get("discount_percent")).isNull();
        assertThat(row.get("packed_on")).isNull();
        assertThat(row.get("best_before")).isNull();
    }

    /** Tomorrow has no slot in this fixture (slots start at today+2), so nobody can order for it. */
    @Test
    void aDayWithoutASlotCannotGoOnADeal() {
        assertThatThrownBy(
                        () ->
                                deals.post(
                                        farmerUser,
                                        product,
                                        TODAY.plusDays(1),
                                        new DealRequest(5, TODAY.minusDays(3), 40)))
                .isInstanceOf(DateNotOrderableException.class);
    }

    private PlaceOrderRequest order(int quantity) {
        return new PlaceOrderRequest(
                List.of(
                        new OrderGroupInput(
                                stall,
                                market,
                                slot,
                                PICKUP,
                                List.of(new CartLine(product, quantity)),
                                null)));
    }

    private int quantityOn(LocalDate day) {
        return jdbc.queryForObject(
                "SELECT quantity_available FROM product_daily_stock WHERE product_id = ? AND"
                        + " stock_date = ?",
                Integer.class,
                product,
                day);
    }
}
```

(Ngày `TODAY.plusDays(1)` với lô đóng gói 3 ngày trước: 7 ngày → hết hạn `TODAY + 3`, còn 3 ngày ≤ 4 nên qua được luật; lỗi 409 đến từ việc ngày đó không có slot, vì `ReportFixture.sellsEveryDay` chỉ mở slot từ `today + 2`.)

- [ ] **Step 3: Chạy test để thấy fail**

Run: `docker compose exec -T -e MAVEN_OPTS=-Xmx256m backend ./mvnw -B test -Dtest='OrderServiceTest,DealOrderFlowTest' -Dsurefire.failIfNoSpecifiedTests=false -DargLine="-Xmx768m -XX:MaxMetaspaceSize=256m -XX:+UseSerialGC"`
Expected: FAIL ở `placeOnADealDayKeepsTheListPriceAndTheBatchBestBefore` (`getListPrice()` là null), `anOrderOnADealDayPaysTheDealPriceAndKeepsTheBatchPromise`, `anOrderPlacedBeforeTheDealKeepsItsPrice`, `editingTheShelfLifeLaterKeepsTheBatchBestBefore` (`list_price`/`best_before` sai). Các test khác PASS.

- [ ] **Step 4: Chụp giá gốc và hạn của lô trong `placeGroup`**

Trong vòng `for` thứ hai của `OrderService.placeGroup`, thay dòng (bản sau giai đoạn 1)

```java
            items.add(OrderItem.snapshot(p, row.getUnitPrice(), qty, subtotal, group.pickupDate()));
```

bằng:

```java
            OrderItem item =
                    OrderItem.snapshot(p, row.getUnitPrice(), qty, subtotal, group.pickupDate());
            if (row.hasDeal()) {
                // FR-124: a deal day sells an older batch — keep the price it replaced and that
                // batch's own last good day, earlier than a fresh batch's
                item.setListPrice(row.getListPrice());
                item.setBestBefore(row.getBestBefore());
            }
            items.add(item);
```

- [ ] **Step 5: Chạy lại test đặt đơn**

Run: `docker compose exec -T -e MAVEN_OPTS=-Xmx256m backend ./mvnw -B test -Dtest='OrderServiceTest,DealOrderFlowTest,PlaceOrderConcurrencyTest,PlaceOrderOpenDaysTest,OrderModifyTest' -Dsurefire.failIfNoSpecifiedTests=false -DargLine="-Xmx768m -XX:MaxMetaspaceSize=256m -XX:+UseSerialGC"`
Expected: toàn bộ PASS (các test đặt đơn đồng thời có sẵn vẫn xanh — spec §9), `BUILD SUCCESS`.

- [ ] **Step 6: Format và commit**

```bash
docker compose exec -T -e MAVEN_OPTS=-Xmx256m backend ./mvnw -B -q spotless:apply
git add backend/src/main/java/com/techx/intervue/modules/order/services/impl/OrderService.java \
  backend/src/test/java/com/techx/intervue/modules/order/services/impl/OrderServiceTest.java \
  backend/src/test/java/com/techx/intervue/modules/order/services/impl/DealOrderFlowTest.java
git commit -m "feat(FR-124): orders on a deal day keep the list price and the batch best-before"
```

---

### Task 7: API công khai `GET /api/v1/deals` (FR-125)

**Files:**
- Create: `backend/src/main/java/com/techx/intervue/modules/product/requests/DealSearchCriteria.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/product/resources/DealResource.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/product/repositories/DealQueryRepository.java` (thêm `OPEN_DEALS_SQL`, `DealRow`, `openDeals`, `MARKETS_BY_WEEKDAY_SQL`, `marketNamesByWeekday`)
- Create: `backend/src/main/java/com/techx/intervue/modules/product/services/interfaces/DealQueryServiceInterface.java`, `backend/src/main/java/com/techx/intervue/modules/product/services/impl/DealQueryService.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/product/controllers/DealController.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/product/controllers/ProductExceptionHandler.java` (`assignableTypes`)
- Modify: `backend/src/main/java/com/techx/intervue/config/SecurityConfig.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/product/services/impl/DealSearchIntegrationTest.java` (MySQL)
- Test: `backend/src/test/java/com/techx/intervue/modules/product/controllers/DealsPublicAccessTest.java` (HTTP thật)
- Test: `backend/src/test/java/com/techx/intervue/modules/product/controllers/DealHttpMappingTest.java` (thêm test)

**Interfaces:**
- Consumes: Task 1 (cột giảm giá), Task 3 (`ProductAvailabilityResolver.LOOKAHEAD_DAYS`), Task 5 (handler, `DealHttpMappingTest`); có sẵn: `ProductQueryRepository.VISIBILITY_FILTER`, `SlotQueryRepository.orderableDates`, `PageResource`; giai đoạn 1: cột `products.storage_mode`.
- Produces: `DealSearchCriteria(Long marketId, Long categoryId, Integer day, Long productId, int page, int pageSize)`; `DealResource(Long productId, String name, String imageUrl, String unit, String stallName, Long farmerId, List<String> marketNames, String stockDate, BigDecimal listPrice, BigDecimal unitPrice, int discountPercent, String bestBefore, int daysLeft, int quantityAvailable, String storageMode)` (đúng thứ tự field của spec §4.5.4); `DealQueryServiceInterface.search(DealSearchCriteria) → PageResource<DealResource>`; `GET /api/v1/deals?marketId&categoryId&day&productId&page&pageSize` (public, `pageSize` mặc định 12, tối đa 50).

- [ ] **Step 1: Viết test trên MySQL**

`backend/src/test/java/com/techx/intervue/modules/product/services/impl/DealSearchIntegrationTest.java`:

```java
package com.techx.intervue.modules.product.services.impl;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.product.requests.DealSearchCriteria;
import com.techx.intervue.modules.product.resources.DealResource;
import com.techx.intervue.modules.product.services.interfaces.DealQueryServiceInterface;
import com.techx.intervue.modules.report.services.impl.ReportFixture;
import com.techx.intervue.resources.PageResource;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.transaction.annotation.Transactional;

/**
 * FR-125 on real MySQL (spec §4.5.4, §9): GET /deals keeps only deal days customers can still
 * order for — a free slot before its cutoff, an approved stall, a listed product on sale, stock
 * left, inside the 14-day window — nearest day first, then the biggest discount. Rolled back after
 * each test. The shared dev database may hold seeded deals, so unfiltered results are narrowed to
 * this test's products.
 */
@SpringBootTest
@Transactional
class DealSearchIntegrationTest {

    private static final LocalDate TODAY = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
    private static final LocalDate D1 = TODAY.plusDays(2);
    private static final LocalDate D2 = TODAY.plusDays(3);
    private static final LocalDate FULL_DAY = TODAY.plusDays(5);
    private static final LocalDate FAR = TODAY.plusDays(20);

    @Autowired private DealQueryServiceInterface deals;
    @Autowired private JdbcTemplate jdbc;

    private final List<Long> mine = new ArrayList<>();
    private ReportFixture fx;
    private long otherMarket;
    private long category;
    private long otherCategory;
    private long stall;
    private long tomato;
    private long eggs;

    @BeforeEach
    void setUp() {
        fx = new ReportFixture(jdbc);
        long market = fx.market("Deals market");
        otherMarket = fx.market("Deals other market");
        category = fx.category();
        otherCategory =
                insert(
                        "INSERT INTO categories (name, slug) VALUES (?, ?)",
                        "Deals other " + fx.tag,
                        "deals-other-" + fx.tag);
        stall = fx.farmer(fx.user("farmer", "Deal seller", "x"), "Deal stall", "approved");
        long suspended =
                fx.farmer(fx.user("farmer", "Held seller", "x"), "Held stall", "suspended");
        // A free 07:00 slot on every day from today+2 to today+13
        fx.sellsEveryDay(stall, market);
        fx.sellsEveryDay(suspended, market);
        // The stall is also at the other market, on D1's weekday only
        long link =
                insert(
                        "INSERT INTO farmer_markets (farmer_id, market_id) VALUES (?, ?)",
                        stall,
                        otherMarket);
        jdbc.update(
                "INSERT IGNORE INTO market_operating_days (market_id, day_of_week) VALUES (?, ?)",
                otherMarket,
                weekday(D1));
        jdbc.update(
                "INSERT INTO farmer_operating_days (farmer_market_id, day_of_week,"
                        + " pickup_start_time, pickup_end_time) VALUES (?, ?, '07:00', '10:00')",
                link,
                weekday(D1));
        // FULL_DAY's only slot has no room left
        jdbc.update(
                "UPDATE pickup_slots s JOIN farmer_markets fm ON fm.id = s.farmer_market_id"
                        + " SET s.booked_count = s.max_orders"
                        + " WHERE fm.farmer_id = ? AND s.slot_date = ?",
                stall,
                FULL_DAY);

        tomato = product(stall, category, "Tomato");
        eggs = product(stall, otherCategory, "Eggs");
        deal(tomato, D1, 12, 20);
        deal(tomato, FULL_DAY, 12, 30);
        deal(tomato, FAR, 12, 20);
        deal(eggs, D1, 8, 40);
        deal(eggs, D2, 5, 20);
        jdbc.update(
                "INSERT INTO product_daily_stock (product_id, stock_date, quantity_available,"
                        + " unit_price) VALUES (?, ?, 30, 2)",
                tomato,
                D2);

        long hidden = product(stall, category, "Hidden");
        jdbc.update("UPDATE products SET is_hidden = TRUE WHERE id = ?", hidden);
        deal(hidden, D1, 5, 50);
        long paused = product(stall, category, "Paused");
        jdbc.update("UPDATE products SET status = 'unavailable' WHERE id = ?", paused);
        deal(paused, D1, 5, 50);
        long deleted = product(stall, category, "Deleted");
        jdbc.update("UPDATE products SET is_deleted = TRUE WHERE id = ?", deleted);
        deal(deleted, D1, 5, 50);
        long soldOut = product(stall, category, "Gone");
        deal(soldOut, D1, 0, 50);
        long held = product(suspended, category, "Held");
        deal(held, D1, 5, 50);
    }

    /** Full slot, outside the window, hidden, paused, deleted, sold out, suspended stall: left out. */
    @Test
    void keepsOnlyDealDaysCustomersCanStillOrderNearestDayFirstThenTheBiggestDiscount() {
        assertThat(found(criteria(null, null, null, null, 1, 50)))
                .containsExactly("Eggs@" + D1, "Tomato@" + D1, "Eggs@" + D2);
    }

    @Test
    void filtersByCategoryAndCountsOnlyWhatIsShown() {
        PageResource<DealResource> page = deals.search(criteria(null, otherCategory, null, null, 1, 50));

        assertThat(page.total()).isEqualTo(2);
        assertThat(page.items()).extracting(DealResource::productId).containsOnly(eggs);
    }

    /** marketId keeps a day only when the stall is at that market on that weekday. */
    @Test
    void filtersByTheMarketTheStallIsAtThatDay() {
        PageResource<DealResource> page = deals.search(criteria(otherMarket, null, null, null, 1, 50));

        assertThat(page.items())
                .extracting(d -> d.name().split(" ")[0] + "@" + d.stockDate())
                .containsExactly("Eggs@" + D1, "Tomato@" + D1);
        assertThat(page.total()).isEqualTo(2);
    }

    @Test
    void filtersByProductAndWeekdayAndPages() {
        PageResource<DealResource> first = deals.search(criteria(null, null, null, eggs, 1, 1));
        assertThat(first.total()).isEqualTo(2);
        assertThat(first.items()).extracting(DealResource::stockDate).containsExactly(D1.toString());

        assertThat(deals.search(criteria(null, null, null, eggs, 2, 1)).items())
                .extracting(DealResource::stockDate)
                .containsExactly(D2.toString());
        assertThat(deals.search(criteria(null, null, weekday(D2), eggs, 1, 50)).items())
                .extracting(DealResource::stockDate)
                .containsExactly(D2.toString());
    }

    @Test
    void describesEachDealForItsCard() {
        DealResource d = deals.search(criteria(null, null, null, tomato, 1, 50)).items().getFirst();

        assertThat(d.stockDate()).isEqualTo(D1.toString());
        assertThat(d.listPrice()).isEqualByComparingTo("2.00");
        assertThat(d.unitPrice()).isEqualByComparingTo("1.60");
        assertThat(d.discountPercent()).isEqualTo(20);
        assertThat(d.bestBefore()).isEqualTo(D1.plusDays(1).toString());
        assertThat(d.daysLeft()).isEqualTo(2);
        assertThat(d.quantityAvailable()).isEqualTo(12);
        assertThat(d.unit()).isEqualTo("kg");
        assertThat(d.farmerId()).isEqualTo(stall);
        assertThat(d.stallName()).isEqualTo("Deal stall " + fx.tag);
        assertThat(d.marketNames())
                .containsExactly("Deals market " + fx.tag, "Deals other market " + fx.tag);
        assertThat(d.storageMode()).isEqualTo("room");
        // On D2's weekday the stall is only at the first market
        assertThat(deals.search(criteria(null, null, null, eggs, 2, 1)).items().getFirst().marketNames())
                .containsExactly("Deals market " + fx.tag);
    }

    private List<String> found(DealSearchCriteria c) {
        return deals.search(c).items().stream()
                .filter(d -> mine.contains(d.productId()))
                .map(d -> d.name().split(" ")[0] + "@" + d.stockDate())
                .toList();
    }

    private static DealSearchCriteria criteria(
            Long marketId, Long categoryId, Integer day, Long productId, int page, int pageSize) {
        return new DealSearchCriteria(marketId, categoryId, day, productId, page, pageSize);
    }

    private static int weekday(LocalDate date) {
        return date.getDayOfWeek().getValue() % 7;
    }

    /** $2.00 a kg, with an active template (the public catalogue needs one). */
    private long product(long farmerId, long categoryId, String name) {
        long id = fx.product(farmerId, categoryId, name, 2);
        fx.everyDayTemplate(farmerId, id, 20);
        mine.add(id);
        return id;
    }

    /** Packed three days before the day, good until the day after it. */
    private void deal(long productId, LocalDate day, int quantity, int percent) {
        BigDecimal list = new BigDecimal("2.00");
        BigDecimal price =
                list.multiply(BigDecimal.valueOf(100 - percent))
                        .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        jdbc.update(
                "INSERT INTO product_daily_stock (product_id, stock_date, quantity_available,"
                        + " unit_price, list_price, discount_percent, packed_on, best_before)"
                        + " VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                productId,
                day,
                quantity,
                price,
                list,
                percent,
                day.minusDays(3),
                day.plusDays(1));
    }

    private long insert(String sql, Object... args) {
        KeyHolder keys = new GeneratedKeyHolder();
        jdbc.update(
                con -> {
                    PreparedStatement ps =
                            con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
                    for (int i = 0; i < args.length; i++) {
                        ps.setObject(i + 1, args[i]);
                    }
                    return ps;
                },
                keys);
        return keys.getKey().longValue();
    }
}
```

- [ ] **Step 2: Viết test truy cập công khai (HTTP thật)**

`backend/src/test/java/com/techx/intervue/modules/product/controllers/DealsPublicAccessTest.java`:

```java
package com.techx.intervue.modules.product.controllers;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.TestPropertySource;

/** FR-125: the deals page reads GET /deals before signing in, like the product list. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestPropertySource(properties = "app.chat.rabbitmq.host=")
class DealsPublicAccessTest {

    @LocalServerPort int port;

    private final HttpClient http = HttpClient.newHttpClient();

    private HttpResponse<String> get(String path) throws Exception {
        return http.send(
                HttpRequest.newBuilder(URI.create("http://localhost:" + port + path)).GET().build(),
                HttpResponse.BodyHandlers.ofString());
    }

    @Test
    void anyoneCanReadTheDeals() throws Exception {
        HttpResponse<String> r = get("/api/v1/deals?pageSize=4");

        assertThat(r.statusCode()).as(r.body()).isEqualTo(200);
        assertThat(r.body()).contains("\"success\":true").contains("\"items\"");
    }

    /** A query value of the wrong type keeps the envelope (ProductExceptionHandler covers it). */
    @Test
    void aDayThatIsNotANumberIs400() throws Exception {
        HttpResponse<String> r = get("/api/v1/deals?day=saturday");

        assertThat(r.statusCode()).as(r.body()).isEqualTo(400);
        assertThat(r.body()).contains("VALIDATION_ERROR");
    }

    @Test
    void aStallsOwnDealsNeedASignIn() throws Exception {
        assertThat(get("/api/v1/farmer/deals").statusCode()).isEqualTo(401);
    }
}
```

- [ ] **Step 3: Thêm test phạm vi vào `DealHttpMappingTest`**

```java
    /** The public controller: covered by the module's handler, and no role rule. */
    @Test
    void theDealsControllerIsCoveredAndPublic() {
        List<Class<?>> covered =
                Arrays.asList(
                        ProductExceptionHandler.class
                                .getAnnotation(RestControllerAdvice.class)
                                .assignableTypes());

        assertThat(covered).contains(DealController.class);
        assertThat(DealController.class.getAnnotation(PreAuthorize.class)).isNull();
    }
```

- [ ] **Step 4: Chạy test để thấy fail**

Run: `docker compose exec -T -e MAVEN_OPTS=-Xmx256m backend ./mvnw -B test -Dtest='DealSearchIntegrationTest,DealsPublicAccessTest,DealHttpMappingTest' -Dsurefire.failIfNoSpecifiedTests=false -DargLine="-Xmx768m -XX:MaxMetaspaceSize=256m -XX:+UseSerialGC"`
Expected: FAIL lúc biên dịch — `cannot find symbol: class DealSearchCriteria`, `class DealController`…

- [ ] **Step 5: Viết criteria và resource**

`product/requests/DealSearchCriteria.java`:

```java
package com.techx.intervue.modules.product.requests;

/**
 * Query of GET /api/v1/deals (FR-125). Every filter is optional; {@code day} is the pickup
 * weekday, 0 = Sunday … 6 = Saturday, like GET /products.
 */
public record DealSearchCriteria(
        Long marketId, Long categoryId, Integer day, Long productId, int page, int pageSize) {}
```

`product/resources/DealResource.java`:

```java
package com.techx.intervue.modules.product.resources;

import java.math.BigDecimal;
import java.util.List;

/**
 * One product on a near-expiry deal for one pickup day (GET /api/v1/deals, spec §4.5.4). Dates are
 * "yyyy-MM-dd"; {@code marketNames} are the markets the stall is at on that weekday; {@code
 * daysLeft} counts the pickup day itself.
 */
public record DealResource(
        Long productId,
        String name,
        String imageUrl,
        String unit,
        String stallName,
        Long farmerId,
        List<String> marketNames,
        String stockDate,
        BigDecimal listPrice,
        BigDecimal unitPrice,
        int discountPercent,
        String bestBefore,
        int daysLeft,
        int quantityAvailable,
        String storageMode) {}
```

- [ ] **Step 6: Thêm truy vấn công khai vào `DealQueryRepository`**

Thêm import `com.techx.intervue.modules.product.requests.DealSearchCriteria`, `java.math.BigDecimal`, `java.util.ArrayList`, `java.util.Collection`, `java.util.HashMap`, `java.util.Map`. Thêm vào class:

```java
    /**
     * Deal days a customer may see, before the slot check the service adds (spec §4.5.4): on a
     * deal, something left, inside the window, the product listed and for sale at an approved
     * stall ({@link ProductQueryRepository#VISIBILITY_FILTER}). {@code marketId} keeps a day only
     * when the stall is at that market on that weekday and the market is held then.
     */
    public static final String OPEN_DEALS_SQL =
            """
            SELECT d.product_id, d.stock_date, d.quantity_available, d.unit_price, d.list_price,
                   d.discount_percent, d.best_before,
                   DATEDIFF(d.best_before, d.stock_date) + 1 AS days_left,
                   p.name, p.image_url, p.unit, p.storage_mode, f.id AS farmer_id, f.stall_name
            FROM product_daily_stock d
            JOIN products p ON p.id = d.product_id
            JOIN farmer_profiles f ON f.id = p.farmer_id
            WHERE d.discount_percent IS NOT NULL
              AND d.quantity_available > 0
              AND d.stock_date BETWEEN :fromDate AND :toDate
              AND p.status = 'available'
            """
                    + ProductQueryRepository.VISIBILITY_FILTER
                    + """
                      AND (:categoryId IS NULL OR p.category_id = :categoryId)
                      AND (:productId IS NULL OR p.id = :productId)
                      AND (:day IS NULL OR DAYOFWEEK(d.stock_date) - 1 = :day)
                      AND (:marketId IS NULL OR EXISTS (
                            SELECT 1 FROM farmer_markets fm
                            JOIN markets m ON m.id = fm.market_id AND m.is_active = TRUE
                            JOIN farmer_operating_days od ON od.farmer_market_id = fm.id
                                 AND od.day_of_week = DAYOFWEEK(d.stock_date) - 1
                            JOIN market_operating_days mo ON mo.market_id = fm.market_id
                                 AND mo.day_of_week = DAYOFWEEK(d.stock_date) - 1
                            WHERE fm.farmer_id = f.id
                              AND fm.is_active = TRUE
                              AND fm.market_id = :marketId))
                    ORDER BY d.stock_date, d.discount_percent DESC, p.name, p.id
                    """;

    /** Markets per stall and weekday (0 = Sunday) where the stall is and the market is held. */
    public static final String MARKETS_BY_WEEKDAY_SQL =
            """
            SELECT fm.farmer_id, od.day_of_week, m.market_name
            FROM farmer_markets fm
            JOIN markets m ON m.id = fm.market_id AND m.is_active = TRUE
            JOIN farmer_operating_days od ON od.farmer_market_id = fm.id
            JOIN market_operating_days mo ON mo.market_id = m.id
                 AND mo.day_of_week = od.day_of_week
            WHERE fm.is_active = TRUE
              AND fm.farmer_id IN (:farmerIds)
            ORDER BY fm.farmer_id, od.day_of_week, m.market_name
            """;

    /** One row of {@link #OPEN_DEALS_SQL}. */
    public record DealRow(
            long productId,
            LocalDate stockDate,
            int quantityAvailable,
            BigDecimal unitPrice,
            BigDecimal listPrice,
            int discountPercent,
            LocalDate bestBefore,
            int daysLeft,
            String name,
            String imageUrl,
            String unit,
            String storageMode,
            long farmerId,
            String stallName) {}

    public List<DealRow> openDeals(DealSearchCriteria c, LocalDate fromDate, LocalDate toDate) {
        MapSqlParameterSource params =
                new MapSqlParameterSource()
                        .addValue("fromDate", fromDate)
                        .addValue("toDate", toDate)
                        .addValue("categoryId", c.categoryId())
                        .addValue("productId", c.productId())
                        .addValue("day", c.day())
                        .addValue("marketId", c.marketId());
        return jdbc.query(
                OPEN_DEALS_SQL,
                params,
                (rs, i) ->
                        new DealRow(
                                rs.getLong("product_id"),
                                rs.getObject("stock_date", LocalDate.class),
                                rs.getInt("quantity_available"),
                                rs.getBigDecimal("unit_price"),
                                rs.getBigDecimal("list_price"),
                                rs.getInt("discount_percent"),
                                rs.getObject("best_before", LocalDate.class),
                                rs.getInt("days_left"),
                                rs.getString("name"),
                                rs.getString("image_url"),
                                rs.getString("unit"),
                                rs.getString("storage_mode"),
                                rs.getLong("farmer_id"),
                                rs.getString("stall_name")));
    }

    /** Stall id → weekday → the market names, sorted by name. */
    public Map<Long, Map<Integer, List<String>>> marketNamesByWeekday(Collection<Long> farmerIds) {
        Map<Long, Map<Integer, List<String>>> out = new HashMap<>();
        if (farmerIds.isEmpty()) {
            return out;
        }
        jdbc.query(
                MARKETS_BY_WEEKDAY_SQL,
                new MapSqlParameterSource("farmerIds", farmerIds),
                rs -> {
                    out.computeIfAbsent(rs.getLong("farmer_id"), k -> new HashMap<>())
                            .computeIfAbsent(rs.getInt("day_of_week"), k -> new ArrayList<>())
                            .add(rs.getString("market_name"));
                });
        return out;
    }
```

- [ ] **Step 7: Viết service**

`product/services/interfaces/DealQueryServiceInterface.java`:

```java
package com.techx.intervue.modules.product.services.interfaces;

import com.techx.intervue.modules.product.requests.DealSearchCriteria;
import com.techx.intervue.modules.product.resources.DealResource;
import com.techx.intervue.resources.PageResource;

/** FR-125 — the public near-expiry deals (spec §4.5.4). */
public interface DealQueryServiceInterface {

    /** page from 1, pageSize clamped to 1…50. */
    PageResource<DealResource> search(DealSearchCriteria criteria);
}
```

`product/services/impl/DealQueryService.java`:

```java
package com.techx.intervue.modules.product.services.impl;

import com.techx.intervue.modules.product.repositories.DealQueryRepository;
import com.techx.intervue.modules.product.repositories.DealQueryRepository.DealRow;
import com.techx.intervue.modules.product.requests.DealSearchCriteria;
import com.techx.intervue.modules.product.resources.DealResource;
import com.techx.intervue.modules.product.services.interfaces.DealQueryServiceInterface;
import com.techx.intervue.modules.stall.repositories.SlotQueryRepository;
import com.techx.intervue.resources.PageResource;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * FR-125 (spec §4.5.4): deal days a customer can still order for, nearest day first, then the
 * biggest discount. "Can still order" is the rule the product pages use (a free slot before its
 * cutoff on a day the market and the stall both open, SlotQueryRepository#orderableDates), so the
 * page, its total and the cart agree. Deal days inside 14 days are few, so that check and the
 * paging run here, after one SQL read.
 */
@Service
@AllArgsConstructor
public class DealQueryService implements DealQueryServiceInterface {

    private static final int MAX_PAGE_SIZE = 50;

    private final DealQueryRepository deals;
    private final SlotQueryRepository slots;
    private final Clock clock;

    @Override
    public PageResource<DealResource> search(DealSearchCriteria criteria) {
        int page = Math.max(1, criteria.page());
        int size = Math.min(MAX_PAGE_SIZE, Math.max(1, criteria.pageSize()));
        LocalDate today = LocalDate.now(clock);
        LocalDate lastDay = today.plusDays(ProductAvailabilityResolver.LOOKAHEAD_DAYS - 1);

        List<DealRow> rows = deals.openDeals(criteria, today, lastDay);
        Map<Long, Set<LocalDate>> orderable =
                slots.orderableDates(
                        rows.stream().map(DealRow::farmerId).collect(Collectors.toSet()),
                        today,
                        lastDay,
                        LocalDateTime.now(clock));
        List<DealRow> open =
                rows.stream()
                        .filter(
                                r ->
                                        orderable
                                                .getOrDefault(r.farmerId(), Set.of())
                                                .contains(r.stockDate()))
                        .toList();
        List<DealRow> shown = open.stream().skip((long) (page - 1) * size).limit(size).toList();
        Map<Long, Map<Integer, List<String>>> markets =
                deals.marketNamesByWeekday(
                        shown.stream().map(DealRow::farmerId).collect(Collectors.toSet()));
        return new PageResource<>(
                shown.stream().map(r -> toResource(r, markets)).toList(), page, size, open.size());
    }

    private static DealResource toResource(
            DealRow r, Map<Long, Map<Integer, List<String>>> markets) {
        int weekday = r.stockDate().getDayOfWeek().getValue() % 7;
        return new DealResource(
                r.productId(),
                r.name(),
                r.imageUrl(),
                r.unit(),
                r.stallName(),
                r.farmerId(),
                markets.getOrDefault(r.farmerId(), Map.of()).getOrDefault(weekday, List.of()),
                r.stockDate().toString(),
                r.listPrice(),
                r.unitPrice(),
                r.discountPercent(),
                r.bestBefore().toString(),
                r.daysLeft(),
                r.quantityAvailable(),
                r.storageMode());
    }
}
```

- [ ] **Step 8: Viết controller công khai**

`product/controllers/DealController.java`:

```java
package com.techx.intervue.modules.product.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.product.requests.DealSearchCriteria;
import com.techx.intervue.modules.product.resources.DealResource;
import com.techx.intervue.modules.product.services.interfaces.DealQueryServiceInterface;
import com.techx.intervue.resources.ApiResource;
import com.techx.intervue.resources.PageResource;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** GET /api/v1/deals — Public (FR-125, spec §4.5.4). */
@RestController
@RequestMapping("/api/v1/deals")
@AllArgsConstructor
public class DealController extends BaseController {

    private final DealQueryServiceInterface deals;

    @GetMapping
    public ResponseEntity<ApiResource<PageResource<DealResource>>> list(
            @RequestParam(required = false) Long marketId,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Integer day,
            @RequestParam(required = false) Long productId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "12") int pageSize) {
        return ok(
                deals.search(
                        new DealSearchCriteria(
                                marketId, categoryId, day, productId, page, pageSize)),
                "");
    }
}
```

- [ ] **Step 9: Mở route công khai và phủ controller bằng handler**

`config/SecurityConfig.java`, ngay sau:

```java
                                        .requestMatchers("/api/v1/products")
                                        .permitAll()
```

thêm:

```java
                                        // FR-125: near-expiry deals can be browsed before signing
                                        // in, like the product list
                                        .requestMatchers(HttpMethod.GET, "/api/v1/deals")
                                        .permitAll()
```

`ProductExceptionHandler`: trong `assignableTypes` thêm `DealController.class` sau `ProductController.class,`.

- [ ] **Step 10: Chạy lại test**

Run: `docker compose exec -T -e MAVEN_OPTS=-Xmx256m backend ./mvnw -B test -Dtest='DealSearchIntegrationTest,DealsPublicAccessTest,DealHttpMappingTest,ProductVisibilityFilterTest' -Dsurefire.failIfNoSpecifiedTests=false -DargLine="-Xmx768m -XX:MaxMetaspaceSize=256m -XX:+UseSerialGC"`
Expected: toàn bộ PASS (`DealSearchIntegrationTest`: 5, `DealsPublicAccessTest`: 3, `DealHttpMappingTest`: 5), `BUILD SUCCESS`.

- [ ] **Step 11: Format và commit**

```bash
docker compose exec -T -e MAVEN_OPTS=-Xmx256m backend ./mvnw -B -q spotless:apply
git add backend/src/main/java/com/techx/intervue/modules/product/requests/DealSearchCriteria.java \
  backend/src/main/java/com/techx/intervue/modules/product/resources/DealResource.java \
  backend/src/main/java/com/techx/intervue/modules/product/repositories/DealQueryRepository.java \
  backend/src/main/java/com/techx/intervue/modules/product/services/interfaces/DealQueryServiceInterface.java \
  backend/src/main/java/com/techx/intervue/modules/product/services/impl/DealQueryService.java \
  backend/src/main/java/com/techx/intervue/modules/product/controllers/DealController.java \
  backend/src/main/java/com/techx/intervue/modules/product/controllers/ProductExceptionHandler.java \
  backend/src/main/java/com/techx/intervue/config/SecurityConfig.java \
  backend/src/test/java/com/techx/intervue/modules/product/services/impl/DealSearchIntegrationTest.java \
  backend/src/test/java/com/techx/intervue/modules/product/controllers/DealsPublicAccessTest.java \
  backend/src/test/java/com/techx/intervue/modules/product/controllers/DealHttpMappingTest.java
git commit -m "feat(FR-125): public near-expiry deals endpoint"
```

---

### Task 8: Preview giỏ tính theo ngày nhận của từng sạp (FR-125)

**Files:**
- Create: `backend/src/main/java/com/techx/intervue/modules/order/requests/PickupDateInput.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/order/requests/PreviewRequest.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/order/resources/PreviewItemResource.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/product/services/impl/ProductAvailabilityResolver.java` (thêm `onDate`)
- Modify: `backend/src/main/java/com/techx/intervue/modules/order/services/impl/OrderService.java` (`preview`, `previewGroup`)
- Modify: `backend/src/main/java/com/techx/intervue/modules/order/services/interfaces/OrderServiceInterface.java` (Javadoc của `preview`)
- Test: `backend/src/test/java/com/techx/intervue/modules/product/services/impl/ProductAvailabilityResolverTest.java`, `backend/src/test/java/com/techx/intervue/modules/order/services/impl/OrderServiceTest.java`

**Interfaces:**
- Consumes: Task 3 (`Availability.deal()`, `Deal`, `lookup(...)`), giai đoạn 1 (`ShelfLifePolicy.bestBefore`, `Product.getStorageMode().value()`).
- Produces: `PickupDateInput(Long farmerId, LocalDate date)`; `PreviewRequest(List<CartLine> items, List<PickupDateInput> pickupDates)` + `Map<Long, LocalDate> pickupDateByFarmer()`; `PreviewItemResource(Long productId, String name, String unit, BigDecimal unitPrice, int quantity, BigDecimal subtotal, int stockQuantity, String status, BigDecimal listPrice, Integer discountPercent, String bestBefore, String storageMode)`; `ProductAvailabilityResolver.onDate(Map<Long, BigDecimal> basePriceByProductId, LocalDate date) → Map<Long, Availability>`. JSON body của `POST /orders/preview` nhận thêm `pickupDates: [{ farmerId, date }]` (Task 13 gửi lên).

- [ ] **Step 1: Thêm test của resolver**

Trong `ProductAvailabilityResolverTest`:

```java
    /** FR-125: the cart asks for the one day the customer picked, deal included. */
    @Test
    void onDateReadsTheRowOfThatDayWithItsDeal() {
        LocalDate saturday = LocalDate.of(2026, 10, 3);
        when(templates.findByProductIdAndActiveTrue(PRODUCT_ID))
                .thenReturn(List.of(template(6, 30, null)));
        ProductDailyStock onDeal = new ProductDailyStock();
        onDeal.setQuantityAvailable(12);
        onDeal.setUnitPrice(new BigDecimal("0.60"));
        onDeal.startDeal(
                new BigDecimal("0.36"), 40, LocalDate.of(2026, 9, 25), LocalDate.of(2026, 10, 4));
        when(dailyStock.findByProductIdAndStockDate(PRODUCT_ID, saturday))
                .thenReturn(Optional.of(onDeal));

        ProductAvailabilityResolver.Availability a =
                resolver.onDate(Map.of(PRODUCT_ID, new BigDecimal("0.60")), saturday)
                        .get(PRODUCT_ID);

        assertThat(a.date()).isEqualTo(saturday);
        assertThat(a.quantity()).isEqualTo(12);
        assertThat(a.price()).isEqualByComparingTo("0.36");
        assertThat(a.deal().discountPercent()).isEqualTo(40);
    }

    @Test
    void onDateFallsBackToTheTemplateOfThatWeekday() {
        LocalDate monday = LocalDate.of(2026, 9, 28);
        when(templates.findByProductIdAndActiveTrue(PRODUCT_ID))
                .thenReturn(List.of(template(1, 20, new BigDecimal("13000"))));
        when(dailyStock.findByProductIdAndStockDate(any(), any())).thenReturn(Optional.empty());

        ProductAvailabilityResolver.Availability a =
                resolver.onDate(Map.of(PRODUCT_ID, new BigDecimal("12000")), monday)
                        .get(PRODUCT_ID);

        assertThat(a.quantity()).isEqualTo(20);
        assertThat(a.price()).isEqualByComparingTo("13000");
        assertThat(a.deal()).isNull();
    }

    /** Tuesday 29/09 has no row and no template: the product is not sold that day. */
    @Test
    void onDateLeavesOutAProductNotSoldThatDay() {
        when(templates.findByProductIdAndActiveTrue(PRODUCT_ID))
                .thenReturn(List.of(template(1, 20, null)));
        when(dailyStock.findByProductIdAndStockDate(any(), any())).thenReturn(Optional.empty());

        assertThat(
                        resolver.onDate(
                                Map.of(PRODUCT_ID, new BigDecimal("12000")),
                                LocalDate.of(2026, 9, 29)))
                .isEmpty();
    }
```

- [ ] **Step 2: Thêm test preview trong `OrderServiceTest`**

Import `com.techx.intervue.modules.order.requests.PickupDateInput`. Đổi helper `cart(...)` thành:

```java
    private static PreviewRequest cart(CartLine... lines) {
        return new PreviewRequest(List.of(lines), null);
    }
```

Thêm hằng `private static final LocalDate SATURDAY = LocalDate.of(2026, 10, 3);` cạnh `PICKUP`, rồi thêm các test sau vào mục `// ---------- preview ----------`:

```java
    /**
     * FR-125 (spec §4.5.5): a stall with a picked day is priced for exactly that day — price,
     * stock, deal and best-before — the other stall for its nearest orderable day, as before.
     */
    @Test
    void previewPricesAStallForTheDayItWillBePickedUp() {
        doReturn(
                        Map.of(
                                RAU_MUONG,
                                new ProductAvailabilityResolver.Availability(
                                        SATURDAY,
                                        12,
                                        new BigDecimal("7200"),
                                        new ProductAvailabilityResolver.Deal(
                                                new BigDecimal("12000"),
                                                40,
                                                LocalDate.of(2026, 9, 30),
                                                LocalDate.of(2026, 10, 4)))))
                .when(availability)
                .onDate(any(), eq(SATURDAY));

        List<OrderGroupPreviewResource> groups =
                service.preview(
                        CUSTOMER_ID,
                        new PreviewRequest(
                                List.of(line(RAU_MUONG, 2), line(BANH_CHUOI, 1)),
                                List.of(new PickupDateInput(FARMER_A, SATURDAY))));

        PreviewItemResource item = groupOf(groups, FARMER_A).items().getFirst();
        assertThat(item.unitPrice()).isEqualByComparingTo("7200");
        assertThat(item.stockQuantity()).isEqualTo(12);
        assertThat(item.listPrice()).isEqualByComparingTo("12000");
        assertThat(item.discountPercent()).isEqualTo(40);
        assertThat(item.bestBefore()).isEqualTo("2026-10-04");
        assertThat(groupOf(groups, FARMER_A).subtotal()).isEqualByComparingTo("14400");
        assertThat(groupOf(groups, FARMER_B).items().getFirst().unitPrice())
                .isEqualByComparingTo("35000");
        verify(availability).resolve(Map.of(BANH_CHUOI, new BigDecimal("35000")));
    }

    /** The picked day has nothing of this product: 0 left, out of stock, base price. */
    @Test
    void previewFlagsAProductNotSoldOnThePickedDay() {
        doReturn(Map.of()).when(availability).onDate(any(), eq(SATURDAY));

        List<OrderGroupPreviewResource> groups =
                service.preview(
                        CUSTOMER_ID,
                        new PreviewRequest(
                                List.of(line(RAU_MUONG, 1)),
                                List.of(new PickupDateInput(FARMER_A, SATURDAY))));

        PreviewItemResource item = groups.getFirst().items().getFirst();
        assertThat(item.stockQuantity()).isZero();
        assertThat(item.unitPrice()).isEqualByComparingTo("12000");
        assertThat(item.listPrice()).isNull();
        assertThat(item.bestBefore()).isNull();
        assertThat(groups.getFirst().problems()).containsExactly("out_of_stock");
    }

    /** A day without a deal: the fresh batch's promise, pickup day + shelf life − 1. */
    @Test
    void previewGivesTheFreshBestBeforeOnADayWithoutADeal() {
        products.get(RAU_MUONG).setShelfLifeDays(3);
        doReturn(
                        Map.of(
                                RAU_MUONG,
                                new ProductAvailabilityResolver.Availability(
                                        SATURDAY, 40, new BigDecimal("12000"))))
                .when(availability)
                .onDate(any(), eq(SATURDAY));

        PreviewItemResource item =
                service.preview(
                                CUSTOMER_ID,
                                new PreviewRequest(
                                        List.of(line(RAU_MUONG, 1)),
                                        List.of(new PickupDateInput(FARMER_A, SATURDAY))))
                        .getFirst()
                        .items()
                        .getFirst();

        assertThat(item.bestBefore()).isEqualTo("2026-10-05");
        assertThat(item.listPrice()).isNull();
        assertThat(item.discountPercent()).isNull();
        assertThat(item.storageMode()).isEqualTo("room");
    }

    /** Without pickupDates the preview is what it always was, plus the day's best-before. */
    @Test
    void previewWithoutPickupDatesKeepsTheNearestDay() {
        products.get(RAU_MUONG).setShelfLifeDays(3);

        PreviewItemResource item =
                service.preview(CUSTOMER_ID, cart(line(RAU_MUONG, 1)))
                        .getFirst()
                        .items()
                        .getFirst();

        assertThat(item.unitPrice()).isEqualByComparingTo("12000");
        assertThat(item.listPrice()).isNull();
        assertThat(item.bestBefore()).isEqualTo(PICKUP.plusDays(2).toString());
        verify(availability, never()).onDate(any(), any());
    }

    /** A day for a stall that is not in the cart changes nothing. */
    @Test
    void previewIgnoresADayForAStallNotInTheCart() {
        service.preview(
                CUSTOMER_ID,
                new PreviewRequest(
                        List.of(line(RAU_MUONG, 1)),
                        List.of(new PickupDateInput(FARMER_B, SATURDAY))));

        verify(availability, never()).onDate(any(), any());
    }
```

- [ ] **Step 3: Chạy test để thấy fail**

Run: `docker compose exec -T -e MAVEN_OPTS=-Xmx256m backend ./mvnw -B test -Dtest='ProductAvailabilityResolverTest,OrderServiceTest' -Dsurefire.failIfNoSpecifiedTests=false -DargLine="-Xmx768m -XX:MaxMetaspaceSize=256m -XX:+UseSerialGC"`
Expected: FAIL lúc biên dịch — `cannot find symbol: class PickupDateInput`, `method onDate(...)`, `method listPrice()`.

- [ ] **Step 4: Viết request và mở rộng resource**

`order/requests/PickupDateInput.java`:

```java
package com.techx.intervue.modules.order.requests;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

/** One stall's pickup day in POST /orders/preview (FR-125): price that stall's lines for it. */
public record PickupDateInput(@NotNull Long farmerId, @NotNull LocalDate date) {}
```

`order/requests/PreviewRequest.java` — thay cả file:

```java
package com.techx.intervue.modules.order.requests;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * POST /orders/preview — the cart the client sends up, for the server to split by stall (D-01).
 * {@code pickupDates} is optional (FR-125, spec §4.5.5): a stall listed there is priced for that
 * day — price, stock, deal and best-before of exactly that day — the others for their nearest
 * orderable day, as before.
 */
public record PreviewRequest(
        @NotEmpty @Valid List<CartLine> items, @Valid List<PickupDateInput> pickupDates) {

    /** Stall id → the day to price it for; a stall listed twice keeps its last entry. */
    public Map<Long, LocalDate> pickupDateByFarmer() {
        Map<Long, LocalDate> out = new HashMap<>();
        if (pickupDates != null) {
            pickupDates.forEach(p -> out.put(p.farmerId(), p.date()));
        }
        return out;
    }
}
```

`order/resources/PreviewItemResource.java` — thay cả file:

```java
package com.techx.intervue.modules.order.resources;

import java.math.BigDecimal;

/**
 * One line of a preview group. {@code status} is the real sellable state: a product that is hidden
 * or deleted shows {@code unavailable} even though its status column is still {@code available}.
 * The last four describe the day the line is priced for (FR-125): {@code listPrice} and {@code
 * discountPercent} only when that day is on a near-expiry deal; {@code bestBefore} ("yyyy-MM-dd")
 * is that deal batch's last good day, else the pickup day plus the shelf life, null when no day
 * applies; {@code storageMode} is how the product is kept.
 */
public record PreviewItemResource(
        Long productId,
        String name,
        String unit,
        BigDecimal unitPrice,
        int quantity,
        BigDecimal subtotal,
        int stockQuantity,
        String status,
        BigDecimal listPrice,
        Integer discountPercent,
        String bestBefore,
        String storageMode) {}
```

- [ ] **Step 5: Thêm `onDate` vào resolver**

Ngay sau hàm `upcoming(...)` (Task 3):

```java
    /**
     * FR-125: one given pickup day's numbers for each product — what the cart previews once the
     * customer has picked that day. Read-only like {@link #resolve}; a product not sold that day
     * (no row, no active template for its weekday) is left out.
     */
    public Map<Long, Availability> onDate(
            Map<Long, BigDecimal> basePriceByProductId, LocalDate date) {
        Map<Long, Availability> result = new HashMap<>();
        basePriceByProductId.forEach(
                (productId, basePrice) ->
                        lookup(
                                        productId,
                                        date,
                                        templates.findByProductIdAndActiveTrue(productId),
                                        basePrice)
                                .ifPresent(a -> result.put(productId, a)));
        return result;
    }
```

- [ ] **Step 6: Tính preview theo ngày trong `OrderService`**

Import `com.techx.intervue.modules.catalog.services.impl.ShelfLifePolicy`. Trong `preview(...)`, thay đoạn

```java
        Map<Long, BigDecimal> basePrices =
                products.values().stream()
                        .collect(Collectors.toMap(Product::getId, Product::getPrice));
        Map<Long, ProductAvailabilityResolver.Availability> resolved =
                availability.resolve(basePrices);
```

bằng:

```java
        // FR-125: a stall the customer has picked a day for is priced for that day; the others
        // for their nearest orderable day, as before
        Map<Long, LocalDate> pickupDates = request.pickupDateByFarmer();
        Map<Long, BigDecimal> undated = new HashMap<>();
        Map<LocalDate, Map<Long, BigDecimal>> dated = new HashMap<>();
        for (Product p : products.values()) {
            LocalDate day = pickupDates.get(p.getFarmerId());
            if (day == null) {
                undated.put(p.getId(), p.getPrice());
            } else {
                dated.computeIfAbsent(day, d -> new HashMap<>()).put(p.getId(), p.getPrice());
            }
        }
        Map<Long, ProductAvailabilityResolver.Availability> resolved =
                new HashMap<>(availability.resolve(undated));
        dated.forEach((day, prices) -> resolved.putAll(availability.onDate(prices, day)));
```

Trong `previewGroup(...)`, thay khối `items.add(new PreviewItemResource(...));` bằng:

```java
            ProductAvailabilityResolver.Deal deal = a == null ? null : a.deal();
            // The promise placing the order will copy (FR-121, FR-124): the deal batch's own last
            // good day, else the pickup day plus the shelf life
            LocalDate bestBefore =
                    a == null
                            ? null
                            : deal != null
                                    ? deal.bestBefore()
                                    : ShelfLifePolicy.bestBefore(a.date(), p.getShelfLifeDays());
            items.add(
                    new PreviewItemResource(
                            p.getId(),
                            p.getName(),
                            p.getUnit(),
                            unitPrice,
                            qty,
                            lineTotal,
                            available,
                            listed(p) ? p.getStatus().value() : UNAVAILABLE,
                            deal == null ? null : deal.listPrice(),
                            deal == null ? null : deal.discountPercent(),
                            bestBefore == null ? null : bestBefore.toString(),
                            p.getStorageMode().value()));
```

`OrderServiceInterface.preview` — thay Javadoc bằng:

```java
    /**
     * Read-only: no locking, changes nothing. Each group's issues live in {@code problems}. A stall
     * listed in {@code request.pickupDates()} is priced for that day (FR-125), the others for their
     * nearest orderable day.
     */
```

- [ ] **Step 7: Chạy lại test**

Run: `docker compose exec -T -e MAVEN_OPTS=-Xmx256m backend ./mvnw -B test -Dtest='ProductAvailabilityResolverTest,OrderServiceTest,OrderAccessTest,ReorderTest' -Dsurefire.failIfNoSpecifiedTests=false -DargLine="-Xmx768m -XX:MaxMetaspaceSize=256m -XX:+UseSerialGC"`
Expected: toàn bộ PASS (`ProductAvailabilityResolverTest`: 16), `BUILD SUCCESS`.

- [ ] **Step 8: Format và commit**

```bash
docker compose exec -T -e MAVEN_OPTS=-Xmx256m backend ./mvnw -B -q spotless:apply
git add backend/src/main/java/com/techx/intervue/modules/order/requests \
  backend/src/main/java/com/techx/intervue/modules/order/resources/PreviewItemResource.java \
  backend/src/main/java/com/techx/intervue/modules/order/services \
  backend/src/main/java/com/techx/intervue/modules/product/services/impl/ProductAvailabilityResolver.java \
  backend/src/test/java/com/techx/intervue/modules/product/services/impl/ProductAvailabilityResolverTest.java \
  backend/src/test/java/com/techx/intervue/modules/order/services/impl/OrderServiceTest.java
git commit -m "feat(FR-125): cart preview priced by each stall's pickup day"
```

---

### Task 9: Frontend nền: luật giảm giá, API client, ngày giảm giá trong giỏ (FR-124)

**Files:**
- Create: `frontend/src/lib/deals.ts`, `frontend/src/lib/deals.test.ts`
- Create: `frontend/src/api-requests/deal.requests.ts`
- Modify: `frontend/src/lib/cart.ts`, `frontend/src/lib/cart.test.ts`

**Interfaces:**
- Consumes: bảng số của Task 2; `StorageMode` (giai đoạn 1, `api-requests/shelf-life.requests.ts`).
- Produces: `lib/deals.ts`: `MIN_DISCOUNT`, `MAX_DISCOUNT`, `DISCOUNT_STEP`, `type DealProblem = 'packedInFuture' | 'fresh' | 'notNearExpiry' | 'expiredBeforePickup'`, `type DealCheck = { bestBefore: string; daysLeft: number; problem: DealProblem | null }`, `checkDeal(shelfLifeDays, packedOn, pickupDate, today): DealCheck`, `suggestedDiscount(daysLeft, shelfLifeDays): number`, `isValidDiscount(percent): boolean`, `dealPrice(listPrice, percent): number`, `todayYmd(now?: Date): string`. `api-requests/deal.requests.ts`: kiểu `DealDto`, `DealListParams`, `FarmerDealDto`, `DailyStockDto`, `DealInput`; default export `DealApi` với `list(params)`, `mine()`, `pickupDays(productId)`, `post(productId, date, input)`, `remove(productId, date)`. `CartLine.pickupDate?: string`.

- [ ] **Step 1: Viết test của luật (cùng bảng với backend)**

`frontend/src/lib/deals.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { checkDeal, dealPrice, isValidDiscount, suggestedDiscount, todayYmd, type DealProblem } from './deals';

/**
 * The same rows as backend DealPolicyTest (spec §4.5.1–4.5.2), so the dialog and the server always agree: shelf life N,
 * packed on H, pickup P, today → best-before B, days left L, problem (null = may go on a deal), suggested %.
 */
const CASES: [number, string, string, string, string, number, DealProblem | null, number][] = [
  [7, '2026-09-29', '2026-10-03', '2026-09-30', '2026-10-05', 3, null, 20],
  [21, '2026-09-14', '2026-10-03', '2026-09-30', '2026-10-04', 2, null, 40],
  [7, '2026-09-30', '2026-10-03', '2026-09-30', '2026-10-06', 4, null, 20],
  [10, '2026-09-25', '2026-10-03', '2026-09-30', '2026-10-04', 2, null, 40],
  [20, '2026-09-20', '2026-10-03', '2026-09-30', '2026-10-09', 7, null, 30],
  [20, '2026-09-21', '2026-10-03', '2026-09-30', '2026-10-10', 8, null, 20],
  [2, '2026-10-02', '2026-10-03', '2026-10-02', '2026-10-03', 1, null, 40],
  [5, '2026-09-29', '2026-10-02', '2026-09-30', '2026-10-03', 2, null, 20],
  [7, '2026-12-29', '2027-01-02', '2026-12-30', '2027-01-04', 3, null, 20],
  [1, '2026-10-02', '2026-10-03', '2026-10-02', '2026-10-02', 0, 'expiredBeforePickup', 0],
  [7, '2026-09-20', '2026-10-03', '2026-09-30', '2026-09-26', -6, 'expiredBeforePickup', 0],
  [3, '2026-10-03', '2026-10-03', '2026-10-03', '2026-10-05', 3, 'fresh', 0],
  [7, '2026-10-01', '2026-10-03', '2026-09-30', '2026-10-07', 5, 'packedInFuture', 0],
  [7, '2026-10-02', '2026-10-03', '2026-10-02', '2026-10-08', 6, 'notNearExpiry', 0],
];

describe('checkDeal', () => {
  it.each(CASES)(
    'N=%i packed %s, pickup %s, today %s',
    (shelfLife, packedOn, pickup, today, bestBefore, daysLeft, problem, suggested) => {
      expect(checkDeal(shelfLife, packedOn, pickup, today)).toEqual({ bestBefore, daysLeft, problem });
      if (problem === null) expect(suggestedDiscount(daysLeft, shelfLife)).toBe(suggested);
    },
  );
});

describe('dealPrice', () => {
  /** Half up to the cent, at least $0.01, never above the list price. */
  it.each([
    [0.6, 20, 0.48],
    [2.6, 40, 1.56],
    [10, 5, 9.5],
    [1.9, 15, 1.62],
    [0.05, 70, 0.02],
    [0.01, 70, 0.01],
    [0, 50, 0],
  ])('%d at %i%% is %d', (listPrice, percent, expected) => {
    expect(dealPrice(listPrice, percent)).toBe(expected);
  });
});

describe('isValidDiscount', () => {
  it.each([
    [5, true],
    [20, true],
    [70, true],
    [0, false],
    [4, false],
    [33, false],
    [75, false],
    [100, false],
  ])('%i%% is %s', (percent, valid) => {
    expect(isValidDiscount(percent)).toBe(valid);
  });
});

describe('todayYmd', () => {
  it('writes the device calendar day', () => {
    expect(todayYmd(new Date(2026, 8, 30, 23, 59))).toBe('2026-09-30');
  });
});
```

- [ ] **Step 2: Thêm test giỏ nhớ ngày giảm giá**

Trong `frontend/src/lib/cart.test.ts`, thêm vào `describe('Cart', …)`:

```ts
  /** FR-125: a line added from /deals remembers its pickup day, so the cart can start on it. */
  it('remembers the deal day a line was added for', () => {
    Cart.add({ ...tomato, pickupDate: '2026-10-03' }, 1);
    expect(Cart.lines()[0].pickupDate).toBe('2026-10-03');
  });

  it('keeps the deal day when the same product is added again from its own page', () => {
    Cart.add({ ...tomato, pickupDate: '2026-10-03' }, 1);
    Cart.add(tomato, 1);
    expect(Cart.lines()[0]).toMatchObject({ qty: 2, pickupDate: '2026-10-03' });
  });

  it('moves to the other day when it is added again from another deal day', () => {
    Cart.add({ ...tomato, pickupDate: '2026-10-03' }, 1);
    Cart.add({ ...tomato, pickupDate: '2026-10-04' }, 1);
    expect(Cart.lines()[0].pickupDate).toBe('2026-10-04');
  });
```

(Ba test này chạy đúng ngay cả trước khi sửa, vì `Cart.add` trộn mọi field; cái fail là `tsc -b`: `pickupDate` chưa có trong `CartLine`.)

- [ ] **Step 3: Chạy test để thấy fail**

Run: `docker compose exec -T frontend sh -c 'npx vitest run src/lib/deals.test.ts src/lib/cart.test.ts'`
Expected: FAIL, `Failed to resolve import "./deals"`. Run thêm `docker compose exec -T frontend sh -c 'npx tsc -b'` → lỗi `Object literal may only specify known properties, and 'pickupDate' does not exist in type`.

- [ ] **Step 4: Viết `lib/deals.ts`**

```ts
/**
 * FR-124 — the near-expiry deal rules (spec §4.5.1–4.5.2), the same table of cases as the backend's DealPolicy, so the
 * dialog shows what the server will accept. Dates are "yyyy-MM-dd" calendar days; day counts go through UTC so a
 * daylight-saving change never adds or drops a day. Ratios are compared in whole numbers (L/N ≤ 0.2 is 5L ≤ N) and
 * prices in whole cents, the way the server rounds.
 */
export const MIN_DISCOUNT = 5;
export const MAX_DISCOUNT = 70;
export const DISCOUNT_STEP = 5;

/** Why a batch cannot go on a deal for that day. */
export type DealProblem = 'packedInFuture' | 'fresh' | 'notNearExpiry' | 'expiredBeforePickup';

export type DealCheck = {
  /** B = H + N − 1: the batch's last good day. */
  bestBefore: string;
  /** L = B − P + 1: days the customer can still use it, the pickup day included. */
  daysLeft: number;
  /** Null when the batch may go on a deal for that day. */
  problem: DealProblem | null;
};

const DAY_MS = 86_400_000;

const toDay = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / DAY_MS;
};

const fromDay = (day: number) => new Date(day * DAY_MS).toISOString().slice(0, 10);

/** Eligible when H < P, H ≤ today and 1 ≤ L ≤ ⌈N/2⌉. */
export function checkDeal(shelfLifeDays: number, packedOn: string, pickupDate: string, today: string): DealCheck {
  const packed = toDay(packedOn);
  const pickup = toDay(pickupDate);
  const best = packed + shelfLifeDays - 1;
  const daysLeft = best - pickup + 1;
  let problem: DealProblem | null = null;
  if (packed > toDay(today)) problem = 'packedInFuture';
  else if (packed >= pickup) problem = 'fresh';
  else if (daysLeft < 1) problem = 'expiredBeforePickup';
  else if (daysLeft > Math.ceil(shelfLifeDays / 2)) problem = 'notNearExpiry';
  return { bestBefore: fromDay(best), daysLeft, problem };
}

/** 40% at one day left or L/N ≤ 0.2, 30% at L/N ≤ 0.35, else 20%. */
export function suggestedDiscount(daysLeft: number, shelfLifeDays: number): number {
  if (daysLeft <= 1 || 5 * daysLeft <= shelfLifeDays) return 40;
  if (20 * daysLeft <= 7 * shelfLifeDays) return 30;
  return 20;
}

export function isValidDiscount(percent: number): boolean {
  return Number.isInteger(percent) && percent >= MIN_DISCOUNT && percent <= MAX_DISCOUNT && percent % DISCOUNT_STEP === 0;
}

/** list × (100 − percent) / 100, half up to the cent, at least $0.01, never above the list price. */
export function dealPrice(listPrice: number, percent: number): number {
  const listCents = Math.round(listPrice * 100);
  const cents = Math.round((listCents * (100 - percent)) / 100);
  return Math.min(listCents, Math.max(1, cents)) / 100;
}

/** Today in the device's calendar, "yyyy-MM-dd". */
export function todayYmd(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
```

- [ ] **Step 5: Viết `api-requests/deal.requests.ts`**

```ts
import type { StorageMode } from '@/api-requests/shelf-life.requests';
import type { ApiResponse, PageType } from '@/types/api.types';
import { privateApi, publicApi } from '@/utils/axiosInstance';

/**
 * One product on a near-expiry deal for one pickup day (GET /deals, FR-125). Dates "yyyy-MM-dd"; `daysLeft` counts the
 * pickup day itself; `marketNames` are the markets the stall is at on that day.
 */
export type DealDto = {
  productId: number;
  name: string;
  imageUrl?: string | null;
  unit: string;
  stallName: string;
  farmerId: number;
  marketNames: string[];
  stockDate: string;
  listPrice: number;
  unitPrice: number;
  discountPercent: number;
  bestBefore: string;
  daysLeft: number;
  quantityAvailable: number;
  storageMode: StorageMode;
};

/** `day` is the pickup weekday, 0 = Sunday … 6 = Saturday, like GET /products. */
export type DealListParams = {
  marketId?: number;
  categoryId?: number;
  day?: number;
  productId?: number;
  page?: number;
  pageSize?: number;
};

/** One deal day of the Farmer's own stall (GET /farmer/deals, FR-124). */
export type FarmerDealDto = {
  productId: number;
  productName: string;
  unit: string;
  stockDate: string;
  quantityAvailable: number;
  listPrice: number;
  unitPrice: number;
  discountPercent: number;
  packedOn: string;
  bestBefore: string;
  daysLeft: number;
};

/** One pickup day's stock row; the four deal fields are null when the day has no deal. */
export type DailyStockDto = {
  productId: number;
  stockDate: string;
  quantityAvailable: number;
  unitPrice: number;
  listPrice: number | null;
  discountPercent: number | null;
  packedOn: string | null;
  bestBefore: string | null;
};

export type DealInput = { quantityAvailable: number; packedOn: string; discountPercent: number };

/** FR-124, FR-125 — near-expiry deals (docs/api-contract.md §5). */
class DealApi {
  /** Public. Deal days customers can still order for, nearest day first, then the biggest discount. */
  static list = async (params: DealListParams = {}) => {
    const response = await publicApi.get<ApiResponse<PageType<DealDto>>>('/deals', { params });
    return response.data.data;
  };

  /** Farmer — the stall's deal days from today on. */
  static mine = async () => {
    const response = await privateApi.get<ApiResponse<FarmerDealDto[]>>('/farmer/deals');
    return response.data.data;
  };

  /** Farmer — the days of the next 14 a customer can still order this product for, each with its numbers. */
  static pickupDays = async (productId: number) => {
    const response = await privateApi.get<ApiResponse<DailyStockDto[]>>(`/farmer/products/${productId}/daily-stock`);
    return response.data.data;
  };

  /**
   * Farmer — puts one pickup day on a deal. 400 `NOT_NEAR_EXPIRY` / `EXPIRED_BEFORE_PICKUP` / `VALIDATION_ERROR`
   * (`discountPercent`, `packedOn`, `quantityAvailable`); 409 `DATE_NOT_ORDERABLE`.
   */
  static post = async (productId: number, date: string, input: DealInput) => {
    const response = await privateApi.put<ApiResponse<DailyStockDto>>(
      `/farmer/products/${productId}/daily-stock/${date}/deal`,
      input,
    );
    return response.data.data;
  };

  /** Farmer — back to the normal price; the quantity stays. */
  static remove = async (productId: number, date: string) => {
    await privateApi.delete<ApiResponse<null>>(`/farmer/products/${productId}/daily-stock/${date}/deal`);
  };
}

export default DealApi;
```

- [ ] **Step 6: Thêm `pickupDate` vào `CartLine`**

Trong `frontend/src/lib/cart.ts`, thêm vào type `CartLine` (sau `stallName: string;`):

```ts
  /** "yyyy-MM-dd": the pickup day of the near-expiry deal this line was added from (FR-125), if any. */
  pickupDate?: string;
```

- [ ] **Step 7: Chạy lại test**

Run: `docker compose exec -T frontend sh -c 'npx vitest run src/lib/deals.test.ts src/lib/cart.test.ts'`
Expected: `Test Files 2 passed`, 40 test PASS (30 + 10).

- [ ] **Step 8: Kiểm và commit**

```bash
docker compose exec -T frontend sh -c 'npx prettier --write src/lib/deals.ts src/lib/deals.test.ts src/api-requests/deal.requests.ts src/lib/cart.ts src/lib/cart.test.ts && npx tsc -b && npx eslint src'
git add frontend/src/lib/deals.ts frontend/src/lib/deals.test.ts frontend/src/api-requests/deal.requests.ts \
  frontend/src/lib/cart.ts frontend/src/lib/cart.test.ts
git commit -m "feat(FR-124): frontend deal rules, deals API client and the cart's deal day"
```

---

### Task 10: Dialog giảm giá và khối "On sale" ở trang Farmer Products (FR-124)

**Files:**
- Modify: `frontend/src/components/ui/dialog.tsx`; Test: `frontend/src/components/ui/dialog.test.tsx` (mới)
- Create: `frontend/src/pages/farmer/Products/ActiveDeals.tsx`
- Create: `frontend/src/pages/farmer/Products/DealDialog.tsx`; Test: `frontend/src/pages/farmer/Products/DealDialog.test.tsx`
- Modify: `frontend/src/pages/farmer/Products/index.tsx`; Test: `frontend/src/pages/farmer/Products/index.test.tsx` (mới)
- Modify: `frontend/src/locales/<10 ngôn ngữ>/FarmerProducts.json`

**Interfaces:**
- Consumes: Task 9 (`DealApi.mine/pickupDays/post/remove`, `FarmerDealDto`, `DailyStockDto`, `checkDeal`, `suggestedDiscount`, `dealPrice`, `todayYmd`, `MIN_DISCOUNT`, `MAX_DISCOUNT`, `DISCOUNT_STEP`); có sẵn: `Dialog`, `Field`, `SelectField`, `Table`, `LoadError`, `DataState`, `useRequest`, `stockDay`, `perUnit`, `units`, `ProductType.nextDate/shelfLifeDays/hidden/status`.
- Produces: `<ActiveDeals version={number} />` (đọc lại khi `version` đổi); `<DealDialog product={ProductType} onClose={() => void} onPosted={(row: DailyStockDto) => void} />`; `Dialog` gắn tiêu đề bằng `useId()` (Ruling 15).

- [ ] **Step 1: Viết test của `Dialog`**

`frontend/src/components/ui/dialog.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Dialog } from './dialog';

beforeEach(() => {
  // jsdom has no modal dialogs
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.open = true;
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.open = false;
  });
});

describe('Dialog', () => {
  /** Two dialogs on one page (Farmer Products: delete and deal): each is named by its own title. */
  it('is named by its own title when another dialog is on the page', () => {
    render(
      <>
        <Dialog open={false} title="Delete Trứng vịt?" tone="danger" onClose={vi.fn()} actions={null}>
          <p>Gone for good.</p>
        </Dialog>
        <Dialog open title="Near-expiry deal · Trứng vịt" onClose={vi.fn()} actions={null}>
          <p>Pick a day.</p>
        </Dialog>
      </>,
    );

    expect(screen.getByRole('dialog', { name: 'Near-expiry deal · Trứng vịt' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Viết test của dialog giảm giá**

`frontend/src/pages/farmer/Products/DealDialog.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DealDialog from './DealDialog';
import DealApi, { type DailyStockDto } from '@/api-requests/deal.requests';
import type { ProductType } from '@/types/product.types';

vi.mock('@/api-requests/deal.requests', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/api-requests/deal.requests')>();
  return { ...real, default: { pickupDays: vi.fn(), post: vi.fn() } };
});

/** Spec §4.5.3 example: 7 days of shelf life, $0.60 a kg. */
const tomato: ProductType = {
  id: 7,
  name: 'Cà chua bi',
  stall: 'Nông trại Hoa Đà Lạt',
  marketName: '',
  category: 'Fruits',
  price: 0.6,
  unit: 'kg',
  stock: 30,
  status: 'available',
  shelfLifeDays: 7,
  nextDate: '2026-10-01',
};

const day = (stockDate: string, quantityAvailable = 30): DailyStockDto => ({
  productId: 7,
  stockDate,
  quantityAvailable,
  unitPrice: 0.6,
  listPrice: null,
  discountPercent: null,
  packedOn: null,
  bestBefore: null,
});

const renderDialog = (onPosted = vi.fn()) =>
  render(<DealDialog product={tomato} onClose={vi.fn()} onPosted={onPosted} />);

beforeEach(() => {
  // Today is Wed 30/09/2026; only Date is faked, so user-event's timers still run
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 8, 30, 10, 0));
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.open = true;
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.open = false;
  });
  vi.mocked(DealApi.pickupDays).mockResolvedValue([day('2026-10-01'), day('2026-10-03')]);
  vi.mocked(DealApi.post).mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('DealDialog', () => {
  /** Harvested 29/09, picked up Sat 03/10 → good until end of Mon 05/10, 3 days left, 20% suggested. */
  it('works out until when the batch stays good and suggests the discount', async () => {
    renderDialog();
    await userEvent.selectOptions(await screen.findByLabelText('Pickup day'), '2026-10-03');
    fireEvent.change(screen.getByLabelText('Harvested or packed on'), { target: { value: '2026-09-29' } });

    expect(
      screen.getByText('Good until end of Mon 05/10 · the customer has 3 days (shelf life 7 days)'),
    ).toBeInTheDocument();
    expect(screen.getByText('Suggested 20%')).toBeInTheDocument();
    expect(screen.getByText('20%')).toBeInTheDocument();
    expect(screen.getByText('$0.60 / kg → $0.48 / kg')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Post deal' })).toBeEnabled();
  });

  /** Packed today for pickup tomorrow: 6 of 7 days still left, so the deal is refused, with the reason. */
  it('keeps posting closed for produce with more than half its shelf life left, and says why', async () => {
    renderDialog();
    fireEvent.change(await screen.findByLabelText('Harvested or packed on'), { target: { value: '2026-09-30' } });

    expect(
      screen.getByText(
        'More than half of its 7-day shelf life is left on that day. Deals are only for produce past half its shelf life.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Post deal' })).toBeDisabled();
  });

  it('asks for the packing date before it can post', async () => {
    renderDialog();

    expect(await screen.findByText('Enter the harvest or packing date.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Post deal' })).toBeDisabled();
  });

  it('posts the quantity, the packing date and the discount for the chosen day', async () => {
    const onPosted = vi.fn();
    const saved: DailyStockDto = {
      ...day('2026-10-03', 12),
      unitPrice: 0.45,
      listPrice: 0.6,
      discountPercent: 25,
      packedOn: '2026-09-29',
      bestBefore: '2026-10-05',
    };
    vi.mocked(DealApi.post).mockResolvedValue(saved);
    renderDialog(onPosted);

    await userEvent.selectOptions(await screen.findByLabelText('Pickup day'), '2026-10-03');
    const quantity = screen.getByLabelText('Quantity you bring (kg)');
    await userEvent.clear(quantity);
    await userEvent.type(quantity, '12');
    fireEvent.change(screen.getByLabelText('Harvested or packed on'), { target: { value: '2026-09-29' } });
    await userEvent.click(screen.getByRole('button', { name: 'Raise the discount' }));
    await userEvent.click(screen.getByRole('button', { name: 'Post deal' }));

    expect(DealApi.post).toHaveBeenCalledWith(7, '2026-10-03', {
      quantityAvailable: 12,
      packedOn: '2026-09-29',
      discountPercent: 25,
    });
    expect(onPosted).toHaveBeenCalledWith(saved);
  });

  it('says so when no pickup day is open in the next 14 days', async () => {
    vi.mocked(DealApi.pickupDays).mockResolvedValue([]);
    renderDialog();

    expect(await screen.findByText('No pickup day open')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Post deal' })).toBeDisabled();
  });
});
```

- [ ] **Step 3: Viết test của trang**

`frontend/src/pages/farmer/Products/index.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FarmerProductsPage from './index';
import DealApi, { type FarmerDealDto } from '@/api-requests/deal.requests';
import ProductApi from '@/api-requests/product.requests';
import type { ProductType } from '@/types/product.types';

vi.mock('@/api-requests/product.requests', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/api-requests/product.requests')>();
  return { ...real, default: { mine: vi.fn(), setStatus: vi.fn(), remove: vi.fn() } };
});
vi.mock('@/api-requests/deal.requests', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/api-requests/deal.requests')>();
  return { ...real, default: { mine: vi.fn(), remove: vi.fn(), pickupDays: vi.fn(), post: vi.fn() } };
});

const product = (id: number, name: string, nextDate?: string): ProductType => ({
  id,
  name,
  stall: 'Trứng gà Khánh Hòa',
  marketName: '',
  category: 'Eggs and dairy',
  price: 1.6,
  unit: 'tray',
  stock: 20,
  status: 'available',
  shelfLifeDays: 10,
  nextDate,
  nextLeft: nextDate ? 20 : undefined,
  nextReserved: nextDate ? 0 : undefined,
});

const onSale: FarmerDealDto = {
  productId: 1,
  productName: 'Trứng vịt',
  unit: 'tray',
  stockDate: '2026-10-03',
  quantityAvailable: 10,
  listPrice: 1.6,
  unitPrice: 1.28,
  discountPercent: 20,
  packedOn: '2026-09-27',
  bestBefore: '2026-10-06',
  daysLeft: 4,
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <FarmerProductsPage />
    </MemoryRouter>,
  );

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.open = true;
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.open = false;
  });
  vi.mocked(ProductApi.mine).mockResolvedValue([product(1, 'Trứng vịt', '2026-10-03'), product(2, 'Trứng gà ác')]);
  vi.mocked(DealApi.mine).mockResolvedValue([onSale]);
  vi.mocked(DealApi.remove).mockResolvedValue(undefined);
  vi.mocked(DealApi.pickupDays).mockResolvedValue([]);
});

describe('FarmerProductsPage — near-expiry deals', () => {
  it('shows the days on sale and takes one off', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'On sale (1)' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Remove deal' }));

    expect(DealApi.remove).toHaveBeenCalledWith(1, '2026-10-03');
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'On sale (1)' })).not.toBeInTheDocument());
  });

  it('offers a deal only on products customers can still order', async () => {
    renderPage();

    await screen.findByRole('link', { name: 'Trứng gà ác' });
    expect(screen.getAllByRole('button', { name: 'Near-expiry deal' })).toHaveLength(1);
  });

  it('opens the deal dialog for that product', async () => {
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Near-expiry deal' }));

    expect(await screen.findByRole('dialog', { name: 'Near-expiry deal · Trứng vịt' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Chạy 3 test để thấy fail**

Run: `docker compose exec -T frontend sh -c 'npx vitest run src/components/ui/dialog.test.tsx src/pages/farmer/Products'`
Expected: FAIL — `dialog.test.tsx` không tìm thấy dialog tên "Near-expiry deal · Trứng vịt" (id `dialog-title` trỏ về tiêu đề của dialog xoá); `DealDialog.test.tsx` báo `Failed to resolve import "./DealDialog"`; `index.test.tsx` không thấy heading "On sale (1)".

- [ ] **Step 5: Sửa `Dialog` (Ruling 15)**

Trong `frontend/src/components/ui/dialog.tsx`: import thêm `useId` (`import { useEffect, useId, useRef, type ReactNode } from 'react';`); trong thân `Dialog`, ngay sau `const ref = useRef<HTMLDialogElement>(null);` thêm

```tsx
  // One id per dialog: a page with two dialogs (Farmer Products: delete and deal) must name each by its own title
  const titleId = useId();
```

rồi đổi `aria-labelledby="dialog-title"` thành `aria-labelledby={titleId}` và `<h2 id="dialog-title" className="ml-dialog-title">` thành `<h2 id={titleId} className="ml-dialog-title">`.

- [ ] **Step 6: Thêm chữ vào `FarmerProducts.json` (10 ngôn ngữ)**

Thêm ở cấp gốc của `frontend/src/locales/en/FarmerProducts.json` (sau khối `"empty"`):

```json
  "dealAction": "Near-expiry deal",
  "deals": {
    "title_one": "On sale ({{count}})",
    "title_other": "On sale ({{count}})",
    "col": {
      "product": "Product",
      "day": "Pickup day",
      "discount": "Discount",
      "left": "Left",
      "until": "Good until"
    },
    "off": "−{{percent}}%",
    "price": "{{price}}, was {{was}}",
    "until_one": "End of {{day}} ({{count}} day)",
    "until_other": "End of {{day}} ({{count}} days)",
    "remove": "Remove deal",
    "removed": "Deal removed",
    "removedText": "{{name}} is back to its usual price for {{day}}.",
    "noun": "your deals"
  },
  "dealDialog": {
    "title": "Near-expiry deal · {{name}}",
    "day": "Pickup day",
    "qty": "Quantity you bring ({{unit}})",
    "onSale": "{{qty}} on sale for that day now",
    "packedOn": "Harvested or packed on",
    "result_one": "Good until end of {{until}} · the customer has {{count}} day (shelf life {{shelfLife}} days)",
    "result_other": "Good until end of {{until}} · the customer has {{count}} days (shelf life {{shelfLife}} days)",
    "discount": "Discount",
    "less": "Lower the discount",
    "more": "Raise the discount",
    "suggested": "Suggested {{percent}}%",
    "price": "Price",
    "priceLine": "{{from}} → {{to}}",
    "post": "Post deal",
    "posting": "Posting…",
    "posted": "Deal posted",
    "postedText": "{{name}} is {{percent}}% off for {{day}}.",
    "loadingDays": "Loading pickup days…",
    "daysNoun": "pickup days",
    "noDays": {
      "title": "No pickup day open",
      "text": "Customers cannot order this product for any of the next 14 days. Check your weekly stock and pickup slots."
    },
    "why": {
      "packedOn": "Enter the harvest or packing date.",
      "qty": "Bring at least 1.",
      "packedInFuture": "The harvest or packing date cannot be after today.",
      "fresh": "Picked on the pickup day counts as fresh, so it needs no deal.",
      "notNearExpiry": "More than half of its {{shelfLife}}-day shelf life is left on that day. Deals are only for produce past half its shelf life.",
      "expiredBeforePickup": "This batch is no longer good on that day, so it cannot be sold for it."
    }
  }
```

Bản `vi`:

```json
  "dealAction": "Giảm giá sắp hết hạn",
  "deals": {
    "title_one": "Đang giảm giá ({{count}})",
    "title_other": "Đang giảm giá ({{count}})",
    "col": {
      "product": "Sản phẩm",
      "day": "Ngày nhận",
      "discount": "Mức giảm",
      "left": "Còn lại",
      "until": "Dùng tốt đến"
    },
    "off": "−{{percent}}%",
    "price": "{{price}}, giá gốc {{was}}",
    "until_one": "Hết {{day}} ({{count}} ngày)",
    "until_other": "Hết {{day}} ({{count}} ngày)",
    "remove": "Bỏ giảm giá",
    "removed": "Đã bỏ giảm giá",
    "removedText": "{{name}} về lại giá thường cho {{day}}.",
    "noun": "các mục giảm giá của bạn"
  },
  "dealDialog": {
    "title": "Giảm giá sắp hết hạn · {{name}}",
    "day": "Ngày nhận",
    "qty": "Số lượng mang tới ({{unit}})",
    "onSale": "hiện đang mở bán {{qty}}",
    "packedOn": "Thu hoạch hoặc đóng gói ngày",
    "result_one": "Dùng tốt đến hết {{until}} · khách còn {{count}} ngày (hạn {{shelfLife}} ngày)",
    "result_other": "Dùng tốt đến hết {{until}} · khách còn {{count}} ngày (hạn {{shelfLife}} ngày)",
    "discount": "Giảm",
    "less": "Giảm bớt mức giảm",
    "more": "Tăng mức giảm",
    "suggested": "gợi ý {{percent}}%",
    "price": "Giá",
    "priceLine": "{{from}} → {{to}}",
    "post": "Đăng giảm giá",
    "posting": "Đang đăng…",
    "posted": "Đã đăng giảm giá",
    "postedText": "{{name}} giảm {{percent}}% cho {{day}}.",
    "loadingDays": "Đang tải các ngày nhận…",
    "daysNoun": "các ngày nhận",
    "noDays": {
      "title": "Chưa có ngày nhận nào mở",
      "text": "Trong 14 ngày tới khách chưa đặt được sản phẩm này cho ngày nào. Hãy xem lại lịch tồn kho tuần và các khung giờ nhận."
    },
    "why": {
      "packedOn": "Nhập ngày thu hoạch hoặc đóng gói.",
      "qty": "Mang tới ít nhất 1.",
      "packedInFuture": "Ngày thu hoạch hoặc đóng gói không được sau hôm nay.",
      "fresh": "Hàng hái đúng ngày nhận là hàng tươi, không cần giảm giá.",
      "notNearExpiry": "Tới ngày đó hàng vẫn còn hơn nửa hạn dùng {{shelfLife}} ngày. Mục này chỉ dành cho hàng đã qua nửa hạn.",
      "expiredBeforePickup": "Hàng hết hạn trước ngày nhận, nên không bán được cho ngày đó."
    }
  }
```

8 ngôn ngữ còn lại (`zh ja ko fr es de th id`): dịch từ bản `en`, giữ nguyên các key và `{{…}}`.

- [ ] **Step 7: Viết `ActiveDeals.tsx`**

`frontend/src/pages/farmer/Products/ActiveDeals.tsx`:

```tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import DealApi, { type FarmerDealDto } from '@/api-requests/deal.requests';
import { stockDay } from '@/components/stockDay';
import { Button } from '@/components/ui/button';
import { LoadError } from '@/components/ui/data-state';
import { Table, type TableColumn } from '@/components/ui/table';
import useRequest from '@/hooks/useRequest';
import { perUnit, units } from '@/lib/format';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';

type ActiveDealsProps = {
  /** Bumped by the page after a deal is posted, so the list is read again. */
  version: number;
};

const keyOf = (d: FarmerDealDto) => `${d.productId}@${d.stockDate}`;

/**
 * FR-124 — the stall's deal days from today on, each with its "Remove deal" button (spec §4.5.3). Hidden while there is
 * none; the last list stays on screen while it is read again after a new deal, so the block does not blink.
 */
const ActiveDeals = ({ version }: ActiveDealsProps) => {
  const { t } = useTranslation('FarmerProducts');
  const { t: tc } = useTranslation();
  const { state, retry, mutate } = useRequest(`my-deals:${version}`, () => DealApi.mine());
  const [last, setLast] = useState<FarmerDealDto[] | null>(null);
  if (state.kind === 'ready' && state.data !== last) setLast(state.data);
  const [busy, setBusy] = useState<string | null>(null);

  const remove = async (d: FarmerDealDto) => {
    setBusy(keyOf(d));
    try {
      await DealApi.remove(d.productId, d.stockDate);
      mutate((list) => list.filter((x) => keyOf(x) !== keyOf(d)));
      Notification.success({
        title: t('deals.removed'),
        text: t('deals.removedText', { name: d.productName, day: stockDay(d.stockDate) ?? d.stockDate }),
      });
    } catch (error) {
      Notification.error({ text: Helper.getErrorMessage(error, tc('errors.network')) });
    } finally {
      setBusy(null);
    }
  };

  if (state.kind === 'error') return <LoadError noun={t('deals.noun')} onRetry={retry} />;
  const deals = state.kind === 'ready' ? state.data : (last ?? []);
  if (deals.length === 0) return null;

  const columns: TableColumn<FarmerDealDto>[] = [
    { key: 'p', label: t('deals.col.product'), render: (d) => <b>{d.productName}</b> },
    { key: 'd', label: t('deals.col.day'), render: (d) => stockDay(d.stockDate) ?? d.stockDate },
    {
      key: 'o',
      label: t('deals.col.discount'),
      align: 'num',
      render: (d) => (
        <>
          {t('deals.off', { percent: d.discountPercent })}
          <span className="text-ink-muted text-small block font-normal">
            {t('deals.price', { price: perUnit(d.unitPrice, d.unit), was: perUnit(d.listPrice, d.unit) })}
          </span>
        </>
      ),
    },
    { key: 'l', label: t('deals.col.left'), align: 'num', render: (d) => units(d.quantityAvailable, d.unit) },
    {
      key: 'u',
      label: t('deals.col.until'),
      render: (d) => t('deals.until', { day: stockDay(d.bestBefore) ?? d.bestBefore, count: d.daysLeft }),
    },
    {
      key: 'a',
      label: '',
      align: 'actions',
      render: (d) => (
        <Button variant="secondary" size="sm" disabled={busy === keyOf(d)} onClick={() => void remove(d)}>
          {t('deals.remove')}
        </Button>
      ),
    },
  ];

  return (
    <section aria-labelledby="farmer-deals-title" className="flex flex-col gap-3">
      <h2 id="farmer-deals-title" className="text-h3">
        {t('deals.title', { count: deals.length })}
      </h2>
      <Table columns={columns} rows={deals} />
    </section>
  );
};

export default ActiveDeals;
```

- [ ] **Step 8: Viết `DealDialog.tsx`**

`frontend/src/pages/farmer/Products/DealDialog.tsx`:

```tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import DealApi, { type DailyStockDto } from '@/api-requests/deal.requests';
import { stockDay } from '@/components/stockDay';
import { Button } from '@/components/ui/button';
import { DataState, LoadError } from '@/components/ui/data-state';
import { Dialog } from '@/components/ui/dialog';
import { Field, SelectField } from '@/components/ui/input';
import useRequest from '@/hooks/useRequest';
import {
  checkDeal,
  dealPrice,
  DISCOUNT_STEP,
  MAX_DISCOUNT,
  MIN_DISCOUNT,
  suggestedDiscount,
  todayYmd,
} from '@/lib/deals';
import { perUnit, units } from '@/lib/format';
import type { ProductType } from '@/types/product.types';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';

type DealDialogProps = {
  product: ProductType;
  onClose: () => void;
  /** The day's stock row as saved, so the page can update what it shows for that day. */
  onPosted: (row: DailyStockDto) => void;
};

/** Shown until there is a suggestion (no packing date yet) and the Farmer has not picked a discount. */
const FALLBACK_DISCOUNT = 20;
const NO_DAYS: DailyStockDto[] = [];

/**
 * FR-124 — puts one pickup day of a product on a near-expiry deal (spec §4.5.3). The rules are checked as the Farmer
 * types (lib/deals.ts, the same table as the server's DealPolicy), and the server checks them again. Each field starts
 * from the chosen day's own numbers, its current deal included, until the Farmer changes it.
 */
const DealDialog = ({ product, onClose, onPosted }: DealDialogProps) => {
  const { t } = useTranslation('FarmerProducts');
  const { t: tc } = useTranslation();
  const { state, retry } = useRequest(`deal-days:${product.id}`, () => DealApi.pickupDays(product.id));
  const days = state.kind === 'ready' ? state.data : NO_DAYS;
  const [pickedDay, setPickedDay] = useState<string | null>(null);
  const [qtyText, setQtyText] = useState<string | null>(null);
  const [packedOn, setPackedOn] = useState<string | null>(null);
  const [percent, setPercent] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const day = days.find((d) => d.stockDate === pickedDay) ?? days[0];
  const today = todayYmd();
  const shelfLife = product.shelfLifeDays ?? 0;
  const qty = qtyText ?? String(day?.quantityAvailable ?? '');
  const packed = packedOn ?? day?.packedOn ?? '';
  const check = day && packed ? checkDeal(shelfLife, packed, day.stockDate, today) : null;
  const suggested = check && check.problem === null ? suggestedDiscount(check.daysLeft, shelfLife) : null;
  const pct = percent ?? day?.discountPercent ?? suggested ?? FALLBACK_DISCOUNT;
  const listPrice = day ? (day.listPrice ?? day.unitPrice) : 0;
  const quantity = Number(qty);
  const dayLabel = day ? (stockDay(day.stockDate) ?? day.stockDate) : '';

  // Why "Post deal" is off, shown next to it
  const why = !packed
    ? t('dealDialog.why.packedOn')
    : check?.problem
      ? t(`dealDialog.why.${check.problem}`, { shelfLife })
      : !Number.isInteger(quantity) || quantity < 1
        ? t('dealDialog.why.qty')
        : null;

  const pickDay = (value: string) => {
    setPickedDay(value);
    setQtyText(null);
    setPackedOn(null);
    setPercent(null);
  };

  const post = async () => {
    if (!day || why) return;
    setSaving(true);
    try {
      const saved = await DealApi.post(product.id, day.stockDate, {
        quantityAvailable: quantity,
        packedOn: packed,
        discountPercent: pct,
      });
      Notification.success({
        title: t('dealDialog.posted'),
        text: t('dealDialog.postedText', { name: product.name, percent: pct, day: dayLabel }),
      });
      onPosted(saved);
      onClose();
    } catch (error) {
      Notification.error({ text: Helper.getErrorMessage(error, tc('errors.network')) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open
      title={t('dealDialog.title', { name: product.name })}
      onClose={onClose}
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>
            {tc('actions.cancel')}
          </Button>
          <Button onClick={() => void post()} disabled={state.kind !== 'ready' || !day || why !== null || saving}>
            {saving ? t('dealDialog.posting') : t('dealDialog.post')}
          </Button>
        </>
      }
    >
      {state.kind === 'loading' ? (
        <p role="status" className="text-ink-muted">
          {t('dealDialog.loadingDays')}
        </p>
      ) : state.kind === 'error' ? (
        <LoadError noun={t('dealDialog.daysNoun')} onRetry={retry} />
      ) : !day ? (
        <DataState title={t('dealDialog.noDays.title')} text={t('dealDialog.noDays.text')} />
      ) : (
        <div className="flex flex-col gap-4">
          <SelectField
            id="deal-day"
            label={t('dealDialog.day')}
            value={day.stockDate}
            onChange={(e) => pickDay(e.target.value)}
            options={days.map((d) => ({ value: d.stockDate, label: stockDay(d.stockDate) ?? d.stockDate }))}
          />
          <Field
            id="deal-qty"
            label={t('dealDialog.qty', { unit: product.unit })}
            type="number"
            inputMode="numeric"
            min={1}
            value={qty}
            onChange={(e) => setQtyText(e.target.value)}
            hint={t('dealDialog.onSale', { qty: units(day.quantityAvailable, product.unit, product.plural) })}
          />
          <Field
            id="deal-packed"
            label={t('dealDialog.packedOn')}
            type="date"
            max={today}
            value={packed}
            onChange={(e) => setPackedOn(e.target.value)}
          />
          {check && check.problem === null && (
            <p className="text-body">
              {t('dealDialog.result', {
                until: stockDay(check.bestBefore) ?? check.bestBefore,
                count: check.daysLeft,
                shelfLife,
              })}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-small font-bold">{t('dealDialog.discount')}</span>
            <Button
              variant="secondary"
              size="sm"
              aria-label={t('dealDialog.less')}
              disabled={pct <= MIN_DISCOUNT}
              onClick={() => setPercent(pct - DISCOUNT_STEP)}
            >
              −
            </Button>
            <output aria-live="polite" className="min-w-12 text-center font-bold tabular-nums">
              {`${pct}%`}
            </output>
            <Button
              variant="secondary"
              size="sm"
              aria-label={t('dealDialog.more')}
              disabled={pct >= MAX_DISCOUNT}
              onClick={() => setPercent(pct + DISCOUNT_STEP)}
            >
              +
            </Button>
            {suggested !== null && (
              <span className="text-small text-ink-muted">{t('dealDialog.suggested', { percent: suggested })}</span>
            )}
          </div>
          <p className="text-body flex flex-wrap items-baseline gap-2">
            <span className="text-small font-bold">{t('dealDialog.price')}</span>
            <span>
              {t('dealDialog.priceLine', {
                from: perUnit(listPrice, product.unit),
                to: perUnit(dealPrice(listPrice, pct), product.unit),
              })}
            </span>
          </p>
          {why && <p className="text-small text-danger">{why}</p>}
        </div>
      )}
    </Dialog>
  );
};

export default DealDialog;
```

- [ ] **Step 9: Gắn vào trang Products**

Trong `frontend/src/pages/farmer/Products/index.tsx`:

1. Import `ActiveDeals from './ActiveDeals'` và `DealDialog from './DealDialog'`.
2. Ngay sau `const [busyId, setBusyId] = useState<number | null>(null);` thêm:

```tsx
  // FR-124: the product whose near-expiry deal dialog is open, and a counter that makes "On sale" read again
  const [dealTarget, setDealTarget] = useState<ProductType | null>(null);
  const [dealsVersion, setDealsVersion] = useState(0);
```

3. Trong cột `key: 'a'`, thay `render` bằng (nút đứng trước Sửa/Xoá — Ruling 5):

```tsx
      render: (p) => (
        <div className="flex justify-end gap-2">
          {p.status === 'available' && !p.hidden && p.nextDate && (
            <Button variant="secondary" size="sm" onClick={() => setDealTarget(p)}>
              {t('dealAction')}
            </Button>
          )}
          <ButtonLink variant="secondary" size="sm" to={`/farmer/products/${p.id}/edit`}>
            {t('edit')}
          </ButtonLink>
          <Button variant="danger" size="sm" onClick={() => setDeleteTarget(p)} disabled={busyId === p.id}>
            {t('delete')}
          </Button>
        </div>
      ),
```

4. Ngay sau khối tiêu đề (`<div className="flex flex-wrap items-end justify-between gap-4">…<ButtonLink to="/farmer/products/new">{t('add')}</ButtonLink></div>`) thêm `<ActiveDeals version={dealsVersion} />`.
5. Ngay trước `<Dialog open={deleteTarget !== null}` thêm:

```tsx
      {dealTarget && (
        <DealDialog
          product={dealTarget}
          onClose={() => setDealTarget(null)}
          onPosted={(row) => {
            setDealsVersion((v) => v + 1);
            // The deal sets what is left for its day; the row's "next pickup day" number follows when it is that day
            mutate((list) =>
              list.map((r) =>
                r.id === row.productId && r.nextDate === row.stockDate ? { ...r, nextLeft: row.quantityAvailable } : r,
              ),
            );
          }}
        />
      )}
```

- [ ] **Step 10: Chạy lại test**

Run: `docker compose exec -T frontend sh -c 'npx vitest run src/components/ui/dialog.test.tsx src/pages/farmer/Products'`
Expected: `Test Files 3 passed`, 9 test PASS.

- [ ] **Step 11: Kiểm và commit**

```bash
docker compose exec -T frontend sh -c 'npx prettier --write src/components/ui/dialog.tsx src/components/ui/dialog.test.tsx src/pages/farmer/Products src/locales && npx tsc -b && npx eslint src'
git add frontend/src/components/ui/dialog.tsx frontend/src/components/ui/dialog.test.tsx \
  frontend/src/pages/farmer/Products frontend/src/locales/*/FarmerProducts.json
git commit -m "feat(FR-124): near-expiry deal dialog and on-sale block for farmers"
```

Kiểm tay ở 375 / 768 / 1440 px: bảng "On sale" cuộn ngang trong khung của nó như bảng sản phẩm, dialog không tràn màn hình ở 375 px.

---

### Task 11: Trang `/deals`, link trên thanh điều hướng và chân trang (FR-125)

**Files:**
- Create: `frontend/src/components/DealCard.tsx`
- Create: `frontend/src/pages/public/Deals/index.tsx`; Test: `frontend/src/pages/public/Deals/index.test.tsx`
- Create: `frontend/src/locales/<10 ngôn ngữ>/Deals.json`
- Modify: `frontend/src/i18n/resources.ts`, `frontend/src/App.tsx`, `frontend/src/constants/nav.ts`, `frontend/src/components/Footer.tsx`
- Modify: `frontend/src/locales/<10 ngôn ngữ>/common.json` (`nav.deals`, `footer.deals`, khối `deal`)
- Test: `frontend/src/components/Header/Header.test.tsx` (thêm test), `frontend/src/components/Footer.test.tsx` (mới)

**Interfaces:**
- Consumes: Task 9 (`DealApi.list`, `DealDto`, `DealListParams`, `CartLine.pickupDate`); có sẵn `CatalogApi.listCategories/listMarkets`, `PriceTag` (`was`), `Chip`, `SelectField`, `Pagination`, `MarketCardSkeleton`, `DataState`, `LoadError`.
- Produces: `<DealCard deal={DealDto} />` (Task 12 dùng lại); route `/deals` → `DealsPage`; namespace `Deals`; key chung `deal.off`, `deal.pickupLine`, `deal.added.title`, `deal.added.text` (Task 12 dùng lại).

- [ ] **Step 1: Viết test của trang**

`frontend/src/pages/public/Deals/index.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DealsPage from './index';
import CatalogApi from '@/api-requests/catalog.requests';
import DealApi, { type DealDto } from '@/api-requests/deal.requests';
import { Cart } from '@/lib/cart';
import { money } from '@/lib/format';

vi.mock('@/api-requests/deal.requests', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/api-requests/deal.requests')>();
  return { ...real, default: { list: vi.fn() } };
});
vi.mock('@/api-requests/catalog.requests', () => ({ default: { listCategories: vi.fn(), listMarkets: vi.fn() } }));

/** Spec §4.5.4 card: tomato, 20% off, picked up Sat 03/10, good until end of Mon 05/10, 12 kg left. */
const tomato: DealDto = {
  productId: 7,
  name: 'Cà chua bi',
  imageUrl: null,
  unit: 'kg',
  stallName: 'Nông trại Hoa Đà Lạt',
  farmerId: 3,
  marketNames: ['Chợ Bà Chiểu'],
  stockDate: '2026-10-03',
  listPrice: 0.6,
  unitPrice: 0.48,
  discountPercent: 20,
  bestBefore: '2026-10-05',
  daysLeft: 3,
  quantityAvailable: 12,
  storageMode: 'room',
};

const page = (items: DealDto[]) => ({ items, page: 1, pageSize: 12, total: items.length });

const renderPage = () =>
  render(
    <MemoryRouter>
      <DealsPage />
    </MemoryRouter>,
  );

beforeEach(() => {
  localStorage.clear();
  Cart.clear();
  vi.mocked(CatalogApi.listCategories).mockResolvedValue([{ id: 2, name: 'Fruits' }] as never);
  vi.mocked(CatalogApi.listMarkets).mockResolvedValue({ items: [], page: 1, pageSize: 50, total: 0 } as never);
  vi.mocked(DealApi.list).mockReset();
});

describe('DealsPage', () => {
  it('shows a loading state first', () => {
    vi.mocked(DealApi.list).mockReturnValue(new Promise(() => undefined));
    renderPage();

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows each deal with both prices, its pickup day and until when it stays good', async () => {
    vi.mocked(DealApi.list).mockResolvedValue(page([tomato]));
    renderPage();

    expect(await screen.findByRole('link', { name: 'Cà chua bi' })).toHaveAttribute('href', '/products/7');
    expect(screen.getByText('−20%')).toBeInTheDocument();
    expect(screen.getByText(money(0.48))).toBeInTheDocument();
    expect(screen.getByText(money(0.6))).toBeInTheDocument();
    expect(screen.getByText('Pick up Sat 03/10 · good until end of Mon 05/10 · 12 kg left')).toBeInTheDocument();
    expect(screen.getByText('Nông trại Hoa Đà Lạt · Chợ Bà Chiểu')).toBeInTheDocument();
  });

  it('adds a deal to the cart for its pickup day', async () => {
    vi.mocked(DealApi.list).mockResolvedValue(page([tomato]));
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Add to cart' }));

    expect(Cart.lines()).toEqual([
      expect.objectContaining({ productId: 7, price: 0.48, max: 12, farmerId: 3, pickupDate: '2026-10-03' }),
    ]);
  });

  it('says there is no deal today', async () => {
    vi.mocked(DealApi.list).mockResolvedValue(page([]));
    renderPage();

    expect(await screen.findByText('No deals today')).toBeInTheDocument();
  });

  it('offers to try again when the deals do not load', async () => {
    vi.mocked(DealApi.list).mockRejectedValue(new Error('network'));
    renderPage();

    expect(await screen.findByText('We could not load the deals')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('asks the server for one category', async () => {
    vi.mocked(DealApi.list).mockResolvedValue(page([tomato]));
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Fruits' }));

    await waitFor(() =>
      expect(DealApi.list).toHaveBeenLastCalledWith({ categoryId: 2, marketId: undefined, page: 1, pageSize: 12 }),
    );
  });
});
```

- [ ] **Step 2: Viết test của link**

Trong `frontend/src/components/Header/Header.test.tsx`, thêm vào `describe('Header', …)`:

```tsx
  /** FR-125: the near-expiry deals page is one click from every page. */
  it('links the deals page from the main menu', () => {
    renderHeader();

    expect(screen.getByRole('link', { name: 'Deals' })).toHaveAttribute('href', '/deals');
  });
```

`frontend/src/components/Footer.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import Footer from './Footer';

vi.mock('@/hooks/useSession', () => ({ default: () => ({ user: null, isLoggedIn: false }) }));

describe('Footer', () => {
  /** FR-125: the deals page sits under Shop, next to the other ways to browse. */
  it('links the near-expiry deals page', () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Near-expiry deals' })).toHaveAttribute('href', '/deals');
  });
});
```

- [ ] **Step 3: Chạy test để thấy fail**

Run: `docker compose exec -T frontend sh -c 'npx vitest run src/pages/public/Deals src/components/Header/Header.test.tsx src/components/Footer.test.tsx'`
Expected: FAIL — `Failed to resolve import "./index"` ở trang Deals; Header và Footer không có link "Deals" / "Near-expiry deals".

- [ ] **Step 4: Thêm chữ**

`frontend/src/locales/en/common.json`: trong khối `"nav"` thêm `"deals": "Deals"` (sau `"products"`); trong khối `"footer"` thêm `"deals": "Near-expiry deals"` (sau `"inSeason"`); thêm khối cấp gốc (sau khối `"price"`):

```json
  "deal": {
    "off": "−{{percent}}%",
    "pickupLine": "Pick up {{day}} · good until end of {{until}} · {{qty}} left",
    "added": {
      "title": "Added to cart",
      "text": "{{name}} at the deal price, for pickup on {{day}}."
    }
  },
```

Bản `vi`: `"deals": "Giảm giá"` trong `nav`, `"deals": "Giảm giá sắp hết hạn"` trong `footer`, và:

```json
  "deal": {
    "off": "−{{percent}}%",
    "pickupLine": "Nhận {{day}} · dùng tốt đến hết {{until}} · còn {{qty}}",
    "added": {
      "title": "Đã thêm vào giỏ",
      "text": "{{name}} với giá giảm, nhận ngày {{day}}."
    }
  },
```

`frontend/src/locales/en/Deals.json` (file mới):

```json
{
  "title": "Near-expiry deals",
  "intro": "Produce past half its shelf life, sold cheaper by the stall. Each deal is for one pickup day, and each card says until when it stays good.",
  "filters": {
    "category": "Category",
    "allCategories": "All",
    "market": "Market",
    "allMarkets": "All markets"
  },
  "clear": "Clear filters",
  "noun": "deals",
  "empty": {
    "title": "No deals today",
    "text": "Stalls post a deal when a batch is past half its shelf life. Check again tomorrow, or browse all products.",
    "browse": "Browse products"
  },
  "emptyFiltered": {
    "title": "No deals match these filters",
    "text": "Try another category or market."
  },
  "pager": {
    "showing": "Showing {{from}}–{{to}} of {{total}}",
    "count_one": "{{count}} deal",
    "count_other": "{{count}} deals"
  }
}
```

`frontend/src/locales/vi/Deals.json`:

```json
{
  "title": "Giảm giá sắp hết hạn",
  "intro": "Nông sản đã qua nửa hạn dùng, được sạp bán rẻ hơn. Mỗi mục giảm giá dành cho một ngày nhận, và mỗi thẻ ghi rõ hàng còn dùng tốt đến ngày nào.",
  "filters": {
    "category": "Danh mục",
    "allCategories": "Tất cả",
    "market": "Chợ",
    "allMarkets": "Tất cả các chợ"
  },
  "clear": "Xoá bộ lọc",
  "noun": "hàng giảm giá",
  "empty": {
    "title": "Hôm nay chưa có hàng giảm giá",
    "text": "Sạp đăng giảm giá khi một lô hàng đã qua nửa hạn dùng. Hãy xem lại vào ngày mai, hoặc xem tất cả sản phẩm.",
    "browse": "Xem sản phẩm"
  },
  "emptyFiltered": {
    "title": "Không có mục giảm giá nào khớp bộ lọc",
    "text": "Thử danh mục hoặc chợ khác."
  },
  "pager": {
    "showing": "Đang hiện {{from}}–{{to}} trong {{total}}",
    "count_one": "{{count}} mục giảm giá",
    "count_other": "{{count}} mục giảm giá"
  }
}
```

8 ngôn ngữ còn lại: tạo `Deals.json` và thêm 3 chỗ của `common.json`, dịch từ bản `en`.

`frontend/src/i18n/resources.ts`: sau `import products from '@/locales/en/Products.json';` thêm `import deals from '@/locales/en/Deals.json';`; trong `en`, sau `Products: products,` thêm `Deals: deals,`.

- [ ] **Step 5: Viết `DealCard`**

`frontend/src/components/DealCard.tsx`:

```tsx
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { DealDto } from '@/api-requests/deal.requests';
import { Cart } from '@/lib/cart';
import { units } from '@/lib/format';
import Notification from '@/utils/notification';
import PriceTag from './PriceTag';
import { stockDay } from './stockDay';
import { Button } from './ui/button';
import { Card } from './ui/card';

/**
 * FR-125 — one product on a near-expiry deal for one pickup day (spec §4.5.4): both prices, the day, until when it
 * stays good and what is left. Adding it to the cart remembers the day, so the cart starts on it (§4.5.5).
 */
const DealCard = ({ deal }: { deal: DealDto }) => {
  const { t } = useTranslation();
  const day = stockDay(deal.stockDate) ?? deal.stockDate;
  const until = stockDay(deal.bestBefore) ?? deal.bestBefore;

  const add = () => {
    Cart.add({
      productId: deal.productId,
      name: deal.name,
      unit: deal.unit,
      price: deal.unitPrice,
      max: deal.quantityAvailable,
      farmerId: deal.farmerId,
      stallName: deal.stallName,
      pickupDate: deal.stockDate,
    });
    Notification.success({ title: t('deal.added.title'), text: t('deal.added.text', { name: deal.name, day }) });
  };

  return (
    <Card as="article" className="flex flex-col overflow-hidden">
      <div className="border-line bg-surface-sunken relative mx-3 mt-3 aspect-4/3 overflow-hidden rounded-sm border">
        {deal.imageUrl && <img src={deal.imageUrl} alt="" className="size-full object-cover" />}
        <span className="font-hand bg-danger text-on-danger absolute top-3 right-3 rounded-sm px-2 py-1 text-[19px] leading-none">
          {t('deal.off', { percent: deal.discountPercent })}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-[17px] leading-tight font-bold">
          <Link
            to={`/products/${deal.productId}`}
            className="text-inherit no-underline hover:underline hover:underline-offset-3"
          >
            {deal.name}
          </Link>
        </h3>
        <p className="text-small text-ink-muted">{[deal.stallName, ...deal.marketNames].join(' · ')}</p>
        <div className="my-1">
          <PriceTag amount={deal.unitPrice} unit={deal.unit} was={deal.listPrice} />
        </div>
        <p className="text-small">
          {t('deal.pickupLine', { day, until, qty: units(deal.quantityAvailable, deal.unit) })}
        </p>
        <Button size="sm" className="mt-auto" onClick={add}>
          {t('product.addToCart')}
        </Button>
      </div>
    </Card>
  );
};

export default DealCard;
```

- [ ] **Step 6: Viết trang `/deals`**

`frontend/src/pages/public/Deals/index.tsx`:

```tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import CatalogApi from '@/api-requests/catalog.requests';
import DealApi, { type DealListParams } from '@/api-requests/deal.requests';
import DealCard from '@/components/DealCard';
import MarketCardSkeleton from '@/components/MarketCardSkeleton';
import { ButtonLink } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { DataState, LoadError } from '@/components/ui/data-state';
import { SelectField } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import useRequest from '@/hooks/useRequest';
import type { MarketType } from '@/types/market.types';

const PAGE_SIZE = 12;
/** The market filter's "no filter" value. */
const ALL_MARKETS = 'all';
const NO_MARKETS: MarketType[] = [];

/**
 * FR-125 — near-expiry deals (spec §4.5.4): one card per product and pickup day customers can still order for,
 * nearest day first, then the biggest discount. Filtering and paging happen on the server.
 */
const DealsPage = () => {
  const { t } = useTranslation('Deals');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [marketFilter, setMarketFilter] = useState(ALL_MARKETS);
  const [page, setPage] = useState(1);

  const { state: categoriesLoad } = useRequest('categories', () => CatalogApi.listCategories());
  const { state: marketsLoad } = useRequest('markets', () =>
    CatalogApi.listMarkets({ pageSize: 50 }).then((result) => result.items),
  );
  const categories = categoriesLoad.kind === 'ready' ? categoriesLoad.data : [];
  const markets = marketsLoad.kind === 'ready' ? marketsLoad.data : NO_MARKETS;

  const params: DealListParams = {
    categoryId: categoryId ?? undefined,
    marketId: marketFilter === ALL_MARKETS ? undefined : Number(marketFilter),
    page,
    pageSize: PAGE_SIZE,
  };
  const { state: load, retry } = useRequest(`deals:${JSON.stringify(params)}`, () => DealApi.list(params));
  const items = load.kind === 'ready' ? load.data.items : [];
  const total = load.kind === 'ready' ? load.data.total : 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const from = (currentPage - 1) * PAGE_SIZE;
  const filtered = categoryId !== null || marketFilter !== ALL_MARKETS;

  const pickCategory = (id: number | null) => {
    setCategoryId(id);
    setPage(1);
  };
  const clear = () => {
    setCategoryId(null);
    setMarketFilter(ALL_MARKETS);
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-hand md:text-display text-h1">{t('title')}</h1>
        <p className="text-body-lg max-w-155">{t('intro')}</p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-small font-bold">{t('filters.category')}</span>
          <div className="flex flex-wrap gap-2">
            <Chip pressed={categoryId === null} onClick={() => pickCategory(null)}>
              {t('filters.allCategories')}
            </Chip>
            {categories.map((c) => (
              <Chip key={c.id} pressed={categoryId === c.id} onClick={() => pickCategory(c.id)}>
                {c.name}
              </Chip>
            ))}
          </div>
        </div>
        <SelectField
          id="deals-market"
          label={t('filters.market')}
          value={marketFilter}
          onChange={(e) => {
            setMarketFilter(e.target.value);
            setPage(1);
          }}
          options={[
            { value: ALL_MARKETS, label: t('filters.allMarkets') },
            ...markets.map((m) => ({ value: String(m.id), label: m.name })),
          ]}
        />
      </div>

      {load.kind === 'loading' ? (
        <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          <MarketCardSkeleton count={3} />
        </div>
      ) : load.kind === 'error' ? (
        <LoadError noun={t('noun')} onRetry={retry} />
      ) : items.length ? (
        <>
          <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((d) => (
              <DealCard key={`${d.productId}@${d.stockDate}`} deal={d} />
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            {pages > 1 ? (
              <>
                <span className="text-small text-ink-muted">
                  {t('pager.showing', { from: from + 1, to: from + items.length, total })}
                </span>
                <Pagination page={currentPage} pages={pages} onChange={setPage} />
              </>
            ) : (
              <span className="text-small text-ink-muted">{t('pager.count', { count: total })}</span>
            )}
          </div>
        </>
      ) : filtered ? (
        <DataState
          title={t('emptyFiltered.title')}
          text={t('emptyFiltered.text')}
          action={<Chip onClick={clear}>{t('clear')}</Chip>}
        />
      ) : (
        <DataState
          fill
          title={t('empty.title')}
          text={t('empty.text')}
          action={
            <ButtonLink to="/products" variant="secondary" size="sm">
              {t('empty.browse')}
            </ButtonLink>
          }
        />
      )}
    </div>
  );
};

export default DealsPage;
```

- [ ] **Step 7: Route, thanh điều hướng, chân trang**

`frontend/src/App.tsx`: import `DealsPage from './pages/public/Deals';` (cạnh `ProductsPage`), và ngay sau `<Route path="products" element={<ProductsPage />} />` thêm `<Route path="deals" element={<DealsPage />} />`.

`frontend/src/constants/nav.ts`: trong cả `GUEST_NAV` và `CUSTOMER_NAV`, ngay sau `{ label: 'products', to: '/products' },` thêm `{ label: 'deals', to: '/deals' },` (drawer trên điện thoại dùng cùng danh sách).

`frontend/src/components/Footer.tsx`: trong cột `shop`, ngay sau `{ label: 'inSeason', to: '/products' },` thêm `{ label: 'deals', to: '/deals' },`.

- [ ] **Step 8: Chạy lại test**

Run: `docker compose exec -T frontend sh -c 'npx vitest run src/pages/public/Deals src/components/Header/Header.test.tsx src/components/Footer.test.tsx'`
Expected: `Test Files 3 passed`, 10 test PASS (6 + 3 + 1).

- [ ] **Step 9: Kiểm và commit**

```bash
docker compose exec -T frontend sh -c 'npx prettier --write src/components/DealCard.tsx src/pages/public/Deals src/components/Header/Header.test.tsx src/components/Footer.tsx src/components/Footer.test.tsx src/constants/nav.ts src/App.tsx src/i18n/resources.ts src/locales && npx tsc -b && npx eslint src'
git add frontend/src/components/DealCard.tsx frontend/src/pages/public/Deals frontend/src/components/Header/Header.test.tsx \
  frontend/src/components/Footer.tsx frontend/src/components/Footer.test.tsx frontend/src/constants/nav.ts \
  frontend/src/App.tsx frontend/src/i18n/resources.ts frontend/src/locales/*/Deals.json frontend/src/locales/*/common.json
git commit -m "feat(FR-125): near-expiry deals page with nav and footer links"
```

Kiểm tay ở 375 / 768 / 1440 px: lưới 1 / 2 / 3 cột, bộ lọc xuống dòng không tràn ngang; thanh điều hướng desktop còn đủ chỗ (drawer dùng ở dưới `lg`).

---

### Task 12: Dải giảm giá ở trang chủ và khối "Đang giảm giá" ở trang sản phẩm (FR-125)

**Files:**
- Create: `frontend/src/pages/public/Home/DealsStrip.tsx`; Test: `frontend/src/pages/public/Home/DealsStrip.test.tsx`
- Modify: `frontend/src/pages/public/Home/index.tsx`
- Create: `frontend/src/pages/public/ProductDetail/ProductDeals.tsx`; Test: `frontend/src/pages/public/ProductDetail/ProductDeals.test.tsx`
- Modify: `frontend/src/pages/public/ProductDetail/index.tsx` (sau thẻ giá, cột phải)
- Modify: `frontend/src/locales/<10 ngôn ngữ>/Home.json`, `frontend/src/locales/<10 ngôn ngữ>/ProductDetail.json`

**Interfaces:**
- Consumes: Task 9 (`DealApi.list`, `DealDto`, `CartLine.pickupDate`), Task 11 (`DealCard`, key chung `deal.added.*`).
- Produces: `<DealsStrip />` (tối đa 4 thẻ, ẩn khi không có — Ruling 14); `<ProductDeals productId={number} />`.

- [ ] **Step 1: Viết test của dải trang chủ**

`frontend/src/pages/public/Home/DealsStrip.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DealsStrip from './DealsStrip';
import DealApi, { type DealDto } from '@/api-requests/deal.requests';

vi.mock('@/api-requests/deal.requests', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/api-requests/deal.requests')>();
  return { ...real, default: { list: vi.fn() } };
});

const deal = (productId: number): DealDto => ({
  productId,
  name: `Deal ${productId}`,
  imageUrl: null,
  unit: 'kg',
  stallName: 'Trứng gà Khánh Hòa',
  farmerId: 8,
  marketNames: ['Chợ Tân Định'],
  stockDate: '2026-10-03',
  listPrice: 1.6,
  unitPrice: 1.28,
  discountPercent: 20,
  bestBefore: '2026-10-06',
  daysLeft: 4,
  quantityAvailable: 10,
  storageMode: 'room',
});

const renderStrip = () =>
  render(
    <MemoryRouter>
      <DealsStrip />
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.mocked(DealApi.list).mockReset();
});

describe('DealsStrip', () => {
  it('shows up to four deals and links to all of them', async () => {
    vi.mocked(DealApi.list).mockResolvedValue({ items: [deal(1), deal(2)], page: 1, pageSize: 4, total: 2 });
    renderStrip();

    expect(await screen.findByRole('heading', { name: 'Near-expiry deals' })).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'All deals' })).toHaveAttribute('href', '/deals');
    expect(DealApi.list).toHaveBeenCalledWith({ pageSize: 4 });
  });

  /** Only a teaser: nothing at all when there is no deal (the /deals page has the full states). */
  it('shows nothing when there is no deal', async () => {
    vi.mocked(DealApi.list).mockResolvedValue({ items: [], page: 1, pageSize: 4, total: 0 });
    const { container } = renderStrip();

    await waitFor(() => expect(DealApi.list).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Viết test của khối ở trang sản phẩm**

`frontend/src/pages/public/ProductDetail/ProductDeals.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProductDeals from './ProductDeals';
import DealApi, { type DealDto } from '@/api-requests/deal.requests';
import { Cart } from '@/lib/cart';

vi.mock('@/api-requests/deal.requests', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/api-requests/deal.requests')>();
  return { ...real, default: { list: vi.fn() } };
});

const tomato: DealDto = {
  productId: 7,
  name: 'Cà chua bi',
  imageUrl: null,
  unit: 'kg',
  stallName: 'Nông trại Hoa Đà Lạt',
  farmerId: 3,
  marketNames: ['Chợ Bà Chiểu'],
  stockDate: '2026-10-03',
  listPrice: 0.6,
  unitPrice: 0.48,
  discountPercent: 20,
  bestBefore: '2026-10-05',
  daysLeft: 3,
  quantityAvailable: 12,
  storageMode: 'room',
};

// LoadError links to /feedback, so the block renders inside a router
const renderDeals = () =>
  render(
    <MemoryRouter>
      <ProductDeals productId={7} />
    </MemoryRouter>,
  );

beforeEach(() => {
  localStorage.clear();
  Cart.clear();
  vi.mocked(DealApi.list).mockReset();
});

describe('ProductDeals', () => {
  it('lists the pickup days on sale and adds one with its day', async () => {
    vi.mocked(DealApi.list).mockResolvedValue({ items: [tomato], page: 1, pageSize: 14, total: 1 });
    renderDeals();

    expect(await screen.findByRole('heading', { name: 'On sale for these pickup days' })).toBeInTheDocument();
    expect(screen.getByText('Sat 03/10 · −20%')).toBeInTheDocument();
    expect(
      screen.getByText('$0.48 / kg, was $0.60 / kg · good until end of Mon 05/10 · 12 kg left'),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Add for Sat 03/10' }));

    expect(DealApi.list).toHaveBeenCalledWith({ productId: 7, pageSize: 14 });
    expect(Cart.lines()).toEqual([
      expect.objectContaining({ productId: 7, price: 0.48, max: 12, pickupDate: '2026-10-03' }),
    ]);
  });

  it('shows nothing when the product is not on sale', async () => {
    vi.mocked(DealApi.list).mockResolvedValue({ items: [], page: 1, pageSize: 14, total: 0 });
    const { container } = renderDeals();

    await waitFor(() => expect(DealApi.list).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('offers to try again when the deals do not load', async () => {
    vi.mocked(DealApi.list).mockRejectedValue(new Error('network'));
    renderDeals();

    expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Chạy test để thấy fail**

Run: `docker compose exec -T frontend sh -c 'npx vitest run src/pages/public/Home/DealsStrip.test.tsx src/pages/public/ProductDetail/ProductDeals.test.tsx'`
Expected: FAIL, `Failed to resolve import "./DealsStrip"` và `"./ProductDeals"`.

- [ ] **Step 4: Thêm chữ**

`frontend/src/locales/en/Home.json`, khối cấp gốc mới (sau `"fresh"`):

```json
  "deals": {
    "title": "Near-expiry deals",
    "note": "Cheaper because they are past half their shelf life. Each card says until when they stay good.",
    "all": "All deals"
  },
```

Bản `vi`:

```json
  "deals": {
    "title": "Giảm giá sắp hết hạn",
    "note": "Rẻ hơn vì đã qua nửa hạn dùng. Mỗi thẻ ghi rõ hàng còn dùng tốt đến ngày nào.",
    "all": "Xem tất cả"
  },
```

`frontend/src/locales/en/ProductDetail.json`, khối cấp gốc mới (sau `"payNote"`):

```json
  "deals": {
    "title": "On sale for these pickup days",
    "day": "{{day}} · −{{percent}}%",
    "detail": "{{price}}, was {{was}} · good until end of {{until}} · {{qty}} left",
    "add": "Add for {{day}}",
    "noun": "deals"
  },
```

Bản `vi`:

```json
  "deals": {
    "title": "Đang giảm giá theo ngày nhận",
    "day": "{{day}} · −{{percent}}%",
    "detail": "{{price}}, giá gốc {{was}} · dùng tốt đến hết {{until}} · còn {{qty}}",
    "add": "Thêm cho {{day}}",
    "noun": "hàng giảm giá"
  },
```

8 ngôn ngữ còn lại: dịch từ bản `en` cho cả hai file.

- [ ] **Step 5: Viết `DealsStrip.tsx` và gắn vào trang chủ**

`frontend/src/pages/public/Home/DealsStrip.tsx`:

```tsx
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import DealApi from '@/api-requests/deal.requests';
import DealCard from '@/components/DealCard';
import useRequest from '@/hooks/useRequest';

/** Four cards fill one row on desktop. */
const STRIP_SIZE = 4;

/**
 * FR-125 (spec §4.5.4): a strip of near-expiry deals on the home page, only when there are some. A teaser, so it shows
 * nothing while it loads, fails or finds none; the /deals page carries the full loading / empty / error states.
 */
const DealsStrip = () => {
  const { t } = useTranslation('Home');
  const { state } = useRequest('home-deals', () => DealApi.list({ pageSize: STRIP_SIZE }));
  if (state.kind !== 'ready' || state.data.items.length === 0) return null;

  return (
    <section aria-labelledby="home-deals-title" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="home-deals-title" className="text-h2">
            {t('deals.title')}
          </h2>
          <p className="text-small text-ink-muted">{t('deals.note')}</p>
        </div>
        <Link to="/deals" className="text-brand underline">
          {t('deals.all')}
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
        {state.data.items.map((d) => (
          <DealCard key={`${d.productId}@${d.stockDate}`} deal={d} />
        ))}
      </div>
    </section>
  );
};

export default DealsStrip;
```

`frontend/src/pages/public/Home/index.tsx`: import `DealsStrip from './DealsStrip'`, rồi đặt `<DealsStrip />` giữa khối `NearbyMarkets` và khối `FreshProducts`:

```tsx
      {marketsLoad.kind === 'error' ? (
        <LoadError noun={t('nearby.noun')} onRetry={retryMarkets} />
      ) : (
        <NearbyMarkets markets={markets.slice(0, 4)} loading={marketsLoad.kind === 'loading'} />
      )}
      <DealsStrip />
      {freshLoad.kind === 'error' ? (
```

- [ ] **Step 6: Viết `ProductDeals.tsx` và gắn vào trang sản phẩm**

`frontend/src/pages/public/ProductDetail/ProductDeals.tsx`:

```tsx
import { useTranslation } from 'react-i18next';
import DealApi, { type DealDto } from '@/api-requests/deal.requests';
import { stockDay } from '@/components/stockDay';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadError } from '@/components/ui/data-state';
import useRequest from '@/hooks/useRequest';
import { Cart } from '@/lib/cart';
import { perUnit, units } from '@/lib/format';
import Notification from '@/utils/notification';

/** Every pickup day of the 14-day window fits. */
const MAX_DAYS = 14;

/**
 * FR-125 (spec §4.5.4): the pickup days this product is on a near-expiry deal, each added to the cart with its own
 * day. Nothing while it loads or when there is none, since the price block above already sells the product.
 */
const ProductDeals = ({ productId }: { productId: number }) => {
  const { t } = useTranslation('ProductDetail');
  const { t: tc } = useTranslation();
  const { state, retry } = useRequest(`product-deals:${productId}`, () =>
    DealApi.list({ productId, pageSize: MAX_DAYS }),
  );
  if (state.kind === 'loading') return null;
  if (state.kind === 'error') return <LoadError noun={t('deals.noun')} onRetry={retry} />;
  const deals = state.data.items;
  if (deals.length === 0) return null;

  const add = (d: DealDto, day: string) => {
    Cart.add({
      productId: d.productId,
      name: d.name,
      unit: d.unit,
      price: d.unitPrice,
      max: d.quantityAvailable,
      farmerId: d.farmerId,
      stallName: d.stallName,
      pickupDate: d.stockDate,
    });
    Notification.success({ title: tc('deal.added.title'), text: tc('deal.added.text', { name: d.name, day }) });
  };

  return (
    <Card className="flex flex-col gap-3 p-6">
      <h2 className="text-h3">{t('deals.title')}</h2>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {deals.map((d) => {
          const day = stockDay(d.stockDate) ?? d.stockDate;
          return (
            <li
              key={d.stockDate}
              className="border-line flex flex-wrap items-center justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0"
            >
              <span className="min-w-0">
                <b className="block">{t('deals.day', { day, percent: d.discountPercent })}</b>
                <span className="text-small text-ink-muted">
                  {t('deals.detail', {
                    price: perUnit(d.unitPrice, d.unit),
                    was: perUnit(d.listPrice, d.unit),
                    until: stockDay(d.bestBefore) ?? d.bestBefore,
                    qty: units(d.quantityAvailable, d.unit),
                  })}
                </span>
              </span>
              <Button variant="secondary" size="sm" onClick={() => add(d, day)}>
                {t('deals.add', { day })}
              </Button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
};

export default ProductDeals;
```

`frontend/src/pages/public/ProductDetail/index.tsx`: import `ProductDeals from './ProductDeals'`; trong cột phải, ngay sau thẻ giá

```tsx
            <p className="text-small text-ink-muted">{t('payNote', { price: perUnit(Number(p.price), p.unit) })}</p>
          </Card>
```

thêm `<ProductDeals productId={p.id} />` (trước `</div>` của cột).

- [ ] **Step 7: Chạy lại test**

Run: `docker compose exec -T frontend sh -c 'npx vitest run src/pages/public/Home/DealsStrip.test.tsx src/pages/public/ProductDetail/ProductDeals.test.tsx'`
Expected: `Test Files 2 passed`, 5 test PASS.

- [ ] **Step 8: Kiểm và commit**

```bash
docker compose exec -T frontend sh -c 'npx prettier --write src/pages/public/Home src/pages/public/ProductDetail src/locales && npx tsc -b && npx eslint src'
git add frontend/src/pages/public/Home frontend/src/pages/public/ProductDetail \
  frontend/src/locales/*/Home.json frontend/src/locales/*/ProductDetail.json
git commit -m "feat(FR-125): deals strip on the home page and deal days on the product page"
```

Kiểm tay ở 375 / 768 / 1440 px: dải trang chủ 1 / 2 / 4 cột; dòng của khối "Đang giảm giá" xuống hàng, nút không tràn.

---

### Task 13: Giỏ hàng nhớ ngày giảm giá và tính mỗi sạp theo ngày nhận (FR-125)

**Files:**
- Modify: `frontend/src/api-requests/order.requests.ts`
- Modify: `frontend/src/components/CartGroup.tsx`
- Create: `frontend/src/pages/customer/Cart/DealNote.tsx`
- Modify: `frontend/src/pages/customer/Cart/index.tsx`; Test: `frontend/src/pages/customer/Cart/index.test.tsx`
- Modify: `frontend/src/locales/<10 ngôn ngữ>/CustomerCart.json`

**Interfaces:**
- Consumes: Task 8 (`pickupDates` của preview, field mới của món), Task 9 (`CartLine.pickupDate`); giai đoạn 1 (`BestBeforeLine`, `StorageMode`, key chung `bestBefore.line`, `storageMode.*`).
- Produces: `type PickupDateInput = { farmerId: number; date: string }`; `OrderApi.preview(items: CartLineInput[], pickupDates?: PickupDateInput[])`; `PreviewItemDto` thêm `listPrice?`, `discountPercent?`, `bestBefore?`, `storageMode?`; `CartLineType` thêm `listPrice?: number | null` và `note?: ReactNode`; `<DealNote item dealDay chosenDay />`.

- [ ] **Step 1: Viết test của giỏ**

Trong `frontend/src/pages/customer/Cart/index.test.tsx`:

1. Import thêm `waitFor` từ `@testing-library/react` và `type PreviewItemDto` từ `@/api-requests/order.requests`.
2. Trong test có sẵn `places the order for the day shown as selected when only a time is picked`, đổi `expect(place).toBeEnabled();` thành `await waitFor(() => expect(place).toBeEnabled());` — chọn khung giờ bây giờ ghi ngày cho sạp và tính lại giá (Ruling 13), nút Đặt mở lại khi giá mới về.
3. Thêm helper và 3 test:

```tsx
const renderCart = () =>
  render(
    <MemoryRouter>
      <CustomerCartPage />
    </MemoryRouter>,
  );

/** One stall, one line of 2 bunches of water spinach, with the numbers of the day it is priced for. */
const priced = (item: Partial<PreviewItemDto>) => [
  {
    farmerId: 1,
    stallName: 'Vườn Út Hiền',
    marketId: 1,
    marketName: 'Chợ Bà Chiểu',
    orderCutoffHours: 12,
    items: [
      {
        productId: 1,
        name: 'Rau muống',
        unit: 'bunch',
        unitPrice: 0.5,
        quantity: 2,
        subtotal: 2 * (item.unitPrice ?? 0.5),
        stockQuantity: 30,
        status: 'available',
        ...item,
      },
    ],
    subtotal: 2 * (item.unitPrice ?? 0.5),
    problems: [],
    markets: [{ marketId: 1, marketName: 'Chợ Bà Chiểu' }],
  },
];

const addFromDeals = (pickupDate: string) => {
  Cart.clear();
  Cart.add(
    { productId: 1, name: 'Rau muống', unit: 'bunch', price: 0.3, max: 12, farmerId: 1, stallName: 'Vườn Út Hiền', pickupDate },
    2,
  );
};

describe('CustomerCartPage — near-expiry deals (FR-125)', () => {
  /** Spec §4.5.5: the stall's day picker starts on the deal day, and the preview prices that day. */
  it('starts a stall on the day its line was added for, priced for that day', async () => {
    addFromDeals('2026-10-04');
    vi.mocked(OrderApi.preview).mockResolvedValue(
      priced({ unitPrice: 0.3, listPrice: 0.5, discountPercent: 40, bestBefore: '2026-10-05', storageMode: 'chilled' }) as never,
    );
    renderCart();

    expect(await screen.findByRole('radio', { name: /04\/10/ })).toBeChecked();
    expect(OrderApi.preview).toHaveBeenCalledWith([{ productId: 1, quantity: 2 }], [{ farmerId: 1, date: '2026-10-04' }]);
    expect(await screen.findByText('−40% near-expiry deal')).toBeInTheDocument();
    expect(screen.getByText('Good until end of Mon 05/10 · Fridge 0–5 °C')).toBeInTheDocument();
  });

  it('re-prices a stall when another day is picked and says the deal is for its own day', async () => {
    addFromDeals('2026-10-04');
    vi.mocked(OrderApi.preview).mockImplementation(async (_items, dates) =>
      (dates?.[0]?.date === '2026-10-03'
        ? priced({ unitPrice: 0.5 })
        : priced({ unitPrice: 0.3, listPrice: 0.5, discountPercent: 40, bestBefore: '2026-10-05' })) as never,
    );
    renderCart();

    await userEvent.click(await screen.findByRole('radio', { name: /03\/10/ }));

    await waitFor(() =>
      expect(OrderApi.preview).toHaveBeenLastCalledWith(
        [{ productId: 1, quantity: 2 }],
        [{ farmerId: 1, date: '2026-10-03' }],
      ),
    );
    expect(await screen.findByText('The deal only applies to Sun 04/10.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('−40% near-expiry deal')).not.toBeInTheDocument());
  });

  /** The deal day has no pickup time left: the picker falls back to the first day and says why. */
  it('says so when the deal day can no longer be picked', async () => {
    addFromDeals('2026-10-10');
    renderCart();

    expect(
      await screen.findByText('The deal day Sat 10/10 can no longer be picked. Choose a day to see its price.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /03\/10/ })).toBeChecked();
  });
});
```

- [ ] **Step 2: Chạy test để thấy fail**

Run: `docker compose exec -T frontend sh -c 'npx vitest run src/pages/customer/Cart/index.test.tsx'`
Expected: FAIL ở 3 test mới — ngày chọn sẵn là 03/10 chứ không phải 04/10, `preview` được gọi với 1 tham số, không có dòng giảm giá / dòng nhắc. Test cũ vẫn PASS.

- [ ] **Step 3: Thêm chữ vào `CustomerCart.json` (10 ngôn ngữ)**

Bản `en`, khối cấp gốc mới (sau `"stuck"`):

```json
  "deal": {
    "badge": "−{{percent}}% near-expiry deal",
    "onlyOn": "The deal only applies to {{day}}.",
    "dayGone": "The deal day {{day}} can no longer be picked. Choose a day to see its price."
  }
```

Bản `vi`:

```json
  "deal": {
    "badge": "Giảm {{percent}}% hàng sắp hết hạn",
    "onlyOn": "Giảm giá chỉ áp dụng cho ngày {{day}}.",
    "dayGone": "Ngày giảm giá {{day}} không còn chọn được. Hãy chọn một ngày để xem giá của ngày đó."
  }
```

(Nhớ thêm dấu phẩy sau khối `"stuck"`.) 8 ngôn ngữ còn lại: dịch từ bản `en`.

- [ ] **Step 4: Mở rộng `order.requests.ts`**

Sau `export type CartLineInput = …` thêm:

```ts
/** FR-125: price this stall's lines for this pickup day ("yyyy-MM-dd"). */
export type PickupDateInput = { farmerId: number; date: string };
```

Trong `PreviewItemDto`, thêm sau `status: ProductStatus;`:

```ts
  /** FR-125: the price before a near-expiry discount; set only when the priced day is on a deal. */
  listPrice?: number | null;
  discountPercent?: number | null;
  /** The last good day of what the line would get ("yyyy-MM-dd"); null when no day applies. */
  bestBefore?: string | null;
  storageMode?: StorageMode | null;
```

(`StorageMode` đã được import ở file này từ giai đoạn 1; chưa có thì thêm `import type { StorageMode } from '@/api-requests/shelf-life.requests';`.)

Thay `static preview = …` bằng:

```ts
  /**
   * Which orders the cart will be split into; each order's issues live in `problems`, nothing is thrown. A stall listed
   * in `pickupDates` is priced for that day, the others for their nearest orderable day (FR-125). 400
   * `VALIDATION_ERROR` when a `productId` does not exist.
   */
  static preview = async (items: CartLineInput[], pickupDates: PickupDateInput[] = []) => {
    const response = await privateApi.post<ApiResponse<{ groups: OrderGroupPreviewDto[] }>>('/orders/preview', {
      items,
      ...(pickupDates.length ? { pickupDates } : {}),
    });
    return response.data.data.groups;
  };
```

- [ ] **Step 5: `CartGroup` hiện giá gốc và một dòng phụ**

Trong `frontend/src/components/CartGroup.tsx`: đổi import đầu file thành `import type { ReactNode } from 'react';` + các import cũ; thay type `CartLineType` bằng:

```tsx
export type CartLineType = {
  id: number;
  name: string;
  unit: string;
  price: number;
  max: number;
  qty: number;
  /** Near-expiry deal (FR-125): the price before the discount, shown struck through. */
  listPrice?: number | null;
  /** A line under the price, e.g. the deal and until when it stays good. */
  note?: ReactNode;
};
```

Trong `items.map`, thay khối `<span className="font-bold">{it.name}<span className="text-ink-muted block text-[13px] font-normal">{perUnit(it.price, it.unit)}{' '}` … `</span></span>` bằng:

```tsx
            <span className="font-bold">
              {it.name}
              <span className="text-ink-muted block text-[13px] font-normal">
                {it.listPrice != null && it.listPrice > it.price && (
                  <s className="mr-1">
                    <span className="sr-only">{t('price.was')} </span>
                    {perUnit(it.listPrice, it.unit)}
                  </s>
                )}
                {perUnit(it.price, it.unit)}{' '}
                <button
                  type="button"
                  onClick={() => onRemove(it.id)}
                  className="text-brand cursor-pointer bg-transparent font-bold underline-offset-4 hover:underline"
                >
                  {t('actions.remove')}
                </button>
              </span>
              {it.note}
            </span>
```

- [ ] **Step 6: Viết `DealNote.tsx`**

`frontend/src/pages/customer/Cart/DealNote.tsx`:

```tsx
import { useTranslation } from 'react-i18next';
import type { PreviewItemDto } from '@/api-requests/order.requests';
import BestBeforeLine from '@/components/BestBeforeLine';
import { stockDay } from '@/components/stockDay';

type DealNoteProps = {
  item: PreviewItemDto;
  /** The day the line was added for from /deals, if any. */
  dealDay?: string;
  /** The day the customer picked for this stall; null until they pick one. */
  chosenDay: string | null;
};

/**
 * FR-125 (spec §4.5.5) — under a cart line: the deal and until when that batch stays good, or, once another day is
 * picked, that the deal belongs to its own day.
 */
const DealNote = ({ item, dealDay, chosenDay }: DealNoteProps) => {
  const { t } = useTranslation('CustomerCart');
  const movedOff = dealDay != null && chosenDay != null && chosenDay !== dealDay;
  if (item.discountPercent == null && !movedOff) return null;

  return (
    <span className="mt-1 flex flex-col gap-1 text-[13px] font-normal">
      {item.discountPercent != null && (
        <>
          <span className="text-danger font-bold">{t('deal.badge', { percent: item.discountPercent })}</span>
          <BestBeforeLine bestBefore={item.bestBefore} storageMode={item.storageMode} />
        </>
      )}
      {movedOff && (
        <span className="text-warning-ink">{t('deal.onlyOn', { day: stockDay(dealDay) ?? dealDay })}</span>
      )}
    </span>
  );
};

export default DealNote;
```

- [ ] **Step 7: Sửa trang giỏ**

Trong `frontend/src/pages/customer/Cart/index.tsx`:

1. Import `DealNote from './DealNote'` và `{ stockDay } from '@/components/stockDay'`.
2. `StallPickupProps` thành:

```tsx
type StallPickupProps = {
  group: OrderGroupPreviewDto;
  choice: Choice;
  /** FR-125: the day a line of this stall was added for from /deals, if any. */
  dealDay: string | null;
  onChange: (patch: Partial<Choice>) => void;
};
```

   đổi chữ ký thành `const StallPickup = ({ group, choice, dealDay, onChange }: StallPickupProps) => {`, và thay dòng `const date = choice.date ?? dates[0] ?? null;` bằng:

```tsx
  // FR-125: start on the deal day while it can still be booked, else on the first bookable day
  const date = choice.date ?? (dealDay && dates.includes(dealDay) ? dealDay : dates[0]) ?? null;
```

   Trong nhánh có slot (fragment `<>` chứa `DayChips` và `SlotPicker`), thêm ngay trước `<DayChips`:

```tsx
          {dealDay && !dates.includes(dealDay) && (
            <p className="text-small text-warning-ink">{t('deal.dayGone', { day: stockDay(dealDay) ?? dealDay })}</p>
          )}
```

3. Trong `CustomerCartPage`, xoá dòng `const previewKey = lines.map((l) => \`${l.productId}:${l.qty}\`).join(',');` và khối `useRequest(\`cart-preview:${previewKey}\`, …)`, thay bằng (dòng `useState` của `choices` chuyển lên đây, xoá dòng `const [choices, setChoices] = useState<Record<number, Choice>>({});` ở chỗ cũ):

```tsx
  const [choices, setChoices] = useState<Record<number, Choice>>({});
  // FR-125: the day a line was added for from /deals, per stall
  const dealDayOf = (farmerId: number) =>
    lines.find((l) => l.farmerId === farmerId && l.pickupDate)?.pickupDate ?? null;
  // Each stall is priced for the day it will be picked up: the one chosen, else its deal day; a stall with neither is
  // not sent and gets its nearest orderable day, as before
  const pickupDates = [...new Set(lines.map((l) => l.farmerId))].flatMap((farmerId) => {
    const date = choices[farmerId]?.date ?? dealDayOf(farmerId);
    return date ? [{ farmerId, date }] : [];
  });
  const previewKey = `${lines.map((l) => `${l.productId}:${l.qty}`).join(',')}|${pickupDates
    .map((d) => `${d.farmerId}@${d.date}`)
    .join(',')}`;
  const { state: previewLoad, retry } = useRequest(`cart-preview:${previewKey}`, () =>
    lines.length && user
      ? OrderApi.preview(
          lines.map((l) => ({ productId: l.productId, quantity: l.qty })),
          pickupDates,
        )
      : Promise.resolve([]),
  );
```

4. Trong `CartGroup` của mỗi nhóm, `items={…map((it): CartLineType => ({ … }))}` thêm hai field sau `qty: qtyOf(it.productId, it.quantity),`:

```tsx
                      listPrice: it.listPrice,
                      note: (
                        <DealNote
                          item={it}
                          dealDay={lines.find((l) => l.productId === it.productId)?.pickupDate}
                          chosenDay={c.date}
                        />
                      ),
```

5. Đổi `<StallPickup group={g} choice={c} onChange={(patch) => setChoice(g.farmerId, patch)} />` thành `<StallPickup group={g} choice={c} dealDay={dealDayOf(g.farmerId)} onChange={(patch) => setChoice(g.farmerId, patch)} />`.

- [ ] **Step 8: Chạy lại test**

Run: `docker compose exec -T frontend sh -c 'npx vitest run src/pages/customer/Cart src/lib/cart.test.ts src/api-requests/order.requests.test.ts'`
Expected: `Test Files 3 passed`, toàn bộ PASS (giỏ: 4 test).

- [ ] **Step 9: Kiểm và commit**

```bash
docker compose exec -T frontend sh -c 'npx prettier --write src/api-requests/order.requests.ts src/components/CartGroup.tsx src/pages/customer/Cart src/locales && npx tsc -b && npx eslint src'
git add frontend/src/api-requests/order.requests.ts frontend/src/components/CartGroup.tsx \
  frontend/src/pages/customer/Cart frontend/src/locales/*/CustomerCart.json
git commit -m "feat(FR-125): cart remembers the deal day and prices each stall for its day"
```

Kiểm tay ở 375 / 768 / 1440 px: dòng giảm giá và dòng nhắc xuống hàng dưới tên món, không đẩy ô số lượng tràn ra ngoài.

---

### Task 14: Seed demo, contract và kiểm toàn bộ (FR-124, FR-125)

**Files:**
- Modify: `db/seed.sql` (khối mới ở **cuối file**, sau khối Feedback: mỗi cụm tính năng nối khối của mình vào cuối file)
- Modify: `docs/api-contract.md` (§5, §7 — chỉ thêm)

**Interfaces:**
- Consumes: mọi task trước; seed có sẵn (farmer8, sản phẩm, template tuần, slot 4 tuần); seed giai đoạn 1 ("Trứng vịt", "Trứng cút": Eggs, nhiệt độ thường, 10 ngày).
- Produces: đúng 2 dòng giảm giá (Ruling 16) — "Trứng vịt" vào ngày đặt được đầu tiên từ hôm nay + 2 (còn `⌈N/2⌉ − 1` ngày, 20% khi N = 10), "Trứng cút" vào ngày đặt được đầu tiên từ hôm nay + 3 (còn 2 ngày, 40%), cùng sạp "Trứng gà Khánh Hòa". Seed chỉ nạp dòng tồn kho; `order_items` của đơn seed giữ nguyên (addendum của giai đoạn 1). Các dòng contract của giai đoạn 3 và PR body.

- [ ] **Step 1: Thêm khối seed vào cuối `db/seed.sql`**

```sql
-- ---- Near-expiry deals (FR-124, FR-125, proposed): two deal days for /deals and the Farmer's "On sale" ----
-- A deal is the product_daily_stock row of one pickup day with list_price, discount_percent, packed_on and
-- best_before set (V20260927007); unit_price is then the deal price. Both deals belong to 'Trứng gà Khánh Hòa'
-- (farmer8@), a stall that is at a market every day, so a slot with room exists from today+2 whatever day the seed
-- runs; neither product is in a seeded order, so no order's reserved units are touched. The batch is dated from the
-- product's own shelf life N, so the rules FarmerDealService enforces hold: 'Trứng vịt' keeps ⌈N/2⌉ − 1 days on
-- pickup, 'Trứng cút' 2 days, and the discount is DealPolicy's suggestion (5·L ≤ N → 40, 20·L ≤ 7·N → 30, else 20).
-- list_price is the day's normal price (the template's, else the product's); unit_price is rounded half up to the
-- cent, at least 0.01 and never above the list price.

-- Re-running first ends the deals an earlier run left on these two products, so there are always exactly two.
-- A single-table UPDATE applies its assignments left to right: unit_price reads list_price before it is cleared.
UPDATE product_daily_stock
SET unit_price = list_price, list_price = NULL, discount_percent = NULL, packed_on = NULL, best_before = NULL
WHERE discount_percent IS NOT NULL
  AND product_id IN (SELECT p.id
                     FROM products p
                     JOIN farmer_profiles f ON f.id = p.farmer_id
                     JOIN users u ON u.id = f.user_id
                     WHERE u.email = 'farmer8@marketlink.vn' AND p.name IN ('Trứng vịt', 'Trứng cút'));

INSERT INTO product_daily_stock (product_id, stock_date, quantity_available, unit_price, list_price,
                                 discount_percent, packed_on, best_before)
SELECT d.product_id, d.pickup, d.qty,
       LEAST(d.base, GREATEST(0.01, ROUND(d.base * (100 - d.pct) / 100, 2))),
       d.base, d.pct, d.packed_on, d.pickup + INTERVAL (d.days_left - 1) DAY
FROM (
      SELECT c.*,
             CASE WHEN c.days_left <= 1 OR 5 * c.days_left <= c.n THEN 40
                  WHEN 20 * c.days_left <= 7 * c.n THEN 30
                  ELSE 20 END AS pct,
             c.pickup + INTERVAL c.days_left DAY - INTERVAL c.n DAY AS packed_on
      FROM (
            SELECT p.id AS product_id, p.shelf_life_days AS n, x.qty, slot.pickup,
                   COALESCE(t.default_price, p.price) AS base,
                   IF(x.target = 'last_days', LEAST(2, (p.shelf_life_days + 1) DIV 2),
                      GREATEST(1, (p.shelf_life_days + 1) DIV 2 - 1)) AS days_left
            FROM (
                  SELECT 'Trứng vịt' AS product_name, 2 AS from_days, 10 AS qty, 'half' AS target
                  UNION ALL SELECT 'Trứng cút', 3, 8, 'last_days'
                 ) x
            JOIN users u ON u.email = 'farmer8@marketlink.vn'
            JOIN farmer_profiles f ON f.user_id = u.id
            JOIN products p ON p.farmer_id = f.id AND p.name = x.product_name AND p.is_deleted = FALSE
            JOIN LATERAL (
                  SELECT MIN(ps.slot_date) AS pickup
                  FROM pickup_slots ps
                  JOIN farmer_markets fm ON fm.id = ps.farmer_market_id AND fm.is_active = TRUE
                  WHERE fm.farmer_id = f.id
                    AND ps.is_active = TRUE
                    AND ps.booked_count < ps.max_orders
                    AND ps.slot_date >= DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR) + INTERVAL x.from_days DAY
                 ) slot ON slot.pickup IS NOT NULL
            JOIN weekly_stock_templates t ON t.product_id = p.id
                                         AND t.day_of_week = DAYOFWEEK(slot.pickup) - 1
                                         AND t.is_active = TRUE
           ) c
     ) d
WHERE d.n >= 2
  AND d.packed_on < d.pickup
  AND d.packed_on <= DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR)
  AND d.days_left BETWEEN 1 AND (d.n + 1) DIV 2
ON DUPLICATE KEY UPDATE
    list_price = COALESCE(product_daily_stock.list_price, product_daily_stock.unit_price),
    unit_price = LEAST(product_daily_stock.list_price,
                       GREATEST(0.01, ROUND(product_daily_stock.list_price * (100 - d.pct) / 100, 2))),
    discount_percent = d.pct,
    packed_on = d.packed_on,
    best_before = d.pickup + INTERVAL (d.days_left - 1) DAY,
    quantity_available = d.qty;
```

(`WHERE` của câu `INSERT` là chính luật của `DealPolicy`: nếu seed giai đoạn 1 có đổi hạn dùng của hai sản phẩm này tới mức lô không còn hợp lệ, câu lệnh không chèn gì thay vì chèn một giảm giá sai luật. Trong `ON DUPLICATE KEY UPDATE`, `unit_price` đọc `list_price` vừa gán ở phép gán ngay trước — MySQL áp dụng từ trái sang phải — nên một dòng đã có sẵn cũng lấy giá thường làm gốc.)

- [ ] **Step 2: Nạp seed và kiểm dữ liệu**

Run: `make seed`, rồi:

```bash
docker compose exec -T mysql sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -N -e "SELECT p.name, d.stock_date, d.quantity_available, d.list_price, d.unit_price, d.discount_percent, d.packed_on, d.best_before FROM product_daily_stock d JOIN products p ON p.id = d.product_id WHERE d.discount_percent IS NOT NULL ORDER BY d.stock_date"'
```

Expected: đúng 2 dòng. Với T = hôm nay theo giờ Việt Nam và N = 10 (seed giai đoạn 1): `Trứng vịt  T+2  10  1.60  1.28  20  T−4  T+5` và `Trứng cút  T+3  8  1.00  0.60  40  T−5  T+4`. Chạy `make seed` lần thứ hai rồi chạy lại câu SELECT: vẫn đúng 2 dòng, cùng số (seed chạy lại được).

Kiểm qua API (không cần đăng nhập):

```bash
curl -s 'http://localhost:8080/api/v1/deals' | python3 -c 'import json,sys; d=json.load(sys.stdin)["data"]; print(d["total"], [(i["name"], i["stockDate"], i["discountPercent"], i["daysLeft"]) for i in d["items"]])'
```

Expected: `2 [('Trứng vịt', '<T+2>', 20, 4), ('Trứng cút', '<T+3>', 40, 2)]` — ngày gần nhất trước.

- [ ] **Step 3: Thêm dòng vào `docs/api-contract.md`**

Chỉ thêm, không sửa dòng cũ. LEAD đã duyệt các endpoint này ở spec §6; riêng chỗ có ⚑ là do plan thêm và **chờ LEAD duyệt** (Ruling 1, 2).

§5, bảng endpoint chính, ngay sau dòng `| GET | \`/api/v1/products/{id}\` | …`:

```markdown
| GET | `/api/v1/deals` | Public | FR-125: hàng giảm giá sắp hết hạn, query `marketId, categoryId, day, productId, page, pageSize` (`day` 0 = CN … 6 = T7 như `/products`; ⚑ `productId` thêm cho khối "Đang giảm giá" ở trang sản phẩm, chờ LEAD duyệt). Mỗi dòng là một cặp (sản phẩm, ngày nhận) khách còn đặt được trong 14 ngày tới: `{ productId, name, imageUrl, unit, stallName, farmerId, marketNames, stockDate, listPrice, unitPrice, discountPercent, bestBefore, daysLeft, quantityAvailable, storageMode }`; `marketNames` là các chợ sạp có mặt vào thứ đó. Xếp theo ngày nhận gần nhất rồi mức giảm lớn nhất |
```

§5, bảng "Template tồn kho tuần — FR-063", ngay sau dòng `| PATCH | \`/api/v1/farmer/products/{id}/daily-stock/{date}\` | …`:

```markdown
| GET | `/api/v1/farmer/products/{id}/daily-stock` | Farmer — FR-124 ⚑ (plan đề xuất thêm, chờ LEAD duyệt): các ngày khách còn đặt được sản phẩm này trong 14 ngày tới, mỗi ngày `{ productId, stockDate, quantityAvailable, unitPrice, listPrice, discountPercent, packedOn, bestBefore }` (4 field cuối `null` khi ngày đó không giảm giá). Dialog giảm giá đọc số lượng và giá của từng ngày ở đây |
| PUT | `/api/v1/farmer/products/{id}/daily-stock/{date}/deal` | Farmer — FR-124: `{ quantityAvailable, packedOn, discountPercent }` → dòng tồn kho của ngày đó (như trên). 400 `NOT_NEAR_EXPIRY` (hàng hái đúng ngày nhận, hoặc còn hơn nửa hạn), 400 `EXPIRED_BEFORE_PICKUP`, 400 `VALIDATION_ERROR` field `discountPercent` (ngoài 5–70 hoặc không theo bước 5) / `packedOn` (sau hôm nay) / `quantityAvailable` (< 1), 409 `DATE_NOT_ORDERABLE` (hết slot, quá cutoff, chợ hay sạp không mở, thứ đó không có template, hoặc ngoài 14 ngày), 403 sản phẩm của sạp khác hoặc sạp chưa duyệt / đang đình chỉ |
| DELETE | `/api/v1/farmer/products/{id}/daily-stock/{date}/deal` | Farmer — FR-124: về giá thường, giữ nguyên số lượng; ngày không giảm giá thì không đổi gì |
| GET | `/api/v1/farmer/deals` | Farmer — FR-124: các ngày đang giảm giá của sạp từ hôm nay: `[{ productId, productName, unit, stockDate, quantityAvailable, listPrice, unitPrice, discountPercent, packedOn, bestBefore, daysLeft }]` |
```

và một đoạn ngay dưới bảng đó (sau đoạn "Không còn bước "Apply" …"):

```markdown
**Giảm giá sắp hết hạn (FR-124).** Một ngày giảm giá là dòng tồn kho của ngày đó có thêm `listPrice`, `discountPercent`, `packedOn`, `bestBefore`; `unitPrice` là giá sau giảm. Đăng lại cho cùng ngày giữ `listPrice` đầu tiên. `PATCH …/daily-stock/{date}` có `unitPrice` cho một ngày đang giảm giá thì kết thúc giảm giá của ngày đó.
```

§7, ngay sau bảng endpoint (trước khối `> **Mọi endpoint đổi trạng thái …`):

```markdown
**Giá theo ngày nhận (FR-125).** `POST /api/v1/orders/preview` nhận thêm tuỳ chọn `pickupDates: [{ farmerId, date }]`: sạp có trong danh sách được tính giá, số còn, mức giảm và hạn dùng của đúng ngày đó; sạp không có thì như cũ (ngày gần nhất còn đặt được). Mỗi món trong `items[]` thêm `listPrice`, `discountPercent` (chỉ khi ngày đó đang giảm giá), `bestBefore` và `storageMode`. Đơn đặt vào ngày đang giảm giá chụp `listPrice` và `bestBefore` của lô vào món (`GET /api/v1/orders/{id}`).
```

- [ ] **Step 4: Chạy toàn bộ test**

Run: `make be-test`
Expected: `BUILD SUCCESS`, `Failures: 0, Errors: 0`. Nếu JVM test bị kill giữa chừng ("The forked VM terminated without properly saying goodbye"), đó là do thiếu RAM trong Docker, không phải test fail: tắt container frontend của stack này rồi chạy lại.

Run: `docker compose exec -T frontend sh -c 'npx prettier --check src && npx tsc -b && npx eslint src && npx vitest run'`
Expected: sạch, toàn bộ test PASS.

- [ ] **Step 5: Kiểm đủ key ở 10 ngôn ngữ**

```bash
python3 - <<'EOF'
import json, pathlib
root = pathlib.Path('frontend/src/locales')
def keys(d, p=''):
    out = set()
    for k, v in d.items():
        out |= keys(v, p + k + '.') if isinstance(v, dict) else {p + k}
    return out
for ns in ['common', 'FarmerProducts', 'Deals', 'Home', 'ProductDetail', 'CustomerCart']:
    base = keys(json.loads((root / 'en' / f'{ns}.json').read_text()))
    for lang in ['vi', 'zh', 'ja', 'ko', 'fr', 'es', 'de', 'th', 'id']:
        other = keys(json.loads((root / lang / f'{ns}.json').read_text()))
        missing, extra = base - other, other - base
        if missing or extra:
            print(ns, lang, 'missing', sorted(missing), 'extra', sorted(extra))
print('checked')
EOF
```

Expected: chỉ in `checked`.

- [ ] **Step 6: Kiểm tay luồng chính**

`make be-restart` rồi `make seed`. Trên stack của worktree (mật khẩu mọi tài khoản demo `Demo@1234`):
1. `farmer8@marketlink.vn` → Products: khối "On sale (2)" có "Trứng vịt" (−20%) và "Trứng cút" (−40%). Bấm "Near-expiry deal" ở "Trứng gà thả vườn", chọn ngày thứ hai, ngày đóng gói 7 ngày trước: dialog hiện hạn của lô, số ngày khách còn dùng và mức gợi ý; −/+ dừng ở 5% và 70%; "Post deal" → khối thành "On sale (3)". Chọn ngày đóng gói là hôm qua: nút "Post deal" bị khoá, có dòng lý do. "Remove deal" một dòng → dòng biến mất.
2. Khách vãng lai: thanh điều hướng và chân trang có link tới `/deals`; trang hiện các thẻ (−20%, giá gạch, "Pick up … · good until end of … · … left"); lọc theo danh mục và theo chợ; trang chủ có dải "Near-expiry deals"; trang sản phẩm "Trứng cút" có khối "On sale for these pickup days".
3. `customer@marketlink.vn`: "Add to cart" ở thẻ "Trứng cút" → giỏ chọn sẵn ngày giảm giá, món có "−40% near-expiry deal" và "Good until end of …"; chọn ngày khác → giá về giá thường và có dòng "The deal only applies to …"; chọn lại ngày giảm giá, chọn giờ, đặt đơn → trang chi tiết đơn hiện hạn của lô dưới món.
4. Ở 375 / 768 / 1440 px: `/deals`, trang chủ, trang sản phẩm, giỏ và Farmer Products không tràn ngang.

- [ ] **Step 7: Commit**

```bash
git add db/seed.sql docs/api-contract.md
git commit -m "chore(FR-125): seed two near-expiry deals and document the deal endpoints"
```

- [ ] **Step 8: Ghi chú cho PR (không push nếu chưa được phép)**

PR body (tiếng Anh) phải nêu:
- FR đề xuất FR-124, FR-125 (spec §11, LEAD duyệt 27/09/2026); nếu `.ai/REQUIREMENTS.md` chưa có hai mã này thì ghi rõ để QA/DOC thêm;
- migration `V20260927007__daily_stock_deals.sql` và 4 cột mới của `product_daily_stock` để LEAD cập nhật `db/schema.sql` (R-02);
- các dòng contract đã thêm (chỉ thêm), và **hai chỗ chờ LEAD duyệt**: endpoint đọc `GET /api/v1/farmer/products/{id}/daily-stock` và tham số `productId` của `GET /api/v1/deals` (Ruling 1, 2);
- hành vi đổi ở endpoint cũ: `PATCH …/daily-stock/{date}` có `unitPrice` giờ kết thúc giảm giá của ngày đó (Ruling 10); `POST /orders/preview` nhận thêm `pickupDates` (tương thích ngược);
- lệnh seed và luồng kiểm tay ở Step 6;
- "đủ 7 điều kiện" của Definition of Done trong `CLAUDE.md`.

---

## Self-Review

1. **Độ phủ spec:**
   - §4.5.1 (`B`, `L`, điều kiện `H < P`, `H ≤ hôm nay`, `1 ≤ L ≤ ⌈N/2⌉`; hàng hạn 1 ngày không bao giờ vào mục này) → Task 2 (`DealPolicy` + bảng, có dòng N = 1), Task 4 (server áp luật), Task 9 (cùng bảng ở FE), Task 10 (dialog hiện lý do).
   - §4.5.2 (gợi ý 40/30/20, chỉnh 5–70 bước 5, làm tròn tới cent, thấp nhất $0.01, hai ví dụ cà chua và trứng) → Task 2, 9 (hai ví dụ là hai dòng đầu của bảng), Task 10.
   - §4.5.3 (mục trên dòng sản phẩm, dialog, khối "Đang giảm giá", 4 cột cùng NULL hoặc cùng có giá trị, đăng = materialize + `FOR UPDATE` + đặt số lượng/giá gốc/giá mới, bỏ = về giá gốc giữ số lượng, đơn cũ không đổi, API + mã lỗi, R-06) → Task 1, 3, 4, 5, 10. Chỗ spec không nói rõ → Ruling 1, 5, 6, 7, 8, 10, 11.
   - §4.5.4 (`/deals`, thanh điều hướng, chân trang, dải 4 món ở trang chủ, luật của `GET /deals`, các field, thứ tự, khối ở trang sản phẩm, 4 trạng thái) → Task 7, 11, 12. Chỗ spec không nói rõ → Ruling 2, 3, 4, 14.
   - §4.5.5 (`pickupDates`, giỏ nhớ `pickupDate`, bộ chọn ngày mặc định, tính lại khi đổi ngày, dòng nhắc, đặt đơn chụp `list_price` + `best_before`) → Task 6, 8, 9, 13. Chỗ spec không nói rõ → Ruling 12, 13.
   - §5 (migration 5 kèm 2 CHECK; 2 ngày giảm giá demo) → Task 1, 14 (Ruling 16).
   - §6 (các dòng FR-124/125: PUT/DELETE deal, GET farmer/deals, GET deals, preview) → Task 5, 7, 8; ghi vào contract ở Task 14.
   - §7 (Farmer Products, chi tiết sản phẩm, `/deals` + trang chủ, giỏ hàng) → Task 10, 11, 12, 13.
   - §8: sửa hạn dùng sau khi đăng → Task 6 `editingTheShelfLifeLaterKeepsTheBatchBestBefore`; giảm giá cho ngày đã có đơn → Task 6 `anOrderPlacedBeforeTheDealKeepsItsPrice`; đăng và đặt cùng lúc khoá cùng dòng → Task 4 `postPutsTheLockedDayOnTheDeal` (khoá theo khoá tự nhiên, không đọc trước khi khoá) và Task 6 Step 5 chạy lại `PlaceOrderConcurrencyTest`; sạp bị đình chỉ không đăng được → Task 4 `postRefusesAStallThatIsNotApproved`.
   - §9: hàm thuần dùng chung một bảng số → Task 2, 9; MySQL `/deals` loại hết slot / sạp đình chỉ / sản phẩm ẩn → Task 7 `DealSearchIntegrationTest`; OrderService đặt đơn ngày giảm giá chụp `list_price`, `best_before` → Task 6; preview có và không có `pickupDates` → Task 8; test đặt đơn đồng thời vẫn xanh → Task 6 Step 5; quyền (sạp không sửa giảm giá của sạp khác → 403) → Task 4; FE dialog tính `B`, `L`, gợi ý và chặn → Task 10; `/deals` đủ 4 trạng thái → Task 11; giỏ đổi ngày thì đổi giá → Task 13.
   - §12 (ngoài phạm vi): không có hai giá trong một ngày, không báo tin giảm giá cho người yêu thích, không giảm giá tự động — plan không làm các việc này.
2. **Không để trống:** đã quét `TBD`, `TODO`, `FIXME`, "implement later", "fill in", "similar to Task": không còn. Mỗi bước code có code đầy đủ; các chỉ dẫn "dịch 8 ngôn ngữ còn lại từ bản `en`" là luật của repo (frontend/CLAUDE.md), kèm bước kiểm key ở Task 14 Step 5.
3. **Tên thống nhất:** dùng đúng tên của giai đoạn 1 theo `/private/tmp/claude-501/shelf/phase1-interfaces.md` và plan giai đoạn 1: `ShelfLifePolicy.bestBefore(LocalDate, int)`, `OrderItem.snapshot(Product, BigDecimal, int, BigDecimal, LocalDate)` + `setListPrice`/`setBestBefore`, `Product.getStorageMode().value()`, `StorageMode` (FE, `api-requests/shelf-life.requests.ts`), `BestBeforeLine` (props `bestBefore`, `storageMode`), key `bestBefore.line`, `storageMode.chilled` = "Fridge 0–5 °C"; migration `V20260927007__daily_stock_deals.sql` đúng ruling đánh số. Tên của chính plan này giữ nguyên qua các task: `startDeal/endDeal/basePrice/hasDeal` (Task 1 → 3, 4, 6), `DealPolicy.check/suggestedPercent/dealPrice/validPercent` (Task 2 → 4), `Availability(…, Deal deal)` + constructor 3 tham số, `upcoming`, `onDate`, `LOOKAHEAD_DAYS` (Task 3, 8 → 4, 7), `FarmerDealServiceInterface.post/remove/mine/upcomingDays` (Task 4 → 5, 6), `DealQueryRepository.farmerDeals/openDeals/marketNamesByWeekday` (Task 4, 7), `PreviewRequest.pickupDateByFarmer()` (Task 8), `DealApi.list/mine/pickupDays/post/remove` (Task 9 → 10–13), `CartLine.pickupDate` (Task 9 → 11–13), `DealCard` (Task 11 → 12).
4. **Review Focus:** mỗi dòng có test ở task sở hữu — (1) Task 13 `re-prices a stall when another day is picked and says the deal is for its own day`; (2) Task 1 `postingAgainKeepsTheFirstListPrice`, Task 4 `postingAgainTakesTheNewDiscountOffTheNormalPrice`; (3) Task 2 `roundsTheDealPriceToTheCent`, Task 9 bảng `dealPrice`; (4) Task 6 `editingTheShelfLifeLaterKeepsTheBatchBestBefore`; (5) Task 7 `keepsOnlyDealDaysCustomersCanStillOrderNearestDayFirstThenTheBiggestDiscount`, Task 4 `postRefusesADayCustomersCanNoLongerOrder`, Task 13 `says so when the deal day can no longer be picked`.
5. **Việc cần đối chiếu khi ráp với giai đoạn 1 và 2:**
   - Hai chỗ thêm ngoài spec §6 chờ LEAD duyệt: `GET /api/v1/farmer/products/{id}/daily-stock` và tham số `productId` của `GET /api/v1/deals` (Ruling 1, 2).
   - File giai đoạn 2 cũng sửa: `ProductExceptionHandler` (409 `SHELF_LIFE_EXTENSION_LOCKED`), cuối `db/seed.sql`, `docs/api-contract.md`, `common.json`, `OrderServiceTest`. Test phạm vi ở Task 5, 7 dùng `contains(...)` chứ không `containsExactly`, để handler thêm controller của giai đoạn khác vẫn xanh.
   - Số migration: giai đoạn 2 là 006, giai đoạn này 007. Nếu 007 chạy trên một DB trước khi 006 có mặt, Flyway sẽ từ chối 006 (out-of-order); khi đó giai đoạn vào sau đổi sang số kế tiếp như Global Constraints đã ghi.
   - Expected của seed (Task 14 Step 2) giả định seed giai đoạn 1 để "Trứng vịt", "Trứng cút" ở Eggs, nhiệt độ thường, 10 ngày; câu `INSERT` vẫn đúng luật với N khác, chỉ các con số trong Expected đổi.
