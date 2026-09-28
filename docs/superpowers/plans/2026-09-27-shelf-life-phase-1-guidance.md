# Giai đoạn 1 — Hạn dùng gợi ý (FR-120, FR-121) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Farmer khai hạn dùng theo nhóm bảo quản có mốc gợi ý, kéo dài phải xác nhận cam kết, khách thấy cách bảo quản và hạn dùng, và mỗi món trong đơn lưu lại lời hứa lúc đặt.

**Architecture:** Bảng master data mới `shelf_life_guides` (nhóm × cách bảo quản → số ngày gợi ý) trong module `catalog`, kèm API đọc cho Farmer và API CRUD cho Admin. `ProductService` tự tính lại mốc gợi ý, trần gấp đôi và cờ "kéo dài" từ DB, không tin client. Lời hứa được chụp vào `order_items` lúc đặt đơn (`OrderItem.snapshot`). Frontend thêm một khối `ShelfLifeField` trong form sản phẩm, một mục "Storage groups" trong trang Admin Categories, và dòng hạn dùng ở trang sản phẩm và trang chi tiết đơn.

**Tech Stack:** Spring Boot 4 · Java 25 · MySQL 8 · Flyway · JUnit 5 + Mockito + AssertJ · React 19 · Vite · TypeScript · Tailwind 4 · react-i18next · vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-27-shelf-life-deals-design.md` — §4.1, §4.2, §4.3, §5 (migration 1–3), §6 (các dòng của giai đoạn 1), §8, §9, §10. LEAD duyệt 27/09/2026.

## Global Constraints

- Làm trên nhánh `feature/FR-120-shelf-life-deals` (worktree riêng), không commit, push hay merge vào `dev`/`main` (R-08).
- Commit dạng `<type>(FR-120|FR-121): <English>`, toàn bộ tiếng Anh (R-01, R-10). FR-120 = nhóm bảo quản và API của nhóm; FR-121 = form sản phẩm, cam kết kéo dài, hiển thị cho khách, lời hứa trên đơn.
- Comment trong code 100% tiếng Anh (R-09). Dữ liệu seed được viết tiếng Việt.
- DB chỉ đổi bằng migration mới, không sửa migration cũ (R-03). SQL luôn có tham số (R-04).
- Không sửa `db/schema.sql` và `docs/decisions.md` (R-02). `docs/api-contract.md` chỉ thêm dòng ở Task 12: LEAD đã duyệt đúng các dòng này ở spec §6.
- Mọi chữ hiển thị đi qua `frontend/src/locales/<lang>/<Namespace>.json`, đủ 10 ngôn ngữ `en vi zh ja ko fr es de th id`. Plan ghi sẵn bản `en` và `vi`, 8 ngôn ngữ còn lại dịch từ bản `en`. Tiếng Anh viết sentence case, không emoji, không dấu chấm than.
- UI chỉ dùng class token của design system (`text-ink-muted`, `bg-surface-raised`…), spacing token `1/2/3/4/6/8/12/16`, component trong `src/components/ui`. Màn có dữ liệu đủ 4 trạng thái (FR-084), không tràn ngang ở 375 / 768 / 1440 px (FR-080).
- Tiền qua `money()`/`vnd()`/`perUnit()` (USD, D-13). Ngày "yyyy-MM-dd" hiển thị qua `stockDay()` (`components/stockDay.ts`).
- Quy tắc nghiệp vụ (spec §4.2): mốc gợi ý lấy từ nhóm; không có nhóm thì lấy `categories.max_shelf_life_days`. Trần = 2 × mốc. Dài hơn mốc thì bắt buộc `acknowledgeLongerShelfLife = true`, và lưu `shelf_life_extended = TRUE` + `shelf_life_ack_at`. `best_before = ngày nhận + hạn − 1`.
- Lệnh (stack Docker riêng của worktree):
  - test backend tập trung: `docker compose exec -T -e MAVEN_OPTS=-Xmx256m backend ./mvnw -B test -Dtest='ClassName' -Dsurefire.failIfNoSpecifiedTests=false -DargLine="-Xmx768m -XX:MaxMetaspaceSize=256m -XX:+UseSerialGC"`
  - format backend: `docker compose exec -T -e MAVEN_OPTS=-Xmx256m backend ./mvnw -B -q spotless:apply`
  - test frontend: `docker compose exec -T frontend sh -c 'npx vitest run src/path/file.test.tsx'`
  - trước mỗi commit frontend: `docker compose exec -T frontend sh -c 'npx prettier --write <files> && npx tsc -b && npx eslint src'`
  - cuối plan: `make be-test` và `docker compose exec -T frontend sh -c 'npx vitest run'`.
  - Hook `frontend-format` của lefthook cần `frontend/node_modules` trên host. Nếu host không có, đã chạy prettier trong container thì commit với `LEFTHOOK_EXCLUDE=frontend-format git commit …`.

## Rulings

1. **Nhóm mặc định nạp trong `db/seed.sql`, không nạp trong migration.** Danh mục cũng là dữ liệu seed, nên lúc migration chạy trên DB mới chưa có danh mục nào để gắn nhóm. Migration chỉ tạo bảng. Nơi chưa seed thì form dùng khoảng của danh mục (spec §4.1, phương án dự phòng).
2. **Tên nhóm viết tiếng Anh** ("Leafy greens"…) cho khớp tên danh mục ("Vegetables"). Cột `examples` có cả từ tiếng Việt lẫn tiếng Anh, để tự khớp với tên sản phẩm (sản phẩm demo tên tiếng Việt, còn form khuyên đặt tên tiếng Anh).
3. **Danh sách sản phẩm công khai giữ nguyên.** Chỉ `GET /products/{id}` có thêm khối `shelfLife`. Spec §6 có ghi cả danh sách, nhưng §7 không có màn nào đọc nó ở danh sách (YAGNI).
4. **`OrderItemResource` thêm luôn `listPrice`** (luôn `null` ở giai đoạn này), để giai đoạn 2 và 3 không cùng sửa record này. Giai đoạn 2 sẽ nối thêm `qualityReport` rồi `itemId` sau `listPrice`, nên thứ tự cuối cùng là `(productId, productName, unit, unitPrice, quantity, subtotal, bestBefore, storageMode, listPrice, qualityReport, itemId)`.
5. **Server bắt buộc chọn nhóm khi danh mục đã có nhóm.** Gửi `shelfLifeGuideId = null` cho danh mục đã có nhóm → 400 field `shelfLifeGuideId`. Nhờ vậy cờ "kéo dài" luôn so với mốc của nhóm, không so với khoảng rộng của danh mục.
6. **Khoá kéo dài (409 `SHELF_LIFE_EXTENSION_LOCKED`) để giai đoạn 2.** Nó cần bảng `farmer_violations`. Giai đoạn 1 gom toàn bộ kiểm tra hạn dùng vào một hàm `ProductService.applyShelfLife`, để giai đoạn 2 chỉ chèn thêm một lệnh gọi.
7. **Khớp nhóm theo từ nguyên vẹn.** Ví dụ "ớt" không khớp nhầm vào "cà rốt" sau khi bỏ dấu. Khi nhiều ví dụ cùng khớp, ví dụ dài nhất thắng.

## Review Focus

1. **Farmer sửa một sản phẩm đã kéo dài hạn mà không đổi gì.** Kỳ vọng: form hiện sẵn số ngày cũ và ô cam kết đã tick, bấm Lưu thành công. → Task 9, test `keeps an extended product's promise when editing without changes`.
2. **Farmer đổi danh mục sau khi đã chọn nhóm.** Kỳ vọng: nhóm và cách bảo quản của danh mục mới được chọn lại, số ngày về mốc của danh mục mới, không gửi `guideId` của danh mục cũ. → Task 9, test `resets the group when the category changes`.
3. **Admin tắt nhóm mà sản phẩm đang dùng.** Kỳ vọng: trang sản phẩm vẫn hiện số đã lưu; lần sửa sau form chọn nhóm khác và báo "nhóm cũ không còn dùng". Server từ chối `guideId` đã tắt (400). → Task 5, test `createRefusesATurnedOffGroup`; Task 9, test `asks for another group when the saved one is gone`.
4. **Tên sản phẩm có từ bị bỏ dấu trùng với ví dụ của nhóm khác.** Kỳ vọng: khớp theo từ nguyên vẹn, ví dụ dài nhất thắng. → Task 8, test `matches whole words only, so a short example never hides inside another word`.
5. **Danh mục chưa có nhóm nào.** Kỳ vọng: form hiện khoảng của danh mục, vẫn chọn được cách bảo quản, mốc = max của danh mục, dài hơn vẫn phải tick. → Task 5, test `createWithoutGroupsUsesTheCategoryRange`; Task 9, test `falls back to the category range when it has no groups`.

---

## File Structure

**Backend — tạo mới** (`backend/src/main/java/com/techx/intervue/modules/…`):

| File | Trách nhiệm |
|---|---|
| `backend/src/main/resources/db/migration/V20260928003__create_shelf_life_guides.sql` | Bảng `shelf_life_guides` |
| `…/db/migration/V20260928004__product_storage_and_extension.sql` | 5 cột mới của `products` |
| `…/db/migration/V20260928005__order_item_shelf_life_snapshot.sql` | 6 cột mới của `order_items` |
| `catalog/enums/StorageMode.java` | `ROOM`/`CHILLED` + converter |
| `catalog/entities/ShelfLifeGuide.java` | Entity của bảng mới |
| `catalog/repositories/ShelfLifeGuideRepository.java` | JPA repository |
| `catalog/repositories/ShelfLifePeerQueryRepository.java` | Số ngày các sạp khác đặt, theo nhóm |
| `catalog/services/impl/ShelfLifePolicy.java` | Phép tính thuần: trần, số ngày kéo dài, `bestBefore`, trung vị |
| `catalog/services/interfaces/ShelfLifeGuideServiceInterface.java`, `catalog/services/impl/ShelfLifeGuideService.java` | Đọc nhóm cho form, CRUD cho admin |
| `catalog/requests/ShelfLifeGuideRequest.java` | Body của admin |
| `catalog/resources/ShelfLifeGuideGroupResource.java`, `ShelfLifeModeResource.java`, `ShelfLifeGuideResource.java` | Response |
| `catalog/exceptions/ShelfLifeGuideNotFoundException.java` | 404 |
| `catalog/controllers/ShelfLifeGuideController.java`, `AdminShelfLifeGuideController.java` | REST |
| `product/resources/ShelfLifeResource.java` | Khối `shelfLife` của sản phẩm |

**Backend — sửa:** `catalog/controllers/CatalogExceptionHandler.java`, `product/entities/Product.java`, `product/requests/ProductRequest.java`, `product/services/impl/ProductService.java`, `product/resources/FarmerProductResource.java`, `product/resources/ProductDetailResource.java`, `product/repositories/ProductQueryRepository.java`, `product/services/impl/ProductQueryService.java`, `order/entities/OrderItem.java`, `order/services/impl/OrderService.java`, `order/resources/OrderItemResource.java`, `order/repositories/OrderQueryRepository.java`.

**Frontend — tạo mới** (`frontend/src/…`): `api-requests/shelf-life.requests.ts`, `lib/shelfLife.ts` (+ `.test.ts`), `components/BestBeforeLine.tsx` (+ test), `pages/farmer/ProductForm/ShelfLifeField.tsx`, `pages/admin/Categories/ShelfLifeGuides.tsx` (+ test), `pages/public/ProductDetail/ShelfLifeDetails.tsx` (+ test).

**Frontend — sửa:** `api-requests/product.requests.ts`, `api-requests/order.requests.ts`, `types/product.types.ts`, `pages/farmer/ProductForm/index.tsx` (+ `index.test.tsx`), `pages/admin/Categories/index.tsx`, `pages/public/ProductDetail/index.tsx`, `pages/customer/OrderDetail/index.tsx`, `pages/farmer/OrderDetail/index.tsx`, locale `common`, `FarmerProductForm`, `AdminCategories`, `ProductDetail` (10 ngôn ngữ mỗi file).

**Khác:** `db/seed.sql`, `docs/api-contract.md`.

---

### Task 1: Migration, `StorageMode`, entity và repository của nhóm bảo quản (FR-120)

**Files:**
- Create: `backend/src/main/resources/db/migration/V20260928003__create_shelf_life_guides.sql`
- Create: `backend/src/main/resources/db/migration/V20260928004__product_storage_and_extension.sql`
- Create: `backend/src/main/resources/db/migration/V20260928005__order_item_shelf_life_snapshot.sql`
- Create: `backend/src/main/java/com/techx/intervue/modules/catalog/enums/StorageMode.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/catalog/entities/ShelfLifeGuide.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/catalog/repositories/ShelfLifeGuideRepository.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/catalog/repositories/ShelfLifeGuideRepositoryTest.java`

**Interfaces:**
- Produces: bảng `shelf_life_guides`; cột mới của `products` và `order_items` (spec §4.2, §4.3); `enum StorageMode { ROOM, CHILLED }` với `value()`, `parse(String)`, `DbConverter`; entity `ShelfLifeGuide` (id, categoryId, groupName, examples, storageMode, suggestedDays, active); `ShelfLifeGuideRepository.findByCategoryIdAndActiveTrueOrderByGroupNameAscStorageModeAsc(Long)` và `findByCategoryIdOrderByGroupNameAscStorageModeAsc(Long)`.

- [ ] **Step 1: Kiểm số migration còn trống**

Run: `ls backend/src/main/resources/db/migration | tail -3`
Expected: dòng cuối là `V20260928002__create_platform_status_table.sql`. Nếu đã có `V20260928003` trở lên, dùng 3 số trống kế tiếp và giữ phần mô tả sau `__`.

- [ ] **Step 2: Viết test repository (sẽ fail vì chưa có bảng và class)**

```java
package com.techx.intervue.modules.catalog.repositories;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;

import com.techx.intervue.modules.catalog.entities.ShelfLifeGuide;
import com.techx.intervue.modules.catalog.enums.StorageMode;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

/** FR-120: the shelf-life guide table and its two finders, against real MySQL. */
@SpringBootTest
class ShelfLifeGuideRepositoryTest {

    @Autowired private ShelfLifeGuideRepository guides;
    @Autowired private JdbcTemplate jdbc;

    private final String tag = UUID.randomUUID().toString().substring(0, 8);
    private Long categoryId;

    @BeforeEach
    void setUp() {
        jdbc.update(
                "INSERT INTO categories (name, slug) VALUES (?, ?)",
                "Guide test " + tag,
                "guide-" + tag);
        categoryId =
                jdbc.queryForObject(
                        "SELECT id FROM categories WHERE slug = ?", Long.class, "guide-" + tag);
    }

    @AfterEach
    void tearDown() {
        jdbc.update("DELETE FROM shelf_life_guides WHERE category_id = ?", categoryId);
        jdbc.update("DELETE FROM categories WHERE id = ?", categoryId);
    }

    /** MySQL sorts an ENUM by declaration order, so room comes before chilled. */
    @Test
    void listsTheActiveGuidesOfOneCategoryByGroupThenMode() {
        save("Roots and bulbs", StorageMode.CHILLED, 21, true);
        save("Leafy greens", StorageMode.CHILLED, 3, true);
        save("Leafy greens", StorageMode.ROOM, 1, true);
        save("Old group", StorageMode.ROOM, 2, false);

        List<ShelfLifeGuide> active =
                guides.findByCategoryIdAndActiveTrueOrderByGroupNameAscStorageModeAsc(categoryId);

        assertThat(active)
                .extracting(ShelfLifeGuide::getGroupName, ShelfLifeGuide::getStorageMode)
                .containsExactly(
                        tuple("Leafy greens", StorageMode.ROOM),
                        tuple("Leafy greens", StorageMode.CHILLED),
                        tuple("Roots and bulbs", StorageMode.CHILLED));
        assertThat(guides.findByCategoryIdOrderByGroupNameAscStorageModeAsc(categoryId))
                .hasSize(4);
    }

    @Test
    void refusesTheSameGroupAndModeTwiceInOneCategory() {
        save("Leafy greens", StorageMode.CHILLED, 3, true);

        assertThatThrownBy(() -> save("Leafy greens", StorageMode.CHILLED, 4, true))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    private ShelfLifeGuide save(String group, StorageMode mode, int days, boolean active) {
        ShelfLifeGuide guide = new ShelfLifeGuide();
        guide.setCategoryId(categoryId);
        guide.setGroupName(group);
        guide.setExamples("rau muống, lettuce");
        guide.setStorageMode(mode);
        guide.setSuggestedDays(days);
        guide.setActive(active);
        return guides.saveAndFlush(guide);
    }
}
```

- [ ] **Step 3: Chạy test để thấy fail**

Run: `docker compose exec -T -e MAVEN_OPTS=-Xmx256m backend ./mvnw -B test -Dtest='ShelfLifeGuideRepositoryTest' -Dsurefire.failIfNoSpecifiedTests=false -DargLine="-Xmx768m -XX:MaxMetaspaceSize=256m -XX:+UseSerialGC"`
Expected: FAIL lúc biên dịch, `cannot find symbol` cho `ShelfLifeGuide` và `StorageMode`.

- [ ] **Step 4: Viết 3 migration**

`V20260928003__create_shelf_life_guides.sql`:

```sql
-- FR-120 (proposed, not yet in .ai/REQUIREMENTS.md): shelf-life guides. One row is a group of
-- products inside a category kept one way (room temperature or the fridge), with the number of
-- days the app suggests to the Farmer. The default rows are seed data (db/seed.sql), because the
-- categories they point to are seed data too.
CREATE TABLE shelf_life_guides (
    id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_id    BIGINT UNSIGNED NOT NULL,
    group_name     VARCHAR(80) NOT NULL,
    examples       VARCHAR(255) NOT NULL DEFAULT '',
    storage_mode   ENUM('room', 'chilled') NOT NULL,
    suggested_days INT NOT NULL,
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_shelf_life_guides_category FOREIGN KEY (category_id) REFERENCES categories (id),
    CONSTRAINT uq_shelf_life_guide UNIQUE (category_id, group_name, storage_mode),
    CONSTRAINT ck_shelf_life_guides_days CHECK (suggested_days >= 1)
);
```

`V20260928004__product_storage_and_extension.sql`:

```sql
-- FR-121 (proposed): how a product is kept, the suggestion its shelf life was compared with when it
-- was saved, and whether the Farmer set it longer (and when they confirmed that promise). Existing
-- products become "room temperature, no suggestion recorded, not extended": nothing is judged
-- retroactively.
ALTER TABLE products
    ADD COLUMN shelf_life_guide_id BIGINT UNSIGNED NULL AFTER shelf_life_days,
    ADD COLUMN storage_mode ENUM('room', 'chilled') NOT NULL DEFAULT 'room' AFTER shelf_life_guide_id,
    ADD COLUMN suggested_shelf_life_days INT NULL AFTER storage_mode,
    ADD COLUMN shelf_life_extended BOOLEAN NOT NULL DEFAULT FALSE AFTER suggested_shelf_life_days,
    ADD COLUMN shelf_life_ack_at DATETIME NULL AFTER shelf_life_extended,
    ADD CONSTRAINT fk_products_shelf_life_guide
        FOREIGN KEY (shelf_life_guide_id) REFERENCES shelf_life_guides (id);
```

`V20260928005__order_item_shelf_life_snapshot.sql`:

```sql
-- FR-121 (proposed): the shelf-life promise copied onto each order line when the order is placed,
-- so a later edit of the product or of the guide never changes what the customer was told.
-- list_price stays NULL until near-expiry deals exist (FR-124): the price before a discount.
ALTER TABLE order_items
    ADD COLUMN shelf_life_days INT NULL,
    ADD COLUMN storage_mode ENUM('room', 'chilled') NULL,
    ADD COLUMN best_before DATE NULL,
    ADD COLUMN shelf_life_extended BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN extended_by_days INT NOT NULL DEFAULT 0,
    ADD COLUMN list_price DECIMAL(10, 2) NULL;
```

- [ ] **Step 5: Viết enum, entity và repository**

`catalog/enums/StorageMode.java`:

```java
package com.techx.intervue.modules.catalog.enums;

import com.fasterxml.jackson.annotation.JsonValue;
import com.techx.intervue.converters.LowercaseEnumConverter;
import jakarta.persistence.Converter;
import java.util.Locale;

/** FR-120: how a product is kept until it is used — room temperature or the fridge (0–5 °C). */
public enum StorageMode {
    ROOM,
    CHILLED;

    @JsonValue
    public String value() {
        return name().toLowerCase(Locale.ROOT);
    }

    /** "room" / "chilled" in any case → the mode; anything else → IllegalArgumentException. */
    public static StorageMode parse(String raw) {
        if (raw != null) {
            for (StorageMode mode : values()) {
                if (mode.value().equalsIgnoreCase(raw.trim())) {
                    return mode;
                }
            }
        }
        throw new IllegalArgumentException("Unknown storage mode. Use room or chilled.");
    }

    @Converter(autoApply = true)
    public static class DbConverter extends LowercaseEnumConverter<StorageMode> {
        public DbConverter() {
            super(StorageMode.class);
        }
    }
}
```

`catalog/entities/ShelfLifeGuide.java`:

```java
package com.techx.intervue.modules.catalog.entities;

import com.techx.intervue.modules.catalog.enums.StorageMode;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * FR-120: one group of products inside a category, kept one way, with the shelf life the app
 * suggests. Master data managed by the admin. Table `shelf_life_guides` (V20260928003).
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "shelf_life_guides")
public class ShelfLifeGuide {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "category_id", nullable = false)
    private Long categoryId;

    @Column(name = "group_name", nullable = false, length = 80)
    private String groupName;

    /** Comma-separated product words shown to the Farmer and used to pick the group by name. */
    @Column(nullable = false, length = 255)
    private String examples = "";

    @Convert(converter = StorageMode.DbConverter.class)
    @Column(name = "storage_mode", nullable = false)
    private StorageMode storageMode;

    @Column(name = "suggested_days", nullable = false)
    private int suggestedDays;

    /** Soft delete, like categories: products that point to it keep their saved numbers. */
    @Column(name = "is_active", nullable = false)
    private boolean active = true;
}
```

`catalog/repositories/ShelfLifeGuideRepository.java`:

```java
package com.techx.intervue.modules.catalog.repositories;

import com.techx.intervue.modules.catalog.entities.ShelfLifeGuide;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ShelfLifeGuideRepository extends JpaRepository<ShelfLifeGuide, Long> {

    /** What the product form offers: active rows only, grouped by name, room before chilled. */
    List<ShelfLifeGuide> findByCategoryIdAndActiveTrueOrderByGroupNameAscStorageModeAsc(
            Long categoryId);

    /** What the admin manages: every row of the category, turned-off ones included. */
    List<ShelfLifeGuide> findByCategoryIdOrderByGroupNameAscStorageModeAsc(Long categoryId);
}
```

- [ ] **Step 6: Khởi động lại backend để Flyway chạy migration, rồi chạy lại test**

Run: `docker compose restart backend`, rồi đợi `GET /api/v1/categories` ở cổng backend của stack trả `200` (Flyway chạy 3 migration mới lúc khởi động). Sau đó chạy lại lệnh của Step 3.
Expected: `Tests run: 2, Failures: 0, Errors: 0`.

