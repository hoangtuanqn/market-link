# Xoá Market (FR-073) — những chỗ còn thiếu

> Ghi chú kiểm tra ngày **29/09/2026**, đọc code trên `dev` tại `4587683b`. Đây là **ghi chú tồn đọng**,
> không phải quyết định sản phẩm và cũng chưa sửa gì. Mục tiêu: lần sau quay lại cải thiện thì có sẵn
> bằng chứng và phương án, không phải dò lại từ đầu.
>
> Bối cảnh: câu confirm trên UI admin (`frontend/src/locales/en/AdminMarkets.json` → `remove.text_one`)
> hứa với admin 3 điều — *"{{count}} stall sells here. The market disappears from customer pages and the
> stall is told. Orders already placed for it continue."* Backend làm đúng 2, thiếu 1, và hở 1 lỗ.

## Backend hiện làm gì

`DELETE /api/v1/admin/markets/{id}` → `AdminMarketController.deactivate` →
`MarketService.deactivate` (`backend/.../catalog/services/impl/MarketService.java:124`): tìm market,
`setActive(false)`, `save`. Hết. Không notify, không email, không đụng `farmer_markets`,
không đụng `market_operating_days`, không đụng `pickup_slots`.

Soft delete là **đúng thiết kế**, không nên đổi:

- `docs/api-contract.md:218` ghi rõ "xoá mềm bằng `isActive = false`".
- FK trong DB chặn hard delete sẵn: `orders.market_id` và `market_closures.market_id` là `NO ACTION`;
  `farmer_markets`, `favorites`, `market_images`, `market_operating_days` là `CASCADE` — xoá cứng là
  mất luôn liên kết sạp và lịch sử.

## Đối chiếu với câu confirm trên UI

| Câu hứa | Thực tế | Bằng chứng |
|---|---|---|
| "The market disappears from customer pages" | ✅ Đủ | `m.is_active = TRUE` có ở: `MarketQueryRepository.java:47` (cả `search` và `findById`, nên chi tiết trả 404), `StallQueryRepository.java:66,80,94`, `ProductQueryRepository.java:51`, `SlotQueryRepository.java:34`, `CheckoutQueryRepository.java:27`, chatbot (`ChatKnowledgeRepository`), report (`AdminReportRepository.java:30`). Favorites giữ dòng cũ nhưng gắn cờ `available = m.is_active` (`FavoriteQueryRepository`) |
| "Orders already placed for it continue" | ✅ Đủ | `OrderQueryRepository.java:50,81,114` join `markets` **không** lọc `is_active` → đơn cũ vẫn đọc được tên chợ; không guard nào chặn accept / ready / complete |
| "the stall is told" | ❌ **Chưa có gì** | Không có `NotificationKind` nào cho market (`modules/notification/enums/NotificationKind.java`), không có job (`RedisJobWorker` chỉ có `signup.*`, `customer.notify-*`, `farmer.notify-*`, `password-reset.*`), `MarketService` thậm chí không inject notification service |

## Danh sách việc còn thiếu

### 1. 🔴 Đặt đơn mới cho market đã xoá vẫn thành công qua API

`OrderService.bookableSlot` (`backend/.../order/services/impl/OrderService.java:422-439`) kiểm tra:
slot tồn tại + `is_active`, đúng `pickup_date`, `farmer_markets.is_active`, đúng stall + đúng market,
và `PickupSlotRepository.OPEN_DAYS` (`PickupSlotRepository.java:23-31`) kiểm tra `market_operating_days`
+ `farmer_operating_days`. **Không chỗ nào đọc `markets.is_active`.**

Mà `deactivate()` không tắt `farmer_markets`, không xoá `market_operating_days`, không tắt slot — nên
mọi điều kiện trên vẫn đúng sau khi xoá chợ.

Hệ quả: UI không cho chọn chợ đó (checkout đã lọc), nhưng gọi thẳng `POST /api/v1/orders` với
`marketId` cũ + `slotId` còn sống thì **qua được** → tạo đơn mới ở chợ đã xoá, trừ tồn kho, chiếm chỗ slot.
Đúng hình "ẩn nút ở FE nhưng server vẫn mở" mà Definition of Done điều 3 cấm — cùng dạng với 2 lỗi mà
review FR-071 bắt được (`StallService.updateProfile` / `leaveMarket` / `SlotService.updateSlot`).

**Hướng sửa đề xuất:** thêm điều kiện market còn `is_active` vào đường đặt đơn. Rẻ nhất là nối thêm vào
`PickupSlotRepository.OPEN_DAYS` hoặc `countOnOpenDay` một `JOIN markets m ON m.id = fm.market_id AND
m.is_active = TRUE` — nhưng lưu ý `OPEN_DAYS` được `SlotQueryRepository` dán lại dùng chung, nên đổi ở
đó ảnh hưởng cả màn xem slot (thực ra `SlotQueryRepository.java:34` đã lọc `is_active` rồi, không hại).
Sạch hơn về mặt lỗi trả về: check riêng trong `bookableSlot` và ném lỗi 409 có mã riêng
(`MARKET_UNAVAILABLE`) thay vì gộp vào `SLOT_UNAVAILABLE`, để FE nói đúng lý do. Kèm test: đặt đơn ở
market đã `is_active = false` → 409.

### 2. 🟠 Không ai báo cho Farmer

