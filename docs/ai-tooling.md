# AI tooling — plugin dùng chung cho cả team

Chủ sở hữu: **AI lead**. Cấu hình nằm ở `.claude/settings.json` (commit sẵn), áp dụng cho mọi người
dùng Claude Code trong repo này. Luật code và scope vẫn theo `CLAUDE.md` (R-01…R-08).

## Cài đặt (một lần)

1. Cài Claude Code, `cd` vào repo, chạy `claude`.
2. Khi được hỏi **trust this folder** → đồng ý. Claude Code đọc `.claude/settings.json` và hỏi cài
   marketplace `harness-marketplace` cùng các plugin bên dưới → đồng ý hết.
3. Không thấy hỏi? Cài tay trong Claude Code:
   ```
   /plugin marketplace add https://github.com/revfactory/harness.git
   /plugin install superpowers@claude-plugins-official
   /plugin install harness@harness-marketplace
   /plugin install code-review@claude-plugins-official
   /plugin install frontend-design@claude-plugins-official
   /plugin install context7@claude-plugins-official
   ```
4. Kiểm tra: `/plugin` → tab **Installed** thấy đủ 5 plugin.

Cấu hình riêng của từng máy (quyền, model…) để trong `.claude/settings.local.json` — file này bị
gitignore, không commit.

## Plugin và khi nào dùng

| Plugin | Dùng khi | Gọi thế nào |
|---|---|---|
| **superpowers** | Mọi việc code: brainstorm trước khi làm tính năng, viết plan, TDD, debug có hệ thống, kiểm tra trước khi báo xong | Tự kích hoạt; hoặc gọi thẳng `superpowers:brainstorming`, `superpowers:writing-plans`, `superpowers:systematic-debugging`… |
| **harness** | Dựng đội agent chuyên trách + skill cho một mảng việc (vd. agent BE theo api-contract, agent QA theo REQUIREMENTS) | Nói "하네스 구성해줘" / "build a harness for …" hoặc `/harness:harness` |
| **code-review** | Trước khi mở PR vào `dev`: soát lỗi logic, bảo mật, đúng contract | `/code-review` (diff hiện tại) hoặc `/code-review <số PR>` |
| **frontend-design** | Làm màn hình mới — phải bám `docs/design-system/README.md`, không tự chế token | Tự kích hoạt khi dựng UI |
| **context7** | Tra tài liệu mới nhất của thư viện (React 19, Vite, Tailwind 4, Spring Boot 4, Flyway…) thay vì đoán từ trí nhớ của model | Tự kích hoạt; hoặc thêm "use context7" vào prompt |

## Quy ước khi dùng AI

- Plugin không thay luật của repo: vẫn phải gắn FR-xxx (R-01), chỉ đổi DB bằng migration mới (R-03),
  làm trên nhánh tách từ `dev` (R-08).
- Giữ dòng `Co-Authored-By` mà công cụ tự thêm vào commit (đề yêu cầu khai báo công cụ AI).
- Muốn thêm/bớt plugin cho cả team: mở PR sửa `.claude/settings.json` và bảng trên, AI lead duyệt.
