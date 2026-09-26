# MarketLink Core Commerce — Spec + Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: dùng `superpowers:subagent-driven-development` (khuyến nghị)
> hoặc `superpowers:executing-plans` để chạy plan này theo từng task. Mỗi bước dùng checkbox `- [ ]`.
> **Chạy đúng một task một lần. Task chưa xanh thì không sang task sau.**

**Goal:** Dựng toàn bộ nghiệp vụ thương mại còn thiếu của MarketLink — chợ, sản phẩm, slot nhận hàng,
đơn hàng, đánh giá, yêu thích, báo cáo — để 47 requirement MUST còn `TODO` trong `.ai/REQUIREMENTS.md`
chạy thật end-to-end trên UI đang có.

**Architecture:** Backend Spring Boot, mỗi nghiệp vụ là một module trong `com.techx.intervue.modules/`
theo đúng khuôn `modules/farmer` đang chạy. Database mở rộng bằng migration Flyway mới, cột đặt tên theo
`db/schema.sql` nhưng kiểu khoá chính/khoá ngoại theo migration thật (`BIGINT UNSIGNED`, PK tên `id`).
Frontend **không dựng lại màn hình nào** — 43 trang đang đọc `src/data/*.ts` sẽ đổi sang gọi
`src/api-requests/*.ts`, và lớp request này ánh xạ JSON của contract về đúng type FE hiện có.

**Tech Stack:** Spring Boot 4.1 · Java 25 · MySQL 8 · Flyway · JPA + `NamedParameterJdbcTemplate` · JWT ·
React 19 · Vite · TypeScript · Tailwind 4 · axios · Leaflet + OSM · i18next (10 ngôn ngữ).

**Spec:** phần **§S — Spec** ngay trong file này. Nguồn cấp trên của nó, đọc kèm khi cần:
`MarketLink End-to-End Web Solutions_SRS.pdf` (đề bài) · `.ai/REQUIREMENTS.md` (scope) ·
`docs/decisions.md` (D-01…D-13) · `docs/api-contract.md` (contract) · `db/schema.sql` (schema đích) ·
`docs/design-system/README.md` (UI) · `docs/prototype/` (bố cục màn hình).

---

## Global Constraints

Mọi task đều ngầm mang các ràng buộc dưới đây. Vi phạm một dòng bất kỳ = task trượt.

- **R-01** · Mỗi commit gắn ít nhất một FR-xxx: `feat(FR-030): ...`.
- **R-02** · **Không sửa** `db/schema.sql`, `docs/api-contract.md`, `docs/decisions.md`. Thấy cần đổi thì
  ghi vào phần "Đề xuất LEAD" ở cuối plan này, không tự sửa.
- **R-03** · Đổi DB chỉ qua migration mới `backend/src/main/resources/db/migration/V<yyyyMMdd><nnn>__<mo_ta>.sql`.
  **Không sửa migration đã merge.** Số thứ tự `<nnn>` tăng dần trong cùng ngày.
- **R-04** · SQL luôn tham số hoá. Chatbot: intent → câu SQL viết sẵn; LLM không bao giờ sinh SQL.
- **R-05** · BE và FE lệch nhau thì sửa bên sai, **không sửa contract**.
- **R-06** · Mọi endpoint có `{id}` phải kiểm tra quyền sở hữu; sai quyền → **403**.
  Chuyển trạng thái đơn sai thứ tự → **409** (không phải 400).
- **R-07** · Không làm tính năng ngoài `.ai/REQUIREMENTS.md`.
- **R-08** · `git branch --show-current` trước khi sửa file. Đang ở `main`/`dev` thì tạo nhánh từ
  `origin/dev` trước. Không commit/push/merge vào `main`/`dev`.
- **Base path** `/api/v1` · **path** kebab-case số nhiều · **field JSON** camelCase · **cột DB** snake_case
  · **ngày giờ** ISO 8601 · auth `Authorization: Bearer <accessToken>`.
- **Giá trị enum trong JSON giữ nguyên snake_case** (`sold_out`, `placed`). Chỉ *tên field* mới camelCase.
- **Envelope**: mọi response đi qua `ApiResource<T>`; danh sách phân trang là `PageResource<T>`
  `{ items, page, pageSize, total }`; `page` đếm **từ 1**.
- **Khoá ngoại tới `users` là `BIGINT UNSIGNED`** (khớp `users.id` thật), **không phải `INT`** như
  `db/schema.sql` viết. Khoá chính bảng mới đặt tên **`id`**, không phải `market_id`/`product_id`.
  Khoá ngoại giữa các bảng mới cũng `BIGINT UNSIGNED`.
- **Route public phải khai báo trong `SecurityConfig`**, nếu không Spring trả 401 dù contract ghi Public.
- **Tiền VND** `DECIMAL(10,2)` / `DECIMAL(12,2)`, hiển thị `₫`. Ngày `dd/MM/yyyy`, giờ 24h,
  timezone `Asia/Ho_Chi_Minh`, DATETIME lưu theo giờ local.
- **FE — copy UI không viết cứng trong TSX.** Key đặt trong `src/locales/en/<Thư mục trang>.json`,
  đọc bằng `useTranslation('<Thư mục trang>')`, rồi dịch đủ 10 ngôn ngữ (`en vi zh ja ko fr es de th id`).
- **FE — màu chỉ qua token** (`bg-surface`, `text-ink`, `bg-brand`…). Không hex, không inline style màu,
  không `bg-white`/`text-zinc-*` (palette Tailwind mặc định đã tắt). Component dùng class `ml-*`.
- **FE — không chép class `pt-*` từ prototype sang app.** Chúng không có định nghĩa trong app.
- **FE — mọi màn có dữ liệu phải đủ 4 trạng thái** loading / empty / error / có data (FR-084) và
  responsive 375 / 768 / 1440 px không tràn ngang (FR-080).
- **Tiền, đơn vị, ngày giờ đi qua `src/lib/format.ts`** (`vnd`, `perUnit`, `formatDate`, `formatClock`,
  `dayName`), không tự format.
- **Definition of Done (7 điều kiện)** — báo đủ 7, **không tự tick DONE** trong `.ai/REQUIREMENTS.md`:
  1. chạy đúng requirement trên `make up` · 2. đúng contract · 3. quyền kiểm ở server ·
  4. validation cả client và server · 5. đủ 4 trạng thái UI + responsive · 6. có test nghiệp vụ,
  `make be-test` và `make lint` xanh · 7. seed demo được tính năng đó.

---

## Review Focus

Năm nhóm đầu vào mà đề ngụ ý nhưng không task nào tự nhiên chạm tới. Mỗi dòng đã được gắn một test
nằm trong task sở hữu đoạn code đó — ghi rõ ở phần "Review-focus test" của task tương ứng.

1. **Hai khách đặt cùng lô hàng cuối cùng trong một khoảnh khắc.** Tồn kho phải trừ trong cùng
   transaction với khoá dòng; người thứ hai nhận **409**, không phải tồn âm. → Task **5.3**.
2. **Slot đầy bởi request song song.** `pickup_slots.booked_count` không được vượt `max_orders`
   kể cả khi hai đơn cùng chọn slot cuối. → Task **5.3**.
3. **Giám khảo đổi `{id}` trên URL.** Mọi endpoint đơn hàng, sản phẩm, review, favorite phải trả
   **403** khi tài nguyên không thuộc về người gọi — kể cả khi tài nguyên tồn tại. → Task **5.4**, **8.2**.
4. **Tài khoản admin bấm nút mua.** D-13: `POST /orders`, `/reviews`, `/favorites` phải trả **403**
   với JWT vai admin, dù FE có ẩn nút hay không. → Task **5.3**, **7.2**, **8.2**.
5. **Đơn của Farmer bị đình chỉ giữa chừng.** D-09: sản phẩm biến mất khỏi trang public và không
   nhận đơn mới, nhưng **đơn đang chạy vẫn đi hết vòng đời**. → Task **3.2**, **5.5**.

---

# §S — SPEC

## S.1 · Bài toán

Đề TechWiz 7 "MarketLink — eGreen Basket": nền tảng nối Farmer chợ phiên với khách mua.
Khách đặt trước (pre-order), **trả tiền khi tới lấy tại stall** — đề miễn trừ cổng thanh toán,
giao hàng, và xác thực danh tính/chứng nhận organic của Farmer.

Hiện trạng: khối xác thực, hồ sơ Farmer + duyệt Farmer, thông báo, thông cáo, chatbot đã có backend thật.
**Toàn bộ khối thương mại chưa có bảng nào trong database.** 43 trang frontend đang đọc dữ liệu tĩnh
copy từ prototype. Plan này lấp đúng khoảng đó.

## S.2 · Đang có thật (không làm lại)

| Khối | Bằng chứng |
|---|---|
| Đăng ký / đăng nhập / logout / quên + đặt lại / đổi mật khẩu / Google OAuth | `AuthController`, 15 endpoint |
| RBAC 3 vai, admin login tách riêng + MFA TOTP | `SecurityConfig`, `MfaController` |
| Nộp đơn Farmer + admin duyệt/từ chối/đình chỉ + lịch sử đơn | `modules/farmer`, migration `…007`…`…009`, `…26002`, `…26003` |
| Thông báo in-app + realtime STOMP + preferences + giờ yên tĩnh | `modules/notification`, migration `…012`, `…014` |
| Thông cáo toàn nền tảng | `AdminAnnouncementController`, migration `…013` |
| Chatbot intent → SQL viết sẵn | `modules/chat` (⚠️ xem S.6) |
| Chat người–người, achievements, settings/i18n | ngoài đề, giữ nguyên |
| Trang About, Contact có bản đồ, 4 trạng thái UI, responsive | `pages/public/*`, `components/ui/data-state.tsx` |

## S.3 · Phải dựng (47 MUST + 3 SHOULD)

Nhóm theo cụm thi công, cột "Cụm" trỏ tới phần plan bên dưới.

| Cụm | FR | Nội dung |
|---|---|---|
| C1 | FR-020 (một phần), 076, 010, 073, 012 | categories, markets, bản đồ chợ |
| C2 | FR-011, 060, 061, 014 | Farmer ở chợ, khung giờ, chợ ưa thích (phần market) |
| C3 | FR-020, 021, 022, 023, 062, 064, 074 | sản phẩm, tìm kiếm, lọc, kiểm duyệt |
| C4 | FR-032 (slot), 067 | slot nhận hàng, cutoff |
| C5 | FR-030…038, 065, 066, 042 | giỏ, đơn hàng, vòng đời, thông báo đơn |
| C6 | FR-037, 039, 063 | đặt lại, job auto-complete, template tồn kho tuần |
| C7 | FR-040, 041, 014 | yêu thích, restock alert |
| C8 | FR-050…053 | đánh giá và phản hồi |
| C9 | FR-068, 069, 070, 072, 075 | dashboard Farmer, dashboard + báo cáo Admin |
| C10 | FR-081 | form góp ý |
| C11 | FR-090…092, 100…102 | chatbot chạy thật, seed, bàn giao |

## S.4 · Quyết định thi công (mới — chỉ về cách code, không đụng D-01…D-13)

### S.4.1 · Kiểu khoá: theo migration thật, không theo `db/schema.sql`

`db/schema.sql` viết `user_id INT AUTO_INCREMENT`. Database thật có `users.id BIGINT UNSIGNED`
(migration `V20260923001`), và `farmer_profiles` đã theo đúng thế. Plan này giữ nguyên hướng đó:

- Khoá chính mọi bảng mới: `id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY`.
- Mọi khoá ngoại: `BIGINT UNSIGNED`.
- **Tên cột còn lại giữ nguyên `db/schema.sql`** (`market_name`, `stock_quantity`, `pickup_date`…),
  vì các câu SQL của chatbot bám vào chúng.
- Ngoại lệ đã có tiền lệ trong `V20260925007`, ghi lại ở đầu mỗi migration mới.

> Chatbot đang JOIN `p.product_id`, `f.farmer_id`, `m.market_id`. Sau khi đổi PK thành `id`, phải sửa
> `ChatKnowledgeRepository` — việc này nằm trong task **11.1**, không được quên.

### S.4.2 · Frontend: lớp ánh xạ trong `api-requests/`, không sửa type của trang

`src/types/*.ts` hiện mang hình dạng prototype (`MarketType.name`, `.days`, `.open`, `.stalls`), còn
contract trả `marketName`, `operatingDays`, `openingTime`, `farmerCount`. Hai cách:

- (a) đổi type theo contract → phải sửa 43 trang cùng lúc, mọi cụm đều vỡ cho tới khi xong hết;
- (b) **ánh xạ trong `api-requests/`** → mỗi trang chỉ đổi đúng một dòng import.

**Chốt (b).** Network vẫn đúng contract nên không vi phạm R-05; ánh xạ là chuyện nội bộ FE.
Mỗi file `*.requests.ts` xuất một hàm `toXxx(dto)` thuần, dễ test bằng mắt, và là chỗ duy nhất
biết hai hình dạng.

```ts
// src/api-requests/market.requests.ts — khuôn mẫu cho mọi cụm
import type { MarketType } from '@/types/market.types';

type MarketDto = {
  id: number; marketName: string; address: string; district?: string; city: string;
  latitude: number; longitude: number; openingTime: string; closingTime: string;
  operatingDays: number[]; farmerCount: number;
};

/** Contract (camelCase, docs/api-contract.md §3) → hình dạng mà các trang đang dùng. */
export const toMarket = (dto: MarketDto): MarketType => ({
  id: dto.id,
  name: dto.marketName,
  address: dto.address,
  district: dto.district ?? '',
  days: dto.operatingDays,
  open: dto.openingTime.slice(0, 5),
  close: dto.closingTime.slice(0, 5),
  lat: dto.latitude,
  lng: dto.longitude,
  stalls: dto.farmerCount,
});
```

### S.4.3 · Giỏ hàng ở client, không có bảng `carts`

Theo `docs/api-contract.md` §7: giỏ giữ trong `localStorage`. Server chỉ nhận lúc `POST /orders/preview`
và `POST /orders`, rồi tự tách theo Farmer (D-01). Không sinh bảng giỏ hàng, không sinh endpoint giỏ.

### S.4.4 · Seed là file SQL riêng, không phải migration

Flyway chạy ở mọi môi trường; seed demo không được chui vào production. Seed nằm ở `db/seed.sql`,
chạy bằng `make seed`. Đây cũng chính là file `.sql` mà mục 1.9 của đề bắt nộp.
Mỗi cụm **thêm phần của mình vào cuối `db/seed.sql`**, không viết file riêng.

### S.4.5 · `docs/ROADMAP_IMPLEMENT.md` có mô hình "phiên bán" — không dùng

Roadmap đề xuất bảng `selling_sessions`. `db/schema.sql` (LEAD, R-02) **không có bảng đó**: tồn kho nằm
ở `products.stock_quantity`, thời gian nhận nằm ở `farmer_operating_days` + `pickup_slots`.
Plan này theo `db/schema.sql`. Roadmap chỉ còn dùng để tham khảo thứ tự thi công.

## S.5 · Cây file

Mỗi module backend theo đúng khuôn `modules/farmer`:

```
backend/src/main/java/com/techx/intervue/modules/<tên>/
├── controllers/     <Tên>Controller.java, Admin<Tên>Controller.java, <Tên>ExceptionHandler.java
├── services/
│   ├── interfaces/  <Tên>ServiceInterface.java
│   └── impl/        <Tên>Service.java
├── repositories/    <Tên>Repository.java (JPA) + <Tên>QueryRepository.java (JdbcTemplate khi join nhiều)
├── entities/        <Tên>.java
├── requests/        record + jakarta.validation
├── resources/       record trả về
├── enums/
└── exceptions/
```

Module mới sinh ra trong plan này:

| Module | Trách nhiệm | Cụm |
|---|---|---|
| `modules/catalog` | `categories`, `markets`, `market_operating_days` | C1 |
| `modules/stall` | `farmer_markets`, `farmer_operating_days`, `pickup_slots` | C2, C4 |
| `modules/product` | `products`, `weekly_stock_templates` | C3, C6 |
| `modules/order` | `orders`, `order_items`, `order_status_history` | C5, C6 |
| `modules/review` | `reviews`, `review_responses` | C8 |
| `modules/favorite` | `favorites` | C7 |
| `modules/report` | không có bảng — chỉ truy vấn tổng hợp | C9 |
| `modules/feedback` | `feedbacks` | C10 |

Frontend, file mới:

```
frontend/src/api-requests/   catalog.requests.ts · stall.requests.ts · product.requests.ts
                             order.requests.ts · review.requests.ts · favorite.requests.ts
                             report.requests.ts · feedback.requests.ts
frontend/src/lib/cart.ts     giỏ hàng trong localStorage (S.4.3)
```

`frontend/src/data/*.ts` **xoá dần**: mỗi cụm xoá đúng phần mình đã thay. Task cuối cùng của mỗi cụm
kiểm tra không còn trang nào import phần đó nữa.

## S.6 · Chatbot đã có code nhưng chưa chạy được

`modules/chat` (FR-090…092) đã viết đủ: `IntentClassifier`, `ChatKnowledgeRepository` với SQL tham số hoá,
bảng `chat_messages` đã có migration. Nhưng SQL của nó JOIN `products`, `markets`, `categories`,
`farmer_markets`, `market_operating_days` — **những bảng chưa tồn tại**.

Nghĩa là: chatbot sẽ tự chạy được ngay sau cụm C3, chỉ cần sửa tên cột PK theo S.4.1.
Đừng viết lại nó. Task **11.1** chỉ sửa cột và thêm test tích hợp.

## S.7 · Ngoài phạm vi

Đề miễn trừ, ghi vào ReadMe phần Assumptions: cổng thanh toán · giao hàng/logistics · xác thực danh tính
hoặc chứng nhận organic của Farmer · multi-profile trong một tài khoản (D-08).

Nhóm tự thêm, **không làm thêm gì nữa trong plan này**: chat người–người, achievements/hạng,
MFA, Google OAuth, i18n 10 ngôn ngữ, avatar crop, trang Promote/Pricing của Farmer.

---

# §P — PLAN

**Cách chạy:** làm lần lượt C1 → C11. Trong một cụm, làm lần lượt các task. Sau mỗi task chạy đúng
lệnh ghi ở bước cuối; **đỏ thì sửa tại chỗ, không sang task sau**. Hết một cụm thì báo "đủ 7 điều kiện"
cho các FR của cụm đó và đợi QA/DOC tick.

**Nhánh:** mỗi cụm một nhánh từ `origin/dev`, đặt tên theo FR chính của cụm.
Ví dụ C1: `git switch -c feature/FR-073-markets-categories origin/dev`.

---

## Cụm C1 · Danh mục và chợ — FR-020 (phần category), 076, 010, 073, 012

**Kết quả cụm:** trang chủ, `/markets`, `/markets/:id`, bản đồ chợ và hai màn admin chạy bằng dữ liệu thật.

### Task 1.1: Migration — categories, markets, market_operating_days, farmer_markets

**Files:**
- Create: `backend/src/main/resources/db/migration/V20260926004__create_categories_markets.sql`

**Interfaces:**
- Produces: bảng `categories(id, name, slug, description, icon, sort_order, is_active)`;
  `markets(id, market_name, address, district, city, latitude, longitude, map_provider, opening_time,
  closing_time, image_url, is_active, created_at)`; `market_operating_days(id, market_id, day_of_week)`;
  `farmer_markets(id, farmer_id, market_id, stall_code, stall_latitude, stall_longitude, is_active)`.

- [ ] **Step 1: Viết migration**

```sql
-- FR-076, FR-073, FR-010, FR-012. Cột đặt tên theo db/schema.sql §3 và §4 (LEAD, R-02).
-- Khoá chính đặt tên `id` và kiểu BIGINT UNSIGNED để khớp users.id / farmer_profiles.id thật,
-- không theo `market_id INT` của schema.sql — cùng lý do đã ghi ở V20260925007.

CREATE TABLE categories (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(80) NOT NULL UNIQUE,
    slug        VARCHAR(80) NOT NULL UNIQUE,
    description VARCHAR(255) NULL,
    icon        VARCHAR(50) NULL,
    sort_order  INT NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_categories_active_sort (is_active, sort_order)
);

CREATE TABLE markets (
    id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    market_name  VARCHAR(150) NOT NULL,
    address      VARCHAR(255) NOT NULL,
    district     VARCHAR(100) NULL,
    city         VARCHAR(100) NOT NULL DEFAULT 'TP. Hồ Chí Minh',
    latitude     DECIMAL(10, 8) NOT NULL,
    longitude    DECIMAL(11, 8) NOT NULL,
    map_provider VARCHAR(30) NOT NULL DEFAULT 'osm',
    opening_time TIME NOT NULL,
    closing_time TIME NOT NULL,
    image_url    VARCHAR(255) NULL,
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_markets_city_active (city, is_active)
);

CREATE TABLE market_operating_days (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    market_id   BIGINT UNSIGNED NOT NULL,
    day_of_week TINYINT NOT NULL,
    CONSTRAINT fk_mod_market FOREIGN KEY (market_id) REFERENCES markets (id) ON DELETE CASCADE,
    UNIQUE KEY uq_market_day (market_id, day_of_week),
    CONSTRAINT ck_mod_day CHECK (day_of_week BETWEEN 0 AND 6)
);

-- FR-010 "view the list of Farmers present at each market". Không có bảng này thì trang chợ rỗng.
CREATE TABLE farmer_markets (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    farmer_id       BIGINT UNSIGNED NOT NULL,
    market_id       BIGINT UNSIGNED NOT NULL,
    stall_code      VARCHAR(30) NULL,
    stall_latitude  DECIMAL(10, 8) NULL,
    stall_longitude DECIMAL(11, 8) NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_fm_farmer FOREIGN KEY (farmer_id) REFERENCES farmer_profiles (id) ON DELETE CASCADE,
    CONSTRAINT fk_fm_market FOREIGN KEY (market_id) REFERENCES markets (id) ON DELETE CASCADE,
    UNIQUE KEY uq_farmer_market (farmer_id, market_id),
    INDEX idx_fm_market_active (market_id, is_active)
);
```

- [ ] **Step 2: Chạy migration và xác nhận bảng tồn tại**

```bash
make be-restart && make logs s=backend | tail -30
```
Chờ dòng `Successfully applied 1 migration`. Rồi:
```bash
make mysql
```
Trong shell: `SHOW TABLES LIKE '%market%';` — phải thấy `markets`, `market_operating_days`, `farmer_markets`.
`DESCRIBE markets;` — cột `id` phải là `bigint unsigned`.

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/resources/db/migration/V20260926004__create_categories_markets.sql
git commit -m "feat(FR-073): tables for categories, markets and farmer stalls"
```

---

### Task 1.2: Backend — categories (FR-076, FR-020)

**Files:**
- Create: `backend/src/main/java/com/techx/intervue/modules/catalog/entities/Category.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/catalog/repositories/CategoryRepository.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/catalog/requests/CategoryRequest.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/catalog/resources/CategoryResource.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/catalog/services/interfaces/CategoryServiceInterface.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/catalog/services/impl/CategoryService.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/catalog/controllers/CategoryController.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/catalog/controllers/AdminCategoryController.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/catalog/controllers/CatalogExceptionHandler.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/catalog/exceptions/CategoryNotFoundException.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/catalog/exceptions/DuplicateCategoryException.java`
- Modify: `backend/src/main/java/com/techx/intervue/config/SecurityConfig.java` — thêm `GET /api/v1/categories` vào whitelist
- Test: `backend/src/test/java/com/techx/intervue/modules/catalog/services/impl/CategoryServiceTest.java`

**Interfaces:**
- Produces:
  - `CategoryResource(Long id, String name, String slug, String description, String icon, int sortOrder, boolean isActive)`
  - `CategoryServiceInterface`:
    `List<CategoryResource> listActive()` ·
    `List<CategoryResource> listAll()` ·
    `CategoryResource create(CategoryRequest r)` ·
    `CategoryResource update(long id, CategoryRequest r)` ·
    `void deactivate(long id)`
  - Endpoint: `GET /api/v1/categories` (Public) · `GET|POST /api/v1/admin/categories` ·
    `PUT|DELETE /api/v1/admin/categories/{id}` (Admin)

- [ ] **Step 1: Viết test thất bại**

```java
package com.techx.intervue.modules.catalog.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.catalog.entities.Category;
import com.techx.intervue.modules.catalog.exceptions.CategoryNotFoundException;
import com.techx.intervue.modules.catalog.exceptions.DuplicateCategoryException;
import com.techx.intervue.modules.catalog.repositories.CategoryRepository;
import com.techx.intervue.modules.catalog.requests.CategoryRequest;
import com.techx.intervue.modules.catalog.resources.CategoryResource;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class CategoryServiceTest {

    private CategoryRepository repository;
    private CategoryService service;

    @BeforeEach
    void setUp() {
        repository = mock(CategoryRepository.class);
        service = new CategoryService(repository);
    }

    private static Category leafyGreens() {
        Category c = new Category();
        c.setId(1L);
        c.setName("Leafy greens");
        c.setSlug("leafy-greens");
        c.setSortOrder(1);
        c.setActive(true);
        return c;
    }

    @Test
    void createDerivesSlugFromName() {
        when(repository.existsBySlug("leafy-greens")).thenReturn(false);
        when(repository.save(any(Category.class))).thenAnswer(i -> i.getArgument(0));

        CategoryResource created = service.create(new CategoryRequest("Leafy greens", null, null, 1));

        assertThat(created.slug()).isEqualTo("leafy-greens");
        assertThat(created.isActive()).isTrue();
    }

    @Test
    void createStripsVietnameseMarksFromSlug() {
        when(repository.existsBySlug("rau-cu")).thenReturn(false);
        when(repository.save(any(Category.class))).thenAnswer(i -> i.getArgument(0));

        CategoryResource created = service.create(new CategoryRequest("Rau củ", null, null, 0));

        assertThat(created.slug()).isEqualTo("rau-cu");
    }

    @Test
    void createRejectsDuplicateSlug() {
        when(repository.existsBySlug("leafy-greens")).thenReturn(true);

        assertThatThrownBy(() -> service.create(new CategoryRequest("Leafy greens", null, null, 1)))
                .isInstanceOf(DuplicateCategoryException.class);
        verify(repository, never()).save(any());
    }

    @Test
    void deactivateKeepsTheRowSoOldProductsStillResolve() {
        Category c = leafyGreens();
        when(repository.findById(1L)).thenReturn(Optional.of(c));

        service.deactivate(1L);

        assertThat(c.isActive()).isFalse();
        verify(repository).save(c);
    }

    @Test
    void updateOnMissingCategoryThrows() {
        when(repository.findById(77L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.update(77L, new CategoryRequest("X", null, null, 0)))
                .isInstanceOf(CategoryNotFoundException.class);
    }

    @Test
    void listActiveOrdersBySortOrderThenName() {
        Category fruit = leafyGreens();
        fruit.setId(2L);
        fruit.setName("Fruit");
        fruit.setSlug("fruit");
        fruit.setSortOrder(0);
        when(repository.findByActiveTrueOrderBySortOrderAscNameAsc()).thenReturn(List.of(fruit, leafyGreens()));

        List<CategoryResource> list = service.listActive();

        assertThat(list).extracting(CategoryResource::slug).containsExactly("fruit", "leafy-greens");
    }
}
```

- [ ] **Step 2: Chạy test, xác nhận đỏ**

```bash
make be-test
```
Kỳ vọng: không compile được — `CategoryService` chưa tồn tại.

- [ ] **Step 3: Viết entity, repository, request, resource**

```java
// entities/Category.java
package com.techx.intervue.modules.catalog.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "categories")
@Getter
@Setter
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(nullable = false, unique = true)
    private String slug;

    private String description;

    private String icon;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;
}
```

```java
// repositories/CategoryRepository.java
package com.techx.intervue.modules.catalog.repositories;