- [ ] **Step 7: Format và commit**

```bash
docker compose exec -T -e MAVEN_OPTS=-Xmx256m backend ./mvnw -B -q spotless:apply
git add backend/src/main/resources/db/migration/V20260928003__create_shelf_life_guides.sql \
  backend/src/main/resources/db/migration/V20260928004__product_storage_and_extension.sql \
  backend/src/main/resources/db/migration/V20260928005__order_item_shelf_life_snapshot.sql \
  backend/src/main/java/com/techx/intervue/modules/catalog/enums/StorageMode.java \
  backend/src/main/java/com/techx/intervue/modules/catalog/entities/ShelfLifeGuide.java \
  backend/src/main/java/com/techx/intervue/modules/catalog/repositories/ShelfLifeGuideRepository.java \
  backend/src/test/java/com/techx/intervue/modules/catalog/repositories/ShelfLifeGuideRepositoryTest.java
git commit -m "feat(FR-120): shelf-life guide table and the product and order columns it feeds"
```

---

### Task 2: `ShelfLifePolicy` — phép tính dùng chung (FR-120)

**Files:**
- Create: `backend/src/main/java/com/techx/intervue/modules/catalog/services/impl/ShelfLifePolicy.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/catalog/services/impl/ShelfLifePolicyTest.java`

**Interfaces:**
- Produces: `ShelfLifePolicy.maxDays(int)`, `extendedBy(int, Integer)`, `bestBefore(LocalDate, int)`, `median(List<Integer>)` — dùng ở Task 3, 5, 6 và ở giai đoạn 3.

- [ ] **Step 1: Viết test**

```java
package com.techx.intervue.modules.catalog.services.impl;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

class ShelfLifePolicyTest {

    @Test
    void allowsAtMostTwiceTheSuggestion() {
        assertThat(ShelfLifePolicy.maxDays(1)).isEqualTo(2);
        assertThat(ShelfLifePolicy.maxDays(3)).isEqualTo(6);
    }

    @Test
    void countsOnlyTheDaysAboveTheSuggestion() {
        assertThat(ShelfLifePolicy.extendedBy(5, 3)).isEqualTo(2);
        assertThat(ShelfLifePolicy.extendedBy(3, 3)).isZero();
        assertThat(ShelfLifePolicy.extendedBy(2, 3)).isZero();
        assertThat(ShelfLifePolicy.extendedBy(9, null)).isZero();
    }

    /** One day of shelf life means "use it on the day you collect it". */
    @Test
    void theLastGoodDayIncludesTheFirstDay() {
        LocalDate pickup = LocalDate.of(2026, 10, 3);
        assertThat(ShelfLifePolicy.bestBefore(pickup, 1)).isEqualTo(pickup);
        assertThat(ShelfLifePolicy.bestBefore(pickup, 3)).isEqualTo(LocalDate.of(2026, 10, 5));
        assertThat(ShelfLifePolicy.bestBefore(LocalDate.of(2026, 9, 29), 7))
                .isEqualTo(LocalDate.of(2026, 10, 5));
    }

    @Test
    void takesTheMiddleValueAndRoundsAnEvenPairDown() {
        assertThat(ShelfLifePolicy.median(List.of(5, 3, 4))).isEqualTo(4);
        assertThat(ShelfLifePolicy.median(List.of(3, 4, 6, 9))).isEqualTo(5);
        assertThat(ShelfLifePolicy.median(List.of())).isNull();
    }
}
```

- [ ] **Step 2: Chạy test để thấy fail**

Run: lệnh test backend với `-Dtest='ShelfLifePolicyTest'`.
Expected: FAIL, `cannot find symbol: class ShelfLifePolicy`.

- [ ] **Step 3: Viết class**

```java
package com.techx.intervue.modules.catalog.services.impl;

import java.time.LocalDate;
import java.util.List;

/**
 * FR-120, FR-121: the shelf-life arithmetic shared by products, order lines and near-expiry deals
 * (spec §4.2, §4.3). Pure functions, no I/O.
 */
public final class ShelfLifePolicy {

    private ShelfLifePolicy() {}

    /** The longest shelf life a Farmer may set: twice the suggestion. */
    public static int maxDays(int suggestedDays) {
        return suggestedDays * 2;
    }

    /** Days above the suggestion; 0 when there is no suggestion or the Farmer went shorter. */
    public static int extendedBy(int days, Integer suggestedDays) {
        return suggestedDays == null ? 0 : Math.max(0, days - suggestedDays);
    }

    /**
     * The last day a product is still good when it keeps for {@code days} days starting on {@code
     * firstDay}: one day of shelf life ends on the first day itself.
     */
    public static LocalDate bestBefore(LocalDate firstDay, int days) {
        return firstDay.plusDays(days - 1L);
    }

    /** Median of whole days; an even count rounds its middle pair down; null when empty. */
    public static Integer median(List<Integer> values) {
        if (values.isEmpty()) {
            return null;
        }
        List<Integer> sorted = values.stream().sorted().toList();
        int mid = sorted.size() / 2;
        return sorted.size() % 2 == 1
                ? sorted.get(mid)
                : (sorted.get(mid - 1) + sorted.get(mid)) / 2;
    }
}
```

- [ ] **Step 4: Chạy lại test**

Expected: `Tests run: 4, Failures: 0, Errors: 0`.

- [ ] **Step 5: Format và commit**

```bash
docker compose exec -T -e MAVEN_OPTS=-Xmx256m backend ./mvnw -B -q spotless:apply
git add backend/src/main/java/com/techx/intervue/modules/catalog/services/impl/ShelfLifePolicy.java \
  backend/src/test/java/com/techx/intervue/modules/catalog/services/impl/ShelfLifePolicyTest.java
git commit -m "feat(FR-120): shelf-life policy for the cap, extensions and the last good day"
```

---

### Task 3: API đọc nhóm cho form sản phẩm, kèm số của sạp khác (FR-120)

**Files:**
- Create: `backend/src/main/java/com/techx/intervue/modules/catalog/repositories/ShelfLifePeerQueryRepository.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/catalog/resources/ShelfLifeGuideGroupResource.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/catalog/resources/ShelfLifeModeResource.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/catalog/services/interfaces/ShelfLifeGuideServiceInterface.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/catalog/services/impl/ShelfLifeGuideService.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/catalog/controllers/ShelfLifeGuideController.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/catalog/controllers/CatalogExceptionHandler.java` (thêm controller vào `assignableTypes`)
- Test: `backend/src/test/java/com/techx/intervue/modules/catalog/repositories/ShelfLifePeerQueryRepositoryTest.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/catalog/services/impl/ShelfLifeGuideServiceTest.java`

**Interfaces:**
- Consumes: Task 1 (`ShelfLifeGuideRepository`, `StorageMode`), Task 2 (`ShelfLifePolicy.median`).
- Produces: `GET /api/v1/shelf-life-guides?categoryId=` (FARMER, ADMIN) → `List<ShelfLifeGuideGroupResource>`; `ShelfLifeGuideGroupResource(String groupName, String examples, List<ShelfLifeModeResource> modes)`; `ShelfLifeModeResource(Long guideId, String storageMode, int suggestedDays, Integer peerMedianDays, int peerCount)`; `ShelfLifeGuideServiceInterface.listForCategory(long categoryId, Long viewerFarmerId)`; `ShelfLifePeerQueryRepository.daysByGuide(Collection<Long>, Long)`.

- [ ] **Step 1: Viết test truy vấn số của sạp khác (MySQL)**

```java
package com.techx.intervue.modules.catalog.repositories;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import java.util.Map;
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
 * FR-120: "what other stalls set" counts only visible products of approved stalls, never the
 * asking stall's own products (spec §4.1).
 */
@SpringBootTest
class ShelfLifePeerQueryRepositoryTest {

    @Autowired private ShelfLifePeerQueryRepository peers;
    @Autowired private JdbcTemplate jdbc;

    private final String tag = UUID.randomUUID().toString().substring(0, 8);
    private final Deque<String[]> created = new ArrayDeque<>();
    private long guideId;
    private long ownStall;

    @BeforeEach
    void setUp() {
        long category =
                track(
                        "categories",
                        insert(
                                "INSERT INTO categories (name, slug) VALUES (?, ?)",
                                "Peer " + tag,
                                "peer-" + tag));
        guideId =
                track(
                        "shelf_life_guides",
                        insert(
                                "INSERT INTO shelf_life_guides (category_id, group_name,"
                                        + " storage_mode, suggested_days) VALUES (?, 'Leafy',"
                                        + " 'chilled', 3)",
                                category));
        ownStall = stall("approved");
        long other = stall("approved");
        long suspended = stall("suspended");
        product(ownStall, category, "own", 9, false, false);
        product(other, category, "a", 3, false, false);
        product(other, category, "b", 4, false, false);
        product(other, category, "hidden", 7, true, false);
        product(other, category, "deleted", 8, false, true);
        product(suspended, category, "suspended", 5, false, false);
    }

    @AfterEach
    void tearDown() {
        while (!created.isEmpty()) {
            String[] row = created.pop();
            jdbc.update("DELETE FROM " + row[0] + " WHERE id = ?", Long.valueOf(row[1]));
        }
    }

    @Test
    void countsOtherApprovedStallsVisibleProductsOnly() {
        Map<Long, List<Integer>> days = peers.daysByGuide(List.of(guideId), ownStall);

        assertThat(days.get(guideId)).containsExactlyInAnyOrder(3, 4);
    }

    @Test
    void countsEveryStallWhenNobodyIsExcluded() {
        Map<Long, List<Integer>> days = peers.daysByGuide(List.of(guideId), null);

        assertThat(days.get(guideId)).containsExactlyInAnyOrder(9, 3, 4);
    }

    @Test
    void answersNothingForNoGuides() {
        assertThat(peers.daysByGuide(List.of(), null)).isEmpty();
    }

    private long stall(String status) {
        String label = tag + "-" + UUID.randomUUID().toString().substring(0, 4);
        long user =
                track(
                        "users",
                        insert(
                                "INSERT INTO users (full_name, email, password_hash, role)"
                                        + " VALUES (?, ?, 'x', 'farmer')",
                                "Peer " + label,
                                "peer-" + label + "@test.vn"));
        return track(
                "farmer_profiles",
                insert(
                        "INSERT INTO farmer_profiles (user_id, stall_name, contact_person,"
                                + " approval_status) VALUES (?, ?, 'Owner', ?)",
                        user,
                        "Stall " + label,
                        status));
    }

    private void product(
            long farmer, long category, String name, int days, boolean hidden, boolean deleted) {
        track(
                "products",
                insert(
                        "INSERT INTO products (farmer_id, category_id, name, price, unit,"
                                + " stock_quantity, shelf_life_days, shelf_life_guide_id,"
                                + " storage_mode, is_hidden, is_deleted) VALUES (?, ?, ?, 1,"
                                + " 'kg', 5, ?, ?, 'chilled', ?, ?)",
                        farmer,
                        category,
                        name + " " + tag,
                        days,
                        guideId,
                        hidden,
                        deleted));
    }

    private long track(String table, long id) {
        created.push(new String[] {table, String.valueOf(id)});
        return id;
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

- [ ] **Step 2: Viết test service (Mockito)**

```java
package com.techx.intervue.modules.catalog.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.catalog.entities.ShelfLifeGuide;
import com.techx.intervue.modules.catalog.enums.StorageMode;
import com.techx.intervue.modules.catalog.repositories.CategoryRepository;
import com.techx.intervue.modules.catalog.repositories.ShelfLifeGuideRepository;
import com.techx.intervue.modules.catalog.repositories.ShelfLifePeerQueryRepository;
import com.techx.intervue.modules.catalog.resources.ShelfLifeGuideGroupResource;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ShelfLifeGuideServiceTest {

    private ShelfLifeGuideRepository guides;
    private ShelfLifePeerQueryRepository peers;
    private CategoryRepository categories;
    private ShelfLifeGuideService service;

    @BeforeEach
    void setUp() {
        guides = mock(ShelfLifeGuideRepository.class);
        peers = mock(ShelfLifePeerQueryRepository.class);
        categories = mock(CategoryRepository.class);
        service = new ShelfLifeGuideService(guides, peers, categories);
    }

    static ShelfLifeGuide guide(long id, String group, StorageMode mode, int days) {
        ShelfLifeGuide g = new ShelfLifeGuide();
        g.setId(id);
        g.setCategoryId(1L);
        g.setGroupName(group);
        g.setExamples("rau muống, lettuce");
        g.setStorageMode(mode);
        g.setSuggestedDays(days);
        g.setActive(true);
        return g;
    }

    @Test
    void groupsTheModesUnderEachGroupInOrder() {
        when(guides.findByCategoryIdAndActiveTrueOrderByGroupNameAscStorageModeAsc(1L))
                .thenReturn(
                        List.of(
                                guide(1L, "Leafy greens", StorageMode.ROOM, 1),
                                guide(2L, "Leafy greens", StorageMode.CHILLED, 3),
                                guide(3L, "Roots and bulbs", StorageMode.ROOM, 14)));
        when(peers.daysByGuide(anyCollection(), eq(10L))).thenReturn(Map.of());

        List<ShelfLifeGuideGroupResource> groups = service.listForCategory(1L, 10L);

        assertThat(groups)
                .extracting(ShelfLifeGuideGroupResource::groupName)
                .containsExactly("Leafy greens", "Roots and bulbs");
        assertThat(groups.getFirst().modes())
                .extracting(m -> m.storageMode() + ":" + m.suggestedDays())
                .containsExactly("room:1", "chilled:3");
        assertThat(groups.getFirst().examples()).isEqualTo("rau muống, lettuce");
    }

    /** Fewer than three products and the median stays hidden, so one stall is never exposed. */
    @Test
    void showsWhatOtherStallsSetOnlyFromThreeProducts() {
        when(guides.findByCategoryIdAndActiveTrueOrderByGroupNameAscStorageModeAsc(1L))
                .thenReturn(
                        List.of(
                                guide(1L, "Leafy greens", StorageMode.ROOM, 1),
                                guide(2L, "Leafy greens", StorageMode.CHILLED, 3)));
        when(peers.daysByGuide(anyCollection(), eq(null)))
                .thenReturn(Map.of(1L, List.of(1, 2), 2L, List.of(3, 5, 4)));

        var modes = service.listForCategory(1L, null).getFirst().modes();

        assertThat(modes.get(0).peerMedianDays()).isNull();
        assertThat(modes.get(0).peerCount()).isEqualTo(2);
        assertThat(modes.get(1).peerMedianDays()).isEqualTo(4);
        assertThat(modes.get(1).peerCount()).isEqualTo(3);
    }

    @Test
    void answersAnEmptyListForACategoryWithoutGroups() {
        when(guides.findByCategoryIdAndActiveTrueOrderByGroupNameAscStorageModeAsc(1L))
                .thenReturn(List.of());
        when(peers.daysByGuide(anyCollection(), eq(null))).thenReturn(Map.of());

        assertThat(service.listForCategory(1L, null)).isEmpty();
    }
}
```

- [ ] **Step 3: Chạy 2 test để thấy fail**

Run: lệnh test backend với `-Dtest='ShelfLifePeerQueryRepositoryTest,ShelfLifeGuideServiceTest'`.
Expected: FAIL lúc biên dịch (`ShelfLifePeerQueryRepository`, `ShelfLifeGuideService` chưa có).

- [ ] **Step 4: Viết repository, resource, service và controller**

`catalog/repositories/ShelfLifePeerQueryRepository.java`:

```java
package com.techx.intervue.modules.catalog.repositories;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * FR-120: the shelf lives other stalls set, per guide — the "other stalls usually set N days" hint.
 * Only products a customer can see count: not deleted, not hidden, stall approved.
 */
@Repository
@RequiredArgsConstructor
public class ShelfLifePeerQueryRepository {

    static final String PEER_DAYS_SQL =
            """
            SELECT p.shelf_life_guide_id AS guide_id, p.shelf_life_days AS days
            FROM products p
            JOIN farmer_profiles f ON f.id = p.farmer_id
            WHERE p.shelf_life_guide_id IN (:guideIds)
              AND p.is_deleted = FALSE
              AND p.is_hidden = FALSE
              AND f.approval_status = 'approved'
              AND (:excludeFarmerId IS NULL OR p.farmer_id <> :excludeFarmerId)
            """;

    private final NamedParameterJdbcTemplate jdbc;

    /** Guide id → the shelf lives set on its products; {@code excludeFarmerId} null counts all. */
    public Map<Long, List<Integer>> daysByGuide(Collection<Long> guideIds, Long excludeFarmerId) {
        Map<Long, List<Integer>> out = new HashMap<>();
        if (guideIds.isEmpty()) {
            return out;
        }
        MapSqlParameterSource params =
                new MapSqlParameterSource()
                        .addValue("guideIds", guideIds)
                        .addValue("excludeFarmerId", excludeFarmerId);
        jdbc.query(
                PEER_DAYS_SQL,
                params,
                rs -> {
                    out.computeIfAbsent(rs.getLong("guide_id"), k -> new ArrayList<>())
                            .add(rs.getInt("days"));
                });
        return out;
    }
}
```

`catalog/resources/ShelfLifeModeResource.java`:

```java
package com.techx.intervue.modules.catalog.resources;

/**
 * FR-120: one way of keeping a group, as the product form offers it. {@code peerMedianDays} is
 * what other stalls set, null when fewer than three of their products use this guide.
 */
public record ShelfLifeModeResource(
        Long guideId,
        String storageMode,
        int suggestedDays,
        Integer peerMedianDays,
        int peerCount) {}
```

`catalog/resources/ShelfLifeGuideGroupResource.java`:

```java
package com.techx.intervue.modules.catalog.resources;

import java.util.List;

/** FR-120: one storage group of a category with its ways of keeping, room before chilled. */
public record ShelfLifeGuideGroupResource(
        String groupName, String examples, List<ShelfLifeModeResource> modes) {}
```

`catalog/services/interfaces/ShelfLifeGuideServiceInterface.java` (Task 4 thêm các hàm của admin):

```java
package com.techx.intervue.modules.catalog.services.interfaces;

import com.techx.intervue.modules.catalog.resources.ShelfLifeGuideGroupResource;
import java.util.List;

/** FR-120: shelf-life guides — suggestions for the product form, master data for the admin. */
public interface ShelfLifeGuideServiceInterface {

    /**
     * The active groups of one category, with what other stalls set. {@code viewerFarmerId} is the
     * asking stall, left out of the numbers; null for an admin.
     */
    List<ShelfLifeGuideGroupResource> listForCategory(long categoryId, Long viewerFarmerId);
}
```

`catalog/services/impl/ShelfLifeGuideService.java`:

```java
package com.techx.intervue.modules.catalog.services.impl;

import com.techx.intervue.modules.catalog.entities.ShelfLifeGuide;
import com.techx.intervue.modules.catalog.repositories.CategoryRepository;
import com.techx.intervue.modules.catalog.repositories.ShelfLifeGuideRepository;
import com.techx.intervue.modules.catalog.repositories.ShelfLifePeerQueryRepository;
import com.techx.intervue.modules.catalog.resources.ShelfLifeGuideGroupResource;
import com.techx.intervue.modules.catalog.resources.ShelfLifeModeResource;
import com.techx.intervue.modules.catalog.services.interfaces.ShelfLifeGuideServiceInterface;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@AllArgsConstructor
public class ShelfLifeGuideService implements ShelfLifeGuideServiceInterface {

    /** Below this many products the median is hidden, so one stall's number never shows. */
    static final int MIN_PEERS = 3;

    private final ShelfLifeGuideRepository guides;
    private final ShelfLifePeerQueryRepository peers;
    private final CategoryRepository categories;

    @Override
    public List<ShelfLifeGuideGroupResource> listForCategory(
            long categoryId, Long viewerFarmerId) {
        List<ShelfLifeGuide> rows =
                guides.findByCategoryIdAndActiveTrueOrderByGroupNameAscStorageModeAsc(categoryId);
        Map<Long, List<Integer>> peerDays =
                peers.daysByGuide(rows.stream().map(ShelfLifeGuide::getId).toList(), viewerFarmerId);
        Map<String, List<ShelfLifeGuide>> byGroup =
                rows.stream()
                        .collect(
                                Collectors.groupingBy(
                                        ShelfLifeGuide::getGroupName,
                                        LinkedHashMap::new,
                                        Collectors.toList()));
        return byGroup.values().stream()
                .map(
                        group ->
                                new ShelfLifeGuideGroupResource(
                                        group.getFirst().getGroupName(),
                                        group.getFirst().getExamples(),
                                        group.stream()
                                                .map(
                                                        g ->
                                                                mode(
                                                                        g,
                                                                        peerDays.getOrDefault(
                                                                                g.getId(),
                                                                                List.of())))
                                                .toList()))
                .toList();
    }

    private static ShelfLifeModeResource mode(ShelfLifeGuide g, List<Integer> days) {
        return new ShelfLifeModeResource(
                g.getId(),
                g.getStorageMode().value(),
                g.getSuggestedDays(),
                days.size() >= MIN_PEERS ? ShelfLifePolicy.median(days) : null,
                days.size());
    }
}
```

`catalog/controllers/ShelfLifeGuideController.java`:

```java
package com.techx.intervue.modules.catalog.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.catalog.resources.ShelfLifeGuideGroupResource;
import com.techx.intervue.modules.catalog.services.interfaces.ShelfLifeGuideServiceInterface;
import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import com.techx.intervue.resources.ApiResource;
import java.util.List;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** FR-120: the shelf-life suggestions of the product form. Farmer; an admin sees the same list. */
@RestController
@RequestMapping("/api/v1/shelf-life-guides")
@PreAuthorize("hasAnyRole('FARMER','ADMIN')")
@AllArgsConstructor
public class ShelfLifeGuideController extends BaseController {

    private final ShelfLifeGuideServiceInterface guides;
    private final FarmerProfileRepository farmers;

    @GetMapping
    public ResponseEntity<ApiResource<List<ShelfLifeGuideGroupResource>>> list(
            @RequestParam long categoryId, @AuthenticationPrincipal CustomUserDetails user) {
        // The asking stall's own products never count as "other stalls" (spec §4.1)
        Long ownStall = farmers.findByUserId(user.getId()).map(FarmerProfile::getId).orElse(null);
        return ok(guides.listForCategory(categoryId, ownStall), "");
    }
}
```

`CatalogExceptionHandler.java`: thêm `ShelfLifeGuideController.class` vào mảng `assignableTypes` của `@RestControllerAdvice` (ngay sau `AdminMarketClosureController.class`).

- [ ] **Step 5: Chạy lại 2 test**

Run: lệnh test backend với `-Dtest='ShelfLifePeerQueryRepositoryTest,ShelfLifeGuideServiceTest'`.
Expected: `Tests run: 6, Failures: 0, Errors: 0`.

- [ ] **Step 6: Format và commit**

```bash
docker compose exec -T -e MAVEN_OPTS=-Xmx256m backend ./mvnw -B -q spotless:apply
git add backend/src/main/java/com/techx/intervue/modules/catalog \
  backend/src/test/java/com/techx/intervue/modules/catalog
