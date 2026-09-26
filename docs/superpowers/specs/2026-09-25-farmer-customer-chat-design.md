# Thiết kế · Chat thời gian thực giữa Customer và Farmer

Ngày: 25/09/2026 · Trạng thái: **chờ LEAD và QA/DOC duyệt** · Tác giả: AI assistant, theo brainstorm với chủ dự án

---

## 1. Vì sao có tài liệu này

Người mua và người bán trên MarketLink hiện không có cách nào nói chuyện với nhau. Khách muốn hỏi
"rau còn tươi không", "7 giờ em tới lấy được không", "có bó nhỏ hơn không" thì phải gọi điện — mà số
điện thoại chỉ hiện sau khi đã đặt đơn. Mọi câu hỏi *trước khi đặt* đều không có chỗ để hỏi.

Tài liệu này thiết kế một hệ thống nhắn tin thời gian thực giữa hai con người, theo kiểu Chợ Tốt:
thread theo cặp người dùng, tin nhắn ghim được sản phẩm hoặc đơn hàng, gửi ảnh, báo cáo tin xấu cho
admin, và ở đợt sau là ra giá riêng trong chat.

### Đây **không** phải chatbot FR-090

Dự án đã có một thứ tên là "chat": trợ lý AI tra cứu sản phẩm (FR-090…092), sống ở
`/api/v1/chat` và bảng `chat_messages`. Hai thứ hoàn toàn khác nhau và phải được giữ tách biệt —
cả trong code, trong URL, lẫn khi trình bày với giám khảo.

| | Chatbot (FR-090…092) | Chat người–người (tài liệu này) |
|---|---|---|
| Ai nói với ai | Khách ↔ hệ thống | Khách ↔ chủ stall |
| Đường dẫn | `/api/v1/chat` | `/api/v1/conversations` |
| Bảng | `chat_messages` | `conversations`, `messages`, … |
| Có trong đề | Có (Optional) | **Không** |

---

## 2. Cảnh báo về phạm vi — đọc trước khi duyệt

**Tính năng này không có trong đề và không có trong `.ai/REQUIREMENTS.md`.**

- **R-07** cấm làm tính năng không có trong REQUIREMENTS. Muốn làm thì QA/DOC phải thêm FR mới
  (bản đề xuất ở mục 4), chứ không phải cứ code rồi ghi vào sau.
- **R-02** chỉ cho LEAD sửa `db/schema.sql`. Mục 5 là **đề xuất schema**, không phải bản đã chốt.
- Chính prototype đã tự gắn cảnh báo lên màn `customer/messages.html`:
  *"Customer-to-Farmer messaging is not in the SRS or in .ai/REQUIREMENTS.md. R-07 says do not build
  what is not listed."*
- Tại thời điểm viết, **58 MUST đang 0 DONE**. Đây là hạng mục lớn hơn cả khối đơn hàng. Làm nó
  trước khi xong MUST là một đánh đổi có thật, và là quyết định của LEAD chứ không phải của người viết code.

Chủ dự án đã được báo và vẫn quyết làm. Tài liệu này viết ra để LEAD/QA có cái mà duyệt hoặc bác.

---

## 3. Hiện trạng

| Lớp | Có gì |
|---|---|
| Prototype | `customer/messages.html`, `farmer/messages.html` — đã vẽ danh sách thread và khung chat, kèm banner cảnh báo ngoài phạm vi |
| Frontend | `/messages` cho Customer, dữ liệu hardcode trong mảng `THREADS`. Farmer **không có** trang nào |
| Backend | Không có gì. `pom.xml` chưa có `spring-boot-starter-websocket` |
| Database | Không có bảng nào cho việc này |

Hai sự thật về nền tảng ảnh hưởng trực tiếp tới thiết kế:

1. **`users` thật có khoá chính `id BIGINT UNSIGNED`**, không phải `user_id INT` như `db/schema.sql`
   mô tả. Mọi khoá ngoại tới người dùng phải là `BIGINT UNSIGNED`.
2. **`farmer_profiles`, `products`, `orders` chưa tồn tại** — migration hiện mới tới `users`, `roles`,
   `refresh_tokens`, `chat_messages`, `user_social_accounts`, `admin_mfa`. Đây là lý do tính năng
   phải chia hai đợt.

Quy ước đang dùng trong code (CLAUDE.md ghi nhận là tạm, chờ LEAD chốt): đường dẫn `/api/v1`,
JSON **camelCase**, envelope `ApiResource{ success, message, data, error, traceId, timestamp }`,
controller kế thừa `BaseController`.

---

## 4. Đề xuất FR mới — gửi QA/DOC

Dùng dải FR-110 trở đi để không đụng FR-001…102 đang có.