import com.techx.intervue.modules.catalog.entities.Category;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoryRepository extends JpaRepository<Category, Long> {
    boolean existsBySlug(String slug);

    List<Category> findByActiveTrueOrderBySortOrderAscNameAsc();

    List<Category> findAllByOrderBySortOrderAscNameAsc();
}
```

```java
// requests/CategoryRequest.java
package com.techx.intervue.modules.catalog.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record CategoryRequest(
        @NotBlank(message = "Category name is required.") @Size(max = 80) String name,
        @Size(max = 255) String description,
        @Size(max = 50) String icon,
        @PositiveOrZero int sortOrder) {}
```

```java
// resources/CategoryResource.java
package com.techx.intervue.modules.catalog.resources;

public record CategoryResource(
        Long id, String name, String slug, String description, String icon, int sortOrder, boolean isActive) {}
```

- [ ] **Step 4: Viết service**

```java
// services/impl/CategoryService.java
package com.techx.intervue.modules.catalog.services.impl;

import com.techx.intervue.modules.catalog.entities.Category;
import com.techx.intervue.modules.catalog.exceptions.CategoryNotFoundException;
import com.techx.intervue.modules.catalog.exceptions.DuplicateCategoryException;
import com.techx.intervue.modules.catalog.repositories.CategoryRepository;
import com.techx.intervue.modules.catalog.requests.CategoryRequest;
import com.techx.intervue.modules.catalog.resources.CategoryResource;
import com.techx.intervue.modules.catalog.services.interfaces.CategoryServiceInterface;
import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@AllArgsConstructor
public class CategoryService implements CategoryServiceInterface {

    private final CategoryRepository repository;

    /** "Rau củ" -> "rau-cu". Bỏ dấu tiếng Việt rồi mới hạ chữ và nối bằng gạch ngang. */
    static String slugify(String name) {
        String plain = Normalizer.normalize(name, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replace('đ', 'd')
                .replace('Đ', 'D');
        return plain.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
    }

    @Override
    public List<CategoryResource> listActive() {
        return repository.findByActiveTrueOrderBySortOrderAscNameAsc().stream()
                .map(CategoryService::toResource)
                .toList();
    }

    @Override
    public List<CategoryResource> listAll() {
        return repository.findAllByOrderBySortOrderAscNameAsc().stream()
                .map(CategoryService::toResource)
                .toList();
    }

    @Override
    @Transactional
    public CategoryResource create(CategoryRequest request) {
        String slug = slugify(request.name());
        if (repository.existsBySlug(slug)) {
            throw new DuplicateCategoryException(slug);
        }
        Category category = new Category();
        apply(category, request, slug);
        return toResource(repository.save(category));
    }

    @Override
    @Transactional
    public CategoryResource update(long id, CategoryRequest request) {
        Category category = repository.findById(id).orElseThrow(() -> new CategoryNotFoundException(id));
        String slug = slugify(request.name());
        if (!slug.equals(category.getSlug()) && repository.existsBySlug(slug)) {
            throw new DuplicateCategoryException(slug);
        }
        apply(category, request, slug);
        return toResource(repository.save(category));
    }

    /** Xoá mềm: sản phẩm cũ vẫn trỏ về được, chỉ biến mất khỏi bộ lọc của khách. */
    @Override
    @Transactional
    public void deactivate(long id) {
        Category category = repository.findById(id).orElseThrow(() -> new CategoryNotFoundException(id));
        category.setActive(false);
        repository.save(category);
    }

    private static void apply(Category category, CategoryRequest request, String slug) {
        category.setName(request.name());
        category.setSlug(slug);
        category.setDescription(request.description());
        category.setIcon(request.icon());
        category.setSortOrder(request.sortOrder());
    }

    private static CategoryResource toResource(Category c) {
        return new CategoryResource(
                c.getId(), c.getName(), c.getSlug(), c.getDescription(), c.getIcon(), c.getSortOrder(), c.isActive());
    }
}
```

`CategoryServiceInterface` khai đúng 5 method trên. Hai exception kế thừa `RuntimeException`,
`CatalogExceptionHandler` là `@RestControllerAdvice(assignableTypes = {CategoryController.class,
AdminCategoryController.class})` map `CategoryNotFoundException` → **404** và
`DuplicateCategoryException` → **409** `DUPLICATE_CATEGORY`, theo đúng khuôn `FarmerExceptionHandler`.

- [ ] **Step 5: Viết controller**

```java
// controllers/CategoryController.java
@RestController
@RequestMapping("/api/v1/categories")
@AllArgsConstructor
public class CategoryController extends BaseController {

    private final CategoryServiceInterface categoryService;

    /** Public — bộ lọc sản phẩm của khách cần nó trước cả khi đăng nhập (FR-020). */
    @GetMapping
    public ResponseEntity<ApiResource<List<CategoryResource>>> list() {
        return ok(categoryService.listActive(), "");
    }
}
```

```java
// controllers/AdminCategoryController.java
@RestController
@RequestMapping("/api/v1/admin/categories")
@PreAuthorize("hasRole('ADMIN')")
@AllArgsConstructor
public class AdminCategoryController extends BaseController {

    private final CategoryServiceInterface categoryService;

    @GetMapping
    public ResponseEntity<ApiResource<List<CategoryResource>>> list() {
        return ok(categoryService.listAll(), "");
    }

