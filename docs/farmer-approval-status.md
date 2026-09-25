# Farmer approval — tình hình triển khai (handoff)

> Cập nhật: 25/09/2026 · nhánh `feature/famer` · FR liên quan: **FR-002** (route thứ hai), **FR-071**, D-08, D-09.
> Mục đích: ai pull nhánh này (người hoặc AI session sau) đọc file này là biết flow đã chạy tới đâu, quyết định nào
> đã chốt, và còn phải làm gì để hoàn chỉnh. Flow end-to-end **đã chạy được**; từng bước còn cần tinh chỉnh UI và
> logic backend (xem §7).

Tài liệu nguồn đã bám theo:

| Tài liệu | Dùng cho |
|---|---|
| `docs/MarketLink-Farmer-Profile-and-Approval.md` | Spec bước 3 roadmap backend (trạng thái, API tối thiểu) |
| `docs/backend/TOPIC.md` §1.6 | SRS: Farmer đăng ký cần stall name, contact person, phone, email, address |
| `docs/prototype/customer/become-farmer.html` | Form Customer xin thành Farmer (6 bước) |
| `docs/prototype/admin/farmers.html`, `farmer.html` | Danh sách + chi tiết duyệt của Admin |
| `docs/prototype/prototype.js` (`SIDE`, `mountShell`) | Khung sidebar + header của panel Admin/Farmer |

---

## 1. Quyết định đã chốt trong session này

1. **Luồng là "Customer đang đăng nhập xin thành Farmer"** (route thứ hai của FR-002), không phải đăng ký Guest ở
   `/register/farmer` (route đó vẫn là stub, chưa làm).
2. **Mô hình role-transition, không multi-profile (D-08).** Mỗi tài khoản một role tại một thời điểm:
   - Nộp đơn: tài khoản vẫn `customer`, tạo 1 dòng `farmer_profiles` trạng thái `pending`.
   - Admin **approve**: `pending → approved` **và** `users.role: customer → farmer` trong cùng transaction.
   - **Reject / suspend / reinstate** không đổi role.
3. **Phone / email / address dùng lại từ `users`**, không lưu trùng trong `farmer_profiles` (spec §9).
4. **Form làm đủ theo prototype** (user yêu cầu): categories, crops, sản lượng, cách trồng, plot, toạ độ, ảnh, video,
   chợ muốn bán.
   - Chưa có bảng `categories` / `markets` nên `categories` và `preferred_market_name` lưu **text tự do** (không phải FK).
   - Ảnh/video lưu **ổ đĩa cục bộ**. Mục đích là test/demo, chưa phải hạ tầng production.
5. **Reject (kèm lý do) và Reinstate** được thêm theo prototype admin, dù spec bước 3 ban đầu không có. User chỉ
   thị làm theo prototype. Tên cột `reject_reason` khớp `db/schema.sql`.
6. **Không tự sửa file của LEAD/QA** (R-02, R-07): `.ai/REQUIREMENTS.md`, `docs/api-contract.md`, `db/schema.sql`,
   `docs/decisions.md` **chưa được cập nhật**. Xem §7.1.
7. Code mới theo quy ước hiện có của repo: prefix `/api/v1`, JSON camelCase (lệch contract `/api` + snake_case, đã
   biết ở CLAUDE.md "Hiện trạng").

## 2. State machine

| Hành động | Từ | Sang | Ai | Đổi role? |
|---|---|---|---|---|
| Nộp đơn | (chưa có hồ sơ) | `pending` | Customer | Không (vẫn customer) |
| Approve | `pending` | `approved` | Admin | **customer → farmer** |
| Reject (+ lý do) | `pending` | `rejected` | Admin | Không |
| Suspend | `approved` | `suspended` | Admin | Không (vẫn farmer, D-09) |
| Reinstate | `suspended` | `approved` | Admin | Không |

- Mọi chuyển trạng thái khác trả **409 `INVALID_APPROVAL_TRANSITION`**.
- `rejected` hiện là trạng thái cuối, chưa có luồng nộp lại (§7).

## 3. Database (Flyway)

| Migration | Nội dung |
|---|---|
| `V20260925007__create_farmer_profiles_table.sql` | Bảng `farmer_profiles`: `user_id` UNIQUE FK, `stall_name`, `contact_person`, `approval_status`, `approved_by`, `approved_at`, timestamps |
| `V20260925008__extend_farmer_profiles_for_full_application.sql` | Thêm các cột của form prototype: `description`, `categories`, `main_crops`, `weekly_volume`, `growing_method`, `plot_address`, `plot_size`, `growing_since_year`, `plot_latitude/longitude`, `photo_paths`, `video_path`, `preferred_market_name` |
| `V20260925009__add_reject_reason_to_farmer_profiles.sql` | Cột `reject_reason` |

