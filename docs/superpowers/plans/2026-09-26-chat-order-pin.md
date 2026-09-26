# Chat — ghim đơn vào tin nhắn (phần "đơn" của FR-114)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Khách nhắn cho sạp từ một đơn của mình, đơn đó được ghim vào tin; server chỉ nhận ghim đơn thuộc đúng hai người trong thread.

**Architecture:** Backend chat kiểm `orderId` bằng cách **đọc** `OrderRepository` và `FarmerProfileRepository` (không sửa module order). Frontend dùng lại khuôn của ghim sản phẩm ở 4B (`ProductPin`, `pinnedProductId`, `?product=`), thêm `OrderPin` và `?order=`, gọi `GET /api/v1/orders/{id}` qua client của module order (C5 task 5.8, phiên core-commerce) — **không** tự tạo `order.requests.ts`.

**Tech Stack:** Spring Boot 4.1 / Java 25 / JUnit 5 + Mockito · React 19 / Vitest 5.

**Spec:** `docs/superpowers/specs/2026-09-25-farmer-customer-chat-design.md` §4 (FR-114), §6.1, §9.5. Plan trước: `2026-09-26-chat-4b-moderation-header-entry.md` (PR #154).

**Quyết định của người dùng (26/09):** làm phần không phụ thuộc C5 ngay; tách nhánh frontend từ `dev` **sau khi** #154 merge.

## Global Constraints

Như plan 4B (token Tailwind, i18n 10 ngôn ngữ gộp không ghi đè, `Helper.cn` không gộp class xung đột, R-05/R-06, không dựng stack Docker; test backend bằng container dùng-một-lần `market-link-backend:dev`).

## Review Focus

1. **Ghim đơn của người khác** — khách A gửi `orderId` là đơn của khách B (hoặc của sạp khác) vào thread của mình. Kỳ vọng: 403, tin **không** được ghi. → Task 1 `refusesToPinAnOrderOfSomeoneElse`, `refusesToPinAnOrderFromAnotherStall`.
2. **Đơn không tồn tại** → 404, không ghi tin. → Task 1 `refusesToPinAnOrderThatDoesNotExist`.
3. **Farmer ghim đơn của khách trong thread với chính khách đó** — hợp lệ (đơn thuộc đúng cặp). → Task 1 `letsTheStallPinTheCustomersOrderToo`.
4. **Đơn không còn đọc được** (bị huỷ, API lỗi) → thẻ ghim hiện câu thay thế, không vỡ bong bóng. → Task 3.

## Chặn / ngoài phạm vi

| Việc | Chờ |
|---|---|
| Thẻ ghim đọc chi tiết đơn | `GET /api/v1/orders/{id}` + client của C5 (task 5.8) vào `dev` |
| Nút "Message this stall" trên trang chi tiết đơn | Trang `customer/OrderDetail` nối API thật (task x.5 của C5, giao cho bạn của người dùng) — hiện là màn WIP dữ liệu mẫu |

---

### Task 1: Server chỉ nhận ghim đơn thuộc đúng hai người trong thread (R-06)

**Files:**
- Create: `backend/.../conversation/exceptions/OrderNotInConversationException.java`
- Modify: `backend/.../conversation/services/impl/MessageService.java`, `controllers/ConversationExceptionHandler.java`
- Test: `backend/.../conversation/services/impl/MessageServiceTest.java`
- Modify: `docs/api-contract.md` (dòng `POST /conversations/{id}/messages`)

**Interfaces:** `POST /conversations/{id}/messages` với `orderId`: đơn không có → **404** "Order not found."; đơn không thuộc cặp (khách của đơn, chủ stall của đơn) = hai người của thread → **403** "This order is not part of this conversation."

- [ ] Bước 1 · Test đỏ trong `MessageServiceTest` (mock `OrderRepository`, `FarmerProfileRepository`): 4 test ở Review Focus 1–3 + tin có đơn hợp lệ lưu đúng `orderId`.
- [ ] Bước 2 · Chạy thấy đỏ (constructor/ngoại lệ chưa có).
- [ ] Bước 3 · Code: trong `send()`, sau `policy.assertCanSend`, **trước** `messages.save`: nếu `request.orderId() != null` thì `requireOrderOfThisPair(conversation, request.orderId())`. Ngoại lệ mới → 403 trong `ConversationExceptionHandler` (cùng chỗ `ConversationAccessDeniedException`).
- [ ] Bước 4 · Chạy thấy xanh; `spotless:apply`.
- [ ] Bước 5 · Contract + commit `fix(FR-114): only pin an order that belongs to the two people in the thread`.

### Task 2: Tầng dữ liệu + ghim đơn trong ô soạn (sau khi #154 merge)

- `SendBody`/`send(body, extra)` nhận `orderId`; `MessageStallButton` nhận `orderId?` → `/messages?c=&order=`; `MessagesLayout` đọc `order`; `Composer` hiện chip ghim đơn (giống ghim sản phẩm, gỡ được, đi theo **một** tin).
- Test: `useChat` gửi `{ body, orderId }`; `Composer` hiện/gỡ chip đơn, gửi xong chip mất; `MessageStallButton` điều hướng kèm `order`.

### Task 3: `OrderPin` (sau khi client `GET /orders/{id}` của C5 vào dev)

- `OrderPin({ orderId })`: mã đơn, ngày + khung giờ nhận (`formatDate`, `formatClock`), tổng tiền qua `lib/format`, link sang chi tiết đơn theo vai; lỗi/404 → `chat.orderGone`. `MessageBubble` hiện `OrderPin` khi `message.orderId`.
- Phiên core-commerce trả lời 26/09: `OrderApi.get(id: number): Promise<OrderDetailDto>` (default export `OrderApi`, file `api-requests/order.requests.ts`, C5 task 5.8). Trường cần nằm ở `summary`: `orderId, orderCode, status ('placed'|'accepted'|'declined'|'ready'|'completed'|'cancelled'), farmerId, stallName, marketName, pickupDate ('yyyy-MM-dd'), pickupStart/pickupEnd ('HH:mm'), totalAmount`. Quyền đọc: người mua hoặc chủ stall; khác → 403, không có → 404. `pickupStart` là `"HH:mm"` → **dùng `formatClock`** (đúng kiểu nó nhận), `pickupDate` là ngày không giờ → `formatDate(new Date(y, m-1, d))`, không `new Date('yyyy-MM-dd')` (bị lệch múi giờ UTC).

### Task 4: i18n 10 ngôn ngữ, prototype, PR

- Key mới dưới `chat.` (gộp, không ghi đè); cập nhật `docs/prototype/customer/order.html` (bỏ khoá nút khi trang đơn thật có).
