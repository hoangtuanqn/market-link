# Bàn giao · Chat Plan 4A — giao diện Customer và Farmer

Ngày: 26/09/2026 · Người bàn giao: phiên Claude Code trước (đã làm Plan 3A, 3B, và Task 1–3 của 4A)
Người nhận: phiên mới, tiếp tục từ **Task 4**.

Tài liệu này tự chứa. Không cần đọc lại cuộc hội thoại cũ.

---

## 1. Đang ở đâu

| | |
|---|---|
| Worktree | `/Users/phong/projects/school/fpt-aptech/Code_project/techwiz7/market-link-chat4` |
| Nhánh | `feature/FR-115-chat-ui`, tách từ `origin/dev` tại `a2c5109` |
| Plan | `docs/superpowers/plans/2026-09-26-chat-ui-customer-farmer.md` — **7 task**, đã xong 1–3 |
| Ledger | `.superpowers/sdd/2026-09-26-chat-ui-customer-farmer/progress.md` (git-ignore, còn trên đĩa) |
| Spec | `docs/superpowers/specs/2026-09-25-farmer-customer-chat-design.md` — **nguồn sự thật**, plan chỉ là lập luận từ nó |
| Test | 30 xanh (`npm --prefix frontend test`) · prettier · eslint · build đều xanh |
| Working tree | Sạch, đã commit hết |

Bốn commit trên nhánh:

```
cec46c4 feat(FR-115): add MessageBubble and the authorized chat photo
de45a76 feat(FR-111): merge realtime chat events into the paged list
85848e9 chore(FR-115): add Vitest and the chat data client
007b13f docs(FR-115): plan for the real chat UI
```

**`dev` đã đi trước 22 commit** kể từ lúc tách nhánh. Rebase trước khi làm tiếp:

```bash
cd /Users/phong/projects/school/fpt-aptech/Code_project/techwiz7/market-link-chat4
git fetch origin && git rebase origin/dev
npm --prefix frontend test && npm --prefix frontend run build
```

---

## 2. Đã làm gì (Task 1–3)

| Task | Kết quả |
|---|---|
| **1** | Thêm **Vitest 5** + `@testing-library/react` + `jsdom`, script `npm test`, và một bước `Test` vào job `frontend` của CI (job đổi tên thành "Frontend · lint + test + build"). Thêm `src/types/chat.types.ts` và `src/api-requests/conversation.requests.ts`. 7 test. |
| **2** | `src/lib/chat/merge.ts` — bốn hàm thuần: `mergeMessage`, `prependOlder`, `oldestId`, `applyConversationEvent`. 17 test. Đây là chỗ dễ sai nhất của cả plan. |
| **3** | `src/components/chat/ChatPhoto.tsx` (ảnh qua blob) và `MessageBubble.tsx`, cộng guide `docs/design-system/components/MessageBubble.md`. 6 test. |

---

## 3. Còn phải làm

**Task 4** — hook `useThreadList` / `useConversation` (`src/lib/chat/useChat.ts`).
**Task 5** — `ThreadList`, `ConversationPanel`, `Composer` dùng chung cho cả hai vai.
**Task 6** — viết lại hai trang `/messages` bằng dữ liệu thật, responsive, i18n 10 ngôn ngữ.
**Task 7** — chạy thử trong trình duyệt thật (hai cửa sổ), rồi mở PR.

Plan có đủ code mẫu và test cho từng bước. **Đọc plan, đừng tự nghĩ lại thiết kế.**

---

## 4. Cách làm việc người dùng yêu cầu