Ghi chú về cách lưu:

- FK tới `users` dùng `BIGINT UNSIGNED` (khớp `users.id` thật, **khác** `INT` trong `db/schema.sql`).
- Enum giữ đủ `pending/approved/rejected/suspended` như schema đích.
- `categories` và `photo_paths` lưu nhiều giá trị cách nhau bởi `;`. Việc ghép/tách nằm ở
  `FarmerService.joinList` / `splitList`.

## 4. Backend — `backend/src/main/java/com/techx/intervue/modules/farmer/`

| Thư mục | File chính |
|---|---|
| `entities/` | `FarmerProfile` |
| `enums/` | `ApprovalStatus` (lowercase ở DB và JSON) |
| `repositories/` | `FarmerProfileRepository` (`findByUserId`, `existsByUserId`, `findByApprovalStatus` phân trang) |
| `services/` | `FarmerServiceInterface`, `impl/FarmerService` (toàn bộ nghiệp vụ + state machine), `impl/FarmerUploadService` (lưu file) |
| `controllers/` | `FarmerController`, `AdminFarmerController`, `FarmerUploadController`, `FarmerExceptionHandler` |
| `requests/` | `FarmerApplicationRequest`, `RejectFarmerRequest` |
| `resources/` | `FarmerProfileResource`, `AdminFarmerListItemResource`, `AdminFarmerDetailResource`, `UploadedFileResource` |
| `exceptions/` | `FarmerProfileNotFoundException` (404), `FarmerApplicationExistsException` (409), `InvalidApprovalTransitionException` (409) |

Dùng chung: `resources/PageResource` (`items, page, pageSize, total`), `config/AppConfig` (phục vụ `/uploads/**`
tĩnh).

### Endpoints

| Method | Path | Quyền | Body / query | Ghi chú |
|---|---|---|---|---|
| POST | `/api/v1/farmer/apply` | `CUSTOMER` | `FarmerApplicationRequest` | 201; đã có hồ sơ thì 409 `FARMER_APPLICATION_EXISTS` |
| GET | `/api/v1/farmer/apply` | đăng nhập | — | Hồ sơ của chính mình; `data: null` nếu chưa nộp (FE coi là "empty") |
| POST | `/api/v1/farmer/apply/uploads?kind=photo\|video` | `CUSTOMER` | multipart `file` | Trả `{ url: "/uploads/farmer-applications/<uuid>.<ext>" }` |
| GET | `/api/v1/admin/farmers?status=&page=&pageSize=` | `ADMIN` | — | Phân trang; `status` sai thì 400 |
| GET | `/api/v1/admin/farmers/{id}` | `ADMIN` | — | Chi tiết + `customerSince`, `accountStatus`, `rejectReason` |
| PATCH | `/api/v1/admin/farmers/{id}/approve` | `ADMIN` | — | `pending → approved`, role → farmer, ghi `approved_by/at` |
| PATCH | `/api/v1/admin/farmers/{id}/reject` | `ADMIN` | `{ reason }` | `pending → rejected` |
| PATCH | `/api/v1/admin/farmers/{id}/suspend` | `ADMIN` | — | `approved → suspended` |
| PATCH | `/api/v1/admin/farmers/{id}/reinstate` | `ADMIN` | — | `suspended → approved` |

Chi tiết `FarmerApplicationRequest`:

- Bắt buộc: `stallName`, `contactPerson`.
- Optional: `description, categories[], mainCrops, weeklyVolume, growingMethod, plotAddress, plotSize,
  growingSinceYear, plotLatitude, plotLongitude, photoUrls[] (≤5), videoUrl, preferredMarketName`.

Lỗi trả đúng envelope chung (`FarmerExceptionHandler`):

- 400 `VALIDATION_ERROR`: lỗi validate theo field, hoặc file quá lớn.
- 403 `FORBIDDEN`: sai role.
- 404 `FARMER_NOT_FOUND`.
- 409 `FARMER_APPLICATION_EXISTS` / `INVALID_APPROVAL_TRANSITION`.

Upload (`FarmerUploadService`):

- Lưu vào `${app.uploads.dir:uploads}/farmer-applications/`. Chạy backend từ `backend/` thì thư mục là
  `backend/uploads/`, đã có trong `.gitignore`.
