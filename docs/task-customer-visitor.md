# Việc còn lại — Customer & Visitor, và dữ liệu seed sản phẩm

Soạn 25/09/2026 · đối chiếu trực tiếp với code trên `origin/dev` (`58dfa34`), không phải phỏng đoán.
Dành cho **FE dev làm song song** trong lúc backend core (markets, products, orders, reviews) đang được triển khai ở nhánh khác.

Mọi task dưới đây **không đụng backend core**: CV-01…CV-09 và CV-11 chỉ sửa trong `frontend/` và chạy trên demo data
có sẵn; CV-10 chỉ tạo file dữ liệu và ảnh trong `db/seed/` cho người viết seeder dùng, không viết code backend.

---

## Luật để không giẫm chân nhau

1. **Không tạo API client cho markets / products / orders / cart / reviews.** Backend chưa có bảng cũng chưa có endpoint;
   contract sẽ do người làm backend core chốt. Cứ để màn hình chạy demo data như hiện tại.
2. **Demo data nằm ở `frontend/src/data/*.ts`** (`catalog.ts`, `customer.ts`, `home.ts`, `farmer.ts`). Thêm field thì thêm vào đó,
   đừng hard-code mảng mới trong page — trừ khi page đó đang làm vậy sẵn và task yêu cầu sửa.
3. **Không sửa** `db/schema.sql`, `docs/api-contract.md`, `docs/decisions.md` (R-02 — của LEAD),
   `frontend/src/styles/marketlink-*.css` và `docs/design-system/tokens.json` (output của design system).
4. Mỗi task = 1 nhánh cắt từ `origin/dev`: `git switch -c feature/CV-0x-<slug> origin/dev`. Commit tiếng Anh, có FR id.
5. Cột **File** trong bảng là ranh giới sở hữu — hai task khác cột file thì làm song song thoải mái.

---

## Bảng tổng hợp

| ID | Việc | FR | Cỡ | File chính |
|---|---|---|---|---|
| CV-01 | 4 trạng thái UI cho 6 trang Customer | FR-084 | M | `pages/customer/{Orders,Favorites,Messages,Notifications,Dashboard,Cart}` |
| CV-02 | 4 trạng thái UI cho 4 trang public | FR-084 | M | `pages/public/{Home,MarketDetail,ProductDetail,StallProfile}` |
| CV-03 | Giỏ hàng có state thật (thêm được vào giỏ) | FR-030 | L | `lib/cart.ts` (mới), `App.tsx`, `pages/public/ProductDetail`, `pages/customer/Cart` |
| CV-04 | Yêu thích có state thật, không mất khi F5 | FR-040 | M | `lib/favorites.ts` (mới), `components/FavoriteButton.tsx`, `pages/customer/Favorites` |
| CV-05 | Nối trang Messages với API chat đã có sẵn | FR-110/111/115 | L | `api-requests/conversation.requests.ts` (mới), `pages/customer/Messages` |
| CV-06 | Trang About: ảnh thật + thông tin team | FR-082 | S | `pages/public/About`, `locales/*/About.json` |
| CV-07 | Trang Contact: thông tin liên hệ thật | FR-083 | S | `pages/public/Contact`, `locales/*/Contact.json` |
| CV-08 | Tiêu đề tab theo trang + cuộn lên đầu khi đổi trang | — | S | `hooks/`, `App.tsx` |
| CV-09 | Sitemap ở trang chủ | FR-085 | S | `pages/public/Home`, `components/Footer.tsx` |
| CV-10 | **Chuẩn bị dữ liệu + ảnh seed cho sản phẩm** | FR-100 | L | `db/seed/` (mới), `frontend/public/product-images/` (mới) |
| CV-11 | Đổi demo data sang 8 category mới + hiện ảnh sản phẩm | FR-020/084 | M | `data/catalog.ts`, `docs/prototype/data.js`, `components/ProductCard.tsx` |

Ưu tiên: **CV-10 và CV-01, CV-03 trước** (CV-10 là đường găng của cả backend core — không có dữ liệu thì không demo
được gì), rồi CV-05, CV-11, CV-02, CV-04, cuối cùng CV-06…09.

---

## CV-01 · 4 trạng thái UI cho trang Customer (FR-084)

