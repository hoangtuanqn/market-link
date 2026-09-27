# Hạn dùng gợi ý, báo hàng hư và giảm giá hàng sắp hết hạn — thiết kế

- Ngày: 27/09/2026 · Người duyệt: LEAD · Trạng thái: bản nháp, chờ LEAD duyệt
- FR: chưa có trong `.ai/REQUIREMENTS.md`. Đề xuất FR-120…FR-125, nhãn NICE (§11). Đề không yêu cầu (R-07), nên
  LEAD quyết có làm hay không.
- Dựa trên: FR-062 (CRUD sản phẩm), FR-063 (tồn kho theo ngày), FR-031/032 (đặt trước, trừ kho, chọn ngày nhận),
  FR-050/051 (review sau khi đơn hoàn tất, D-10), FR-071 (đình chỉ sạp, D-09), FR-074 (kiểm duyệt), FR-076 (danh mục),
  D-13 (tiền USD).
- Nguồn yêu cầu: tin nhắn của LEAD ngày 27/09/2026, tóm tắt ở §1.

## 1. Mục tiêu

Yêu cầu của LEAD, tách thành 5 ý:

1. Khi Farmer đăng sản phẩm, app gợi ý **thời hạn dùng** theo nhóm sản phẩm và cách bảo quản (nhiệt độ thường hoặc
   bảo quản lạnh).
2. Farmer chọn theo gợi ý hoặc chỉnh lên, chỉnh xuống. Chỉnh **lên** thì có cảnh báo, để hàng tới tay khách vẫn còn
   dùng được.
3. Khách báo hàng bị hư, mà món đó thuộc diện Farmer đã kéo dài hạn, thì admin nhận thông báo để phạt Farmer đó.
4. Hàng sắp hết hạn thì Farmer có công cụ giảm giá, app gợi ý mức giảm phù hợp và Farmer tự chỉnh được.
5. Có mục "hàng giảm giá" cho khách xem.

Làm được khi:

- Farmer đăng sản phẩm không phải tự đoán số ngày, và con số khách thấy là con số sạp đã cam kết.
- Mỗi lần kéo dài hạn đều có dấu vết: sạp nào, lúc nào, dài hơn gợi ý bao nhiêu ngày. Khi có báo hư, admin xử lý dựa
  trên dữ liệu đó chứ không dựa trên lời kể.
- Hàng sắp hết hạn được bán rẻ thay vì bỏ đi, và khách biết rõ còn dùng được tới ngày nào.

Giả định tôi đặt ra, LEAD sửa ở §11 nếu không đúng:

- "Thời hạn" là số ngày hàng còn dùng tốt **kể từ ngày khách nhận**, không phải thời hạn đăng bán.
- "Phạt" là ghi lỗi cho sạp, kèm hậu quả trong app. App không thu tiền, vì không có thanh toán online.
- Chỉ có 2 cách bảo quản như LEAD nói: nhiệt độ thường và ngăn mát. Ngăn đông để sau.

## 2. Hiện trạng trong code

