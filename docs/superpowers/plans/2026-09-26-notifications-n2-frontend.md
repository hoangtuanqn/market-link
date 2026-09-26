# Thông báo realtime — N2 Frontend · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Người dùng đang mở MarketLink thấy thông báo ngay lúc nó xảy ra (toast khi đang nhìn tab, thông báo hệ điều hành khi tab ẩn), chuông và trang thông báo dùng dữ liệu thật, được mời bật quyền sau đăng nhập, chỉnh đủ cài đặt, và admin đăng thông báo thật.

**Architecture:** Một client STOMP dùng chung (`lib/realtime`) mở khi có phiên, đóng khi đăng xuất, lấy token mới trước mỗi lần nối lại. Một store nhỏ (`useSyncExternalStore`, như `useSession`) giữ số chưa đọc và phát sự kiện "có thông báo mới" cho trang danh sách. `NotificationCenter` (mount một lần trong `App`) nghe `/user/topic/notifications` và quyết định toast / OS notification theo `alert` server gửi. Service worker `public/sw.js` hiện OS notification và xử lý bấm (N3 thêm `push`).

**Tech Stack:** React 19 · TypeScript · Vite · Tailwind 4 · react-router 7 · sonner · i18next · `@stomp/stompjs` (mới).

**Spec:** `docs/superpowers/specs/2026-09-25-realtime-notifications-design.md` (§8). Backend: PR #130 (N1).

## Global Constraints

- Mọi chữ mới vào `locales/<lang>/*.json` đủ 10 ngôn ngữ `en vi zh ja ko fr es de th id`; vi: stall = "sạp", Farmer = "nhà vườn". Tiếng Anh sentence case, không emoji, không dấu chấm than.
- Màu chỉ bằng token utility; component `ml-*`/`components/ui`; spacing theo token (không `p-5`, `p-[18px]`).
- Mọi màn có dữ liệu có 4 trạng thái (FR-084) bằng `DataState`; responsive 375/768/1440, không tràn ngang.
- API: `/api/v1/notifications…`, `/api/v1/admin/announcements…`, `/api/v1/announcements/active` đúng `docs/api-contract.md` §9/§10.
- STOMP: `ws(s)://<VITE_API_URL host>/ws`, header CONNECT `Authorization: Bearer <access token>`, subscribe `/user/topic/notifications`.
- `localStorage` luôn bọc try/catch (private window).
- Kiểm tra mỗi task: `prettier --check`, `eslint .`, `tsc -b` trong image `market-link-frontend:dev` (lệnh `SP/fe-check.sh`). Frontend chưa có test runner — kiểm hành vi bằng trình duyệt ở Task 9.

## Review Focus

1. **Token hết hạn khi đang mở lâu** → lần nối lại phải dùng token mới (refresh qua axios), không vòng lặp nối lại với token cũ — Task 1.
2. **Đăng xuất / đổi tài khoản trong tab khác** → client STOMP đóng, không còn nhận thông báo của người cũ — Task 1 + Task 9.
3. **Nhiều tab cùng mở** → mỗi tab có toast khi đang nhìn, OS notification dùng `tag` nên chỉ còn một — Task 3.
4. **Đang mở đúng đoạn chat** (`?c=<id>` trên `/messages` hoặc `/farmer/messages`) → không popup tin của đoạn đó — Task 3.
5. **Trình duyệt không hỗ trợ / đã chặn quyền** → banner không hiện, Settings nói rõ trạng thái và cách mở lại, toast vẫn chạy — Task 5 + Task 6.

---

## File Structure

