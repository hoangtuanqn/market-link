# Luật làm việc chung — MarketLink

Áp dụng cho **mọi thành viên và mọi AI assistant**. Không chắc thì hỏi trong nhóm trước khi làm.
Luật về code và scope (R-01…R-07, Definition of Done) nằm trong `CLAUDE.md`; file này là luật về
**nhánh, môi trường, commit, PR và release**.

---

## 1. Hai môi trường

| | **DEV** | **PRODUCTION** |
|---|---|---|
| Nhánh | `dev` — tích hợp hằng ngày | `main` — bản ổn định để demo và nộp bài |
| Ai được đưa code vào | PR từ `feature/*`, `fix/*`, `docs/*`, `chore/*` | **Chỉ** PR release `dev → main` và `hotfix/*` |
| Spring profile | `dev` (`application-dev.yaml`) | `prod` (`application-prod.yaml`) |
| File env | `.env` ← copy từ `.env.example` (commit sẵn, chạy được ngay) | `.env.production` ← copy từ `.env.production.example`, thay mọi `<...>` |
| Frontend | `frontend/.env.development` | `frontend/.env.production` + build arg `VITE_API_URL` |
| Lệnh chạy | `make up` hoặc cách chạy trên máy trong `README.md` | `make prod-init` → sửa `.env.production` → `make prod` |
| Docker | project `market-link`, DB + Redis mở cổng ra máy | project `market-link-prod` riêng, DB + Redis **không** mở cổng |
| Bí mật | Giá trị dev mẫu, không nhạy cảm | Bắt buộc truyền qua biến môi trường, thiếu là không khởi động |
| CI | Backend (Spotless + test) + Frontend (Prettier + ESLint + build) | Như DEV + build image production |

Dev lấy môi trường dev về làm:

```bash
git clone https://github.com/hoangtuanqn/market-link.git && cd market-link
git switch dev
make init        # tạo .env từ .env.example, cài git hook
make up          # hoặc làm theo README (docker compose up -d + chạy BE/FE trên máy)
```

---

## 2. Nhánh

```
main  ●────────────────●─────────────●        ← production, chỉ nhận release và hotfix
       \              / \           /
dev     ●──●──●──●──●    ●──●──●──●            ← tích hợp, nhánh mặc định để mở PR
            \  /  \  /       \ /
feature/*    ●     ●          ●                ← mỗi nhánh một việc, sống ngắn
```

| Loại | Tách từ | PR vào | Đặt tên |
|---|---|---|---|
| Tính năng | `dev` | `dev` | `feature/FR-030-cart-split-orders` |
| Sửa lỗi | `dev` | `dev` | `fix/FR-034-cancel-restock` |
| Tài liệu | `dev` | `dev` | `docs/readme-environments` |
| Hạ tầng, cấu hình | `dev` | `dev` | `chore/ci-cache` |
| Release | `dev` | `main` | không tạo nhánh, PR thẳng `dev → main` |
| Sửa gấp production | `main` | `main`, rồi merge ngược vào `dev` | `hotfix/login-500` |

Tên nhánh viết thường, nối bằng `-`, có mã FR nếu có.

**Cấm:**
- Push thẳng vào `main` hoặc `dev`.
- `git push --force` lên `main` hoặc `dev`. Trên nhánh của mình thì dùng `--force-with-lease`.
- Merge `feature/*` thẳng vào `main`.
- Commit file bí mật: `.env`, `.env.production`, `application-local.yml`, key hay mật khẩu thật.

---

## 3. Quy trình làm một việc

```bash
git switch dev && git pull                       # 1. lấy dev mới nhất
git switch -c feature/FR-030-cart-split-orders   # 2. tạo nhánh
# ... code, commit nhỏ, thường xuyên ...
git fetch origin && git rebase origin/dev        # 3. cập nhật theo dev trước khi mở PR
git push -u origin feature/FR-030-cart-split-orders
gh pr create --base dev                          # 4. PR vào dev, điền template
```

5. Chờ CI xanh và **ít nhất 1 người approve**. Người review không phải người viết code.
6. Merge bằng **Squash and merge**, rồi xoá nhánh.
7. Sau khi merge, cập nhật trạng thái requirement trong `.ai/REQUIREMENTS.md` theo luật của QA/DOC.

Một PR chỉ làm **một việc**, nên dưới khoảng 400 dòng thay đổi (không tính lock file). Việc lớn thì chia nhiều PR.

---

## 4. Commit

