# SRS Gap Closure — Implementation Plan (nối 23 màn còn demo, nội dung thật, deliverables)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đưa mọi gạch đầu dòng SRS §1.6 từ "backend xong, màn còn dữ liệu mẫu" lên "giám khảo bấm được trên `localhost:3000`", điền nội dung thật cho About/Contact, xoá `frontend/src/data/*`, và bổ sung tài liệu nộp bài còn thiếu trong repo.

**Architecture:** Backend đã phủ 100% §1.6 (270 endpoint, seed đủ). Mỗi màn demo được nối bằng khuôn duy nhất của repo: `useRequest(key, fetcher)` → `{ state, retry, mutate }` → 4 trạng thái (loading / `DataState` empty / `LoadError` / data), hàm ánh xạ DTO → type của trang nằm trong `frontend/src/api-requests/*.ts` (S.4.2, không sửa JSX của trang ngoài chỗ đọc dữ liệu). Giỏ hàng là store `localStorage` (`lib/cart.ts`, không có bảng `carts` — S.4.3). Năm endpoint nhỏ còn thiếu (danh sách review cho admin/farmer, chi tiết customer cho admin, top products, tên khách trong danh sách đơn) làm ở Task 1 theo TDD trước khi nối FE.

**Tech Stack:** React 19 · Vite · TypeScript · Tailwind 4 · react-i18next · vitest + @testing-library · Spring Boot 4 · MySQL 8 · JUnit/Mockito.

**Spec:** `docs/MarketLink End-to-End Web Solutions_SRS.pdf` §1.6 + `.ai/REQUIREMENTS.md` (FR-xxx). Hiện trạng và bảng đối chiếu: `docs/SRS-COVERAGE.md`. Contract: `docs/api-contract.md` (các endpoint thêm ở Task 1 là **đề xuất LEAD**, LEAD xác nhận khi chốt plan này).

## Global Constraints

