# Per-pickup-date product inventory — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single shared `products.stock_quantity` pool with per-pickup-date inventory
(`product_daily_stock`), auto-materialized from `weekly_stock_templates`, so pre-orders for different
future pickup dates stop drawing from the same number.

**Architecture:** One new table (`product_daily_stock`), materialized on demand (never by a Farmer
click) the first time a `(productId, date)` pair is needed, seeded from the matching weekday's
`weekly_stock_templates` row. `OrderService.place()` locks and decrements these rows instead of
`Product` rows, reusing its existing lock-everything-then-decrement structure. A small resolver
computes "nearest orderable date" for customer-facing reads (cart preview, product search, product
detail) so no page is left showing a frozen, no-longer-decremented number.

**Tech Stack:** Spring Boot / JPA / MySQL 8 (backend), existing `NamedParameterJdbcTemplate` read
pattern (R-04), JUnit 5 + Mockito + AssertJ (unit tests), `@SpringBootTest` against real MySQL
(concurrency/integration tests) — all already used elsewhere in this codebase, no new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-26-product-daily-stock-design.md`

## Global Constraints

- R-04: every SQL statement uses bind parameters; never string-concatenate user input.
- Migrations go in `backend/src/main/resources/db/migration/`, named
  `V<yyyyMMdd><nnn>__<description>.sql`; never edit a migration that's already merged.
- Foreign keys to `users` must be `BIGINT UNSIGNED` — not relevant here (this table only references
  `products`), but any FK added must match the referenced column's real type (`products.id` is
  `BIGINT UNSIGNED`).
- Format with Spotless (`./mvnw spotless:apply`) before every commit; lefthook also runs it.
- No FR-xxx exists for `product_daily_stock` — flag it in the migration's leading comment and in the
  PR body for LEAD, same treatment as `market_closures` (R-02 gap pattern).
- TDD: write the failing test first for every behavioral change; DDL/entity/record scaffolding (no
  behavior of its own) does not require a preceding test, matching how `WeeklyStockTemplate` was built.
- Run `make be-test` (full suite) before considering any task done — a task is not complete because
  its own new test passes if it broke another file's test.

## Review Focus

- **Ordering for a date with an inactive/deleted template still gets rejected**, not silently allowed
  through a stale materialized row — Task 3's materialize step must only ever insert from templates
  where `is_active = TRUE`, and a template a Farmer flips off after a row already exists must not let
  new orders past `quantity_available` for that pre-existing row (this is accepted as intentional: an
  already-materialized date honors what was promised when it was created; only *new* dates stop being
  offered). Task 3 test.
- **Two concurrent orders against the same `(product, date)` can't jointly overdraw**, mirroring the
  exact guarantee `PlaceOrderConcurrencyTest` already proves for the old single pool. Task 6 test.
- **A customer ordering the same product for two different dates in the same cart** (two groups, same
  farmer not required — could even be two different farmers) must decrement each date independently,
  not share one lock/row. Task 6 test.
- **`OrderItem` price snapshot must reflect the date-specific price**, not the product's current base
  price — a Farmer charging more for a scarce Sunday must not have that undercut by a stale base price,
  and editing `products.price` after an order is placed must not change the historical order. Task 6
  test (already partially covered by the existing `placeSnapshotsNameAndPrice` test — extended, not
  replaced).
- **A product with templates but zero rows within the 14-day lookahead** (e.g. every template was just
  turned inactive) must resolve to "not currently orderable", not throw or silently show stale data.
  Task 7 test.

---

## File Structure

New files:
- `backend/src/main/resources/db/migration/V20260926018__create_product_daily_stock_table.sql`
- `backend/src/main/java/com/techx/intervue/modules/product/entities/ProductDailyStock.java`
- `backend/src/main/java/com/techx/intervue/modules/product/repositories/ProductDailyStockRepository.java`
- `backend/src/main/java/com/techx/intervue/modules/product/services/impl/ProductAvailabilityResolver.java`
  — the "nearest orderable date" computation, pure enough to unit test without mocks for its core logic
- `backend/src/test/java/com/techx/intervue/modules/product/repositories/ProductDailyStockRepositoryTest.java`
  — proves the native upsert SQL against real MySQL (JPQL/native syntax errors only show up at runtime)
- `backend/src/test/java/com/techx/intervue/modules/product/services/impl/ProductAvailabilityResolverTest.java`

Modified files:
- `backend/src/main/java/com/techx/intervue/modules/product/repositories/WeeklyStockTemplateRepository.java`
  — add one derived query method
- `backend/src/main/java/com/techx/intervue/modules/order/entities/OrderItem.java` — `snapshot()` takes
  an explicit price instead of reading `product.getPrice()`
- `backend/src/main/java/com/techx/intervue/modules/order/services/impl/OrderService.java` — locking
  and decrement logic, `preview()`'s stock number
- `backend/src/main/java/com/techx/intervue/modules/order/controllers/OrderExceptionHandler.java` — map
  the new CHECK constraint name
- `backend/src/main/java/com/techx/intervue/modules/product/services/impl/ProductQueryService.java` —
  `search()`/`detail()` overlay resolved availability onto the SQL-read rows; `mine()` untouched
- `backend/src/main/java/com/techx/intervue/modules/product/resources/ProductListItemResource.java` —
  add `withAvailability(...)`
- `backend/src/test/java/com/techx/intervue/modules/order/services/impl/OrderServiceTest.java`
- `backend/src/test/java/com/techx/intervue/modules/order/services/impl/PlaceOrderConcurrencyTest.java`
- `backend/src/test/java/com/techx/intervue/modules/product/services/impl/ProductQueryServiceTest.java`
- `backend/src/test/java/com/techx/intervue/modules/product/services/impl/StockTemplateServiceTest.java`
  — apply-related tests removed (Task 9)
- `backend/src/main/java/com/techx/intervue/modules/product/controllers/FarmerProductController.java`
  — new daily-stock override endpoint (Task 11)
- `frontend/src/pages/farmer/StockWeek/index.tsx`, `frontend/src/api-requests/stock-template.requests.ts`,
  `frontend/src/locales/en/FarmerStockWeek.json` — Apply button/flow removed (Task 9)
- Deleted: `POST /farmer/stock-templates/apply` and everything only it needs (Task 9) — files listed
  there.

Additional new files (Task 11, Farmer per-date override — additive, no other task depends on it):
- `backend/src/main/java/com/techx/intervue/modules/product/requests/FarmerDailyStockRequest.java`
- `backend/src/main/java/com/techx/intervue/modules/product/resources/DailyStockResource.java`
- `backend/src/main/java/com/techx/intervue/modules/product/services/interfaces/FarmerDailyStockServiceInterface.java`
- `backend/src/main/java/com/techx/intervue/modules/product/services/impl/FarmerDailyStockService.java`
- `backend/src/test/java/com/techx/intervue/modules/product/services/impl/FarmerDailyStockServiceTest.java`

---

### Task 1: Migration — `product_daily_stock` table

**Files:**
- Create: `backend/src/main/resources/db/migration/V20260926018__create_product_daily_stock_table.sql`

**Interfaces:**
- Produces: table `product_daily_stock(id, product_id, stock_date, quantity_available, unit_price)`,
  `UNIQUE(product_id, stock_date)`, named CHECK `ck_pds_quantity` (Task 6's exception handler matches
  this name — keep it exact).

- [ ] **Step 1: Write the migration**

```sql
-- Chưa có FR chính thức — mở rộng FR-063/FR-031 (D-02): tồn kho tách theo từng ngày pickup thay vì
-- một cục chung cho mọi ngày. Đề xuất LEAD bổ sung FR và đối chiếu vào db/schema.sql (R-02).
CREATE TABLE product_daily_stock (
    id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id         BIGINT UNSIGNED NOT NULL,
    stock_date         DATE NOT NULL,
    quantity_available INT NOT NULL,
    unit_price         DECIMAL(10, 2) NOT NULL,
    CONSTRAINT fk_pds_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
    UNIQUE KEY uq_product_daily_stock (product_id, stock_date),
    CONSTRAINT ck_pds_quantity CHECK (quantity_available >= 0)
);
```

- [ ] **Step 2: Restart backend and confirm Flyway applies it**

Run: `make be-restart`, then wait for it to come up and check:
```bash
docker compose exec mysql mysql -umarket-link -p112233 market-link -e \
  "SELECT version, success FROM flyway_schema_history ORDER BY installed_rank DESC LIMIT 1; DESCRIBE product_daily_stock;"
```
Expected: `version = 20260926018`, `success = 1`, and the table has the 5 columns above.

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/resources/db/migration/V20260926018__create_product_daily_stock_table.sql
git commit -m "feat(product): add product_daily_stock table"
```

---

### Task 2: `ProductDailyStock` entity

**Files:**
- Create: `backend/src/main/java/com/techx/intervue/modules/product/entities/ProductDailyStock.java`

**Interfaces:**
- Consumes: nothing.
- Produces: `ProductDailyStock` with `getId()/getProductId()/getStockDate()/getQuantityAvailable()/
  getUnitPrice()` and matching setters — Task 3 and Task 6 depend on these exact names.

- [ ] **Step 1: Write the entity**

```java
package com.techx.intervue.modules.product.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Tồn kho của một product cho đúng một ngày pickup — thay cho `products.stock_quantity` dùng chung
 * mọi ngày. Sinh ra tự động từ `weekly_stock_templates` lần đầu cần tới (order/preview/browse), không
 * bao giờ do Farmer tự tạo tay. Bảng `product_daily_stock`.
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "product_daily_stock")
public class ProductDailyStock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    @Column(name = "stock_date", nullable = false)
    private LocalDate stockDate;

    @Column(name = "quantity_available", nullable = false)
    private int quantityAvailable;

    @Column(name = "unit_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal unitPrice;
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/main/java/com/techx/intervue/modules/product/entities/ProductDailyStock.java
git commit -m "feat(product): add ProductDailyStock entity"
```

---

### Task 3: `ProductDailyStockRepository` — materialize-on-demand + locking

**Files:**
- Create: `backend/src/main/java/com/techx/intervue/modules/product/repositories/ProductDailyStockRepository.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/product/repositories/ProductDailyStockRepositoryTest.java`

**Interfaces:**
- Consumes: `ProductDailyStock` (Task 2), `WeeklyStockTemplate`/`Product` (existing).
- Produces: `materialize(Long productId, LocalDate stockDate, int dayOfWeek): int` (rows inserted, 0
  or 1), `findByProductIdAndStockDate(Long, LocalDate): Optional<ProductDailyStock>`,
  `lockAllById(Collection<Long> ids): List<ProductDailyStock>` — Task 6 (`OrderService`) calls all
  three by these exact names.