**Vấn đề.** Component `DataState` và `LoadError` đã có sẵn ở `frontend/src/components/ui/data-state.tsx` và đang được
10 trang admin + 4 trang farmer dùng, nhưng **không trang Customer nào dùng**. Kết quả: lọc ra 0 kết quả thì khu vực đó
trắng trơn, không một dòng chữ.

Kiểm chứng nhanh: vào `/orders`, chọn Stall = "Ba Lành Farm" → cả 3 tab đều trống, không có chữ nào.
Trong prototype `docs/prototype/customer/orders.html` khối này có đủ: *"No upcoming orders"* + nút *Browse markets*, và một khối lỗi.

**Cần làm.** Thêm trạng thái empty (và error nếu trang có fetch) cho:

| Trang | Khi nào trống | Gợi ý nội dung |
|---|---|---|
| `Orders` | tab Upcoming/Past/All sau khi lọc theo sạp | "Chưa có đơn sắp tới" + nút sang `/markets` |
| `Favorites` | mỗi tab (products/stalls/markets) và mỗi filter (sold out, price dropped) | "Chưa lưu sản phẩm nào" + nút sang `/products` |
| `Messages` | chưa có cuộc trò chuyện nào | "Chưa có tin nhắn" + giải thích nhắn từ trang sạp |
| `Notifications` | filter "Unread" mà không còn cái nào | "Đã đọc hết" |
| `Dashboard` | khách mới, chưa có đơn | lời chào + hướng đi tiếp |
| `Cart` | xoá hết item trong một sạp / cả giỏ | "Giỏ hàng trống" + nút sang `/products` |

**Ràng buộc.** Dùng lại `DataState`, đừng dựng khối mới. Chữ đi qua i18n: thêm key vào
`locales/en/<Namespace>.json` rồi dịch đủ 10 ngôn ngữ (xem cách làm ở `docs/i18n.md`).

**Xong khi:** mỗi trang trên đều hiện đúng một khối empty rõ nghĩa, không còn vùng trắng; `npm run lint` và `npx tsc -b` xanh.

---

## CV-02 · 4 trạng thái UI cho trang public (FR-084)

**Vấn đề.** Tương tự CV-01 ở phía khách chưa đăng nhập, cộng thêm **loading**: toàn app chỉ có đúng một skeleton
(`components/MarketCardSkeleton.tsx`) và chỉ trang `/markets` dùng nó.

**Cần làm.**

- `MarketDetail` — chợ không có sạp nào mở vào ngày đang chọn, hoặc lọc sản phẩm ra 0 kết quả (`index.tsx:219`).
- `ProductDetail` — khối đánh giá (`index.tsx:269`) đổ thẳng `allReviews.map()`, sản phẩm chưa ai đánh giá sẽ ra tiêu đề
  trơ với khoảng trắng bên dưới. Cần "Chưa có đánh giá nào". *(Hai khối "sản phẩm tương tự" và "cũng từ sạp này" đã
  tự ẩn khi rỗng — không phải sửa.)*
- `StallProfile` — sạp không có sản phẩm nào trong ngày đang chọn (`index.tsx:196`), và khối đánh giá đã lọc ra 0 (`:270`).
- `Home` — các dải "Fresh products" / "Nearby markets" khi rỗng (`FreshProducts.tsx:17`, `NearbyMarkets.tsx:14`).
- Skeleton cho 3 danh sách nặng: sản phẩm (`/products`), kết quả tìm kiếm (`/search`), sạp trong `MarketDetail`.
  Viết theo đúng kiểu `MarketCardSkeleton` (có `<span class="sr-only">` báo cho trình đọc màn hình).

**Lưu ý.** `MarketDetail`, `ProductDetail`, `StallProfile` **đã có** màn "không tìm thấy id" — đừng làm lại phần đó.

---

## CV-03 · Giỏ hàng có state thật (FR-030)

**Vấn đề — nặng nhất trong danh sách này.** Luồng chính của sản phẩm đang đứt:

- `pages/public/ProductDetail/index.tsx:139` — bấm "Add to cart" chỉ bắn một toast, **không thêm gì vào đâu**.
- `pages/customer/Cart/index.tsx:49-56` — giỏ hàng là 3 item viết cứng trong file, luôn luôn là 3 item đó.
- `App.tsx:87,134` render `<MainLayout />` không truyền prop, nên `cartCount` ở `components/Header/index.tsx:44`
  luôn bằng 0 → **badge số trên icon giỏ không bao giờ hiện**, dù code badge đã viết xong.
