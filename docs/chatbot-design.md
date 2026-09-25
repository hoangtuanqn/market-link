# Chatbot MarketLink — FR-090, FR-091, FR-092

Trợ lý tra cứu cho Customer: tìm sản phẩm xuyên chợ/Farmer và trả lời câu hỏi thường gặp
(giờ chợ, Farmer có mặt, khung giờ pickup, giá/tồn kho).

## Nguyên tắc

1. **Không dùng LLM sinh SQL.** Tin nhắn → phân loại **intent** bằng luật từ khoá → mỗi intent gọi
   **một câu SQL viết sẵn có tham số** (`NamedParameterJdbcTemplate`). Không có đường nào để chữ
   người dùng gõ trở thành SQL → không có SQL injection, và giải thích được với giám khảo.
2. Tên chợ và tên stall **không** trích bằng regex: service nạp danh sách chợ/Farmer đang hoạt động
   (vài chục dòng) và so khớp tên đã bỏ dấu với câu hỏi.
3. Chấp nhận gõ **có dấu, không dấu và tiếng Anh**. Văn bản được chuẩn hoá: chữ thường, bỏ dấu, `đ → d`.
4. Mọi lượt hỏi–đáp lưu vào `chat_messages` kèm intent (FR-092) để xem lại vì sao bot trả lời như vậy.

## Luồng

```
POST /api/v1/chat { sessionKey, message }
  │
  ├─ TextNormalizer      "Cà chua giá bao nhiêu?" → "ca chua gia bao nhieu"
  ├─ IntentClassifier    → PRODUCT_DETAIL, keyword = "ca chua", dayOfWeek = null
  ├─ ChatService         chọn nhánh theo intent
  │     └─ ChatKnowledgeRepository  câu SQL cố định, tham số :keyword / :marketId / :dow
  ├─ lưu 2 dòng chat_messages (user + bot) cùng intent
  └─ { reply, intent, results[] }
```

## Bảng intent

Thứ tự ưu tiên từ trên xuống: câu khớp nhiều luật thì lấy intent đứng trước.

| Intent | Ví dụ | Từ khoá kích hoạt (sau khi bỏ dấu) | Dữ liệu tra |
|---|---|---|---|
| `PICKUP_WINDOW` | "Khung giờ lấy hàng của Vườn Xanh?" | lay hang, nhan hang, khung gio, pickup | `farmer_operating_days` theo stall/chợ/thứ |
| `MARKET_HOURS` | "Chợ Bến Thành mở cửa mấy giờ?" | may gio, mo cua, dong cua, gio hop, hop cho, hop thu, opening, hours | `markets` + `market_operating_days` |
| `FARMER_AVAILABILITY` | "Thứ 7 có farmer nào ở chợ Phú Mỹ Hưng?" | farmer, nong dan, stall, gian hang, co mat (không dùng "sap" vì trùng sạp/sáp/sắp) | `farmer_operating_days` theo chợ/thứ |
| `PRODUCT_DETAIL` | "Cà chua giá bao nhiêu?", "còn hàng không" | gia (từ riêng), bao nhieu, con hang, het hang, price, how much, in stock | `products` gồm cả `sold_out` |
| `FIND_PRODUCT` | "Tìm rau muống", "ở đâu bán bơ" | tim, mua, ban, o dau, find, buy, where | `products` còn hàng, kèm stall + chợ |
| `GREETING` | "Xin chào" | xin chao, chao, hello, hi | — |
| `HELP` | "Bạn giúp được gì?" | giup, help, lam duoc gi, huong dan | — |
| `UNKNOWN` | mọi câu còn lại | — | thử tìm sản phẩm bằng keyword; có kết quả thì trả như `FIND_PRODUCT` |

**Keyword** = câu đã chuẩn hoá, bỏ từ kích hoạt và stopword (`toi, minh, muon, co, khong, o, dau…`).

**Thứ trong tuần** (khớp `day_of_week` 0 = CN … 6 = T7): `hom nay/today`, `ngay mai/tomorrow`,
`thu 2…thu 7`, `thu hai…thu bay`, `t2…t7`, `chu nhat/cn/sunday`, `monday…saturday`.

## Câu SQL (đều có tham số, chỉ đọc)

| Hàm | Dùng cho | Điều kiện chính |
|---|---|---|
| `searchProducts(keyword, includeSoldOut)` | FIND_PRODUCT, PRODUCT_DETAIL, UNKNOWN | `p.name LIKE :kw OR c.name LIKE :kw`, `is_deleted = 0`, Farmer `approved` |
| `activeMarkets()` | MARKET_HOURS, khớp tên chợ | `markets.is_active`, gộp `market_operating_days` |
| `approvedFarmers()` | PICKUP_WINDOW, khớp tên stall | `approval_status = 'approved'` |
| `farmerSchedules(farmerId?, marketId?, dow?)` | FARMER_AVAILABILITY, PICKUP_WINDOW | tham số null = không lọc |

`LIKE` dùng collation `utf8mb4_*_ai_ci` (không phân biệt dấu) nên `ca chua` khớp `Cà chua`.
Ký tự `%`, `_`, `\` trong keyword được escape trước khi truyền vào.

## API

| Method | Path | Quyền | Body / query | data |
|---|---|---|---|---|
| POST | `/api/v1/chat` | Public (có token thì gắn `user_id`) | `{ sessionKey, message }` | `{ reply, intent, results[] }` |
| GET | `/api/v1/chat/history` | Public | `?sessionKey=` | `[{ role, message, intent, createdAt }]` (50 dòng gần nhất) |

- `sessionKey`: FE tự sinh (UUID) và lưu localStorage, 8–64 ký tự `[A-Za-z0-9_-]`. `message`: 1–500 ký tự.
- `results[]`: `{ type: "product"|"market"|"farmer", id, title, subtitle }`, để FE render link/thẻ.
- Khớp contract: LEAD chốt `/api/v1` và `camelCase` cho toàn dự án ngày 25/09/2026, nên hai endpoint
  trên là chuẩn. Xem mục Quy ước trong `docs/api-contract.md`.

## Kịch bản demo cho giám khảo

1. "xin chào" → `GREETING`, bot giới thiệu các loại câu hỏi.
2. "tìm cà chua" → `FIND_PRODUCT`, danh sách sản phẩm + stall + chợ.
3. "ca chua gia bao nhieu" (không dấu) → `PRODUCT_DETAIL`, giá ₫ + tồn kho.
4. "chợ Bến Thành mở cửa mấy giờ" → `MARKET_HOURS`.
5. "thứ 7 có farmer nào ở chợ Bến Thành" → `FARMER_AVAILABILITY`.
6. "khung giờ lấy hàng của <stall>" → `PICKUP_WINDOW`.
7. Mở Adminer → bảng `chat_messages` → chỉ cột `intent` cho từng câu.
8. Gõ `' OR 1=1 --` → bot trả "không tìm thấy", không lỗi: chứng minh không có injection.

## Giới hạn đã biết

- Luật từ khoá không hiểu câu phức (hai ý trong một câu) — trả intent ưu tiên cao hơn.
- Chưa giới hạn tần suất gọi (rate limit); có sẵn `bucket4j-redis` trong pom nếu cần.
- Các bảng markets/products/farmer_* chưa có migration; tới lúc đó bot trả lời
  "dữ liệu chưa sẵn sàng" thay vì lỗi 500.