| ID | Requirement | Nhãn | Vai | Đợt |
|---|---|---|---|---|
| FR-110 | Customer nhắn tin trực tiếp với một stall đã được duyệt; một cặp người dùng có đúng một cuộc hội thoại | MUST\* | Customer/Farmer | 1 |
| FR-111 | Tin nhắn tới nơi **thời gian thực**, không cần tải lại trang | MUST\* | Cả hai | 1 |
| FR-112 | Hiện **đang gõ**, **đã xem**, và **online / hoạt động lần cuối** | SHOULD | Cả hai | 1 |
| FR-113 | Số tin chưa đọc hiện trên header và tự cập nhật khi đang ở trang khác | MUST\* | Cả hai | 1 |
| FR-114 | Ghim một sản phẩm hoặc một đơn vào tin nhắn; từ trang sản phẩm/stall/đơn có nút nhắn thẳng cho stall | MUST\* | Customer | 1 |
| FR-115 | Gửi ảnh trong tin nhắn (jpg/png/webp, tối đa 5 MB) | SHOULD | Cả hai | 1 |
| FR-116 | Báo cáo một tin nhắn; admin xem tin bị báo cáo và ẩn được | MUST\* | Cả ba | 1 |
| FR-117 | Popover xem nhanh 3–4 mục từ header cho **thông báo** và cho **tin nhắn** | SHOULD | Cả hai | 1 |
| FR-118 | Farmer ra giá riêng cho một sản phẩm trong chat; khách chấp nhận hoặc từ chối | SHOULD | Cả hai | 2 |
| FR-119 | Giá đã chấp nhận còn hiệu lực được **server tự áp** khi khách đặt đơn | SHOULD | System | 2 |

\* MUST *trong phạm vi tính năng này*, không phải MUST của đề. Cả khối là phần thêm ngoài đề.

**Hai FR đang có cần sửa lời**, giống cảnh báo đã ghi trên `customer/become-farmer.html`:
FR-005 (RBAC) phải nói rõ một Farmer giữ nguyên mọi quyền của Customer, vì chat dựa trên điều đó.

---

## 5. Mô hình dữ liệu — đề xuất gửi LEAD

Thay đổi DB chỉ qua migration Flyway mới (**R-03**), đặt tên `V<yyyyMMdd><nnn>__<mo_ta>.sql`, không
sửa file đã merge. `dev` merge rất nhanh trong lúc viết tài liệu này (nhiều PR cùng ngày chiếm số version) — số cụ thể ghi
dưới đây (005, 006, 010) là số cuối cùng dùng thật cho Plan 1/2, không phải số dự kiến ban đầu. Người thực
thi Plan 3 phải tự soi lại migration mới nhất trên `dev` lúc đó, không copy số ghi sẵn ở đây. Hai PR trùng số thì người merge sau
đổi số của mình lên (CONTRIBUTING §7).

### 5.1 Đợt 1

```sql
-- V20260925005__create_conversations_table.sql
CREATE TABLE conversations (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_a_id      BIGINT UNSIGNED NOT NULL,   -- luôn giữ user_a_id < user_b_id
  user_b_id      BIGINT UNSIGNED NOT NULL,
  last_message_at    DATETIME NULL,          -- xếp thứ tự danh sách thread, khỏi join
  last_message_text  VARCHAR(160) NULL,      -- dòng xem trước
  user_a_read_at DATETIME NULL,              -- đọc tới đâu, để đếm chưa đọc
  user_b_read_at DATETIME NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_a_id) REFERENCES users(id),
  FOREIGN KEY (user_b_id) REFERENCES users(id),
  UNIQUE KEY uq_conversation_pair (user_a_id, user_b_id),
  INDEX idx_conv_a (user_a_id, last_message_at),
  INDEX idx_conv_b (user_b_id, last_message_at),
  CHECK (user_a_id < user_b_id)
) ENGINE=InnoDB;
```

**Khoá theo cặp người dùng, không theo vai.** Lý do: prototype đặt luật *"A Farmer is a Customer with
a stall"* — vai không loại trừ nhau. Nếu khoá theo `(customer_id, farmer_id)` thì hai chủ stall mua
qua lại của nhau sẽ sinh **hai thread giữa cùng hai con người**. Ai là "stall" trong thread được quyết
lúc hiển thị, theo vai của người đối diện và theo ngữ cảnh ghim trên từng tin nhắn.

