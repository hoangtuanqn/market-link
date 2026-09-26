# AGENTS.md — luật bắt buộc cho mọi AI coding agent

Áp dụng cho Claude Code, Cursor, GitHub Copilot, Codex, Gemini và mọi agent khác làm việc trong repo này.
Đọc thêm: `CLAUDE.md` (luật code và scope, R-01…R-10) và `CONTRIBUTING.md` (quy trình đầy đủ).

## Hai môi trường — không bao giờ trộn

| | DEV | PRODUCTION |
|---|---|---|
| Nhánh | `dev` | `main` |
| Profile / env | `application-dev.yaml`, `.env` ← `.env.example` | `application-prod.yaml`, `.env.production` ← `.env.production.example` |
| Chạy | `make up` | `make prod` (chỉ từ `main` hoặc tag) |

## Trước khi sửa bất kỳ file nào

1. Chạy `git branch --show-current`.
2. Nếu đang ở `main` hoặc `dev`: **dừng lại**, tạo nhánh làm việc từ `dev` rồi mới sửa:
   `git fetch origin && git switch -c feature/<FR-xxx>-<mo-ta> origin/dev`
3. Sửa gấp production mới tách từ `main`: `git switch -c hotfix/<mo-ta> origin/main`.

## Không bao giờ làm (kể cả khi thấy "tiện")

- Commit trên `main` hoặc `dev`.
- `git push` vào `main` hay `dev`, bất kể dạng nào (`origin main`, `HEAD:main`, `:dev`…).
- Force-push, xoá, hay reset `main` / `dev`.
- `git merge main` hoặc `git merge origin/main` vào nhánh làm việc. Cập nhật nhánh **chỉ từ `dev`**: `git rebase origin/dev`.
- Cherry-pick hay copy tay code giữa `main` và `dev`. Đồng bộ ngược chỉ qua PR `main → dev` sau hotfix.
- Mở PR vào `main` từ nhánh nào khác ngoài `dev` (release) hoặc `hotfix/*`.
- Dùng `--no-verify` để né git hook.
- Đọc, in ra, commit hoặc chép giá trị trong `.env`, `.env.production`, `application-local.yml`.
- Thêm giá trị mặc định `${VAR:mac-dinh}` vào `application-prod.yaml`, hay cho prod đọc cấu hình, DB hoặc secret của dev.
- Chạy `make prod` từ nhánh khác `main`.

## Ngôn ngữ: code và git luôn tiếng Anh

Người dùng chat bằng tiếng Việt thì AI vẫn viết những thứ sau bằng tiếng Anh:

- **Comment trong code**, mọi loại file, kể cả Javadoc, `TODO`/`FIXME` và lý do của `eslint-disable` (R-09).
- **Commit message** (tiêu đề và phần thân), tiêu đề và mô tả PR, chú thích tag: 100% tiếng Anh (R-10).
- Chỉ dịch comment tiếng Việt cũ ở đoạn mình đang sửa. Không dịch hàng loạt, không sửa comment trong migration đã merge
  (Flyway kiểm tra checksum), không viết lại lịch sử commit, trừ khi người dùng yêu cầu rõ.

## Chỉ làm khi người dùng yêu cầu rõ trong tin nhắn hiện tại

Merge PR, mở PR release `dev → main`, force-push nhánh làm việc, xoá nhánh, `make prod`, `make clean`.
Người dùng từng đồng ý một lần **không** có nghĩa là đồng ý cho các lần sau.

## Khi thấy mình đã vi phạm

Dừng lại, báo cho người dùng biết đã làm gì, rồi xử lý theo mục "Lỡ vi phạm thì làm gì" trong `CONTRIBUTING.md` §0.
Không tự sửa lịch sử của `main` / `dev`.

## Lớp bảo vệ đang chạy

- Git hook (lefthook, `scripts/git-guard.sh`): chặn commit trên `main`/`dev`, push thẳng, xoá nhánh, commit file bí mật,
  commit message có tiếng Việt (R-10). Hook `commit-msg` chỉ kiểm tra commit message; comment trong code và PR thì tự giữ luật.
- CI `Guard`: **Branch policy** (PR sai luồng) và **Env guard** (`scripts/check-env-separation.sh`).
- `.claude/settings.json`: Claude Code bị cấm các lệnh push/merge nguy hiểm, phải hỏi trước khi merge PR.