Theo [Conventional Commits](https://www.conventionalcommits.org), có mã FR nếu có:

```
<type>(<FR-xxx hoặc phạm vi>): <mô tả ngắn, thì hiện tại>

feat(FR-030): split cart into one order per farmer
fix(FR-034): restore stock when order is cancelled
docs(readme): add production setup
chore(ci): cache maven dependencies
```

| type | Dùng khi |
|---|---|
| `feat` | Thêm tính năng |
| `fix` | Sửa lỗi |
| `refactor` | Đổi cấu trúc, không đổi hành vi |
| `test` | Thêm hoặc sửa test |
| `docs` | Tài liệu |
| `chore` | Cấu hình, CI, Docker, dependency |
| `release` | Commit hoặc PR release lên `main` |

Commit có dùng AI thì giữ dòng `Co-Authored-By` mà công cụ tự thêm (đề yêu cầu khai báo công cụ AI đã dùng).

---

## 5. Pull request

Checklist bắt buộc trước khi xin review (có sẵn trong template PR):

- [ ] PR vào đúng nhánh: `dev`, hoặc `main` nếu là release hay hotfix.
- [ ] Ghi mã FR-xxx và mô tả đã làm gì, test thế nào.
- [ ] CI xanh: Spotless, test backend, Prettier, ESLint, build frontend.
- [ ] Không có file bí mật, không có `console.log` hay code debug thừa.
- [ ] Đổi DB thì có migration mới (mục 7).
- [ ] Đổi API thì khớp `docs/api-contract.md` (R-05).
- [ ] Thêm biến môi trường thì đã cập nhật đủ các file ở mục 6.
- [ ] UI có đủ 4 trạng thái loading / empty / error / có data và responsive (FR-080, FR-084).

Reviewer kiểm tra đúng requirement, quyền (role + ownership), validation, và không phá tính năng cũ.
Góp ý thì ghi rõ **bắt buộc sửa** hay **gợi ý**.

---

## 6. Biến môi trường và bí mật

Thêm một biến mới thì cập nhật **cùng lúc** trong một PR:

1. `.env.example`: giá trị dev chạy được ngay.
2. `.env.production.example`: để `<mô tả cách tạo>` nếu là bí mật.
3. `application-dev.yaml` / `application-prod.yaml`, nếu backend đọc biến đó. Ở prod **không để giá trị mặc định** cho bí mật.
4. `docker-compose.yml` / `docker-compose.prod.yml`, nếu container cần biến đó.
5. Biến frontend phải có tiền tố `VITE_`. Mọi biến `VITE_*` **bị nhúng vào bundle và ai cũng đọc được**, nên không bao giờ đặt bí mật ở frontend.

Lỡ commit bí mật thì báo ngay cho LEAD và đổi bí mật đó. Xoá commit **không đủ**, vì lịch sử đã bị đẩy lên GitHub.

---

## 7. Database migration

- Chỉ đổi DB qua migration Flyway mới: `backend/src/main/resources/db/migration/V<yyyyMMdd><nnn>__<mo_ta>.sql`.
- **Không sửa migration đã merge vào `dev`.** Muốn đổi thì viết migration mới.
- Hai PR trùng số version: người merge sau đổi tên file của mình sang số lớn hơn trước khi merge.
- `db/schema.sql` là thiết kế đích do LEAD giữ (R-02), không phải migration.

---

## 8. Release lên production

1. Trên `dev`: CI xanh, và đã chạy thử `make up` thấy các tính năng chính hoạt động.
2. Mở PR `dev → main`, tiêu đề `release: <mô tả>`, liệt kê các FR có trong đợt này.
3. LEAD approve, rồi **Create a merge commit**. Không squash, để giữ lịch sử của `dev`.
4. Gắn tag trên `main`: `git tag -a v0.1.0 -m "..." && git push origin v0.1.0`.
5. Trên máy demo: `git switch main && git pull && make prod`.

**Hotfix:** tách `hotfix/*` từ `main` → PR vào `main` → merge xong thì mở ngay PR `main → dev`, để `dev` không mất bản sửa.

---

## 9. Chất lượng code

- Git hook (lefthook) tự format khi commit: Spotless cho Java, Prettier cho TS. Chạy `npm install` ở root để cài.
  Không dùng `--no-verify` để né hook.
- Logic nghiệp vụ mới phải có test (Definition of Done, `CLAUDE.md`).
- Chạy trước khi push: `make lint` và `make be-test`, hoặc `./mvnw verify` + `npm run lint && npm run build`.

---

## 10. Dùng AI

- Được dùng AI (đề khuyến khích), nhưng **mỗi người phải hiểu và giải thích được code mình nộp**, vì giám khảo sẽ hỏi.
- AI assistant đọc `CLAUDE.md` và file này. Hướng dẫn cho AI được commit chung để cả team dùng như nhau.
- AI không tự merge PR, không push thẳng vào `dev` hay `main`, không tự tick DONE trong requirements.
- Ghi công cụ AI đã dùng vào tài liệu nộp bài, theo yêu cầu của đề.

---

## 11. Cấu hình GitHub (chủ repo làm một lần)

Cần quyền **admin** repo. Vào *Settings → Branches*, hoặc *Rules → Rulesets*:

| Thiết lập | `main` | `dev` |
|---|---|---|
| Require a pull request before merging | ✅, 1 approval | ✅, 1 approval |
| Dismiss stale approvals when new commits are pushed | ✅ | ✅ |
| Require status checks to pass | ✅ `Backend · format + test`, `Frontend · lint + build`, `Docker · build image production` | ✅ `Backend · format + test`, `Frontend · lint + build` |
| Require branches to be up to date before merging | ✅ | ✅ |
| Block force pushes, restrict deletions | ✅ | ✅ |
| Allowed merge methods | Merge commit | Squash |

Thêm: *Settings → General → Default branch* = `dev`, để PR mới mặc định nhắm vào `dev`.
Bật *Automatically delete head branches*.
