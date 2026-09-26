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
  Test backend 784/784. PR **#161** (`feature/FR-062-products` → `dev`) đã mở, chưa merge.
- **Cảnh báo FR-063:** nhánh `feature/FR-062-farmer-products` của một bạn trong nhóm làm FR-063 theo thiết kế khác (tồn kho
  theo ngày), trùng migration `017`/`018` và trùng tên lớp. LEAD phải chọn một thiết kế trước khi merge nhánh nào.
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