```
frontend/package.json                                 + @stomp/stompjs
frontend/public/sw.js                                 service worker: notificationclick (N3 thêm push)
frontend/src/types/notification.types.ts              NotificationItem, NotificationFrame, NotificationPreferences, Announcement
frontend/src/api-requests/notification.requests.ts    NotificationApi (list, unreadCount, read, readAll, prefs, test)
frontend/src/api-requests/announcement.requests.ts    AnnouncementApi (live, adminList, create, update, remove)
frontend/src/lib/realtime/stompClient.ts              client dùng chung: start(), stop(), subscribe(dest, cb)
frontend/src/lib/notifications/store.ts               unreadCount + listeners "frame mới" (useSyncExternalStore)
frontend/src/lib/notifications/browser.ts             hỗ trợ?, permission, register SW, showOsNotification, beep
frontend/src/hooks/useUnreadNotifications.ts          số trên chuông
frontend/src/components/notifications/NotificationCenter.tsx      mount trong App: nối STOMP, toast/OS
frontend/src/components/notifications/NotificationPermissionBanner.tsx
frontend/src/components/notifications/NotificationSettingsCard.tsx
frontend/src/components/notifications/NotificationList.tsx        dùng chung cho /notifications và /farmer/notifications
frontend/src/pages/customer/Notifications/index.tsx   → dùng NotificationList
frontend/src/pages/farmer/Notifications/index.tsx     → dùng NotificationList
frontend/src/components/settings/SettingsPanel.tsx    bỏ khối note.* → NotificationSettingsCard
frontend/src/layout/MainLayout.tsx · FarmerLayout.tsx · AdminLayout.tsx   chuông đọc store; banner xin quyền; banner public từ API
frontend/src/pages/admin/Announcements/index.tsx      API thật
frontend/src/App.tsx                                  <NotificationCenter />
frontend/src/locales/*/common.json · CustomerNotifications.json · FarmerNotifications.json · AdminAnnouncements.json
```

---

### Task 0: Công cụ kiểm tra

- [ ] `SP/fe-check.sh`: `docker run --rm -v <worktree>/frontend:/work --entrypoint sh market-link-frontend:dev -c "cd /work && ln -sfn /app/node_modules node_modules && npx prettier --check src && npx eslint . && npx tsc -b; rc=$?; rm node_modules; exit $rc"`. Khi `package.json` đổi (Task 1) thì image cần `npm install`: dùng `SP/fe-install.sh` build lại node_modules vào volume riêng `mlnotify-fe-node-modules` và fe-check mount volume đó thay vì symlink.
- [ ] Nền: fe-check trên dev hiện tại → exit 0.

### Task 1: Client STOMP dùng chung + API + store

**Files:** package.json, `types/notification.types.ts`, `api-requests/notification.requests.ts`, `lib/realtime/stompClient.ts`, `lib/notifications/store.ts`, `hooks/useUnreadNotifications.ts`

**Interfaces (Produces):**
```ts
// types
export type NotificationKindCode = 'announcement' | 'farmer_application' | 'farmer_approved' | 'farmer_rejected'
  | 'farmer_suspended' | 'farmer_reinstated' | 'message' | 'test';
export type NotificationItem = { id: number; kind: NotificationKindCode; title: string; message: string;
  link: string | null; isRead: boolean; createdAt: string };
export type NotificationAlert = { inApp: boolean; browser: boolean; sound: boolean };
export type NotificationFrame = { id: number | null; kind: NotificationKindCode; title: string; message: string;
  link: string | null; createdAt: string; persistent: boolean; unreadCount: number; alert: NotificationAlert;
  conversationId: number | null };
export type NotificationCategoryCode = 'messages' | 'announcements' | 'account' | 'farmerApplications';
export type NotificationPreferences = { categories: { category: NotificationCategoryCode; inApp: boolean; browser: boolean }[];
  sound: boolean; quietOn: boolean; quietFrom: string; quietTo: string };
export type Page<T> = { items: T[]; page: number; pageSize: number; total: number };

// NotificationApi (privateApi, trả response.data như SettingsApi)
list(params: { isRead?: boolean; page: number; size: number }); unreadCount(); read(id); readAll();
getPreferences(); savePreferences(p); sendTest();

// stompClient
export const realtime: { start(): void; stop(): void; subscribe(dest: string, cb: (body: string) => void): () => void };
// store
export const NotificationStore: { getUnread(): number; setUnread(n: number): void; subscribe(cb): () => void;
  onFrame(cb: (f: NotificationFrame) => void): () => void; emitFrame(f: NotificationFrame): void };
export default function useUnreadNotifications(): number;
```

