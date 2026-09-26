# BÀN GIAO — plan core-commerce (C1–C11) · viết 26/09/2026 lúc kết thúc phiên 1

Tài liệu này để một phiên Claude Code khác **thay thế hoàn toàn** phiên trước, không cần hỏi lại.
Đọc theo đúng thứ tự: §1 → §2 → §3, rồi mới chạy lệnh ở §6.

---

## 0. Trạng thái mới nhất (26/09/2026, phiên 3) — đọc mục này trước, nó đè lên §2, §3, §10

**Chia việc (người dùng chốt):** phiên `market-link-core` (worktree này, stack `mlcore`) làm **C5 → C7 — đã xong**. Một phiên khác
làm **C8 → C11** trong worktree + stack Docker riêng (đề xuất `market-link-c8`, stack `mlc8`, BE :8092, FE :3022).
- **Số migration:** dev đã tự dùng `013`–`016`; C6/C7 lấy `017`, `018`. Mỗi phiên lấy số kế tiếp trên `origin/dev`
  lúc tạo file (phiên C8 đang dùng `020`+).
- **File hai phiên cùng sửa** (fetch + `git merge-tree --write-tree --name-only origin/dev HEAD` trước khi sửa, nhắn
  nhau qua SendMessage): `db/seed.sql`, `NotificationKind` / `NotificationCategory`, `i18n/notifications*.properties`,
  `SecurityConfig`, `OrderService`, `OrderDetailResource`.
- C11 (seed hoàn chỉnh, xuất `.sql`, dọn dữ liệu giả) làm sau cùng, khi C6 và C7 đã vào dev.