```sql
-- V20260925006__create_messages_table.sql
CREATE TABLE messages (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  conversation_id BIGINT UNSIGNED NOT NULL,
  sender_id       BIGINT UNSIGNED NOT NULL,
  kind            ENUM('text','image','offer','system') NOT NULL DEFAULT 'text',
  body            VARCHAR(2000) NULL,
  -- Ngữ cảnh ghim. Để NULL và CHƯA đặt khoá ngoại: products/orders chưa tồn tại.
  -- Một migration sau sẽ thêm FK khi BE2 dựng xong hai bảng đó.
  product_id      BIGINT UNSIGNED NULL,
  order_id        BIGINT UNSIGNED NULL,
  hidden_at       DATETIME NULL,             -- admin ẩn; không xoá cứng bao giờ
  hidden_by       BIGINT UNSIGNED NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id),
  FOREIGN KEY (hidden_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_messages_conv (conversation_id, id)
) ENGINE=InnoDB;

-- Số version thật sự chọn lúc thực thi Plan 3 (soi migration mới nhất trên dev khi đó); minh hoạ dưới đây dùng V20260925011.
-- V20260925011__create_message_attachments_and_reports.sql
CREATE TABLE message_attachments (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  message_id  BIGINT UNSIGNED NULL,          -- NULL = vừa upload, chưa gắn vào tin nào
  uploader_id BIGINT UNSIGNED NOT NULL,
  storage_key VARCHAR(255) NOT NULL UNIQUE,  -- tên sinh ngẫu nhiên, KHÔNG phải tên người dùng đặt
  mime        VARCHAR(50) NOT NULL,
  size_bytes  INT NOT NULL,
  width       INT NULL,
  height      INT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id)  REFERENCES messages(id) ON DELETE CASCADE,
  FOREIGN KEY (uploader_id) REFERENCES users(id),
  INDEX idx_attach_orphan (message_id, created_at)   -- để dọn file upload rồi bỏ đó
) ENGINE=InnoDB;

CREATE TABLE message_reports (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  message_id  BIGINT UNSIGNED NOT NULL,
  reported_by BIGINT UNSIGNED NOT NULL,
  reason      ENUM('spam','abuse','scam','other') NOT NULL,
  note        VARCHAR(255) NULL,
  status      ENUM('new','reviewed','actioned') NOT NULL DEFAULT 'new',
  reviewed_by BIGINT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id)  REFERENCES messages(id) ON DELETE CASCADE,
  FOREIGN KEY (reported_by) REFERENCES users(id),
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uq_report_once (message_id, reported_by),   -- một người báo một lần
  INDEX idx_reports_status (status, created_at)
) ENGINE=InnoDB;

-- V20260925010__create_user_presence_table.sql
CREATE TABLE user_presence (
  user_id      BIGINT UNSIGNED PRIMARY KEY,
  last_seen_at DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;
```

**Khoá ngoại tới `users` để mặc định (RESTRICT), không CASCADE.** Tài khoản không bao giờ bị xoá
cứng — FR-072 chỉ kích hoạt / vô hiệu hoá. Nếu để CASCADE thì xoá một người sẽ cuốn theo cả lịch sử
hội thoại của người còn lại, mà người kia không làm gì sai.

```sql
```

**Vì sao presence vừa ở Redis vừa ở MySQL.** "Đang online ngay lúc này" là số kết nối đang mở của mỗi
user — giữ ở Redis, đếm lên khi `CONNECT`, đếm xuống khi `DISCONNECT`, nên mở hai tab không làm sai
trạng thái. "Hoạt động 12 phút trước" phải sống sót khi Redis bị xoá, nên ghi xuống `user_presence`
lúc ngắt kết nối, có tiết chế (không ghi quá một lần mỗi 60 giây cho mỗi user). "Đang gõ" chỉ là sự
kiện bay qua broker, không chạm cả hai.

### 5.2 Đợt 2 — chờ `products` và `orders`

```sql
CREATE TABLE price_offers (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  message_id  BIGINT UNSIGNED NOT NULL UNIQUE,   -- 1-1 với messages.kind = 'offer'
  product_id  BIGINT UNSIGNED NOT NULL,
  unit_price  DECIMAL(10,2) NOT NULL,
  quantity    INT NOT NULL,                      -- số lượng tối đa được hưởng giá này
  expires_at  DATETIME NOT NULL,
  status      ENUM('pending','accepted','declined','expired','spent') NOT NULL DEFAULT 'pending',
  responded_at DATETIME NULL,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(product_id),
  INDEX idx_offer_lookup (product_id, status, expires_at)
) ENGINE=InnoDB;
```

Một offer được chấp nhận **chính là** thoả thuận giá — không cần bảng thứ hai. Khi khách đặt đơn,
**server tự tra** `price_offers` đang `accepted` và còn hạn cho đúng cặp (khách, stall, sản phẩm),
rồi ghi giá đó vào `order_items.unit_price` (cột này vốn đã là snapshot) và chuyển offer sang `spent`.
**Client không bao giờ gửi giá lên** — nhận giá từ client là lỗ hổng, không phải tính năng.

