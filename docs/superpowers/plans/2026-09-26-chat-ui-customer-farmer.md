# Chat Customer ↔ Farmer — Plan 4A/4: Giao diện thật cho Customer và Farmer · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hai trang `/messages` (Customer và Farmer) chạy bằng dữ liệu thật và nhận tin mới ngay, thay cho mảng `THREADS` viết cứng đang có.

**Architecture:** Một tầng dữ liệu thuần TypeScript (`lib/chat/`) lo việc khó — gộp sự kiện realtime vào danh sách phân trang keyset, khử trùng theo `id`, đếm chưa đọc — và được test bằng Vitest. Trên nó là một hook React và một bộ component dùng chung cho cả hai vai; trang Customer và trang Farmer chỉ khác vỏ ngoài (shell) chứ không khác ruột. STOMP dùng lại `lib/realtime/stompClient.ts` mà FR-042 đã dựng, không mở kết nối thứ hai.

**Tech Stack:** React 19 · TypeScript · Vite · Tailwind 4 · `@stomp/stompjs` (đã cài) · axios qua `utils/axiosInstance` · i18next · **Vitest + @testing-library/react (thêm mới ở Task 1)**.

**Spec:** `docs/superpowers/specs/2026-09-25-farmer-customer-chat-design.md` — mục 6.1 (API), 7.4 (destination), 9.2 (trang Customer), 9.3 (trang Farmer), 9.6 (bắt buộc với mọi màn), 10 (component còn thiếu).

**Phạm vi — đọc trước khi bắt đầu:**

