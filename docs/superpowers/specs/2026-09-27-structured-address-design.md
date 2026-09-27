# Địa chỉ có cấu trúc — thiết kế

- Ngày: 27/09/2026 · Người duyệt: LEAD
- FR: FR-001 (địa chỉ khi đăng ký Customer), FR-002 (Farmer dùng địa chỉ của tài khoản), FR-073 (địa chỉ chợ),
  FR-010 (lọc chợ theo khu vực)
- Nguồn quyết định: hội thoại với LEAD ngày 27/09/2026 (4 câu hỏi đã chốt, xem §9)

## 1. Mục tiêu

Mọi ô nhập địa chỉ đổi từ một ô chữ tự do thành các ô **chọn lần lượt**. Chỉ số nhà hoặc chi tiết là gõ tay:

```
Quốc gia   [Việt Nam          ▾]
Tỉnh/TP    [TP. Hồ Chí Minh   ▾]
Phường/Xã  [Phường Bến Thành  ▾]
Đường      [Lê L…          🔍]   ← gợi ý theo tỉnh, vẫn gõ được đường ngoài danh sách
Số nhà     [12_______________]
```

- **Việt Nam** dùng cấu trúc **2 cấp** sau cải cách 01/7/2025: 34 tỉnh/thành → 3.321 phường/xã/đặc khu.
  Không còn cấp quận/huyện.
- **Nước khác**: chọn quốc gia, sau đó gõ tay Tỉnh/Bang, Thành phố và Địa chỉ.
- **Chợ** (form admin) bắt buộc ở Việt Nam, vì khách phải tới tận nơi nhận hàng.

Dữ liệu có cấu trúc giúp chấm mục Database (khoá ngoại tới bảng danh mục), giúp lọc chợ theo phường và giúp
dữ liệu sạch hơn chuỗi tự do.

### Ngoài phạm vi

- Không vẽ ranh giới phường lên bản đồ và không tự tính phường từ toạ độ.
- Không có danh sách đường cho tỉnh ngoài TP.HCM (ô Đường vẫn gõ tay được, chỉ không có gợi ý).
- Không có danh mục cấp dưới cho nước ngoài.
- Không có địa chỉ riêng cho sạp: Farmer dùng địa chỉ tài khoản; vị trí sạp tại chợ vẫn là toạ độ
  `farmer_markets` như cũ.
- Không bắt tài khoản cũ cập nhật địa chỉ ngay (xem §6).

## 2. Dữ liệu danh mục