    @PostMapping
    public ResponseEntity<ApiResource<CategoryResource>> create(@Valid @RequestBody CategoryRequest request) {
        return created(categoryService.create(request), "Category added.");
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResource<CategoryResource>> update(
            @PathVariable long id, @Valid @RequestBody CategoryRequest request) {
        return ok(categoryService.update(id, request), "Category saved.");
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResource<Void>> deactivate(@PathVariable long id) {
        categoryService.deactivate(id);
        return ok(null, "Category turned off.");
    }
}
```

- [ ] **Step 6: Mở route public trong SecurityConfig**

Trong `SecurityConfig`, cạnh các dòng permitAll đang có, thêm:
```java
.requestMatchers(HttpMethod.GET, "/api/v1/categories").permitAll()
```

- [ ] **Step 7: Chạy test, xác nhận xanh**

```bash
make be-test
```
Kỳ vọng: 6 test của `CategoryServiceTest` PASS, không test cũ nào đỏ.

- [ ] **Step 8: Kiểm tra bằng tay**

```bash
curl -s localhost:8080/api/v1/categories | head -5
```
Kỳ vọng: `{"success":true,...,"data":[]}` — rỗng vì chưa seed, **không phải 401**.

- [ ] **Step 9: Commit**

```bash
make be-format && git add backend/ && git commit -m "feat(FR-076): product categories, public list and admin CRUD"
```

---

### Task 1.3: Backend — markets (FR-010, FR-073, FR-012)

**Files:**
- Create: `backend/src/main/java/com/techx/intervue/modules/catalog/entities/Market.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/catalog/entities/MarketOperatingDay.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/catalog/repositories/MarketRepository.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/catalog/repositories/MarketOperatingDayRepository.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/catalog/repositories/MarketQueryRepository.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/catalog/requests/MarketRequest.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/catalog/resources/MarketResource.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/catalog/resources/MarketDetailResource.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/catalog/services/interfaces/MarketServiceInterface.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/catalog/services/impl/MarketService.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/catalog/controllers/MarketController.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/catalog/controllers/AdminMarketController.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/catalog/controllers/CatalogExceptionHandler.java`
- Modify: `backend/src/main/java/com/techx/intervue/config/SecurityConfig.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/catalog/services/impl/MarketServiceTest.java`

**Interfaces:**
- Consumes: bảng của Task 1.1.
- Produces:
  - `MarketResource(Long id, String marketName, String address, String district, String city,
    BigDecimal latitude, BigDecimal longitude, String mapProvider, String openingTime, String closingTime,
    String imageUrl, List<Integer> operatingDays, long farmerCount)` — `openingTime`/`closingTime` là
    chuỗi `HH:mm`.
  - `MarketDetailResource(MarketResource market, List<StallSummaryResource> farmers)` —
    `StallSummaryResource` tạm rỗng ở cụm này, đổ dữ liệu ở Task 2.2.
  - `MarketServiceInterface`:
    `PageResource<MarketResource> search(String q, Integer day, String city, String district, int page, int pageSize)` ·
    `MarketDetailResource detail(long id)` ·
    `MarketResource create(MarketRequest r)` · `MarketResource update(long id, MarketRequest r)` ·
    `void deactivate(long id)`
  - Endpoint: `GET /api/v1/markets`, `GET /api/v1/markets/{id}` (Public) ·
    `POST|PUT|DELETE /api/v1/admin/markets` (Admin)

- [ ] **Step 1: Viết test thất bại**

```java
package com.techx.intervue.modules.catalog.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.catalog.entities.Market;
import com.techx.intervue.modules.catalog.exceptions.MarketNotFoundException;
import com.techx.intervue.modules.catalog.repositories.MarketOperatingDayRepository;
import com.techx.intervue.modules.catalog.repositories.MarketQueryRepository;
import com.techx.intervue.modules.catalog.repositories.MarketRepository;
import com.techx.intervue.modules.catalog.requests.MarketRequest;
import com.techx.intervue.modules.catalog.resources.MarketResource;
import com.techx.intervue.resources.PageResource;
import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class MarketServiceTest {

    private MarketRepository repository;
    private MarketOperatingDayRepository dayRepository;
    private MarketQueryRepository queryRepository;
    private MarketService service;

    @BeforeEach
    void setUp() {
        repository = mock(MarketRepository.class);
        dayRepository = mock(MarketOperatingDayRepository.class);
        queryRepository = mock(MarketQueryRepository.class);
        service = new MarketService(repository, dayRepository, queryRepository);
    }

    private static MarketRequest request(List<Integer> days) {
        return new MarketRequest(
                "Chợ Bà Chiểu",
                "Bạch Đằng, Bình Thạnh",
                "Bình Thạnh",
                "TP. Hồ Chí Minh",
                new BigDecimal("10.80290000"),
                new BigDecimal("106.69920000"),
                "05:00",
                "18:00",
                null,
                days);
    }

    private static Market saved() {
        Market m = new Market();
        m.setId(1L);
        m.setMarketName("Chợ Bà Chiểu");
        m.setAddress("Bạch Đằng, Bình Thạnh");
        m.setCity("TP. Hồ Chí Minh");
        m.setLatitude(new BigDecimal("10.80290000"));
        m.setLongitude(new BigDecimal("106.69920000"));
        m.setOpeningTime(LocalTime.of(5, 0));
        m.setClosingTime(LocalTime.of(18, 0));
        m.setMapProvider("osm");
        m.setActive(true);
        return m;
    }

    @Test
    void createStoresOperatingDaysAsRows() {
        when(repository.save(any(Market.class))).thenReturn(saved());

        service.create(request(List.of(0, 6)));

        ArgumentCaptor<List<Integer>> captor = ArgumentCaptor.forClass(List.class);
        verify(dayRepository).replaceDays(eq(1L), captor.capture());
        assertThat(captor.getValue()).containsExactly(0, 6);
    }

    @Test
    void createRejectsDayOutsideZeroToSix() {
        assertThatThrownBy(() -> service.create(request(List.of(0, 7))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("day");
    }

    @Test
    void createRejectsClosingTimeBeforeOpeningTime() {
        MarketRequest bad = new MarketRequest(
                "Chợ X", "Y", null, "TP. Hồ Chí Minh",
                BigDecimal.ONE, BigDecimal.ONE, "18:00", "05:00", null, List.of(1));

        assertThatThrownBy(() -> service.create(bad))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("closing");
    }

    /** D-12: map_provider luôn là 'osm', client không gửi lên được. */
    @Test
    void createAlwaysStoresOsmAsMapProvider() {
        when(repository.save(any(Market.class))).thenReturn(saved());
        ArgumentCaptor<Market> captor = ArgumentCaptor.forClass(Market.class);

        service.create(request(List.of(0)));

        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getMapProvider()).isEqualTo("osm");
    }

    /** Xoá mềm — đơn hàng cũ vẫn trỏ về chợ này (orders.market_id là FK không nullable). */
    @Test
    void deactivateFlipsIsActiveInsteadOfDeleting() {
        Market m = saved();
        when(repository.findById(1L)).thenReturn(Optional.of(m));

        service.deactivate(1L);

        assertThat(m.isActive()).isFalse();
        verify(repository).save(m);
    }

    @Test
    void detailOnUnknownMarketThrows() {
        when(queryRepository.findById(9L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.detail(9L)).isInstanceOf(MarketNotFoundException.class);
    }

    @Test
    void searchClampsPageSizeToFifty() {
        when(queryRepository.search(any(), any(), any(), any(), anyInt(), anyInt()))
                .thenReturn(new PageResource<>(List.of(), 1, 50, 0));

        PageResource<MarketResource> page = service.search(null, null, null, null, 1, 500);

        assertThat(page.pageSize()).isEqualTo(50);
        verify(queryRepository).search(null, null, null, null, 0, 50);
    }

    @Test
    void searchTreatsPageZeroAsPageOne() {
        when(queryRepository.search(any(), any(), any(), any(), anyInt(), anyInt()))
                .thenReturn(new PageResource<>(List.of(), 1, 12, 0));

        service.search(null, null, null, null, 0, 12);

        verify(queryRepository).search(null, null, null, null, 0, 12);
    }
}
```

- [ ] **Step 2: Chạy test, xác nhận đỏ**

```bash
make be-test
```
Kỳ vọng: không compile — `MarketService` chưa tồn tại.

- [ ] **Step 3: Viết entity + repository JPA**

`Market` map đủ cột của bảng `markets` (`@Column(name = "market_name")`, `is_active` → field `active`,
`LocalTime` cho `opening_time`/`closing_time`, `BigDecimal` cho toạ độ).
`MarketOperatingDay` map `market_operating_days`.
`MarketRepository extends JpaRepository<Market, Long>`.
`MarketOperatingDayRepository extends JpaRepository<MarketOperatingDay, Long>` + một method mặc định:

```java
/** Ghi đè trọn bộ ngày họp chợ: xoá hết rồi ghi lại, tránh phải so sánh từng dòng. */
@Transactional
default void replaceDays(Long marketId, List<Integer> days) {
    deleteByMarketId(marketId);
    days.stream().distinct().sorted().forEach(d -> {
        MarketOperatingDay row = new MarketOperatingDay();
        row.setMarketId(marketId);
        row.setDayOfWeek(d.byteValue());
        save(row);
    });
}

void deleteByMarketId(Long marketId);
```

- [ ] **Step 4: Viết MarketQueryRepository (JdbcTemplate, R-04)**

```java
package com.techx.intervue.modules.catalog.repositories;

import com.techx.intervue.modules.catalog.resources.MarketResource;
import com.techx.intervue.resources.PageResource;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Đọc chợ kèm số stall. Dùng JdbcTemplate vì phải gộp ngày họp và đếm Farmer trong một lượt;
 * mọi giá trị người dùng đi qua tham số, không nối chuỗi (R-04).
 */
@Repository
@RequiredArgsConstructor
public class MarketQueryRepository {

    private static final String SELECT_BODY =
            """
            SELECT m.id, m.market_name, m.address, m.district, m.city,
                   m.latitude, m.longitude, m.map_provider,
                   m.opening_time, m.closing_time, m.image_url,
                   (SELECT GROUP_CONCAT(d.day_of_week ORDER BY d.day_of_week)
                      FROM market_operating_days d WHERE d.market_id = m.id) AS days,
                   (SELECT COUNT(*)
                      FROM farmer_markets fm
                      JOIN farmer_profiles f ON f.id = fm.farmer_id
                     WHERE fm.market_id = m.id
                       AND fm.is_active = TRUE
                       AND f.approval_status = 'approved') AS farmer_count
            FROM markets m
            WHERE m.is_active = TRUE
            """;

    private static final String FILTERS =
            """
              AND (:q IS NULL OR m.market_name LIKE :q OR m.address LIKE :q)
              AND (:city IS NULL OR m.city = :city)
              AND (:district IS NULL OR m.district = :district)
              AND (:day IS NULL OR EXISTS (SELECT 1 FROM market_operating_days d
                                            WHERE d.market_id = m.id AND d.day_of_week = :day))
            """;

    private final NamedParameterJdbcTemplate jdbc;

    public PageResource<MarketResource> search(
            String q, Integer day, String city, String district, int offset, int limit) {
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("q", q == null || q.isBlank() ? null : "%" + escapeLike(q) + "%")
                .addValue("day", day)
                .addValue("city", city)
                .addValue("district", district);

        Long total = jdbc.queryForObject(
                "SELECT COUNT(*) FROM markets m WHERE m.is_active = TRUE " + FILTERS, params, Long.class);

        params.addValue("limit", limit).addValue("offset", offset);
        List<MarketResource> items = jdbc.query(
                SELECT_BODY + FILTERS + " ORDER BY m.market_name LIMIT :limit OFFSET :offset",
                params,
                (rs, i) -> map(rs));

        return new PageResource<>(items, offset / limit + 1, limit, total == null ? 0 : total);
    }

    public Optional<MarketResource> findById(long id) {
        List<MarketResource> rows = jdbc.query(
                SELECT_BODY + " AND m.id = :id",
                new MapSqlParameterSource("id", id),
                (rs, i) -> map(rs));
        return rows.stream().findFirst();
    }

    /** '%' và '_' người dùng gõ vào ô tìm kiếm không được thành ký tự đại diện. */
    private static String escapeLike(String raw) {
        return raw.replace("!", "!!").replace("%", "!%").replace("_", "!_");
    }

    private static MarketResource map(ResultSet rs) throws java.sql.SQLException {
        String days = rs.getString("days");
        List<Integer> operatingDays = days == null || days.isBlank()
                ? List.of()
                : Arrays.stream(days.split(",")).map(Integer::valueOf).toList();
        return new MarketResource(
                rs.getLong("id"),
                rs.getString("market_name"),
                rs.getString("address"),
                rs.getString("district"),
                rs.getString("city"),
                rs.getBigDecimal("latitude"),
                rs.getBigDecimal("longitude"),
                rs.getString("map_provider"),
                rs.getTime("opening_time").toLocalTime().toString().substring(0, 5),
                rs.getTime("closing_time").toLocalTime().toString().substring(0, 5),
                rs.getString("image_url"),
                operatingDays,
                rs.getLong("farmer_count"));
    }
}
```

> Câu `LIKE :q` phải đi kèm `ESCAPE '!'` ở cả hai vế khi viết vào `FILTERS`:
> `m.market_name LIKE :q ESCAPE '!' OR m.address LIKE :q ESCAPE '!'`.

- [ ] **Step 5: Viết MarketService**

Điểm phải đúng, test ở Step 1 canh từng cái:
- `search`: `page < 1` → 1; `pageSize` kẹp trong `[1, 50]`; `offset = (page - 1) * pageSize`.
- `create`/`update`: kiểm `operatingDays` mỗi phần tử trong `[0,6]`, ném `IllegalArgumentException("day...")`;
  kiểm `closingTime > openingTime`, ném `IllegalArgumentException("closing...")`;
  luôn set `mapProvider = "osm"` (D-12), **không đọc từ request**.
- `deactivate`: đặt `active = false`, không `delete`.
- `detail`: `queryRepository.findById` rỗng → `MarketNotFoundException` → 404.

- [ ] **Step 6: Viết controller + mở route public**

`MarketController` `@RequestMapping("/api/v1/markets")`: `GET ""` nhận
`@RequestParam(required=false) String q, Integer day, String city, String district`,
`@RequestParam(defaultValue="1") int page`, `@RequestParam(defaultValue="12") int pageSize`;
`GET "/{id}"` trả `MarketDetailResource`.
`AdminMarketController` `@RequestMapping("/api/v1/admin/markets")` `@PreAuthorize("hasRole('ADMIN')")`.
`SecurityConfig`: `.requestMatchers(HttpMethod.GET, "/api/v1/markets", "/api/v1/markets/*").permitAll()`.
`CatalogExceptionHandler`: `MarketNotFoundException` → 404;
`IllegalArgumentException` → 400 `VALIDATION_ERROR`.

- [ ] **Step 7: Chạy test, xác nhận xanh**

```bash
make be-test
```
Kỳ vọng: 8 test của `MarketServiceTest` PASS.

- [ ] **Step 8: Kiểm tra bằng tay**

```bash
curl -s "localhost:8080/api/v1/markets?pageSize=5" | python3 -m json.tool | head -20
```
Kỳ vọng: `data.items` rỗng, `data.page` = 1, `data.pageSize` = 5. Không 401, không 500.

- [ ] **Step 9: Commit**

```bash
make be-format && git add backend/ && git commit -m "feat(FR-073): markets with operating days, public search and admin CRUD"
```

---

### Task 1.4: Seed — 6 danh mục, 4 chợ TP.HCM (FR-100 phần 1)

**Files:**
- Create: `db/seed.sql`
- Modify: `Makefile` — thêm target `seed`

**Interfaces:**
- Produces: `db/seed.sql` chạy lặp lại được (idempotent); target `make seed`.

- [ ] **Step 1: Viết `db/seed.sql`**

```sql
-- MarketLink — dữ liệu demo (FR-100, FR-101, FR-102).
-- KHÔNG phải migration: Flyway chạy ở mọi môi trường, seed demo thì không.
-- Chạy: make seed. Chạy lại được nhiều lần — mọi INSERT đều idempotent theo khoá tự nhiên.
-- Toạ độ là toạ độ thật của 4 chợ ở TP. Hồ Chí Minh.

SET NAMES utf8mb4;

-- ---- Danh mục (FR-076) ----
INSERT INTO categories (name, slug, icon, sort_order, is_active) VALUES
  ('Leafy greens', 'leafy-greens', 'leaf',   1, TRUE),
  ('Fruit',        'fruit',        'apple',  2, TRUE),
  ('Root veg',     'root-veg',     'carrot', 3, TRUE),
  ('Herbs',        'herbs',        'sprout', 4, TRUE),
  ('Dairy',        'dairy',        'milk',   5, TRUE),
  ('Baked goods',  'baked-goods',  'bread',  6, TRUE)
ON DUPLICATE KEY UPDATE sort_order = VALUES(sort_order), is_active = VALUES(is_active);

-- ---- Chợ (FR-073, FR-012) ----
INSERT INTO markets (market_name, address, district, city, latitude, longitude,
                     opening_time, closing_time, map_provider, is_active) VALUES
  ('Chợ Bà Chiểu',        'Bạch Đằng, Phường 1, Bình Thạnh',        'Bình Thạnh', 'TP. Hồ Chí Minh',
   10.80290000, 106.69920000, '05:00:00', '18:00:00', 'osm', TRUE),
  ('Chợ Thảo Điền',       '10 Quốc Hương, Thảo Điền, TP. Thủ Đức',  'TP. Thủ Đức', 'TP. Hồ Chí Minh',
   10.80640000, 106.73380000, '06:00:00', '20:00:00', 'osm', TRUE),
  ('Chợ Bến Thành',       'Lê Lợi, Bến Thành, Quận 1',              'Quận 1',      'TP. Hồ Chí Minh',
   10.77250000, 106.69800000, '06:00:00', '19:00:00', 'osm', TRUE),
  ('Chợ Tân Định',        '336 Hai Bà Trưng, Tân Định, Quận 1',     'Quận 1',      'TP. Hồ Chí Minh',
   10.79050000, 106.69080000, '05:30:00', '18:30:00', 'osm', TRUE)
ON DUPLICATE KEY UPDATE address = VALUES(address), latitude = VALUES(latitude), longitude = VALUES(longitude);

-- Ngày họp: Bà Chiểu và Tân Định họp cả tuần; Thảo Điền cuối tuần; Bến Thành T2–T7.
INSERT INTO market_operating_days (market_id, day_of_week)
SELECT m.id, d.day
FROM markets m
JOIN (SELECT 0 AS day UNION SELECT 1 UNION SELECT 2 UNION SELECT 3
      UNION SELECT 4 UNION SELECT 5 UNION SELECT 6) d
WHERE (m.market_name IN ('Chợ Bà Chiểu', 'Chợ Tân Định'))
   OR (m.market_name = 'Chợ Thảo Điền' AND d.day IN (0, 6))
   OR (m.market_name = 'Chợ Bến Thành' AND d.day BETWEEN 1 AND 6)
ON DUPLICATE KEY UPDATE day_of_week = VALUES(day_of_week);
```

> `markets` chưa có UNIQUE trên `market_name`, nên `ON DUPLICATE KEY` ở khối chợ chưa bắt được gì.
> Thêm vào **cùng migration của task 1.1** trước khi commit:
> `UNIQUE KEY uq_market_name (market_name)`. Nếu task 1.1 đã merge thì tạo migration mới
> `V20260926005__add_unique_market_name.sql` (R-03: không sửa migration đã merge).

- [ ] **Step 2: Thêm target vào Makefile**

```makefile
seed: ## Nạp dữ liệu demo (db/seed.sql) — chạy lại được nhiều lần
	docker compose exec -T mysql mysql -uroot -p$$MYSQL_ROOT_PASSWORD $$MYSQL_DATABASE < db/seed.sql
	@echo "Seed xong."
```

- [ ] **Step 3: Chạy seed và kiểm tra**

```bash
make seed && curl -s "localhost:8080/api/v1/markets" | python3 -m json.tool | head -30
```
Kỳ vọng: 4 chợ, `operatingDays` của Chợ Thảo Điền là `[0, 6]`, `farmerCount` là `0`.

```bash
make seed
```
Chạy lần hai: không lỗi duplicate, vẫn đúng 4 chợ (kiểm bằng `data.total`).

- [ ] **Step 4: Commit**

```bash
git add db/seed.sql Makefile backend/ && git commit -m "feat(FR-100): demo seed for categories and four Ho Chi Minh City markets"
```

---

### Task 1.5: Frontend — nối 7 màn sang API thật

**Files:**
- Create: `frontend/src/api-requests/catalog.requests.ts`
- Modify: `frontend/src/pages/public/Markets/index.tsx` — bỏ `import { markets } from '@/data/home'`
- Modify: `frontend/src/pages/public/MarketDetail/index.tsx`
- Modify: `frontend/src/pages/public/MarketMap/index.tsx`
- Modify: `frontend/src/pages/public/Home/NearbyMarkets.tsx`
- Modify: `frontend/src/pages/public/Home/OpenMarketsBoard.tsx`
- Modify: `frontend/src/pages/admin/Markets/index.tsx`
- Modify: `frontend/src/pages/admin/MarketForm/index.tsx`
- Modify: `frontend/src/pages/admin/Categories/index.tsx`
- Modify: `frontend/src/data/home.ts` — xoá `export const markets`, giữ phần chưa thay
- Modify: `frontend/src/locales/<10 ngôn ngữ>/Markets.json`, `MarketDetail.json`, `Categories.json` —
  thêm key cho trạng thái error

**Interfaces:**
- Consumes: `GET /api/v1/markets`, `/markets/{id}`, `/categories`, `/admin/markets`, `/admin/categories`.
- Produces: `CatalogApi` với `listMarkets`, `getMarket`, `listCategories`,
  `createMarket`, `updateMarket`, `deactivateMarket`, `listAllCategories`, `createCategory`,
  `updateCategory`, `deactivateCategory`; và hai hàm ánh xạ `toMarket`, `toCategory`.

- [ ] **Step 1: Viết `catalog.requests.ts`**

Theo khuôn `farmer.requests.ts`: `class CatalogApi` với static method, `publicApi` cho route public và
`privateApi` cho route admin. Hàm ánh xạ `toMarket` đúng như §S.4.2. Ví dụ hai method:

```ts
static listMarkets = async (params: { q?: string; day?: number; page?: number; pageSize?: number }) => {
  const response = await publicApi.get<ApiResponse<PageType<MarketDto>>>('/markets', { params });
  return { ...response.data.data, items: response.data.data.items.map(toMarket) };
};

static getMarket = async (id: number) => {
  const response = await publicApi.get<ApiResponse<{ market: MarketDto; farmers: StallDto[] }>>(`/markets/${id}`);
  return { market: toMarket(response.data.data.market), farmers: response.data.data.farmers.map(toStall) };
};
```

> `src/utils/axiosInstance.ts` **đã xuất sẵn cả `publicApi` và `privateApi`**. Route public dùng
> `publicApi` để trang chủ xem được khi chưa đăng nhập; route cần token dùng `privateApi`.

- [ ] **Step 2: Đổi `public/Markets/index.tsx`**

Thay `const list = markets` bằng bốn trạng thái FR-084, theo đúng khuôn `useState` + `useEffect` mà
`customer/BecomeFarmer` đang dùng (dự án **không** có react-query):

```tsx
type State =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; items: MarketType[]; total: number };

const [state, setState] = useState<State>({ kind: 'loading' });

useEffect(() => {
  let alive = true;
  setState({ kind: 'loading' });
  CatalogApi.listMarkets({ q, day, page })
    .then((page) => alive && setState({ kind: 'ready', items: page.items, total: page.total }))
    .catch((e) => alive && setState({ kind: 'error', message: Helper.getErrorMessage(e, t('error.load')) }));
  return () => {
    alive = false;
  };
}, [q, day, page]);
```

Render: `loading` → skeleton đang có; `error` → `<LoadError noun={t('noun')} onRetry={reload} />`;
`ready` + `items.length === 0` → `<DataState variant="empty" title={...} />`; còn lại → danh sách như cũ.
**Không đổi JSX của thẻ chợ.** Hai component này đã có trong `src/components/ui/data-state.tsx` —
`DataState({ variant, title, text, action, fill })` và `LoadError({ noun, alt, onRetry })`; đừng viết mới.

- [ ] **Step 3: Đổi 6 trang còn lại theo cùng khuôn**

`MarketDetail` gọi `getMarket(id)`, 404 → trang không tìm thấy. `MarketMap` và `NearbyMarkets` dùng
`listMarkets({ pageSize: 50 })`. `OpenMarketsBoard` lọc theo `days.includes(new Date().getDay())` ngay
trên client từ cùng kết quả đó. `admin/Markets`, `admin/MarketForm`, `admin/Categories` gọi nhánh admin.

- [ ] **Step 4: Xoá dữ liệu giả đã thay**

```bash
grep -rn "from '@/data/home'" frontend/src/pages | grep -i market
```
Kỳ vọng: không còn dòng nào. Rồi xoá `export const markets` khỏi `src/data/home.ts`.

- [ ] **Step 5: Kiểm tra build và lint**

```bash
cd frontend && npm run build && npm run lint
```
Kỳ vọng: `tsc -b` không lỗi, eslint 0 error.

- [ ] **Step 6: Kiểm tra bằng mắt trên trình duyệt**

`make up`, mở `http://localhost:3000/markets`. Phải thấy đúng 4 chợ vừa seed, tên tiếng Việt có dấu
hiển thị đúng. Mở `/market-map` — 4 marker Leaflet đúng vị trí. Thu cửa sổ về 375 px: không tràn ngang.
Tắt backend (`make down` rồi chỉ bật lại frontend) và tải lại: phải thấy trạng thái error, không phải
trang trắng.

- [ ] **Step 7: Commit**

```bash
git add frontend/ && git commit -m "feat(FR-010): markets and categories read from the API, not the demo file"
```

- [ ] **Step 8: Báo đủ 7 điều kiện cho FR-010, FR-012, FR-073, FR-076**

Không tự tick DONE trong `.ai/REQUIREMENTS.md` (R-07 / DoD).

---

> **Từ đây trở đi.** Cụm C1 đã dựng đủ khuôn mẫu: migration → entity/repository → service có test →
> controller → SecurityConfig → seed → nối frontend. Các cụm sau **không chép lại** đoạn khung đó.
> Mỗi task vẫn ghi đủ: file phải tạo, chữ ký chính xác, tên từng test và điều nó khẳng định, lệnh chạy,
> kỳ vọng. Chỗ nào có logic không đoán được thì có code thật.
>
> Ba quy tắc khung áp dụng ngầm cho mọi task còn lại:
> 1. **Entity** map đúng từng cột của migration cùng task; `is_*` → field `boolean` bỏ tiền tố `is`.
> 2. **Controller** chỉ uỷ quyền cho service, trả qua `ok(...)`/`created(...)`, không chứa logic.
>    Route public phải thêm vào `SecurityConfig`.
> 3. **ExceptionHandler** của module map exception → mã HTTP đúng, theo khuôn `FarmerExceptionHandler`.

---

## Cụm C2 · Farmer ở chợ — FR-011, 060, 061

**Kết quả cụm:** trang `/stall/:id` và màn "Stall profile" của Farmer chạy thật; trang chợ liệt kê
đúng Farmer đang bán ở đó; `farmerCount` ở C1 hết bằng 0.

**Nhánh:** `feature/FR-060-farmer-markets`

### Task 2.1: Migration — mở rộng farmer_profiles, thêm farmer_operating_days

**Files:**
- Create: `backend/src/main/resources/db/migration/V20260926006__extend_farmer_profile_and_operating_days.sql`

**Interfaces:**
- Produces: `farmer_profiles` thêm `description TEXT NULL`, `logo_url VARCHAR(255) NULL`,
  `order_cutoff_hours INT NOT NULL DEFAULT 12`, `rating_avg DECIMAL(3,2) NOT NULL DEFAULT 0.00`,
  `rating_count INT NOT NULL DEFAULT 0`.
  Bảng mới `farmer_operating_days(id, farmer_market_id, day_of_week, pickup_start_time, pickup_end_time)`.

- [ ] **Step 1: Viết migration**

```sql
-- FR-060, FR-061. Các cột này có trong db/schema.sql §2 nhưng V20260925007 chỉ lấy phần cần cho
-- bước duyệt Farmer; giờ mới tới lượt hồ sơ gian hàng.
ALTER TABLE farmer_profiles
    ADD COLUMN description        TEXT NULL AFTER contact_person,
    ADD COLUMN logo_url           VARCHAR(255) NULL AFTER description,
    ADD COLUMN order_cutoff_hours INT NOT NULL DEFAULT 12 AFTER logo_url,
    ADD COLUMN rating_avg         DECIMAL(3, 2) NOT NULL DEFAULT 0.00 AFTER order_cutoff_hours,
    ADD COLUMN rating_count       INT NOT NULL DEFAULT 0 AFTER rating_avg;

-- Khung giờ nhận hàng của Farmer tại từng chợ, theo từng thứ trong tuần (db/schema.sql §3).
CREATE TABLE farmer_operating_days (
    id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    farmer_market_id  BIGINT UNSIGNED NOT NULL,
    day_of_week       TINYINT NOT NULL,
    pickup_start_time TIME NOT NULL,
    pickup_end_time   TIME NOT NULL,
    CONSTRAINT fk_fod_farmer_market FOREIGN KEY (farmer_market_id)
        REFERENCES farmer_markets (id) ON DELETE CASCADE,
    UNIQUE KEY uq_fm_day (farmer_market_id, day_of_week),
    CONSTRAINT ck_fod_day CHECK (day_of_week BETWEEN 0 AND 6)
);
```

- [ ] **Step 2: Chạy và xác nhận** — `make be-restart`, rồi `make mysql` → `DESCRIBE farmer_profiles;`
  phải thấy 5 cột mới, `order_cutoff_hours` mặc định `12` (D-05).
- [ ] **Step 3: Commit** — `feat(FR-061): stall profile columns and farmer pickup windows`

---

### Task 2.2: Backend — module `stall`

**Files:**
- Create: `modules/stall/entities/FarmerMarket.java`, `FarmerOperatingDay.java`
- Create: `modules/stall/repositories/FarmerMarketRepository.java`, `FarmerOperatingDayRepository.java`,
  `StallQueryRepository.java`
- Create: `modules/stall/requests/StallProfileRequest.java`, `JoinMarketRequest.java`, `OperatingDaysRequest.java`
- Create: `modules/stall/resources/StallSummaryResource.java`, `StallDetailResource.java`,
  `StallMarketResource.java`, `OperatingDayResource.java`
- Create: `modules/stall/services/interfaces/StallServiceInterface.java`, `services/impl/StallService.java`
- Create: `modules/stall/controllers/PublicFarmerController.java`, `FarmerStallController.java`,
  `StallExceptionHandler.java`
- Create: `modules/stall/exceptions/StallNotApprovedException.java`, `MarketAlreadyJoinedException.java`
- Modify: `modules/catalog/services/impl/MarketService.java` — `detail()` đổ `farmers[]` thật
- Modify: `config/SecurityConfig.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/stall/services/impl/StallServiceTest.java`

**Interfaces:**
- Consumes: `FarmerProfileRepository`, `ApprovalStatus` (module `farmer`); bảng của Task 1.1 và 2.1.
- Produces:
  - `StallSummaryResource(Long farmerId, String stallName, String logoUrl, String stallCode,
    BigDecimal stallLatitude, BigDecimal stallLongitude, BigDecimal ratingAvg, int ratingCount,
    List<Integer> operatingDays)`
  - `OperatingDayResource(int dayOfWeek, String pickupStartTime, String pickupEndTime)` — `HH:mm`
  - `StallMarketResource(Long farmerMarketId, Long marketId, String marketName, String stallCode,
    BigDecimal stallLatitude, BigDecimal stallLongitude, List<OperatingDayResource> operatingDays)`
  - `StallDetailResource(Long farmerId, String stallName, String contactPerson, String description,
    String logoUrl, int orderCutoffHours, BigDecimal ratingAvg, int ratingCount,
    List<StallMarketResource> markets)`
  - `StallServiceInterface`:
    `PageResource<StallSummaryResource> search(String q, Long marketId, Integer day, int page, int pageSize)` ·
    `StallDetailResource publicDetail(long farmerId)` ·
    `StallDetailResource myProfile(long userId)` ·
    `StallDetailResource updateProfile(long userId, StallProfileRequest r)` ·
    `StallMarketResource joinMarket(long userId, JoinMarketRequest r)` ·
    `void leaveMarket(long userId, long farmerMarketId)` ·
    `StallMarketResource setDays(long userId, long farmerMarketId, OperatingDaysRequest r)` ·
    `List<StallSummaryResource> atMarket(long marketId, Integer day)`
  - Endpoint: `GET /api/v1/farmers`, `/farmers/{id}`, `/markets/{id}/farmers` (Public) ·
    `GET|PUT /api/v1/farmer/profile`, `POST /api/v1/farmer/markets`,
    `DELETE /api/v1/farmer/markets/{farmerMarketId}`,
    `PUT /api/v1/farmer/markets/{farmerMarketId}/days` (Farmer)

- [ ] **Step 1: Viết `StallServiceTest` — 9 test, tất cả phải đỏ trước**

| Tên test | Khẳng định |
|---|---|
| `searchReturnsOnlyApprovedStalls` | mock query repo, xác nhận SQL chạy với `approval_status = 'approved'`; stall `pending` không nằm trong kết quả |
| `publicDetailHidesSuspendedStall` | `approval_status = 'suspended'` → ném `StallNotApprovedException` → 404 (D-09: khách không thấy nữa) |
| `myProfileWorksWhilePending` | chính chủ vẫn đọc được hồ sơ của mình dù `pending` — không được 403 |
| `updateProfileRejectsCutoffHoursOutsideOneToSeventyTwo` | `orderCutoffHours = 0` và `= 100` đều ném `IllegalArgumentException` |
| `updateProfileOnAnotherUsersStallIsImpossible` | service chỉ nhận `userId`, tra `findByUserId`; không tồn tại → `FarmerProfileNotFoundException`, **không** cho truyền `farmerId` từ ngoài (R-06) |
| `joinMarketRejectsStallNotApproved` | `pending` → `StallNotApprovedException` → 403 với message "Your stall is pending admin approval" |
| `joinMarketRejectsDuplicateMarket` | đã có dòng `farmer_markets` cho cặp đó → `MarketAlreadyJoinedException` → 409 |
| `setDaysRejectsPickupEndBeforeStart` | `08:00`–`07:00` → `IllegalArgumentException("pickup")` |
| `setDaysReplacesTheWholeSet` | gửi `[T7]` khi đang có `[CN, T7]` → `replaceDays` được gọi đúng một lần với `[6]`, CN biến mất |

Khuôn viết test giống `CategoryServiceTest`: `mock()` mọi repository, `new StallService(...)` trong
`@BeforeEach`, `assertThatThrownBy(...).isInstanceOf(...)`, `ArgumentCaptor` để soi tham số đã lưu.

- [ ] **Step 2: `make be-test` — xác nhận không compile** (`StallService` chưa có)

- [ ] **Step 3: Viết entity + repository JPA** theo quy tắc khung 1.

- [ ] **Step 4: Viết `StallQueryRepository`**

Hai câu SQL, tham số hoá, `LIKE ... ESCAPE '!'`:

```sql
-- SEARCH_STALLS
SELECT f.id, f.stall_name, f.logo_url, f.rating_avg, f.rating_count,
       fm.stall_code, fm.stall_latitude, fm.stall_longitude,
       (SELECT GROUP_CONCAT(DISTINCT d.day_of_week ORDER BY d.day_of_week)
          FROM farmer_operating_days d WHERE d.farmer_market_id = fm.id) AS days
FROM farmer_profiles f
JOIN farmer_markets fm ON fm.farmer_id = f.id AND fm.is_active = TRUE
WHERE f.approval_status = 'approved'
  AND (:q IS NULL OR f.stall_name LIKE :q ESCAPE '!')
  AND (:marketId IS NULL OR fm.market_id = :marketId)
  AND (:day IS NULL OR EXISTS (SELECT 1 FROM farmer_operating_days d
                                WHERE d.farmer_market_id = fm.id AND d.day_of_week = :day))
ORDER BY f.rating_avg DESC, f.stall_name
LIMIT :limit OFFSET :offset
```

```sql
-- STALL_MARKETS (cho publicDetail và myProfile)
SELECT fm.id AS farmer_market_id, m.id AS market_id, m.market_name,
       fm.stall_code, fm.stall_latitude, fm.stall_longitude,
       d.day_of_week, d.pickup_start_time, d.pickup_end_time
FROM farmer_markets fm
JOIN markets m ON m.id = fm.market_id AND m.is_active = TRUE
LEFT JOIN farmer_operating_days d ON d.farmer_market_id = fm.id
WHERE fm.farmer_id = :farmerId AND fm.is_active = TRUE
ORDER BY m.market_name, d.day_of_week
```
Gom nhiều dòng thành `List<StallMarketResource>` bằng `LinkedHashMap<Long, ...>` trong `ResultSetExtractor`.

- [ ] **Step 5: Viết `StallService`**

Điểm phải đúng:
- `publicDetail`: chỉ trả khi `approval_status = 'approved'`; `pending`/`rejected`/`suspended` → 404 (D-09).
- `myProfile` / `updateProfile` / `joinMarket` / `setDays`: **luôn** tra `farmer_profiles` theo `userId`
  lấy từ token, không bao giờ nhận `farmerId` từ request (R-06).
- `joinMarket` / `setDays` chặn khi `approval_status != 'approved'` → `StallNotApprovedException` → **403**.
- `orderCutoffHours` kẹp `[1, 72]`, ngoài khoảng ném `IllegalArgumentException`.
- `setDays` ghi đè trọn bộ (xoá rồi ghi lại), kiểm `pickupEndTime > pickupStartTime`.

- [ ] **Step 6: Nối `farmers[]` vào `MarketService.detail`**

`MarketService` nhận thêm `StallServiceInterface` trong constructor và gọi `atMarket(id, null)`.
Đây là chỗ duy nhất `module catalog` phụ thuộc `module stall`, chiều ngược lại **không** được có.

- [ ] **Step 7: Controller + SecurityConfig**

Public: `GET /api/v1/farmers`, `/api/v1/farmers/*`, `/api/v1/markets/*/farmers`.
Farmer: `@PreAuthorize("hasRole('FARMER')")` cho cả `FarmerStallController`.

- [ ] **Step 8: `make be-test` — 9 test xanh**

- [ ] **Step 9: Kiểm tra bằng tay**

```bash
curl -s "localhost:8080/api/v1/farmers" | python3 -m json.tool | head
```
Kỳ vọng 200, `items` rỗng (chưa seed Farmer). Đăng nhập bằng tài khoản customer rồi gọi
`GET /api/v1/farmer/profile` → **403**, không phải 500.

- [ ] **Step 10: Commit** — `feat(FR-060): farmer stall profile, markets and pickup windows`

---

### Task 2.3: Seed — 10 Farmer đã duyệt, gắn vào chợ (FR-100 phần 2, FR-102 phần 1)

**Files:**
- Modify: `db/seed.sql`

**Interfaces:**
- Produces: 10 user vai `farmer` + `farmer_profiles` `approved`, mỗi người 1–2 chợ,
  `farmer_operating_days` đủ; 1 customer, 1 admin (FR-102).

- [ ] **Step 1: Thêm vào cuối `db/seed.sql`**

```sql
-- ---- Tài khoản demo (FR-102) ----
-- Mật khẩu của MỌI tài khoản demo: Demo@1234
-- @pw là hash BCrypt của chuỗi đó. Sinh bằng một trong hai cách, ĐỪNG tự bịa chuỗi:
--   (a) htpasswd -bnBC 10 "" 'Demo@1234' | cut -d: -f2
--       (gói apache2-utils; Spring nhận cả tiền tố $2y$ lẫn $2a$)
--   (b) POST /api/v1/auth/register một tài khoản bất kỳ với mật khẩu Demo@1234, rồi
--       SELECT password_hash FROM users WHERE email = '<email vừa đăng ký>';
-- Dán kết quả vào dòng dưới. Sai hash thì seed vẫn chạy nhưng không ai đăng nhập được —
-- Step 3 của task này bắt đúng lỗi đó.
SET @pw := '<DÁN BCRYPT HASH CỦA Demo@1234 VÀO ĐÂY>';

INSERT INTO users (email, password_hash, role, full_name, phone, address, status) VALUES
  ('admin@marketlink.vn',    @pw, 'admin',    'Trần Quản Trị',   '0900000001', 'Quận 1, TP.HCM',      'active'),
  ('customer@marketlink.vn', @pw, 'customer', 'Nguyễn Văn An',   '0900000002', '12 Lê Lợi, Quận 1',   'active'),
  ('farmer@marketlink.vn',   @pw, 'farmer',   'Lê Thị Út Hiền',  '0900000003', 'Bình Thạnh, TP.HCM',  'active')
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), status = VALUES(status);
```
Rồi 9 farmer còn lại theo cùng khuôn (`farmer2@…` … `farmer10@…`), và:

```sql
-- Hồ sơ gian hàng, tất cả đã được duyệt để bán được ngay
INSERT INTO farmer_profiles (user_id, stall_name, contact_person, description, order_cutoff_hours,
                             approval_status, approved_at)
SELECT u.id, s.stall_name, u.full_name, s.description, 12, 'approved', NOW()
FROM users u
JOIN (SELECT 'farmer@marketlink.vn' AS email, 'Vườn Út Hiền' AS stall_name,
             'Rau ăn lá cắt buổi sáng, giao tận quầy.' AS description
      UNION ALL SELECT 'farmer2@marketlink.vn', 'Trái cây Ba Tơ', 'Bưởi da xanh và cam sành miền Tây.'
      -- … 8 dòng còn lại
     ) s ON s.email = u.email
ON DUPLICATE KEY UPDATE approval_status = 'approved', approved_at = NOW();

-- Gắn Farmer vào chợ + khung giờ nhận hàng
INSERT INTO farmer_markets (farmer_id, market_id, stall_code, stall_latitude, stall_longitude, is_active)
SELECT f.id, m.id, x.stall_code, m.latitude + x.dlat, m.longitude + x.dlng, TRUE
FROM farmer_profiles f
JOIN users u ON u.id = f.user_id
JOIN markets m ON m.market_name = x.market_name
JOIN (SELECT 'farmer@marketlink.vn' AS email, 'Chợ Bà Chiểu' AS market_name,
             'A-12' AS stall_code, 0.00012 AS dlat, 0.00008 AS dlng
      -- … các cặp Farmer × chợ còn lại, mỗi Farmer 1–2 chợ
     ) x ON x.email = u.email
ON DUPLICATE KEY UPDATE stall_code = VALUES(stall_code);

INSERT INTO farmer_operating_days (farmer_market_id, day_of_week, pickup_start_time, pickup_end_time)
SELECT fm.id, d.day, '07:00:00', '11:00:00'
FROM farmer_markets fm
JOIN (SELECT 0 AS day UNION SELECT 6) d
ON DUPLICATE KEY UPDATE pickup_start_time = VALUES(pickup_start_time);
```

- [ ] **Step 2: Chạy và kiểm tra**

```bash
make seed
curl -s "localhost:8080/api/v1/markets" | python3 -c "import sys,json; print([(m['marketName'], m['farmerCount']) for m in json.load(sys.stdin)['data']['items']])"
```
Kỳ vọng: `farmerCount` > 0 ở mọi chợ — đây là lúc con số 0 của C1 hết là 0.

- [ ] **Step 3: Kiểm tra đăng nhập được thật**

```bash
curl -s -X POST localhost:8080/api/v1/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"farmer@marketlink.vn","password":"Demo@1234"}' | python3 -m json.tool | head -8
```
Kỳ vọng: `success: true`, `data.user.role` = `"farmer"`. **Nếu 401 thì hash trong seed sai** — sinh lại
theo ghi chú ở Step 1, đừng đoán.

- [ ] **Step 4: Commit** — `feat(FR-102): demo accounts for all three roles and ten approved stalls`

---

### Task 2.4: Frontend — nối 3 màn stall

**Files:**
- Create: `frontend/src/api-requests/stall.requests.ts`
- Modify: `frontend/src/pages/public/StallProfile/index.tsx`
- Modify: `frontend/src/pages/farmer/StallProfile/index.tsx`
- Modify: `frontend/src/pages/public/MarketDetail/index.tsx` — danh sách Farmer lấy từ `getMarket`
- Modify: `frontend/src/data/catalog.ts` — xoá phần `farmers`
- Modify: `frontend/src/locales/<10>/StallProfile.json`

**Interfaces:**
- Consumes: endpoint của Task 2.2.
- Produces: `StallApi` + `toStall(dto): FarmerType`. Ánh xạ quan trọng, vì `FarmerType` gộp nhiều chợ
  thành một chuỗi:

```ts
/** FarmerType.days/pickup là chuỗi cho người đọc; contract trả mảng theo từng chợ. */
export const toStall = (dto: StallDetailDto): FarmerType => {
  const days = [...new Set(dto.markets.flatMap((m) => m.operatingDays.map((d) => d.dayOfWeek)))].sort();
  const first = dto.markets[0]?.operatingDays[0];
  return {
    id: dto.farmerId,
    stall: dto.stallName,
    person: dto.contactPerson,
    markets: dto.markets.map((m) => m.marketId),
    days: days.map((d) => dayName(d)).join(', '),   // dayName(dow, style?) — xem src/lib/format.ts
    pickup: first ? `${first.pickupStartTime}–${first.pickupEndTime}` : '',
    rating: dto.ratingCount === 0 ? null : dto.ratingAvg,
    reviews: dto.ratingCount,
    approval: 'approved',
    cutoffHours: dto.orderCutoffHours,
    lat: dto.markets[0]?.stallLatitude ?? null,
    lng: dto.markets[0]?.stallLongitude ?? null,
    stallCode: dto.markets[0]?.stallCode ?? '',
    about: dto.description ?? '',
    // phone/email/registered không có trong contract công khai — để rỗng, trang public không hiện
    phone: '', email: '', registered: '',
  };
};
```

- [ ] **Step 1: Viết `stall.requests.ts`** — theo khuôn `catalog.requests.ts`.
- [ ] **Step 2: Đổi 3 trang** sang 4 trạng thái FR-084 như Task 1.5 Step 2.
- [ ] **Step 3: Farmer StallProfile là form** — `PUT /farmer/profile`, `POST/DELETE /farmer/markets`,
  `PUT /farmer/markets/{id}/days`. Validation client phải khớp server: `orderCutoffHours` 1–72,
  giờ kết thúc sau giờ bắt đầu. Lỗi field hiện qua `Helper.getFieldErrors`.
- [ ] **Step 4: `grep -rn "farmers" frontend/src/data/catalog.ts`** → xoá phần đã thay.
- [ ] **Step 5: `cd frontend && npm run build && npm run lint`** — xanh.
- [ ] **Step 6: Kiểm tra trên trình duyệt** — `/markets/1` liệt kê Farmer thật; bấm vào một Farmer ra
  `/stall/:id` có tên, mô tả, khung giờ. Đăng nhập `farmer@marketlink.vn`, vào "Stall profile", đổi
  `orderCutoffHours` thành `6`, lưu, tải lại — giá trị giữ nguyên.
- [ ] **Step 7: Commit** — `feat(FR-011): stall pages read from the API`
- [ ] **Step 8: Báo đủ 7 điều kiện cho FR-011, FR-060, FR-061**

---

## Cụm C3 · Sản phẩm, tìm kiếm, lọc — FR-020, 021, 022, 023, 062, 064, 074

**Kết quả cụm:** `/products`, `/products/:id`, `/search`, "Fresh today" trang chủ, màn sản phẩm của
Farmer và màn kiểm duyệt của Admin chạy thật. Sau cụm này chatbot cũng chạy được (xem C11).

**Nhánh:** `feature/FR-062-products`

### Task 3.1: Migration — products

**Files:**
- Create: `backend/src/main/resources/db/migration/V20260926007__create_products_table.sql`

- [ ] **Step 1: Viết migration**

```sql
-- FR-062, FR-020…023. Cột theo db/schema.sql §4, khoá theo quy ước thật (BIGINT UNSIGNED, PK `id`).
CREATE TABLE products (
    id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    farmer_id      BIGINT UNSIGNED NOT NULL,
    category_id    BIGINT UNSIGNED NOT NULL,
    name           VARCHAR(150) NOT NULL,
    description    TEXT NULL,
    price          DECIMAL(10, 2) NOT NULL,
    unit           VARCHAR(20) NOT NULL,
    stock_quantity INT NOT NULL DEFAULT 0,
    image_url      VARCHAR(255) NULL,
    status         ENUM('available', 'sold_out', 'unavailable') NOT NULL DEFAULT 'available',
    -- Xoá mềm: order_items trỏ tới product_id, đơn cũ phải đọc lại được (FR-036)
    is_deleted     BOOLEAN NOT NULL DEFAULT FALSE,
    -- Admin ẩn listing vi phạm (FR-074). Khác is_deleted: Farmer không tự gỡ được cờ này.
    is_hidden      BOOLEAN NOT NULL DEFAULT FALSE,
    hidden_reason  VARCHAR(255) NULL,
    rating_avg     DECIMAL(3, 2) NOT NULL DEFAULT 0.00,
    rating_count   INT NOT NULL DEFAULT 0,
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_products_farmer FOREIGN KEY (farmer_id) REFERENCES farmer_profiles (id) ON DELETE CASCADE,
    CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories (id),
    INDEX idx_products_farmer (farmer_id, status),
    INDEX idx_products_category (category_id, status),
    INDEX idx_products_visible (is_deleted, is_hidden, status),
    CONSTRAINT ck_products_price CHECK (price >= 0),
    CONSTRAINT ck_products_stock CHECK (stock_quantity >= 0)
);
```

> `is_hidden` + `hidden_reason` **không có trong `db/schema.sql`**. `db/schema.sql` chỉ có `status` dành cho
> Farmer và không có đường nào cho FR-074 ("Admin can view and remove inappropriate product listings").
> Ghi vào mục "Đề xuất LEAD" cuối plan. Không sửa `db/schema.sql` (R-02).

- [ ] **Step 2: `make be-restart`**, `DESCRIBE products;` — `stock_quantity` phải có CHECK `>= 0`.
- [ ] **Step 3: Commit** — `feat(FR-062): products table with soft delete and admin hide`

---

### Task 3.2: Backend — đọc sản phẩm công khai (FR-020…023)

**Files:**
- Create: `modules/product/entities/Product.java`
- Create: `modules/product/enums/ProductStatus.java` (`AVAILABLE`, `SOLD_OUT`, `UNAVAILABLE`;
  dùng `LowercaseEnumConverter` đang có để JSON ra `sold_out`)
- Create: `modules/product/repositories/ProductRepository.java`, `ProductQueryRepository.java`
- Create: `modules/product/resources/ProductListItemResource.java`, `ProductDetailResource.java`
- Create: `modules/product/services/interfaces/ProductQueryServiceInterface.java`,
  `services/impl/ProductQueryService.java`
- Create: `modules/product/controllers/ProductController.java`, `ProductExceptionHandler.java`
- Create: `modules/product/exceptions/ProductNotFoundException.java`
- Modify: `config/SecurityConfig.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/product/services/impl/ProductQueryServiceTest.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/product/repositories/ProductVisibilityFilterTest.java`

**Interfaces:**
- Produces:
  - `ProductListItemResource(Long id, String name, Long farmerId, String stallName, Long marketId,
    String marketName, Long categoryId, String categoryName, BigDecimal price, String unit,
    int stockQuantity, String imageUrl, String status, BigDecimal ratingAvg, int ratingCount)`
  - `ProductDetailResource(ProductListItemResource product, String description,
    StallSummaryResource farmer, ReviewSummaryResource reviewsSummary)` — `reviewsSummary` là
    `new ReviewSummaryResource(BigDecimal.ZERO, 0, List.of())` cho tới C8.
  - `ProductQueryServiceInterface`:
    `PageResource<ProductListItemResource> search(ProductSearchCriteria c)` ·
    `ProductDetailResource detail(long id)` ·
    `PageResource<ProductListItemResource> byFarmer(long farmerId, Integer day, int page, int pageSize)`
  - `ProductSearchCriteria(String q, Long categoryId, Long marketId, Long farmerId, Integer day,
    BigDecimal minPrice, BigDecimal maxPrice, String sort, int page, int pageSize)`
  - Endpoint Public: `GET /api/v1/products`, `/products/{id}`, `/farmers/{id}/products`

- [ ] **Step 1: Viết test — `ProductQueryServiceTest`, 6 test**

| Tên test | Khẳng định |
|---|---|
| `searchMapsSortPriceAscToOrderByPrice` | `sort = "price_asc"` → repo nhận `"p.price ASC"`; `"price_desc"` → `"p.price DESC"`; `"newest"` → `"p.created_at DESC"`; `"rating"` → `"p.rating_avg DESC"` |
| `searchRejectsUnknownSortBySilentlyUsingNewest` | `sort = "'; DROP TABLE products; --"` → repo vẫn nhận `"p.created_at DESC"`. **Đây là lý do sort phải là whitelist, không nối chuỗi** (R-04) |
| `searchSwapsMinAndMaxPriceWhenReversed` | `minPrice = 50000, maxPrice = 10000` → repo nhận `min=10000, max=50000`, không trả rỗng |
| `searchClampsPageSizeToFifty` | `pageSize = 999` → `50` |
| `detailOnMissingProductThrows` | repo rỗng → `ProductNotFoundException` → 404 |
| `detailOnDeletedProductThrows` | `is_deleted = TRUE` → 404, không phải 200 với dữ liệu cũ |

**Review-focus test #5** (Farmer bị đình chỉ), đặt trong `ProductVisibilityFilterTest`:

```java
/**
 * D-09 — sản phẩm của stall bị đình chỉ phải biến mất khỏi mọi trang public, nhưng bản ghi vẫn còn
 * để đơn đang chạy đọc được. Test này đọc thẳng câu SQL hằng số, không cần database.
 */
@Test
void publicProductSqlExcludesSuspendedStallsAndHiddenListings() {
    String sql = ProductQueryRepository.VISIBILITY_FILTER;

    assertThat(sql).contains("f.approval_status = 'approved'");
    assertThat(sql).contains("p.is_deleted = FALSE");
    assertThat(sql).contains("p.is_hidden = FALSE");
    assertThat(sql).doesNotContain("'suspended'");
}
```

- [ ] **Step 2: `make be-test` — đỏ.**

- [ ] **Step 3: Viết `ProductQueryRepository`**

```java
/** Một chỗ duy nhất định nghĩa "sản phẩm nào khách được thấy". Mọi câu public dán mảnh này vào. */
public static final String VISIBILITY_FILTER =
        """
          AND p.is_deleted = FALSE
          AND p.is_hidden = FALSE
          AND f.approval_status = 'approved'
        """;

/** Whitelist sort — giá trị từ query string KHÔNG bao giờ đi thẳng vào ORDER BY (R-04). */
static String orderBy(String sort) {
    return switch (sort == null ? "" : sort) {
        case "price_asc" -> "p.price ASC";
        case "price_desc" -> "p.price DESC";
        case "rating" -> "p.rating_avg DESC";
        default -> "p.created_at DESC";
    };
}
```

Câu chính:

```sql
SELECT p.id, p.name, p.price, p.unit, p.stock_quantity, p.image_url, p.status,
       p.rating_avg, p.rating_count, p.description,
       f.id AS farmer_id, f.stall_name,
       c.id AS category_id, c.name AS category_name,
       m.id AS market_id, m.market_name
FROM products p
JOIN farmer_profiles f ON f.id = p.farmer_id
JOIN categories c ON c.id = p.category_id
LEFT JOIN farmer_markets fm ON fm.farmer_id = f.id AND fm.is_active = TRUE
LEFT JOIN markets m ON m.id = fm.market_id AND m.is_active = TRUE
WHERE 1 = 1
  /* VISIBILITY_FILTER */
  AND (:q IS NULL OR p.name LIKE :q ESCAPE '!' OR c.name LIKE :q ESCAPE '!')
  AND (:categoryId IS NULL OR p.category_id = :categoryId)
  AND (:farmerId IS NULL OR p.farmer_id = :farmerId)
  AND (:marketId IS NULL OR fm.market_id = :marketId)
  AND (:minPrice IS NULL OR p.price >= :minPrice)
  AND (:maxPrice IS NULL OR p.price <= :maxPrice)
  AND (:day IS NULL OR EXISTS (SELECT 1 FROM farmer_operating_days d
                                WHERE d.farmer_market_id = fm.id AND d.day_of_week = :day))
GROUP BY p.id
ORDER BY /* orderBy(sort) */
LIMIT :limit OFFSET :offset
```

> `GROUP BY p.id` là cần thiết: một Farmer bán ở hai chợ sẽ nhân đôi dòng qua `LEFT JOIN farmer_markets`.
> Khi có `:marketId` thì chợ trả về chính là chợ đã lọc; khi không có thì MySQL lấy một chợ bất kỳ —
> chấp nhận được cho thẻ sản phẩm, và `GET /products/{id}` trả **đủ** danh sách chợ qua `farmer.markets`.

- [ ] **Step 4: Viết `ProductQueryService`** — kẹp `pageSize` `[1,50]`, `page >= 1`, hoán đổi min/max khi
  ngược, gọi `orderBy(sort)`, ném `ProductNotFoundException` khi rỗng.

- [ ] **Step 5: Controller + SecurityConfig**

Public: `/api/v1/products`, `/api/v1/products/*`, `/api/v1/farmers/*/products`.

- [ ] **Step 6: `make be-test` — 7 test xanh.**

- [ ] **Step 7: Kiểm tra tay** — `curl -s "localhost:8080/api/v1/products?sort=x';DROP"` phải trả 200 với
  danh sách bình thường, **không** lỗi SQL. Đây là bằng chứng whitelist hoạt động.

- [ ] **Step 8: Commit** — `feat(FR-021): public product search with filters, sort and paging`

---

### Task 3.3: Backend — Farmer CRUD sản phẩm + Admin ẩn listing (FR-062, 064, 074)

**Files:**
- Create: `modules/product/requests/ProductRequest.java`, `ProductStatusRequest.java`, `HideProductRequest.java`
- Create: `modules/product/services/interfaces/ProductServiceInterface.java`, `services/impl/ProductService.java`
- Create: `modules/product/controllers/FarmerProductController.java`, `AdminProductController.java`
- Create: `modules/product/exceptions/ProductNotYoursException.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/product/services/impl/ProductServiceTest.java`

**Interfaces:**
- Consumes: `FarmerProfileRepository` (tra `farmer_profiles` theo `userId`).
- Produces:
  - `ProductRequest(@NotNull Long categoryId, @NotBlank @Size(max=150) String name,
    @Size(max=2000) String description, @NotNull @DecimalMin("0") BigDecimal price,
    @NotBlank @Size(max=20) String unit, @NotNull @Min(0) Integer stockQuantity, String imageUrl)`
  - `ProductServiceInterface`:
    `PageResource<ProductListItemResource> mine(long userId, String status, int page, int pageSize)` ·
    `ProductDetailResource create(long userId, ProductRequest r)` ·
    `ProductDetailResource update(long userId, long productId, ProductRequest r)` ·
    `void softDelete(long userId, long productId)` ·
    `ProductDetailResource setStatus(long userId, long productId, ProductStatus status)` ·
    `void adminHide(long productId, String reason)` · `void adminUnhide(long productId)`
  - Endpoint: `GET|POST /api/v1/farmer/products`, `PUT|DELETE /api/v1/farmer/products/{id}`,
    `PATCH /api/v1/farmer/products/{id}/status` (Farmer) ·
    `PATCH /api/v1/admin/products/{id}/hide`, `/unhide` (Admin)

- [ ] **Step 1: Viết `ProductServiceTest` — 8 test**

| Tên test | Khẳng định |
|---|---|
| `createRejectsStallNotApproved` | `approval_status = 'pending'` → `StallNotApprovedException` → **403**, message "Your stall is pending admin approval" (contract §4) |
| `updateOnAnotherFarmersProductIs403` | product thuộc farmer 2, gọi bằng user của farmer 1 → `ProductNotYoursException` → **403**, **không phải 404** (giám khảo đổi id trên URL) |
| `softDeleteKeepsTheRow` | `is_deleted = TRUE`, `repository.delete` không bao giờ được gọi |
| `setStatusSoldOutDoesNotTouchStock` | `stock_quantity` giữ nguyên sau khi đổi sang `SOLD_OUT` — hai khái niệm khác nhau (FR-064) |
| `createWithUnknownCategoryIs400` | `categoryId` không có → `CategoryNotFoundException` → 404 từ handler của catalog… **không được**: map sang 400 `VALIDATION_ERROR` field `categoryId` |
| `adminHideSetsReasonAndFlag` | `is_hidden = TRUE`, `hidden_reason` lưu đúng chuỗi |
| `farmerCannotUnhideWhatAdminHid` | `setStatus` trên product `is_hidden = TRUE` vẫn chạy, nhưng `is_hidden` **không đổi** — chỉ admin gỡ được |
| `mineReturnsDeletedProductsNever` | danh sách của Farmer lọc `is_deleted = FALSE`, nhưng **vẫn hiện** sản phẩm `is_hidden` kèm lý do, để Farmer biết vì sao mất khỏi trang public |

- [ ] **Step 2: `make be-test` — đỏ.**
- [ ] **Step 3: Viết service.** Quy tắc bất biến: mọi method nhận `userId`, tra
  `farmerProfileRepository.findByUserId(userId)`, rồi so `product.getFarmerId()` với `profile.getId()`.
  **Không method nào nhận `farmerId` từ request** (R-06).
- [ ] **Step 4: Controller.** `FarmerProductController` `@PreAuthorize("hasRole('FARMER')")`,
  `AdminProductController` `@PreAuthorize("hasRole('ADMIN')")`.
- [ ] **Step 5: `make be-test` — 8 test xanh.**
- [ ] **Step 6: Kiểm tra tay** — đăng nhập farmer1, tạo 1 sản phẩm; đăng nhập farmer2, `PUT` lên id đó
  → phải **403**. Ảnh chụp lại mã HTTP này để dùng cho video demo.
- [ ] **Step 7: Commit** — `feat(FR-062): farmer product CRUD and admin listing moderation`

---

### Task 3.4: Seed — 50+ sản phẩm (FR-100 phần 3)

- [ ] **Step 1: Thêm vào `db/seed.sql`** — mỗi Farmer 5–8 sản phẩm, trải đủ 6 danh mục, giá VND thật
  (12.000 – 250.000), `unit` trong `{kg, bó, quả, hộp, vỉ, lít}`, ít nhất 3 sản phẩm `sold_out`
  và 2 sản phẩm `unavailable` để demo FR-064, ít nhất 1 sản phẩm `is_hidden = TRUE` để demo FR-074.
  Dùng `INSERT ... SELECT` join theo `email` + `name` như Task 2.3, kèm
  `ON DUPLICATE KEY UPDATE` — cần thêm `UNIQUE KEY uq_product_per_farmer (farmer_id, name)` vào
  migration Task 3.1 trước khi commit.
- [ ] **Step 2: `make seed`** rồi `curl -s "localhost:8080/api/v1/products?pageSize=1" | grep -o '"total":[0-9]*'`
  → `"total":50` trở lên.
- [ ] **Step 3: Chạy `make seed` lần hai** — vẫn đúng ngần ấy sản phẩm, không nhân đôi.
- [ ] **Step 4: Commit** — `feat(FR-100): fifty demo products across six categories`

---

### Task 3.5: Frontend — nối 8 màn sản phẩm

**Files:**
- Create: `frontend/src/api-requests/product.requests.ts`
- Modify: `pages/public/Products/index.tsx`, `pages/public/ProductDetail/index.tsx`,
  `pages/public/Search/index.tsx`, `pages/public/Home/FreshProducts.tsx`,
  `pages/public/Home/SearchBar.tsx`, `pages/farmer/Products/index.tsx`,
  `pages/farmer/ProductForm/index.tsx`, `pages/admin/Moderation/index.tsx`
- Modify: `frontend/src/data/catalog.ts` — xoá `product`, `products`, `categories`
- Modify: `frontend/src/locales/<10>/Products.json`, `ProductDetail.json`, `Search.json`, `Moderation.json`

**Interfaces:**
- Produces: `ProductApi` + `toProduct(dto): ProductType`:

```ts
export const toProduct = (dto: ProductDto): ProductType => ({
  id: dto.id,
  name: dto.name,
  stall: dto.stallName,
  marketName: dto.marketName ?? '',
  category: dto.categoryName,
  price: dto.price,
  unit: dto.unit,
  stock: dto.stockQuantity,
  status: dto.status,          // 'available' | 'sold_out' | 'unavailable' — giữ nguyên snake_case
  farmerId: dto.farmerId,
  desc: dto.description,
});
```

- [ ] **Step 1: Viết `product.requests.ts`.**
- [ ] **Step 2: `public/Products`** — bộ lọc hiện có (category, price, market, day) gắn vào query string
  đúng tên contract: `categoryId`, `minPrice`, `maxPrice`, `marketId`, `day`, `sort`, `page`, `pageSize`.
  Đổi bộ lọc → `page` về 1. Không gọi API khi người dùng đang gõ: **debounce 300 ms** cho ô `q`.
- [ ] **Step 3: `public/Search`** — FR-023 đòi kết quả **có dạng bản đồ**. Gọi
  `listProducts({ q, pageSize: 50 })` rồi vẽ marker theo `marketId` đã có toạ độ từ `CatalogApi`.
  Không gọi thêm endpoint mới.
- [ ] **Step 4: `farmer/Products` + `ProductForm`** — CRUD thật, `PATCH .../status` cho nút
  "Sold out" / "Unavailable". Sản phẩm bị admin ẩn hiện nhãn khoá kèm `hiddenReason`, nút sửa vẫn bật.
- [ ] **Step 5: `admin/Moderation`** — danh sách sản phẩm `is_hidden = FALSE` có thể ẩn, và ngược lại.
- [ ] **Step 6:** `grep -rn "@/data/catalog" frontend/src/pages` → không còn dòng nào liên quan sản phẩm.
- [ ] **Step 7: `npm run build && npm run lint`** — xanh.
- [ ] **Step 8: Kiểm tra trên trình duyệt** — `/products` hiện 50 sản phẩm, lọc theo "Fruit" ra đúng nhóm,
  sắp theo giá tăng dần đúng thứ tự, đổi trang giữ nguyên bộ lọc. Sản phẩm `sold_out` hiện nhãn và
  **không có nút thêm vào giỏ**. Ở 375 px: lưới 1 cột, không tràn ngang.
- [ ] **Step 9: Commit** — `feat(FR-020): product pages read from the API`
- [ ] **Step 10: Báo đủ 7 điều kiện cho FR-020, 021, 022, 023, 062, 064, 074**

---

## Cụm C4 · Slot nhận hàng — FR-032 (phần slot), FR-067

**Kết quả cụm:** màn "Pickup slots" của Farmer chạy thật; `SlotPicker` trong giỏ có dữ liệu để chọn.
Cụm này **phải xong trước C5** — đặt đơn cần slot.

**Nhánh:** `feature/FR-067-pickup-slots`

### Task 4.1: Migration — pickup_slots

- [ ] **Step 1: Viết `V20260926008__create_pickup_slots_table.sql`**

```sql
-- FR-032, FR-067, D-06. Một slot = một Farmer, một chợ, một ngày, một khung giờ.
CREATE TABLE pickup_slots (
    id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    farmer_market_id BIGINT UNSIGNED NOT NULL,
    slot_date        DATE NOT NULL,
    start_time       TIME NOT NULL,
    end_time         TIME NOT NULL,
    max_orders       INT NOT NULL DEFAULT 5,
    booked_count     INT NOT NULL DEFAULT 0,
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_slot_farmer_market FOREIGN KEY (farmer_market_id)
        REFERENCES farmer_markets (id) ON DELETE CASCADE,
    UNIQUE KEY uq_slot (farmer_market_id, slot_date, start_time),
    INDEX idx_slot_date (slot_date, is_active),
    -- D-06: hàng rào cuối cùng. Kể cả khi code sai, database vẫn không cho vượt slot.
    CONSTRAINT ck_slot_capacity CHECK (booked_count >= 0 AND booked_count <= max_orders)
);
```

- [ ] **Step 2: `make be-restart`**, xác nhận `SHOW CREATE TABLE pickup_slots;` có `ck_slot_capacity`.
- [ ] **Step 3: Commit** — `feat(FR-067): pickup slots with a capacity constraint`

### Task 4.2: Backend — sinh và quản slot

**Files:**
- Create: `modules/stall/entities/PickupSlot.java`, `repositories/PickupSlotRepository.java`
- Create: `modules/stall/requests/GenerateSlotsRequest.java`, `UpdateSlotRequest.java`
- Create: `modules/stall/resources/SlotResource.java`
- Modify: `modules/stall/services/impl/StallService.java` (thêm 3 method) hoặc tách
  `services/impl/SlotService.java` nếu `StallService` đã quá 300 dòng
- Create: `modules/stall/controllers/FarmerSlotController.java`
- Modify: `modules/stall/controllers/PublicFarmerController.java` — thêm `GET /farmers/{id}/slots`
- Test: `backend/src/test/java/com/techx/intervue/modules/stall/services/impl/SlotServiceTest.java`

**Interfaces:**
- Produces:
  - `SlotResource(Long slotId, Long farmerMarketId, Long marketId, String slotDate, String startTime,
    String endTime, int maxOrders, int bookedCount, boolean isFull)` — `isFull = bookedCount >= maxOrders`
  - `GenerateSlotsRequest(@NotNull Long farmerMarketId, @NotNull LocalDate fromDate,
    @NotNull LocalDate toDate, @Min(15) @Max(240) int slotMinutes, @Min(1) @Max(100) int maxOrders)`
  - `List<SlotResource> generateSlots(long userId, GenerateSlotsRequest r)` ·
    `SlotResource updateSlot(long userId, long slotId, UpdateSlotRequest r)` ·
    `List<SlotResource> publicSlots(long farmerId, Long marketId, LocalDate date)`
  - **Dùng ở C5:** `Optional<PickupSlot> lockSlotForUpdate(long slotId)` —
    `@Lock(LockModeType.PESSIMISTIC_WRITE)` trên `PickupSlotRepository.findById`.

- [ ] **Step 1: Viết `SlotServiceTest` — 8 test**

| Tên test | Khẳng định |
|---|---|
| `generateCreatesOneSlotPerWindowPerMatchingWeekday` | `farmer_operating_days` có CN 07:00–11:00, `slotMinutes = 60`, khoảng 7 ngày → đúng 4 slot cho ngày CN duy nhất trong khoảng |
| `generateSkipsWeekdaysWithNoOperatingDay` | T3 không khai giờ → không sinh slot nào cho T3 |
| `generateIsIdempotent` | chạy hai lần cùng tham số → vẫn đúng ngần ấy slot (nhờ `uq_slot`, dùng `INSERT IGNORE` hoặc bắt `DataIntegrityViolationException`) |
| `generateRejectsRangeLongerThanSixtyDays` | `fromDate` → `toDate` cách 90 ngày → `IllegalArgumentException` |
| `generateRejectsPastFromDate` | `fromDate` hôm qua → `IllegalArgumentException("past")` |
| `generateOnAnotherFarmersMarketIs403` | `farmerMarketId` thuộc Farmer khác → `ProductNotYoursException`-tương đương → **403** |
| `updateSlotRejectsMaxOrdersBelowBookedCount` | `bookedCount = 3`, đặt `maxOrders = 2` → **409**, không phá đơn đã có |
| `publicSlotsMarksFullSlots` | `bookedCount = maxOrders` → `isFull = true`; slot `is_active = FALSE` không xuất hiện |

- [ ] **Step 2: `make be-test` — đỏ.**
- [ ] **Step 3: Viết service.** Vòng sinh slot:

```java
/** Cắt [start, end) của một ngày thành các khung slotMinutes phút. Khung lẻ cuối bị bỏ. */
static List<LocalTime[]> windows(LocalTime start, LocalTime end, int slotMinutes) {
    List<LocalTime[]> out = new ArrayList<>();
    for (LocalTime t = start; !t.plusMinutes(slotMinutes).isAfter(end); t = t.plusMinutes(slotMinutes)) {
        out.add(new LocalTime[] {t, t.plusMinutes(slotMinutes)});
    }
    return out;
}
```

- [ ] **Step 4: Controller.** Public `GET /api/v1/farmers/*/slots` thêm vào `SecurityConfig`.
- [ ] **Step 5: `make be-test` — 8 test xanh.**
- [ ] **Step 6: Seed** — thêm vào `db/seed.sql` một khối sinh slot cho **4 tuần tới** từ
  `farmer_operating_days`, `max_orders = 5`. Dùng bảng số học thuần SQL (`JOIN` một bảng số 0…27) để
  không phụ thuộc backend. `make seed` rồi kiểm:
  `curl -s "localhost:8080/api/v1/farmers/1/slots?date=$(date -v+2d +%F)"` → có slot, `isFull: false`.
- [ ] **Step 7: Frontend** — `pages/farmer/Slots/index.tsx` gọi thật:
  danh sách theo tuần, nút "Generate", sửa `maxOrders` từng slot, nút tắt slot.
  `npm run build && npm run lint` xanh.
- [ ] **Step 8: Commit** — `feat(FR-067): farmers generate and manage pickup slots`
- [ ] **Step 9: Báo đủ 7 điều kiện cho FR-067**

---

## Cụm C5 · Đơn hàng ⭐ đường găng — FR-030…038, 065, 066, 042

**Kết quả cụm:** đặt trước chạy trọn vòng đời `placed → accepted → ready → completed` cùng ba nhánh
`declined` / `cancelled` / sửa đơn. Đây là cụm đề nhấn mạnh nhất và là cụm dễ sai nhất.
**Đừng gộp task. Đừng bỏ test.**

**Nhánh:** `feature/FR-030-orders`

### Task 5.1: Migration — orders, order_items, order_status_history

- [ ] **Step 1: Viết `V20260926009__create_orders_tables.sql`**

```sql
-- FR-030…038, D-01 (một đơn = một Farmer = một chợ = một slot), D-04 (6 trạng thái), D-05 (cutoff).
CREATE TABLE orders (
    id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_code    VARCHAR(20) NOT NULL UNIQUE,
    customer_id   BIGINT UNSIGNED NOT NULL,
    farmer_id     BIGINT UNSIGNED NOT NULL,
    market_id     BIGINT UNSIGNED NOT NULL,
    slot_id       BIGINT UNSIGNED NULL,
    pickup_date   DATE NOT NULL,
    pickup_start  TIME NOT NULL,
    pickup_end    TIME NOT NULL,
    cutoff_at     DATETIME NOT NULL,
    total_amount  DECIMAL(12, 2) NOT NULL DEFAULT 0,
    status        ENUM('placed','accepted','declined','ready','completed','cancelled')
                  NOT NULL DEFAULT 'placed',
    customer_note VARCHAR(255) NULL,
    farmer_note   VARCHAR(255) NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES users (id),
    CONSTRAINT fk_orders_farmer   FOREIGN KEY (farmer_id)   REFERENCES farmer_profiles (id),
    CONSTRAINT fk_orders_market   FOREIGN KEY (market_id)   REFERENCES markets (id),
    CONSTRAINT fk_orders_slot     FOREIGN KEY (slot_id)     REFERENCES pickup_slots (id) ON DELETE SET NULL,
    INDEX idx_orders_customer (customer_id, status),
    INDEX idx_orders_farmer (farmer_id, status),
    INDEX idx_orders_pickup (pickup_date)
);

-- Snapshot tên + giá lúc đặt: Farmer đổi giá sau đó thì đơn cũ không đổi theo.
CREATE TABLE order_items (
    id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id     BIGINT UNSIGNED NOT NULL,
    product_id   BIGINT UNSIGNED NOT NULL,
    product_name VARCHAR(150) NOT NULL,
    unit_price   DECIMAL(10, 2) NOT NULL,
    unit         VARCHAR(20) NOT NULL,
    quantity     INT NOT NULL,
    subtotal     DECIMAL(12, 2) NOT NULL,
    CONSTRAINT fk_items_order   FOREIGN KEY (order_id)   REFERENCES orders (id) ON DELETE CASCADE,
    CONSTRAINT fk_items_product FOREIGN KEY (product_id) REFERENCES products (id),
    UNIQUE KEY uq_order_product (order_id, product_id),
    INDEX idx_items_order (order_id),
    CONSTRAINT ck_items_qty CHECK (quantity > 0)
);

-- FR-038: mọi lần đổi trạng thái đều ghi lại.
CREATE TABLE order_status_history (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id    BIGINT UNSIGNED NOT NULL,
    from_status VARCHAR(20) NULL,
    to_status   VARCHAR(20) NOT NULL,
    changed_by  BIGINT UNSIGNED NULL,
    note        VARCHAR(255) NULL,
    changed_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_history_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
    CONSTRAINT fk_history_user  FOREIGN KEY (changed_by) REFERENCES users (id) ON DELETE SET NULL,
    INDEX idx_history_order (order_id, changed_at)
);
```

> `uq_order_product` không có trong `db/schema.sql`. Thêm vì D-07 cho phép **sửa số lượng** của một
> item — hai dòng cùng `product_id` trong một đơn làm phép sửa nhập nhằng. Ghi vào "Đề xuất LEAD".

- [ ] **Step 2: `make be-restart`**, `DESCRIBE orders;` — `status` phải đủ 6 giá trị.
- [ ] **Step 3: Commit** — `feat(FR-030): orders, order items and status history tables`

---

### Task 5.2: Backend — máy trạng thái và tính cutoff (không I/O)

Tách riêng vì đây là phần logic thuần, test được mà không cần database, và ba task sau đều dựa vào nó.

**Files:**
- Create: `modules/order/enums/OrderStatus.java`
- Create: `modules/order/services/impl/OrderLifecycle.java`
- Create: `modules/order/exceptions/InvalidOrderTransitionException.java`, `CutoffPassedException.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/order/services/impl/OrderLifecycleTest.java`

**Interfaces:**
- Produces:
  - `enum OrderStatus { PLACED, ACCEPTED, DECLINED, READY, COMPLETED, CANCELLED }`
  - `OrderLifecycle` (toàn static, không state):
    `static void assertTransition(OrderStatus from, OrderStatus to)` — sai → `InvalidOrderTransitionException`
    `static boolean restoresStock(OrderStatus to)` — `true` với `DECLINED` và `CANCELLED`
    `static LocalDateTime cutoffAt(LocalDate pickupDate, LocalTime pickupStart, int cutoffHours)`
    `static boolean canCustomerCancel(OrderStatus s, LocalDateTime cutoffAt, LocalDateTime now)`
    `static boolean canCustomerModify(OrderStatus s, LocalDateTime cutoffAt, LocalDateTime now)`

- [ ] **Step 1: Viết test thất bại**

```java
package com.techx.intervue.modules.order.services.impl;

import static com.techx.intervue.modules.order.enums.OrderStatus.ACCEPTED;
import static com.techx.intervue.modules.order.enums.OrderStatus.CANCELLED;
import static com.techx.intervue.modules.order.enums.OrderStatus.COMPLETED;
import static com.techx.intervue.modules.order.enums.OrderStatus.DECLINED;
import static com.techx.intervue.modules.order.enums.OrderStatus.PLACED;
import static com.techx.intervue.modules.order.enums.OrderStatus.READY;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.techx.intervue.modules.order.exceptions.InvalidOrderTransitionException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import org.junit.jupiter.api.Test;

/** D-04 và D-05 viết thành code. Mọi luật về "được đổi sang trạng thái nào" sống ở đúng một chỗ. */
class OrderLifecycleTest {

    @Test
    void allowsTheHappyPath() {
        assertThatCode(() -> {
                    OrderLifecycle.assertTransition(PLACED, ACCEPTED);
                    OrderLifecycle.assertTransition(ACCEPTED, READY);
                    OrderLifecycle.assertTransition(READY, COMPLETED);
                })
                .doesNotThrowAnyException();
    }

    @Test
    void allowsDeclineOnlyFromPlaced() {
        assertThatCode(() -> OrderLifecycle.assertTransition(PLACED, DECLINED)).doesNotThrowAnyException();
        assertThatThrownBy(() -> OrderLifecycle.assertTransition(ACCEPTED, DECLINED))
                .isInstanceOf(InvalidOrderTransitionException.class);
    }

    /** D-04: "accepted cũng có thể bị khách cancel trước cutoff". */
    @Test
    void allowsCancelFromPlacedAndAccepted() {
        assertThatCode(() -> OrderLifecycle.assertTransition(PLACED, CANCELLED)).doesNotThrowAnyException();
        assertThatCode(() -> OrderLifecycle.assertTransition(ACCEPTED, CANCELLED)).doesNotThrowAnyException();
    }

    @Test
    void refusesCancelOnceReady() {
        assertThatThrownBy(() -> OrderLifecycle.assertTransition(READY, CANCELLED))
                .isInstanceOf(InvalidOrderTransitionException.class);
    }

    @Test
    void refusesEveryTransitionOutOfATerminalStatus() {
        for (var terminal : new Object[] {COMPLETED, DECLINED, CANCELLED}) {
            assertThatThrownBy(() ->
                            OrderLifecycle.assertTransition((com.techx.intervue.modules.order.enums.OrderStatus)
                                    terminal, ACCEPTED))
                    .isInstanceOf(InvalidOrderTransitionException.class);
        }
    }

    @Test
    void refusesSkippingAcceptedStraightToReady() {
        assertThatThrownBy(() -> OrderLifecycle.assertTransition(PLACED, READY))
                .isInstanceOf(InvalidOrderTransitionException.class);
    }

    /** D-07: sửa đơn đưa đơn về placed, kể cả khi Farmer đã accept. */
    @Test
    void allowsGoingBackFromAcceptedToPlaced() {
        assertThatCode(() -> OrderLifecycle.assertTransition(ACCEPTED, PLACED)).doesNotThrowAnyException();
    }

    @Test
    void onlyDeclinedAndCancelledGiveStockBack() {
        assertThat(OrderLifecycle.restoresStock(DECLINED)).isTrue();
        assertThat(OrderLifecycle.restoresStock(CANCELLED)).isTrue();
        assertThat(OrderLifecycle.restoresStock(COMPLETED)).isFalse();
        assertThat(OrderLifecycle.restoresStock(READY)).isFalse();
    }

    /** D-05: cutoff_at = pickup_datetime − order_cutoff_hours. */
    @Test
    void cutoffIsPickupStartMinusFarmerHours() {
        LocalDateTime cutoff = OrderLifecycle.cutoffAt(LocalDate.of(2026, 10, 4), LocalTime.of(8, 0), 12);

        assertThat(cutoff).isEqualTo(LocalDateTime.of(2026, 10, 3, 20, 0));
    }

    @Test
    void cutoffCrossesMonthBoundaryCorrectly() {
        LocalDateTime cutoff = OrderLifecycle.cutoffAt(LocalDate.of(2026, 10, 1), LocalTime.of(7, 0), 24);

        assertThat(cutoff).isEqualTo(LocalDateTime.of(2026, 9, 30, 7, 0));
    }

    @Test
    void cannotCancelAfterCutoffEvenOneSecondLate() {
        LocalDateTime cutoff = LocalDateTime.of(2026, 10, 3, 20, 0);

        assertThat(OrderLifecycle.canCustomerCancel(PLACED, cutoff, cutoff.minusSeconds(1))).isTrue();
        assertThat(OrderLifecycle.canCustomerCancel(PLACED, cutoff, cutoff)).isFalse();
        assertThat(OrderLifecycle.canCustomerCancel(PLACED, cutoff, cutoff.plusSeconds(1))).isFalse();
    }

    @Test
    void cannotModifyAnOrderThatIsAlreadyReady() {
        LocalDateTime cutoff = LocalDateTime.of(2026, 10, 3, 20, 0);

        assertThat(OrderLifecycle.canCustomerModify(READY, cutoff, cutoff.minusHours(1))).isFalse();
        assertThat(OrderLifecycle.canCustomerModify(PLACED, cutoff, cutoff.minusHours(1))).isTrue();
        assertThat(OrderLifecycle.canCustomerModify(ACCEPTED, cutoff, cutoff.minusHours(1))).isTrue();
    }
}
```

- [ ] **Step 2: `make be-test` — đỏ** (`OrderLifecycle` chưa có).

- [ ] **Step 3: Viết `OrderLifecycle`**

```java
package com.techx.intervue.modules.order.services.impl;

import static com.techx.intervue.modules.order.enums.OrderStatus.ACCEPTED;
import static com.techx.intervue.modules.order.enums.OrderStatus.CANCELLED;
import static com.techx.intervue.modules.order.enums.OrderStatus.COMPLETED;
import static com.techx.intervue.modules.order.enums.OrderStatus.DECLINED;
import static com.techx.intervue.modules.order.enums.OrderStatus.PLACED;
import static com.techx.intervue.modules.order.enums.OrderStatus.READY;

import com.techx.intervue.modules.order.enums.OrderStatus;
import com.techx.intervue.modules.order.exceptions.InvalidOrderTransitionException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Map;
import java.util.Set;

/**
 * D-04 và D-05 viết thành code. Không truy cập database, không phụ thuộc Spring — nhờ vậy mọi luật
 * vòng đời đơn hàng test được bằng JUnit thuần và chỉ có đúng một định nghĩa trong cả dự án.
 */
public final class OrderLifecycle {

    private static final Map<OrderStatus, Set<OrderStatus>> ALLOWED = Map.of(
            PLACED, Set.of(ACCEPTED, DECLINED, CANCELLED),
            // Khách vẫn huỷ được trước cutoff; sửa đơn đưa về placed để Farmer duyệt lại (D-07)
            ACCEPTED, Set.of(READY, CANCELLED, PLACED),
            READY, Set.of(COMPLETED),
            COMPLETED, Set.of(),
            DECLINED, Set.of(),
            CANCELLED, Set.of());

    private OrderLifecycle() {}

    public static void assertTransition(OrderStatus from, OrderStatus to) {
        if (!ALLOWED.getOrDefault(from, Set.of()).contains(to)) {
            throw new InvalidOrderTransitionException(from, to);
        }
    }

    /** D-02: tồn kho quay lại kho khi đơn chết, không quay lại khi đơn đi tiếp. */
    public static boolean restoresStock(OrderStatus to) {
        return to == DECLINED || to == CANCELLED;
    }

    public static LocalDateTime cutoffAt(LocalDate pickupDate, LocalTime pickupStart, int cutoffHours) {
        return LocalDateTime.of(pickupDate, pickupStart).minusHours(cutoffHours);
    }

    /** Đúng thời điểm cutoff đã là muộn — biên đóng ở phía khách. */
    private static boolean beforeCutoff(LocalDateTime cutoffAt, LocalDateTime now) {
        return now.isBefore(cutoffAt);
    }

    public static boolean canCustomerCancel(OrderStatus status, LocalDateTime cutoffAt, LocalDateTime now) {
        return (status == PLACED || status == ACCEPTED) && beforeCutoff(cutoffAt, now);
    }

    public static boolean canCustomerModify(OrderStatus status, LocalDateTime cutoffAt, LocalDateTime now) {
        return (status == PLACED || status == ACCEPTED) && beforeCutoff(cutoffAt, now);
    }
}
```

- [ ] **Step 4: `make be-test` — 12 test xanh.**
- [ ] **Step 5: Commit** — `feat(FR-033): order lifecycle rules and cutoff arithmetic`

---

### Task 5.3: Backend — xem trước và đặt đơn (FR-030, 031, 032) ⭐

**Files:**
- Create: `modules/order/entities/Order.java`, `OrderItem.java`, `OrderStatusHistory.java`
- Create: `modules/order/repositories/OrderRepository.java`, `OrderItemRepository.java`,
  `OrderStatusHistoryRepository.java`
- Create: `modules/order/requests/PreviewRequest.java`, `PlaceOrderRequest.java`
- Create: `modules/order/resources/OrderGroupPreviewResource.java`, `PlacedOrderResource.java`
- Create: `modules/order/services/interfaces/OrderServiceInterface.java`, `services/impl/OrderService.java`
- Create: `modules/order/services/impl/OrderCodeGenerator.java`
- Create: `modules/order/controllers/OrderController.java`, `OrderExceptionHandler.java`
- Create: `modules/order/exceptions/OutOfStockException.java`, `SlotFullException.java`,
  `SlotNotAvailableException.java`, `OrderNotYoursException.java`
- Modify: `modules/product/repositories/ProductRepository.java` — thêm khoá bi quan
- Modify: `modules/stall/repositories/PickupSlotRepository.java` — thêm khoá bi quan
- Test: `backend/src/test/java/com/techx/intervue/modules/order/services/impl/OrderServiceTest.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/order/services/impl/PlaceOrderConcurrencyTest.java`

**Interfaces:**
- Consumes: `OrderLifecycle` (5.2), `ProductRepository`, `PickupSlotRepository`, `FarmerProfileRepository`.
- Produces:
  - `PreviewRequest(@NotEmpty List<CartLine> items)`, `CartLine(@NotNull Long productId, @Min(1) Integer quantity)`
  - `OrderGroupPreviewResource(Long farmerId, String stallName, Long marketId, String marketName,
    int orderCutoffHours, List<PreviewItemResource> items, BigDecimal subtotal, List<String> problems)`
  - `PlaceOrderRequest(@NotEmpty @Valid List<OrderGroupInput> groups)`,
    `OrderGroupInput(@NotNull Long farmerId, @NotNull Long marketId, Long slotId,
    @NotNull LocalDate pickupDate, @NotEmpty @Valid List<CartLine> items, @Size(max=255) String customerNote)`
  - `PlacedOrderResource(Long orderId, String orderCode, String status, String cutoffAt, BigDecimal totalAmount)`
  - `List<OrderGroupPreviewResource> preview(Long userIdOrNull, PreviewRequest r)` ·
    `List<PlacedOrderResource> place(long customerUserId, PlaceOrderRequest r)`
  - Endpoint: `POST /api/v1/orders/preview` (Customer) · `POST /api/v1/orders` (Customer)

- [ ] **Step 1: Viết `OrderServiceTest` — 11 test**

| Tên test | Khẳng định |
|---|---|
| `previewSplitsCartByFarmer` | giỏ 3 item của 2 Farmer → đúng 2 group, tổng từng group đúng (D-01) |
| `previewFlagsItemsOverStock` | `quantity` > `stock_quantity` → group có `problems` chứa `"out_of_stock"`, **không ném exception** — xem trước phải xem được |
| `previewFlagsSoldOutProducts` | product `status = sold_out` → `problems` chứa `"sold_out"` |
| `placeCreatesOneOrderPerGroup` | 2 group → 2 dòng `orders`, mỗi dòng một `farmer_id` khác nhau |
| `placeDeductsStockInTheSameTransaction` | `stock_quantity` giảm đúng `quantity` ngay khi đơn ở `placed`, không đợi accept (D-02) |
| `placeRefusesWhenStockIsShort` | đặt 10, tồn 3 → `OutOfStockException` → **409**, và `stock_quantity` **vẫn là 3** (transaction rollback) |
| `placeRefusesWhenSlotIsFull` | `booked_count = max_orders` → `SlotFullException` → **409** |
| `placeIncrementsBookedCount` | đặt thành công → `booked_count` tăng đúng 1 cho mỗi đơn, không phải mỗi item |
| `placeComputesCutoffFromTheFarmersOwnHours` | Farmer A `cutoffHours = 6`, Farmer B `= 24` → hai đơn cùng giỏ có `cutoff_at` khác nhau (D-05) |
| `placeWritesTheFirstHistoryRow` | `order_status_history` có đúng 1 dòng `from_status = NULL`, `to_status = 'placed'` (FR-038) |
| `placeSnapshotsNameAndPrice` | đổi `products.price` sau khi đặt → `order_items.unit_price` không đổi |

**Review-focus test #4** (D-13, admin không mua), cũng trong file này:

```java
/** D-13 — ẩn nút không phải là biện pháp kiểm soát. Vai admin phải bị chặn ở server. */
@Test
void placeRefusesAnAdminAccount() {
    when(userRepository.findById(ADMIN_ID)).thenReturn(Optional.of(adminUser()));

    assertThatThrownBy(() -> service.place(ADMIN_ID, aValidRequest()))
            .isInstanceOf(AccessDeniedException.class);
    verify(orderRepository, never()).save(any());
}
```

**Review-focus test #1 và #2** (tranh chấp tồn kho và slot) — file riêng
`PlaceOrderConcurrencyTest`, chạy thật trên database vì mục đích là chứng minh khoá hoạt động:

```java
package com.techx.intervue.modules.order.services.impl;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Review focus #1 và #2. Hai khách cùng giành lô hàng cuối và slot cuối.
 * Đúng một người thắng; người kia nhận 409. Không có tồn âm, không có booked_count vượt max_orders.
 */
@SpringBootTest
class PlaceOrderConcurrencyTest {

    @Autowired
    private OrderService service;

    @Test
    void onlyOneOfTwoSimultaneousOrdersGetsTheLastUnit() throws Exception {
        long productId = givenProductWithStock(1);
        long slotId = givenSlotWithCapacity(5);

        ExecutorService pool = Executors.newFixedThreadPool(2);
        Callable<Boolean> attempt = () -> {
            try {
                service.place(someCustomer(), requestFor(productId, 1, slotId));
                return true;
            } catch (OutOfStockException e) {
                return false;
            }
        };

        List<Boolean> results = pool.invokeAll(List.of(attempt, attempt)).stream()
                .map(f -> {
                    try {
                        return f.get();
                    } catch (Exception e) {
                        throw new IllegalStateException(e);
                    }
                })
                .toList();
        pool.shutdown();

        assertThat(results).containsExactlyInAnyOrder(true, false);
        assertThat(stockOf(productId)).isZero();
    }

    @Test
    void bookedCountNeverExceedsMaxOrders() throws Exception {
        long productId = givenProductWithStock(100);
        long slotId = givenSlotWithCapacity(1);

        ExecutorService pool = Executors.newFixedThreadPool(2);
        Callable<Boolean> attempt = () -> {
            try {
                service.place(someCustomer(), requestFor(productId, 1, slotId));
                return true;
            } catch (SlotFullException e) {
                return false;
            }
        };

        List<Boolean> results = pool.invokeAll(List.of(attempt, attempt)).stream()
                .map(f -> {
                    try {
                        return f.get();
                    } catch (Exception e) {
                        throw new IllegalStateException(e);
                    }
                })
                .toList();
        pool.shutdown();

        assertThat(results).containsExactlyInAnyOrder(true, false);
        assertThat(bookedCountOf(slotId)).isEqualTo(1);
    }
}
```

> `givenProductWithStock`, `givenSlotWithCapacity`, `someCustomer`, `requestFor`, `stockOf`,
> `bookedCountOf` là helper viết trong chính file test, dùng `JdbcTemplate` chèn dữ liệu tối thiểu.
> Nếu `@SpringBootTest` trong dự án này cần MySQL đang chạy thì test chạy qua `make be-test`
> (container đã có MySQL) — giống `AchievementServiceIntegrationTest` đang có.

- [ ] **Step 2: `make be-test` — đỏ.**

- [ ] **Step 3: Thêm khoá bi quan vào hai repository**

```java
// ProductRepository
/**
 * Khoá dòng sản phẩm cho tới hết transaction. Không có nó thì hai đơn cùng đọc stock = 1,
 * cùng thấy đủ, cùng trừ, và tồn kho xuống âm (Review focus #1).
 */
@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("select p from Product p where p.id in :ids order by p.id")
List<Product> lockAllById(@Param("ids") Collection<Long> ids);
```

```java
// PickupSlotRepository
@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("select s from PickupSlot s where s.id = :id")
Optional<PickupSlot> lockById(@Param("id") Long id);
```

> `order by p.id` trong `lockAllById` **không phải để sắp xếp kết quả**: nó ép mọi transaction khoá
> các dòng theo cùng thứ tự, nên hai đơn có chung hai sản phẩm không khoá chéo nhau thành deadlock.

- [ ] **Step 4: Viết `OrderService.place`**

```java
/**
 * D-01 + D-02 + D-06. Cả lệnh đặt nằm trong một transaction: hoặc mọi đơn trong giỏ được tạo và
 * tồn kho / slot trừ xong, hoặc không gì cả. Thứ tự bắt buộc: khoá slot trước, khoá sản phẩm sau,
 * ở mọi nhánh — đổi thứ tự giữa hai nhánh là mở đường cho deadlock.
 */
@Override
@Transactional
public List<PlacedOrderResource> place(long customerUserId, PlaceOrderRequest request) {
    User customer = userRepository.findById(customerUserId).orElseThrow();
    if (customer.getRole() != RoleType.ADMIN) {
        // D-13: chỉ customer và farmer mua được; admin dùng tài khoản riêng
    } else {
        throw new AccessDeniedException("Admin accounts cannot place orders.");
    }

    List<PlacedOrderResource> placed = new ArrayList<>();
    for (OrderGroupInput group : request.groups()) {
        FarmerProfile farmer = farmerRepository
                .findById(group.farmerId())
                .filter(f -> f.getApprovalStatus() == ApprovalStatus.APPROVED)
                .orElseThrow(() -> new StallNotApprovedException(group.farmerId()));

        PickupSlot slot = null;
        LocalTime start;
        LocalTime end;
        if (group.slotId() != null) {
            slot = slotRepository.lockById(group.slotId()).orElseThrow(SlotNotAvailableException::new);
            if (!slot.isActive() || !slot.getSlotDate().equals(group.pickupDate())) {
                throw new SlotNotAvailableException();
            }
            if (slot.getBookedCount() >= slot.getMaxOrders()) {
                throw new SlotFullException(slot.getId());
            }
            slot.setBookedCount(slot.getBookedCount() + 1);
            start = slot.getStartTime();
            end = slot.getEndTime();
        } else {
            throw new SlotNotAvailableException();
        }

        Map<Long, Integer> wanted = group.items().stream()
                .collect(Collectors.toMap(CartLine::productId, CartLine::quantity, Integer::sum));
        List<Product> products = productRepository.lockAllById(wanted.keySet());
        if (products.size() != wanted.size()) {
            throw new ProductNotFoundException(0L);
        }

        BigDecimal total = BigDecimal.ZERO;
        List<OrderItem> items = new ArrayList<>();
        for (Product p : products) {
            int qty = wanted.get(p.getId());
            if (!p.getFarmerId().equals(farmer.getId())) {
                throw new IllegalArgumentException("Product " + p.getId() + " is not sold by this stall.");
            }
            if (p.getStatus() != ProductStatus.AVAILABLE || p.isDeleted() || p.isHidden()) {
                throw new OutOfStockException(p.getId(), p.getName());
            }
            if (p.getStockQuantity() < qty) {
                throw new OutOfStockException(p.getId(), p.getName());
            }
            p.setStockQuantity(p.getStockQuantity() - qty);
            if (p.getStockQuantity() == 0) {
                p.setStatus(ProductStatus.SOLD_OUT);
            }

            BigDecimal subtotal = p.getPrice().multiply(BigDecimal.valueOf(qty));
            total = total.add(subtotal);
            items.add(OrderItem.snapshot(p, qty, subtotal));
        }

        Order order = new Order();
        order.setOrderCode(codeGenerator.next());
        order.setCustomerId(customerUserId);
        order.setFarmerId(farmer.getId());
        order.setMarketId(group.marketId());
        order.setSlotId(slot.getId());
        order.setPickupDate(group.pickupDate());
        order.setPickupStart(start);
        order.setPickupEnd(end);
        order.setCutoffAt(OrderLifecycle.cutoffAt(group.pickupDate(), start, farmer.getOrderCutoffHours()));
        order.setTotalAmount(total);
        order.setStatus(OrderStatus.PLACED);
        order.setCustomerNote(group.customerNote());
        orderRepository.save(order);

        items.forEach(i -> i.setOrderId(order.getId()));
        orderItemRepository.saveAll(items);
        history.record(order.getId(), null, OrderStatus.PLACED, customerUserId, null);

        placed.add(new PlacedOrderResource(
                order.getId(),
                order.getOrderCode(),
                "placed",
                order.getCutoffAt().toString(),
                order.getTotalAmount()));
    }
    return placed;
}
```

`OrderCodeGenerator.next()` trả `ML-yyyyMMdd-NNNN`, `NNNN` là số đơn trong ngày + 1, lấy bằng
`SELECT COUNT(*) FROM orders WHERE DATE(created_at) = CURDATE()` **trong cùng transaction**;
va chạm `order_code` (UNIQUE) thì thử lại tối đa 5 lần.

- [ ] **Step 5: Viết `OrderService.preview`** — chỉ đọc, không khoá, không đổi gì. Gom theo `farmer_id`,
  tính `subtotal`, và điền `problems[]` (`out_of_stock`, `sold_out`, `stall_suspended`) thay vì ném lỗi.

- [ ] **Step 6: `OrderExceptionHandler`** — `OutOfStockException` → **409** `OUT_OF_STOCK`;
  `SlotFullException` → **409** `SLOT_FULL`; `SlotNotAvailableException` → **409** `SLOT_UNAVAILABLE`;
  `InvalidOrderTransitionException` → **409** `INVALID_TRANSITION`; `CutoffPassedException` → **409**
  `CUTOFF_PASSED`; `OrderNotYoursException` → **403**; `AccessDeniedException` → **403**.
  **Không dùng 400 cho nhóm này** (R-06).

- [ ] **Step 7: `make be-test` — 12 test xanh** (11 + admin), và 2 test concurrency xanh.

- [ ] **Step 8: Kiểm tra tay — đây là bằng chứng quan trọng nhất của cả dự án**

```bash
# đăng nhập customer, lấy token
TOKEN=$(curl -s -X POST localhost:8080/api/v1/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"customer@marketlink.vn","password":"Demo@1234"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['accessToken'])")

# xem trước giỏ 2 Farmer
curl -s -X POST localhost:8080/api/v1/orders/preview -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"items":[{"productId":1,"quantity":2},{"productId":30,"quantity":1}]}' | python3 -m json.tool
```
Kỳ vọng: đúng **2** phần tử trong `data`, mỗi phần tử một `farmerId`. Đây là D-01 nhìn thấy được.

- [ ] **Step 9: Commit** — `feat(FR-031): place pre-orders, split by farmer, deducting stock and slots`

---

### Task 5.4: Backend — đọc đơn, hai phía (FR-033, 036, 065)

**Files:**
- Create: `modules/order/repositories/OrderQueryRepository.java`
- Create: `modules/order/resources/OrderListItemResource.java`, `OrderDetailResource.java`,
  `OrderItemResource.java`, `OrderHistoryResource.java`
- Modify: `modules/order/services/impl/OrderService.java`
- Modify: `modules/order/controllers/OrderController.java`
- Create: `modules/order/controllers/FarmerOrderController.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/order/services/impl/OrderAccessTest.java`

**Interfaces:**
- Produces:
  - `OrderListItemResource(Long orderId, String orderCode, String status, Long farmerId, String stallName,
    Long marketId, String marketName, String pickupDate, String pickupStart, String pickupEnd,
    String cutoffAt, BigDecimal totalAmount, int itemCount, String createdAt)`
  - `OrderDetailResource(OrderListItemResource summary, List<OrderItemResource> items,
    List<OrderHistoryResource> statusHistory, boolean canCancel, boolean canModify,
    String customerNote, String farmerNote, CustomerSummaryResource customer)` —
    `customer` **chỉ có mặt khi người gọi là Farmer của đơn đó**; customer gọi thì trường này vắng.
  - `PageResource<OrderListItemResource> myOrders(long userId, String status, int page, int pageSize)` ·
    `OrderDetailResource detail(long userId, long orderId)` ·
    `PageResource<OrderListItemResource> farmerOrders(long userId, String status, LocalDate date, int page, int pageSize)`
  - Endpoint: `GET /api/v1/orders`, `/orders/{id}` (Customer/Farmer) · `GET /api/v1/farmer/orders` (Farmer)

- [ ] **Step 1: Viết `OrderAccessTest` — Review focus #3, 6 test**

```java
/**
 * Review focus #3 — giám khảo sẽ đổi {id} trên URL. Mọi đường vào một đơn phải trả 403 khi đơn
 * không thuộc về người gọi, kể cả khi đơn có thật. 404 cũng không được: nó cho biết đơn tồn tại.
 */
class OrderAccessTest {

    @Test
    void customerCannotReadAnotherCustomersOrder() {
        when(orderRepository.findById(ORDER_ID)).thenReturn(Optional.of(orderOwnedBy(OTHER_CUSTOMER)));

        assertThatThrownBy(() -> service.detail(CUSTOMER_ID, ORDER_ID))
                .isInstanceOf(OrderNotYoursException.class);
    }

    @Test
    void farmerCannotReadAnOrderPlacedAtAnotherStall() { /* farmer_id khác -> OrderNotYoursException */ }

    @Test
    void theOwningCustomerCanRead() { /* không ném, summary.orderCode đúng */ }

    @Test
    void theOwningFarmerCanRead() { /* không ném */ }

    /** Farmer cần biết gọi ai khi khách không tới lấy; khách không cần biết gì về khách khác. */
    @Test
    void onlyTheFarmerSeesTheCustomerBlock() {
        assertThat(service.detail(FARMER_USER_ID, ORDER_ID).customer()).isNotNull();
        assertThat(service.detail(CUSTOMER_ID, ORDER_ID).customer()).isNull();
    }

    @Test
    void canCancelIsFalseOnceCutoffHasPassed() {
        /* đơn placed, cutoffAt = hôm qua -> canCancel false, canModify false */
    }
}
```

- [ ] **Step 2: `make be-test` — đỏ.**
- [ ] **Step 3: Viết `OrderQueryRepository`** — một câu cho danh sách (join `farmer_profiles`, `markets`,
  `COUNT(order_items)`), một câu cho chi tiết, một câu cho `order_status_history`.
  Lọc `status` là whitelist qua `OrderStatus.valueOf` trong service, **không** nối chuỗi.
- [ ] **Step 4: Viết phần service.** Quy tắc: `detail` đọc đơn, rồi hỏi "userId này là customer của đơn,
  hay là user của farmer_profiles sở hữu đơn?" — không phải thì `OrderNotYoursException`.
  `canCancel`/`canModify` gọi thẳng `OrderLifecycle` với `LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"))`.
- [ ] **Step 5: Controller.** `GET /orders/{id}` cho phép cả `CUSTOMER` và `FARMER`
  (`@PreAuthorize("hasAnyRole('CUSTOMER','FARMER')")`); phân biệt ai là ai nằm trong service.
- [ ] **Step 6: `make be-test` — 6 test xanh.**
- [ ] **Step 7: Commit** — `feat(FR-036): order lists and details for both sides, with ownership checks`

---

### Task 5.5: Backend — Farmer đổi trạng thái (FR-065, 066, 038)

**Files:**
- Modify: `modules/order/services/impl/OrderService.java`
- Create: `modules/order/services/impl/OrderStatusHistoryWriter.java`
- Create: `modules/order/requests/DeclineOrderRequest.java`
- Modify: `modules/order/controllers/FarmerOrderController.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/order/services/impl/OrderTransitionTest.java`

**Interfaces:**
- Produces:
  - `OrderDetailResource accept(long userId, long orderId)` ·
    `OrderDetailResource decline(long userId, long orderId, String reason)` ·
    `OrderDetailResource markReady(long userId, long orderId)` ·
    `OrderDetailResource complete(long userId, long orderId)`
  - Endpoint: `PATCH /api/v1/farmer/orders/{id}/accept|decline|ready|complete` (Farmer)

- [ ] **Step 1: Viết `OrderTransitionTest` — 9 test**

| Tên test | Khẳng định |
|---|---|
| `acceptMovesPlacedToAccepted` | status đổi, `order_status_history` thêm 1 dòng `placed → accepted`, `changed_by` = user của Farmer |
| `acceptOnAnAlreadyAcceptedOrderIs409` | `InvalidOrderTransitionException`, **không** 400 |
| `declineRestoresStock` | tồn của từng sản phẩm tăng lại đúng `quantity`, và `booked_count` của slot giảm 1 |
| `declineRequiresAReason` | `reason` rỗng → 400 `VALIDATION_ERROR` field `reason` |
| `declineStoresTheReasonInFarmerNote` | `orders.farmer_note` = lý do, và `order_status_history.note` cũng thế |
| `readyThenCompleteWalksTheHappyPath` | hai lần gọi liên tiếp không ném, lịch sử có đủ 3 dòng |
| `completeDoesNotRestoreStock` | tồn không đổi sau `completed` |
| `anotherFarmerCannotAcceptThisOrder` | → **403** `OrderNotYoursException` |
| `declineAlsoReleasesTheSlotOnlyOnce` | gọi decline hai lần: lần hai là 409, `booked_count` chỉ giảm 1 |

**Review-focus test #5** (Farmer bị đình chỉ), cùng file:

```java
/**
 * Review focus #5 / D-09 — "Đơn đang chạy vẫn cho chạy hết để khách không mất hàng đã đặt."
 * Đình chỉ ẩn sản phẩm và chặn đơn mới; nó KHÔNG được khoá các đơn đang dở.
 */
@Test
void aSuspendedFarmerCanStillFinishOrdersPlacedBeforeTheSuspension() {
    FarmerProfile farmer = approvedFarmer();
    farmer.setApprovalStatus(ApprovalStatus.SUSPENDED);
    when(farmerRepository.findByUserId(FARMER_USER_ID)).thenReturn(Optional.of(farmer));
    when(orderRepository.findById(ORDER_ID)).thenReturn(Optional.of(orderWithStatus(OrderStatus.ACCEPTED)));

    assertThatCode(() -> service.markReady(FARMER_USER_ID, ORDER_ID)).doesNotThrowAnyException();
}
```

- [ ] **Step 2: `make be-test` — đỏ.**

- [ ] **Step 3: Viết một method chung cho mọi lần đổi trạng thái**

```java
/**
 * Một cửa duy nhất cho mọi lần đổi trạng thái. Nhờ vậy FR-038 (ghi lịch sử) và D-02 (hoàn tồn kho)
 * không thể bị quên ở một nhánh nào đó: quên gọi hàm này thì trạng thái cũng không đổi.
 */
@Transactional
protected Order transition(Order order, OrderStatus to, long actorUserId, String note) {
    OrderStatus from = order.getStatus();
    OrderLifecycle.assertTransition(from, to);

    if (OrderLifecycle.restoresStock(to)) {
        List<OrderItem> items = orderItemRepository.findByOrderId(order.getId());
        List<Product> products = productRepository.lockAllById(
                items.stream().map(OrderItem::getProductId).toList());
        Map<Long, Integer> qty = items.stream()
                .collect(Collectors.toMap(OrderItem::getProductId, OrderItem::getQuantity));
        for (Product p : products) {
            p.setStockQuantity(p.getStockQuantity() + qty.get(p.getId()));
            if (p.getStatus() == ProductStatus.SOLD_OUT && p.getStockQuantity() > 0) {
                p.setStatus(ProductStatus.AVAILABLE);
            }
        }
        if (order.getSlotId() != null) {
            slotRepository.lockById(order.getSlotId()).ifPresent(s ->
                    s.setBookedCount(Math.max(0, s.getBookedCount() - 1)));
        }
    }

    order.setStatus(to);
    orderRepository.save(order);
    history.record(order.getId(), from, to, actorUserId, note);
    return order;
}
```

- [ ] **Step 4: Bốn method public** (`accept`, `decline`, `markReady`, `complete`) chỉ làm hai việc:
  kiểm quyền sở hữu (user → `farmer_profiles` → `order.farmerId`), rồi gọi `transition(...)`.
  `decline` set thêm `order.setFarmerNote(reason)`.
  **Không** kiểm `approval_status` ở đây (D-09, xem test trên).
- [ ] **Step 5: `make be-test` — 10 test xanh.**
- [ ] **Step 6: Kiểm tra tay** — đặt 1 đơn, ghi lại `stock_quantity` trước và sau; accept; decline một đơn
  khác và xác nhận tồn quay lại đúng con số cũ bằng `make mysql`.
- [ ] **Step 7: Commit** — `feat(FR-065): farmers accept, decline, ready and complete orders`

---

### Task 5.6: Backend — khách huỷ và sửa đơn (FR-034, 035)

**Files:**
- Modify: `modules/order/services/impl/OrderService.java`
- Create: `modules/order/requests/ModifyOrderRequest.java`
- Modify: `modules/order/controllers/OrderController.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/order/services/impl/OrderModifyTest.java`

**Interfaces:**
- Produces:
  - `OrderDetailResource cancel(long userId, long orderId)` ·
    `OrderDetailResource modifyItems(long userId, long orderId, ModifyOrderRequest r)`
  - `ModifyOrderRequest(@NotEmpty @Valid List<CartLine> items)`
  - Endpoint: `PATCH /api/v1/orders/{id}/cancel` · `PUT /api/v1/orders/{id}/items` (Customer)

- [ ] **Step 1: Viết `OrderModifyTest` — 9 test**

| Tên test | Khẳng định |
|---|---|
| `cancelBeforeCutoffRestoresStockAndSlot` | tồn tăng lại, `booked_count` giảm 1, status `cancelled` |
| `cancelAfterCutoffIs409` | `CutoffPassedException` → **409** `CUTOFF_PASSED`, tồn **không** đổi |
| `cancelOnAReadyOrderIs409` | quá muộn, kể cả còn trước cutoff (D-04) |
| `cancelOnAnotherCustomersOrderIs403` | `OrderNotYoursException` |
| `modifyLoweringQuantityGivesTheDifferenceBack` | 5 → 2 → tồn tăng đúng **3**, không phải 5 |
| `modifyRaisingQuantityTakesTheDifference` | 2 → 5 với tồn đủ → tồn giảm đúng **3**; tồn thiếu → **409**, đơn không đổi |
| `modifyDroppingAnItemRemovesTheRow` | `order_items` mất dòng đó, tồn trả lại toàn bộ |
| `modifyRefusesAProductNotAlreadyInTheOrder` | D-07 "không cho thêm sản phẩm mới" → **400** `PRODUCT_NOT_IN_ORDER` |
| `modifyPutsAnAcceptedOrderBackToPlaced` | status về `placed`, lịch sử ghi `accepted → placed` (D-07) |

- [ ] **Step 2: `make be-test` — đỏ.**
- [ ] **Step 3: Viết `cancel`** — kiểm sở hữu; `OrderLifecycle.canCustomerCancel(...)` sai →
  `CutoffPassedException` nếu lý do là thời gian, `InvalidOrderTransitionException` nếu lý do là
  trạng thái; rồi `transition(order, CANCELLED, userId, null)`.
- [ ] **Step 4: Viết `modifyItems`** — sửa **chênh lệch**, không huỷ rồi tạo lại:

```java
/**
 * D-07 — chỉ giảm số lượng hoặc bỏ item. Tính chênh lệch từng sản phẩm rồi cộng/trừ tồn đúng phần
 * chênh: huỷ rồi đặt lại sẽ nhả tồn ra cho người khác cướp mất giữa chừng, và đổi cả order_code.
 */
@Transactional
public OrderDetailResource modifyItems(long userId, long orderId, ModifyOrderRequest request) {
    Order order = loadOwnedByCustomer(userId, orderId);
    if (!OrderLifecycle.canCustomerModify(order.getStatus(), order.getCutoffAt(), now())) {
        throw new CutoffPassedException(order.getId());
    }

    Map<Long, OrderItem> existing = orderItemRepository.findByOrderId(orderId).stream()
            .collect(Collectors.toMap(OrderItem::getProductId, i -> i));
    Map<Long, Integer> wanted = request.items().stream()
            .collect(Collectors.toMap(CartLine::productId, CartLine::quantity, Integer::sum));

    for (Long productId : wanted.keySet()) {
        if (!existing.containsKey(productId)) {
            throw new ProductNotInOrderException(productId);
        }
    }

    List<Product> products = productRepository.lockAllById(existing.keySet());
    BigDecimal total = BigDecimal.ZERO;
    for (Product p : products) {
        OrderItem item = existing.get(p.getId());
        int before = item.getQuantity();
        int after = wanted.getOrDefault(p.getId(), 0);
        int delta = after - before;

        if (delta > 0 && p.getStockQuantity() < delta) {
            throw new OutOfStockException(p.getId(), p.getName());
        }
        p.setStockQuantity(p.getStockQuantity() - delta);
        if (p.getStockQuantity() == 0) {
            p.setStatus(ProductStatus.SOLD_OUT);
        } else if (p.getStatus() == ProductStatus.SOLD_OUT) {
            p.setStatus(ProductStatus.AVAILABLE);
        }

        if (after == 0) {
            orderItemRepository.delete(item);
        } else {
            item.setQuantity(after);
            item.setSubtotal(item.getUnitPrice().multiply(BigDecimal.valueOf(after)));
            orderItemRepository.save(item);
            total = total.add(item.getSubtotal());
        }
    }

    if (total.signum() == 0) {
        // Bỏ hết item = huỷ đơn. Đừng để lại đơn rỗng trị giá 0 đồng.
        return toDetail(transition(order, OrderStatus.CANCELLED, userId, "All items removed."), userId);
    }

    order.setTotalAmount(total);
    if (order.getStatus() == OrderStatus.ACCEPTED) {
        transition(order, OrderStatus.PLACED, userId, "Customer changed the order.");
    } else {
        orderRepository.save(order);
    }
    return toDetail(order, userId);
}
```

- [ ] **Step 5: `make be-test` — 9 test xanh.**
- [ ] **Step 6: Commit** — `feat(FR-034): customers cancel and edit orders before the cutoff`

---

### Task 5.7: Backend — thông báo mốc đơn hàng (FR-042 hoàn tất, D-11)

**Files:**
- Modify: `modules/notification/enums/NotificationKind.java` — thêm `ORDER_PLACED`, `ORDER_ACCEPTED`,
  `ORDER_DECLINED`, `ORDER_READY`, `ORDER_CANCELLED`
- Modify: `modules/order/services/impl/OrderService.java` — gọi `NotificationServiceInterface`
- Modify: `frontend/src/locales/<10>/Notifications.json` + file dịch của backend nếu có
- Test: `backend/src/test/java/com/techx/intervue/modules/order/services/impl/OrderNotificationTest.java`

**Interfaces:**
- Consumes: `NotificationServiceInterface` (đang có, dùng bởi `FarmerService`).
- Produces: không có endpoint mới — `GET /api/v1/notifications` đã có từ trước.

- [ ] **Step 1: Viết `OrderNotificationTest` — 6 test**

| Tên test | Khẳng định |
|---|---|
| `placingNotifiesTheFarmerNotTheCustomer` | `notifications.create` gọi với `userId` của Farmer, kind `order_placed` |
| `acceptNotifiesTheCustomer` | kind `order_accepted`, `link` = `/orders/{id}` |
| `declineNotifiesTheCustomerWithTheReason` | `message` chứa lý do Farmer nhập |
| `readyNotifiesTheCustomer` | kind `order_ready` — đây là mốc "ready for pickup" của đề |
| `completeNotifiesNobody` | khách đang đứng ngay tại quầy, không cần chuông |
| `cancelNotifiesTheFarmer` | Farmer phải biết để khỏi chuẩn bị hàng |

- [ ] **Step 2: `make be-test` — đỏ.**
- [ ] **Step 3: Gọi notification ngay sau mỗi `transition(...)` thành công**, trong cùng transaction
  như `FarmerService` đang làm. Link theo vai: customer `/orders/{id}`, farmer `/farmer/orders/{id}`.
- [ ] **Step 4: Thêm key dịch cho 5 kind mới, đủ 10 ngôn ngữ.** Tiêu đề và nội dung dịch theo
  `user_settings.language` của **người nhận** lúc tạo, giống cơ chế đang chạy.
- [ ] **Step 5: `make be-test` — 6 test xanh.**
- [ ] **Step 6: Kiểm tra tay** — mở 2 trình duyệt (customer và farmer). Customer đặt đơn → chuông của
  Farmer kêu **không cần tải lại trang** (STOMP `/user/topic/notifications` đã có). Farmer accept →
  chuông của Customer kêu.
- [ ] **Step 7: Commit** — `feat(FR-042): in-app notifications at the four order milestones`

---

### Task 5.8: Seed — đơn hàng đủ 6 trạng thái (FR-101)

- [ ] **Step 1: Thêm vào `db/seed.sql`** ít nhất 12 đơn của `customer@marketlink.vn`, trải đủ:
  2 `placed`, 2 `accepted`, 2 `ready`, **4 `completed`** (để C8 review mở khoá được ngay), 1 `declined`
  kèm `farmer_note`, 1 `cancelled`. Mỗi đơn 2–3 `order_items` với `unit_price` khớp giá sản phẩm lúc đó.
  `order_status_history` phải có đủ chuỗi dòng dẫn tới trạng thái cuối, **không phải một dòng duy nhất** —
  FR-038 sẽ bị giám khảo mở ra xem.
  Dùng `order_code` cố định (`ML-20260920-0001`…) để `ON DUPLICATE KEY UPDATE` bám vào.
- [ ] **Step 2:** `make seed` rồi đăng nhập customer, `GET /api/v1/orders` → 12 đơn, đủ 6 giá trị `status`.
- [ ] **Step 3:** `GET /api/v1/orders/{id}` của một đơn `completed` → `statusHistory` có ≥ 3 dòng.
- [ ] **Step 4: Commit** — `feat(FR-101): demo orders covering all six statuses`

---

### Task 5.9: Frontend — giỏ hàng và đơn của khách

**Files:**
- Create: `frontend/src/lib/cart.ts`
- Create: `frontend/src/api-requests/order.requests.ts`
- Modify: `pages/customer/Cart/index.tsx`, `OrderPlaced/index.tsx`, `Orders/index.tsx`,
  `OrderDetail/index.tsx`, `OrderEdit/index.tsx`, `Dashboard/index.tsx`
- Modify: `pages/public/ProductDetail/index.tsx`, `pages/public/Products/index.tsx` — nút thêm vào giỏ
- Modify: `frontend/src/data/customer.ts` — xoá `orders`
- Modify: `frontend/src/locales/<10>/Cart.json`, `Orders.json`, `OrderDetail.json`

**Interfaces:**
- Produces:
  - `cart.ts`: `type CartLine = { productId: number; quantity: number }`;
    `getCart(): CartLine[]` · `addToCart(productId, quantity)` · `setQuantity(productId, quantity)` ·
    `removeFromCart(productId)` · `clearCart()` · `onCartChange(fn): () => void`.
    Lưu ở `localStorage` khoá `marketlink.cart.v1`. **Bọc mọi lần đọc/ghi trong `try/catch`** —
    trình duyệt ở chế độ riêng tư có thể ném.
  - `OrderApi`: `preview(items)` · `place(groups)` · `list(params)` · `get(id)` · `cancel(id)` ·
    `modifyItems(id, items)` · `toOrder(dto): OrderType`.

- [ ] **Step 1: Viết `cart.ts`** — giỏ ở client, không endpoint (§S.4.3).
- [ ] **Step 2: Nút "Add to cart"** trên `ProductDetail` và thẻ sản phẩm. Ẩn khi
  `status !== 'available'` hoặc `stock === 0`, và khi `user?.role === 'admin'` (D-13 — chỉ là UX,
  server vẫn là chỗ chặn thật).
- [ ] **Step 3: `Cart` gọi `preview`** mỗi khi giỏ đổi, hiện đúng số nhóm mà server trả về, kèm câu
  của D-01: *"Giỏ của bạn sẽ được tách thành N đơn tại N stall khác nhau."* (key i18n, không viết cứng).
  `problems[]` của mỗi nhóm hiện thành cảnh báo trên đúng dòng sản phẩm.
- [ ] **Step 4: Chọn ngày và slot cho từng nhóm.** `SlotPicker` gọi
  `GET /farmers/{id}/slots?marketId=&date=`; slot `isFull` hiện xám và **không bấm được** (D-06).
  Chưa chọn slot cho mọi nhóm thì nút đặt bị khoá **kèm lý do** (design system: nút khoá phải nói vì sao).
- [ ] **Step 5: Đặt đơn** — `place(groups)` → xoá giỏ → chuyển sang `OrderPlaced` hiện danh sách
  `orderCode` vừa tạo. **409 `OUT_OF_STOCK` / `SLOT_FULL` không được nuốt**: hiện thông báo rõ sản phẩm
  hoặc slot nào, rồi gọi lại `preview` để làm mới số liệu.
- [ ] **Step 6: `Orders` + `OrderDetail`** — lọc theo status, hiện `statusHistory` dạng dòng thời gian.
  Nút "Cancel" và "Edit" chỉ bật khi `canCancel` / `canModify` **từ server**, không tự tính ở client.
- [ ] **Step 7: `OrderEdit`** — chỉ cho giảm số lượng và bỏ item (D-07). Không có ô thêm sản phẩm.
- [ ] **Step 8: `npm run build && npm run lint`** xanh.
- [ ] **Step 9: Đi hết một vòng bằng tay** — thêm 2 sản phẩm của 2 Farmer vào giỏ, xem tách 2 nhóm,
  chọn 2 slot, đặt, thấy 2 `orderCode`; vào `/orders` thấy 2 đơn `placed`; huỷ một đơn và kiểm tồn kho
  của sản phẩm đó tăng lại (mở `/products/:id` ở tab khác). Ở 375 px: giỏ không tràn ngang.
- [ ] **Step 10: Commit** — `feat(FR-030): cart, checkout and customer order screens on real data`

---

### Task 5.10: Frontend — đơn của Farmer

**Files:**
- Modify: `pages/farmer/Orders/index.tsx`, `Pending/index.tsx`, `OrderDetail/index.tsx`,
  `Overview/index.tsx` (phần đếm đơn), `History/index.tsx`
- Delete: `pages/farmer/Orders/demoDates.ts`
- Modify: `frontend/src/data/farmer.ts` — xoá phần đơn hàng

- [ ] **Step 1: `farmer/Pending`** — `GET /farmer/orders?status=placed`, hai nút Accept / Decline.
  Decline mở hộp thoại **bắt buộc nhập lý do** (server trả 400 nếu rỗng).
- [ ] **Step 2: `farmer/Orders`** — lọc theo `status` và `date`, nút "Ready" và "Completed" hiện đúng
  theo trạng thái hiện tại. Bấm nút khi trạng thái đã đổi ở tab khác → 409 → hiện thông báo và
  tải lại đơn, **không** để nút ở trạng thái sai.
- [ ] **Step 3: `farmer/OrderDetail`** — thông tin khách (tên, số điện thoại) lấy từ `detail.customer`
  mà server chỉ trả cho Farmer.
- [ ] **Step 4: `npm run build && npm run lint`** xanh.
- [ ] **Step 5: Kiểm tra tay** — hai trình duyệt: customer đặt, farmer thấy đơn trong "Pending" sau khi
  tải lại, accept, customer thấy trạng thái đổi và chuông kêu.
- [ ] **Step 6: Commit** — `feat(FR-065): farmer order screens on real data`
- [ ] **Step 7: Báo đủ 7 điều kiện cho FR-030…038, 042, 065, 066**

> **Cổng chất lượng của cụm C5.** Trước khi sang C6, chạy trọn kịch bản này một lần và ghi lại:
> đặt → Farmer accept → ready → completed · đặt → Farmer decline (tồn quay lại) ·
> đặt → khách huỷ trước cutoff (tồn quay lại) · đặt → khách sửa (đơn về `placed`) ·
> đặt sau cutoff → nút khoá · slot đầy → không chọn được.
> Sáu nhánh này là phần lớn video demo mà đề bắt nộp.

---

## Cụm C6 · Đặt lại, template tồn kho tuần, job tự hoàn tất — FR-037, 063, 039

**Nhánh:** `feature/FR-063-weekly-stock`

### Task 6.1: Migration + backend — template tồn kho tuần (FR-063)

**Files:**
- Create: `backend/src/main/resources/db/migration/V20260926010__create_weekly_stock_templates.sql`
- Create: `modules/product/entities/WeeklyStockTemplate.java`,
  `repositories/WeeklyStockTemplateRepository.java`
- Create: `modules/product/requests/StockTemplateRequest.java`, `ApplyTemplateRequest.java`
- Create: `modules/product/resources/StockTemplateItemResource.java`, `ApplyTemplateResultResource.java`
- Modify: `modules/product/services/impl/ProductService.java`
- Modify: `modules/product/controllers/FarmerProductController.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/product/services/impl/StockTemplateTest.java`

**Interfaces:**
- Produces:
  - Migration đúng `db/schema.sql` §4 với khoá `BIGINT UNSIGNED`, `UNIQUE KEY uq_template (product_id, day_of_week)`.
  - `StockTemplateRequest(@Valid List<TemplateItem> items)`,
    `TemplateItem(@NotNull Long productId, @Min(0) @Max(6) Integer dayOfWeek,
    @NotNull @Min(0) Integer defaultQuantity, BigDecimal defaultPrice)`
  - `ApplyTemplateResultResource(int productsUpdated, List<String> skipped)`
  - `List<StockTemplateItemResource> getTemplates(long userId)` ·
    `List<StockTemplateItemResource> saveTemplates(long userId, StockTemplateRequest r)` ·
    `ApplyTemplateResultResource applyTemplate(long userId, LocalDate targetDate)`
  - Endpoint: `GET|PUT /api/v1/farmer/stock-templates` · `POST /api/v1/farmer/stock-templates/apply`

- [ ] **Step 1: Viết `StockTemplateTest` — 6 test**

| Tên test | Khẳng định |
|---|---|
| `saveRejectsAProductOfAnotherFarmer` | → **403**, không dòng nào được ghi |
| `saveReplacesTheWholeSetForThatFarmer` | gửi 2 item khi đang có 5 → còn đúng 2 |
| `applySetsStockFromTheTemplateOfThatWeekday` | `targetDate` là Chủ nhật → chỉ `day_of_week = 0` được áp |
| `applyOverwritesStockItDoesNotAddToIt` | tồn đang 3, template 30 → thành **30**, không phải 33 |
| `applyAlsoRevivesSoldOutProducts` | `status` từ `sold_out` về `available` khi quantity > 0 |
| `applySkipsProductsWithNoTemplateForThatDay` | tên nằm trong `skipped[]`, tồn không đổi |

- [ ] **Step 2: `make be-test` — đỏ.** → **Step 3:** viết migration + code. → **Step 4:** xanh.
- [ ] **Step 5: Frontend `pages/farmer/StockWeek/index.tsx`** — lưới 7 cột × sản phẩm, nút "Apply to…"
  chọn ngày. Kết quả hiện `productsUpdated` và danh sách `skipped`.
- [ ] **Step 6: Seed** — template cho 2 Farmer để demo được ngay. `make seed`, `npm run build`, `npm run lint`.
- [ ] **Step 7: Commit** — `feat(FR-063): recurring weekly stock templates`

### Task 6.2: Backend + frontend — đặt lại nhanh (FR-037)

**Files:**
- Modify: `modules/order/services/impl/OrderService.java`, `controllers/OrderController.java`
- Modify: `frontend/src/pages/customer/Orders/index.tsx`, `OrderDetail/index.tsx`
- Test: `backend/src/test/java/com/techx/intervue/modules/order/services/impl/ReorderTest.java`

**Interfaces:**
- Produces: `List<CartLine> reorder(long userId, long orderId)` —
  endpoint `POST /api/v1/orders/{id}/reorder` (Customer) trả **giỏ hàng gợi ý**, *không* tạo đơn.

- [ ] **Step 1: Viết `ReorderTest` — 4 test**

| Tên test | Khẳng định |
|---|---|
| `reorderReturnsTheLinesOfTheOldOrder` | đúng `productId` và `quantity` cũ |
| `reorderDropsProductsThatNoLongerExist` | product `is_deleted` → không có trong kết quả |
| `reorderCapsQuantityAtCurrentStock` | cũ 10, tồn nay 4 → trả `quantity = 4` |
| `reorderOnAnotherCustomersOrderIs403` | `OrderNotYoursException` |

- [ ] **Step 2–4:** đỏ → viết → xanh.
- [ ] **Step 5: Frontend** — nút "Order again" trên mỗi đơn `completed`: gọi API, ghi kết quả vào
  `cart.ts`, chuyển sang `/cart`. Nếu có dòng bị cắt bớt thì hiện một dòng giải thích.
- [ ] **Step 6: Commit** — `feat(FR-037): reorder a past order into the cart`

### Task 6.3: Backend — job tự chuyển ready → completed (FR-039, D-03)

**Files:**
- Create: `modules/order/OrderAutoCompleteJob.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/order/OrderAutoCompleteJobTest.java`

**Interfaces:**
- Produces: `@Scheduled(cron = "0 15 * * * *", zone = "Asia/Ho_Chi_Minh")` — chạy mỗi giờ, phút thứ 15.
  `int sweep()` trả số đơn đã chuyển, dùng cho test và cho log.

- [ ] **Step 1: Viết `OrderAutoCompleteJobTest` — 4 test**

| Tên test | Khẳng định |
|---|---|
| `completesReadyOrdersPastPickupDatePlusTwentyFourHours` | `pickup_date` hôm kia, `ready` → `completed` |
| `leavesReadyOrdersInsideTheWindowAlone` | `pickup_date` hôm nay → không đụng |
| `ignoresOrdersThatAreNotReady` | `accepted`, `placed` không bị đụng dù quá hạn |
| `writesOneHistoryRowPerOrderWithNullActor` | `changed_by = NULL`, `note` = "Auto-completed after pickup." |

- [ ] **Step 2–4:** đỏ → viết (dùng lại `transition(...)` của 5.5, `actorUserId = null`) → xanh.
  Job phải xử lý theo lô (`LIMIT 200` mỗi vòng) để không khoá bảng khi dữ liệu lớn.
- [ ] **Step 5: Kiểm tra tay** — `make mysql`, đổi `pickup_date` của một đơn `ready` về 3 ngày trước,
  đợi job hoặc gọi `sweep()` qua test, xác nhận đơn thành `completed` và review mở khoá được (C8).
- [ ] **Step 6: Commit** — `feat(FR-039): sweep ready orders to completed after the pickup window`
- [ ] **Step 7: Báo đủ 7 điều kiện cho FR-037, 039, 063**

---

## Cụm C7 · Yêu thích và restock alert — FR-040, 041, 014

**Nhánh:** `feature/FR-040-favorites`

### Task 7.1: Migration + backend — favorites

**Files:**
- Create: `backend/src/main/resources/db/migration/V20260926011__create_favorites_table.sql`
- Create: `modules/favorite/` đầy đủ theo khuôn (entity, repository, request, resource, service, controller)
- Test: `backend/src/test/java/com/techx/intervue/modules/favorite/services/impl/FavoriteServiceTest.java`

**Interfaces:**
- Produces:
  - Bảng `favorites(id, customer_id, target_type ENUM('farmer','product','market'), farmer_id, product_id,
    market_id, created_at)` với `UNIQUE KEY uq_fav (customer_id, target_type, farmer_id, product_id, market_id)`.
  - `FavoriteResource(Long id, String targetType, Long targetId, String title, String subtitle,
    String imageUrl, boolean available)`
  - `List<FavoriteResource> list(long userId, String targetType)` ·
    `FavoriteResource add(long userId, FavoriteRequest r)` · `void remove(long userId, long favoriteId)`
  - Endpoint: `GET|POST /api/v1/favorites` · `DELETE /api/v1/favorites/{id}` (Customer, Farmer)

- [ ] **Step 1: Viết `FavoriteServiceTest` — 6 test**

| Tên test | Khẳng định |
|---|---|
| `addIsIdempotent` | thêm hai lần cùng mục tiêu → vẫn 1 dòng, trả lại dòng cũ, **không** 409 |
| `addRejectsMismatchedTargetTypeAndId` | `targetType = "farmer"` nhưng gửi `productId` → **400** |
| `removeAnotherUsersFavoriteIs403` | `FavoriteNotYoursException` |
| `listFiltersByTargetType` | `targetType = "product"` → không lẫn farmer/market |
| `listMarksUnavailableTargets` | product `sold_out` hoặc stall `suspended` → `available = false`, **vẫn hiện** |
| `adminCannotAddFavorites` | D-13 → **403** |

- [ ] **Step 2–4:** đỏ → viết → xanh.
- [ ] **Step 5: Commit** — `feat(FR-040): favorite farmers, products and markets`

### Task 7.2: Backend — restock alert (FR-041)

**Files:**
- Modify: `modules/product/services/impl/ProductService.java` (chỗ tồn kho tăng)
- Modify: `modules/order/services/impl/OrderService.java` (chỗ hoàn tồn kho)
- Create: `modules/favorite/services/impl/RestockNotifier.java`
- Modify: `modules/notification/enums/NotificationKind.java` — thêm `RESTOCK`
- Test: `backend/src/test/java/com/techx/intervue/modules/favorite/services/impl/RestockNotifierTest.java`

**Interfaces:**
- Produces: `void onStockRose(long productId, int stockBefore, int stockAfter)` —
  gọi từ mọi chỗ tồn kho tăng: Farmer sửa sản phẩm, áp template tuần, đơn bị decline/cancel.

- [ ] **Step 1: Viết `RestockNotifierTest` — 5 test**

| Tên test | Khẳng định |
|---|---|
| `notifiesEveryCustomerWhoFavouritedTheProduct` | 3 người yêu thích → 3 thông báo kind `restock` |
| `staysQuietWhenStockWasAlreadyPositive` | 5 → 8: **không** thông báo. Chỉ mốc 0 → dương mới là "có hàng lại" |
| `staysQuietWhenStockFellToZero` | 5 → 0: không thông báo |
| `doesNotNotifyTheFarmerWhoOwnsTheProduct` | Farmer tự yêu thích sản phẩm mình vẫn không nhận chuông |
| `staysQuietForHiddenOrDeletedProducts` | `is_hidden` hoặc `is_deleted` → không thông báo |

- [ ] **Step 2–4:** đỏ → viết → xanh. Gọi `onStockRose` ở **cả ba** chỗ đã liệt kê;
  quên một chỗ thì test `declineRestoresStock` của 5.5 vẫn xanh mà FR-041 vẫn hỏng — nên thêm
  một test tích hợp: `decliningAnOrderAlertsCustomersWhoFavouritedTheProduct`.
- [ ] **Step 5: Commit** — `feat(FR-041): tell customers when a favourite product is back in stock`

### Task 7.3: Frontend — favorites

**Files:**
- Create: `frontend/src/api-requests/favorite.requests.ts`
- Modify: `pages/customer/Favorites/index.tsx`, `pages/public/ProductDetail/index.tsx`,
  `pages/public/StallProfile/index.tsx`, `pages/public/Markets/index.tsx`,
  `pages/public/Products/index.tsx` (nút trái tim trên thẻ)
- Modify: `frontend/src/data/customer.ts` — xoá phần favorites

- [ ] **Step 1: Nút trái tim** — `frontend/src/components/FavoriteButton.tsx` **đã tồn tại**; chỉ nối
  nó vào API, đừng viết component mới. Trạng thái lạc quan (bật ngay, gọi API sau); API lỗi thì trả về
  trạng thái cũ và hiện toast. Khách chưa đăng nhập bấm → chuyển sang `/login?next=…`.
- [ ] **Step 2: Trang Favorites** — 3 tab (Farmers / Products / Markets), mục `available = false`
  hiện mờ kèm nhãn lý do. FR-014 (chợ ưa thích) là tab Markets, kèm nút "Directions" mở OSM tab mới.
- [ ] **Step 3: `npm run build && npm run lint`** xanh, kiểm tra tay, **Step 4: Commit** —
  `feat(FR-040): favorites screen and heart buttons on real data`
- [ ] **Step 5: Báo đủ 7 điều kiện cho FR-014, 040, 041**

---

## Cụm C8 · Đánh giá — FR-050, 051, 052, 053

**Nhánh:** `feature/FR-050-reviews`

### Task 8.1: Migration — reviews, review_responses

- [ ] **Step 1: Viết `V20260926012__create_reviews_tables.sql`** theo `db/schema.sql` §6, khoá
  `BIGINT UNSIGNED`, giữ nguyên:
  - `target_type ENUM('product','farmer')`, `product_id` và `farmer_id` cùng nullable;
  - `CHECK ((target_type='product' AND product_id IS NOT NULL) OR (target_type='farmer' AND farmer_id IS NOT NULL))`;
  - `UNIQUE KEY uq_review (order_id, target_type, product_id, farmer_id)`;
  - `status ENUM('visible','hidden') NOT NULL DEFAULT 'visible'` cho FR-074;
  - `review_responses` với `review_id` UNIQUE (1-1).
- [ ] **Step 2: `make be-restart`**, xác nhận CHECK tồn tại. **Step 3: Commit** —
  `feat(FR-050): reviews and farmer responses tables`

### Task 8.2: Backend — viết và đọc review

**Files:** `modules/review/` đầy đủ + `ReviewQueryRepository`
**Test:** `ReviewServiceTest`, `ReviewRatingCacheTest`

**Interfaces:**
- Produces:
  - `CreateReviewRequest(@NotNull Long orderId, @NotNull String targetType, Long productId, Long farmerId,
    @Min(1) @Max(5) Integer rating, @Size(max=2000) String comment)`
  - `ReviewResource(Long id, String targetType, Long targetId, String customerName, int rating,
    String comment, String createdAt, ReviewResponseResource response)`
  - `ReviewSummaryResource(BigDecimal ratingAvg, int ratingCount, List<Integer> histogram)` —
    `histogram` 5 phần tử, số review từ 1 tới 5 sao.
  - `ReviewResource create(long userId, CreateReviewRequest r)` ·
    `PageResource<ReviewResource> forProduct(long productId, int page, int size)` ·
    `PageResource<ReviewResource> forFarmer(long farmerId, int page, int size)` ·
    `ReviewResponseResource respond(long farmerUserId, long reviewId, String text)` ·
    `void adminSetStatus(long reviewId, boolean hidden)`
  - Endpoint: `POST /api/v1/reviews` (Customer) · `GET /api/v1/products/{id}/reviews`,
    `/farmers/{id}/reviews` (Public) · `POST /api/v1/farmer/reviews/{id}/response` (Farmer) ·
    `PATCH /api/v1/admin/reviews/{id}/hide`, `/unhide` (Admin)

- [ ] **Step 1: Viết `ReviewServiceTest` — 10 test**

| Tên test | Khẳng định |
|---|---|
| `createRequiresTheOrderToBeCompleted` | đơn `ready` → **403** `ORDER_NOT_COMPLETED` (D-10) |
| `createRequiresTheOrderToBelongToTheReviewer` | Review focus #3 → **403**, kể cả khi đơn `completed` |
| `createRejectsAProductThatWasNotInThatOrder` | → **400**; không cho review hàng chưa mua |
| `createRejectsAFarmerWhoDidNotFulfilThatOrder` | → **400** |
| `createRejectsASecondReviewOfTheSameTarget` | → **409** `ALREADY_REVIEWED` (`uq_review`) |
| `createAllowsBothAProductAndAFarmerReviewOnOneOrder` | hai dòng, không xung đột UNIQUE |
| `createRejectsRatingOutsideOneToFive` | `0` và `6` → **400** |
| `adminCannotReview` | D-13 → **403** |
| `forProductHidesModeratedReviews` | `status = 'hidden'` không xuất hiện trong danh sách public |
| `respondRejectsAReviewOfAnotherStall` | → **403**; và review đã có phản hồi → **409** (quan hệ 1-1) |

- [ ] **Step 2: Viết `ReviewRatingCacheTest` — 4 test**

| Tên test | Khẳng định |
|---|---|
| `creatingAReviewUpdatesProductRatingAverage` | 4 sao rồi 2 sao → `rating_avg = 3.00`, `rating_count = 2` |
| `creatingAReviewUpdatesFarmerRatingAverage` | như trên trên `farmer_profiles` |
| `hidingAReviewRemovesItFromTheAverage` | ẩn review 2 sao → `rating_avg` về `4.00`, `rating_count = 1` |
| `averageRoundsToTwoDecimals` | 5 và 4 và 4 → `4.33`, không phải `4.3333` |

- [ ] **Step 3: `make be-test` — đỏ.**
- [ ] **Step 4: Viết service.** Điều kiện tạo review, kiểm theo đúng thứ tự này:
  1. đơn tồn tại · 2. `order.customerId == userId` (403) · 3. `order.status == COMPLETED` (403) ·
  4. mục tiêu nằm trong đơn (400) · 5. chưa review (409).
  Sau khi lưu, tính lại `rating_avg`/`rating_count` bằng **một câu `AVG`/`COUNT` trên các review
  `status = 'visible'`**, không cộng dồn thủ công — cộng dồn sẽ sai ngay lần đầu admin ẩn một review.
- [ ] **Step 5: `make be-test` — 14 test xanh.**
- [ ] **Step 6: Commit** — `feat(FR-050): reviews gated on completed orders, with rating caches`

### Task 8.3: Seed + frontend — review

- [ ] **Step 1: Seed** — 8 review trên các đơn `completed` đã seed ở 5.8 (4 product, 4 farmer),
  1 review có `review_responses`, 1 review `status = 'hidden'` để demo FR-074.
  `make seed` rồi `GET /api/v1/products/1/reviews` phải có dữ liệu và `ratingAvg` khác 0.
- [ ] **Step 2: Frontend** — `create frontend/src/api-requests/review.requests.ts`; sửa
  `pages/customer/Review/index.tsx` (form 1–5 sao, mở từ đơn `completed`),
  `pages/public/ProductDetail/index.tsx` và `StallProfile/index.tsx` (danh sách + histogram),
  `pages/farmer/Reviews/index.tsx` (đọc và trả lời), `pages/admin/Moderation/index.tsx` (tab Reviews).
- [ ] **Step 3:** nút "Write a review" chỉ hiện trên đơn `completed` **chưa review** — trạng thái này
  lấy từ `OrderDetailResource`, cần thêm trường `reviewed: boolean`; sửa cả `OrderDetailResource`
  ở Task 5.4 và test tương ứng.
- [ ] **Step 4: `npm run build && npm run lint`** xanh. **Step 5:** kiểm tra tay: viết review trên đơn
  `completed`, thấy điểm trung bình của sản phẩm đổi ngay; thử review lần hai → thông báo đã đánh giá.
- [ ] **Step 6: Commit** — `feat(FR-052): review screens on real data`
- [ ] **Step 7: Báo đủ 7 điều kiện cho FR-050, 051, 052, 053**

---

## Cụm C9 · Dashboard và báo cáo — FR-068, 069, 070, 072, 075

**Nhánh:** `feature/FR-070-dashboards`

### Task 9.1: Backend — dashboard Farmer (FR-068, 069)

**Files:** `modules/report/repositories/FarmerReportRepository.java`,
`services/impl/FarmerReportService.java`, `controllers/FarmerReportController.java`
**Test:** `FarmerReportServiceTest`

**Interfaces:**
- Produces:
  - `FarmerDashboardResource(long totalOrders, long pendingOrders, BigDecimal revenueTotal,
    BigDecimal revenueThisMonth, long completedOrders, long productCount, long lowStockCount)`
  - `BestSellerResource(Long productId, String name, long quantitySold, BigDecimal revenue)`
  - `FarmerDashboardResource dashboard(long userId)` ·
    `List<BestSellerResource> bestSellers(long userId, LocalDate from, LocalDate to, int limit)` ·
    `PageResource<OrderListItemResource> salesHistory(long userId, LocalDate from, LocalDate to, int page, int size)`
  - Endpoint: `GET /api/v1/farmer/dashboard`, `/farmer/reports/best-sellers`, `/farmer/reports/sales`

- [ ] **Step 1: Viết `FarmerReportServiceTest` — 5 test**

| Tên test | Khẳng định |
|---|---|
| `revenueCountsOnlyCompletedOrders` | đơn `placed`/`accepted`/`ready` **không** vào doanh thu; `declined`/`cancelled` cũng không |
| `pendingOrdersCountsOnlyPlaced` | `accepted` không phải "pending" — Farmer đã xử lý rồi |
| `bestSellersSumsQuantityAcrossOrders` | cùng sản phẩm trong 3 đơn → một dòng, `quantitySold` cộng dồn |
| `bestSellersIgnoresCancelledAndDeclinedOrders` | không tính hàng chưa từng bán được |
| `dashboardOfOneFarmerNeverIncludesAnothersOrders` | Review focus #3 ở tầng báo cáo |

- [ ] **Step 2–4:** đỏ → viết SQL tổng hợp (JdbcTemplate, tham số hoá) → xanh. Câu doanh thu:

```sql
SELECT COALESCE(SUM(o.total_amount), 0)
FROM orders o
WHERE o.farmer_id = :farmerId
  AND o.status = 'completed'
  AND (:from IS NULL OR o.pickup_date >= :from)
  AND (:to   IS NULL OR o.pickup_date <= :to)
```

- [ ] **Step 5: Commit** — `feat(FR-068): farmer dashboard totals and best sellers`

### Task 9.2: Backend — dashboard + báo cáo Admin, quản Customer (FR-070, 072, 075)

**Files:** `modules/report/repositories/AdminReportRepository.java`,
`services/impl/AdminReportService.java`, `controllers/AdminReportController.java`;
`modules/user/controllers/AdminCustomerController.java` + phần service tương ứng
**Test:** `AdminReportServiceTest`, `AdminCustomerServiceTest`

**Interfaces:**
- Produces:
  - `AdminDashboardResource(long totalFarmers, long totalCustomers, long totalMarkets, long totalOrders,
    BigDecimal revenueTotal, long pendingFarmers, long hiddenListings)`
  - `RevenueByMarketResource(Long marketId, String marketName, long orderCount, BigDecimal revenue)`
  - `TopFarmerResource(Long farmerId, String stallName, long orderCount, BigDecimal revenue, BigDecimal ratingAvg)`
  - `AdminCustomerResource(Long userId, String fullName, String email, String phone, String status,
    long orderCount, String createdAt)`
  - Endpoint: `GET /api/v1/admin/dashboard` · `/admin/reports/orders`, `/revenue`, `/top-farmers` ·
    `GET /api/v1/admin/customers` · `PATCH /api/v1/admin/customers/{id}/status`

- [ ] **Step 1: Viết test — 7 test**

| Tên test | Khẳng định |
|---|---|
| `dashboardCountsOnlyApprovedFarmers` | `pending`/`rejected` nằm ở `pendingFarmers`, không ở `totalFarmers` |
| `dashboardRevenueMatchesSumOfCompletedOrders` | khớp với tổng của `/admin/reports/revenue` |
| `revenueByMarketGroupsCorrectly` | 2 chợ → 2 dòng, tổng bằng `revenueTotal` |
| `topFarmersOrdersByRevenueDescending` | dòng đầu là Farmer doanh thu cao nhất |
| `reportsAcceptAnEmptyDateRange` | `from`/`to` null → toàn thời gian, không lỗi |
| `deactivatingACustomerBlocksTheirLogin` | `users.status = 'inactive'` → `/auth/login` trả **403**, kiểm bằng test tích hợp |
| `deactivatingACustomerLeavesTheirOrdersAlone` | đơn đang chạy không đổi trạng thái |

- [ ] **Step 2–4:** đỏ → viết → xanh.
- [ ] **Step 5:** kiểm tra `deactivatingACustomerBlocksTheirLogin` thật sự chạy — nếu `AuthService`
  chưa kiểm `users.status` thì **thêm vào đó**, đây là FR-072 và là lỗ hổng thật.
- [ ] **Step 6: Commit** — `feat(FR-070): admin dashboard, platform reports and customer management`

### Task 9.3: Frontend — 8 màn dashboard

**Files:** `create frontend/src/api-requests/report.requests.ts`; sửa
`pages/farmer/Overview`, `pages/farmer/History`, `pages/admin/Home`, `pages/admin/Customers`,
`pages/admin/CustomerDetail`, `pages/admin/Orders`, `pages/admin/OrderDetail`,
`pages/admin/Reports`, `pages/admin/Revenue`; xoá `frontend/src/data/admin.ts`

- [ ] **Step 1–8:** nối từng màn theo khuôn 4 trạng thái. Số liệu định dạng qua `vnd()` và `formatDate()`.
  Biểu đồ giữ nguyên component đang có, chỉ đổi nguồn dữ liệu.
- [ ] **Step 9:** `grep -rn "@/data/admin" frontend/src` → không còn dòng nào; xoá file.
- [ ] **Step 10: `npm run build && npm run lint`** xanh; kiểm tra tay các con số khớp nhau giữa
  `/admin` và `/admin/reports`.
- [ ] **Step 11: Commit** — `feat(FR-070): dashboards and reports on real data`
- [ ] **Step 12: Báo đủ 7 điều kiện cho FR-068, 069, 070, 072, 075**

---

## Cụm C10 · Form góp ý — FR-081

**Nhánh:** `feature/FR-081-feedback`

### Task 10.1: Migration + backend + frontend

**Files:** `V20260926013__create_feedbacks_table.sql`; `modules/feedback/` đầy đủ;
`frontend/src/api-requests/feedback.requests.ts`; sửa `pages/public/Feedback`, `pages/admin/Feedback`

**Interfaces:**
- Produces:
  - Bảng `feedbacks(id, user_id NULL, type ENUM('bug','suggestion','query'), message TEXT,
    status ENUM('new','reviewed','resolved') DEFAULT 'new', created_at)`
  - `POST /api/v1/feedbacks` (**Public** — khách vãng lai gửi được, `user_id` NULL) ·
    `GET /api/v1/admin/feedbacks?status=&page=` · `PATCH /api/v1/admin/feedbacks/{id}/status` (Admin)

- [ ] **Step 1: Viết `FeedbackServiceTest` — 4 test**

| Tên test | Khẳng định |
|---|---|
| `acceptsAnonymousFeedback` | `userId = null` → lưu được, không ném |
| `attachesTheUserIdWhenSignedIn` | có token → `user_id` được điền |
| `rejectsAnUnknownType` | `type = "spam"` → **400** field `type` |
| `rateLimitsToFiveSubmissionsPerHourPerIp` | lần thứ 6 → **429** `RATE_LIMITED` |

> Giới hạn tần suất là bắt buộc vì đây là endpoint public không cần đăng nhập. Dùng lại
> `Bucket4jChatRateLimiter` đang có trong `modules/conversation` thay vì viết mới.

- [ ] **Step 2–4:** đỏ → viết → xanh. Thêm `/api/v1/feedbacks` vào whitelist `SecurityConfig`.
- [ ] **Step 5: Frontend** — form 3 lựa chọn (bug / suggestion / query) + ô nội dung, validation client
  khớp server (`message` 10–2000 ký tự). Màn admin: danh sách, lọc theo `status`, đổi `status`.
- [ ] **Step 6: `npm run build && npm run lint`** xanh, **Step 7: Commit** —
  `feat(FR-081): feedback form with bug, suggestion and query types`
- [ ] **Step 8: Báo đủ 7 điều kiện cho FR-081**

> **Lưu ý phạm vi.** FR-081 ở dạng "phân loại bug / suggestion / query" **không có trong SRS MarketLink**
> (mục Other Features của đề chỉ ghi "Feedback and Ratings: Users can rate Farmers or products and
> leave comments", tức FR-050…052). Nó có trong `.ai/REQUIREMENTS.md` nên vẫn làm theo R-07, nhưng nếu
> phải cắt việc khi trượt tiến độ thì đây là cụm cắt trước C8 và C9.

---

## Cụm C11 · Chatbot chạy thật và bàn giao — FR-090…092, 100…102 + mục 1.9 của đề

**Nhánh:** `feature/FR-090-chatbot-and-handover`

### Task 11.1: Sửa chatbot cho khớp schema thật (FR-090, 091, 092)

Chatbot **đã viết xong** (`modules/chat`: `IntentClassifier`, `ChatKnowledgeRepository`, `ChatService`,
bảng `chat_messages`). Nó chưa chạy được vì SQL của nó JOIN các bảng lúc đó chưa tồn tại, và dùng tên
cột PK theo `db/schema.sql` (`p.product_id`, `f.farmer_id`, `m.market_id`) thay vì `id` thật (§S.4.1).

**Files:**
- Modify: `modules/chat/repositories/ChatKnowledgeRepository.java` — đổi tên cột PK
- Modify: `modules/chat/resources/KnowledgeRows.java` nếu record mang tên cột cũ
- Test: `backend/src/test/java/com/techx/intervue/modules/chat/ChatKnowledgeIntegrationTest.java`

- [ ] **Step 1: Đối chiếu từng câu SQL với schema thật**

```bash
grep -n "product_id\|farmer_id\|market_id\|category_id" \
  backend/src/main/java/com/techx/intervue/modules/chat/repositories/ChatKnowledgeRepository.java
```
Quy tắc đổi: `p.product_id` → `p.id`; `f.farmer_id` → `f.id`; `m.market_id` → `m.id`;
`c.category_id` → `c.id`. **Giữ nguyên** `fm.farmer_id`, `fm.market_id`, `p.farmer_id`, `p.category_id`,
`d.market_id` — đó là khoá ngoại, tên không đổi.

- [ ] **Step 2: Viết test tích hợp — 5 test**

```java
/**
 * FR-090…092. Chatbot được viết trước khi có bảng; test này là lần đầu SQL của nó chạy thật.
 * Cũng là bằng chứng cho R-04: không câu nào nối chuỗi input người dùng.
 */
@SpringBootTest
class ChatKnowledgeIntegrationTest {

    @Test
    void findProductReturnsSeededRows() { /* hỏi "bưởi" -> results[] không rỗng, type = "product" */ }

    @Test
    void marketHoursAnswersFromTheMarketsTable() { /* intent MARKET_HOURS -> có giờ mở/đóng thật */ }

    @Test
    void farmerAvailabilityUsesOperatingDays() { /* intent FARMER_AVAILABILITY -> trả đúng thứ */ }

    @Test
    void everyMessageIsStoredWithItsIntent() {
        /* FR-092 — sau POST /api/v1/chat, chat_messages có 2 dòng (user + bot), dòng user có intent != null */
    }

    @Test
    void aQuoteInTheQuestionDoesNotBreakTheQuery() {
        /* hỏi: rau' OR 1=1 --  -> trả lời bình thường, không lỗi SQL, không trả toàn bộ bảng */
    }
}
```

- [ ] **Step 3: `make be-test`** — 5 test xanh. Test cuối là bằng chứng chống injection cho giám khảo.
- [ ] **Step 4: Frontend `pages/customer/Assistant/index.tsx`** — bỏ kịch bản hard-code
  (`type Reply = 'greeting' | 'pomelo' | 'slots' | 'unknown'`, `INITIAL_LOG`), gọi
  `POST /api/v1/chat` và `GET /api/v1/chat/history?sessionKey=`. `sessionKey` là UUID sinh một lần và
  giữ trong `localStorage`. Hiện `intent` nhận diện được dưới mỗi câu trả lời — đề bắt giải thích được
  cách hoạt động, và đây là cách rẻ nhất.
- [ ] **Step 5: `npm run build && npm run lint`** xanh; hỏi thử "Chợ Bà Chiểu mấy giờ mở cửa?"
  và "có bưởi không" trên trình duyệt, cả hai phải ra dữ liệu thật đã seed.
- [ ] **Step 6: Commit** — `feat(FR-090): chatbot runs against the real catalogue`

### Task 11.2: Seed hoàn chỉnh và bảng tài khoản demo (FR-100, 101, 102)

**Files:**
- Modify: `db/seed.sql` — rà soát toàn bộ
- Create: `docs/DEMO_CREDENTIALS.md`
- Modify: `README.md` — mục cài đặt và chạy

- [ ] **Step 1: Chạy từ database rỗng**

```bash
make clean && make up
```
Chờ Flyway chạy hết, rồi:
```bash
make seed
```
Kỳ vọng: **không một lỗi nào**. Nếu có lỗi thứ tự khoá ngoại thì sắp lại các khối trong `seed.sql`,
không thêm `SET FOREIGN_KEY_CHECKS = 0`.

- [ ] **Step 2: Đếm lại theo FR-100/101**

```bash
make mysql
```
```sql
SELECT 'markets', COUNT(*) FROM markets
UNION ALL SELECT 'farmers', COUNT(*) FROM farmer_profiles WHERE approval_status = 'approved'
UNION ALL SELECT 'products', COUNT(*) FROM products WHERE is_deleted = FALSE
UNION ALL SELECT 'orders', COUNT(*) FROM orders
UNION ALL SELECT 'reviews', COUNT(*) FROM reviews;
SELECT status, COUNT(*) FROM orders GROUP BY status;
```
Kỳ vọng: markets ≥ 4 · farmers ≥ 10 · products ≥ 50 · orders ≥ 12 · reviews ≥ 8 ·
bảng trạng thái có **đủ 6 dòng**.

- [ ] **Step 3: Viết `docs/DEMO_CREDENTIALS.md`** — đề bắt nộp bảng này (mục 1.9, MANDATORY):

```markdown
# Tài khoản demo — MarketLink

Mọi tài khoản dưới đây dùng chung mật khẩu: `Demo@1234`
Nạp bằng `make seed` (xem README mục "Chạy dự án").

| Vai | Email | Dùng để xem |
|---|---|---|
| Admin | admin@marketlink.vn | dashboard, duyệt Farmer, chợ, danh mục, kiểm duyệt, báo cáo |
| Customer | customer@marketlink.vn | đặt trước, đơn đủ 6 trạng thái, yêu thích, đánh giá |
| Farmer | farmer@marketlink.vn | sản phẩm, slot, đơn đến, doanh thu |
| Farmer (thứ 2) | farmer2@marketlink.vn | để xem giỏ tách thành 2 đơn (D-01) |

Tài khoản admin có bật xác thực hai bước không? **Không** — `admin@marketlink.vn` chỉ cần mật khẩu.
MFA là tuỳ chọn, bật trong Settings → Security.
```

- [ ] **Step 4: Cập nhật `README.md`** — mục "Cài đặt và chạy" phải đủ để người chưa từng thấy dự án
  chạy được: yêu cầu (Docker), `make init`, `make up`, `make seed`, cổng `:3000` và `:8080`,
  đường dẫn tới `docs/DEMO_CREDENTIALS.md`. Đề gọi đây là **Project Installation Instructions (MANDATORY)**.
- [ ] **Step 5: Commit** — `docs(FR-102): demo credentials and installation instructions`

### Task 11.3: Xuất `.sql` nộp bài và rà soát khớp đề

- [ ] **Step 1: Xuất schema thật ra file nộp**

```bash
docker compose exec -T mysql mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" \
  --no-data --skip-comments --compact "$MYSQL_DATABASE" > db/marketlink-schema-dump.sql
```
Đề bắt nộp "SQL scripts files (.sql) containing database and table definitions". Nộp **cả ba**:
`db/schema.sql` (thiết kế của LEAD), `db/marketlink-schema-dump.sql` (bảng thật đang chạy),
`db/seed.sql` (dữ liệu demo).

- [ ] **Step 2: Đối chiếu dump với `db/schema.sql`** và ghi mọi chỗ lệch vào phần "Đề xuất LEAD"
  cuối file này. **Không sửa `db/schema.sql`** (R-02).

- [ ] **Step 3: Rà soát từng dòng SRS** — mở `MarketLink End-to-End Web Solutions_SRS.pdf` mục 1.6,
  đọc từng gạch đầu dòng, mở đúng màn hình tương ứng trên `localhost:3000` và xác nhận nó chạy.
  Ghi kết quả vào một bảng trong `docs/SRS-COVERAGE.md`: dòng SRS → FR-xxx → URL → đã xem (có/không).
  **Đây là kịch bản của video demo mà đề bắt nộp.**

- [ ] **Step 4: Kiểm tra lần cuối cả hai lệnh**

```bash
make be-test && make lint
```
Cả hai phải xanh. Rồi `npm run build` trong `frontend/`.

- [ ] **Step 5: Commit** — `docs: SQL dump, SRS coverage table for the demo video`
- [ ] **Step 6: Báo đủ 7 điều kiện cho FR-090, 091, 092, 100, 101, 102**

### Task 11.4: Dọn dấu vết dữ liệu giả

- [ ] **Step 1:**

```bash
ls frontend/src/data/
grep -rn "@/data/" frontend/src --include=*.tsx --include=*.ts | grep -v "src/data/"
```
Kỳ vọng: chỉ còn `units.ts` và `tiers.ts` (hằng số thật, không phải dữ liệu demo).
Còn dòng nào khác nghĩa là một màn hình vẫn đang nói dối.

- [ ] **Step 2: Xoá `admin.ts`, `catalog.ts`, `customer.ts`, `farmer.ts`, `home.ts`**, chạy
  `npm run build` để trình biên dịch chỉ ra mọi chỗ còn tham chiếu.
- [ ] **Step 3: `npm run build && npm run lint && make be-test`** — cả ba xanh.
- [ ] **Step 4: Commit** — `chore: remove the frozen prototype data now that every screen calls the API`

---

# §R — Rà soát plan so với spec

Phần này là kết quả của lượt tự soát sau khi viết xong. Giữ lại để người chạy plan biết chỗ nào đã
được cân nhắc và chỗ nào còn mở.

## R.1 · Phủ đề — mọi FR đều có task

| FR | Task | FR | Task |
|---|---|---|---|
| 001…007 | đã xong trước plan | 050…053 | 8.1–8.3 |
| 010 | 1.3, 1.5 | 060, 061 | 2.1–2.4 |
| 011 | 2.2, 2.4 | 062 | 3.1, 3.3, 3.5 |
| 012 | 1.5 | 063 | 6.1 |
| 013 | 1.5 (nút Directions), 7.3 | 064 | 3.3, 3.5 |
| 014 | 7.1, 7.3 | 065, 066 | 5.5, 5.10 |
| 020 | 1.2, 3.2, 3.5 | 067 | 4.1, 4.2 |
| 021, 022 | 3.2, 3.5 | 068, 069 | 9.1, 9.3 |
| 023 | 3.2, 3.5 (bản đồ kết quả) | 070 | 9.2, 9.3 |
| 030 | 5.3, 5.9 | 071 | đã xong trước plan |
| 031 | 5.3 | 072 | 9.2, 9.3 |
| 032 | 4.2, 5.3, 5.9 | 073 | 1.1, 1.3, 1.5 |
| 033, 036 | 5.4, 5.9 | 074 | 3.1, 3.3, 8.2 |
| 034, 035 | 5.6, 5.9 | 075 | 9.2, 9.3 |
| 037 | 6.2 | 076 | 1.2, 1.5 |
| 038 | 5.2, 5.5 | 077 | đã xong trước plan |
| 039 | 6.3 | 080, 084 | ràng buộc chung, mọi task FE |
| 040, 041 | 7.1–7.3 | 081 | 10.1 |
| 042 | 5.7 | 082, 083 | đã xong trước plan |
| 043 (NICE) | **không làm** — cắt theo ghi chú `.ai/REQUIREMENTS.md` | 085 (NICE) | **không làm** |
| 090…092 | 11.1 | 100…102 | 1.4, 2.3, 3.4, 5.8, 8.3, 11.2 |

**Ba FR không có task, có chủ ý:** FR-043 (email thật) và FR-085 (sitemap) là NICE — cắt đầu tiên
theo chính `.ai/REQUIREMENTS.md`. FR-013 không có task riêng vì `src/lib/directions.ts` đã có sẵn;
việc còn lại chỉ là gắn nút vào các màn mới, nằm trong 1.5 và 7.3.

## R.2 · Nơi từng dòng Review Focus được kiểm

| # | Rủi ro | Test | Task |
|---|---|---|---|
| 1 | Hai khách giành lô hàng cuối | `onlyOneOfTwoSimultaneousOrdersGetsTheLastUnit` | 5.3 |
| 2 | Slot vượt sức chứa | `bookedCountNeverExceedsMaxOrders` + `CHECK ck_slot_capacity` | 4.1, 5.3 |
| 3 | Đổi `{id}` trên URL | `OrderAccessTest` (6 test), `updateOnAnotherFarmersProductIs403`, `createRequiresTheOrderToBelongToTheReviewer`, `removeAnotherUsersFavoriteIs403`, `dashboardOfOneFarmerNeverIncludesAnothersOrders` | 5.4, 3.3, 8.2, 7.1, 9.1 |
| 4 | Admin bấm nút mua (D-13) | `placeRefusesAnAdminAccount`, `adminCannotAddFavorites`, `adminCannotReview` | 5.3, 7.1, 8.2 |
| 5 | Farmer bị đình chỉ giữa chừng (D-09) | `publicProductSqlExcludesSuspendedStallsAndHiddenListings`, `aSuspendedFarmerCanStillFinishOrdersPlacedBeforeTheSuspension` | 3.2, 5.5 |

## R.3 · Thứ tự bắt buộc

```
C1 ─→ C2 ─→ C3 ─→ C4 ─→ C5 ─→ C6
                         ├──→ C7
                         ├──→ C8
                         └──→ C9 ─→ C10 ─→ C11
```

- **C1 → C2**: `farmer_markets` tham chiếu `markets`.
- **C3 → C5**: không có `products` thì không có `order_items`.
- **C4 → C5**: `orders.slot_id` tham chiếu `pickup_slots`.
- **C5 → C7/C8/C9**: restock alert cần đường hoàn tồn kho; review cần đơn `completed`;
  báo cáo cần doanh thu.
- **C11 cuối cùng** vì seed phải đầy đủ trước khi chatbot có gì để trả lời.

C7, C8, C9 độc lập với nhau — chạy song song được nếu có hai người.

## R.4 · Nhất quán kiểu và tên

Đã soát các tên dùng chéo giữa các task:
- `OrderLifecycle.assertTransition` / `restoresStock` / `cutoffAt` / `canCustomerCancel` /
  `canCustomerModify` — định nghĩa ở 5.2, dùng nguyên tên ở 5.3, 5.5, 5.6, 6.3.
- `OrderService.transition(order, to, actorUserId, note)` — định nghĩa ở 5.5, dùng lại ở 5.6 và 6.3.
- `ProductRepository.lockAllById(ids)` và `PickupSlotRepository.lockById(id)` — định nghĩa ở 5.3,
  dùng lại ở 5.5 và 5.6.
- `ProductQueryRepository.VISIBILITY_FILTER` — định nghĩa ở 3.2, là hằng số `public static` chính vì
  test ở 3.2 đọc nó và các câu SQL khác dán nó vào.
- `StallSummaryResource` — khai ở 1.3 (rỗng), đổ dữ liệu ở 2.2, dùng lại trong `ProductDetailResource` ở 3.2.
- `ReviewSummaryResource` — khai ở 3.2 với giá trị 0, đổ dữ liệu thật ở 8.2.
- `CartLine(productId, quantity)` — dùng chung cho `PreviewRequest`, `PlaceOrderRequest`,
  `ModifyOrderRequest`, `reorder`, và `frontend/src/lib/cart.ts`.

Hai chỗ **cố ý quay lại sửa task trước**, đã ghi rõ tại chỗ:
`MarketService.detail` (1.3 → 2.2) và `OrderDetailResource.reviewed` (5.4 → 8.3).

## R.5 · Đề xuất gửi LEAD (R-02 — không ai được tự sửa)

Bốn chỗ code sẽ lệch `db/schema.sql`. Trình LEAD trước khi chạy C3.

| # | Chỗ lệch | Lý do | Ảnh hưởng nếu LEAD bác |
|---|---|---|---|
| 1 | Khoá chính tên `id`, kiểu `BIGINT UNSIGNED` (schema ghi `<bảng>_id INT`) | khớp `users.id` thật; `V20260925007` đã làm thế | phải viết lại toàn bộ migration đã merge — R-03 cấm |
| 2 | `products.is_hidden` + `hidden_reason` (không có trong schema) | FR-074 "admin remove inappropriate product listings" không có đường nào khác; dùng `status` sẽ lẫn với quyền của Farmer | FR-074 không làm được ở phía sản phẩm |
| 3 | `order_items` thêm `UNIQUE (order_id, product_id)` | D-07 sửa số lượng theo sản phẩm; hai dòng cùng `product_id` làm phép sửa nhập nhằng | phải đổi `modifyItems` sang khoá theo `order_item_id` |
| 4 | `markets` thêm `UNIQUE (market_name)`, `products` thêm `UNIQUE (farmer_id, name)` | để `db/seed.sql` chạy lại được nhiều lần | seed phải `TRUNCATE` trước, mất dữ liệu người chạy tự tạo |

Ngoài ra, hai chỗ trong `.ai/REQUIREMENTS.md` nên LEAD/QA xem lại:
- **FR-081** (form góp ý phân loại bug/suggestion/query) không có trong SRS MarketLink. Giữ hay cắt?
- **Deliverables mục 1.9 của đề chưa có ID FR nào**: video .mp4 (MANDATORY), installation
  instructions (MANDATORY), bảng credentials (MANDATORY), file `.sql`, ReadMe assumptions,
  ghi nhận công cụ AI. Task 11.2 và 11.3 làm chúng, nhưng chúng nên có ID để QA tick được.

## R.6 · Việc plan này **không** làm

- FR-043 (email thật) và FR-085 (sitemap) — NICE, cắt theo `.ai/REQUIREMENTS.md`.
- Không dựng lại màn hình nào. Mọi task frontend chỉ đổi **nguồn dữ liệu** và thêm trạng thái
  loading/empty/error. Thấy mình đang viết JSX mới cho một màn đã có là đã đi lệch.
- Không đụng vào chat người–người, achievements, MFA, Google OAuth, i18n, avatar — ngoài đề.
- Không thêm cổng thanh toán, giao hàng, xác thực Farmer, multi-profile — đề miễn trừ.

## R.7 · Đề xuất LEAD từ phiên C8–C11 (26/09/2026) — R-02, không ai tự sửa

**Contract (`docs/api-contract.md`)**
1. Thêm mục Farmer dashboard: `GET /farmer/dashboard`, `GET /farmer/reports/best-sellers?from&to&limit`,
   `GET /farmer/reports/sales?from&to&page&pageSize` (plan 9.1 định nghĩa, contract chưa có).
2. §10: `AdminDashboardResource` có thêm `hiddenListings`; thêm `GET /admin/customers/{id}` cho trang admin
   CustomerDetail đang tồn tại (chưa làm).
3. §8: nếu trang stall cần histogram thì thêm `reviewsSummary` vào `GET /farmers/{id}` (hiện chỉ có `ratingAvg`,
   `ratingCount`).
4. §11: `GET /admin/feedbacks?status&page&pageSize`, `PATCH /admin/feedbacks/{id}/status` (đã làm theo plan 10.1).

**Schema (`db/schema.sql` so với `db/marketlink-schema-dump.sql`, Task 11.3)**
- Khoá chính mọi bảng tên `id` `BIGINT UNSIGNED` (schema ghi `<bảng>_id INT`) — R.5 #1, đã áp dụng toàn bộ.
- Bảng chỉ có trong code: `admin_mfa`, `admin_mfa_recovery_codes`, `conversations`, `messages`, `message_attachments`,
  `message_reports`, `user_presence`, `user_settings`, `user_social_accounts`, `refresh_tokens`,
  `farmer_application_history`, `market_images`, `market_closures` (tính năng ngoài plan này).
- Bảng chỉ có trong schema: `password_reset_tokens` (reset qua token Redis, không có bảng).
- Cột thêm trong code: `products.is_hidden/hidden_reason/shelf_life_days`; `categories.min/max_shelf_life_days`
  (bỏ `description`, `icon`); `farmer_profiles.photo_paths/video_path/suspend_reason/suspended_by/suspended_at`;
  `favorites.target_id`; `users.image`; `created_at`/`updated_at` ở `farmer_markets`, `pickup_slots`, `markets`.
- Cột schema có mà code không: `notifications.order_id/product_id` (dùng `link` + `params`).
- `reviews`: `created_at` TIMESTAMP (UTC) thay DATETIME; `uq_review` giữ nguyên nhưng NULL không chặn trùng — đề xuất cột
  sinh `target_id = COALESCE(product_id, farmer_id)` + `UNIQUE (order_id, target_type, target_id)`.

**Cấu hình prod**: `server.tomcat.remoteip.internal-proxies` = IP container nginx, để `forward-headers-strategy: native`
chỉ tin proxy thật (FR-081 rate limit theo địa chỉ khách).