- R-01 mỗi commit gắn FR: `feat(FR-030): …`. R-09/R-10: comment, commit, PR **100% tiếng Anh**.
- R-02 không sửa `db/schema.sql`, `docs/api-contract.md`, `docs/decisions.md` — Task 1 chỉ **thêm** endpoint, LEAD ghi vào contract sau.
- R-04 SQL tham số hoá. R-06 endpoint có `{id}` kiểm chủ sở hữu → 403; admin đọc đơn là ngoại lệ có chủ ý (Task 1.2).
- R-08 làm trên worktree riêng tách từ `origin/dev`; không commit/push `dev`/`main`; push/PR chỉ khi người dùng bảo.
- FE: `useRequest` cho mọi request; **không** `setState` đồng bộ trong `useEffect` (lint `react-hooks/set-state-in-effect`). Copy UI qua `useTranslation('<Trang>')` + `src/locales/<lang>/<Trang>.json`; key mới thêm ít nhất `en` + `vi` (8 ngôn ngữ còn lại rơi về English theo `frontend/CLAUDE.md`). Màu chỉ qua token; tiền/ngày/giờ qua `src/lib/format.ts`.
- Mỗi màn dữ liệu đủ 4 trạng thái (FR-084), responsive 375/768/1440 (FR-080). Màn nối xong thì **bỏ khỏi** danh sách `SHOW_WIP ? XWip : ComingSoon` trong `App.tsx`.
- Test: FE `cd frontend && npx vitest run <file>`; BE trong container `docker compose exec -T -e MAVEN_OPTS=-Xmx256m backend ./mvnw -B -q test -Dtest='<Class>' -Dsurefire.failIfNoSpecifiedTests=false -DargLine="-Xmx768m -XX:MaxMetaspaceSize=256m -XX:+UseSerialGC"` (viết lệnh tường minh, không để trong biến zsh). Lint FE: `npx tsc -b && npx eslint src`; BE: `./mvnw -q spotless:apply`.
- Route đơn hàng dùng **id số** (`/orders/12`, `/farmer/orders/12`, `/admin/orders/12`); tham số route vẫn tên `:code` (không đổi `App.tsx` để khỏi đụng #168), trang parse `Number(code)`.
- Host: `rm` alias `-i` → dùng `/bin/rm -f`. `make be-test` dễ OOM-kill → chạy lệnh mvn tường minh ở trên.

## Review Focus

1. **Giỏ có sản phẩm vừa hết hàng / stall vừa bị đình chỉ**: `POST /orders` trả 409 `OUT_OF_STOCK` / `STALL_UNAVAILABLE` — Cart phải hiện lỗi đúng dòng và gọi lại `preview`, không mất giỏ. → Task 3 (test `cart.test.ts` giữ giỏ khi place thất bại + bước kiểm tay 409).
2. **Khách mở `/orders/999` hoặc `/farmer/orders/<đơn của stall khác>`**: 403/404 → màn "không phải đơn của bạn", không phải `LoadError` chung. → Task 4, Task 7 (`isGone`).
3. **Farmer chưa duyệt vào `/farmer`**: `RequireAuth role` đã có; Pending phải đọc `approvalStatus` thật, không toggle demo. → Task 8.
4. **Admin đổi trạng thái customer đang đăng nhập**: server đã chặn login/refresh; màn Customers phải `mutate` dòng ngay và không cho bấm lần hai khi đang gửi. → Task 9.
5. **Bấm Reorder cho đơn có sản phẩm đã xoá**: `POST /orders/{id}/reorder` chỉ trả dòng còn mua được — giỏ phải báo "n sản phẩm không còn". → Task 2 (`OrderTicket`).

---

## Thứ tự và phụ thuộc

```
Task 1 (backend 5 endpoint) ─┐
Task 2 (lớp dùng chung: cart store, mapping, OrderTicket, ChatApi) ─┤
                              ├─→ Task 3 Cart+OrderPlaced+Add-to-cart
                              ├─→ Task 4 Customer Orders/OrderEdit/Dashboard
                              ├─→ Task 5 Favorites
                              ├─→ Task 6 Reviews (customer form, public lists, farmer replies, admin tab)
                              ├─→ Task 7 Farmer Orders/OrderDetail/Overview/History/Layout badge
                              ├─→ Task 8 Farmer Slots + Pending
                              ├─→ Task 9 Admin Home/Reports/Orders/OrderDetail/Customers/CustomerDetail/Feedback + public Feedback
                              └─→ Task 10 Assistant
Task 11 About/Contact/ảnh sản phẩm (cần dữ liệu thật từ LEAD)
Task 12 Xoá src/data/*, dọn SHOW_WIP (sau 3–10)
Task 13 Tài liệu nộp bài (REQUIREMENTS, SRS-COVERAGE, ASSUMPTIONS, AI tools)
```
Task 3–10 độc lập với nhau (chỉ cần 1 và 2), chia được cho nhiều người. Mỗi task = 1 nhánh `feature/FR-xxx-…` từ `origin/dev`, 1 PR.

---

## Task 1: Backend — 5 endpoint còn thiếu để FE nối được (đề xuất LEAD, contract-additive)

**Files:**
- Modify: `backend/src/main/java/com/techx/intervue/modules/order/resources/OrderListItemResource.java`, `modules/order/repositories/OrderQueryRepository.java` (LIST_COLUMNS, listItem), `modules/report/repositories/OrderRows.java` (LIST_COLUMNS, map), `modules/report/repositories/AdminReportRepository.java` (orders: `customerId`), `modules/report/services/interfaces/AdminReportServiceInterface.java`, `services/impl/AdminReportService.java`, `controllers/AdminReportController.java`
- Modify: `modules/order/services/impl/OrderService.java:490-500` (admin đọc đơn)
- Create: `modules/review/...` `GET /admin/reviews`, `GET /farmer/reviews` (ReviewQueryRepository + service + controllers đã có, thêm method)
- Modify: `modules/user/controllers/AdminCustomerController.java`, `AdminCustomerServiceInterface`, `AdminCustomerService` (`GET /admin/customers/{id}`)
- Create: `modules/report/resources/TopProductResource.java`; modify `AdminReportRepository`, `AdminReportService`, `AdminReportController` (`GET /admin/reports/top-products`)
- Test: `modules/order/services/impl/OrderAdminReadTest.java`, `modules/review/services/impl/ReviewListingTest.java` (tích hợp MySQL, dùng `ReportFixture`), `modules/report/services/impl/AdminReportServiceTest.java` (thêm 2 test), `modules/user/services/impl/AdminCustomerServiceTest.java` (thêm 1 test)

**Interfaces:**
- Produces (FE dựa vào):
  - `OrderListItemResource` thêm 2 field cuối: `Long customerId, String customerName`.
  - `GET /api/v1/admin/reports/orders?customerId=` (thêm filter).
  - `GET /api/v1/orders/{id}` trả 200 cho role ADMIN (kèm `customer`), vẫn 403 cho customer/farmer khác.
  - `GET /api/v1/admin/reviews?status=visible|hidden&maxRating=&customerId=&page&pageSize` → `PageResource<AdminReviewResource(id, targetType, targetId, targetName, stallName, customerId, customerName, rating, comment, status, createdAt, response)>`.
  - `GET /api/v1/farmer/reviews?page&pageSize` → `PageResource<ReviewResource>` — review của stall **và** của mọi sản phẩm của stall, visible, kèm `targetName` (thêm field `targetName` vào `ReviewResource`, cuối).
  - `GET /api/v1/admin/customers/{id}` → `AdminCustomerResource` (404 nếu không phải customer).
  - `GET /api/v1/admin/reports/top-products?from&to&limit` → `List<TopProductResource(productId, name, stallName, unit, unitPrice, quantitySold, revenue)>`.

- [ ] **Step 1.1: RED — tên khách trong danh sách đơn** — thêm vào `OrderAccessTest` (file đã có, cùng package):

```java
@Test
void listRowsCarryTheCustomerNameForTheStall() {
    assertThat(OrderQueryRepository.FARMER_ORDERS_SQL).contains("cu.full_name AS customer_name");
    assertThat(OrderQueryRepository.FARMER_ORDERS_SQL).contains("JOIN users cu ON cu.id = o.customer_id");
}
```
Run: `... -Dtest='OrderAccessTest'` → Expected: FAIL (`FARMER_ORDERS_SQL` không chứa `customer_name`).

- [ ] **Step 1.2: GREEN** — `OrderListItemResource` thêm `Long customerId, String customerName` **cuối** record. `OrderQueryRepository.LIST_COLUMNS` thêm `o.customer_id, cu.full_name AS customer_name`; `MY_ORDERS_FROM`, `FARMER_ORDERS_FROM`, `DETAIL_SQL` thêm `JOIN users cu ON cu.id = o.customer_id` (DETAIL_SQL đã có `cu`, chỉ đổi alias cột thành `customer_full_name` giữ nguyên + thêm `cu.full_name AS customer_name`); `listItem(rs)` thêm `rs.getLong("customer_id"), rs.getString("customer_name")`. Làm y hệt trong `report/repositories/OrderRows` (LIST_COLUMNS + LIST_FROM thêm join `users cu`, `map` thêm 2 field). Sửa mọi `new OrderListItemResource(` trong test (OrderAccessTest, OrderReviewedFlagTest, OrderDetailResourceTest, order.requests.test không liên quan) thêm `7L, "Khách 7"`.
Run: `-Dtest='OrderAccessTest,OrderReviewedFlagTest,OrderDetailResourceTest,FarmerReportServiceTest,AdminReportServiceTest'` → Expected: PASS.

- [ ] **Step 1.3: RED — admin đọc được đơn** — tạo `OrderAdminReadTest` (copy `setUp` của `OrderAccessTest`, thêm `UserRepository users` mock trả admin):

```java
@Test
void anAdminCanReadAnyOrderWithTheCustomerBlock() {
    when(orderQueries.findDetail(ORDER_ID)).thenReturn(Optional.of(aPlacedOrder(CUSTOMER_ID, FARMER_USER_ID)));
    User admin = new User(); admin.setId(1L); admin.setRole(RoleType.ADMIN);
    when(users.findById(1L)).thenReturn(Optional.of(admin));

    OrderDetailResource detail = service.detail(1L, ORDER_ID);

    assertThat(detail.customer()).isNotNull();
    assertThat(detail.canCancel()).isFalse();
}

@Test
void anotherCustomerIsStillRefused() {
    when(orderQueries.findDetail(ORDER_ID)).thenReturn(Optional.of(aPlacedOrder(CUSTOMER_ID, FARMER_USER_ID)));
    when(users.findById(OTHER_CUSTOMER_ID)).thenReturn(Optional.of(user(OTHER_CUSTOMER_ID, RoleType.CUSTOMER)));
    assertThatThrownBy(() -> service.detail(OTHER_CUSTOMER_ID, ORDER_ID)).isInstanceOf(OrderNotYoursException.class);
}
```
Expected: FAIL (403 cho admin).

- [ ] **Step 1.4: GREEN** — trong `OrderService.detail`, trước `if (!isBuyer && !isOwningFarmer)`:

```java
// D-04: admin is read-only oversight — may read any order (with the customer block), never act on it.
boolean isAdmin = userRepository.findById(userId).map(u -> u.getRole() == RoleType.ADMIN).orElse(false);
if (!isBuyer && !isOwningFarmer && !isAdmin) {
    throw new OrderNotYoursException();
}
CustomerSummaryResource customer =
        (isOwningFarmer || isAdmin) ? new CustomerSummaryResource(...) : null;
```
`OrderController.get` hiện `@PreAuthorize("hasAnyRole('CUSTOMER','FARMER')")` ở class → đổi thành `hasAnyRole('CUSTOMER','FARMER','ADMIN')` **chỉ trên method `get`** (POST vẫn cấm admin). Run test → PASS.

- [ ] **Step 1.5: RED — admin list review + farmer list review** — `ReviewListingTest` (@SpringBootTest, `ReportFixture` + 2 review chèn qua `ReviewServiceInterface.create` như `ReviewRatingCacheTest`):

```java
@Test void adminListFiltersHiddenAndLowRatings() {
    ReviewResource good = productReview(0, 5); ReviewResource bad = productReview(1, 1);
    reviews.adminSetStatus(bad.id(), true);
    assertThat(reviews.adminList("hidden", null, null, 1, 50).items()).extracting(AdminReviewResource::id).contains(bad.id()).doesNotContain(good.id());
    assertThat(reviews.adminList(null, 2, null, 1, 50).items()).extracting(AdminReviewResource::id).contains(bad.id()).doesNotContain(good.id());
    assertThat(reviews.adminList(null, null, customerId, 1, 50).items()).extracting(AdminReviewResource::id).contains(good.id());
}
@Test void farmerListCoversStallAndProductReviews() {
    productReview(0, 4); farmerReview(1, 5);
    PageResource<ReviewResource> mine = reviews.forStallOwner(farmerUserId, 1, 50);
    assertThat(mine.items()).hasSize(2);
    assertThat(mine.items()).extracting(ReviewResource::targetName).contains("Rated product " + tag, "Stall rating " + tag);
}
```
Expected: FAIL (compile: `adminList`, `forStallOwner`, `targetName`).

- [ ] **Step 1.6: GREEN** — `ReviewResource` thêm `String targetName` cuối (product name hoặc stall name; `create` điền từ `Product`/`FarmerProfile` đã load; mapper JDBC lấy `COALESCE(p.name, f.stall_name) AS target_name` với `LEFT JOIN products p ON p.id = r.product_id LEFT JOIN farmer_profiles f ON f.id = r.farmer_id`). `ReviewQueryRepository`:
  - `ADMIN_LIST_SQL`: cột list + `r.status, r.customer_id, sp.stall_name` (`LEFT JOIN farmer_profiles sp ON sp.id = COALESCE(r.farmer_id, p.farmer_id)`), `WHERE (:status IS NULL OR r.status = :status) AND (:maxRating IS NULL OR r.rating <= :maxRating) AND (:customerId IS NULL OR r.customer_id = :customerId)`, newest first, LIMIT/OFFSET + COUNT.
  - `FOR_STALL_OWNER_SQL`: list + `WHERE r.status = 'visible' AND (r.farmer_id = :farmerId OR p.farmer_id = :farmerId)`.
  - `AdminReviewResource` record như Interfaces. Service: `adminList(String status, Integer maxRating, Long customerId, int page, int size)` (status whitelist visible|hidden|null), `forStallOwner(long farmerUserId, int page, int size)` (farmerId từ `farmerRepository.findByUserId` → 403 nếu không có). Controller: `AdminReviewController` thêm `@GetMapping`; `FarmerReviewController` thêm `@GetMapping`. Run → PASS. `spotless:apply`.

- [ ] **Step 1.7: RED — customer detail + orders theo customer + top products** — thêm vào `AdminCustomerServiceTest`:

```java
@Test void detailReturnsOneCustomerAndRefusesAStall() {
    assertThat(customers.detail(customerId).email()).isEqualTo(email);
    assertThatThrownBy(() -> customers.detail(farmerUserId)).isInstanceOf(CustomerNotFoundException.class);
}
```
và vào `AdminReportServiceTest`:

```java
@Test void ordersReportFiltersByCustomer() {
    assertThat(reports.orders(null, null, null, null, customer, 1, 10).total()).isEqualTo(3);
}
@Test void topProductsSumCompletedQuantities() {
    List<TopProductResource> top = reports.topProducts(null, null, 50);
    TopProductResource mine = top.stream().filter(p -> p.productId() == p1).findFirst().orElseThrow();
    assertThat(mine.quantitySold()).isEqualTo(7);   // 4 + 3 completed; the placed order's 1 is not counted
    assertThat(mine.revenue()).isEqualByComparingTo("70000");
}
```
(`farmerUserId`, `customer`, `p1` là biến fixture — lưu vào field ở `setUp`.) Expected: FAIL (compile).

- [ ] **Step 1.8: GREEN** — `AdminCustomerService.detail(long id)`: `queries.findOne(id).orElseThrow(CustomerNotFoundException::new)` (ONE_SQL đã lọc `role = 'customer'`); controller `@GetMapping("/{id}")`. `AdminReportRepository.ORDERS_WHERE` thêm `AND (:customerId IS NULL OR o.customer_id = :customerId)`, tham số `customerId` (Types.BIGINT); `orders(...)` thêm tham số `Long customerId` (interface + service + controller `@RequestParam(required=false) Long customerId`). `TOP_PRODUCTS_SQL`:

```sql
SELECT oi.product_id, oi.product_name AS name, f.stall_name, oi.unit,
       MAX(oi.unit_price) AS unit_price, SUM(oi.quantity) AS quantity_sold, SUM(oi.subtotal) AS revenue
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
JOIN farmer_profiles f ON f.id = o.farmer_id
WHERE o.status = 'completed'
  AND (:from IS NULL OR o.pickup_date >= :from)
  AND (:to   IS NULL OR o.pickup_date <= :to)
GROUP BY oi.product_id, oi.product_name, f.stall_name, oi.unit
ORDER BY quantity_sold DESC, revenue DESC
LIMIT :limit
```
`topProducts(from, to, limit)` qua service (limit 1–50) + `@GetMapping("/reports/top-products")`. Run 4 lớp test → PASS. `spotless:apply`.

- [ ] **Step 1.9: Suite + commit**
Run: full suite (lệnh ở Global Constraints, bỏ `-Dtest`) → Expected: `Tests run: ≥ 830, Failures: 0`. Commit từng phần:
```bash
git commit -m "feat(FR-065): order lists carry the customer name; admins can read any order"
git commit -m "feat(FR-053, FR-074): review lists for the stall owner and the admin moderation queue"
git commit -m "feat(FR-072, FR-075): admin customer detail, orders by customer, top products report"
```
Ghi 5 endpoint vào phần "Đề xuất LEAD" (§R.7 plan core-commerce) → LEAD cập nhật `docs/api-contract.md` §7, §8, §10.

---

## Task 2: Lớp dùng chung — cart store, mapping đơn hàng, OrderTicket thật, badge giỏ, ChatApi

**Files:**
- Create: `frontend/src/lib/cart.ts`, `frontend/src/lib/cart.test.ts`, `frontend/src/api-requests/chat.requests.ts`
- Modify: `frontend/src/types/order.types.ts`, `frontend/src/api-requests/order.requests.ts` (+ `order.requests.test.ts`), `frontend/src/components/OrderTicket.tsx`, `frontend/src/layout/MainLayout.tsx`, `frontend/src/locales/en/common.json`, `frontend/src/locales/vi/common.json`

**Interfaces:**
- Produces:
  - `type CartLine = { productId: number; name: string; unit: string; price: number; max: number; qty: number; farmerId: number; stallName: string }`
  - `Cart.add(line: Omit<CartLine,'qty'>, qty?: number): void` · `Cart.setQty(productId, qty)` · `Cart.remove(productId)` · `Cart.clear()` · `Cart.lines(): CartLine[]` · `Cart.count(): number` · hook `useCart(): CartLine[]`
  - `OrderType` thêm tuỳ chọn: `id?, stallName?, marketName?, total?, itemCount?`; `OrderLineType` thêm `name?, unit?, price?`
  - `toOrderCard(dto: OrderListItemDto): OrderType` (dùng cho mọi danh sách) · `toOrder(dto: OrderDetailDto)` giữ chữ ký, điền thêm các field mới
  - `OrderTicket` props thêm `onChanged?: (order: OrderType) => void`; nút Cancel/Reorder gọi API thật
  - `ChatApi.ask(sessionKey, message): Promise<ChatReplyDto>` · `ChatApi.history(sessionKey): Promise<ChatMessageDto[]>`

- [ ] **Step 2.1: RED — cart store** `frontend/src/lib/cart.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { Cart } from './cart';

const tomato = { productId: 1, name: 'Tomato', unit: 'kg', price: 25000, max: 5, farmerId: 7, stallName: 'Cô Tư' };

describe('Cart', () => {
  beforeEach(() => Cart.clear());

  it('adds a line and merges the quantity of the same product', () => {
    Cart.add(tomato, 2);
    Cart.add(tomato, 1);
    expect(Cart.lines()).toEqual([{ ...tomato, qty: 3 }]);
    expect(Cart.count()).toBe(3);
  });

  it('never exceeds the stock the product had when it was added', () => {
    Cart.add(tomato, 4);
    Cart.add(tomato, 4);
    expect(Cart.lines()[0].qty).toBe(5);
    Cart.setQty(1, 99);
    expect(Cart.lines()[0].qty).toBe(5);
  });

  it('removes a line and survives a reload through localStorage', () => {
    Cart.add(tomato, 1);
    Cart.add({ ...tomato, productId: 2, name: 'Lettuce' }, 1);
    Cart.remove(1);
    expect(JSON.parse(localStorage.getItem('ml.cart') ?? '[]')).toHaveLength(1);
    expect(Cart.lines().map((l) => l.productId)).toEqual([2]);
  });
});
```
Run: `cd frontend && npx vitest run src/lib/cart.test.ts` → Expected: FAIL (module not found).

- [ ] **Step 2.2: GREEN** `frontend/src/lib/cart.ts`:

```ts
import { useSyncExternalStore } from 'react';

/** One product in the cart. `max` is the stock at the time it was added; the server re-checks on preview/place. */
export type CartLine = {
  productId: number;
  name: string;
  unit: string;
  price: number;
  max: number;
  qty: number;
  farmerId: number;
  stallName: string;
};

const KEY = 'ml.cart';
const EMPTY: CartLine[] = [];
const listeners = new Set<() => void>();
let cache: CartLine[] | null = null;

const read = (): CartLine[] => {
  if (cache) return cache;
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    cache = Array.isArray(parsed) ? (parsed as CartLine[]) : EMPTY;
  } catch {
    cache = EMPTY;
  }
  return cache;
};

const write = (lines: CartLine[]) => {
  cache = lines;
  try {
    localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {
    // private mode / quota: the in-memory copy still works for this tab
  }
  listeners.forEach((l) => l());
};

const clamp = (line: CartLine, qty: number) => Math.max(1, Math.min(line.max, qty));

/** FR-030 — the cart lives in the browser (S.4.3, no `carts` table); one order per stall is split on preview. */
export const Cart = {
  lines: read,
  count: () => read().reduce((n, l) => n + l.qty, 0),
  add(line: Omit<CartLine, 'qty'>, qty = 1) {
    const lines = read();
    const found = lines.find((l) => l.productId === line.productId);
    write(
      found
        ? lines.map((l) => (l === found ? { ...l, ...line, qty: clamp(l, l.qty + qty) } : l))
        : [...lines, { ...line, qty: clamp({ ...line, qty }, qty) }],
    );
  },
  setQty(productId: number, qty: number) {
    write(read().map((l) => (l.productId === productId ? { ...l, qty: clamp(l, qty) } : l)));
  },
  remove(productId: number) {
    write(read().filter((l) => l.productId !== productId));
  },
  clear() {
    write(EMPTY);
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

/** The cart lines, re-rendering the component when any tab changes them. */
export function useCart(): CartLine[] {
  return useSyncExternalStore(Cart.subscribe, Cart.lines, () => EMPTY);
}
```
Run test → PASS. (`localStorage` có sẵn trong jsdom của vitest.)

- [ ] **Step 2.3: RED — mapping đơn** thêm vào `order.requests.test.ts`:

```ts
import { toOrderCard } from './order.requests';

it('toOrderCard keeps the names and the total the ticket shows, and locks a placed order after its cutoff', () => {
  const card = toOrderCard({ ...baseDto().summary, cutoffAt: '2000-01-01T00:00:00Z', customerId: 2, customerName: 'An' });
  expect(card).toMatchObject({ id: 42, stallName: 'Cô Tư Garden', marketName: 'Thảo Điền Weekend Market', total: 150000, itemCount: 2, locked: true, items: [] });
});

it('toOrder carries product names, unit prices and the reviewed flag into the ticket', () => {
  const order = toOrder({ ...baseDto(), reviewed: true });
  expect(order.items[0]).toEqual({ productId: 1, qty: 2, name: 'Tomato', unit: 'kg', price: 25000 });
  expect(order.reviewed).toBe(true);
  expect(order.total).toBe(150000);
});
```
Thêm `customerId: 2, customerName: 'An'` vào `summary` của `baseDto` và `reviewed: false` vào `OrderDetailDto` (Task 1 + #163). Run: `npx vitest run src/api-requests/order.requests.test.ts` → Expected: FAIL.

- [ ] **Step 2.4: GREEN** — `types/order.types.ts`:

```ts
export type OrderLineType = { productId: number; qty: number; name?: string; unit?: string; price?: number };
export type OrderType = {
  /** Numeric id for every API call; the code is only for display. */
  id?: number;
  code: string;
  farmerId: number;
  marketId: number;
  stallName?: string;
  marketName?: string;
  /** `yyyy-MM-dd`; the ticket formats it for the reader. */
  date: string;
  slot: string;
  status: OrderStatus;
  /** ISO instant. */
  cutoff: string;
  locked?: boolean;
  items: OrderLineType[];
  /** From the list endpoint, where the lines are not sent. */
  itemCount?: number;
  total?: number;
  reason?: string;
  reviewed?: boolean;
  history: OrderHistoryEntry[];
};
```
`order.requests.ts`: `OrderListItemDto` thêm `customerId: number; customerName: string;`, `OrderDetailDto` thêm `reviewed: boolean;`.

```ts
const pastCutoff = (status: OrderStatus, cutoffAt: string) =>
  (status === 'placed' || status === 'accepted') && Date.now() > Date.parse(cutoffAt);

/** A list row (`GET /orders`, `GET /farmer/orders`, `GET /admin/reports/orders`) → the shape OrderTicket and tables take. */
export const toOrderCard = (dto: OrderListItemDto): OrderType => ({
  id: dto.orderId,
  code: dto.orderCode,
  farmerId: dto.farmerId,
  marketId: dto.marketId,
  stallName: dto.stallName,
  marketName: dto.marketName,
  date: dto.pickupDate,
  slot: `${dto.pickupStart}–${dto.pickupEnd}`,
  status: dto.status,
  cutoff: dto.cutoffAt,
  locked: pastCutoff(dto.status, dto.cutoffAt),
  items: [],
  itemCount: dto.itemCount,
  total: dto.totalAmount,
  history: [],
});
```
`toOrder` sửa: `id: dto.summary.orderId, stallName, marketName, total: dto.summary.totalAmount, itemCount, reviewed: dto.reviewed, items: dto.items.map((i) => ({ productId: i.productId, qty: i.quantity, name: i.productName, unit: i.unit, price: i.unitPrice }))`. Run test → PASS; `npx tsc -b` (các trang demo còn dùng `toOrder` không vỡ vì field mới đều optional).

- [ ] **Step 2.5: OrderTicket thật** — thay import `@/data/customer` bằng:

```ts
import { useState } from 'react';
import { useNavigate } from 'react-router';
import OrderApi, { toOrder } from '@/api-requests/order.requests';
import ProductApi from '@/api-requests/product.requests';
import { Dialog } from '@/components/ui/dialog';
import { Cart } from '@/lib/cart';
import { dayName, formatClock, formatDayMonth, formatDate, formatTime, vnd } from '@/lib/format';
import Notification from '@/utils/notification';
import Helper from '@/utils/helper';
```
Props: `type OrderTicketProps = { order: OrderType; fluid?: boolean; hideActions?: boolean; onChanged?: (order: OrderType) => void }`. Helpers trong file:

```ts
const localDay = (ymd: string) => { const [y, m, d] = ymd.split('-').map(Number); return new Date(y, m - 1, d); };
const pickup = (o: OrderType) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(o.date)) return `${o.date} · ${o.slot}`;
  const d = localDay(o.date);
  return `${dayName(d.getDay())} ${formatDayMonth(d)} · ${o.slot.split('–').map(formatClock).join('–')}`;
};
const cutoffLabel = (iso: string) => { const at = new Date(iso); return Number.isNaN(at.getTime()) ? iso : `${formatTime(at)} ${formatDate(at)}`; };
const total = (o: OrderType) => o.total ?? o.items.reduce((s, l) => s + l.qty * (l.price ?? 0), 0);
```
JSX: tên stall `order.stallName ?? ''`, chợ `order.marketName ?? ''`, pickup `pickup(order)`, cutoff `cutoffLabel(order.cutoff)`, tổng `vnd(total(order))`. Danh sách dòng: nếu `order.items.length` render như cũ với `line.name`/`line.price ?? 0`; nếu rỗng render một `<li>` `t('order.itemCount', { count: order.itemCount ?? 0 })`. Nút Cancel:

```tsx
const [confirming, setConfirming] = useState(false);
const [busy, setBusy] = useState(false);
const cancel = async () => {
  if (order.id == null) return;
  setBusy(true);
  try {
    const updated = toOrder(await OrderApi.cancel(order.id));
    onChanged?.(updated);
    Notification.success({ text: t('order.cancelledToast', { code: order.code }) });
  } catch (error) {
    Notification.error({ text: Helper.getErrorMessage(error, t('errors.network')) });
  } finally {
    setBusy(false);
    setConfirming(false);
  }
};
```
Nút Reorder (Review Focus #5):

```tsx
const reorder = async () => {
  if (order.id == null) return;
  setBusy(true);
  try {
    const lines = await OrderApi.reorder(order.id);
    const products = await Promise.all(lines.map((l) => ProductApi.get(l.productId)));
    products.forEach((p, i) =>
      Cart.add({ productId: p.product.id, name: p.product.name, unit: p.product.unit, price: Number(p.product.price), max: p.product.stockQuantity, farmerId: p.product.farmerId, stallName: p.product.stallName }, lines[i].quantity),
    );
    const dropped = (order.itemCount ?? order.items.length) - lines.length;
    Notification.success({ text: dropped > 0 ? t('order.reorderedPartly', { count: dropped }) : t('order.reordered') });
    navigate('/cart');
  } catch (error) {
    Notification.error({ text: Helper.getErrorMessage(error, t('errors.network')) });
  } finally { setBusy(false); }
};
```
(`ProductApi.get` trả `ProductDetailDto` = `{ product: ProductDto, ... }` — xem `product.requests.ts:30`.) `<Dialog>` xác nhận huỷ dùng cùng props như `pages/customer/OrderDetail/index.tsx` (đã có mẫu). Nút Reorder hiện với mọi đơn `completed` (không chỉ khi chưa review). Keys mới trong `common.json` en/vi: `order.itemCount` ("{{count}} item" / "{{count}} sản phẩm"), `order.cancelConfirmTitle` ("Cancel this order?" / "Huỷ đơn này?"), `order.cancelConfirmText` ("The stall will be told and the stock goes back on sale." / "Sạp sẽ được báo và hàng trả lại kệ."), `order.cancelledToast` ("Order {{code}} cancelled." / "Đã huỷ đơn {{code}}."), `order.reordered` ("Everything is back in your cart." / "Đã cho lại vào giỏ."), `order.reorderedPartly` ("Added to your cart; {{count}} item is no longer sold." / "Đã cho vào giỏ; {{count}} sản phẩm không còn bán."), `errors.network` đã có.

- [ ] **Step 2.6: Badge giỏ** — `MainLayout.tsx`: `const lines = useCart();` và truyền `cartCount={lines.reduce((n, l) => n + l.qty, 0)}` thay prop `cartCount` (bỏ prop khỏi `MainLayoutProps`; `App.tsx` không truyền gì nên không vỡ).

- [ ] **Step 2.7: ChatApi** `frontend/src/api-requests/chat.requests.ts`:

```ts
import type { ApiResponse } from '@/types/api.types';
import { publicApi } from '@/utils/axiosInstance';

export type ChatIntent = 'GREETING' | 'HELP' | 'FIND_PRODUCT' | 'PRODUCT_DETAIL' | 'MARKET_HOURS' | 'FARMER_AVAILABILITY' | 'PICKUP_WINDOW' | 'UNKNOWN';
export type ChatResultDto = { type: 'product' | 'market' | 'farmer'; id: number; title: string; subtitle: string | null };
export type ChatReplyDto = { reply: string; intent: ChatIntent; results: ChatResultDto[] };
export type ChatMessageDto = { role: 'user' | 'bot'; message: string; intent: string | null; createdAt: string };

/** FR-090…092 — intent → prepared SQL on the server (R-04); public, the session key is a client-made UUID. */
class ChatApi {
  static ask = async (sessionKey: string, message: string) => {
    const response = await publicApi.post<ApiResponse<ChatReplyDto>>('/chat', { sessionKey, message });
    return response.data.data;
  };
  static history = async (sessionKey: string) => {
    const response = await publicApi.get<ApiResponse<ChatMessageDto[]>>('/chat/history', { params: { sessionKey } });
    return response.data.data;
  };
}
export default ChatApi;
```
(`publicApi` vẫn gửi token nếu có? Kiểm `utils/axiosInstance.ts`: nếu chỉ `privateApi` gắn Authorization thì lịch sử của user đăng nhập cần `privateApi` — dùng `privateApi` khi `Session.getRawUser()` khác null, nếu không `publicApi`.)

- [ ] **Step 2.8: Lint + commit**
Run: `npx tsc -b && npx eslint src && npx vitest run` → PASS.
```bash
git commit -m "feat(FR-030, FR-037): browser cart store, order card mapping and a live OrderTicket"
git commit -m "feat(FR-090): chat API client"
```

---

## Task 3: Cart → đặt đơn thật, nút "Add to cart", OrderPlaced

**Files:**
- Modify: `frontend/src/pages/customer/Cart/index.tsx` (viết lại phần dữ liệu, giữ JSX `CartGroup`/`DayChips`/`SlotPicker`/`Banner`), `pages/customer/OrderPlaced/index.tsx`, `pages/public/ProductDetail/index.tsx:165-195`, `components/ProductCard.tsx:87-96`, `App.tsx` (bỏ `CustomerCartPage`, `CustomerOrderPlacedPage` khỏi SHOW_WIP), `locales/{en,vi}/CustomerCart.json`, `CustomerOrderPlaced.json`

**Interfaces:**
- Consumes: `Cart`, `useCart` (Task 2); `OrderApi.preview(items)` → `OrderGroupPreviewDto[]`; `StallApi.slots(farmerId, { marketId })` → `SlotDto[]`; `toSlotOption`; `OrderApi.place(groups)` → `PlacedOrderDto[]`; `OrderApi.get`, `toOrder`.
- Produces: `navigate('/orders/placed', { state: { orders: PlacedOrderDto[] } })`.

- [ ] **Step 3.1: RED — giỏ giữ nguyên khi place thất bại** thêm vào `cart.test.ts`:

```ts
it('is only cleared by the caller after a successful place — a failed place keeps every line', () => {
  Cart.add(tomato, 2);
  const placed = Promise.reject(new Error('409 OUT_OF_STOCK'));
  return placed.catch(() => undefined).then(() => expect(Cart.count()).toBe(2));
});
```
(Test ghim hợp đồng: `Cart.clear()` chỉ gọi sau `await OrderApi.place`.) Run → PASS ngay (hợp đồng, không phải code mới) — giữ làm tài liệu; bước RED thật là 3.2.

- [ ] **Step 3.2: Viết lại phần dữ liệu của Cart** — thay toàn bộ phần trước `return (` bằng:

```tsx
const lines = useCart();
const navigate = useNavigate();
const { user } = useSession();
const previewKey = lines.map((l) => `${l.productId}:${l.qty}`).join(',');
const { state: previewLoad, retry } = useRequest(`cart-preview:${previewKey}`, () =>
  lines.length ? OrderApi.preview(lines.map((l) => ({ productId: l.productId, quantity: l.qty }))) : Promise.resolve([]),
);
const groups = previewLoad.kind === 'ready' ? previewLoad.data : [];
/** Per stall: chosen market (when the stall sells at several), pickup date, slot, note. */
type Choice = { marketId: number | null; date: string | null; slotId: string | null; note: string };
const [choices, setChoices] = useState<Record<number, Choice>>({});
const choice = (g: OrderGroupPreviewDto): Choice =>
  choices[g.farmerId] ?? { marketId: g.marketId ?? g.markets[0]?.marketId ?? null, date: null, slotId: null, note: '' };
const setChoice = (farmerId: number, patch: Partial<Choice>) =>
  setChoices((prev) => ({ ...prev, [farmerId]: { ...choice(groups.find((g) => g.farmerId === farmerId)!), ...prev[farmerId], ...patch } }));
```
Slot của từng group: một component con `StallPickup({ group, choice, onChange })` (trong cùng file) gọi

```tsx
const { state } = useRequest(`slots:${group.farmerId}:${choice.marketId}`, () =>
  choice.marketId ? StallApi.slots(group.farmerId, { marketId: choice.marketId }) : Promise.resolve([]),
);
const slots = state.kind === 'ready' ? state.data : [];
const dates = [...new Set(slots.map((s) => s.slotDate))];
const date = choice.date ?? dates[0] ?? null;
const dayOptions = dates.map((d) => { const x = localDay(d); return { value: d, label: dayName(x.getDay(), 'long'), date: formatDayMonth(x) }; });
const slotOptions = slots.filter((s) => s.slotDate === date).map(toSlotOption).map((o) => ({ ...o, time: o.time.split('–').map(formatClock).join('–') }));
```
render `DayChips` + `SlotPicker` như JSX cũ (value `choice.slotId`, `onChange={(v) => onChange({ slotId: v })}`; đổi ngày → `onChange({ date: v, slotId: null })`); nếu `group.markets.length > 1` thêm `SelectField` chọn chợ (`onChange({ marketId: Number(v), date: null, slotId: null })`); nếu `state.kind === 'error'` → `<LoadError noun={t('slotsNoun')} onRetry={retry} />`; nếu không có slot → `<DataState title={t('noSlots.title')} text={t('noSlots.text')} />`.
`CartGroup` items: `group.items.map((i) => ({ id: i.productId, name: i.name, unit: i.unit, price: i.unitPrice, max: i.stockQuantity, qty: i.quantity }))`; `onQtyChange={(id, q) => Cart.setQty(id, q)}`, `onRemove={(id) => Cart.remove(id)}`; `where` = tên chợ đã chọn + ngày/slot nếu đã chọn. Vấn đề của group (`group.problems`: `out_of_stock` | `sold_out` | `unavailable` | `stall_suspended`) hiện `<Banner variant="warning">` với `t(\`problem.${p}\`)`.
Tổng: `groups.reduce((s, g) => s + g.subtotal, 0)`. `ready` = mọi group có `slotId` và `date`, không `problems`, `lines.length > 0`.
Đặt hàng:

```tsx
const [placing, setPlacing] = useState(false);
const place = async () => {
  setPlacing(true);
  try {
    const orders = await OrderApi.place(
      groups.map((g) => { const c = choice(g); return { farmerId: g.farmerId, marketId: c.marketId!, slotId: Number(c.slotId), pickupDate: c.date!, items: g.items.map((i) => ({ productId: i.productId, quantity: i.quantity })), customerNote: c.note || undefined }; }),
    );
    Cart.clear();
    navigate('/orders/placed', { state: { orders } });
  } catch (error) {
    Notification.error({ text: Helper.getErrorMessage(error, tc('errors.network')) });
    retry(); // stock or slot changed under us (409): show the fresh preview, keep the cart
  } finally { setPlacing(false); }
};
```
Trạng thái: chưa đăng nhập → trang nằm sau `RequireAuth` (đã có). `lines.length === 0` → `<DataState fill title={t('empty.title')} text={t('empty.text')} action={<ButtonLink to="/products">{t('empty.cta')}</ButtonLink>} />`. `previewLoad.kind === 'loading'` → `<p role="status">`; `error` → `<LoadError noun={t('noun')} onRetry={retry} />`. Xoá `SLOTS_1/2`, `DAYS`, `items1/2`. Keys en/vi thêm: `empty.title/text/cta`, `noun`, `slotsNoun`, `noSlots.title/text`, `problem.out_of_stock|sold_out|unavailable|stall_suspended`, `market` (nhãn select chợ), `placing`.

- [ ] **Step 3.3: Add to cart** — `ProductDetail`: nút `onClick={() => { Cart.add({ productId: p.id, name: p.name, unit: p.unit, price: Number(p.price), max: p.stockQuantity, farmerId: p.farmerId, stallName: p.stallName }, qty); Notification.success({ title: t('added.title'), text: t('added.text', ...) }); }}` và **bỏ** `SHOW_WIP &&` quanh khối nút (giữ điều kiện `status === 'available' && stockQuantity > 0`). `ProductCard`: thay `SHOW_WIP && (...)` bằng `soldOut ? null : <Button size="sm" onClick={() => Cart.add({ productId: product.id, name: product.name, unit: product.unit, price: product.price, max: product.stock, farmerId: product.farmerId ?? 0, stallName: product.stall })}>` (nút "notifyMe" bỏ — restock alert đi qua Favorites, Task 5).

- [ ] **Step 3.4: OrderPlaced** — thay dữ liệu demo:

```tsx
const { state: nav } = useLocation() as { state: { orders?: PlacedOrderDto[] } | null };
const placed = nav?.orders ?? [];
const { state } = useRequest(`placed:${placed.map((o) => o.orderId).join(',')}`, () => Promise.all(placed.map((o) => OrderApi.get(o.orderId))));
if (!placed.length) return <Navigate to="/orders" replace />;
if (state.kind === 'loading') return <p role="status" className="text-ink-muted">{tc('notify.list.loading')}</p>;
if (state.kind === 'error') return <LoadError noun={t('noun')} alt={<Link to="/orders">{t('seeOrders')}</Link>} />;
const placedOrders = state.data.map(toOrder);
const stalls = list(placedOrders.map((o) => o.stallName ?? ''));
const cutoffs = list(placedOrders.map((o) => { const at = new Date(o.cutoff); return t('steps.cutoffAt', { time: formatTime(at), date: formatDayMonth(at) }); }));
```
`PLACED_AT` → `new Date(state.data[0].statusHistory[0]?.changedAt ?? Date.now())`. Xoá `order2`, `CUTOFFS`.

- [ ] **Step 3.5: App.tsx** — xoá 2 dòng `CustomerCartPage`/`CustomerOrderPlacedPage` khỏi SHOW_WIP và dùng import trực tiếp (đổi tên import `CustomerCartWip` → `CustomerCartPage`).

- [ ] **Step 3.6: Lint, kiểm tay, commit** — `npx tsc -b && npx eslint src && npx vitest run`. Kiểm tay (`make up`, `make seed`, đăng nhập `customer@marketlink.vn`): thêm "Rau muống" ×2 + "Bưởi da xanh" ×1 → `/cart` tách 2 sạp; chọn ngày/slot; Đặt → `/orders/placed` 2 vé; F5 giỏ rỗng; đặt lại cùng slot 6 lần → 409 `SLOT_FULL` hiện toast, giỏ còn nguyên (Review Focus #1).
```bash
git commit -m "feat(FR-030, FR-031, FR-032): the cart previews, splits per stall and places real orders"
```

---

## Task 4: Customer Orders, OrderEdit, Dashboard

**Files:** `pages/customer/Orders/index.tsx`, `pages/customer/OrderEdit/index.tsx`, `pages/customer/Dashboard/index.tsx`, `App.tsx`, locale `CustomerOrders`, `CustomerOrderEdit`, `CustomerDashboard` (en, vi)

**Interfaces:** Consumes `OrderApi.list`, `toOrderCard`, `OrderApi.get`, `toOrder`, `OrderApi.modifyItems`, `FavoriteApi.list`, `NotificationApi.unreadCount`, `ProductApi.get`, `toProduct`, `useSession`.

- [ ] **Step 4.1: Orders** — thay `orders`/`farmerName`:

```tsx
const { state, retry, mutate } = useRequest('my-orders', () => OrderApi.list({ pageSize: 50 }));
const all = state.kind === 'ready' ? state.data.items.map(toOrderCard) : [];
const stalls = [...new Set(all.map((o) => o.stallName ?? ''))].filter(Boolean);
const byStall = (list: OrderType[]) => (stall === '' ? list : list.filter((o) => o.stallName === stall));
const onChanged = (updated: OrderType) =>
  mutate((page) => ({ ...page, items: page.items.map((i) => (i.orderId === updated.id ? { ...i, status: updated.status } : i)) }));
```
`STALLS` → `stalls`. Trạng thái: loading `<p role="status">`; error `<LoadError noun={t('noun')} onRetry={retry} />`; `shown.length === 0` → `<DataState fill title={t(\`empty.${tab}.title\`)} text={t(\`empty.${tab}.text\`)} action={<ButtonLink to="/products">{t('empty.cta')}</ButtonLink>} />`. `OrderTicket ... onChanged={onChanged}`.

- [ ] **Step 4.2: OrderEdit** — `id = Number(code)`; `useRequest(\`order:${id}\`, () => OrderApi.get(id))`; `order = toOrder(data)`; nếu `!data.canModify` → màn "locked" (`t('locked.title/text')` + link về `/orders/${id}`); qty state khởi tạo từ `order.items` (`useState<Record<number, number>>` lazy-init khi ready — khởi tạo trong `useMemo` không được vì state; dùng khuôn "mirror-until-edited": `const [edits, setEdits] = useState<Record<number, number>>({}); const qtyOf = (l) => edits[l.productId] ?? l.qty;`), `QtyStepper` max: không biết tồn kho → cho tăng tới `qtyOf + 20`, server trả 409 `OUT_OF_STOCK` → toast. Lưu: `await OrderApi.modifyItems(id, items.map((l) => ({ productId: l.productId, quantity: qtyOf(l) })).filter((l) => l.quantity > 0))` → `navigate(\`/orders/${id}\`)`. Bỏ dòng = quantity 0 (server hiểu là xoá — kiểm `ModifyOrderRequest`: nếu server bắt `> 0`, gửi danh sách không có dòng đó).

- [ ] **Step 4.3: Dashboard** — `useSession().user?.fullName` thay 'Khang'; `useRequest('dash-orders', () => OrderApi.list({ pageSize: 50 }))` → `upcoming = items.filter(placed|accepted|ready)`; breakdown đếm theo status; `useRequest('dash-favs', () => FavoriteApi.list())` → count theo `targetType`; `useRequest('dash-unread', () => NotificationApi.unreadCount())`; "New from favorites": `favs.filter(product).slice(0,3)` → `Promise.all(ProductApi.get)` → `toProduct(dto.product, dto.description)` → `ProductCard`. Mỗi khối có state riêng (loading/empty/error) — dùng `DataState` nhỏ (không `fill`).

- [ ] **Step 4.4: App.tsx** bỏ 3 màn khỏi SHOW_WIP. Lint + vitest. Kiểm tay: `/orders` 12 đơn 3 tab; Cancel đơn `placed` → badge đổi ngay; `/orders/1/edit` giảm số lượng → lưu; `/orders/999` → màn "not yours".
```bash
git commit -m "feat(FR-033, FR-035, FR-036): customer orders, order edit and dashboard on real data"
```

---

## Task 5: Favorites + nút yêu thích thật

**Files:** `pages/customer/Favorites/index.tsx`, `components/FavoriteButton.tsx`, `pages/public/ProductDetail/index.tsx` (FavoriteButton), `pages/public/StallProfile/index.tsx:184-192` (Chip save), `pages/customer/Settings/index.tsx:8` (markets), `App.tsx`, locale `CustomerFavorites` (en, vi)

**Interfaces:** Consumes `FavoriteApi.list/add/remove`, `FavoriteDto`, `ProductApi.get`, `StallApi.get`, `CatalogApi.getMarket`, `toMarket`, `Cart`.
Produces: `FavoriteButton` props `{ targetType: FavoriteTargetType; targetId: number; favoriteId?: number | null; labelOff; labelOn; className? }` — `favoriteId` null = chưa lưu; nút tự gọi add/remove và giữ id nội bộ; chưa đăng nhập → `navigate('/login', { state: { from } })`.

- [ ] **Step 5.1: FavoriteButton** — thay `initial` bằng `favoriteId`: `const [id, setId] = useState<number | null>(favoriteId ?? null); const on = id != null;` toggle: `on ? (await FavoriteApi.remove(id), setId(null)) : setId((await FavoriteApi.add(input)).id)` với `input` theo `targetType` (`{ targetType: 'product', productId }` …); lỗi → `Notification.error`.
- [ ] **Step 5.2: Trang dùng nút** — `ProductDetail`: `useRequest(\`fav-product:${p.id}\`, () => isLoggedIn ? FavoriteApi.list('product') : Promise.resolve([]))` → `favoriteId = list.find((f) => f.targetId === p.id)?.id ?? null` → `<FavoriteButton targetType="product" targetId={p.id} favoriteId={favoriteId} …/>` (key theo favoriteId để reset). `StallProfile`: thay `SHOW_WIP && <Chip …>` bằng `<FavoriteButton targetType="farmer" targetId={stall.farmerId} favoriteId={…} labelOff={t('save')} labelOn={t('saved')} />`. `MarketDetail` (nếu có chỗ "Save market"): cùng cách với `targetType="market"`.
- [ ] **Step 5.3: Favorites page** — `useRequest(\`favorites:${tab}\`, () => FavoriteApi.list(tab === 'stalls' ? 'farmer' : tab === 'markets' ? 'market' : 'product'))`. Tab products: render từ `FavoriteDto` (`title` → link `/products/${targetId}`, `subtitle`, `available` → badge in-stock / sold-out + "alert on" (server gửi restock alert cho mọi favorite — FR-041, C7), nút Add to cart: `const d = await ProductApi.get(f.targetId); Cart.add({...})`, Remove → `FavoriteApi.remove(f.id)` + `mutate`). Filter `inStock|soldOut` theo `available`; bỏ `priceDropped` (không có dữ liệu giá cũ). Tab stalls: `Promise.all(favs.map((f) => StallApi.get(f.targetId)))` → thẻ tên/chợ/link `/stalls/:id` + Remove. Tab markets: `CatalogApi.getMarket(f.targetId)` → `MarketCard market={toMarket(dto.market)}` + Remove. Xoá `NEW_THIS_WEEK`, `wishProducts`, `markets`. 4 trạng thái mỗi tab. `Settings.tsx`: thay `markets` demo bằng `useRequest('markets', () => CatalogApi.listMarkets())` cho select "Market you shop at most".
- [ ] **Step 5.4:** App.tsx bỏ `CustomerFavoritesPage` khỏi SHOW_WIP; lint; kiểm tay: lưu sản phẩm ở `/products/1` → `/favorites` thấy; bỏ lưu; admin đăng nhập bấm lưu → toast 403.
```bash
git commit -m "feat(FR-040, FR-014): favourites and the favourite button on real data"
```

---

## Task 6: Reviews — form khách, danh sách public, Farmer trả lời, tab Admin

**Files:** `pages/customer/Review/index.tsx`, `pages/public/ProductDetail/index.tsx:118-124,310-340`, `pages/public/StallProfile/index.tsx:140-150,…`, `pages/farmer/Reviews/index.tsx`, `pages/admin/Moderation/index.tsx` (tab reviews), `api-requests/review.requests.ts` (+ `mine`, `adminList`, `toReviewCard`), `App.tsx`, locales (en, vi)

**Interfaces:** Consumes Task 1.6 (`GET /farmer/reviews`, `GET /admin/reviews`, `ReviewDto.targetName`). Produces `toReviewCard(dto): { id, author, date, target, rating, text, reply? }` (shape `ReviewCard` props), `ReviewApi.mine({page,pageSize})`, `ReviewApi.adminList({status,maxRating,customerId,page,pageSize})`.

- [ ] **Step 6.1: RED** `review.requests.test.ts`:
```ts
it('toReviewCard formats the date and turns the stall response into a reply', () => {
  const card = toReviewCard({ id: 1, targetType: 'product', targetId: 5, targetName: 'Rau muống', customerName: 'An', rating: 4, comment: 'ok', createdAt: '2026-09-17T03:00:00Z', response: { id: 9, responseText: 'Thanks', createdAt: '2026-09-17T06:00:00Z' } }, 'Vườn Út Hiền');
  expect(card).toMatchObject({ id: 1, author: 'An', target: 'Rau muống', rating: 4, text: 'ok', reply: { by: 'Vườn Út Hiền', text: 'Thanks' } });
});
```
Expected: FAIL. **GREEN:** thêm `targetName: string` vào `ReviewDto`; `toReviewCard = (dto, stallName) => ({ id: dto.id, author: dto.customerName, date: formatDate(new Date(dto.createdAt)), target: dto.targetName, targetType: dto.targetType, rating: dto.rating, text: dto.comment ?? '', reply: dto.response ? { by: stallName, date: formatDate(new Date(dto.response.createdAt)), text: dto.response.responseText } : undefined })`; `ReviewApi.mine`, `ReviewApi.adminList` (`AdminReviewDto` theo Task 1). PASS.
- [ ] **Step 6.2: Customer Review page** — `id = Number(code)`; `useRequest(\`order:${id}\`, () => OrderApi.get(id))`; `order = toOrder(data)`; chặn: `status !== 'completed'` → màn notCompleted; `data.reviewed` → màn "đã đánh giá" (`t('done.title/text')`, link `/orders/${id}`). Publish:
```tsx
const calls: Promise<unknown>[] = [];
if (stallRating > 0) calls.push(ReviewApi.create({ orderId: id, targetType: 'farmer', farmerId: order.farmerId, rating: stallRating, comment: stallComment || undefined }));
order.items.forEach((l) => { const r = productRatings[l.productId] ?? 0; if (!skipped[l.productId] && r > 0) calls.push(ReviewApi.create({ orderId: id, targetType: 'product', productId: l.productId, rating: r, comment: productComments[l.productId] || undefined })); });
const results = await Promise.allSettled(calls);
const failed = results.filter((r) => r.status === 'rejected' && !(isAxiosError(r.reason) && r.reason.response?.status === 409));
if (failed.length) Notification.error({ text: Helper.getErrorMessage(failed[0].reason, tc('errors.network')) }); else { Notification.success(...); navigate(`/orders/${id}`); }
```
`lineProduct(p)` → `l.name`/`l.unit`; `completedAt` từ `data.statusHistory.at(-1)?.changedAt`.
- [ ] **Step 6.3: ProductDetail / StallProfile** — thay `reviewsForProduct`/`reviewsForFarmer` + `SHOW_WIP` bằng `useRequest(\`reviews-product:${p.id}\`, () => ReviewApi.forProduct(p.id, { pageSize: 20 }))` → `items.map((r) => toReviewCard(r, p.stallName))` → `ReviewCard`; điểm trung bình lấy từ `detail.reviewsSummary` (đã thật); histogram render từ `reviewsSummary.histogram`. StallProfile: `ReviewApi.forFarmer(stall.farmerId, { pageSize: 50 })`, phân trang client như cũ. Xoá `EXTRA_REVIEW`, `reviewTags`, `demoTierOf` (tier ngoài đề: `authorTier` bỏ).
- [ ] **Step 6.4: Farmer Reviews** — `useRequest('farmer-profile', () => StallApi.myProfile())` (rating, count, stallName) + `useRequest('my-reviews', () => ReviewApi.mine({ pageSize: 50 }))` → `toReviewCard(r, profile.stallName)`; filter như cũ; `postReply`: `const res = await ReviewApi.respond(r.id, text); mutate((page) => ({ ...page, items: page.items.map((x) => (x.id === r.id ? { ...x, response: res } : x)) }))`; 409 → toast "đã trả lời". `PRODUCTS_RATING` bỏ (chỉ hiện rating stall).
- [ ] **Step 6.5: Admin Moderation tab Reviews** — bỏ `SHOW_WIP`, `reviews`, `reviewReport`, `hiddenItems`: `useRequest(\`admin-reviews:${reviewFilter}\`, () => ReviewApi.adminList(reviewFilter === 'lowRated' ? { maxRating: 2, status: 'visible' } : reviewFilter === 'hidden' ? { status: 'hidden' } : { status: 'visible' }))`; filters `newest | lowRated | hidden` (bỏ `reported` — không có "report review" trong đề); Hide → `ReviewApi.hide(id)` + `mutate` bỏ dòng; tab hidden có nút Unhide. Tab "hidden" cũ (listing đã ẩn) → dùng `ProductApi.list`? Không có `hidden=true` public; **giữ tab hidden chỉ cho review**, ghi đề xuất LEAD `GET /admin/products?hidden=true` (đã có trong §R.8 handoff).
- [ ] **Step 6.6:** App.tsx bỏ `CustomerReviewPage`, `FarmerReviewsPage`; lint; kiểm tay: review đơn 10 (chưa review sản phẩm "Mồng tơi") → `/products/<id>` điểm đổi; review lần 2 → 409 toast; farmer trả lời; admin ẩn → biến mất khỏi public.
```bash
git commit -m "feat(FR-050, FR-051, FR-052, FR-053, FR-074): review screens on real data"
```

---

## Task 7: Farmer Orders, OrderDetail, Overview, History, badge sidebar

**Files:** `pages/farmer/Orders/index.tsx`, `pages/farmer/OrderDetail/index.tsx`, `pages/farmer/Overview/index.tsx`, `pages/farmer/History/index.tsx`, `pages/farmer/Orders/demoDates.ts` (xoá), `layout/FarmerLayout.tsx:25,38`, `App.tsx`, locales `FarmerOrders`, `FarmerOrderDetail`, `FarmerOverview`, `FarmerHistory` (en, vi)

**Interfaces:** Consumes `OrderApi.farmerList({status,date,page,pageSize})` (+ `customerName` Task 1), `OrderApi.accept/decline/markReady/complete` → `OrderDetailDto`, `OrderApi.get`, `FarmerReportApi.dashboard/bestSellers/sales`, `ProductApi.mine`, `toFarmerProduct`.

- [ ] **Step 7.1: Orders** — `rows` từ `useRequest(\`farmer-orders:${tab}:${day}\`, () => OrderApi.farmerList({ status: tab, date: day === 'all' ? undefined : day, pageSize: 50 }))`; `DAY_OPTIONS` = 7 ngày từ hôm nay (`upcoming()` trong `lib/format` nếu có, hoặc tạo `Array.from({length: 7}, (_, i) => addDays(today, i))`) value `yyyy-MM-dd`; tìm kiếm client theo `orderCode`/`customerName`. Cột: `code` → `Link to={\`/farmer/orders/${r.orderId}\`}`; `who` → `r.customerName`; pickup → `pickup(toOrderCard(r))` (helper Task 2 — export `pickupLabel` từ `OrderTicket` sang `lib/format`? → thêm `export function pickupLabel(date: string, slot: string)` vào `lib/format.ts`, OrderTicket dùng nó); cutoff `cutoffLabel(r.cutoffAt)`; total `vnd(r.totalAmount)`. `move(id, action)`: `const d = await OrderApi[action](id, reason?)`; `mutate` cập nhật `status` dòng; toast. Decline dialog: reason = `t(\`decline.reasons.${reason}\`)` gửi lên server. Xoá `demoDates.ts`, `DAY_PREFIX`. 4 trạng thái.
- [ ] **Step 7.2: OrderDetail** — `id = Number(code)`; `useRequest(\`farmer-order:${id}\`, () => OrderApi.get(id))`; 403/404 → màn missing (Review Focus #2); `order = data` (DTO): tiêu đề `data.summary.orderCode · data.customer?.fullName · pickup`; bảng items từ `data.items` (name, unit, unitPrice, quantity, subtotal — cột "left" bỏ vì không có tồn kho trong DTO); actions theo `summary.status` → `mutate(() => await OrderApi.accept(id))` …; lịch sử từ `statusHistory`; "cùng khách" (`sameCustomer`) bỏ. Xoá `farmer(1)`, `product()`, `demoTierOf`.
- [ ] **Step 7.3: Overview** — `useRequest('farmer-dash', () => FarmerReportApi.dashboard())` → Kpi total/pending/revenueTotal/revenueThisMonth (bỏ `spark`, `delta`); bảng đơn theo tab: `OrderApi.farmerList({ status: TABS[tab].status, pageSize: 10 })`; actions như 7.1; "Stock for Saturday" → `ProductApi.mine()` → `StockList` rows `{ label: p.name, value: p.stock }` (đổi tiêu đề `t('stock.title')` = "Stock now"); Best sellers → `FarmerReportApi.bestSellers({ limit: 5 })` → `BarList rows={[{label: b.name, value: b.quantitySold}]}`. Xoá `overviewSpark`, `stockForSaturday`, `bestSellers`, `SAT/SUN`.
- [ ] **Step 7.4: History** — chọn tháng: `from/to` = đầu/cuối tháng đang xem (state `month: Date`, mặc định tháng hiện tại; nút tháng trước/sau thay `PeriodBar` cố định); `FarmerReportApi.sales({ from, to, pageSize: 50 })` → bảng (cột như cũ, `who` → `customerName`, items → `itemCount`); `FarmerReportApi.bestSellers({ from, to, limit: 8 })` → BarList `{ label: b.name, value: b.revenue }`; Kpi completed/declined/cancelled đếm từ… `sales` chỉ trả completed → đếm declined/cancelled qua `OrderApi.farmerList({ status, pageSize: 1 }).total` (2 request nhỏ). Bỏ "so với tháng trước" (không có API) và nút Export (toast giả) — ruling.
- [ ] **Step 7.5: FarmerLayout** — thay `AWAITING_COUNT` bằng `const { state: placedLoad } = useRequest('farmer-placed-count', () => OrderApi.farmerList({ status: 'placed', pageSize: 1 })); const awaiting = placedLoad.kind === 'ready' ? placedLoad.data.total : undefined;` và gán vào item `/farmer/orders`. Xoá import `@/data/farmer`.
- [ ] **Step 7.6:** App.tsx bỏ 4 màn; lint; kiểm tay với `farmer@marketlink.vn`: accept đơn 1 → badge giảm; decline đơn 2; ready → complete; `/farmer/orders/8` (đơn của farmer2) → missing.
```bash
git commit -m "feat(FR-065, FR-066, FR-068, FR-069): farmer orders and dashboards on real data"
```

---

## Task 8: Farmer Slots + Pending

**Files:** `pages/farmer/Slots/index.tsx`, `pages/farmer/Pending/index.tsx`, `App.tsx`, locales `FarmerSlots`, `FarmerPending` (en, vi)

**Interfaces:** Consumes `StallApi.myProfile()` (`markets[].farmerMarketId/marketId/marketName/operatingDays`, `approvalStatus`), `StallApi.slots(farmerId, { marketId, date })`, `StallApi.generateSlots`, `StallApi.updateSlot`, `FarmerApi.myApplication()`.

- [ ] **Step 8.1: Slots** — profile → select chợ (`marketId`); ngày: 14 ngày tới lọc theo `operatingDays` của chợ đó (`dayOfWeek`); `useRequest(\`slots:${marketId}:${date}\`, () => StallApi.slots(profile.farmerId, { marketId, date }))` → `Slot` rows `{ value: String(s.slotId), time: \`${s.startTime}–${s.endTime}\`, booked: s.bookedCount, max: s.maxOrders, off: !s.isActive }` (lưu ý: endpoint public **không trả slot đã tắt** — ghi đề xuất LEAD `GET /farmer/slots` §0 handoff; tạm thời checkbox "open" chỉ tắt được, bật lại qua Generate); sửa max → `StallApi.updateSlot(id, { maxOrders })` (409 `SLOT_BELOW_BOOKED` → toast); tắt → `updateSlot(id, { isActive: false })` + `mutate`. Generate dialog: `StallApi.generateSlots({ farmerMarketId, fromDate, toDate, slotMinutes: 60, maxOrders })` → `retry()`. Bỏ toàn bộ khối "Away days"/`MARKET_CLOSURE` (không có API farmer nghỉ chợ — đề không yêu cầu) — ruling. Cột "closes" → tính từ `orderCutoffHours` của profile: `formatTime(startOfSlot − cutoffHours)`.
- [ ] **Step 8.2: Pending** — `useRequest('my-application', () => FarmerApi.myApplication())` + `StallApi.myProfile()`: `approvalStatus` `pending` → khối reviewing với chi tiết thật (`stallName`, `contactPerson`, email từ `useSession`, chợ đầu tiên); `suspended` → banner với `suspendReason` (field có trong application DTO — kiểm `farmer.requests.ts` khi làm; nếu không có thì chỉ hiện ngày `suspendedAt`); `rejected` → banner lý do + link `/become-farmer`; `approved` → `<Navigate to="/farmer" replace />`. Bỏ toggle preview, `farmer(9)`, `farmer(10)`.
- [ ] **Step 8.3:** App.tsx bỏ 2 màn; lint; kiểm tay: đổi max slot, tắt slot, generate 2 tuần; đăng nhập farmer chưa duyệt (tạo qua `/become-farmer` bằng customer mới) → Pending hiện đúng.
```bash
git commit -m "feat(FR-067, FR-071): pickup slots and the approval screen on real data"
```

---

## Task 9: Admin — Home, Reports, Orders, OrderDetail, Customers, CustomerDetail, Feedback; form Feedback public

**Files:** `pages/admin/{Home,Reports,Orders,OrderDetail,Customers,CustomerDetail,Feedback}/index.tsx`, `pages/public/Feedback/index.tsx`, `api-requests/report.requests.ts` (+ `AdminReportApi.customer(id)`, `topProducts`, `orders` thêm `customerId`), `App.tsx`, locales (en, vi)

**Interfaces:** Consumes Task 1 (`GET /admin/customers/{id}`, `customerId`, top-products, admin đọc `GET /orders/{id}`, `customerName`), `AdminReportApi.*`, `FeedbackApi.*`, `ReviewApi.adminList({ customerId })`, `CatalogApi.listMarkets`, `AdminFarmerApi.list`.

- [ ] **Step 9.1: report.requests.ts** — thêm `customerId?: number` vào params của `orders`; `static customer = async (id: number) => (await privateApi.get<ApiResponse<AdminCustomerDto>>(\`/admin/customers/${id}\`)).data.data`; `export type TopProductDto = { productId; name; stallName; unit; unitPrice; quantitySold; revenue }` + `static topProducts(params: DateRange & { limit?: number })`. `OrderListItemDto` đã có `customerId/customerName` (Task 2).
- [ ] **Step 9.2: Home** — `AdminReportApi.dashboard()` → 4 Kpi (bỏ `spark`/`delta`; note farmers: `pendingFarmers`); attention: pending farmers = `dashboard.pendingFarmers`, feedback = `FeedbackApi.list({ status: 'new', pageSize: 1 }).total`, reported messages = `ModerationApi.reports({ status: 'open', page: 1, pageSize: 1 }).total` (kiểm chữ ký trong `moderation.requests.ts`), announcements bỏ; latest orders = `AdminReportApi.orders({ pageSize: 6 })` → cột `customerName`, `stallName`, `marketName`, `pickupLabel`, `vnd(totalAmount)`, badge. Bỏ biểu đồ "revenue by day" (không có series API) → thay bằng `AdminReportApi.revenueByMarket()` BarList.
- [ ] **Step 9.3: Reports** — `revenueByMarket({from,to})` → bảng chợ (stalls: bỏ cột, orders: `orderCount`, revenue); `topFarmers({from,to,limit:10})` → bảng (markets: bỏ, products: bỏ, rating `ratingAvg`); `topProducts` → bảng sản phẩm (`stallName`, `unit`, `perUnit(unitPrice, unit)`, `units(quantitySold, unit)`, `vnd(revenue)`); `dashboard()` → Kpi tổng; khoảng thời gian: state `from/to` (mặc định tháng này) + 2 input date; bỏ `Change` (%), `PERIOD/PREVIOUS`, Export.
- [ ] **Step 9.4: Orders** — `useRequest(\`admin-orders:${filter}:${market}:${page}\`, () => AdminReportApi.orders({ status: FILTER_STATUS[filter], marketId: market || undefined, page, pageSize: 20 }))`; chip counts: `Promise.all` 6 request `pageSize: 1` → `.total` (một `useRequest('admin-order-counts')`); select chợ từ `CatalogApi.listMarkets()`; cột customer → `Link to={\`${ADMIN_CUSTOMERS_PATH}/${o.customerId}\`}{o.customerName}`; `Pagination pages={Math.ceil(total / 20)}`. `FILTER_STATES` map `open` → gọi 3 request (placed/accepted/ready) rồi gộp? Đơn giản: filter `open` = `status` undefined + lọc client 3 trạng thái trong trang hiện tại là sai. → Chips: `all | placed | accepted | ready | completed | declined | cancelled` (1 status/chip) — ruling.
- [ ] **Step 9.5: OrderDetail** — `id = Number(code)`; `OrderApi.get(id)` (admin được đọc sau Task 1.4) → items từ DTO, buyer từ `data.customer`, stall/market từ summary; bỏ `customers[index]`, `farmer()`, `product()`.
- [ ] **Step 9.6: Customers** — `useRequest(\`admin-customers:${filter}:${query}:${page}\`, () => AdminReportApi.customers({ status: filter === 'all' ? undefined : filter, q: query || undefined, page, pageSize: 20 }))`; bỏ filter `joinedThisMonth` và `customerCounts` (counts = `total` của 3 request `pageSize:1`); cột: `fullName`, `email · phone`, `formatDate(new Date(createdAt))`, `orderCount`, status; Deactivate dialog → `AdminReportApi.setCustomerStatus(id, 'inactive')` → `mutate` dòng; reason: chỉ hiển thị trong toast (server không lưu lý do — ghi đề xuất LEAD nếu cần cột `deactivate_reason`). Nút disabled khi `busy` (Review Focus #4).
- [ ] **Step 9.7: CustomerDetail** — `AdminReportApi.customer(id)` (404 → missing); orders `AdminReportApi.orders({ customerId: id, pageSize: 20 })`; reviews `ReviewApi.adminList({ customerId: id, pageSize: 10 })` → ReviewCard; timeline (`customerTimeline`) bỏ — thay bằng `createdAt` + số đơn theo trạng thái đếm từ trang orders đã tải. Deactivate/reactivate như 9.6.
- [ ] **Step 9.8: Feedback admin + form public** — admin: `useRequest(\`feedback:${filter}\`, () => FeedbackApi.list({ status: filter === 'bug'|'suggestion'|'query' ? undefined : filter, pageSize: 50 }))` (lọc theo type ở client); filters `new | reviewed | resolved | bug | suggestion | query`; dialog: nút "Mark reviewed" / "Mark resolved" → `FeedbackApi.setStatus` + `mutate`; bỏ ô reply (không gửi trả lời — đề không yêu cầu). Form public: `FeedbackApi.submit({ type, message })` → toast + reset; bỏ select `page` và ô email (server gắn user nếu đăng nhập); 429 → toast `t('tooMany')`; `message` `minLength={10}`.
- [ ] **Step 9.9:** App.tsx bỏ 8 màn; lint; kiểm tay với admin: `/admin` số khớp `/admin/reports`; deactivate `customer@` → đăng nhập customer 403 → reactivate; gửi feedback ẩn danh → hiện ở `/admin/feedback`.
```bash
git commit -m "feat(FR-070, FR-072, FR-075, FR-081): admin dashboards, customers and feedback on real data"
```

---

## Task 10: Assistant (chatbot) trên API thật

**Files:** `pages/customer/Assistant/index.tsx`, `App.tsx`, locale `CustomerAssistant` (en, vi)

- [ ] **Step 10.1** — `sessionKey`: `const [sessionKey] = useState(() => { const k = localStorage.getItem('ml.chat.session') ?? crypto.randomUUID(); localStorage.setItem('ml.chat.session', k); return k; })` (bọc try/catch). Lịch sử: `useRequest(\`chat:${sessionKey}\`, () => ChatApi.history(sessionKey))` → `log` khởi tạo = history map `{ from: role, time: formatTime(new Date(createdAt)), intent, text: message }` (khuôn mirror-until-edited: `const [sent, setSent] = useState<LogEntry[]>([]); const log = [...history, ...sent]`). Gửi: `setSent((p) => [...p, { from: 'user', text }]); const r = await ChatApi.ask(sessionKey, text); setSent((p) => [...p, { from: 'bot', text: r.reply, intent: r.intent.toLowerCase().replace('_', ' '), results: r.results }])`; mỗi `results` render link (`product` → `/products/:id`, `market` → `/markets/:id`, `farmer` → `/stalls/:id`) dưới tin nhắn. Gợi ý cố định 4 câu (`suggest.*`) gọi `ask`. Xoá `INITIAL_LOG`, `Reply`, `SAT/SUN`. Chưa đăng nhập vẫn dùng được? Route nằm sau `RequireAuth` — giữ.
- [ ] **Step 10.2:** App.tsx bỏ `CustomerAssistantPage`; lint; kiểm tay: "có bưởi không" → link tới sản phẩm thật; F5 giữ lịch sử.
```bash
git commit -m "feat(FR-090, FR-091, FR-092): the assistant talks to the real chatbot"
```

---

## Task 11: Nội dung thật — Contact, About, ảnh sản phẩm

**Files:** `locales/*/Contact.json` (10 ngôn ngữ: chỉ giá trị dữ liệu, giống nhau), `pages/public/Contact/index.tsx:TEAM_LAT/TEAM_LNG`, `locales/en/About.json` + `pages/public/About/index.tsx:85-89`, `pages/public/ProductDetail/index.tsx:~130`

**Dữ liệu LEAD cung cấp khi chốt plan** (điền vào đây trước khi chạy task): email đội · số điện thoại · địa chỉ · toạ độ (lat, lng) · 6 tên thành viên theo vai `lead/be1/be2/fe1/fe2/qa`.

- [ ] **Step 11.1: Contact** — `team.toAdd` bỏ; `team.emailValue`, `team.phoneValue`, `team.addressValue` = giá trị thật (cả 10 file locale, vì là dữ liệu không dịch); `map.markerLabel` "MarketLink team", `map.popupLine` = địa chỉ; `TEAM_LAT/TEAM_LNG` = toạ độ thật.
- [ ] **Step 11.2: About** — `About.json` mỗi vai thêm `"name": "<tên>"` (10 file); `About/index.tsx:88` `t('team.namePending')` → `t(\`team.${key}.name\`)`; xoá key `namePending`.
- [ ] **Step 11.3: Ảnh sản phẩm** — `ProductDetail`: thay `<MapPlaceholder label=… />` bằng `p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="min-h-60 w-full rounded-md object-cover" /> : <div className="bg-surface-sunken font-hand text-ink-muted grid min-h-60 place-items-center rounded-md">{p.categoryName}</div>`; xoá import `MapPlaceholder` (và file `components/MapPlaceholder.tsx` nếu không còn ai dùng).
- [ ] **Step 11.4:** lint; commit `feat(FR-082, FR-083): real team contact and members; product photo on the detail page`.

---

## Task 12: Xoá dữ liệu mẫu, dọn SHOW_WIP

**Files:** xoá `frontend/src/data/{admin,catalog,customer,farmer,home}.ts`; sửa `components/StallCard.tsx:8,58`, `api-requests/catalog.requests.ts:4` (+ tạo `types/market.types.ts` thêm `ClosureHandling`, `ClosureType`), `pages/admin/MarketForm/index.tsx:22`, `config/wip.ts`, `App.tsx`

- [ ] **Step 12.1** `grep -rn "@/data/" frontend/src --include=*.ts --include=*.tsx | grep -v "src/data/"` → Expected sau Task 3–11: chỉ còn `StallCard`, `catalog.requests`, `MarketForm`, `tiers` users. Sửa: `StallCard` bỏ nhánh `SHOW_WIP ? farmer.markets.map(marketName)` (chỉ `farmer.marketNames ?? []`); chuyển `ClosureHandling`, `ClosureType`, `CLOSURE_HANDLINGS` từ `data/admin.ts` sang `types/market.types.ts` (giữ nguyên định nghĩa), sửa 2 import.
- [ ] **Step 12.2** `/bin/rm -f frontend/src/data/{admin,catalog,customer,farmer,home}.ts` → `npx tsc -b` chỉ ra chỗ còn sót → sửa hết. `App.tsx`: xoá toàn bộ khối `SHOW_WIP ? XWip : ComingSoon` và import `ComingSoon`, `SHOW_WIP` nếu không còn dùng; `config/wip.ts` giữ nếu còn chỗ dùng (grep), không thì xoá.
- [ ] **Step 12.3** `npx tsc -b && npx eslint src && npx vitest run && npx vite build`; `VITE_SHOW_WIP` không còn ý nghĩa → bỏ khỏi `.env.example` nếu có. Commit `chore: remove the frozen prototype data now that every screen calls the API`.

---

## Task 13: Tài liệu nộp bài trong repo

**Files:** `.ai/REQUIREMENTS.md` (cột TT), `docs/SRS-COVERAGE.md`, tạo `docs/ASSUMPTIONS.md`, `README.md` (mục "AI tools used"), `docs/DEMO_CREDENTIALS.md` (kiểm lại)

- [ ] **Step 13.1** QA tick `TT` = `DONE` cho từng FR có màn nối API + backend (Task 3–11) sau khi kiểm tay theo `docs/SRS-COVERAGE.md`; cập nhật cột "Màn hình" trong SRS-COVERAGE thành `nối API` và tick "Đã quay" khi quay video.
- [ ] **Step 13.2** `docs/ASSUMPTIONS.md` (nguồn cho ReadMe.doc nộp bài): thanh toán tại quầy, không giao hàng, không xác thực Farmer (đề miễn), admin seed sẵn không tự đăng ký, một tài khoản một vai (D-08), giờ VN, tiền VND, cutoff theo giờ của từng stall, review chỉ sau completed, restock alert = in-app, chatbot rule-based không LLM sinh SQL.
- [ ] **Step 13.3** README thêm mục "AI tools used" (đề bắt khai báo): Claude Code (code assistant, review), công cụ ảnh nếu có; nêu rõ phần nào người viết/kiểm.
- [ ] **Step 13.4** Ngoài repo (QA/DOC, không thuộc plan code): project report (problem definition, design, DFD, DB design, test data, install, credentials, phân công), video .mp4 theo thứ tự bảng SRS-COVERAGE, hosting URL nếu có.

---

## Self-review

- **Phủ SRS §1.6:** mọi dòng "🟡 demo" trong báo cáo 27/09 có task: Cart/pickup slot/đặt (3), orders/modify/cancel/history/reorder (2, 4), favorites/restock/preferred market (5), review/rating/xem review (6), farmer incoming/ready/insights/best sellers (7), slots (8), pending (8), admin dashboard/customers/reports/moderation review/feedback (6, 9), assistant (10), About/Contact (11). Dòng "✅" không có task. Deliverables 1.9 → 13.
- **Placeholder:** không có "TBD"; các giá trị Task 11 do LEAD điền trước khi chạy (được nêu là điều kiện, không phải chỗ trống trong code).
- **Nhất quán tên:** `toOrderCard` (2.4) dùng ở 4.1, 7.1, 9.2; `pickupLabel` khai ở 7.1 (thêm vào `lib/format.ts`) — Task 2.5 dùng helper nội bộ `pickup()`, khi làm Task 7 chuyển thành `pickupLabel` chung; `ReviewDto.targetName` (1.6 ↔ 6.1); `AdminReportApi.orders({ customerId })` (1.8 ↔ 9.1/9.7); `FavoriteButton { targetType, targetId, favoriteId }` (5.1 ↔ 5.2).
- **Review Focus:** #1 → 3.6 kiểm tay 409 + `cart.test.ts` 3.1; #2 → 4.2/7.2 `isGone`; #3 → 8.2; #4 → 9.6 `busy`; #5 → 2.5 `reorderedPartly`.