Sạp đang bán ở chợ bị xoá chỉ thấy chợ **lặng lẽ biến mất** khỏi trang Stall & pickup
(`StallQueryRepository.STALL_MARKETS` lọc `m.is_active = TRUE`) và slot của chợ đó biến mất khỏi màn slot.
Không thông báo, không email, không dòng nào giải thích.

Hai hướng, phải chọn một:

- **(a) Sửa copy FE cho đúng sự thật** — rẻ, không thêm scope. Bỏ vế "and the stall is told" trong
  `remove.text_one` / `remove.text_other` của cả 10 locale.
- **(b) Làm thật** — thêm `NotificationKind.MARKET_REMOVED` (+ email nếu muốn), theo đúng khuôn
  `farmer.notify-suspended` của FR-071: enqueue trong `TransactionHelper.afterCommit`, template ở
  `backend/src/main/resources/mail/`, thêm key vào cả 10 `mail_<lang>.properties`.
  **Đây là scope mới:** `.ai/REQUIREMENTS.md` FR-073 chỉ ghi "CRUD chợ", contract cũng chỉ ghi soft delete
  → theo R-07 phải bổ sung dòng requirement trước (LEAD, R-02), rồi mới code.

### 3. 🟠 Giỏ hàng chết lặng khi stall mất hết chợ

`ProductQueryRepository.VISIBILITY_FILTER` không đòi sản phẩm phải thuộc chợ nào, nên sản phẩm của stall
vừa mất chợ duy nhất vẫn hiện và vẫn thêm vào giỏ được. Nhưng `CheckoutQueryRepository.STALL_MARKETS`
lọc `is_active` → không còn chợ nào để chọn điểm nhận, và `OrderService.previewGroup`
(`OrderService.java:169-209`) **không có mã `problem` nào** cho tình huống này (chỉ có `STALL_SUSPENDED`,
`UNAVAILABLE`, `SOLD_OUT`, `OUT_OF_STOCK`). Khách thấy sạp nằm trong giỏ, không chọn được gì, không hiểu vì sao.

Lưu ý: lỗi này **có sẵn từ trước**, không phải do xoá market — stall tự rời hết chợ cũng ra kết quả này.

**Hướng sửa:** thêm một mã problem kiểu `NO_PICKUP_MARKET` khi `markets.isEmpty()` và cho FE hiển thị câu
giải thích + gợi ý bỏ sạp đó khỏi giỏ.

### 4. 🟡 Xoá lần thứ hai vẫn trả 200

`MarketService.deactivate` dùng `repository.findById` (JPA, không lọc `is_active`), nên xoá một market đã
xoá rồi vẫn trả `200 "Market removed."`. Tab cũ hoặc double-click đều "thành công". Nên trả 404
`MARKET_NOT_FOUND` (hoặc 409) cho market đã `is_active = false`.

### 5. 🟡 Admin không xem lại được market đã xoá, không có nút khôi phục

Không có `GET /api/v1/admin/markets`; trang admin đọc endpoint công khai `/markets`
(`frontend/src/api-requests/catalog.requests.ts:168`) vốn đã lọc `is_active`. Nên market đã xoá là
**vô hình với cả admin**.

Đường quay lại duy nhất hiện nay: tạo market mới **trùng y nguyên tên** — `MarketService.create`
(`MarketService.java:82-90`) cố ý hồi sinh bản ghi cũ thay vì báo trùng tên (ghi chú trong code dẫn
QA E2E v2 MARKET-ADMIN-002). Khi hồi sinh thì toàn bộ `farmer_markets` + slot + operating days cũ sống
lại nguyên vẹn vì chưa bao giờ bị tắt — tiện, nhưng admin phải gõ lại địa chỉ / giờ / ảnh và những giá trị
đó **ghi đè** bản cũ.

Cùng hình dạng với bug Categories đã sửa ở PR #198 (trang admin đọc endpoint công khai active-only),
nhưng ở đây là cố ý. Muốn tử tế hơn thì cần `GET /admin/markets?includeRemoved=true` + nút Restore —
**đây là scope mới, cần LEAD/chủ dự án quyết** (R-02 cho contract, R-07 cho requirement).

### 6. 🟡 Test còn mỏng

`MarketServiceTest.deactivateFlipsIsActiveInsteadOfDeleting` chỉ assert cờ `is_active` bị lật. Không test
nào chặn đơn mới ở chợ đã xoá, không test nào về thông báo cho sạp, không test nào cho xoá hai lần.

## Thứ tự đề xuất khi quay lại

1. Mục **1** (lỗ server) — bắt buộc, có test, nằm trọn trong FR-073, không cần ai duyệt scope.
2. Mục **4** + **6** — đi kèm mục 1, rẻ.
3. Mục **3** — sửa trải nghiệm giỏ hàng, độc lập với chuyện xoá market.
4. Mục **2** — chọn (a) sửa copy (rẻ, làm ngay được) hay (b) làm notification thật (phải thêm dòng
   requirement trước).
5. Mục **5** — để LEAD quyết, là tính năng mới chứ không phải bug.

## Cách kiểm chứng nhanh mục 1 (khi bắt tay vào sửa)

Viết test RED trước (đúng khuôn TDD của repo): đặt đơn qua `OrderService.place` với một market đã
`is_active = false` nhưng `farmer_markets`, slot và operating days đều còn — hiện tại sẽ **pass** (tức là
tạo được đơn), đó chính là lỗi. Sau khi sửa phải thành 409.