Tiền vẫn trả tại stall khi nhận hàng. Offer chỉ đổi con số in trên đơn, không phải một giao dịch.
Điều này phải ghi lên UI bằng chữ.

**Tổng: 6 bảng mới — 5 bảng ở đợt 1** (`conversations`, `messages`, `message_attachments`,
`message_reports`, `user_presence`), **1 bảng ở đợt 2** (`price_offers`), gọn trong 4 file migration.

---

## 6. Hợp đồng API

Tất cả theo quy ước đang có: `/api/v1`, camelCase, `ApiResource`. Mọi endpoint đều yêu cầu đăng nhập.

### 6.1 Đợt 1

| Method | Path | Vai | Body / query | Trả về |
|---|---|---|---|---|
| GET | `/api/v1/conversations` | Thành viên | `?page=&size=` | Danh sách thread của chính mình, mới nhất trước |
| POST | `/api/v1/conversations` | Đã đăng nhập | `{ farmerUserId }` | Thread; **idempotent** — có rồi thì trả lại cái cũ. Ghim sản phẩm đi theo *tin nhắn đầu tiên*, không theo thread |
| GET | `/api/v1/conversations/{id}/messages` | Thành viên | `?before=<messageId>&size=30` | Phân trang keyset, mới nhất trước |
| POST | `/api/v1/conversations/{id}/messages` | Thành viên | `{ kind, body?, productId?, orderId?, attachmentId? }` | 201 + tin nhắn vừa tạo |
| POST | `/api/v1/conversations/{id}/read` | Thành viên | — | Đánh dấu đã đọc tới hiện tại |
| GET | `/api/v1/conversations/unread-count` | Thành viên | — | `{ count }` cho badge lúc tải trang đầu |
| POST | `/api/v1/attachments` | Thành viên | `multipart/form-data` | `{ attachmentId, url, width, height }` |
| GET | `/api/v1/attachments/{id}` | Thành viên | — | Trả file, **có kiểm quyền** |
| POST | `/api/v1/messages/{id}/report` | Thành viên | `{ reason, note? }` | 201 |
| GET | `/api/v1/admin/message-reports` | Admin | `?status=new&page=` | Danh sách tin bị báo cáo |
| PATCH | `/api/v1/admin/messages/{id}/hide` | Admin | — | Ẩn mềm, ghi `hiddenBy` + `hiddenAt` |

### 6.2 Đợt 2

| Method | Path | Vai | Body |
|---|---|---|---|
| POST | `/api/v1/conversations/{id}/offers` | Farmer | `{ productId, unitPrice, quantity, expiresAt }` |
| PATCH | `/api/v1/offers/{id}/accept` | Customer | — |
| PATCH | `/api/v1/offers/{id}/decline` | Customer | — |

### 6.3 Mã lỗi

| Mã | Khi nào |
|---|---|
| 400 | Body sai định dạng, `expiresAt` trong quá khứ |
| 401 | Chưa đăng nhập |
| 403 | Không thuộc thread · stall chưa được duyệt · tài khoản bị khoá · admin đọc tin chưa bị báo cáo · tự nhắn cho chính mình là 400 |
| 404 | Thread, tin nhắn hoặc ảnh không tồn tại |
| 409 | Offer đã được trả lời · offer hết hạn · stall bị đình chỉ nên không gửi được nữa |
| 413 | Ảnh quá 5 MB |
| 415 | Không phải jpg/png/webp |
| 429 | Gửi quá nhanh (xem mục 8.4) |

---

## 7. Thời gian thực

### 7.1 Quyết định cốt lõi: gửi bằng REST, phát bằng STOMP

Tin nhắn **không** gửi qua STOMP. Người dùng `POST` lên REST; server validate, kiểm quyền, ghi DB
trong một transaction, rồi mới phát sự kiện cho cả hai phía.

Lý do: qua STOMP thì không có mã HTTP, không dùng được `ApiResource`, không dùng lại được
`@ExceptionHandler` đang có, và lỗi "bạn không thuộc thread này" chỉ còn cách nhét vào một message
lỗi tự chế mà client phải tự đoán. Đi REST thì 403 / 409 / 413 / 429 hoạt động y hệt mọi endpoint
khác trong dự án. STOMP chỉ làm đúng một việc: **phát sự kiện đi**.

Ngoại lệ duy nhất đi *vào* bằng STOMP là "đang gõ", vì nó không chạm DB và mất một sự kiện cũng
không sao.

### 7.2 Broker: RabbitMQ

