> Bản sao ledger của phiên trước, commit vào nhánh để phiên sau đọc được (.superpowers/ là git-ignore).
> Phiên mới tiếp tục ghi vào .superpowers/sdd/2026-09-26-chat-ui-customer-farmer/progress.md, không sửa file này.

# SDD ledger — plan: docs/superpowers/plans/2026-09-26-chat-ui-customer-farmer.md
Spec: docs/superpowers/specs/2026-09-25-farmer-customer-chat-design.md (read; binding)
Branch: feature/FR-115-chat-ui from origin/dev (a2c5109), worktree market-link-chat4. Frontend chạy trên host (npm run dev :3000), backend dùng stack chung market-link :8080 — KHÔNG dựng stack Docker thứ tư, máy đang chật.
Chế độ: người dùng yêu cầu DỪNG sau mỗi task để duyệt — ghi đè quy tắc "chạy liên tục" của executing-plans.

## Pre-flight (shared interfaces)
- T1→T2/T3/T4: chat.types.ts (ConversationSummary, ChatAttachment, ChatMessageItem, ConversationEventFrame, TypingFrame, PresenceFrame) và ConversationApi (list/open/messages/send/markRead/unreadCount/uploadPhoto/photoBlob): clean, mọi task sau chỉ đọc.
- T2→T4: mergeMessage / prependOlder / oldestId / applyConversationEvent — T4 gọi đúng bốn hàm này với đúng chữ ký: clean.
- T3→T5: <MessageBubble message mine senderName seen /> và <ChatPhoto attachment alt />: clean.
- T4→T5/T6: useConversation trả { messages, loading, error, hasMore, loadOlder, send, sendPhoto, otherTyping, meId }; useThreadList trả { threads, loading, error, reload }. T5 dùng useConversation trong ConversationPanel, T6 dùng useThreadList ở trang: clean, tên trường khớp.
- T5→T6: <ThreadList threads activeId onPick loading error onRetry />, <ConversationPanel conversationId other onBack headerAction />, <Composer onSend onSendPhoto disabled disabledReason />: clean.
- T1→T6: key i18n khối `chat` trong common.json cộng dồn qua T3 (3 key), T5 (~21 key); T6 dịch toàn bộ sang 9 ngôn ngữ. Rủi ro: T6 phải đếm lại số key thực tế chứ không tin con số trong plan — đã ghi lệnh đếm trong plan.
- T3→T6: locales/en/common.json bị cả T3 và T5 sửa, rồi T6 sửa 10 file. Không phải xung đột, chỉ là cùng file qua nhiều task: mỗi task thêm key của mình, không xoá key task trước.

## Rulings
Setup: complete (backend chung :8080 trả 200; frontend baseline prettier/eslint/build đều exit 0)
- Task 1: FINDING (plan đoán sai hình dạng API): ParticipantResource của backend dùng **`userId`** chứ không phải `id`, và có thêm trường `role`; ConversationResource có thêm `createdAt`. Đã kiểm thẳng file .java trước khi viết type (plan có dặn làm vậy) và sửa chat.types.ts theo backend, không sửa backend (R-05).
- Task 1: FINDING (xung đột phiên bản): vite gốc của dự án là **8.3.0** nhưng vitest 3.2.7 kéo theo **vite 7.3.6** lồng bên trong, nên type augmentation của nó không khớp `defineConfig` và `npm run build` đỏ TS2769. Thử `/// <reference types="vitest/config" />` vẫn đỏ. Ruling: nâng **vitest@^5** (peer cho phép vite ^8) thay vì lách bằng file vitest.config.ts riêng hay hạ vite — sau khi nâng, vitest dùng chung vite 8, hết bản lồng, build và test đều xanh; cost if wrong: vitest 5 mới hơn plan viết (^3), API `defineConfig`/`vi` dùng trong plan không đổi.
- Task 1: CI job `frontend` đổi tên thành "Frontend · lint + test + build" và thêm bước `npm test` giữa ESLint và Build.
Task 1: complete (commits 007b13f..85848e9, tests: npm --prefix frontend test →    Duration  661ms (environment 85%, setup 6%, transform 6%, import 1%, tests 1%, worker 1%))
- Task 2: note: plan viết mergeMessage bằng một biểu thức ba ngôi lồng khó đọc (`next[next.length - 2] && ... ? sort : next`). Viết lại thành hai nhánh rõ: id lớn hơn phần tử cuối thì nối đuôi (đường thường), còn lại mới sort. Cùng hành vi, dễ đọc hơn, và test `keeps the list sorted by id even if an event arrives out of order` ghim cả hai nhánh.
- Task 2: note: dùng `??` chứ không `||` cho unreadCount — `||` sẽ nuốt mất một số 0 gửi thật. Thêm test `accepts a count of zero, which is different from a missing one` để ghim khác biệt đó, ngoài ca "thiếu thì giữ nguyên" mà plan đã có.
- Task 2: 17 test cho merge.ts; tổng suite FE 24 test. prettier/eslint/build đều xanh.
Task 2: complete (commits 85848e9..de45a76, tests: npm --prefix frontend test →    Duration  581ms (environment 83%, setup 8%, transform 6%, import 2%, worker 1%, tests 1%))
- Task 3: FINDING (lỗi của tôi, suýt xoá việc người khác): script python đầu tiên gán `d['chat'] = {...}` nên **ghi đè** khối `chat` đã có trong en/common.json của chatbot FR-090 (`assistant`, `you`, `intent`) → build đỏ TS2345 ở ChatMessage.tsx. Khôi phục bằng cách đọc lại khối gốc từ `git show HEAD:` rồi GỘP key mới vào. Đã thêm một bước kiểm so tập key trước/sau: MẤT = 0, THÊM = 3. Bài học: sửa file JSON i18n phải gộp, không bao giờ gán đè cả khối.
- Task 3: Ruling: bỏ `setSrc(null)/setFailed(false)` đồng bộ trong effect (ESLint react-hooks/set-state-in-effect của React 19 cấm) và reset state bằng `key={attachment.attachmentId}` ở chỗ gọi trong MessageBubble — đúng khuyến nghị "you might not need an effect" của React; cost if wrong: đổi ảnh trong cùng một bong bóng sẽ dựng lại component thay vì cập nhật tại chỗ, điều đó không xảy ra vì một tin chỉ có một ảnh
- Task 3: note: nạp i18n thật vào src/test/setup.ts để test khẳng định trên câu chữ tiếng Anh chứ không phải tên key. jsdom không có window.matchMedia (SettingsStore dùng cho dark theme) nên phải stub trước khi import i18n.
- Task 3: thêm test "revokes a blob that arrives after the component is gone" ngoài plan — rời màn trước khi blob về thì vẫn phải thu hồi và không được chạm state.
Task 3: complete (commits de45a76..cec46c4, tests: npm --prefix frontend test →    Duration  799ms (environment 48%, transform 30%, setup 12%, tests 6%, import 3%, worker 1%))