- Cả frontend không có `createContext` nào và không dùng `localStorage` cho giỏ (chỉ Settings dùng).

**Cần làm.**

1. `src/lib/cart.ts` + một context nhỏ: `addItem`, `updateQty`, `removeItem`, `clear`, đọc/ghi `localStorage`.
   Item tối thiểu: `productId, farmerId, name, unit, price, qty, max`.
2. Tách đơn **theo Farmer** khi hiển thị (D-01) — logic tách để trong lib, không để trong page.
3. Nối vào: `ProductDetail`, `Products`, `Favorites` (nút "Add to cart" của từng dòng và nút thêm hàng loạt),
   `Cart` (đọc từ store thay vì mảng cứng), `OrderPlaced` (đặt xong thì `clear()`).
4. Truyền `cartCount` vào `<MainLayout />` trong `App.tsx`.
5. Chưa đăng nhập vẫn thêm được vào giỏ; bấm "Place order" mới đẩy sang `/login` rồi quay lại `/cart`
   (xem cách `FavoriteButton` đang chuyển hướng, `components/FavoriteButton.tsx:24-31`).

**Quan trọng.** Viết sao cho sau này thay `localStorage` bằng API chỉ phải sửa **một file** (`lib/cart.ts`).
Đừng gọi API, đừng thêm `api-requests/cart.requests.ts`.

**Xong khi:** thêm 2 sản phẩm của 2 sạp khác nhau → badge hiện 2, `/cart` hiện đúng 2 nhóm, F5 vẫn còn, xoá hết thì ra khối "giỏ trống" của CV-01.

---

## CV-04 · Yêu thích có state thật (FR-040)

**Vấn đề.** `components/FavoriteButton.tsx:17` giữ trạng thái bằng `useState` cục bộ → tim đỏ mất sau khi F5, và
trang `/favorites` đọc một danh sách demo riêng, không liên quan gì tới những gì vừa bấm tim.

**Cần làm.** `src/lib/favorites.ts` theo đúng kiểu CV-03 (localStorage, 3 loại: product / stall / market), nối vào
`FavoriteButton`, trang `/favorites`, và nút lưu chợ trong `MarketDetail`. Giữ nguyên hành vi hiện có: chưa đăng nhập
thì chuyển sang `/login` rồi quay lại đúng trang.

**Phụ thuộc:** làm sau CV-03 để dùng lại cùng một khuôn store (đừng viết hai kiểu khác nhau).

---

## CV-05 · Nối trang Messages với API chat đã có (FR-110/111/115)

**Vấn đề.** Backend chat người–người **đã xong và đã merge**: `POST/GET /api/v1/conversations`, `GET /{id}/messages`,
`POST /{id}/messages`, `POST /{id}/read`, `GET /unread-count`, ảnh đính kèm qua `/api/v1/attachments`, realtime STOMP qua `/ws`
(`modules/conversation/realtime/WebSocketConfig.java`). Contract ở `docs/api-contract.md` §12.

Trong khi đó frontend **chưa có một dòng nào gọi tới**: `src/api-requests/` không có file conversation, cả `src/` không
xuất hiện chữ `stomp`/`WebSocket`, và `pages/customer/Messages/index.tsx:29` là 2 cuộc trò chuyện viết cứng bằng tiếng Anh.

**Cần làm.**

1. `api-requests/conversation.requests.ts` bám đúng `docs/api-contract.md` §12 (R-05: lệch thì sửa FE, không sửa contract).
2. Trang `/messages`: danh sách hội thoại (có phân trang), mở một hội thoại, gửi tin, đánh dấu đã đọc, gửi ảnh.
3. Realtime: thêm `@stomp/stompjs`, subscribe tin mới + trạng thái đang gõ + online. Mất kết nối thì vẫn dùng được ở chế độ tải lại thủ công.
4. Badge chưa đọc: gọi `/unread-count`, truyền `unreadCount` vào `<MainLayout />` (prop đã có sẵn, chưa ai truyền).
5. Giữ nguyên `components/ChatMessage.tsx` và `MessageOrderRef` — khối tham chiếu đơn hàng cứ để chạy demo data cho tới khi có API đơn hàng.