Đây là **Plan 4A**. Nó chỉ dùng những endpoint **đã có trên `dev`** (Plan 3A, PR #129 đã merge): danh sách thread, đọc tin, gửi tin, đếm chưa đọc, đánh dấu đã đọc, ảnh, presence, typing, đã xem.

**Không** làm trong plan này, vì backend của chúng nằm ở PR #138 chưa merge hoặc thuộc mảng khác:

| Việc | Ở đâu |
|---|---|
| Nút **Báo cáo** trên tin nhắn (FR-116) | **Plan 4B** — chờ PR #138 |
| Tab **"Reported messages"** của admin | **Plan 4B** |
| Xử lý sự kiện `{ type: "hidden" }` | **Plan 4B** |
| **Popover header** hai biểu tượng (chuông + bong bóng) | **Plan 4B** |
| Cập nhật **prototype** | **Plan 4B** |
| Nút "Message this stall" ở trang sản phẩm / stall / đơn | **Plan 4B** |

---

## Global Constraints

Sao nguyên văn từ spec và từ `frontend/CLAUDE.md`. Mọi task đều phải thoả.

- **Không sửa tay** `src/styles/marketlink-*.css` và `docs/design-system/tokens.json`. `MessageBubble` **ghép từ class `ml-*` đã có** (`ml-msg`, `ml-msg-bot`, `ml-msg-user`, `ml-msg-bubble`, `ml-msg-meta`) cộng token utility cho phần mới. Quyết định của LEAD 26/09 — không chờ FE1 sinh lại design system.
- **Màu chỉ qua token utility**: `bg-surface`, `bg-surface-raised`, `text-ink`, `text-ink-muted`, `border-line-strong`, `bg-brand text-on-brand`… Palette Tailwind mặc định đã tắt: `bg-white`, `text-zinc-*` **không tồn tại**. Không hex, không inline style màu.
- **Spacing theo token**: `p-1/2/3/4/6/8/12/16`. Không `p-5`, `p-7`, không `p-[18px]`.
- **`font-hand` (Patrick Hand)** chỉ cho tên chợ, giá, nhãn "Fresh today", lời chào. Nút, form, lỗi, bảng dùng `font-sans`. **Tin nhắn của người dùng dùng `font-sans`** — nó là chữ người ta gõ, không phải nhãn trang trí.
- **Copy không viết cứng trong TSX**: key vào `src/locales/en/<Thư mục trang>.json`, đọc bằng `useTranslation('<Thư mục trang>')`. Dịch đủ **10 ngôn ngữ** (`en vi zh ja ko fr es de th id`). Tiếng Anh: **sentence case**, không emoji, không dấu chấm than; nút bị khoá kèm lý do bằng chữ.
- **Tiền, ngày, giờ** đi qua `src/lib/format.ts`. ⚠️ **`formatClock(hhmm: string)` nhận chuỗi "07:30", KHÔNG nhận ISO** — mốc thời gian của chat là ISO nên phải dùng `formatTime(date: Date)` và `formatDayMonth(date: Date)` — nó theo Settings của người đọc.
- **FR-084**: mọi màn đủ **4 trạng thái** loading / empty / error / có dữ liệu. Dùng `DataState` và `LoadError` ở `components/ui/data-state.tsx` (`variant: 'empty' | 'error'`).
- **FR-080**: không tràn ngang ở **375 / 768 / 1440**. Spec §9.2: **375px là hai màn riêng** — danh sách, bấm vào mới mở hội thoại, có nút quay lại. Nhồi hai cột vào 375px là không đọc được.
- **Dark theme**: `data-theme="dark"` trên `<html>`. Chỉ dùng token màu thì tự đúng cả hai theme.
- **Một kết nối STOMP cho cả app**: `lib/realtime/stompClient.ts` (`realtime.subscribe(destination, handler)` trả hàm huỷ). **Không** tạo `Client` thứ hai.
- **JWT ở header, không ở cookie** → `<img src="/api/v1/attachments/5">` trả **401**. Ảnh phải `fetch` kèm header rồi `URL.createObjectURL(blob)`.
- **Commit**: Conventional Commits có mã FR. Giữ dòng `Co-Authored-By`.
- **Trước mỗi commit**: `npx prettier --write src` và `npm run lint` (CI chạy `prettier --check src`, `eslint .`, `tsc -b && vite build`).

---

## Review Focus

Năm lớp đầu vào spec ngầm định nhưng dễ rơi. Mỗi dòng đã được gắn một test trong task tương ứng.

1. **Tin mình vừa gửi về hai lần** — REST trả tin trong response, rồi STOMP phát chính tin đó về cho *mọi thiết bị của người gửi* (Plan 2 cố ý làm vậy). Kỳ vọng: bong bóng hiện **một lần**, không phải hai. → Task 2, `ignoresAnEventForAMessageAlreadyInTheList`.
2. **Sự kiện tới trong lúc đang cuộn lên đọc tin cũ** — người dùng đang xem trang thứ ba của lịch sử thì có tin mới. Kỳ vọng: tin mới vào đúng cuối danh sách, **không** làm mất trang đã tải, **không** nhảy thứ tự. → Task 2, `keepsOlderPagesWhenANewMessageArrives`.
3. **Mất mạng rồi nối lại** — STOMP tự nối lại sau 5 giây; những tin tới trong lúc rớt **không** được phát lại. Kỳ vọng: danh sách tự đồng bộ lại khi nối lại, không để thủng một khoảng tin. → Task 4, `refetchesTheOpenThreadWhenTheSocketComesBack`.
4. **Ảnh hỏng hoặc 403** — link ảnh của tin đã bị admin ẩn, hoặc mạng rớt giữa chừng. Kỳ vọng: ô ảnh hiện trạng thái hỏng bằng chữ, **không** vỡ cả khung chat, và **không** rò URL blob. → Task 3, `showsAFallbackWhenThePhotoCannotBeLoaded` + `revokesTheBlobUrlOnUnmount`.
5. **Thread rỗng và danh sách rỗng** — người dùng mới, chưa nhắn ai. Kỳ vọng: đủ 4 trạng thái FR-084, empty có câu dẫn việc cần làm, không phải một khung trắng. → Task 5, `showsAnEmptyStateWithSomethingToDo`.

---

## Setup — worktree, dev server, baseline

Làm một lần trước Task 1.

- [ ] **Bước 1: Xác nhận worktree**

```bash
cd /Users/phong/projects/school/fpt-aptech/Code_project/techwiz7/market-link-chat4
git branch --show-current   # feature/FR-115-chat-ui
git log --oneline -1        # a2c5109 (= origin/dev lúc tách nhánh)
```

- [ ] **Bước 2: Backend để thử tay**

Plan 4A cần một backend chạy thật để xem UI có đúng không. **Dùng lại stack `market-link` chung** đang chạy ở cổng 8080 — worktree này không cần stack riêng, vì nó chỉ đổi frontend.

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/ping   # mong 200
```

Không chạy thì bảo người dùng bật `make up` ở worktree `market-link`.

> ⚠️ Máy dev đang có nhiều stack Docker cùng lúc trên tổng 7.8 GB. **Đừng dựng thêm stack thứ tư.** Frontend chạy thẳng trên host bằng `npm run dev` (Node có sẵn), trỏ `VITE_API_URL=http://localhost:8080`.

- [ ] **Bước 3: Cài dependency và chạy dev server**

```bash
cd frontend && npm install
npm run dev   # http://localhost:3000
```

- [ ] **Bước 4: Baseline phải xanh trước khi sửa gì**

```bash
cd frontend
npx prettier --check src
npm run lint
npm run build
```

Expected: cả ba xanh. **Đỏ thì dừng, báo người dùng** — baseline bẩn thì mọi lỗi sau này không biết của ai.

---

### Task 1: Vitest và tầng dữ liệu chat

Frontend hiện **không có test framework nào** (0 file test, CI chỉ `lint + build`). Logic khó của chat — gộp sự kiện realtime vào danh sách phân trang, khử trùng, đếm chưa đọc — không nhìn bằng mắt mà biết đúng được, nên task này dựng chỗ để test nó.

**Files:**
- Modify: `frontend/package.json` (thêm `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, script `test`)
- Modify: `frontend/vite.config.ts` (khối `test`)
- Create: `frontend/src/test/setup.ts`
- Modify: `.github/workflows/ci.yml` (một bước `npm test`)
- Create: `frontend/src/types/chat.types.ts`
- Create: `frontend/src/api-requests/conversation.requests.ts`

**Interfaces:**
- Consumes: `ApiResponse<T>` và `PageType<T>` từ `@/types/api.types`; `privateApi` từ `@/utils/axiosInstance`.
- Produces:
  - `type ConversationSummary = { id: number; other: { id: number; fullName: string; image: string | null; online: boolean; lastSeenAt: string | null }; lastMessageText: string | null; lastMessageAt: string | null; unreadCount: number }`
  - `type ChatAttachment = { attachmentId: number; url: string; width: number | null; height: number | null }`
  - `type ChatMessageItem = { id: number; conversationId: number; senderId: number; kind: 'text' | 'image'; body?: string; productId?: number | null; orderId?: number | null; attachment?: ChatAttachment; createdAt: string }`
  - `type ConversationEventFrame = { type: 'updated' | 'read'; conversationId: number; messageId?: number; lastMessageText?: string; lastMessageAt?: string; unreadCount?: number; readerId?: number; readAt?: string }`
  - `ConversationApi` với `list`, `open`, `messages`, `send`, `markRead`, `unreadCount`, `uploadPhoto`, `photoBlob`.

> **Kiểm hình dạng thật trước khi tin plan này.** Backend là nguồn sự thật:
> ```bash
> sed -n '1,40p' ../market-link/backend/src/main/java/com/techx/intervue/modules/conversation/resources/ConversationResource.java
> sed -n '1,40p' ../market-link/backend/src/main/java/com/techx/intervue/modules/conversation/resources/ParticipantResource.java
> ```
> Tên trường lệch thì sửa `chat.types.ts` theo backend, **không** sửa backend (R-05).

- [ ] **Bước 1: Cài Vitest**

```bash
cd frontend
npm install -D vitest@^3 @testing-library/react@^16 @testing-library/jest-dom@^6 jsdom@^25
```

Thêm vào `package.json` khối `scripts`:

```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Bước 2: Cấu hình Vitest trong `vite.config.ts`**

Thêm khối `test` vào `defineConfig` đang có (giữ nguyên `plugins`, `resolve`, `server`, `preview`):

```ts
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
```

`vite.config.ts` dùng `defineConfig` từ `vite`; để TypeScript hiểu khối `test`, đổi dòng import đầu file thành:

```ts
import { defineConfig } from 'vitest/config';
```

- [ ] **Bước 3: File setup**

`frontend/src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Bước 4: Viết test đỏ cho kiểu dữ liệu và client**

`frontend/src/api-requests/conversation.requests.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ConversationApi from './conversation.requests';
import { privateApi } from '@/utils/axiosInstance';

vi.mock('@/utils/axiosInstance', () => ({
  privateApi: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

describe('ConversationApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('asks for a page of threads', async () => {
    vi.mocked(privateApi.get).mockResolvedValue({ data: { success: true, data: { items: [] } } });

    await ConversationApi.list({ page: 1, size: 20 });

    expect(privateApi.get).toHaveBeenCalledWith('/conversations', { params: { page: 1, size: 20 } });
  });

  /** Phân trang keyset: `before` là id tin cũ nhất đang có, không phải số trang. */
  it('walks history backwards with a keyset cursor, not a page number', async () => {
    vi.mocked(privateApi.get).mockResolvedValue({ data: { success: true, data: [] } });

    await ConversationApi.messages(42, { before: 101, size: 30 });

    expect(privateApi.get).toHaveBeenCalledWith('/conversations/42/messages', {
      params: { before: 101, size: 30 },
    });
  });

  it('leaves the cursor out on the first page', async () => {
    vi.mocked(privateApi.get).mockResolvedValue({ data: { success: true, data: [] } });

    await ConversationApi.messages(42, { size: 30 });

    expect(privateApi.get).toHaveBeenCalledWith('/conversations/42/messages', {
      params: { size: 30 },
    });
  });

  it('sends a photo message by attachment id, with no body', async () => {
    vi.mocked(privateApi.post).mockResolvedValue({ data: { success: true, data: {} } });

    await ConversationApi.send(42, { kind: 'image', attachmentId: 55 });

    expect(privateApi.post).toHaveBeenCalledWith('/conversations/42/messages', {
      kind: 'image',
      attachmentId: 55,
    });
  });
});
```

- [ ] **Bước 5: Chạy để chắc chắn đỏ**

```bash
cd frontend && npm test
```

Expected: FAIL — `Failed to resolve import "./conversation.requests"`.

- [ ] **Bước 6: Viết kiểu dữ liệu**

`frontend/src/types/chat.types.ts`:

```ts
/** Chat người–người (FR-110…115). Không nhầm với chatbot FR-090 ở /api/v1/chat. */

export type ChatParticipant = {
  id: number;
  fullName: string;
  image: string | null;
  online: boolean;
  lastSeenAt: string | null;
};

export type ConversationSummary = {
  id: number;
  other: ChatParticipant;
  lastMessageText: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
};

export type ChatAttachment = {
  attachmentId: number;
  url: string;
  width: number | null;
  height: number | null;
};

export type ChatMessageItem = {
  id: number;
  conversationId: number;
  senderId: number;
  kind: 'text' | 'image';
  body?: string;
  productId?: number | null;
  orderId?: number | null;
  attachment?: ChatAttachment;
  createdAt: string;
};

/** /user/topic/conversations. "hidden" là của Plan 4B; khai sẵn để switch không thiếu nhánh. */
export type ConversationEventFrame = {
  type: 'updated' | 'read' | 'hidden';
  conversationId: number;
  messageId?: number;
  lastMessageText?: string;
  lastMessageAt?: string;
  unreadCount?: number;
  readerId?: number;
  readAt?: string;
};

/** /user/topic/typing và /user/topic/presence. */
export type TypingFrame = { conversationId: number; userId: number; typing: boolean };
export type PresenceFrame = { userId: number; online: boolean; lastSeenAt: string | null };
```

- [ ] **Bước 7: Viết client**

`frontend/src/api-requests/conversation.requests.ts`:

```ts
import type { ApiResponse, PageType } from '@/types/api.types';
import type { ChatAttachment, ChatMessageItem, ConversationSummary } from '@/types/chat.types';
import { privateApi } from '@/utils/axiosInstance';

type SendBody = {
  kind?: 'text' | 'image';
  body?: string;
  productId?: number;
  orderId?: number;
  attachmentId?: number;
};

/** FR-110…115 — chat người–người (docs/api-contract.md §12). */
class ConversationApi {
  static list = async (params: { page: number; size: number }) => {
    const response = await privateApi.get<ApiResponse<PageType<ConversationSummary>>>('/conversations', {
      params,
    });
    return response.data;
  };

  static open = async (farmerUserId: number) => {
    const response = await privateApi.post<ApiResponse<ConversationSummary>>('/conversations', {
      farmerUserId,
    });
    return response.data;
  };

  /** Phân trang keyset: `before` là id tin cũ nhất đang có, mới nhất trả về trước. */
  static messages = async (id: number, params: { before?: number; size: number }) => {
    const response = await privateApi.get<ApiResponse<ChatMessageItem[]>>(`/conversations/${id}/messages`, {
      params,
    });
    return response.data;
  };

  static send = async (id: number, body: SendBody) => {
    const response = await privateApi.post<ApiResponse<ChatMessageItem>>(`/conversations/${id}/messages`, body);
    return response.data;
  };

  static markRead = async (id: number) => {
    const response = await privateApi.post<ApiResponse<null>>(`/conversations/${id}/read`);
    return response.data;
  };

  static unreadCount = async () => {
    const response = await privateApi.get<ApiResponse<{ count: number }>>('/conversations/unread-count');
    return response.data;
  };

  static uploadPhoto = async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const response = await privateApi.post<ApiResponse<ChatAttachment>>('/attachments', form);
    return response.data;
  };

  /**
   * JWT đi ở header `Authorization`, không ở cookie, nên `<img src="/api/v1/attachments/5">` trả
   * 401. Phải tải bằng axios rồi bọc thành blob URL.
   */
  static photoBlob = async (attachmentId: number) => {
    const response = await privateApi.get<Blob>(`/attachments/${attachmentId}`, { responseType: 'blob' });
    return URL.createObjectURL(response.data);
  };
}

export default ConversationApi;
```

- [ ] **Bước 8: Chạy cho xanh**

```bash
cd frontend && npm test
```

Expected: PASS (4 test).

- [ ] **Bước 9: Thêm một bước test vào CI**

`.github/workflows/ci.yml`, trong job `frontend`, **giữa** bước `ESLint` và bước `Build`:

```yaml
      - name: Test
        run: npm test
```

Đổi luôn tên job cho khớp việc nó làm:

```yaml
    name: Frontend · lint + test + build
```

- [ ] **Bước 10: Commit**

```bash
cd frontend && npx prettier --write src && npm run lint && cd ..
git add frontend/package.json frontend/package-lock.json frontend/vite.config.ts \
        frontend/src/test/setup.ts frontend/src/types/chat.types.ts \
        frontend/src/api-requests/conversation.requests.ts \
        frontend/src/api-requests/conversation.requests.test.ts .github/workflows/ci.yml
git commit -m "chore(FR-115): add Vitest and the chat data client

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Gộp sự kiện realtime vào danh sách — logic thuần, không React

Đây là chỗ dễ sai nhất của cả plan, và là chỗ nhìn bằng mắt không biết đúng được. Tách hẳn ra khỏi React để test được bằng hàm thuần.

**Files:**
- Create: `frontend/src/lib/chat/merge.ts`
- Test: `frontend/src/lib/chat/merge.test.ts`

**Interfaces:**
- Consumes: `ChatMessageItem`, `ConversationSummary`, `ConversationEventFrame` (Task 1).
- Produces:
  - `mergeMessage(list: ChatMessageItem[], incoming: ChatMessageItem): ChatMessageItem[]`
  - `prependOlder(list: ChatMessageItem[], older: ChatMessageItem[]): ChatMessageItem[]`
  - `applyConversationEvent(threads: ConversationSummary[], frame: ConversationEventFrame): ConversationSummary[]`
  - `oldestId(list: ChatMessageItem[]): number | undefined`

**Quy ước thứ tự:** trong state, `list` xếp **cũ → mới** (đọc từ trên xuống như trên màn hình). API trả **mới → cũ**, nên chỗ nào nhận từ API đều phải đảo.

- [ ] **Bước 1: Viết test đỏ**

`frontend/src/lib/chat/merge.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { applyConversationEvent, mergeMessage, oldestId, prependOlder } from './merge';
import type { ChatMessageItem, ConversationSummary } from '@/types/chat.types';

const msg = (id: number, senderId = 3): ChatMessageItem => ({
  id,
  conversationId: 42,
  senderId,
  kind: 'text',
  body: `m${id}`,
  createdAt: new Date(2026, 8, 26, 10, id).toISOString(),
});

const thread = (id: number, unreadCount = 0, lastMessageAt = '2026-09-26T10:00:00Z'): ConversationSummary => ({
  id,
  other: { id: 3, fullName: 'Cô Tư', image: null, online: false, lastSeenAt: null },
  lastMessageText: 'hi',
  lastMessageAt,
  unreadCount,
});

describe('mergeMessage', () => {
  it('puts a new message at the end', () => {
    expect(mergeMessage([msg(1), msg(2)], msg(3)).map((m) => m.id)).toEqual([1, 2, 3]);
  });

  /**
   * Review Focus #1. REST trả tin trong response VÀ STOMP phát chính tin đó về cho mọi thiết bị
   * của người gửi (Plan 2 cố ý làm vậy). Không khử trùng thì bong bóng hiện hai lần.
   */
  it('ignores an event for a message already in the list', () => {
    const before = [msg(1), msg(2)];

    expect(mergeMessage(before, msg(2))).toBe(before);
  });

  it('keeps the list sorted by id even if an event arrives out of order', () => {
    expect(mergeMessage([msg(1), msg(3)], msg(2)).map((m) => m.id)).toEqual([1, 2, 3]);
  });

  it('does not mutate the list it was given', () => {
    const before = [msg(1)];
    mergeMessage(before, msg(2));

    expect(before.map((m) => m.id)).toEqual([1]);
  });
});

describe('prependOlder', () => {
  /** Review Focus #2: đang cuộn lên đọc tin cũ thì có tin mới tới. */
  it('keeps older pages when a new message arrives', () => {
    const withHistory = prependOlder([msg(10), msg(11)], [msg(9), msg(8), msg(7)]);
    const after = mergeMessage(withHistory, msg(12));

    expect(after.map((m) => m.id)).toEqual([7, 8, 9, 10, 11, 12]);
  });

  it('turns the newest-first page from the API into oldest-first', () => {
    expect(prependOlder([msg(10)], [msg(9), msg(8)]).map((m) => m.id)).toEqual([8, 9, 10]);
  });

  it('drops anything already in the list, so a repeated page cannot duplicate', () => {
    expect(prependOlder([msg(9), msg(10)], [msg(10), msg(9), msg(8)]).map((m) => m.id)).toEqual([8, 9, 10]);
  });

  it('returns the same array when the older page is empty', () => {
    const before = [msg(10)];

    expect(prependOlder(before, [])).toBe(before);
  });
});

describe('oldestId', () => {
  it('is the cursor for the next page back', () => {
    expect(oldestId([msg(8), msg(9)])).toBe(8);
  });

  it('is undefined for an empty list, so the first request sends no cursor', () => {
    expect(oldestId([])).toBeUndefined();
  });
});

describe('applyConversationEvent', () => {
  it('moves the touched thread to the top and refreshes its preview', () => {
    const threads = [thread(1, 0, '2026-09-26T09:00:00Z'), thread(2, 0, '2026-09-26T08:00:00Z')];

    const after = applyConversationEvent(threads, {
      type: 'updated',
      conversationId: 2,
      lastMessageText: 'still fresh?',
      lastMessageAt: '2026-09-26T10:00:00Z',
      unreadCount: 3,
    });

    expect(after.map((t) => t.id)).toEqual([2, 1]);
    expect(after[0].lastMessageText).toBe('still fresh?');
    expect(after[0].unreadCount).toBe(3);
  });

  /**
   * Sự kiện "read" cố ý KHÔNG mang unreadCount (backend dùng Long để nó vắng mặt). Client không
   * được suy ra 0 từ chỗ thiếu — đó là lỗi đã tìm thấy trong smoke của Plan 2.
   */
  it('leaves the badge alone when the event carries no count', () => {
    const after = applyConversationEvent([thread(1, 5)], { type: 'read', conversationId: 1, readerId: 9 });

    expect(after[0].unreadCount).toBe(5);
  });

  it('ignores an event for a thread it has not loaded', () => {
    const threads = [thread(1)];

    expect(applyConversationEvent(threads, { type: 'updated', conversationId: 99 })).toBe(threads);
  });
});
```

- [ ] **Bước 2: Chạy để chắc chắn đỏ**

```bash
cd frontend && npm test -- merge
```

Expected: FAIL — `Failed to resolve import "./merge"`.

- [ ] **Bước 3: Viết code**

`frontend/src/lib/chat/merge.ts`:

```ts
import type { ChatMessageItem, ConversationEventFrame, ConversationSummary } from '@/types/chat.types';

/**
 * Trong state, danh sách tin xếp **cũ → mới** (đọc từ trên xuống như trên màn hình). API trả
 * mới → cũ, nên prependOlder đảo lại. Mọi hàm ở đây thuần: trả mảng mới, không sửa mảng đầu vào,
 * và trả **đúng mảng cũ** khi không có gì đổi để React khỏi render lại vô ích.
 */

const byId = (a: ChatMessageItem, b: ChatMessageItem) => a.id - b.id;

/**
 * Tin của chính mình về hai đường: response của REST, rồi sự kiện STOMP (Plan 2 cố ý phát cho mọi
 * thiết bị của người gửi). Khử trùng theo id là thứ giữ cho bong bóng chỉ hiện một lần.
 */
export function mergeMessage(list: ChatMessageItem[], incoming: ChatMessageItem): ChatMessageItem[] {
  if (list.some((m) => m.id === incoming.id)) return list;
  const next = [...list, incoming];
  // Sự kiện có thể tới lệch thứ tự khi mạng chập chờn
  return next[next.length - 2] && next[next.length - 2].id > incoming.id ? next.sort(byId) : next;
}

/** Trang lịch sử từ API (mới → cũ) ghép vào đầu danh sách, bỏ những tin đã có. */
export function prependOlder(list: ChatMessageItem[], older: ChatMessageItem[]): ChatMessageItem[] {
  if (older.length === 0) return list;
  const have = new Set(list.map((m) => m.id));
  const fresh = older.filter((m) => !have.has(m.id));
  if (fresh.length === 0) return list;
  return [...fresh, ...list].sort(byId);
}

/** Con trỏ keyset cho trang lịch sử kế tiếp. */
export function oldestId(list: ChatMessageItem[]): number | undefined {
  return list.length === 0 ? undefined : list[0].id;
}

/**
 * Sự kiện "read" cố ý không mang unreadCount (backend để Long cho nó vắng mặt). Đừng suy ra 0 từ
 * chỗ thiếu — lỗi đó đã bị bắt trong smoke của Plan 2.
 */
export function applyConversationEvent(
  threads: ConversationSummary[],
  frame: ConversationEventFrame,
): ConversationSummary[] {
  const at = threads.findIndex((t) => t.id === frame.conversationId);
  if (at === -1) return threads;

  const touched: ConversationSummary = {
    ...threads[at],
    lastMessageText: frame.lastMessageText ?? threads[at].lastMessageText,
    lastMessageAt: frame.lastMessageAt ?? threads[at].lastMessageAt,
    unreadCount: frame.unreadCount ?? threads[at].unreadCount,
  };
  return [touched, ...threads.slice(0, at), ...threads.slice(at + 1)];
}
```

- [ ] **Bước 4: Chạy cho xanh**

```bash
cd frontend && npm test -- merge
```

Expected: PASS (11 test).

- [ ] **Bước 5: Commit**

```bash
cd frontend && npx prettier --write src && npm run lint && cd ..
git add frontend/src/lib/chat/
git commit -m "feat(FR-111): merge realtime chat events into the paged list

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: `MessageBubble` và ảnh trong chat

Spec §10: `ChatMessage` đang có là **của trợ lý AI** — guide của nó bắt mỗi câu bot kèm nhãn "Intent: …" (FR-092). Chat người-với-người cần component riêng.

**Quyết định của LEAD 26/09:** ghép từ class `ml-*` đã có, **không** sửa `marketlink-components.css`. Các class dùng lại: `ml-msg` (khối), `ml-msg-bot` (căn trái = người kia), `ml-msg-user` (căn phải = mình), `ml-msg-bubble` (bong bóng), `ml-msg-meta` (giờ + đã xem). **Không** dùng `ml-msg-intent` và `ml-msg-suggest` — hai cái đó là của chatbot.

**Files:**
- Create: `frontend/src/components/chat/MessageBubble.tsx`
- Create: `frontend/src/components/chat/ChatPhoto.tsx`
- Create: `docs/design-system/components/MessageBubble.md`
- Test: `frontend/src/components/chat/ChatPhoto.test.tsx`

**Interfaces:**
- Consumes: `ChatMessageItem`, `ChatAttachment` (Task 1); `ConversationApi.photoBlob` (Task 1); `formatTime` từ `@/lib/format`.
- Produces:
  - `<MessageBubble message={ChatMessageItem} mine={boolean} senderName={string} seen={boolean} />`
  - `<ChatPhoto attachment={ChatAttachment} alt={string} />`

- [ ] **Bước 1: Viết test đỏ cho `ChatPhoto`**

Ảnh là chỗ duy nhất trong component có logic đáng test: tải blob, dọn blob, và xử lý lỗi.

`frontend/src/components/chat/ChatPhoto.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ChatPhoto from './ChatPhoto';
import ConversationApi from '@/api-requests/conversation.requests';

vi.mock('@/api-requests/conversation.requests', () => ({
  default: { photoBlob: vi.fn() },
}));

const attachment = { attachmentId: 55, url: '/api/v1/attachments/55', width: 800, height: 600 };

describe('ChatPhoto', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  it('shows the photo once the blob has loaded', async () => {
    vi.mocked(ConversationApi.photoBlob).mockResolvedValue('blob:fake-1');

    render(<ChatPhoto attachment={attachment} alt="Photo" />);

    await waitFor(() => expect(screen.getByRole('img')).toHaveAttribute('src', 'blob:fake-1'));
  });

  /** Review Focus #4: ảnh của tin đã bị ẩn trả 403, mạng rớt trả lỗi. */
  it('shows a fallback when the photo cannot be loaded', async () => {
    vi.mocked(ConversationApi.photoBlob).mockRejectedValue(new Error('403'));

    render(<ChatPhoto attachment={attachment} alt="Photo" />);

    expect(await screen.findByText(/photo is not available/i)).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  /** Blob URL không tự thu hồi; không revoke là rò bộ nhớ mỗi lần cuộn qua một bức ảnh. */
  it('revokes the blob url on unmount', async () => {
    vi.mocked(ConversationApi.photoBlob).mockResolvedValue('blob:fake-2');
    const { unmount } = render(<ChatPhoto attachment={attachment} alt="Photo" />);
    await waitFor(() => expect(screen.getByRole('img')).toBeInTheDocument());

    unmount();

    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake-2');
  });

  /** Chừa đúng chỗ trước khi ảnh về: không để khung chat giật khi ảnh tải xong. */
  it('reserves the right space from the size the server gave', () => {
    vi.mocked(ConversationApi.photoBlob).mockReturnValue(new Promise(() => {}));

    const { container } = render(<ChatPhoto attachment={attachment} alt="Photo" />);

    expect(container.querySelector('[style*="aspect-ratio"]')).not.toBeNull();
  });
});
```

- [ ] **Bước 2: Chạy để chắc chắn đỏ**

```bash
cd frontend && npm test -- ChatPhoto
```

Expected: FAIL — `Failed to resolve import "./ChatPhoto"`.

- [ ] **Bước 3: Viết `ChatPhoto`**

`frontend/src/components/chat/ChatPhoto.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ConversationApi from '@/api-requests/conversation.requests';
import type { ChatAttachment } from '@/types/chat.types';

type Props = { attachment: ChatAttachment; alt: string };

/**
 * JWT đi ở header `Authorization`, không ở cookie, nên `<img src="/api/v1/attachments/5">` trả 401.
 * Tải bằng axios rồi bọc thành blob URL, và thu hồi lúc rời màn — blob không tự dọn.
 */
export default function ChatPhoto({ attachment, alt }: Props) {
  const { t } = useTranslation('common');
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let url: string | null = null;
    let alive = true;
    setSrc(null);
    setFailed(false);

    ConversationApi.photoBlob(attachment.attachmentId)
      .then((blobUrl) => {
        url = blobUrl;
        if (alive) setSrc(blobUrl);
        else URL.revokeObjectURL(blobUrl);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });

    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [attachment.attachmentId]);

  if (failed) {
    return (
      <span className="text-small text-ink-muted border-line-strong block rounded-2xl border p-3">
        {t('chat.photoUnavailable')}
      </span>
    );
  }

  // Chừa đúng chỗ theo kích thước server trả về, để khung chat không giật khi ảnh tải xong
  const ratio = attachment.width && attachment.height ? `${attachment.width} / ${attachment.height}` : '4 / 3';

  return (
    <span
      className="bg-surface-raised block max-w-[280px] overflow-hidden rounded-2xl"
      style={{ aspectRatio: ratio }}
    >
      {src ? <img src={src} alt={alt} className="h-full w-full object-cover" /> : null}
    </span>
  );
}
```

- [ ] **Bước 4: Chạy cho xanh**

```bash
cd frontend && npm test -- ChatPhoto
```

Expected: PASS (4 test). Key `chat.photoUnavailable` chưa có nên `t()` trả về chính chuỗi key — test tìm `/photo is not available/i` sẽ **đỏ**. Thêm key vào `frontend/src/locales/en/common.json`:

```json
  "chat": {
    "photoUnavailable": "This photo is not available."
  }
```

rồi chạy lại. Chín ngôn ngữ còn lại dịch ở Task 6.

- [ ] **Bước 5: Viết `MessageBubble`**

`frontend/src/components/chat/MessageBubble.tsx`:

```tsx
import { useTranslation } from 'react-i18next';
import ChatPhoto from './ChatPhoto';
import { formatTime } from '@/lib/format';
import type { ChatMessageItem } from '@/types/chat.types';

type Props = {
  message: ChatMessageItem;
  /** Tin của người đang đăng nhập: căn phải, nền brand. */
  mine: boolean;
  senderName: string;
  /** Chỉ có nghĩa với tin của mình: người kia đã đọc tới đây chưa. */
  seen?: boolean;
};

/**
 * Bong bóng chat giữa hai con người (FR-110, FR-115). **Không phải** `ChatMessage` — cái đó là của
 * trợ lý AI và bắt mỗi câu bot kèm nhãn "Intent: …" (FR-092, spec §10).
 *
 * Ghép từ class `ml-*` đã có của design system: `ml-msg`, `ml-msg-bot` (trái = người kia),
 * `ml-msg-user` (phải = mình), `ml-msg-bubble`, `ml-msg-meta`. Không thêm class mới, không sửa
 * `marketlink-components.css` (frontend/CLAUDE.md).
 */
export default function MessageBubble({ message, mine, senderName, seen }: Props) {
  const { t } = useTranslation('common');
  const side = mine ? 'ml-msg-user' : 'ml-msg-bot';

  return (
    <div className={`ml-msg ${side} font-sans`} data-testid={`message-${message.id}`}>
      <div className="ml-msg-bubble">
        {message.kind === 'image' && message.attachment ? (
          <ChatPhoto attachment={message.attachment} alt={t('chat.photoFrom', { name: senderName })} />
        ) : (
          <span className="whitespace-pre-wrap break-words">{message.body}</span>
        )}
      </div>
      <div className="ml-msg-meta">
        {/* createdAt là ISO; formatClock chỉ nhận "07:30" nên ở đây phải là formatTime(Date) */}
        <time dateTime={message.createdAt}>{formatTime(new Date(message.createdAt))}</time>
        {mine && seen ? <span>{t('chat.seen')}</span> : null}
      </div>
    </div>
  );
}
```

Thêm vào `frontend/src/locales/en/common.json`, trong khối `chat` vừa tạo:

```json
    "photoFrom": "Photo from {{name}}",
    "seen": "Seen"
```

> Đã kiểm: `formatClock(hhmm: string)` dành cho giờ mở sạp dạng `"07:00"`, còn `formatTime(date: Date)` mới là hàm đổi một mốc thời gian sang giờ theo Settings của người đọc. Chat dùng `formatTime`.

- [ ] **Bước 6: Viết guide cho design system**

`docs/design-system/components/MessageBubble.md`:

```markdown
# MessageBubble

One message in a conversation between two people (FR-110, FR-115). **Not the same as
[ChatMessage](ChatMessage.md)**, which belongs to the shopping assistant and carries an
"Intent: …" label on every bot answer (FR-092).

- The consumer passes `message` (the API shape), `mine` (is it the reader's own message),
  `senderName`, and `seen` (only meaningful on your own messages).
- `mine` decides the side: the reader's own messages sit on the right on a brand-coloured bubble,
  the other person's on the left on a raised surface.
- A photo message renders the picture instead of text. The picture is fetched with the reader's
  token and shown from a blob URL — the attachment endpoint checks that the reader is in the
  conversation, so a plain `<img src>` would get a 401.
- The meta line under the bubble is the time, and on your own messages a "Seen" mark once the other
  person has read that far.
- Composed from the existing `ml-msg`, `ml-msg-bot`, `ml-msg-user`, `ml-msg-bubble` and
  `ml-msg-meta` classes. It adds no CSS of its own.

Preview: build a thread on `/messages` — there is no gallery entry yet.
```

- [ ] **Bước 7: Chạy test và lint**

```bash
cd frontend && npm test && npx prettier --write src && npm run lint && npm run build
```

Expected: tất cả xanh.

- [ ] **Bước 8: Commit**

```bash
git add frontend/src/components/chat/ frontend/src/locales/en/common.json \
        docs/design-system/components/MessageBubble.md
git commit -m "feat(FR-115): add MessageBubble and the authorized chat photo

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Hook `useConversation` — nối dữ liệu, realtime và đọc-tiếp

**Files:**
- Create: `frontend/src/lib/chat/useChat.ts`
- Test: `frontend/src/lib/chat/useChat.test.ts`

**Interfaces:**
- Consumes: `ConversationApi` (Task 1), `mergeMessage` / `prependOlder` / `oldestId` / `applyConversationEvent` (Task 2), `realtime.subscribe` từ `@/lib/realtime/stompClient`, `Session.getUser()` từ `@/utils/session`.
- Produces:
  - `useThreadList(): { threads, loading, error, reload }`
  - `useConversation(conversationId: number | null): { messages, loading, error, hasMore, loadOlder, send, sendPhoto, typing, otherTyping }`

**Destination STOMP** (spec §7.4, đã chạy thật ở Plan 2/3B):

| Đích | Mang gì |
|---|---|
| `/user/topic/messages` | `ChatMessageItem` — tin mới |
| `/user/topic/conversations` | `ConversationEventFrame` — `updated` / `read` / `hidden` |
| `/user/topic/typing` | `TypingFrame` |
| `/user/topic/presence` | `PresenceFrame` |

- [ ] **Bước 1: Viết test đỏ**

`frontend/src/lib/chat/useChat.test.ts`:

```ts
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useConversation, useThreadList } from './useChat';
import ConversationApi from '@/api-requests/conversation.requests';
import { realtime } from '@/lib/realtime/stompClient';

vi.mock('@/api-requests/conversation.requests', () => ({
  default: {
    list: vi.fn(),
    messages: vi.fn(),
    send: vi.fn(),
    markRead: vi.fn(),
    uploadPhoto: vi.fn(),
  },
}));

const handlers = new Map<string, (body: string) => void>();
vi.mock('@/lib/realtime/stompClient', () => ({
  realtime: {
    start: vi.fn(),
    subscribe: vi.fn((destination: string, handler: (body: string) => void) => {
      handlers.set(destination, handler);
      return () => handlers.delete(destination);
    }),
  },
}));

vi.mock('@/utils/session', () => ({
  default: { getUser: () => ({ id: 7 }) },
}));

const msg = (id: number, senderId = 3) => ({
  id,
  conversationId: 42,
  senderId,
  kind: 'text' as const,
  body: `m${id}`,
  createdAt: '2026-09-26T10:00:00Z',
});

const emit = (destination: string, payload: unknown) =>
  act(() => handlers.get(destination)?.(JSON.stringify(payload)));

describe('useConversation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    handlers.clear();
    vi.mocked(ConversationApi.messages).mockResolvedValue({ success: true, message: 'OK', data: [msg(3), msg(2), msg(1)], timestamp: '' } as never);
    vi.mocked(ConversationApi.markRead).mockResolvedValue({ success: true, message: 'OK', data: null, timestamp: '' } as never);
  });

  it('loads the newest page oldest-first', async () => {
    const { result } = renderHook(() => useConversation(42));

    await waitFor(() => expect(result.current.messages.map((m) => m.id)).toEqual([1, 2, 3]));
  });

  it('marks the thread read once it is open', async () => {
    renderHook(() => useConversation(42));

    await waitFor(() => expect(ConversationApi.markRead).toHaveBeenCalledWith(42));
  });

  it('adds a message that arrives over the socket', async () => {
    const { result } = renderHook(() => useConversation(42));
    await waitFor(() => expect(result.current.messages).toHaveLength(3));

    emit('/user/topic/messages', msg(4));

    await waitFor(() => expect(result.current.messages.map((m) => m.id)).toEqual([1, 2, 3, 4]));
  });

  it('ignores a socket message for another thread', async () => {
    const { result } = renderHook(() => useConversation(42));
    await waitFor(() => expect(result.current.messages).toHaveLength(3));

    emit('/user/topic/messages', { ...msg(9), conversationId: 99 });

    await waitFor(() => expect(result.current.messages).toHaveLength(3));
  });

  /** Review Focus #1 ở tầng hook: gửi xong thì sự kiện về cũng không nhân đôi bong bóng. */
  it('does not show a message twice when the socket echoes what REST already returned', async () => {
    vi.mocked(ConversationApi.send).mockResolvedValue({ success: true, message: 'Sent.', data: msg(4, 7), timestamp: '' } as never);
    const { result } = renderHook(() => useConversation(42));
    await waitFor(() => expect(result.current.messages).toHaveLength(3));

    await act(() => result.current.send('hello'));
    emit('/user/topic/messages', msg(4, 7));

    await waitFor(() => expect(result.current.messages.filter((m) => m.id === 4)).toHaveLength(1));
  });

  it('asks for the next page back with the oldest id it has', async () => {
    const { result } = renderHook(() => useConversation(42));
    await waitFor(() => expect(result.current.messages).toHaveLength(3));
    vi.mocked(ConversationApi.messages).mockResolvedValue({ success: true, message: 'OK', data: [msg(0)], timestamp: '' } as never);

    await act(() => result.current.loadOlder());

    expect(ConversationApi.messages).toHaveBeenLastCalledWith(42, { before: 1, size: 30 });
  });

  /** Trang cuối trả ít hơn size → không còn gì để tải, nút "tải thêm" phải tắt. */
  it('knows when there is nothing older left', async () => {
    const { result } = renderHook(() => useConversation(42));

    await waitFor(() => expect(result.current.hasMore).toBe(false));
  });

  it('shows the other person typing, and only for this thread', async () => {
    const { result } = renderHook(() => useConversation(42));
    await waitFor(() => expect(result.current.messages).toHaveLength(3));

    emit('/user/topic/typing', { conversationId: 42, userId: 3, typing: true });
    await waitFor(() => expect(result.current.otherTyping).toBe(true));

    emit('/user/topic/typing', { conversationId: 99, userId: 3, typing: false });
    await waitFor(() => expect(result.current.otherTyping).toBe(true));
  });

  it('does nothing at all when no thread is open', async () => {
    renderHook(() => useConversation(null));

    expect(ConversationApi.messages).not.toHaveBeenCalled();
    expect(ConversationApi.markRead).not.toHaveBeenCalled();
  });

  /** Review Focus #3: STOMP tự nối lại nhưng không phát lại tin đã lỡ. */
  it('refetches the open thread when the socket comes back', async () => {
    const { result } = renderHook(() => useConversation(42));
    await waitFor(() => expect(result.current.messages).toHaveLength(3));
    vi.mocked(ConversationApi.messages).mockClear();

    act(() => {
      globalThis.dispatchEvent(new Event('online'));
    });

    await waitFor(() => expect(ConversationApi.messages).toHaveBeenCalledWith(42, { size: 30 }));
  });
});

describe('useThreadList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    handlers.clear();
    vi.mocked(ConversationApi.list).mockResolvedValue({
      success: true,
      message: 'OK',
      data: { items: [{ id: 42, other: { id: 3, fullName: 'Cô Tư', image: null, online: true, lastSeenAt: null }, lastMessageText: 'hi', lastMessageAt: '2026-09-26T09:00:00Z', unreadCount: 0 }], page: 1, pageSize: 20, total: 1 },
      timestamp: '',
    } as never);
  });

  it('moves a thread to the top when an event touches it', async () => {
    const { result } = renderHook(() => useThreadList());
    await waitFor(() => expect(result.current.threads).toHaveLength(1));

    emit('/user/topic/conversations', {
      type: 'updated',
      conversationId: 42,
      lastMessageText: 'still fresh?',
      unreadCount: 2,
    });

    await waitFor(() => expect(result.current.threads[0].unreadCount).toBe(2));
    expect(result.current.threads[0].lastMessageText).toBe('still fresh?');
  });

  it('surfaces a load error instead of an empty list', async () => {
    vi.mocked(ConversationApi.list).mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useThreadList());

    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.loading).toBe(false);
  });
});
```

- [ ] **Bước 2: Chạy để chắc chắn đỏ**

```bash
cd frontend && npm test -- useChat
```

Expected: FAIL — `Failed to resolve import "./useChat"`.

- [ ] **Bước 3: Viết hook**

`frontend/src/lib/chat/useChat.ts`:

```ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { applyConversationEvent, mergeMessage, oldestId, prependOlder } from './merge';
import ConversationApi from '@/api-requests/conversation.requests';
import { realtime } from '@/lib/realtime/stompClient';
import type {
  ChatMessageItem,
  ConversationEventFrame,
  ConversationSummary,
  TypingFrame,
} from '@/types/chat.types';
import Session from '@/utils/session';

const PAGE = 30;
const MESSAGES = '/user/topic/messages';
const CONVERSATIONS = '/user/topic/conversations';
const TYPING = '/user/topic/typing';

const parse = <T,>(body: string): T | null => {
  try {
    return JSON.parse(body) as T;
  } catch {
    return null;
  }
};

/** Danh sách thread của người đang đăng nhập, tự nhảy lên đầu khi có tin mới. */
export function useThreadList() {
  const [threads, setThreads] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await ConversationApi.list({ page: 1, size: 20 });
      setThreads(response.data.items);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    realtime.start();
    return realtime.subscribe(CONVERSATIONS, (body) => {
      const frame = parse<ConversationEventFrame>(body);
      if (frame) setThreads((current) => applyConversationEvent(current, frame));
    });
  }, []);

  return { threads, loading, error, reload };
}

/** Một cuộc hội thoại đang mở. conversationId null = chưa chọn thread nào (màn 375px). */
export function useConversation(conversationId: number | null) {
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const meId = Session.getUser()?.id ?? null;
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadNewest = useCallback(async () => {
    if (conversationId === null) return;
    setLoading(true);
    setError(false);
    try {
      const response = await ConversationApi.messages(conversationId, { size: PAGE });
      // API trả mới → cũ; state giữ cũ → mới
      setMessages([...response.data].reverse());
      setHasMore(response.data.length === PAGE);
      await ConversationApi.markRead(conversationId);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    setMessages([]);
    setOtherTyping(false);
    void loadNewest();
  }, [loadNewest]);

  /**
   * Review Focus #3: STOMP tự nối lại sau 5 giây nhưng KHÔNG phát lại những tin tới lúc rớt. Mạng
   * về thì tải lại trang mới nhất, nếu không thread sẽ thủng một khoảng mà không ai biết.
   */
  useEffect(() => {
    const onBack = () => void loadNewest();
    globalThis.addEventListener('online', onBack);
    return () => globalThis.removeEventListener('online', onBack);
  }, [loadNewest]);

  useEffect(() => {
    if (conversationId === null) return;
    realtime.start();
    const offMessages = realtime.subscribe(MESSAGES, (body) => {
      const incoming = parse<ChatMessageItem>(body);
      if (!incoming || incoming.conversationId !== conversationId) return;
      setMessages((current) => mergeMessage(current, incoming));
      if (incoming.senderId !== meId) void ConversationApi.markRead(conversationId);
    });
    const offTyping = realtime.subscribe(TYPING, (body) => {
      const frame = parse<TypingFrame>(body);
      if (!frame || frame.conversationId !== conversationId) return;
      setOtherTyping(frame.typing);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      // Người kia đóng tab giữa chừng thì ba chấm phải tự tắt
      if (frame.typing) typingTimer.current = setTimeout(() => setOtherTyping(false), 6000);
    });
    return () => {
      offMessages();
      offTyping();
      if (typingTimer.current) clearTimeout(typingTimer.current);
    };
  }, [conversationId, meId]);

  const loadOlder = useCallback(async () => {
    if (conversationId === null || messages.length === 0) return;
    const before = oldestId(messages);
    const response = await ConversationApi.messages(conversationId, { before, size: PAGE });
    setMessages((current) => prependOlder(current, response.data));
    setHasMore(response.data.length === PAGE);
  }, [conversationId, messages]);

  const send = useCallback(
    async (body: string) => {
      if (conversationId === null) return;
      const response = await ConversationApi.send(conversationId, { body });
      setMessages((current) => mergeMessage(current, response.data));
    },
    [conversationId],
  );

  const sendPhoto = useCallback(
    async (file: File) => {
      if (conversationId === null) return;
      const uploaded = await ConversationApi.uploadPhoto(file);
      const response = await ConversationApi.send(conversationId, {
        kind: 'image',
        attachmentId: uploaded.data.attachmentId,
      });
      setMessages((current) => mergeMessage(current, response.data));
    },
    [conversationId],
  );

  return { messages, loading, error, hasMore, loadOlder, send, sendPhoto, otherTyping, meId };
}
```

- [ ] **Bước 4: Chạy cho xanh**

```bash
cd frontend && npm test -- useChat
```

Expected: PASS (13 test). Đỏ ở `refetchesTheOpenThreadWhenTheSocketComesBack` thì kiểm jsdom có phát `online` không — nếu không, đổi test sang gọi thẳng `result.current` sau khi `globalThis.dispatchEvent`, hoặc dùng `window.dispatchEvent`.

- [ ] **Bước 5: Commit**

```bash
cd frontend && npx prettier --write src && npm run lint && cd ..
git add frontend/src/lib/chat/
git commit -m "feat(FR-111): a chat hook that survives reconnects and duplicate events

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Component hội thoại dùng chung cho cả hai vai

Spec §9.3: Farmer "dùng lại **đúng** component hội thoại của Customer; chỉ khác vỏ ngoài". Task này viết cái ruột đó một lần.

**Files:**
- Create: `frontend/src/components/chat/ThreadList.tsx`
- Create: `frontend/src/components/chat/ConversationPanel.tsx`
- Create: `frontend/src/components/chat/Composer.tsx`
- Test: `frontend/src/components/chat/ThreadList.test.tsx`

**Interfaces:**
- Consumes: `MessageBubble` (Task 3), `useConversation` (Task 4), `DataState` từ `@/components/ui/data-state`, `formatTime` / `formatDayMonth` từ `@/lib/format`.
- Produces:
  - `<ThreadList threads={ConversationSummary[]} activeId={number | null} onPick={(id: number) => void} loading={boolean} error={boolean} onRetry={() => void} />`
  - `<ConversationPanel conversationId={number | null} other={ChatParticipant | null} onBack={(() => void) | undefined} headerAction={ReactNode} />`
  - `<Composer onSend={(text: string) => Promise<void>} onSendPhoto={(file: File) => Promise<void>} disabled={boolean} disabledReason={string | undefined} />`

- [ ] **Bước 1: Viết test đỏ**

`frontend/src/components/chat/ThreadList.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ThreadList from './ThreadList';
import type { ConversationSummary } from '@/types/chat.types';

const thread = (id: number, unreadCount = 0, fullName = 'Cô Tư'): ConversationSummary => ({
  id,
  other: { id: id + 100, fullName, image: null, online: false, lastSeenAt: null },
  lastMessageText: 'Five bunches left',
  lastMessageAt: '2026-09-26T09:00:00Z',
  unreadCount,
});

describe('ThreadList', () => {
  it('shows a loading state before the first page arrives', () => {
    render(<ThreadList threads={[]} activeId={null} onPick={vi.fn()} loading error={false} onRetry={vi.fn()} />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  /** Review Focus #5: người dùng mới, chưa nhắn ai. */
  it('shows an empty state with something to do', () => {
    render(
      <ThreadList threads={[]} activeId={null} onPick={vi.fn()} loading={false} error={false} onRetry={vi.fn()} />,
    );

    expect(screen.getByText(/no conversations yet/i)).toBeInTheDocument();
    expect(screen.getByText(/message a stall/i)).toBeInTheDocument();
  });

  it('offers a retry when the list could not be loaded', async () => {
    const onRetry = vi.fn();
    render(<ThreadList threads={[]} activeId={null} onPick={vi.fn()} loading={false} error onRetry={onRetry} />);

    await userEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(onRetry).toHaveBeenCalled();
  });

  it('marks the unread ones and tells the reader how many', () => {
    render(
      <ThreadList
        threads={[thread(1, 3), thread(2, 0, 'Gió Nam')]}
        activeId={null}
        onPick={vi.fn()}
        loading={false}
        error={false}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(/3 unread/i)).toBeInTheDocument();
  });

  it('tells assistive tech which thread is open', () => {
    render(
      <ThreadList
        threads={[thread(1), thread(2, 0, 'Gió Nam')]}
        activeId={2}
        onPick={vi.fn()}
        loading={false}
        error={false}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /gió nam/i })).toHaveAttribute('aria-current', 'true');
  });

  it('opens a thread when it is picked', async () => {
    const onPick = vi.fn();
    render(
      <ThreadList threads={[thread(7)]} activeId={null} onPick={onPick} loading={false} error={false} onRetry={vi.fn()} />,
    );

    await userEvent.click(screen.getByRole('button', { name: /cô tư/i }));

    expect(onPick).toHaveBeenCalledWith(7);
  });
});
```

- [ ] **Bước 2: Chạy để chắc chắn đỏ**

```bash
cd frontend && npm test -- ThreadList
```

Expected: FAIL — `Failed to resolve import "./ThreadList"`.

- [ ] **Bước 3: Viết `ThreadList`**

`frontend/src/components/chat/ThreadList.tsx`:

```tsx
import { useTranslation } from 'react-i18next';
import { DataState } from '@/components/ui/data-state';
import { Button } from '@/components/ui/button';
import { formatDayMonth, formatTime } from '@/lib/format';
import type { ConversationSummary } from '@/types/chat.types';

type Props = {
  threads: ConversationSummary[];
  activeId: number | null;
  onPick: (id: number) => void;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
};

/** Hôm nay thì hiện giờ, cũ hơn thì hiện ngày — cùng quy ước với danh sách đơn. */
const when = (iso: string | null) => {
  if (!iso) return '';
  const at = new Date(iso);
  const sameDay = new Date().toDateString() === at.toDateString();
  return sameDay ? formatTime(at) : formatDayMonth(at);
};

export default function ThreadList({ threads, activeId, onPick, loading, error, onRetry }: Props) {
  const { t } = useTranslation('common');

  if (loading) {
    return (
      <div role="status" className="text-small text-ink-muted p-4">
        {t('chat.loadingThreads')}
      </div>
    );
  }

  if (error) {
    return (
      <DataState
        variant="error"
        title={t('chat.threadsErrorTitle')}
        text={t('chat.threadsErrorText')}
        action={
          <Button variant="secondary" size="sm" onClick={onRetry}>
            {t('chat.tryAgain')}
          </Button>
        }
      />
    );
  }

  if (threads.length === 0) {
    return <DataState title={t('chat.noThreadsTitle')} text={t('chat.noThreadsText')} />;
  }

  return (
    <ul className="flex flex-col">
      {threads.map((thread) => (
        <li key={thread.id}>
          <button
            type="button"
            onClick={() => onPick(thread.id)}
            aria-current={activeId === thread.id ? 'true' : undefined}
            className={`border-line-strong flex w-full items-start gap-3 border-b p-3 text-left ${
              activeId === thread.id ? 'bg-surface-raised' : ''
            }`}
          >
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="text-ink truncate font-sans font-semibold">{thread.other.fullName}</span>
                <span className="text-small text-ink-muted shrink-0">{when(thread.lastMessageAt)}</span>
              </span>
              <span className="text-small text-ink-muted mt-1 block truncate">{thread.lastMessageText}</span>
            </span>
            {thread.unreadCount > 0 ? (
              <span
                aria-label={t('chat.unreadCount', { count: thread.unreadCount })}
                className="bg-brand text-on-brand text-small mt-1 shrink-0 rounded-full px-2"
              >
                {thread.unreadCount}
              </span>
            ) : null}
          </button>
        </li>
      ))}
    </ul>
  );
}
```

Thêm vào khối `chat` của `frontend/src/locales/en/common.json`:

```json
    "loadingThreads": "Loading conversations…",
    "threadsErrorTitle": "We could not load your conversations",
    "threadsErrorText": "Check your connection and try again.",
    "tryAgain": "Try again",
    "noThreadsTitle": "No conversations yet",
    "noThreadsText": "Message a stall from its page to ask about this week's produce.",
    "unreadCount_one": "{{count}} unread message",
    "unreadCount_other": "{{count}} unread messages"
```

- [ ] **Bước 4: Chạy cho xanh**

```bash
cd frontend && npm test -- ThreadList
```

Expected: PASS (6 test).

- [ ] **Bước 5: Viết `Composer`**

`frontend/src/components/chat/Composer.tsx`:

```tsx
import { useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

type Props = {
  onSend: (text: string) => Promise<void>;
  onSendPhoto: (file: File) => Promise<void>;
  disabled: boolean;
  /** Nút bị khoá luôn kèm lý do bằng chữ (frontend/CLAUDE.md). */
  disabledReason?: string;
};

export default function Composer({ onSend, onSendPhoto, disabled, disabledReason }: Props) {
  const { t } = useTranslation('common');
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || busy || disabled) return;
    setBusy(true);
    setFailed(null);
    try {
      await onSend(text);
      setDraft('');
    } catch {
      setFailed(t('chat.sendFailed'));
    } finally {
      setBusy(false);
    }
  };

  const pickPhoto = async (file: File | undefined) => {
    if (!file || disabled) return;
    setBusy(true);
    setFailed(null);
    try {
      await onSendPhoto(file);
    } catch {
      setFailed(t('chat.photoFailed'));
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  return (
    <form onSubmit={submit} className="border-line-strong border-t p-3">
      {disabled && disabledReason ? <p className="text-small text-ink-muted mb-2">{disabledReason}</p> : null}
      {failed ? (
        <p role="alert" className="text-small text-danger-ink mb-2">
          {failed}
        </p>
      ) : null}
      <div className="flex items-end gap-2">
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(event) => void pickPhoto(event.target.files?.[0])}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled || busy}
          onClick={() => fileInput.current?.click()}
        >
          {t('chat.attachPhoto')}
        </Button>
        <label className="sr-only" htmlFor="chat-draft">
          {t('chat.draftLabel')}
        </label>
        <textarea
          id="chat-draft"
          rows={1}
          value={draft}
          disabled={disabled || busy}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={t('chat.draftPlaceholder')}
          className="border-line-strong bg-surface text-ink min-h-10 flex-1 resize-none rounded-2xl border px-3 py-2 font-sans"
        />
        <Button type="submit" size="sm" disabled={disabled || busy || draft.trim().length === 0}>
          {t('chat.send')}
        </Button>
      </div>
    </form>
  );
}
```

Thêm key: `sendFailed`, `photoFailed`, `attachPhoto`, `draftLabel`, `draftPlaceholder`, `send`:

```json
    "sendFailed": "Your message was not sent. Try again.",
    "photoFailed": "The photo was not sent. Choose a JPEG, PNG or WebP under 5 MB.",
    "attachPhoto": "Add a photo",
    "draftLabel": "Write a message",
    "draftPlaceholder": "Write a message",
    "send": "Send"
```

- [ ] **Bước 6: Viết `ConversationPanel`**

`frontend/src/components/chat/ConversationPanel.tsx`:

```tsx
import { type ReactNode, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Composer from './Composer';
import MessageBubble from './MessageBubble';
import { Button } from '@/components/ui/button';
import { DataState } from '@/components/ui/data-state';
import { useConversation } from '@/lib/chat/useChat';
import { formatTime } from '@/lib/format';
import type { ChatParticipant } from '@/types/chat.types';

type Props = {
  conversationId: number | null;
  other: ChatParticipant | null;
  /** Chỉ có ở 375px: quay lại danh sách. Desktop truyền undefined. */
  onBack?: () => void;
  /** Chỗ cho nút riêng của từng vai (Farmer: "Make an offer" ở đợt 2). */
  headerAction?: ReactNode;
};

export default function ConversationPanel({ conversationId, other, onBack, headerAction }: Props) {
  const { t } = useTranslation('common');
  const { messages, loading, error, hasMore, loadOlder, send, sendPhoto, otherTyping, meId } =
    useConversation(conversationId);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  if (conversationId === null || !other) {
    return <DataState title={t('chat.pickThreadTitle')} text={t('chat.pickThreadText')} />;
  }

  return (
    <section className="flex min-h-0 flex-col" aria-label={t('chat.conversationWith', { name: other.fullName })}>
      <header className="border-line-strong flex items-center gap-3 border-b p-3">
        {onBack ? (
          <Button variant="secondary" size="sm" onClick={onBack}>
            {t('chat.back')}
          </Button>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-ink truncate font-sans font-semibold">{other.fullName}</p>
          <p className="text-small text-ink-muted">
            {other.online
              ? t('chat.online')
              : other.lastSeenAt
                ? t('chat.lastSeen', { time: formatTime(new Date(other.lastSeenAt)) })
                : t('chat.offline')}
          </p>
        </div>
        {headerAction}
      </header>

      <div className="ml-chat flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
        {hasMore ? (
          <Button variant="secondary" size="sm" onClick={() => void loadOlder()} className="self-center">
            {t('chat.loadOlder')}
          </Button>
        ) : null}

        {loading ? (
          <p role="status" className="text-small text-ink-muted">
            {t('chat.loadingMessages')}
          </p>
        ) : null}

        {error ? <DataState variant="error" title={t('chat.messagesErrorTitle')} text={t('chat.messagesErrorText')} /> : null}

        {!loading && !error && messages.length === 0 ? (
          <DataState title={t('chat.emptyThreadTitle')} text={t('chat.emptyThreadText')} />
        ) : null}

        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            mine={message.senderId === meId}
            senderName={message.senderId === meId ? t('chat.you') : other.fullName}
          />
        ))}

        {otherTyping ? (
          <p className="text-small text-ink-muted" aria-live="polite">
            {t('chat.typing', { name: other.fullName })}
          </p>
        ) : null}
        <div ref={bottom} />
      </div>

      <Composer onSend={send} onSendPhoto={sendPhoto} disabled={false} />
    </section>
  );
}
```

Thêm key: `pickThreadTitle`, `pickThreadText`, `back`, `online`, `offline`, `lastSeen`, `loadOlder`, `loadingMessages`, `messagesErrorTitle`, `messagesErrorText`, `emptyThreadTitle`, `emptyThreadText`, `you`, `typing`, `conversationWith`:

```json
    "pickThreadTitle": "Pick a conversation",
    "pickThreadText": "Choose a stall on the left to read the messages.",
    "back": "Back",
    "online": "Online",
    "offline": "Offline",
    "lastSeen": "Last seen {{time}}",
    "loadOlder": "Load older messages",
    "loadingMessages": "Loading messages…",
    "messagesErrorTitle": "We could not load this conversation",
    "messagesErrorText": "Check your connection and open it again.",
    "emptyThreadTitle": "No messages yet",
    "emptyThreadText": "Say hello and ask about this week's produce.",
    "you": "You",
    "typing": "{{name}} is typing…",
    "conversationWith": "Conversation with {{name}}"
```

- [ ] **Bước 7: Chạy test và build**

```bash
cd frontend && npm test && npx prettier --write src && npm run lint && npm run build
```

Expected: tất cả xanh.

- [ ] **Bước 8: Commit**

```bash
git add frontend/src/components/chat/ frontend/src/locales/en/common.json
git commit -m "feat(FR-110): shared thread list, conversation panel and composer

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Hai trang thật, responsive, và i18n mười ngôn ngữ

**Files:**
- Rewrite: `frontend/src/pages/customer/Messages/index.tsx`
- Rewrite: `frontend/src/pages/farmer/Messages/index.tsx`
- Modify: `frontend/src/locales/{en,vi,zh,ja,ko,fr,es,de,th,id}/common.json`
- Test: `frontend/src/pages/customer/Messages/index.test.tsx`

**Interfaces:**
- Consumes: `ThreadList`, `ConversationPanel` (Task 5), `useThreadList` (Task 4).
- Produces: hai trang, không xuất gì cho task sau.

**375px là hai màn riêng (spec §9.2):** dưới `md`, hiện **hoặc** danh sách **hoặc** hội thoại — chọn theo `activeId`. Từ `md` trở lên hiện hai cột. Nhồi hai cột vào 375px là không đọc được.

- [ ] **Bước 1: Viết test đỏ**

`frontend/src/pages/customer/Messages/index.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CustomerMessagesPage from './index';

const threads = [
  {
    id: 42,
    other: { id: 3, fullName: 'Cô Tư', image: null, online: true, lastSeenAt: null },
    lastMessageText: 'Five bunches left',
    lastMessageAt: '2026-09-26T09:00:00Z',
    unreadCount: 1,
  },
];

const useThreadList = vi.fn();
vi.mock('@/lib/chat/useChat', () => ({
  useThreadList: () => useThreadList(),
  useConversation: () => ({
    messages: [],
    loading: false,
    error: false,
    hasMore: false,
    loadOlder: vi.fn(),
    send: vi.fn(),
    sendPhoto: vi.fn(),
    otherTyping: false,
    meId: 7,
  }),
}));

describe('CustomerMessagesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useThreadList.mockReturnValue({ threads, loading: false, error: false, reload: vi.fn() });
  });

  it('lists the threads', async () => {
    render(<CustomerMessagesPage />);

    expect(await screen.findByRole('button', { name: /cô tư/i })).toBeInTheDocument();
  });

  /** Spec §9.2: 375px là hai màn riêng, nên phải có đường quay lại sau khi mở một thread. */
  it('offers a way back once a thread is open', async () => {
    render(<CustomerMessagesPage />);

    await userEvent.click(await screen.findByRole('button', { name: /cô tư/i }));

    await waitFor(() => expect(screen.getByRole('button', { name: /^back$/i })).toBeInTheDocument());
  });

  it('shows the load error with a retry instead of an empty page', async () => {
    const reload = vi.fn();
    useThreadList.mockReturnValue({ threads: [], loading: false, error: true, reload });
    render(<CustomerMessagesPage />);

    await userEvent.click(await screen.findByRole('button', { name: /try again/i }));

    expect(reload).toHaveBeenCalled();
  });
});
```

- [ ] **Bước 2: Chạy để chắc chắn đỏ**

```bash
cd frontend && npm test -- Messages
```

Expected: FAIL — trang hiện tại dùng `THREADS` viết cứng nên không có nút "Try again", và không có nút "Back".

- [ ] **Bước 3: Viết lại trang Customer**

Thay **toàn bộ** `frontend/src/pages/customer/Messages/index.tsx`:

```tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ConversationPanel from '@/components/chat/ConversationPanel';
import ThreadList from '@/components/chat/ThreadList';
import { Card } from '@/components/ui/card';
import { useThreadList } from '@/lib/chat/useChat';

/**
 * FR-110…115. Dưới `md` là HAI MÀN riêng (spec §9.2): danh sách, bấm vào mới mở hội thoại, có nút
 * quay lại. Nhồi hai cột vào 375px là không đọc được.
 */
export default function CustomerMessagesPage() {
  const { t } = useTranslation('CustomerMessages');
  const { threads, loading, error, reload } = useThreadList();
  const [activeId, setActiveId] = useState<number | null>(null);
  const active = threads.find((thread) => thread.id === activeId) ?? null;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4">
      <header>
        <h1 className="text-ink font-hand text-h1">{t('title')}</h1>
        <p className="text-ink-muted mt-1">{t('intro')}</p>
      </header>

      <Card className="grid min-h-[60vh] grid-cols-1 overflow-hidden md:grid-cols-[minmax(0,20rem)_1fr]">
        <div className={`border-line-strong md:border-r ${activeId === null ? 'block' : 'hidden md:block'}`}>
          <ThreadList
            threads={threads}
            activeId={activeId}
            onPick={setActiveId}
            loading={loading}
            error={error}
            onRetry={reload}
          />
        </div>
        <div className={`min-h-0 ${activeId === null ? 'hidden md:block' : 'block'}`}>
          <ConversationPanel
            conversationId={activeId}
            other={active?.other ?? null}
            onBack={() => setActiveId(null)}
          />
        </div>
      </Card>
    </div>
  );
}
```

> Đã kiểm: `Card` nhận `className` và hợp nhất bằng `Helper.cn`, mặc định đã có viền + nền và **không có padding**, nên `p-0` ở trên là thừa — bỏ đi cho gọn.

- [ ] **Bước 4: Viết lại trang Farmer**

Thay **toàn bộ** `frontend/src/pages/farmer/Messages/index.tsx`. Ruột giống hệt Customer; khác đúng hai thứ: namespace i18n `FarmerMessages`, và vỏ ngoài không có `max-w-5xl` vì dashboard shell đã bọc sẵn:

```tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ConversationPanel from '@/components/chat/ConversationPanel';
import ThreadList from '@/components/chat/ThreadList';
import { Card } from '@/components/ui/card';
import { useThreadList } from '@/lib/chat/useChat';

/** FR-110…115, spec §9.3: dùng lại ĐÚNG component hội thoại của Customer, chỉ khác vỏ ngoài. */
export default function FarmerMessagesPage() {
  const { t } = useTranslation('FarmerMessages');
  const { threads, loading, error, reload } = useThreadList();
  const [activeId, setActiveId] = useState<number | null>(null);
  const active = threads.find((thread) => thread.id === activeId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-ink font-hand text-h1">{t('title')}</h1>
        <p className="text-ink-muted mt-1">{t('intro')}</p>
      </header>

      <Card className="grid min-h-[60vh] grid-cols-1 overflow-hidden md:grid-cols-[minmax(0,20rem)_1fr]">
        <div className={`border-line-strong md:border-r ${activeId === null ? 'block' : 'hidden md:block'}`}>
          <ThreadList
            threads={threads}
            activeId={activeId}
            onPick={setActiveId}
            loading={loading}
            error={error}
            onRetry={reload}
          />
        </div>
        <div className={`min-h-0 ${activeId === null ? 'hidden md:block' : 'block'}`}>
          <ConversationPanel
            conversationId={activeId}
            other={active?.other ?? null}
            onBack={() => setActiveId(null)}
          />
        </div>
      </Card>
    </div>
  );
}
```

- [ ] **Bước 5: Dọn key i18n không còn dùng**

Hai file `CustomerMessages.json` và `FarmerMessages.json` (10 ngôn ngữ) có nhiều key của bản viết cứng cũ (`stallCount`, `orderCode`, `seeStall`, `openOrder`…). Giữ `title` và `intro`; xoá những key không còn chỗ gọi:

```bash
cd frontend
for key in stallCount_one stallCount_other conversationWith seeStall openOrder you; do
  grep -rln "\"$key\"" src/pages src/components || echo "  $key: không còn ai dùng"
done
```

Key nào không còn ai dùng thì xoá khỏi **cả 10** file của namespace đó. Đừng xoá mò: chạy lệnh trên trước.

- [ ] **Bước 6: Dịch khối `chat` sang chín ngôn ngữ còn lại**

Khối `chat` trong `src/locales/en/common.json` có ~24 key. Chép sang `vi zh ja ko fr es de th id` và dịch. Tiếng Việt:

```json
  "chat": {
    "photoUnavailable": "Không xem được ảnh này.",
    "photoFrom": "Ảnh của {{name}}",
    "seen": "Đã xem",
    "loadingThreads": "Đang tải cuộc trò chuyện…",
    "threadsErrorTitle": "Không tải được danh sách trò chuyện",
    "threadsErrorText": "Kiểm tra kết nối rồi thử lại.",
    "tryAgain": "Thử lại",
    "noThreadsTitle": "Chưa có cuộc trò chuyện nào",
    "noThreadsText": "Vào trang một sạp rồi nhắn cho họ để hỏi hàng tuần này.",
    "unreadCount_one": "{{count}} tin chưa đọc",
    "unreadCount_other": "{{count}} tin chưa đọc",
    "sendFailed": "Tin nhắn chưa gửi được. Thử lại nhé.",
    "photoFailed": "Ảnh chưa gửi được. Chọn ảnh JPEG, PNG hoặc WebP dưới 5 MB.",
    "attachPhoto": "Thêm ảnh",
    "draftLabel": "Viết tin nhắn",
    "draftPlaceholder": "Viết tin nhắn",
    "send": "Gửi",
    "pickThreadTitle": "Chọn một cuộc trò chuyện",
    "pickThreadText": "Chọn một sạp ở bên trái để đọc tin nhắn.",
    "back": "Quay lại",
    "online": "Đang online",
    "offline": "Ngoại tuyến",
    "lastSeen": "Hoạt động lúc {{time}}",
    "loadOlder": "Xem tin cũ hơn",
    "loadingMessages": "Đang tải tin nhắn…",
    "messagesErrorTitle": "Không tải được cuộc trò chuyện này",
    "messagesErrorText": "Kiểm tra kết nối rồi mở lại.",
    "emptyThreadTitle": "Chưa có tin nhắn nào",
    "emptyThreadText": "Chào một câu và hỏi hàng tuần này.",
    "you": "Bạn",
    "typing": "{{name}} đang nhập…",
    "conversationWith": "Trò chuyện với {{name}}"
  }
```

Tám ngôn ngữ còn lại dịch tương tự. **Thiếu key thì i18next hiện tiếng Anh**, không vỡ — nhưng thiếu là lỗi theo `frontend/CLAUDE.md`, nên phải đủ. Kiểm bằng:

```bash
cd frontend
for lang in vi zh ja ko fr es de th id; do
  n=$(python3 -c "import json;print(len(json.load(open('src/locales/$lang/common.json')).get('chat',{})))")
  echo "$lang: $n key (en có $(python3 -c "import json;print(len(json.load(open('src/locales/en/common.json'))['chat']))"))"
done
```

- [ ] **Bước 7: Chạy test, lint, build**

```bash
cd frontend && npm test && npx prettier --write src && npm run lint && npm run build
```

Expected: tất cả xanh.

- [ ] **Bước 8: Commit**

```bash
git add frontend/src/pages frontend/src/locales
git commit -m "feat(FR-110): real data and realtime on both messages pages

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Chạy thử trong trình duyệt thật, rồi PR

Test không chứng minh được giao diện. Task này mở app thật và xem.

- [ ] **Bước 1: Dựng dữ liệu để xem**

Backend ở `http://localhost:8080` (stack `market-link` chung). Tạo hai tài khoản và một thread:

```bash
reg() { curl -s -X POST http://localhost:8080/api/v1/auth/register -H 'Content-Type: application/json' \
  -d "{\"fullName\":\"$1\",\"phone\":\"$2\",\"email\":\"$3\",\"address\":\"1 Test St\",\"password\":\"Passw0rd!x\",\"confirmPassword\":\"Passw0rd!x\"}" \
  | python3 -c "import sys,json;d=json.load(sys.stdin)['data'];print(d['accessToken'], d['user']['id'])"; }
read TA IDA <<< "$(reg 'UI Alice' '0931100001' 'ui.alice@t.test')"
read TB IDB <<< "$(reg 'UI Bob'   '0931100002' 'ui.bob@t.test')"
docker compose -p market-link exec -T mysql mysql -uroot -proot intervue_db \
  -e "UPDATE users SET role='farmer' WHERE id=$IDB; INSERT IGNORE INTO farmer_profiles (user_id, stall_name, contact_person, approval_status) VALUES ($IDB,'UI Stall','UI Bob','approved');"
CONV=$(curl -s -X POST http://localhost:8080/api/v1/conversations -H "Authorization: Bearer $TA" \
  -H 'Content-Type: application/json' -d "{\"farmerUserId\":$IDB}" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['id'])")
for i in $(seq 1 40); do
  curl -s -X POST http://localhost:8080/api/v1/conversations/$CONV/messages -H "Authorization: Bearer $TB" \
    -H 'Content-Type: application/json' -d "{\"body\":\"tin so $i\"}" > /dev/null
done
echo "conv=$CONV  alice=$IDA  bob=$IDB"
```

40 tin để thử được nút "Load older messages" (trang là 30).

- [ ] **Bước 2: Xem và chụp màn hình**

Mở `http://localhost:3000`, đăng nhập `ui.alice@t.test` / `Passw0rd!x`, vào `/messages`. Kiểm từng mục và chụp lại:

| Kiểm | Mong đợi |
|---|---|
| Danh sách thread | Có "UI Bob", dòng xem trước, giờ |
| Mở thread | 30 tin mới nhất, **cuộn sẵn xuống đáy** |
| "Load older messages" | 10 tin cũ hơn chèn lên đầu, **không nhảy thứ tự**, nút biến mất |
| Gửi một tin | Bong bóng hiện **một lần**, căn phải, nền brand |
| **375px** (DevTools) | Chỉ thấy danh sách; bấm vào mới mở hội thoại; có nút **Back** |
| **768 / 1440** | Hai cột, không tràn ngang |
| **Dark theme** (Settings → Theme) | Chữ đọc được, bong bóng tương phản đủ |
| Đổi ngôn ngữ sang Tiếng Việt | Không còn chuỗi tiếng Anh sót trong khung chat |

- [ ] **Bước 3: Thử hai cửa sổ — realtime**

Mở cửa sổ thứ hai (ẩn danh), đăng nhập `ui.bob@t.test`, vào `/messages`.

| Kiểm | Mong đợi |
|---|---|
| Bob gửi tin | Alice thấy **trong vòng một giây**, không tải lại trang |
| Bob đang gõ | Alice thấy "UI Bob is typing…"; ngừng gõ thì mất |
| Alice đang mở thread | Badge chưa đọc của Alice **không** tăng |
| Alice ở trang khác, Bob gửi | Badge trong danh sách thread của Alice tăng, thread nhảy lên đầu |
| Bob gửi ảnh | Alice thấy ảnh (blob, không phải `<img src>` thẳng) |
| Ngắt mạng Alice 10 giây, Bob gửi 2 tin, nối lại | Alice thấy đủ cả 2 tin sau khi nối lại (Review Focus #3) |

- [ ] **Bước 4: Kiểm không rò blob URL**

Trong DevTools Console của Alice, sau khi cuộn qua lại vài lần khung có ảnh:

```js
performance.getEntriesByType('resource').filter((r) => r.name.startsWith('blob:')).length
```

Con số này không được tăng mãi theo số lần cuộn.

- [ ] **Bước 5: Chạy lần cuối và mở PR**

```bash
cd frontend && npm test && npx prettier --check src && npm run lint && npm run build && cd ..
git fetch origin && git rebase origin/dev
cd frontend && npm test && npm run build && cd ..
git push -u origin feature/FR-115-chat-ui
```

`gh pr create --base dev`, tiêu đề `feat(FR-110): real chat UI for customers and farmers`. Mô tả theo `.github/pull_request_template.md`, và **phải** nêu:

1. **Thêm Vitest vào dự án** — frontend trước giờ không có test nào và CI chỉ `lint + build`. Plan này thêm `vitest` + `@testing-library/react`, script `npm test`, và một bước `Test` vào job `frontend` của CI. Chỉ test **logic thuần** (gộp sự kiện realtime, khử trùng, phân trang keyset) và ba component có logic thật; không test render từng pixel.
2. **`MessageBubble` ghép từ class `ml-*` đã có**, không sửa `marketlink-components.css` (quyết định của LEAD 26/09). Guide ở `docs/design-system/components/MessageBubble.md`. Spec §10 nói thêm component vào design system là việc của FE1 — nếu FE1 muốn làm đúng cách đó về sau, component này đổi sang class mới mà không phải viết lại.
3. **Ảnh tải bằng blob** vì JWT ở header chứ không ở cookie; `<img src="/api/v1/attachments/5">` trả 401. Blob được thu hồi lúc rời màn.
4. **Chưa có trong PR này** (Plan 4B): nút Báo cáo trên tin nhắn, tab "Reported messages" của admin, sự kiện `hidden`, popover header, nút "Message this stall" ở trang sản phẩm/stall/đơn, cập nhật prototype. Backend của chúng nằm ở PR #138.
5. **Key i18n cũ đã xoá** khỏi `CustomerMessages`/`FarmerMessages` (10 ngôn ngữ) — liệt kê tên key trong mô tả để reviewer khỏi tưởng mất chữ.

- [ ] **Bước 6: Cập nhật ledger và bộ nhớ**

Ghi số PR và các phát hiện vào ledger. Cập nhật memory `chat-feature-plan.md`: Plan 4A xong, còn 4B.

---

## Việc cố tình để lại cho sau

| Việc | Ở đâu |
|---|---|
| Nút Báo cáo, tab kiểm duyệt admin, sự kiện `hidden` (FR-116) | **Plan 4B** — chờ PR #138 merge |
| Popover header hai biểu tượng (chuông + bong bóng), FR-117 | **Plan 4B** |
| Nút "Message this stall" ở trang sản phẩm / stall / chi tiết đơn (FR-114) | **Plan 4B** |
| Cập nhật `docs/prototype/` (6 file theo spec §11) | **Plan 4B** |
| Ô ghim sản phẩm / đơn trên bong bóng (`productId` / `orderId` đã có trong API) | **Plan 4B**, cùng với nút "Message this stall" |
| Đưa `MessageBubble` vào design system đúng cách (sinh lại 3 file) | **FE1**, khi nào họ chạy lại quy trình của design system |
| `price_offers` (FR-118, FR-119) | Đợt 2, chờ `products` và `orders` |