| Đã có | Ở đâu | Dùng lại thế nào |
|---|---|---|
| Khoảng ngày tươi theo danh mục (`min/max_shelf_life_days`) | V20260926015, form Admin Categories | Giữ nguyên, làm phương án dự phòng khi danh mục chưa có nhóm |
| `products.shelf_life_days`; form Farmer cảnh báo mềm khi ra ngoài khoảng, nhưng không lưu lại việc đó | V20260926016, `pages/farmer/ProductForm` | Thay bằng cơ chế ở §4.2 |
| Tồn kho và **giá riêng cho từng ngày nhận** (`product_daily_stock.unit_price`); đặt đơn lấy giá của ngày đó | V20260926018, `OrderService.place` | Giảm giá là đổi giá của một ngày (§4.5) |
| Xem trước giỏ không biết ngày nhận (`PreviewRequest` chỉ có danh sách món) | `order/requests/PreviewRequest.java` | Thêm ngày nhận, tuỳ chọn (§4.5.5) |
| Review chỉ sau khi đơn `completed` (D-10) | V20260926020 | Báo hư là luồng riêng, cùng điều kiện đơn đã hoàn tất |
| Hàng đợi báo cáo tin nhắn cho admin (`message_reports`, tab trong Moderation) | V20260926005, `pages/admin/Moderation` | Cùng kiểu bảng và thêm tab "Báo hàng hư" |
| Gửi thông báo cho mọi admin (`NotificationService.notifyAdmins`) | `FarmerService.apply` | Báo admin khi có báo hư hàng kéo dài hạn |
| Đình chỉ sạp với lý do chọn sẵn (#191) | `FarmerService.suspend`, `lib/reasons.ts` | Thêm lý do "Vi phạm hạn dùng" |
| Tải ảnh lên (sản phẩm, chat, avatar) | `ProductImageUploadService`, `AttachmentService` | Ảnh minh chứng báo hư lưu cùng cách |

## 3. Ba cách làm

**A. Nhóm bảo quản, giảm giá theo ngày nhận (khuyến nghị).** Admin quản các "nhóm bảo quản" trong từng danh mục, ví
dụ *Rau ăn lá* trong *Vegetables*. Mỗi nhóm có số ngày gợi ý cho từng cách bảo quản. Sản phẩm lưu nhóm, cách bảo quản
và cờ "kéo dài". Giảm giá gắn vào dòng tồn kho của một ngày nhận, vốn đã có giá riêng.

- Được: chính xác hơn danh mục, vì rau muống (1–3 ngày) và khoai lang (2–3 tuần) cùng là *Vegetables*. Dùng lại giá
  theo ngày nên logic đặt đơn gần như giữ nguyên.
- Mất: thêm một bảng master data cho admin. Mỗi ngày nhận chỉ có một mức giá cho một sản phẩm.

**B. Chỉ theo danh mục.** Thêm số ngày gợi ý "thường" và "lạnh" vào `categories`, không có nhóm.

- Được: ít việc nhất.
- Mất: gợi ý sai nhiều, Farmer phải kéo dài thường xuyên, và cảnh báo mất ý nghĩa.

**C. Theo lô hàng.** Bảng `product_lots` (ngày thu hoạch, số lượng, hạn), dòng đơn trỏ tới lô.

- Được: một ngày bán được cả hàng mới lẫn hàng cũ, với hai giá.
- Mất: phải đổi cách khoá và trừ kho khi đặt đơn, phần đang ổn định và có test đồng thời. Khối lượng gấp 2–3 lần.

Chọn **A**. Giới hạn "một giá mỗi sản phẩm mỗi ngày" ghi ở §12.

## 4. Thiết kế

### 4.1 Nhóm bảo quản (Admin, FR-120)

Bảng mới `shelf_life_guides`. Mỗi dòng là một nhóm, trong một danh mục, với một cách bảo quản:

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | BIGINT UNSIGNED PK | |
| category_id | FK `categories` | |
| group_name | VARCHAR(80) | "Rau ăn lá" |
| examples | VARCHAR(255) | "rau muống, cải ngọt, xà lách…": hiện cho Farmer, và dùng để tự chọn nhóm theo tên sản phẩm |
| storage_mode | ENUM('room','chilled') | |
| suggested_days | INT, CHECK ≥ 1 | Mốc gợi ý |
| is_active | BOOLEAN | Xoá mềm, như `categories` |

Khoá UNIQUE (category_id, group_name, storage_mode). Nhóm không có dòng `room` nghĩa là **không được bán ở nhiệt độ
thường**, ví dụ thịt tươi.

Dữ liệu mặc định do migration nạp, admin sửa được. Số ngày tính từ ngày khách nhận, theo khuyến nghị bảo quản phổ biến
trong gia đình, không phải quy chuẩn pháp lý:

| Danh mục (slug) | Nhóm | Ví dụ | Thường | Ngăn mát |
|---|---|---|---|---|
| vegetables | Rau ăn lá | rau muống, cải ngọt, cải xanh, xà lách, rau dền, mồng tơi, rau thơm | 1 | 3 |
| vegetables | Rau ăn quả | cà chua, dưa leo, bí, mướp, ớt, đậu que | 3 | 7 |
| vegetables | Củ | khoai lang, khoai tây, cà rốt, củ cải, hành, tỏi, gừng | 14 | 21 |
| fruits | Trái chín nhanh | chuối, xoài chín, đu đủ, dâu, nhãn, vải, chôm chôm | 2 | 5 |
| fruits | Trái vỏ dày | bưởi, cam, quýt, dưa hấu, thơm | 7 | 14 |
| eggs_and_dairy | Trứng | trứng gà, trứng vịt, trứng cút | 10 | 21 |
| eggs_and_dairy | Sữa tươi, sữa chua | sữa tươi, sữa chua, phô mai tươi | — | 5 |
| grains_beans_and_nuts | Hạt khô | gạo, đậu, đậu phộng, mè | 90 | 180 |
| meat_and_poultry | Thịt tươi | thịt heo, bò, gà, vịt | — | 2 |
| seafood | Hải sản tươi | cá, tôm, mực, nghêu | — | 1 |
| mushrooms | Nấm tươi | nấm rơm, nấm bào ngư, nấm đông cô | 1 | 5 |
| baked_goods | Bánh tươi | bánh mì, bánh bao, bánh ngọt | 2 | 4 |

Danh mục chưa có nhóm nào, ví dụ danh mục admin vừa tạo: form Farmer dùng khoảng `min/max` của danh mục như hiện nay.
Khi đó mốc gợi ý = `max_shelf_life_days`, cách bảo quản mặc định là "thường".

Admin: trang Categories thêm mục "Nhóm bảo quản" dưới mỗi danh mục, dạng bảng gồm nhóm, ví dụ, số ngày thường, số
ngày ngăn mát và nút bật/tắt. Chỉ admin sửa được (FR-076).

API:

- `GET /api/v1/shelf-life-guides?categoryId=` (Farmer, Admin) trả các nhóm đang bật, gom theo tên nhóm:
  `[{ groupName, examples, modes: [{ guideId, storageMode, suggestedDays, peerMedianDays, peerCount }] }]`.
- `POST/PUT/DELETE /api/v1/admin/shelf-life-guides/{id}?` (Admin).

`peerMedianDays` là trung vị `shelf_life_days` của các sản phẩm đang bán cùng nhóm và cùng cách bảo quản, chỉ tính
sạp **khác** sạp đang hỏi. Chỉ trả về khi có ít nhất 3 sản phẩm, để không lộ con số của một sạp cụ thể. Đây là phần
"tham khảo các sản phẩm" trong yêu cầu.

### 4.2 Farmer khai hạn dùng (FR-121)

Form sản phẩm có phần "Bảo quản & hạn dùng", ngay dưới Danh mục:

```
Danh mục        [Vegetables ▾]
Nhóm            [Rau ăn lá ▾]   ← tự chọn khi tên có "rau muống"; ví dụ: rau muống, cải ngọt, xà lách…
Cách bảo quản   (•) Ngăn mát 0–5 °C · gợi ý 3 ngày     ( ) Nhiệt độ thường · gợi ý 1 ngày
Hạn dùng        [ − ]  3 ngày  [ + ]      Các sạp khác thường đặt 3 ngày
```

Quy tắc. Server tự tính lại, không tin con số client gửi:

- Nhóm được chọn sẵn khi tên sản phẩm chứa một ví dụ của nhóm, so khớp không dấu và không phân biệt hoa thường
  (dùng `foldText` có sẵn trong `lib/format.ts`). Không khớp thì chọn nhóm đầu tiên của danh mục. Farmer đổi được.
- Chọn cách bảo quản thì hạn dùng nhảy về mốc gợi ý của cách đó.
- **Ngắn hơn gợi ý:** cho lưu, không cảnh báo. Có ghi chú nhỏ "Khách sẽ thấy đúng số ngày này".
- **Dài hơn gợi ý:** hiện cảnh báo kèm một ô bắt buộc tick:

  ```
  ⚠ Dài hơn gợi ý 2 ngày (gợi ý 3 ngày khi bảo quản ngăn mát)
  [ ] Tôi cam kết hàng tới tay khách vẫn dùng tốt đủ 5 ngày khi bảo quản ngăn mát.
      Nếu khách báo hư trước hạn, admin có thể ghi lỗi cho sạp.
  ```

  Chưa tick thì nút Lưu bị khoá, có dòng lý do bên cạnh.
- **Trần:** tối đa gấp đôi mốc gợi ý (1 ngày thì tối đa 2, 3 ngày thì tối đa 6). Vượt trần thì ô báo lỗi "Tối đa 6
  ngày cho nhóm này".
- **Sạp đang bị khoá kéo dài** (§4.4.4): nút + dừng ở mốc gợi ý, kèm dòng lý do "Sạp đang bị khoá kéo dài hạn dùng
  tới 15/11 vì có 3 lỗi hạn dùng trong 90 ngày."

Lời hứa đi kèm cách bảo quản. Trang sản phẩm ghi rõ cách bảo quản, để khách biết cần giữ hàng thế nào. Admin cân nhắc
điều này khi xử lý báo hư.

Cột mới của `products`:

| Cột | Kiểu | Ghi chú |
|---|---|---|
| shelf_life_guide_id | FK `shelf_life_guides`, NULL | NULL = dùng khoảng của danh mục |
| storage_mode | ENUM('room','chilled') NOT NULL DEFAULT 'room' | |
| suggested_shelf_life_days | INT NULL | Mốc gợi ý **tại lúc lưu** |
| shelf_life_extended | BOOLEAN NOT NULL DEFAULT FALSE | `shelf_life_days > suggested_shelf_life_days` |
| shelf_life_ack_at | DATETIME NULL | Lúc Farmer tick cam kết |

Mốc gợi ý được chụp lại lúc lưu cho công bằng: nếu sau đó admin hạ mốc của nhóm, sản phẩm cũ không bỗng dưng thành
"kéo dài".

`ProductRequest` thêm `shelfLifeGuideId` (có thể null), `storageMode` và `acknowledgeLongerShelfLife` (boolean). Lỗi
server trả về:

- 400 `VALIDATION_ERROR`:
  - field `shelfLifeDays`: vượt trần.
  - field `acknowledgeLongerShelfLife`: dài hơn gợi ý mà chưa xác nhận.
  - field `storageMode`: nhóm không cho cách bảo quản này.
  - field `shelfLifeGuideId`: nhóm không thuộc danh mục đã chọn.
- 409 `SHELF_LIFE_EXTENSION_LOCKED`: sạp đang bị khoá mà vẫn gửi số dài hơn gợi ý.

Khách thấy ở trang chi tiết sản phẩm, ở dòng "Hạn dùng" đang có:

- "Bảo quản ngăn mát 0–5 °C · dùng tốt 3 ngày kể từ ngày nhận".
- Nếu sạp kéo dài, thêm "Sạp cam kết 5 ngày (thường gặp 3 ngày)". Khách biết đây là cam kết riêng của sạp, và biết
  căn cứ khi báo hư.

### 4.3 Hạn dùng trên đơn

Lúc đặt đơn, mỗi dòng `order_items` chụp lại lời hứa. Cột mới:

| Cột | Ghi chú |
|---|---|
| shelf_life_days INT NULL | Hạn dùng tại lúc đặt |
| storage_mode ENUM('room','chilled') NULL | |
| best_before DATE NULL | Ngày cuối còn dùng tốt |
| shelf_life_extended BOOLEAN NOT NULL DEFAULT FALSE | |
| extended_by_days INT NOT NULL DEFAULT 0 | Dài hơn gợi ý bao nhiêu ngày |
| list_price DECIMAL(10,2) NULL | Giá trước khi giảm; NULL = không giảm (§4.5) |

`best_before = pickup_date + shelf_life_days − 1`, nghĩa là hạn 1 ngày thì dùng trong ngày nhận. Nếu ngày nhận đó
đang giảm giá thì lấy hạn của lô giảm giá (§4.5.1). Đơn cũ từ trước migration để NULL, và màn hình ẩn dòng hạn khi
NULL.

Vé đơn và trang chi tiết đơn, của cả khách lẫn sạp, thêm một dòng nhỏ dưới mỗi món: "Dùng tốt đến hết CN 05/10 ·
ngăn mát".

### 4.4 Báo hàng hư và phạt (FR-122, FR-123)

#### 4.4.1 Khách báo

Trên trang chi tiết đơn của khách, mỗi món có nút **"Báo hàng hư"** khi đủ cả bốn điều kiện:

- đơn ở trạng thái `completed`;
- món có `best_before` (đơn đặt sau migration);
- hôm nay chưa quá `best_before + 2 ngày`, tức khách có 2 ngày để báo sau khi hết hạn;
- món đó chưa được báo, vì mỗi món chỉ báo một lần.

Form dạng dialog:

```
Hàng hư ngày  [05/10 ▾]     ← từ ngày nhận tới hôm nay
Bị làm sao    [Úng/dập] [Mốc] [Có mùi] [Héo/khô] [Khác]
Mô tả         [____________________]   tối đa 500 ký tự
Ảnh           [Thêm ảnh]   JPG, PNG, WebP ≤ 5 MB, không bắt buộc
                                         [Huỷ] [Gửi báo cáo]
```

Bảng mới `quality_reports`:

| Cột | Ghi chú |
|---|---|
| id, order_item_id UNIQUE, order_id, customer_id, farmer_id, product_id | |
| spoiled_on DATE | Ngày khách thấy hàng hư |
| problem ENUM('bruised','mold','smell','wilted','other') | |
| note VARCHAR(500) NULL, photo_url VARCHAR(255) NULL | |
| before_promise BOOLEAN | `spoiled_on ≤ best_before`, tính lúc tạo |
| shelf_life_extended BOOLEAN, extended_by_days INT | Chép từ `order_items` |
| status ENUM('open','confirmed','dismissed') | |
| farmer_response VARCHAR(500) NULL, farmer_responded_at DATETIME NULL | |
| decided_by, decided_at, decision_note VARCHAR(255) NULL | |
| created_at | INDEX (status, shelf_life_extended, created_at) |

Khi khách gửi:

- Sạp luôn nhận thông báo `QUALITY_REPORTED`, có link tới báo cáo.
- Chỉ khi **món có hạn do sạp kéo dài và hư trước hạn** (`shelf_life_extended AND before_promise`), mọi admin mới nhận
  thông báo `QUALITY_ESCALATED`, ví dụ "Báo hư hàng kéo dài hạn — Vườn Út Hiền · Rau muống (+2 ngày)". Đây là ý 3 của
  LEAD.
- Các báo cáo khác vẫn vào hàng đợi của admin, nhưng không đẩy thông báo.

Quyền theo R-06: chỉ khách của đơn đó tạo được báo cáo, sạp chỉ xem báo cáo về sạp mình, admin xem tất cả.

#### 4.4.2 Sạp phản hồi

Trang Farmer Reviews thêm tab "Báo hàng hư", liệt kê các báo cáo về sạp. Mỗi báo cáo có một ô phản hồi, tối đa 500 ký
tự, sửa được cho tới khi admin quyết định. Không có tranh luận nhiều lượt.

#### 4.4.3 Admin xử lý

Trang Moderation thêm tab **"Báo hàng hư"**. Bộ lọc mặc định là "Cần xử lý": báo cáo đang mở, món kéo dài hạn, và hư
trước hạn. Hai lựa chọn còn lại là "Tất cả đang mở" và "Đã xử lý".

```
ML-0421 · Rau muống · Vườn Út Hiền                         [Kéo dài +2 ngày]
Khách: Nguyễn Văn An · Nhận 03/10 · Hạn đến 07/10 · Hư ngày 05/10 (trước hạn)
Mốc · "Lá úng đen sau 2 ngày để ngăn mát"                     [ảnh]
Sạp phản hồi: "Khách để nhiệt độ thường"
Lỗi hạn dùng của sạp: 1/3 trong 90 ngày
                               [Không phải lỗi sạp]  [Xác nhận vi phạm]
```

- **Không phải lỗi sạp:** báo cáo thành `dismissed`, ghi chú bắt buộc. Khách và sạp nhận `QUALITY_DECIDED`.
- **Xác nhận vi phạm:** báo cáo thành `confirmed`, ghi chú tuỳ chọn. Khách và sạp nhận `QUALITY_DECIDED`. Nếu món có hạn
  kéo dài **và** hư trước hạn thì thêm:
  1. Ghi một lỗi vào `farmer_violations`.
  2. Hạn dùng của sản phẩm đó về lại mốc gợi ý (`shelf_life_extended = false`, xoá `shelf_life_ack_at`). Sạp nhận
     `SHELF_LIFE_VIOLATION`.
  3. Nếu đủ 3 lỗi trong 90 ngày thì sạp bị khoá kéo dài (§4.4.4) và nhận `SHELF_LIFE_LOCKED`. Thẻ báo cáo hiện thêm nút
     "Đình chỉ sạp", mở luồng đình chỉ có sẵn với lý do chọn sẵn "Vi phạm hạn dùng".
- Xác nhận một món **không** kéo dài hạn chỉ đóng báo cáo, không ghi lỗi. Hàng hư trong mốc gợi ý là chuyện chất lượng
  thông thường, và LEAD chỉ yêu cầu phạt diện kéo dài hạn.

Không có hình phạt tự động chỉ vì khách báo. Lỗi chỉ được ghi khi admin xác nhận, để chống báo cáo ác ý.

#### 4.4.4 Lỗi hạn dùng và khoá kéo dài

Bảng mới `farmer_violations`: id, farmer_id, quality_report_id UNIQUE, product_id, extended_by_days, note, created_by,
created_at.

- Lỗi còn hiệu lực là lỗi tạo trong 90 ngày gần nhất.
- Có từ 3 lỗi còn hiệu lực trở lên thì sạp **bị khoá kéo dài hạn**: server từ chối `shelf_life_days` lớn hơn mốc gợi ý
  (409 ở §4.2).
- Khoá tự hết, không cần ai mở. Ngày hết khoá = ngày tạo của lỗi mới thứ ba + 90 ngày. Từ lúc đó chỉ còn 2 lỗi nằm
  trong 90 ngày.
- Không lưu trạng thái khoá riêng. Khoá được tính từ bảng lỗi, nên không thể lệch với dữ liệu.
- Sạp thấy "Lỗi hạn dùng: 2/3 trong 90 ngày" ở trang Tổng quan (chỉ khi có lỗi), và thấy lý do khoá trong form sản
  phẩm.
- Admin thấy số lỗi và ngày hết khoá ở trang chi tiết sạp.

### 4.5 Giảm giá hàng sắp hết hạn (FR-124, FR-125)

#### 4.5.1 Khi nào được giảm

Mỗi lần giảm giá gắn với **một sản phẩm và một ngày nhận P**. Farmer khai **ngày thu hoạch hoặc đóng gói H** của phần
hàng sẽ mang tới ngày P. Gọi N là hạn dùng hiện tại của sản phẩm:

- Hạn của lô: `B = H + N − 1`.
- Số ngày khách còn dùng được, tính cả ngày nhận: `L = B − P + 1`.

Điều kiện:

- `H < P` và `H ≤ hôm nay`: hàng đã thu hoạch trước ngày nhận. Hàng hái đúng ngày nhận là hàng tươi.
- `L ≥ 1`: khách còn dùng được ít nhất trong ngày nhận. Nếu `L < 1` thì không được bán ngày P, báo "Hàng hết hạn trước
  ngày nhận".
- `L ≤ ⌈N / 2⌉`: hàng đã qua ít nhất nửa hạn thì mới coi là **sắp hết hạn**. Hàng còn nhiều hạn hơn không được giảm
  giá ở mục này, vì đây không phải khuyến mãi chung.

Hệ quả: hàng hạn 1 ngày, như rau lá để nhiệt độ thường, không bao giờ vào mục này. Hái trước ngày nhận là đã hết hạn.

#### 4.5.2 Mức giảm gợi ý

| Còn lại | Gợi ý |
|---|---|
| L = 1 (chỉ dùng được trong ngày nhận) | 40% |
| L / N ≤ 0,2 | 40% |
| L / N ≤ 0,35 | 30% |
| Còn lại (L / N ≤ 0,5) | 20% |

Farmer chỉnh được từ 5% tới 70%, mỗi bước 5%. Giá mới = `giá gốc × (100 − %) / 100`, làm tròn tới cent, thấp nhất
$0.01.

Ví dụ:

- Cà chua, N = 7, thu hoạch 29/09, nhận 03/10: B = 05/10, L = 3, L / N = 0,43, gợi ý 20%.
- Trứng, N = 21, đóng gói 14/09, nhận 03/10: B = 04/10, L = 2, L / N = 0,1, gợi ý 40%.

#### 4.5.3 Farmer đăng giảm giá

Trên trang Farmer Products, menu của mỗi dòng có **"Giảm giá hàng sắp hết hạn"**. Mục này chỉ hiện khi sản phẩm có
lịch tồn kho tuần. Dialog:

```
Ngày nhận          [T7 03/10 ▾]      ← các ngày còn đặt được trong 14 ngày tới
Số lượng mang tới  [ 12 ] kg         hiện đang mở bán 30 kg
Thu hoạch ngày     [29/09]
→ Dùng tốt đến hết CN 05/10 · khách còn 3 ngày (hạn 7 ngày)
Giảm               [ − ] 20% [ + ]   gợi ý 20%
Giá                $0.60 → $0.48 / kg
                                   [Huỷ]  [Đăng giảm giá]
```

Đầu trang Products có khối "Đang giảm giá (2)". Mỗi dòng ghi sản phẩm, ngày nhận, mức giảm, số còn lại, hạn dùng, và có
nút "Bỏ giảm giá".

Cột mới của `product_daily_stock`. Cả 4 cột cùng NULL, hoặc cùng có giá trị:

| Cột | Ghi chú |
|---|---|
| list_price DECIMAL(10,2) NULL | Giá trước khi giảm |
| discount_percent TINYINT NULL | 5–70 |
| packed_on DATE NULL | H |
| best_before DATE NULL | B, tính lúc đăng. Không đổi nếu sau đó Farmer sửa hạn dùng của sản phẩm |

- **Đăng:** tạo dòng ngày đó nếu chưa có (materialize-on-demand, như endpoint chỉnh ngày đã có), khoá dòng bằng
  `FOR UPDATE`, rồi đặt `quantity_available` = số mang tới, `list_price` = giá hiện tại (nếu chưa giảm) và
  `unit_price` = giá mới.
- **Bỏ:** `unit_price = list_price`, xoá 4 cột, giữ nguyên số lượng.
- Đơn đã đặt không đổi, vì giá và hạn đã chụp trên `order_items`.

API cho Farmer, chỉ với sản phẩm của chính mình (R-06):

- `PUT /api/v1/farmer/products/{id}/daily-stock/{date}/deal`, body `{ quantityAvailable, packedOn, discountPercent }`,
  trả dòng tồn kho của ngày đó.
  - 400 `NOT_NEAR_EXPIRY`: `L > ⌈N / 2⌉`, hoặc `H ≥ P`.
  - 400 `EXPIRED_BEFORE_PICKUP`: `L < 1`.
  - 400 `VALIDATION_ERROR`: mức giảm ngoài 5–70, hoặc H sau hôm nay.
  - 409 `DATE_NOT_ORDERABLE`: ngày P không còn slot đặt được (quá cutoff, hoặc chợ hay sạp không mở).
- `DELETE /api/v1/farmer/products/{id}/daily-stock/{date}/deal`.
- `GET /api/v1/farmer/deals`: các ngày đang giảm giá của sạp, cho khối "Đang giảm giá".

#### 4.5.4 Khách xem hàng giảm giá

Trang mới **`/deals` "Giảm giá sắp hết hạn"**, có trên thanh điều hướng và chân trang. Trang chủ thêm một dải 4 món khi
có hàng giảm giá.

```
┌───────────────────────────────┐
│ [ảnh]                  −20%   │
│ Cà chua · Vườn Út Hiền        │
│ $0.60  $0.48 / kg             │
│ Nhận T7 03/10 · dùng tốt đến  │
│ hết CN 05/10 · còn 12 kg      │
│ [Thêm vào giỏ]                │
└───────────────────────────────┘
```

`GET /api/v1/deals` (Public), query `marketId, categoryId, day, page, pageSize`. Mỗi dòng là một cặp (sản phẩm, ngày
nhận) đáp ứng đủ:

- đang giảm giá và còn hàng;
- ngày đó còn slot đặt được, theo cùng luật "ngày còn đặt được" của tồn kho: chợ và sạp đều mở ngày đó, còn trước
  cutoff, slot còn chỗ;
- sản phẩm không bị ẩn hay xoá, và sạp đã được duyệt.

Sắp xếp theo ngày nhận gần nhất, rồi mức giảm lớn nhất. Mỗi dòng trả `productId, name, imageUrl, unit, stallName,
farmerId, marketNames, stockDate, listPrice, unitPrice, discountPercent, bestBefore, daysLeft, quantityAvailable,
storageMode`.

Trang chi tiết sản phẩm thêm khối "Đang giảm giá", liệt kê các ngày nhận có giảm giá của sản phẩm đó.

Trang `/deals` có đủ 4 trạng thái (FR-084): đang tải, lỗi, trống ("Hôm nay chưa có hàng giảm giá") và có dữ liệu.

#### 4.5.5 Giỏ hàng tính theo ngày nhận

Hiện nay bản xem trước giỏ không biết ngày nhận nên luôn báo giá của ngày gần nhất, còn lúc đặt đơn thì lấy giá của
ngày đã chọn. Khi có giảm giá, hai con số này sẽ lệch nhau ngay trước mắt khách. Vì vậy:

- `PreviewRequest` thêm trường tuỳ chọn `pickupDates: [{ farmerId, date }]`. Có ngày thì preview trả giá, số còn, mức
  giảm và `bestBefore` của đúng ngày đó. Không có thì giữ như hiện nay, tương thích ngược.
- Món thêm vào giỏ từ trang `/deals` nhớ `pickupDate`. Bộ chọn ngày của sạp đó mặc định chọn ngày này, nếu ngày đó còn
  đặt được.
- Đổi ngày nhận thì preview chạy lại. Cách giữ giỏ trên màn hình trong lúc tính lại đã có từ #188.
- Nếu khách chọn ngày khác ngày giảm giá, giỏ hiện dòng nhắc "Giảm giá chỉ áp dụng cho ngày T7 03/10".
- Đặt đơn vẫn lấy giá từ dòng tồn kho đã khoá, như hiện nay, và chụp `list_price`, `best_before` vào `order_items`.

### 4.6 Thông báo mới

| Kind | Gửi tới | Khi nào |
|---|---|---|
| QUALITY_REPORTED | Sạp | Khách gửi báo hư |
| QUALITY_ESCALATED | Mọi admin | Báo hư món kéo dài hạn và hư trước hạn |
| QUALITY_DECIDED | Khách, sạp | Admin xác nhận hoặc bác báo cáo |
| SHELF_LIFE_VIOLATION | Sạp | Sạp bị ghi một lỗi hạn dùng |
| SHELF_LIFE_LOCKED | Sạp | Sạp đủ 3 lỗi và bị khoá kéo dài |

`notifications.kind` là VARCHAR(40), nên thêm kind không cần migration. Về nhóm trong Cài đặt: thông báo cho sạp và khách
vào nhóm `ORDERS` sẵn có. `QUALITY_ESCALATED` vào nhóm mới `QUALITY_REPORTS` dành cho admin, mặc định bật, làm giống
nhóm `FARMER_APPLICATIONS`.

## 5. Dữ liệu — các migration mới (R-03)

Số thứ tự dưới đây tính từ migration mới nhất trên `dev` hôm nay (`V20260927002`). Lúc làm, nếu `dev` đã có
migration mới hơn thì lấy số kế tiếp.

1. `V20260927003__create_shelf_life_guides.sql`: bảng ở §4.1 và 12 nhóm mặc định.
2. `V20260927004__product_storage_and_extension.sql`: 5 cột ở §4.2. Sản phẩm cũ nhận `storage_mode = 'room'`,
   `suggested_shelf_life_days = NULL`, `shelf_life_extended = FALSE`. Không truy lỗi ngược về trước.
3. `V20260927005__order_item_shelf_life_snapshot.sql`: 6 cột ở §4.3.
4. `V20260927006__create_quality_reports_and_violations.sql`: 2 bảng ở §4.4.
5. `V20260927007__daily_stock_deals.sql`: 4 cột ở §4.5.3, kèm CHECK "cùng NULL hoặc cùng có giá trị" và
   `discount_percent BETWEEN 5 AND 70`.

`db/seed.sql` thêm dữ liệu demo:

- gán nhóm và cách bảo quản cho 51 sản phẩm demo;
- 1 sản phẩm có hạn kéo dài;
- 1 báo hư đang mở, thuộc diện kéo dài và hư trước hạn, để demo luồng của admin;
- 2 ngày giảm giá, để trang `/deals` có dữ liệu.

`db/schema.sql` và `docs/api-contract.md` do LEAD cập nhật (R-02). Phần API đề xuất nằm ở §6.

## 6. API đề xuất

Chỉ thêm mới, không đổi hành vi của endpoint cũ.

| Method | Path | Vai | Ghi chú |
|---|---|---|---|
| GET | `/api/v1/shelf-life-guides?categoryId=` | Farmer, Admin | §4.1 |
| POST/PUT/DELETE | `/api/v1/admin/shelf-life-guides/{id}?` | Admin | §4.1 |
| POST/PUT | `/api/v1/farmer/products(/{id})` | Farmer | thêm `shelfLifeGuideId, storageMode, acknowledgeLongerShelfLife` |
| GET | `/api/v1/products`, `/api/v1/products/{id}` | Public | thêm `storageMode, shelfLifeExtended, suggestedShelfLifeDays` |
| POST | `/api/v1/orders/{id}/items/{itemId}/quality-report` | Customer | §4.4.1 |
| POST | `/api/v1/quality-reports/photos` | Customer | tải ảnh, trả URL |
| GET | `/api/v1/farmer/quality-reports` | Farmer | §4.4.2 |
| PUT | `/api/v1/farmer/quality-reports/{id}/response` | Farmer | §4.4.2 |
| GET | `/api/v1/admin/quality-reports?status=&escalated=` | Admin | §4.4.3 |
| PATCH | `/api/v1/admin/quality-reports/{id}/confirm`, `/dismiss` | Admin | §4.4.3 |
| GET | `/api/v1/admin/farmers/{id}` | Admin | thêm `activeViolations, extensionLockedUntil` |
| PUT/DELETE | `/api/v1/farmer/products/{id}/daily-stock/{date}/deal` | Farmer | §4.5.3 |
| GET | `/api/v1/farmer/deals` | Farmer | §4.5.3 |
| GET | `/api/v1/deals` | Public | §4.5.4 |
| POST | `/api/v1/orders/preview` | Customer | thêm tuỳ chọn `pickupDates` (§4.5.5) |
| GET | `/api/v1/orders/{id}` | Customer, Farmer, Admin | mỗi món thêm `bestBefore, storageMode, listPrice, qualityReport` |

## 7. Màn hình

| Vai | Màn | Thay đổi |
|---|---|---|
| Admin | Categories | Mục "Nhóm bảo quản" |
| Admin | Moderation | Tab "Báo hàng hư" |
| Admin | Chi tiết sạp | Số lỗi hạn dùng, ngày hết khoá |
| Farmer | Form sản phẩm | Nhóm, cách bảo quản, mốc gợi ý, cảnh báo và ô cam kết |
| Farmer | Products | Menu giảm giá, khối "Đang giảm giá" |
| Farmer | Reviews | Tab "Báo hàng hư", ô phản hồi |
| Farmer | Overview | Thẻ lỗi hạn dùng, chỉ khi có lỗi |
| Customer | Chi tiết sản phẩm | Cách bảo quản, cam kết kéo dài, khối giảm giá |
| Customer | `/deals` (mới), trang chủ | Hàng giảm giá |
| Customer | Giỏ hàng | Giá theo ngày nhận, mức giảm, hạn dùng |
| Customer | Chi tiết đơn, vé đơn | Hạn dùng mỗi món, nút "Báo hàng hư" |

Mọi chữ hiển thị đi qua `locales/*`, đủ 10 ngôn ngữ. Tiền đi qua `money()` (USD), ngày đi qua `lib/format.ts`.

## 8. Lỗi và trường hợp biên

- Admin tắt một nhóm đang được dùng: sản phẩm giữ số đã chụp. Lần sửa sau, Farmer phải chọn nhóm khác.
- Admin đổi mốc gợi ý: sản phẩm và đơn cũ không bị ảnh hưởng, vì đã chụp. Báo hư được xét theo lời hứa ghi trên đơn.
- Farmer đổi danh mục: nhóm phải thuộc danh mục mới, sai thì trả 400.
- Farmer sửa hạn dùng sau khi đã đăng giảm giá: `best_before` của lô giữ nguyên.
- Giảm giá cho một ngày đã có đơn: đơn cũ giữ giá cũ, đơn mới lấy giá mới.
- Đăng giảm giá và đặt đơn cùng lúc cho một ngày: cả hai khoá cùng dòng `product_daily_stock`, như `place()` đang làm.
- Khách báo hư quá hạn báo: 409 `REPORT_WINDOW_CLOSED`. Báo lần hai: 409 `ALREADY_REPORTED`. Đơn chưa hoàn tất: 409.
- Ảnh sai định dạng hoặc quá 5 MB: 400, giống các chỗ tải ảnh khác.
- Sạp bị đình chỉ: vẫn phản hồi báo cáo được, nhưng không đăng giảm giá được, vì D-09 chặn mọi thao tác trên sản phẩm.
- Món của đơn cũ không có `best_before`: không hiện nút báo hư.

## 9. Kiểm thử

- **Hàm thuần, ở cả BE và FE, dùng chung một bảng số:** mốc gợi ý, trần gấp đôi, cờ kéo dài, `B`, `L`, điều kiện sắp
  hết hạn, mức gợi ý, giá sau giảm, ngày hết khoá.
- **Test trên MySQL:**
  - migration và dữ liệu nhóm mặc định;
  - `peerMedianDays`: chỉ trả khi có ít nhất 3 sản phẩm, và không tính sạp đang hỏi;
  - `/deals` loại đúng các trường hợp hết slot, sạp bị đình chỉ, sản phẩm bị ẩn;
  - cửa sổ báo hư;
  - đếm lỗi trong 90 ngày và khoá kéo dài;
  - xác nhận vi phạm thì hạn dùng sản phẩm về mốc gợi ý.
- **OrderService:**
  - đặt đơn vào ngày đang giảm giá lấy giá giảm, và chụp `list_price`, `best_before`;
  - preview có `pickupDates` trả giá đúng ngày, không có thì như cũ;
  - các test đặt đơn đồng thời hiện có vẫn xanh.
- **Quyền:** khách không báo hư được đơn của người khác (403); sạp không sửa giảm giá của sạp khác (403); chỉ admin xác
  nhận được báo cáo.
- **FE:**
  - form sản phẩm: chọn cách bảo quản thì hạn dùng nhảy về mốc; dài hơn gợi ý phải tick; vượt trần báo lỗi; bị khoá
    thì dừng ở mốc;
  - dialog giảm giá: tính `B`, `L` và mức gợi ý; chặn khi hàng chưa sắp hết hạn;
  - `/deals` đủ 4 trạng thái;
  - giỏ hàng đổi ngày nhận thì đổi giá.

## 10. Chia giai đoạn

Mỗi giai đoạn có plan riêng và PR riêng, và dùng được ngay khi xong:

| Giai đoạn | FR | Gồm | Phụ thuộc |
|---|---|---|---|
| 1. Hạn dùng gợi ý | FR-120, FR-121 | §4.1, §4.2, §4.3 | — |
| 2. Báo hư và phạt | FR-122, FR-123 | §4.4, thông báo ở §4.6 | Giai đoạn 1: cờ kéo dài trên đơn |
| 3. Giảm giá sắp hết hạn | FR-124, FR-125 | §4.5 | Giai đoạn 1: hạn dùng trên đơn |

Giai đoạn 2 và 3 không phụ thuộc nhau. Nếu LEAD muốn có trang giảm giá sớm thì làm giai đoạn 3 trước.

## 11. Quyết định cần LEAD xác nhận

Tôi đã chọn sẵn mặc định. LEAD đổi được trước khi lên plan:

1. **Mã FR mới:** FR-120…FR-125, nhãn NICE (đội tự thêm). QA/DOC thêm vào `.ai/REQUIREMENTS.md`.
2. **Cách bảo quản:** hai cách, nhiệt độ thường và ngăn mát. Chưa có ngăn đông.
3. **"Dài hơn":** dài hơn mốc gợi ý. Trần là gấp đôi mốc.
4. **Phạt:** lỗi chỉ ghi khi admin xác nhận; hạn của sản phẩm về lại mốc gợi ý; 3 lỗi trong 90 ngày thì khoá kéo dài
   và gợi ý đình chỉ, còn đình chỉ thì admin tự bấm. Không phạt tiền.
5. **Giảm giá:** chỉ cho hàng đã qua nửa hạn, mức 5–70%, gợi ý 20/30/40%. Mỗi sản phẩm một giá mỗi ngày.
6. **Công khai cam kết kéo dài:** hiện cho khách ở trang sản phẩm.
7. **Hạn báo hư:** tới 2 ngày sau ngày hết hạn, mỗi món một lần, ảnh không bắt buộc.
8. **Số liệu tham khảo từ sạp khác:** chỉ hiện khi có ít nhất 3 sản phẩm.

Mã FR đề xuất:

| FR | Nội dung | Vai |
|---|---|---|
| FR-120 | Nhóm bảo quản và hạn dùng gợi ý theo cách bảo quản | Admin, Farmer |
| FR-121 | Farmer kéo dài hạn phải xác nhận cam kết; khách thấy cách bảo quản và hạn dùng | Farmer, Customer |
| FR-122 | Khách báo hàng hư trước hạn trên đơn đã nhận; sạp phản hồi | Customer, Farmer |
| FR-123 | Admin xử lý báo hư; lỗi hạn dùng; khoá kéo dài khi đủ 3 lỗi trong 90 ngày | Admin |
| FR-124 | Farmer giảm giá hàng sắp hết hạn theo ngày nhận, app gợi ý mức giảm | Farmer |
| FR-125 | Trang "Giảm giá sắp hết hạn"; giỏ hàng tính giá theo ngày nhận | Customer |

## 12. Ngoài phạm vi

- Hoàn tiền hay bồi thường. App không xử lý tiền, khách và sạp tự giải quyết tại sạp.
- Ngăn đông, nhiệt độ đo thực tế, cảm biến.
- Khuyến mãi chung, mã giảm giá, giảm giá tự động không cần Farmer bấm.
- Bán hai giá cho cùng một sản phẩm trong cùng một ngày (hàng mới và hàng cũ). Việc này cần mô hình lô (cách C).
- Báo tin giảm giá cho người đã yêu thích sản phẩm. Có thể nối vào restock alert (FR-041) sau.
- Xoá lỗi hạn dùng đã ghi, hoặc kháng nghị nhiều lượt.
- Chatbot trả lời về hàng giảm giá.
