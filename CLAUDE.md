# MarketLink — hướng dẫn cho AI assistant

Đồ án TechWiz 7 · End-to-End Web Solutions. Nền tảng đặt trước nông sản tại chợ phiên TP.HCM:
Customer đặt trước → Farmer duyệt → nhận hàng tại stall. Ba vai: `customer`, `farmer`, `admin`.

## Đọc trước khi code

| File | Nội dung | Chủ sở hữu |
|---|---|---|
| `.ai/REQUIREMENTS.md` | Nguồn sự thật duy nhất về scope (FR-xxx, MUST/SHOULD/NICE) | QA/DOC |
| `docs/decisions.md` | 12 quyết định D-01…D-12 đã chốt — **không bàn lại** | LEAD |
| `docs/api-contract.md` | Contract BE ↔ FE | LEAD |
| `db/schema.sql` | Schema đích 19 bảng (MySQL 8, utf8mb4) | LEAD |
| `docs/MarketLink-Feature-Catalog-by-Module-and-Role.md` | Danh mục tính năng theo module và vai | — |
| `docs/chatbot-design.md` | Thiết kế chatbot FR-090…092 | BE2 |
| `docs/design-system/README.md` | Design system "Hang tag": token, component `ml-*`, giọng văn UI — mọi UI phải theo | FE1 |
| `README.md` | Hướng dẫn cài đặt và chạy dự án | — |
| `CONTRIBUTING.md` | Luật nhánh `dev`/`main` (§0 luật cứng H-1…H-10), môi trường, commit, PR, release | LEAD |
| `AGENTS.md` | Luật git bắt buộc cho mọi AI agent: không trộn `dev` và `main` | LEAD |
| `docs/ai-tooling.md` | Plugin Claude Code dùng chung (superpowers, harness, code-review…) và cách cài | AI lead |

## Luật (R-xx được các tài liệu khác viện dẫn)

- **R-01** · Mỗi thay đổi phải gắn với ít nhất một FR-xxx. Ghi ID vào commit/PR (`feat(FR-030): ...`).
- **R-02** · Chỉ LEAD sửa `db/schema.sql`, `docs/api-contract.md`, `docs/decisions.md`. Cần đổi thì đề xuất, không tự sửa.
- **R-03** · Thay đổi DB chỉ qua migration Flyway mới trong `backend/src/main/resources/db/migration/`
  (`V<yyyyMMdd><nnn>__<mo_ta>.sql`). **Không sửa migration đã merge.**
- **R-04** · SQL luôn dùng tham số (JPA / `NamedParameterJdbcTemplate`). Không nối chuỗi input người dùng vào SQL.
  Chatbot: intent → câu SQL viết sẵn; **LLM không bao giờ được sinh SQL**.
- **R-05** · BE và FE lệch nhau thì sửa bên sai, không sửa contract.
- **R-06** · Mọi endpoint có `:id` phải kiểm tra quyền sở hữu; sai quyền → 403. Chuyển trạng thái đơn sai thứ tự → 409 (D-04).
- **R-07** · Không làm tính năng không có trong `.ai/REQUIREMENTS.md`. Thấy thiếu thì báo, không tự thêm.
- **R-08** · Không trộn `dev` và `main`: tuân thủ luật cứng H-1…H-10 trong `CONTRIBUTING.md` §0 và `AGENTS.md`.
  Trước khi sửa file, chạy `git branch --show-current`; đang ở `main`/`dev` thì tạo nhánh từ `origin/dev` trước.
  Không commit, push, merge hay force-push vào `main`/`dev`; nhánh làm việc chỉ cập nhật từ `dev`.

> R-01, R-03, R-04, R-06 là bản đề xuất do AI soạn khi tạo file này — LEAD xác nhận hoặc sửa.

## Definition of Done — "đủ 7 điều kiện"

AI **không tự tick DONE** trong REQUIREMENTS. Khi xong, báo đủ 7 điều kiện để QA/DOC tick:

1. Chạy đúng theo requirement trên stack Docker (`make up`).
2. Đúng contract (path, request, response, mã HTTP).
3. Kiểm tra quyền (role + ownership) ở server, không chỉ ẩn nút ở FE.
4. Validation ở cả client và server.
5. UI có đủ 4 trạng thái loading / empty / error / có data (FR-084), responsive 375/768/1440.
6. Có test cho logic nghiệp vụ, `make be-test` và `make lint` xanh.
7. Seed data demo được tính năng đó.

> Danh sách trên cũng là đề xuất — LEAD xác nhận.

## Stack & lệnh

- Backend: Spring Boot 4.1 · **Java 25** · Maven wrapper · MySQL 8 · Redis · Flyway · JWT. Xem `backend/CLAUDE.md`.
- Frontend: React 19 · Vite · TypeScript · Tailwind 4 (SPA). Xem `frontend/CLAUDE.md`.
- Bản đồ: Leaflet + OpenStreetMap (D-12), không Google Maps.
- UI: design system `docs/design-system/` (tokens + Tailwind theme + class `ml-*`), xem `frontend/CLAUDE.md`.
- Locale: VND `₫`, `dd/MM/yyyy`, 24h, `Asia/Ho_Chi_Minh`.

Hai cách chạy (chi tiết trong `README.md`):

```bash
# A. Trên máy: Docker chỉ chạy MySQL + Redis, BE/FE chạy trực tiếp
docker compose up -d
cd backend && ./mvnw spring-boot:run -Dspring-boot.run.profiles=local
cd frontend && npm run dev

# B. Full Docker (máy không cần JDK 25 / Node)
make up        # mysql, redis, backend :8080, frontend :3000
make be-test   # test backend trong container
make lint      # eslint + spotless:check
make format    # prettier + spotless:apply
make help      # xem mọi lệnh
```

## Hiện trạng cần biết (24/09/2026)

Code khởi tạo từ dự án cũ InterVue nên còn lệch so với tài liệu MarketLink:

- Package Java vẫn là `com.techx.intervue`, DB mặc định `intervue_db`.
- Migration thật khác `db/schema.sql`: `users.id BIGINT UNSIGNED`, cột `name`/`password`, bảng `roles`
  với `ADMIN/USER/EDITOR` thay vì `customer/farmer/admin`. Chưa có migration cho markets, products, orders…
- ~~Code dùng prefix `/api/v1` và JSON camelCase; contract ghi `/api` và snake_case.~~
  **LEAD đã chốt 25/09/2026:** toàn dự án dùng `/api/v1` và JSON `camelCase`; cột database giữ
  `snake_case`. `docs/api-contract.md` đã viết lại theo quyết định này và bổ sung đủ các endpoint
  auth đang chạy thật. Không còn chỗ nào phải "tạm theo code hiện có" nữa.