git commit -m "feat(FR-120): shelf-life suggestions per category with what other stalls set"
```

---

### Task 4: API CRUD nhóm cho admin (FR-120)

**Files:**
- Create: `backend/src/main/java/com/techx/intervue/modules/catalog/requests/ShelfLifeGuideRequest.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/catalog/resources/ShelfLifeGuideResource.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/catalog/exceptions/ShelfLifeGuideNotFoundException.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/catalog/controllers/AdminShelfLifeGuideController.java`
- Modify: `…/catalog/services/interfaces/ShelfLifeGuideServiceInterface.java`, `…/catalog/services/impl/ShelfLifeGuideService.java`, `…/catalog/controllers/CatalogExceptionHandler.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/catalog/services/impl/ShelfLifeGuideServiceTest.java` (thêm test)
- Test: `backend/src/test/java/com/techx/intervue/modules/catalog/controllers/CatalogExceptionHandlerShelfLifeTest.java`

**Interfaces:**
- Consumes: Task 1, Task 3.
- Produces: `GET /api/v1/admin/shelf-life-guides?categoryId=`, `POST /api/v1/admin/shelf-life-guides`, `PUT /api/v1/admin/shelf-life-guides/{id}`, `DELETE /api/v1/admin/shelf-life-guides/{id}` (tắt); `ShelfLifeGuideResource(Long id, Long categoryId, String groupName, String examples, String storageMode, int suggestedDays, boolean isActive)`; `ShelfLifeGuideRequest(Long categoryId, String groupName, String examples, String storageMode, Integer suggestedDays, Boolean active)`; lỗi 404 `SHELF_LIFE_GUIDE_NOT_FOUND`, 409 `DUPLICATE_SHELF_LIFE_GUIDE` (field `groupName`).

- [ ] **Step 1: Thêm test service**

Thêm vào `ShelfLifeGuideServiceTest` (bổ sung import `static org.assertj.core.api.Assertions.assertThatThrownBy`, `static org.mockito.ArgumentMatchers.any`, `java.util.Optional`, `com.techx.intervue.modules.catalog.exceptions.CategoryNotFoundException`, `com.techx.intervue.modules.catalog.exceptions.ShelfLifeGuideNotFoundException`, `com.techx.intervue.modules.catalog.requests.ShelfLifeGuideRequest`, `com.techx.intervue.modules.catalog.resources.ShelfLifeGuideResource`):

```java
    private static ShelfLifeGuideRequest request(Boolean active) {
        return new ShelfLifeGuideRequest(
                1L, "  Leafy greens ", " rau muống, lettuce ", "chilled", 3, active);
    }

    @Test
    void createsAnActiveGroupWithTrimmedText() {
        when(categories.existsById(1L)).thenReturn(true);
        when(guides.saveAndFlush(any(ShelfLifeGuide.class)))
                .thenAnswer(
                        i -> {
                            ShelfLifeGuide g = i.getArgument(0);
                            g.setId(5L);
                            return g;
                        });

        ShelfLifeGuideResource created = service.create(request(null));

        assertThat(created.id()).isEqualTo(5L);
        assertThat(created.groupName()).isEqualTo("Leafy greens");
        assertThat(created.examples()).isEqualTo("rau muống, lettuce");
        assertThat(created.storageMode()).isEqualTo("chilled");
        assertThat(created.isActive()).isTrue();
    }

    @Test
    void refusesAnUnknownCategory() {
        when(categories.existsById(1L)).thenReturn(false);

        assertThatThrownBy(() -> service.create(request(null)))
                .isInstanceOf(CategoryNotFoundException.class);
    }

    @Test
    void updatesAndCanTurnAGroupBackOn() {
        ShelfLifeGuide existing = guide(5L, "Old", StorageMode.ROOM, 1);
        existing.setActive(false);
        when(categories.existsById(1L)).thenReturn(true);
        when(guides.findById(5L)).thenReturn(Optional.of(existing));
        when(guides.saveAndFlush(any(ShelfLifeGuide.class))).thenAnswer(i -> i.getArgument(0));

        ShelfLifeGuideResource saved = service.update(5L, request(true));

        assertThat(saved.groupName()).isEqualTo("Leafy greens");
        assertThat(saved.suggestedDays()).isEqualTo(3);
        assertThat(saved.isActive()).isTrue();
    }

    @Test
    void turnsAGroupOffAndReportsAMissingOne() {
        ShelfLifeGuide existing = guide(5L, "Leafy greens", StorageMode.ROOM, 1);
        when(guides.findById(5L)).thenReturn(Optional.of(existing));
        when(guides.findById(6L)).thenReturn(Optional.empty());

        service.deactivate(5L);

        assertThat(existing.isActive()).isFalse();
        assertThatThrownBy(() -> service.deactivate(6L))
                .isInstanceOf(ShelfLifeGuideNotFoundException.class);
    }
```

- [ ] **Step 2: Viết test ánh xạ lỗi trùng**

```java
package com.techx.intervue.modules.catalog.controllers;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.SQLIntegrityConstraintViolationException;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;

/** FR-120: a group that already has that way of keeping → 409 on the groupName field. */
class CatalogExceptionHandlerShelfLifeTest {

    @Test
    void mapsTheDuplicateGuideKeyToAConflictOnTheGroupName() {
        var e =
                new DataIntegrityViolationException(
                        "insert",
                        new SQLIntegrityConstraintViolationException(
                                "Duplicate entry '5-Leafy greens-chilled' for key"
                                        + " 'shelf_life_guides.uq_shelf_life_guide'"));

        var response = new CatalogExceptionHandler().dataIntegrity(e);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody().getError().getCode()).isEqualTo("DUPLICATE_SHELF_LIFE_GUIDE");
        assertThat(response.getBody().getError().getDetails().getFirst().getField())
                .isEqualTo("groupName");
    }
}
```

`ApiResource` và `ErrorResource` dùng Lombok `@Getter`, nên có `getError()`, `getCode()`, `getDetails()`.

- [ ] **Step 3: Chạy test để thấy fail**

Run: lệnh test backend với `-Dtest='ShelfLifeGuideServiceTest,CatalogExceptionHandlerShelfLifeTest'`.
Expected: FAIL lúc biên dịch (`ShelfLifeGuideRequest`, `create`, `update`, `deactivate` chưa có).

- [ ] **Step 4: Viết request, resource, exception**

```java
package com.techx.intervue.modules.catalog.requests;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Body of POST/PUT /api/v1/admin/shelf-life-guides (FR-120). {@code active} null keeps the current
 * state on update and means "on" when creating.
 */
public record ShelfLifeGuideRequest(
        @NotNull(message = "Choose a category.") Long categoryId,
        @NotBlank(message = "Give the group a name.")
                @Size(max = 80, message = "Keep the group name to 80 characters or fewer.")
                String groupName,
        @Size(max = 255, message = "Keep the examples to 255 characters or fewer.")
                String examples,
        @NotBlank(message = "Choose how it is kept.")
                @Pattern(regexp = "room|chilled", message = "Choose room or chilled.")
                String storageMode,
        @NotNull(message = "Enter the suggested number of days.")
                @Min(value = 1, message = "Enter a whole number from 1 to 365.")
                @Max(value = 365, message = "Enter a whole number from 1 to 365.")
                Integer suggestedDays,
        Boolean active) {}
```

```java
package com.techx.intervue.modules.catalog.resources;

/** FR-120: one guide row as the admin manages it (contract §5). */
public record ShelfLifeGuideResource(
        Long id,
        Long categoryId,
        String groupName,
        String examples,
        String storageMode,
        int suggestedDays,
        boolean isActive) {}
```

```java
package com.techx.intervue.modules.catalog.exceptions;

public class ShelfLifeGuideNotFoundException extends RuntimeException {
    public ShelfLifeGuideNotFoundException(long id) {
        super("Shelf-life group " + id + " not found.");
    }
}
```

- [ ] **Step 5: Thêm hàm admin vào interface và service**

Thêm vào `ShelfLifeGuideServiceInterface` (import `ShelfLifeGuideRequest`, `ShelfLifeGuideResource`):

```java
    /** Every row of a category, turned-off ones included (admin). */
    List<ShelfLifeGuideResource> adminList(long categoryId);

    /** 404 CATEGORY_NOT_FOUND for an unknown category; 409 when the group already has that mode. */
    ShelfLifeGuideResource create(ShelfLifeGuideRequest request);

    ShelfLifeGuideResource update(long id, ShelfLifeGuideRequest request);

    /** Soft delete: products that use it keep their saved numbers. */
    void deactivate(long id);
```

Thêm vào `ShelfLifeGuideService` (import `CategoryNotFoundException`, `ShelfLifeGuideNotFoundException`, `StorageMode`, `ShelfLifeGuideRequest`, `ShelfLifeGuideResource`, `org.springframework.transaction.annotation.Transactional`):

```java
    @Override
    public List<ShelfLifeGuideResource> adminList(long categoryId) {
        return guides.findByCategoryIdOrderByGroupNameAscStorageModeAsc(categoryId).stream()
                .map(ShelfLifeGuideService::toResource)
                .toList();
    }

    /** saveAndFlush: a duplicate group and mode fails inside the call, where the handler maps it. */
    @Override
    @Transactional
    public ShelfLifeGuideResource create(ShelfLifeGuideRequest request) {
        requireCategory(request.categoryId());
        ShelfLifeGuide guide = new ShelfLifeGuide();
        apply(guide, request);
        guide.setActive(request.active() == null || request.active());
        return toResource(guides.saveAndFlush(guide));
    }

    @Override
    @Transactional
    public ShelfLifeGuideResource update(long id, ShelfLifeGuideRequest request) {
        ShelfLifeGuide guide =
                guides.findById(id).orElseThrow(() -> new ShelfLifeGuideNotFoundException(id));
        requireCategory(request.categoryId());
        apply(guide, request);
        if (request.active() != null) {
            guide.setActive(request.active());
        }
        return toResource(guides.saveAndFlush(guide));
    }

    @Override
    @Transactional
    public void deactivate(long id) {
        ShelfLifeGuide guide =
                guides.findById(id).orElseThrow(() -> new ShelfLifeGuideNotFoundException(id));
        guide.setActive(false);
        guides.save(guide);
    }

    private void requireCategory(Long categoryId) {
        if (!categories.existsById(categoryId)) {
            throw new CategoryNotFoundException(categoryId);
        }
    }

    private static void apply(ShelfLifeGuide guide, ShelfLifeGuideRequest request) {
        guide.setCategoryId(request.categoryId());
        guide.setGroupName(request.groupName().trim());
        guide.setExamples(request.examples() == null ? "" : request.examples().trim());
        guide.setStorageMode(StorageMode.parse(request.storageMode()));
        guide.setSuggestedDays(request.suggestedDays());
    }

    private static ShelfLifeGuideResource toResource(ShelfLifeGuide g) {
        return new ShelfLifeGuideResource(
                g.getId(),
                g.getCategoryId(),
                g.getGroupName(),
                g.getExamples(),
                g.getStorageMode().value(),
                g.getSuggestedDays(),
                g.isActive());
    }
```

- [ ] **Step 6: Viết controller admin và ánh xạ lỗi**

```java
package com.techx.intervue.modules.catalog.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.catalog.requests.ShelfLifeGuideRequest;
import com.techx.intervue.modules.catalog.resources.ShelfLifeGuideResource;
import com.techx.intervue.modules.catalog.services.interfaces.ShelfLifeGuideServiceInterface;
import com.techx.intervue.resources.ApiResource;
import jakarta.validation.Valid;
import java.util.List;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** FR-120: shelf-life guides as master data. Admin only (the role comes from the token, R-06). */
@RestController
@RequestMapping("/api/v1/admin/shelf-life-guides")
@PreAuthorize("hasRole('ADMIN')")
@AllArgsConstructor
public class AdminShelfLifeGuideController extends BaseController {

    private final ShelfLifeGuideServiceInterface guides;

    @GetMapping
    public ResponseEntity<ApiResource<List<ShelfLifeGuideResource>>> list(
            @RequestParam long categoryId) {
        return ok(guides.adminList(categoryId), "");
    }

