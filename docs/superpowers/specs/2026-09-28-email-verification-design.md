# Xác thực email bằng mã 6 số khi đăng ký — thiết kế

- Ngày: 28/09/2026 · Người duyệt: LEAD
- FR: **FR-009** (mới) — xác thực email bằng mã 6 số khi Customer đăng ký bằng email. Liên quan FR-001 (đăng ký
  Customer), FR-003 (session), FR-007 (mail quên mật khẩu dùng chung đường gửi mail).
- Nguồn quyết định: hội thoại với LEAD ngày 28/09/2026 (xem §12).

## 1. Mục tiêu

Hiện `POST /auth/register` tạo tài khoản và đăng nhập ngay, không kiểm tra người đăng ký có sở hữu email hay không.
Sau thay đổi này, tài khoản chỉ được tạo khi người đăng ký nhập đúng mã 6 số gửi tới email đó.

Coi là xong khi:

- Không ai tạo được tài khoản bằng email không phải của mình.
- Không dùng form đăng ký để dội mail vào hộp thư người khác được (giới hạn theo email, theo IP, thời gian chờ).
- Đoán mã không khả thi: tối đa 25 lần đoán mỗi email mỗi giờ trên 1.000.000 khả năng.
- Mail đúng phong cách dự án, đủ 10 ngôn ngữ, có bản text thuần.
- Chạy được trọn luồng trên stack Docker ở 375 / 768 / 1440 px, giao diện sáng và tối.

### Ngoài phạm vi

- Đăng nhập Google: provider đã xác minh email, giữ nguyên.
- Farmer (FR-002): đi từ tài khoản Customer đã có (`POST /farmer/apply`), nên đã qua bước xác minh.
- Tài khoản đang có (kể cả tài khoản demo trong seed): giữ nguyên, không bắt xác minh lại.
- Đổi email trong Settings: hiện không cho đổi email, không cần xác minh.
- Làm lại giao diện mail quên mật khẩu / đổi mật khẩu (FR-007): để PR sau, dùng lại khung mail của FR-009.
- CAPTCHA.

## 2. Luồng

Hướng đã chốt: **xác minh xong mới tạo tài khoản**. Bấm đăng ký chỉ lưu tạm thông tin trong Redis, không tạo dòng
`users` nào cho tới khi nhập đúng mã.

```
Form đăng ký ──POST /auth/register──▶ kiểm tra dữ liệu + trùng email/SĐT + giới hạn gửi
                                       lưu tạm signup:pending:{email} (30 phút)
                                       xếp job gửi mã vào hàng đợi Redis
            ◀── 202 {email, codeExpiresInSeconds, resendAvailableInSeconds}

Job worker ── sinh mã 6 số, lưu băm signup:code:{email} (10 phút) ── gửi mail

Màn nhập mã ──POST /auth/register/verify {email, code}──▶ so mã
            ◀── sai: 400 SIGNUP_CODE_INVALID (còn n lần)
            ◀── đúng: tạo user (ACTIVE) + 201 {accessToken, user} + cookie refresh_token

"Gửi mã mới" ──POST /auth/register/resend {email}──▶ kiểm tra thời gian chờ + giới hạn
            ◀── 200 {email, codeExpiresInSeconds, resendAvailableInSeconds}
```

- **Token đăng ký (bổ sung sau review, 28/09):** mỗi bản lưu tạm gắn với trình duyệt đã điền form. Lần gửi đầu
  server trả `signupToken` ngẫu nhiên (lưu băm trong bản lưu tạm); verify, resend và việc sửa form đều phải gửi lại
  token này. Không có nó thì không ai thay được mật khẩu của mình vào đăng ký đang chờ của người khác.
- Gửi lại form cùng email **kèm token**: cập nhật thông tin đã lưu tạm (người dùng sửa tên, SĐT…). Đang trong 60
  giây chờ thì **không** gửi mã mới, trả thời gian chờ còn lại; hết chờ thì gửi mã mới.
- Gửi form cùng email **không có token** (tab khác, máy khác, người khác): đang có bản lưu tạm trong 60 giây chờ →
  429; hết chờ → form mới **thay** bản cũ, nhận token mới, mã cũ bị xoá. Trình duyệt cũ không hoàn tất được nữa
  (410), nên tệ nhất là phải điền lại form chứ không bị chiếm tài khoản.