**Đây là task duy nhất trong danh sách có gọi API thật** — và an toàn, vì module chat đã đóng, backend core không đụng vào.

---

## CV-06 · Trang About (FR-082)

- `pages/public/About/index.tsx:7` — 4 ảnh carousel đang **hotlink từ Unsplash**, không có ảnh nào là chợ phiên Việt Nam.
  Design system yêu cầu ảnh tự chụp hoặc ảnh có giấy phép + ghi nguồn trong ReadMe.
- Phần team đang để trống: chưa có tên thật, vai trò, ảnh (FR-082).
- SRS mục 1.6 bắt buộc **liệt kê các công cụ AI đã dùng** — trang này là chỗ để, hiện chưa có.

Sửa nội dung trong `locales/*/About.json` cho cả 10 ngôn ngữ (tên người và tên công cụ giữ nguyên, không dịch).

---

## CV-07 · Trang Contact (FR-083)

`locales/en/Contact.json` đang ghi thẳng `"toAdd": "To add"` cho **email, số điện thoại, địa chỉ**, và pin bản đồ là
*"Placeholder pin, District 1"*. Bản đồ và bố cục đã xong — chỉ thiếu dữ liệu thật.

Cần: email + số điện thoại + địa chỉ của team, toạ độ thật cho marker (`pages/public/Contact/index.tsx:46-59`), giờ làm việc.
Nếu team chưa chốt, hỏi LEAD trước khi tự bịa.

---

## CV-08 · Tiêu đề tab + cuộn lên đầu trang

Hai lỗi nhỏ nhưng gặp ở mọi trang:

1. **Tab trình duyệt luôn hiện "MarketLink"** — `frontend/index.html:17` là nơi duy nhất đặt `<title>`, không trang nào tự đổi.
   Người dùng mở nhiều tab (so sánh 2 sản phẩm) sẽ không phân biệt được. Làm một hook `useDocumentTitle(title)` dùng chung.
2. **Đổi trang không cuộn lên đầu** — dùng `<Routes>` kiểu khai báo nên React Router không tự reset; hiện chỉ
   `pages/customer/BecomeFarmer/index.tsx:160` tự gọi `window.scrollTo`. Đi từ giữa danh sách sản phẩm vào trang chi tiết
   sẽ rơi vào giữa trang. Thêm một `<ScrollToTop />` đặt cạnh `<Routes>`.

> Hai việc này **chưa có FR** (R-07). Xin LEAD gật đầu gộp vào FR-080 trước khi mở PR.

---

## CV-09 · Sitemap ở trang chủ (FR-085, NICE)

Chưa có gì: tìm cả repo không ra chữ `sitemap`. Footer hiện có 9 link.
Làm một khối sitemap gọn ở cuối trang chủ, nhóm theo: Chợ · Sản phẩm · Tài khoản · Về chúng tôi.
Đây là NICE — cắt đầu tiên nếu thiếu thời gian.

---

## CV-10 · Chuẩn bị dữ liệu và ảnh seed cho sản phẩm (FR-100)

> Task này **không viết code**. Sản phẩm bàn giao là **file dữ liệu + thư mục ảnh**. Người làm backend core sẽ viết
> seeder đọc chúng. Nhờ vậy hai bên chạy song song không đụng nhau.
> `.ai/REQUIREMENTS.md` gọi thiếu dữ liệu mẫu là **rủi ro số 1** của đồ án — làm sớm, đừng để sát ngày nộp.

### 8 category đã chốt

**Toàn bộ dữ liệu seed viết bằng tiếng Anh — trong database không có tiếng Việt.** Giống hệt 26 sản phẩm demo đang có
(`Sourdough loaf`, `Choy sum`, `Free-range eggs`). Ngoại lệ duy nhất là danh từ riêng, giữ nguyên trong tên:
`Hóc Môn water spinach`, `Bánh bò`, `ST25 rice`.

Category **không đi qua i18n**: nó là dữ liệu do admin thêm/sửa/xoá (FR-076), danh sách mở, nên hiển thị nguyên văn
`name` — đúng cách tên sạp và tên sản phẩm đang hoạt động. Một bảng key dịch cố định sẽ vỡ ngay lần admin thêm loại mới.