Endpoint WebSocket: `/ws`, WebSocket thuần, **không SockJS** (trình duyệt hiện đại đều hỗ trợ; thêm
SockJS chỉ thêm một lớp phải giải thích). Client dùng `@stomp/stompjs`.

```java
registry.enableStompBrokerRelay("/topic", "/queue")
        .setRelayHost(rabbitHost).setRelayPort(61613)
        .setClientLogin(user).setClientPasscode(pass)
        .setSystemLogin(user).setSystemPasscode(pass);
registry.setApplicationDestinationPrefixes("/app");
registry.setUserDestinationPrefix("/user");
registry.setUserDestinationBroadcast("/topic/unresolved-user");
registry.setUserRegistryBroadcast("/topic/user-registry");
```

Hai dòng `...Broadcast` cuối là thứ hay bị bỏ quên: thiếu chúng thì `/user/queue/...` **chỉ tới được
người đang nối vào đúng instance đã xử lý request** — mất đúng cái lý do chọn broker ngoài.

**Điều broker không làm:** Rabbit *không* cung cấp lịch sử tin nhắn. Lịch sử luôn đọc từ MySQL;
broker chỉ chuyển tin đang bay.

**Đã đo (Plan 2, Task 1):** nếu relay không kết nối được, backend **vẫn khởi động** — `StompBrokerRelayMessageHandler`
ghi lỗi và tự thử lại; REST hoạt động bình thường, chỉ realtime im lặng cho tới khi broker lên. Vẫn dùng
`depends_on: condition: service_healthy` + healthcheck cho rabbitmq để demo không có khoảng im lặng đó;
README mục Troubleshooting có ghi.

### 7.3 Xác thực trên WebSocket

JWT đặt ở header `Authorization: Bearer <token>` của frame **`CONNECT`**, kiểm trong một
`ChannelInterceptor` rồi gắn `Principal` cho phiên.

**Không truyền token qua query string** (`/ws?token=...`) — nó sẽ nằm nguyên trong log truy cập của
mọi proxy trên đường đi.

### 7.4 Destination: tất cả theo user, không theo thread

| Destination | Nội dung |
|---|---|
| `/user/topic/messages` | Tin nhắn mới; tin bị admin ẩn |
| `/user/topic/conversations` | Thread nhảy lên đầu; số chưa đọc đổi; đối phương đã xem |
| `/user/topic/typing` | Đối phương đang gõ |
| `/user/topic/presence` | Đối phương online / offline kèm `lastSeenAt` |

> Sửa 26/09/2026 theo code thật (`StompChatEventPublisher`): dùng `/topic/*` qua `convertAndSendToUser` thay vì `/queue/*`, vì trên RabbitMQ `/queue/<x>` tạo queue durable không tự xoá — mỗi phiên WebSocket để lại queue mồ côi.

Vào: chỉ `/app/typing` với `{ conversationId, typing }`. Server kiểm tư cách thành viên rồi chuyển
tiếp cho người kia. Online/offline suy ra từ `CONNECT`/`DISCONNECT`, không ai gửi gì cả.

**Cố ý không dùng `/topic/conversations/{id}`.** Một topic như vậy thì ai cũng subscribe được nếu
không tự viết thêm lớp kiểm tra thành viên lúc `SUBSCRIBE` — đúng kiểu lỗ hổng "đổi id trên URL" mà
`docs/api-contract.md` cảnh báo ở cuối file. Gửi theo `/user/...` thì server đã biết hai người trong
thread là ai và tự đẩy cho đúng hai người: **không có ACL nào để viết sai**.

### 7.5 Ranh giới để đổi broker sau này

Việc phát sự kiện nằm sau một interface (`ChatEventPublisher`) với một cài đặt duy nhất dùng
`SimpMessagingTemplate`. Không service nghiệp vụ nào gọi thẳng `SimpMessagingTemplate`. Đổi sang
simple broker hoặc tách service về sau là thay một class, không phải viết lại.

---

## 8. Phân quyền và trường hợp biên

### 8.1 Ai được làm gì

| Tình huống | Xử lý |
|---|---|
| Mở thread với stall `approved` | Cho |
| Stall `pending` (chưa duyệt) | 403 — "This stall is not open yet". Tài liệu `docs/MarketLink-Farmer-Profile-and-Approval.md` của BE chỉ có `PENDING / APPROVED / SUSPENDED`, không có `rejected` |
| Stall bị `suspended` (D-09) | Thread cũ **đọc được**, không gửi thêm được (409). Đúng tinh thần D-09: không cắt ngang việc đang dở của khách |
| `users.status` ≠ `active` | Không gửi, không mở thread mới |
| Khách vãng lai | Không có chat. Nút "Message this stall" đưa sang trang đăng nhập |
| Mọi endpoint có `{id}` | Kiểm tư cách thành viên **trước khi** trả dữ liệu (R-06) |