- Đổi email: quay về form, đăng ký với email mới. Bản lưu tạm của email cũ tự hết hạn.
- Bỏ ngang quá 30 phút: bản lưu tạm hết hạn, phải đăng ký lại (màn nhập mã báo rõ và có nút quay về form).

## 3. Lưu tạm trong Redis

Email luôn được `trim()` + chữ thường trước khi làm khoá.

| Khoá | Giá trị | TTL |
|---|---|---|
| `signup:pending:{email}` | JSON: `fullName`, `email`, `phone`, địa chỉ đã resolve (chuỗi + các cột), `passwordHash` (BCrypt, như `users.password_hash`), `language`, `tokenHash` (SHA-256 của `signupToken`) | 1800 s, gia hạn mỗi lần gửi mã |
| `signup:code:{email}` | SHA-256 hex của `email + ":" + code` (`TokenHashUtil`) | 600 s |
| `signup:attempts:{email}` | số lần thử mã hiện tại, đúng hay sai (`INCR` **trước** khi so) | bằng TTL của mã; xoá khi có mã mới |
| `signup:cooldown:{email}` | `1` (`SET NX EX`) | 60 s |
| `ratelimit:signup:{email}` | số lần gửi mã trong giờ (`INCR`, `EXPIRE` ở lần đầu) | 3600 s |
| `ratelimit:signup-ip:{ip}` | số lần gửi mã trong giờ từ một IP | 3600 s |

- Mã **không bao giờ** nằm ở dạng rõ trong Redis: job chỉ nhận email, tự sinh mã trong worker, lưu bản băm rồi
  gửi mail (giống `PasswordResetLinkJob` tự sinh token).
- Mã sinh bằng `SecureRandom`, luôn đủ 6 chữ số (`000000`–`999999`). So sánh bằng `MessageDigest.isEqual`.
- Redis lỗi → 503 `SERVICE_UNAVAILABLE` (đăng ký bắt buộc cần Redis, không "fail open").

## 4. API

Cập nhật `docs/api-contract.md` §1.1 và bảng mã HTTP (thêm 410). Mọi endpoint dưới `/api/v1/auth` đã `permitAll`.

### 4.1 `POST /auth/register` (đổi)

Request như cũ, thêm 2 trường không bắt buộc:

| Trường | Ý nghĩa |
|---|---|
| `language` | Ngôn ngữ của mail: một trong `en vi zh ja ko fr es de th id`; thiếu hoặc lạ → `en` |
| `website` | Ô bẫy bot (honeypot). Form thật luôn gửi rỗng |
| `signupToken` | Token của lần gửi trước cùng địa chỉ trong tab này (nếu có) |

Thứ tự kiểm tra:

1. Validation như cũ (400 `VALIDATION_ERROR`), mật khẩu nhập lại khớp.
2. Trùng email/SĐT với bảng `users` → 409 `DUPLICATE_ACCOUNT` (liệt kê mọi trường trùng, như cũ).
3. Resolve địa chỉ (`AddressService`, như cũ).
4. `website` có nội dung → trả 202 giống hệt trường hợp thật, không lưu, không gửi.
5. Có bản lưu tạm và token khớp: trong thời gian chờ → cập nhật, không gửi, trả 202 với thời gian chờ còn lại;
   hết chờ → qua bước 6 rồi cập nhật và gửi mã mới, giữ token cũ.
6. Có bản lưu tạm, token không khớp, còn thời gian chờ → 429 `RATE_LIMITED`, không đụng tới bản lưu tạm.
7. Vượt giới hạn theo email hoặc IP → 429 `RATE_LIMITED`, không lưu gì.
8. Tạo token mới, xoá mã cũ, lưu tạm (thay bản cũ nếu có), đặt thời gian chờ (`SET NX`; chỉ request thắng mới xếp
   job), tăng 2 bộ đếm, xếp job `signup.send-code`.

Response **202** (không còn token, không đặt cookie):

```json
{ "email": "lan@example.com", "codeExpiresInSeconds": 600, "resendAvailableInSeconds": 60, "signupToken": "…" }
```

Message: `"We sent a 6-digit code to your email."`

### 4.2 `POST /auth/register/verify` (mới)