- [ ] **Step 1:** `npm install @stomp/stompjs` (trong container, ghi `package-lock.json`).
- [ ] **Step 2:** `stompClient.ts`:
```ts
import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs';
import NotificationApi from '@/api-requests/notification.requests';
import Session from '@/utils/session';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';
const WS_URL = API.replace(/^http/, 'ws') + '/ws';

type Handler = (body: string) => void;
const handlers = new Map<string, Set<Handler>>();
const subs = new Map<string, StompSubscription>();
let client: Client | null = null;

const attach = (dest: string) => {
  if (!client?.connected || subs.has(dest)) return;
  subs.set(dest, client.subscribe(dest, (m: IMessage) => handlers.get(dest)?.forEach((h) => h(m.body))));
};

/** Một kết nối cho cả app (thông báo và, về sau, chat Plan 4). Token lấy lại trước mỗi lần nối. */
export const realtime = {
  start() {
    if (client) return;
    client = new Client({
      brokerURL: WS_URL,
      reconnectDelay: 5000,
      heartbeatIncoming: 20000,
      heartbeatOutgoing: 20000,
      // gọi một API riêng tư trước: token hết hạn thì interceptor axios refresh, rồi mới đọc token mới
      beforeConnect: async (c) => {
        try { await NotificationApi.unreadCount(); } catch { /* không có mạng: vẫn thử nối */ }
        c.connectHeaders = { Authorization: `Bearer ${Session.getAccessToken() ?? ''}` };
      },
      onConnect: () => { subs.clear(); handlers.forEach((_, d) => attach(d)); },
      onWebSocketClose: () => subs.clear(),
    });
    client.activate();
  },
  stop() { void client?.deactivate(); client = null; subs.clear(); },
  subscribe(dest: string, cb: Handler) {
    if (!handlers.has(dest)) handlers.set(dest, new Set());
    handlers.get(dest)!.add(cb);
    attach(dest);
    return () => {
      handlers.get(dest)?.delete(cb);
      if (!handlers.get(dest)?.size) { subs.get(dest)?.unsubscribe(); subs.delete(dest); handlers.delete(dest); }
    };
  },
};
```
- [ ] **Step 3:** store theo mẫu `utils/session.ts` (event nội bộ + `useSyncExternalStore`).
- [ ] **Step 4:** fe-check → exit 0. Commit `feat(FR-042): one shared STOMP client, notifications API and unread store`.

### Task 2: Service worker + tiện ích trình duyệt

**Files:** `public/sw.js`, `lib/notifications/browser.ts`

**Produces:** `isSupported(): boolean`, `permission(): NotificationPermission | 'unsupported'`, `requestPermission(): Promise<NotificationPermission>`, `registerWorker(): Promise<ServiceWorkerRegistration | null>`, `showOsNotification(f: NotificationFrame): Promise<void>` (dùng `registration.showNotification(title, { body, tag: kind + ':' + (id ?? conversationId ?? createdAt), data: { link }, icon: '/favicon.ico', silent: !alert.sound })`), `beep(): void` (WebAudio 180 ms, không cần file âm thanh).

`sw.js`:
```js
// MarketLink service worker — N2: bấm thông báo; N3 thêm 'push'.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || '/';
  event.waitUntil((async () => {
    const tabs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const tab = tabs.find((c) => new URL(c.url).origin === self.location.origin);
    if (tab) { await tab.focus(); tab.postMessage({ type: 'open', link }); return; }
    await self.clients.openWindow(link);
  })());
});
```
- [ ] fe-check → exit 0. Commit `feat(FR-042): service worker and browser notification helpers`.

### Task 3: NotificationCenter (toast / OS / âm thanh)

**Files:** `components/notifications/NotificationCenter.tsx`, `App.tsx`

Luật (spec §8):
- Có phiên → `realtime.start()`, subscribe `/user/topic/notifications`; mất phiên (Session.subscribe) → `stop()`, `setUnread(0)`.
- Lúc có phiên: `NotificationApi.unreadCount()` → `setUnread`.
- Mỗi khung: `setUnread(frame.unreadCount)` nếu `persistent`; `emitFrame(frame)`.
- Bỏ popup nếu `kind === 'message'` và đang ở `/messages` hoặc `/farmer/messages` với `?c=` = `conversationId`.
- `document.visibilityState === 'visible'` và `alert.inApp` → `toast(title, { description: message, action: link ? { label: t('notifications.open'), onClick: () => navigate(link) } : undefined })`; `alert.sound` → `beep()`.
- Tab ẩn và `alert.browser` và `permission() === 'granted'` → `showOsNotification(frame)`.
- Nghe `navigator.serviceWorker` message `{type:'open', link}` → `navigate(link)`.
- [ ] fe-check → exit 0. Commit `feat(FR-042): show notifications as toasts or OS notifications as they arrive`.

### Task 4: Chuông ở ba khu

**Files:** `layout/MainLayout.tsx` (truyền `unreadCount` từ hook), `layout/FarmerLayout.tsx` (bỏ số 2 cứng), `layout/AdminLayout.tsx` (thêm chuông `headerActions` tới `/admin` — admin chưa có trang danh sách riêng: ruling nếu cần)
- [ ] fe-check → exit 0. Commit `feat(FR-042): the bell shows the real unread count everywhere`.