    @PostMapping
    public ResponseEntity<ApiResource<ShelfLifeGuideResource>> create(
            @Valid @RequestBody ShelfLifeGuideRequest request) {
        return created(guides.create(request), "Group added.");
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResource<ShelfLifeGuideResource>> update(
            @PathVariable long id, @Valid @RequestBody ShelfLifeGuideRequest request) {
        return ok(guides.update(id, request), "Group saved.");
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResource<Void>> deactivate(@PathVariable long id) {
        guides.deactivate(id);
        return ok(null, "Group turned off.");
    }
}
```

Trong `CatalogExceptionHandler`:
- thêm `AdminShelfLifeGuideController.class` vào `assignableTypes`;
- thêm handler 404 ngay sau `marketClosureNotFound`:

```java
    @ExceptionHandler(ShelfLifeGuideNotFoundException.class)
    ResponseEntity<ApiResource<Void>> shelfLifeGuideNotFound(ShelfLifeGuideNotFoundException e) {
        return error(HttpStatus.NOT_FOUND, "SHELF_LIFE_GUIDE_NOT_FOUND", e.getMessage(), List.of());
    }
```

- trong `dataIntegrity`, thêm nhánh này **đầu tiên**, ngay sau dòng `String cause = …`:

```java
        if (cause.contains("uq_shelf_life_guide")) {
            String message = "This group already has that way of keeping.";
            return error(
                    HttpStatus.CONFLICT,
                    "DUPLICATE_SHELF_LIFE_GUIDE",
                    message,
                    List.of(
                            FieldErrorResource.builder()
                                    .field("groupName")
                                    .message(message)
                                    .build()));
        }
```

- [ ] **Step 7: Chạy lại test**

Run: lệnh test backend với `-Dtest='ShelfLifeGuideServiceTest,CatalogExceptionHandlerShelfLifeTest,CategoryServiceTest'`.
Expected: toàn bộ PASS (`ShelfLifeGuideServiceTest` 7 test, `CatalogExceptionHandlerShelfLifeTest` 1 test, `CategoryServiceTest` giữ nguyên).

- [ ] **Step 8: Format và commit**

```bash
docker compose exec -T -e MAVEN_OPTS=-Xmx256m backend ./mvnw -B -q spotless:apply
git add backend/src/main/java/com/techx/intervue/modules/catalog \
  backend/src/test/java/com/techx/intervue/modules/catalog
git commit -m "feat(FR-120): admins manage shelf-life groups per category"
```

---

### Task 5: Sản phẩm lưu nhóm, cách bảo quản và cam kết kéo dài (FR-121)

**Files:**
- Create: `backend/src/main/java/com/techx/intervue/modules/product/resources/ShelfLifeResource.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/product/entities/Product.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/product/requests/ProductRequest.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/product/resources/FarmerProductResource.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/product/services/impl/ProductService.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/product/services/impl/ProductServiceTest.java`

**Interfaces:**
- Consumes: Task 1 (`ShelfLifeGuide`, `ShelfLifeGuideRepository`, `StorageMode`), Task 2 (`ShelfLifePolicy`).
- Produces: `ProductRequest(Long categoryId, String name, String description, BigDecimal price, String unit, Integer stockQuantity, String imageUrl, Integer shelfLifeDays, Long shelfLifeGuideId, String storageMode, Boolean acknowledgeLongerShelfLife)`; các field mới của `Product` (`shelfLifeGuideId`, `storageMode`, `suggestedShelfLifeDays`, `shelfLifeExtended`, `shelfLifeAckAt`); `ShelfLifeResource(Long guideId, String groupName, String storageMode, int days, Integer suggestedDays, boolean extended)`; `FarmerProductResource` thêm thành phần cuối `ShelfLifeResource shelfLife`; hàm private `ProductService.applyShelfLife(Product, ProductRequest, Category)` (giai đoạn 2 chèn kiểm tra khoá vào nhánh "dài hơn"); constructor `ProductService(products, farmers, categories, query, restock, availability, shelfLifeGuides, clock)`.

- [ ] **Step 1: Sửa phần dựng test của `ProductServiceTest` và thêm test mới**

Trong `setUp()`: thêm `shelfLifeGuides = mock(ShelfLifeGuideRepository.class);` và tạo service bằng constructor mới:

```java
        shelfLifeGuides = mock(ShelfLifeGuideRepository.class);
        service =
                new ProductService(
                        products,
                        farmers,
                        categories,
                        query,
                        restock,
                        mock(ProductAvailabilityResolver.class),
                        shelfLifeGuides,
                        CLOCK);
```

Khai báo thêm field và hằng:

```java
    /** 10:00 on 27/09/2026 in Ho Chi Minh City. */
    private static final Clock CLOCK =
            Clock.fixed(Instant.parse("2026-09-27T03:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));

    private ShelfLifeGuideRepository shelfLifeGuides;
```

`leafyGreens()` thêm khoảng của danh mục (trước đây để 0):

```java
        c.setMinShelfLifeDays(1);
        c.setMaxShelfLifeDays(7);
```

`request()` có 11 tham số:

```java
    private static ProductRequest request() {
        return new ProductRequest(
                1L,
                "Rau muống",
                "Cắt sáng",
                new BigDecimal("12000"),
                "bó",
                40,
                null,
                4,
                null,
                null,
                null);
    }

    private static ProductRequest shelf(Long guideId, String mode, int days, Boolean ack) {
        return new ProductRequest(
                1L,
                "Rau muống",
                "Cắt sáng",
                new BigDecimal("0.50"),
                "bunch",
                40,
                null,
                days,
                guideId,
                mode,
                ack);
    }

    private static ShelfLifeGuide chilledLeafy(long categoryId, boolean active) {
        ShelfLifeGuide g = new ShelfLifeGuide();
        g.setId(7L);
        g.setCategoryId(categoryId);
        g.setGroupName("Leafy greens");
        g.setStorageMode(StorageMode.CHILLED);
        g.setSuggestedDays(3);
        g.setActive(active);
        return g;
    }
```

Thêm import: `com.techx.intervue.modules.catalog.entities.ShelfLifeGuide`, `com.techx.intervue.modules.catalog.enums.StorageMode`, `com.techx.intervue.modules.catalog.repositories.ShelfLifeGuideRepository`, `com.techx.intervue.modules.product.resources.FarmerProductResource`, `com.techx.intervue.modules.user.exceptions.InvalidFieldException`, `java.time.Clock`, `java.time.Instant`, `java.time.LocalDateTime`, `java.time.ZoneId`, `java.util.List`, `org.mockito.ArgumentCaptor`, `static org.mockito.Mockito.verify` (bỏ qua import nào đã có).

Test mới:

```java
    // ---------- shelf life (FR-121) ----------

    @Test
    void createTakesTheSuggestionFromTheChosenGroup() {
        approvedStall();
        when(shelfLifeGuides.findById(7L)).thenReturn(Optional.of(chilledLeafy(1L, true)));

        FarmerProductResource saved = service.create(USER_ID, shelf(7L, "chilled", 3, null));

        ArgumentCaptor<Product> captor = ArgumentCaptor.forClass(Product.class);
        verify(products).save(captor.capture());
        Product p = captor.getValue();
        assertThat(p.getShelfLifeGuideId()).isEqualTo(7L);
        assertThat(p.getStorageMode()).isEqualTo(StorageMode.CHILLED);
        assertThat(p.getSuggestedShelfLifeDays()).isEqualTo(3);
        assertThat(p.isShelfLifeExtended()).isFalse();
        assertThat(p.getShelfLifeAckAt()).isNull();
        assertThat(saved.shelfLife().groupName()).isEqualTo("Leafy greens");
        assertThat(saved.shelfLife().storageMode()).isEqualTo("chilled");
    }

    @Test
    void createAllowsShorterThanSuggestedWithoutAPromise() {
        approvedStall();
        when(shelfLifeGuides.findById(7L)).thenReturn(Optional.of(chilledLeafy(1L, true)));

        FarmerProductResource saved = service.create(USER_ID, shelf(7L, "chilled", 2, null));

        assertThat(saved.shelfLife().days()).isEqualTo(2);
        assertThat(saved.shelfLife().extended()).isFalse();
    }

    @Test
    void createRefusesLongerThanSuggestedWithoutThePromise() {
        approvedStall();
        when(shelfLifeGuides.findById(7L)).thenReturn(Optional.of(chilledLeafy(1L, true)));

        assertThatThrownBy(() -> service.create(USER_ID, shelf(7L, "chilled", 5, false)))
                .isInstanceOf(InvalidFieldException.class)
                .extracting("field")
                .isEqualTo("acknowledgeLongerShelfLife");
    }

    @Test
    void createKeepsTheTimeOfThePromiseForLonger() {
        approvedStall();
        when(shelfLifeGuides.findById(7L)).thenReturn(Optional.of(chilledLeafy(1L, true)));

        FarmerProductResource saved = service.create(USER_ID, shelf(7L, "chilled", 5, true));

        ArgumentCaptor<Product> captor = ArgumentCaptor.forClass(Product.class);
        verify(products).save(captor.capture());
        assertThat(captor.getValue().isShelfLifeExtended()).isTrue();
        assertThat(captor.getValue().getShelfLifeAckAt())
                .isEqualTo(LocalDateTime.of(2026, 9, 27, 10, 0));
        assertThat(saved.shelfLife().extended()).isTrue();
        assertThat(saved.shelfLife().suggestedDays()).isEqualTo(3);
    }

    @Test
    void createRefusesMoreThanTwiceTheSuggestion() {
        approvedStall();
        when(shelfLifeGuides.findById(7L)).thenReturn(Optional.of(chilledLeafy(1L, true)));

        assertThatThrownBy(() -> service.create(USER_ID, shelf(7L, "chilled", 7, true)))
                .isInstanceOf(InvalidFieldException.class)
                .hasMessage("At most 6 days for this group.")
                .extracting("field")
                .isEqualTo("shelfLifeDays");
    }

    @Test
    void createRefusesAGroupOfAnotherCategory() {
        approvedStall();
        when(shelfLifeGuides.findById(7L)).thenReturn(Optional.of(chilledLeafy(2L, true)));

        assertThatThrownBy(() -> service.create(USER_ID, shelf(7L, "chilled", 3, null)))
                .isInstanceOf(InvalidFieldException.class)
                .extracting("field")
                .isEqualTo("shelfLifeGuideId");
    }

    @Test
    void createRefusesATurnedOffGroup() {
        approvedStall();
        when(shelfLifeGuides.findById(7L)).thenReturn(Optional.of(chilledLeafy(1L, false)));

        assertThatThrownBy(() -> service.create(USER_ID, shelf(7L, "chilled", 3, null)))
                .isInstanceOf(InvalidFieldException.class)
                .extracting("field")
                .isEqualTo("shelfLifeGuideId");
    }

    @Test
    void createRefusesAWayOfKeepingTheGroupDoesNotHave() {
        approvedStall();
        when(shelfLifeGuides.findById(7L)).thenReturn(Optional.of(chilledLeafy(1L, true)));

        assertThatThrownBy(() -> service.create(USER_ID, shelf(7L, "room", 3, null)))
                .isInstanceOf(InvalidFieldException.class)
                .extracting("field")
                .isEqualTo("storageMode");
    }

    /** Ruling 5: once a category has groups, a product must pick one. */
    @Test
    void createNeedsAGroupWhenTheCategoryHasGroups() {
        approvedStall();
        when(shelfLifeGuides.findByCategoryIdAndActiveTrueOrderByGroupNameAscStorageModeAsc(1L))
                .thenReturn(List.of(chilledLeafy(1L, true)));

        assertThatThrownBy(() -> service.create(USER_ID, shelf(null, "chilled", 3, null)))
                .isInstanceOf(InvalidFieldException.class)
                .extracting("field")
                .isEqualTo("shelfLifeGuideId");
    }

    /** Spec §4.1 fallback: no groups yet → the category's upper bound is the suggestion. */
    @Test
    void createWithoutGroupsUsesTheCategoryRange() {
        approvedStall();

        FarmerProductResource atMax = service.create(USER_ID, shelf(null, "room", 7, null));
        assertThat(atMax.shelfLife().suggestedDays()).isEqualTo(7);
        assertThat(atMax.shelfLife().extended()).isFalse();
        assertThat(atMax.shelfLife().groupName()).isNull();

        assertThatThrownBy(() -> service.create(USER_ID, shelf(null, "room", 8, null)))
                .isInstanceOf(InvalidFieldException.class)
                .extracting("field")
                .isEqualTo("acknowledgeLongerShelfLife");
    }
```

- [ ] **Step 2: Chạy test để thấy fail**

Run: lệnh test backend với `-Dtest='ProductServiceTest'`.
Expected: FAIL lúc biên dịch (constructor `ProductService` 8 tham số, `ProductRequest` 11 tham số, `shelfLife()` chưa có).

- [ ] **Step 3: Thêm field vào `Product`**

Trong `product/entities/Product.java`, ngay sau field `shelfLifeDays` (import `com.techx.intervue.modules.catalog.enums.StorageMode`, `java.time.LocalDateTime`):

```java
    /** FR-120: the storage group the suggestion came from; null = the category's own range. */
    @Column(name = "shelf_life_guide_id")
    private Long shelfLifeGuideId;

    @Convert(converter = StorageMode.DbConverter.class)
    @Column(name = "storage_mode", nullable = false)
    private StorageMode storageMode = StorageMode.ROOM;

    /**
     * The suggestion when the product was last saved, so a later change to the guide does not
     * re-label the product.
     */
    @Column(name = "suggested_shelf_life_days")
    private Integer suggestedShelfLifeDays;

    /** FR-121: shelfLifeDays is longer than the suggestion, and the Farmer confirmed it. */
    @Column(name = "shelf_life_extended", nullable = false)
    private boolean shelfLifeExtended;

    /** When the Farmer ticked the promise for the longer shelf life; null when not extended. */
    @Column(name = "shelf_life_ack_at")
    private LocalDateTime shelfLifeAckAt;
```

- [ ] **Step 4: Mở rộng `ProductRequest`**

Thay toàn bộ record (giữ Javadoc cũ, sửa câu về shelf life):

```java
/**
 * Body of POST/PUT /api/v1/farmer/products (contract §5, FR-062, FR-121). {@code shelfLifeGuideId}
 * is required once the category has storage groups; {@code storageMode} null means room
 * temperature when there is no group. A shelf life longer than the suggestion needs {@code
 * acknowledgeLongerShelfLife = true}.
 */
public record ProductRequest(
        @NotNull(message = "Category is required.") Long categoryId,
        @NotBlank(message = "Product name is required.") @Size(max = 150) String name,
        @Size(max = 2000) String description,
        @NotNull(message = "Price is required.") @DecimalMin("0") BigDecimal price,
        @NotBlank(message = "Unit is required.") @Size(max = 20) String unit,
        @NotNull(message = "Quantity is required.") @Min(0) Integer stockQuantity,
        @Size(max = 255) String imageUrl,
        @NotNull(message = "Shelf life is required.") @Positive Integer shelfLifeDays,
        Long shelfLifeGuideId,
        @Pattern(regexp = "room|chilled", message = "Choose room or chilled.")
                String storageMode,
        Boolean acknowledgeLongerShelfLife) {}
```

Thêm import `jakarta.validation.constraints.Pattern`.

- [ ] **Step 5: Tạo `ShelfLifeResource` và mở rộng `FarmerProductResource`**

```java
package com.techx.intervue.modules.product.resources;

/**
 * FR-121: a product's shelf life as stored — the group it was compared with (null = the category
 * range), how it is kept, the suggestion at the time of saving and whether the Farmer went longer.
 */
public record ShelfLifeResource(
        Long guideId,
        String groupName,
        String storageMode,
        int days,
        Integer suggestedDays,
        boolean extended) {}
```

`FarmerProductResource`: thêm thành phần cuối `ShelfLifeResource shelfLife`, rồi cập nhật hai constructor và `withNextDate`:

```java
public record FarmerProductResource(
        ProductListItemResource item,
        String description,
        boolean hidden,
        String hiddenReason,
        String nextDate,
        Integer nextDateAvailable,
        Integer nextDateReserved,
        ShelfLifeResource shelfLife) {

    /** List rows (mine, the admin's hidden list): no next-date overlay, no shelf-life block. */
    public FarmerProductResource(
            ProductListItemResource item, String description, boolean hidden, String hiddenReason) {
        this(item, description, hidden, hiddenReason, null, null, null, null);
    }

    /** One product (GET/POST/PUT): carries its shelf-life block for the edit form. */
    public FarmerProductResource(
            ProductListItemResource item,
            String description,
            boolean hidden,
            String hiddenReason,
            ShelfLifeResource shelfLife) {
        this(item, description, hidden, hiddenReason, null, null, null, shelfLife);
    }

    public FarmerProductResource withNextDate(String date, int available, int reserved) {
        return date == null
                ? this
                : new FarmerProductResource(
                        item,
                        description,
                        hidden,
                        hiddenReason,
                        date,
                        available,
                        reserved,
                        shelfLife);
    }
}
```

Giữ nguyên Javadoc của record và thêm một câu: "{@code shelfLife} is filled on the one-product endpoints and null on the list endpoints."

- [ ] **Step 6: Sửa `ProductService`**

1. Thêm field (sau `availability`) và import (`ShelfLifeGuide`, `StorageMode`, `ShelfLifeGuideRepository`, `ShelfLifePolicy`, `ShelfLifeResource`, `java.time.Clock`, `java.time.LocalDateTime`):

```java
    private final ShelfLifeGuideRepository shelfLifeGuides;
    private final Clock clock;
```

2. Trong `create`:

```java
        Product product = new Product();
        product.setFarmerId(profile.getId());
        apply(product, request, category);
        ShelfLifeGuide guide = applyShelfLife(product, request, category);
        return toResource(products.save(product), profile, category, guide);
```

3. Trong `update`:

```java
        apply(product, request, category);
        ShelfLifeGuide guide = applyShelfLife(product, request, category);
        return toResource(products.save(product), profile, category, guide);
```

4. Trong `mineOne` và `setStatus`, đổi lời gọi `toResource(product, profile, category)` thành `toResource(product, profile, category, guideOf(product))` (với `setStatus` là biến `saved`).

5. Trong `apply(...)`: xoá dòng `product.setShelfLifeDays(request.shelfLifeDays());`, vì `applyShelfLife` làm việc đó.

6. Thêm hai hàm private:

```java
    /**
     * FR-121 (spec §4.2): the suggestion comes from the chosen group, or from the category's upper
     * bound when the category has no groups; the server never trusts a number the client sends.
     * Longer than the suggestion needs the Farmer's promise and is recorded with its time; more
     * than twice the suggestion is refused.
     */
    private ShelfLifeGuide applyShelfLife(Product product, ProductRequest request, Category category) {
        int days = request.shelfLifeDays();
        ShelfLifeGuide guide = null;
        StorageMode mode;
        int suggested;
        if (request.shelfLifeGuideId() != null) {
            guide =
                    shelfLifeGuides
                            .findById(request.shelfLifeGuideId())
                            .filter(ShelfLifeGuide::isActive)
                            .filter(g -> g.getCategoryId().equals(category.getId()))
                            .orElseThrow(
                                    () ->
                                            new InvalidFieldException(
                                                    "shelfLifeGuideId",
                                                    "Choose a group from this category."));
            mode = guide.getStorageMode();
            if (request.storageMode() != null && StorageMode.parse(request.storageMode()) != mode) {
                throw new InvalidFieldException(
                        "storageMode", "This group cannot be sold that way.");
            }
            suggested = guide.getSuggestedDays();
        } else {
            if (!shelfLifeGuides
                    .findByCategoryIdAndActiveTrueOrderByGroupNameAscStorageModeAsc(
                            category.getId())
                    .isEmpty()) {
                throw new InvalidFieldException(
                        "shelfLifeGuideId", "Choose a group from this category.");
            }
            mode =
                    request.storageMode() == null
                            ? StorageMode.ROOM
                            : StorageMode.parse(request.storageMode());
            suggested = category.getMaxShelfLifeDays();
        }
        int max = ShelfLifePolicy.maxDays(suggested);
        if (days > max) {
            throw new InvalidFieldException(
                    "shelfLifeDays", "At most " + max + " days for this group.");
        }
        boolean extended = ShelfLifePolicy.extendedBy(days, suggested) > 0;
        if (extended && !Boolean.TRUE.equals(request.acknowledgeLongerShelfLife())) {
            throw new InvalidFieldException(
                    "acknowledgeLongerShelfLife",
                    "Confirm that the product stays good for the longer time.");
        }
        product.setShelfLifeDays(days);
        product.setShelfLifeGuideId(guide == null ? null : guide.getId());
        product.setStorageMode(mode);
        product.setSuggestedShelfLifeDays(suggested);
        product.setShelfLifeExtended(extended);
        product.setShelfLifeAckAt(extended ? LocalDateTime.now(clock) : null);
        return guide;
    }

    private ShelfLifeGuide guideOf(Product product) {
        return product.getShelfLifeGuideId() == null
                ? null
                : shelfLifeGuides.findById(product.getShelfLifeGuideId()).orElse(null);
    }
```

7. `toResource` nhận thêm `ShelfLifeGuide guide` và trả constructor 5 tham số:

```java
    private static FarmerProductResource toResource(
            Product p, FarmerProfile profile, Category category, ShelfLifeGuide guide) {
        ProductListItemResource item = … ; // unchanged
        return new FarmerProductResource(
                item, p.getDescription(), p.isHidden(), p.getHiddenReason(), shelfLifeOf(p, guide));
    }

    static ShelfLifeResource shelfLifeOf(Product p, ShelfLifeGuide guide) {
        return new ShelfLifeResource(
                p.getShelfLifeGuideId(),
                guide == null ? null : guide.getGroupName(),
                p.getStorageMode().value(),
                p.getShelfLifeDays(),
                p.getSuggestedShelfLifeDays(),
                p.isShelfLifeExtended());
    }
```

- [ ] **Step 7: Chạy lại test sản phẩm**

Run: lệnh test backend với `-Dtest='ProductServiceTest,FarmerProductNextDateTest,ProductHiddenListTest'`.
Expected: toàn bộ PASS. Test cũ vẫn xanh vì danh mục mẫu giờ có max 7 và `request()` dùng 4 ngày, không có nhóm.

- [ ] **Step 8: Format và commit**

```bash
docker compose exec -T -e MAVEN_OPTS=-Xmx256m backend ./mvnw -B -q spotless:apply
git add backend/src/main/java/com/techx/intervue/modules/product \
  backend/src/test/java/com/techx/intervue/modules/product
git commit -m "feat(FR-121): products keep their storage group and a signed promise for longer shelf life"
```

---

### Task 6: Trang sản phẩm công khai có khối `shelfLife` (FR-121)

**Files:**
- Modify: `backend/src/main/java/com/techx/intervue/modules/product/resources/ProductDetailResource.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/product/repositories/ProductQueryRepository.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/product/services/impl/ProductQueryService.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/product/services/impl/ProductQueryServiceTest.java` (thêm test)
- Test: `backend/src/test/java/com/techx/intervue/modules/product/repositories/ProductShelfLifeQueryTest.java`

**Interfaces:**
- Consumes: Task 5 (`ShelfLifeResource`, các cột của `products`).
- Produces: `ProductDetailResource(ProductListItemResource product, String description, StallSummaryResource farmer, ReviewSummaryResource reviewsSummary, ShelfLifeResource shelfLife)`; `ProductQueryRepository.shelfLife(long productId)` → `Optional<ShelfLifeResource>`.

- [ ] **Step 1: Viết test truy vấn (MySQL)**

```java
package com.techx.intervue.modules.product.repositories;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.product.resources.ShelfLifeResource;
import com.techx.intervue.modules.report.services.impl.ReportFixture;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

/** FR-121: the public product page reads the stored shelf-life block, group name included. */
@SpringBootTest
class ProductShelfLifeQueryTest {

    @Autowired private ProductQueryRepository query;
    @Autowired private JdbcTemplate jdbc;

    private ReportFixture fx;
    private long category;
    private long farmer;

    @BeforeEach
    void setUp() {
        fx = new ReportFixture(jdbc);
        category = fx.category();
        farmer = fx.farmer(fx.user("farmer", "Shelf " + fx.tag, "x"), "Stall " + fx.tag, "approved");
    }

    @AfterEach
    void tearDown() {
        jdbc.update(
                "UPDATE products SET shelf_life_guide_id = NULL WHERE category_id = ?", category);
        jdbc.update("DELETE FROM shelf_life_guides WHERE category_id = ?", category);
        fx.cleanUp();
    }

    @Test
    void readsTheGroupTheProductWasComparedWith() {
        jdbc.update(
                "INSERT INTO shelf_life_guides (category_id, group_name, storage_mode,"
                        + " suggested_days) VALUES (?, 'Leafy greens', 'chilled', 3)",
                category);
        long guide =
                jdbc.queryForObject(
                        "SELECT id FROM shelf_life_guides WHERE category_id = ?",
                        Long.class,
                        category);
        long product = fx.product(farmer, category, "Rau muống " + fx.tag, 1);
        jdbc.update(
                "UPDATE products SET shelf_life_days = 5, shelf_life_guide_id = ?, storage_mode ="
                        + " 'chilled', suggested_shelf_life_days = 3, shelf_life_extended = TRUE"
                        + " WHERE id = ?",
                guide,
                product);

        assertThat(query.shelfLife(product))
                .contains(new ShelfLifeResource(guide, "Leafy greens", "chilled", 5, 3, true));
    }

    @Test
    void readsAProductSavedBeforeGroupsExisted() {
        long product = fx.product(farmer, category, "Cải ngọt " + fx.tag, 1);

        ShelfLifeResource shelfLife = query.shelfLife(product).orElseThrow();

        assertThat(shelfLife.guideId()).isNull();
        assertThat(shelfLife.groupName()).isNull();
        assertThat(shelfLife.storageMode()).isEqualTo("room");
        assertThat(shelfLife.suggestedDays()).isNull();
        assertThat(shelfLife.extended()).isFalse();
    }
}
```

`ReportFixture.category()` tạo danh mục có tag riêng; `fx.product(...)` dùng giá trị mặc định `shelf_life_days = 3` của cột. Nếu `fx.product` trả kiểu khác `long`, dùng đúng kiểu đó.

- [ ] **Step 2: Thêm test service**

Trong `ProductQueryServiceTest`, thêm import `com.techx.intervue.modules.product.resources.ShelfLifeResource` và test:

```java
    @Test
    void detailCarriesTheStoredShelfLife() {
        when(repository.findVisibleById(1L))
                .thenReturn(Optional.of(new ProductDetailRow(item(1L), "Cắt sáng")));
        when(repository.shelfLife(1L))
                .thenReturn(
                        Optional.of(
                                new ShelfLifeResource(7L, "Leafy greens", "chilled", 5, 3, true)));
        when(stallService.publicDetail(10L))
                .thenReturn(
                        new StallDetailResource(
                                10L,
                                "Vườn Út Hiền",
                                "Hiền",
                                null,
                                null,
                                12,
                                BigDecimal.ZERO,
                                0,
                                "approved",
                                List.of()));

        ProductDetailResource result = service.detail(1L);

        assertThat(result.shelfLife())
                .isEqualTo(new ShelfLifeResource(7L, "Leafy greens", "chilled", 5, 3, true));
    }
```

- [ ] **Step 3: Chạy test để thấy fail**

Run: lệnh test backend với `-Dtest='ProductShelfLifeQueryTest,ProductQueryServiceTest'`.
Expected: FAIL lúc biên dịch (`shelfLife(long)` và `result.shelfLife()` chưa có).

- [ ] **Step 4: Viết truy vấn, record và service**

`ProductDetailResource` thêm thành phần cuối (Javadoc thêm "and its `shelfLife` block (FR-121)"):

```java
public record ProductDetailResource(
        ProductListItemResource product,
        String description,
        StallSummaryResource farmer,
        ReviewSummaryResource reviewsSummary,
        ShelfLifeResource shelfLife) {}
```

`ProductQueryRepository`: thêm hằng và hàm (import `ShelfLifeResource`):

```java
    /** FR-121: one product's stored shelf-life block for its public page. */
    public static final String SHELF_LIFE_SQL =
            """
            SELECT p.shelf_life_guide_id, g.group_name, p.storage_mode, p.shelf_life_days,
                   p.suggested_shelf_life_days, p.shelf_life_extended
            FROM products p
            LEFT JOIN shelf_life_guides g ON g.id = p.shelf_life_guide_id
            WHERE p.id = :id
            """;

    public Optional<ShelfLifeResource> shelfLife(long productId) {
        return jdbc
                .query(
                        SHELF_LIFE_SQL,
                        new MapSqlParameterSource("id", productId),
                        (rs, i) -> {
                            long guideId = rs.getLong("shelf_life_guide_id");
                            Long guide = rs.wasNull() ? null : guideId;
                            int suggested = rs.getInt("suggested_shelf_life_days");
                            Integer suggestedDays = rs.wasNull() ? null : suggested;
                            return new ShelfLifeResource(
                                    guide,
                                    rs.getString("group_name"),
                                    rs.getString("storage_mode"),
                                    rs.getInt("shelf_life_days"),
                                    suggestedDays,
                                    rs.getBoolean("shelf_life_extended"));
                        })
                .stream()
                .findFirst();
    }
```

`ProductQueryService.detail`: thêm tham số thứ năm cho `new ProductDetailResource(...)`:

```java
                reviewService.productSummary(row.item().id()),
                repository.shelfLife(id).orElse(null));
```

- [ ] **Step 5: Chạy lại test**

Run: lệnh test backend với `-Dtest='ProductShelfLifeQueryTest,ProductQueryServiceTest'`.
Expected: toàn bộ PASS. Các test `detail` cũ vẫn xanh: Mockito tự trả `Optional.empty()` cho `shelfLife`.

- [ ] **Step 6: Format và commit**

```bash
docker compose exec -T -e MAVEN_OPTS=-Xmx256m backend ./mvnw -B -q spotless:apply
git add backend/src/main/java/com/techx/intervue/modules/product \
  backend/src/test/java/com/techx/intervue/modules/product
git commit -m "feat(FR-121): the public product page carries how it is kept and the promise"
```

---

### Task 7: Đơn hàng chụp lại lời hứa hạn dùng (FR-121)

**Files:**
- Modify: `backend/src/main/java/com/techx/intervue/modules/order/entities/OrderItem.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/order/services/impl/OrderService.java` (dòng `items.add(OrderItem.snapshot(…))` trong `placeGroup`)
- Modify: `backend/src/main/java/com/techx/intervue/modules/order/resources/OrderItemResource.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/order/repositories/OrderQueryRepository.java` (`ITEMS_SQL` và `items(...)`)
- Test: `backend/src/test/java/com/techx/intervue/modules/order/services/impl/OrderServiceTest.java` (thêm test)
- Test: `backend/src/test/java/com/techx/intervue/modules/order/repositories/OrderItemShelfLifeQueryTest.java`

**Interfaces:**
- Consumes: Task 2 (`ShelfLifePolicy`), Task 5 (field mới của `Product`).
- Produces: field mới của `OrderItem` (`shelfLifeDays`, `storageMode`, `bestBefore`, `shelfLifeExtended`, `extendedByDays`, `listPrice`); `OrderItem.snapshot(Product product, BigDecimal unitPrice, int quantity, BigDecimal subtotal, LocalDate pickupDate)`; `OrderItemResource(Long productId, String productName, String unit, BigDecimal unitPrice, int quantity, BigDecimal subtotal, String bestBefore, String storageMode, BigDecimal listPrice)`.

- [ ] **Step 1: Thêm test đặt đơn**

Trong `OrderServiceTest`, gần các test `place…` (import `com.techx.intervue.modules.catalog.enums.StorageMode` nếu chưa có):

```java
    /** FR-121 (spec §4.3): each line keeps the shelf-life promise as it stood at ordering time. */
    @Test
    void placeCopiesTheShelfLifePromiseOntoEachLine() {
        Product rau = products.get(RAU_MUONG);
        rau.setShelfLifeDays(5);
        rau.setStorageMode(StorageMode.CHILLED);
        rau.setSuggestedShelfLifeDays(3);
        rau.setShelfLifeExtended(true);

        service.place(CUSTOMER_ID, request(group(FARMER_A, SLOT_A, line(RAU_MUONG, 1))));

        OrderItem line = items.getFirst();
        assertThat(line.getShelfLifeDays()).isEqualTo(5);
        assertThat(line.getStorageMode()).isEqualTo(StorageMode.CHILLED);
        assertThat(line.getBestBefore()).isEqualTo(PICKUP.plusDays(4));
        assertThat(line.isShelfLifeExtended()).isTrue();
        assertThat(line.getExtendedByDays()).isEqualTo(2);
        assertThat(line.getListPrice()).isNull();
    }
```

- [ ] **Step 2: Viết test đọc dòng đơn (MySQL)**

```java
package com.techx.intervue.modules.order.repositories;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.order.resources.OrderItemResource;
import com.techx.intervue.modules.report.services.impl.ReportFixture;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

/** FR-121: order lines come back with their best-before day and how they are kept. */
@SpringBootTest
class OrderItemShelfLifeQueryTest {

    @Autowired private OrderQueryRepository orders;
    @Autowired private JdbcTemplate jdbc;

    private ReportFixture fx;

    @BeforeEach
    void setUp() {
        fx = new ReportFixture(jdbc);
    }

    @AfterEach
    void tearDown() {
        fx.cleanUp();
    }

    @Test
    void readsTheSnapshotColumnsAndLeavesOldLinesEmpty() {
        long customer = fx.user("customer", "Buyer " + fx.tag, "x");
        long farmer = fx.farmer(fx.user("farmer", "Seller " + fx.tag, "x"), "Stall " + fx.tag, "approved");
        long market = fx.market("Market " + fx.tag);
        long category = fx.category();
        long fresh = fx.product(farmer, category, "Rau muống " + fx.tag, 1);
        long old = fx.product(farmer, category, "Cải ngọt " + fx.tag, 1);
        long order = fx.order(customer, farmer, market, "placed", 2, LocalDate.of(2026, 10, 3));
        fx.item(order, fresh, 1, 1);
        fx.item(order, old, 1, 1);
        jdbc.update(
                "UPDATE order_items SET best_before = '2026-10-05', storage_mode = 'chilled'"
                        + " WHERE order_id = ? AND product_id = ?",
                order,
                fresh);

        List<OrderItemResource> items = orders.items(order);

        assertThat(items.get(0).bestBefore()).isEqualTo("2026-10-05");
        assertThat(items.get(0).storageMode()).isEqualTo("chilled");
        assertThat(items.get(0).listPrice()).isNull();
        assertThat(items.get(1).bestBefore()).isNull();
        assertThat(items.get(1).storageMode()).isNull();
    }
}
```

Mở `ReportFixture` để dùng đúng chữ ký của `user`, `farmer`, `market`, `category`, `product`, `order`, `item` (đã có sẵn trong file).

- [ ] **Step 3: Chạy test để thấy fail**

Run: lệnh test backend với `-Dtest='OrderServiceTest,OrderItemShelfLifeQueryTest'`.
Expected: FAIL lúc biên dịch (`getBestBefore`, `bestBefore()`… chưa có).

- [ ] **Step 4: Sửa `OrderItem`**

Thêm field (import `com.techx.intervue.modules.catalog.enums.StorageMode`, `com.techx.intervue.modules.catalog.services.impl.ShelfLifePolicy`, `jakarta.persistence.Convert`, `java.time.LocalDate`):

```java
    /** FR-121: the shelf-life promise at ordering time (spec §4.3); null on lines placed before. */
    @Column(name = "shelf_life_days")
    private Integer shelfLifeDays;

    @Convert(converter = StorageMode.DbConverter.class)
    @Column(name = "storage_mode")
    private StorageMode storageMode;

    /** The last day the line is still good. */
    @Column(name = "best_before")
    private LocalDate bestBefore;

    @Column(name = "shelf_life_extended", nullable = false)
    private boolean shelfLifeExtended;

    @Column(name = "extended_by_days", nullable = false)
    private int extendedByDays;

    /** FR-124: the price before a near-expiry discount; null when the line was not discounted. */
    @Column(name = "list_price", precision = 10, scale = 2)
    private BigDecimal listPrice;
```

Đổi `snapshot` thành:

```java
    /**
     * Copies the product's name and unit, the price actually charged and the shelf-life promise,
     * at this moment; orderId is assigned once the order has an id. {@code unitPrice} comes from
     * the locked {@code product_daily_stock} row for the pickup date, not {@code product.getPrice()}
     * — price can differ by day (weekly stock template). The line is good from the pickup date for
     * the product's shelf life (FR-121).
     */
    public static OrderItem snapshot(
            Product product,
            BigDecimal unitPrice,
            int quantity,
            BigDecimal subtotal,
            LocalDate pickupDate) {
        OrderItem item = new OrderItem();
        item.setProductId(product.getId());
        item.setProductName(product.getName());
        item.setUnitPrice(unitPrice);
        item.setUnit(product.getUnit());
        item.setQuantity(quantity);
        item.setSubtotal(subtotal);
        item.setShelfLifeDays(product.getShelfLifeDays());
        item.setStorageMode(product.getStorageMode());
        item.setBestBefore(ShelfLifePolicy.bestBefore(pickupDate, product.getShelfLifeDays()));
        item.setShelfLifeExtended(product.isShelfLifeExtended());
        item.setExtendedByDays(
                ShelfLifePolicy.extendedBy(
                        product.getShelfLifeDays(), product.getSuggestedShelfLifeDays()));
        return item;
    }
```

- [ ] **Step 5: Truyền ngày nhận trong `OrderService.placeGroup`**

Đổi dòng `items.add(OrderItem.snapshot(p, row.getUnitPrice(), qty, subtotal));` thành:

```java
            items.add(OrderItem.snapshot(p, row.getUnitPrice(), qty, subtotal, group.pickupDate()));
```

- [ ] **Step 6: Mở rộng `OrderItemResource` và truy vấn**

```java
/**
 * One {@code order_items} line — name/price/unit as copied at order time (contract §7). {@code
 * bestBefore} ("yyyy-MM-dd") and {@code storageMode} are the shelf-life promise (FR-121), null on
 * lines placed before it existed; {@code listPrice} is the price before a near-expiry discount
 * (FR-124), null when there was none.
 */
public record OrderItemResource(
        Long productId,
        String productName,
        String unit,
        BigDecimal unitPrice,
        int quantity,
        BigDecimal subtotal,
        String bestBefore,
        String storageMode,
        BigDecimal listPrice) {}
```

`OrderQueryRepository.ITEMS_SQL`:

```java
    public static final String ITEMS_SQL =
            """
            SELECT product_id, product_name, unit, unit_price, quantity, subtotal,
                   best_before, storage_mode, list_price
            FROM order_items
            WHERE order_id = :orderId
            ORDER BY id
            """;
```

Trong `items(...)`, dựng record như sau (import `java.time.LocalDate` nếu chưa có):

```java
                (rs, i) -> {
                    LocalDate bestBefore = rs.getObject("best_before", LocalDate.class);
                    return new OrderItemResource(
                            rs.getLong("product_id"),
                            rs.getString("product_name"),
                            rs.getString("unit"),
                            rs.getBigDecimal("unit_price"),
                            rs.getInt("quantity"),
                            rs.getBigDecimal("subtotal"),
                            bestBefore == null ? null : bestBefore.toString(),
                            rs.getString("storage_mode"),
                            rs.getBigDecimal("list_price"));
                });
```

- [ ] **Step 7: Chạy lại test đơn hàng**

Run: lệnh test backend với `-Dtest='OrderServiceTest,OrderItemShelfLifeQueryTest,OrderNotificationTest,PlaceOrderConcurrencyTest,PlaceOrderOpenDaysTest'`.
Expected: toàn bộ PASS.

- [ ] **Step 8: Format và commit**

```bash
docker compose exec -T -e MAVEN_OPTS=-Xmx256m backend ./mvnw -B -q spotless:apply
git add backend/src/main/java/com/techx/intervue/modules/order \
  backend/src/test/java/com/techx/intervue/modules/order
git commit -m "feat(FR-121): order lines keep the shelf-life promise they were sold with"
```

---

### Task 8: Frontend nền: API client, helper, kiểu dữ liệu, `BestBeforeLine` (FR-120, FR-121)

**Files:**
- Create: `frontend/src/api-requests/shelf-life.requests.ts`
- Create: `frontend/src/lib/shelfLife.ts`, `frontend/src/lib/shelfLife.test.ts`
- Create: `frontend/src/components/BestBeforeLine.tsx`, `frontend/src/components/BestBeforeLine.test.tsx`
- Modify: `frontend/src/api-requests/product.requests.ts`, `frontend/src/api-requests/order.requests.ts`, `frontend/src/types/product.types.ts`
- Modify: `frontend/src/locales/*/common.json` (10 file)

**Interfaces:**
- Consumes: API của Task 3, 4, 5, 6, 7.
- Produces: `ShelfLifeApi` (`forCategory`, `adminList`, `adminCreate`, `adminUpdate`, `adminDeactivate`), các kiểu `StorageMode`, `ShelfLifeModeDto`, `ShelfLifeGroupDto`, `ShelfLifeGuideDto`, `ShelfLifeGuideInput`, `ShelfLifeDto`; `maxShelfLifeDays`, `extendedBy`, `matchGuideGroup`; `ProductType.shelfLife`, `ProductDetailDto.shelfLife`, `FarmerProductDto.shelfLife`, 3 field mới của `ProductInput`; `OrderItemDto.bestBefore/storageMode/listPrice`; component `BestBeforeLine`; key chung `storageMode.room`, `storageMode.chilled`, `bestBefore.line`.

- [ ] **Step 1: Viết test helper**

`frontend/src/lib/shelfLife.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { ShelfLifeGroupDto } from '@/api-requests/shelf-life.requests';
import { extendedBy, matchGuideGroup, maxShelfLifeDays } from './shelfLife';

const group = (groupName: string, examples: string): ShelfLifeGroupDto => ({ groupName, examples, modes: [] });

const vegetables = [
  group('Leafy greens', 'rau muống, cải ngọt, lettuce'),
  group('Fruiting vegetables', 'cà chua, ớt, chili'),
  group('Roots and bulbs', 'cà rốt, khoai lang, carrot'),
];

describe('shelf-life helpers', () => {
  it('allows at most twice the suggestion', () => {
    expect(maxShelfLifeDays(1)).toBe(2);
    expect(maxShelfLifeDays(3)).toBe(6);
  });

  it('counts only the days above the suggestion', () => {
    expect(extendedBy(5, 3)).toBe(2);
    expect(extendedBy(2, 3)).toBe(0);
    expect(extendedBy(9, null)).toBe(0);
  });

  it('picks the group from the product name, ignoring case and accents', () => {
    expect(matchGuideGroup('Rau Muong Củ Chi', vegetables)?.groupName).toBe('Leafy greens');
    expect(matchGuideGroup('Organic carrot', vegetables)?.groupName).toBe('Roots and bulbs');
  });

  /** "ớt" folds to "ot"; matching whole words keeps it out of "cà rốt" ("ca rot"). */
  it('matches whole words only, so a short example never hides inside another word', () => {
    expect(matchGuideGroup('Cà rốt Đà Lạt', vegetables)?.groupName).toBe('Roots and bulbs');
  });

  it('prefers the longest matching example', () => {
    const fruit = [group('Tomatoes', 'cà chua'), group('Everything', 'cà')];
    expect(matchGuideGroup('Cà chua bi', fruit)?.groupName).toBe('Tomatoes');
  });

  it('answers nothing for a blank or unknown name', () => {
    expect(matchGuideGroup('', vegetables)).toBeUndefined();
    expect(matchGuideGroup('Mật ong', vegetables)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Viết test `BestBeforeLine`**

`frontend/src/components/BestBeforeLine.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import BestBeforeLine from './BestBeforeLine';

describe('BestBeforeLine', () => {
  it('names the last good day and how the line is kept', () => {
    render(<BestBeforeLine bestBefore="2026-10-04" storageMode="chilled" />);
    expect(screen.getByText('Good until end of Sun 04/10 · Fridge 0–5 °C')).toBeInTheDocument();
  });

  it('shows nothing for a line placed before the promise existed', () => {
    const { container } = render(<BestBeforeLine bestBefore={null} storageMode={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 3: Chạy 2 test để thấy fail**

Run: `docker compose exec -T frontend sh -c 'npx vitest run src/lib/shelfLife.test.ts src/components/BestBeforeLine.test.tsx'`
Expected: FAIL, `Failed to resolve import "./shelfLife"` và `"./BestBeforeLine"`.

- [ ] **Step 4: Viết API client**

`frontend/src/api-requests/shelf-life.requests.ts`:

```ts
import type { ApiResponse } from '@/types/api.types';
import { privateApi } from '@/utils/axiosInstance';

/** FR-120: how a product is kept until it is used. */
export type StorageMode = 'room' | 'chilled';

/** One way of keeping a group, as the product form offers it. */
export type ShelfLifeModeDto = {
  guideId: number;
  storageMode: StorageMode;
  suggestedDays: number;
  /** What other stalls set; null until at least three of their products use this guide. */
  peerMedianDays: number | null;
  peerCount: number;
};

/** One storage group of a category, room before chilled. */
export type ShelfLifeGroupDto = { groupName: string; examples: string; modes: ShelfLifeModeDto[] };

/** One guide row as the admin manages it. */
export type ShelfLifeGuideDto = {
  id: number;
  categoryId: number;
  groupName: string;
  examples: string;
  storageMode: StorageMode;
  suggestedDays: number;
  isActive: boolean;
};

export type ShelfLifeGuideInput = {
  categoryId: number;
  groupName: string;
  examples?: string;
  storageMode: StorageMode;
  suggestedDays: number;
  /** Omitted: stays as it is on update, on when creating. */
  active?: boolean;
};

/** A product's shelf life as stored (FR-121). `guideId` null = the category's range was used. */
export type ShelfLifeDto = {
  guideId: number | null;
  groupName: string | null;
  storageMode: StorageMode;
  days: number;
  suggestedDays: number | null;
  extended: boolean;
};

/** FR-120 — shelf-life guides (docs/api-contract.md §5, §10). */
class ShelfLifeApi {
  /** Farmer (and Admin): the active groups of one category, with what other stalls set. */
  static forCategory = async (categoryId: number) => {
    const response = await privateApi.get<ApiResponse<ShelfLifeGroupDto[]>>('/shelf-life-guides', {
      params: { categoryId },
    });
    return response.data.data;
  };

  /** Admin: every row of a category, turned-off ones included. */
  static adminList = async (categoryId: number) => {
    const response = await privateApi.get<ApiResponse<ShelfLifeGuideDto[]>>('/admin/shelf-life-guides', {
      params: { categoryId },
    });
    return response.data.data;
  };

  /** 409 `DUPLICATE_SHELF_LIFE_GUIDE` when the group already has that way of keeping. */
  static adminCreate = async (input: ShelfLifeGuideInput) => {
    const response = await privateApi.post<ApiResponse<ShelfLifeGuideDto>>('/admin/shelf-life-guides', input);
    return response.data.data;
  };

  static adminUpdate = async (id: number, input: ShelfLifeGuideInput) => {
    const response = await privateApi.put<ApiResponse<ShelfLifeGuideDto>>(`/admin/shelf-life-guides/${id}`, input);
    return response.data.data;
  };

  /** Soft delete: products that use it keep their numbers. */
  static adminDeactivate = async (id: number) => {
    await privateApi.delete<ApiResponse<null>>(`/admin/shelf-life-guides/${id}`);
  };
}

export default ShelfLifeApi;
```

- [ ] **Step 5: Viết helper**

`frontend/src/lib/shelfLife.ts`:

```ts
import type { ShelfLifeGroupDto } from '@/api-requests/shelf-life.requests';
import { foldText } from '@/lib/format';

/** FR-121: the longest a Farmer may set — twice the suggestion, the same rule as the server. */
export const maxShelfLifeDays = (suggested: number): number => suggested * 2;

/** Days above the suggestion; 0 when there is none or the Farmer went shorter. */
export const extendedBy = (days: number, suggested?: number | null): number =>
  suggested == null ? 0 : Math.max(0, days - suggested);

/** " rau muong cu chi ": folded, punctuation turned into spaces, padded so whole words can be found. */
const words = (text: string) => ` ${foldText(text).replace(/[^a-z0-9]+/g, ' ').trim()} `;

/**
 * FR-120: the storage group whose example words appear in the product name, as whole words, ignoring case and
 * accents. The longest matching example wins ("cà chua" beats "cà"); undefined when nothing matches.
 */
export function matchGuideGroup(productName: string, groups: ShelfLifeGroupDto[]): ShelfLifeGroupDto | undefined {
  const name = words(productName);
  if (!name.trim()) return undefined;
  let best: { group: ShelfLifeGroupDto; length: number } | undefined;
  for (const group of groups) {
    for (const raw of group.examples.split(',')) {
      const example = words(raw).trim();
      if (example && name.includes(` ${example} `) && (!best || example.length > best.length)) {
        best = { group, length: example.length };
      }
    }
  }
  return best?.group;
}
```

- [ ] **Step 6: Viết `BestBeforeLine`**

`frontend/src/components/BestBeforeLine.tsx`:

```tsx
import { useTranslation } from 'react-i18next';
import type { StorageMode } from '@/api-requests/shelf-life.requests';
import { stockDay } from '@/components/stockDay';

type BestBeforeLineProps = { bestBefore?: string | null; storageMode?: StorageMode | null };

/**
 * FR-121: "Good until end of Sun 04/10 · Fridge 0–5 °C" under an order line. Lines placed before the promise existed
 * have no date and show nothing.
 */
const BestBeforeLine = ({ bestBefore, storageMode }: BestBeforeLineProps) => {
  const { t } = useTranslation();
  const day = stockDay(bestBefore);
  if (!day) return null;
  return (
    <span className="text-ink-muted block text-[13px]">
      {t('bestBefore.line', { day, storage: t(`storageMode.${storageMode ?? 'room'}`) })}
    </span>
  );
};

export default BestBeforeLine;
```

- [ ] **Step 7: Thêm key chung vào `common.json` (10 ngôn ngữ)**

Thêm hai khối ở cấp gốc của mỗi `frontend/src/locales/<lang>/common.json`. Bản `en`:

```json
  "storageMode": {
    "room": "Room temperature",
    "chilled": "Fridge 0–5 °C"
  },
  "bestBefore": {
    "line": "Good until end of {{day}} · {{storage}}"
  }
```

Bản `vi`:

```json
  "storageMode": {
    "room": "Nhiệt độ thường",
    "chilled": "Ngăn mát 0–5 °C"
  },
  "bestBefore": {
    "line": "Dùng tốt đến hết {{day}} · {{storage}}"
  }
```

8 ngôn ngữ còn lại (`zh ja ko fr es de th id`): dịch từ bản `en`, giữ nguyên `{{day}}`, `{{storage}}` và "0–5 °C". Giữ định dạng JSON 2 dấu cách và dòng trống cuối file.

- [ ] **Step 8: Mở rộng kiểu sản phẩm và đơn hàng**

`frontend/src/api-requests/product.requests.ts`:
- import `type { ShelfLifeDto, StorageMode } from '@/api-requests/shelf-life.requests'`;
- `ProductDetailDto` thêm `shelfLife?: ShelfLifeDto | null;` (comment: `/** FR-121: how it is kept and the stall's promise. */`);
- `FarmerProductDto` thêm `shelfLife?: ShelfLifeDto | null;` (comment: `/** One-product endpoints only: the stored shelf-life block for the edit form. */`);
- `ProductInput` thêm:

```ts
  /** The chosen storage group (required once the category has groups). */
  shelfLifeGuideId?: number;
  storageMode?: StorageMode;
  /** Must be true when shelfLifeDays is longer than the suggestion (FR-121). */
  acknowledgeLongerShelfLife?: boolean;
```

- `toFarmerProduct` thêm `shelfLife: dto.shelfLife ?? undefined,`.

`frontend/src/types/product.types.ts`: import `type { ShelfLifeDto } from '@/api-requests/shelf-life.requests'`, và thêm vào `ProductType`:

```ts
  /** The Farmer's edit form: the stored shelf-life block (FR-121). */
  shelfLife?: ShelfLifeDto;
```

`frontend/src/api-requests/order.requests.ts`: import `type { StorageMode } from '@/api-requests/shelf-life.requests'`; `OrderItemDto` thêm:

```ts
  /** FR-121: the last good day ("yyyy-MM-dd"); null on lines placed before the promise existed. */
  bestBefore?: string | null;
  storageMode?: StorageMode | null;
  /** FR-124: the price before a near-expiry discount; null when there was none. */
  listPrice?: number | null;
```

- [ ] **Step 9: Chạy lại test**

Run: `docker compose exec -T frontend sh -c 'npx vitest run src/lib/shelfLife.test.ts src/components/BestBeforeLine.test.tsx'`
Expected: `Tests  8 passed`.

- [ ] **Step 10: Kiểm và commit**

```bash
docker compose exec -T frontend sh -c 'npx prettier --write src/api-requests/shelf-life.requests.ts src/lib/shelfLife.ts src/lib/shelfLife.test.ts src/components/BestBeforeLine.tsx src/components/BestBeforeLine.test.tsx src/api-requests/product.requests.ts src/api-requests/order.requests.ts src/types/product.types.ts src/locales && npx tsc -b && npx eslint src'
git add frontend/src/api-requests frontend/src/lib/shelfLife.ts frontend/src/lib/shelfLife.test.ts \
  frontend/src/components/BestBeforeLine.tsx frontend/src/components/BestBeforeLine.test.tsx \
  frontend/src/types/product.types.ts frontend/src/locales/*/common.json
git commit -m "feat(FR-121): shelf-life API client, name matching and the best-before line"
```

---

### Task 9: Khối "Bảo quản & hạn dùng" trong form sản phẩm (FR-121)

**Files:**
- Create: `frontend/src/pages/farmer/ProductForm/ShelfLifeField.tsx`
- Modify: `frontend/src/pages/farmer/ProductForm/index.tsx`
- Modify: `frontend/src/pages/farmer/ProductForm/index.test.tsx`
- Modify: `frontend/src/locales/*/FarmerProductForm.json` (10 file)

**Interfaces:**
- Consumes: Task 8 (`ShelfLifeApi.forCategory`, `ShelfLifeGroupDto`, `StorageMode`, `maxShelfLifeDays`, `extendedBy`, `matchGuideGroup`, `ProductType.shelfLife`, `ProductInput`).
- Produces: component `ShelfLifeField` với props dưới đây. Giai đoạn 2 thêm prop `lockedUntil?: string | null`.

```ts
type ShelfLifeFieldProps = {
  groups: ShelfLifeGroupDto[];
  loading: boolean;
  loadFailed: boolean;
  onRetry: () => void;
  /** The category's own range, shown when it has no groups yet. */
  categoryRange: { min: number; max: number } | null;
  groupName: string | null;
  storageMode: StorageMode;
  suggestedDays: number;
  peerMedianDays: number | null;
  days: number;
  acknowledged: boolean;
  /** The saved group is no longer offered: ask for another one. */
  groupGone: boolean;
  errors: { group?: string; mode?: string; days?: string; ack?: string };
  onGroup: (groupName: string) => void;
  onMode: (mode: StorageMode, suggestedDays: number) => void;
  onDays: (days: number) => void;
  onAcknowledge: (value: boolean) => void;
};
```

- [ ] **Step 1: Thêm key vào `FarmerProductForm.json` (10 ngôn ngữ)**

Thay khối `"shelfLife"` hiện có (xoá các key `hint`, `error`, `warningTitle`, `warningText` không còn dùng). Bản `en`:

```json
  "shelfLife": {
    "label": "Shelf life",
    "group": "Storage group",
    "examples": "For example: {{examples}}",
    "storage": "How it is kept",
    "suggested_one": "suggested {{count}} day",
    "suggested_other": "suggested {{count}} days",
    "days_one": "{{count}} day",
    "days_other": "{{count}} days",
    "decrease": "One day less",
    "increase": "One day more",
    "peers_one": "Other stalls usually set {{count}} day",
    "peers_other": "Other stalls usually set {{count}} days",
    "shorter": "Shorter than suggested. Customers see exactly this number.",
    "longerTitle_one": "{{count}} day longer than suggested ({{suggested}} days, {{storage}})",
    "longerTitle_other": "{{count}} days longer than suggested ({{suggested}} days, {{storage}})",
    "ackLabel": "I promise this still keeps well for {{days}} days when stored this way ({{storage}}). If a customer reports it spoiled before then, the admin can record a violation for the stall.",
    "ackRequired": "Tick the promise to save a longer shelf life.",
    "tooLong_one": "At most {{count}} day for this group.",
    "tooLong_other": "At most {{count}} days for this group.",
    "saveBlocked": "Tick the promise above to save.",
    "loading": "Loading the storage groups",
    "fallback": "This category has no storage groups yet. It usually keeps {{min}}–{{max}} days.",
    "groupGone": "The group this product used is no longer offered. Pick another.",
    "noun": "storage groups"
  },
```

Bản `vi`:

```json
  "shelfLife": {
    "label": "Hạn dùng",
    "group": "Nhóm bảo quản",
    "examples": "Ví dụ: {{examples}}",
    "storage": "Cách bảo quản",
    "suggested_one": "gợi ý {{count}} ngày",
    "suggested_other": "gợi ý {{count}} ngày",
    "days_one": "{{count}} ngày",
    "days_other": "{{count}} ngày",
    "decrease": "Bớt 1 ngày",
    "increase": "Thêm 1 ngày",
    "peers_one": "Các sạp khác thường đặt {{count}} ngày",
    "peers_other": "Các sạp khác thường đặt {{count}} ngày",
    "shorter": "Ngắn hơn gợi ý. Khách sẽ thấy đúng số ngày này.",
    "longerTitle_one": "Dài hơn gợi ý {{count}} ngày (gợi ý {{suggested}} ngày, {{storage}})",
    "longerTitle_other": "Dài hơn gợi ý {{count}} ngày (gợi ý {{suggested}} ngày, {{storage}})",
    "ackLabel": "Tôi cam kết hàng tới tay khách vẫn dùng tốt đủ {{days}} ngày khi bảo quản theo cách này ({{storage}}). Nếu khách báo hư trước hạn, admin có thể ghi lỗi cho sạp.",
    "ackRequired": "Tick ô cam kết để lưu hạn dùng dài hơn.",
    "tooLong_one": "Tối đa {{count}} ngày cho nhóm này.",
    "tooLong_other": "Tối đa {{count}} ngày cho nhóm này.",
    "saveBlocked": "Tick ô cam kết ở trên để lưu.",
    "loading": "Đang tải nhóm bảo quản",
    "fallback": "Danh mục này chưa có nhóm bảo quản. Thường dùng được {{min}}–{{max}} ngày.",
    "groupGone": "Nhóm cũ của sản phẩm không còn dùng nữa. Hãy chọn nhóm khác.",
    "noun": "nhóm bảo quản"
  },
```

8 ngôn ngữ còn lại: dịch từ bản `en`, giữ nguyên placeholder `{{…}}` và hậu tố số nhiều `_one`/`_other` (ngôn ngữ không có số nhiều như `zh`, `ja`, `ko`, `th`, `id` vẫn giữ đủ 2 key).

- [ ] **Step 2: Viết test cho form (sẽ fail)**

Trong `frontend/src/pages/farmer/ProductForm/index.test.tsx`:
- thêm mock `vi.mock('@/api-requests/shelf-life.requests', () => ({ default: { forCategory: vi.fn() } }));` và import `ShelfLifeApi from '@/api-requests/shelf-life.requests'`;
- trong `beforeEach` mặc định danh mục có nhóm:

```ts
  vi.mocked(ShelfLifeApi.forCategory).mockResolvedValue([
    {
      groupName: 'Leafy greens',
      examples: 'rau muống, lettuce',
      modes: [
        { guideId: 11, storageMode: 'room', suggestedDays: 1, peerMedianDays: null, peerCount: 0 },
        { guideId: 12, storageMode: 'chilled', suggestedDays: 3, peerMedianDays: 3, peerCount: 4 },
      ],
    },
    {
      groupName: 'Roots and bulbs',
      examples: 'cà rốt, carrot',
      modes: [{ guideId: 21, storageMode: 'room', suggestedDays: 14, peerMedianDays: null, peerCount: 0 }],
    },
  ] as never);
  vi.mocked(ProductApi.create).mockResolvedValue({ id: 5, name: 'Rau muống', status: 'available' } as never);
```

- thêm helper `renderEdit` (giống `renderNew` nhưng route `/farmer/products/:id` và `initialEntries={['/farmer/products/5']}`), và các test:

```ts
  it('suggests the days of the group matched from the name', async () => {
    renderNew();
    await userEvent.type(await screen.findByLabelText(/^Product name/), 'Cà rốt Đà Lạt');

    expect(await screen.findByDisplayValue('Roots and bulbs')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: /shelf life/i })).toHaveTextContent('14 days');
  });

  it('jumps to the suggestion of the way of keeping that is picked', async () => {
    renderNew();
    await userEvent.click(await screen.findByLabelText(/Fridge 0–5 °C · suggested 3 days/));

    expect(screen.getByRole('status', { name: /shelf life/i })).toHaveTextContent('3 days');
    expect(screen.getByText('Other stalls usually set 3 days')).toBeInTheDocument();
  });

  it('asks for the promise before saving a longer shelf life', async () => {
    renderNew();
    await userEvent.type(await screen.findByLabelText(/^Product name/), 'Rau muống');
    await userEvent.type(screen.getByLabelText(/^Price/), '0.5');
    await userEvent.type(screen.getByLabelText(/^Quantity/), '10');
    await userEvent.click(screen.getByLabelText(/Fridge 0–5 °C · suggested 3 days/));
    await userEvent.click(screen.getByRole('button', { name: 'One day more' }));

    expect(screen.getByText(/1 day longer than suggested/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add product/ })).toBeDisabled();
    expect(screen.getByText('Tick the promise above to save.')).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText(/I promise this still keeps well for 4 days/));
    await userEvent.click(screen.getByRole('button', { name: /Add product/ }));

    expect(ProductApi.create).toHaveBeenCalledWith(
      expect.objectContaining({
        shelfLifeDays: 4,
        shelfLifeGuideId: 12,
        storageMode: 'chilled',
        acknowledgeLongerShelfLife: true,
      }),
    );
  });

