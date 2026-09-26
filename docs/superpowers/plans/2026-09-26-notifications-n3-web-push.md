# Thông báo realtime — N3 Web Push · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Người dùng đã cho phép thông báo trình duyệt vẫn nhận thông báo khi đã đóng hết tab MarketLink.

**Architecture:** Trình duyệt đăng ký Push API (khoá VAPID public của server) rồi gửi subscription lên `POST /notifications/push-subscriptions`. Khi `dispatch` đẩy một khung, `PushAwareDelivery` luôn đẩy STOMP; nếu người nhận **không online** (PresenceService) và `alert.browser` bật thì `WebPushSender` gửi Web Push (RFC 8291 + RFC 8292, thư viện `nl.martijndwars:web-push` 5.1.1 — spike đạt trên Java 25) tới mọi thiết bị của họ, bất đồng bộ. 404/410 → xoá subscription. Service worker nhận `push` và hiện thông báo.

**Tech Stack:** Spring Boot 4 · Java 25 · web-push 5.1.1 + BouncyCastle `bcprov-jdk18on` · Push API + service worker.

**Spec:** `docs/superpowers/specs/2026-09-25-realtime-notifications-design.md` (§2, §6, §7, §8, §11). Nền: N1 (#130), N2 (#135).

## Global Constraints

- Khoá VAPID lấy từ env `VAPID_PUBLIC_KEY` (base64url, điểm P-256 không nén 65 byte), `VAPID_PRIVATE_KEY` (base64url 32 byte), `VAPID_SUBJECT` (`mailto:`). Thiếu khoá → push tắt, log một dòng lúc khởi động, `GET /notifications/push/public-key` trả `{ publicKey: null }`, mọi thứ khác chạy như N2.
- Migration `V20260926004__create_push_subscriptions_table.sql` (dev đang ở `V20260926003`).
- Gửi push không bao giờ làm hỏng request gây ra nó: executor riêng, lỗi chỉ log.
- Payload push `{ kind, title, message, link, tag }` — không gửi thêm dữ liệu cá nhân.
- Test backend chạy bằng `SP/be-verify.sh` (DB `ml_notify_test`), frontend bằng `SP/fe-check.sh`.

## Review Focus

1. **Người dùng đăng xuất trên máy dùng chung** → subscription của máy đó bị xoá, không còn nhận thông báo của người cũ — Task 5.
2. **Hai tài khoản lần lượt đăng nhập cùng trình duyệt** → endpoint chuyển chủ, người trước không nhận nữa — Task 2.
3. **Subscription hết hạn (410)** → bị xoá, lần sau không gửi lại — Task 3.
4. **Đang online (có tab mở)** → không gửi push trùng với toast/OS notification của N2 — Task 4.
5. **Server chưa có khoá VAPID** → app vẫn chạy, không lỗi 500 — Task 1.

---

### Task 1: Cấu hình VAPID
- `WebPushProperties` (`app.push.vapid-public-key`, `vapid-private-key`, `subject`), `WebPushConfig`: đăng ký BouncyCastle provider; bean `Optional<PushService>` rỗng khi thiếu khoá; log `Web Push: disabled (no VAPID keys)` / `enabled`.
- `GET /api/v1/notifications/push/public-key` → `{ publicKey }` hoặc `null`.
- Test: không khoá → endpoint `null`; có khoá (sinh trong test) → trả đúng khoá.

### Task 2: Bảng + API subscription
- Migration 004 `push_subscriptions(id, user_id FK CASCADE, endpoint VARCHAR(500) UNIQUE, p256dh, auth, user_agent, created_at, last_used_at)`.
- `POST /api/v1/notifications/push-subscriptions` `{ endpoint (https?:// ≤500), keys: { p256dh, auth } }` → upsert theo endpoint (đổi chủ nếu đã có); `DELETE …` `{ endpoint }` → xoá nếu là của mình (của người khác → 204 im lặng, không lộ).
- Test HTTP: tạo, gọi lại cùng endpoint không nhân đôi, người thứ hai đăng ký cùng endpoint thì chuyển chủ, xoá, thiếu key → 400.

### Task 3: `WebPushSender`
- `send(Long userId, NotificationPayload p)` → với mỗi subscription: `PushService.send(new Notification(endpoint, p256dh, auth, json), AES128GCM)` trên executor `webPushExecutor` (2 luồng). 201/200/202 → `last_used_at = now`; 404/410 → xoá; khác → log.
- Test với `HttpServer` giả: 201 cập nhật `last_used_at`, 410 xoá dòng, payload giải mã được bằng khoá của "trình duyệt" giả (round-trip RFC 8291).

### Task 4: `PushAwareDelivery`
- `@Primary NotificationDeliveryInterface`: luôn gọi `StompNotificationDelivery`; nếu push bật, `alert.browser` và `!presence.snapshot([u]).online` → `WebPushSender.send`.
- Test Mockito: online → chỉ STOMP; offline + browser → cả hai; offline + browser tắt → chỉ STOMP; push tắt → chỉ STOMP.

### Task 5: Frontend
- `sw.js`: `push` → `showNotification(title, { body, tag, data: { link } })`.
- `browser.ts`: `syncPushSubscription()` (có quyền + có public key → `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })` → POST), `dropPushSubscription()` (DELETE rồi `unsubscribe()`).
- Gọi `syncPushSubscription` khi: vừa cho quyền (banner, Settings), và khi có phiên + quyền đã `granted` (NotificationCenter). `useLogout` gọi `dropPushSubscription` trước khi xoá phiên.
- `NotificationApi`: `pushPublicKey`, `subscribePush`, `unsubscribePush`.

### Task 6: Env + tài liệu
- `.env.example` (+ `.env.production.example` nếu có) 3 biến rỗng; `docker-compose.yml` backend truyền vào; `application.yaml` `app.push.*: ${VAPID_…:}`; `scripts/check-env-separation.sh` nếu nó liệt kê biến.
- `Makefile` `vapid-keys`: sinh cặp khoá bằng `node:crypto` trong container frontend, in ra để dán vào `.env`.
- README: bật Web Push, HTTPS bắt buộc ngoài localhost, iOS cần "Thêm vào màn hình chính". `docs/api-contract.md` §9: 3 endpoint mới.

### Task 7: Kiểm đầu–cuối
- Full suite backend + fe-check + `vite build`.
- Stack e2e (:8092) có khoá VAPID: script Node đăng ký subscription trỏ tới một push service giả (HTTP server trong script, khoá ECDH của "trình duyệt" tự sinh), **không** mở STOMP (offline) → admin đăng thông báo → push service giả nhận POST `aes128gcm` có `Authorization: vapid …` → **giải mã được** đúng tiêu đề. Rồi mở STOMP (online) → đăng tiếp → không nhận push.
- Push `feature/FR-042-notifications-n3`, PR (base `dev` sau khi #135 merge; nếu chưa thì base `feature/FR-042-notifications-n2`).