| # | slug | name (DB) | Gồm những gì |
|---|---|---|---|
| 1 | `vegetables` | Vegetables | rau lá, rau thơm, củ, quả dùng như rau (cà chua, bí, dưa leo) |
| 2 | `fruits` | Fruits | trái cây tươi theo mùa |
| 3 | `eggs_and_dairy` | Eggs & dairy | trứng gà/vịt/cút, sữa, sữa chua, phô mai tươi |
| 4 | `grains_beans_and_nuts` | Grains, beans & nuts | gạo, đậu, mè, lạc, hạt điều |
| 5 | `meat_and_poultry` | Meat & poultry | gà, vịt, heo, bò |
| 6 | `seafood` | Seafood | cá, tôm, cua, mực, nghêu |
| 7 | `mushrooms` | Mushrooms | nấm tươi và nấm khô |
| 8 | `baked_goods` | Baked goods | bánh mì, bánh ngọt, bánh truyền thống |

**Ai sở hữu danh sách này.** Admin CRUD 8 loại trên (FR-076); đây là danh sách dùng chung cho cả nền tảng, hiện sẵn
cho mọi farmer. Farmer chọn loại khi tạo sản phẩm và tự do sửa **sản phẩm của mình** (tên, giá, đơn vị, ảnh, mô tả),
nhưng không sửa bản thân danh mục — chỉ có một bảng `categories`, farmer sửa thì mọi sạp khác đổi theo.

### Cần giao gì

**1 · `db/seed/categories.json`** — 8 dòng đúng bảng trên, kèm `sort_order` (1→8) và `description` một câu.

**2 · `db/seed/products.json`** — **7 sản phẩm mẫu mỗi loại = 56 sản phẩm** (FR-100 yêu cầu 50+). Mỗi sản phẩm:

```json
{
  "slug": "water-spinach",
  "name": "Củ Chi water spinach",
  "category": "vegetables",
  "unit": "bunch",
  "price": 15000,
  "description": "Water spinach from a Củ Chi plot, cut the evening before market day.",
  "image": "vegetables/water-spinach.webp",
  "stalls": ["Cô Tư Garden", "Hóc Môn Greens"]
}
```

- **`price`**: giá thật ở TP.HCM, số nguyên VND, không lẻ đến đồng. Đừng bịa giá tròn trịa kiểu 20.000 cho mọi thứ —
  giám khảo nhìn ra ngay.
- **`unit`**: lấy đúng chuỗi đang có trong `frontend/src/data/units.ts` — `kg`, `g`, `bunch`, `piece`, `bulb`, `dozen`,
  `bag`, `jar`, `bottle`, `loaf`, `tray of 30`, `basket`. Thiếu đơn vị nào (ví dụ `hand` cho nải chuối) thì bổ sung vào
  `units.ts` kèm dạng số nhiều, đừng tự đặt chuỗi mới chỉ trong file seed.
- **`description`**: một câu tiếng Anh, nói được nguồn gốc hoặc cách thu hoạch. Đây là chữ khách đọc ở trang chi tiết.
- **`stalls`**: sạp nào bán món này, lấy tên từ `frontend/src/data/catalog.ts`. Mỗi sản phẩm ít nhất 1 sạp; vài món phổ
  biến (water spinach, free-range eggs, bananas) nên có 2–3 sạp bán để demo được việc so giá giữa các sạp.

**3 · `frontend/public/product-images/<slug-category>/<slug-sản-phẩm>.webp`** — 56 ảnh, mỗi sản phẩm một ảnh riêng.

- **Tỉ lệ 4:3** đúng khung ảnh của `ProductCard` (`components/ProductCard.tsx:42`), cạnh dài 800px, `.webp`, **≤ 150KB**.
- Thêm 8 ảnh `_default.webp` trong mỗi thư mục loại, làm ảnh thay thế khi sản phẩm chưa có ảnh riêng.
- **Tải file về repo, tuyệt đối không hotlink** — trang About đang hotlink Unsplash và đó chính là một lỗi đang phải sửa (CV-06).
- Nguồn: ảnh CC0 (Pexels, Unsplash, Wikimedia) hoặc team tự chụp. Ghi nguồn từng ảnh vào `db/seed/IMAGE-CREDITS.md`
  theo đúng yêu cầu của design system.