  it('stops at twice the suggestion', async () => {
    renderNew();
    await userEvent.click(await screen.findByLabelText(/Room temperature · suggested 1 day/));
    const more = screen.getByRole('button', { name: 'One day more' });
    await userEvent.click(more);

    expect(screen.getByRole('status', { name: /shelf life/i })).toHaveTextContent('2 days');
    expect(more).toBeDisabled();
  });

  it('resets the group when the category changes', async () => {
    vi.mocked(CatalogApi.listCategories).mockResolvedValue([
      { id: 1, name: 'Vegetables', slug: 'vegetables', minShelfLifeDays: 1, maxShelfLifeDays: 7 },
      { id: 2, name: 'Fruits', slug: 'fruits', minShelfLifeDays: 2, maxShelfLifeDays: 14 },
    ] as never);
    renderNew();
    await userEvent.click(await screen.findByLabelText(/Fridge 0–5 °C · suggested 3 days/));
    vi.mocked(ShelfLifeApi.forCategory).mockResolvedValue([
      {
        groupName: 'Soft fruit',
        examples: 'chuối, banana',
        modes: [{ guideId: 31, storageMode: 'room', suggestedDays: 2, peerMedianDays: null, peerCount: 0 }],
      },
    ] as never);

    await userEvent.selectOptions(screen.getByLabelText(/^Category/), '2');

    expect(await screen.findByDisplayValue('Soft fruit')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: /shelf life/i })).toHaveTextContent('2 days');
  });

  it('falls back to the category range when it has no groups', async () => {
    vi.mocked(ShelfLifeApi.forCategory).mockResolvedValue([]);
    renderNew();

    expect(await screen.findByText('This category has no storage groups yet. It usually keeps 1–7 days.')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: /shelf life/i })).toHaveTextContent('7 days');
  });

  it("keeps an extended product's promise when editing without changes", async () => {
    vi.mocked(ProductApi.getMine).mockResolvedValue({
      id: 5,
      name: 'Rau muống',
      categoryId: 1,
      unit: 'bunch',
      price: 0.5,
      stock: 10,
      status: 'available',
      shelfLife: { guideId: 12, groupName: 'Leafy greens', storageMode: 'chilled', days: 5, suggestedDays: 3, extended: true },
    } as never);
    vi.mocked(ProductApi.update).mockResolvedValue({ id: 5, name: 'Rau muống', status: 'available' } as never);
    renderEdit();

    expect(await screen.findByLabelText(/I promise this still keeps well for 5 days/)).toBeChecked();
    await userEvent.click(screen.getByRole('button', { name: 'Save product' }));

    expect(ProductApi.update).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ shelfLifeDays: 5, shelfLifeGuideId: 12, acknowledgeLongerShelfLife: true }),
    );
  });

  it('asks for another group when the saved one is gone', async () => {
    vi.mocked(ProductApi.getMine).mockResolvedValue({
      id: 5,
      name: 'Rau muống',
      categoryId: 1,
      unit: 'bunch',
      price: 0.5,
      stock: 10,
      status: 'available',
      shelfLife: { guideId: 99, groupName: 'Old group', storageMode: 'room', days: 2, suggestedDays: 2, extended: false },
    } as never);
    renderEdit();

    expect(await screen.findByText('The group this product used is no longer offered. Pick another.')).toBeInTheDocument();
  });
