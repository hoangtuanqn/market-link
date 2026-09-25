# DECISIONS — 12 quyết định chốt trước khi code

Chủ sở hữu: LEAD. Duyệt trong workshop mổ đề H1–H2.5, rồi **đóng lại, không bàn lại**.
Mỗi dòng đã có đề xuất sẵn — việc của workshop là gật hoặc sửa, không phải nghĩ từ đầu.
Sau khi duyệt, copy nguyên mục này vào `ReadMe.doc` phần Assumptions (đề yêu cầu).

---

### D-01 · Một đơn hàng thuộc về đúng một Farmer ⭐ quan trọng nhất
Đề cho "add products to a cart" nhưng pickup lại diễn ra tại stall riêng của từng Farmer,
với cutoff time và pickup window riêng của từng Farmer.

**Chốt:** giỏ hàng cho phép gom sản phẩm của nhiều Farmer, nhưng khi bấm đặt thì **tách
thành nhiều đơn độc lập**, mỗi đơn một Farmer, một market, một pickup slot, một cutoff.
Bảng `orders` có `farmer_id` và `market_id`.
Màn xác nhận hiện rõ: "Giỏ của bạn sẽ được tách thành 2 đơn tại 2 stall khác nhau."

---

### D-02 · Trừ tồn kho ngay khi khách đặt (`placed`), không đợi Farmer duyệt
Nếu đợi `accepted` mới trừ thì hai khách đặt cùng lô hàng sẽ over-book.

**Chốt:** trừ `products.stock_quantity` ngay tại thời điểm tạo đơn, trong cùng một
transaction. Hoàn lại tồn kho khi đơn chuyển sang `declined` hoặc `cancelled`.
Không cho đặt quá tồn kho hiện có — kiểm tra ở cả client và server.

---

### D-03 · Ai bấm `completed`, và cơ chế tự động
Review chỉ mở khoá sau khi đơn `completed`. Nếu không có đường tới trạng thái đó thì
cả khối review (4 requirement) không demo được.

**Chốt:** Farmer bấm "Đã giao" khi khách tới lấy. Thêm job tự động chuyển các đơn
`ready` sang `completed` sau `pickup_date + 24h`. Seed data phải có sẵn đơn `completed`
để review demo được ngay.

---

### D-04 · Vòng đời đơn hàng — 6 trạng thái
```
placed ──accept──> accepted ──ready──> ready ──> completed
   │                   │                 │
   └──decline──> declined                └──(auto sau 24h)──> completed
   │
   └──cancel (khách, trước cutoff)──> cancelled
```
`accepted` cũng có thể bị khách cancel trước cutoff. Sau cutoff thì khoá, chỉ Farmer
mới đổi được trạng thái. Mọi lần đổi ghi vào `order_status_history`.

---

### D-05 · Cutoff time
**Chốt:** `orders.cutoff_at = pickup_datetime − farmer.order_cutoff_hours`.
Mặc định `order_cutoff_hours = 12`, Farmer chỉnh được trong hồ sơ.
Trước `cutoff_at`: khách sửa hoặc huỷ được. Sau đó: nút bị khoá, hiện lý do.

---

### D-06 · Slot pickup có giới hạn
**Chốt:** `pickup_slots.max_orders` mặc định 5, `booked_count` tăng khi đặt.
Slot đầy thì hiện xám, không chọn được. Farmer chỉnh `max_orders` được.

---

### D-07 · Sửa đơn phải được duyệt lại
**Chốt:** khách sửa số lượng hoặc bỏ item trước cutoff → đơn quay về `placed`,
Farmer phải accept lại. Không cho **thêm** sản phẩm mới vào đơn cũ (thêm thì đặt đơn
mới) — giữ logic đơn giản và tránh vỡ ràng buộc tồn kho.

---

### D-08 · "Sharing of accounts among family members"
Đề viết đúng một dòng, đánh dấu optional, không mô tả gì thêm.

**Chốt:** **không làm multi-profile.** Diễn giải: một tài khoản có thể được dùng chung
trong gia đình, hệ thống không phân biệt người dùng bên trong một tài khoản.
Ghi vào Assumptions. Đây là NICE, không làm trong 120 giờ.

---

### D-09 · Farmer bị đình chỉ
**Chốt:** `farmer_profiles.approval_status = 'suspended'` → toàn bộ sản phẩm ẩn khỏi
trang public, không nhận đơn mới. **Đơn đang chạy vẫn cho chạy hết** để khách không mất
hàng đã đặt. Farmer vẫn đăng nhập được nhưng chỉ thấy đơn cũ.