- Ưu tiên ảnh nông sản Việt. Một quả bưởi da xanh không nên minh hoạ bằng ảnh bưởi chùm nhập khẩu.

**4 · Hai sạp mới trong `db/seed/farmers.json`** — hiện **không sạp demo nào bán thịt hay thủy sản**, mở hai loại đó mà
không có sạp thì trang danh mục trống trơn. Cần thêm tối thiểu:

- một trại gà/vịt thả vườn (gợi ý: Củ Chi hoặc Hóc Môn) → `meat_and_poultry`;
- một sạp cá đồng / tôm (gợi ý: Cần Giờ hoặc Nhà Bè) → `seafood`.

Và **đổi mặt hàng của sạp U Minh Forest Honey**: bỏ `honey_and_preserves` nên mật ong không còn danh mục. Chuyển sạp
này sang bán đậu phộng, hạt điều, mè đen (`grains_beans_and_nuts`) và đổi tên sạp cho khớp.

### Gợi ý mặt hàng cho từng loại (đủ 7 món, cứ chỉnh nếu có món hợp hơn)

Tên viết đúng như sẽ nằm trong `products.json`, tức tiếng Anh.

| slug | 7 món gợi ý |
|---|---|
| `vegetables` | Water spinach · Choy sum · Tomatoes · Cucumber · Pumpkin · Carrots · Thai basil |
| `fruits` | Green-skin pomelo · Cát mango · Longan · Bananas · Dragon fruit · Sành orange · Guava |
| `eggs_and_dairy` | Free-range eggs · Duck eggs · Quail eggs · Goat milk · Goat yogurt · Fresh goat cheese · Goat butter |
| `grains_beans_and_nuts` | ST25 rice · Brown rice · Mung beans · Black beans · Peanuts · Cashews · Black sesame |
| `meat_and_poultry` | Whole free-range chicken · Chicken legs · Duck · Pork belly · Pork ribs · Beef · Chả lụa |
| `seafood` | Tiger prawns · Snakehead fish · Red tilapia · Field crab · Squid · Clams · Basa fish |
| `mushrooms` | Straw mushrooms · Oyster mushrooms · Enoki mushrooms · Fresh shiitake · Dried wood ear · Reishi · King oyster |
| `baked_goods` | Sourdough loaf · Rye loaf · Bánh bò · Bánh chuối · Bánh da lợn · Bánh tét · Cinnamon rolls |

### Không được làm trong task này

Không viết migration, không viết seeder Java, không sửa `db/schema.sql` — toàn bộ phần đó thuộc backend core đang
triển khai song song. Chỉ giao file dữ liệu và ảnh.

**Xong khi:** `db/seed/categories.json` 8 dòng, `db/seed/products.json` 56 dòng hợp lệ (mọi `category` khớp một slug,
mọi `unit` có trong `units.ts`, mọi `image` trỏ tới file có thật), đủ 64 ảnh đúng tỉ lệ và dung lượng, và
`IMAGE-CREDITS.md` ghi nguồn đầy đủ.

---

## CV-11 · Đổi demo data sang 8 category và hiện ảnh sản phẩm (FR-020, FR-084)

**Phụ thuộc CV-10** — làm sau khi có ảnh.

**Vấn đề 1.** Demo data hiện dùng 8 category cũ bằng tiếng Anh (`Leafy greens`, `Fruit`, `Dairy`, `Baked goods`, `Eggs`,
`Honey & preserves`, `Mushrooms`, `Herbs`) ở `frontend/src/data/catalog.ts:10`, `docs/prototype/data.js:42` và màn
`/admin/categories`. Không đổi thì frontend nói một đằng, database seed một nẻo.

**Vấn đề 2.** **Cả app chưa hiện ảnh sản phẩm nào.** `ProductCard.tsx:42` chỉ là một ô 4:3 màu trơn, không có thẻ
`<img>`; dữ liệu demo cũng không có field ảnh.

**Cần làm.**