- Tên file luôn là UUID, không dùng tên client gửi lên (tránh path traversal).
- Chỉ nhận ảnh jpeg/png/webp ≤ 8MB, video mp4/webm/mov ≤ 40MB.
- Giới hạn multipart trong `application.yaml`: 40MB/file, 60MB/request.

Test: `FarmerServiceTest` có 13 case (apply, trường mở rộng, approve, reject, suspend, reinstate, các transition
sai). `make be-test` xanh, trừ `IntervueApplicationTests.contextLoads`. Test đó lỗi sẵn từ trước khi chạy
`./mvnw test` trên host, do sai credential MySQL qua port map, không liên quan tới thay đổi này.

## 5. Frontend

Route → page (thư mục `pages/` đã chia theo role, xem §6):

| Route | File | Nội dung |
|---|---|---|
| `/become-farmer` | `pages/customer/BecomeFarmer` | Form 6 bước như prototype, upload ảnh/video thật, 4 trạng thái (FR-084); đã nộp thì hiện trang "What you sent" + timeline |
| `/admin/farmers` | `pages/admin/Farmers` | Tab theo trạng thái kèm số đếm; nút Approve/Reject/Suspend/Reinstate trên từng dòng; mỗi thao tác có dialog xác nhận, Reject có chọn lý do |
| `/admin/farmers/:id` | `pages/admin/FarmerDetail` | Bố cục 2 cột như `farmer.html`: ảnh, What they grow / The plot, stall, history; sidebar Applicant + map placeholder + "What approval does" |

Phần dùng chung:

- API client: `api-requests/farmer.requests.ts`, `api-requests/admin-farmer.requests.ts`.
- Types: `types/farmer.types.ts`, gồm `FarmerApplicationDetails` dùng chung cho input và output, cùng `PageType`
  trong `api.types.ts`.
- Màu và nhãn trạng thái: `constants/approvalStatus.ts`.

Khung panel:

- `layout/DashboardShell.tsx` là sidebar board-green + header, tách ra từ FarmerLayout cũ.
- `FarmerLayout` và `AdminLayout` giờ chỉ là cấu hình truyền vào shell này.
- Sidebar admin theo `SIDE.admin` của prototype. Mục Farmers có badge số đơn `pending`, lấy từ API.
- Mục sidebar chưa có trang thì rơi vào 404 ngay trong khung admin (`<Route path="*">` trong `/admin`).

## 6. Restructure thư mục `frontend/src/pages/`

```
pages/public/    Home, Markets, MarketDetail, Products, ProductDetail, StallProfile, Search, NotFound
pages/auth/      Login, RegisterCustomer, RegisterFarmer, ForgotPassword, ResetPassword, GoogleCallback, CompleteProfile, SetPassword
pages/customer/  Dashboard, Account, Cart, Orders, OrderDetail, OrderEdit, OrderPlaced, Review, Favorites, Messages, Notifications, BecomeFarmer, Settings, Assistant
pages/farmer/    Overview, Orders, OrderDetail, StockWeek, Products, ProductForm, StallProfile, Slots
pages/admin/     Home, Login, Verify, Security, Farmers, FarmerDetail
```

- Tên thư mục bỏ tiền tố role, ví dụ `CustomerCart` thành `customer/Cart`.
- Nhánh khác đang sửa page cũ: khi cập nhật từ `dev`, git nhận đây là đổi tên, nhưng cần kiểm tra lại import trong
  `App.tsx`.

## 7. Còn thiếu / cần tinh chỉnh

### 7.1 Việc của LEAD / QA (AI không tự làm, R-02/R-07)

- [ ] Thêm dòng FR cho "Customer đang đăng nhập xin thành Farmer" vào `.ai/REQUIREMENTS.md`. Prototype cũng ghi chú
      rằng FR-002 và FR-005 cần viết lại.
- [ ] Bổ sung vào `docs/api-contract.md`:
  - [ ] `POST/GET /farmer/apply`
  - [ ] `POST /farmer/apply/uploads`
  - [ ] `PATCH .../reinstate`
  - [ ] Body của `reject` là `{ reason }`
- [ ] Cập nhật `db/schema.sql`: thêm các cột mở rộng ở §3, sửa kiểu FK sang `BIGINT UNSIGNED`.
- [ ] Chốt chính sách: bị reject thì có được nộp lại không, sau bao lâu. Prototype ghi rõ là "not decided".

### 7.2 Backend