| Bảng | Cột | Số dòng | Nguồn |
|---|---|---|---|
| `countries` | `code` CHAR(2) PK (ISO 3166-1 alpha-2), `name_en` | 249 | `java.util.Locale.getISOCountries()` |
| `provinces` | `code` VARCHAR(5) PK (mã GSO), `name`, `full_name`, `name_en`, `full_name_en` | 34 | [thanglequoc/vietnamese-provinces-database](https://github.com/thanglequoc/vietnamese-provinces-database) v5.2.0 (MIT, dữ liệu Cục Thống kê, nghị quyết 388/NQ-UBTVQH16) |
| `wards` | `code` VARCHAR(5) PK, `province_code` FK → `provinces`, `name`, `full_name`, `name_en`, `full_name_en` | 3.321 | như trên |
| `streets` | `id` PK, `province_code` FK → `provinces`, `name`, `name_search`, UNIQUE(`province_code`, `name`), INDEX(`province_code`, `name_search`) | ~5.700 (TP.HCM) | OpenStreetMap qua Overpass, 27/09/2026, ODbL |

- Tên quốc gia hiển thị theo ngôn ngữ người đọc do trình duyệt tự dịch từ mã (`Intl.DisplayNames`). DB chỉ lưu
  `name_en` để dự phòng.
- `streets.name_search` là tên viết thường, bỏ dấu, `đ → d`, dùng để tìm kiếm khi người dùng gõ không dấu.
- Danh sách đường đã lọc: bỏ hẻm, cầu, vòng xoay, nút giao, lô, khu; gộp các cách viết "Đường Lê Lợi" / "Lê Lợi";
  giữ "Đường số 7", "Đường D1".
- Script sinh dữ liệu nằm trong repo: `scripts/geo/`, kèm hướng dẫn chạy lại khi có nghị quyết mới.
- Cả bốn bảng được nạp bằng **migration Flyway** (`V20260927001`, `V20260927002`), không nạp qua `seed.sql`. Lý do:
  thiếu bảng thì không đăng ký được tài khoản, nên DB nào cũng phải có, kể cả DB chưa seed.
- Có nghị quyết sửa danh mục thì thêm migration mới; không sửa migration đã merge (R-03).

## 3. Cột địa chỉ trên `users` và `markets`

Thêm vào **cả hai bảng** (đều cho phép NULL):

| Cột | Kiểu | Dùng khi |
|---|---|---|
| `country_code` | CHAR(2) FK → `countries` | luôn có khi địa chỉ có cấu trúc |
| `province_code` | VARCHAR(5) FK → `provinces` | Việt Nam |
| `ward_code` | VARCHAR(5) FK → `wards` | Việt Nam |
| `street_name` | VARCHAR(100) | Việt Nam — là **chữ**, không FK, vì được gõ ngoài danh sách |
| `address_line` | VARCHAR(60) | số nhà / chi tiết (mọi nước) |
| `region_name` | VARCHAR(60) | nước khác — Tỉnh/Bang |
| `city_name` | VARCHAR(60) | nước khác — Thành phố |

- Cột `address` VARCHAR(255) **giữ nguyên** và do server ghép:
  - Việt Nam: `12 Lê Lợi, Phường Bến Thành, Thành phố Hồ Chí Minh`. Không có số nhà thì bỏ phần đầu:
    `Lê Lợi, Phường Bến Thành, …`.
  - Nước khác: `1-2-3 Jingumae, Shibuya, Tokyo, Japan`.
- Nhờ giữ `address`, mọi chỗ đang đọc địa chỉ không phải sửa: chatbot, nút chỉ đường, thẻ chợ, chat, trang admin
  khách hàng, `/become-farmer`, hồ sơ sạp.
- Đây là dữ liệu dẫn xuất có chủ ý: chỉ có một đường ghi là `AddressService.resolve`.
- `markets.district` và `markets.city` bị **xoá**, vì thông tin đó giờ nằm ở `ward_code` / `province_code`.
- **Phường phải thuộc đúng tỉnh ngay ở DB:** `wards` có thêm UNIQUE(`province_code`, `code`), và `users` / `markets`
  có FK hai cột (`province_code`, `ward_code`) → `wards(province_code, code)`, bên cạnh FK một cột tới `provinces`.
  Thêm một `CHECK`: `ward_code` không NULL thì `province_code` cũng không NULL (FK nhiều cột bỏ qua dòng có NULL).
  Service vẫn kiểm trước để trả lỗi 400 dễ đọc thay vì lỗi ràng buộc.

## 4. API

### 4.1 Danh mục (mới, Public)

| Method | Path | data trả về |
|---|---|---|
| GET | `/api/v1/geo/countries` | `[{ code, name }]`, sắp theo `name` |
| GET | `/api/v1/geo/provinces` | `[{ code, name, fullName }]`, sắp theo `name` (chỉ Việt Nam) |
| GET | `/api/v1/geo/provinces/{code}/wards` | `[{ code, name, fullName }]`, sắp theo `name`; mã tỉnh không có thì **404** `PROVINCE_NOT_FOUND` |
| GET | `/api/v1/geo/provinces/{code}/streets?q=` | `[{ name }]`, tối đa 20; `q` rỗng thì `[]`; khớp mọi từ của `q` (bỏ dấu) |

Ba danh sách đầu gửi kèm `Cache-Control: public, max-age=86400`. Backend nạp sẵn tỉnh, phường và quốc gia vào bộ
nhớ lúc khởi động (`GeoDirectory`, khoảng 3.600 dòng). Đường thì truy vấn DB theo tham số (R-04).

### 4.2 Hình dạng `addressParts`

Dùng chung cho request và response:

```jsonc
{
  "countryCode": "VN",
  "provinceCode": "79",        // chỉ Việt Nam
  "wardCode": "26743",         // chỉ Việt Nam
  "streetName": "Lê Lợi",      // chỉ Việt Nam
  "addressLine": "12",         // số nhà / chi tiết
  "regionName": null,          // chỉ nước khác
  "cityName": null             // chỉ nước khác
}
```

### 4.3 Endpoint đổi hình dạng

| Endpoint | Trước | Sau |
|---|---|---|
| POST `/auth/register` | `address: string` | `addressParts: {…}` (bắt buộc) |
| PUT `/auth/me` | `address: string` | `addressParts: {…}`, bắt buộc với customer/farmer; admin được bỏ trống (giữ nguyên địa chỉ cũ) |
| `user` (mọi endpoint auth) | `address` | `address` (chuỗi ghép, như cũ) + `addressParts` (NULL với tài khoản cũ → bị lược khỏi JSON) |
| POST/PUT `/admin/markets` | `address, district, city` | `addressParts: {…}` (bắt buộc, `countryCode` phải là `VN`) |
| GET `/markets`, `/markets/{id}` | `district, city` | `addressParts` + `wardName`, `provinceName` (để hiện khu vực mà không phải tải danh mục) |
| GET `/markets` query | `city, district` | `provinceCode, wardCode` |

### 4.4 Kiểm tra ở server (`AddressService.resolve`)

Lỗi trả **400** theo envelope sẵn có, tên field dạng `addressParts.<tên>`:

- `countryCode` bắt buộc và phải có trong `countries`.
- Việt Nam:
  - `provinceCode` bắt buộc và phải có thật.
  - `wardCode` bắt buộc và phải thuộc đúng `provinceCode`.
  - `streetName` bắt buộc, 1–100 ký tự.
  - `addressLine` bắt buộc với tài khoản, không bắt buộc với chợ; tối đa 60 ký tự.
  - `regionName` / `cityName` bị bỏ qua (lưu NULL).
- Nước khác:
  - `regionName`, `cityName`, `addressLine` đều bắt buộc, mỗi ô tối đa 60 ký tự.
  - `provinceCode` / `wardCode` / `streetName` bị bỏ qua (lưu NULL).
- Chợ: `countryCode ≠ VN` → lỗi ở `addressParts.countryCode`.
- Mọi chuỗi được `trim`. Chuỗi ghép vượt 255 ký tự → lỗi ở `addressParts.addressLine` (với giới hạn trên thì thực
  tế không xảy ra).

## 5. Frontend

### 5.1 Thành phần mới

- `src/api-requests/geo.requests.ts`: `GeoApi.countries()`, `provinces()`, `wards(code)`, `streets(code, q)`.
  Ba danh sách đầu được nhớ trong module suốt phiên, không tải lại mỗi lần mở form.
- `src/types/address.types.ts`: `AddressParts`, `VN`, `emptyAddress()`.
- `src/lib/address.ts`: `validateAddress(parts, { lineRequired })`, là bản phía client của §4.4, để chặn trước
  khi gửi (điều kiện 4 của DoD).
- `src/components/address/AddressFields.tsx`: khối ô địa chỉ dùng chung.
  - Props: `value`, `onChange`, `errors`, `idPrefix`, `lockCountry` (chợ), `lineRequired`, `legacyAddress`.
  - Quốc gia, Tỉnh và Phường là `SelectField` gốc của trình duyệt: dễ dùng trên điện thoại, gõ chữ đầu để nhảy
    tới mục.
  - Đổi quốc gia → xoá mọi ô còn lại. Đổi tỉnh → xoá phường và đường. Đổi phường → giữ đường.
  - Phường chưa chọn tỉnh thì bị khoá, kèm lý do. Đang tải danh sách → ô khoá và hiện "Đang tải…". Tải lỗi →
    dòng lỗi kèm nút **Thử lại**.
- `src/components/address/StreetCombobox.tsx`: combobox theo mẫu ARIA 1.2.
  - Gõ → chờ 200 ms rồi gọi `streets`, hiện tối đa 20 gợi ý.
  - Chữ đã gõ không trùng hẳn gợi ý nào → thêm dòng cuối **Dùng "…"**.
  - Bàn phím: ↑ ↓ Enter Esc. Rời ô thì giữ nguyên chữ đang gõ.

### 5.2 Chỗ dùng

| Màn | Thay đổi |
|---|---|
| `auth/RegisterCustomer` | ô Address → `AddressFields` |
| `auth/CompleteProfile` (sau đăng nhập Google) | như trên |
| `customer/Account/ProfileForm` | như trên; so "đã sửa" theo từng phần; tài khoản cũ thấy dòng "Địa chỉ cũ: …" |
| `admin/Account` | gửi `addressParts` đang có (có thể thiếu, admin được bỏ trống) |
| `admin/MarketForm` | ô Address + ô District → `AddressFields lockCountry lineRequired={false}`; chọn phường xong thì bản đồ ghim bay tới phường đó (tra một lần qua Nominatim, lỗi thì bản đồ đứng yên) |
| `public/Markets` | bộ lọc khu vực theo `wardName`, chỉ liệt kê phường đang có chợ |
| `public/Search` | dòng khu vực của chợ dùng `wardName` |
| `config/districts.ts` | xoá (22 quận cũ) |

`MarketType.district` đổi tên thành `area` (= `wardName`, không có thì `provinceName`).

### 5.3 Chữ hiển thị

Key mới nằm trong `common.json` (component dùng chung), dịch đủ 10 ngôn ngữ. Key địa chỉ cũ của các trang không còn
dùng thì xoá ở cả 10 ngôn ngữ, và khi sửa JSON thì **gộp**, không ghi đè cả khối. Tên tỉnh và phường luôn giữ tiếng
Việt có dấu ở mọi ngôn ngữ, như tên riêng.

## 6. Dữ liệu cũ và seed

- Migration không đoán cấu trúc từ chuỗi cũ. Tài khoản cũ giữ `address`, còn `addressParts` = NULL:
  - Không bị ép cập nhật. `MainLayout` vẫn chỉ ép khi thiếu hẳn `address`, như hiện nay.
  - Form hồ sơ hiện "Địa chỉ cũ: …" kèm các ô trống. Muốn lưu thì phải chọn đủ.
- `db/seed.sql`: 4 chợ và 12 tài khoản demo có địa chỉ đủ cấu trúc. Phường của chợ tra bằng toạ độ trên OSM:
  - Chợ Bà Chiểu → Phường Gia Định (26944).
  - Chợ Thảo Điền → Phường An Khánh (27094).
  - Chợ Bến Thành → Phường Bến Thành (26743).
  - Chợ Tân Định → Phường Tân Định (26737).
  - Vài Farmer ở tỉnh khác (Lâm Đồng, Khánh Hoà, Cà Mau) để demo đường gõ tay.
- `db/seed-extended.sql`: thêm ở cuối một khối `UPDATE` quy từ "quận cũ" sang một phường đại diện, và tách số nhà
  với tên đường. `scripts/generate-seed.js` sinh sẵn cột mới cho lần chạy sau; không chạy lại generator vì nó dùng
  `Math.random` và sẽ đổi hết dữ liệu.
- `db/marketlink-schema-dump.sql` sinh lại từ DB đã chạy đủ migration. Bản cũ còn thiếu cả `product_daily_stock`.

## 7. Lỗi và trạng thái

| Tình huống | Hành vi |
|---|---|
| Danh mục tải lỗi | ô liên quan khoá, dòng lỗi + nút Thử lại; nút Lưu vẫn bấm được nhưng bị chặn bởi validate |
| Gợi ý đường tải lỗi | combobox vẫn nhận chữ gõ tay, không hiện lỗi chặn |
| Server trả lỗi `addressParts.*` | hiện dưới đúng ô |
| Nominatim lỗi (form chợ) | bản đồ đứng yên, admin tự kéo ghim như cũ |

## 8. Kiểm thử

- Backend:
  - `AddressServiceTest`: đủ luật §4.4, cách ghép chuỗi, giới hạn độ dài.
  - `GeoDirectory`: nạp và tra cứu.
  - Truy vấn đường: bỏ dấu, nhiều từ, giới hạn 20.
  - Sửa các test cũ đang dựng `CustomerRegisterRequest`, `UpdateProfileRequest`, `MarketRequest`.
- Frontend (vitest):
  - `AddressFields`: xoá dây chuyền khi đổi quốc gia/tỉnh, chuyển sang nhánh nước ngoài, khoá quốc gia, hiện lỗi.
  - `StreetCombobox`: gợi ý, dòng "Dùng …", bàn phím.
  - `validateAddress`.
- Tay trên trình duyệt:
  - Đăng ký mới, sửa hồ sơ, tạo/sửa chợ, lọc chợ theo phường.
  - 375 / 768 / 1440 px, theme sáng/tối.

## 9. Quyết định đã chốt với LEAD (27/09/2026)

1. Cấp hành chính: **2 cấp mới** (Tỉnh/TP → Phường/Xã → Đường → Số nhà).
2. Ô Đường: **gợi ý + vẫn gõ được** đường ngoài danh sách.
3. Quốc gia: **nhiều nước**. Việt Nam chọn theo cấp; nước khác gõ tay Tỉnh/Bang, Thành phố, Địa chỉ.
4. Lưu trữ: **phương án A**: bảng danh mục + cột có cấu trúc, giữ cột `address` do server ghép.
5. Danh sách đường: trước mắt chỉ **TP.HCM**.
6. LEAD để AI tự chốt phần API và giao diện theo đề xuất rồi duyệt một lần khi xong ("làm tới khi xong rồi tôi
   chỉnh lại").

## 10. Ghi công dữ liệu

- Danh mục hành chính: thanglequoc/vietnamese-provinces-database (MIT), dữ liệu gốc từ Cục Thống kê.
- Tên đường: © OpenStreetMap contributors, ODbL.
- Hai dòng này thêm vào `docs/ASSUMPTIONS.md`. Trang About đã có sẵn dòng ghi công OSM.