### 8.2 Ảnh — chỗ dễ hở nhất

Ảnh **không** phục vụ như file tĩnh theo đường dẫn đoán được. `storage_key` sinh ngẫu nhiên và ảnh
chỉ ra qua `GET /api/v1/attachments/{id}`, endpoint này kiểm tư cách thành viên y như khi đọc tin
nhắn. Nếu để `/uploads/abc.jpg` chạy thẳng qua web server thì bất kỳ ai có link đều xem được ảnh
riêng tư của người khác.

Lưu trên một Docker volume (`chat-uploads`), đường dẫn lấy từ biến môi trường `CHAT_UPLOAD_DIR`.
Không dùng dịch vụ ngoài — cùng lý do D-12 chọn OpenStreetMap thay Google Maps: không cần tài khoản,
không hết hạn mức giữa lúc demo, không phải nhét API key vào source nộp cho giám khảo.

Kiểm tra khi upload: phần mở rộng **và** magic bytes (không tin `Content-Type` client gửi), tối đa
5 MB, chỉ jpg/png/webp. Ảnh upload rồi không gắn vào tin nhắn nào trong 24 giờ thì job dọn đi.

### 8.3 Admin đọc tin nhắn tới đâu

**Admin chỉ đọc được tin đã bị báo cáo**, cùng tối đa 5 tin liền trước và 5 tin liền sau để hiểu ngữ
cảnh. **Không có màn "duyệt toàn bộ hộp thư".** Mỗi lần ẩn ghi lại `hiddenBy` và `hiddenAt`.

Đây là chính sách, không phải kỹ thuật, nên cần LEAD/QA gật và phải vào **phần Assumptions của
ReadMe** như đề yêu cầu.

### 8.4 Chống lạm dụng

`bucket4j-redis` **đã có sẵn trong `pom.xml`** — dùng luôn, không thêm thư viện. Hạn mức đề xuất:
30 tin/phút và 10 ảnh/giờ cho mỗi user; vượt thì 429. Mở thread mới: 20/giờ, chặn spam rải tin.

### 8.5 Những thứ cố tình không làm

- **Người gửi không xoá được tin.** Xoá được nghĩa là xoá được bằng chứng lừa đảo. Chỉ admin ẩn.
- **Không sửa tin đã gửi.**
- **Không chặn người dùng.** Đã có báo cáo; thêm block là thêm một trạng thái nữa phải kiểm ở mọi chỗ.
- **Không nhóm chat.** Chat là giữa đúng hai người.

Cả bốn thứ này cắt được mà không ai thấy thiếu, và thêm sau vẫn kịp.

---

## 9. Giao diện

### 9.1 Header: hai biểu tượng, không gộp

Guide `NotificationList` của design system đã viết sẵn *"opened from the bell in SiteHeader"* — popover
chuông vốn là ý định của design system, code hiện tại mới là bên đi chệch khi chỉ link thẳng sang trang.

| | Chuông | Bong bóng tin nhắn (mới) |
|---|---|---|
| Nội dung | Thông báo hệ thống (FR-041, FR-042, D-11) | 3–4 thread gần nhất: tên stall, dòng cuối, giờ, chấm chưa đọc |
| Bấm vào | `/notifications` | `/messages` |

Gộp chung thì "Đơn ML-0421 sẵn sàng lấy" nằm lẫn với "Cô Tư: còn 5 bó thôi em" — cả hai đều khó quét
mắt, và FR-042 là MUST còn chat thì không.

Popover mở bằng **hover *và* click/phím** — hover-only là hỏng trên điện thoại và với bàn phím. Đóng
bằng `Esc` hoặc click ra ngoài. Nút mang `aria-expanded`. Panel dùng `shadow-pop` và `--z-dropdown`
(50), nằm trên header (40).

### 9.2 Trang tin nhắn — Customer

Thay ruột của `/messages` (hiện hardcode `THREADS`) bằng dữ liệu thật, giữ layout.

- Desktop: hai cột — danh sách thread trái, hội thoại phải.
- **375px: hai màn riêng** — danh sách, bấm vào mới mở hội thoại, có nút quay lại. Nhồi hai cột vào
  375px là không đọc được.
- Đầu hội thoại: tên stall, chấm online hoặc "Active 12 minutes ago", link sang trang stall.
- Ô soạn có nút đính ảnh. Đang gõ hiện ba chấm. Tin của mình có dấu đã xem.

### 9.3 Trang tin nhắn — Farmer

Chưa có trong app, prototype đã vẽ. Dùng dashboard shell (sidebar xanh), mục "Messages" có badge số
chưa đọc. Dùng lại đúng component hội thoại của Customer; chỉ khác vỏ ngoài và nút **"Make an offer"**
(đợt 2).