- [ ] **Role mới chưa có hiệu lực ngay sau approve.**
  - `UserSessionCache` giữ role cũ tới lần refresh token tiếp theo (tối đa 15 phút) hoặc tới khi đăng nhập lại.
  - Session ở FE cũng giữ `role: customer` trong thời gian đó.
  - Hướng xử lý: revoke session khi đổi role, hoặc để FE tự refresh.
- [ ] **Kiểm tra dùng chung cho quyền đăng sản phẩm** (spec §11): chỉ cho đăng khi role farmer, có hồ sơ, trạng thái
      `approved` và tài khoản active. Chưa làm vì module Product chưa có. D-09 (suspend thì ẩn sản phẩm) cũng chờ
      module Product.
- [ ] Customer chưa xem được lý do bị từ chối: `FarmerProfileResource` chưa có `rejectReason`.
- [ ] Customer rút đơn (prototype có nút "Withdraw") — chưa có endpoint.
- [ ] Lưu thêm `rejected_by`, `rejected_at`, lý do suspend, và lịch sử chuyển trạng thái (hiện chỉ có
      `approved_by/at`).
- [ ] `photoUrls` và `videoUrl` trong request chưa được kiểm tra là file do chính user đó upload. Hiện nhận string
      bất kỳ.
- [ ] File upload mồ côi (upload rồi không nộp, hoặc bấm xoá trên UI) không được dọn. Chưa có quota theo user.
- [ ] `listForAdmin` bị N+1 query (tìm user cho từng dòng). Nên đổi sang JOIN hoặc `NamedParameterJdbcTemplate`
      (R-04).
- [ ] Admin list chưa có search (`q` theo stall / người liên hệ / phone). FE đang gọi cố định `pageSize=50`, chưa
      phân trang.
- [ ] "Ask for better photos" và thông báo cho applicant khi được duyệt / bị từ chối (module Notification chưa có).
- [ ] Chưa có test controller / integration (quyền 403, validate 400, upload).

### 7.3 Frontend

- [ ] Ghim bản đồ thật (Leaflet) cho plot. Hiện dùng `MapPlaceholder` và nhập lat/lng bằng tay.
- [ ] Danh sách chợ và categories đang lấy từ mock (`data/home.ts`, `data/customer.ts`). Khi có module Market /
      Category thì chuyển sang API và gửi id.
- [ ] Form mới có 3 ô ảnh (backend cho tối đa 5). Chưa bắt buộc ảnh. Validate client mới có stallName / contactPerson.
- [ ] Trang chi tiết admin:
  - [ ] Chưa có "distance to market".
  - [ ] Chưa có thống kê đơn / no-show của applicant (cần module Order).
  - [ ] Tiêu đề trang chưa chuyển lên header như prototype.
- [ ] Trang Farmers chưa có ô search (prototype có).
- [ ] Sau khi approve, trang BecomeFarmer chưa có link sang panel Farmer. `FarmerLayout` vẫn dùng mock data
      (`farmer(1)`).
- [ ] Chưa kiểm tra responsive 375 / 768 / 1440 trên trình duyệt (DoD mục 5).

### 7.4 Dữ liệu dev đang có

- Trong lúc test, tài khoản thật `phamhoangtuanqn2@gmail.com` (id 1) đã được approve, suspend rồi reinstate. Hiện
  tài khoản là `role = farmer`, đơn "Sap Do Choi" (id 2) ở trạng thái `approved`.
- 3 ảnh của đơn này nằm trong `backend/uploads/farmer-applications/`, không commit.
- Muốn test lại từ đầu thì đổi `users.role` về `customer` và xoá dòng `farmer_profiles` đó.

## 8. Bug đã gặp (tránh lặp lại)

- **Ảnh upload lên nhưng không gắn vào đơn.**
  - Nguyên nhân: FE gửi `photoUrls` / `videoUrl`, BE chờ `photoPaths` / `videoPath`. Jackson bỏ qua field lạ nên
    không báo lỗi.
  - Đã thống nhất dùng `photoUrls` / `videoUrl` ở cả request lẫn response.
  - Bài học: đổi tên field thì phải test round-trip qua UI thật, không chỉ qua curl.
- **Insert lỗi `updated_at cannot be null`.** Hibernate gửi NULL tường minh nên đè mất DEFAULT của MySQL. Sửa bằng
  cách set `updatedAt` trong `@PrePersist`.
- **ESLint `react-hooks/set-state-in-effect`.**
  - Không gọi `setState` đồng bộ trong `useEffect`.
  - Theo mẫu `fetchX` (chỉ `setState` trong `.then`) cộng `load()` cho nút retry.
  - Đổi filter hoặc tab thì set loading ngay trong handler.