Request: `{ "email": "…", "code": "123456", "signupToken": "…" }` — `code` phải đúng `\d{6}` (400
`VALIDATION_ERROR`).

1. Không có `signup:pending:{email}`, hoặc token không khớp → 410 `SIGNUP_EXPIRED` (không tính là một lần thử).
2. Không có `signup:code:{email}` (hết hạn, hoặc đã huỷ vì sai quá 5 lần) → 400 `SIGNUP_CODE_EXPIRED`.
3. Tăng `signup:attempts` **trước** khi so (request song song không lách được giới hạn); quá 5 → xoá mã, 400
   `SIGNUP_CODE_EXPIRED`. Sai mã → 400 `SIGNUP_CODE_INVALID` kèm `details[{field:"code"}, {field:"attemptsLeft"}]`.
   Còn 0 lần → xoá mã; lần sau sẽ gặp `SIGNUP_CODE_EXPIRED`.
4. Đúng mã → `GETDEL` khoá mã (chỉ dùng một lần, chặn hai request đúng mã cùng lúc). Trong transaction: kiểm tra
   trùng email/SĐT lần nữa (409 `DUPLICATE_ACCOUNT`, xoá bản lưu tạm), tạo `users` (role CUSTOMER, ACTIVE), phát token
   như register cũ (`issueTokens`, rememberMe = true). Transaction lỗi → trả lại khoá mã (như `PasswordResetService`).
   Sau commit → xoá `pending`, `attempts`, `cooldown`.

Response **201** giống register cũ: `{ accessToken, user }` + `Set-Cookie: refresh_token`, message `"Account created."`.

### 4.3 `POST /auth/register/resend` (mới)

Request: `{ "email": "…", "signupToken": "…" }`.

1. Không có bản lưu tạm, hoặc token không khớp → 410 `SIGNUP_EXPIRED`.
2. Đang trong thời gian chờ → 429 `RATE_LIMITED`, `Retry-After` = TTL còn lại của `signup:cooldown`.
3. Vượt giới hạn theo email hoặc IP → 429 `RATE_LIMITED`, `Retry-After` = TTL còn lại của bộ đếm.
4. Gia hạn bản lưu tạm, đặt thời gian chờ, tăng bộ đếm, xếp job (mã mới thay mã cũ, số lần sai về 0).

Response **200**: cùng hình dạng với 4.1.

### 4.4 Mã lỗi mới

| Mã | HTTP | Khi nào | Chữ mặc định (EN) |
|---|---|---|---|
| `SIGNUP_CODE_INVALID` | 400 | Sai mã | "That code is not right. You have {n} tries left." |
| `SIGNUP_CODE_EXPIRED` | 400 | Mã hết hạn hoặc đã hết lượt | "This code can no longer be used. Send a new one." |
| `SIGNUP_EXPIRED` | 410 | Bản lưu tạm hết hạn | "Your sign-up has expired. Fill in the form again." |
| `RATE_LIMITED` | 429 | Thời gian chờ / giới hạn gửi | "Too many codes requested. Try again later." |

- 429 luôn có header `Retry-After` (giây). Thêm `Retry-After` vào `setExposedHeaders` trong `SecurityConfig` để
  frontend (khác origin) đọc được.
- Các exception mới nằm ở `modules/user/exceptions/`, map trong `AuthExceptionHandler`.
- Chữ mặc định ở trên là message tiếng Anh của server. Màn nhập mã **không** hiện message này mà chọn chữ đã dịch
  theo `error.code` (10 ngôn ngữ); số lần còn lại đọc từ `details`, thời gian chờ đọc từ `Retry-After`.

## 5. Chống spam

| Chặn gì | Giới hạn mặc định | Khoá cấu hình (`app.email-verification.*`) |
|---|---|---|
| Mã hết hạn | 10 phút | `code-ttl-seconds: 600` |
| Bản lưu tạm | 30 phút | `pending-ttl-seconds: 1800` |
| Chờ giữa hai lần gửi | 60 giây | `resend-cooldown-seconds: 60` |
| Sai mã | 5 lần mỗi mã, rồi huỷ mã | `max-attempts: 5` |
| Gửi mã theo email | 5 lần mỗi giờ | `max-sends-per-email: 5` |
| Gửi mã theo IP | 20 lần mỗi giờ | `max-sends-per-ip: 20` |
| Bot điền form | ô ẩn `website` | — |