This test runs against real MySQL (`@SpringBootTest`, no `@Transactional` — matches
`PlaceOrderConcurrencyTest`'s reasoning: locking only means something across real commits) because the
`materialize` query is native SQL whose syntax can only be proven by actually running it.

- [ ] **Step 1: Write the failing test**

```java
package com.techx.intervue.modules.product.repositories;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;

/**
 * `materialize` là native SQL (INSERT ... SELECT ... ON DUPLICATE KEY) — lỗi cú pháp chỉ lộ ra lúc
 * chạy thật, nên test này chạy trên MySQL thật, không mock.
 */
@SpringBootTest
class ProductDailyStockRepositoryTest {

    private static final LocalDate MONDAY = LocalDate.of(2026, 9, 28);

    @Autowired private ProductDailyStockRepository repository;
    @Autowired private JdbcTemplate jdbc;

    private final String tag = UUID.randomUUID().toString().substring(0, 8);
    private Long categoryId;
    private Long farmerUserId;
    private Long farmerId;
    private Long productId;

    @BeforeEach
    void setUp() {
        categoryId =
                insert(
                        "INSERT INTO categories (name, slug) VALUES (?, ?)",
                        "PDS test " + tag,
                        "pds-" + tag);
        farmerUserId =
                insert(
                        "INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?,"
                                + " 'x', 'farmer')",
                        "PDS farmer " + tag,
                        "pds-" + tag + "@test.vn");
        farmerId =
                insert(
                        "INSERT INTO farmer_profiles (user_id, stall_name, contact_person,"
                                + " approval_status) VALUES (?, ?, ?, 'approved')",
                        farmerUserId,
                        "Stall PDS " + tag,
                        "Người bán " + tag);
        productId =
                insert(
                        "INSERT INTO products (farmer_id, category_id, name, price, unit,"
                                + " stock_quantity) VALUES (?, ?, ?, 10000, 'kg', 0)",
                        farmerId,
                        categoryId,
                        "Sản phẩm PDS " + tag);
    }

    @AfterEach
    void tearDown() {
        jdbc.update("DELETE FROM product_daily_stock WHERE product_id = ?", productId);
        jdbc.update("DELETE FROM weekly_stock_templates WHERE product_id = ?", productId);
        jdbc.update("DELETE FROM products WHERE id = ?", productId);
        jdbc.update("DELETE FROM farmer_profiles WHERE id = ?", farmerId);
        jdbc.update("DELETE FROM users WHERE id = ?", farmerUserId);
        jdbc.update("DELETE FROM categories WHERE id = ?", categoryId);
    }

    @Test
    void materializeSeedsFromTheMatchingWeekdayTemplate() {
        insert(
                "INSERT INTO weekly_stock_templates (farmer_id, product_id, day_of_week,"
                        + " default_quantity, default_price, is_active) VALUES (?, ?, 1, 40,"
                        + " 13000, TRUE)",
                farmerId,
                productId);

        repository.materialize(productId, MONDAY, 1);

        Optional<ProductDailyStockRepository_MaterializeSupport> ignored = Optional.empty();
        var row = repository.findByProductIdAndStockDate(productId, MONDAY).orElseThrow();
        assertThat(row.getQuantityAvailable()).isEqualTo(40);
        assertThat(row.getUnitPrice()).isEqualByComparingTo("13000");
    }

    @Test
    void materializeFallsBackToProductPriceWhenTemplatePriceIsNull() {
        insert(
                "INSERT INTO weekly_stock_templates (farmer_id, product_id, day_of_week,"
                        + " default_quantity, default_price, is_active) VALUES (?, ?, 1, 40, NULL,"
                        + " TRUE)",
                farmerId,
                productId);

        repository.materialize(productId, MONDAY, 1);

        var row = repository.findByProductIdAndStockDate(productId, MONDAY).orElseThrow();
        assertThat(row.getUnitPrice()).isEqualByComparingTo("10000");
    }

    @Test
    void materializeInsertsNothingWithoutAMatchingActiveTemplate() {
        insert(
                "INSERT INTO weekly_stock_templates (farmer_id, product_id, day_of_week,"
                        + " default_quantity, default_price, is_active) VALUES (?, ?, 1, 40, NULL,"
                        + " FALSE)",
                farmerId,
                productId);

        repository.materialize(productId, MONDAY, 1);

        assertThat(repository.findByProductIdAndStockDate(productId, MONDAY)).isEmpty();
    }

    @Test
    void materializeIsANoOpOnARowThatAlreadyExists() {
        insert(
                "INSERT INTO weekly_stock_templates (farmer_id, product_id, day_of_week,"
                        + " default_quantity, default_price, is_active) VALUES (?, ?, 1, 40, NULL,"
                        + " TRUE)",
                farmerId,
                productId);
        repository.materialize(productId, MONDAY, 1);
        var existing = repository.findByProductIdAndStockDate(productId, MONDAY).orElseThrow();
        existing.setQuantityAvailable(3); // simulate 37 already sold
        repository.save(existing);

        repository.materialize(productId, MONDAY, 1);

        assertThat(repository.findByProductIdAndStockDate(productId, MONDAY).orElseThrow()
                        .getQuantityAvailable())
                .isEqualTo(3);
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

Delete the stray `Optional<ProductDailyStockRepository_MaterializeSupport> ignored = Optional.empty();`
line before running — it was left in by mistake and does not compile; the four `@Test` methods above it
and below it are the real content.

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec backend ./mvnw -q -B -Dtest=ProductDailyStockRepositoryTest test`
Expected: FAIL to compile — `ProductDailyStockRepository` does not exist yet.

- [ ] **Step 3: Write the repository**

```java
package com.techx.intervue.modules.product.repositories;

import com.techx.intervue.modules.product.entities.ProductDailyStock;
import jakarta.persistence.LockModeType;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProductDailyStockRepository extends JpaRepository<ProductDailyStock, Long> {

    Optional<ProductDailyStock> findByProductIdAndStockDate(Long productId, LocalDate stockDate);

    /**
     * Sinh dòng lịch cho (product, ngày) nếu chưa có, lấy số từ template khớp {@code dayOfWeek} và
     * đang active; không có template khớp thì không chèn gì cả (ngày đó không bán được — quyết định
     * đã chốt, xem docs/superpowers/specs/2026-09-26-product-daily-stock-design.md). An toàn khi 2
     * transaction cùng gọi đồng thời nhờ UNIQUE(product_id, stock_date): ai tới trước thắng, người
     * sau là no-op (ON DUPLICATE KEY UPDATE id = id không đổi gì).
     */
    @Modifying
    @Query(
            value =
                    """
                    INSERT INTO product_daily_stock (product_id, stock_date, quantity_available, unit_price)
                    SELECT :productId, :stockDate, t.default_quantity, COALESCE(t.default_price, p.price)
                    FROM weekly_stock_templates t JOIN products p ON p.id = t.product_id
                    WHERE t.product_id = :productId AND t.day_of_week = :dayOfWeek AND t.is_active = TRUE
                    ON DUPLICATE KEY UPDATE id = id
                    """,
            nativeQuery = true)
    int materialize(
            @Param("productId") Long productId,
            @Param("stockDate") LocalDate stockDate,
            @Param("dayOfWeek") int dayOfWeek);

    /** Khoá các dòng đã đảm bảo tồn tại (qua {@code materialize} + tra id) tới hết transaction. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select d from ProductDailyStock d where d.id in :ids order by d.id")
    List<ProductDailyStock> lockAllById(@Param("ids") Collection<Long> ids);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `docker compose exec backend ./mvnw -q -B -Dtest=ProductDailyStockRepositoryTest test`
Expected: `Tests run: 4, Failures: 0, Errors: 0`

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/techx/intervue/modules/product/repositories/ProductDailyStockRepository.java \
        backend/src/test/java/com/techx/intervue/modules/product/repositories/ProductDailyStockRepositoryTest.java
git commit -m "feat(product): materialize daily stock rows from the weekly template"
```

---

### Task 4: `WeeklyStockTemplateRepository` — add `findByProductIdAndActiveTrue`

**Files:**
- Modify: `backend/src/main/java/com/techx/intervue/modules/product/repositories/WeeklyStockTemplateRepository.java`

**Interfaces:**
- Produces: `findByProductIdAndActiveTrue(Long productId): List<WeeklyStockTemplate>` — Task 7's
  resolver depends on this exact name.

This is a one-line derived query addition next to the existing `findByFarmerIdAndDayOfWeekAndActiveTrue`.
No test of its own — it is exercised by Task 7's resolver tests, matching how
`findByFarmerIdAndDayOfWeekAndActiveTrue` has no dedicated test today and is only exercised through
`StockTemplateServiceTest`.

- [ ] **Step 1: Add the method**

```java
    List<WeeklyStockTemplate> findByFarmerIdAndDayOfWeekAndActiveTrue(Long farmerId, int dayOfWeek);

    List<WeeklyStockTemplate> findByProductIdAndActiveTrue(Long productId);
```

(Insert the new line directly below the existing one in
`backend/src/main/java/com/techx/intervue/modules/product/repositories/WeeklyStockTemplateRepository.java`.)

- [ ] **Step 2: Compile**

Run: `docker compose exec backend ./mvnw -q -B compile`
Expected: BUILD SUCCESS (nothing calls it yet — Task 7 does).

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/techx/intervue/modules/product/repositories/WeeklyStockTemplateRepository.java
git commit -m "feat(product): add findByProductIdAndActiveTrue to stock template repo"
```

---

### Task 5: `OrderItem.snapshot()` takes an explicit price

**Files:**
- Modify: `backend/src/main/java/com/techx/intervue/modules/order/entities/OrderItem.java`

**Interfaces:**
- Consumes: nothing new.
- Produces: `OrderItem.snapshot(Product product, BigDecimal unitPrice, int quantity, BigDecimal
  subtotal): OrderItem` — Task 6 calls this new 4-arg form. The old 3-arg form is removed; its only
  caller is rewritten in Task 6, in the same commit, so the build is never left broken between tasks.

- [ ] **Step 1: Change the factory method**

In `backend/src/main/java/com/techx/intervue/modules/order/entities/OrderItem.java`, replace:

```java
    /** Chép tên, giá, đơn vị của sản phẩm lúc này; orderId gán sau khi đơn có id. */
    public static OrderItem snapshot(Product product, int quantity, BigDecimal subtotal) {
        OrderItem item = new OrderItem();
        item.setProductId(product.getId());
        item.setProductName(product.getName());
        item.setUnitPrice(product.getPrice());
        item.setUnit(product.getUnit());
        item.setQuantity(quantity);
        item.setSubtotal(subtotal);
        return item;
    }
```

with:

```java
    /**
     * Chép tên, giá, đơn vị lúc đặt; orderId gán sau khi đơn có id. {@code unitPrice} là giá của
     * đúng dòng {@code product_daily_stock} ngày khách chọn (contract §7) — không phải
     * {@code product.getPrice()}, vì giá có thể khác theo từng ngày (weekly stock template).
     */
    public static OrderItem snapshot(
            Product product, BigDecimal unitPrice, int quantity, BigDecimal subtotal) {
        OrderItem item = new OrderItem();
        item.setProductId(product.getId());
        item.setProductName(product.getName());
        item.setUnitPrice(unitPrice);
        item.setUnit(product.getUnit());
        item.setQuantity(quantity);
        item.setSubtotal(subtotal);
        return item;
    }
```

This alone breaks the build (its one call site in `OrderService` still uses the 3-arg form) — expected,
fixed in Task 6 which must be done in the same sitting before running the suite.

- [ ] **Step 2: Do not commit yet** — commit together with Task 6 (an intermediate commit here would
  leave the repo non-compiling).

---

### Task 6: `OrderService` — lock and decrement per pickup date

**Files:**
- Modify: `backend/src/main/java/com/techx/intervue/modules/order/services/impl/OrderService.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/order/controllers/OrderExceptionHandler.java`
- Modify: `backend/src/test/java/com/techx/intervue/modules/order/services/impl/OrderServiceTest.java`
- Modify: `backend/src/test/java/com/techx/intervue/modules/order/services/impl/PlaceOrderConcurrencyTest.java`

**Interfaces:**
- Consumes: `ProductDailyStockRepository` (Task 3), `OrderItem.snapshot` 4-arg form (Task 5).
- Produces: `OrderService` constructor gains one parameter (`ProductDailyStockRepository`), appended
  last so every existing positional-constructor call site needs exactly one new trailing argument.

This is the load-bearing task. Read the whole of `OrderService.java` before touching it — the file is
short (363 lines) and every method's javadoc explains a specific correctness guarantee (C5-2, C5-5,
C5-11, C5-12, D-01, D-02, D-05, D-06, D-13); none of those guarantees change, only which table gets
locked for D-02.

- [ ] **Step 1: Write the failing tests in `OrderServiceTest`**

Add the fixture support first. In `OrderServiceTest`, add a fake table and a `ProductDailyStockRepository`
mock, add both to `setUp()`, and add a `dailyStock(...)` builder next to the existing `product(...)`
builder:

```java
    private ProductDailyStockRepository dailyStockRepository;
    private final Map<String, ProductDailyStock> dailyStock = new HashMap<>();
```

(add these two fields next to the existing `private final Map<Long, Product> products = new HashMap<>();`)

In `setUp()`, add after `productRepository = mock(ProductRepository.class);`:

```java
        dailyStockRepository = mock(ProductDailyStockRepository.class);
```

and pass it as the new trailing constructor argument:

```java
        service =
                new OrderService(
                        userRepository,
                        farmerRepository,
                        farmerMarketRepository,
                        slotRepository,
                        productRepository,
                        orderRepository,
                        orderItemRepository,
                        new OrderStatusHistoryWriter(historyRepository),
                        new OrderCodeGenerator(orderRepository, clock),
                        checkoutQueries,
                        clock,
                        dailyStockRepository);
```

Replace `when(productRepository.lockAllById(any())).thenAnswer(inv -> rows(products, inv.getArgument(0)));`
with wiring for the new repository (keep `productRepository.findAllById` wiring, drop `lockAllById`
wiring — nothing calls it anymore):

```java
        when(dailyStockRepository.materialize(any(), any(), anyInt()))
                .thenAnswer(
                        inv -> {
                            Long productId = inv.getArgument(0);
                            LocalDate date = inv.getArgument(1);
                            String key = productId + "@" + date;
                            if (dailyStock.containsKey(key)) {
                                return 0;
                            }
                            Product p = products.get(productId);
                            if (p == null) {
                                return 0;
                            }
                            ProductDailyStock row = new ProductDailyStock();
                            row.setId(5000L + dailyStock.size());
                            row.setProductId(productId);
                            row.setStockDate(date);
                            row.setQuantityAvailable(p.getStockQuantity());
                            row.setUnitPrice(p.getPrice());
                            dailyStock.put(key, row);
                            return 1;
                        });
        when(dailyStockRepository.findByProductIdAndStockDate(any(), any()))
                .thenAnswer(
                        inv ->
                                Optional.ofNullable(
                                        dailyStock.get(
                                                inv.<Long>getArgument(0)
                                                        + "@"
                                                        + inv.<LocalDate>getArgument(1))));
        when(dailyStockRepository.lockAllById(any()))
                .thenAnswer(
                        inv -> {
                            Collection<Long> ids = inv.getArgument(0);
                            return dailyStock.values().stream()
                                    .filter(r -> ids.contains(r.getId()))
                                    .sorted(Comparator.comparing(ProductDailyStock::getId))
                                    .toList();
                        });
```

Add a `dailyStock(long productId, LocalDate date, int quantity, String price)` helper next to `product(...)`
that seeds the fake table directly (bypassing `materialize`, for tests that need a pre-existing row —
mirrors how `slot(...)`/`product(...)` seed their fakes directly):

```java
    private void dailyStock(long productId, LocalDate date, int quantity, String price) {
        ProductDailyStock row = new ProductDailyStock();
        row.setId(4000L + dailyStock.size());
        row.setProductId(productId);
        row.setStockDate(date);
        row.setQuantityAvailable(quantity);
        row.setUnitPrice(new BigDecimal(price));
        dailyStock.put(productId + "@" + date, row);
    }
```

In `setUp()`, after the three `product(...)` calls, seed daily stock for `PICKUP` so every existing
test that doesn't care about this change keeps passing unmodified:

```java
        dailyStock(RAU_MUONG, PICKUP, 40, "12000");
        dailyStock(CAI_NGOT, PICKUP, 30, "15000");
        dailyStock(BANH_CHUOI, PICKUP, 15, "35000");
```

Now the behavior changes. Rewrite these five existing tests (replace them at their current location,
same method names so nothing else references them):

```java
    /** D-02: trừ tồn ngay khi đơn ở `placed`, trong chính transaction của lệnh đặt — theo đúng ngày. */
    @Test
    void placeDeductsStockInTheSameTransaction() throws Exception {
        service.place(CUSTOMER_ID, request(group(FARMER_A, SLOT_A, line(RAU_MUONG, 3))));

        assertThat(orders.getFirst().getStatus()).isEqualTo(OrderStatus.PLACED);
        assertThat(dailyStock.get(RAU_MUONG + "@" + PICKUP).getQuantityAvailable()).isEqualTo(37);
        assertThat(
                        OrderService.class
                                .getMethod("place", long.class, PlaceOrderRequest.class)
                                .isAnnotationPresent(Transactional.class))
                .isTrue();
    }

    /** Bán hết đúng ngày đó không đổi Product.status — hết hàng giờ là của một ngày, không phải sản phẩm. */
    @Test
    void placeDoesNotTouchProductStatusWhenADateSellsOut() {
        dailyStock(BANH_CHUOI, PICKUP, 2, "35000");

        service.place(CUSTOMER_ID, request(group(FARMER_B, SLOT_B, line(BANH_CHUOI, 2))));

        assertThat(dailyStock.get(BANH_CHUOI + "@" + PICKUP).getQuantityAvailable()).isZero();
        assertThat(products.get(BANH_CHUOI).getStatus()).isEqualTo(ProductStatus.AVAILABLE);
    }

    /** Đặt 10, ngày đó chỉ còn 3 → 409; không có gì bị trừ. */
    @Test
    void placeRefusesWhenStockIsShort() {
        dailyStock(RAU_MUONG, PICKUP, 3, "12000");

        assertThatThrownBy(
                        () ->
                                service.place(
                                        CUSTOMER_ID,
                                        request(group(FARMER_A, SLOT_A, line(RAU_MUONG, 10)))))
                .isInstanceOf(OutOfStockException.class);
        assertThat(dailyStock.get(RAU_MUONG + "@" + PICKUP).getQuantityAvailable()).isEqualTo(3);
        assertThat(slots.get(SLOT_A).getBookedCount()).isZero();
        verify(orderRepository, never()).save(any());
    }

    /** Không có template nào khớp ngày đặt → không dòng lịch nào sinh ra → 409, đúng quyết định đã chốt. */
    @Test
    void placeRefusesADateWithNoTemplate() {
        dailyStock.remove(RAU_MUONG + "@" + PICKUP);
        when(dailyStockRepository.materialize(eq(RAU_MUONG), eq(PICKUP), anyInt())).thenReturn(0);

        assertThatThrownBy(() -> service.place(CUSTOMER_ID, aValidRequest()))
                .isInstanceOf(OutOfStockException.class);
        verify(orderRepository, never()).save(any());
    }

    /**
     * C5-2: mọi slot của cả lệnh bị khoá trước (id tăng dần), rồi mọi dòng product_daily_stock của
     * cả lệnh trong đúng một lần lockAllById (id tăng dần). Product được đọc không khoá — không còn
     * gì mutable trên Product trong luồng đặt hàng nữa.
     */
    @Test
    void placeLocksEverySlotBeforeAnyDailyStockRowInAscendingOrder() {
        service.place(
                CUSTOMER_ID,
                request(
                        group(FARMER_B, SLOT_B, line(BANH_CHUOI, 1)),
                        group(FARMER_A, SLOT_A, line(CAI_NGOT, 1), line(RAU_MUONG, 1))));

        InOrder locks = inOrder(slotRepository, dailyStockRepository);
        locks.verify(slotRepository).lockById(SLOT_A);
        locks.verify(slotRepository).lockById(SLOT_B);
        locks.verify(dailyStockRepository).lockAllById(any());
        verify(productRepository, never()).lockAllById(any());
        verify(productRepository).findAllById(any());
    }
```

Delete the old `placeMarksAProductSoldOutWhenItsLastUnitGoes` test entirely — `placeDoesNotTouchProductStatusWhenADateSellsOut`
above replaces it with the corrected expectation.

Change the assertion inside the existing `placeSnapshotsNameAndPrice` test from
`assertThat(item.getUnitPrice()).isEqualByComparingTo("12000");` — leave the value the same (it's still
what `dailyStock(RAU_MUONG, PICKUP, 40, "12000")` seeded) but add one line proving it now comes from the
daily row, not the product, by also changing the product's price and confirming the item is unaffected
(it already does this for name; extend it to price):

```java
    /** Farmer đổi giá, đổi tên sau khi đặt → dòng đơn cũ giữ nguyên giá của ngày đã chốt. */
    @Test
    void placeSnapshotsNameAndPrice() {
        service.place(CUSTOMER_ID, aValidRequest());
        products.get(RAU_MUONG).setPrice(new BigDecimal("99000"));
        products.get(RAU_MUONG).setName("Rau muống hữu cơ");
        dailyStock.get(RAU_MUONG + "@" + PICKUP).setUnitPrice(new BigDecimal("77000"));

        OrderItem item = items.getFirst();
        assertThat(item.getProductId()).isEqualTo(RAU_MUONG);
        assertThat(item.getProductName()).isEqualTo("Rau muống");
        assertThat(item.getUnitPrice()).isEqualByComparingTo("12000");
        assertThat(item.getUnit()).isEqualTo("bó");
        assertThat(item.getQuantity()).isEqualTo(2);
        assertThat(item.getSubtotal()).isEqualByComparingTo("24000");
    }
```

Change `placeRefusesWhenSlotIsFull`'s assertion
`assertThat(products.get(RAU_MUONG).getStockQuantity()).isEqualTo(40);` to
`assertThat(dailyStock.get(RAU_MUONG + "@" + PICKUP).getQuantityAvailable()).isEqualTo(40);`.

Change `placeRefusesAfterTheCutoff`'s assertion
`assertThat(products.get(RAU_MUONG).getStockQuantity()).isEqualTo(40);` to
`assertThat(dailyStock.get(RAU_MUONG + "@" + PICKUP).getQuantityAvailable()).isEqualTo(40);`.

Change `placeRefusesAProductOfAnotherStallInTheGroup`'s assertion
`assertThat(products.get(BANH_CHUOI).getStockQuantity()).isEqualTo(15);` to
`assertThat(dailyStock.get(BANH_CHUOI + "@" + PICKUP).getQuantityAvailable()).isEqualTo(15);`.

Add these imports to `OrderServiceTest.java`: `com.techx.intervue.modules.product.entities.ProductDailyStock`,
`com.techx.intervue.modules.product.repositories.ProductDailyStockRepository`, `java.util.Comparator`,
and add `import static org.mockito.ArgumentMatchers.anyInt;` and `import static
org.mockito.ArgumentMatchers.eq;` if not already present.

- [ ] **Step 2: Run tests to verify they fail**

Run: `docker compose exec backend ./mvnw -q -B -Dtest=OrderServiceTest test`
Expected: FAIL to compile (`OrderService` constructor doesn't take 12 args yet, `ProductDailyStock`
class exists from Task 2 but nothing wires it into `OrderService`).

- [ ] **Step 3: Rewrite `OrderService`**

In `backend/src/main/java/com/techx/intervue/modules/order/services/impl/OrderService.java`:

Add imports:
```java
import com.techx.intervue.modules.product.entities.ProductDailyStock;
import com.techx.intervue.modules.product.repositories.ProductDailyStockRepository;
import java.util.LinkedHashSet;
```
(`LinkedHashSet` may already be imported — check before adding a duplicate.)

Add the field and constructor parameter (via `@AllArgsConstructor`, so just add the field in the same
declared order as the others — Lombok generates the constructor):

```java
    private final CheckoutQueryRepository checkoutQueries;
    private final Clock clock;
    private final ProductDailyStockRepository dailyStockRepository;
```

Replace `place()`:

```java
    @Override
    @Transactional
    public List<PlacedOrderResource> place(long customerUserId, PlaceOrderRequest request) {
        requireBuyer(customerUserId);

        Map<Long, PickupSlot> slots = lockSlots(request.groups());
        Map<String, ProductDailyStock> dailyStock = lockDailyStock(request.groups());
        Map<Long, Product> products = findProducts(request.groups());

        LocalDateTime now = LocalDateTime.now(clock);
        List<PlacedOrderResource> placed = new ArrayList<>();
        for (OrderGroupInput group : request.groups()) {
            placed.add(placeGroup(customerUserId, group, slots, dailyStock, products, now));
        }
        return placed;
    }
```

Replace `lockProducts(...)` with two methods (unlocked product read, and the new locked daily-stock
step):

```java
    private Map<Long, Product> findProducts(List<OrderGroupInput> groups) {
        Set<Long> ids = new TreeSet<>();
        groups.forEach(g -> g.items().forEach(line -> ids.add(line.productId())));
        if (ids.isEmpty()) {
            return Map.of();
        }
        return productRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(Product::getId, Function.identity()));
    }

    /**
     * D-02 áp cho từng ngày pickup: sinh dòng lịch còn thiếu (không bao giờ ghi đè dòng đã có), rồi
     * khoá đúng những dòng vừa đảm bảo tồn tại, theo id tăng dần — cùng nguyên tắc chống deadlock
     * C5-2 đã áp cho slot: mọi thứ transaction này cần bị khoá trong đúng một lượt, theo cùng một
     * thứ tự với mọi transaction khác.
     */
    private Map<String, ProductDailyStock> lockDailyStock(List<OrderGroupInput> groups) {
        record Need(Long productId, LocalDate date) {}
        Set<Need> needed = new LinkedHashSet<>();
        groups.forEach(
                g -> g.items().forEach(line -> needed.add(new Need(line.productId(), g.pickupDate()))));

        TreeSet<Long> ids = new TreeSet<>();
        for (Need n : needed) {
            int dayOfWeek = n.date().getDayOfWeek().getValue() % 7;
            dailyStockRepository.materialize(n.productId(), n.date(), dayOfWeek);
            dailyStockRepository
                    .findByProductIdAndStockDate(n.productId(), n.date())
                    .ifPresent(row -> ids.add(row.getId()));
        }
        if (ids.isEmpty()) {
            return Map.of();
        }
        Map<String, ProductDailyStock> locked = new HashMap<>();
        dailyStockRepository
                .lockAllById(ids)
                .forEach(row -> locked.put(dailyStockKey(row.getProductId(), row.getStockDate()), row));
        return locked;
    }

    private static String dailyStockKey(Long productId, LocalDate date) {
        return productId + "@" + date;
    }