**Đã xong:**
- C1–C4 vào `dev` (PR #143, #147). C4: migration `V20260926011` pickup_slots, `SlotService`, seed slot 4 tuần.
- **C5 (đơn hàng) complete**, chạy subagent-driven, mỗi task có review riêng, cuối cụm có review toàn cụm và một lượt sửa:
  - migration `V20260926012` (orders / order_items / order_status_history), `OrderLifecycle` (D-04/D-05/D-07);
  - preview + đặt đơn (tách theo Farmer, trừ tồn và giữ chỗ slot dưới khoá dòng); `ProductService` khoá dòng khi sửa;
  - đọc đơn hai phía; Farmer accept / decline / ready / complete; khách huỷ / sửa trước cutoff;
  - thông báo 5 mốc (nhóm `orders`, link `/orders/{orderId}`, `/farmer/orders/{orderId}`);
  - seed 12 đơn đủ 6 trạng thái (`ML-20260920-0001…0012`, 4 completed cho review); `api-requests/order.requests.ts`.
  - Test backend 661/661.
- **C6 complete:** template tồn kho tuần (migration `V20260926017`), đặt lại nhanh `POST /orders/{id}/reorder`,
  job tự hoàn tất đơn `ready` sau 24 giờ kể từ giờ nhận. **C7 complete:** yêu thích (migration `V20260926018`, cột
  `target_id`), báo có hàng lại (`RestockNotifier`, nhóm thông báo `favorites`). Review toàn phần C6+C7 + một lượt sửa.
  PR **#161** (C5–C7) đã squash-merge vào dev ở commit `852f829`; lượt sửa sau review C6+C7 (`83f52d3`) được push
  sau lúc merge nên đi vào dev bằng PR bổ sung từ nhánh `fix/FR-041-restock-review-fixes`. C8–C11 của phiên kia đã
  vào dev qua PR **#163**.
- **Cảnh báo FR-063:** nhánh `feature/FR-062-farmer-products` của một bạn trong nhóm làm FR-063 theo thiết kế khác (tồn kho
  theo ngày), trùng migration `017`/`018` và trùng tên lớp. Dev giờ đã có `017` (weekly_stock_templates), `018`
  (favorites), `020`, `021` — nhánh đó phải đổi số migration và hoà giải FR-063 trước khi merge (LEAD chọn thiết kế).
- **Frontend cần bổ sung (ngoài phạm vi):** `types/notification.types.ts` thêm nhóm `orders`, `favorites` và kind
  `order_*`, `restock`; nút bật/tắt nhóm trong Settings; các trang StockWeek, "Order again", Favorites chưa nối.
- Nhánh `feature/FR-062-products` đã merge `origin/dev` tới #158 (không viết lại lịch sử).

**Quy ước đã chốt, code mới phải theo:**
- JSON: mốc thời gian dạng ISO-8601 UTC có Z; ngày `yyyy-MM-dd`; giờ `HH:mm`. "Bây giờ" lấy từ bean `Clock`.
- `LocalDateTime` ↔ DATETIME cần `@JdbcTypeCode(SqlTypes.LOCAL_DATE_TIME)`. Seed ghi cột TIMESTAMP bằng giá trị UTC.
- Thứ tự khoá toàn cục: `orders` → `pickup_slots` (id tăng) → `products` (`lockAllById`, id tăng). Mọi đường ghi vào
  `products` đều khoá trước khi đọc.
- Sai chủ → 403, id lạ → 404, xung đột / chuyển trạng thái sai → 409. Admin không mua, không review, không yêu thích (D-13).
- Không đổi tên field trong `OrderDetailResource.summary` — phần chat (PR #155) đang đọc.
- Trạng thái sản phẩm tự động: `available` → `sold_out` khi tồn về 0; `sold_out` → `available` chỉ khi tồn trước lúc
  hoàn là 0; `unavailable` (Farmer tạm ngưng) không bao giờ bị đổi tự động (FR-064).

**Phạm vi (người dùng để trống 3 câu hỏi §3):** chỉ tầng dưới — migration, backend, test, seed,
`frontend/src/api-requests/*.ts`; không nối trang (x.5 / 5.9 / 5.10…), không e2e trình duyệt; seed tiếng Anh.

**Câu hỏi mở cho người dùng:** thêm `GET /api/v1/farmer/slots` (Farmer thấy cả slot đã tắt để bật lại)? Contract §6
chưa có, đổi contract nên chưa làm.

**Ledger / phán quyết:** `.superpowers/sdd/2026-09-26-marketlink-core-commerce/progress.md` và `c5-context.md`
(C5-0…C5-21 + `Final: Ruling`) — thư mục bị git-ignore, chỉ có trong worktree `market-link-core`.

---

## 1. Ba file phải đọc trước khi gõ bất kỳ lệnh nào

| File | Vai trò |
|---|---|
| `docs/superpowers/plans/2026-09-26-marketlink-core-commerce.md` | **Spec + plan** 11 cụm / 43 task. §S là spec, §P là plan, §R là rà soát + đề xuất LEAD |
| `.superpowers/sdd/2026-09-26-marketlink-core-commerce/progress.md` | **Ledger** — mọi task đã xong, mọi `Ruling:` (quyết định lệch plan và lý do). Đây là bộ nhớ thật; git log là bằng chứng |
| `CLAUDE.md` + `backend/CLAUDE.md` + `frontend/CLAUDE.md` | Luật R-01…R-08, Definition of Done 7 điều kiện, quy ước code |

Ledger nằm trong thư mục bị git-ignore cục bộ (`.git/info/exclude`), **không commit**. Nếu mất, dựng lại từ `git log` + file này.

## 2. Đang ở đâu

**Xong và đã ghi `complete` trong ledger:** Cụm **C1** (chợ + danh mục), **C2** (stall, khung giờ nhận), **C3** (sản phẩm, lọc, kiểm duyệt).
Mỗi cụm: migration → backend có test (JUnit + Mockito, một test tích hợp `@SpringBootTest`) → seed → frontend nối API.

**Tiếp theo:** Cụm **C4** (slot nhận hàng) — chưa bắt đầu; chưa chạy `task-start 4`.
Thứ tự còn lại: C4 → C5 (đơn hàng ⭐, **chạy bằng `superpowers:subagent-driven-development`** theo yêu cầu người dùng) → C6 → C7/C8/C9 → C10 → C11.
Các cụm khác chạy `superpowers:executing-plans` (native, một phiên).

**Nhánh & commit:** worktree `techwiz7/market-link-core`, nhánh `feature/FR-062-products` (21 commit ahead of `origin/dev`, đã merge `origin/dev` @ `964b431` vào lúc 11:05 26/09, không còn xung đột). Hai nhánh cũ `feature/FR-073-markets-categories`, `feature/FR-060-farmer-markets` là mốc của C1/C2, **không** chứa bản merge dev.
**Nhánh chưa push lên origin** — cân nhắc `git push -u origin feature/FR-062-products` ngay khi được người dùng đồng ý (H-4 chỉ cấm push thẳng `main`/`dev`).

## 3. Ba câu hỏi người dùng CHƯA trả lời (đã hỏi ở cuối phiên 1)

1. **Phân vai frontend C4→C11.** Người dùng nói: *"bạn chỉ cần làm tầng dưới thôi, test e2e tôi sẽ test"* và *"bạn tôi đang làm mấy cái UI đang thiếu"*. Diễn giải mặc định nếu không có trả lời khác: **làm backend + API + seed + file `frontend/src/api-requests/*.ts` (kèm hàm ánh xạ)**; các task `x.5` (nối trang vào API) để lại cho bạn của người dùng, trừ khi người dùng nói làm.
2. **Cách mở PR.** Đề xuất một PR `feature/FR-062-products` → `dev` gộp C1–C3. Không tự mở PR; hỏi rồi mới làm.
3. **Seed theo bạn của người dùng** (8 danh mục tiếng Anh + đơn vị tiếng Anh cố định) — người dùng chưa xác nhận; nếu họ muốn tiếng Việt thì sửa `db/seed.sql`.

**Không tự kiểm tra e2e trên trình duyệt nữa** — người dùng tự test. Vẫn phải: test backend, `tsc`/`eslint`, curl API.

## 4. Môi trường — KHÔNG đụng vào checkout chung

- `techwiz7/market-link` là checkout **chung** của nhiều phiên Claude khác, luôn có file sửa dở. **Không** `git switch`, `reset`, `merge`, `stash` ở đó. Mọi việc làm trong worktree `market-link-core`.
- Docker stack riêng **`mlcore`**: backend `:8090`, frontend `:3020`, mysql/redis/rabbitmq không lộ port. Cấu hình qua `market-link-core/.env` (`COMPOSE_PROJECT_NAME=mlcore`, `COMPOSE_FILE=docker-compose.yml:../compose.core-override.yml`, `VITE_API_URL=http://localhost:8090`, `CORS_ALLOWED_ORIGINS=http://localhost:3020,…`). Override nằm **ngoài repo**: `techwiz7/compose.core-override.yml`.
- Máy host: **không có JDK 25, không có node_modules** → mọi lệnh Java/Node chạy trong container. Host là macOS: **không có `timeout`**, zsh **nổ khi glob không khớp** (`ls *.yml` → dùng `ls | grep`), grep là `ugrep`.
- Stack khác (`intervue-*`, `mlc3b-*`, `mlnotify-*`, `mlaudit-*`) là của phiên khác — **không stop/xoá**.
- lefthook **không** được cài trong `.git/hooks` của repo này → prettier/spotless phải tự chạy trước commit.

## 5. Lệnh chuẩn (đã kiểm chứng)

```bash
cd /Users/phong/projects/school/fpt-aptech/Code_project/techwiz7/market-link-core

# Test backend — KHÔNG dùng `make be-test` (bị OOM-kill exit 137 vì host 7.8 GiB chạy 6 stack)
docker compose exec -T -e MAVEN_OPTS=-Xmx256m backend ./mvnw -B test \
  -DargLine="-Xmx768m -XX:MaxMetaspaceSize=256m -XX:+UseSerialGC"
# Một class:  … -Dtest=StallServiceTest -Dsurefire.failIfNoSpecifiedTests=false -DargLine="-Xmx768m"
# Báo cáo surefire nằm TRONG container: docker compose exec -T backend sh -c "cat target/surefire-reports/<class>.txt"

# Format + áp migration mới
docker compose exec -T backend ./mvnw -q spotless:apply
docker compose restart backend && curl -sf --retry 40 --retry-delay 3 --retry-connrefused --retry-all-errors -o /dev/null localhost:8090/ping
# (mvn test cũng compile vào target/classes → devtools tự restart app; restart tường minh vẫn chắc hơn)

# Frontend (trong container; Node heap kẹp vì OOM)
docker compose exec -T -e NODE_OPTIONS=--max-old-space-size=1536 frontend sh -c \
  "npx prettier --write <files> >/dev/null && npx tsc -b && npx eslint src"
# package.json đổi → docker compose exec -T frontend npm install && docker compose restart frontend

# Seed (idempotent, chạy lại được) và reset DB khi đổi số migration
make seed
make clean && docker compose --profile app up -d && make seed   # clean chỉ xoá volume của project mlcore

# Ledger / brief (script của plugin superpowers 6.4.1)
S=/Users/phong/.claude/plugins/cache/claude-plugins-official/superpowers/6.4.1/skills
$S/executing-plans/scripts/task-start docs/superpowers/plans/2026-09-26-marketlink-core-commerce.md 4   # in ra brief + BASE
$S/executing-plans/scripts/task-done  docs/superpowers/plans/2026-09-26-marketlink-core-commerce.md 4 <BASE> -- sh -c '<lệnh test ở trên>'
# "Task N" của script = cả cụm CN (Task N.1…N.x); vẫn ghi ledger từng task con bằng tay như phiên 1 đã làm.
```

Commit message: `feat(FR-xxx): …` (R-01), kết thúc bằng `Co-Authored-By: Claude <model> <noreply@anthropic.com>` theo system-reminder của phiên.

## 6. Luật đã học bằng xương máu (áp dụng cho C4 trở đi)

1. **Số migration:** dev đã có `V20260926004`, `005`; nhánh này có `008`, `009`, `010`. Trước khi tạo migration mới: `git fetch origin && git ls-tree --name-only origin/dev backend/src/main/resources/db/migration/ | tail -3` rồi lấy số **lớn hơn cả hai bên** (tiếp theo dự kiến `V20260926011`). Khoá chính `id BIGINT UNSIGNED`, FK `BIGINT UNSIGNED`, tên cột theo `db/schema.sql` (plan §S.4.1).
2. **Hibernate flush INSERT trước DELETE** → mọi "xoá rồi ghi lại" trong cùng transaction phải `flush()` sau delete (xem `FarmerOperatingDayRepository.replaceDays`). Áp dụng cho `weekly_stock_templates` (C6) và bất kỳ replace-set nào.
3. **eslint `react-hooks/set-state-in-effect`** cấm `setState` đồng bộ trong `useEffect` → dùng hook `frontend/src/hooks/useRequest.ts` (`{ state, retry, mutate }`, loading suy ra từ khoá request). Form "mirror-until-edited": `const form = edited ?? loadedForm`.
4. **Khuôn module backend** = `modules/farmer` và `modules/catalog`/`stall`/`product` đã có: entity → JPA repo + `*QueryRepository` (NamedParameterJdbcTemplate, `LIKE :q ESCAPE '!'`, sort qua whitelist) → service có interface → controller `extends BaseController` → `*ExceptionHandler` `@RestControllerAdvice(assignableTypes=…)` → route public thêm vào `SecurityConfig`. Test: Mockito thuần, mỗi luật một test; SQL hằng số `public static final` để test đọc thẳng.
5. **R-06:** service chỉ nhận `userId` từ token → `findByUserId` → so `farmerId`; sai chủ → **403** (không 404). Chuyển trạng thái sai → **409**.
6. Trước mỗi lần ghi file trong worktree: `git status`; các phiên khác không sửa worktree này, nhưng `dev` đổi liên tục → **`git fetch` và `git merge-tree --write-tree --name-only origin/dev HEAD`** để soi xung đột trước khi merge thật.
7. Seed dùng `INSERT … AS new ON DUPLICATE KEY UPDATE` / `INSERT IGNORE` (MySQL 8.4, không dùng `VALUES()`); mọi bảng seed cần khoá tự nhiên (`uq_market_name`, `uq_product_per_farmer`, …). Hash mật khẩu demo sinh bằng `htpasswd -bnBC 10 "" 'Demo@1234'` (đã có trong `db/seed.sql`).
8. Không tự tick DONE trong `.ai/REQUIREMENTS.md`; báo "đủ 7 điều kiện" cho QA/DOC.

## 7. Trạng thái dữ liệu demo (sau `make seed` trên DB mới)

4 chợ TP.HCM toạ độ thật · 10 stall đã duyệt (mỗi stall 1–2 chợ, khung giờ 07:00–11:00) · **8 danh mục** đã thống nhất (PR #137 của bạn người dùng) · 51 sản phẩm (50 hiện, 1 bị admin ẩn cho FR-074; có `sold_out`/`unavailable`) · tài khoản `admin@ / customer@ / farmer@…farmer10@marketlink.vn`, mật khẩu chung `Demo@1234` (sẽ ghi vào `docs/DEMO_CREDENTIALS.md` ở C11). Chưa có: slot, đơn, review, favorite, feedback.

## 8. Đề xuất gửi LEAD (gom, chưa gửi) — không tự sửa `db/schema.sql` / `docs/api-contract.md`

Ngoài §R.5 của plan: `PUT /farmer/markets/{id}` (hiện sửa mã quầy/toạ độ = DELETE rồi POST, server bật lại đúng dòng cũ) · `GET /admin/products?hidden=true` (tab "Hidden items" ở admin Moderation vẫn là demo) · tham số `inStock` cho `GET /products` (tick "In stock only" hiện lọc trên trang đã tải) · `StallSummaryResource` đã thêm `contactPerson`, `pickupStartTime/EndTime`; `StallDetailResource` thêm `approvalStatus`; `products.is_hidden/hidden_reason`; `order_items UNIQUE(order_id, product_id)`.

## 9. Deferred minors (chưa sửa, đã ghi)

Trang Home hiện "0 markets" trong lúc lỗi tải · slug danh mục seed dùng `_` còn slug admin tạo qua API dùng `-` · admin Markets/Categories đọc endpoint public nên bản ghi đã tắt không bật lại được từ UI · sidebar Farmer layout vẫn hiện "Cô Tư Garden" (mock, C9/C11) · reviews/favorites trên trang public vẫn là demo tới C7/C8 · `frontend/src/data/{home,catalog,customer,farmer,admin}.ts` còn được các trang của cụm sau import — xoá ở Task 11.4.

## 10. Việc đầu tiên của phiên mới (theo thứ tự)

1. `cd …/market-link-core && git status && git branch --show-current` — phải sạch, đang ở `feature/FR-062-products`.
2. `docker ps --filter name=mlcore` — 5 container `Up`; nếu không: `docker compose --profile app up -d`.
3. Đọc câu trả lời của người dùng cho §3; nếu chưa có → làm theo diễn giải mặc định.
4. `git fetch origin` + `merge-tree` soi dev; có xung đột trong file mình sắp sửa thì merge trước.
5. `task-start … 4` → làm Task 4.1 (migration `pickup_slots`, số lấy theo §6.1), 4.2 (SlotServiceTest 8 test → RED → code), seed slot 4 tuần, `api-requests/stall.requests.ts` thêm slot; task `4.2 Step 7` (trang `farmer/Slots`) chỉ làm nếu người dùng giao frontend.
6. Sau C4: C5 bằng `superpowers:subagent-driven-development`, brief cho subagent = task text trong plan + §4–§6 của file này.

## Phụ lục A — Mọi phán quyết (Ruling) của phiên 2–3, C4 → C7

Chép nguyên văn từ ledger (`.superpowers/sdd/…/progress.md`, bị git-ignore) để không mất. Mỗi dòng: quyết định — lý do — cost nếu sai.

- Task 4: Ruling: nhánh giữ nguyên feature/FR-062-products (plan ghi feature/FR-067-pickup-slots) — người dùng chỉ định làm tiếp trên nhánh này; cost nếu sai: PR gộp nhiều FR hơn.
- Task 4.1: Ruling: đặt số V20260926011 thay V20260926008 của plan — origin/dev dừng ở 005, nhánh đã có 008–010; cost nếu sai: đổi tên file trước merge.
- Task 4.2: Ruling: tách SlotService riêng (plan cho phép) thay vì thêm vào StallService — test tên SlotServiceTest, trách nhiệm khác; cost nếu sai: gộp lại một class.
- Task 4.2: Ruling: windows() tính bằng phút trong ngày thay vòng LocalTime của plan — plusMinutes vòng qua 00:00 làm vòng lặp chạy mãi với khung sát nửa đêm (test windowsNeverWrapPastMidnightAndDropTheOddTail); cost nếu sai: không.
- Task 4.2: Ruling: SlotResource thêm isActive (plan không có) — Farmer cần biết slot đã tắt sau PATCH; công khai luôn true; cost nếu sai: bỏ một trường.
- Task 4.2: Ruling: GET /farmers/{id}/slots không có date → hôm nay..+13 ngày; stall chưa duyệt → 404 (D-09); generate từ chối chợ đã rời (400) và khoảng ≥60 ngày; updateSlot khoá slot bằng lockById như C5; cost nếu sai: đổi hằng số/mã lỗi.
- Task 4.2: Ruling: POST /farmer/slots/generate trả 201 kèm MỌI slot của chợ đó trong khoảng ngày (cả slot đã có) — contract không nói; bấm lại vẫn thấy đủ danh sách. Cost nếu sai: đổi thành 200/chỉ slot mới.
- Task 4.2: Ruling: không làm Step 7 (trang farmer/Slots) — người dùng chỉ giao tầng dưới; stall.requests.ts có SlotDto, slots/generateSlots/updateSlot và toSlotOption (value/time/booked/max/off) khớp SlotPicker + bảng của trang Slots. Cost nếu sai: không.
- Task 5: Ruling C5-0: giữ nhánh feature/FR-062-products (plan ghi feature/FR-030-orders) — như C4; cost nếu sai: PR gộp nhiều FR hơn.
- Task 5: Ruling C5-1: tạo OrderStatusHistoryWriter ngay ở 5.3 (record(orderId, from, to, changedBy, note)); 5.5 dùng lại — 5.3 cần ghi dòng lịch sử đầu tiên; cost nếu sai: không.
- Task 5: Ruling C5-2: thứ tự khoá toàn cục cho mọi đường ghi: dòng orders (nếu có) → pickup_slots (id tăng dần) → products (một lockAllById, id tăng dần). place khoá hết slot của cả request trước, rồi hết sản phẩm của cả request một lần; transition/modify khoá slot trước sản phẩm. Plan gốc để transition khoá ngược (sản phẩm→slot) — có thể deadlock với place; cost nếu sai: không (chỉ đổi thứ tự lệnh).
- Task 5: Ruling C5-3: theo contract §7 (R-05): data của preview là `{ groups:[…] }`, của POST /orders là `{ orders:[…] }` (PlacedOrderResource thêm totalAmount — bổ sung). Plan Step 8 "2 phần tử trong data" đọc thành "2 phần tử trong data.groups"; cost nếu sai: bỏ một lớp bọc.
- Task 5: Ruling C5-4: D-13 — preview/place/đơn của tôi/huỷ/sửa mở cho CUSTOMER và FARMER (@PreAuthorize hasAnyRole), admin bị chặn ở controller VÀ service (AccessDeniedException → 403); cost nếu sai: siết thành chỉ CUSTOMER.
- Task 5: Ruling C5-5: place kiểm thêm — slot phải thuộc farmer_markets có farmer_id = group.farmerId, market_id = group.marketId, is_active → không thì 409 SLOT_UNAVAILABLE; now ≥ cutoffAt → 409 CUTOFF_PASSED (contract dòng 69 "quá cutoff → 409"); stall chưa duyệt/đình chỉ → 409 STALL_UNAVAILABLE; sản phẩm không có → 409 OUT_OF_STOCK hoặc 400 tuỳ implementer ghi rõ; dùng Clock bean (Asia/Ho_Chi_Minh) cho "now"; cost nếu sai: đổi mã lỗi.
- Task 5: Ruling C5-6: order_code = ML-yyyyMMdd-XXXX, XXXX 4 ký tự ngẫu nhiên (SecureRandom) từ bảng 32 ký tự không nhập nhằng (bỏ 0/O/1/I), ngày theo Clock VN; kiểm existsByOrderCode tối đa 5 lần TRƯỚC khi insert; UNIQUE là lưới cuối (DataIntegrityViolation còn sót → 409 thử lại). Bỏ cách đếm theo ngày; cost nếu sai: mã đơn không tăng dần.
- Task 5: Ruling C5-7: PlaceOrderConcurrencyTest tự dọn mọi dòng nó tạo (@AfterEach) vì chạy trên DB dev có seed; cost nếu sai: không.
- Task 5: Ruling C5-8: mọi đường đổi trạng thái/sửa đơn nạp đơn bằng OrderRepository.lockById (PESSIMISTIC_WRITE) — chặn hoàn kho hai lần khi hai request cùng lúc; cost nếu sai: không.
- Task 5: Ruling C5-9: dịch nội dung thông báo ở backend (resources/i18n/notifications*.properties, đủ 10 ngôn ngữ) như cơ chế đang chạy; KHÔNG sửa frontend/src/locales (ngoài phạm vi người dùng giao) — nếu frontend cần biết kind mới (types/notification.types.ts, danh mục cài đặt) thì ghi lại để báo, không tự sửa trang; cost nếu sai: bạn người dùng thêm key FE.
- Task 5: Ruling C5-10: 5.9/5.10 chỉ làm frontend/src/api-requests/order.requests.ts (OrderApi: preview, place, list, get, cancel, modifyItems, farmerList, accept, decline, markReady, complete + toOrder ánh xạ sang OrderType); KHÔNG làm cart.ts, trang, locales, xoá data giả — người dùng chỉ giao tầng dưới; cost nếu sai: làm thêm sau.
- Task 5: Ruling C5-11: preview chỉ nhận items nên không biết khách nhận ở chợ nào — mỗi group thêm `markets: [{ marketId, marketName }]` (các chợ stall đang bán); `marketId`/`marketName` của group chỉ điền khi stall bán đúng một chợ, còn lại null (giỏ chọn rồi gửi trong POST /orders). Bổ sung trường, không bỏ trường contract; cost nếu sai: bỏ một trường.
- Task 5: Ruling C5-12: preview — id sản phẩm không tồn tại → 400 VALIDATION_ERROR; sản phẩm đã xoá mềm/bị ẩn/unavailable → vẫn vào group của stall với problem `unavailable`. place — sản phẩm thiếu/không bán được → 409 OUT_OF_STOCK (giỏ phải tải lại). Cost nếu sai: đổi mã lỗi.
- Task 5: Ruling C5-14: thêm Task 5.3b (ngoài plan) sửa lỗ hổng bán vượt tồn ở ProductService — update/softDelete/setStatus/adminHide/adminUnhide nạp Product qua lockAllById(List.of(id)) (chỉ khoá products nên giữ thứ tự C5-2); @DynamicUpdate một mình không đủ vì update đặt stockQuantity từ form. Reviewer 5.3 xếp Critical cho dự án (D-02, Review Focus #1). Cost nếu sai: một câu SELECT … FOR UPDATE mỗi lần Farmer sửa sản phẩm.
- Task 5: Ruling C5-15: định dạng thời gian JSON cho đơn = ISO-8601 UTC có Z (như cutoffAt của 5.3 và contract); ngày yyyy-MM-dd; giờ HH:mm. Cost nếu sai: đổi formatter một chỗ.
- Task 5.4: Ruling C5-16: `OrderDetailResource.customer` bị lược khỏi JSON khi null (@JsonInclude(NON_NULL) chỉ trên field đó, như MessageResource) — theo chữ của brief; dispatch trước của controller cho phép cả hai, nay chốt theo brief. Không áp NON_NULL cho cả record (customerNote/farmerNote null vẫn hiện). Cost nếu sai: FE nhận undefined thay vì null — cùng falsy.
- Task 5.5: Ruling C5-17: transition() bỏ @Transactional, thành private, javadoc ghi rõ "chỉ gọi bên trong transaction của method public gọi nó" — annotation trên method tự gọi là lời hứa giả; các caller (accept/decline/ready/complete, và cancel/modify ở 5.6) đều @Transactional. Plan viết `@Transactional protected`; cost nếu sai: không (hành vi không đổi).
- Task 5: Ruling C5-18 (cho 5.6): modifyItems khoá đơn (lockById) → slot (nếu có) → sản phẩm (lockAllById) — luôn theo C5-2 kể cả nhánh "bỏ hết = huỷ"; tăng số lượng một sản phẩm đã sold_out-hết/unavailable/ẩn/xoá mềm → 409 OUT_OF_STOCK (giảm hoặc bỏ luôn được); cancel: trạng thái sai (ready/completed/…) → 409 INVALID_TRANSITION, trạng thái đúng nhưng quá cutoff → 409 CUTOFF_PASSED; chỉ người mua (customer_id) được huỷ/sửa, còn lại 403, id lạ 404. Cost nếu sai: đổi mã lỗi.
- Task 5: Ruling C5-19 (cho 5.7): năm kind mới (order_placed, order_accepted, order_declined, order_ready, order_cancelled) thuộc NotificationCategory mới ORDERS ("orders", CUSTOMER + FARMER), persistent; nội dung dịch ở backend (notifications*.properties, 10 ngôn ngữ, params thay {…}). Link theo route FE thật trong App.tsx. Không sửa frontend (types/notification.types.ts, trang Settings, locales) — implementer liệt kê chính xác dòng FE cần thêm để báo người dùng/bạn của họ. Cost nếu sai: FE hiển thị kind lạ như thông báo chung tới khi bổ sung.
- Task 5.6: Ruling C5-20: giữ nhánh "bỏ hết item = huỷ" như code phòng thủ (plan viết nó; controller đã dặn "giữ phòng thủ, test ở service"); đường thật để huỷ là PATCH /cancel. Không nới @NotEmpty (D-07 + contract: PUT items là danh sách item còn lại). Cost nếu sai: vài dòng code chết + một test.
- Task 5: Ruling C5-21 (cho 5.8): seed đơn dùng ngày TƯƠNG ĐỐI theo hôm nay giờ VN (DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR)) để chạy lúc nào cũng demo được: placed/accepted/ready ở hôm nay+2…+5 (chưa quá cutoff, slot_id trỏ slot seed thật cùng farmer_market/ngày/giờ); completed/declined/cancelled ở quá khứ (slot_id NULL — cột cho phép, slot seed chỉ có từ hôm nay). order_code cố định ML-20260920-0001… để ON DUPLICATE KEY UPDATE bám; order_items ON DUPLICATE KEY (uq_order_product); lịch sử KHÔNG có khoá tự nhiên → xoá lịch sử của các đơn seed rồi ghi lại chuỗi đầy đủ; sau cùng tính lại pickup_slots.booked_count = số đơn placed/accepted/ready/completed trỏ vào slot. Không đụng tồn kho sản phẩm (seed tồn là số hiện tại). Đơn trải trên farmer@ và ít nhất 2 stall khác để Farmer có đơn placed mà duyệt. Cost nếu sai: đổi seed.
- Final: Ruling: I-1 (Important) — link thông báo dùng orderCode trong khi mọi API nhận id số và không có tra theo mã → trang mở từ thông báo không tải được đơn; C5-19 sai ở phần link. Sửa: link /orders/{orderId} và /farmer/orders/{orderId} (đúng plan 5.7), order.requests.ts trả kèm id. Cost nếu sai: đổi lại một hàm build link.
- Final: Ruling: I-3 (Important) — sửa/huỷ/từ chối đơn lật sold_out/unavailable do Farmer tự đặt (FR-064 MUST). Sửa: tăng số lượng dùng cùng luật bán được như place (loại SOLD_OUT); chỉ đổi status khi delta ≠ 0; AVAILABLE → SOLD_OUT khi tồn về 0; SOLD_OUT → AVAILABLE chỉ khi tồn TRƯỚC lúc hoàn là 0; UNAVAILABLE không bao giờ bị đổi. Cost nếu sai: sold_out thủ công ở tồn 0 sẽ mở lại khi có hoàn kho.
- Final: Ruling: M-1 nâng Important — "tổng = 0 ⇒ huỷ" sai vì giá 0₫ hợp lệ (ProductRequest @DecimalMin("0")); đơn giữ món 0₫ bị huỷ im lặng. Sửa: huỷ khi KHÔNG CÒN item, và báo Farmer (order_cancelled) khi sửa đơn dẫn tới huỷ. C5-20 dựa trên tiền đề sai (nhánh tới được qua HTTP). Cost nếu sai: không.
- Final: Ruling: M-4 nâng Important — seed ghi giờ VN vào cột TIMESTAMP (session UTC) → API hiện lệch +7h; created_at đơn quá khứ = lúc seed. FR-038 là thứ giám khảo mở → sửa: trừ 7h (hoặc CONVERT_TZ) và đặt created_at hợp lý. Cost nếu sai: không.
- Final: Ruling: (declined) ProductService.update đặt stockQuantity từ form có thể cũ — giữ: đó là nghĩa "Farmer đếm lại tồn" của C3; khoá không chữa được, cần versioning (tính năng mới). Cost: một lần bán xen giữa bị số Farmer gõ đè.
- Final: Ruling: (declined) Farmer mua ở chính stall mình — giữ, D-13 im lặng; đưa vào đề xuất LEAD. Cost: đơn tự mua lạ trong báo cáo.
- Final: Ruling: (declined) 403/404 lộ id đơn tuần tự có tồn tại — giữ (C5-18), giá trị lộ thấp. Cost: đoán được số đơn.
- Final: Ruling: (declined) lỗi ngoài envelope cho exception chưa map — vấn đề toàn dự án; phần của C5 (lock timeout) đã ghi minor. Cost: 500 xấu khi khoá quá hạn.
- Final: Ruling: (declined) seed không trừ tồn cho đơn đang chạy — giữ (C5-21), demo seed lại. Cost: huỷ đơn seed làm tồn cao hơn thật.
- Final: Ruling: (declined) preview 400 với id không tồn tại chặn giỏ cũ sau khi reset DB — giữ (C5-12); xoá mềm nên id không mất trong thực tế; FE nên xoá giỏ khi gặp 400. Cost: giỏ cũ lỗi sau reseed.
- Final: Ruling: (declined) admin không đọc được đơn qua các endpoint này — thuộc C9 (FR-070/072). Cost: không.
- Final: Ruling: (declined) tôn trọng preference nhóm "orders" — code thông báo có sẵn, không phải C5. Cost: không.
- Final: Ruling: (declined) hai group cùng Farmer trong một POST → hai đơn một stall — giữ, client dựng group từ preview. Cost: không.
- Final: Ruling: (declined) khối customer cho Farmer có email ngoài tên + SĐT — giữ: Farmer cần liên lạc khi khách không tới lấy. Cost: lộ email cho đúng Farmer của đơn.
- Final: Ruling: (declined) nối trang 5.9/5.10, cart.ts, locales, demo e2e — ngoài phạm vi người dùng giao (C5-10). Cost: không.
- Final: Ruling: không xoá workspace SDD dù review cuối C5 sạch — cùng plan còn C6/C7 chạy tiếp (executing-plans dùng chung ledger); xoá khi plan xong. Cost nếu sai: không.
- Ruling: dải migration "013–019 cho C6/C7" đã bị dev chiếm 013–016 → C6/C7 lấy số kế tiếp trên origin/dev lúc tạo file (hiện 017); phiên C8 cũng kiểm dev (prompt đã dặn). Cost nếu sai: đổi tên file trước merge.
- Ruling: merge origin/dev vào feature/FR-062-products (không rebase — nhánh đã push, H-10 cấm force-push; cùng cách phiên 1), giải xung đột giữ cả hai bên; rồi commit chore(R-09) dịch comment tiếng Việt trong code C4/C5 chưa được dịch. Cost nếu sai: một merge commit trong lịch sử nhánh.
- Task 6.1: Ruling: migration số V20260926017 (plan ghi 010; dev đã tới 016) — cost: đổi tên nếu dev chiếm trước khi merge.
- Task 6.1: Ruling: StockTemplateService + FarmerStockTemplateController riêng thay vì nhét vào ProductService/FarmerProductController như plan — đường dẫn /farmer/stock-templates khác /farmer/products, ProductService đã dài; cost: không.
- Task 6.1: Ruling: apply không đổi status của sản phẩm "unavailable" (Farmer tạm ngưng, FR-064), tồn về 0 thì available → sold_out; giá chỉ ghi khi template có default_price; nạp sản phẩm qua lockAllById (C5-14). Thêm CHECK quantity ≥ 0, price ≥ 0 và index (farmer_id, day_of_week). Cost: không.
- Task 6.1: Ruling: không làm Step 5 (trang farmer/StockWeek) — phạm vi tầng dưới; thêm frontend/src/api-requests/stock-template.requests.ts. Cost: không.
- Task 6.2: Ruling: bỏ sản phẩm theo đúng luật "bán được" của place (xoá, ẩn, unavailable, tồn 0) chứ không chỉ "đã xoá" như plan; chỉ người mua được reorder (C5-4/R-06), đơn lạ 404; chỉ đọc, không khoá. Response data = danh sách CartLine như plan (không bọc). Không làm Step 5 (nút Order again) — thêm OrderApi.reorder. Cost: không.
- Task 6.3: Ruling: "quá 24 giờ" tính từ GIỜ KẾT THÚC nhận hàng (pickup_date + pickup_end + 24h < now, giờ VN) — plan chỉ ghi "pickup_date + 24h"; test của plan (hôm kia → completed, hôm nay → không) khớp cả hai cách. transition() nhận Long actorUserId (null = hệ thống). autoComplete là method @Transactional public của OrderService (job gọi qua proxy → mỗi đơn một transaction); khoá và đọc lại trạng thái; không thông báo. Job dừng khi một lô chỉ toàn đơn đã thấy (chống vòng lặp vô hạn). Ngưỡng truyền vào SQL dạng chuỗi để driver (serverTimezone=UTC) không dịch giờ. Cost: không.
- Task 6.3: Ruling: bước kiểm tay (sửa pickup_date rồi đợi cron) thay bằng OrderAutoCompleteJobTest @SpringBootTest gọi bean job thật trên MySQL thật + tự dọn dữ liệu. Cost: không.
- Task 7.1: Ruling: migration V20260926018 (plan ghi 011). Thêm cột target_id + UNIQUE (customer_id, target_type, target_id) thay khoá của plan/schema.sql (NULL coi là khác nhau → khoá cũ cho phép trùng). Không dùng CHECK/generated column vì MySQL cấm trên cột có FK ON DELETE CASCADE; service đảm bảo đúng một cột mục tiêu khớp target_type. Đề xuất LEAD (R-02). Cost: một cột thừa nếu LEAD bác.
- Task 7.1: Ruling: add chỉ nhận mục tiêu đang công khai (stall approved, sản phẩm không xoá/ẩn, chợ active) → 404; add idempotent trả 200 (cả khi tạo mới) — không @Transactional để bắt vi phạm uq_fav khi double click rồi đọc lại dòng thắng; available tính trong SQL (sản phẩm: không xoá/ẩn, available, tồn > 0, stall approved). Seed 6 yêu thích cho customer@ (có 1 sản phẩm sold_out để demo FR-041). Không làm 7.3 (trang, nút tim) — thêm favorite.requests.ts. Cost: không.
- Task 7.2: Ruling: gọi onStockRose ở BỐN chỗ (plan liệt kê 3): Farmer sửa sản phẩm, áp template, decline/cancel (transition), và khách giảm số lượng khi sửa đơn (modifyItems cũng trả tồn). Cost: không.
- Task 7.2: Ruling: ProductService.update áp luật trạng thái tự động như các đường đơn hàng (tồn 0 → sold_out; sold_out do hết hàng + tồn > 0 → available; unavailable và sold_out thủ công khi còn tồn giữ nguyên) — thiếu luật này thì Farmer nhập lại tồn cho món hết hàng mà món vẫn sold_out, FR-041 không bao giờ bắn. Đổi hành vi C3 (có test). Cost: nếu LEAD muốn Farmer tự bật lại bằng PATCH status thì bỏ helper.
- Task 7.2: Ruling: không báo cho sản phẩm unavailable (Farmer tạm ngưng) và stall không approved; nhóm thông báo mới FAVORITES ("favorites") cho kind RESTOCK; link /products/{id} (route FE products/:id). Test tích hợp decliningAnOrderAlerts... của plan làm ở mức service (verify onStockRose) + test cho từng chỗ gọi, thay vì @SpringBootTest. Cost: không.
- Task 7.3: Ruling: chỉ phần tầng dưới — frontend/src/api-requests/favorite.requests.ts đã có từ 7.1; không nối FavoriteButton, trang Favorites, xoá data giả (phạm vi người dùng). Cost: không.
- Final: Ruling: I-1 FR-063 trùng với nhánh feature/FR-062-farmer-products (per-date inventory, cùng migration 017/018, cùng tên lớp, đổi cách OrderService trừ kho) — quyết định thiết kế thuộc LEAD; KHÔNG tự sửa/đổi số; đã ghi cảnh báo đầu PR #161 và báo người dùng. Cost: bên merge sau phải đổi số migration + hoà giải code FR-063.
- Final: Ruling: I-2 reorder bỏ dòng của stall không approved (D-09) — sửa. I-3 StockTemplateService save/apply yêu cầu stall approved (contract §4 → 403 STALL_NOT_APPROVED) — sửa. I-4 restock đổi ngữ nghĩa thành "không mua được → mua được" (listed, available, tồn > 0, stall approved) và thêm lời gọi ở setStatus + adminUnhide; bỏ báo khi stall được bật lại (dễ spam). Minor 6 (job: một đơn lỗi chặn cả lượt) nâng Important — sửa bằng try/catch từng đơn + log. Cost: không.

## Phụ lục B — Minor để lại (deferred), C4 → C7

- Task 5.1: minor (deferred): order_items.unit_price / orders.total_amount không có CHECK ≥ 0 như products (theo plan nguyên văn).
- Task 5.1: minor (deferred): orders.slot_id NULL được (ON DELETE SET NULL) dù D-01 coi slot bắt buộc — service phải xử lý NULL khi đọc (theo plan nguyên văn).
- Task 5.2: minor (deferred): CutoffPassedException(orderId) không dùng orderId trong message; String.format không placeholder.
- Task 5.2: minor (deferred): canCustomerCancel/canCustomerModify thân giống hệt (theo code plan); assertTransition với from = null ném NPE thay vì InvalidOrderTransitionException.
- Task 5.3: minor (deferred): PlaceOrderConcurrencyTest #1 cho hai luồng cùng slot → khoá slot tuần tự hoá trước khi tới dòng sản phẩm; RED khi bỏ khoá sản phẩm chỉ nhờ snapshot REPEATABLE READ; không có latch khởi động — nên mỗi luồng một slot + CountDownLatch.
- Task 5.3: minor (deferred): cộng dòng trùng bằng Integer::sum có thể tràn số → 409 ORDER_CONFLICT thay vì 400 (dùng Math::addExact hoặc @Max trên CartLine.quantity).
- Task 5.3: minor (deferred): IllegalArgumentException → 400 là lưới bắt tất cả của OrderExceptionHandler (có thể lộ message nội bộ).
- Task 5.3: minor (deferred): CannotAcquireLockException / PessimisticLockingFailureException chưa map → 500 thay vì 409 thử lại.
- Task 5.3: minor (deferred): đọc approval của stall trong place không khoá → một đơn có thể lọt vào stall vừa bị đình chỉ (race nhỏ D-09).
- Task 5.3: minor (deferred): place không kiểm markets.is_active trong khi preview có lọc.
- Task 5.3: minor (deferred): sửa múi giờ theo từng trường (@JdbcTypeCode) — gốc là serverTimezone=UTC với cột DATETIME giờ local; nên để LEAD chốt cách toàn cục (hibernate.jdbc.time_zone / JDBC URL).
- Task 5.3: minor (deferred): thiếu test — slot/farmer không tồn tại, FARMER đặt được (C5-4), stall PENDING bị từ chối, MockMvc admin JWT → 403, rollback thật khi group 2 lỗi.
- Task 5.3b: minor (deferred): chưa có test "sản phẩm đã xoá mềm → update/softDelete/setStatus vẫn 404" qua đường notDeleted() mới.
- Task 5.4: minor (deferred): OrderQueryRepository tính lại page = offset/limit + 1 thay vì nhận safePage từ service.
- Task 5.4: minor (deferred): không có test cho việc kẹp page/pageSize (page<1, pageSize>50, <1).
- Task 5.4: minor (deferred): không có MockMvc test admin → 403 trên hai GET mới (dựa vào @PreAuthorize cấp class có sẵn).
- Task 5.4: minor (deferred): không có OrderQueryRepositoryTest trên DB thật (SQL chỉ được kiểm bằng curl + reviewer đọc tay).
- Task 5.5: minor (deferred): declineRequiresAReason chỉ kiểm Validator trên record, không qua @Valid của controller (thiếu MockMvc).
- Task 5.5: minor (deferred): không có test cho sàn booked_count không xuống dưới 0.
- Task 5.5: minor (deferred): lockOwnedOrder khoá dòng trước khi kiểm chủ (cùng quy ước ProductService) — nên ghi một dòng javadoc.
- Task 5.6: minor (deferred): điều kiện "placed/accepted ∧ trước cutoff" nằm ở 2 nơi (OrderLifecycle.canCustomer* cho cờ hiển thị, assertCustomerCanStillAct cho thực thi).
- Task 5.6: minor (deferred): thiếu test cộng dòng trùng; thiếu test chặn tăng số lượng sản phẩm hidden/deleted.
- Task 5.6: minor (deferred): nhánh bỏ hết khoá slot hai lần và flush hai lần (vô hại).
- Task 5.6: minor (deferred): commit chỉ ghi FR-034 dù phần sửa đơn là FR-035; TreeSet thừa trước lockAllById (đã order by).
- Task 5.7: minor (deferred): accept/decline/ready tra FarmerProfile hai lần (lockOwnedOrder bỏ đi rồi notifyBuyer tra lại).
- Task 5.7: minor (deferred): OrderService 782 dòng, 13 tham số constructor — nên tách OrderNotifier trước khi thêm phụ thuộc.
- Task 5.7: minor (deferred): suite đôi khi vấp "Too many connections" của MySQL (nhiều context @SpringBootTest) — lần chạy lại xanh; môi trường test mong manh.
- Task 5.8: minor (deferred): changed_at của lịch sử đơn tương lai tính theo UTC_TIMESTAMP() nên trôi nhẹ giữa các lần seed (số dòng/thứ tự không đổi); không seed customer_note.
- Task 5.9-api: minor (deferred): problems: string[] có thể thu hẹp thành union 4 giá trị.
- Final: minor (deferred): M-2 sửa đơn không báo Farmer (đề xuất kind order_changed).
- Final: minor (deferred): M-3 lưu bản sửa không đổi gì vẫn đưa accepted về placed + dòng lịch sử.
- Final: minor (deferred): M-5 tăng số lượng ở stall bị đình chỉ vẫn lấy thêm tồn (D-09).
- Final: minor (deferred): M-6 danh sách đơn Farmer xếp cũ trước, không lọc mặc định.
- Final: minor (deferred): M-7 toOrder.locked luôn true ở góc nhìn Farmer — trang Farmer không được dùng locked.
- Final: minor (deferred): M-8 cột TIME pickup_start/end chưa có kiểm DB thật; nên getObject(LocalTime).
- Final: minor (deferred): M-9 thiếu @Max/@Size cho quantity/groups/items (tràn → 409 thay vì 400).
- Final: minor (deferred): (5) luật trạng thái FR-064 có 3 bản; apply template hồi sinh sold_out thủ công bất kể tồn trước — cố ý theo test plan (Farmer tự áp template).
- Final: minor (deferred): (7) cron job chạy cả trong context @SpringBootTest (DB dùng chung) — nên gate bằng property.
- Final: minor (deferred): (8) Javadoc lệch chỗ ở OrderQueryRepository (READY_PAST_PICKUP_SQL / OrderDetailRow).
- Final: minor (deferred): (9) query due-orders không dùng được index pickup_date — thêm pickup_date <= :thresholdDate.
- Final: minor (deferred): (10) yêu thích sản phẩm của stall không approved vẫn được (theo id).
- Final: minor (deferred): (11) nhánh double-click trong FavoriteService.add chưa có test; FK race → 500.
- Final: minor (deferred): (12) POST /favorites luôn 200 (quy ước tạo mới 201).
- Final: minor (deferred): (13) restock có thể báo cho chính người gây ra (khách tự huỷ/giảm đơn) và lặp khi tồn bật 0↔1.
- Final: minor (deferred): (14) test availability chưa tách từng nhánh CASE (hidden/deleted/chợ đóng); thiếu test 404 farmer/market.
- Final: minor (deferred): (15) StockTemplateRequest nhận phần tử null, không giới hạn kích thước.
- Final: minor (deferred): (16) §R.5 plan chưa ghi các đề xuất LEAD mới (favorites.target_id, nhóm favorites, favorites cho Farmer).
- Final: minor (deferred): (17) product/order import thẳng RestockNotifier (impl) — nên dùng interface/event.