- IP lấy bằng `IpHelper.getClientIp` như quên mật khẩu.
- Bộ đếm dùng mẫu `INCR` + `EXPIRE` lần đầu của `PasswordResetService` (có sửa TTL = -1), nhưng vượt giới hạn thì
  **báo 429** thay vì im lặng: người dùng cần biết để chờ, và đăng ký vốn đã báo email trùng (409).
- Cấu hình theo kiểu `@Configuration @Getter` + `@Value` như `PasswordResetConfig` (`EmailVerificationConfig`).

## 6. Gửi mail

- Job `signup.send-code` (`SignupCodeMailJob implements JobHandler`) trên hàng đợi Redis có sẵn (`RedisJobQueue`,
  `RedisJobWorker`, thử lại 3 lần). Payload chỉ có `email`.
- Job đọc bản lưu tạm (hết hạn → bỏ qua), sinh mã, lưu băm, xoá `attempts`, render mail theo `language`, gửi.
- `MailServiceInterface` thêm `send(to, subject, html, text)` gửi **multipart/alternative** (HTML + text thuần).
  `sendHtml` cũ giữ nguyên cho hai mail FR-007.
- **Chưa cấu hình SMTP** (`spring.mail.username` rỗng): `MailService` không gửi mà ghi log mức WARN gồm người nhận,
  tiêu đề và bản text (có mã). Nhờ vậy dev test trọn luồng khi LEAD chưa điền thông tin mail. Áp dụng cho mọi mail.
- Template là file trong `backend/src/main/resources/mail/`: `signup-code.html` và `signup-code.txt`.
  `MailTemplates` (helper mới ở `services/`) đọc file, thay `{{key}}`; bản HTML escape mọi giá trị bằng
  `HtmlUtils.htmlEscape`. Placeholder nào thiếu giá trị → ném lỗi (test bắt được).
- Chữ trong mail lấy từ bundle mới `i18n/mail*.properties` (10 ngôn ngữ), nạp bằng `MailMessagesConfig` giống
  `NotificationMessagesConfig`. Thiếu khoá ở một ngôn ngữ → rơi về `mail.properties` (EN).
- `docker-compose.yml`: truyền `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD` vào backend (hiện chưa
  truyền, nên cả mail quên mật khẩu cũng không chạy trong Docker). Thêm các biến này vào `.env.example` và
  `.env.production.example` với giá trị rỗng. `docs/setup.md` thêm mục cấu hình Gmail (App Password).

## 7. Thiết kế mail

Mail không đọc được biến CSS, nên dùng thẳng mã hex của token sáng trong `marketlink-theme.css` (ngoại lệ của luật
"không viết hex", chỉ trong template mail). Khung 600 px dựng bằng `<table>`, style inline,
`<meta name="color-scheme" content="light">` để ứng dụng mail không tự đảo màu.

```
nền surface #dcc59d
┌──────────── thẻ surface-raised #f1e5cb · viền 1.5px line-strong #6e5a3c · bo 10px ────────────┐
│ dải board #2f4a2a — chữ "MarketLink" màu on-board #f1e5cb (Patrick Hand → Trebuchet MS)      │
│                                                                                               │
│ Finish creating your account               ← 22px đậm, ink #2a2016 (Chivo → Arial)          │
│ Hi Lan, enter this code on the sign-up page to confirm this email is yours.  ← 16px          │
│                                                                                               │
│      ┌─○─────── thẻ bảng phấn board #2f4a2a · bo 10px ───────────┐                           │
│      │          4 8 2 9 1 7    ← 34px mono, giãn chữ 10px, #f1e5cb │                          │
│      └────────────────────────────────────────────────────────────┘                          │
│ The code works once and expires in 10 minutes.          ← 14px ink-muted #57462f             │
│ ───────────────────────── line #c4ab7e ─────────────────────────                              │
│ Didn't try to sign up? Ignore this email. Nobody can create an account with this address     │
│ without the code.                                                                             │
└───────────────────────────────────────────────────────────────────────────────────────────────┘
MarketLink · Farmers markets around Ho Chi Minh City           ← 12px ink-muted, căn giữa
You got this email because someone signed up at MarketLink with lan@example.com.
```