```

Replace `placeGroup(...)`'s signature and body (the checking loop and the decrement loop):

```java
    private PlacedOrderResource placeGroup(
            long customerUserId,
            OrderGroupInput group,
            Map<Long, PickupSlot> slots,
            Map<String, ProductDailyStock> dailyStock,
            Map<Long, Product> products,
            LocalDateTime now) {
        FarmerProfile farmer =
                farmerRepository
                        .findById(group.farmerId())
                        .filter(f -> f.getApprovalStatus() == ApprovalStatus.APPROVED)
                        .orElseThrow(() -> new StallUnavailableException(group.farmerId()));
        PickupSlot slot = bookableSlot(group, farmer, slots);
        LocalDateTime cutoffAt =
                OrderLifecycle.cutoffAt(
                        group.pickupDate(), slot.getStartTime(), farmer.getOrderCutoffHours());
        if (!now.isBefore(cutoffAt)) {
            throw new CutoffPassedException();
        }
        if (slot.getBookedCount() >= slot.getMaxOrders()) {
            throw new SlotFullException(slot.getId());
        }

        Map<Long, Integer> wanted = quantities(group.items());
        for (Map.Entry<Long, Integer> line : wanted.entrySet()) {
            Product p = products.get(line.getKey());
            if (p == null) {
                throw new OutOfStockException(line.getKey(), null);
            }
            if (!p.getFarmerId().equals(farmer.getId())) {
                throw new IllegalArgumentException(
                        "Product " + p.getId() + " is not sold by this stall.");
            }
            ProductDailyStock row = dailyStock.get(dailyStockKey(p.getId(), group.pickupDate()));
            if (!sellable(p) || row == null || row.getQuantityAvailable() < line.getValue()) {
                throw new OutOfStockException(p.getId(), p.getName());
            }
        }

        // Mọi kiểm tra đã qua: giữ chỗ và trừ tồn (ghi xuống khi transaction commit)
        slot.setBookedCount(slot.getBookedCount() + 1);
        BigDecimal total = BigDecimal.ZERO;
        List<OrderItem> items = new ArrayList<>();
        for (Map.Entry<Long, Integer> line : wanted.entrySet()) {
            Product p = products.get(line.getKey());
            ProductDailyStock row = dailyStock.get(dailyStockKey(p.getId(), group.pickupDate()));
            int qty = line.getValue();
            row.setQuantityAvailable(row.getQuantityAvailable() - qty);
            BigDecimal subtotal = row.getUnitPrice().multiply(BigDecimal.valueOf(qty));
            total = total.add(subtotal);
            items.add(OrderItem.snapshot(p, row.getUnitPrice(), qty, subtotal));
        }

        Order order = new Order();
        order.setOrderCode(codeGenerator.next());
        order.setCustomerId(customerUserId);
        order.setFarmerId(farmer.getId());
        order.setMarketId(group.marketId());
        order.setSlotId(slot.getId());
        order.setPickupDate(group.pickupDate());
        order.setPickupStart(slot.getStartTime());
        order.setPickupEnd(slot.getEndTime());
        order.setCutoffAt(cutoffAt);
        order.setTotalAmount(total);
        order.setStatus(OrderStatus.PLACED);
        order.setCustomerNote(group.customerNote());
        Order saved = orderRepository.save(order);

        items.forEach(i -> i.setOrderId(saved.getId()));
        orderItemRepository.saveAll(items);
        history.record(saved.getId(), null, OrderStatus.PLACED, customerUserId, null);

        return new PlacedOrderResource(
                saved.getId(),
                saved.getOrderCode(),
                saved.getStatus().value(),
                cutoffAt.atZone(clock.getZone()).toInstant().toString(),
                saved.getTotalAmount());
    }