---

### D-10 · Review dùng một bảng, hai loại đối tượng
Đề yêu cầu review cả Farmer lẫn sản phẩm; schema gợi ý của đề chỉ có `product_id`.

**Chốt:** một bảng `reviews` với `target_type ENUM('product','farmer')` và hai cột FK
nullable. Chỉ tạo được review khi có `order_id` ở trạng thái `completed` và đơn đó
thuộc về chính khách hàng. Farmer trả lời qua bảng `review_responses` (1-1).

---

### D-11 · Notification làm in-app trước
Đề cho phép "e-mail **or** in-app alerts" — chữ "or" nên in-app là hợp lệ.

**Chốt:** bảng `notifications` + badge chuông + trang danh sách. Bắn ở 4 mốc:
đơn được accept, đơn bị decline, đơn sẵn sàng lấy, sản phẩm yêu thích có hàng lại.
Gửi email thật là **NICE**, chỉ làm nếu dư giờ sau H84.

---

### D-12 · Bản đồ dùng Leaflet + OpenStreetMap
**Chốt:** không dùng Google Maps. Lý do: không cần tài khoản billing, không hết hạn mức
giữa lúc demo, và không phải nhét API key vào source code nộp cho giám khảo.
Chỉ đường: mở OSM directions ở tab mới, không tự vẽ route engine.
Cột `markets.map_provider` vẫn giữ theo schema đề gợi ý, mặc định `'osm'`.

---

### D-13 · Admin xem được trang public, nhưng không mua bằng tài khoản admin
Farmer gộp vào Customer được vì đó là **cùng một người, cùng một nhu cầu**: người bán rau cũng đi chợ
mua thịt. Admin thì khác về bản chất — đó là **một công việc trên nền tảng**, không phải một kiểu người mua.

**Chốt:**
- Admin **xem** được mọi trang public. Bắt buộc phải thế: kiểm duyệt một sản phẩm nghĩa là nhìn nó đúng
  như khách nhìn (FR-074), và `admin/moderation.html` đã dẫn sang `public/product.html`.
- Admin **không mua** bằng tài khoản admin: không giỏ hàng, không đơn, không review, không yêu thích.
- Admin muốn mua thật thì dùng **một tài khoản customer riêng**. Tài khoản khác, không phải chế độ khác.
- Trên trang public, admin thấy **điều hướng của trang public** cộng một thanh *Admin view* dẫn về panel
  và vào thẳng kiểm duyệt. Menu dashboard thuộc về panel, không thuộc mặt tiền cửa hàng.

**Lý do không cho mua chung tài khoản:**
1. *Xung đột lợi ích.* Admin duyệt gian hàng, đình chỉ Farmer, ẩn review và đặt giá nền tảng. Cùng tài
   khoản đó mà đặt hàng và viết review được thì họ review được gian hàng mà chính họ có quyền đình chỉ.
2. *Truy vết.* FR-038 ghi lịch sử trạng thái đơn. Trộn hành động quản trị với hành động mua hàng trên
   một tài khoản thì nhật ký không trả lời được "ai làm, với tư cách gì".
3. *Bán kính thiệt hại.* Phiên admin là phiên quyền cao nhất nền tảng; mang nó đi dạo trang public mở
   rộng vùng phơi nhiễm mà không đổi lại lợi ích gì.

**Ẩn nút không phải là biện pháp kiểm soát.** `POST /orders`, `/cart`, `/reviews`, `/favorites` phải trả
**403** với JWT vai admin — Definition of Done điều 3: *"Kiểm tra quyền (role + ownership) ở server,
không chỉ ẩn nút ở FE"*. Trong prototype mọi điều khiển mua đều mang `data-buy` hoặc `data-fav`, nên
grep ra được đúng tập hành động server phải từ chối.

**Còn mở, LEAD chốt nốt:** Farmer có được bỏ sản phẩm **của chính mình** vào giỏ không? Đây là phiên bản
nhỏ của cùng một xung đột. Hiện tại là được.

---

### Đơn vị và locale
Tiền tệ **VND**, hiển thị `₫` phân cách hàng nghìn. Ngày `dd/MM/yyyy`, giờ 24h.
Timezone `Asia/Ho_Chi_Minh`. Lưu DATETIME theo giờ local, ghi rõ trong ReadMe.