### 9.4 Kiểm duyệt — Admin

Thêm tab **"Reported messages"** vào màn `admin/moderation.html` đang có (hiện làm listing và review).
Mỗi dòng: tin bị báo, lý do, ai báo, vài tin xung quanh, nút Ẩn. Trên màn ghi thẳng bằng chữ rằng
admin chỉ đọc được tin đã bị báo cáo — để chính admin biết ranh giới của mình.

### 9.5 Lối vào chat

Nút "Message this stall" ở trang sản phẩm, trang stall, và chi tiết đơn. Bấm từ trang sản phẩm thì
sản phẩm đó được ghim sẵn vào ô soạn.

### 9.6 Bắt buộc với mọi màn

Đủ 4 trạng thái FR-084 (`DataState`: loading / empty / error / có dữ liệu); 375 / 768 / 1440 không
tràn ngang (FR-080); copy tiếng Anh, sentence case, nút bị khoá luôn kèm lý do bằng chữ; tiền `₫`,
ngày `dd/MM/yyyy`, giờ 24h qua `src/lib/format.ts`.

---

## 10. Design system: một component còn thiếu

`ChatMessage` hiện có là **của trợ lý AI** — guide của nó nói rõ mỗi câu bot phải kèm nhãn
"Intent: …" (FR-092). Chat người-với-người cần component riêng: bong bóng hai phía, avatar, giờ,
trạng thái đã xem, ô ghim sản phẩm/đơn, ảnh.

Đây là **thêm component vào design system**, thuộc FE1. Theo `frontend/CLAUDE.md` thì không được sửa
tay `marketlink-components.css` — phải đổi ở design system rồi sinh lại cả ba file
(`tokens.json`, `marketlink-theme.css`, `marketlink-components.css`) cùng lúc.

Việc cần làm: soạn guide `docs/design-system/components/MessageBubble.md` + markup mẫu, FE1 đưa vào
design system và sinh lại. **Đây là phụ thuộc chặn phần UI** — không có component thì không dựng được
màn đúng chuẩn.

---

## 11. Prototype phải cập nhật

| File | Việc |
|---|---|
| `customer/messages.html` | Bỏ banner "ngoài phạm vi", thêm ảnh, đã xem, online, ghim sản phẩm |
| `farmer/messages.html` | Như trên, thêm nút Make an offer |
| `admin/moderation.html` | Tab "Reported messages" |
| `prototype.js` | Popover chuông + popover tin nhắn cho cả ba vai |
| `public/product.html`, `public/stall.html`, `customer/order.html` | Nút "Message this stall" |
| `index.html` | Cập nhật bảng phủ FR và danh sách câu hỏi mở |

---

## 12. Hạ tầng

### 12.1 Docker

Thêm service `rabbitmq` vào `docker-compose.yml` và `docker-compose.prod.yml`:

- Image có bật plugin **`rabbitmq_stomp`** (image mặc định **không** bật — cần file `enabled_plugins`
  hoặc image tự dựng).
- Cổng: 5672 (AMQP), **61613 (STOMP)**, 15672 (UI quản trị) — UI chỉ bật ở profile `tools`, cùng chỗ
  với adminer và redisinsight.
- Volume `rabbitmq-data`, healthcheck `rabbitmq-diagnostics -q ping`.
- Backend `depends_on: rabbitmq: condition: service_healthy`.
- **Production không mở cổng nào ra ngoài**, giống mysql và redis hiện nay.
- Thêm volume `chat-uploads` cho ảnh.

### 12.2 Biến môi trường

Theo CONTRIBUTING §6, thêm biến mới là cập nhật **cùng lúc** `.env.example`,
`.env.production.example`, `application-dev.yaml`, `application-prod.yaml`, và hai file compose.

| Biến | Dev | Prod |
|---|---|---|
| `RABBITMQ_HOST` | `rabbitmq` | `rabbitmq` |
| `RABBITMQ_STOMP_PORT` | `61613` | `61613` |
| `RABBITMQ_USER` / `RABBITMQ_PASSWORD` | giá trị mẫu | **bắt buộc truyền vào, không có mặc định** |
| `CHAT_UPLOAD_DIR` | `/var/lib/marketlink/chat` | như dev |
| `CHAT_MAX_UPLOAD_BYTES` | `5242880` | như dev |
| `VITE_WS_URL` | `ws://localhost:8080/ws` | theo domain thật |

### 12.3 Phụ thuộc mới

- Backend: `spring-boot-starter-websocket`.
- Frontend: `@stomp/stompjs`.

---

## 13. Kiểm thử