```

Nhãn nút lưu là key `add` ("Add product") khi thêm và `save` ("Save product") khi sửa, trong `locales/en/FarmerProductForm.json`.

- [ ] **Step 3: Chạy test để thấy fail**

Run: `docker compose exec -T frontend sh -c 'npx vitest run src/pages/farmer/ProductForm/index.test.tsx'`
Expected: các test mới FAIL (không tìm thấy "Storage group", "One day more"…). 4 test cũ vẫn PASS.

- [ ] **Step 4: Viết `ShelfLifeField.tsx`**

```tsx
import { useTranslation } from 'react-i18next';
import type { ShelfLifeGroupDto, StorageMode } from '@/api-requests/shelf-life.requests';
import { Banner } from '@/components/ui/banner';
import { Checkbox } from '@/components/ui/checkbox';
import { LoadError } from '@/components/ui/data-state';
import { SelectField } from '@/components/ui/input';
import { extendedBy, maxShelfLifeDays } from '@/lib/shelfLife';

export type ShelfLifeFieldProps = {
  groups: ShelfLifeGroupDto[];
  loading: boolean;
  loadFailed: boolean;
  onRetry: () => void;
  /** The category's own range, shown when it has no groups yet. */
  categoryRange: { min: number; max: number } | null;
  groupName: string | null;
  storageMode: StorageMode;
  suggestedDays: number;
  peerMedianDays: number | null;
  days: number;
  acknowledged: boolean;
  /** The saved group is no longer offered: ask for another one. */
  groupGone: boolean;
  errors: { group?: string; mode?: string; days?: string; ack?: string };
  onGroup: (groupName: string) => void;
  onMode: (mode: StorageMode, suggestedDays: number) => void;
  onDays: (days: number) => void;
  onAcknowledge: (value: boolean) => void;
};

const MODES: StorageMode[] = ['room', 'chilled'];

/**
 * FR-120, FR-121 — the product form's storage block (spec §4.2): the group, how it is kept (each way with its
 * suggested days), a stepper capped at twice the suggestion, and the promise a longer shelf life needs.
 */
const ShelfLifeField = ({
  groups,
  loading,
  loadFailed,
  onRetry,
  categoryRange,
  groupName,
  storageMode,
  suggestedDays,
  peerMedianDays,
  days,
  acknowledged,
  groupGone,
  errors,
  onGroup,
  onMode,
  onDays,
  onAcknowledge,
}: ShelfLifeFieldProps) => {
  const { t } = useTranslation('FarmerProductForm');
  const { t: tc } = useTranslation();

  if (loading) {
    return (
      <p role="status" className="text-ink-muted text-small md:col-span-2">
        {t('shelfLife.loading')}
      </p>
    );
  }
  if (loadFailed) {
    return (
      <div className="md:col-span-2">
        <LoadError noun={t('shelfLife.noun')} onRetry={onRetry} />
      </div>
    );
  }

  const group = groups.find((g) => g.groupName === groupName);
  // No groups: both ways of keeping are offered with the category's upper bound as the suggestion.
  const modes = group
    ? group.modes.map((m) => ({ mode: m.storageMode, suggested: m.suggestedDays }))
    : MODES.map((mode) => ({ mode, suggested: suggestedDays }));
  const max = maxShelfLifeDays(suggestedDays);
  const longer = extendedBy(days, suggestedDays);
  const storageLabel = tc(`storageMode.${storageMode}`);

  return (
    <div className="flex flex-col gap-4 md:col-span-2">
      {groups.length > 0 ? (
        <SelectField
          id="shelf-group"
          label={t('shelfLife.group')}
          required
          value={groupName ?? ''}
          onChange={(e) => onGroup(e.target.value)}
          options={groups.map((g) => ({ value: g.groupName, label: g.groupName }))}
          hint={group?.examples ? t('shelfLife.examples', { examples: group.examples }) : undefined}
          error={errors.group ?? (groupGone ? t('shelfLife.groupGone') : undefined)}
        />
      ) : (
        categoryRange && (
          <p className="text-ink-muted text-small">
            {t('shelfLife.fallback', { min: categoryRange.min, max: categoryRange.max })}
          </p>
        )
      )}

      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="text-small mb-1 p-0 font-bold">{t('shelfLife.storage')}</legend>
        <div className="flex flex-wrap gap-2">
          {modes.map(({ mode, suggested }) => (
            <label
              key={mode}
              className="border-line-strong has-[:checked]:bg-brand has-[:checked]:text-on-brand has-[:focus-visible]:outline-focus inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-sm border-[1.5px] px-3 has-[:focus-visible]:outline-2"
            >
              <input
                type="radio"
                name="storage-mode"
                className="sr-only"
                checked={storageMode === mode}
                onChange={() => onMode(mode, suggested)}
              />
              {`${tc(`storageMode.${mode}`)} · ${t('shelfLife.suggested', { count: suggested })}`}
            </label>
          ))}
        </div>
        {errors.mode && <span className="text-danger text-[13px] font-bold">{errors.mode}</span>}
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <span className="text-small font-bold">{t('shelfLife.label')}</span>
        <div className="flex flex-wrap items-center gap-3">
          <span className="border-line-strong bg-surface-raised inline-flex items-center rounded-sm border-[1.5px]">
            <button
              type="button"
              aria-label={t('shelfLife.decrease')}
              disabled={days <= 1}
              onClick={() => onDays(days - 1)}
              className="disabled:text-line-strong grid size-10 cursor-pointer place-items-center rounded-sm bg-transparent text-[20px] leading-none disabled:cursor-not-allowed"
            >
              −
            </button>
            <output
              role="status"
              aria-label={t('shelfLife.label')}
              className="min-w-16 text-center font-bold tabular-nums"
            >
              {t('shelfLife.days', { count: days })}
            </output>
            <button
              type="button"
              aria-label={t('shelfLife.increase')}
              disabled={days >= max}
              onClick={() => onDays(days + 1)}
              className="disabled:text-line-strong grid size-10 cursor-pointer place-items-center rounded-sm bg-transparent text-[20px] leading-none disabled:cursor-not-allowed"
            >
              +
            </button>
          </span>
          {peerMedianDays != null && (
            <span className="text-ink-muted text-small">{t('shelfLife.peers', { count: peerMedianDays })}</span>
          )}
        </div>
        {errors.days && <span className="text-danger text-[13px] font-bold">{errors.days}</span>}
        {days < suggestedDays && <span className="text-ink-muted text-[13px]">{t('shelfLife.shorter')}</span>}
      </div>

      {longer > 0 && (
        <Banner
          variant="warning"
          title={t('shelfLife.longerTitle', { count: longer, suggested: suggestedDays, storage: storageLabel })}
        >
          <Checkbox id="shelf-ack" checked={acknowledged} onChange={(e) => onAcknowledge(e.target.checked)}>
            {t('shelfLife.ackLabel', { days, storage: storageLabel })}
          </Checkbox>
          {errors.ack && <span className="text-danger block text-[13px] font-bold">{errors.ack}</span>}
        </Banner>
      )}
    </div>
  );
};

export default ShelfLifeField;
```

Nếu `SelectField` hiện chưa nhận `hint`/`error` thì đã có (xem `SelectFieldProps` trong `components/ui/input.tsx`). Nếu class `has-[:checked]:bg-brand` không có tác dụng trong Tailwind 4 của dự án, dùng cách tô nút đã chọn giống `components/DayChips.tsx`.

- [ ] **Step 5: Nối `ShelfLifeField` vào `index.tsx`**

1. Import `ShelfLifeApi, { type ShelfLifeGroupDto, type StorageMode } from '@/api-requests/shelf-life.requests'`, `ShelfLifeField from './ShelfLifeField'`, `{ extendedBy, matchGuideGroup, maxShelfLifeDays } from '@/lib/shelfLife'`. Bỏ import không còn dùng sau bước 6 (ví dụ `Banner`, nếu không còn chỗ khác dùng).

2. `FormState` thêm (giữ `shelfLife: number | ''`):

```ts
  /** Chosen storage group; null = the saved one, or the one matched from the name (derived below). */
  shelfGroup: string | null;
  /** Chosen way of keeping; null = derived from the group like shelfGroup. */
  storageMode: StorageMode | null;
  /** The promise for a longer shelf life (FR-121). */
  ackLonger: boolean;
```

`EMPTY` thêm `shelfGroup: null, storageMode: null, ackLonger: false`. `fromProduct` thêm `shelfGroup: null, storageMode: null, ackLonger: false` và đổi `shelfLife: ''`. Giá trị lưu được đọc từ `existing.shelfLife` ở bước 4.

3. `FormErrors` đổi thành `Partial<Record<'name' | 'cat' | 'price' | 'qty' | 'image' | 'shelfLife' | 'shelfGroup' | 'storageMode' | 'ackLonger', string>>`. `SERVER_FIELDS` thêm `shelfLifeGuideId: 'shelfGroup', storageMode: 'storageMode', acknowledgeLongerShelfLife: 'ackLonger'`.

4. Chuyển dòng `const categoryId = …` lên ngay sau `const setForm = …` (trước các `return` sớm, vì nó dùng trong hook), rồi thêm:

```ts
  const { state: guidesLoad, retry: retryGuides } = useRequest(`shelf-guides:${categoryId ?? 'none'}`, () =>
    categoryId == null ? Promise.resolve(NO_GROUPS) : ShelfLifeApi.forCategory(categoryId),
  );
  const guideGroups = guidesLoad.kind === 'ready' ? guidesLoad.data : NO_GROUPS;
```

với hằng ở đầu file: `const NO_GROUPS: ShelfLifeGroupDto[] = [];`.

5. Xoá khối `shelfLifeOutOfRange`. Sau các `return` sớm, tính giá trị hiệu lực. Mọi thứ đều suy ra từ state, không `setState` trong effect:

```ts
  // FR-121: what the form shows is derived — the Farmer's pick, else what was saved, else a match on the name.
  const saved = existing?.shelfLife;
  const untouched =
    form.shelfGroup == null &&
    form.storageMode == null &&
    form.shelfLife === '' &&
    (existing == null || categoryId === existing.categoryId);
  const savedGroup = untouched ? guideGroups.find((g) => g.groupName === saved?.groupName) : undefined;
  const group =
    guideGroups.find((g) => g.groupName === form.shelfGroup) ??
    savedGroup ??
    matchGuideGroup(form.name, guideGroups) ??
    guideGroups[0];
  const groupGone = untouched && saved?.guideId != null && guideGroups.length > 0 && savedGroup === undefined;
  const mode =
    group?.modes.find((m) => m.storageMode === form.storageMode) ??
    (untouched ? group?.modes.find((m) => m.storageMode === saved?.storageMode) : undefined) ??
    group?.modes[0];
  // No groups (the category has none yet): the category's upper bound is the suggestion, as on the server.
  const suggestedDays = mode ? mode.suggestedDays : (selectedCategory?.maxShelfLifeDays ?? 1);
  const storageMode: StorageMode = mode
    ? mode.storageMode
    : (form.storageMode ?? (untouched ? saved?.storageMode : undefined) ?? 'room');
  const days = form.shelfLife !== '' ? form.shelfLife : untouched && saved ? saved.days : suggestedDays;
  const acknowledged = form.ackLonger || (untouched && saved?.extended === true);
  const needsAck = extendedBy(days, suggestedDays) > 0 && !acknowledged;
```

6. Trong `validate()`: xoá kiểm tra cũ của `form.shelfLife`, thay bằng:

```ts
    if (days > maxShelfLifeDays(suggestedDays)) next.shelfLife = t('shelfLife.tooLong', { count: maxShelfLifeDays(suggestedDays) });
    if (needsAck) next.ackLonger = t('shelfLife.ackRequired');
```

7. Trong `save()`: đổi điều kiện `return` thành `if (Object.keys(found).length || categoryId == null) return;`, và `input` dùng:

```ts
      shelfLifeDays: days,
      shelfLifeGuideId: mode?.guideId,
      storageMode,
      acknowledgeLongerShelfLife: acknowledged,
```

8. Danh mục đổi thì đặt lại lựa chọn hạn dùng: `onChange={(e) => setForm({ categoryId: Number(e.target.value), shelfGroup: null, storageMode: null, shelfLife: '', ackLonger: false })}`.

9. Thay khối `<div className="flex flex-col gap-1.5">…<Field id="shelf-life" …/>…</div>` bằng:

```tsx
          <ShelfLifeField
            groups={guideGroups}
            loading={guidesLoad.kind === 'loading'}
            loadFailed={guidesLoad.kind === 'error'}
            onRetry={retryGuides}
            categoryRange={
              selectedCategory
                ? { min: selectedCategory.minShelfLifeDays, max: selectedCategory.maxShelfLifeDays }
                : null
            }
            groupName={group?.groupName ?? null}
            storageMode={storageMode}
            suggestedDays={suggestedDays}
            peerMedianDays={mode?.peerMedianDays ?? null}
            days={days}
            acknowledged={acknowledged}
            groupGone={groupGone}
            errors={{ group: errors.shelfGroup, mode: errors.storageMode, days: errors.shelfLife, ack: errors.ackLonger }}
            onGroup={(name) => setForm({ shelfGroup: name, storageMode: null, shelfLife: '', ackLonger: false })}
            onMode={(m, suggested) => setForm({ shelfGroup: group?.groupName ?? null, storageMode: m, shelfLife: suggested, ackLonger: false })}
            onDays={(n) => setForm({ shelfGroup: group?.groupName ?? null, storageMode, shelfLife: n })}
            onAcknowledge={(value) => setForm({ ackLonger: value })}
          />
```

10. Nút lưu bị khoá khi thiếu cam kết hoặc nhóm đang tải, kèm lý do (tìm `<Button type="submit"` trong file):

```tsx
            <Button
              type="submit"
              disabled={saving || needsAck || guidesLoad.kind === 'loading'}
              aria-describedby={needsAck ? 'save-blocked' : undefined}
            >
              {/* existing label unchanged */}
            </Button>
            {needsAck && (
              <span id="save-blocked" className="text-ink-muted text-[13px]">
                {t('shelfLife.saveBlocked')}
              </span>
            )}