- Điểm nhấn duy nhất là **mã in trên thẻ bảng phấn** (giống bảng phấn sạp ghi hàng trong tuần), có lỗ xỏ dây ○ như
  thẻ treo của design system "Hang tag". Không gradient, không ảnh.
- Tiêu đề mail: `"{code} is your MarketLink code"` để điện thoại gợi ý điền mã. Có dòng preheader ẩn:
  "Enter it on the sign-up page. It expires in 10 minutes."
- Bản text thuần cùng nội dung, mã đứng riêng một dòng.
- Giọng văn theo design system: "you", câu ngắn, sentence case, không emoji, không dấu chấm than.

## 8. Frontend

### 8.1 `CodeInput` (thành phần mới, `components/ui/code-input.tsx`)

- Về kỹ thuật là **một** `<input>` thật: `inputMode="numeric"`, `autoComplete="one-time-code"`, `maxLength={6}`,
  `pattern="[0-9]*"`, chỉ giữ chữ số khi gõ/dán. Nhìn thì là 6 ô: input trong suốt phủ lên 6 ô vẽ bằng token
  (`bg-surface-raised`, `border-line-strong`, `rounded-sm`, font mono 28px); ô đang nhập có viền `focus`, lỗi có viền
  `danger`. Đúng cả giao diện tối vì chỉ dùng token.
- Props: `value`, `onChange`, `onComplete` (gọi khi đủ 6 số), `invalid`, `disabled`, `label` / `aria-describedby`.
- Hướng dẫn dùng: `docs/design-system/components/CodeInput.md`. Không đổi màn 2FA của admin trong PR này.

### 8.2 Màn nhập mã `VerifyEmail` (route mới `/register/verify`, dưới `AuthLayout`)

- Nhớ `{email, codeExpiresAt, resendAt}` trong sessionStorage (`ml.signup.pending`) để tải lại trang không mất.
  Mở trực tiếp khi không có → về `/register/customer`.
- Nội dung: tiêu đề "Check your email", "We sent a 6-digit code to **{email}**.", `CodeInput`, đồng hồ "The code expires
  in 9:41", nút chính "Verify and create account", nút phụ "Send a new code" (đếm ngược "Send a new code in 42s"; trình đọc màn hình chỉ được báo **một lần** khi
  nút dùng được, qua một vùng `aria-live` ẩn, không đọc từng giây), link "Wrong email?
  Change it" quay về form với dữ liệu đã nhập.
- Nhập đủ 6 số tự gửi. Trạng thái:

| Trạng thái | Hiển thị |
|---|---|
| Đang gửi | input và các nút khoá, nút chính hiện trạng thái đang xử lý |
| Sai mã | `Banner` danger tại chỗ + số lần còn lại, xoá ô, focus lại |
| Hết lượt / mã hết hạn | `Banner` warning "This code can no longer be used. Send a new one.", khoá ô tới khi gửi mã mới |
| Đồng hồ về 0 | như trên, không cần gọi API |
| `SIGNUP_EXPIRED` | `Banner` warning + nút "Fill in the form again" |
| `RATE_LIMITED` | nút gửi lại đếm ngược theo `Retry-After` |
| Lỗi mạng | toast lỗi như các màn khác (`Helper.getErrorMessage`) |
| Thành công | `Session.save`, toast "Account created", về `/` như register cũ, xoá sessionStorage |

### 8.3 Form đăng ký

- Nhận 202 → lưu `ml.signup.pending` + bản nháp form **không có mật khẩu** (`ml.signup.draft`), chuyển sang
  `/register/verify`. Không còn `Session.save` ở bước này.
- Gửi `language` = ngôn ngữ đang dùng (`i18n.resolvedLanguage`).
- Ô bẫy `website`: `sr-only`, `aria-hidden="true"`, `tabIndex={-1}`, `autoComplete="off"`.
- `auth.requests.ts` thêm `verifySignup`, `resendSignupCode`; `auth.types.ts` thêm kiểu tương ứng.

### 8.4 Chữ hiển thị

Namespace mới `VerifyEmail.json` cho đủ 10 ngôn ngữ + một dòng trong `src/i18n/resources.ts`. Chữ mới của form đăng
ký (nếu có) vào `RegisterCustomer.json`. Test `locales.test.ts` bắt thiếu khoá.