**Unit (bắt buộc theo Definition of Done điều 6):**

- Mở thread: idempotent — gọi hai lần trả về cùng một thread.
- Mở thread với stall `pending` / `rejected` → 403; stall `suspended` → đọc được, gửi 409.
- Không phải thành viên đọc thread → 403 (thử bằng cách đổi id, đúng kiểu giám khảo sẽ thử).
- Đếm chưa đọc đúng sau khi gửi, sau khi đọc.
- Cặp `(user_a_id, user_b_id)` luôn được chuẩn hoá theo thứ tự, không tạo được hai thread cho cùng cặp.
- Upload sai mime / quá cỡ → 415 / 413. Ảnh của thread khác → 403.
- Rate limit chạm ngưỡng → 429.
- Đợt 2: offer hết hạn không áp được; offer đã `spent` không dùng lại được; giá client gửi lên bị bỏ qua.

**Tích hợp:** các endpoint REST chạy với MySQL trong container (`make be-test`).

**Phần realtime:** kiểm bằng cách mock `ChatEventPublisher` và khẳng định đúng sự kiện được phát tới
đúng người — **không** dựng broker thật trong unit test. Đường đi thật qua Rabbit kiểm bằng một kịch
bản tay ghi trong README: hai trình duyệt, hai tài khoản, gửi và thấy tin hiện ngay.

**Lint/format:** `make lint` và `make be-test` phải xanh trước khi mở PR.

---

## 14. Thứ tự làm

Đợt 1 chia thành các lát cắt dọc, mỗi lát là một PR dưới ~400 dòng theo CONTRIBUTING §3:

1. Migration + entity + repository (4 bảng).
2. REST đọc: danh sách thread, đọc tin, đếm chưa đọc. Chưa có realtime.
3. REST ghi: mở thread, gửi tin text, đánh dấu đã đọc.
4. Hạ tầng WebSocket: RabbitMQ vào compose, cấu hình relay, xác thực `CONNECT`, `ChatEventPublisher`.
5. Sự kiện realtime: tin mới, thread nhảy lên đầu, số chưa đọc.
6. Presence + đang gõ + đã xem.
7. Ảnh: upload, phục vụ có kiểm quyền, job dọn file rác.
8. Báo cáo + màn kiểm duyệt của admin.
9. Component `MessageBubble` vào design system (**FE1**, có thể chạy song song từ bước 1).
10. UI Customer, UI Farmer, hai popover header.
11. Prototype cập nhật theo.

Đợt 2 (`price_offers`) **chỉ bắt đầu được sau khi** BE2 hoàn thành `products` và `orders`.

---

## 15. Việc cần người khác quyết

| # | Việc | Ai quyết |
|---|---|---|
| 1 | Chấp nhận làm tính năng ngoài phạm vi đề, trước khi 58 MUST xong | LEAD |
| 2 | Thêm FR-110…119 vào `.ai/REQUIREMENTS.md` | QA/DOC |
| 3 | Đưa 5 bảng mới vào `db/schema.sql` (R-02) | LEAD |
| 4 | Chính sách "admin chỉ đọc tin bị báo cáo" → Assumptions trong ReadMe | LEAD + QA |
| 5 | Thêm RabbitMQ vào stack nộp bài và vào hướng dẫn cài đặt bắt buộc | LEAD |
| 6 | Component `MessageBubble` vào design system | FE1 |
| 7 | Sửa lời FR-005 để nói rõ Farmer giữ quyền Customer | QA/DOC |
| 8 | Chốt `/api/v1` + camelCase hay `/api` + snake_case (đang treo từ trước) | LEAD |

---

## 16. Rủi ro

| Rủi ro | Mức | Giảm nhẹ |
|---|---|---|
| Rabbit không lên → realtime im lặng (REST vẫn chạy — đã đo ở Plan 2) | Trung bình | Healthcheck + `depends_on`, Troubleshooting, tập chạy trước buổi demo |
| Tính năng ngoài đề ăn mất thời gian của 58 MUST | Cao | Quyết định của LEAD; đợt 2 vốn đã bị chặn bởi MUST nên tự giãn ra |
| Chat bị lẫn với chatbot FR-090 khi trình bày | Trung bình | Khác URL, khác bảng, khác màn; nói rõ trong ReadMe và khi demo |
| Ảnh riêng tư lộ qua đường dẫn tĩnh | Trung bình | Phục vụ qua endpoint có kiểm quyền, `storage_key` ngẫu nhiên |
| Ghim sản phẩm/đơn chưa có khoá ngoại, dễ thành dữ liệu mồ côi | Thấp | Migration bổ sung FK ngay khi `products`/`orders` xuất hiện; ghi vào mục 14 |