```

- [ ] **Step 6: Chạy lại test form**

Run: `docker compose exec -T frontend sh -c 'npx vitest run src/pages/farmer/ProductForm/index.test.tsx'`
Expected: toàn bộ PASS, gồm 4 test cũ và 8 test mới.

- [ ] **Step 7: Kiểm tay trên trình duyệt**

Mở trang `/farmer/products/new` ở cổng frontend của stack bằng `farmer@marketlink.vn` / `Demo@1234` (cần seed ở Task 11; trước Task 11 danh mục chưa có nhóm nên form rơi vào nhánh dự phòng). Kiểm ở 375 px và 1440 px: không tràn ngang, radio bấm được bằng bàn phím (Tab rồi Space).

- [ ] **Step 8: Kiểm và commit**

```bash
docker compose exec -T frontend sh -c 'npx prettier --write src/pages/farmer/ProductForm src/locales && npx tsc -b && npx eslint src'
git add frontend/src/pages/farmer/ProductForm frontend/src/locales/*/FarmerProductForm.json
git commit -m "feat(FR-121): product form suggests shelf life by storage group and asks for a promise to go longer"
```

---

### Task 10: Mục "Storage groups" trong trang Admin Categories (FR-120)

**Files:**
- Create: `frontend/src/pages/admin/Categories/ShelfLifeGuides.tsx`, `frontend/src/pages/admin/Categories/ShelfLifeGuides.test.tsx`
- Modify: `frontend/src/pages/admin/Categories/index.tsx` (render component dưới khối bảng + form)
- Modify: `frontend/src/locales/*/AdminCategories.json` (10 file)

**Interfaces:**
- Consumes: Task 8 (`ShelfLifeApi.adminList/adminCreate/adminUpdate/adminDeactivate`, `ShelfLifeGuideDto`, `StorageMode`); `CategoryType` từ `api-requests/catalog.requests.ts`.
- Produces: `<ShelfLifeGuides categories={CategoryType[]} />`.

- [ ] **Step 1: Thêm key vào `AdminCategories.json` (10 ngôn ngữ)**

Bản `en` (khối `"guides"` ở cấp gốc):

```json
  "guides": {
    "title": "Storage groups",
    "intro": "Suggested shelf life per group and way of keeping. Farmers start from these numbers.",
    "category": "Category",
    "col": {
      "group": "Group",
      "examples": "Examples",
      "storage": "Kept",
      "days": "Suggested days",
      "daysFor": "Days for {{group}}",
      "status": "Status"
    },
    "status": {
      "on": "On",
      "off": "Off"
    },
    "action": {
      "save": "Save",
      "off": "Turn off",
      "on": "Turn on"
    },
    "form": {
      "title": "Add a group",
      "group": "Group name",
      "groupPlaceholder": "e.g. Leafy greens",
      "examples": "Examples",
      "examplesHint": "Comma-separated product words, in Vietnamese and English, used to pick the group from a product name.",
      "storage": "How it is kept",
      "days": "Suggested days",
      "submit": "Add group"
    },
    "empty": {
      "title": "No storage groups yet",
      "text": "Farmers in this category see the category's range until you add a group."
    },
    "noun": "storage groups",
    "error": {
      "nameRequired": "Give the group a name.",
      "days": "Enter a whole number from 1 to 365.",
      "taken": "This group already has that way of keeping."
    },
    "toast": {
      "added": "Group added.",
      "saved": "Group saved.",
      "off": "Group turned off.",
      "on": "Group turned on."
    }
  },
```

Bản `vi`:

```json
  "guides": {
    "title": "Nhóm bảo quản",
    "intro": "Hạn dùng gợi ý theo nhóm và cách bảo quản. Farmer bắt đầu từ các số này.",
    "category": "Danh mục",
    "col": {
      "group": "Nhóm",
      "examples": "Ví dụ",
      "storage": "Bảo quản",
      "days": "Số ngày gợi ý",
      "daysFor": "Số ngày cho {{group}}",
      "status": "Trạng thái"
    },
    "status": {
      "on": "Đang bật",
      "off": "Đã tắt"
    },
    "action": {
      "save": "Lưu",
      "off": "Tắt",
      "on": "Bật lại"
    },
    "form": {
      "title": "Thêm nhóm",
      "group": "Tên nhóm",
      "groupPlaceholder": "ví dụ: Leafy greens",
      "examples": "Ví dụ",
      "examplesHint": "Các từ chỉ sản phẩm, cách nhau bằng dấu phẩy, cả tiếng Việt lẫn tiếng Anh, dùng để tự chọn nhóm theo tên sản phẩm.",
      "storage": "Cách bảo quản",
      "days": "Số ngày gợi ý",
      "submit": "Thêm nhóm"
    },
    "empty": {
      "title": "Chưa có nhóm bảo quản",
      "text": "Farmer trong danh mục này sẽ thấy khoảng ngày của danh mục cho tới khi bạn thêm nhóm."
    },
    "noun": "nhóm bảo quản",
    "error": {
      "nameRequired": "Đặt tên cho nhóm.",
      "days": "Nhập số nguyên từ 1 đến 365.",
      "taken": "Nhóm này đã có cách bảo quản đó."
    },
    "toast": {
      "added": "Đã thêm nhóm.",
      "saved": "Đã lưu nhóm.",
      "off": "Đã tắt nhóm.",
      "on": "Đã bật lại nhóm."
    }
  },
```

8 ngôn ngữ còn lại dịch từ bản `en`.

- [ ] **Step 2: Viết test component**

```tsx
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, AxiosHeaders } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ShelfLifeGuides from './ShelfLifeGuides';
import ShelfLifeApi from '@/api-requests/shelf-life.requests';

vi.mock('@/api-requests/shelf-life.requests', () => ({
  default: { adminList: vi.fn(), adminCreate: vi.fn(), adminUpdate: vi.fn(), adminDeactivate: vi.fn() },
}));

const categories = [
  { id: 1, name: 'Vegetables', slug: 'vegetables', sortOrder: 1, isActive: true, count: 0, minShelfLifeDays: 1, maxShelfLifeDays: 7 },
];
const leafy = {
  id: 12,
  categoryId: 1,
  groupName: 'Leafy greens',
  examples: 'rau muống, lettuce',
  storageMode: 'chilled' as const,
  suggestedDays: 3,
  isActive: true,
};

beforeEach(() => {
  vi.mocked(ShelfLifeApi.adminList).mockResolvedValue([leafy]);
  vi.mocked(ShelfLifeApi.adminCreate).mockReset();
  vi.mocked(ShelfLifeApi.adminDeactivate).mockReset();
});

describe('ShelfLifeGuides', () => {
  it("lists the category's groups", async () => {
    render(<ShelfLifeGuides categories={categories} />);
    expect(await screen.findByText('Leafy greens')).toBeInTheDocument();
    expect(screen.getByText('Fridge 0–5 °C')).toBeInTheDocument();
  });

  it('adds a group', async () => {
    vi.mocked(ShelfLifeApi.adminCreate).mockResolvedValue({ ...leafy, id: 13, groupName: 'Roots and bulbs', storageMode: 'room', suggestedDays: 14 });
    render(<ShelfLifeGuides categories={categories} />);
    await screen.findByText('Leafy greens');

    await userEvent.type(screen.getByLabelText(/^Group name/), 'Roots and bulbs');
    await userEvent.selectOptions(screen.getByLabelText(/^How it is kept/), 'room');
    await userEvent.type(screen.getByLabelText(/^Suggested days/), '14');
    await userEvent.click(screen.getByRole('button', { name: 'Add group' }));

    expect(ShelfLifeApi.adminCreate).toHaveBeenCalledWith({
      categoryId: 1,
      groupName: 'Roots and bulbs',
      examples: '',
      storageMode: 'room',
      suggestedDays: 14,
    });
    expect(await screen.findByText('Roots and bulbs')).toBeInTheDocument();
  });

  it('says so when the group already has that way of keeping', async () => {
    vi.mocked(ShelfLifeApi.adminCreate).mockRejectedValue(
      new AxiosError('x', 'ERR', undefined, undefined, {
        status: 409,
        statusText: '',
        headers: {},
        config: { headers: new AxiosHeaders() },
        data: { success: false, error: { code: 'DUPLICATE_SHELF_LIFE_GUIDE', details: [] }, message: 'x' },
      }),
    );
    render(<ShelfLifeGuides categories={categories} />);
    await screen.findByText('Leafy greens');

    await userEvent.type(screen.getByLabelText(/^Group name/), 'Leafy greens');
    await userEvent.selectOptions(screen.getByLabelText(/^How it is kept/), 'chilled');
    await userEvent.type(screen.getByLabelText(/^Suggested days/), '3');
    await userEvent.click(screen.getByRole('button', { name: 'Add group' }));

    expect(await screen.findByText('This group already has that way of keeping.')).toBeInTheDocument();
  });

  it('turns a group off', async () => {
    vi.mocked(ShelfLifeApi.adminDeactivate).mockResolvedValue(undefined);
    render(<ShelfLifeGuides categories={categories} />);
    const row = (await screen.findByText('Leafy greens')).closest('tr')!;

    await userEvent.click(within(row).getByRole('button', { name: 'Turn off' }));

    expect(ShelfLifeApi.adminDeactivate).toHaveBeenCalledWith(12);
    expect(await within(row).findByText('Off')).toBeInTheDocument();
  });

  it('shows the empty state for a category without groups', async () => {
    vi.mocked(ShelfLifeApi.adminList).mockResolvedValue([]);
    render(<ShelfLifeGuides categories={categories} />);
    expect(await screen.findByText('No storage groups yet')).toBeInTheDocument();
  });
});
```

`Helper.getErrorCode` đọc `response.data.error.code`, đúng dạng `data` dựng trong test trên.

- [ ] **Step 3: Chạy test để thấy fail**

Run: `docker compose exec -T frontend sh -c 'npx vitest run src/pages/admin/Categories/ShelfLifeGuides.test.tsx'`
Expected: FAIL, `Failed to resolve import "./ShelfLifeGuides"`.

- [ ] **Step 4: Viết `ShelfLifeGuides.tsx`**

```tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CategoryType } from '@/api-requests/catalog.requests';
import ShelfLifeApi, { type ShelfLifeGuideDto, type StorageMode } from '@/api-requests/shelf-life.requests';
import MarketCardSkeleton from '@/components/MarketCardSkeleton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataState, LoadError } from '@/components/ui/data-state';
import { Field, SelectField } from '@/components/ui/input';
import { Table, type TableColumn } from '@/components/ui/table';
import useRequest from '@/hooks/useRequest';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';

const NO_GUIDES: ShelfLifeGuideDto[] = [];
const MODES: StorageMode[] = ['room', 'chilled'];
type NewGuide = { groupName: string; examples: string; storageMode: StorageMode; days: string };
const EMPTY_GUIDE: NewGuide = { groupName: '', examples: '', storageMode: 'room', days: '' };

/**
 * FR-120 — the storage groups of one category: each row is a group kept one way, with the suggested shelf life the
 * product form starts from. Rows are turned off, never deleted, so products keep their saved numbers.
 */
const ShelfLifeGuides = ({ categories }: { categories: CategoryType[] }) => {
  const { t } = useTranslation('AdminCategories');
  const { t: tc } = useTranslation();
  const [pickedCategory, setPickedCategory] = useState<number | null>(null);
  const categoryId = pickedCategory ?? categories[0]?.id ?? null;
  const { state, retry, mutate } = useRequest(`admin-shelf-guides:${categoryId ?? 'none'}`, () =>
    categoryId == null ? Promise.resolve(NO_GUIDES) : ShelfLifeApi.adminList(categoryId),
  );
  const guides = state.kind === 'ready' ? state.data : NO_GUIDES;
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState<number | null>(null);
  const [form, setForm] = useState<NewGuide>(EMPTY_GUIDE);
  const [errors, setErrors] = useState<{ groupName?: string; days?: string }>({});

  const replace = (saved: ShelfLifeGuideDto) => mutate((list) => list.map((g) => (g.id === saved.id ? saved : g)));

  const inputOf = (g: ShelfLifeGuideDto, patch: Partial<ShelfLifeGuideDto> = {}) => ({
    categoryId: g.categoryId,
    groupName: g.groupName,
    examples: g.examples,
    storageMode: g.storageMode,
    suggestedDays: g.suggestedDays,
    ...patch,
  });

  const saveDays = async (g: ShelfLifeGuideDto) => {
    const days = Number(drafts[g.id] ?? g.suggestedDays);
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      Notification.error({ text: t('guides.error.days') });
      return;
    }
    setBusyId(g.id);
    try {
      replace(await ShelfLifeApi.adminUpdate(g.id, inputOf(g, { suggestedDays: days })));
      Notification.success({ text: t('guides.toast.saved') });
    } catch (error) {
      Notification.error({ text: Helper.getErrorMessage(error, tc('errors.network')) });
    } finally {
      setBusyId(null);
    }
  };

  const toggle = async (g: ShelfLifeGuideDto) => {
    setBusyId(g.id);
    try {
      if (g.isActive) {
        await ShelfLifeApi.adminDeactivate(g.id);
        replace({ ...g, isActive: false });
        Notification.success({ text: t('guides.toast.off') });
      } else {
        replace(await ShelfLifeApi.adminUpdate(g.id, { ...inputOf(g), active: true }));
        Notification.success({ text: t('guides.toast.on') });
      }
    } catch (error) {
      Notification.error({ text: Helper.getErrorMessage(error, tc('errors.network')) });
    } finally {
      setBusyId(null);
    }
  };

  const add = async () => {
    const days = Number(form.days);
    const next: typeof errors = {};
    if (!form.groupName.trim()) next.groupName = t('guides.error.nameRequired');
    if (!Number.isInteger(days) || days < 1 || days > 365) next.days = t('guides.error.days');
    setErrors(next);
    if (Object.keys(next).length || categoryId == null) return;
    setBusyId(0);
    try {
      const created = await ShelfLifeApi.adminCreate({
        categoryId,
        groupName: form.groupName.trim(),
        examples: form.examples.trim(),
        storageMode: form.storageMode,
        suggestedDays: days,
      });
      mutate((list) => [...list, created]);
      setForm(EMPTY_GUIDE);
      Notification.success({ text: t('guides.toast.added') });
    } catch (error) {
      if (Helper.getErrorCode(error) === 'DUPLICATE_SHELF_LIFE_GUIDE') setErrors({ groupName: t('guides.error.taken') });
      else Notification.error({ text: Helper.getErrorMessage(error, tc('errors.network')) });
    } finally {
      setBusyId(null);
    }
  };

  const columns: TableColumn<ShelfLifeGuideDto>[] = [
    { key: 'group', label: t('guides.col.group'), render: (g) => <b>{g.groupName}</b> },
    { key: 'examples', label: t('guides.col.examples'), render: (g) => <span className="text-small">{g.examples}</span> },
    { key: 'storage', label: t('guides.col.storage'), render: (g) => tc(`storageMode.${g.storageMode}`) },
    {
      key: 'days',
      label: t('guides.col.days'),
      align: 'num',
      render: (g) => (
        <Field
          id={`guide-days-${g.id}`}
          label={t('guides.col.daysFor', { group: g.groupName })}
          hideLabel
          type="number"
          value={drafts[g.id] ?? String(g.suggestedDays)}
          onChange={(e) => setDrafts({ ...drafts, [g.id]: e.target.value })}
        />
      ),
    },
    {
      key: 'status',
      label: t('guides.col.status'),
      render: (g) => (g.isActive ? t('guides.status.on') : t('guides.status.off')),
    },
    {
      key: 'action',
      label: '',
      align: 'actions',
      render: (g) => (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => void saveDays(g)} disabled={busyId === g.id}>
            {t('guides.action.save')}
          </Button>
          <Button variant={g.isActive ? 'danger' : 'secondary'} size="sm" onClick={() => void toggle(g)} disabled={busyId === g.id}>
            {g.isActive ? t('guides.action.off') : t('guides.action.on')}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <section aria-labelledby="shelf-guides-title" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="shelf-guides-title" className="text-h2">
            {t('guides.title')}
          </h2>
          <p className="text-body max-w-160">{t('guides.intro')}</p>
        </div>
        <SelectField
          id="guides-category"
          label={t('guides.category')}
          value={categoryId == null ? '' : String(categoryId)}
          onChange={(e) => {
            setPickedCategory(Number(e.target.value));
            setDrafts({});
          }}
          options={categories.map((c) => ({ value: String(c.id), label: c.name }))}
        />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {state.kind === 'loading' ? (
          <MarketCardSkeleton count={2} />
        ) : state.kind === 'error' ? (
          <LoadError noun={t('guides.noun')} onRetry={retry} />
        ) : guides.length ? (
          <Table caption={t('guides.title')} columns={columns} rows={guides} />
        ) : (
          <DataState title={t('guides.empty.title')} text={t('guides.empty.text')} />
        )}

        <Card
          as="form"
          className="flex flex-col gap-4 self-start p-6"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void add();
          }}
        >
          <h3 className="text-h3">{t('guides.form.title')}</h3>
          <Field
            id="guide-group"
            label={t('guides.form.group')}
            required
            placeholder={t('guides.form.groupPlaceholder')}
            value={form.groupName}
            onChange={(e) => setForm({ ...form, groupName: e.target.value })}
            error={errors.groupName}
          />
          <Field
            id="guide-examples"
            label={t('guides.form.examples')}
            hint={t('guides.form.examplesHint')}
            value={form.examples}
            onChange={(e) => setForm({ ...form, examples: e.target.value })}
          />
          <SelectField
            id="guide-storage"
            label={t('guides.form.storage')}
            required
            value={form.storageMode}
            onChange={(e) => setForm({ ...form, storageMode: e.target.value as StorageMode })}
            options={MODES.map((m) => ({ value: m, label: tc(`storageMode.${m}`) }))}
          />
          <Field
            id="guide-days"
            label={t('guides.form.days')}
            required
            type="number"
            value={form.days}
            onChange={(e) => setForm({ ...form, days: e.target.value })}
            error={errors.days}
          />
          <Button type="submit" disabled={busyId === 0 || categoryId == null}>
            {t('guides.form.submit')}
          </Button>
        </Card>
      </div>
    </section>
  );
};

export default ShelfLifeGuides;
```

`Card as="form"` đã được dùng như vậy ở `pages/admin/Categories/index.tsx`.

- [ ] **Step 5: Gắn component vào trang Categories**

Trong `frontend/src/pages/admin/Categories/index.tsx`: import `ShelfLifeGuides from './ShelfLifeGuides'`, và render ngay sau thẻ đóng của khối `<div className="grid flex-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">…</div>` (trước `<Dialog …>`):

```tsx
      {load.kind === 'ready' && categories.length > 0 && <ShelfLifeGuides categories={categories} />}
```

- [ ] **Step 6: Chạy lại test**

Run: `docker compose exec -T frontend sh -c 'npx vitest run src/pages/admin/Categories'`
Expected: `ShelfLifeGuides.test.tsx` 5 test PASS; các test khác của thư mục (nếu có) vẫn PASS.

- [ ] **Step 7: Kiểm và commit**

```bash
docker compose exec -T frontend sh -c 'npx prettier --write src/pages/admin/Categories src/locales && npx tsc -b && npx eslint src'
git add frontend/src/pages/admin/Categories frontend/src/locales/*/AdminCategories.json
git commit -m "feat(FR-120): admins manage storage groups under each category"
```

---

### Task 11: Hạn dùng ở trang sản phẩm và trang chi tiết đơn (FR-121)

**Files:**
- Create: `frontend/src/pages/public/ProductDetail/ShelfLifeDetails.tsx`, `frontend/src/pages/public/ProductDetail/ShelfLifeDetails.test.tsx`
- Modify: `frontend/src/pages/public/ProductDetail/index.tsx` (dòng `details.shelfLife` trong `<dl>`)
- Modify: `frontend/src/pages/customer/OrderDetail/index.tsx` (trong `order.items.map`)
- Modify: `frontend/src/pages/farmer/OrderDetail/index.tsx` (cột `key: 'n'` của `columns`)
- Modify: `frontend/src/locales/*/ProductDetail.json` (10 file)

**Interfaces:**
- Consumes: Task 8 (`ShelfLifeDto`, `BestBeforeLine`, `OrderItemDto.bestBefore/storageMode`), Task 6 (`ProductDetailDto.shelfLife`).
- Produces: `<ShelfLifeDetails shelfLife={ShelfLifeDto | null | undefined} fallbackDays={number} />`.

- [ ] **Step 1: Sửa `ProductDetail.json` (10 ngôn ngữ)**

Trong khối `details`: đổi giá trị `shelfLife` thành "Shelf life" / "Hạn dùng", xoá `shelfLifeValue_one` và `shelfLifeValue_other`, thêm:

`en`:

```json
    "shelfLifeLine_one": "{{storage}} · good for {{count}} day from pickup",
    "shelfLifeLine_other": "{{storage}} · good for {{count}} days from pickup",
    "shelfLifePromise": "The stall promises {{days}} days (usually {{suggested}})."
```

`vi`:

```json
    "shelfLifeLine_one": "{{storage}} · dùng tốt {{count}} ngày kể từ ngày nhận",
    "shelfLifeLine_other": "{{storage}} · dùng tốt {{count}} ngày kể từ ngày nhận",
    "shelfLifePromise": "Sạp cam kết {{days}} ngày (thường gặp {{suggested}} ngày)."
```

8 ngôn ngữ còn lại dịch từ bản `en`.

- [ ] **Step 2: Viết test `ShelfLifeDetails`**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ShelfLifeDetails from './ShelfLifeDetails';

describe('ShelfLifeDetails', () => {
  it('says how it is kept and for how long', () => {
    render(
      <ShelfLifeDetails
        shelfLife={{ guideId: 12, groupName: 'Leafy greens', storageMode: 'chilled', days: 3, suggestedDays: 3, extended: false }}
        fallbackDays={3}
      />,
    );
    expect(screen.getByText('Fridge 0–5 °C · good for 3 days from pickup')).toBeInTheDocument();
    expect(screen.queryByText(/The stall promises/)).not.toBeInTheDocument();
  });

  it("names the stall's own promise when it went longer", () => {
    render(
      <ShelfLifeDetails
        shelfLife={{ guideId: 12, groupName: 'Leafy greens', storageMode: 'chilled', days: 5, suggestedDays: 3, extended: true }}
        fallbackDays={5}
      />,
    );
    expect(screen.getByText('The stall promises 5 days (usually 3).')).toBeInTheDocument();
  });

  it('falls back to room temperature and the listed days without a block', () => {
    render(<ShelfLifeDetails shelfLife={null} fallbackDays={2} />);
    expect(screen.getByText('Room temperature · good for 2 days from pickup')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Chạy test để thấy fail**

Run: `docker compose exec -T frontend sh -c 'npx vitest run src/pages/public/ProductDetail/ShelfLifeDetails.test.tsx'`
Expected: FAIL, `Failed to resolve import "./ShelfLifeDetails"`.

- [ ] **Step 4: Viết `ShelfLifeDetails.tsx`**

```tsx
import { useTranslation } from 'react-i18next';
import type { ShelfLifeDto } from '@/api-requests/shelf-life.requests';

type ShelfLifeDetailsProps = { shelfLife?: ShelfLifeDto | null; fallbackDays: number };

/**
 * FR-121 — the product page's shelf-life line: how it is kept and for how many days from pickup, plus the stall's
 * own promise when it set a longer time than the suggestion (spec §4.2).
 */