## 9. Prototype

- Màn mới `docs/prototype/public/verify-email.html` (FR-009): mã đúng là `123456`; có sẵn trạng thái sai mã, hết lượt,
  hết hạn, đếm ngược gửi lại; dùng `.ml-*` và `pt-*` như `admin/verify.html` và `forgot-password.html`.
- Màn xem trước mail `docs/prototype/public/email-signup-code.html`: cùng markup với template backend, giá trị mẫu.
  Màn nhập mã có nút chỉ-prototype "Open the email" (như "Open the link from the email" ở quên mật khẩu).
- `register-customer.html`: nút "Create account" trỏ sang `verify-email.html` thay vì dashboard.
- Thêm hai màn vào `PT.SCREENS.public` trong `prototype.js`; `<title>` kết thúc bằng ` — MarketLink prototype`.

## 10. Tài liệu phải sửa

| File | Sửa gì |
|---|---|
| `.ai/REQUIREMENTS.md` | thêm dòng FR-009 vào mục A (SHOULD, Guest, BE1/FE2) |
| `docs/api-contract.md` | §1.1 register 202, verify, resend, mã lỗi §4.4, mã HTTP 410 |
| `docs/decisions.md` | D-14: xác minh email trước khi tạo tài khoản, lý do và các giới hạn |
| `docs/setup.md` | mục cấu hình SMTP Gmail và cách lấy mã từ log khi chưa có SMTP |
| `docs/design-system/components/CodeInput.md` | hướng dẫn thành phần mới |
| `.env.example`, `.env.production.example` | `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD` |

## 11. Kiểm thử

- **Backend** (JUnit 5 + Mockito, mock `StringRedisTemplate` như `PasswordResetServiceTest`):
  - register: lưu tạm + xếp job; trùng email/SĐT; honeypot không lưu; trong thời gian chờ cập nhật mà không gửi;
    vượt giới hạn email / IP → 429.
  - verify: đúng mã tạo user + phát token; sai mã giảm số lần; lần sai thứ 5 huỷ mã; mã hết hạn; bản lưu tạm hết hạn
    → 410; trùng tài khoản lúc tạo → 409 và trả lại khoá mã khi transaction lỗi.
  - resend: thời gian chờ → 429 có `Retry-After`; mã mới thay mã cũ và xoá số lần sai.
  - job: sinh đủ 6 chữ số, lưu băm không lưu mã rõ, bỏ qua khi bản lưu tạm đã hết.
  - `MailTemplates`: escape giá trị, thiếu placeholder thì lỗi; mail đủ 10 ngôn ngữ có đủ khoá.
  - `MailService`: chưa cấu hình SMTP thì ghi log, không gửi.
  - `AuthExceptionHandler`: 4 mã lỗi mới đúng HTTP và header.
- **Frontend** (vitest): `CodeInput` (gõ, dán cả mã, xoá lùi, bỏ ký tự không phải số, gọi `onComplete`); `VerifyEmail`
  (sai mã, hết lượt, 410, 429, thành công); form đăng ký chuyển trang khi nhận 202.
- **Kiểm tra tay**: stack Docker chạy từ worktree, đăng ký → lấy mã trong log backend → xác minh; 375 / 768 / 1440,
  sáng và tối; chụp mail đã render.
- Cổng CI: Prettier, ESLint, `tsc -b`, vitest, `vite build`, Spotless, test backend.

## 12. Quyết định đã chốt với LEAD (28/09/2026)

1. Hướng **xác minh xong mới tạo tài khoản** (lưu tạm trong Redis), không thêm cột `email_verified_at`, không đổi
   login / Google / refresh.
2. Mã 6 số, 10 phút, sai tối đa 5 lần; chờ 60 giây giữa hai lần gửi; 5 lần gửi mỗi email mỗi giờ; 20 lần mỗi IP mỗi
   giờ; có honeypot, không CAPTCHA.
3. Mail theo ngôn ngữ người dùng chọn lúc đăng ký (10 ngôn ngữ), mã nằm trên tiêu đề mail.
4. LEAD điền SMTP sau; khi chưa có, backend ghi mã ra log.
5. Cập nhật prototype cùng PR.