```

`preview()` and `previewGroup(...)`/`problemOf(...)` are untouched by this task — Task 8 changes
`PreviewItemResource`'s stock number, not this locking/decrement path.

- [ ] **Step 4: Add the CHECK-constraint mapping in `OrderExceptionHandler`**

In `backend/src/main/java/com/techx/intervue/modules/order/controllers/OrderExceptionHandler.java`,
inside `dataIntegrity(...)`, add a branch above the existing `ck_products_stock` one (order doesn't
matter functionally, but keep the newest addition visible near the top):

```java
        if (cause.contains("ck_pds_quantity")) {
            return error(
                    HttpStatus.CONFLICT,
                    "OUT_OF_STOCK",
                    "A product in your cart just sold out. Refresh your cart.",
                    List.of());
        }
        if (cause.contains("ck_products_stock")) {
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `docker compose exec backend ./mvnw -q -B -Dtest=OrderServiceTest test`
Expected: all tests in the class pass (the rewritten five plus every untouched test, since the
`dailyStock(...)` seeding in `setUp()` keeps their assumptions valid).

- [ ] **Step 6: Rewrite `PlaceOrderConcurrencyTest`**

Replace the `givenProductWithStock` helper and the `stockOf` helper, and add a `PICKUP`-dated daily
stock row instead of relying on `products.stock_quantity`:

```java
    private long givenProductWithStock(int stock) {
        long id =
                insert(
                        "INSERT INTO products (farmer_id, category_id, name, price, unit,"
                                + " stock_quantity) VALUES (?, ?, ?, 20000, 'kg', 0)",
                        farmerId,
                        categoryId,
                        "Lô cuối " + tag + " #" + productIds.size());
        productIds.add(id);
        insert(
                "INSERT INTO product_daily_stock (product_id, stock_date, quantity_available,"
                        + " unit_price) VALUES (?, ?, ?, 20000)",
                id,
                java.sql.Date.valueOf(PICKUP),
                stock);
        return id;
    }
```

Replace `stockOf`:

```java
    private int stockOf(long productId) {
        return jdbc.queryForObject(
                "SELECT quantity_available FROM product_daily_stock WHERE product_id = ? AND"
                        + " stock_date = ?",
                Integer.class,
                productId,
                java.sql.Date.valueOf(PICKUP));
    }
```

Add cleanup for the new table in `tearDown()`, before the existing `productIds.forEach(...)` line:

```java
        productIds.forEach(
                id -> jdbc.update("DELETE FROM product_daily_stock WHERE product_id = ?", id));
```

Add one new test proving the guarantee holds per-date, not just per-product (place it after
`onlyOneOfTwoSimultaneousOrdersGetsTheLastUnit`):

```java
    /** Deux dates différentes du même produit ne se bloquent pas : chacune a sa propre réserve. */
    @Test
    void orderingOneDateDoesNotTouchAnotherDateOfTheSameProduct() {
        long productId = givenProductWithStock(5);
        long otherSlotId = givenSlotWithCapacity(5);
        LocalDate otherDate = PICKUP.plusDays(1);
        jdbc.update(
                "UPDATE pickup_slots SET slot_date = ? WHERE id = ?",
                java.sql.Date.valueOf(otherDate),
                otherSlotId);
        insert(
                "INSERT INTO product_daily_stock (product_id, stock_date, quantity_available,"
                        + " unit_price) VALUES (?, ?, 7, 20000)",
                productId,
                java.sql.Date.valueOf(otherDate));

        service.place(someCustomer(), requestFor(productId, 5, givenSlotWithCapacity(5)));

        assertThat(
                        jdbc.queryForObject(
                                "SELECT quantity_available FROM product_daily_stock WHERE"
                                        + " product_id = ? AND stock_date = ?",
                                Integer.class,
                                productId,
                                java.sql.Date.valueOf(otherDate)))
                .isEqualTo(7);
    }
```

Remove the stray French comment on that test before running — it's a typo, replace with:
`/** Two different dates of the same product don't block each other: each has its own reserve. */`

- [ ] **Step 7: Run the concurrency test**

Run: `docker compose exec backend ./mvnw -q -B -Dtest=PlaceOrderConcurrencyTest test`
Expected: `Tests run: 4, Failures: 0, Errors: 0` (the original 3 plus the new one).

- [ ] **Step 8: Run the full suite**

Run: `docker compose exec backend ./mvnw -q -B test`
Expected: no failures anywhere — this is the task most likely to have ripple effects into other test
files that construct `OrderService` directly; search for any other `new OrderService(` call site
first:

```bash
grep -rln "new OrderService(" backend/src/test
```

If any file other than `OrderServiceTest` appears, add the same trailing `dailyStockRepository`
argument there too before running the full suite.

- [ ] **Step 9: Format and commit (Tasks 5 and 6 together)**

```bash
docker compose exec backend ./mvnw -q spotless:apply
git add backend/src/main/java/com/techx/intervue/modules/order/entities/OrderItem.java \
        backend/src/main/java/com/techx/intervue/modules/order/services/impl/OrderService.java \
        backend/src/main/java/com/techx/intervue/modules/order/controllers/OrderExceptionHandler.java \
        backend/src/test/java/com/techx/intervue/modules/order/services/impl/OrderServiceTest.java \
        backend/src/test/java/com/techx/intervue/modules/order/services/impl/PlaceOrderConcurrencyTest.java
git commit -m "feat(order): decrement stock per pickup date instead of one pool"
```

---

### Task 7: `ProductAvailabilityResolver` — nearest orderable date

**Files:**
- Create: `backend/src/main/java/com/techx/intervue/modules/product/services/impl/ProductAvailabilityResolver.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/product/services/impl/ProductAvailabilityResolverTest.java`

**Interfaces:**
- Consumes: `WeeklyStockTemplateRepository.findByProductIdAndActiveTrue` (Task 4),
  `ProductDailyStockRepository.findByProductIdAndStockDate` (Task 3), a `Clock` (already a Spring bean
  in this project — `OrderService` already injects one).
- Produces: `resolve(Map<Long, BigDecimal> basePriceByProductId): Map<Long, Availability>` and the
  nested `record Availability(LocalDate date, int quantity, BigDecimal price)`. `basePriceByProductId`
  is keyed by product id and holds each product's `products.price` (the fallback price when a
  template's `default_price` is null) — Task 8's two call sites (order preview, public product
  search/detail) both already have this value on hand without an extra query.
- Produces (package-visible, for the test only): `static Optional<LocalDate> nearestDate(LocalDate
  today, List<WeeklyStockTemplate> templates)` — the pure part of the algorithm, tested directly
  without mocks.

- [ ] **Step 1: Write the failing tests**

```java
package com.techx.intervue.modules.product.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.product.entities.ProductDailyStock;
import com.techx.intervue.modules.product.entities.WeeklyStockTemplate;
import com.techx.intervue.modules.product.repositories.ProductDailyStockRepository;
import com.techx.intervue.modules.product.repositories.WeeklyStockTemplateRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ProductAvailabilityResolverTest {

    /** Thứ Bảy 26/09/2026 — cùng ngày cố định dùng trong OrderServiceTest. */
    private static final LocalDate TODAY = LocalDate.of(2026, 9, 26);

    private static final long PRODUCT_ID = 1L;

    private WeeklyStockTemplateRepository templates;
    private ProductDailyStockRepository dailyStock;
    private ProductAvailabilityResolver resolver;

    @BeforeEach
    void setUp() {
        templates = mock(WeeklyStockTemplateRepository.class);
        dailyStock = mock(ProductDailyStockRepository.class);
        Clock clock =
                Clock.fixed(
                        ZonedDateTime.of(TODAY, LocalTime.NOON, ZoneId.of("Asia/Ho_Chi_Minh"))
                                .toInstant(),
                        ZoneId.of("Asia/Ho_Chi_Minh"));
        resolver = new ProductAvailabilityResolver(templates, dailyStock, clock);
    }

    private static WeeklyStockTemplate template(int dayOfWeek, int qty, BigDecimal price) {
        WeeklyStockTemplate t = new WeeklyStockTemplate();
        t.setProductId(PRODUCT_ID);
        t.setDayOfWeek(dayOfWeek);
        t.setDefaultQuantity(qty);
        t.setDefaultPrice(price);
        t.setActive(true);
        return t;
    }

    @Test
    void nearestDateFindsTheClosestMatchingWeekday() {
        // TODAY (26/09) là Thứ Bảy = 6; template chỉ bán Thứ Hai = 1 → cách 2 ngày.
        Optional<LocalDate> found =
                ProductAvailabilityResolver.nearestDate(TODAY, List.of(template(1, 10, null)));

        assertThat(found).contains(LocalDate.of(2026, 9, 28));
    }

    @Test
    void nearestDateIncludesToday() {
        // TODAY (26/09) là Thứ Bảy = 6.
        Optional<LocalDate> found =
                ProductAvailabilityResolver.nearestDate(TODAY, List.of(template(6, 10, null)));

        assertThat(found).contains(TODAY);
    }

    @Test
    void nearestDateIsEmptyWithNoTemplates() {
        assertThat(ProductAvailabilityResolver.nearestDate(TODAY, List.of())).isEmpty();
    }

    @Test
    void resolveUsesTheTemplateDefaultsWhenNoDailyStockRowExistsYet() {
        when(templates.findByProductIdAndActiveTrue(PRODUCT_ID))
                .thenReturn(List.of(template(1, 40, new BigDecimal("13000"))));
        when(dailyStock.findByProductIdAndStockDate(any(), any())).thenReturn(Optional.empty());

        Map<Long, ProductAvailabilityResolver.Availability> result =
                resolver.resolve(Map.of(PRODUCT_ID, new BigDecimal("12000")));

        ProductAvailabilityResolver.Availability a = result.get(PRODUCT_ID);
        assertThat(a.date()).isEqualTo(LocalDate.of(2026, 9, 28));
        assertThat(a.quantity()).isEqualTo(40);
        assertThat(a.price()).isEqualByComparingTo("13000");
    }

    @Test
    void resolveFallsBackToTheBasePriceWhenTheTemplatePriceIsNull() {
        when(templates.findByProductIdAndActiveTrue(PRODUCT_ID))
                .thenReturn(List.of(template(1, 40, null)));
        when(dailyStock.findByProductIdAndStockDate(any(), any())).thenReturn(Optional.empty());

        Map<Long, ProductAvailabilityResolver.Availability> result =
                resolver.resolve(Map.of(PRODUCT_ID, new BigDecimal("12000")));

        assertThat(result.get(PRODUCT_ID).price()).isEqualByComparingTo("12000");
    }

    @Test
    void resolvePrefersAnExistingDailyStockRowOverTheTemplateDefault() {
        LocalDate nearest = LocalDate.of(2026, 9, 28);
        when(templates.findByProductIdAndActiveTrue(PRODUCT_ID))
                .thenReturn(List.of(template(1, 40, new BigDecimal("13000"))));
        ProductDailyStock existing = new ProductDailyStock();
        existing.setQuantityAvailable(6); // 34 already sold
        existing.setUnitPrice(new BigDecimal("13000"));
        when(dailyStock.findByProductIdAndStockDate(PRODUCT_ID, nearest))
                .thenReturn(Optional.of(existing));

        Map<Long, ProductAvailabilityResolver.Availability> result =
                resolver.resolve(Map.of(PRODUCT_ID, new BigDecimal("12000")));

        assertThat(result.get(PRODUCT_ID).quantity()).isEqualTo(6);
    }

    @Test
    void resolveOmitsAProductWithNoOrderableDateWithinTheLookahead() {
        when(templates.findByProductIdAndActiveTrue(PRODUCT_ID)).thenReturn(List.of());

        Map<Long, ProductAvailabilityResolver.Availability> result =
                resolver.resolve(Map.of(PRODUCT_ID, new BigDecimal("12000")));

        assertThat(result).doesNotContainKey(PRODUCT_ID);
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `docker compose exec backend ./mvnw -q -B -Dtest=ProductAvailabilityResolverTest test`
Expected: FAIL to compile — `ProductAvailabilityResolver` does not exist yet.

- [ ] **Step 3: Write the resolver**

```java
package com.techx.intervue.modules.product.services.impl;

import com.techx.intervue.modules.product.entities.ProductDailyStock;
import com.techx.intervue.modules.product.entities.WeeklyStockTemplate;
import com.techx.intervue.modules.product.repositories.ProductDailyStockRepository;
import com.techx.intervue.modules.product.repositories.WeeklyStockTemplateRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * "Còn hàng ngày gần nhất" cho các trang chỉ đọc (xem trước giỏ, duyệt/tìm sản phẩm) — không sinh
 * dòng {@code product_daily_stock} nào, chỉ đọc. Xem docs/superpowers/specs/2026-09-26-product-daily-stock-design.md
 * mục "Browse / search". Nhìn tối đa 14 ngày tới; không tìm được ngày nào → sản phẩm không nằm trong
 * kết quả (không bán được lúc này).
 */
@Component
@AllArgsConstructor
public class ProductAvailabilityResolver {

    private static final int LOOKAHEAD_DAYS = 14;

    private final WeeklyStockTemplateRepository templates;
    private final ProductDailyStockRepository dailyStock;
    private final Clock clock;

    public record Availability(LocalDate date, int quantity, BigDecimal price) {}

    public Map<Long, Availability> resolve(Map<Long, BigDecimal> basePriceByProductId) {
        LocalDate today = LocalDate.now(clock);
        Map<Long, Availability> result = new HashMap<>();
        for (Map.Entry<Long, BigDecimal> entry : basePriceByProductId.entrySet()) {
            Long productId = entry.getKey();
            List<WeeklyStockTemplate> active = templates.findByProductIdAndActiveTrue(productId);
            nearestDate(today, active)
                    .ifPresent(
                            date -> result.put(productId, resolveOne(productId, date, active, entry.getValue())));
        }
        return result;
    }

    private Availability resolveOne(
            Long productId, LocalDate date, List<WeeklyStockTemplate> active, BigDecimal basePrice) {
        Optional<ProductDailyStock> existing = dailyStock.findByProductIdAndStockDate(productId, date);
        if (existing.isPresent()) {
            ProductDailyStock row = existing.get();
            return new Availability(date, row.getQuantityAvailable(), row.getUnitPrice());
        }
        int dayOfWeek = date.getDayOfWeek().getValue() % 7;
        WeeklyStockTemplate template =
                active.stream().filter(t -> t.getDayOfWeek() == dayOfWeek).findFirst().orElseThrow();
        BigDecimal price = template.getDefaultPrice() != null ? template.getDefaultPrice() : basePrice;
        return new Availability(date, template.getDefaultQuantity(), price);
    }

    /** Ngày gần nhất kể từ {@code today} (bao gồm hôm nay) mà thứ trong tuần khớp một template active. */
    static Optional<LocalDate> nearestDate(LocalDate today, List<WeeklyStockTemplate> templates) {
        if (templates.isEmpty()) {
            return Optional.empty();
        }
        Set<Integer> activeDays =
                templates.stream().map(WeeklyStockTemplate::getDayOfWeek).collect(Collectors.toSet());
        for (int i = 0; i < LOOKAHEAD_DAYS; i++) {
            LocalDate candidate = today.plusDays(i);
            if (activeDays.contains(candidate.getDayOfWeek().getValue() % 7)) {
                return Optional.of(candidate);
            }
        }
        return Optional.empty();
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `docker compose exec backend ./mvnw -q -B -Dtest=ProductAvailabilityResolverTest test`
Expected: `Tests run: 7, Failures: 0, Errors: 0`

- [ ] **Step 5: Commit**

```bash
docker compose exec backend ./mvnw -q spotless:apply
git add backend/src/main/java/com/techx/intervue/modules/product/services/impl/ProductAvailabilityResolver.java \
        backend/src/test/java/com/techx/intervue/modules/product/services/impl/ProductAvailabilityResolverTest.java
git commit -m "feat(product): resolve nearest orderable date for read-only pages"
```

---

### Task 8: Wire the resolver into preview and public product reads

**Files:**
- Modify: `backend/src/main/java/com/techx/intervue/modules/order/services/impl/OrderService.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/product/services/impl/ProductQueryService.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/product/resources/ProductListItemResource.java`
- Modify: `backend/src/test/java/com/techx/intervue/modules/order/services/impl/OrderServiceTest.java`
- Modify: `backend/src/test/java/com/techx/intervue/modules/product/services/impl/ProductQueryServiceTest.java`

**Interfaces:**
- Consumes: `ProductAvailabilityResolver.resolve(...)` (Task 7).
- Produces: `ProductListItemResource.withAvailability(int, BigDecimal): ProductListItemResource`.

**Scope note:** `mine()` (Farmer's own product list, `ProductQueryRepository.MINE_SQL`) is **not**
touched — that page is about editing `products.price`/`stock_quantity` directly (FR-062), not about
picking a pickup date, and stays exactly as it reads today.

- [ ] **Step 1: Add `withAvailability` to `ProductListItemResource`**

```java
package com.techx.intervue.modules.product.resources;

import java.math.BigDecimal;

/**
 * Một sản phẩm trong danh sách (contract §5). `marketId`/`marketName` là chợ đang lọc, hoặc một chợ
 * của stall khi không lọc — chi tiết đầy đủ các chợ nằm ở `GET /farmers/{id}`.
 */
public record ProductListItemResource(
        Long id,
        String name,
        Long farmerId,
        String stallName,
        Long marketId,
        String marketName,
        Long categoryId,
        String categoryName,
        BigDecimal price,
        String unit,
        int stockQuantity,
        String imageUrl,
        String status,
        BigDecimal ratingAvg,
        int ratingCount,
        int shelfLifeDays) {

    /**
     * Ghi đè `stockQuantity`/`price` bằng số của ngày pickup gần nhất còn bán được (contract §5,
     * FR-063 daily-stock). Chỉ dùng cho các trang public/preview, không dùng cho `mine()`.
     */
    public ProductListItemResource withAvailability(int stockQuantity, BigDecimal price) {
        return new ProductListItemResource(
                id,
                name,
                farmerId,
                stallName,
                marketId,
                marketName,
                categoryId,
                categoryName,
                price,
                unit,
                stockQuantity,
                imageUrl,
                status,
                ratingAvg,
                ratingCount,
                shelfLifeDays);
    }
}
```

- [ ] **Step 2: Write the failing `ProductQueryService` tests**

Read `backend/src/test/java/com/techx/intervue/modules/product/services/impl/ProductQueryServiceTest.java`
first to match its existing mocking style before adding to it (it already mocks `ProductQueryRepository`
and `StallServiceInterface`). Add a `ProductAvailabilityResolver` mock, pass it as
`ProductQueryService`'s new trailing constructor argument, and add:

```java
    @Test
    void searchOverlaysTheNearestAvailableDateOntoEachItem() {
        ProductListItemResource raw =
                new ProductListItemResource(
                        1L, "Rau muống", 10L, "Vườn Út Hiền", null, null, 5L, "Vegetables",
                        new BigDecimal("12000"), "bó", 40, null, "available", BigDecimal.ZERO, 0, 3);
        when(repository.search(any(), any(), anyInt(), anyInt()))
                .thenReturn(new PageResource<>(List.of(raw), 1, 20, 1));
        when(availability.resolve(Map.of(1L, new BigDecimal("12000"))))
                .thenReturn(
                        Map.of(
                                1L,
                                new ProductAvailabilityResolver.Availability(
                                        LocalDate.of(2026, 9, 28), 40, new BigDecimal("13000"))));

        PageResource<ProductListItemResource> result =
                service.search(
                        new ProductSearchCriteria(
                                null, null, null, null, null, null, null, "newest", 1, 20));

        assertThat(result.items().getFirst().stockQuantity()).isEqualTo(40);
        assertThat(result.items().getFirst().price()).isEqualByComparingTo("13000");
    }

    @Test
    void searchDropsAProductWithNoOrderableDate() {
        ProductListItemResource raw =
                new ProductListItemResource(
                        1L, "Rau muống", 10L, "Vườn Út Hiền", null, null, 5L, "Vegetables",
                        new BigDecimal("12000"), "bó", 40, null, "available", BigDecimal.ZERO, 0, 3);
        when(repository.search(any(), any(), anyInt(), anyInt()))
                .thenReturn(new PageResource<>(List.of(raw), 1, 20, 1));
        when(availability.resolve(any())).thenReturn(Map.of());

        PageResource<ProductListItemResource> result =
                service.search(
                        new ProductSearchCriteria(
                                null, null, null, null, null, null, null, "newest", 1, 20));

        assertThat(result.items()).isEmpty();
        assertThat(result.total()).isZero();
    }
```

Add the mock field, its `mock(...)` init in `@BeforeEach`, and pass it to `new ProductQueryService(...)`
in the same positions the existing test file already sets up `repository`/`stallService` — mirror that
exact pattern (read the file's current `@BeforeEach` before editing).

- [ ] **Step 3: Run tests to verify they fail**

Run: `docker compose exec backend ./mvnw -q -B -Dtest=ProductQueryServiceTest test`
Expected: FAIL to compile — `ProductQueryService` doesn't take an availability resolver yet.

- [ ] **Step 4: Wire the resolver into `ProductQueryService`**

Add the field (via `@AllArgsConstructor`, append after `stallService`):

```java
    private final ProductQueryRepository repository;
    private final StallServiceInterface stallService;
    private final ProductAvailabilityResolver availability;
```

Replace `search(...)`:

```java
    @Override
    public PageResource<ProductListItemResource> search(ProductSearchCriteria criteria) {
        int page = Math.max(1, criteria.page());
        int size = Math.min(MAX_PAGE_SIZE, Math.max(1, criteria.pageSize()));
        BigDecimal min = criteria.minPrice();
        BigDecimal max = criteria.maxPrice();
        if (min != null && max != null && min.compareTo(max) > 0) {
            BigDecimal swap = min;
            min = max;
            max = swap;
        }
        PageResource<ProductListItemResource> page1 =
                repository.search(
                        criteria.withPrices(min, max),
                        ProductQueryRepository.orderBy(criteria.sort()),
                        (page - 1) * size,
                        size);
        List<ProductListItemResource> overlaid = overlayAvailability(page1.items());
        return new PageResource<>(overlaid, page1.page(), page1.pageSize(), overlaid.size());
    }

    /**
     * Thay `stockQuantity`/`price` đọc thẳng từ `products` bằng số của ngày pickup gần nhất còn bán
     * được. Sản phẩm không có ngày nào bán được (chưa có template active) bị loại khỏi kết quả —
     * đúng quyết định "không có template thì không bán được".
     */
    private List<ProductListItemResource> overlayAvailability(List<ProductListItemResource> items) {
        Map<Long, BigDecimal> basePrices =
                items.stream()
                        .collect(
                                Collectors.toMap(
                                        ProductListItemResource::id, ProductListItemResource::price));
        Map<Long, ProductAvailabilityResolver.Availability> resolved = availability.resolve(basePrices);
        return items.stream()
                .filter(i -> resolved.containsKey(i.id()))
                .map(
                        i -> {
                            ProductAvailabilityResolver.Availability a = resolved.get(i.id());
                            return i.withAvailability(a.quantity(), a.price());
                        })
                .toList();
    }
```

Replace `detail(...)`:

```java
    @Override
    public ProductDetailResource detail(long id) {
        ProductDetailRow row =
                repository.findVisibleById(id).orElseThrow(() -> new ProductNotFoundException(id));
        List<ProductListItemResource> overlaid = overlayAvailability(List.of(row.item()));
        if (overlaid.isEmpty()) {
            throw new ProductNotFoundException(id);
        }
        StallSummaryResource farmer = summarize(stallService.publicDetail(row.item().farmerId()));
        return new ProductDetailResource(
                overlaid.getFirst(), row.description(), farmer, ReviewSummaryResource.empty());
    }
```

Add the import: `import java.util.stream.Collectors;` (check it isn't already imported before adding a
duplicate — it likely is not, since this file didn't need it before).

`byFarmer(...)` calls `search(...)` internally, so it gets the overlay for free — no change needed
there.

- [ ] **Step 5: Run tests to verify they pass**

Run: `docker compose exec backend ./mvnw -q -B -Dtest=ProductQueryServiceTest test`
Expected: all pass, including the two new ones. Check the existing tests in this file for any that
asserted a literal `stockQuantity`/`price` equal to what the mock `repository` returned — those now
need `availability.resolve(...)` stubbed to pass the value through unchanged, e.g.
`when(availability.resolve(any())).thenAnswer(inv -> { Map<Long, BigDecimal> in = inv.getArgument(0);
return in.keySet().stream().collect(Collectors.toMap(id -> id, id -> new
ProductAvailabilityResolver.Availability(LocalDate.now(), <original qty>, in.get(id)))); });` — read
each failing existing test individually and stub only what it needs; do not add a blanket passthrough
that would defeat the point of `searchDropsAProductWithNoOrderableDate`.

- [ ] **Step 6: Wire the resolver into `OrderService.preview()`**

`OrderService` already has access to `Product` entities in `preview()` (via `products` local map). Add
the resolver as a new constructor field (same `@AllArgsConstructor` append-at-end pattern as Task 6's
`dailyStockRepository` — append after it):

```java
    private final ProductDailyStockRepository dailyStockRepository;
    private final ProductAvailabilityResolver availability;
```

In `preview(...)`, after `Map<Long, Product> products = ...` is built, resolve availability once for
the whole cart and pass it down to `previewGroup`:

```java
        Map<Long, java.math.BigDecimal> basePrices =
                products.values().stream()
                        .collect(Collectors.toMap(Product::getId, Product::getPrice));
        Map<Long, ProductAvailabilityResolver.Availability> resolved = availability.resolve(basePrices);
```

Change `previewGroup`'s signature to accept `resolved` and use it instead of `p.getStockQuantity()`
when building each `PreviewItemResource`:

```java
    private static OrderGroupPreviewResource previewGroup(
            Long farmerId,
            FarmerProfile farmer,
            List<Product> lines,
            Map<Long, Integer> wanted,
            List<MarketOption> markets,
            Map<Long, ProductAvailabilityResolver.Availability> resolved) {
        Set<String> problems = new LinkedHashSet<>();
        if (farmer == null || farmer.getApprovalStatus() != ApprovalStatus.APPROVED) {
            problems.add(STALL_SUSPENDED);
        }
        List<PreviewItemResource> items = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;
        for (Product p : lines) {
            int qty = wanted.get(p.getId());
            ProductAvailabilityResolver.Availability a = resolved.get(p.getId());
            int available = a == null ? 0 : a.quantity();
            String problem = problemOf(p, qty, available);
            if (problem != null) {
                problems.add(problem);
            }
            BigDecimal lineTotal = p.getPrice().multiply(BigDecimal.valueOf(qty));
            subtotal = subtotal.add(lineTotal);
            items.add(
                    new PreviewItemResource(
                            p.getId(),
                            p.getName(),
                            p.getUnit(),
                            p.getPrice(),
                            qty,
                            lineTotal,
                            available,
                            listed(p) ? p.getStatus().value() : UNAVAILABLE));
        }
        MarketOption only = markets.size() == 1 ? markets.getFirst() : null;
        return new OrderGroupPreviewResource(
                farmerId,
                farmer == null ? null : farmer.getStallName(),
                only == null ? null : only.marketId(),
                only == null ? null : only.marketName(),
                farmer == null ? 0 : farmer.getOrderCutoffHours(),
                items,
                subtotal,
                List.copyOf(problems),
                markets);
    }

    /** Vấn đề của một dòng giỏ, hoặc null. `available` = ngày pickup gần nhất còn bán được. */
    private static String problemOf(Product p, int quantity, int available) {
        if (!listed(p) || p.getStatus() == ProductStatus.UNAVAILABLE) {
            return UNAVAILABLE;
        }
        if (p.getStatus() == ProductStatus.SOLD_OUT) {
            return SOLD_OUT;
        }
        return available < quantity ? OUT_OF_STOCK : null;
    }
```

Update the call site inside `preview(...)` that invokes `previewGroup(...)` to pass `resolved`:

```java
        byFarmer.forEach(
                (farmerId, lines) ->
                        groups.add(
                                previewGroup(
                                        farmerId,
                                        farmers.get(farmerId),
                                        lines,
                                        wanted,
                                        markets.getOrDefault(farmerId, List.of()),
                                        resolved)));
```

- [ ] **Step 7: Update `OrderServiceTest`'s preview tests**

Add `ProductAvailabilityResolver` to the mock set and pass it as `OrderService`'s new final constructor
argument (after `dailyStockRepository`, from Task 6). Stub it in `setUp()` to pass through each
product's live `stockQuantity`/`price` from the fake `products` map, so every existing preview test
that doesn't specifically care about availability keeps passing unmodified:

```java
        when(availability.resolve(any()))
                .thenAnswer(
                        inv -> {
                            Map<Long, BigDecimal> in = inv.getArgument(0);
                            Map<Long, ProductAvailabilityResolver.Availability> out = new HashMap<>();
                            in.keySet()
                                    .forEach(
                                            id -> {
                                                Product p = products.get(id);
                                                if (p != null) {
                                                    out.put(
                                                            id,
                                                            new ProductAvailabilityResolver.Availability(
                                                                    PICKUP,
                                                                    p.getStockQuantity(),
                                                                    p.getPrice()));
                                                }
                                            });
                            return out;
                        });
```

`previewFlagsItemsOverStock`'s assertion `assertThat(groupOf(groups, FARMER_B).items().getFirst()
.stockQuantity()).isEqualTo(15);` keeps passing unmodified — `products.get(BANH_CHUOI)
.getStockQuantity()` is still 15 in the fixture, and the stub above passes it straight through.

- [ ] **Step 8: Run the full suite**

Run: `docker compose exec backend ./mvnw -q -B test`
Expected: no failures. Re-check `grep -rln "new OrderService(" backend/src/test` and
`grep -rln "new ProductQueryService(" backend/src/test` for any other construction site that needs the
same new trailing argument.

- [ ] **Step 9: Format and commit**

```bash
docker compose exec backend ./mvnw -q spotless:apply
git add backend/src/main/java/com/techx/intervue/modules/product/resources/ProductListItemResource.java \
        backend/src/main/java/com/techx/intervue/modules/product/services/impl/ProductQueryService.java \
        backend/src/main/java/com/techx/intervue/modules/order/services/impl/OrderService.java \
        backend/src/test/java/com/techx/intervue/modules/product/services/impl/ProductQueryServiceTest.java \
        backend/src/test/java/com/techx/intervue/modules/order/services/impl/OrderServiceTest.java
git commit -m "feat(product): surface nearest-date availability on preview and browse"
```

---

### Task 9: Remove FR-063's "Apply" action

**Files:**
- Modify: `backend/src/main/java/com/techx/intervue/modules/product/controllers/FarmerStockTemplateController.java`
- Delete: `backend/src/main/java/com/techx/intervue/modules/product/requests/ApplyStockTemplateRequest.java`
- Delete: `backend/src/main/java/com/techx/intervue/modules/product/resources/StockTemplateApplyResultResource.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/product/services/interfaces/StockTemplateServiceInterface.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/product/services/impl/StockTemplateService.java`
- Modify: `backend/src/test/java/com/techx/intervue/modules/product/services/impl/StockTemplateServiceTest.java`
- Modify: `frontend/src/pages/farmer/StockWeek/index.tsx`
- Modify: `frontend/src/api-requests/stock-template.requests.ts`
- Modify: `frontend/src/locales/en/FarmerStockWeek.json`

**Interfaces:** none — pure removal, nothing later in this plan depends on any of it.

- [ ] **Step 1: Remove backend apply support**

In `StockTemplateServiceInterface.java`, delete the `apply(...)` method declaration and its now-unused
imports (`StockTemplateApplyResultResource`, `LocalDate`).

In `StockTemplateService.java`, delete the whole `apply(...)` method (from `@Override` through its
closing `}`) and its now-unused imports (`ProductStatus`, `StockTemplateApplyResultResource`,
`LocalDate`, `ArrayList`, `Optional` — check each is not used elsewhere in the file before removing).

In `FarmerStockTemplateController.java`, delete the `apply(...)` endpoint method and the now-unused
imports (`ApplyStockTemplateRequest`, `StockTemplateApplyResultResource`, `PostMapping`).

Delete the two files:
```bash
rm backend/src/main/java/com/techx/intervue/modules/product/requests/ApplyStockTemplateRequest.java
rm backend/src/main/java/com/techx/intervue/modules/product/resources/StockTemplateApplyResultResource.java
```

In `StockTemplateServiceTest.java`, delete every test method whose name starts with `apply` (7 tests:
`applyRejectsStallNotApproved`, `applyOnMondayComputesDayOfWeekOne`, `applyOnSundayComputesDayOfWeekZero`,
`applyOverwritesStockPriceAndClearsSoldOut`, `applyKeepsExistingPriceWhenDefaultPriceIsNull`,
`applyReturnsEmptyWhenNoTemplateMatchesDay`, `applySkipsTemplateWhoseProductWasDeleted`), the `MONDAY`/
`SUNDAY` constants if nothing else in the file uses them, and the `template(...)` helper if nothing else
uses it — check each with a search inside the file before deleting.

- [ ] **Step 2: Run the backend suite**

Run: `docker compose exec backend ./mvnw -q -B test`
Expected: no failures; `StockTemplateServiceTest` now has 5 tests (`list`, `replace` × 4).

- [ ] **Step 3: Remove frontend apply support**

In `frontend/src/api-requests/stock-template.requests.ts`: delete the `StockTemplateApplyResultDto`
type and the `apply` static method from `StockTemplateApi`.

In `frontend/src/pages/farmer/StockWeek/index.tsx`: delete the `applyOpen`/`targetDate`/`applying`
state, the `apply` async function, the `todayIso`/`parseLocalDate` helpers, the "Apply template" Button
in the header, and the whole `<Dialog>` block at the end of the component. The component's return
becomes just the header (title/intro, no longer with the Apply button since `productList.length > 0`
no longer gates anything to show) and the loading/error/empty/grid states.

In `frontend/src/locales/en/FarmerStockWeek.json`: delete the whole `apply` object.

- [ ] **Step 4: Verify the frontend build**

Run:
```bash
docker compose exec frontend npx tsc -b
docker compose exec frontend npm run lint
docker compose exec frontend npx prettier --check src/pages/farmer/StockWeek/index.tsx src/api-requests/stock-template.requests.ts
docker compose exec frontend npm run build
```
Expected: all four clean.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/techx/intervue/modules/product/controllers/FarmerStockTemplateController.java \
        backend/src/main/java/com/techx/intervue/modules/product/services/interfaces/StockTemplateServiceInterface.java \
        backend/src/main/java/com/techx/intervue/modules/product/services/impl/StockTemplateService.java \
        backend/src/test/java/com/techx/intervue/modules/product/services/impl/StockTemplateServiceTest.java \
        frontend/src/pages/farmer/StockWeek/index.tsx \
        frontend/src/api-requests/stock-template.requests.ts \
        frontend/src/locales/en/FarmerStockWeek.json
git add -u backend/src/main/java/com/techx/intervue/modules/product/requests/ApplyStockTemplateRequest.java \
        backend/src/main/java/com/techx/intervue/modules/product/resources/StockTemplateApplyResultResource.java
git commit -m "feat(product): remove manual Apply, availability is now automatic"
```

---

### Task 10: Full-suite verification and manual smoke test

**Files:** none — verification only.

- [ ] **Step 1: Full backend suite**

Run: `docker compose exec backend ./mvnw -q -B test`
Expected: `BUILD SUCCESS`, 0 failures, 0 errors.

- [ ] **Step 2: Format check**

Run: `docker compose exec backend ./mvnw -q spotless:check`
Expected: clean (nothing to report).

- [ ] **Step 3: Frontend checks**

```bash
docker compose exec frontend npx tsc -b
docker compose exec frontend npm run lint
docker compose exec frontend npm run build
```
Expected: all clean.

- [ ] **Step 4: Manual smoke test against the real stack**

Restart so Flyway/Spotless-formatted code is actually running:

```bash
make be-restart
```

Using the seeded farmer (`farmer@marketlink.vn` / `Demo@1234`, same account used to verify FR-063
earlier this session):

1. `GET /api/v1/products?farmerId=273` — confirm the response's `stockQuantity`/`price` per item now
   reflect the nearest weekday with an active template, not the raw `products.stock_quantity` column
   (cross-check against `SELECT * FROM weekly_stock_templates WHERE farmer_id = 273`).
2. `POST /api/v1/orders/preview` with a product that has a template — confirm `stockQuantity` in the
   response matches the same nearest-date number.
3. `POST /api/v1/orders` with `pickupDate` set to that nearest date and a `slotId` generated for it —
   confirm success, then `SELECT * FROM product_daily_stock WHERE product_id = <id>` shows the
   decremented row.
4. Place a second order for the same product on a **different** pickup date — confirm it succeeds and
   only that date's row changes (the first date's row is untouched).
5. Attempt an order for a pickup date whose weekday has no active template — confirm `409 OUT_OF_STOCK`.
6. Confirm `POST /api/v1/farmer/stock-templates/apply` now returns `404` (route no longer exists).

Report any mismatch before considering this plan done — this step is the one thing no automated test
in this plan proves end-to-end (real HTTP, real Flyway-applied schema, real JWT).

---

### Task 11: Farmer per-date override

**Files:**
- Create: `backend/src/main/java/com/techx/intervue/modules/product/requests/FarmerDailyStockRequest.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/product/resources/DailyStockResource.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/product/services/interfaces/FarmerDailyStockServiceInterface.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/product/services/impl/FarmerDailyStockService.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/product/services/impl/FarmerDailyStockServiceTest.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/product/controllers/FarmerProductController.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/product/controllers/ProductExceptionHandler.java`

**Interfaces:**
- Consumes: `ProductDailyStockRepository` (Task 3), `ProductRepository`, `FarmerProfileRepository`
  (existing, same as `StockTemplateService`).
- Produces: `PATCH /api/v1/farmer/products/{id}/daily-stock/{date}`, `date` path segment as
  `yyyy-MM-dd` (Spring's default `LocalDate` converter, same as `ApplyStockTemplateRequest` used
  before Task 9 removed it).

Spec section "Farmer per-date override": lets a Farmer hand-adjust one date without touching the
recurring template. It can only adjust a date the template would already cover (materializes it first,
same as every other read/write path) — it does not invent an orderable date out of nothing, which
would silently break decision 2 ("no template, no order, ever").

- [ ] **Step 1: Write the failing test**

```java
package com.techx.intervue.modules.product.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.product.entities.Product;
import com.techx.intervue.modules.product.entities.ProductDailyStock;
import com.techx.intervue.modules.product.exceptions.ProductNotYoursException;
import com.techx.intervue.modules.product.repositories.ProductDailyStockRepository;
import com.techx.intervue.modules.product.repositories.ProductRepository;
import com.techx.intervue.modules.product.requests.FarmerDailyStockRequest;
import com.techx.intervue.modules.product.resources.DailyStockResource;
import com.techx.intervue.modules.stall.exceptions.StallNotApprovedException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class FarmerDailyStockServiceTest {

    private static final long USER_ID = 1L;
    private static final long FARMER_ID = 10L;
    private static final long OTHER_FARMER_ID = 2L;
    private static final long PRODUCT_ID = 100L;
    private static final LocalDate DATE = LocalDate.of(2026, 9, 28);

    private ProductDailyStockRepository dailyStock;
    private ProductRepository products;
    private FarmerProfileRepository farmers;
    private FarmerDailyStockService service;

    @BeforeEach
    void setUp() {
        dailyStock = mock(ProductDailyStockRepository.class);
        products = mock(ProductRepository.class);
        farmers = mock(FarmerProfileRepository.class);
        service = new FarmerDailyStockService(dailyStock, products, farmers);
    }

    private static FarmerProfile stall(ApprovalStatus status) {
        return FarmerProfile.builder().id(FARMER_ID).userId(USER_ID).approvalStatus(status).build();
    }

    private static Product product(long farmerId) {
        Product p = new Product();
        p.setId(PRODUCT_ID);
        p.setFarmerId(farmerId);
        return p;
    }

    private void approvedStall() {
        when(farmers.findByUserId(USER_ID)).thenReturn(Optional.of(stall(ApprovalStatus.APPROVED)));
        when(products.findByIdAndDeletedFalse(PRODUCT_ID)).thenReturn(Optional.of(product(FARMER_ID)));
    }

    @Test
    void overrideRejectsStallNotApproved() {
        when(farmers.findByUserId(USER_ID)).thenReturn(Optional.of(stall(ApprovalStatus.PENDING)));

        assertThatThrownBy(
                        () ->
                                service.override(
                                        USER_ID,
                                        PRODUCT_ID,
                                        DATE,
                                        new FarmerDailyStockRequest(15, new BigDecimal("18000"))))
                .isInstanceOf(StallNotApprovedException.class);
    }

    @Test
    void overrideRejectsProductNotOwnedByFarmer() {
        when(farmers.findByUserId(USER_ID)).thenReturn(Optional.of(stall(ApprovalStatus.APPROVED)));
        when(products.findByIdAndDeletedFalse(PRODUCT_ID))
                .thenReturn(Optional.of(product(OTHER_FARMER_ID)));

        assertThatThrownBy(
                        () ->
                                service.override(
                                        USER_ID,
                                        PRODUCT_ID,
                                        DATE,
                                        new FarmerDailyStockRequest(15, new BigDecimal("18000"))))
                .isInstanceOf(ProductNotYoursException.class);
    }

    /** Không có template khớp ngày đó → materialize không sinh dòng nào → không có gì để sửa. */
    @Test
    void overrideRejectsADateWithNoTemplate() {
        approvedStall();
        when(dailyStock.findByProductIdAndStockDate(PRODUCT_ID, DATE)).thenReturn(Optional.empty());

        assertThatThrownBy(
                        () ->
                                service.override(
                                        USER_ID,
                                        PRODUCT_ID,
                                        DATE,
                                        new FarmerDailyStockRequest(15, new BigDecimal("18000"))))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void overrideOverwritesQuantityAndPrice() {
        approvedStall();
        ProductDailyStock row = new ProductDailyStock();
        row.setId(500L);
        row.setProductId(PRODUCT_ID);
        row.setStockDate(DATE);
        row.setQuantityAvailable(40);
        row.setUnitPrice(new BigDecimal("12000"));
        when(dailyStock.findByProductIdAndStockDate(PRODUCT_ID, DATE)).thenReturn(Optional.of(row));
        when(dailyStock.save(any())).thenAnswer(i -> i.getArgument(0));

        DailyStockResource result =
                service.override(
                        USER_ID, PRODUCT_ID, DATE, new FarmerDailyStockRequest(15, new BigDecimal("18000")));

        assertThat(result.quantityAvailable()).isEqualTo(15);
        assertThat(result.unitPrice()).isEqualByComparingTo("18000");
        verify(dailyStock).save(row);
    }

    /** {@code unitPrice} null trong request = giữ nguyên giá hiện có, chỉ đổi số lượng. */
    @Test
    void overrideKeepsExistingPriceWhenRequestPriceIsNull() {
        approvedStall();
        ProductDailyStock row = new ProductDailyStock();
        row.setId(500L);
        row.setQuantityAvailable(40);
        row.setUnitPrice(new BigDecimal("12000"));
        when(dailyStock.findByProductIdAndStockDate(PRODUCT_ID, DATE)).thenReturn(Optional.of(row));
        when(dailyStock.save(any())).thenAnswer(i -> i.getArgument(0));

        DailyStockResource result =
                service.override(USER_ID, PRODUCT_ID, DATE, new FarmerDailyStockRequest(15, null));

        assertThat(result.unitPrice()).isEqualByComparingTo("12000");
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec backend ./mvnw -q -B -Dtest=FarmerDailyStockServiceTest test`
Expected: FAIL to compile — none of the new classes exist yet.

- [ ] **Step 3: Write the request, resource, interface, and service**

```java
package com.techx.intervue.modules.product.requests;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

/**
 * Body của PATCH /api/v1/farmer/products/{id}/daily-stock/{date} — sửa riêng một ngày, không đụng
 * template tuần. {@code unitPrice} null = giữ nguyên giá hiện có của ngày đó.
 */
public record FarmerDailyStockRequest(
        @NotNull @Min(0) Integer quantityAvailable, @DecimalMin("0") BigDecimal unitPrice) {}
```

```java
package com.techx.intervue.modules.product.resources;

import java.math.BigDecimal;
import java.time.LocalDate;

public record DailyStockResource(
        Long productId, LocalDate stockDate, int quantityAvailable, BigDecimal unitPrice) {}
```

```java
package com.techx.intervue.modules.product.services.interfaces;

import com.techx.intervue.modules.product.requests.FarmerDailyStockRequest;
import com.techx.intervue.modules.product.resources.DailyStockResource;
import java.time.LocalDate;

public interface FarmerDailyStockServiceInterface {
    DailyStockResource override(
            long userId, long productId, LocalDate date, FarmerDailyStockRequest request);
}
```

```java
package com.techx.intervue.modules.product.services.impl;

import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.farmer.exceptions.FarmerProfileNotFoundException;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.product.entities.Product;
import com.techx.intervue.modules.product.entities.ProductDailyStock;
import com.techx.intervue.modules.product.exceptions.ProductNotFoundException;
import com.techx.intervue.modules.product.exceptions.ProductNotYoursException;
import com.techx.intervue.modules.product.repositories.ProductDailyStockRepository;
import com.techx.intervue.modules.product.repositories.ProductRepository;
import com.techx.intervue.modules.product.requests.FarmerDailyStockRequest;
import com.techx.intervue.modules.product.resources.DailyStockResource;
import com.techx.intervue.modules.product.services.interfaces.FarmerDailyStockServiceInterface;
import com.techx.intervue.modules.stall.exceptions.StallNotApprovedException;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@AllArgsConstructor
public class FarmerDailyStockService implements FarmerDailyStockServiceInterface {

    private final ProductDailyStockRepository dailyStock;
    private final ProductRepository products;
    private final FarmerProfileRepository farmers;

    @Override
    @Transactional
    public DailyStockResource override(
            long userId, long productId, LocalDate date, FarmerDailyStockRequest request) {
        FarmerProfile profile = mine(userId);
        requireApproved(profile);
        Product product =
                products
                        .findByIdAndDeletedFalse(productId)
                        .orElseThrow(() -> new ProductNotFoundException(productId));
        if (!product.getFarmerId().equals(profile.getId())) {
            throw new ProductNotYoursException();
        }

        int dayOfWeek = date.getDayOfWeek().getValue() % 7;
        dailyStock.materialize(productId, date, dayOfWeek);
        ProductDailyStock row =
                dailyStock
                        .findByProductIdAndStockDate(productId, date)
                        .orElseThrow(
                                () ->
                                        new IllegalArgumentException(
                                                "No weekly template covers that weekday yet."
                                                        + " Add one before overriding a date."));

        row.setQuantityAvailable(request.quantityAvailable());
        if (request.unitPrice() != null) {
            row.setUnitPrice(request.unitPrice());
        }
        ProductDailyStock saved = dailyStock.save(row);

        return new DailyStockResource(
                saved.getProductId(), saved.getStockDate(), saved.getQuantityAvailable(), saved.getUnitPrice());
    }

    private FarmerProfile mine(long userId) {
        return farmers.findByUserId(userId).orElseThrow(FarmerProfileNotFoundException::new);
    }

    private static void requireApproved(FarmerProfile profile) {
        if (profile.getApprovalStatus() != ApprovalStatus.APPROVED) {
            throw new StallNotApprovedException();
        }
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `docker compose exec backend ./mvnw -q -B -Dtest=FarmerDailyStockServiceTest test`
Expected: `Tests run: 5, Failures: 0, Errors: 0`

- [ ] **Step 5: Wire the controller endpoint**

In `FarmerProductController.java`, add the new dependency and endpoint. Add to the constructor fields
(via `@AllArgsConstructor`, append after `products`):

```java
    private final ProductServiceInterface products;
    private final FarmerDailyStockServiceInterface dailyStock;
```

Add the endpoint (anywhere among the other methods, e.g. after `setStatus`):

```java
    @PatchMapping("/{id}/daily-stock/{date}")
    public ResponseEntity<ApiResource<DailyStockResource>> overrideDailyStock(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable long id,
            @PathVariable java.time.LocalDate date,
            @Valid @RequestBody FarmerDailyStockRequest request) {
        return ok(dailyStock.override(user.getId(), id, date, request), "Stock for that day saved.");
    }
```

Add the two new imports (`com.techx.intervue.modules.product.requests.FarmerDailyStockRequest`,
`com.techx.intervue.modules.product.resources.DailyStockResource`,
`com.techx.intervue.modules.product.services.interfaces.FarmerDailyStockServiceInterface`) at the top
of the file alongside the existing ones.

In `ProductExceptionHandler.java`, add `FarmerStockTemplateController` is already covered — this new
endpoint lives on `FarmerProductController`, already in the `assignableTypes` list, so
`ProductNotFoundException`/`ProductNotYoursException`/`StallNotApprovedException`/
`IllegalArgumentException`/`MethodArgumentNotValidException` are all already mapped. No change needed
to this file — confirm by reading its `assignableTypes` list before moving on.

- [ ] **Step 6: Run the full suite**

Run: `docker compose exec backend ./mvnw -q -B test`
Expected: no failures.

- [ ] **Step 7: Format and commit**

```bash
docker compose exec backend ./mvnw -q spotless:apply
git add backend/src/main/java/com/techx/intervue/modules/product/requests/FarmerDailyStockRequest.java \
        backend/src/main/java/com/techx/intervue/modules/product/resources/DailyStockResource.java \
        backend/src/main/java/com/techx/intervue/modules/product/services/interfaces/FarmerDailyStockServiceInterface.java \
        backend/src/main/java/com/techx/intervue/modules/product/services/impl/FarmerDailyStockService.java \
        backend/src/test/java/com/techx/intervue/modules/product/services/impl/FarmerDailyStockServiceTest.java \
        backend/src/main/java/com/techx/intervue/modules/product/controllers/FarmerProductController.java
git commit -m "feat(product): let a Farmer override one date without touching the template"
```

No frontend UI is built for this endpoint in this plan — it's API-only. Wiring a "adjust this one day"
control into `/farmer/stock` is left for a follow-up, same as the rest of the per-date browse-page
display (Task 8) has no dedicated new UI beyond the numbers the existing pages already render from the
API response.