1. Thay danh sách category trong `catalog.ts` và `docs/prototype/data.js` bằng 8 loại mới, gán lại `cat` cho 26 sản phẩm
   demo: `Thai basil`, `Lemongrass`, `Elephant garlic` → `vegetables`; `Raw forest honey`, `Bee pollen` →
   `grains_beans_and_nuts` (theo quyết định đổi mặt hàng sạp U Minh ở CV-10); `Sourdough loaf`, `Rye loaf`,
   `Cinnamon rolls` → `baked_goods`.
2. Giữ nguyên cách hiển thị: tên danh mục là dữ liệu, in thẳng `name`, **không thêm key i18n** (danh sách mở, admin CRUD).
3. Thêm field `image` vào demo product, trỏ sang `/product-images/...` của CV-10.
4. `ProductCard` hiển thị ảnh: `<img>` phủ kín khung 4:3, `loading="lazy"`, `alt` là tên sản phẩm; ảnh lỗi hoặc thiếu
   thì rơi về `_default.webp` của loại đó, không để khung vỡ.
5. Làm tương tự cho ảnh lớn ở trang chi tiết sản phẩm.

**Xong khi:** `/products` lọc đủ 8 loại mới, mỗi thẻ sản phẩm có ảnh, tắt mạng giữa chừng thì vẫn ra ảnh mặc định chứ
không vỡ khung; xem ở 375px ảnh không tràn.

---

## Không làm lúc này — chờ backend core

Đừng bắt đầu mấy thứ này, sẽ đụng hoặc sẽ phải viết lại:

- Gọi API cho chợ, sản phẩm, đơn hàng, tồn kho, review, thông báo (FR-010…FR-052) — chưa có bảng lẫn endpoint.
- Màn "tồn kho đã đổi khi bạn đang chọn" (409) trong giỏ — phụ thuộc cách backend trừ tồn kho (D-02).
- Nối trang `/assistant` (chatbot) với `/api/v1/chat`: endpoint có thật nhưng phần tra cứu của nó truy vấn các bảng
  products/markets **chưa tồn tại** → sẽ lỗi runtime. Chờ backend core xong.
- Nút **"Withdraw the application"** ở `/become-farmer` (có trong prototype, chưa có trong React): thiếu endpoint và đang
  nằm trong cùng phần backend đang sửa (nộp lại đơn sau khi bị từ chối).
- Email thật cho xác nhận đơn (FR-043) — NICE, thuộc backend.

---

## Đã kiểm tra và **không** có vấn đề — đừng làm lại

Để khỏi mất công rà lại:

- **i18n**: 10 ngôn ngữ khớp key nhau hoàn toàn ở toàn bộ namespace Customer và public (chỉ vài namespace Admin lệch hậu tố số ít/số nhiều, đúng như thiết kế).
- **Bộ lọc và sắp xếp**: `/products` đủ ngày + danh mục + khoảng giá + chợ + còn hàng + sort + phân trang (FR-021);
  `/search` đủ 4 tab + sort + bản đồ kết quả (FR-023).
- **Bản đồ và chỉ đường**: `DirectionsButton` đã có ở MarketDetail, ProductDetail, StallProfile, OrderDetail (FR-012/013).
- **Trang pháp lý**: Terms và Privacy đủ 10 mục + mục lục neo, nội dung nằm trong file dịch.
- **Trang không tìm thấy**: market / product / stall sai id đều có màn riêng.
- **Responsive**: không tìm thấy chỗ nào đặt chiều rộng cứng gây tràn ngang ở 375px; bảng duy nhất đã bọc `overflow-x`.
- **OrderTicket** đã có đủ huỷ đơn, đánh giá, đặt lại.

---

## Trước khi mở PR

1. `npm run lint` và `npx tsc -b` xanh (chạy thẳng trên máy, đừng qua Docker cho nhanh).
2. Xem ở 375 / 768 / 1440 px, không tràn ngang (FR-080).
3. Bật thử dark theme (Settings → Theme) — chỉ dùng token màu thì tự đúng.
4. Chữ mới phải có đủ 10 ngôn ngữ; không hard-code tiếng Anh trong TSX.
5. Commit có FR id: `feat(FR-084): empty state for the orders list`.
6. Tự kiểm 7 điều kiện Definition of Done trong `CLAUDE.md`, rồi báo QA/DOC tick — **không tự tick DONE** trong `.ai/REQUIREMENTS.md`.