const ShelfLifeDetails = ({ shelfLife, fallbackDays }: ShelfLifeDetailsProps) => {
  const { t } = useTranslation('ProductDetail');
  const { t: tc } = useTranslation();
  const days = shelfLife?.days ?? fallbackDays;
  return (
    <>
      <span className="block">
        {t('details.shelfLifeLine', { count: days, storage: tc(`storageMode.${shelfLife?.storageMode ?? 'room'}`) })}
      </span>
      {shelfLife?.extended && shelfLife.suggestedDays != null && (
        <span className="text-ink-muted block text-[13px]">
          {t('details.shelfLifePromise', { days, suggested: shelfLife.suggestedDays })}
        </span>
      )}
    </>
  );
};

export default ShelfLifeDetails;
```

- [ ] **Step 5: Gắn vào 3 trang**

`pages/public/ProductDetail/index.tsx`: import `ShelfLifeDetails from './ShelfLifeDetails'`, thay dòng

```tsx
              <dd className="m-0">{t('details.shelfLifeValue', { count: p.shelfLifeDays })}</dd>
```

bằng

```tsx
              <dd className="m-0">
                <ShelfLifeDetails shelfLife={detail.shelfLife} fallbackDays={p.shelfLifeDays} />
              </dd>
```

`pages/customer/OrderDetail/index.tsx`: import `BestBeforeLine from '@/components/BestBeforeLine'`; trong `order.items.map`, ngay sau `<span className="text-small text-ink-muted">…items.line…</span>` thêm:

```tsx
                    <BestBeforeLine bestBefore={item.bestBefore} storageMode={item.storageMode} />
```

`pages/farmer/OrderDetail/index.tsx`: import `BestBeforeLine`; trong `render` của cột `key: 'n'`, ngay sau `<span …>{perUnit(i.unitPrice, i.unit)}</span>` thêm:

```tsx
          <BestBeforeLine bestBefore={i.bestBefore} storageMode={i.storageMode} />
```

- [ ] **Step 6: Chạy lại test**

Run: `docker compose exec -T frontend sh -c 'npx vitest run src/pages/public/ProductDetail src/pages/customer/OrderDetail src/pages/farmer/OrderDetail src/components/BestBeforeLine.test.tsx'`
Expected: toàn bộ PASS.

- [ ] **Step 7: Kiểm và commit**

```bash
docker compose exec -T frontend sh -c 'npx prettier --write src/pages/public/ProductDetail src/pages/customer/OrderDetail src/pages/farmer/OrderDetail src/locales && npx tsc -b && npx eslint src'
git add frontend/src/pages/public/ProductDetail frontend/src/pages/customer/OrderDetail \
  frontend/src/pages/farmer/OrderDetail frontend/src/locales/*/ProductDetail.json
git commit -m "feat(FR-121): customers see how a product is kept and until when each order line is good"
```

---

### Task 12: Seed demo, contract và kiểm toàn bộ (FR-120, FR-121)

**Files:**
- Modify: `db/seed.sql` (khối nhóm sau khối Categories; khối gán hạn dùng sau khối Products và sau lệnh ẩn "Sáp ong nguyên chất")
- Modify: `docs/api-contract.md` (§5, §7, §10)

**Interfaces:**
- Consumes: mọi task trước.
- Produces: 21 dòng `shelf_life_guides`; 51 sản phẩm demo có nhóm, trong đó đúng một sản phẩm kéo dài: "Rau muống" của `farmer@marketlink.vn` (Leafy greens, ngăn mát, 5 ngày so với gợi ý 3). Giai đoạn 2 dùng sản phẩm này cho báo hư mẫu.

- [ ] **Step 1: Thêm khối nhóm vào `db/seed.sql`**

Ngay sau khối `-- ---- Categories (FR-076) ----` (sau câu `INSERT INTO categories … ON DUPLICATE KEY UPDATE …;`):

```sql
-- ---- Shelf-life guides (FR-120, proposed) ----
-- 12 groups × the ways each may be kept = 21 rows. Days count from pickup, after common household
-- storage advice; the admin edits them under Categories. A group with no 'room' row cannot be sold
-- at room temperature. Examples mix Vietnamese and English product words for name matching.
INSERT INTO shelf_life_guides (category_id, group_name, examples, storage_mode, suggested_days)
SELECT c.id, x.group_name, x.examples, x.storage_mode, x.suggested_days
FROM (
      SELECT 'vegetables' AS slug, 'Leafy greens' AS group_name, 'rau muống, cải ngọt, cải xanh, xà lách, rau dền, mồng tơi, rau lang, cải kale, húng quế, rau răm, ngò gai, tía tô, diếp cá, rau thơm, water spinach, lettuce, kale, herbs' AS examples, 'room' AS storage_mode, 1 AS suggested_days
      UNION ALL SELECT 'vegetables', 'Leafy greens', 'rau muống, cải ngọt, cải xanh, xà lách, rau dền, mồng tơi, rau lang, cải kale, húng quế, rau răm, ngò gai, tía tô, diếp cá, rau thơm, water spinach, lettuce, kale, herbs', 'chilled', 3
      UNION ALL SELECT 'vegetables', 'Fruiting vegetables', 'cà chua, dưa leo, bí, mướp, ớt, đậu que, bông cải, tomato, cucumber, pumpkin, chili, broccoli', 'room', 3
      UNION ALL SELECT 'vegetables', 'Fruiting vegetables', 'cà chua, dưa leo, bí, mướp, ớt, đậu que, bông cải, tomato, cucumber, pumpkin, chili, broccoli', 'chilled', 7
      UNION ALL SELECT 'vegetables', 'Roots and bulbs', 'khoai lang, khoai tây, khoai môn, cà rốt, củ dền, củ cải, hành, tỏi, gừng, sả, sweet potato, carrot, ginger, lemongrass', 'room', 14
      UNION ALL SELECT 'vegetables', 'Roots and bulbs', 'khoai lang, khoai tây, khoai môn, cà rốt, củ dền, củ cải, hành, tỏi, gừng, sả, sweet potato, carrot, ginger, lemongrass', 'chilled', 21
      UNION ALL SELECT 'fruits', 'Soft fruit', 'chuối, xoài, đu đủ, ổi, dâu, nhãn, vải, chôm chôm, cà chua bi, ớt chuông, banana, mango, papaya, guava', 'room', 2
      UNION ALL SELECT 'fruits', 'Soft fruit', 'chuối, xoài, đu đủ, ổi, dâu, nhãn, vải, chôm chôm, cà chua bi, ớt chuông, banana, mango, papaya, guava', 'chilled', 5
      UNION ALL SELECT 'fruits', 'Thick-skinned fruit', 'bưởi, cam, quýt, dưa hấu, thơm, pomelo, orange, watermelon, pineapple', 'room', 7
      UNION ALL SELECT 'fruits', 'Thick-skinned fruit', 'bưởi, cam, quýt, dưa hấu, thơm, pomelo, orange, watermelon, pineapple', 'chilled', 14
      UNION ALL SELECT 'eggs_and_dairy', 'Eggs', 'trứng gà, trứng vịt, trứng cút, egg', 'room', 10
      UNION ALL SELECT 'eggs_and_dairy', 'Eggs', 'trứng gà, trứng vịt, trứng cút, egg', 'chilled', 21
      UNION ALL SELECT 'eggs_and_dairy', 'Fresh milk and yogurt', 'sữa tươi, sữa chua, phô mai, bơ lạt, milk, yogurt, cheese, butter', 'chilled', 5
      UNION ALL SELECT 'grains_beans_and_nuts', 'Dry grains, beans and nuts', 'gạo, đậu, đậu phộng, mè, mật ong, phấn hoa, sáp ong, rice, beans, peanuts, honey', 'room', 90
      UNION ALL SELECT 'grains_beans_and_nuts', 'Dry grains, beans and nuts', 'gạo, đậu, đậu phộng, mè, mật ong, phấn hoa, sáp ong, rice, beans, peanuts, honey', 'chilled', 180
      UNION ALL SELECT 'meat_and_poultry', 'Fresh meat and poultry', 'thịt heo, thịt bò, gà, vịt, pork, beef, chicken, duck', 'chilled', 2
      UNION ALL SELECT 'seafood', 'Fresh seafood', 'cá, tôm, mực, nghêu, fish, shrimp, squid, clams', 'chilled', 1
      UNION ALL SELECT 'mushrooms', 'Fresh mushrooms', 'nấm, mushroom', 'room', 1
      UNION ALL SELECT 'mushrooms', 'Fresh mushrooms', 'nấm, mushroom', 'chilled', 5
      UNION ALL SELECT 'baked_goods', 'Fresh bakery', 'bánh mì, bánh bao, bánh ngọt, bánh chuối, bánh quy, bông lan, bread, cake', 'room', 2
      UNION ALL SELECT 'baked_goods', 'Fresh bakery', 'bánh mì, bánh bao, bánh ngọt, bánh chuối, bánh quy, bông lan, bread, cake', 'chilled', 4
     ) x
JOIN categories c ON c.slug = x.slug
ON DUPLICATE KEY UPDATE examples = x.examples, suggested_days = x.suggested_days, is_active = TRUE;
```

- [ ] **Step 2: Thêm khối gán hạn dùng cho sản phẩm demo**

Ngay sau lệnh `UPDATE products … SET p.is_hidden = TRUE … 'Sáp ong nguyên chất';`:

```sql
-- ---- Shelf life of the demo products (FR-121, proposed) ----
-- Every demo product gets its storage group and way of keeping; days = the suggestion, except
-- 'Rau muống' of 'farmer@marketlink.vn', which the stall set longer (5 days against 3) with the
-- promise ticked — the one extended product the spoilage demo (phase 2) builds on.
UPDATE products p
JOIN (
      SELECT 'Rau muống' AS name, 'Leafy greens' AS group_name, 'chilled' AS storage_mode, 5 AS days
      UNION ALL SELECT 'Cải ngọt', 'Leafy greens', 'chilled', 3
      UNION ALL SELECT 'Xà lách xoong', 'Leafy greens', 'chilled', 3
      UNION ALL SELECT 'Rau dền', 'Leafy greens', 'chilled', 3
      UNION ALL SELECT 'Mồng tơi', 'Leafy greens', 'chilled', 3
      UNION ALL SELECT 'Rau lang', 'Leafy greens', 'chilled', 3
      UNION ALL SELECT 'Bưởi da xanh', 'Thick-skinned fruit', 'room', 7
      UNION ALL SELECT 'Cam sành', 'Thick-skinned fruit', 'room', 7
      UNION ALL SELECT 'Xoài cát Hoà Lộc', 'Soft fruit', 'room', 2
      UNION ALL SELECT 'Chuối sứ', 'Soft fruit', 'room', 2
      UNION ALL SELECT 'Ổi nữ hoàng', 'Soft fruit', 'chilled', 5
      UNION ALL SELECT 'Đu đủ', 'Soft fruit', 'room', 2
      UNION ALL SELECT 'Sữa tươi thanh trùng', 'Fresh milk and yogurt', 'chilled', 5
      UNION ALL SELECT 'Sữa chua nhà làm', 'Fresh milk and yogurt', 'chilled', 5
      UNION ALL SELECT 'Phô mai tươi', 'Fresh milk and yogurt', 'chilled', 5
      UNION ALL SELECT 'Bơ lạt', 'Fresh milk and yogurt', 'chilled', 5
      UNION ALL SELECT 'Khoai lang mật', 'Roots and bulbs', 'room', 14
      UNION ALL SELECT 'Cà rốt', 'Roots and bulbs', 'chilled', 21
      UNION ALL SELECT 'Củ dền', 'Roots and bulbs', 'chilled', 21
      UNION ALL SELECT 'Khoai môn', 'Roots and bulbs', 'room', 14
      UNION ALL SELECT 'Củ cải trắng', 'Roots and bulbs', 'chilled', 21
      UNION ALL SELECT 'Gừng tươi', 'Roots and bulbs', 'room', 14
      UNION ALL SELECT 'Húng quế', 'Leafy greens', 'chilled', 3
      UNION ALL SELECT 'Rau răm', 'Leafy greens', 'chilled', 3
      UNION ALL SELECT 'Ngò gai', 'Leafy greens', 'chilled', 3
      UNION ALL SELECT 'Sả cây', 'Roots and bulbs', 'room', 14
      UNION ALL SELECT 'Tía tô', 'Leafy greens', 'chilled', 3
      UNION ALL SELECT 'Diếp cá', 'Leafy greens', 'chilled', 3
      UNION ALL SELECT 'Bánh mì men tự nhiên', 'Fresh bakery', 'room', 2
      UNION ALL SELECT 'Bánh chuối nướng', 'Fresh bakery', 'room', 2
      UNION ALL SELECT 'Bánh quy bơ', 'Fresh bakery', 'room', 2
      UNION ALL SELECT 'Bánh bông lan trứng muối', 'Fresh bakery', 'chilled', 4
      UNION ALL SELECT 'Bánh mì đen', 'Fresh bakery', 'room', 2
      UNION ALL SELECT 'Xà lách lô lô', 'Leafy greens', 'chilled', 3
      UNION ALL SELECT 'Cải kale', 'Leafy greens', 'chilled', 3
      UNION ALL SELECT 'Cà chua bi', 'Soft fruit', 'chilled', 5
      UNION ALL SELECT 'Bông cải xanh', 'Fruiting vegetables', 'chilled', 7
      UNION ALL SELECT 'Ớt chuông', 'Soft fruit', 'chilled', 5
      UNION ALL SELECT 'Trứng gà thả vườn', 'Eggs', 'room', 10
      UNION ALL SELECT 'Trứng vịt', 'Eggs', 'room', 10
      UNION ALL SELECT 'Trứng cút', 'Eggs', 'room', 10
      UNION ALL SELECT 'Trứng gà ác', 'Eggs', 'room', 10
      UNION ALL SELECT 'Nấm bào ngư', 'Fresh mushrooms', 'chilled', 5
      UNION ALL SELECT 'Nấm mối đen', 'Fresh mushrooms', 'chilled', 5
      UNION ALL SELECT 'Nấm rơm', 'Fresh mushrooms', 'chilled', 5
      UNION ALL SELECT 'Nấm đông cô tươi', 'Fresh mushrooms', 'chilled', 5
      UNION ALL SELECT 'Nấm kim châm', 'Fresh mushrooms', 'chilled', 5
      UNION ALL SELECT 'Mật ong rừng tràm', 'Dry grains, beans and nuts', 'room', 90
      UNION ALL SELECT 'Phấn hoa', 'Dry grains, beans and nuts', 'room', 90
      UNION ALL SELECT 'Sáp ong nguyên chất', 'Dry grains, beans and nuts', 'room', 90
      UNION ALL SELECT 'Mật ong hoa nhãn', 'Dry grains, beans and nuts', 'room', 90
     ) x ON x.name = p.name
JOIN shelf_life_guides g
  ON g.category_id = p.category_id AND g.group_name = x.group_name AND g.storage_mode = x.storage_mode
SET p.shelf_life_guide_id = g.id,
    p.storage_mode = x.storage_mode,
    p.suggested_shelf_life_days = g.suggested_days,
    p.shelf_life_days = x.days,
    p.shelf_life_extended = (x.days > g.suggested_days),
    p.shelf_life_ack_at = IF(x.days > g.suggested_days, UTC_TIMESTAMP(), NULL);
```

- [ ] **Step 3: Nạp seed và kiểm dữ liệu**

Run: `make seed`, sau đó:

```bash
docker compose exec -T mysql sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -N -e "SELECT COUNT(*) FROM shelf_life_guides; SELECT COUNT(*) FROM products WHERE shelf_life_guide_id IS NOT NULL; SELECT name, shelf_life_days, suggested_shelf_life_days FROM products WHERE shelf_life_extended"'
```

Expected: `21`, `51`, và đúng một dòng `Rau muống  5  3`. Chạy `make seed` lần thứ hai và kiểm lại: kết quả không đổi (seed chạy lại được).

- [ ] **Step 4: Kiểm tay luồng chính**

Trên stack của worktree (`farmer@marketlink.vn`, `admin@marketlink.vn`, mật khẩu `Demo@1234`):
1. Admin → Categories: mục "Storage groups" hiện nhóm của Vegetables. Đổi số ngày một nhóm → Save → tải lại trang, số vẫn giữ.
2. Farmer → Products → sửa "Rau muống": form hiện Leafy greens · ngăn mát · 5 ngày, ô cam kết đã tick. Bấm − hai lần về 3 ngày thì cảnh báo biến mất.
3. Khách mở trang sản phẩm "Rau muống": dòng "Shelf life" ghi "Fridge 0–5 °C · good for 5 days from pickup" và "The stall promises 5 days (usually 3)."
4. Khách đặt một đơn "Rau muống" rồi mở trang chi tiết đơn: dưới món có "Good until end of <ngày nhận + 4> · Fridge 0–5 °C".

- [ ] **Step 5: Thêm dòng vào `docs/api-contract.md`**

Chỉ thêm, không sửa dòng cũ (LEAD đã duyệt các dòng này ở spec §6):
- §5 (Categories & Products), bảng endpoint, thêm sau dòng `POST/PUT/DELETE | /api/v1/admin/categories/{id}?`:

```markdown
| GET | `/api/v1/shelf-life-guides?categoryId=` | Farmer, Admin | FR-120: nhóm bảo quản đang bật của danh mục: `[{ groupName, examples, modes: [{ guideId, storageMode, suggestedDays, peerMedianDays, peerCount }] }]`; `peerMedianDays` là trung vị số ngày các sạp khác đặt, `null` khi chưa đủ 3 sản phẩm |
```

- §5, dưới dòng `POST | /api/v1/farmer/products`: ghi chú body thêm `shelfLifeGuideId` (bắt buộc khi danh mục có nhóm), `storageMode` (`room`/`chilled`), `acknowledgeLongerShelfLife` (bắt buộc `true` khi dài hơn gợi ý); lỗi 400 field `shelfLifeDays` / `acknowledgeLongerShelfLife` / `storageMode` / `shelfLifeGuideId`. `GET/POST/PUT` một sản phẩm của Farmer và `GET /api/v1/products/{id}` trả thêm `shelfLife: { guideId, groupName, storageMode, days, suggestedDays, extended }`.
- §7 (Orders): mỗi món trong `GET /api/v1/orders/{id}` thêm `bestBefore` (yyyy-MM-dd, `null` với đơn cũ), `storageMode`, `listPrice` (`null` khi không giảm giá).
- §10 (Admin), bảng endpoint, thêm:

```markdown
| GET/POST | `/api/v1/admin/shelf-life-guides` | FR-120: GET nhận `?categoryId=` (có cả nhóm đã tắt); body `{ categoryId, groupName, examples, storageMode, suggestedDays, active? }`; 409 `DUPLICATE_SHELF_LIFE_GUIDE` |
| PUT/DELETE | `/api/v1/admin/shelf-life-guides/{id}` | FR-120: sửa, hoặc tắt (xoá mềm); 404 `SHELF_LIFE_GUIDE_NOT_FOUND` |
```

- [ ] **Step 6: Chạy toàn bộ test**

Run: `make be-test`
Expected: `BUILD SUCCESS`, `Failures: 0, Errors: 0`. Nếu JVM test bị kill giữa chừng ("The forked VM terminated without properly saying goodbye"), đó là do thiếu RAM trong Docker, không phải test fail: tắt container frontend của stack này rồi chạy lại.

Run: `docker compose exec -T frontend sh -c 'npx prettier --check src && npx tsc -b && npx eslint src && npx vitest run'`
Expected: sạch và toàn bộ test PASS.

- [ ] **Step 7: Kiểm đủ key ở 10 ngôn ngữ**

```bash
python3 - <<'EOF'
import json, pathlib
root = pathlib.Path('frontend/src/locales')
def keys(d, p=''):
    out = set()
    for k, v in d.items():
        out |= keys(v, p + k + '.') if isinstance(v, dict) else {p + k}
    return out
for ns in ['common', 'FarmerProductForm', 'AdminCategories', 'ProductDetail']:
    base = keys(json.loads((root / 'en' / f'{ns}.json').read_text()))
    for lang in ['vi', 'zh', 'ja', 'ko', 'fr', 'es', 'de', 'th', 'id']:
        other = keys(json.loads((root / lang / f'{ns}.json').read_text()))
        missing, extra = base - other, other - base
        if missing or extra:
            print(ns, lang, 'missing', sorted(missing), 'extra', sorted(extra))
print('checked')
EOF
```

Expected: chỉ in `checked`. Riêng ngôn ngữ không có số nhiều, nếu i18next không cần `_one` thì vẫn giữ đủ key như bản `en`.

- [ ] **Step 8: Commit**

```bash
git add db/seed.sql docs/api-contract.md
git commit -m "chore(FR-120): seed the storage groups and demo shelf lives, document the new endpoints"
```

- [ ] **Step 9: Ghi chú cho PR (không push nếu chưa được phép)**

PR body (tiếng Anh) phải nêu:
- FR đề xuất FR-120, FR-121, chưa có trong `.ai/REQUIREMENTS.md` (QA/DOC thêm);
- bảng/cột mới (`shelf_life_guides`, 5 cột `products`, 6 cột `order_items`) để LEAD cập nhật `db/schema.sql` (R-02);
- các dòng contract đã thêm;
- lệnh seed và luồng kiểm tay ở Step 4;
- "đủ 7 điều kiện" của Definition of Done trong `CLAUDE.md`.

---

## Self-Review

1. **Độ phủ spec:**
   - §4.1 (bảng, dữ liệu mặc định, peer median, API admin) → Task 1, 3, 4, 10, 12.
   - §4.2 (form, mốc gợi ý, ngắn hơn, dài hơn + cam kết, trần, cột mới, lỗi server, hiển thị cho khách) → Task 5, 6, 9, 11. Khoá kéo dài để giai đoạn 2 (Ruling 6).
   - §4.3 (cột `order_items`, `best_before`, hiển thị dưới món) → Task 1, 7, 11.
   - §5 migration 1–3 và seed → Task 1, 12.
   - §6 các dòng của giai đoạn 1 → Task 12.
   - §8: nhóm bị tắt → Task 5, 9; đổi mốc không ảnh hưởng đơn cũ → Task 7 (chụp lúc đặt); đổi danh mục → Task 9; đơn cũ không có `best_before` → Task 7, 8.
   - §9: hàm thuần → Task 2, 8; MySQL → Task 1, 3, 6, 7; OrderService → Task 7; FE → Task 8–11.
2. **Không để trống:** không còn TBD/TODO, mỗi bước code có code đầy đủ. Tên getter, nhãn nút và dạng lỗi trong test đã được đối chiếu với code thật (`ApiResource`, `ErrorResource`, `Helper.getErrorCode`, `FarmerProductForm.json`).
3. **Tên thống nhất:** `applyShelfLife`, `ShelfLifeResource(guideId, groupName, storageMode, days, suggestedDays, extended)`, `OrderItemResource(…, bestBefore, storageMode, listPrice)`, `ShelfLifeApi.forCategory` được dùng giống nhau ở mọi task, và khớp `/private/tmp/claude-501/shelf/phase1-interfaces.md` mà giai đoạn 2 và 3 dựa vào.
4. **Review Focus:** mỗi dòng có test ở task sở hữu (Task 5, 8, 9).