- **Trả lời bằng tiếng Việt.**
- **Làm từng task một, rồi DỪNG** cho người dùng duyệt. Đây là yêu cầu tường minh, **ghi đè** quy tắc "chạy liên tục" của skill `superpowers:executing-plans`.
- **TDD thật**: viết test đỏ → chạy thấy đỏ → viết code → chạy thấy xanh → commit. Không viết code trước test.
- **Không theo dõi CI.** Người dùng nói: *"CI thì không cần theo dõi, có lỗi tôi sẽ báo tránh mất thời gian."*
- **Verify trước khi báo xong.** Chạy lệnh và đọc output thật, không suy đoán.
- **Ghi ledger** sau mỗi task: phát hiện, quyết định (`Ruling: <gì> — <vì sao> — <sai thì mất gì>`).
- Commit theo Conventional Commits có mã FR, kết thúc bằng `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

---

## 5. Luật bắt buộc — đọc trước khi gõ dòng code đầu tiên

### 5.1 Từ repo

- `CLAUDE.md` — R-01…R-08. Đáng chú ý: **R-05** (BE và FE lệch thì sửa bên sai, **không** sửa contract), **R-07** (không làm tính năng ngoài `.ai/REQUIREMENTS.md`), **R-08** (không commit/push vào `dev`/`main`).
- `frontend/CLAUDE.md` — design system, i18n, format, 4 trạng thái, responsive.
- `CONTRIBUTING.md` — nhánh, commit, PR.

### 5.2 Design system (dễ sai nhất với người mới)

- **Palette Tailwind mặc định đã TẮT.** `bg-white`, `text-zinc-*` **không tồn tại**. Chỉ dùng token: `bg-surface`, `bg-surface-raised`, `text-ink`, `text-ink-muted`, `border-line-strong`, `bg-brand text-on-brand`.
- **Không sửa tay** `src/styles/marketlink-*.css` và `docs/design-system/tokens.json`.
- Spacing chỉ `p-1/2/3/4/6/8/12/16`. **Không** `p-5`, `p-7`, `p-[18px]`.
- `font-hand` chỉ cho tên chợ, giá, nhãn. Tin nhắn người dùng dùng `font-sans`.
- Copy không viết cứng trong TSX → key i18n, dịch đủ **10 ngôn ngữ** (`en vi zh ja ko fr es de th id`).

### 5.3 Luật riêng rút ra từ các phiên trước (không có trong tài liệu repo)

Bốn điều này đã làm hỏng việc một lần rồi. Đừng lặp lại.

1. **Sửa file JSON i18n phải GỘP, không bao giờ gán đè cả khối.**
   Ở Task 3 tôi viết `d['chat'] = {...}` và xoá mất `chat.assistant`, `chat.you`, `chat.intent` của chatbot FR-090 → build đỏ `TS2345`. Sau mỗi lần sửa locale, chạy kiểm này:

   ```bash
   cd frontend && python3 - <<'PY'
   import json, subprocess
   orig = json.loads(subprocess.check_output(['git','show','HEAD:frontend/src/locales/en/common.json'], cwd='..'))
   now  = json.load(open('src/locales/en/common.json'))
   def flat(d, p=''):
       out=set()
       for k,v in d.items():
           key=f"{p}{k}"
           out |= flat(v, key+'.') if isinstance(v,dict) else {key}
       return out
   print("MẤT:", sorted(flat(orig) - flat(now)) or "không mất key nào")
   PY
   ```

2. **`formatClock(hhmm: string)` nhận chuỗi `"07:30"`, KHÔNG nhận ISO.**
   Mốc thời gian của chat là ISO → dùng `formatTime(date: Date)` và `formatDayMonth(date: Date)`. Gọi sai thì nó trả về nguyên chuỗi ISO mà không báo lỗi.

3. **ESLint React 19 cấm `setState` đồng bộ trong `useEffect`** (`react-hooks/set-state-in-effect`).
   Muốn reset state khi prop đổi thì dùng `key={...}` ở chỗ gọi, đúng khuyến nghị "you might not need an effect" của React.

4. **Hình dạng API lấy từ file `.java`, không đoán.**
   `ParticipantResource` dùng **`userId`** chứ không phải `id`, và có thêm `role`. `ConversationResource` có thêm `createdAt`. Kiểm bằng:

   ```bash
   sed -n '1,30p' backend/src/main/java/com/techx/intervue/modules/conversation/resources/ParticipantResource.java
   ```

---

## 6. Hạ tầng — đọc kỹ, máy đang chật

- **KHÔNG dựng stack Docker mới.** Máy chỉ có **7.8 GB** cho Docker và có nhiều agent cùng làm việc trên repo này. Đã có lần JVM test bị OOM killer giết (exit 137).
- Frontend chạy **trên host**: `cd frontend && npm run dev` → `http://localhost:3000`.
- Backend dùng **stack chung** `market-link` ở `http://localhost:8080`. Kiểm: `curl -s -o /dev/null -w '%{http_code}' http://localhost:8080/ping` → mong `200`. Không chạy thì nhờ người dùng bật `make up` ở worktree `market-link`.
- Stack `market-link-chat3b` của Plan 3B **đã được dọn** (PR #138 merged). Đừng dựng lại.

---

## 7. Nhiều agent cùng làm — điều phải để ý

Lúc bàn giao có **7 worktree** khác đang hoạt động: `market-link` (fix/FR-002), `market-link-audit`, `market-link-brand`, `market-link-core` (FR-062 products), `market-link-flyway`, `market-link-split`, và `market-link-chat4` (của bạn).

- **`dev` nhích rất nhanh** — có ngày 20+ commit. Rebase thường xuyên, và rebase lại ngay trước khi push.
- **Số migration hay va chạm.** Plan 4A không thêm migration nào nên bạn không lo, nhưng nếu phải thêm thì kiểm `git ls-tree -r --name-only origin/dev -- backend/src/main/resources/db/migration | sort | tail -3` trước.
- **Khi đổi số migration, giới hạn phạm vi `sed` vào file của mình.** Một lần tôi quét cả `docs/` và sửa nhầm plan của agent khác; may mà phát hiện ngay.
- Xung đột rebase ở `README.md` đã xảy ra một lần (hai agent cùng thêm mục vào một chỗ) — giữ cả hai phần, đừng chọn một.

---

## 8. Bối cảnh tính năng chat

Chat người–người **không có trong SRS** — R-07 đã cảnh báo, người dùng (LEAD) quyết định vẫn làm. FR-110…117 là đề xuất trong spec §4, **chưa** được QA/DOC đưa vào `.ai/REQUIREMENTS.md`. Nhắc điều này trong mô tả PR.

Bốn plan, theo thứ tự:

| Plan | Nội dung | Trạng thái |
|---|---|---|
| 1 | REST lõi (thread, tin nhắn, chưa đọc) | PR #108 **merged** |
| 2 | Realtime STOMP qua RabbitMQ | PR #120 **merged** |
| 3A | Ảnh đính kèm + rate limit | PR #129 **merged** |
| 3B | Báo cáo tin + kiểm duyệt admin | PR #138 **merged** |
| **4A** | **UI Customer + Farmer** | **đang làm — Task 4/7** |
| 4B | Nút báo cáo, tab admin, popover header, prototype | chưa viết plan |

**Quan trọng:** plan 4A viết lúc PR #138 **chưa** merge, nên nó dồn mọi thứ thuộc FR-116 sang 4B. **Giờ #138 đã merge**, backend báo cáo/kiểm duyệt đã có trên `dev`. Ranh giới 4A/4B **giữ nguyên** (đừng mở rộng 4A giữa chừng), nhưng khi viết plan 4B thì không còn bị chặn nữa.

Ba sự thật kỹ thuật đã kiểm bằng tay ở các phiên trước, **đừng kiểm lại từ đầu**:

1. **JWT ở header `Authorization`, không ở cookie** → `<img src="/api/v1/attachments/5">` trả **401**. Ảnh phải `fetch` kèm header rồi `URL.createObjectURL(blob)`. `ChatPhoto` đã làm đúng việc này ở Task 3.
2. **Một kết nối STOMP cho cả app**: `src/lib/realtime/stompClient.ts` (do FR-042 dựng, có sẵn comment "và về sau chat Plan 4"). API: `realtime.start()` và `realtime.subscribe(destination, handler)` trả hàm huỷ. **Đừng tạo `Client` thứ hai.**
3. **Destination** (spec §7.4, đã chạy thật): `/user/topic/messages`, `/user/topic/conversations`, `/user/topic/typing`, `/user/topic/presence`.

---

## 9. Bắt đầu thế nào

```bash
cd /Users/phong/projects/school/fpt-aptech/Code_project/techwiz7/market-link-chat4
git status && git log --oneline -4
git fetch origin && git rebase origin/dev
npm --prefix frontend install
npm --prefix frontend test          # mong 30 xanh
npm --prefix frontend run build     # mong xanh
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/ping   # mong 200
```

Rồi mở plan ở mục **Task 4**, làm đúng từng bước, và dừng lại báo cáo khi xong Task 4.