### Task 5: Banner xin quyền

**Files:** `components/notifications/NotificationPermissionBanner.tsx`, mount trong MainLayout/FarmerLayout/AdminLayout (ngay dưới header)

- Hiện khi: có phiên, `isSupported()`, `permission() === 'default'`, `localStorage['ml-notify-snooze']` không có hoặc đã quá 7 ngày.
- [Bật] → `requestPermission()` → `granted`: toast "đã bật", `registerWorker()`; mọi kết quả → ẩn. [Để sau] → lưu mốc, ẩn.
- Chữ ở `common.json` → `notifications.prompt.*`, 10 ngôn ngữ.
- [ ] fe-check. Commit `feat(FR-042): invite people to turn on browser notifications after they sign in`.

### Task 6: Cài đặt thông báo

**Files:** `components/notifications/NotificationSettingsCard.tsx`, `components/settings/SettingsPanel.tsx` (bỏ `NOTES` + khối `set-notes`, chèn card; card tự lưu qua API khi đổi, không dính nút Save chung)

- Dòng "Thông báo trình duyệt": Đã bật / Chưa bật [Bật] / Đã chặn (hướng dẫn mở trong cài đặt trình duyệt) / Không hỗ trợ.
- Bảng: mỗi nhóm của vai (từ API) × 2 công tắc (`Checkbox`) "Trong trang", "Trình duyệt".
- Âm thanh; Giờ yên tĩnh (bật + 2 `input type="time"`); nút **Gửi thử** (429 → toast lý do).
- Lưu: debounce 400 ms, lỗi → toast + trả lại giá trị cũ. 4 trạng thái (loading/error) bằng `DataState`.
- Chữ ở `common.json` → `notifications.settings.*`; xoá key `settings.notes.*`, `settings.notificationsNote` cũ ở 10 file.
- [ ] fe-check. Commit `feat(FR-042): full notification settings — per group and channel, sound, quiet hours, test`.

### Task 7: Trang thông báo thật

**Files:** `components/notifications/NotificationList.tsx`, `pages/customer/Notifications/index.tsx`, `pages/farmer/Notifications/index.tsx`

- Lọc Tất cả / Chưa đọc; `NotificationApi.list({isRead, page, size: 20})`; "Xem thêm" khi còn; bấm một dòng → `read(id)` (lạc quan) rồi `navigate(link)`; "Đánh dấu tất cả đã đọc" → `readAll()`; `onFrame` persistent → chèn đầu danh sách.
- Icon theo kind: announcement → Megaphone, farmer_* → Store, khác → Receipt. Thời gian qua `lib/format.ts`.
- 4 trạng thái `DataState`. Bỏ import `data/customer` / `data/farmer` mock của 2 trang.
- [ ] fe-check. Commit `feat(FR-042): notification pages read the real list and update live`.

### Task 8: Admin đăng thông báo + banner public

**Files:** `api-requests/announcement.requests.ts`, `pages/admin/Announcements/index.tsx`, `components/AnnouncementBanner.tsx` + `layout/MainLayout.tsx`

- Trang admin: form (tiêu đề ≤150, nội dung ≤1000, đối tượng all/customers/farmers, từ/đến tuỳ chọn) → `create`; bảng danh sách thật (`adminList`), gỡ banner (`remove`), trạng thái Live/Ended theo `active` + khung giờ. Bỏ trường "chợ" (API không có). Validation client khớp server.
- Banner public: `AnnouncementApi.live()` (publicApi), không có → không hiện; nút đóng nhớ theo id trong `localStorage`.
- [ ] fe-check. Commit `feat(FR-077): admins publish real announcements; the banner reads the live one`.

### Task 9: Kiểm đầu–cuối trên trình duyệt + dọn

- [ ] Chạy stack Docker từ worktree này (compose project riêng hoặc tạm trỏ stack chính — ruling lúc làm), backend N1.
- [ ] Hai phiên: customer (tab A) + admin (tab B, cửa sổ ẩn danh khác origin storage). Kiểm Review Focus 1–5 và checklist spec §10 bước 1–3, 5–6.
- [ ] fe-check toàn bộ + `npm run build`.
- [ ] Push `feature/FR-042-notifications-n2`, PR vào `dev`.
