# Giai đoạn 2 — Báo hàng hư và phạt (FR-122, FR-123) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Khách báo hàng hư trên một món của đơn đã hoàn tất, sạp phản hồi, admin xác nhận hoặc bác. Món có hạn do sạp kéo dài mà hư trước hạn thì sạp bị ghi một lỗi hạn dùng, hạn dùng của sản phẩm về lại mốc gợi ý, và đủ 3 lỗi trong 90 ngày thì sạp bị khoá kéo dài hạn dùng.

**Architecture:** Module backend mới `modules/quality` giữ hai bảng `quality_reports` và `farmer_violations`, lớp quy tắc thuần `SpoilagePolicy`, ba service theo vai (khách, sạp, admin) và `ShelfLifeStandingService` tính số lỗi còn hiệu lực và ngày hết khoá thẳng từ bảng lỗi (không lưu cờ khoá). `ProductService.applyShelfLife` của giai đoạn 1 gọi `requireCanExtend` ở nhánh "dài hơn gợi ý"; `FarmerService` đưa số lỗi vào chi tiết sạp của admin; mỗi món trong `GET /orders/{id}` có thêm `qualityReport` và `itemId`. Frontend thêm dialog báo hư ở trang chi tiết đơn của khách, tab "Spoiled reports" ở trang Reviews của Farmer và ở Moderation của admin, thẻ số lỗi ở trang chi tiết sạp và trang Tổng quan, và khoá nút + trong `ShelfLifeField`.

**Tech Stack:** Spring Boot 4 · Java 25 · MySQL 8 · Flyway · JPA + NamedParameterJdbcTemplate · JUnit 5 + Mockito + AssertJ · React 19 · Vite · TypeScript · Tailwind 4 · react-i18next · vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-27-shelf-life-deals-design.md` — §4.2 (dòng "Sạp đang bị khoá kéo dài" và lỗi 409), §4.4, §4.6, §5 (migration số 4 và seed báo hư), §6 (các dòng của giai đoạn 2), §7, §8, §9. LEAD duyệt 27/09/2026.

**Nền:** plan giai đoạn 1 `docs/superpowers/plans/2026-09-27-shelf-life-phase-1-guidance.md` đã merge vào nhánh trước khi bắt đầu. Plan này dùng đúng tên giai đoạn 1 tạo ra: `StorageMode`, `ShelfLifePolicy`, các field `Product.shelfLifeExtended / suggestedShelfLifeDays / shelfLifeAckAt`, `OrderItem.bestBefore / shelfLifeExtended / extendedByDays`, `OrderItemResource(…, bestBefore, storageMode, listPrice)`, `ProductService.applyShelfLife`, `ProductRequest` 11 tham số, `ShelfLifeField`, `BestBeforeLine`, `ShelfLifeApi`, `ReportFixture`, key `storageMode.*` của `common.json`.

## Global Constraints

- Làm trên nhánh `feature/FR-120-shelf-life-deals` (hoặc nhánh tách từ nó) **sau khi** giai đoạn 1 đã merge vào nhánh đó. Không commit, push hay merge vào `dev`/`main` (R-08). Trước khi sửa file: `git branch --show-current`.
- Commit dạng `<type>(FR-122|FR-123): <English description>`, cả tiêu đề lẫn thân 100% tiếng Anh (R-01, R-10). FR-122 = khách báo hư, ảnh minh chứng, sạp phản hồi, `qualityReport` trên đơn. FR-123 = admin xử lý, lỗi hạn dùng, khoá kéo dài, số lỗi ở chi tiết sạp và Tổng quan, lý do đình chỉ "Vi phạm hạn dùng".
- Comment trong code 100% tiếng Anh ở mọi loại file, kể cả SQL và `.properties` (R-09). Dữ liệu seed và dữ liệu mẫu trong test được viết tiếng Việt.
- DB chỉ đổi bằng migration mới `V20260927006__create_quality_reports_and_violations.sql` (R-03). Trước khi tạo file, chạy `ls backend/src/main/resources/db/migration | tail -3`; nếu đã có `V20260927006` hoặc số lớn hơn thì lấy số `V<yyyyMMdd><nnn>` trống kế tiếp và giữ phần mô tả sau `__` (Flyway từ chối version lùi, và giai đoạn 2, 3 có thể vào nhánh theo thứ tự bất kỳ).
- SQL luôn có tham số: JPA hoặc `NamedParameterJdbcTemplate` (R-04). Bộ lọc của admin là giá trị bind, không nối chuỗi.
- R-06: khách chỉ báo đơn mình mua (403 `FORBIDDEN`), sạp chỉ đọc và sửa báo cáo về sạp mình (403), chỉ admin xử lý (`@PreAuthorize("hasRole('ADMIN')")`). Trạng thái sai (đơn chưa hoàn tất, báo cáo đã xử lý, báo lần hai, quá hạn báo) → 409.
- Không sửa `db/schema.sql`, `docs/decisions.md` (R-02). `docs/api-contract.md` chỉ thêm dòng ở Task 17: LEAD đã duyệt đúng các dòng này ở spec §6.
- Quy ước backend: controller `extends BaseController` (`ok(data, message)`, `created(...)`), `@PreAuthorize` theo vai, request/response là `record`, lỗi nghiệp vụ là exception được map trong `@RestControllerAdvice(assignableTypes = {...})` của module (envelope `ApiResource.error(ErrorResource.builder().code(..).details(..).build(), message)`), `InvalidFieldException(field, message)` → 400 `VALIDATION_ERROR` kèm field. Principal `@AuthenticationPrincipal CustomUserDetails user` → `user.getId()`. "Hôm nay" là `LocalDate.now(clock)` với bean `Clock` Asia/Ho_Chi_Minh (`modules/chat/ChatConfig.java`); thời điểm là `clock.instant()` lưu vào cột `TIMESTAMP` qua field `Instant` (như `reviews`).
- Câu server trả về là câu tiếng Anh; FE hiện câu đó hoặc map field sang copy riêng. Chữ hiển thị chỉ đi qua `frontend/src/locales/<lang>/<Namespace>.json` đủ 10 ngôn ngữ `en vi zh ja ko fr es de th id`. Plan ghi sẵn bản `en` và `vi`; 8 ngôn ngữ còn lại dịch từ bản `en`, giữ nguyên placeholder `{{…}}` và đủ cặp `_one`/`_other`. Tiếng Anh viết sentence case, không emoji, không dấu chấm than, nút bị khoá có dòng lý do. Thông báo backend dịch trong `backend/src/main/resources/i18n/notifications*.properties` (10 file), placeholder `{name}`.
- UI chỉ dùng class token của design system (`bg-surface-raised`, `text-ink-muted`, `bg-warning-bg`, `text-warning-ink`, `border-line-strong`…), không hex, không palette mặc định của Tailwind; spacing chỉ `1/2/3/4/6/8/12/16`. Màn có dữ liệu đủ 4 trạng thái loading / empty / error / data (FR-084), không tràn ngang ở 375 / 768 / 1440 px (FR-080). Ngày "yyyy-MM-dd" hiển thị qua `stockDay()` (`components/stockDay.ts`, ra "Sat 03/10"), thời điểm ISO qua `formatDate(new Date(iso))`, tiền qua `money()`.
- Con số của spec: cửa sổ báo = tới `best_before + 2 ngày`; mô tả ≤ 500 ký tự; ảnh JPG/PNG/WebP ≤ 5 MB, không bắt buộc; phản hồi của sạp ≤ 500 ký tự; ghi chú quyết định ≤ 255 ký tự, bắt buộc khi bác; lỗi còn hiệu lực 90 ngày; 3 lỗi thì khoá; ngày hết khoá = ngày tạo của lỗi mới thứ ba + 90 ngày.
- Test: backend unit test bằng Mockito (như `ProductServiceTest`), test MySQL bằng `@SpringBootTest @Transactional` (mọi dòng tự rollback) với `QualityFixture` (Task 1) dựa trên `ReportFixture`; FE bằng vitest + Testing Library, `vi.mock` module `api-requests` (như `pages/farmer/ProductForm/index.test.tsx`).
- Lệnh (chạy ở gốc worktree, stack Docker riêng của worktree):
  - test backend tập trung: `docker compose exec -T -e MAVEN_OPTS=-Xmx256m backend ./mvnw -B test -Dtest='ClassName' -Dsurefire.failIfNoSpecifiedTests=false -DargLine="-Xmx768m -XX:MaxMetaspaceSize=256m -XX:+UseSerialGC"`
  - format backend: `docker compose exec -T -e MAVEN_OPTS=-Xmx256m backend ./mvnw -B -q spotless:apply`
  - test frontend: `docker compose exec -T frontend sh -c 'npx vitest run src/path/file.test.tsx'`
  - trước mỗi commit frontend: `docker compose exec -T frontend sh -c 'npx prettier --write <files> && npx tsc -b && npx eslint src'`
  - cuối plan: `make be-test` và `docker compose exec -T frontend sh -c 'npx vitest run'`.
  - Hook `frontend-format` của lefthook cần `frontend/node_modules` trên host. Nếu host không có, đã chạy prettier trong container thì commit với `LEFTHOOK_EXCLUDE=frontend-format git commit …`.

## Rulings

Những chỗ spec im lặng hoặc lệch với code. Mỗi dòng là lựa chọn nhỏ nhất đứng vững, kèm lý do.

1. **`{itemId}` là `order_items.id`, và `OrderItemResource` thêm hai thành phần sau `listPrice`: `qualityReport` rồi `itemId`.** Response hiện không có id của món, nên FE không có gì để điền vào path đã duyệt `/orders/{id}/items/{itemId}/quality-report`. FE: `OrderItemDto.qualityReport?` và `OrderItemDto.itemId?` (tuỳ chọn, như 3 field của giai đoạn 1, để các test dựng `OrderDetailDto` cũ vẫn biên dịch). Giai đoạn 3 không đổi record này.
2. **Số lỗi của chính sạp đi kèm `GET /api/v1/farmer/quality-reports`** dưới dạng `{ standing, reports }`, không thêm endpoint ngoài spec §6. Thẻ ở trang Tổng quan và dòng khoá trong form sản phẩm gọi endpoint này với `pageSize=1` (`QualityReportApi.standing()`).
3. **Ảnh minh chứng lưu như ảnh sản phẩm** (`FileStorageServiceInterface`, URL `/uploads/quality-report-photos/<userId>-<uuid>.jpg|webp`, tên không đoán được). Ảnh đi qua `ImageProbe` có sẵn của module chat: JPEG/PNG được mã hoá lại nên mất EXIF (ảnh điện thoại có thể chứa GPS của khách, mà thư mục này public). `photoUrl` gửi kèm báo cáo chỉ được nhận khi là URL do chính tài khoản đó vừa tải và file còn trên đĩa (cùng ý với `FarmerUploadService.isOwnedBy`); sai → 400 field `photoUrl`.
4. **Cột thời điểm dùng `TIMESTAMP` + `Instant`** như `reviews` và `orders` (spec ghi `DATETIME` cho `farmer_responded_at`); cột ngày dùng `DATE`. Thêm CHECK `(status = 'open') = (decided_at IS NULL)` để báo cáo đã xử lý luôn có thời điểm.
5. **Mã lỗi:** đơn chưa `completed` → 409 `ORDER_NOT_COMPLETED` (spec §8 ghi 409; review dùng 403 là module khác); món không có `best_before` → 409 `REPORT_WINDOW_CLOSED` (không có lời hứa thì không có cửa sổ); món không thuộc đơn → 404 `NOT_FOUND`; sạp sửa phản hồi hoặc admin xử lý báo cáo đã xử lý → 409 `REPORT_ALREADY_DECIDED`; bác mà thiếu ghi chú → 400 field `note`; `spoiledOn` ngoài khoảng [ngày nhận, hôm nay] → 400 field `spoiledOn`.
6. **Bộ lọc của admin:** `status` nhận `open | confirmed | dismissed | decided` (`decided` = đã xử lý, tức confirmed hoặc dismissed); `escalated=true` nghĩa là `shelf_life_extended AND before_promise`. "Cần xử lý" = `status=open&escalated=true`, "Tất cả đang mở" = `status=open`, "Đã xử lý" = `status=decided`. Giá trị khác → 400 field `status`.
7. **Quyết định xong thì thẻ ở lại chỗ cũ với trạng thái mới**, không biến khỏi danh sách đang xem, để nút "Suspend stall" hiện ngay trên thẻ (spec §4.4.3). Nút mở `/admin/farmers/{id}?suspend=shelfLifeViolations`: trang chi tiết sạp mở luôn dialog đình chỉ có sẵn với lý do "Vi phạm hạn dùng" đã chọn. Backend không đổi luồng `FarmerService.suspend`: lý do vẫn là một câu do FE ghép.
8. **Xác nhận vi phạm chỉ đưa sản phẩm về mốc gợi ý khi sản phẩm còn đang kéo dài** (`shelf_life_extended = TRUE`, có `suggested_shelf_life_days`). Sạp đã tự giảm thì giữ số của sạp, không nâng lên.
9. **`SHELF_LIFE_LOCKED` gửi mỗi lần một lỗi mới để lại sạp trong trạng thái khoá** (lần đủ 3, và mỗi lỗi sau đó đẩy ngày hết khoá ra xa hơn), kèm ngày hết khoá dạng `dd/MM/yyyy` theo giờ Việt Nam.
10. **`QUALITY_DECIDED` dùng một câu chung cho cả xác nhận và bác.** Chữ thông báo được dịch theo kind trên server; tham số không được dịch, nên không nhét được "đã xác nhận / đã bác" vào câu. Người nhận mở link để xem quyết định.
11. **Người báo là người mua của đơn, vai `CUSTOMER` hoặc `FARMER`** (D-13: Farmer cũng đi mua, như review). Admin không mua nên không báo được.
12. **Form sản phẩm chặn cả ở client:** sạp đang bị khoá mà sản phẩm cũ đang để dài hơn gợi ý thì bấm Lưu thấy lỗi "Lower it to N days" trước khi gọi server (validation hai phía, DoD 4). Server vẫn trả 409 kèm field `shelfLifeDays` nếu request vẫn tới.
13. **Seed nhiều hơn spec §5 một chút, để demo trọn luồng:** ngoài 1 báo hư đang mở (đơn `ML-20260920-0007`, "Rau muống" kéo dài +2 ngày), thêm 2 báo hư đã xác nhận kèm 2 lỗi trên đơn `ML-20260920-0010`, nên xác nhận báo cáo đang mở là lỗi thứ 3 và thấy ngay khoá cùng nút đình chỉ; thêm đơn `ML-20260920-0013` hoàn tất hôm qua để khách demo nút "Report spoiled". Khối seed xoá rồi chèn lại báo cáo của 3 đơn này (như khối review), vì lúc demo có thể đã thêm báo cáo hay lỗi mới. `docs/DEMO_CREDENTIALS.md` sửa 12 → 13 đơn.
14. **Thẻ số lỗi ở trang Tổng quan không hiện gì khi đang tải hoặc lỗi mạng:** đây là thông báo phụ, chỉ hiện khi có lỗi (spec §4.4.4). Danh sách đầy đủ với 4 trạng thái nằm ở tab "Spoiled reports".
15. **FE không cần copy riêng cho 5 kind mới:** danh sách thông báo hiện `title`/`message` do server dịch và đi theo `link` server gửi. FE chỉ thêm kind vào kiểu `NotificationKindCode`, và copy cho nhóm Cài đặt `qualityReports` (admin). Icon dùng icon mặc định.

## Review Focus

Năm lớp đầu vào spec ngầm định nhưng dễ vỡ nhất. Mỗi dòng đã có test ở task sở hữu code.

1. **Hai admin cùng xử lý một báo cáo, hoặc sạp sửa phản hồi đúng lúc admin quyết định.** Kỳ vọng: một bên thắng, bên sau nhận 409 `REPORT_ALREADY_DECIDED`, không có lỗi hạn dùng thứ hai (khoá hàng `lockById` + UNIQUE `quality_report_id`). → Task 8 `aDecidedReportCannotBeDecidedAgain` và `aSecondStrikeForTheSameReportIs409`; Task 7 `aDecidedReportCannotBeAnsweredAnyMore`.
2. **Sạp đang bị khoá sửa một sản phẩm cũ đã kéo dài, ví dụ chỉ đổi giá.** Kỳ vọng: form bảo giảm về mốc gợi ý và không gửi; nếu request vẫn tới server thì 409 gắn vào field `shelfLifeDays`, không phải toast chung. → Task 16 `asks a locked stall to lower an extended product before saving`; Task 9 `aLockedStallCannotSaveLongerThanSuggested` và `theLockIsA409OnTheShelfLifeField`.
3. **Khách bấm "Send report" hai lần hoặc gửi từ hai tab.** Kỳ vọng: lần sau là 409 `ALREADY_REPORTED`, kể cả khi hai request chạy song song và UNIQUE bắn `DataIntegrityViolationException`; dialog nói rõ lý do. → Task 5 `aDuplicateReportRaceIs409`; Task 12 `says why a second report was refused`.
4. **`photoUrl` không phải ảnh khách vừa tải (ảnh của khách khác, URL trang ngoài), và ảnh điện thoại mang GPS trong EXIF.** Kỳ vọng: 400 field `photoUrl`; ảnh lưu lại đã mã hoá lại, không còn metadata. → Task 4 `aPhotoOfSomeoneElseIsNotTheirs` và `aPngIsStoredAsAJpegUnderTheUploadersName`; Task 5 `somebodyElsesPhotoIs400`.
5. **Ngày cuối của cửa sổ báo, khi trình duyệt ở múi giờ khác Việt Nam.** Kỳ vọng: FE và server cùng tính "hôm nay" theo Asia/Ho_Chi_Minh; ngày `bestBefore + 2` còn báo được, ngày sau đó 409. → Task 2 bảng `aLineCanBeReportedUntilTwoDaysAfterItsGoodUntilDate`; Task 5 `theLastDayOfTheWindowIsAcceptedAndTheNextIsNot`; Task 11 `reads today on the Vietnam calendar, whatever the browser time zone`.

---

## File Structure

**Backend — tạo mới** (`backend/src/main/java/com/techx/intervue/modules/quality/…` trừ khi ghi khác):

| File | Trách nhiệm |
|---|---|
| `backend/src/main/resources/db/migration/V20260927006__create_quality_reports_and_violations.sql` | Hai bảng `quality_reports`, `farmer_violations` |
| `enums/QualityProblem.java`, `enums/QualityReportStatus.java` | Giá trị ENUM + converter |
| `entities/QualityReport.java`, `entities/FarmerViolation.java` | Entity |
| `repositories/QualityReportRepository.java`, `repositories/FarmerViolationRepository.java` | JPA: một báo cáo mỗi món, khoá hàng, thời điểm các lỗi còn hiệu lực |
| `repositories/QualityReportQueryRepository.java` | SQL đọc cho sạp và admin (join đơn, món, sạp, khách, số lỗi) |
| `services/impl/SpoilagePolicy.java` | Quy tắc thuần: cửa sổ báo, trước hạn, đẩy lên admin, cửa sổ 90 ngày, ngày hết khoá |
| `services/impl/QualityLinks.java` | Link của các thông báo |
| `services/impl/QualityReportPhotoService.java` | Lưu ảnh minh chứng, kiểm ảnh có phải của người báo |
| `services/interfaces/CustomerQualityReportServiceInterface.java`, `services/impl/CustomerQualityReportService.java` | Khách báo hư |
| `services/interfaces/FarmerQualityReportServiceInterface.java`, `services/impl/FarmerQualityReportService.java` | Sạp đọc báo cáo và phản hồi |
| `services/interfaces/AdminQualityReportServiceInterface.java`, `services/impl/AdminQualityReportService.java` | Hàng đợi, xác nhận, bác, ghi lỗi, đưa sản phẩm về mốc gợi ý |
| `services/interfaces/ShelfLifeStandingServiceInterface.java`, `services/impl/ShelfLifeStandingService.java` | Số lỗi còn hiệu lực, ngày hết khoá, chặn kéo dài |
| `requests/CreateQualityReportRequest.java`, `requests/FarmerResponseRequest.java`, `requests/DecisionRequest.java` | Body |
| `resources/QualityReportResource.java`, `resources/ShelfLifeStandingResource.java`, `resources/FarmerQualityReportsResource.java` | Response |
| `exceptions/*.java` (8 class) | Lỗi nghiệp vụ |
| `controllers/QualityReportPhotoController.java`, `QualityReportController.java`, `FarmerQualityReportController.java`, `AdminQualityReportController.java`, `QualityExceptionHandler.java` | REST |
| `backend/src/main/java/com/techx/intervue/modules/order/resources/ItemQualityReportResource.java` | Báo cáo của một món, trong chi tiết đơn |

**Backend — sửa:** `notification/enums/NotificationKind.java`, `notification/enums/NotificationCategory.java`, `resources/i18n/notifications*.properties` (10 file), `order/resources/OrderItemResource.java`, `order/repositories/OrderQueryRepository.java`, `product/services/impl/ProductService.java`, `product/controllers/ProductExceptionHandler.java`, `farmer/resources/AdminFarmerDetailResource.java`, `farmer/services/impl/FarmerService.java`.

**Backend — test:** tạo `quality/QualityFixture.java` và test trong `modules/quality/**`, `notification/enums/NotificationKindTest.java`, `product/controllers/ProductExceptionHandlerTest.java`; sửa `NotificationTextRendererTest`, `NotificationPreferenceServiceTest`, `OrderItemShelfLifeQueryTest` (của giai đoạn 1), `ProductServiceTest`, `FarmerServiceTest`.

**Frontend — tạo mới** (`frontend/src/…`): `api-requests/quality-report.requests.ts` (+ test), `lib/spoilage.ts` (+ test), `pages/customer/OrderDetail/SpoilageReport.tsx`, `pages/farmer/Reviews/QualityReports.tsx` (+ test), `pages/farmer/Reviews/index.test.tsx`, `pages/admin/Moderation/QualityReports.tsx` (+ test), `pages/admin/Moderation/index.test.tsx`, `pages/admin/FarmerDetail/index.test.tsx`, `pages/farmer/Overview/ShelfLifeStrikes.tsx` (+ test).

**Frontend — sửa:** `api-requests/order.requests.ts`, `types/notification.types.ts`, `types/farmer.types.ts`, `lib/reasons.ts` (+ test), `pages/customer/OrderDetail/index.tsx` (+ test), `pages/farmer/Reviews/index.tsx`, `pages/admin/Moderation/index.tsx`, `pages/admin/FarmerDetail/index.tsx`, `pages/farmer/ProductForm/ShelfLifeField.tsx`, `pages/farmer/ProductForm/index.tsx` (+ test), `pages/farmer/Overview/index.tsx`; locale `common`, `CustomerOrderDetail`, `FarmerReviews`, `AdminModeration`, `AdminFarmerDetail`, `FarmerProductForm`, `FarmerOverview` (10 ngôn ngữ mỗi file).

**Khác:** `db/seed.sql`, `docs/api-contract.md`, `docs/DEMO_CREDENTIALS.md`.

Thứ tự task: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 (backend), rồi 11 → 16 (frontend, cần backend của task tương ứng), rồi 17. Task 11 là nền cho mọi task frontend.

---

### Task 1: Bảng, entity và repository của báo hư và lỗi hạn dùng (FR-122)

**Files:**
- Create: `backend/src/main/resources/db/migration/V20260927006__create_quality_reports_and_violations.sql`
- Create: `backend/src/main/java/com/techx/intervue/modules/quality/enums/QualityProblem.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/quality/enums/QualityReportStatus.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/quality/entities/QualityReport.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/quality/entities/FarmerViolation.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/quality/repositories/QualityReportRepository.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/quality/repositories/FarmerViolationRepository.java`
- Create: `backend/src/test/java/com/techx/intervue/modules/quality/QualityFixture.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/quality/repositories/QualityReportRepositoryTest.java`

**Interfaces:**
- Consumes: bảng `orders`, `order_items` (cột `best_before`, `shelf_life_extended`, `extended_by_days`, `storage_mode` của giai đoạn 1), `products` (5 cột của giai đoạn 1), `shelf_life_guides`, `farmer_profiles`, `users`; `ReportFixture` (`modules/report/services/impl/ReportFixture.java`: `user`, `farmer`, `market`, `category`, `product`, `order`, `item`, field `tag`).
- Produces:
  - `enum QualityProblem { BRUISED, MOLD, SMELL, WILTED, OTHER }` và `enum QualityReportStatus { OPEN, CONFIRMED, DISMISSED }`, cả hai có `@JsonValue String value()` (chữ thường) và `DbConverter`.
  - `QualityReport` (JPA, `quality_reports`): `Long id, orderItemId, orderId, customerId, farmerId, productId; LocalDate spoiledOn; QualityProblem problem; String note, photoUrl; boolean beforePromise, shelfLifeExtended; int extendedByDays; QualityReportStatus status = OPEN; String farmerResponse; Instant farmerRespondedAt; Long decidedBy; Instant decidedAt; String decisionNote; Instant createdAt`; `boolean isOpen()`; `void decide(QualityReportStatus outcome, Long adminId, String note, Instant at)`.
  - `FarmerViolation` (JPA, `farmer_violations`): `Long id, farmerId, qualityReportId, productId; int extendedByDays; String note; Long createdBy; Instant createdAt`.
  - `QualityReportRepository extends JpaRepository<QualityReport, Long>`: `boolean existsByOrderItemId(Long orderItemId)`, `Optional<QualityReport> lockById(Long id)` (PESSIMISTIC_WRITE).
  - `FarmerViolationRepository extends JpaRepository<FarmerViolation, Long>`: `List<Instant> activeTimes(Long farmerId, Instant since)` (mới nhất trước).
  - `QualityFixture(JdbcTemplate)` với field `base` (`ReportFixture`) và `long line(orderId, productId, LocalDate bestBefore, boolean extended)`, `long report(itemId, String status, boolean beforePromise, int minutesAgo)`, `long strike(reportId, adminUserId, int daysAgo)`, `void shelfLife(productId, Long guideId, int days, int suggested)`, `long guide(categoryId, int suggestedDays)`.

- [ ] **Step 1: Kiểm số migration còn trống**

Run: `ls backend/src/main/resources/db/migration | tail -3`
Expected: dòng cuối là `V20260928005__order_item_shelf_life_snapshot.sql` (của giai đoạn 1). Nếu đã có `V20260927006` trở lên (ví dụ giai đoạn 3 vào trước), dùng số trống kế tiếp và giữ phần `__create_quality_reports_and_violations.sql`.

- [ ] **Step 2: Viết fixture dùng chung cho test MySQL**

`backend/src/test/java/com/techx/intervue/modules/quality/QualityFixture.java` (các task sau dùng tiếp):

```java
package com.techx.intervue.modules.quality;

import com.techx.intervue.modules.report.services.impl.ReportFixture;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;

/**
 * Rows for the spoilage tests on the real MySQL database, on top of {@link ReportFixture}: order
 * lines with a shelf-life promise, reports, strikes and a storage group. Meant for
 * {@code @Transactional} tests, which roll every row back.
 */
public final class QualityFixture {

    public final ReportFixture base;
    private final JdbcTemplate jdbc;

    public QualityFixture(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
        this.base = new ReportFixture(jdbc);
    }

    /**
     * One order line kept in the fridge and good until {@code bestBefore}: 5 days against a
     * suggestion of 3 when extended, else the suggested 3 days.
     */
    public long line(long orderId, long productId, LocalDate bestBefore, boolean extended) {
        base.item(orderId, productId, 1, 1);
        jdbc.update(
                "UPDATE order_items SET shelf_life_days = ?, storage_mode = 'chilled',"
                        + " best_before = ?, shelf_life_extended = ?, extended_by_days = ?"
                        + " WHERE order_id = ? AND product_id = ?",
                extended ? 5 : 3,
                bestBefore,
                extended,
                extended ? 2 : 0,
                orderId,
                productId);
        return jdbc.queryForObject(
                "SELECT id FROM order_items WHERE order_id = ? AND product_id = ?",
                Long.class,
                orderId,
                productId);
    }

    /**
     * A report on one line that copies the line's promise; {@code status} is open, confirmed or
     * dismissed (a decided one gets a decision time), made {@code minutesAgo}.
     */
    public long report(long itemId, String status, boolean beforePromise, int minutesAgo) {
        return insert(
                "INSERT INTO quality_reports (order_item_id, order_id, customer_id, farmer_id,"
                        + " product_id, spoiled_on, problem, before_promise, shelf_life_extended,"
                        + " extended_by_days, status, decided_at, created_at)"
                        + " SELECT oi.id, o.id, o.customer_id, o.farmer_id, oi.product_id,"
                        + " o.pickup_date, 'mold', ?, oi.shelf_life_extended, oi.extended_by_days,"
                        + " ?, IF(? = 'open', NULL, NOW()), NOW() - INTERVAL ? MINUTE"
                        + " FROM order_items oi JOIN orders o ON o.id = oi.order_id"
                        + " WHERE oi.id = ?",
                beforePromise,
                status,
                status,
                minutesAgo,
                itemId);
    }

    /** A strike recorded {@code daysAgo} for the stall and the product of {@code reportId}. */
    public long strike(long reportId, long adminUserId, int daysAgo) {
        return insert(
                "INSERT INTO farmer_violations (farmer_id, quality_report_id, product_id,"
                        + " extended_by_days, created_by, created_at)"
                        + " SELECT r.farmer_id, r.id, r.product_id, r.extended_by_days, ?,"
                        + " NOW() - INTERVAL ? DAY FROM quality_reports r WHERE r.id = ?",
                adminUserId,
                daysAgo,
                reportId);
    }

    /** The product as the stall saved it: {@code days} against a suggestion of {@code suggested}. */
    public void shelfLife(long productId, Long guideId, int days, int suggested) {
        jdbc.update(
                "UPDATE products SET shelf_life_guide_id = ?, storage_mode = 'chilled',"
                        + " shelf_life_days = ?, suggested_shelf_life_days = ?,"
                        + " shelf_life_extended = ?, shelf_life_ack_at = IF(?, NOW(), NULL)"
                        + " WHERE id = ?",
                guideId,
                days,
                suggested,
                days > suggested,
                days > suggested,
                productId);
    }

    /** "Leafy greens" kept in the fridge with {@code suggestedDays}, in one category. */
    public long guide(long categoryId, int suggestedDays) {
        return insert(
                "INSERT INTO shelf_life_guides (category_id, group_name, examples, storage_mode,"
                        + " suggested_days) VALUES (?, 'Leafy greens', 'rau muống', 'chilled', ?)",
                categoryId,
                suggestedDays);
    }

    private long insert(String sql, Object... args) {
        KeyHolder keys = new GeneratedKeyHolder();
        jdbc.update(
                con -> {
                    PreparedStatement ps =
                            con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
                    for (int i = 0; i < args.length; i++) {
                        ps.setObject(i + 1, args[i]);
                    }
                    return ps;
                },
                keys);
        return keys.getKey().longValue();
    }
}
```

- [ ] **Step 3: Viết test repository (sẽ fail)**

`backend/src/test/java/com/techx/intervue/modules/quality/repositories/QualityReportRepositoryTest.java`:

```java
package com.techx.intervue.modules.quality.repositories;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.techx.intervue.modules.quality.QualityFixture;
import com.techx.intervue.modules.quality.entities.QualityReport;
import com.techx.intervue.modules.quality.enums.QualityProblem;
import com.techx.intervue.modules.quality.enums.QualityReportStatus;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

/** FR-122, FR-123: the report and strike tables and their finders, against real MySQL. */
@SpringBootTest
@Transactional
class QualityReportRepositoryTest {

    private static final LocalDate PICKUP = LocalDate.of(2026, 10, 3);

    @Autowired private QualityReportRepository reports;
    @Autowired private FarmerViolationRepository violations;
    @Autowired private JdbcTemplate jdbc;

    private QualityFixture fx;
    private long customer;
    private long farmer;
    private long admin;
    private long category;
    private long order;

    @BeforeEach
    void setUp() {
        fx = new QualityFixture(jdbc);
        customer = fx.base.user("customer", "Buyer", "x");
        farmer = fx.base.farmer(fx.base.user("farmer", "Seller", "x"), "Stall", "approved");
        admin = fx.base.user("admin", "Admin", "x");
        category = fx.base.category();
        order = fx.base.order(customer, farmer, fx.base.market("Market"), "completed", 3, PICKUP);
    }

    /** Spec §4.4.1: each line is reported once — UNIQUE (order_item_id). */
    @Test
    void oneOrderLineIsReportedOnlyOnce() {
        long item = fx.line(order, product("Rau muống"), PICKUP.plusDays(4), true);
        reports.saveAndFlush(report(item));

        assertThat(reports.existsByOrderItemId(item)).isTrue();
        assertThatThrownBy(() -> reports.saveAndFlush(report(item)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void aLineNobodyReportedIsNotReported() {
        long item = fx.line(order, product("Cải ngọt"), PICKUP.plusDays(2), false);

        assertThat(reports.existsByOrderItemId(item)).isFalse();
    }

    /** Spec §4.4.4: a strike counts for 90 days; the newest comes first. */
    @Test
    void onlyStrikesOfTheLast90DaysCountNewestFirst() {
        fx.strike(fx.report(fx.line(order, product("A"), PICKUP, true), "confirmed", true, 3), admin, 91);
        fx.strike(fx.report(fx.line(order, product("B"), PICKUP, true), "confirmed", true, 2), admin, 10);
        fx.strike(fx.report(fx.line(order, product("C"), PICKUP, true), "confirmed", true, 1), admin, 1);

        List<Instant> active =
                violations.activeTimes(farmer, Instant.now().minus(Duration.ofDays(90)));

        assertThat(active).hasSize(2);
        assertThat(active.get(0)).isAfter(active.get(1));
    }

    /** V20260927006: a decided report always says when it was decided. */
    @Test
    void aDecidedReportWithoutADecisionTimeIsRefused() {
        long item = fx.line(order, product("D"), PICKUP.plusDays(4), true);

        assertThatThrownBy(
                        () ->
                                jdbc.update(
                                        "INSERT INTO quality_reports (order_item_id, order_id,"
                                                + " customer_id, farmer_id, product_id,"
                                                + " spoiled_on, problem, before_promise, status)"
                                                + " SELECT oi.id, oi.order_id, ?, ?,"
                                                + " oi.product_id, '2026-10-05', 'mold', TRUE,"
                                                + " 'confirmed' FROM order_items oi WHERE oi.id = ?",
                                        customer,
                                        farmer,
                                        item))
                .isInstanceOf(DataAccessException.class)
                .hasMessageContaining("ck_quality_reports_decision");
    }

    /** The lock the admin decision and the stall's reply both go through. */
    @Test
    void lockByIdReadsTheReport() {
        long item = fx.line(order, product("E"), PICKUP.plusDays(4), true);
        long id = reports.saveAndFlush(report(item)).getId();

        assertThat(reports.lockById(id))
                .map(QualityReport::getStatus)
                .contains(QualityReportStatus.OPEN);
    }

    private long product(String name) {
        return fx.base.product(farmer, category, name, 1);
    }

    private QualityReport report(long itemId) {
        QualityReport r = new QualityReport();
        r.setOrderItemId(itemId);
        r.setOrderId(order);
        r.setCustomerId(customer);
        r.setFarmerId(farmer);
        r.setProductId(
                jdbc.queryForObject(
                        "SELECT product_id FROM order_items WHERE id = ?", Long.class, itemId));
        r.setSpoiledOn(PICKUP.plusDays(2));
        r.setProblem(QualityProblem.MOLD);
        r.setBeforePromise(true);
        r.setShelfLifeExtended(true);
        r.setExtendedByDays(2);
        r.setCreatedAt(Instant.now());
        return r;
    }
}
```

- [ ] **Step 4: Chạy test để thấy fail**

Run: `docker compose exec -T -e MAVEN_OPTS=-Xmx256m backend ./mvnw -B test -Dtest='QualityReportRepositoryTest' -Dsurefire.failIfNoSpecifiedTests=false -DargLine="-Xmx768m -XX:MaxMetaspaceSize=256m -XX:+UseSerialGC"`
Expected: FAIL lúc biên dịch, `cannot find symbol` cho `QualityReport`, `QualityProblem`, `FarmerViolationRepository`.

- [ ] **Step 5: Viết migration**

`backend/src/main/resources/db/migration/V20260927006__create_quality_reports_and_violations.sql`:

```sql
-- FR-122, FR-123 (proposed, not yet in .ai/REQUIREMENTS.md): a customer's report of spoiled
-- produce on one line of a completed order, and the shelf-life strikes an admin records when a
-- report on an extended shelf life is confirmed (spec 2026-09-27-shelf-life-deals-design §4.4).
-- The "longer shelf lives locked" state is not stored: it is derived from the strikes of the last
-- 90 days, so it can never disagree with them.
CREATE TABLE quality_reports (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_item_id       BIGINT UNSIGNED NOT NULL,
    order_id            BIGINT UNSIGNED NOT NULL,
    customer_id         BIGINT UNSIGNED NOT NULL,
    farmer_id           BIGINT UNSIGNED NOT NULL,
    product_id          BIGINT UNSIGNED NOT NULL,
    spoiled_on          DATE NOT NULL,
    problem             ENUM('bruised', 'mold', 'smell', 'wilted', 'other') NOT NULL,
    note                VARCHAR(500) NULL,
    photo_url           VARCHAR(255) NULL,
    -- spoiled_on <= order_items.best_before, fixed when the report is created
    before_promise      BOOLEAN NOT NULL,
    -- Copied from the order line: a report is judged by the promise the customer was given
    shelf_life_extended BOOLEAN NOT NULL DEFAULT FALSE,
    extended_by_days    INT NOT NULL DEFAULT 0,
    status              ENUM('open', 'confirmed', 'dismissed') NOT NULL DEFAULT 'open',
    farmer_response     VARCHAR(500) NULL,
    farmer_responded_at TIMESTAMP NULL,
    decided_by          BIGINT UNSIGNED NULL,
    decided_at          TIMESTAMP NULL,
    decision_note       VARCHAR(255) NULL,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- One report per order line (spec §4.4.1)
    CONSTRAINT uq_quality_report_item UNIQUE (order_item_id),
    CONSTRAINT fk_quality_reports_item FOREIGN KEY (order_item_id) REFERENCES order_items (id) ON DELETE CASCADE,
    CONSTRAINT fk_quality_reports_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
    -- Accounts are never hard-deleted (FR-072 only deactivates), so RESTRICT stays the default
    CONSTRAINT fk_quality_reports_customer FOREIGN KEY (customer_id) REFERENCES users (id),
    CONSTRAINT fk_quality_reports_farmer FOREIGN KEY (farmer_id) REFERENCES farmer_profiles (id),
    CONSTRAINT fk_quality_reports_product FOREIGN KEY (product_id) REFERENCES products (id),
    CONSTRAINT fk_quality_reports_decider FOREIGN KEY (decided_by) REFERENCES users (id),
    CONSTRAINT ck_quality_reports_extension CHECK (extended_by_days >= 0),
    -- A decided report always says when it was decided; an open one never does
    CONSTRAINT ck_quality_reports_decision CHECK ((status = 'open') = (decided_at IS NULL)),
    INDEX idx_quality_reports_queue (status, shelf_life_extended, created_at),
    INDEX idx_quality_reports_farmer (farmer_id, created_at)
);

-- One strike per confirmed report (spec §4.4.4); it counts for 90 days from created_at.
CREATE TABLE farmer_violations (
    id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    farmer_id         BIGINT UNSIGNED NOT NULL,
    quality_report_id BIGINT UNSIGNED NOT NULL,
    product_id        BIGINT UNSIGNED NOT NULL,
    extended_by_days  INT NOT NULL,
    note              VARCHAR(255) NULL,
    created_by        BIGINT UNSIGNED NOT NULL,
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_farmer_violation_report UNIQUE (quality_report_id),
    CONSTRAINT fk_farmer_violations_farmer FOREIGN KEY (farmer_id) REFERENCES farmer_profiles (id),
    CONSTRAINT fk_farmer_violations_report FOREIGN KEY (quality_report_id) REFERENCES quality_reports (id) ON DELETE CASCADE,
    CONSTRAINT fk_farmer_violations_product FOREIGN KEY (product_id) REFERENCES products (id),
    CONSTRAINT fk_farmer_violations_admin FOREIGN KEY (created_by) REFERENCES users (id),
    INDEX idx_farmer_violations_window (farmer_id, created_at)
);
```

- [ ] **Step 6: Viết hai enum**

`backend/src/main/java/com/techx/intervue/modules/quality/enums/QualityProblem.java`:

```java
package com.techx.intervue.modules.quality.enums;

import com.fasterxml.jackson.annotation.JsonValue;
import com.techx.intervue.converters.LowercaseEnumConverter;
import jakarta.persistence.Converter;
import java.util.Locale;

/**
 * FR-122: what the customer saw. Matches ENUM('bruised','mold','smell','wilted','other') in
 * V20260927006; the JSON value is the same lowercase word.
 */
public enum QualityProblem {
    BRUISED,
    MOLD,
    SMELL,
    WILTED,
    OTHER;

    @JsonValue
    public String value() {
        return name().toLowerCase(Locale.ROOT);
    }

    @Converter(autoApply = true)
    public static class DbConverter extends LowercaseEnumConverter<QualityProblem> {
        public DbConverter() {
            super(QualityProblem.class);
        }
    }
}
```

`backend/src/main/java/com/techx/intervue/modules/quality/enums/QualityReportStatus.java`:

```java
package com.techx.intervue.modules.quality.enums;

import com.fasterxml.jackson.annotation.JsonValue;
import com.techx.intervue.converters.LowercaseEnumConverter;
import jakarta.persistence.Converter;
import java.util.Locale;

/**
 * FR-122, FR-123: open until an admin decides; confirmed or dismissed after. Matches
 * ENUM('open','confirmed','dismissed') in V20260927006.
 */
public enum QualityReportStatus {
    OPEN,
    CONFIRMED,
    DISMISSED;

    @JsonValue
    public String value() {
        return name().toLowerCase(Locale.ROOT);
    }

    @Converter(autoApply = true)
    public static class DbConverter extends LowercaseEnumConverter<QualityReportStatus> {
        public DbConverter() {
            super(QualityReportStatus.class);
        }
    }
}
```

- [ ] **Step 7: Viết hai entity**

`backend/src/main/java/com/techx/intervue/modules/quality/entities/QualityReport.java`:

```java
package com.techx.intervue.modules.quality.entities;

import com.techx.intervue.modules.quality.enums.QualityProblem;
import com.techx.intervue.modules.quality.enums.QualityReportStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * FR-122: a customer's report of spoiled produce on one line of a completed order (table {@code
 * quality_reports}, V20260927006). The promise is copied from the order line when the report is
 * made, so a later edit of the product never changes how the report is judged. Reports are never
 * deleted: they are the trail behind every shelf-life strike.
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "quality_reports")
public class QualityReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_item_id", nullable = false, updatable = false)
    private Long orderItemId;

    @Column(name = "order_id", nullable = false, updatable = false)
    private Long orderId;

    /** users.id of the buyer. */
    @Column(name = "customer_id", nullable = false, updatable = false)
    private Long customerId;

    /** farmer_profiles.id, not users.id. */
    @Column(name = "farmer_id", nullable = false, updatable = false)
    private Long farmerId;

    @Column(name = "product_id", nullable = false, updatable = false)
    private Long productId;

    @Column(name = "spoiled_on", nullable = false, updatable = false)
    private LocalDate spoiledOn;

    @Convert(converter = QualityProblem.DbConverter.class)
    @Column(nullable = false, updatable = false)
    private QualityProblem problem;

    @Column(length = 500, updatable = false)
    private String note;

    @Column(name = "photo_url", length = 255, updatable = false)
    private String photoUrl;

    /** Spoiled on or before the line's best_before. */
    @Column(name = "before_promise", nullable = false, updatable = false)
    private boolean beforePromise;

    @Column(name = "shelf_life_extended", nullable = false, updatable = false)
    private boolean shelfLifeExtended;

    @Column(name = "extended_by_days", nullable = false, updatable = false)
    private int extendedByDays;

    @Convert(converter = QualityReportStatus.DbConverter.class)
    @Column(nullable = false)
    private QualityReportStatus status = QualityReportStatus.OPEN;

    @Column(name = "farmer_response", length = 500)
    private String farmerResponse;

    @Column(name = "farmer_responded_at")
    private Instant farmerRespondedAt;

    @Column(name = "decided_by")
    private Long decidedBy;

    @Column(name = "decided_at")
    private Instant decidedAt;

    @Column(name = "decision_note", length = 255)
    private String decisionNote;

    /** Set from the application Clock so the response can echo it at once. */
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public boolean isOpen() {
        return status == QualityReportStatus.OPEN;
    }

    /** FR-123: the admin's decision. Callers check {@link #isOpen()} first. */
    public void decide(QualityReportStatus outcome, Long adminId, String note, Instant at) {
        this.status = outcome;
        this.decidedBy = adminId;
        this.decisionNote = note;
        this.decidedAt = at;
    }
}
```

`backend/src/main/java/com/techx/intervue/modules/quality/entities/FarmerViolation.java`:

```java
package com.techx.intervue.modules.quality.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * FR-123: one shelf-life strike, recorded when an admin confirms a report on an extended shelf
 * life that spoiled before its promise (table {@code farmer_violations}, V20260927006). It counts
 * for 90 days from {@code createdAt}; strikes are never edited or deleted (spec §12).
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "farmer_violations")
public class FarmerViolation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** farmer_profiles.id, not users.id. */
    @Column(name = "farmer_id", nullable = false, updatable = false)
    private Long farmerId;

    @Column(name = "quality_report_id", nullable = false, updatable = false)
    private Long qualityReportId;

    @Column(name = "product_id", nullable = false, updatable = false)
    private Long productId;

    @Column(name = "extended_by_days", nullable = false, updatable = false)
    private int extendedByDays;

    @Column(length = 255, updatable = false)
    private String note;

    /** users.id of the admin who confirmed the report. */
    @Column(name = "created_by", nullable = false, updatable = false)
    private Long createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
```

- [ ] **Step 8: Viết hai repository**

`backend/src/main/java/com/techx/intervue/modules/quality/repositories/QualityReportRepository.java`:

```java
package com.techx.intervue.modules.quality.repositories;

import com.techx.intervue.modules.quality.entities.QualityReport;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface QualityReportRepository extends JpaRepository<QualityReport, Long> {

    /** One report per order line (spec §4.4.1): asked first so a second try is a 409, not a 500. */
    boolean existsByOrderItemId(Long orderItemId);

    /**
     * Two admins deciding the same report, or a stall editing its reply while an admin decides:
     * the second waits for the first and then sees the report as it left it.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from QualityReport r where r.id = :id")
    Optional<QualityReport> lockById(@Param("id") Long id);
}
```

`backend/src/main/java/com/techx/intervue/modules/quality/repositories/FarmerViolationRepository.java`:

```java
package com.techx.intervue.modules.quality.repositories;

import com.techx.intervue.modules.quality.entities.FarmerViolation;
import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FarmerViolationRepository extends JpaRepository<FarmerViolation, Long> {

    /** FR-123: when the stall's strikes made after {@code since} were recorded, newest first. */
    @Query(
            "select v.createdAt from FarmerViolation v where v.farmerId = :farmerId"
                    + " and v.createdAt > :since order by v.createdAt desc, v.id desc")
    List<Instant> activeTimes(@Param("farmerId") Long farmerId, @Param("since") Instant since);
}
```

- [ ] **Step 9: Chạy lại test**

Run: lệnh test backend với `-Dtest='QualityReportRepositoryTest'`.
Expected: `Tests run: 5, Failures: 0, Errors: 0` và `BUILD SUCCESS`. Flyway áp dụng `V20260927006` khi context khởi động.

- [ ] **Step 10: Format và commit**

```bash
docker compose exec -T -e MAVEN_OPTS=-Xmx256m backend ./mvnw -B -q spotless:apply
git add backend/src/main/resources/db/migration/V20260927006__create_quality_reports_and_violations.sql \
  backend/src/main/java/com/techx/intervue/modules/quality \
  backend/src/test/java/com/techx/intervue/modules/quality
git commit -m "feat(FR-122): add the spoilage report and shelf-life strike tables"
```

---

### Task 2: `SpoilagePolicy` — quy tắc thuần của báo hư và lỗi hạn dùng (FR-122)

**Files:**
- Create: `backend/src/main/java/com/techx/intervue/modules/quality/services/impl/SpoilagePolicy.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/quality/services/impl/SpoilagePolicyTest.java`

**Interfaces:**
- Consumes: không có.
- Produces: `final class SpoilagePolicy` với hằng `REPORT_DAYS_AFTER_BEST_BEFORE = 2`, `STRIKE_WINDOW_DAYS = 90`, `STRIKES_TO_LOCK = 3` và các hàm static `LocalDate reportDeadline(LocalDate bestBefore)`, `boolean windowOpen(LocalDate bestBefore, LocalDate today)`, `boolean beforePromise(LocalDate spoiledOn, LocalDate bestBefore)`, `boolean escalates(boolean shelfLifeExtended, boolean beforePromise)`, `Instant strikeWindowStart(Instant now)`, `Instant lockedUntil(List<Instant> activeNewestFirst)`. Bảng số trong test này được lặp lại ở `frontend/src/lib/spoilage.test.ts` (Task 11), đúng yêu cầu spec §9 "dùng chung một bảng số".

- [ ] **Step 1: Viết test (sẽ fail)**

```java
package com.techx.intervue.modules.quality.services.impl;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/**
 * FR-122, FR-123 (spec §9): the rule table that the frontend twin (lib/spoilage.test.ts) repeats
 * with the same numbers.
 */
class SpoilagePolicyTest {

    /** Review Focus #5: the last day of the window still counts, the next one does not. */
    @ParameterizedTest(name = "good until {0}, today {1} -> open={2}")
    @CsvSource({
        "2026-10-05,2026-10-03,true",
        "2026-10-05,2026-10-05,true",
        "2026-10-05,2026-10-07,true",
        "2026-10-05,2026-10-08,false"
    })
    void aLineCanBeReportedUntilTwoDaysAfterItsGoodUntilDate(
            String bestBefore, String today, boolean open) {
        assertThat(SpoilagePolicy.windowOpen(LocalDate.parse(bestBefore), LocalDate.parse(today)))
                .isEqualTo(open);
    }

    @Test
    void theDeadlineIsTwoDaysAfterTheGoodUntilDate() {
        assertThat(SpoilagePolicy.reportDeadline(LocalDate.of(2026, 10, 5)))
                .isEqualTo(LocalDate.of(2026, 10, 7));
        assertThat(SpoilagePolicy.reportDeadline(LocalDate.of(2026, 12, 30)))
                .isEqualTo(LocalDate.of(2027, 1, 1));
    }

    @ParameterizedTest(name = "spoiled {0}, good until {1} -> before={2}")
    @CsvSource({
        "2026-10-03,2026-10-05,true",
        "2026-10-05,2026-10-05,true",
        "2026-10-06,2026-10-05,false"
    })
    void spoilingOnTheGoodUntilDayIsStillBeforeThePromise(
            String spoiledOn, String bestBefore, boolean before) {
        assertThat(
                        SpoilagePolicy.beforePromise(
                                LocalDate.parse(spoiledOn), LocalDate.parse(bestBefore)))
                .isEqualTo(before);
    }

    /** Spec §4.4.1: only an extended shelf life that failed early reaches the admins. */
    @ParameterizedTest(name = "extended={0}, before={1} -> admins told={2}")
    @CsvSource({"true,true,true", "true,false,false", "false,true,false", "false,false,false"})
    void onlyAnExtendedShelfLifeThatFailedEarlyReachesTheAdmins(
            boolean extended, boolean before, boolean escalates) {
        assertThat(SpoilagePolicy.escalates(extended, before)).isEqualTo(escalates);
    }

    @Test
    void theStrikeWindowReachesNinetyDaysBack() {
        assertThat(SpoilagePolicy.strikeWindowStart(Instant.parse("2026-10-27T00:00:00Z")))
                .isEqualTo(Instant.parse("2026-07-29T00:00:00Z"));
    }

    @Test
    void twoStrikesDoNotLock() {
        assertThat(
                        SpoilagePolicy.lockedUntil(
                                List.of(
                                        Instant.parse("2026-10-20T03:00:00Z"),
                                        Instant.parse("2026-10-10T03:00:00Z"))))
                .isNull();
    }

    /** Spec §4.4.4: the lock ends when the third newest strike turns 90 days old. */
    @Test
    void theThirdNewestStrikeDecidesWhenTheLockEnds() {
        assertThat(
                        SpoilagePolicy.lockedUntil(
                                List.of(
                                        Instant.parse("2026-10-20T03:00:00Z"),
                                        Instant.parse("2026-10-10T03:00:00Z"),
                                        Instant.parse("2026-09-01T03:00:00Z"))))
                .isEqualTo(Instant.parse("2026-11-30T03:00:00Z"));
        assertThat(
                        SpoilagePolicy.lockedUntil(
                                List.of(
                                        Instant.parse("2026-10-25T03:00:00Z"),
                                        Instant.parse("2026-10-20T03:00:00Z"),
                                        Instant.parse("2026-10-10T03:00:00Z"),
                                        Instant.parse("2026-09-01T03:00:00Z"))))
                .isEqualTo(Instant.parse("2027-01-08T03:00:00Z"));
    }
}
```

- [ ] **Step 2: Chạy test để thấy fail**

Run: lệnh test backend với `-Dtest='SpoilagePolicyTest'`.
Expected: FAIL lúc biên dịch, `cannot find symbol: variable SpoilagePolicy`.

- [ ] **Step 3: Viết `SpoilagePolicy`**

```java
package com.techx.intervue.modules.quality.services.impl;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * FR-122, FR-123 (spec §4.4): the rules of spoilage reports and shelf-life strikes, kept pure so
 * the backend and the frontend test the same table of numbers.
 */
public final class SpoilagePolicy {

    /** A customer may report until this many days after the line's last good day. */
    public static final int REPORT_DAYS_AFTER_BEST_BEFORE = 2;

    /** A strike counts for this many days after it was recorded. */
    public static final int STRIKE_WINDOW_DAYS = 90;

    /** This many strikes that still count lock longer shelf lives. */
    public static final int STRIKES_TO_LOCK = 3;

    private SpoilagePolicy() {}

    public static LocalDate reportDeadline(LocalDate bestBefore) {
        return bestBefore.plusDays(REPORT_DAYS_AFTER_BEST_BEFORE);
    }

    public static boolean windowOpen(LocalDate bestBefore, LocalDate today) {
        return !today.isAfter(reportDeadline(bestBefore));
    }

    /** Spoiled on the last good day is still inside the promise. */
    public static boolean beforePromise(LocalDate spoiledOn, LocalDate bestBefore) {
        return !spoiledOn.isAfter(bestBefore);
    }

    /** Spec §4.4.1: only an extended shelf life that failed before its own promise. */
    public static boolean escalates(boolean shelfLifeExtended, boolean beforePromise) {
        return shelfLifeExtended && beforePromise;
    }

    public static Instant strikeWindowStart(Instant now) {
        return now.minus(Duration.ofDays(STRIKE_WINDOW_DAYS));
    }

    /**
     * When the lock ends: the third newest strike plus 90 days, because from then on only two
     * strikes still count (spec §4.4.4). Null when fewer than three strikes count. The list holds
     * only strikes inside the window, newest first.
     */
    public static Instant lockedUntil(List<Instant> activeNewestFirst) {
        if (activeNewestFirst.size() < STRIKES_TO_LOCK) {
            return null;
        }
        return activeNewestFirst
                .get(STRIKES_TO_LOCK - 1)
                .plus(Duration.ofDays(STRIKE_WINDOW_DAYS));
    }
}
```

- [ ] **Step 4: Chạy lại test**

Run: lệnh test backend với `-Dtest='SpoilagePolicyTest'`.
Expected: `Tests run: 15, Failures: 0, Errors: 0`.

- [ ] **Step 5: Format và commit**

```bash
docker compose exec -T -e MAVEN_OPTS=-Xmx256m backend ./mvnw -B -q spotless:apply
git add backend/src/main/java/com/techx/intervue/modules/quality/services/impl/SpoilagePolicy.java \
  backend/src/test/java/com/techx/intervue/modules/quality/services/impl/SpoilagePolicyTest.java
git commit -m "feat(FR-122): spoilage window, escalation and strike lock rules"
```

---

### Task 3: Năm loại thông báo mới và nhóm Cài đặt `qualityReports` (FR-122)

**Files:**
- Modify: `backend/src/main/java/com/techx/intervue/modules/notification/enums/NotificationKind.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/notification/enums/NotificationCategory.java`
- Modify: `backend/src/main/resources/i18n/notifications.properties` và 9 file `notifications_<lang>.properties`
- Test: `backend/src/test/java/com/techx/intervue/modules/notification/enums/NotificationKindTest.java` (tạo mới)
- Test: `backend/src/test/java/com/techx/intervue/modules/notification/services/impl/NotificationTextRendererTest.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/notification/services/impl/NotificationPreferenceServiceTest.java`

**Interfaces:**
- Consumes: `NotificationTextRenderer` (key `notification.<kind>.title|message`, thay `{name}` bằng tham số), `NotificationPreferenceService.get` (nhóm theo vai, chưa có dòng = bật).
- Produces: `NotificationKind.QUALITY_REPORTED`, `QUALITY_ESCALATED`, `QUALITY_DECIDED`, `SHELF_LIFE_VIOLATION`, `SHELF_LIFE_LOCKED` (đều lưu vào `notifications`); `NotificationCategory.QUALITY_REPORTS` (code `qualityReports`, chỉ admin). Tham số mỗi kind dùng — các task sau phải gửi đúng tên này:
  - `quality_reported`: `product`, `order`
  - `quality_escalated`: `stall`, `product`, `days`, `order`
  - `quality_decided`: `product`, `order`
  - `shelf_life_violation`: `product`, `count`
  - `shelf_life_locked`: `until`

`notifications.kind` là `VARCHAR(40)` và `notification_preferences.category` là `VARCHAR(30)` (V20260925012, V20260925014), nên không cần migration; nhóm mới chưa có dòng nghĩa là bật (spec §4.6 "mặc định bật", giống `farmerApplications`).

- [ ] **Step 1: Viết test (sẽ fail)**

`backend/src/test/java/com/techx/intervue/modules/notification/enums/NotificationKindTest.java`:

```java
package com.techx.intervue.modules.notification.enums;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.user.enums.RoleType;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Spec §4.6: which Settings group each spoilage notification belongs to. */
class NotificationKindTest {

    @Test
    void theAdminsEscalationHasItsOwnGroupAndTheRestGoWithOrders() {
        assertThat(NotificationKind.QUALITY_ESCALATED.category())
                .isEqualTo(NotificationCategory.QUALITY_REPORTS);
        assertThat(
                        List.of(
                                NotificationKind.QUALITY_REPORTED,
                                NotificationKind.QUALITY_DECIDED,
                                NotificationKind.SHELF_LIFE_VIOLATION,
                                NotificationKind.SHELF_LIFE_LOCKED))
                .allMatch(k -> k.category() == NotificationCategory.ORDERS && k.persistent());
        assertThat(NotificationKind.QUALITY_ESCALATED.persistent()).isTrue();
    }

    @Test
    void theSpoilageGroupIsForAdminsOnly() {
        assertThat(NotificationCategory.QUALITY_REPORTS.code()).isEqualTo("qualityReports");
        assertThat(NotificationCategory.QUALITY_REPORTS.visibleTo(RoleType.ADMIN)).isTrue();
        assertThat(NotificationCategory.QUALITY_REPORTS.visibleTo(RoleType.CUSTOMER)).isFalse();
        assertThat(NotificationCategory.QUALITY_REPORTS.visibleTo(RoleType.FARMER)).isFalse();
    }

    /** notifications.kind is VARCHAR(40), notification_preferences.category VARCHAR(30). */
    @Test
    void everyCodeFitsItsColumn() {
        assertThat(NotificationKind.values()).allMatch(k -> k.code().length() <= 40);
        assertThat(NotificationCategory.values()).allMatch(c -> c.code().length() <= 30);
    }
}
```

Trong `NotificationTextRendererTest`, thêm import `java.util.Map` nếu chưa có, rồi thêm 2 test cuối class:

```java
    private static final List<NotificationKind> SPOILAGE =
            List.of(
                    NotificationKind.QUALITY_REPORTED,
                    NotificationKind.QUALITY_ESCALATED,
                    NotificationKind.QUALITY_DECIDED,
                    NotificationKind.SHELF_LIFE_VIOLATION,
                    NotificationKind.SHELF_LIFE_LOCKED);

    private static final Map<String, String> SPOILAGE_PARAMS =
            Map.of(
                    "product", "Rau muống",
                    "order", "ML-20260920-0007",
                    "stall", "Vườn Út Hiền",
                    "days", "2",
                    "count", "3",
                    "until", "30/11/2026");

    /** FR-122, FR-123: all 10 languages carry both texts of the five new kinds. */
    @Test
    void everyLanguageHasTheSpoilageTexts() {
        for (String lang : List.of("en", "vi", "zh", "ja", "ko", "fr", "es", "de", "th", "id")) {
            for (NotificationKind k : SPOILAGE) {
                RenderedText t = renderer.render(NotificationEvent.of(k, "/", SPOILAGE_PARAMS), lang);
                assertThat(t.title())
                        .as(lang + " " + k)
                        .doesNotStartWith("notification.")
                        .doesNotContain("{")
                        .isNotBlank();
                assertThat(t.message())
                        .as(lang + " " + k)
                        .doesNotStartWith("notification.")
                        .doesNotContain("{")
                        .isNotBlank();
            }
        }
    }

    /** Spec §4.4.1: the admins read the stall, the product and how much longer it was set. */
    @Test
    void theEscalationNamesTheStallTheProductAndTheExtraDays() {
        RenderedText t =
                renderer.render(
                        NotificationEvent.of(
                                NotificationKind.QUALITY_ESCALATED,
                                "/admin/moderation?tab=quality",
                                SPOILAGE_PARAMS),
                        "vi");

        assertThat(t.title()).isEqualTo("Báo hư hàng kéo dài hạn");
        assertThat(t.message()).isEqualTo("Vườn Út Hiền · Rau muống (+2 ngày), đơn ML-20260920-0007.");
    }
```

Trong `NotificationPreferenceServiceTest`, sửa test `getListsOnlyTheRolesGroupsWithDefaults`: thay dòng

```java
                .containsExactly(new CategoryPreference("farmerApplications", true, true));
```

bằng

```java
                .containsExactly(
                        new CategoryPreference("farmerApplications", true, true),
                        new CategoryPreference("qualityReports", true, true));
```

- [ ] **Step 2: Chạy test để thấy fail**

Run: lệnh test backend với `-Dtest='NotificationKindTest,NotificationTextRendererTest,NotificationPreferenceServiceTest'`.
Expected: FAIL lúc biên dịch, `cannot find symbol: variable QUALITY_ESCALATED`.

- [ ] **Step 3: Thêm kind và nhóm**

`NotificationKind.java`, ngay sau dòng `RESTOCK(NotificationCategory.FAVORITES, true),`:

```java
    /** FR-122: a customer reported spoiled produce (spec §4.6) — to the stall. */
    QUALITY_REPORTED(NotificationCategory.ORDERS, true),
    /** FR-122: spoiled before its date on a shelf life the stall extended — to every admin. */
    QUALITY_ESCALATED(NotificationCategory.QUALITY_REPORTS, true),
    /** FR-123: an admin confirmed or dismissed the report — to the customer and the stall. */
    QUALITY_DECIDED(NotificationCategory.ORDERS, true),
    /** FR-123: a confirmed report recorded a shelf-life strike on the stall. */
    SHELF_LIFE_VIOLATION(NotificationCategory.ORDERS, true),
    /** FR-123: the stall has 3 strikes in 90 days and cannot extend shelf lives for now. */
    SHELF_LIFE_LOCKED(NotificationCategory.ORDERS, true),
```

`NotificationCategory.java`: đổi dòng cuối của enum

```java
    FARMER_APPLICATIONS("farmerApplications", EnumSet.of(RoleType.ADMIN));
```

thành

```java
    FARMER_APPLICATIONS("farmerApplications", EnumSet.of(RoleType.ADMIN)),
    /** FR-122: spoiled produce on an extended shelf life (spec §4.6) — admins only, on by default. */
    QUALITY_REPORTS("qualityReports", EnumSet.of(RoleType.ADMIN));
```

- [ ] **Step 4: Thêm chữ của thông báo (10 file)**

Ở cả 10 file `backend/src/main/resources/i18n/notifications*.properties`: đổi dòng đầu `… Keep all 25 keys in all 10 files.` thành `… Keep all 35 keys in all 10 files.`, rồi thêm 10 dòng ngay trước dòng `notification.message.message=…`.

`notifications.properties` (en):

```properties
notification.quality_reported.title=A customer reported spoiled produce
notification.quality_reported.message={product} from order {order}. You can reply until an admin decides.
notification.quality_escalated.title=Spoiled produce on an extended shelf life
notification.quality_escalated.message={stall} · {product} (+{days} days), order {order}.
notification.quality_decided.title=A spoilage report was decided
notification.quality_decided.message=An admin decided on the report about {product} in order {order}. Open it to see the decision.
notification.shelf_life_violation.title=A shelf-life strike on your stall
notification.shelf_life_violation.message=An admin confirmed the spoilage report on {product}, and its shelf life is back to the suggestion. Strikes in the last 90 days: {count} (3 lock longer shelf lives).
notification.shelf_life_locked.title=Longer shelf lives are locked for now
notification.shelf_life_locked.message=Your stall reached 3 shelf-life strikes in 90 days. Until {until} you can only use the suggested shelf life.
```

`notifications_vi.properties`:

```properties
notification.quality_reported.title=Khách báo hàng bị hư
notification.quality_reported.message={product} trong đơn {order}. Bạn có thể phản hồi cho tới khi admin quyết định.
notification.quality_escalated.title=Báo hư hàng kéo dài hạn
notification.quality_escalated.message={stall} · {product} (+{days} ngày), đơn {order}.
notification.quality_decided.title=Báo cáo hàng hư đã được xử lý
notification.quality_decided.message=Admin đã xử lý báo cáo về {product} trong đơn {order}. Mở ra để xem quyết định.
notification.shelf_life_violation.title=Sạp bị ghi một lỗi hạn dùng
notification.shelf_life_violation.message=Admin đã xác nhận báo hư của {product}, hạn dùng của món này đã về mốc gợi ý. Lỗi hạn dùng trong 90 ngày: {count} (đủ 3 lỗi thì bị khoá kéo dài).
notification.shelf_life_locked.title=Sạp tạm bị khoá kéo dài hạn dùng
notification.shelf_life_locked.message=Sạp có 3 lỗi hạn dùng trong 90 ngày. Tới {until}, sạp chỉ dùng được hạn gợi ý.
```

8 file còn lại (`zh ja ko fr es de th id`): dịch từ bản `en`, giữ nguyên `{product}`, `{order}`, `{stall}`, `{days}`, `{count}`, `{until}`. Không dùng dấu `'` đơn lẻ trong câu (các câu này không đi qua `MessageFormat`, nhưng giữ cho đồng nhất với các dòng có sẵn).

- [ ] **Step 5: Chạy lại test**

Run: lệnh test backend với `-Dtest='NotificationKindTest,NotificationTextRendererTest,NotificationPreferenceServiceTest,NotificationControllerTest'`.
Expected: toàn bộ PASS. `NotificationControllerTest.preferencesStartWithDefaultsAndRoundTrip` vẫn xanh vì nó đăng nhập bằng customer.

- [ ] **Step 6: Format và commit**

```bash
docker compose exec -T -e MAVEN_OPTS=-Xmx256m backend ./mvnw -B -q spotless:apply
git add backend/src/main/java/com/techx/intervue/modules/notification/enums \
  backend/src/main/resources/i18n \
  backend/src/test/java/com/techx/intervue/modules/notification
git commit -m "feat(FR-122): spoilage and shelf-life notification kinds and the admins' settings group"
```

---

### Task 4: Ảnh minh chứng — `POST /api/v1/quality-reports/photos` (FR-122)

**Files:**
- Create: `backend/src/main/java/com/techx/intervue/modules/quality/services/impl/QualityReportPhotoService.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/quality/controllers/QualityReportPhotoController.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/quality/controllers/QualityExceptionHandler.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/quality/services/impl/QualityReportPhotoServiceTest.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/quality/controllers/QualityExceptionHandlerTest.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/quality/controllers/QualityExceptionHandlerScopeTest.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/quality/controllers/QualityControllerAccessTest.java`

**Interfaces:**
- Consumes: `FileStorageServiceInterface` (bean `@Primary` `LocalFileStorageService`, thư mục được phục vụ ở `/uploads/**`), `ImageProbe.probe(byte[])` / `ImageProbe.normalize(byte[], String)` (`modules/conversation/services/impl/ImageProbe.java`, public), `UnsupportedImageTypeException`, `UploadedImageResource(String url)` (`modules/catalog/resources`), `InvalidFieldException`.
- Produces: `QualityReportPhotoService.store(long userId, MultipartFile file)` → `String url` (`/uploads/quality-report-photos/<userId>-<uuid>.jpg|webp`); `boolean isOwnedBy(String url, long userId)`; hằng `FOLDER = "quality-report-photos"`, `MAX_BYTES = 5 MB`. Controller `POST /api/v1/quality-reports/photos` (multipart `file`, vai `CUSTOMER`/`FARMER`) → 201 `{ url }`. `QualityExceptionHandler` với các hàm `invalidBody`, `unreadable`, `invalidField`, `unsupportedImage`, `forbidden` (package-private, test gọi trực tiếp như `OrderExceptionHandlerTest`).

- [ ] **Step 1: Viết test (sẽ fail)**

`QualityReportPhotoServiceTest.java`:

```java
package com.techx.intervue.modules.quality.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.startsWith;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.conversation.exceptions.UnsupportedImageTypeException;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import com.techx.intervue.services.interfaces.FileStorageServiceInterface;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.Optional;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockMultipartFile;

/** FR-122 (spec §4.4.1, §8): the photo of a spoilage report. */
class QualityReportPhotoServiceTest {

    private static final String NAME = "7-3f2a1b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b.jpg";

    private FileStorageServiceInterface storage;
    private QualityReportPhotoService service;

    @BeforeEach
    void setUp() {
        storage = mock(FileStorageServiceInterface.class);
        service = new QualityReportPhotoService(storage, "/uploads");
    }

    private static byte[] png(int width, int height) throws IOException {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, "png", out);
        return out.toByteArray();
    }

    /** Review Focus #4: re-encoded as a JPEG, so nothing but the pixels (no EXIF, no GPS) is kept. */
    @Test
    void aPngIsStoredAsAJpegUnderTheUploadersName() throws IOException {
        String url =
                service.store(7L, new MockMultipartFile("file", "rau.png", "image/png", png(20, 10)));

        assertThat(url).startsWith("/uploads/quality-report-photos/7-").endsWith(".jpg");
        ArgumentCaptor<byte[]> bytes = ArgumentCaptor.forClass(byte[].class);
        verify(storage).store(eq("quality-report-photos"), startsWith("7-"), bytes.capture());
        assertThat(bytes.getValue()[0] & 0xFF).isEqualTo(0xFF);
        assertThat(bytes.getValue()[1] & 0xFF).isEqualTo(0xD8);
    }

    @Test
    void aFileThatIsNotAPhotoIsRefusedAndNeverStored() {
        byte[] html = "<html><script>alert(1)</script></html>".getBytes(StandardCharsets.US_ASCII);

        assertThatThrownBy(
                        () ->
                                service.store(
                                        7L,
                                        new MockMultipartFile("file", "x.png", "image/png", html)))
                .isInstanceOf(UnsupportedImageTypeException.class);
        verify(storage, never()).store(any(), any(), any());
    }

    @Test
    void aPhotoOver5MbIsRefused() {
        byte[] big = new byte[(int) QualityReportPhotoService.MAX_BYTES + 1];

        assertThatThrownBy(
                        () ->
                                service.store(
                                        7L,
                                        new MockMultipartFile("file", "big.jpg", "image/jpeg", big)))
                .isInstanceOf(InvalidFieldException.class)
                .hasMessage("The photo must be 5 MB or smaller.");
        verify(storage, never()).store(any(), any(), any());
    }

    @Test
    void anEmptyFileIsRefused() {
        assertThatThrownBy(
                        () ->
                                service.store(
                                        7L,
                                        new MockMultipartFile(
                                                "file", "x.png", "image/png", new byte[0])))
                .isInstanceOf(InvalidFieldException.class);
    }

    @Test
    void theUploadersOwnPhotoIsTheirs() {
        when(storage.find("quality-report-photos", NAME)).thenReturn(Optional.of(Path.of("/x")));

        assertThat(service.isOwnedBy("/uploads/quality-report-photos/" + NAME, 7L)).isTrue();
    }

    /** Review Focus #4: another customer's photo, another site, a path trick, nothing. */
    @Test
    void aPhotoOfSomeoneElseIsNotTheirs() {
        when(storage.find(any(), any())).thenReturn(Optional.of(Path.of("/x")));

        assertThat(service.isOwnedBy("/uploads/quality-report-photos/" + NAME, 8L)).isFalse();
        assertThat(service.isOwnedBy("https://example.com/" + NAME, 7L)).isFalse();
        assertThat(service.isOwnedBy("/uploads/quality-report-photos/../avatars/" + NAME, 7L))
                .isFalse();
        assertThat(service.isOwnedBy(null, 7L)).isFalse();
    }

    @Test
    void aPhotoNoLongerOnDiskIsNotAccepted() {
        when(storage.find(any(), any())).thenReturn(Optional.empty());

        assertThat(service.isOwnedBy("/uploads/quality-report-photos/" + NAME, 7L)).isFalse();
    }
}
```

`QualityExceptionHandlerTest.java`:

```java
package com.techx.intervue.modules.quality.controllers;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.conversation.exceptions.UnsupportedImageTypeException;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import com.techx.intervue.resources.ApiResource;
import java.sql.SQLException;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;

/** The spoilage module's error codes (spec §4.4, §8): 400 input, 403 owner, 404, 409 state. */
class QualityExceptionHandlerTest {

    private final QualityExceptionHandler handler = new QualityExceptionHandler();

    private static void assertError(ResponseEntity<ApiResource<Void>> r, int status, String code) {
        assertThat(r.getStatusCode().value()).isEqualTo(status);
        assertThat(r.getBody()).isNotNull();
        assertThat(r.getBody().getError().getCode()).isEqualTo(code);
    }

    private static DataIntegrityViolationException violation(String message) {
        return new DataIntegrityViolationException("x", new SQLException(message));
    }

    /** Spec §8: a photo of another type is a 400 on the file field, like the other uploads. */
    @Test
    void aPhotoOfAnotherTypeIs400OnTheFileField() {
        ResponseEntity<ApiResource<Void>> r =
                handler.unsupportedImage(new UnsupportedImageTypeException());

        assertError(r, 400, "VALIDATION_ERROR");
        assertThat(r.getBody().getError().getDetails()).extracting("field").containsExactly("file");
    }

    @Test
    void aFieldErrorKeepsItsFieldAndMessage() {
        ResponseEntity<ApiResource<Void>> r =
                handler.invalidField(
                        new InvalidFieldException("file", "The photo must be 5 MB or smaller."));

        assertError(r, 400, "VALIDATION_ERROR");
        assertThat(r.getBody().getError().getDetails())
                .extracting("message")
                .containsExactly("The photo must be 5 MB or smaller.");
    }

    @Test
    void theWrongRoleIs403() {
        assertError(handler.forbidden(new AccessDeniedException("x")), 403, "FORBIDDEN");
    }
}
```

(`violation(...)` và các import `SQLException`, `DataIntegrityViolationException` được Task 5 dùng; giữ sẵn.)

`QualityExceptionHandlerScopeTest.java`:

```java
package com.techx.intervue.modules.quality.controllers;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Arrays;
import org.junit.jupiter.api.Test;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Same trap as ConversationExceptionHandlerScopeTest: a controller missing from assignableTypes
 * turns every 400/403/409 of the module into a 500.
 */
class QualityExceptionHandlerScopeTest {

    @Test
    void everyControllerOfTheModuleIsCovered() {
        RestControllerAdvice advice =
                QualityExceptionHandler.class.getAnnotation(RestControllerAdvice.class);

        assertThat(Arrays.asList(advice.assignableTypes()))
                .containsExactlyInAnyOrder(QualityReportPhotoController.class);
    }
}
```

`QualityControllerAccessTest.java`:

```java
package com.techx.intervue.modules.quality.controllers;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;

/**
 * Pins the role rules of the module's controllers (the repo has no MockMvc, like
 * FarmerControllerAccessTest): a forgotten @PreAuthorize would open an admin endpoint to anyone.
 */
class QualityControllerAccessTest {

    private static String rule(Class<?> controller) {
        PreAuthorize annotation = controller.getAnnotation(PreAuthorize.class);
        return annotation == null ? null : annotation.value();
    }

    /** D-13: the buyer is a customer or a Farmer shopping at another stall, never an admin. */
    @Test
    void onlyBuyersUploadReportPhotos() {
        assertThat(rule(QualityReportPhotoController.class))
                .isEqualTo("hasAnyRole('CUSTOMER','FARMER')");
    }
}
```

- [ ] **Step 2: Chạy test để thấy fail**

Run: lệnh test backend với `-Dtest='QualityReportPhotoServiceTest,QualityExceptionHandlerTest,QualityExceptionHandlerScopeTest,QualityControllerAccessTest'`.
Expected: FAIL lúc biên dịch, `cannot find symbol: class QualityReportPhotoService`.

- [ ] **Step 3: Viết service**

```java
package com.techx.intervue.modules.quality.services.impl;

import com.techx.intervue.modules.conversation.services.impl.ImageProbe;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import com.techx.intervue.services.interfaces.FileStorageServiceInterface;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/**
 * FR-122: the photo a customer attaches to a spoilage report (spec §4.4.1: JPG, PNG or WebP, at
 * most 5 MB). Stored like product photos under /uploads with a name nobody can guess, prefixed by
 * the uploader's id so a report only accepts the reporter's own photo. JPEG and PNG go through
 * {@link ImageProbe#normalize}, which re-encodes them and drops EXIF: a phone photo can carry the
 * customer's GPS position, and this folder is public.
 */
@Service
public class QualityReportPhotoService {

    static final String FOLDER = "quality-report-photos";
    static final long MAX_BYTES = 5L * 1024 * 1024;

    private static final Pattern NAME =
            Pattern.compile(
                    "(\\d+)-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
                            + "\\.(jpg|webp)");

    private final FileStorageServiceInterface storage;
    private final String baseUrl;

    public QualityReportPhotoService(
            FileStorageServiceInterface storage,
            @Value("${app.uploads.base-url:/uploads}") String baseUrl) {
        this.storage = storage;
        this.baseUrl = baseUrl;
    }

    /** Checks the real type from the bytes and returns the URL to send with the report. */
    public String store(long userId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidFieldException("file", "Choose a photo to upload.");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new InvalidFieldException("file", "The photo must be 5 MB or smaller.");
        }
        byte[] bytes = readAll(file);
        ImageProbe.Probed probed = ImageProbe.probe(bytes);
        byte[] stored = ImageProbe.normalize(bytes, probed.mime());
        // WebP is kept as it is (the JDK cannot encode it); JPEG and PNG became a JPEG
        String extension = "image/webp".equals(probed.mime()) ? ".webp" : ".jpg";
        String fileName = userId + "-" + UUID.randomUUID() + extension;
        storage.store(FOLDER, fileName, stored);
        return prefix() + fileName;
    }

    /**
     * A URL this service gave to this same account whose file is still on disk. Anything else —
     * another customer's photo, an address on another site — is not accepted in a report.
     */
    public boolean isOwnedBy(String url, long userId) {
        String prefix = prefix();
        if (url == null || !url.startsWith(prefix)) {
            return false;
        }
        String name = url.substring(prefix.length());
        Matcher matcher = NAME.matcher(name);
        return matcher.matches()
                && matcher.group(1).equals(Long.toString(userId))
                && storage.find(FOLDER, name).isPresent();
    }

    private String prefix() {
        return baseUrl + "/" + FOLDER + "/";
    }

    private static byte[] readAll(MultipartFile file) {
        try {
            return file.getBytes();
        } catch (IOException e) {
            throw new UncheckedIOException("Could not read the uploaded file.", e);
        }
    }
}
```

- [ ] **Step 4: Viết controller và exception handler**

`QualityReportPhotoController.java`:

```java
package com.techx.intervue.modules.quality.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.catalog.resources.UploadedImageResource;
import com.techx.intervue.modules.quality.services.impl.QualityReportPhotoService;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import com.techx.intervue.resources.ApiResource;
import lombok.AllArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * FR-122 — {@code POST /quality-reports/photos}: upload the photo before sending the report, which
 * carries the returned URL in {@code photoUrl} (spec §6).
 */
@RestController
@RequestMapping("/api/v1/quality-reports/photos")
@PreAuthorize("hasAnyRole('CUSTOMER','FARMER')")
@AllArgsConstructor
public class QualityReportPhotoController extends BaseController {

    private final QualityReportPhotoService photos;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResource<UploadedImageResource>> upload(
            @RequestPart("file") MultipartFile file,
            @AuthenticationPrincipal CustomUserDetails user) {
        return created(
                new UploadedImageResource(photos.store(user.getId(), file)), "Photo uploaded.");
    }
}
```

`QualityExceptionHandler.java` (các task sau thêm handler và controller vào đây):

```java
package com.techx.intervue.modules.quality.controllers;

import com.techx.intervue.modules.conversation.exceptions.UnsupportedImageTypeException;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import com.techx.intervue.resources.ApiResource;
import com.techx.intervue.resources.ErrorResource;
import com.techx.intervue.resources.FieldErrorResource;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/**
 * 400/403/404/409 for the spoilage module (FR-122, FR-123), same envelope as the review and
 * product handlers. Every controller of the module must be listed here, or its errors reach
 * Tomcat as a 500 (QualityExceptionHandlerScopeTest).
 */
@RestControllerAdvice(assignableTypes = {QualityReportPhotoController.class})
public class QualityExceptionHandler {

    private static final String INVALID_MESSAGE = "Some of the information you sent is not valid.";

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiResource<Void>> invalidBody(MethodArgumentNotValidException e) {
        List<FieldErrorResource> details =
                e.getBindingResult().getFieldErrors().stream()
                        .map(f -> field(f.getField(), f.getDefaultMessage()))
                        .toList();
        return error(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", INVALID_MESSAGE, details);
    }

    /** No body, malformed JSON, an unknown problem value or a query value of the wrong type. */
    @ExceptionHandler({
        HttpMessageNotReadableException.class,
        MethodArgumentTypeMismatchException.class
    })
    ResponseEntity<ApiResource<Void>> unreadable(Exception e) {
        return error(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", INVALID_MESSAGE, List.of());
    }

    @ExceptionHandler(InvalidFieldException.class)
    ResponseEntity<ApiResource<Void>> invalidField(InvalidFieldException e) {
        return error(
                HttpStatus.BAD_REQUEST,
                "VALIDATION_ERROR",
                INVALID_MESSAGE,
                List.of(field(e.getField(), e.getMessage())));
    }

    /** Spec §8: a photo of another type is a 400 here, like every other upload of the app. */
    @ExceptionHandler(UnsupportedImageTypeException.class)
    ResponseEntity<ApiResource<Void>> unsupportedImage(UnsupportedImageTypeException e) {
        return error(
                HttpStatus.BAD_REQUEST,
                "VALIDATION_ERROR",
                INVALID_MESSAGE,
                List.of(field("file", e.getMessage())));
    }

    /** {@code @PreAuthorize} wrong role, or an account without a stall → 403. */
    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<ApiResource<Void>> forbidden(AccessDeniedException e) {
        return error(
                HttpStatus.FORBIDDEN,
                "FORBIDDEN",
                "You do not have permission to do this.",
                List.of());
    }

    private static FieldErrorResource field(String name, String message) {
        return FieldErrorResource.builder().field(name).message(message).build();
    }

    private static ResponseEntity<ApiResource<Void>> error(
            HttpStatus status, String code, String message, List<FieldErrorResource> details) {
        ErrorResource error = ErrorResource.builder().code(code).details(details).build();
        return ResponseEntity.status(status).body(ApiResource.error(error, message));
    }
}
```

- [ ] **Step 5: Chạy lại test**

Run: lệnh test backend với `-Dtest='QualityReportPhotoServiceTest,QualityExceptionHandlerTest,QualityExceptionHandlerScopeTest,QualityControllerAccessTest'`.
Expected: `Tests run: 12, Failures: 0, Errors: 0`.

- [ ] **Step 6: Format và commit**

```bash
docker compose exec -T -e MAVEN_OPTS=-Xmx256m backend ./mvnw -B -q spotless:apply
git add backend/src/main/java/com/techx/intervue/modules/quality \
  backend/src/test/java/com/techx/intervue/modules/quality
git commit -m "feat(FR-122): upload the photo of a spoilage report without its metadata"
```

---

### Task 5: Khách gửi báo hư — `POST /api/v1/orders/{id}/items/{itemId}/quality-report` (FR-122)

**Files:**
- Create: `backend/src/main/java/com/techx/intervue/modules/order/resources/ItemQualityReportResource.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/quality/requests/CreateQualityReportRequest.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/quality/exceptions/ReportNeedsCompletedOrderException.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/quality/exceptions/ReportWindowClosedException.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/quality/exceptions/ItemAlreadyReportedException.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/quality/exceptions/ReportedItemNotFoundException.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/quality/services/impl/QualityLinks.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/quality/services/interfaces/CustomerQualityReportServiceInterface.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/quality/services/impl/CustomerQualityReportService.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/quality/controllers/QualityReportController.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/quality/controllers/QualityExceptionHandler.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/quality/services/impl/CustomerQualityReportServiceTest.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/quality/services/impl/CustomerQualityReportWindowTest.java`
- Test: `QualityExceptionHandlerTest`, `QualityExceptionHandlerScopeTest`, `QualityControllerAccessTest` (sửa)

**Interfaces:**
- Consumes: Task 1 (`QualityReport`, `QualityReportRepository`, `QualityProblem`, `QualityFixture`), Task 2 (`SpoilagePolicy`), Task 3 (`QUALITY_REPORTED`, `QUALITY_ESCALATED` và tên tham số), Task 4 (`QualityReportPhotoService.isOwnedBy`, `QualityExceptionHandler`); `OrderRepository`, `OrderItemRepository`, `OrderNotFoundException(long)`, `OrderNotYoursException()`, `FarmerProfileRepository`, `NotificationServiceInterface.dispatch(Collection<Long>, NotificationEvent)` / `notifyAdmins(NotificationEvent)`, `NotificationEvent.of(kind, link, params)`; field giai đoạn 1 của `OrderItem`: `getBestBefore()`, `isShelfLifeExtended()`, `getExtendedByDays()`.
- Produces:
  - `record ItemQualityReportResource(Long id, String status, String spoiledOn, String problem)` trong `order.resources` (Task 6 đặt nó vào từng món của đơn).
  - `record CreateQualityReportRequest(LocalDate spoiledOn, QualityProblem problem, String note, String photoUrl)`.
  - `CustomerQualityReportServiceInterface.report(long userId, long orderId, long itemId, CreateQualityReportRequest request)` → `ItemQualityReportResource`.
  - `QualityLinks.FARMER_REPORTS = "/farmer/reviews?tab=spoiled"`, `ADMIN_QUEUE = "/admin/moderation?tab=quality"`, `FARMER_HOME = "/farmer"`, `order(long orderId)` → `/orders/{id}`, `farmerProduct(long productId)` → `/farmer/products/{id}/edit` (package-private, Task 8 dùng tiếp).
  - Exception: `ReportNeedsCompletedOrderException()` → 409 `ORDER_NOT_COMPLETED`; `ReportWindowClosedException.noPromise()` / `.closed(LocalDate deadline)` → 409 `REPORT_WINDOW_CLOSED`; `ItemAlreadyReportedException()` → 409 `ALREADY_REPORTED`; `ReportedItemNotFoundException()` → 404 `NOT_FOUND`.
  - REST: `POST /api/v1/orders/{orderId}/items/{itemId}/quality-report` (vai `CUSTOMER`/`FARMER`) → 201 `ItemQualityReportResource`.

- [ ] **Step 1: Viết test service (sẽ fail)**

`CustomerQualityReportServiceTest.java`:

```java
package com.techx.intervue.modules.quality.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.notification.enums.NotificationKind;
import com.techx.intervue.modules.notification.services.interfaces.NotificationServiceInterface;
import com.techx.intervue.modules.order.entities.Order;
import com.techx.intervue.modules.order.entities.OrderItem;
import com.techx.intervue.modules.order.enums.OrderStatus;
import com.techx.intervue.modules.order.exceptions.OrderNotYoursException;
import com.techx.intervue.modules.order.repositories.OrderItemRepository;
import com.techx.intervue.modules.order.repositories.OrderRepository;
import com.techx.intervue.modules.order.resources.ItemQualityReportResource;
import com.techx.intervue.modules.quality.entities.QualityReport;
import com.techx.intervue.modules.quality.enums.QualityProblem;
import com.techx.intervue.modules.quality.enums.QualityReportStatus;
import com.techx.intervue.modules.quality.exceptions.ItemAlreadyReportedException;
import com.techx.intervue.modules.quality.exceptions.ReportNeedsCompletedOrderException;
import com.techx.intervue.modules.quality.exceptions.ReportWindowClosedException;
import com.techx.intervue.modules.quality.exceptions.ReportedItemNotFoundException;
import com.techx.intervue.modules.quality.repositories.QualityReportRepository;
import com.techx.intervue.modules.quality.requests.CreateQualityReportRequest;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

/** FR-122 (spec §4.4.1, §8): a customer reports a spoiled line of a completed order. */
class CustomerQualityReportServiceTest {

    private static final long CUSTOMER = 1L;
    private static final long STALL_OWNER = 30L;
    private static final long FARMER_ID = 10L;
    private static final long ORDER_ID = 21L;
    private static final long ITEM_ID = 501L;

    /** 10:00 on Tuesday 06/10/2026 in Ho Chi Minh City. */
    private static final Clock CLOCK =
            Clock.fixed(Instant.parse("2026-10-06T03:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));

    private OrderRepository orders;
    private OrderItemRepository orderItems;
    private QualityReportRepository reports;
    private FarmerProfileRepository farmers;
    private QualityReportPhotoService photos;
    private NotificationServiceInterface notifications;
    private CustomerQualityReportService service;
    private Order order;
    private OrderItem line;

    @BeforeEach
    void setUp() {
        orders = mock(OrderRepository.class);
        orderItems = mock(OrderItemRepository.class);
        reports = mock(QualityReportRepository.class);
        farmers = mock(FarmerProfileRepository.class);
        photos = mock(QualityReportPhotoService.class);
        notifications = mock(NotificationServiceInterface.class);
        service =
                new CustomerQualityReportService(
                        orders, orderItems, reports, farmers, photos, notifications, CLOCK);

        // Picked up Saturday 03/10, 5 days in the fridge against a suggestion of 3: good until
        // the end of Wednesday 07/10
        order = new Order();
        order.setId(ORDER_ID);
        order.setOrderCode("ML-20260920-0007");
        order.setCustomerId(CUSTOMER);
        order.setFarmerId(FARMER_ID);
        order.setStatus(OrderStatus.COMPLETED);
        order.setPickupDate(LocalDate.of(2026, 10, 3));
        line = new OrderItem();
        line.setId(ITEM_ID);
        line.setOrderId(ORDER_ID);
        line.setProductId(3L);
        line.setProductName("Rau muống");
        line.setBestBefore(LocalDate.of(2026, 10, 7));
        line.setShelfLifeExtended(true);
        line.setExtendedByDays(2);

        when(orders.findById(ORDER_ID)).thenReturn(Optional.of(order));
        when(orderItems.findById(ITEM_ID)).thenReturn(Optional.of(line));
        when(farmers.findById(FARMER_ID))
                .thenReturn(
                        Optional.of(
                                FarmerProfile.builder()
                                        .id(FARMER_ID)
                                        .userId(STALL_OWNER)
                                        .stallName("Vườn Út Hiền")
                                        .contactPerson("Hiền")
                                        .approvalStatus(ApprovalStatus.APPROVED)
                                        .build()));
        when(reports.save(any(QualityReport.class)))
                .thenAnswer(
                        i -> {
                            QualityReport r = i.getArgument(0);
                            r.setId(77L);
                            return r;
                        });
        when(photos.isOwnedBy(any(), anyLong())).thenReturn(true);
    }

    private static CreateQualityReportRequest spoiledOn(LocalDate day) {
        return new CreateQualityReportRequest(day, QualityProblem.MOLD, "  Lá úng đen  ", null);
    }

    private QualityReport saved() {
        ArgumentCaptor<QualityReport> captor = ArgumentCaptor.forClass(QualityReport.class);
        verify(reports).save(captor.capture());
        return captor.getValue();
    }

    @Test
    void aCustomerReportsASpoiledLineAndTheStallIsTold() {
        ItemQualityReportResource result =
                service.report(CUSTOMER, ORDER_ID, ITEM_ID, spoiledOn(LocalDate.of(2026, 10, 5)));

        QualityReport r = saved();
        assertThat(r.getOrderItemId()).isEqualTo(ITEM_ID);
        assertThat(r.getOrderId()).isEqualTo(ORDER_ID);
        assertThat(r.getCustomerId()).isEqualTo(CUSTOMER);
        assertThat(r.getFarmerId()).isEqualTo(FARMER_ID);
        assertThat(r.getProductId()).isEqualTo(3L);
        assertThat(r.getNote()).isEqualTo("Lá úng đen");
        assertThat(r.getPhotoUrl()).isNull();
        assertThat(r.isBeforePromise()).isTrue();
        assertThat(r.getStatus()).isEqualTo(QualityReportStatus.OPEN);
        assertThat(r.getCreatedAt()).isEqualTo(Instant.parse("2026-10-06T03:00:00Z"));
        assertThat(result)
                .isEqualTo(new ItemQualityReportResource(77L, "open", "2026-10-05", "mold"));
        verify(notifications)
                .dispatch(
                        eq(List.of(STALL_OWNER)),
                        argThat(
                                e ->
                                        e.kind() == NotificationKind.QUALITY_REPORTED
                                                && e.link().equals("/farmer/reviews?tab=spoiled")
                                                && e.params().get("product").equals("Rau muống")
                                                && e.params()
                                                        .get("order")
                                                        .equals("ML-20260920-0007")));
    }

    /** Spec §8: a report is judged by the promise on the order line, not by today's product. */
    @Test
    void theReportCopiesThePromiseFromTheOrderLine() {
        service.report(CUSTOMER, ORDER_ID, ITEM_ID, spoiledOn(LocalDate.of(2026, 10, 5)));

        QualityReport r = saved();
        assertThat(r.isShelfLifeExtended()).isTrue();
        assertThat(r.getExtendedByDays()).isEqualTo(2);
    }

    /** Spec §4.4.1: extended and spoiled before its date → every admin is told. */
    @Test
    void anExtendedLineThatSpoiledEarlyReachesTheAdmins() {
        service.report(CUSTOMER, ORDER_ID, ITEM_ID, spoiledOn(LocalDate.of(2026, 10, 5)));

        verify(notifications)
                .notifyAdmins(
                        argThat(
                                e ->
                                        e.kind() == NotificationKind.QUALITY_ESCALATED
                                                && e.link().equals("/admin/moderation?tab=quality")
                                                && e.params().get("stall").equals("Vườn Út Hiền")
                                                && e.params().get("product").equals("Rau muống")
                                                && e.params().get("days").equals("2")));
    }

    /** Spec §4.4.1: other reports still reach the queue, but nobody is pushed a notification. */
    @Test
    void aLineWithinItsSuggestionDoesNotReachTheAdmins() {
        line.setShelfLifeExtended(false);
        line.setExtendedByDays(0);

        service.report(CUSTOMER, ORDER_ID, ITEM_ID, spoiledOn(LocalDate.of(2026, 10, 5)));

        saved();
        verify(notifications, never()).notifyAdmins(any());
    }

    @Test
    void spoiledAfterItsDateDoesNotReachTheAdmins() {
        line.setBestBefore(LocalDate.of(2026, 10, 5));

        service.report(CUSTOMER, ORDER_ID, ITEM_ID, spoiledOn(LocalDate.of(2026, 10, 6)));

        assertThat(saved().isBeforePromise()).isFalse();
        verify(notifications, never()).notifyAdmins(any());
    }

    /** R-06 before anything else: someone else's order is a 403 whatever its state. */
    @Test
    void someoneElsesOrderIs403() {
        order.setStatus(OrderStatus.READY);

        assertThatThrownBy(
                        () ->
                                service.report(
                                        2L, ORDER_ID, ITEM_ID, spoiledOn(LocalDate.of(2026, 10, 5))))
                .isInstanceOf(OrderNotYoursException.class);
        verify(reports, never()).save(any());
    }

    @Test
    void aLineOfAnotherOrderIs404() {
        line.setOrderId(99L);

        assertThatThrownBy(
                        () ->
                                service.report(
                                        CUSTOMER,
                                        ORDER_ID,
                                        ITEM_ID,
                                        spoiledOn(LocalDate.of(2026, 10, 5))))
                .isInstanceOf(ReportedItemNotFoundException.class);
    }

    /** Spec §8: an order that is not completed yet is a 409. */
    @Test
    void anOrderThatIsNotCompletedIs409() {
        order.setStatus(OrderStatus.READY);

        assertThatThrownBy(
                        () ->
                                service.report(
                                        CUSTOMER,
                                        ORDER_ID,
                                        ITEM_ID,
                                        spoiledOn(LocalDate.of(2026, 10, 5))))
                .isInstanceOf(ReportNeedsCompletedOrderException.class);
    }

    /** Spec §8: a line placed before the promise existed has nothing to report against. */
    @Test
    void aLineWithoutAGoodUntilDateCannotBeReported() {
        line.setBestBefore(null);

        assertThatThrownBy(
                        () ->
                                service.report(
                                        CUSTOMER,
                                        ORDER_ID,
                                        ITEM_ID,
                                        spoiledOn(LocalDate.of(2026, 10, 5))))
                .isInstanceOf(ReportWindowClosedException.class);
    }

    @Test
    void aSecondReportOnTheSameLineIsRefused() {
        when(reports.existsByOrderItemId(ITEM_ID)).thenReturn(true);

        assertThatThrownBy(
                        () ->
                                service.report(
                                        CUSTOMER,
                                        ORDER_ID,
                                        ITEM_ID,
                                        spoiledOn(LocalDate.of(2026, 10, 5))))
                .isInstanceOf(ItemAlreadyReportedException.class);
        verify(reports, never()).save(any());
    }

    /** Today is 06/10: good until 04/10 is still open (until 06/10), 03/10 closed on 05/10. */
    @Test
    void theWindowClosesTwoDaysAfterTheGoodUntilDate() {
        line.setBestBefore(LocalDate.of(2026, 10, 4));
        assertThat(
                        service.report(
                                        CUSTOMER,
                                        ORDER_ID,
                                        ITEM_ID,
                                        spoiledOn(LocalDate.of(2026, 10, 4)))
                                .status())
                .isEqualTo("open");

        line.setBestBefore(LocalDate.of(2026, 10, 3));
        assertThatThrownBy(
                        () ->
                                service.report(
                                        CUSTOMER,
                                        ORDER_ID,
                                        ITEM_ID,
                                        spoiledOn(LocalDate.of(2026, 10, 4))))
                .isInstanceOf(ReportWindowClosedException.class)
                .hasMessageContaining("2026-10-05");
    }

    @Test
    void aSpoiledDayOutsidePickupToTodayIs400() {
        assertThatThrownBy(
                        () ->
                                service.report(
                                        CUSTOMER,
                                        ORDER_ID,
                                        ITEM_ID,
                                        spoiledOn(LocalDate.of(2026, 10, 2))))
                .isInstanceOf(InvalidFieldException.class)
                .extracting("field")
                .isEqualTo("spoiledOn");
        assertThatThrownBy(
                        () ->
                                service.report(
                                        CUSTOMER,
                                        ORDER_ID,
                                        ITEM_ID,
                                        spoiledOn(LocalDate.of(2026, 10, 7))))
                .isInstanceOf(InvalidFieldException.class)
                .extracting("field")
                .isEqualTo("spoiledOn");
    }

    /** Review Focus #4: only a photo this customer uploaded is accepted. */
    @Test
    void somebodyElsesPhotoIs400() {
        String other = "/uploads/quality-report-photos/8-3f2a1b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b.jpg";
        when(photos.isOwnedBy(other, CUSTOMER)).thenReturn(false);

        assertThatThrownBy(
                        () ->
                                service.report(
                                        CUSTOMER,
                                        ORDER_ID,
                                        ITEM_ID,
                                        new CreateQualityReportRequest(
                                                LocalDate.of(2026, 10, 5),
                                                QualityProblem.MOLD,
                                                null,
                                                other)))
                .isInstanceOf(InvalidFieldException.class)
                .extracting("field")
                .isEqualTo("photoUrl");
        verify(reports, never()).save(any());
    }

    @Test
    void theirOwnPhotoIsKeptAndABlankNoteIsDropped() {
        String own = "/uploads/quality-report-photos/1-3f2a1b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b.jpg";

        service.report(
                CUSTOMER,
                ORDER_ID,
                ITEM_ID,
                new CreateQualityReportRequest(
                        LocalDate.of(2026, 10, 5), QualityProblem.SMELL, "   ", own));

        QualityReport r = saved();
        assertThat(r.getPhotoUrl()).isEqualTo(own);
        assertThat(r.getNote()).isNull();
        assertThat(r.getProblem()).isEqualTo(QualityProblem.SMELL);
    }
}
```

- [ ] **Step 2: Viết test MySQL (sẽ fail)**

`CustomerQualityReportWindowTest.java`:

```java
package com.techx.intervue.modules.quality.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.techx.intervue.modules.order.exceptions.OrderNotYoursException;
import com.techx.intervue.modules.quality.QualityFixture;
import com.techx.intervue.modules.quality.enums.QualityProblem;
import com.techx.intervue.modules.quality.exceptions.ItemAlreadyReportedException;
import com.techx.intervue.modules.quality.exceptions.ReportWindowClosedException;
import com.techx.intervue.modules.quality.requests.CreateQualityReportRequest;
import com.techx.intervue.modules.quality.services.interfaces.CustomerQualityReportServiceInterface;
import java.time.LocalDate;
import java.time.ZoneId;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

/** FR-122 (spec §9 "cửa sổ báo hư"): the window and the one-report rule on real MySQL. */
@SpringBootTest
@Transactional
class CustomerQualityReportWindowTest {

    private static final LocalDate TODAY = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));

    @Autowired private CustomerQualityReportServiceInterface service;
    @Autowired private JdbcTemplate jdbc;

    private QualityFixture fx;
    private long customer;
    private long farmer;
    private long category;
    private long order;

    @BeforeEach
    void setUp() {
        fx = new QualityFixture(jdbc);
        customer = fx.base.user("customer", "Buyer", "x");
        farmer = fx.base.farmer(fx.base.user("farmer", "Seller", "x"), "Stall", "approved");
        category = fx.base.category();
        order =
                fx.base.order(
                        customer,
                        farmer,
                        fx.base.market("Market"),
                        "completed",
                        2,
                        TODAY.minusDays(5));
    }

    private long line(String name, LocalDate bestBefore) {
        return fx.line(order, fx.base.product(farmer, category, name, 1), bestBefore, true);
    }

    private static CreateQualityReportRequest on(LocalDate day) {
        return new CreateQualityReportRequest(day, QualityProblem.MOLD, null, null);
    }

    /** Review Focus #5: good until 2 days ago is the last day; 3 days ago is closed. */
    @Test
    void theLastDayOfTheWindowIsAcceptedAndTheNextIsNot() {
        long lastDay = line("Rau muống", TODAY.minusDays(2));
        long tooLate = line("Cải ngọt", TODAY.minusDays(3));

        assertThat(service.report(customer, order, lastDay, on(TODAY.minusDays(3))).status())
                .isEqualTo("open");
        assertThat(
                        jdbc.queryForObject(
                                "SELECT before_promise FROM quality_reports WHERE order_item_id = ?",
                                Boolean.class,
                                lastDay))
                .isTrue();
        assertThatThrownBy(() -> service.report(customer, order, tooLate, on(TODAY.minusDays(4))))
                .isInstanceOf(ReportWindowClosedException.class);
    }

    @Test
    void aLineIsReportedOnce() {
        long item = line("Rau dền", TODAY);
        service.report(customer, order, item, on(TODAY));

        assertThatThrownBy(() -> service.report(customer, order, item, on(TODAY)))
                .isInstanceOf(ItemAlreadyReportedException.class);
        assertThat(
                        jdbc.queryForObject(
                                "SELECT COUNT(*) FROM quality_reports WHERE order_item_id = ?",
                                Integer.class,
                                item))
                .isEqualTo(1);
    }

    /** Spec §9 "Quyền": a customer cannot report someone else's order. */
    @Test
    void anotherCustomerCannotReportTheOrder() {
        long item = line("Mồng tơi", TODAY);
        long stranger = fx.base.user("customer", "Stranger", "x");

        assertThatThrownBy(() -> service.report(stranger, order, item, on(TODAY)))
                .isInstanceOf(OrderNotYoursException.class);
    }
}
```

Thêm vào `QualityExceptionHandlerTest` (import `OrderNotFoundException`, `OrderNotYoursException`, 4 exception mới, `java.time.LocalDate`):

```java
    @Test
    void stateConflictsOfAReportAre409() {
        assertError(
                handler.notCompleted(new ReportNeedsCompletedOrderException()),
                409,
                "ORDER_NOT_COMPLETED");
        assertError(
                handler.windowClosed(ReportWindowClosedException.closed(LocalDate.of(2026, 10, 7))),
                409,
                "REPORT_WINDOW_CLOSED");
        assertError(
                handler.alreadyReported(new ItemAlreadyReportedException()),
                409,
                "ALREADY_REPORTED");
    }

    @Test
    void someoneElsesOrderIs403AndAMissingOneIs404() {
        assertError(handler.notYours(new OrderNotYoursException()), 403, "FORBIDDEN");
        assertError(handler.notFound(new OrderNotFoundException(9L)), 404, "NOT_FOUND");
        assertError(handler.notFound(new ReportedItemNotFoundException()), 404, "NOT_FOUND");
    }

    /** Review Focus #3: two sends at the same moment — the UNIQUE key answers 409, not 500. */
    @Test
    void aDuplicateReportRaceIs409() {
        assertError(
                handler.dataIntegrity(
                        violation(
                                "Duplicate entry '501' for key"
                                        + " 'quality_reports.uq_quality_report_item'")),
                409,
                "ALREADY_REPORTED");
    }
```

`QualityExceptionHandlerScopeTest`: đổi danh sách thành `.containsExactlyInAnyOrder(QualityReportPhotoController.class, QualityReportController.class)`.

`QualityControllerAccessTest`: thêm

```java
    @Test
    void onlyBuyersReportSpoiledProduce() {
        assertThat(rule(QualityReportController.class)).isEqualTo("hasAnyRole('CUSTOMER','FARMER')");
    }
```

- [ ] **Step 3: Chạy test để thấy fail**

Run: lệnh test backend với `-Dtest='CustomerQualityReportServiceTest,CustomerQualityReportWindowTest,QualityExceptionHandlerTest,QualityExceptionHandlerScopeTest,QualityControllerAccessTest'`.
Expected: FAIL lúc biên dịch, `cannot find symbol: class CustomerQualityReportService`.

- [ ] **Step 4: Viết resource, request và exception**

`order/resources/ItemQualityReportResource.java`:

```java
package com.techx.intervue.modules.order.resources;

/**
 * FR-122: the spoilage report on one order line, as the order page shows it — null until the
 * customer reports it. {@code spoiledOn} is "yyyy-MM-dd"; {@code status} is open, confirmed or
 * dismissed; {@code problem} is bruised, mold, smell, wilted or other.
 */
public record ItemQualityReportResource(Long id, String status, String spoiledOn, String problem) {}
```

`quality/requests/CreateQualityReportRequest.java`:

```java
package com.techx.intervue.modules.quality.requests;

import com.techx.intervue.modules.quality.enums.QualityProblem;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/**
 * Body of POST /orders/{id}/items/{itemId}/quality-report (spec §4.4.1). {@code photoUrl} is a URL
 * returned by POST /quality-reports/photos for the same account; the photo is optional.
 */
public record CreateQualityReportRequest(
        @NotNull(message = "Pick the day it spoiled.") LocalDate spoiledOn,
        @NotNull(message = "Pick what went wrong.") QualityProblem problem,
        @Size(max = 500, message = "Keep the description under 500 characters.") String note,
        @Size(max = 255) String photoUrl) {}
```

`quality/exceptions/ReportNeedsCompletedOrderException.java`:

```java
package com.techx.intervue.modules.quality.exceptions;

/** Spec §8: an order that is not completed yet cannot be reported — 409 ORDER_NOT_COMPLETED. */
public class ReportNeedsCompletedOrderException extends RuntimeException {
    public ReportNeedsCompletedOrderException() {
        super("You can report a problem once the order is completed.");
    }
}
```

`quality/exceptions/ReportWindowClosedException.java`:

```java
package com.techx.intervue.modules.quality.exceptions;

import java.time.LocalDate;

/**
 * Spec §4.4.1, §8: past the good-until date + 2 days, or a line with no good-until date at all —
 * 409 REPORT_WINDOW_CLOSED.
 */
public class ReportWindowClosedException extends RuntimeException {

    private ReportWindowClosedException(String message) {
        super(message);
    }

    /** A line placed before the shelf-life promise existed. */
    public static ReportWindowClosedException noPromise() {
        return new ReportWindowClosedException(
                "This item has no good-until date, so it cannot be reported.");
    }

    public static ReportWindowClosedException closed(LocalDate deadline) {
        return new ReportWindowClosedException(
                "Items can be reported until 2 days after their good-until date. This one closed"
                        + " on "
                        + deadline
                        + ".");
    }
}
```

`quality/exceptions/ItemAlreadyReportedException.java`:

```java
package com.techx.intervue.modules.quality.exceptions;

/** Spec §4.4.1: each line is reported once — 409 ALREADY_REPORTED. */
public class ItemAlreadyReportedException extends RuntimeException {
    public ItemAlreadyReportedException() {
        super("You have already reported this item.");
    }
}
```

`quality/exceptions/ReportedItemNotFoundException.java`:

```java
package com.techx.intervue.modules.quality.exceptions;

/** The line id is not one of this order's lines — 404, the caller owns the order. */
public class ReportedItemNotFoundException extends RuntimeException {
    public ReportedItemNotFoundException() {
        super("This item is not part of the order.");
    }
}
```

- [ ] **Step 5: Viết `QualityLinks`, service và controller**

`quality/services/impl/QualityLinks.java`:

```java
package com.techx.intervue.modules.quality.services.impl;

/** Where the spoilage notifications take people (frontend routes, spec §4.6). */
final class QualityLinks {

    /** The stall's reports: Reviews → Spoiled reports. */
    static final String FARMER_REPORTS = "/farmer/reviews?tab=spoiled";

    /** The admin queue: Moderation → Spoiled reports. */
    static final String ADMIN_QUEUE = "/admin/moderation?tab=quality";

    /** The Farmer overview, where the strikes card shows the lock. */
    static final String FARMER_HOME = "/farmer";

    private QualityLinks() {}

    /** The customer's own order page. */
    static String order(long orderId) {
        return "/orders/" + orderId;
    }

    /** The product whose shelf life went back to the suggestion, in the Farmer's form. */
    static String farmerProduct(long productId) {
        return "/farmer/products/" + productId + "/edit";
    }
}
```

`quality/services/interfaces/CustomerQualityReportServiceInterface.java`:

```java
package com.techx.intervue.modules.quality.services.interfaces;

import com.techx.intervue.modules.order.resources.ItemQualityReportResource;
import com.techx.intervue.modules.quality.requests.CreateQualityReportRequest;

public interface CustomerQualityReportServiceInterface {

    /** FR-122: the buyer reports one spoiled line of a completed order (spec §4.4.1). */
    ItemQualityReportResource report(
            long userId, long orderId, long itemId, CreateQualityReportRequest request);
}
```

`quality/services/impl/CustomerQualityReportService.java`:

```java
package com.techx.intervue.modules.quality.services.impl;

import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.notification.enums.NotificationKind;
import com.techx.intervue.modules.notification.resources.NotificationEvent;
import com.techx.intervue.modules.notification.services.interfaces.NotificationServiceInterface;
import com.techx.intervue.modules.order.entities.Order;
import com.techx.intervue.modules.order.entities.OrderItem;
import com.techx.intervue.modules.order.enums.OrderStatus;
import com.techx.intervue.modules.order.exceptions.OrderNotFoundException;
import com.techx.intervue.modules.order.exceptions.OrderNotYoursException;
import com.techx.intervue.modules.order.repositories.OrderItemRepository;
import com.techx.intervue.modules.order.repositories.OrderRepository;
import com.techx.intervue.modules.order.resources.ItemQualityReportResource;
import com.techx.intervue.modules.quality.entities.QualityReport;
import com.techx.intervue.modules.quality.exceptions.ItemAlreadyReportedException;
import com.techx.intervue.modules.quality.exceptions.ReportNeedsCompletedOrderException;
import com.techx.intervue.modules.quality.exceptions.ReportWindowClosedException;
import com.techx.intervue.modules.quality.exceptions.ReportedItemNotFoundException;
import com.techx.intervue.modules.quality.repositories.QualityReportRepository;
import com.techx.intervue.modules.quality.requests.CreateQualityReportRequest;
import com.techx.intervue.modules.quality.services.interfaces.CustomerQualityReportServiceInterface;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * FR-122 (spec §4.4.1). {@link #report} checks, in this order: the order exists (404) → it is the
 * caller's (403, before anything else, R-06) → the line belongs to it (404) → it is completed
 * (409) → the line has a good-until date (409) → not reported yet (409) → still inside the window
 * (409) → the spoiled day lies between pickup and today (400) → the photo is the caller's own
 * upload (400).
 */
@Service
@AllArgsConstructor
public class CustomerQualityReportService implements CustomerQualityReportServiceInterface {

    private final OrderRepository orders;
    private final OrderItemRepository orderItems;
    private final QualityReportRepository reports;
    private final FarmerProfileRepository farmers;
    private final QualityReportPhotoService photos;
    private final NotificationServiceInterface notifications;
    private final Clock clock;

    @Override
    @Transactional
    public ItemQualityReportResource report(
            long userId, long orderId, long itemId, CreateQualityReportRequest request) {
        Order order = orders.findById(orderId).orElseThrow(() -> new OrderNotFoundException(orderId));
        if (!Objects.equals(order.getCustomerId(), userId)) {
            throw new OrderNotYoursException();
        }
        OrderItem line =
                orderItems
                        .findById(itemId)
                        .filter(i -> Objects.equals(i.getOrderId(), orderId))
                        .orElseThrow(ReportedItemNotFoundException::new);
        if (order.getStatus() != OrderStatus.COMPLETED) {
            throw new ReportNeedsCompletedOrderException();
        }
        LocalDate bestBefore = line.getBestBefore();
        if (bestBefore == null) {
            throw ReportWindowClosedException.noPromise();
        }
        if (reports.existsByOrderItemId(itemId)) {
            throw new ItemAlreadyReportedException();
        }
        LocalDate today = LocalDate.now(clock);
        if (!SpoilagePolicy.windowOpen(bestBefore, today)) {
            throw ReportWindowClosedException.closed(SpoilagePolicy.reportDeadline(bestBefore));
        }
        LocalDate spoiledOn = request.spoiledOn();
        if (spoiledOn.isBefore(order.getPickupDate()) || spoiledOn.isAfter(today)) {
            throw new InvalidFieldException("spoiledOn", "Pick a day between pickup and today.");
        }
        String photoUrl = blankToNull(request.photoUrl());
        if (photoUrl != null && !photos.isOwnedBy(photoUrl, userId)) {
            throw new InvalidFieldException("photoUrl", "Upload the photo again.");
        }

        QualityReport report = new QualityReport();
        report.setOrderItemId(line.getId());
        report.setOrderId(order.getId());
        report.setCustomerId(userId);
        report.setFarmerId(order.getFarmerId());
        report.setProductId(line.getProductId());
        report.setSpoiledOn(spoiledOn);
        report.setProblem(request.problem());
        report.setNote(blankToNull(request.note()));
        report.setPhotoUrl(photoUrl);
        report.setBeforePromise(SpoilagePolicy.beforePromise(spoiledOn, bestBefore));
        // The promise on the line, not today's product: spec §8 "judged by what the order says"
        report.setShelfLifeExtended(line.isShelfLifeExtended());
        report.setExtendedByDays(line.getExtendedByDays());
        report.setCreatedAt(clock.instant());
        QualityReport saved = reports.save(report);

        tellStallAndAdmins(order, line, saved);
        return new ItemQualityReportResource(
                saved.getId(),
                saved.getStatus().value(),
                saved.getSpoiledOn().toString(),
                saved.getProblem().value());
    }

    /**
     * The stall always hears of it; the admins only when an extended shelf life failed before its
     * own promise (spec §4.4.1) — the others wait in the queue without a push.
     */
    private void tellStallAndAdmins(Order order, OrderItem line, QualityReport report) {
        FarmerProfile stall = farmers.findById(order.getFarmerId()).orElse(null);
        if (stall == null) {
            return;
        }
        notifications.dispatch(
                List.of(stall.getUserId()),
                NotificationEvent.of(
                        NotificationKind.QUALITY_REPORTED,
                        QualityLinks.FARMER_REPORTS,
                        Map.of("product", line.getProductName(), "order", order.getOrderCode())));
        if (SpoilagePolicy.escalates(report.isShelfLifeExtended(), report.isBeforePromise())) {
            notifications.notifyAdmins(
                    NotificationEvent.of(
                            NotificationKind.QUALITY_ESCALATED,
                            QualityLinks.ADMIN_QUEUE,
                            Map.of(
                                    "stall", stall.getStallName(),
                                    "product", line.getProductName(),
                                    "days", String.valueOf(report.getExtendedByDays()),
                                    "order", order.getOrderCode())));
        }
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
```

`quality/controllers/QualityReportController.java`:

```java
package com.techx.intervue.modules.quality.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.order.resources.ItemQualityReportResource;
import com.techx.intervue.modules.quality.requests.CreateQualityReportRequest;
import com.techx.intervue.modules.quality.services.interfaces.CustomerQualityReportServiceInterface;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import com.techx.intervue.resources.ApiResource;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * FR-122 — {@code POST /orders/{orderId}/items/{itemId}/quality-report} (spec §6). {@code itemId}
 * is order_items.id, which GET /orders/{id} returns on every line as {@code itemId}.
 */
@RestController
@RequestMapping("/api/v1/orders/{orderId}/items/{itemId}/quality-report")
@PreAuthorize("hasAnyRole('CUSTOMER','FARMER')")
@AllArgsConstructor
public class QualityReportController extends BaseController {

    private final CustomerQualityReportServiceInterface reports;

    @PostMapping
    public ResponseEntity<ApiResource<ItemQualityReportResource>> report(
            @PathVariable long orderId,
            @PathVariable long itemId,
            @Valid @RequestBody CreateQualityReportRequest request,
            @AuthenticationPrincipal CustomUserDetails user) {
        return created(
                reports.report(user.getId(), orderId, itemId, request),
                "Report sent. The stall can reply, and an admin may review it.");
    }
}
```

- [ ] **Step 6: Nối controller và lỗi vào `QualityExceptionHandler`**

1. `assignableTypes` thành `{QualityReportPhotoController.class, QualityReportController.class}`.
2. Import `com.techx.intervue.modules.order.exceptions.OrderNotFoundException`, `com.techx.intervue.modules.order.exceptions.OrderNotYoursException`, 4 exception của Step 4, `org.springframework.dao.DataIntegrityViolationException`.
3. Thêm các hàm sau `unsupportedImage(...)`:

```java
    /** The order or the line is not there → 404, without saying which. */
    @ExceptionHandler({OrderNotFoundException.class, ReportedItemNotFoundException.class})
    ResponseEntity<ApiResource<Void>> notFound(RuntimeException e) {
        return error(HttpStatus.NOT_FOUND, "NOT_FOUND", e.getMessage(), List.of());
    }

    /** R-06: someone else's order → 403, never 404 (the order is real). */
    @ExceptionHandler(OrderNotYoursException.class)
    ResponseEntity<ApiResource<Void>> notYours(RuntimeException e) {
        return error(HttpStatus.FORBIDDEN, "FORBIDDEN", e.getMessage(), List.of());
    }

    /** Spec §8: reporting before the order is completed is a 409. */
    @ExceptionHandler(ReportNeedsCompletedOrderException.class)
    ResponseEntity<ApiResource<Void>> notCompleted(ReportNeedsCompletedOrderException e) {
        return error(HttpStatus.CONFLICT, "ORDER_NOT_COMPLETED", e.getMessage(), List.of());
    }

    @ExceptionHandler(ReportWindowClosedException.class)
    ResponseEntity<ApiResource<Void>> windowClosed(ReportWindowClosedException e) {
        return error(HttpStatus.CONFLICT, "REPORT_WINDOW_CLOSED", e.getMessage(), List.of());
    }

    @ExceptionHandler(ItemAlreadyReportedException.class)
    ResponseEntity<ApiResource<Void>> alreadyReported(ItemAlreadyReportedException e) {
        return error(HttpStatus.CONFLICT, "ALREADY_REPORTED", e.getMessage(), List.of());
    }

    /** Last net for two requests at once: the UNIQUE keys of V20260927006. */
    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ApiResource<Void>> dataIntegrity(DataIntegrityViolationException e) {
        String cause = String.valueOf(e.getMostSpecificCause().getMessage());
        if (cause.contains("uq_quality_report_item")) {
            return error(
                    HttpStatus.CONFLICT,
                    "ALREADY_REPORTED",
                    "You have already reported this item.",
                    List.of());
        }
        return error(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", INVALID_MESSAGE, List.of());
    }
```

- [ ] **Step 7: Chạy lại test**

Run: lệnh test backend với `-Dtest='CustomerQualityReportServiceTest,CustomerQualityReportWindowTest,QualityExceptionHandlerTest,QualityExceptionHandlerScopeTest,QualityControllerAccessTest'`.
Expected: toàn bộ PASS (`CustomerQualityReportServiceTest` 14 test, `CustomerQualityReportWindowTest` 3 test).

- [ ] **Step 8: Format và commit**

```bash
docker compose exec -T -e MAVEN_OPTS=-Xmx256m backend ./mvnw -B -q spotless:apply
git add backend/src/main/java/com/techx/intervue/modules/quality \
  backend/src/main/java/com/techx/intervue/modules/order/resources/ItemQualityReportResource.java \
  backend/src/test/java/com/techx/intervue/modules/quality
git commit -m "feat(FR-122): customers report spoiled produce on a completed order line"
```

---

### Task 6: Mỗi món trong `GET /orders/{id}` có `itemId` và `qualityReport` (FR-122)

**Files:**
- Modify: `backend/src/main/java/com/techx/intervue/modules/order/resources/OrderItemResource.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/order/repositories/OrderQueryRepository.java` (`ITEMS_SQL` và `items(...)`, bản của giai đoạn 1)
- Test: `backend/src/test/java/com/techx/intervue/modules/order/repositories/OrderItemShelfLifeQueryTest.java` (của giai đoạn 1, thêm test)

**Interfaces:**
- Consumes: Task 5 (`ItemQualityReportResource`), bảng `quality_reports` (Task 1), `OrderItemResource` và `ITEMS_SQL` của giai đoạn 1.
- Produces: `OrderItemResource(Long productId, String productName, String unit, BigDecimal unitPrice, int quantity, BigDecimal subtotal, String bestBefore, String storageMode, BigDecimal listPrice, ItemQualityReportResource qualityReport, Long itemId)` — Ruling 1. `OrderService.detail` không đổi: nó đã trả `orderQueries.items(orderId)`, nên khách, sạp và admin đều thấy báo cáo của từng món.

- [ ] **Step 1: Viết test (sẽ fail)**

Trong `OrderItemShelfLifeQueryTest` (giai đoạn 1 tạo; không `@Transactional`, dọn bằng `fx.cleanUp()` — xoá đơn thì `quality_reports` bị xoá theo nhờ `ON DELETE CASCADE`), thêm import `com.techx.intervue.modules.order.resources.ItemQualityReportResource` và test:

```java
    /** FR-122: each line carries its id (the report endpoint's {itemId}) and its report. */
    @Test
    void carriesTheLineIdAndItsSpoilageReport() {
        long customer = fx.user("customer", "Buyer " + fx.tag, "x");
        long farmer = fx.farmer(fx.user("farmer", "Seller " + fx.tag, "x"), "Stall " + fx.tag, "approved");
        long market = fx.market("Market " + fx.tag);
        long category = fx.category();
        long reported = fx.product(farmer, category, "Rau dền " + fx.tag, 1);
        long quiet = fx.product(farmer, category, "Mồng tơi " + fx.tag, 1);
        long order = fx.order(customer, farmer, market, "completed", 2, LocalDate.of(2026, 10, 3));
        fx.item(order, reported, 1, 1);
        fx.item(order, quiet, 1, 1);
        long reportedLine =
                jdbc.queryForObject(
                        "SELECT id FROM order_items WHERE order_id = ? AND product_id = ?",
                        Long.class,
                        order,
                        reported);
        jdbc.update(
                "INSERT INTO quality_reports (order_item_id, order_id, customer_id, farmer_id,"
                        + " product_id, spoiled_on, problem, before_promise)"
                        + " VALUES (?, ?, ?, ?, ?, '2026-10-04', 'mold', TRUE)",
                reportedLine,
                order,
                customer,
                farmer,
                reported);

        List<OrderItemResource> items = orders.items(order);

        assertThat(items.get(0).itemId()).isEqualTo(reportedLine);
        ItemQualityReportResource report = items.get(0).qualityReport();
        assertThat(report.status()).isEqualTo("open");
        assertThat(report.spoiledOn()).isEqualTo("2026-10-04");
        assertThat(report.problem()).isEqualTo("mold");
        assertThat(items.get(1).itemId()).isNotNull();
        assertThat(items.get(1).qualityReport()).isNull();
    }
```

- [ ] **Step 2: Chạy test để thấy fail**

Run: lệnh test backend với `-Dtest='OrderItemShelfLifeQueryTest'`.
Expected: FAIL lúc biên dịch, `cannot find symbol: method itemId()`.

- [ ] **Step 3: Mở rộng `OrderItemResource`**

Thay toàn bộ record (giữ import `java.math.BigDecimal`):

```java
/**
 * One {@code order_items} line — name/price/unit as copied at order time (contract §7). {@code
 * bestBefore} ("yyyy-MM-dd") and {@code storageMode} are the shelf-life promise (FR-121), null on
 * lines placed before it existed; {@code listPrice} is the price before a near-expiry discount
 * (FR-124), null when there was none. {@code qualityReport} is the customer's spoilage report on
 * this line, null until reported, and {@code itemId} is order_items.id — the {itemId} of POST
 * /orders/{id}/items/{itemId}/quality-report (FR-122).
 */
public record OrderItemResource(
        Long productId,
        String productName,
        String unit,
        BigDecimal unitPrice,
        int quantity,
        BigDecimal subtotal,
        String bestBefore,
        String storageMode,
        BigDecimal listPrice,
        ItemQualityReportResource qualityReport,
        Long itemId) {}
```

- [ ] **Step 4: Đổi truy vấn món của đơn**

Trong `OrderQueryRepository`, thay hằng `ITEMS_SQL` (bản giai đoạn 1 đang chọn `product_id … best_before, storage_mode, list_price FROM order_items`) bằng:

```java
    public static final String ITEMS_SQL =
            """
            SELECT oi.id, oi.product_id, oi.product_name, oi.unit, oi.unit_price, oi.quantity,
                   oi.subtotal, oi.best_before, oi.storage_mode, oi.list_price,
                   qr.id AS report_id, qr.status AS report_status,
                   qr.spoiled_on AS report_spoiled_on, qr.problem AS report_problem
            FROM order_items oi
            LEFT JOIN quality_reports qr ON qr.order_item_id = oi.id
            WHERE oi.order_id = :orderId
            ORDER BY oi.id
            """;
```

Thay thân hàm `items(long orderId)` bằng bản dưới (giữ nguyên cách giai đoạn 1 đọc 3 cột hạn dùng), và thêm hàm `qualityReportOf` ngay sau nó; import `com.techx.intervue.modules.order.resources.ItemQualityReportResource`:

```java
    public List<OrderItemResource> items(long orderId) {
        return jdbc.query(
                ITEMS_SQL,
                new MapSqlParameterSource("orderId", orderId),
                (rs, i) -> {
                    LocalDate bestBefore = rs.getObject("best_before", LocalDate.class);
                    return new OrderItemResource(
                            rs.getLong("product_id"),
                            rs.getString("product_name"),
                            rs.getString("unit"),
                            rs.getBigDecimal("unit_price"),
                            rs.getInt("quantity"),
                            rs.getBigDecimal("subtotal"),
                            bestBefore == null ? null : bestBefore.toString(),
                            rs.getString("storage_mode"),
                            rs.getBigDecimal("list_price"),
                            qualityReportOf(rs),
                            rs.getLong("id"));
                });
    }

    /** FR-122: the line's spoilage report, null until the customer reports it (LEFT JOIN). */
    private static ItemQualityReportResource qualityReportOf(ResultSet rs) throws SQLException {
        long id = rs.getLong("report_id");
        if (rs.wasNull()) {
            return null;
        }
        return new ItemQualityReportResource(
                id,
                rs.getString("report_status"),
                rs.getObject("report_spoiled_on", LocalDate.class).toString(),
                rs.getString("report_problem"));
    }
```

- [ ] **Step 5: Chạy lại test đơn hàng**

Run: lệnh test backend với `-Dtest='OrderItemShelfLifeQueryTest,OrderServiceTest,OrderAccessTest,OrderAdminReadTest,OrderDetailResourceTest'`.
Expected: toàn bộ PASS (test cũ của giai đoạn 1 vẫn xanh vì 3 cột hạn dùng đọc như cũ).

- [ ] **Step 6: Format và commit**

```bash
docker compose exec -T -e MAVEN_OPTS=-Xmx256m backend ./mvnw -B -q spotless:apply
git add backend/src/main/java/com/techx/intervue/modules/order \
  backend/src/test/java/com/techx/intervue/modules/order/repositories/OrderItemShelfLifeQueryTest.java
git commit -m "feat(FR-122): order lines carry their id and their spoilage report"
```

---

### Task 7: Sạp đọc báo cáo và phản hồi — `GET /farmer/quality-reports`, `PUT /farmer/quality-reports/{id}/response` (FR-122)

**Files:**
- Create: `backend/src/main/java/com/techx/intervue/modules/quality/resources/QualityReportResource.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/quality/resources/ShelfLifeStandingResource.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/quality/resources/FarmerQualityReportsResource.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/quality/requests/FarmerResponseRequest.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/quality/repositories/QualityReportQueryRepository.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/quality/services/interfaces/ShelfLifeStandingServiceInterface.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/quality/services/impl/ShelfLifeStandingService.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/quality/services/interfaces/FarmerQualityReportServiceInterface.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/quality/services/impl/FarmerQualityReportService.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/quality/exceptions/QualityReportNotFoundException.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/quality/exceptions/QualityReportNotYoursException.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/quality/exceptions/ReportAlreadyDecidedException.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/quality/controllers/FarmerQualityReportController.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/quality/controllers/QualityExceptionHandler.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/quality/services/impl/ShelfLifeStandingServiceTest.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/quality/services/impl/FarmerQualityReportServiceTest.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/quality/repositories/QualityReportQueryRepositoryTest.java`
- Test: `QualityExceptionHandlerTest`, `QualityExceptionHandlerScopeTest`, `QualityControllerAccessTest` (sửa)

**Interfaces:**
- Consumes: Task 1 (`QualityReportRepository.lockById`, `FarmerViolationRepository.activeTimes`, `QualityFixture`), Task 2 (`SpoilagePolicy.strikeWindowStart`, `lockedUntil`, hằng `STRIKES_TO_LOCK`, `STRIKE_WINDOW_DAYS`), `FarmerProfileRepository.findByUserId`, `PageResource<T>(items, page, pageSize, total)`.
- Produces:
  - `record QualityReportResource(Long id, Long orderId, String orderCode, Long farmerId, String stallName, String stallStatus, String customerName, Long productId, String productName, String pickupDate, String bestBefore, String storageMode, String spoiledOn, boolean beforePromise, String problem, String note, String photoUrl, boolean shelfLifeExtended, int extendedByDays, String status, String farmerResponse, Instant farmerRespondedAt, String decisionNote, Instant decidedAt, Instant createdAt, int stallActiveStrikes)` — một báo cáo như sạp và admin thấy (Task 8 và FE dùng đúng tên này).
  - `record ShelfLifeStandingResource(int activeViolations, int limit, int windowDays, Instant extensionLockedUntil)`.
  - `record FarmerQualityReportsResource(ShelfLifeStandingResource standing, PageResource<QualityReportResource> reports)` (Ruling 2).
  - `QualityReportQueryRepository`: `PageResource<QualityReportResource> forStall(long farmerId, Instant since, int offset, int limit)`, `Optional<QualityReportResource> findById(long reportId, Instant since)` (Task 8 thêm `forAdmin`).
  - `ShelfLifeStandingServiceInterface.standing(long farmerId)` → `ShelfLifeStandingResource` (Task 9 thêm `requireCanExtend`).
  - `FarmerQualityReportServiceInterface`: `FarmerQualityReportsResource list(long farmerUserId, int page, int pageSize)`, `QualityReportResource respond(long farmerUserId, long reportId, String response)`.
  - Exception `QualityReportNotFoundException` (404 `NOT_FOUND`), `QualityReportNotYoursException` (403 `FORBIDDEN`), `ReportAlreadyDecidedException` (409 `REPORT_ALREADY_DECIDED`).
  - REST (vai `FARMER`): `GET /api/v1/farmer/quality-reports?page=&pageSize=` → `FarmerQualityReportsResource`; `PUT /api/v1/farmer/quality-reports/{id}/response` body `{ response }` → `QualityReportResource`.

- [ ] **Step 1: Viết test (sẽ fail)**

`ShelfLifeStandingServiceTest.java`:

```java
package com.techx.intervue.modules.quality.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.quality.repositories.FarmerViolationRepository;
import com.techx.intervue.modules.quality.resources.ShelfLifeStandingResource;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** FR-123 (spec §4.4.4): the stall's strikes and the lock, derived from farmer_violations. */
class ShelfLifeStandingServiceTest {

    private static final long FARMER_ID = 10L;
    private static final Clock CLOCK =
            Clock.fixed(Instant.parse("2026-10-27T03:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));

    private FarmerViolationRepository violations;
    private ShelfLifeStandingService service;

    @BeforeEach
    void setUp() {
        violations = mock(FarmerViolationRepository.class);
        service = new ShelfLifeStandingService(violations, CLOCK);
    }

    @Test
    void countsTheStrikesOfTheLast90Days() {
        when(violations.activeTimes(FARMER_ID, Instant.parse("2026-07-29T03:00:00Z")))
                .thenReturn(
                        List.of(
                                Instant.parse("2026-10-20T03:00:00Z"),
                                Instant.parse("2026-10-10T03:00:00Z")));

        assertThat(service.standing(FARMER_ID))
                .isEqualTo(new ShelfLifeStandingResource(2, 3, 90, null));
    }

    @Test
    void threeStrikesLockUntilTheThirdNewestTurns90DaysOld() {
        when(violations.activeTimes(eq(FARMER_ID), any()))
                .thenReturn(
                        List.of(
                                Instant.parse("2026-10-20T03:00:00Z"),
                                Instant.parse("2026-10-10T03:00:00Z"),
                                Instant.parse("2026-09-01T03:00:00Z")));

        assertThat(service.standing(FARMER_ID).extensionLockedUntil())
                .isEqualTo(Instant.parse("2026-11-30T03:00:00Z"));
    }
}
```

`FarmerQualityReportServiceTest.java`:

```java
package com.techx.intervue.modules.quality.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.quality.entities.QualityReport;
import com.techx.intervue.modules.quality.enums.QualityReportStatus;
import com.techx.intervue.modules.quality.exceptions.QualityReportNotFoundException;
import com.techx.intervue.modules.quality.exceptions.QualityReportNotYoursException;
import com.techx.intervue.modules.quality.exceptions.ReportAlreadyDecidedException;
import com.techx.intervue.modules.quality.repositories.QualityReportQueryRepository;
import com.techx.intervue.modules.quality.repositories.QualityReportRepository;
import com.techx.intervue.modules.quality.resources.FarmerQualityReportsResource;
import com.techx.intervue.modules.quality.resources.QualityReportResource;
import com.techx.intervue.modules.quality.resources.ShelfLifeStandingResource;
import com.techx.intervue.modules.quality.services.interfaces.ShelfLifeStandingServiceInterface;
import com.techx.intervue.resources.PageResource;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;

/** FR-122 (spec §4.4.2, §8): the stall's reports and its one editable reply. */
class FarmerQualityReportServiceTest {

    private static final long STALL_OWNER = 30L;
    private static final long FARMER_ID = 10L;
    private static final long REPORT = 9L;
    private static final Clock CLOCK =
            Clock.fixed(Instant.parse("2026-10-06T03:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
    /** CLOCK minus 90 days. */
    private static final Instant SINCE = Instant.parse("2026-07-08T03:00:00Z");

    private FarmerProfileRepository farmers;
    private QualityReportRepository reports;
    private QualityReportQueryRepository queries;
    private ShelfLifeStandingServiceInterface standing;
    private FarmerQualityReportService service;
    private QualityReport report;

    @BeforeEach
    void setUp() {
        farmers = mock(FarmerProfileRepository.class);
        reports = mock(QualityReportRepository.class);
        queries = mock(QualityReportQueryRepository.class);
        standing = mock(ShelfLifeStandingServiceInterface.class);
        service = new FarmerQualityReportService(farmers, reports, queries, standing, CLOCK);

        when(farmers.findByUserId(STALL_OWNER)).thenReturn(Optional.of(stall(ApprovalStatus.APPROVED)));
        report = new QualityReport();
        report.setId(REPORT);
        report.setFarmerId(FARMER_ID);
        when(reports.lockById(REPORT)).thenReturn(Optional.of(report));
        when(queries.findById(eq(REPORT), any())).thenReturn(Optional.of(row()));
    }

    private static FarmerProfile stall(ApprovalStatus status) {
        return FarmerProfile.builder()
                .id(FARMER_ID)
                .userId(STALL_OWNER)
                .stallName("Vườn Út Hiền")
                .contactPerson("Hiền")
                .approvalStatus(status)
                .build();
    }

    private static QualityReportResource row() {
        return new QualityReportResource(
                REPORT, 21L, "ML-20260920-0007", FARMER_ID, "Vườn Út Hiền", "approved",
                "Nguyễn Văn An", 3L, "Rau muống", "2026-10-03", "2026-10-07", "chilled",
                "2026-10-05", true, "mold", null, null, true, 2, "open",
                "Khách để nhiệt độ thường.", Instant.parse("2026-10-06T03:00:00Z"), null, null,
                Instant.parse("2026-10-05T13:00:00Z"), 1);
    }

    @Test
    void theStallSeesItsReportsAndItsStrikes() {
        PageResource<QualityReportResource> page = new PageResource<>(List.of(row()), 1, 20, 1);
        ShelfLifeStandingResource strikes = new ShelfLifeStandingResource(1, 3, 90, null);
        when(queries.forStall(FARMER_ID, SINCE, 0, 20)).thenReturn(page);
        when(standing.standing(FARMER_ID)).thenReturn(strikes);

        FarmerQualityReportsResource result = service.list(STALL_OWNER, 1, 20);

        assertThat(result.standing()).isEqualTo(strikes);
        assertThat(result.reports()).isEqualTo(page);
    }

    @Test
    void aReplyIsSavedWhileTheReportIsOpen() {
        QualityReportResource result = service.respond(STALL_OWNER, REPORT, "  Khách để nhiệt độ thường.  ");

        assertThat(report.getFarmerResponse()).isEqualTo("Khách để nhiệt độ thường.");
        assertThat(report.getFarmerRespondedAt()).isEqualTo(Instant.parse("2026-10-06T03:00:00Z"));
        verify(reports).saveAndFlush(report);
        assertThat(result.farmerResponse()).isEqualTo("Khách để nhiệt độ thường.");
    }

    /** Spec §8: a suspended stall can still answer a report. */
    @Test
    void aSuspendedStallCanStillReply() {
        when(farmers.findByUserId(STALL_OWNER)).thenReturn(Optional.of(stall(ApprovalStatus.SUSPENDED)));

        service.respond(STALL_OWNER, REPORT, "Hàng giao đúng hạn.");

        verify(reports).saveAndFlush(report);
    }

    /** R-06: another stall's report is a 403 even though it exists. */
    @Test
    void anotherStallsReportIs403() {
        report.setFarmerId(99L);

        assertThatThrownBy(() -> service.respond(STALL_OWNER, REPORT, "x"))
                .isInstanceOf(QualityReportNotYoursException.class);
        verify(reports, never()).saveAndFlush(any());
    }

    /** Review Focus #1: the reply can be edited until an admin decides, not after. */
    @Test
    void aDecidedReportCannotBeAnsweredAnyMore() {
        report.setStatus(QualityReportStatus.CONFIRMED);

        assertThatThrownBy(() -> service.respond(STALL_OWNER, REPORT, "x"))
                .isInstanceOf(ReportAlreadyDecidedException.class);
        verify(reports, never()).saveAndFlush(any());
    }

    @Test
    void aMissingReportIs404() {
        when(reports.lockById(REPORT)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.respond(STALL_OWNER, REPORT, "x"))
                .isInstanceOf(QualityReportNotFoundException.class);
    }

    @Test
    void anAccountWithoutAStallIs403() {
        when(farmers.findByUserId(STALL_OWNER)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.list(STALL_OWNER, 1, 20))
                .isInstanceOf(AccessDeniedException.class);
    }
}
```

`QualityReportQueryRepositoryTest.java` (MySQL):

```java
package com.techx.intervue.modules.quality.repositories;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.quality.QualityFixture;
import com.techx.intervue.modules.quality.resources.QualityReportResource;
import com.techx.intervue.resources.PageResource;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

/** FR-122, FR-123: the reports as the stall and the admin read them, against real MySQL. */
@SpringBootTest
@Transactional
class QualityReportQueryRepositoryTest {

    private static final LocalDate PICKUP = LocalDate.of(2026, 10, 3);

    @Autowired private QualityReportQueryRepository queries;
    @Autowired private JdbcTemplate jdbc;

    private QualityFixture fx;
    private long customer;
    private long admin;
    private long stallA;
    private long stallB;
    private long category;
    private long market;

    @BeforeEach
    void setUp() {
        fx = new QualityFixture(jdbc);
        customer = fx.base.user("customer", "Buyer", "x");
        admin = fx.base.user("admin", "Admin", "x");
        stallA = fx.base.farmer(fx.base.user("farmer", "Seller A", "x"), "Stall A", "approved");
        stallB = fx.base.farmer(fx.base.user("farmer", "Seller B", "x"), "Stall B", "approved");
        category = fx.base.category();
        market = fx.base.market("Market");
    }

    private long reportAt(
            long stall, String product, String status, boolean extended, int minutesAgo) {
        long order = fx.base.order(customer, stall, market, "completed", 1, PICKUP);
        long item =
                fx.line(order, fx.base.product(stall, category, product, 1), PICKUP.plusDays(4), extended);
        return fx.report(item, status, true, minutesAgo);
    }

    private static Instant since() {
        return Instant.now().minus(Duration.ofDays(90));
    }

    @Test
    void aStallSeesOnlyItsOwnReportsNewestFirst() {
        long older = reportAt(stallA, "Rau muống", "open", true, 30);
        long newer = reportAt(stallA, "Cải ngọt", "confirmed", false, 5);
        reportAt(stallB, "Xoài", "open", true, 1);

        PageResource<QualityReportResource> page = queries.forStall(stallA, since(), 0, 20);

        assertThat(page.total()).isEqualTo(2);
        assertThat(page.items()).extracting(QualityReportResource::id).containsExactly(newer, older);
        QualityReportResource row = page.items().get(1);
        assertThat(row.stallName()).startsWith("Stall A");
        assertThat(row.stallStatus()).isEqualTo("approved");
        assertThat(row.customerName()).startsWith("Buyer");
        assertThat(row.pickupDate()).isEqualTo("2026-10-03");
        assertThat(row.bestBefore()).isEqualTo("2026-10-07");
        assertThat(row.storageMode()).isEqualTo("chilled");
        assertThat(row.shelfLifeExtended()).isTrue();
        assertThat(row.extendedByDays()).isEqualTo(2);
        assertThat(row.status()).isEqualTo("open");
        assertThat(row.problem()).isEqualTo("mold");
    }

    /** Spec §4.4.3: the card shows the stall's strikes inside the 90-day window only. */
    @Test
    void eachRowCountsTheStallsStrikesInsideTheWindow() {
        long report = reportAt(stallA, "Rau muống", "confirmed", true, 10);
        fx.strike(report, admin, 1);
        fx.strike(reportAt(stallA, "Cải ngọt", "confirmed", true, 20), admin, 91);

        assertThat(queries.findById(report, since()))
                .map(QualityReportResource::stallActiveStrikes)
                .contains(1);
    }
}
```

Thêm vào `QualityExceptionHandlerTest` (import 3 exception mới):

```java
    @Test
    void aReportOfAnotherStallIs403AndAMissingOneIs404() {
        assertError(handler.notYours(new QualityReportNotYoursException()), 403, "FORBIDDEN");
        assertError(handler.notFound(new QualityReportNotFoundException()), 404, "NOT_FOUND");
    }

    @Test
    void aDecidedReportIs409() {
        assertError(
                handler.alreadyDecided(new ReportAlreadyDecidedException()),
                409,
                "REPORT_ALREADY_DECIDED");
    }
```

`QualityExceptionHandlerScopeTest`: thêm `FarmerQualityReportController.class` vào danh sách. `QualityControllerAccessTest`: thêm

```java
    @Test
    void onlyFarmersReadAndAnswerTheirReports() {
        assertThat(rule(FarmerQualityReportController.class)).isEqualTo("hasRole('FARMER')");
    }
```

- [ ] **Step 2: Chạy test để thấy fail**

Run: lệnh test backend với `-Dtest='ShelfLifeStandingServiceTest,FarmerQualityReportServiceTest,QualityReportQueryRepositoryTest,QualityExceptionHandlerTest,QualityExceptionHandlerScopeTest,QualityControllerAccessTest'`.
Expected: FAIL lúc biên dịch, `cannot find symbol: class ShelfLifeStandingService`.

- [ ] **Step 3: Viết resource, request và exception**

`quality/resources/QualityReportResource.java`:

```java
package com.techx.intervue.modules.quality.resources;

import java.time.Instant;

/**
 * FR-122, FR-123: one spoilage report as the stall and the admin read it. Dates are "yyyy-MM-dd";
 * {@code …At} are instants. {@code stallStatus} is the stall's approval status (the admin's
 * "Suspend stall" button needs {@code approved}); {@code stallActiveStrikes} counts the stall's
 * strikes of the last 90 days.
 */
public record QualityReportResource(
        Long id,
        Long orderId,
        String orderCode,
        Long farmerId,
        String stallName,
        String stallStatus,
        String customerName,
        Long productId,
        String productName,
        String pickupDate,
        String bestBefore,
        String storageMode,
        String spoiledOn,
        boolean beforePromise,
        String problem,
        String note,
        String photoUrl,
        boolean shelfLifeExtended,
        int extendedByDays,
        String status,
        String farmerResponse,
        Instant farmerRespondedAt,
        String decisionNote,
        Instant decidedAt,
        Instant createdAt,
        int stallActiveStrikes) {}
```

`quality/resources/ShelfLifeStandingResource.java`:

```java
package com.techx.intervue.modules.quality.resources;

import java.time.Instant;

/**
 * FR-123 (spec §4.4.4): the stall's strikes of the last {@code windowDays} days; from {@code
 * limit} strikes {@code extensionLockedUntil} says when the lock on longer shelf lives ends, null
 * otherwise.
 */
public record ShelfLifeStandingResource(
        int activeViolations, int limit, int windowDays, Instant extensionLockedUntil) {}
```

`quality/resources/FarmerQualityReportsResource.java`:

```java
package com.techx.intervue.modules.quality.resources;

import com.techx.intervue.resources.PageResource;

/** GET /farmer/quality-reports: the stall's strikes and a page of the reports about it. */
public record FarmerQualityReportsResource(
        ShelfLifeStandingResource standing, PageResource<QualityReportResource> reports) {}
```

`quality/requests/FarmerResponseRequest.java`:

```java
package com.techx.intervue.modules.quality.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** PUT /farmer/quality-reports/{id}/response (spec §4.4.2): one reply, at most 500 characters. */
public record FarmerResponseRequest(
        @NotBlank(message = "Write a reply first.")
                @Size(max = 500, message = "Keep the reply under 500 characters.")
                String response) {}
```

`quality/exceptions/QualityReportNotFoundException.java`:

```java
package com.techx.intervue.modules.quality.exceptions;

/** 404: no report with this id. */
public class QualityReportNotFoundException extends RuntimeException {
    public QualityReportNotFoundException() {
        super("Report not found.");
    }
}
```

`quality/exceptions/QualityReportNotYoursException.java`:

```java
package com.techx.intervue.modules.quality.exceptions;

/** R-06: the report is about another stall — 403, never 404. */
public class QualityReportNotYoursException extends RuntimeException {
    public QualityReportNotYoursException() {
        super("This report is about another stall.");
    }
}
```

`quality/exceptions/ReportAlreadyDecidedException.java`:

```java
package com.techx.intervue.modules.quality.exceptions;

/** A decided report is final: no reply edit, no second decision — 409 REPORT_ALREADY_DECIDED. */
public class ReportAlreadyDecidedException extends RuntimeException {
    public ReportAlreadyDecidedException() {
        super("An admin has already decided on this report.");
    }
}
```

- [ ] **Step 4: Viết repository đọc**

`quality/repositories/QualityReportQueryRepository.java`:

```java
package com.techx.intervue.modules.quality.repositories;

import com.techx.intervue.modules.quality.resources.QualityReportResource;
import com.techx.intervue.resources.PageResource;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * FR-122, FR-123: spoilage reports as the stall and the admin read them — joined with the order,
 * the line's promise, the stall and the customer, plus the stall's strikes inside the window.
 * Filters are bound values only (R-04); the order is fixed, newest first.
 */
@Repository
@RequiredArgsConstructor
public class QualityReportQueryRepository {

    static final String COLUMNS =
            """
            SELECT qr.id, qr.order_id, o.order_code, qr.farmer_id, f.stall_name,
                   f.approval_status, cu.full_name AS customer_name, qr.product_id,
                   oi.product_name, o.pickup_date, oi.best_before, oi.storage_mode,
                   qr.spoiled_on, qr.before_promise, qr.problem, qr.note, qr.photo_url,
                   qr.shelf_life_extended, qr.extended_by_days, qr.status, qr.farmer_response,
                   qr.farmer_responded_at, qr.decision_note, qr.decided_at, qr.created_at,
                   (SELECT COUNT(*) FROM farmer_violations v
                     WHERE v.farmer_id = qr.farmer_id AND v.created_at > :since) AS active_strikes
            FROM quality_reports qr
            JOIN orders o ON o.id = qr.order_id
            JOIN order_items oi ON oi.id = qr.order_item_id
            JOIN farmer_profiles f ON f.id = qr.farmer_id
            JOIN users cu ON cu.id = qr.customer_id
            """;

    static final String STALL_FILTER = "WHERE qr.farmer_id = :farmerId\n";

    static final String NEWEST_FIRST =
            "ORDER BY qr.created_at DESC, qr.id DESC\nLIMIT :limit OFFSET :offset";

    private final NamedParameterJdbcTemplate jdbc;

    /** The reports about one stall (farmer_profiles.id), newest first. */
    public PageResource<QualityReportResource> forStall(
            long farmerId, Instant since, int offset, int limit) {
        return page(
                STALL_FILTER, new MapSqlParameterSource("farmerId", farmerId), since, offset, limit);
    }

    public Optional<QualityReportResource> findById(long reportId, Instant since) {
        MapSqlParameterSource params =
                new MapSqlParameterSource()
                        .addValue("id", reportId)
                        .addValue("since", Timestamp.from(since));
        return jdbc.query(COLUMNS + "WHERE qr.id = :id", params, (rs, i) -> row(rs)).stream()
                .findFirst();
    }

    private PageResource<QualityReportResource> page(
            String filter, MapSqlParameterSource params, Instant since, int offset, int limit) {
        Long total =
                jdbc.queryForObject(
                        "SELECT COUNT(*) FROM quality_reports qr " + filter, params, Long.class);
        params.addValue("since", Timestamp.from(since))
                .addValue("limit", limit)
                .addValue("offset", offset);
        List<QualityReportResource> items =
                jdbc.query(COLUMNS + filter + NEWEST_FIRST, params, (rs, i) -> row(rs));
        return new PageResource<>(items, offset / limit + 1, limit, total == null ? 0 : total);
    }

    private static QualityReportResource row(ResultSet rs) throws SQLException {
        LocalDate bestBefore = rs.getObject("best_before", LocalDate.class);
        return new QualityReportResource(
                rs.getLong("id"),
                rs.getLong("order_id"),
                rs.getString("order_code"),
                rs.getLong("farmer_id"),
                rs.getString("stall_name"),
                rs.getString("approval_status"),
                rs.getString("customer_name"),
                rs.getLong("product_id"),
                rs.getString("product_name"),
                rs.getObject("pickup_date", LocalDate.class).toString(),
                bestBefore == null ? null : bestBefore.toString(),
                rs.getString("storage_mode"),
                rs.getObject("spoiled_on", LocalDate.class).toString(),
                rs.getBoolean("before_promise"),
                rs.getString("problem"),
                rs.getString("note"),
                rs.getString("photo_url"),
                rs.getBoolean("shelf_life_extended"),
                rs.getInt("extended_by_days"),
                rs.getString("status"),
                rs.getString("farmer_response"),
                instant(rs, "farmer_responded_at"),
                rs.getString("decision_note"),
                instant(rs, "decided_at"),
                instant(rs, "created_at"),
                rs.getInt("active_strikes"));
    }

    /** TIMESTAMP columns are already a UTC instant (C5-15): {@code toInstant()} is enough. */
    private static Instant instant(ResultSet rs, String column) throws SQLException {
        Timestamp ts = rs.getTimestamp(column);
        return ts == null ? null : ts.toInstant();
    }
}
```

- [ ] **Step 5: Viết hai service**

`quality/services/interfaces/ShelfLifeStandingServiceInterface.java`:

```java
package com.techx.intervue.modules.quality.services.interfaces;

import com.techx.intervue.modules.quality.resources.ShelfLifeStandingResource;

public interface ShelfLifeStandingServiceInterface {

    /** FR-123 (spec §4.4.4): strikes of the last 90 days and, from 3, when the lock ends. */
    ShelfLifeStandingResource standing(long farmerId);
}
```

`quality/services/impl/ShelfLifeStandingService.java`:

```java
package com.techx.intervue.modules.quality.services.impl;

import com.techx.intervue.modules.quality.repositories.FarmerViolationRepository;
import com.techx.intervue.modules.quality.resources.ShelfLifeStandingResource;
import com.techx.intervue.modules.quality.services.interfaces.ShelfLifeStandingServiceInterface;
import java.time.Instant;
import java.time.Clock;
import java.util.List;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * FR-123 (spec §4.4.4): the lock on longer shelf lives is never stored; it is read from the
 * strikes of the last 90 days every time, so it ends by itself and cannot drift from them.
 */
@Service
@AllArgsConstructor
public class ShelfLifeStandingService implements ShelfLifeStandingServiceInterface {

    private final FarmerViolationRepository violations;
    private final Clock clock;

    @Override
    @Transactional(readOnly = true)
    public ShelfLifeStandingResource standing(long farmerId) {
        List<Instant> active =
                violations.activeTimes(farmerId, SpoilagePolicy.strikeWindowStart(clock.instant()));
        return new ShelfLifeStandingResource(
                active.size(),
                SpoilagePolicy.STRIKES_TO_LOCK,
                SpoilagePolicy.STRIKE_WINDOW_DAYS,
                SpoilagePolicy.lockedUntil(active));
    }
}
```

`quality/services/interfaces/FarmerQualityReportServiceInterface.java`:

```java
package com.techx.intervue.modules.quality.services.interfaces;

import com.techx.intervue.modules.quality.resources.FarmerQualityReportsResource;
import com.techx.intervue.modules.quality.resources.QualityReportResource;

public interface FarmerQualityReportServiceInterface {

    /** The reports about the caller's own stall, newest first, with its strikes. */
    FarmerQualityReportsResource list(long farmerUserId, int page, int pageSize);

    /** Writes or replaces the stall's reply while the report is open (spec §4.4.2). */
    QualityReportResource respond(long farmerUserId, long reportId, String response);
}
```

`quality/services/impl/FarmerQualityReportService.java`:

```java
package com.techx.intervue.modules.quality.services.impl;

import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.quality.entities.QualityReport;
import com.techx.intervue.modules.quality.exceptions.QualityReportNotFoundException;
import com.techx.intervue.modules.quality.exceptions.QualityReportNotYoursException;
import com.techx.intervue.modules.quality.exceptions.ReportAlreadyDecidedException;
import com.techx.intervue.modules.quality.repositories.QualityReportQueryRepository;
import com.techx.intervue.modules.quality.repositories.QualityReportRepository;
import com.techx.intervue.modules.quality.resources.FarmerQualityReportsResource;
import com.techx.intervue.modules.quality.resources.QualityReportResource;
import com.techx.intervue.modules.quality.services.interfaces.FarmerQualityReportServiceInterface;
import com.techx.intervue.modules.quality.services.interfaces.ShelfLifeStandingServiceInterface;
import java.time.Clock;
import java.time.Instant;
import java.util.Objects;
import lombok.AllArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * FR-122 (spec §4.4.2): the stall reads the reports about it and keeps one reply per report,
 * editable until an admin decides. A suspended stall may still reply (spec §8), so there is no
 * approval check here.
 */
@Service
@AllArgsConstructor
public class FarmerQualityReportService implements FarmerQualityReportServiceInterface {

    private static final int MAX_PAGE_SIZE = 50;

    private final FarmerProfileRepository farmers;
    private final QualityReportRepository reports;
    private final QualityReportQueryRepository queries;
    private final ShelfLifeStandingServiceInterface standing;
    private final Clock clock;

    @Override
    @Transactional(readOnly = true)
    public FarmerQualityReportsResource list(long farmerUserId, int page, int pageSize) {
        FarmerProfile stall = stallOf(farmerUserId);
        int safePage = Math.max(1, page);
        int safeSize = Math.min(MAX_PAGE_SIZE, Math.max(1, pageSize));
        return new FarmerQualityReportsResource(
                standing.standing(stall.getId()),
                queries.forStall(
                        stall.getId(),
                        SpoilagePolicy.strikeWindowStart(clock.instant()),
                        (safePage - 1) * safeSize,
                        safeSize));
    }

    @Override
    @Transactional
    public QualityReportResource respond(long farmerUserId, long reportId, String response) {
        FarmerProfile stall = stallOf(farmerUserId);
        // Locked: an admin deciding at the same moment either sees this reply or refuses it
        QualityReport report =
                reports.lockById(reportId).orElseThrow(QualityReportNotFoundException::new);
        if (!Objects.equals(report.getFarmerId(), stall.getId())) {
            throw new QualityReportNotYoursException();
        }
        if (!report.isOpen()) {
            throw new ReportAlreadyDecidedException();
        }
        Instant now = clock.instant();
        report.setFarmerResponse(response.trim());
        report.setFarmerRespondedAt(now);
        reports.saveAndFlush(report);
        return queries.findById(reportId, SpoilagePolicy.strikeWindowStart(now))
                .orElseThrow(QualityReportNotFoundException::new);
    }

    /** R-06: the stall always comes from the caller's own account, never from the request. */
    private FarmerProfile stallOf(long farmerUserId) {
        return farmers.findByUserId(farmerUserId)
                .orElseThrow(() -> new AccessDeniedException("No stall for this account."));
    }
}
```

- [ ] **Step 6: Viết controller và nối lỗi**

`quality/controllers/FarmerQualityReportController.java`:

```java
package com.techx.intervue.modules.quality.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.quality.requests.FarmerResponseRequest;
import com.techx.intervue.modules.quality.resources.FarmerQualityReportsResource;
import com.techx.intervue.modules.quality.resources.QualityReportResource;
import com.techx.intervue.modules.quality.services.interfaces.FarmerQualityReportServiceInterface;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import com.techx.intervue.resources.ApiResource;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** FR-122 — the stall's spoilage reports (spec §4.4.2, §6). */
@RestController
@RequestMapping("/api/v1/farmer/quality-reports")
@PreAuthorize("hasRole('FARMER')")
@AllArgsConstructor
public class FarmerQualityReportController extends BaseController {

    private final FarmerQualityReportServiceInterface reports;

    @GetMapping
    public ResponseEntity<ApiResource<FarmerQualityReportsResource>> mine(
            @AuthenticationPrincipal CustomUserDetails user,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize) {
        return ok(reports.list(user.getId(), page, pageSize), "Reports loaded.");
    }

    @PutMapping("/{id}/response")
    public ResponseEntity<ApiResource<QualityReportResource>> respond(
            @PathVariable long id,
            @Valid @RequestBody FarmerResponseRequest request,
            @AuthenticationPrincipal CustomUserDetails user) {
        return ok(reports.respond(user.getId(), id, request.response()), "Reply saved.");
    }
}
```

Trong `QualityExceptionHandler` (import `QualityReportNotFoundException`, `QualityReportNotYoursException`, `ReportAlreadyDecidedException`):
1. `assignableTypes` thêm `FarmerQualityReportController.class`.
2. Dòng `@ExceptionHandler({OrderNotFoundException.class, ReportedItemNotFoundException.class})` thành `@ExceptionHandler({OrderNotFoundException.class, ReportedItemNotFoundException.class, QualityReportNotFoundException.class})`.
3. Dòng `@ExceptionHandler(OrderNotYoursException.class)` thành `@ExceptionHandler({OrderNotYoursException.class, QualityReportNotYoursException.class})`.
4. Thêm sau `alreadyReported(...)`:

```java
    /** Spec §4.4.2, §4.4.3: a decided report is final. */
    @ExceptionHandler(ReportAlreadyDecidedException.class)
    ResponseEntity<ApiResource<Void>> alreadyDecided(ReportAlreadyDecidedException e) {
        return error(HttpStatus.CONFLICT, "REPORT_ALREADY_DECIDED", e.getMessage(), List.of());
    }
```

- [ ] **Step 7: Chạy lại test**

Run: lệnh test backend với `-Dtest='ShelfLifeStandingServiceTest,FarmerQualityReportServiceTest,QualityReportQueryRepositoryTest,QualityExceptionHandlerTest,QualityExceptionHandlerScopeTest,QualityControllerAccessTest'`.
Expected: toàn bộ PASS.

- [ ] **Step 8: Format và commit**

```bash
docker compose exec -T -e MAVEN_OPTS=-Xmx256m backend ./mvnw -B -q spotless:apply
git add backend/src/main/java/com/techx/intervue/modules/quality \
  backend/src/test/java/com/techx/intervue/modules/quality
git commit -m "feat(FR-122): stalls read their spoilage reports and reply until an admin decides"
```

---

### Task 8: Admin xử lý báo hư, ghi lỗi và đưa sản phẩm về mốc gợi ý (FR-123)

**Files:**
- Create: `backend/src/main/java/com/techx/intervue/modules/quality/requests/DecisionRequest.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/quality/services/interfaces/AdminQualityReportServiceInterface.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/quality/services/impl/AdminQualityReportService.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/quality/controllers/AdminQualityReportController.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/quality/repositories/QualityReportQueryRepository.java` (thêm `forAdmin`)
- Modify: `backend/src/main/java/com/techx/intervue/modules/quality/controllers/QualityExceptionHandler.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/quality/services/impl/AdminQualityReportServiceTest.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/quality/services/impl/AdminQualityDecisionFlowTest.java`
- Test: `QualityReportQueryRepositoryTest`, `QualityExceptionHandlerTest`, `QualityExceptionHandlerScopeTest`, `QualityControllerAccessTest` (sửa)

**Interfaces:**
- Consumes: Task 1 (`QualityReport.decide`, `FarmerViolation`, `lockById`, `activeTimes`), Task 2 (`SpoilagePolicy`), Task 3 (`QUALITY_DECIDED`, `SHELF_LIFE_VIOLATION`, `SHELF_LIFE_LOCKED` và tên tham số), Task 5 (`QualityLinks`), Task 7 (`QualityReportResource`, `QualityReportQueryRepository.findById`, exception, `ShelfLifeStandingServiceInterface`); `ProductRepository.lockAllById(Collection<Long>)` (cùng đường khoá với `OrderService.place`), các field giai đoạn 1 của `Product`: `isShelfLifeExtended()`, `getSuggestedShelfLifeDays()`, `setShelfLifeDays(int)`, `setShelfLifeExtended(boolean)`, `setShelfLifeAckAt(LocalDateTime)`.
- Produces:
  - `record DecisionRequest(String note)` (≤ 255).
  - `AdminQualityReportServiceInterface`: `PageResource<QualityReportResource> list(String status, Boolean escalated, int page, int pageSize)`, `QualityReportResource confirm(long adminId, long reportId, String note)`, `QualityReportResource dismiss(long adminId, long reportId, String note)`.
  - `QualityReportQueryRepository.forAdmin(String status, boolean decided, Boolean escalated, Instant since, int offset, int limit)`.
  - REST (vai `ADMIN`): `GET /api/v1/admin/quality-reports?status=&escalated=&page=&pageSize=`; `PATCH /api/v1/admin/quality-reports/{id}/confirm` và `/dismiss`, body `{ note }` → `QualityReportResource` (Ruling 6, 7).

- [ ] **Step 1: Viết test service (sẽ fail)**

`AdminQualityReportServiceTest.java`:

```java
package com.techx.intervue.modules.quality.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.notification.enums.NotificationKind;
import com.techx.intervue.modules.notification.services.interfaces.NotificationServiceInterface;
import com.techx.intervue.modules.order.entities.Order;
import com.techx.intervue.modules.order.entities.OrderItem;
import com.techx.intervue.modules.order.repositories.OrderItemRepository;
import com.techx.intervue.modules.order.repositories.OrderRepository;
import com.techx.intervue.modules.product.entities.Product;
import com.techx.intervue.modules.product.repositories.ProductRepository;
import com.techx.intervue.modules.quality.entities.FarmerViolation;
import com.techx.intervue.modules.quality.entities.QualityReport;
import com.techx.intervue.modules.quality.enums.QualityReportStatus;
import com.techx.intervue.modules.quality.exceptions.QualityReportNotFoundException;
import com.techx.intervue.modules.quality.exceptions.ReportAlreadyDecidedException;
import com.techx.intervue.modules.quality.repositories.FarmerViolationRepository;
import com.techx.intervue.modules.quality.repositories.QualityReportQueryRepository;
import com.techx.intervue.modules.quality.repositories.QualityReportRepository;
import com.techx.intervue.modules.quality.resources.QualityReportResource;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

/** FR-123 (spec §4.4.3, §4.4.4): the admin's decision and what it does to the stall. */
class AdminQualityReportServiceTest {

    private static final long ADMIN = 99L;
    private static final long REPORT = 9L;
    private static final long CUSTOMER = 1L;
    private static final long FARMER_ID = 10L;
    private static final long STALL_OWNER = 30L;
    private static final long PRODUCT = 3L;
    private static final Clock CLOCK =
            Clock.fixed(Instant.parse("2026-10-06T03:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
    private static final Instant NOW = Instant.parse("2026-10-06T03:00:00Z");
    /** CLOCK minus 90 days. */
    private static final Instant SINCE = Instant.parse("2026-07-08T03:00:00Z");

    private QualityReportRepository reports;
    private QualityReportQueryRepository queries;
    private FarmerViolationRepository violations;
    private ProductRepository products;
    private FarmerProfileRepository farmers;
    private OrderRepository orders;
    private OrderItemRepository orderItems;
    private NotificationServiceInterface notifications;
    private AdminQualityReportService service;
    private QualityReport report;
    private Product product;

    @BeforeEach
    void setUp() {
        reports = mock(QualityReportRepository.class);
        queries = mock(QualityReportQueryRepository.class);
        violations = mock(FarmerViolationRepository.class);
        products = mock(ProductRepository.class);
        farmers = mock(FarmerProfileRepository.class);
        orders = mock(OrderRepository.class);
        orderItems = mock(OrderItemRepository.class);
        notifications = mock(NotificationServiceInterface.class);
        service =
                new AdminQualityReportService(
                        reports,
                        queries,
                        violations,
                        products,
                        farmers,
                        orders,
                        orderItems,
                        notifications,
                        CLOCK);

        // Rau muống set to 5 days against a suggestion of 3, spoiled before its date
        report = new QualityReport();
        report.setId(REPORT);
        report.setOrderId(21L);
        report.setOrderItemId(501L);
        report.setCustomerId(CUSTOMER);
        report.setFarmerId(FARMER_ID);
        report.setProductId(PRODUCT);
        report.setShelfLifeExtended(true);
        report.setExtendedByDays(2);
        report.setBeforePromise(true);
        product = new Product();
        product.setId(PRODUCT);
        product.setName("Rau muống");
        product.setShelfLifeDays(5);
        product.setSuggestedShelfLifeDays(3);
        product.setShelfLifeExtended(true);
        product.setShelfLifeAckAt(LocalDateTime.of(2026, 9, 27, 10, 0));
        Order order = new Order();
        order.setId(21L);
        order.setOrderCode("ML-20260920-0007");
        OrderItem line = new OrderItem();
        line.setId(501L);
        line.setProductName("Rau muống");

        when(reports.lockById(REPORT)).thenReturn(Optional.of(report));
        when(products.lockAllById(List.of(PRODUCT))).thenReturn(List.of(product));
        when(violations.activeTimes(FARMER_ID, SINCE)).thenReturn(List.of());
        when(orders.findById(21L)).thenReturn(Optional.of(order));
        when(orderItems.findById(501L)).thenReturn(Optional.of(line));
        when(farmers.findById(FARMER_ID))
                .thenReturn(
                        Optional.of(
                                FarmerProfile.builder()
                                        .id(FARMER_ID)
                                        .userId(STALL_OWNER)
                                        .stallName("Vườn Út Hiền")
                                        .contactPerson("Hiền")
                                        .approvalStatus(ApprovalStatus.APPROVED)
                                        .build()));
        when(queries.findById(eq(REPORT), any())).thenReturn(Optional.of(row("confirmed")));
    }

    private static QualityReportResource row(String status) {
        return new QualityReportResource(
                REPORT, 21L, "ML-20260920-0007", FARMER_ID, "Vườn Út Hiền", "approved",
                "Nguyễn Văn An", PRODUCT, "Rau muống", "2026-10-03", "2026-10-07", "chilled",
                "2026-10-05", true, "mold", null, null, true, 2, status, null, null, null, NOW,
                Instant.parse("2026-10-05T13:00:00Z"), 1);
    }

    /** Spec §4.4.3 steps 1–2: extended and spoiled early → a strike, back to the suggestion. */
    @Test
    void confirmingAnExtendedLineThatSpoiledEarlyRecordsAStrikeAndResetsTheProduct() {
        service.confirm(ADMIN, REPORT, "  Lá úng đen trước hạn  ");

        assertThat(report.getStatus()).isEqualTo(QualityReportStatus.CONFIRMED);
        assertThat(report.getDecidedBy()).isEqualTo(ADMIN);
        assertThat(report.getDecidedAt()).isEqualTo(NOW);
        assertThat(report.getDecisionNote()).isEqualTo("Lá úng đen trước hạn");
        ArgumentCaptor<FarmerViolation> strike = ArgumentCaptor.forClass(FarmerViolation.class);
        verify(violations).saveAndFlush(strike.capture());
        assertThat(strike.getValue().getFarmerId()).isEqualTo(FARMER_ID);
        assertThat(strike.getValue().getQualityReportId()).isEqualTo(REPORT);
        assertThat(strike.getValue().getProductId()).isEqualTo(PRODUCT);
        assertThat(strike.getValue().getExtendedByDays()).isEqualTo(2);
        assertThat(strike.getValue().getCreatedBy()).isEqualTo(ADMIN);
        assertThat(strike.getValue().getCreatedAt()).isEqualTo(NOW);
        assertThat(product.getShelfLifeDays()).isEqualTo(3);
        assertThat(product.isShelfLifeExtended()).isFalse();
        assertThat(product.getShelfLifeAckAt()).isNull();
        verify(notifications)
                .dispatch(
                        eq(List.of(STALL_OWNER)),
                        argThat(
                                e ->
                                        e.kind() == NotificationKind.SHELF_LIFE_VIOLATION
                                                && e.link().equals("/farmer/products/3/edit")
                                                && e.params().get("count").equals("1")));
        verify(notifications, never())
                .dispatch(any(), argThat(e -> e.kind() == NotificationKind.SHELF_LIFE_LOCKED));
    }

    /** Spec §4.4.3: a line within its suggestion only closes the report. */
    @Test
    void confirmingALineWithinItsSuggestionOnlyClosesTheReport() {
        report.setShelfLifeExtended(false);
        report.setExtendedByDays(0);

        service.confirm(ADMIN, REPORT, null);

        assertThat(report.getStatus()).isEqualTo(QualityReportStatus.CONFIRMED);
        verify(violations, never()).saveAndFlush(any());
        verify(products, never()).lockAllById(any());
    }

    @Test
    void spoiledAfterItsDateIsNotAStrike() {
        report.setBeforePromise(false);

        service.confirm(ADMIN, REPORT, null);

        verify(violations, never()).saveAndFlush(any());
    }

    /** Ruling 8: a stall that already went back down keeps its own number. */
    @Test
    void aProductNoLongerExtendedKeepsItsShelfLife() {
        product.setShelfLifeDays(2);
        product.setShelfLifeExtended(false);

        service.confirm(ADMIN, REPORT, null);

        assertThat(product.getShelfLifeDays()).isEqualTo(2);
        verify(products, never()).saveAndFlush(any());
    }

    /** Spec §4.4.3 step 3: the third strike in 90 days locks longer shelf lives. */
    @Test
    void theThirdStrikeLocksLongerShelfLivesAndSaysUntilWhen() {
        when(violations.activeTimes(FARMER_ID, SINCE))
                .thenReturn(
                        List.of(
                                Instant.parse("2026-10-01T03:00:00Z"),
                                Instant.parse("2026-09-10T03:00:00Z")));

        service.confirm(ADMIN, REPORT, null);

        verify(notifications)
                .dispatch(
                        eq(List.of(STALL_OWNER)),
                        argThat(
                                e ->
                                        e.kind() == NotificationKind.SHELF_LIFE_LOCKED
                                                && e.link().equals("/farmer")
                                                && e.params().get("until").equals("09/12/2026")));
    }

    @Test
    void theCustomerAndTheStallAreToldOfTheDecision() {
        service.confirm(ADMIN, REPORT, null);

        verify(notifications)
                .dispatch(
                        eq(List.of(CUSTOMER)),
                        argThat(
                                e ->
                                        e.kind() == NotificationKind.QUALITY_DECIDED
                                                && e.link().equals("/orders/21")
                                                && e.params().get("product").equals("Rau muống")
                                                && e.params()
                                                        .get("order")
                                                        .equals("ML-20260920-0007")));
        verify(notifications)
                .dispatch(
                        eq(List.of(STALL_OWNER)),
                        argThat(
                                e ->
                                        e.kind() == NotificationKind.QUALITY_DECIDED
                                                && e.link().equals("/farmer/reviews?tab=spoiled")));
    }

    /** Spec §4.4.3: "Not the stall's fault" needs a note. */
    @Test
    void dismissingNeedsANote() {
        assertThatThrownBy(() -> service.dismiss(ADMIN, REPORT, "   "))
                .isInstanceOf(InvalidFieldException.class)
                .extracting("field")
                .isEqualTo("note");
        verify(reports, never()).lockById(anyLong());
    }

    @Test
    void dismissingClosesTheReportWithoutAStrike() {
        service.dismiss(ADMIN, REPORT, "Khách để nhiệt độ thường.");

        assertThat(report.getStatus()).isEqualTo(QualityReportStatus.DISMISSED);
        assertThat(report.getDecisionNote()).isEqualTo("Khách để nhiệt độ thường.");
        verify(violations, never()).saveAndFlush(any());
        verify(notifications)
                .dispatch(
                        eq(List.of(CUSTOMER)),
                        argThat(e -> e.kind() == NotificationKind.QUALITY_DECIDED));
    }

    /** Review Focus #1: the second of two admins gets a 409 and records nothing. */
    @Test
    void aDecidedReportCannotBeDecidedAgain() {
        report.setStatus(QualityReportStatus.CONFIRMED);

        assertThatThrownBy(() -> service.confirm(ADMIN, REPORT, null))
                .isInstanceOf(ReportAlreadyDecidedException.class);
        assertThatThrownBy(() -> service.dismiss(ADMIN, REPORT, "x"))
                .isInstanceOf(ReportAlreadyDecidedException.class);
        verify(violations, never()).saveAndFlush(any());
    }

    @Test
    void aMissingReportIs404() {
        when(reports.lockById(REPORT)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.confirm(ADMIN, REPORT, null))
                .isInstanceOf(QualityReportNotFoundException.class);
    }

    /** Ruling 6: the queue filters are whitelisted; "decided" means confirmed or dismissed. */
    @Test
    void theQueueFiltersAreWhitelisted() {
        service.list("decided", null, 1, 20);
        verify(queries).forAdmin(null, true, null, SINCE, 0, 20);

        service.list(" OPEN ", true, 2, 10);
        verify(queries).forAdmin("open", false, true, SINCE, 10, 10);

        assertThatThrownBy(() -> service.list("nope", null, 1, 20))
                .isInstanceOf(InvalidFieldException.class)
                .extracting("field")
                .isEqualTo("status");
    }
}
```

- [ ] **Step 2: Viết test MySQL của luồng xác nhận (sẽ fail)**

`AdminQualityDecisionFlowTest.java`:

```java
package com.techx.intervue.modules.quality.services.impl;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.quality.QualityFixture;
import com.techx.intervue.modules.quality.resources.QualityReportResource;
import com.techx.intervue.modules.quality.resources.ShelfLifeStandingResource;
import com.techx.intervue.modules.quality.services.interfaces.AdminQualityReportServiceInterface;
import com.techx.intervue.modules.quality.services.interfaces.ShelfLifeStandingServiceInterface;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneId;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

/** FR-123 (spec §9): confirming a violation, strikes in 90 days and the lock, on real MySQL. */
@SpringBootTest
@Transactional
class AdminQualityDecisionFlowTest {

    private static final LocalDate TODAY = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));

    @Autowired private AdminQualityReportServiceInterface decisions;
    @Autowired private ShelfLifeStandingServiceInterface standing;
    @Autowired private JdbcTemplate jdbc;

    private QualityFixture fx;
    private long admin;
    private long farmer;
    private long category;
    private long order;

    @BeforeEach
    void setUp() {
        fx = new QualityFixture(jdbc);
        long customer = fx.base.user("customer", "Buyer", "x");
        admin = fx.base.user("admin", "Admin", "x");
        farmer = fx.base.farmer(fx.base.user("farmer", "Seller", "x"), "Stall", "approved");
        category = fx.base.category();
        order =
                fx.base.order(
                        customer,
                        farmer,
                        fx.base.market("Market"),
                        "completed",
                        3,
                        TODAY.minusDays(3));
    }

    /** A line of a product the stall set to 5 days against a suggestion of 3. */
    private long extendedLine(String name) {
        long product = fx.base.product(farmer, category, name, 1);
        fx.shelfLife(product, null, 5, 3);
        return fx.line(order, product, TODAY.plusDays(1), true);
    }

    private long productOf(long line) {
        return jdbc.queryForObject("SELECT product_id FROM order_items WHERE id = ?", Long.class, line);
    }

    /** Spec §9: confirming the violation puts the product back to its suggestion. */
    @Test
    void confirmingAnExtendedReportResetsTheProductAndRecordsAStrike() {
        long line = extendedLine("Rau muống");
        long report = fx.report(line, "open", true, 5);

        QualityReportResource decided = decisions.confirm(admin, report, "Lá úng đen trước hạn");

        assertThat(decided.status()).isEqualTo("confirmed");
        assertThat(decided.stallActiveStrikes()).isEqualTo(1);
        long product = productOf(line);
        assertThat(jdbc.queryForObject("SELECT shelf_life_days FROM products WHERE id = ?", Integer.class, product))
                .isEqualTo(3);
        assertThat(jdbc.queryForObject("SELECT shelf_life_extended FROM products WHERE id = ?", Boolean.class, product))
                .isFalse();
        assertThat(jdbc.queryForObject("SELECT shelf_life_ack_at FROM products WHERE id = ?", Timestamp.class, product))
                .isNull();
        assertThat(
                        jdbc.queryForObject(
                                "SELECT COUNT(*) FROM farmer_violations WHERE quality_report_id = ?",
                                Integer.class,
                                report))
                .isEqualTo(1);
    }

    /** Spec §4.4.4, §9: three strikes inside 90 days lock; a strike of 95 days ago does not count. */
    @Test
    void theThirdStrikeInNinetyDaysLocksTheStall() {
        fx.strike(fx.report(extendedLine("Cải ngọt"), "confirmed", true, 60), admin, 20);
        fx.strike(fx.report(extendedLine("Mồng tơi"), "confirmed", true, 50), admin, 10);
        fx.strike(fx.report(extendedLine("Rau dền"), "confirmed", true, 40), admin, 95);
        long open = fx.report(extendedLine("Rau muống"), "open", true, 5);
        Timestamp oldestCounting =
                jdbc.queryForObject(
                        "SELECT MIN(created_at) FROM farmer_violations WHERE farmer_id = ?"
                                + " AND created_at > NOW() - INTERVAL 90 DAY",
                        Timestamp.class,
                        farmer);

        decisions.confirm(admin, open, null);

        ShelfLifeStandingResource s = standing.standing(farmer);
        assertThat(s.activeViolations()).isEqualTo(3);
        assertThat(s.extensionLockedUntil())
                .isEqualTo(oldestCounting.toInstant().plus(Duration.ofDays(90)));
    }

    /** Spec §4.4.3: within its suggestion — the report closes, the stall stays clean. */
    @Test
    void confirmingALineWithinItsSuggestionRecordsNothing() {
        long product = fx.base.product(farmer, category, "Rau lang", 1);
        long report = fx.report(fx.line(order, product, TODAY.plusDays(1), false), "open", true, 5);

        decisions.confirm(admin, report, null);

        assertThat(standing.standing(farmer).activeViolations()).isZero();
    }

    @Test
    void dismissingKeepsTheStallClean() {
        long report = fx.report(extendedLine("Rau muống"), "open", true, 5);

        QualityReportResource decided = decisions.dismiss(admin, report, "Khách để nhiệt độ thường.");

        assertThat(decided.status()).isEqualTo("dismissed");
        assertThat(standing.standing(farmer).activeViolations()).isZero();
    }
}
```

Thêm vào `QualityReportQueryRepositoryTest`:

```java
    /** Ruling 6: "Needs a decision", "All open" and "Decided". */
    @Test
    void theAdminQueueFiltersNeedsADecisionAllOpenAndDecided() {
        long needs = reportAt(stallA, "Rau muống", "open", true, 3);
        long open = reportAt(stallA, "Cải ngọt", "open", false, 2);
        long decided = reportAt(stallB, "Xoài", "dismissed", true, 1);

        assertThat(queries.forAdmin("open", false, true, since(), 0, 200).items())
                .extracting(QualityReportResource::id)
                .contains(needs)
                .doesNotContain(open, decided);
        assertThat(queries.forAdmin("open", false, null, since(), 0, 200).items())
                .extracting(QualityReportResource::id)
                .contains(needs, open)
                .doesNotContain(decided);
        assertThat(queries.forAdmin(null, true, null, since(), 0, 200).items())
                .extracting(QualityReportResource::id)
                .contains(decided)
                .doesNotContain(needs, open);
    }
```

Thêm vào `QualityExceptionHandlerTest`:

```java
    /** Review Focus #1: a second strike for the same report hits UNIQUE — 409, not 500. */
    @Test
    void aSecondStrikeForTheSameReportIs409() {
        assertError(
                handler.dataIntegrity(
                        violation(
                                "Duplicate entry '9' for key"
                                        + " 'farmer_violations.uq_farmer_violation_report'")),
                409,
                "REPORT_ALREADY_DECIDED");
    }
```

`QualityExceptionHandlerScopeTest`: thêm `AdminQualityReportController.class`. `QualityControllerAccessTest`: thêm

```java
    /** Spec §9 "Quyền": only an admin confirms or dismisses a report. */
    @Test
    void onlyAdminsDecideReports() {
        assertThat(rule(AdminQualityReportController.class)).isEqualTo("hasRole('ADMIN')");
    }
```

- [ ] **Step 3: Chạy test để thấy fail**

Run: lệnh test backend với `-Dtest='AdminQualityReportServiceTest,AdminQualityDecisionFlowTest,QualityReportQueryRepositoryTest,QualityExceptionHandlerTest,QualityExceptionHandlerScopeTest,QualityControllerAccessTest'`.
Expected: FAIL lúc biên dịch, `cannot find symbol: class AdminQualityReportService`.

- [ ] **Step 4: Thêm `forAdmin` vào repository đọc**

Trong `QualityReportQueryRepository`, sau hằng `STALL_FILTER`:

```java
    /** {@code :status} null = any; {@code :decided} = confirmed or dismissed (Ruling 6). */
    static final String ADMIN_FILTER =
            """
            WHERE (:status IS NULL OR qr.status = :status)
              AND (:decided = FALSE OR qr.status <> 'open')
              AND (:escalated IS NULL
                   OR (qr.shelf_life_extended = TRUE AND qr.before_promise = TRUE) = :escalated)
            """;
```

và sau hàm `forStall(...)`:

```java
    /** The admin queue (spec §4.4.3), newest first. */
    public PageResource<QualityReportResource> forAdmin(
            String status,
            boolean decided,
            Boolean escalated,
            Instant since,
            int offset,
            int limit) {
        MapSqlParameterSource params =
                new MapSqlParameterSource()
                        .addValue("status", status)
                        .addValue("decided", decided)
                        .addValue("escalated", escalated);
        return page(ADMIN_FILTER, params, since, offset, limit);
    }
```

- [ ] **Step 5: Viết request, service và controller**

`quality/requests/DecisionRequest.java`:

```java
package com.techx.intervue.modules.quality.requests;

import jakarta.validation.constraints.Size;

/**
 * PATCH /admin/quality-reports/{id}/confirm|dismiss (spec §4.4.3): optional when confirming,
 * required when dismissing (checked by the service, which answers 400 on {@code note}).
 */
public record DecisionRequest(
        @Size(max = 255, message = "Keep the note under 255 characters.") String note) {}
```

`quality/services/interfaces/AdminQualityReportServiceInterface.java`:

```java
package com.techx.intervue.modules.quality.services.interfaces;

import com.techx.intervue.modules.quality.resources.QualityReportResource;
import com.techx.intervue.resources.PageResource;

public interface AdminQualityReportServiceInterface {

    /** Status open, confirmed, dismissed or decided (Ruling 6); escalated null = any. */
    PageResource<QualityReportResource> list(
            String status, Boolean escalated, int page, int pageSize);

    /** Spec §4.4.3 "Xác nhận vi phạm": the note is optional. */
    QualityReportResource confirm(long adminId, long reportId, String note);

    /** Spec §4.4.3 "Không phải lỗi sạp": the note is required. */
    QualityReportResource dismiss(long adminId, long reportId, String note);
}
```

`quality/services/impl/AdminQualityReportService.java`:

```java
package com.techx.intervue.modules.quality.services.impl;

import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.notification.enums.NotificationKind;
import com.techx.intervue.modules.notification.resources.NotificationEvent;
import com.techx.intervue.modules.notification.services.interfaces.NotificationServiceInterface;
import com.techx.intervue.modules.order.entities.Order;
import com.techx.intervue.modules.order.entities.OrderItem;
import com.techx.intervue.modules.order.repositories.OrderItemRepository;
import com.techx.intervue.modules.order.repositories.OrderRepository;
import com.techx.intervue.modules.product.entities.Product;
import com.techx.intervue.modules.product.repositories.ProductRepository;
import com.techx.intervue.modules.quality.entities.FarmerViolation;
import com.techx.intervue.modules.quality.entities.QualityReport;
import com.techx.intervue.modules.quality.enums.QualityReportStatus;
import com.techx.intervue.modules.quality.exceptions.QualityReportNotFoundException;
import com.techx.intervue.modules.quality.exceptions.ReportAlreadyDecidedException;
import com.techx.intervue.modules.quality.repositories.FarmerViolationRepository;
import com.techx.intervue.modules.quality.repositories.QualityReportQueryRepository;
import com.techx.intervue.modules.quality.repositories.QualityReportRepository;
import com.techx.intervue.modules.quality.resources.QualityReportResource;
import com.techx.intervue.modules.quality.services.interfaces.AdminQualityReportServiceInterface;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import com.techx.intervue.resources.PageResource;
import java.time.Clock;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * FR-123 (spec §4.4.3). A strike is only ever recorded here, by an admin's confirmation, never
 * because a customer reported (spec: "no automatic penalty"). Confirming an extended shelf life
 * that spoiled before its promise records the strike, puts the product back to its suggestion
 * and tells the stall; every decision tells the customer and the stall.
 */
@Service
@AllArgsConstructor
public class AdminQualityReportService implements AdminQualityReportServiceInterface {

    private static final int MAX_PAGE_SIZE = 50;
    private static final Set<String> STATUSES = Set.of("open", "confirmed", "dismissed");
    /** Notification text cannot follow each reader's date setting; the app default is used. */
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final QualityReportRepository reports;
    private final QualityReportQueryRepository queries;
    private final FarmerViolationRepository violations;
    private final ProductRepository products;
    private final FarmerProfileRepository farmers;
    private final OrderRepository orders;
    private final OrderItemRepository orderItems;
    private final NotificationServiceInterface notifications;
    private final Clock clock;

    @Override
    @Transactional(readOnly = true)
    public PageResource<QualityReportResource> list(
            String status, Boolean escalated, int page, int pageSize) {
        String s = status == null || status.isBlank() ? null : status.trim().toLowerCase(Locale.ROOT);
        boolean decided = "decided".equals(s);
        if (s != null && !decided && !STATUSES.contains(s)) {
            throw new InvalidFieldException(
                    "status", "Status must be open, confirmed, dismissed or decided.");
        }
        int safePage = Math.max(1, page);
        int safeSize = Math.min(MAX_PAGE_SIZE, Math.max(1, pageSize));
        return queries.forAdmin(
                decided ? null : s,
                decided,
                escalated,
                SpoilagePolicy.strikeWindowStart(clock.instant()),
                (safePage - 1) * safeSize,
                safeSize);
    }

    @Override
    @Transactional
    public QualityReportResource confirm(long adminId, long reportId, String note) {
        QualityReport report = openReport(reportId);
        Instant now = clock.instant();
        report.decide(QualityReportStatus.CONFIRMED, adminId, blankToNull(note), now);
        reports.saveAndFlush(report);
        // Spec §4.4.3: only an extended shelf life that spoiled before its promise is a strike
        if (SpoilagePolicy.escalates(report.isShelfLifeExtended(), report.isBeforePromise())) {
            recordStrike(report, adminId, now);
        }
        tellCustomerAndStall(report);
        return reload(reportId, now);
    }

    @Override
    @Transactional
    public QualityReportResource dismiss(long adminId, long reportId, String note) {
        String reason = blankToNull(note);
        if (reason == null) {
            throw new InvalidFieldException("note", "Say why this is not the stall's fault.");
        }
        QualityReport report = openReport(reportId);
        Instant now = clock.instant();
        report.decide(QualityReportStatus.DISMISSED, adminId, reason, now);
        reports.saveAndFlush(report);
        tellCustomerAndStall(report);
        return reload(reportId, now);
    }

    /** Locked: of two admins deciding at once, the second sees it decided (409). */
    private QualityReport openReport(long reportId) {
        QualityReport report =
                reports.lockById(reportId).orElseThrow(QualityReportNotFoundException::new);
        if (!report.isOpen()) {
            throw new ReportAlreadyDecidedException();
        }
        return report;
    }

    /**
     * Spec §4.4.3 steps 1–3: record the strike, put the product back to its suggestion, tell the
     * stall — and when this strike leaves the stall locked, tell it until when (Ruling 9).
     */
    private void recordStrike(QualityReport report, long adminId, Instant now) {
        List<Instant> before =
                violations.activeTimes(report.getFarmerId(), SpoilagePolicy.strikeWindowStart(now));
        FarmerViolation strike = new FarmerViolation();
        strike.setFarmerId(report.getFarmerId());
        strike.setQualityReportId(report.getId());
        strike.setProductId(report.getProductId());
        strike.setExtendedByDays(report.getExtendedByDays());
        strike.setNote(report.getDecisionNote());
        strike.setCreatedBy(adminId);
        strike.setCreatedAt(now);
        violations.saveAndFlush(strike);

        Product product = resetShelfLife(report.getProductId());
        List<Instant> after = new ArrayList<>(before.size() + 1);
        after.add(now);
        after.addAll(before);
        Instant lockedUntil = SpoilagePolicy.lockedUntil(after);
        farmers.findById(report.getFarmerId())
                .ifPresent(
                        stall -> {
                            notifications.dispatch(
                                    List.of(stall.getUserId()),
                                    NotificationEvent.of(
                                            NotificationKind.SHELF_LIFE_VIOLATION,
                                            QualityLinks.farmerProduct(report.getProductId()),
                                            Map.of(
                                                    "product",
                                                    product == null ? "" : product.getName(),
                                                    "count",
                                                    String.valueOf(after.size()))));
                            if (lockedUntil != null) {
                                notifications.dispatch(
                                        List.of(stall.getUserId()),
                                        NotificationEvent.of(
                                                NotificationKind.SHELF_LIFE_LOCKED,
                                                QualityLinks.FARMER_HOME,
                                                Map.of(
                                                        "until",
                                                        DAY.format(
                                                                lockedUntil.atZone(
                                                                        clock.getZone())))));
                            }
                        });
    }

    /**
     * Back to the suggestion recorded when the stall saved it (Ruling 8: only while it is still
     * extended). Locked like OrderService.place, since Hibernate rewrites every column.
     */
    private Product resetShelfLife(long productId) {
        Product product =
                products.lockAllById(List.of(productId)).stream().findFirst().orElse(null);
        if (product != null
                && product.isShelfLifeExtended()
                && product.getSuggestedShelfLifeDays() != null) {
            product.setShelfLifeDays(product.getSuggestedShelfLifeDays());
            product.setShelfLifeExtended(false);
            product.setShelfLifeAckAt(null);
            products.saveAndFlush(product);
        }
        return product;
    }

    /** Spec §4.6: one text for both outcomes (Ruling 10); the link shows the decision. */
    private void tellCustomerAndStall(QualityReport report) {
        Map<String, String> params =
                Map.of(
                        "product",
                        orderItems
                                .findById(report.getOrderItemId())
                                .map(OrderItem::getProductName)
                                .orElse(""),
                        "order",
                        orders.findById(report.getOrderId())
                                .map(Order::getOrderCode)
                                .orElse(""));
        notifications.dispatch(
                List.of(report.getCustomerId()),
                NotificationEvent.of(
                        NotificationKind.QUALITY_DECIDED,
                        QualityLinks.order(report.getOrderId()),
                        params));
        farmers.findById(report.getFarmerId())
                .ifPresent(
                        stall ->
                                notifications.dispatch(
                                        List.of(stall.getUserId()),
                                        NotificationEvent.of(
                                                NotificationKind.QUALITY_DECIDED,
                                                QualityLinks.FARMER_REPORTS,
                                                params)));
    }

    private QualityReportResource reload(long reportId, Instant now) {
        return queries.findById(reportId, SpoilagePolicy.strikeWindowStart(now))
                .orElseThrow(QualityReportNotFoundException::new);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
```

`quality/controllers/AdminQualityReportController.java`:

```java
package com.techx.intervue.modules.quality.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.quality.requests.DecisionRequest;
import com.techx.intervue.modules.quality.resources.QualityReportResource;
import com.techx.intervue.modules.quality.services.interfaces.AdminQualityReportServiceInterface;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import com.techx.intervue.resources.ApiResource;
import com.techx.intervue.resources.PageResource;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** FR-123 — the admin's spoilage queue and decisions (spec §4.4.3, §6). Admin only. */
@RestController
@RequestMapping("/api/v1/admin/quality-reports")
@PreAuthorize("hasRole('ADMIN')")
@AllArgsConstructor
public class AdminQualityReportController extends BaseController {

    private final AdminQualityReportServiceInterface reports;

    @GetMapping
    public ResponseEntity<ApiResource<PageResource<QualityReportResource>>> list(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Boolean escalated,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize) {
        return ok(reports.list(status, escalated, page, pageSize), "Reports loaded.");
    }

    @PatchMapping("/{id}/confirm")
    public ResponseEntity<ApiResource<QualityReportResource>> confirm(
            @PathVariable long id,
            @Valid @RequestBody(required = false) DecisionRequest request,
            @AuthenticationPrincipal CustomUserDetails admin) {
        return ok(
                reports.confirm(admin.getId(), id, request == null ? null : request.note()),
                "Violation confirmed.");
    }

    @PatchMapping("/{id}/dismiss")
    public ResponseEntity<ApiResource<QualityReportResource>> dismiss(
            @PathVariable long id,
            @Valid @RequestBody DecisionRequest request,
            @AuthenticationPrincipal CustomUserDetails admin) {
        return ok(reports.dismiss(admin.getId(), id, request.note()), "Report dismissed.");
    }
}
```

- [ ] **Step 6: Nối controller và UNIQUE của lỗi vào `QualityExceptionHandler`**

1. `assignableTypes` thêm `AdminQualityReportController.class`.
2. Trong `dataIntegrity(...)`, trước dòng `return error(HttpStatus.BAD_REQUEST, …)` cuối cùng, thêm:

```java
        if (cause.contains("uq_farmer_violation_report")) {
            return error(
                    HttpStatus.CONFLICT,
                    "REPORT_ALREADY_DECIDED",
                    "An admin has already decided on this report.",
                    List.of());
        }
```

- [ ] **Step 7: Chạy lại test**

Run: lệnh test backend với `-Dtest='AdminQualityReportServiceTest,AdminQualityDecisionFlowTest,QualityReportQueryRepositoryTest,QualityExceptionHandlerTest,QualityExceptionHandlerScopeTest,QualityControllerAccessTest'`.
Expected: toàn bộ PASS (`AdminQualityReportServiceTest` 11 test, `AdminQualityDecisionFlowTest` 4 test).

- [ ] **Step 8: Format và commit**

```bash
docker compose exec -T -e MAVEN_OPTS=-Xmx256m backend ./mvnw -B -q spotless:apply
git add backend/src/main/java/com/techx/intervue/modules/quality \
  backend/src/test/java/com/techx/intervue/modules/quality
git commit -m "feat(FR-123): admins confirm or dismiss spoilage reports and record shelf-life strikes"
```

---

### Task 9: Khoá kéo dài trong form sản phẩm ở server — 409 `SHELF_LIFE_EXTENSION_LOCKED` (FR-123)

**Files:**
- Create: `backend/src/main/java/com/techx/intervue/modules/quality/exceptions/ShelfLifeExtensionLockedException.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/quality/services/interfaces/ShelfLifeStandingServiceInterface.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/quality/services/impl/ShelfLifeStandingService.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/product/services/impl/ProductService.java` (hàm `applyShelfLife` của giai đoạn 1)
- Modify: `backend/src/main/java/com/techx/intervue/modules/product/controllers/ProductExceptionHandler.java`
- Test: `ShelfLifeStandingServiceTest` (thêm), `backend/src/test/java/com/techx/intervue/modules/product/services/impl/ProductServiceTest.java` (sửa), `backend/src/test/java/com/techx/intervue/modules/product/controllers/ProductExceptionHandlerTest.java` (tạo mới), `backend/src/test/java/com/techx/intervue/modules/quality/services/impl/ExtensionLockProductTest.java` (tạo mới)

**Interfaces:**
- Consumes: Task 7 (`ShelfLifeStandingService.standing`), giai đoạn 1: `ProductService.applyShelfLife(Product, ProductRequest, Category)` với dòng `boolean extended = ShelfLifePolicy.extendedBy(days, suggested) > 0;` ngay trước `if (extended && !Boolean.TRUE.equals(request.acknowledgeLongerShelfLife()))`; constructor `ProductService(products, farmers, categories, query, restock, availability, shelfLifeGuides, clock)`; helper test `approvedStall()`, `shelf(Long guideId, String mode, int days, Boolean ack)`, `chilledLeafy(long categoryId, boolean active)` (guide id 7, ngăn mát, gợi ý 3) trong `ProductServiceTest`.
- Produces: `ShelfLifeStandingServiceInterface.requireCanExtend(long farmerId)` (ném `ShelfLifeExtensionLockedException(LocalDate lockedUntil)`, ngày theo giờ Việt Nam); constructor `ProductService(products, farmers, categories, query, restock, availability, shelfLifeGuides, clock, shelfLifeStanding)`; 409 `SHELF_LIFE_EXTENSION_LOCKED` kèm detail field `shelfLifeDays` (form hiện lỗi ngay dưới ô hạn dùng qua `SERVER_FIELDS` có sẵn).

- [ ] **Step 1: Viết test (sẽ fail)**

Thêm vào `ShelfLifeStandingServiceTest` (import `ShelfLifeExtensionLockedException`, `static org.assertj.core.api.Assertions.assertThatCode`, `static org.assertj.core.api.Assertions.assertThatThrownBy`):

```java
    @Test
    void twoStrikesDoNotStopALongerShelfLife() {
        when(violations.activeTimes(eq(FARMER_ID), any()))
                .thenReturn(
                        List.of(
                                Instant.parse("2026-10-20T03:00:00Z"),
                                Instant.parse("2026-10-10T03:00:00Z")));

        assertThatCode(() -> service.requireCanExtend(FARMER_ID)).doesNotThrowAnyException();
    }

    /** The end of the lock is named by its day in Ho Chi Minh City: 20:00 UTC is already the 1st. */
    @Test
    void aLockedStallIsRefusedWithTheVietnamDayTheLockEnds() {
        when(violations.activeTimes(eq(FARMER_ID), any()))
                .thenReturn(
                        List.of(
                                Instant.parse("2026-10-20T03:00:00Z"),
                                Instant.parse("2026-10-10T03:00:00Z"),
                                Instant.parse("2026-09-01T20:00:00Z")));

        assertThatThrownBy(() -> service.requireCanExtend(FARMER_ID))
                .isInstanceOf(ShelfLifeExtensionLockedException.class)
                .hasMessageContaining("2026-12-01");
    }
```

`ProductServiceTest` (bản giai đoạn 1): thêm field `private ShelfLifeStandingServiceInterface shelfLifeStanding;`; trong `setUp()` tạo `shelfLifeStanding = mock(ShelfLifeStandingServiceInterface.class);` và thêm nó làm tham số cuối của `new ProductService(…, shelfLifeGuides, CLOCK, shelfLifeStanding)`. Import `com.techx.intervue.modules.quality.exceptions.ShelfLifeExtensionLockedException`, `com.techx.intervue.modules.quality.services.interfaces.ShelfLifeStandingServiceInterface`, `java.time.LocalDate`, `static org.mockito.ArgumentMatchers.anyLong`, `static org.mockito.Mockito.doThrow` (bỏ qua cái đã có). Thêm 2 test sau khối "shelf life (FR-121)":

```java
    // ---------- extension lock (FR-123) ----------

    /** Review Focus #2: 3 strikes in 90 days — nothing above the suggestion is saved. */
    @Test
    void aLockedStallCannotSaveLongerThanSuggested() {
        approvedStall();
        when(shelfLifeGuides.findById(7L)).thenReturn(Optional.of(chilledLeafy(1L, true)));
        doThrow(new ShelfLifeExtensionLockedException(LocalDate.of(2026, 11, 30)))
                .when(shelfLifeStanding)
                .requireCanExtend(FARMER_ID);

        assertThatThrownBy(() -> service.create(USER_ID, shelf(7L, "chilled", 5, true)))
                .isInstanceOf(ShelfLifeExtensionLockedException.class)
                .hasMessageContaining("2026-11-30");
        verify(products, never()).save(any());
    }

    /** The lock only stops going longer: the suggestion (or less) still saves, unchecked. */
    @Test
    void aLockedStallCanStillSaveAtTheSuggestion() {
        approvedStall();
        when(shelfLifeGuides.findById(7L)).thenReturn(Optional.of(chilledLeafy(1L, true)));
        doThrow(new ShelfLifeExtensionLockedException(LocalDate.of(2026, 11, 30)))
                .when(shelfLifeStanding)
                .requireCanExtend(FARMER_ID);

        FarmerProductResource saved = service.create(USER_ID, shelf(7L, "chilled", 3, null));

        assertThat(saved.shelfLife().days()).isEqualTo(3);
        verify(shelfLifeStanding, never()).requireCanExtend(anyLong());
    }
```

`ProductExceptionHandlerTest.java`:

```java
package com.techx.intervue.modules.product.controllers;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.quality.exceptions.ShelfLifeExtensionLockedException;
import com.techx.intervue.resources.ApiResource;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

/** Spec §4.2: the extension lock is a 409 the product form can show on its shelf-life field. */
class ProductExceptionHandlerTest {

    private final ProductExceptionHandler handler = new ProductExceptionHandler();

    @Test
    void theLockIsA409OnTheShelfLifeField() {
        ResponseEntity<ApiResource<Void>> r =
                handler.extensionLocked(
                        new ShelfLifeExtensionLockedException(LocalDate.of(2026, 11, 30)));

        assertThat(r.getStatusCode().value()).isEqualTo(409);
        assertThat(r.getBody().getError().getCode()).isEqualTo("SHELF_LIFE_EXTENSION_LOCKED");
        assertThat(r.getBody().getError().getDetails())
                .extracting("field")
                .containsExactly("shelfLifeDays");
        assertThat(r.getBody().getMessage()).contains("2026-11-30");
    }
}
```

`ExtensionLockProductTest.java` (MySQL, đi qua `ProductService` thật):

```java
package com.techx.intervue.modules.quality.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.techx.intervue.modules.product.requests.ProductRequest;
import com.techx.intervue.modules.product.services.interfaces.ProductServiceInterface;
import com.techx.intervue.modules.quality.QualityFixture;
import com.techx.intervue.modules.quality.exceptions.ShelfLifeExtensionLockedException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

/** FR-123 (spec §4.2, §4.4.4, §9): the lock as the product form meets it, on real MySQL. */
@SpringBootTest
@Transactional
class ExtensionLockProductTest {

    @Autowired private ProductServiceInterface productService;
    @Autowired private JdbcTemplate jdbc;

    private QualityFixture fx;
    private long farmerUser;
    private long farmer;
    private long category;
    private long guide;
    private long product;

    @BeforeEach
    void setUp() {
        fx = new QualityFixture(jdbc);
        long customer = fx.base.user("customer", "Buyer", "x");
        long admin = fx.base.user("admin", "Admin", "x");
        farmerUser = fx.base.user("farmer", "Seller", "x");
        farmer = fx.base.farmer(farmerUser, "Stall", "approved");
        category = fx.base.category();
        guide = fx.guide(category, 3);
        product = fx.base.product(farmer, category, "Rau muống", 1);
        fx.shelfLife(product, guide, 3, 3);
        long order =
                fx.base.order(
                        customer,
                        farmer,
                        fx.base.market("Market"),
                        "completed",
                        3,
                        LocalDate.of(2026, 10, 3));
        for (String name : List.of("Cải ngọt", "Mồng tơi", "Rau dền")) {
            long line =
                    fx.line(
                            order,
                            fx.base.product(farmer, category, name, 1),
                            LocalDate.of(2026, 10, 7),
                            true);
            fx.strike(fx.report(line, "confirmed", true, 10), admin, 5);
        }
    }

    /** The name the fixture gave the product ("Rau muống <tag>"), so the update keeps it. */
    private ProductRequest withDays(int days) {
        return new ProductRequest(
                category,
                "Rau muống " + fx.base.tag,
                null,
                BigDecimal.ONE,
                "bunch",
                10,
                null,
                days,
                guide,
                "chilled",
                days > 3);
    }

    @Test
    void aLockedStallCannotGoLongerThanSuggested() {
        assertThatThrownBy(() -> productService.update(farmerUser, product, withDays(5)))
                .isInstanceOf(ShelfLifeExtensionLockedException.class);
    }

    @Test
    void aLockedStallStillSavesAtTheSuggestion() {
        assertThat(productService.update(farmerUser, product, withDays(3)).shelfLife().days())
                .isEqualTo(3);
    }

    @Test
    void twoStrikesDoNotLock() {
        jdbc.update("DELETE FROM farmer_violations WHERE farmer_id = ? ORDER BY id LIMIT 1", farmer);

        assertThat(productService.update(farmerUser, product, withDays(5)).shelfLife().extended())
                .isTrue();
    }
}
```

- [ ] **Step 2: Chạy test để thấy fail**

Run: lệnh test backend với `-Dtest='ShelfLifeStandingServiceTest,ProductServiceTest,ProductExceptionHandlerTest,ExtensionLockProductTest'`.
Expected: FAIL lúc biên dịch, `cannot find symbol: class ShelfLifeExtensionLockedException`.

- [ ] **Step 3: Viết exception và `requireCanExtend`**

`quality/exceptions/ShelfLifeExtensionLockedException.java`:

```java
package com.techx.intervue.modules.quality.exceptions;

import java.time.LocalDate;
import lombok.Getter;

/**
 * FR-123 (spec §4.2, §4.4.4): the stall has 3 shelf-life strikes in 90 days, so a shelf life
 * longer than the suggestion is refused — 409 SHELF_LIFE_EXTENSION_LOCKED on {@code
 * shelfLifeDays}.
 */
@Getter
public class ShelfLifeExtensionLockedException extends RuntimeException {

    /** The Ho Chi Minh City day the lock ends. */
    private final LocalDate lockedUntil;

    public ShelfLifeExtensionLockedException(LocalDate lockedUntil) {
        super(
                "Your stall has 3 shelf-life strikes in 90 days, so it cannot set a shelf life"
                        + " longer than suggested until "
                        + lockedUntil
                        + ".");
        this.lockedUntil = lockedUntil;
    }
}
```

`ShelfLifeStandingServiceInterface`: thêm

```java
    /**
     * FR-123 (spec §4.2): refuses a shelf life longer than the suggestion while the stall is
     * locked; does nothing otherwise.
     */
    void requireCanExtend(long farmerId);
```

`ShelfLifeStandingService`: thêm import `com.techx.intervue.modules.quality.exceptions.ShelfLifeExtensionLockedException` và hàm

```java
    @Override
    @Transactional(readOnly = true)
    public void requireCanExtend(long farmerId) {
        Instant until = standing(farmerId).extensionLockedUntil();
        if (until != null) {
            throw new ShelfLifeExtensionLockedException(until.atZone(clock.getZone()).toLocalDate());
        }
    }
```

- [ ] **Step 4: Gọi khoá trong `ProductService.applyShelfLife`**

1. Thêm field cuối cùng (sau `private final Clock clock;`) và import `com.techx.intervue.modules.quality.services.interfaces.ShelfLifeStandingServiceInterface`:

```java
    private final ShelfLifeStandingServiceInterface shelfLifeStanding;
```

2. Trong `applyShelfLife`, ngay sau dòng

```java
        boolean extended = ShelfLifePolicy.extendedBy(days, suggested) > 0;
```

và trước `if (extended && !Boolean.TRUE.equals(request.acknowledgeLongerShelfLife())) {`, chèn:

```java
        if (extended) {
            // FR-123 (spec §4.2, §4.4.4): 3 strikes in 90 days lock anything above the suggestion
            shelfLifeStanding.requireCanExtend(product.getFarmerId());
        }
```

`product.getFarmerId()` đã có giá trị ở cả hai nhánh gọi: `create` đặt `setFarmerId` trước `apply`, `update` đọc sản phẩm đã khoá.

- [ ] **Step 5: Trả 409 trong `ProductExceptionHandler`**

Import `com.techx.intervue.modules.quality.exceptions.ShelfLifeExtensionLockedException`, rồi thêm hàm (ví dụ ngay sau `notApproved(...)`):

```java
    /**
     * FR-123 (spec §4.2): the stall is locked out of longer shelf lives — 409, attached to
     * shelfLifeDays so the product form marks that box.
     */
    @ExceptionHandler(ShelfLifeExtensionLockedException.class)
    ResponseEntity<ApiResource<Void>> extensionLocked(ShelfLifeExtensionLockedException e) {
        return error(
                HttpStatus.CONFLICT,
                "SHELF_LIFE_EXTENSION_LOCKED",
                e.getMessage(),
                List.of(
                        FieldErrorResource.builder()
                                .field("shelfLifeDays")
                                .message(e.getMessage())
                                .build()));
    }
```

- [ ] **Step 6: Chạy lại test**

Run: lệnh test backend với `-Dtest='ShelfLifeStandingServiceTest,ProductServiceTest,ProductExceptionHandlerTest,ExtensionLockProductTest,FarmerProductNextDateTest,ProductHiddenListTest'`.
Expected: toàn bộ PASS. Các test giai đoạn 1 của `ProductServiceTest` vẫn xanh vì mock `shelfLifeStanding` không ném gì.

- [ ] **Step 7: Format và commit**

```bash
docker compose exec -T -e MAVEN_OPTS=-Xmx256m backend ./mvnw -B -q spotless:apply
git add backend/src/main/java/com/techx/intervue/modules/quality \
  backend/src/main/java/com/techx/intervue/modules/product \
  backend/src/test/java/com/techx/intervue/modules/quality \
  backend/src/test/java/com/techx/intervue/modules/product
git commit -m "feat(FR-123): lock longer shelf lives after 3 strikes in 90 days"
```

---

### Task 10: Số lỗi và ngày hết khoá ở chi tiết sạp của admin — `GET /admin/farmers/{id}` (FR-123)

**Files:**
- Modify: `backend/src/main/java/com/techx/intervue/modules/farmer/resources/AdminFarmerDetailResource.java`
- Modify: `backend/src/main/java/com/techx/intervue/modules/farmer/services/impl/FarmerService.java` (field mới, hàm `toDetailResource`)
- Test: `backend/src/test/java/com/techx/intervue/modules/farmer/services/impl/FarmerServiceTest.java`

**Interfaces:**
- Consumes: Task 7 (`ShelfLifeStandingServiceInterface.standing`, `ShelfLifeStandingResource`).
- Produces: `AdminFarmerDetailResource` thêm hai thành phần cuối `int activeViolations`, `Instant extensionLockedUntil` (spec §6); constructor `FarmerService(farmerProfileRepository, historyRepository, uploadService, userRepository, userSessionCache, notifications, shelfLifeStanding)`. `approve`, `reject`, `suspend`, `reinstate` đều trả `toDetailResource`, nên response của chúng cũng có hai field này. Luồng `suspend` không đổi (Ruling 7).

- [ ] **Step 1: Viết test (sẽ fail)**

Trong `FarmerServiceTest`: thêm field `private ShelfLifeStandingServiceInterface shelfLifeStanding;`; trong `setUp()` trước khi tạo service:

```java
        shelfLifeStanding = mock(ShelfLifeStandingServiceInterface.class);
        when(shelfLifeStanding.standing(anyLong()))
                .thenReturn(new ShelfLifeStandingResource(0, 3, 90, null));
```

và thêm `shelfLifeStanding` làm tham số cuối của `new FarmerService(...)`. Import `com.techx.intervue.modules.quality.resources.ShelfLifeStandingResource`, `com.techx.intervue.modules.quality.services.interfaces.ShelfLifeStandingServiceInterface`, `java.time.Instant`, `static org.mockito.ArgumentMatchers.anyLong`. Thêm test cuối class:

```java
    /** FR-123 (spec §4.4.4): the admin sees the stall's strikes and when a lock ends. */
    @Test
    void theDetailCarriesTheShelfLifeStrikesAndTheLockEnd() {
        withStatus(ApprovalStatus.APPROVED);
        Instant until = Instant.parse("2026-11-30T03:00:00Z");
        when(shelfLifeStanding.standing(FARMER_ID))
                .thenReturn(new ShelfLifeStandingResource(3, 3, 90, until));

        AdminFarmerDetailResource detail = service.getDetailForAdmin(FARMER_ID);

        assertThat(detail.activeViolations()).isEqualTo(3);
        assertThat(detail.extensionLockedUntil()).isEqualTo(until);
    }
```

- [ ] **Step 2: Chạy test để thấy fail**

Run: lệnh test backend với `-Dtest='FarmerServiceTest'`.
Expected: FAIL lúc biên dịch (`FarmerService` chưa có constructor 7 tham số, `activeViolations()` chưa có).

- [ ] **Step 3: Mở rộng resource**

Trong `AdminFarmerDetailResource`, đổi thành phần cuối `UserStatus accountStatus) {}` thành:

```java
        UserStatus accountStatus,
        /** FR-123: shelf-life strikes of the last 90 days (spec §4.4.4). */
        int activeViolations,
        /** FR-123: when the lock on longer shelf lives ends; null when the stall is not locked. */
        Instant extensionLockedUntil) {}
```

(`java.time.Instant` đã được import trong file.)

- [ ] **Step 4: Điền hai field trong `FarmerService`**

1. Thêm field cuối (sau `private final NotificationServiceInterface notifications;`) và import `com.techx.intervue.modules.quality.resources.ShelfLifeStandingResource`, `com.techx.intervue.modules.quality.services.interfaces.ShelfLifeStandingServiceInterface`:

```java
    private final ShelfLifeStandingServiceInterface shelfLifeStanding;
```

2. Trong `toDetailResource(FarmerProfile profile, User owner)`: dòng đầu thân hàm thêm

```java
        ShelfLifeStandingResource strikes = shelfLifeStanding.standing(profile.getId());
```

và trong builder, ngay sau `.accountStatus(owner.getStatus())`:

```java
                .activeViolations(strikes.activeViolations())
                .extensionLockedUntil(strikes.extensionLockedUntil())
```

- [ ] **Step 5: Chạy lại test**

Run: lệnh test backend với `-Dtest='FarmerServiceTest,FarmerControllerAccessTest,FarmerExceptionHandlerTest'`.
Expected: toàn bộ PASS.

- [ ] **Step 6: Format và commit**

```bash
docker compose exec -T -e MAVEN_OPTS=-Xmx256m backend ./mvnw -B -q spotless:apply
git add backend/src/main/java/com/techx/intervue/modules/farmer \
  backend/src/test/java/com/techx/intervue/modules/farmer
git commit -m "feat(FR-123): show a stall's shelf-life strikes and lock end to admins"
```

---

### Task 11: Frontend nền: API client, quy tắc cửa sổ báo, kiểu thông báo, copy chung (FR-122)

**Files:**
- Create: `frontend/src/lib/spoilage.ts`, `frontend/src/lib/spoilage.test.ts`
- Create: `frontend/src/api-requests/quality-report.requests.ts`, `frontend/src/api-requests/quality-report.requests.test.ts`
- Modify: `frontend/src/api-requests/order.requests.ts` (`OrderItemDto`)
- Modify: `frontend/src/types/notification.types.ts`
- Modify: `frontend/src/locales/*/common.json` (10 file)

**Interfaces:**
- Consumes: API của Task 4–8; `StorageMode` của `api-requests/shelf-life.requests.ts` (giai đoạn 1); `OrderStatus` (`types/order.types.ts`).
- Produces:
  - `lib/spoilage.ts`: hằng `REPORT_DAYS_AFTER_BEST_BEFORE = 2`, `STRIKES_TO_LOCK = 3`, `STRIKE_WINDOW_DAYS = 90`; `todayInVietnam(now?: Date): string` ("yyyy-MM-dd" theo Asia/Ho_Chi_Minh); `reportDeadline(bestBefore: string): string`; `canReportSpoilage(status: OrderStatus, line: { bestBefore?: string | null; qualityReport?: unknown; itemId?: number }, today: string): boolean`; `spoiledOnChoices(pickupDate: string, today: string): string[]`.
  - `api-requests/quality-report.requests.ts`: kiểu `QualityProblem`, hằng `QUALITY_PROBLEMS`, `QualityReportStatus`, `ItemQualityReportDto`, `CreateQualityReportInput`, `QualityReportDto` (26 field như `QualityReportResource`), `ShelfLifeStandingDto`, `FarmerQualityReportsDto`, `AdminQualityFilter`; `reportPhotoSrc(url)`; default export `QualityReportApi` với `uploadPhoto(file)`, `create(orderId, itemId, input)`, `mine(params)`, `standing()`, `respond(id, response)`, `adminList(params)`, `confirm(id, note?)`, `dismiss(id, note)`.
  - `OrderItemDto` thêm `qualityReport?: ItemQualityReportDto | null; itemId?: number` (Ruling 1).
  - `NotificationKindCode` thêm 5 kind; `NotificationCategoryCode` thêm `'qualityReports'`.
  - Key chung trong `common.json`: `spoilage.problem.*`, `spoilage.problemWithNote`, `spoilage.status.*`, `spoilage.extended_one|_other`, `spoilage.beforePromise`, `spoilage.afterPromise`, `spoilage.strikes`, `notify.settings.groups.qualityReports.title|note`.

- [ ] **Step 1: Viết test (sẽ fail)**

`frontend/src/lib/spoilage.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { canReportSpoilage, reportDeadline, spoiledOnChoices, todayInVietnam } from './spoilage';

/** The same numbers as SpoilagePolicyTest on the server (spec §9). */
describe('spoilage rules', () => {
  it('closes the window two days after the good-until date', () => {
    expect(reportDeadline('2026-10-05')).toBe('2026-10-07');
    expect(reportDeadline('2026-12-30')).toBe('2027-01-01');
  });

  const line = { itemId: 501, bestBefore: '2026-10-05', qualityReport: null };

  it('offers the button on a completed order until the last day of the window', () => {
    expect(canReportSpoilage('completed', line, '2026-10-03')).toBe(true);
    expect(canReportSpoilage('completed', line, '2026-10-05')).toBe(true);
    expect(canReportSpoilage('completed', line, '2026-10-07')).toBe(true);
    expect(canReportSpoilage('completed', line, '2026-10-08')).toBe(false);
  });

  it('never offers it before completion, without a good-until date, without a line id, or twice', () => {
    expect(canReportSpoilage('ready', line, '2026-10-04')).toBe(false);
    expect(canReportSpoilage('completed', { ...line, bestBefore: null }, '2026-10-04')).toBe(false);
    expect(canReportSpoilage('completed', { ...line, itemId: undefined }, '2026-10-04')).toBe(false);
    expect(
      canReportSpoilage(
        'completed',
        { ...line, qualityReport: { id: 1, status: 'open', spoiledOn: '2026-10-04', problem: 'mold' } },
        '2026-10-04',
      ),
    ).toBe(false);
  });

  it('lists the days from pickup to today', () => {
    expect(spoiledOnChoices('2026-10-03', '2026-10-06')).toEqual([
      '2026-10-03',
      '2026-10-04',
      '2026-10-05',
      '2026-10-06',
    ]);
    expect(spoiledOnChoices('2026-10-06', '2026-10-06')).toEqual(['2026-10-06']);
    expect(spoiledOnChoices('2026-12-31', '2027-01-01')).toEqual(['2026-12-31', '2027-01-01']);
  });

  /** Review Focus #5: 20:00 UTC is already the next day in Ho Chi Minh City. */
  it('reads today on the Vietnam calendar, whatever the browser time zone', () => {
    expect(todayInVietnam(new Date('2026-10-07T20:00:00Z'))).toBe('2026-10-08');
    expect(todayInVietnam(new Date('2026-10-07T16:59:00Z'))).toBe('2026-10-07');
  });
});
```

`frontend/src/api-requests/quality-report.requests.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import QualityReportApi, { reportPhotoSrc } from './quality-report.requests';
import { privateApi } from '@/utils/axiosInstance';

vi.mock('@/utils/axiosInstance', () => ({
  privateApi: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() },
}));

const ok = (data: unknown) => ({ data: { success: true, data } });

describe('QualityReportApi', () => {
  beforeEach(() => {
    vi.mocked(privateApi.get).mockResolvedValue(
      ok({
        standing: { activeViolations: 2, limit: 3, windowDays: 90, extensionLockedUntil: null },
        reports: { items: [], page: 1, pageSize: 1, total: 0 },
      }),
    );
    vi.mocked(privateApi.post).mockResolvedValue(ok({ url: '/uploads/quality-report-photos/1-a.jpg' }));
    vi.mocked(privateApi.put).mockResolvedValue(ok(null));
    vi.mocked(privateApi.patch).mockResolvedValue(ok(null));
  });

  it('reports one line of an order', async () => {
    await QualityReportApi.create(21, 501, { spoiledOn: '2026-10-05', problem: 'mold' });
    expect(privateApi.post).toHaveBeenCalledWith('/orders/21/items/501/quality-report', {
      spoiledOn: '2026-10-05',
      problem: 'mold',
    });
  });

  it('uploads the photo as multipart and returns its address', async () => {
    const url = await QualityReportApi.uploadPhoto(new File(['x'], 'rau.png', { type: 'image/png' }));
    expect(url).toBe('/uploads/quality-report-photos/1-a.jpg');
    expect(privateApi.post).toHaveBeenCalledWith('/quality-reports/photos', expect.any(FormData), {
      headers: { 'Content-Type': undefined },
    });
  });

  it('reads only the standing for the product form and the overview', async () => {
    const standing = await QualityReportApi.standing();
    expect(privateApi.get).toHaveBeenCalledWith('/farmer/quality-reports', { params: { page: 1, pageSize: 1 } });
    expect(standing.activeViolations).toBe(2);
  });

  it("saves the stall's reply", async () => {
    await QualityReportApi.respond(9, 'Khách để nhiệt độ thường');
    expect(privateApi.put).toHaveBeenCalledWith('/farmer/quality-reports/9/response', {
      response: 'Khách để nhiệt độ thường',
    });
  });

  it('asks the admin queue with the filter as the query', async () => {
    await QualityReportApi.adminList({ status: 'open', escalated: true, pageSize: 50 });
    expect(privateApi.get).toHaveBeenCalledWith('/admin/quality-reports', {
      params: { status: 'open', escalated: true, pageSize: 50 },
    });
  });

  it('confirms and dismisses with the note', async () => {
    await QualityReportApi.confirm(9);
    await QualityReportApi.dismiss(9, 'Khách để nhiệt độ thường');
    expect(privateApi.patch).toHaveBeenCalledWith('/admin/quality-reports/9/confirm', { note: undefined });
    expect(privateApi.patch).toHaveBeenCalledWith('/admin/quality-reports/9/dismiss', {
      note: 'Khách để nhiệt độ thường',
    });
  });

  it('turns a stored photo path into the API address', () => {
    expect(reportPhotoSrc('/uploads/quality-report-photos/1-a.jpg')).toMatch(/\/uploads\/quality-report-photos\/1-a\.jpg$/);
  });
});
```

- [ ] **Step 2: Chạy test để thấy fail**

Run: `docker compose exec -T frontend sh -c 'npx vitest run src/lib/spoilage.test.ts src/api-requests/quality-report.requests.test.ts'`
Expected: FAIL, `Failed to resolve import "./spoilage"` và `"./quality-report.requests"`.

- [ ] **Step 3: Viết `lib/spoilage.ts`**

```ts
import type { OrderStatus } from '@/types/order.types';

/** FR-122 (spec §4.4.1): a line can be reported until this many days after its good-until date — the server's rule. */
export const REPORT_DAYS_AFTER_BEST_BEFORE = 2;
/** FR-123 (spec §4.4.4): this many strikes that still count lock longer shelf lives. */
export const STRIKES_TO_LOCK = 3;
/** FR-123: a strike counts for this many days. */
export const STRIKE_WINDOW_DAYS = 90;

const DAY_MS = 24 * 60 * 60 * 1000;

/** "yyyy-MM-dd" plus days, counted on UTC midnights so no time zone or daylight-saving change can shift the date. */
const addDays = (ymd: string, days: number): string => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d) + days * DAY_MS).toISOString().slice(0, 10);
};

/** Today in Ho Chi Minh City as "yyyy-MM-dd": the calendar the server checks the window against. */
export const todayInVietnam = (now: Date = new Date()): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(now);

/** The last day a line can still be reported. */
export const reportDeadline = (bestBefore: string): string => addDays(bestBefore, REPORT_DAYS_AFTER_BEST_BEFORE);

/**
 * Whether the "Report spoiled" button shows under one line: a completed order, a line with an id and a good-until
 * date (lines placed before the promise existed have none), not reported yet, and still inside the window.
 */
export function canReportSpoilage(
  status: OrderStatus,
  line: { bestBefore?: string | null; qualityReport?: unknown; itemId?: number },
  today: string,
): boolean {
  return (
    status === 'completed' &&
    line.itemId != null &&
    !!line.bestBefore &&
    !line.qualityReport &&
    today <= reportDeadline(line.bestBefore)
  );
}

/** The days a customer can pick as "spoiled on": from pickup to today, oldest first ("yyyy-MM-dd" sorts as text). */
export function spoiledOnChoices(pickupDate: string, today: string): string[] {
  const days: string[] = [];
  for (let day = pickupDate; day <= today; day = addDays(day, 1)) days.push(day);
  return days;
}
```

- [ ] **Step 4: Viết API client**

`frontend/src/api-requests/quality-report.requests.ts`:

```ts
import type { StorageMode } from '@/api-requests/shelf-life.requests';
import type { ApiResponse, PageType } from '@/types/api.types';
import { privateApi } from '@/utils/axiosInstance';

/** FR-122: what the customer saw (spec §4.4.1). */
export type QualityProblem = 'bruised' | 'mold' | 'smell' | 'wilted' | 'other';
export const QUALITY_PROBLEMS: QualityProblem[] = ['bruised', 'mold', 'smell', 'wilted', 'other'];

/** `open` until an admin decides; `confirmed` or `dismissed` after (FR-123). */
export type QualityReportStatus = 'open' | 'confirmed' | 'dismissed';

/** The report on one order line: inside every line of `GET /orders/{id}` (null until reported) and the create reply. */
export type ItemQualityReportDto = {
  id: number;
  status: QualityReportStatus;
  /** "yyyy-MM-dd". */
  spoiledOn: string;
  problem: QualityProblem;
};

export type CreateQualityReportInput = {
  /** "yyyy-MM-dd", from the pickup day to today. */
  spoiledOn: string;
  problem: QualityProblem;
  /** At most 500 characters. */
  note?: string;
  /** A URL `uploadPhoto` returned to this same account. */
  photoUrl?: string;
};

/** One report as the stall and the admin read it (FR-122, FR-123). Dates "yyyy-MM-dd"; `…At` are ISO 8601 UTC. */
export type QualityReportDto = {
  id: number;
  orderId: number;
  orderCode: string;
  farmerId: number;
  stallName: string;
  /** The stall's approval status; the "Suspend stall" button needs `approved`. */
  stallStatus: string;
  customerName: string;
  productId: number;
  productName: string;
  pickupDate: string;
  bestBefore: string | null;
  storageMode: StorageMode | null;
  spoiledOn: string;
  /** Spoiled on or before the good-until date. */
  beforePromise: boolean;
  problem: QualityProblem;
  note: string | null;
  photoUrl: string | null;
  shelfLifeExtended: boolean;
  extendedByDays: number;
  status: QualityReportStatus;
  farmerResponse: string | null;
  farmerRespondedAt: string | null;
  decisionNote: string | null;
  decidedAt: string | null;
  createdAt: string;
  /** The stall's strikes of the last 90 days. */
  stallActiveStrikes: number;
};

/** FR-123: the stall's strikes; `extensionLockedUntil` (ISO 8601) is set while 3 or more still count. */
export type ShelfLifeStandingDto = {
  activeViolations: number;
  limit: number;
  windowDays: number;
  extensionLockedUntil: string | null;
};

export type FarmerQualityReportsDto = { standing: ShelfLifeStandingDto; reports: PageType<QualityReportDto> };

/** "Needs a decision" = `{ status: 'open', escalated: true }`; `decided` = confirmed or dismissed (spec §4.4.3). */
export type AdminQualityFilter = {
  status?: QualityReportStatus | 'decided';
  escalated?: boolean;
  page?: number;
  pageSize?: number;
};

/** A stored photo path ("/uploads/…") → the address the browser loads it from. */
export const reportPhotoSrc = (url: string) => `${import.meta.env.VITE_API_URL ?? 'http://localhost:8080'}${url}`;

/** FR-122, FR-123 — spoiled produce reports and shelf-life strikes (docs/api-contract.md §8a). */
class QualityReportApi {
  /** Customer: upload the photo first. 400 `VALIDATION_ERROR` on `file` for another type or over 5 MB. */
  static uploadPhoto = async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const response = await privateApi.post<ApiResponse<{ url: string }>>('/quality-reports/photos', form, {
      // Drop the default application/json header so the browser sets multipart/form-data with the boundary itself.
      headers: { 'Content-Type': undefined },
    });
    return response.data.data.url;
  };

  /**
   * Customer: report one line of a completed order. 403 on someone else's order; 409 `ORDER_NOT_COMPLETED`,
   * `REPORT_WINDOW_CLOSED`, `ALREADY_REPORTED`; 400 on `spoiledOn` / `photoUrl`.
   */
  static create = async (orderId: number, itemId: number, input: CreateQualityReportInput) => {
    const response = await privateApi.post<ApiResponse<ItemQualityReportDto>>(
      `/orders/${orderId}/items/${itemId}/quality-report`,
      input,
    );
    return response.data.data;
  };

  /** Farmer: the reports about their stall, newest first, with the stall's strikes. */
  static mine = async (params: { page?: number; pageSize?: number } = {}) => {
    const response = await privateApi.get<ApiResponse<FarmerQualityReportsDto>>('/farmer/quality-reports', {
      params,
    });
    return response.data.data;
  };

  /** Farmer: only the strikes and the lock (the product form and the overview need nothing else). */
  static standing = async () => (await QualityReportApi.mine({ page: 1, pageSize: 1 })).standing;

  /** Farmer: write or replace the reply while the report is open. 409 `REPORT_ALREADY_DECIDED` after the decision. */
  static respond = async (id: number, response: string) => {
    const result = await privateApi.put<ApiResponse<QualityReportDto>>(`/farmer/quality-reports/${id}/response`, {
      response,
    });
    return result.data.data;
  };

  /** Admin queue, newest first. */
  static adminList = async (params: AdminQualityFilter = {}) => {
    const response = await privateApi.get<ApiResponse<PageType<QualityReportDto>>>('/admin/quality-reports', {
      params,
    });
    return response.data.data;
  };

  /** Admin: confirm the violation; the note is optional. 409 `REPORT_ALREADY_DECIDED`. */
  static confirm = async (id: number, note?: string) => {
    const response = await privateApi.patch<ApiResponse<QualityReportDto>>(`/admin/quality-reports/${id}/confirm`, {
      note,
    });
    return response.data.data;
  };

  /** Admin: not the stall's fault; the note is required (400 on `note`). */
  static dismiss = async (id: number, note: string) => {
    const response = await privateApi.patch<ApiResponse<QualityReportDto>>(`/admin/quality-reports/${id}/dismiss`, {
      note,
    });
    return response.data.data;
  };
}

export default QualityReportApi;
```

- [ ] **Step 5: Mở rộng kiểu đơn hàng và thông báo**

`frontend/src/api-requests/order.requests.ts`: import `type { ItemQualityReportDto } from '@/api-requests/quality-report.requests'`, rồi trong `OrderItemDto`, sau `listPrice?: number | null;` của giai đoạn 1:

```ts
  /** FR-122: the customer's spoilage report on this line; null until reported. */
  qualityReport?: ItemQualityReportDto | null;
  /** `order_items.id` — the `{itemId}` of the report endpoint (FR-122). */
  itemId?: number;
```

`frontend/src/types/notification.types.ts`: trong `NotificationKindCode`, thêm trước `| 'message'`:

```ts
  | 'quality_reported'
  | 'quality_escalated'
  | 'quality_decided'
  | 'shelf_life_violation'
  | 'shelf_life_locked'
```

và đổi `NotificationCategoryCode` thành:

```ts
export type NotificationCategoryCode = 'messages' | 'announcements' | 'account' | 'farmerApplications' | 'qualityReports';
```

- [ ] **Step 6: Thêm copy chung vào `common.json` (10 ngôn ngữ)**

Trong khối `notify.settings.groups`, sau `farmerApplications`, bản `en`:

```json
        "qualityReports": {
          "title": "Spoiled produce reports",
          "note": "When produce with an extended shelf life is reported spoiled before its date"
        }
```

bản `vi`:

```json
        "qualityReports": {
          "title": "Báo hàng hư",
          "note": "Khi khách báo hư món có hạn dùng do sạp kéo dài, trước hạn đã hứa"
        }
```

Ở cấp gốc, thêm khối `spoilage`. Bản `en`:

```json
  "spoilage": {
    "problem": {
      "bruised": "Bruised or crushed",
      "mold": "Mold",
      "smell": "Smells off",
      "wilted": "Wilted or dried out",
      "other": "Something else"
    },
    "problemWithNote": "{{problem}} · “{{note}}”",
    "status": {
      "open": "Waiting for a decision",
      "confirmed": "Confirmed by an admin",
      "dismissed": "Not the stall's fault"
    },
    "extended_one": "Extended +{{count}} day",
    "extended_other": "Extended +{{count}} days",
    "beforePromise": "before its date",
    "afterPromise": "after its date",
    "strikes": "Shelf-life strikes: {{count}} of {{limit}} in {{days}} days"
  }
```

Bản `vi`:

```json
  "spoilage": {
    "problem": {
      "bruised": "Úng/dập",
      "mold": "Mốc",
      "smell": "Có mùi",
      "wilted": "Héo/khô",
      "other": "Khác"
    },
    "problemWithNote": "{{problem}} · “{{note}}”",
    "status": {
      "open": "Chờ admin xử lý",
      "confirmed": "Admin đã xác nhận",
      "dismissed": "Không phải lỗi sạp"
    },
    "extended_one": "Kéo dài +{{count}} ngày",
    "extended_other": "Kéo dài +{{count}} ngày",
    "beforePromise": "trước hạn",
    "afterPromise": "sau hạn",
    "strikes": "Lỗi hạn dùng: {{count}}/{{limit}} trong {{days}} ngày"
  }
```

8 ngôn ngữ còn lại: dịch từ bản `en`, giữ `{{…}}` và đủ `extended_one`/`extended_other`. Sửa JSON bằng cách chèn khối, không ghi đè cả file (các giai đoạn khác cũng sửa `common.json`).

- [ ] **Step 7: Chạy lại test**

Run: `docker compose exec -T frontend sh -c 'npx vitest run src/lib/spoilage.test.ts src/api-requests/quality-report.requests.test.ts src/api-requests/order.requests.test.ts'`
Expected: toàn bộ PASS (`order.requests.test.ts` vẫn xanh vì hai field mới là tuỳ chọn).

- [ ] **Step 8: Kiểm và commit**

```bash
docker compose exec -T frontend sh -c 'npx prettier --write src/lib/spoilage.ts src/lib/spoilage.test.ts src/api-requests/quality-report.requests.ts src/api-requests/quality-report.requests.test.ts src/api-requests/order.requests.ts src/types/notification.types.ts src/locales && npx tsc -b && npx eslint src'
git add frontend/src/lib/spoilage.ts frontend/src/lib/spoilage.test.ts \
  frontend/src/api-requests/quality-report.requests.ts frontend/src/api-requests/quality-report.requests.test.ts \
  frontend/src/api-requests/order.requests.ts frontend/src/types/notification.types.ts \
  frontend/src/locales/*/common.json
git commit -m "feat(FR-122): spoilage API client, report window rule and shared copy"
```

---

### Task 12: Nút "Report spoiled" và dialog báo hư ở trang chi tiết đơn của khách (FR-122)

**Files:**
- Create: `frontend/src/pages/customer/OrderDetail/SpoilageReport.tsx`
- Modify: `frontend/src/pages/customer/OrderDetail/index.tsx`
- Modify: `frontend/src/pages/customer/OrderDetail/index.test.tsx`
- Modify: `frontend/src/locales/*/CustomerOrderDetail.json` (10 file)

**Interfaces:**
- Consumes: Task 11 (`QualityReportApi.create`, `QualityReportApi.uploadPhoto`, `QUALITY_PROBLEMS`, `reportPhotoSrc`, `ItemQualityReportDto`, `canReportSpoilage`, `spoiledOnChoices`, `todayInVietnam`, copy `spoilage.*` của `common`), giai đoạn 1 (`<BestBeforeLine bestBefore={item.bestBefore} storageMode={item.storageMode} />` nằm trong `order.items.map` của `index.tsx`), `useRequest().mutate`, `Dialog`, `Chip`, `SelectField`, `Button`, `stockDay`.
- Produces: `SpoilageAction({ item, status, today, onReport })` và `SpoilageReportDialog({ orderId, itemId, productName, stallName, pickupDate, today, onClose, onSent })` (named export trong `SpoilageReport.tsx`).

- [ ] **Step 1: Thêm copy vào `CustomerOrderDetail.json` (10 ngôn ngữ)**

Khối mới ở cấp gốc. Bản `en`:

```json
  "spoilage": {
    "report": "Report spoiled",
    "reportLabel": "Report spoiled: {{name}}",
    "reported": "Spoilage reported · {{status}}",
    "title": "Report spoiled produce",
    "intro": "Tell {{stall}} what went wrong with {{name}}. Each item can be reported once, until 2 days after its good-until date.",
    "day": "Spoiled on",
    "problem": "What went wrong",
    "note": "Describe it (optional)",
    "notePlaceholder": "Leaves turned black after 2 days in the fridge.",
    "noteCount": "{{used}} of 500 characters.",
    "photo": "Add a photo (optional)",
    "photoReplace": "Replace photo",
    "photoRemove": "Remove photo",
    "photoAlt": "Photo of the spoiled produce",
    "photoHint": "JPG, PNG or WebP, up to 5 MB.",
    "photoTooBig": "The photo must be 5 MB or smaller.",
    "photoType": "Send a JPG, PNG or WebP photo.",
    "uploading": "Uploading the photo",
    "send": "Send report",
    "needProblem": "Pick what went wrong first.",
    "sent": "Report sent. The stall can reply, and an admin may review it.",
    "failed": "We could not send the report."
  }
```

Bản `vi`:

```json
  "spoilage": {
    "report": "Báo hàng hư",
    "reportLabel": "Báo hàng hư: {{name}}",
    "reported": "Đã báo hàng hư · {{status}}",
    "title": "Báo hàng hư",
    "intro": "Cho {{stall}} biết {{name}} bị làm sao. Mỗi món chỉ báo một lần, chậm nhất 2 ngày sau hạn dùng.",
    "day": "Hàng hư ngày",
    "problem": "Bị làm sao",
    "note": "Mô tả (không bắt buộc)",
    "notePlaceholder": "Lá úng đen sau 2 ngày để ngăn mát.",
    "noteCount": "{{used}}/500 ký tự.",
    "photo": "Thêm ảnh (không bắt buộc)",
    "photoReplace": "Đổi ảnh",
    "photoRemove": "Bỏ ảnh",
    "photoAlt": "Ảnh hàng bị hư",
    "photoHint": "JPG, PNG hoặc WebP, tối đa 5 MB.",
    "photoTooBig": "Ảnh phải nhỏ hơn hoặc bằng 5 MB.",
    "photoType": "Hãy gửi ảnh JPG, PNG hoặc WebP.",
    "uploading": "Đang tải ảnh lên",
    "send": "Gửi báo cáo",
    "needProblem": "Chọn hàng bị làm sao trước.",
    "sent": "Đã gửi báo cáo. Sạp có thể phản hồi và admin sẽ xem xét.",
    "failed": "Chưa gửi được báo cáo."
  }
```

8 ngôn ngữ còn lại: dịch từ bản `en`, giữ `{{…}}`.

- [ ] **Step 2: Viết test (sẽ fail)**

Trong `pages/customer/OrderDetail/index.test.tsx`:

1. Thêm import `import { AxiosError } from 'axios';`, `import QualityReportApi from '@/api-requests/quality-report.requests';` và đổi dòng import order thành `import OrderApi, { type OrderDetailDto, type OrderItemDto } from '@/api-requests/order.requests';`.
2. Thêm hai mock sau các `vi.mock` có sẵn:

```tsx
vi.mock('@/api-requests/quality-report.requests', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/api-requests/quality-report.requests')>();
  return { ...real, default: { create: vi.fn(), uploadPhoto: vi.fn() } };
});
// Tuesday 06/10/2026 in Ho Chi Minh City, whatever day the test runs
vi.mock('@/lib/spoilage', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/spoilage')>();
  return { ...real, todayInVietnam: () => '2026-10-06' };
});
```

3. Trong `beforeEach`, thêm `vi.mocked(QualityReportApi.create).mockReset();` và `vi.mocked(QualityReportApi.uploadPhoto).mockReset();`.
4. Thêm cuối file:

```tsx
/** Water spinach picked up Saturday 03/10, 5 days in the fridge: good until the end of Monday 05/10. */
const line = (patch: Partial<OrderItemDto> = {}): OrderItemDto => ({
  productId: 3,
  productName: 'Water spinach',
  unit: 'bunch',
  unitPrice: 0.5,
  quantity: 2,
  subtotal: 1,
  bestBefore: '2026-10-05',
  storageMode: 'chilled',
  listPrice: null,
  qualityReport: null,
  itemId: 501,
  ...patch,
});

const completed = (items: OrderItemDto[]) => detail({ items, canCancel: false, canModify: false }, 'completed');

const conflict = (message: string, code: string) =>
  new AxiosError('conflict', 'ERR_BAD_REQUEST', undefined, undefined, {
    status: 409,
    data: { success: false, message, error: { code, details: [] } },
  } as never);

const openReport = async () => {
  await userEvent.click(await screen.findByRole('button', { name: 'Report spoiled: Water spinach' }));
  return screen.getByRole('dialog');
};

describe('reporting spoiled produce (FR-122)', () => {
  it('offers "Report spoiled" on a completed line until two days after its good-until date', async () => {
    vi.mocked(OrderApi.get).mockResolvedValue(
      completed([line(), line({ productId: 4, productName: 'Cherry tomatoes', itemId: 502, bestBefore: '2026-10-03' })]),
    );
    renderAt('/orders/21');

    expect(await screen.findByRole('button', { name: 'Report spoiled: Water spinach' })).toBeInTheDocument();
    // good until 03/10: the window closed at the end of 05/10, today is 06/10
    expect(screen.queryByRole('button', { name: 'Report spoiled: Cherry tomatoes' })).not.toBeInTheDocument();
  });

  it('shows the report instead of the button, and nothing on a line without a good-until date', async () => {
    vi.mocked(OrderApi.get).mockResolvedValue(
      completed([
        line({ bestBefore: null, storageMode: null }),
        line({
          productId: 4,
          productName: 'Cherry tomatoes',
          itemId: 502,
          qualityReport: { id: 7, status: 'confirmed', spoiledOn: '2026-10-04', problem: 'mold' },
        }),
      ]),
    );
    renderAt('/orders/21');

    expect(await screen.findByText('Spoilage reported · Confirmed by an admin')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Report spoiled/ })).not.toBeInTheDocument();
  });

  it('is not offered before the order is completed', async () => {
    vi.mocked(OrderApi.get).mockResolvedValue(detail({ items: [line()] }, 'ready'));
    renderAt('/orders/21');

    await screen.findByRole('heading', { level: 1, name: /Vườn Út Hiền/ });
    expect(screen.queryByRole('button', { name: /^Report spoiled/ })).not.toBeInTheDocument();
  });

  it('sends the day, what went wrong and the note, then shows the report on the line', async () => {
    vi.mocked(OrderApi.get).mockResolvedValue(completed([line()]));
    vi.mocked(QualityReportApi.create).mockResolvedValue({ id: 77, status: 'open', spoiledOn: '2026-10-05', problem: 'mold' });
    renderAt('/orders/21');
    const dialog = await openReport();

    expect(within(dialog).getByRole('button', { name: 'Send report' })).toBeDisabled();
    expect(within(dialog).getByText('Pick what went wrong first.')).toBeInTheDocument();
    await userEvent.selectOptions(within(dialog).getByLabelText(/Spoiled on/), '2026-10-05');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Mold' }));
    await userEvent.type(within(dialog).getByLabelText(/Describe it/), 'Leaves turned black');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send report' }));

    expect(QualityReportApi.create).toHaveBeenCalledWith(21, 501, {
      spoiledOn: '2026-10-05',
      problem: 'mold',
      note: 'Leaves turned black',
      photoUrl: undefined,
    });
    expect(await screen.findByText('Spoilage reported · Waiting for a decision')).toBeInTheDocument();
  });

  it('offers only the days from pickup to today, today first', async () => {
    vi.mocked(OrderApi.get).mockResolvedValue(completed([line()]));
    renderAt('/orders/21');
    const dialog = await openReport();

    const days = within(within(dialog).getByLabelText(/Spoiled on/))
      .getAllByRole('option')
      .map((o) => (o as HTMLOptionElement).value);
    expect(days).toEqual(['2026-10-06', '2026-10-05', '2026-10-04', '2026-10-03']);
  });

  it('uploads a photo and sends its address with the report', async () => {
    vi.mocked(OrderApi.get).mockResolvedValue(completed([line()]));
    vi.mocked(QualityReportApi.uploadPhoto).mockResolvedValue('/uploads/quality-report-photos/2-a.jpg');
    vi.mocked(QualityReportApi.create).mockResolvedValue({ id: 77, status: 'open', spoiledOn: '2026-10-06', problem: 'smell' });
    renderAt('/orders/21');
    const dialog = await openReport();

    await userEvent.upload(within(dialog).getByLabelText(/Add a photo/), new File(['x'], 'rau.png', { type: 'image/png' }));
    expect(await within(dialog).findByAltText('Photo of the spoiled produce')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Smells off' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send report' }));

    expect(QualityReportApi.create).toHaveBeenCalledWith(
      21,
      501,
      expect.objectContaining({ photoUrl: '/uploads/quality-report-photos/2-a.jpg' }),
    );
  });

  it('refuses a photo over 5 MB without uploading it', async () => {
    vi.mocked(OrderApi.get).mockResolvedValue(completed([line()]));
    renderAt('/orders/21');
    const dialog = await openReport();

    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' });
    await userEvent.upload(within(dialog).getByLabelText(/Add a photo/), big);

    expect(within(dialog).getByText('The photo must be 5 MB or smaller.')).toBeInTheDocument();
    expect(QualityReportApi.uploadPhoto).not.toHaveBeenCalled();
  });

  /** Review Focus #3: a second send (another tab, a double click) is refused by the server. */
  it('says why a second report was refused', async () => {
    vi.mocked(OrderApi.get).mockResolvedValue(completed([line()]));
    vi.mocked(QualityReportApi.create).mockRejectedValue(
      conflict('You have already reported this item.', 'ALREADY_REPORTED'),
    );
    renderAt('/orders/21');
    const dialog = await openReport();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Mold' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send report' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('You have already reported this item.');
  });
});
```

- [ ] **Step 3: Chạy test để thấy fail**

Run: `docker compose exec -T frontend sh -c 'npx vitest run src/pages/customer/OrderDetail/index.test.tsx'`
Expected: 8 test mới FAIL (không tìm thấy nút "Report spoiled: Water spinach"); các test cũ vẫn PASS.

- [ ] **Step 4: Viết `SpoilageReport.tsx`**

```tsx
import { useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { OrderItemDto } from '@/api-requests/order.requests';
import QualityReportApi, {
  QUALITY_PROBLEMS,
  reportPhotoSrc,
  type ItemQualityReportDto,
  type QualityProblem,
} from '@/api-requests/quality-report.requests';
import { stockDay } from '@/components/stockDay';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Dialog } from '@/components/ui/dialog';
import { SelectField } from '@/components/ui/input';
import { canReportSpoilage, spoiledOnChoices } from '@/lib/spoilage';
import type { OrderStatus } from '@/types/order.types';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
/** The server's limit (spec §4.4.1), checked here too so a large file never starts uploading. */
const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const NOTE_MAX = 500;

type ReportErrors = Partial<Record<'day' | 'problem' | 'note' | 'photo', string>>;

/** Server field → this dialog's field. */
const SERVER_FIELDS: Record<string, keyof ReportErrors> = {
  spoiledOn: 'day',
  problem: 'problem',
  note: 'note',
  photoUrl: 'photo',
  file: 'photo',
};

type SpoilageActionProps = { item: OrderItemDto; status: OrderStatus; today: string; onReport: () => void };

/**
 * FR-122 — under one order line: the report's status once the customer reported it, else the "Report spoiled"
 * button while the line can still be reported (spec §4.4.1).
 */
export function SpoilageAction({ item, status, today, onReport }: SpoilageActionProps) {
  const { t } = useTranslation('CustomerOrderDetail');
  const { t: tc } = useTranslation();
  if (item.qualityReport) {
    return (
      <span className="text-small text-ink-muted block">
        {t('spoilage.reported', { status: tc(`spoilage.status.${item.qualityReport.status}`) })}
      </span>
    );
  }
  if (!canReportSpoilage(status, item, today)) return null;
  return (
    <span className="mt-1 block">
      <Button
        variant="ghost"
        size="sm"
        aria-label={t('spoilage.reportLabel', { name: item.productName })}
        onClick={onReport}
      >
        {t('spoilage.report')}
      </Button>
    </span>
  );
}

type SpoilageReportDialogProps = {
  orderId: number;
  itemId: number;
  productName: string;
  stallName: string;
  /** "yyyy-MM-dd". */
  pickupDate: string;
  /** "yyyy-MM-dd" on the Vietnam calendar. */
  today: string;
  onClose: () => void;
  onSent: (report: ItemQualityReportDto) => void;
};

/** FR-122 (spec §4.4.1) — the day it spoiled, what went wrong, an optional note and an optional photo. */
export function SpoilageReportDialog({
  orderId,
  itemId,
  productName,
  stallName,
  pickupDate,
  today,
  onClose,
  onSent,
}: SpoilageReportDialogProps) {
  const { t } = useTranslation('CustomerOrderDetail');
  const { t: tc } = useTranslation();
  // Newest first: produce is usually reported the day it turns
  const days = spoiledOnChoices(pickupDate, today).reverse();
  const [day, setDay] = useState(days[0] ?? today);
  const [problem, setProblem] = useState<QualityProblem | null>(null);
  const [note, setNote] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string>();
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState<ReportErrors>({});
  const [failure, setFailure] = useState<string>();

  const choosePhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type)) {
      setErrors((prev) => ({ ...prev, photo: t('spoilage.photoType') }));
      return;
    }
    if (file.size > PHOTO_MAX_BYTES) {
      setErrors((prev) => ({ ...prev, photo: t('spoilage.photoTooBig') }));
      return;
    }
    setUploading(true);
    setErrors((prev) => ({ ...prev, photo: undefined }));
    try {
      setPhotoUrl(await QualityReportApi.uploadPhoto(file));
    } catch (error) {
      const message = Helper.getFieldErrors(error).file ?? Helper.getErrorMessage(error, tc('errors.network'));
      setErrors((prev) => ({ ...prev, photo: message }));
    } finally {
      setUploading(false);
    }
  };

  const send = async () => {
    if (!problem) return;
    setSending(true);
    setFailure(undefined);
    try {
      const report = await QualityReportApi.create(orderId, itemId, {
        spoiledOn: day,
        problem,
        note: note.trim() || undefined,
        photoUrl,
      });
      Notification.success({ text: t('spoilage.sent') });
      onSent(report);
    } catch (error) {
      const mapped: ReportErrors = {};
      Object.entries(Helper.getFieldErrors(error)).forEach(([field, message]) => {
        const key = SERVER_FIELDS[field];
        if (key) mapped[key] = message;
      });
      if (Object.keys(mapped).length) setErrors(mapped);
      else setFailure(Helper.getErrorMessage(error, t('spoilage.failed')));
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog
      open
      title={t('spoilage.title')}
      onClose={onClose}
      actions={
        <>
          <Button variant="secondary" onClick={onClose} disabled={sending}>
            {tc('actions.cancel')}
          </Button>
          <Button
            onClick={() => void send()}
            disabled={!problem || uploading || sending}
            aria-describedby={problem ? undefined : 'spoilage-why'}
          >
            {t('spoilage.send')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p>{t('spoilage.intro', { stall: stallName, name: productName })}</p>
        <SelectField
          id="spoilage-day"
          label={t('spoilage.day')}
          required
          value={day}
          onChange={(e) => setDay(e.target.value)}
          options={days.map((d) => ({ value: d, label: stockDay(d) ?? d }))}
          error={errors.day}
        />
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="text-small mb-1 p-0 font-bold">{t('spoilage.problem')}</legend>
          <div className="flex flex-wrap gap-2">
            {QUALITY_PROBLEMS.map((p) => (
              <Chip key={p} pressed={problem === p} onClick={() => setProblem(p)}>
                {tc(`spoilage.problem.${p}`)}
              </Chip>
            ))}
          </div>
          {errors.problem && (
            <span role="alert" className="text-danger text-[13px] font-bold">
              {errors.problem}
            </span>
          )}
        </fieldset>
        <div className="flex flex-col gap-1">
          <label htmlFor="spoilage-note" className="text-small font-bold">
            {t('spoilage.note')}
          </label>
          <textarea
            id="spoilage-note"
            rows={3}
            maxLength={NOTE_MAX}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('spoilage.notePlaceholder')}
            aria-describedby="spoilage-note-count"
            className="border-line-strong bg-surface-raised text-body min-h-18 rounded-sm border-[1.5px] p-3"
          />
          <span
            id="spoilage-note-count"
            role={errors.note ? 'alert' : undefined}
            className={Helper.cn('text-[13px]', errors.note ? 'text-danger font-bold' : 'text-ink-muted')}
          >
            {errors.note ?? t('spoilage.noteCount', { used: note.length })}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {photoUrl && (
            <div className="relative self-start">
              <img
                src={reportPhotoSrc(photoUrl)}
                alt={t('spoilage.photoAlt')}
                className="border-line size-24 rounded-sm border object-cover"
              />
              <button
                type="button"
                onClick={() => setPhotoUrl(undefined)}
                aria-label={t('spoilage.photoRemove')}
                className="bg-surface-raised text-ink absolute top-1 right-1 grid size-6 cursor-pointer place-items-center rounded-full text-[13px] font-bold"
              >
                ×
              </button>
            </div>
          )}
          <label
            htmlFor="spoilage-photo"
            className={Helper.cn(
              'border-line-strong bg-surface-raised text-small inline-flex min-h-9 cursor-pointer items-center self-start rounded-sm border-[1.5px] px-3 font-bold',
              uploading && 'opacity-60',
            )}
          >
            {uploading ? t('spoilage.uploading') : photoUrl ? t('spoilage.photoReplace') : t('spoilage.photo')}
          </label>
          <input
            id="spoilage-photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={uploading}
            onChange={(e) => void choosePhoto(e)}
          />
          <span
            role={errors.photo ? 'alert' : undefined}
            className={Helper.cn('text-[13px]', errors.photo ? 'text-danger font-bold' : 'text-ink-muted')}
          >
            {errors.photo ?? t('spoilage.photoHint')}
          </span>
        </div>
        {!problem && (
          <span id="spoilage-why" className="text-ink-muted text-[13px]">
            {t('spoilage.needProblem')}
          </span>
        )}
        {failure && (
          <p role="alert" className="text-danger text-small">
            {failure}
          </p>
        )}
      </div>
    </Dialog>
  );
}
```

- [ ] **Step 5: Gắn vào `index.tsx`**

1. Đổi import order thành `import OrderApi, { type OrderDetailDto, type OrderItemDto } from '@/api-requests/order.requests';`, thêm `import { todayInVietnam } from '@/lib/spoilage';` và `import { SpoilageAction, SpoilageReportDialog } from './SpoilageReport';`.
2. Ngay sau `const [cancelFailed, setCancelFailed] = useState(false);` (trước mọi `return` sớm):

```tsx
  // FR-122: the line whose report dialog is open; today on the Vietnam calendar, read once so the render stays pure
  const [reporting, setReporting] = useState<OrderItemDto | null>(null);
  const [today] = useState(() => todayInVietnam());
```

3. Trong `order.items.map`, ngay sau `<BestBeforeLine bestBefore={item.bestBefore} storageMode={item.storageMode} />` của giai đoạn 1:

```tsx
                    <SpoilageAction item={item} status={s.status} today={today} onReport={() => setReporting(item)} />
```

4. Sau thẻ đóng `</Dialog>` của dialog huỷ đơn, trước `</div>` cuối cùng:

```tsx
      {reporting?.itemId != null && (
        <SpoilageReportDialog
          orderId={s.orderId}
          itemId={reporting.itemId}
          productName={reporting.productName}
          stallName={s.stallName}
          pickupDate={s.pickupDate}
          today={today}
          onClose={() => setReporting(null)}
          onSent={(report) => {
            const itemId = reporting.itemId;
            mutate((current) => ({
              ...current,
              items: current.items.map((i) => (i.itemId === itemId ? { ...i, qualityReport: report } : i)),
            }));
            setReporting(null);
          }}
        />
      )}
```

- [ ] **Step 6: Chạy lại test**

Run: `docker compose exec -T frontend sh -c 'npx vitest run src/pages/customer/OrderDetail/index.test.tsx'`
Expected: toàn bộ PASS (12 test cũ, 8 test mới).

- [ ] **Step 7: Kiểm tay 375 px và 1440 px**

Đăng nhập `customer@marketlink.vn` / `Demo@1234`, mở đơn `ML-20260920-0013` (seed ở Task 17; trước đó dùng một đơn `completed` có `bestBefore`). Dialog không tràn ngang ở 375 px, các chip xuống dòng, nút "Send report" có dòng lý do khi chưa chọn "What went wrong".

- [ ] **Step 8: Kiểm và commit**

```bash
docker compose exec -T frontend sh -c 'npx prettier --write src/pages/customer/OrderDetail src/locales && npx tsc -b && npx eslint src'
git add frontend/src/pages/customer/OrderDetail frontend/src/locales/*/CustomerOrderDetail.json
git commit -m "feat(FR-122): customers report a spoiled item from their order page"
```

---

### Task 13: Tab "Spoiled reports" ở trang Reviews của Farmer (FR-122)

**Files:**
- Create: `frontend/src/pages/farmer/Reviews/QualityReports.tsx`, `frontend/src/pages/farmer/Reviews/QualityReports.test.tsx`
- Create: `frontend/src/pages/farmer/Reviews/index.test.tsx`
- Modify: `frontend/src/pages/farmer/Reviews/index.tsx`
- Modify: `frontend/src/locales/*/FarmerReviews.json` (10 file)

**Interfaces:**
- Consumes: Task 11 (`QualityReportApi.mine`, `QualityReportApi.respond`, `QualityReportDto`, `FarmerQualityReportsDto`, `reportPhotoSrc`, copy `spoilage.*`), `Tabs` (`components/ui/tabs`), `useSearchParams` (react-router), `stockDay`, `formatDate`.
- Produces: component mặc định `QualityReports` (không prop). Trang Reviews đọc tab từ địa chỉ: `/farmer/reviews?tab=spoiled` (link của `QUALITY_REPORTED` và `QUALITY_DECIDED`) mở thẳng tab báo hư.

- [ ] **Step 1: Thêm copy vào `FarmerReviews.json` (10 ngôn ngữ)**

Hai khối mới ở cấp gốc. Bản `en`:

```json
  "tabs": {
    "label": "Reviews and spoiled reports",
    "reviews": "Reviews",
    "spoiled": "Spoiled reports"
  },
  "spoiled": {
    "intro": "Customers can report produce that spoiled soon after pickup. Reply with what you know; an admin decides.",
    "noun": "spoiled reports",
    "emptyTitle": "No spoiled reports",
    "emptyText": "When a customer reports produce from one of your orders, it shows here for you to reply.",
    "line": "Order {{code}} · {{customer}}",
    "dates": "Picked up {{pickup}} · good until {{bestBefore}} · spoiled {{spoiled}} ({{when}})",
    "photoAlt": "The customer's photo",
    "replyLabel": "Your reply, for the admin",
    "replyPlaceholder": "How it was kept, what you saw when you packed it.",
    "save": "Save reply",
    "saved": "Reply saved.",
    "yourReply": "Your reply: {{text}}",
    "decisionNote": "Admin note: {{text}}",
    "alreadyDecided": "An admin has already decided on this report.",
    "strikesText": "A confirmed report on an extended shelf life is a strike. 3 strikes in 90 days lock longer shelf lives.",
    "lockTitle": "Longer shelf lives are locked until {{date}}",
    "lockText": "Until then your products can only use the suggested shelf life."
  }
```

Bản `vi`:

```json
  "tabs": {
    "label": "Đánh giá và báo hàng hư",
    "reviews": "Đánh giá",
    "spoiled": "Báo hàng hư"
  },
  "spoiled": {
    "intro": "Khách có thể báo hàng bị hư sau khi nhận. Hãy phản hồi những gì bạn biết; admin sẽ quyết định.",
    "noun": "báo cáo hàng hư",
    "emptyTitle": "Chưa có báo hàng hư",
    "emptyText": "Khi khách báo hư món trong đơn của sạp, báo cáo sẽ hiện ở đây để bạn phản hồi.",
    "line": "Đơn {{code}} · {{customer}}",
    "dates": "Nhận {{pickup}} · dùng tốt đến {{bestBefore}} · hư ngày {{spoiled}} ({{when}})",
    "photoAlt": "Ảnh của khách",
    "replyLabel": "Phản hồi của bạn, gửi admin",
    "replyPlaceholder": "Hàng được bảo quản thế nào, lúc đóng gói bạn thấy gì.",
    "save": "Lưu phản hồi",
    "saved": "Đã lưu phản hồi.",
    "yourReply": "Phản hồi của bạn: {{text}}",
    "decisionNote": "Ghi chú của admin: {{text}}",
    "alreadyDecided": "Admin đã xử lý báo cáo này.",
    "strikesText": "Báo hư được xác nhận trên món kéo dài hạn tính là một lỗi. 3 lỗi trong 90 ngày thì bị khoá kéo dài hạn dùng.",
    "lockTitle": "Sạp bị khoá kéo dài hạn dùng tới {{date}}",
    "lockText": "Tới lúc đó, sản phẩm của sạp chỉ dùng được hạn gợi ý."
  }
```

8 ngôn ngữ còn lại: dịch từ bản `en`, giữ `{{…}}`.

- [ ] **Step 2: Viết test (sẽ fail)**

`pages/farmer/Reviews/QualityReports.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import QualityReports from './QualityReports';
import QualityReportApi, {
  type FarmerQualityReportsDto,
  type QualityReportDto,
} from '@/api-requests/quality-report.requests';

vi.mock('@/api-requests/quality-report.requests', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/api-requests/quality-report.requests')>();
  return { ...real, default: { mine: vi.fn(), respond: vi.fn() } };
});

const report = (patch: Partial<QualityReportDto> = {}): QualityReportDto => ({
  id: 9,
  orderId: 21,
  orderCode: 'ML-20260920-0007',
  farmerId: 15,
  stallName: 'Vườn Út Hiền',
  stallStatus: 'approved',
  customerName: 'Nguyễn Văn An',
  productId: 3,
  productName: 'Rau muống',
  pickupDate: '2026-10-03',
  bestBefore: '2026-10-07',
  storageMode: 'chilled',
  spoiledOn: '2026-10-05',
  beforePromise: true,
  problem: 'mold',
  note: 'Lá úng đen',
  photoUrl: null,
  shelfLifeExtended: true,
  extendedByDays: 2,
  status: 'open',
  farmerResponse: null,
  farmerRespondedAt: null,
  decisionNote: null,
  decidedAt: null,
  createdAt: '2026-10-05T13:00:00Z',
  stallActiveStrikes: 1,
  ...patch,
});

const NO_STRIKES = { activeViolations: 0, limit: 3, windowDays: 90, extensionLockedUntil: null };

const page = (items: QualityReportDto[], standing = NO_STRIKES): FarmerQualityReportsDto => ({
  standing,
  reports: { items, page: 1, pageSize: 50, total: items.length },
});

beforeEach(() => {
  vi.mocked(QualityReportApi.mine).mockReset().mockResolvedValue(page([report()]));
  vi.mocked(QualityReportApi.respond).mockReset();
});

describe('QualityReports (farmer, FR-122)', () => {
  it('lists what the customer saw, how much longer it was set, and where it stands', async () => {
    render(<QualityReports />);

    expect(await screen.findByRole('heading', { name: 'Rau muống' })).toBeInTheDocument();
    expect(screen.getByText('Extended +2 days')).toBeInTheDocument();
    expect(screen.getByText('Waiting for a decision')).toBeInTheDocument();
    expect(screen.getByText('Order ML-20260920-0007 · Nguyễn Văn An')).toBeInTheDocument();
    expect(screen.getByText('Mold · “Lá úng đen”')).toBeInTheDocument();
    expect(screen.getByText(/spoiled Mon 05\/10 \(before its date\)/)).toBeInTheDocument();
  });

  it('saves a reply while the report is open', async () => {
    vi.mocked(QualityReportApi.respond).mockResolvedValue(report({ farmerResponse: 'Khách để nhiệt độ thường.' }));
    render(<QualityReports />);

    await userEvent.type(await screen.findByLabelText('Your reply, for the admin'), 'Khách để nhiệt độ thường.');
    await userEvent.click(screen.getByRole('button', { name: 'Save reply' }));

    expect(QualityReportApi.respond).toHaveBeenCalledWith(9, 'Khách để nhiệt độ thường.');
    expect(screen.getByLabelText('Your reply, for the admin')).toHaveValue('Khách để nhiệt độ thường.');
  });

  it('shows the decision and no reply box once an admin decided', async () => {
    vi.mocked(QualityReportApi.mine).mockResolvedValue(
      page([report({ status: 'confirmed', farmerResponse: 'Hàng giao đúng hạn.', decisionNote: 'Hư sau 1 ngày.' })]),
    );
    render(<QualityReports />);

    expect(await screen.findByText('Confirmed by an admin')).toBeInTheDocument();
    expect(screen.getByText('Your reply: Hàng giao đúng hạn.')).toBeInTheDocument();
    expect(screen.getByText('Admin note: Hư sau 1 ngày.')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('shows the strikes, and the lock with the day it ends', async () => {
    vi.mocked(QualityReportApi.mine).mockResolvedValueOnce(
      page([report()], { activeViolations: 2, limit: 3, windowDays: 90, extensionLockedUntil: null }),
    );
    const first = render(<QualityReports />);
    expect(await screen.findByText('Shelf-life strikes: 2 of 3 in 90 days')).toBeInTheDocument();
    first.unmount();

    vi.mocked(QualityReportApi.mine).mockResolvedValueOnce(
      page([report()], { activeViolations: 3, limit: 3, windowDays: 90, extensionLockedUntil: '2026-11-15T03:00:00Z' }),
    );
    render(<QualityReports />);
    expect(await screen.findByText('Longer shelf lives are locked until 15/11/2026')).toBeInTheDocument();
  });

  it('says so when there is nothing yet, and offers a retry when loading failed', async () => {
    vi.mocked(QualityReportApi.mine).mockResolvedValueOnce(page([]));
    const first = render(<QualityReports />);
    expect(await screen.findByText('No spoiled reports')).toBeInTheDocument();
    first.unmount();

    vi.mocked(QualityReportApi.mine).mockRejectedValueOnce(new Error('network'));
    render(<QualityReports />);
    await userEvent.click(await screen.findByRole('button', { name: /try again/i }));
    expect(await screen.findByRole('heading', { name: 'Rau muống' })).toBeInTheDocument();
  });
});
```

`pages/farmer/Reviews/index.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FarmerReviewsPage from './index';
import ReviewApi from '@/api-requests/review.requests';
import StallApi from '@/api-requests/stall.requests';

vi.mock('@/api-requests/review.requests', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/api-requests/review.requests')>();
  return { ...real, default: { mine: vi.fn(), respond: vi.fn() } };
});
vi.mock('@/api-requests/stall.requests', () => ({ default: { myProfile: vi.fn() } }));
vi.mock('./QualityReports', () => ({ default: () => <p>spoiled reports list</p> }));

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/farmer/reviews" element={<FarmerReviewsPage />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.mocked(ReviewApi.mine).mockResolvedValue({ items: [], page: 1, pageSize: 50, total: 0 });
  vi.mocked(StallApi.myProfile).mockResolvedValue({ stallName: 'Vườn Út Hiền', ratingAvg: 4.5, ratingCount: 8 } as never);
});

describe('FarmerReviewsPage tabs', () => {
  /** FR-122: QUALITY_REPORTED links to /farmer/reviews?tab=spoiled. */
  it('opens the spoiled reports from the address', async () => {
    renderAt('/farmer/reviews?tab=spoiled');

    expect(await screen.findByText('spoiled reports list')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Spoiled reports' })).toHaveAttribute('aria-selected', 'true');
  });

  it('shows the reviews by default and switches tabs', async () => {
    renderAt('/farmer/reviews');

    expect(await screen.findByText('No reviews yet')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Spoiled reports' }));
    expect(await screen.findByText('spoiled reports list')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Chạy test để thấy fail**

Run: `docker compose exec -T frontend sh -c 'npx vitest run src/pages/farmer/Reviews'`
Expected: FAIL, `Failed to resolve import "./QualityReports"` và không có tab "Spoiled reports".

- [ ] **Step 4: Viết `QualityReports.tsx`**

```tsx
import { isAxiosError } from 'axios';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import QualityReportApi, { reportPhotoSrc, type QualityReportDto } from '@/api-requests/quality-report.requests';
import MarketCardSkeleton from '@/components/MarketCardSkeleton';
import { stockDay } from '@/components/stockDay';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataState, LoadError } from '@/components/ui/data-state';
import useRequest from '@/hooks/useRequest';
import { formatDate } from '@/lib/format';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';

const REPLY_MAX = 500;

/**
 * FR-122 (spec §4.4.2) — the stall's spoiled reports: what the customer saw, the promise on the order, and one reply
 * the stall can change until an admin decides. The strikes banner shows only when there are strikes.
 */
export default function QualityReports() {
  const { t } = useTranslation('FarmerReviews');
  const { t: tc } = useTranslation();
  const { state, retry, mutate } = useRequest('farmer-quality-reports', () => QualityReportApi.mine({ pageSize: 50 }));
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<number | null>(null);

  const save = async (report: QualityReportDto) => {
    const text = (drafts[report.id] ?? report.farmerResponse ?? '').trim();
    if (!text) return;
    setSaving(report.id);
    try {
      const updated = await QualityReportApi.respond(report.id, text);
      mutate((data) => ({
        ...data,
        reports: { ...data.reports, items: data.reports.items.map((r) => (r.id === updated.id ? updated : r)) },
      }));
      Notification.success({ text: t('spoiled.saved') });
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 409) {
        Notification.info({ text: t('spoiled.alreadyDecided') });
        retry();
      } else {
        Notification.error({ text: Helper.getErrorMessage(error, tc('errors.network')) });
      }
    } finally {
      setSaving(null);
    }
  };

  if (state.kind === 'loading') return <MarketCardSkeleton count={2} />;
  if (state.kind === 'error') return <LoadError noun={t('spoiled.noun')} onRetry={retry} />;

  const { standing, reports } = state.data;
  const lockedUntil = standing.extensionLockedUntil;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-body max-w-160">{t('spoiled.intro')}</p>
      {standing.activeViolations > 0 && (
        <Banner
          variant={lockedUntil ? 'danger' : 'warning'}
          title={
            lockedUntil
              ? t('spoiled.lockTitle', { date: formatDate(new Date(lockedUntil)) })
              : tc('spoilage.strikes', {
                  count: standing.activeViolations,
                  limit: standing.limit,
                  days: standing.windowDays,
                })
          }
        >
          {lockedUntil ? t('spoiled.lockText') : t('spoiled.strikesText')}
        </Banner>
      )}
      {reports.items.length === 0 ? (
        <DataState title={t('spoiled.emptyTitle')} text={t('spoiled.emptyText')} />
      ) : (
        reports.items.map((r) => (
          <Card as="article" key={r.id} aria-labelledby={`report-${r.id}`} className="flex flex-col gap-2 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 id={`report-${r.id}`} className="text-[17px] font-bold">
                {r.productName}
              </h3>
              <div className="flex flex-wrap gap-2">
                {r.shelfLifeExtended && (
                  <span className="bg-warning-bg text-warning-ink rounded-full px-2 text-[13px] font-bold">
                    {tc('spoilage.extended', { count: r.extendedByDays })}
                  </span>
                )}
                <span className="bg-surface-sunken text-ink rounded-full px-2 text-[13px] font-bold">
                  {tc(`spoilage.status.${r.status}`)}
                </span>
              </div>
            </div>
            <p className="text-small text-ink-muted">{t('spoiled.line', { code: r.orderCode, customer: r.customerName })}</p>
            <p className="text-small text-ink-muted">
              {t('spoiled.dates', {
                pickup: stockDay(r.pickupDate),
                bestBefore: stockDay(r.bestBefore) ?? '—',
                spoiled: stockDay(r.spoiledOn),
                when: tc(r.beforePromise ? 'spoilage.beforePromise' : 'spoilage.afterPromise'),
              })}
            </p>
            <p>
              {r.note
                ? tc('spoilage.problemWithNote', { problem: tc(`spoilage.problem.${r.problem}`), note: r.note })
                : tc(`spoilage.problem.${r.problem}`)}
            </p>
            {r.photoUrl && (
              <a href={reportPhotoSrc(r.photoUrl)} target="_blank" rel="noreferrer" className="self-start">
                <img
                  src={reportPhotoSrc(r.photoUrl)}
                  alt={t('spoiled.photoAlt')}
                  className="border-line size-24 rounded-sm border object-cover"
                />
              </a>
            )}
            {r.status === 'open' ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void save(r);
                }}
                className="flex flex-col gap-2"
              >
                <label htmlFor={`reply-${r.id}`} className="text-small font-bold">
                  {t('spoiled.replyLabel')}
                </label>
                <textarea
                  id={`reply-${r.id}`}
                  rows={2}
                  maxLength={REPLY_MAX}
                  value={drafts[r.id] ?? r.farmerResponse ?? ''}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [r.id]: e.target.value }))}
                  placeholder={t('spoiled.replyPlaceholder')}
                  className="border-line-strong bg-surface-raised text-body min-h-18 rounded-sm border-[1.5px] p-3"
                />
                <Button type="submit" size="sm" className="self-start" disabled={saving === r.id}>
                  {t('spoiled.save')}
                </Button>
              </form>
            ) : (
              <>
                {r.farmerResponse && <p className="text-small">{t('spoiled.yourReply', { text: r.farmerResponse })}</p>}
                {r.decisionNote && <p className="text-small">{t('spoiled.decisionNote', { text: r.decisionNote })}</p>}
              </>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
```

- [ ] **Step 5: Thêm tab vào `index.tsx`**

1. Import `useSearchParams` từ `react-router`, `Tabs from '@/components/ui/tabs'`, `QualityReports from './QualityReports'`.
2. Sau `type Filter = …` thêm `type Tab = 'reviews' | 'spoiled';`.
3. Ngay sau `const { t: tc } = useTranslation();`:

```tsx
  // The tab lives in the address, so the spoilage notifications (/farmer/reviews?tab=spoiled) open it
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: Tab = searchParams.get('tab') === 'spoiled' ? 'spoiled' : 'reviews';
  const setTab = (next: Tab) => setSearchParams(next === 'spoiled' ? { tab: 'spoiled' } : {}, { replace: true });
```

4. Thay toàn bộ câu lệnh `return (…)` của component bằng bản dưới. Khối đầu trang, hàng chip, danh sách review và dòng `note` giữ nguyên từng dòng như hiện có; chỉ thêm thanh tab và nhánh `spoiled`:

```tsx
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-h1">{t('title')}</h1>
          <p className="text-body max-w-160">{t('intro')}</p>
        </div>
        {profile && (
          <div className="flex flex-col items-end gap-1">
            <Rating value={profile.ratingAvg} count={profile.ratingCount} />
            <span className="text-small text-ink-muted">
              {t('summary', {
                stall: rating(profile.ratingAvg),
                reviews: t('reviewCount', { count: profile.ratingCount }),
              })}
            </span>
          </div>
        )}
      </div>

      <Tabs
        label={t('tabs.label')}
        value={tab}
        onChange={(id) => setTab(id as Tab)}
        tabs={[
          { id: 'reviews', label: t('tabs.reviews') },
          { id: 'spoiled', label: t('tabs.spoiled') },
        ]}
      />

      {tab === 'spoiled' ? (
        <QualityReports />
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((it) => (
              <Chip key={it.id} pressed={filter === it.id} onClick={() => setFilter(it.id)}>
                {t(`filter.${it.id}`)}{' '}
                {it.countable && <span className="text-[12px] tabular-nums opacity-80">{counts[it.id]}</span>}
              </Chip>
            ))}
          </div>

          {reviewsLoad.kind === 'loading' || profileLoad.kind === 'loading' ? (
            <MarketCardSkeleton count={2} />
          ) : reviewsLoad.kind === 'error' ? (
            <LoadError noun={t('noun')} onRetry={retryReviews} />
          ) : shown.length ? (
            <div className="flex flex-col gap-4">
              {shown.map((r) => (
                <ReviewCard
                  key={r.id}
                  author={r.author}
                  date={r.date}
                  target={r.target}
                  rating={r.rating}
                  text={r.text}
                  reply={r.reply}
                  fluid
                  actions={
                    r.reply || openReply === r.id ? undefined : (
                      <Button variant="secondary" size="sm" onClick={() => setOpenReply(r.id)}>
                        {t('action.reply')}
                      </Button>
                    )
                  }
                >
                  {!r.reply && openReply === r.id && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void postReply(r.id, r.author);
                      }}
                      className="mt-2 flex flex-col gap-2"
                    >
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor={`reply${r.id}`} className="text-small font-bold">
                          {t('form.label')}
                        </label>
                        <textarea
                          id={`reply${r.id}`}
                          value={drafts[r.id] ?? ''}
                          onChange={(e) => setDrafts((prev) => ({ ...prev, [r.id]: e.target.value }))}
                          placeholder={t('form.placeholder', { name: r.author })}
                          className="border-line-strong bg-surface-raised text-body min-h-18 rounded-sm border-[1.5px] p-3"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button type="submit" size="sm" disabled={posting === r.id}>
                          {t('action.post')}
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setOpenReply(null)}>
                          {tc('actions.cancel')}
                        </Button>
                      </div>
                    </form>
                  )}
                </ReviewCard>
              ))}
            </div>
          ) : (
            <DataState title={t('empty.title')} text={t('empty.text')} />
          )}

          <p className="text-caption text-ink-muted">{t('note')}</p>
        </>
      )}
    </div>
  );
```

(`gap-1.5` trong form trả lời review là code có sẵn; không sửa ở task này.)

- [ ] **Step 6: Chạy lại test**

Run: `docker compose exec -T frontend sh -c 'npx vitest run src/pages/farmer/Reviews'`
Expected: 7 test PASS.

- [ ] **Step 7: Kiểm và commit**

```bash
docker compose exec -T frontend sh -c 'npx prettier --write src/pages/farmer/Reviews src/locales && npx tsc -b && npx eslint src'
git add frontend/src/pages/farmer/Reviews frontend/src/locales/*/FarmerReviews.json
git commit -m "feat(FR-122): stalls read spoiled reports and reply from the reviews page"
```

---

### Task 14: Tab "Spoiled reports" ở Moderation của admin, xác nhận và bác (FR-123)

**Files:**
- Create: `frontend/src/pages/admin/Moderation/QualityReports.tsx`, `frontend/src/pages/admin/Moderation/QualityReports.test.tsx`
- Create: `frontend/src/pages/admin/Moderation/index.test.tsx`
- Modify: `frontend/src/pages/admin/Moderation/index.tsx`
- Modify: `frontend/src/locales/*/AdminModeration.json` (10 file)

**Interfaces:**
- Consumes: Task 11 (`QualityReportApi.adminList`, `confirm`, `dismiss`, `AdminQualityFilter`, `QualityReportDto`, `reportPhotoSrc`, `STRIKES_TO_LOCK`, `STRIKE_WINDOW_DAYS`, copy `spoilage.*`), `ADMIN_FARMERS_PATH` (`constants/nav.ts`), `Chip`, `Dialog`, `ButtonLink`.
- Produces: component mặc định `QualityReports` (không prop); tab `quality` của Moderation, đọc từ `?tab=quality` (link của `QUALITY_ESCALATED`); nút "Suspend stall" dẫn tới `/admin/farmers/{farmerId}?suspend=shelfLifeViolations` (Task 15 mở dialog từ link này).

- [ ] **Step 1: Thêm copy vào `AdminModeration.json` (10 ngôn ngữ)**

Trong khối `tab`, thêm `"quality": "Spoiled reports"` (`vi`: `"quality": "Báo hàng hư"`). Ở cấp gốc, khối `quality`. Bản `en`:

```json
  "quality": {
    "boundary": "Only a confirmed report on an extended shelf life that spoiled before its date records a strike. Nothing happens to a stall just because a customer reported.",
    "filterLabel": "Filter spoiled reports",
    "filter": {
      "needs": "Needs a decision",
      "open": "All open",
      "decided": "Decided"
    },
    "noun": "spoiled reports",
    "emptyTitle": "Nothing to decide",
    "emptyText": "Spoiled reports from customers wait here for you.",
    "line": "{{code}} · {{product}} · {{stall}}",
    "details": "Customer: {{customer}} · picked up {{pickup}} · good until {{bestBefore}} · spoiled {{spoiled}} ({{when}})",
    "photoAlt": "The customer's photo of the spoiled produce",
    "reply": "Stall reply: “{{text}}”",
    "noReply": "The stall has not replied.",
    "dismiss": "Not the stall's fault",
    "confirm": "Confirm violation",
    "dismissTitle": "Not the stall's fault?",
    "dismissText": "The report closes without a strike. The customer and the stall are told.",
    "confirmTitle": "Confirm the violation?",
    "confirmText": "The report closes as confirmed. The customer and the stall are told.",
    "confirmStrike": "The stall extended this shelf life and it spoiled before its date, so a strike is recorded and the product goes back to the suggested shelf life.",
    "noteLabel": "Why it is not the stall's fault",
    "noteOptional": "Note for the customer and the stall (optional)",
    "noteRequired": "Say why this is not the stall's fault.",
    "decisionNote": "Note: {{text}}",
    "done": "Decision saved. The customer and the stall have been told.",
    "suspend": "Suspend stall",
    "suspendLabel": "Suspend stall: {{stall}}"
  }
```

Bản `vi`:

```json
  "quality": {
    "boundary": "Chỉ báo hư được xác nhận trên món kéo dài hạn và hư trước hạn mới ghi lỗi cho sạp. Khách báo thôi thì sạp không bị gì.",
    "filterLabel": "Lọc báo hàng hư",
    "filter": {
      "needs": "Cần xử lý",
      "open": "Tất cả đang mở",
      "decided": "Đã xử lý"
    },
    "noun": "báo cáo hàng hư",
    "emptyTitle": "Không có gì cần xử lý",
    "emptyText": "Báo hàng hư của khách sẽ chờ bạn ở đây.",
    "line": "{{code}} · {{product}} · {{stall}}",
    "details": "Khách: {{customer}} · nhận {{pickup}} · hạn đến {{bestBefore}} · hư ngày {{spoiled}} ({{when}})",
    "photoAlt": "Ảnh hàng hư của khách",
    "reply": "Sạp phản hồi: “{{text}}”",
    "noReply": "Sạp chưa phản hồi.",
    "dismiss": "Không phải lỗi sạp",
    "confirm": "Xác nhận vi phạm",
    "dismissTitle": "Không phải lỗi sạp?",
    "dismissText": "Báo cáo đóng lại, không ghi lỗi. Khách và sạp được báo.",
    "confirmTitle": "Xác nhận vi phạm?",
    "confirmText": "Báo cáo đóng lại ở trạng thái đã xác nhận. Khách và sạp được báo.",
    "confirmStrike": "Sạp đã kéo dài hạn dùng của món này và hàng hư trước hạn, nên sạp bị ghi một lỗi và hạn dùng của sản phẩm về lại mốc gợi ý.",
    "noteLabel": "Vì sao không phải lỗi sạp",
    "noteOptional": "Ghi chú cho khách và sạp (không bắt buộc)",
    "noteRequired": "Hãy ghi vì sao không phải lỗi sạp.",
    "decisionNote": "Ghi chú: {{text}}",
    "done": "Đã lưu quyết định. Khách và sạp đã được báo.",
    "suspend": "Đình chỉ sạp",
    "suspendLabel": "Đình chỉ sạp: {{stall}}"
  }
```

8 ngôn ngữ còn lại: dịch từ bản `en`, giữ `{{…}}`.

- [ ] **Step 2: Viết test (sẽ fail)**

`pages/admin/Moderation/QualityReports.test.tsx`:

```tsx
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import QualityReports from './QualityReports';
import QualityReportApi, { type QualityReportDto } from '@/api-requests/quality-report.requests';

vi.mock('@/api-requests/quality-report.requests', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/api-requests/quality-report.requests')>();
  return { ...real, default: { adminList: vi.fn(), confirm: vi.fn(), dismiss: vi.fn() } };
});

const report = (patch: Partial<QualityReportDto> = {}): QualityReportDto => ({
  id: 9,
  orderId: 21,
  orderCode: 'ML-20260920-0007',
  farmerId: 15,
  stallName: 'Vườn Út Hiền',
  stallStatus: 'approved',
  customerName: 'Nguyễn Văn An',
  productId: 3,
  productName: 'Rau muống',
  pickupDate: '2026-10-03',
  bestBefore: '2026-10-07',
  storageMode: 'chilled',
  spoiledOn: '2026-10-05',
  beforePromise: true,
  problem: 'mold',
  note: 'Lá úng đen sau 2 ngày để ngăn mát',
  photoUrl: null,
  shelfLifeExtended: true,
  extendedByDays: 2,
  status: 'open',
  farmerResponse: null,
  farmerRespondedAt: null,
  decisionNote: null,
  decidedAt: null,
  createdAt: '2026-10-05T13:00:00Z',
  stallActiveStrikes: 1,
  ...patch,
});

const page = (items: QualityReportDto[]) => ({ items, page: 1, pageSize: 50, total: items.length });

const renderQueue = () =>
  render(
    <MemoryRouter>
      <QualityReports />
    </MemoryRouter>,
  );

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.open = true;
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.open = false;
  });
  vi.mocked(QualityReportApi.adminList).mockReset().mockResolvedValue(page([report()]));
  vi.mocked(QualityReportApi.confirm).mockReset();
  vi.mocked(QualityReportApi.dismiss).mockReset();
});

describe('QualityReports (admin, FR-123)', () => {
  it('opens on the reports that need a decision, with everything the decision rests on', async () => {
    renderQueue();

    expect(await screen.findByText('ML-20260920-0007 · Rau muống · Vườn Út Hiền')).toBeInTheDocument();
    expect(QualityReportApi.adminList).toHaveBeenCalledWith({ status: 'open', escalated: true, pageSize: 50 });
    expect(screen.getByText('Extended +2 days')).toBeInTheDocument();
    expect(
      screen.getByText(
        /Customer: Nguyễn Văn An · picked up Sat 03\/10 · good until Wed 07\/10 · spoiled Mon 05\/10 \(before its date\)/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('The stall has not replied.')).toBeInTheDocument();
    expect(screen.getByText('Shelf-life strikes: 1 of 3 in 90 days')).toBeInTheDocument();
  });

  it('switches to the decided reports', async () => {
    renderQueue();

    await userEvent.click(await screen.findByRole('button', { name: 'Decided' }));

    expect(QualityReportApi.adminList).toHaveBeenLastCalledWith({ status: 'decided', pageSize: 50 });
  });

  it("asks for a note before saying it is not the stall's fault", async () => {
    vi.mocked(QualityReportApi.dismiss).mockResolvedValue(
      report({ status: 'dismissed', decisionNote: 'Khách để nhiệt độ thường.' }),
    );
    renderQueue();
    await userEvent.click(await screen.findByRole('button', { name: "Not the stall's fault" }));
    const dialog = screen.getByRole('dialog');

    await userEvent.click(within(dialog).getByRole('button', { name: "Not the stall's fault" }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent("Say why this is not the stall's fault.");
    expect(QualityReportApi.dismiss).not.toHaveBeenCalled();

    await userEvent.type(within(dialog).getByLabelText("Why it is not the stall's fault"), 'Khách để nhiệt độ thường.');
    await userEvent.click(within(dialog).getByRole('button', { name: "Not the stall's fault" }));

    expect(QualityReportApi.dismiss).toHaveBeenCalledWith(9, 'Khách để nhiệt độ thường.');
    expect(await screen.findByText(/Note: Khách để nhiệt độ thường\./)).toBeInTheDocument();
  });

  /** Spec §4.4.3: the card stays in place and, at 3 strikes, offers the suspend flow. */
  it('confirms the violation and offers to suspend a stall that reached 3 strikes', async () => {
    vi.mocked(QualityReportApi.confirm).mockResolvedValue(report({ status: 'confirmed', stallActiveStrikes: 3 }));
    renderQueue();
    await userEvent.click(await screen.findByRole('button', { name: 'Confirm violation' }));
    const dialog = screen.getByRole('alertdialog');

    expect(within(dialog).getByText(/a strike is recorded/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirm violation' }));

    expect(QualityReportApi.confirm).toHaveBeenCalledWith(9, undefined);
    expect(await screen.findByText('Confirmed by an admin')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Suspend stall: Vườn Út Hiền' })).toHaveAttribute(
      'href',
      '/admin/farmers/15?suspend=shelfLifeViolations',
    );
  });

  it('does not offer to suspend below 3 strikes or a stall already suspended', async () => {
    vi.mocked(QualityReportApi.adminList).mockResolvedValue(
      page([
        report({ status: 'confirmed', stallActiveStrikes: 2 }),
        report({ id: 10, status: 'confirmed', stallActiveStrikes: 3, stallStatus: 'suspended' }),
      ]),
    );
    renderQueue();

    expect(await screen.findAllByText('Confirmed by an admin')).toHaveLength(2);
    expect(screen.queryByRole('link', { name: /Suspend stall/ })).not.toBeInTheDocument();
  });

  it('says so when the queue is empty, and offers a retry when it did not load', async () => {
    vi.mocked(QualityReportApi.adminList).mockResolvedValueOnce(page([]));
    const first = renderQueue();
    expect(await screen.findByText('Nothing to decide')).toBeInTheDocument();
    first.unmount();

    vi.mocked(QualityReportApi.adminList).mockRejectedValueOnce(new Error('network'));
    renderQueue();
    await userEvent.click(await screen.findByRole('button', { name: /try again/i }));
    expect(await screen.findByText('ML-20260920-0007 · Rau muống · Vườn Út Hiền')).toBeInTheDocument();
  });
});
```

`pages/admin/Moderation/index.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminModerationPage from './index';
import ProductApi from '@/api-requests/product.requests';
import ReviewApi from '@/api-requests/review.requests';

vi.mock('@/api-requests/product.requests', () => ({
  default: { list: vi.fn(), adminHidden: vi.fn(), adminHide: vi.fn(), adminUnhide: vi.fn() },
}));
vi.mock('@/api-requests/review.requests', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/api-requests/review.requests')>();
  return { ...real, default: { adminList: vi.fn(), hide: vi.fn(), unhide: vi.fn() } };
});
vi.mock('./ReportedMessages', () => ({ default: () => <p>reported messages queue</p> }));
vi.mock('./QualityReports', () => ({ default: () => <p>spoiled reports queue</p> }));

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin/moderation" element={<AdminModerationPage />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.mocked(ProductApi.list).mockResolvedValue({ items: [] } as never);
  vi.mocked(ProductApi.adminHidden).mockResolvedValue([] as never);
  vi.mocked(ReviewApi.adminList).mockResolvedValue({ items: [] } as never);
});

describe('AdminModerationPage tabs', () => {
  /** FR-123: QUALITY_ESCALATED links to /admin/moderation?tab=quality. */
  it('opens the spoiled reports queue from the address', async () => {
    renderAt('/admin/moderation?tab=quality');

    expect(await screen.findByText('spoiled reports queue')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Spoiled reports' })).toHaveAttribute('aria-selected', 'true');
  });

  it('starts on the reviews and switches to the spoiled reports', async () => {
    renderAt('/admin/moderation');

    expect(screen.getByRole('tab', { name: 'Reviews' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(screen.getByRole('tab', { name: 'Spoiled reports' }));
    expect(await screen.findByText('spoiled reports queue')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Chạy test để thấy fail**

Run: `docker compose exec -T frontend sh -c 'npx vitest run src/pages/admin/Moderation'`
Expected: các test mới FAIL (`Failed to resolve import "./QualityReports"`); `ReportedMessages.test.tsx` vẫn PASS.

- [ ] **Step 4: Viết `QualityReports.tsx`**

```tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import QualityReportApi, {
  reportPhotoSrc,
  type AdminQualityFilter,
  type QualityReportDto,
} from '@/api-requests/quality-report.requests';
import MarketCardSkeleton from '@/components/MarketCardSkeleton';
import { stockDay } from '@/components/stockDay';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { DataState, LoadError } from '@/components/ui/data-state';
import { Dialog } from '@/components/ui/dialog';
import { ADMIN_FARMERS_PATH } from '@/constants/nav';
import useRequest from '@/hooks/useRequest';
import { STRIKE_WINDOW_DAYS, STRIKES_TO_LOCK } from '@/lib/spoilage';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';

const FILTERS = ['needs', 'open', 'decided'] as const;
type Filter = (typeof FILTERS)[number];

/** Spec §4.4.3: "Needs a decision" = open, an extended shelf life, spoiled before its date. */
const QUERY: Record<Filter, AdminQualityFilter> = {
  needs: { status: 'open', escalated: true, pageSize: 50 },
  open: { status: 'open', pageSize: 50 },
  decided: { status: 'decided', pageSize: 50 },
};

type Deciding = { report: QualityReportDto; kind: 'confirm' | 'dismiss' };

/**
 * FR-123 — the admin's spoiled-produce queue: the report, the promise on the order, the stall's reply and its strikes,
 * then "Not the stall's fault" (note required) or "Confirm violation". A decided card stays where it is, so the
 * "Suspend stall" link shows at once when the stall reached 3 strikes (Ruling 7).
 */
export default function QualityReports() {
  const { t } = useTranslation('AdminModeration');
  const { t: tc } = useTranslation();
  const [filter, setFilter] = useState<Filter>('needs');
  const { state, retry, mutate } = useRequest(`admin-quality:${filter}`, () =>
    QualityReportApi.adminList(QUERY[filter]).then((result) => result.items),
  );
  const [deciding, setDeciding] = useState<Deciding | null>(null);
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const open = (report: QualityReportDto, kind: Deciding['kind']) => {
    setDeciding({ report, kind });
    setNote('');
    setNoteError(undefined);
  };

  const decide = async () => {
    if (!deciding) return;
    const text = note.trim();
    if (deciding.kind === 'dismiss' && !text) {
      setNoteError(t('quality.noteRequired'));
      return;
    }
    setBusy(true);
    try {
      const updated =
        deciding.kind === 'confirm'
          ? await QualityReportApi.confirm(deciding.report.id, text || undefined)
          : await QualityReportApi.dismiss(deciding.report.id, text);
      mutate((items) => items.map((r) => (r.id === updated.id ? updated : r)));
      Notification.success({ text: t('quality.done') });
      setDeciding(null);
    } catch (error) {
      const fields = Helper.getFieldErrors(error);
      if (fields.note) setNoteError(fields.note);
      else Notification.error({ text: Helper.getErrorMessage(error, tc('errors.network')) });
    } finally {
      setBusy(false);
    }
  };

  const strikeFollows = deciding?.kind === 'confirm' && deciding.report.shelfLifeExtended && deciding.report.beforePromise;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-ink-muted max-w-160">{t('quality.boundary')}</p>
      <div role="group" aria-label={t('quality.filterLabel')} className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Chip key={f} pressed={filter === f} onClick={() => setFilter(f)}>
            {t(`quality.filter.${f}`)}
          </Chip>
        ))}
      </div>

      {state.kind === 'loading' ? (
        <MarketCardSkeleton count={2} />
      ) : state.kind === 'error' ? (
        <LoadError noun={t('quality.noun')} onRetry={retry} />
      ) : state.data.length === 0 ? (
        <DataState title={t('quality.emptyTitle')} text={t('quality.emptyText')} />
      ) : (
        <div className="flex flex-col gap-4">
          {state.data.map((r) => (
            <Card as="article" key={r.id} aria-labelledby={`quality-${r.id}`} className="flex flex-col gap-2 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 id={`quality-${r.id}`} className="text-[17px] font-bold">
                  {t('quality.line', { code: r.orderCode, product: r.productName, stall: r.stallName })}
                </h3>
                {r.shelfLifeExtended && (
                  <span className="bg-warning-bg text-warning-ink rounded-full px-2 text-[13px] font-bold">
                    {tc('spoilage.extended', { count: r.extendedByDays })}
                  </span>
                )}
              </div>
              <p className="text-small text-ink-muted">
                {t('quality.details', {
                  customer: r.customerName,
                  pickup: stockDay(r.pickupDate),
                  bestBefore: stockDay(r.bestBefore) ?? '—',
                  spoiled: stockDay(r.spoiledOn),
                  when: tc(r.beforePromise ? 'spoilage.beforePromise' : 'spoilage.afterPromise'),
                })}
              </p>
              <p>
                {r.note
                  ? tc('spoilage.problemWithNote', { problem: tc(`spoilage.problem.${r.problem}`), note: r.note })
                  : tc(`spoilage.problem.${r.problem}`)}
              </p>
              {r.photoUrl && (
                <a href={reportPhotoSrc(r.photoUrl)} target="_blank" rel="noreferrer" className="self-start">
                  <img
                    src={reportPhotoSrc(r.photoUrl)}
                    alt={t('quality.photoAlt')}
                    className="border-line size-24 rounded-sm border object-cover"
                  />
                </a>
              )}
              <p className="text-small">
                {r.farmerResponse ? t('quality.reply', { text: r.farmerResponse }) : t('quality.noReply')}
              </p>
              <p className="text-small font-bold">
                {tc('spoilage.strikes', { count: r.stallActiveStrikes, limit: STRIKES_TO_LOCK, days: STRIKE_WINDOW_DAYS })}
              </p>
              {r.status === 'open' ? (
                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="secondary" size="sm" onClick={() => open(r, 'dismiss')}>
                    {t('quality.dismiss')}
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => open(r, 'confirm')}>
                    {t('quality.confirm')}
                  </Button>
                </div>
              ) : (
                <p className="text-small">
                  <b>{tc(`spoilage.status.${r.status}`)}</b>
                  {r.decisionNote ? ` · ${t('quality.decisionNote', { text: r.decisionNote })}` : ''}
                </p>
              )}
              {r.stallActiveStrikes >= STRIKES_TO_LOCK && r.stallStatus === 'approved' && (
                <ButtonLink
                  to={`${ADMIN_FARMERS_PATH}/${r.farmerId}?suspend=shelfLifeViolations`}
                  variant="danger"
                  size="sm"
                  className="self-end"
                  aria-label={t('quality.suspendLabel', { stall: r.stallName })}
                >
                  {t('quality.suspend')}
                </ButtonLink>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={deciding !== null}
        tone={deciding?.kind === 'confirm' ? 'danger' : undefined}
        title={deciding ? t(deciding.kind === 'confirm' ? 'quality.confirmTitle' : 'quality.dismissTitle') : ''}
        onClose={() => setDeciding(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setDeciding(null)} disabled={busy}>
              {tc('actions.cancel')}
            </Button>
            <Button
              variant={deciding?.kind === 'confirm' ? 'dangerFill' : 'primary'}
              onClick={() => void decide()}
              disabled={busy}
            >
              {deciding?.kind === 'confirm' ? t('quality.confirm') : t('quality.dismiss')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p>{deciding?.kind === 'confirm' ? t('quality.confirmText') : t('quality.dismissText')}</p>
          {strikeFollows && <p className="text-small font-bold">{t('quality.confirmStrike')}</p>}
          <div className="flex flex-col gap-1">
            <label htmlFor="quality-note" className="text-small font-bold">
              {deciding?.kind === 'dismiss' ? t('quality.noteLabel') : t('quality.noteOptional')}
            </label>
            <textarea
              id="quality-note"
              rows={3}
              maxLength={255}
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setNoteError(undefined);
              }}
              aria-invalid={!!noteError}
              aria-describedby={noteError ? 'quality-note-error' : undefined}
              className={Helper.cn(
                'bg-surface-raised text-body min-h-18 rounded-sm border-[1.5px] p-3',
                noteError ? 'border-danger' : 'border-line-strong',
              )}
            />
            {noteError && (
              <span id="quality-note-error" role="alert" className="text-danger text-[13px] font-bold">
                {noteError}
              </span>
            )}
          </div>
        </div>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 5: Thêm tab vào `index.tsx`**

1. Import `useSearchParams` từ `react-router` và `QualityReports from './QualityReports'`.
2. Đổi `type Tab = 'reviews' | 'products' | 'hidden' | 'messages';` thành:

```tsx
type Tab = 'reviews' | 'products' | 'hidden' | 'messages' | 'quality';
const TABS: Tab[] = ['reviews', 'products', 'hidden', 'messages', 'quality'];
```

3. Thay dòng `const [tab, setTab] = useState<Tab>('reviews');` bằng:

```tsx
  // The tab lives in the address, so the QUALITY_ESCALATED notification (/admin/moderation?tab=quality) opens it
  const [searchParams, setSearchParams] = useSearchParams();
  const asked = searchParams.get('tab') as Tab | null;
  const tab: Tab = asked && TABS.includes(asked) ? asked : 'reviews';
  const setTab = (next: Tab) => setSearchParams(next === 'reviews' ? {} : { tab: next }, { replace: true });
```

4. Trong prop `tabs` của `<Tabs>`, thêm sau dòng `messages`: `{ id: 'quality', label: t('tab.quality') },`.
5. Ngay sau `{tab === 'messages' && <ReportedMessages />}` thêm `{tab === 'quality' && <QualityReports />}`.

- [ ] **Step 6: Chạy lại test**

Run: `docker compose exec -T frontend sh -c 'npx vitest run src/pages/admin/Moderation'`
Expected: toàn bộ PASS (6 test mới của `QualityReports`, 2 của `index`, 6 cũ của `ReportedMessages`).

- [ ] **Step 7: Kiểm và commit**

```bash
docker compose exec -T frontend sh -c 'npx prettier --write src/pages/admin/Moderation src/locales && npx tsc -b && npx eslint src'
git add frontend/src/pages/admin/Moderation frontend/src/locales/*/AdminModeration.json
git commit -m "feat(FR-123): admins decide spoiled reports from the moderation queue"
```

---

### Task 15: Lý do đình chỉ "Vi phạm hạn dùng" và thẻ số lỗi ở chi tiết sạp của admin (FR-123)

**Files:**
- Modify: `frontend/src/lib/reasons.ts`, `frontend/src/lib/reasons.test.ts`
- Modify: `frontend/src/types/farmer.types.ts` (`AdminFarmerDetailType`)
- Modify: `frontend/src/pages/admin/FarmerDetail/index.tsx`
- Create: `frontend/src/pages/admin/FarmerDetail/index.test.tsx`
- Modify: `frontend/src/locales/*/common.json` (khối `reasons.suspend`), `frontend/src/locales/*/AdminFarmerDetail.json` (10 file mỗi loại)

**Interfaces:**
- Consumes: Task 10 (`activeViolations`, `extensionLockedUntil` trong `GET /admin/farmers/{id}`), Task 11 (`STRIKES_TO_LOCK`, `STRIKE_WINDOW_DAYS`), Task 14 (link `?suspend=shelfLifeViolations`), luồng đình chỉ có sẵn của trang (`dialog`, `reason`, `ReasonField`, `composeReason`, `AdminFarmerApi.suspend(id, reason)`).
- Produces: mã lý do `shelfLifeViolations` trong `REASON_CODES.suspend`; `isReasonCode(kind: ReasonKind, code: string): boolean`; `AdminFarmerDetailType.activeViolations: number`, `extensionLockedUntil: string | null`; trang chi tiết sạp mở dialog đình chỉ với lý do đã chọn khi địa chỉ có `?suspend=<mã hợp lệ>` và sạp đang `approved`.

- [ ] **Step 1: Thêm copy (10 ngôn ngữ mỗi file)**

`common.json`, trong `reasons.suspend`, thêm dòng cuối: `en` `"shelfLifeViolations": "Shelf-life violations"`, `vi` `"shelfLifeViolations": "Vi phạm hạn dùng"`.

`AdminFarmerDetail.json`, khối mới ở cấp gốc. Bản `en`:

```json
  "strikes": {
    "title": "Shelf-life strikes",
    "count": "{{count}} of {{limit}} in the last {{days}} days",
    "locked": "Longer shelf lives are locked until {{date}}.",
    "clear": "The stall can still set a longer shelf life with a promise.",
    "text": "A strike is recorded when an admin confirms a spoiled report on an extended shelf life."
  }
```

Bản `vi`:

```json
  "strikes": {
    "title": "Lỗi hạn dùng",
    "count": "{{count}}/{{limit}} trong {{days}} ngày gần nhất",
    "locked": "Bị khoá kéo dài hạn dùng tới {{date}}.",
    "clear": "Sạp vẫn kéo dài hạn dùng được nếu có cam kết.",
    "text": "Mỗi lỗi được ghi khi admin xác nhận một báo hư trên món có hạn dùng do sạp kéo dài."
  }
```

8 ngôn ngữ còn lại: dịch từ bản `en`, giữ `{{…}}`.

- [ ] **Step 2: Viết test (sẽ fail)**

Thêm vào `lib/reasons.test.ts` (import thêm `isReasonCode`):

```ts
describe('the shelf-life reason (FR-123)', () => {
  it('is one of the suspend reasons, for links that preselect it', () => {
    expect(isReasonCode('suspend', 'shelfLifeViolations')).toBe(true);
    expect(isReasonCode('suspend', 'duplicate')).toBe(false);
    expect(isReasonCode('reject', 'shelfLifeViolations')).toBe(false);
  });

  it('reads as the Farmer sees it', () => {
    expect(composeReason('suspend', { codes: ['shelfLifeViolations'], note: '' })).toBe('Shelf-life violations');
  });
});
```

`pages/admin/FarmerDetail/index.test.tsx`:

```tsx
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminFarmerDetailPage from './index';
import AdminFarmerApi from '@/api-requests/admin-farmer.requests';

vi.mock('@/api-requests/admin-farmer.requests', () => ({
  default: { detail: vi.fn(), suspend: vi.fn(), approve: vi.fn(), reject: vi.fn(), reinstate: vi.fn() },
}));

const farmer = (patch: Record<string, unknown> = {}) => ({
  id: 15,
  userId: 3,
  stallName: 'Vườn Út Hiền',
  contactPerson: 'Lê Thị Út Hiền',
  email: 'farmer@marketlink.vn',
  phone: '0900000003',
  address: '25 Lê Quang Định, Phường Gia Định',
  approvalStatus: 'approved',
  rejectReason: null,
  suspendReason: null,
  approvedAt: '2026-09-20T03:00:00Z',
  suspendedAt: null,
  createdAt: '2026-09-19T03:00:00Z',
  history: [],
  customerSince: '2026-09-01T03:00:00Z',
  accountStatus: 'active',
  description: null,
  photoUrls: [],
  videoUrl: null,
  activeViolations: 3,
  extensionLockedUntil: '2026-11-30T03:00:00Z',
  ...patch,
});

const ok = (data: unknown) => ({ success: true, message: '', data, timestamp: '' }) as never;

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin/farmers/:id" element={<AdminFarmerDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.open = true;
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.open = false;
  });
  vi.mocked(AdminFarmerApi.detail).mockReset().mockResolvedValue(ok(farmer()));
  vi.mocked(AdminFarmerApi.suspend).mockReset().mockResolvedValue(ok(farmer({ approvalStatus: 'suspended' })));
});

describe('AdminFarmerDetailPage — shelf-life strikes (FR-123)', () => {
  it("shows the stall's strikes and when the lock ends", async () => {
    renderAt('/admin/farmers/15');

    expect(await screen.findByText('3 of 3 in the last 90 days')).toBeInTheDocument();
    expect(screen.getByText('Longer shelf lives are locked until 30/11/2026.')).toBeInTheDocument();
  });

  it('opens the suspend dialog with the shelf-life reason when the spoiled-report queue sends the admin here', async () => {
    renderAt('/admin/farmers/15?suspend=shelfLifeViolations');

    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByRole('button', { name: 'Shelf-life violations' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await userEvent.click(within(dialog).getByRole('button', { name: 'Suspend stall' }));

    expect(AdminFarmerApi.suspend).toHaveBeenCalledWith(15, 'Shelf-life violations');
  });

  it('does not open it for a stall that is not approved any more', async () => {
    vi.mocked(AdminFarmerApi.detail).mockResolvedValue(
      ok(farmer({ approvalStatus: 'suspended', activeViolations: 0, extensionLockedUntil: null })),
    );
    renderAt('/admin/farmers/15?suspend=shelfLifeViolations');

    expect(await screen.findByText('0 of 3 in the last 90 days')).toBeInTheDocument();
    expect(screen.getByText('The stall can still set a longer shelf life with a promise.')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Chạy test để thấy fail**

Run: `docker compose exec -T frontend sh -c 'npx vitest run src/lib/reasons.test.ts src/pages/admin/FarmerDetail'`
Expected: FAIL (`isReasonCode` chưa có; không tìm thấy "3 of 3 in the last 90 days").

- [ ] **Step 4: Sửa `lib/reasons.ts` và kiểu**

`lib/reasons.ts`: dòng `suspend: [...]` thành

```ts
  suspend: ['complaints', 'notAsDescribed', 'missedPickups', 'rulesBroken', 'ownerRequest', 'shelfLifeViolations'],
```

và thêm sau `toggleReason`:

```ts
/** Whether `code` is one of the reasons of `kind` — for links that preselect one (FR-123 "Suspend stall"). */
export const isReasonCode = (kind: ReasonKind, code: string): boolean =>
  (REASON_CODES[kind] as readonly string[]).includes(code);
```

`types/farmer.types.ts`, trong `AdminFarmerDetailType`, sau `accountStatus: …;`:

```ts
  /** FR-123: shelf-life strikes of the last 90 days. */
  activeViolations: number;
  /** FR-123: when the lock on longer shelf lives ends (ISO 8601); null when the stall is not locked. */
  extensionLockedUntil: string | null;
```

- [ ] **Step 5: Sửa `pages/admin/FarmerDetail/index.tsx`**

1. Import: thêm `useRef` vào dòng import của `react`; thêm `useSearchParams` vào dòng import của `react-router`; đổi dòng import `lib/reasons` thành `import { composeReason, emptyReason, isReasonCode, type ReasonValue } from '@/lib/reasons';`; thêm `import { STRIKE_WINDOW_DAYS, STRIKES_TO_LOCK } from '@/lib/spoilage';`.
2. Ngay sau `const [reasonError, setReasonError] = useState<string>();`:

```tsx
  const [searchParams] = useSearchParams();
  // FR-123: the spoiled-report queue links here with ?suspend=<reason> to open the suspend dialog pre-filled, once
  const presetSuspend = useRef(searchParams.get('suspend'));
```

3. Thay toàn bộ `fetchDetail` bằng:

```tsx
  // only setState in a promise callback (the initial state is already loading)
  const fetchDetail = useCallback(() => {
    AdminFarmerApi.detail(Number(id))
      .then((response) => {
        setStatus({ kind: 'ready', data: response.data });
        const code = presetSuspend.current;
        presetSuspend.current = null;
        if (code && isReasonCode('suspend', code) && response.data.approvalStatus === 'approved') {
          setReason({ codes: [code], note: '' });
          setReasonError(undefined);
          setDialog('suspend');
        }
      })
      .catch(() => setStatus({ kind: 'error' }));
  }, [id]);
```

4. Trong `<aside className="flex flex-col gap-4">`, giữa thẻ "Applicant" (`<Card …><h2 className="text-h3">{t('applicant.title')}</h2>…</Card>`) và thẻ "approval", chèn:

```tsx
                  <Card className="flex flex-col gap-2 p-6">
                    <h2 className="text-h3">{t('strikes.title')}</h2>
                    <p className="text-[15px] font-bold">
                      {t('strikes.count', {
                        count: f.activeViolations,
                        limit: STRIKES_TO_LOCK,
                        days: STRIKE_WINDOW_DAYS,
                      })}
                    </p>
                    <p className="text-small">
                      {f.extensionLockedUntil
                        ? t('strikes.locked', { date: formatDate(new Date(f.extensionLockedUntil)) })
                        : t('strikes.clear')}
                    </p>
                    <p className="text-small text-ink-muted">{t('strikes.text')}</p>
                  </Card>
```

- [ ] **Step 6: Chạy lại test**

Run: `docker compose exec -T frontend sh -c 'npx vitest run src/lib/reasons.test.ts src/components/ReasonPicker.test.tsx src/pages/admin/FarmerDetail src/pages/admin/Farmers'`
Expected: toàn bộ PASS (`ReasonPicker.test.tsx` đếm 5 lý do của `reject`, không đổi).

- [ ] **Step 7: Kiểm và commit**

```bash
docker compose exec -T frontend sh -c 'npx prettier --write src/lib/reasons.ts src/lib/reasons.test.ts src/types/farmer.types.ts src/pages/admin/FarmerDetail src/locales && npx tsc -b && npx eslint src'
git add frontend/src/lib/reasons.ts frontend/src/lib/reasons.test.ts frontend/src/types/farmer.types.ts \
  frontend/src/pages/admin/FarmerDetail frontend/src/locales/*/common.json frontend/src/locales/*/AdminFarmerDetail.json
git commit -m "feat(FR-123): shelf-life strikes on the stall page and a ready-made suspend reason"
```

---

### Task 16: Khoá nút + trong form sản phẩm và thẻ số lỗi ở trang Tổng quan của Farmer (FR-123)

**Files:**
- Modify: `frontend/src/pages/farmer/ProductForm/ShelfLifeField.tsx` (của giai đoạn 1)
- Modify: `frontend/src/pages/farmer/ProductForm/index.tsx`, `frontend/src/pages/farmer/ProductForm/index.test.tsx`
- Create: `frontend/src/pages/farmer/Overview/ShelfLifeStrikes.tsx`, `frontend/src/pages/farmer/Overview/ShelfLifeStrikes.test.tsx`
- Modify: `frontend/src/pages/farmer/Overview/index.tsx`
- Modify: `frontend/src/locales/*/FarmerProductForm.json`, `frontend/src/locales/*/FarmerOverview.json` (10 file mỗi loại)

**Interfaces:**
- Consumes: Task 11 (`QualityReportApi.standing`, `ShelfLifeStandingDto`), giai đoạn 1: `ShelfLifeFieldProps`, dòng `const max = maxShelfLifeDays(suggestedDays);` và nút `aria-label={t('shelfLife.increase')}` ("One day more") trong `ShelfLifeField.tsx`; trong `ProductForm/index.tsx`: `const guideGroups = …`, `validate()` với dòng `if (days > maxShelfLifeDays(suggestedDays)) next.shelfLife = …`, biến `days`, `suggestedDays`, phần tử `<ShelfLifeField …/>`; trong `index.test.tsx`: `renderNew`, `renderEdit`, mock `ShelfLifeApi.forCategory` (nhóm "Leafy greens" có guide 12 ngăn mát gợi ý 3).
- Produces: prop `lockedUntil?: string | null` của `ShelfLifeField` (đúng tên phase1-interfaces); component mặc định `ShelfLifeStrikes` (không prop) cho trang Tổng quan.

- [ ] **Step 1: Thêm copy (10 ngôn ngữ mỗi file)**

`FarmerProductForm.json`, trong khối `shelfLife`, thêm. Bản `en`:

```json
    "locked": "Your stall can't go above the suggestion until {{date}}: it reached 3 shelf-life strikes in 90 days.",
    "overLock_one": "Your stall can't go above the suggestion for now. Lower it to {{count}} day.",
    "overLock_other": "Your stall can't go above the suggestion for now. Lower it to {{count}} days."
```

Bản `vi`:

```json
    "locked": "Sạp đang bị khoá kéo dài hạn dùng tới {{date}} vì có 3 lỗi hạn dùng trong 90 ngày.",
    "overLock_one": "Sạp đang bị khoá kéo dài hạn dùng. Hãy giảm về {{count}} ngày.",
    "overLock_other": "Sạp đang bị khoá kéo dài hạn dùng. Hãy giảm về {{count}} ngày."
```

`FarmerOverview.json`, khối mới ở cấp gốc. Bản `en`:

```json
  "strikes": {
    "title": "Shelf-life strikes: {{count}} of {{limit}} in {{days}} days",
    "text": "A confirmed spoiled report on an extended shelf life counts as a strike. 3 strikes lock longer shelf lives.",
    "locked": "Longer shelf lives are locked until {{date}}.",
    "link": "See the reports"
  }
```

Bản `vi`:

```json
  "strikes": {
    "title": "Lỗi hạn dùng: {{count}}/{{limit}} trong {{days}} ngày",
    "text": "Báo hư được xác nhận trên món kéo dài hạn tính là một lỗi. Đủ 3 lỗi thì bị khoá kéo dài hạn dùng.",
    "locked": "Sạp bị khoá kéo dài hạn dùng tới {{date}}.",
    "link": "Xem các báo cáo"
  }
```

8 ngôn ngữ còn lại: dịch từ bản `en`, giữ `{{…}}` và đủ `overLock_one`/`overLock_other`.

- [ ] **Step 2: Viết test (sẽ fail)**

Trong `pages/farmer/ProductForm/index.test.tsx` (bản giai đoạn 1):
1. Thêm mock và import:

```tsx
vi.mock('@/api-requests/quality-report.requests', () => ({ default: { standing: vi.fn() } }));
import QualityReportApi from '@/api-requests/quality-report.requests';
```

(đặt dòng `import` cùng nhóm import ở đầu file, dòng `vi.mock` cùng các `vi.mock` khác).

2. Trong `beforeEach`, thêm:

```tsx
  vi.mocked(QualityReportApi.standing).mockResolvedValue({
    activeViolations: 0,
    limit: 3,
    windowDays: 90,
    extensionLockedUntil: null,
  });
  vi.mocked(ProductApi.update).mockReset();
```

3. Thêm helper và 2 test trong `describe('FarmerProductFormPage', …)`:

```tsx
  const locked = () =>
    vi.mocked(QualityReportApi.standing).mockResolvedValue({
      activeViolations: 3,
      limit: 3,
      windowDays: 90,
      extensionLockedUntil: '2026-11-15T03:00:00Z',
    });

  /** Spec §4.2: while locked, the + button stops at the suggestion, with the reason next to it. */
  it('stops at the suggestion while the stall is locked, and says until when', async () => {
    locked();
    renderNew();
    await userEvent.click(await screen.findByLabelText(/Fridge 0–5 °C · suggested 3 days/));

    expect(await screen.findByText(/can't go above the suggestion until 15\/11\/2026/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'One day more' })).toBeDisabled();
  });

  /** Review Focus #2: an old extended product of a locked stall has to come back to the suggestion first. */
  it('asks a locked stall to lower an extended product before saving', async () => {
    locked();
    vi.mocked(ProductApi.getMine).mockResolvedValue({
      id: 5,
      name: 'Rau muống',
      categoryId: 1,
      unit: 'bunch',
      price: 0.5,
      stock: 10,
      status: 'available',
      shelfLife: { guideId: 12, groupName: 'Leafy greens', storageMode: 'chilled', days: 5, suggestedDays: 3, extended: true },
    } as never);
    renderEdit();

    await screen.findByText(/can't go above the suggestion until/);
    await userEvent.click(screen.getByRole('button', { name: 'Save product' }));

    expect(
      await screen.findByText("Your stall can't go above the suggestion for now. Lower it to 3 days."),
    ).toBeInTheDocument();
    expect(ProductApi.update).not.toHaveBeenCalled();
  });
```

`pages/farmer/Overview/ShelfLifeStrikes.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import ShelfLifeStrikes from './ShelfLifeStrikes';
import QualityReportApi from '@/api-requests/quality-report.requests';

vi.mock('@/api-requests/quality-report.requests', () => ({ default: { standing: vi.fn() } }));

const renderCard = () =>
  render(
    <MemoryRouter>
      <ShelfLifeStrikes />
    </MemoryRouter>,
  );

describe('ShelfLifeStrikes (FR-123)', () => {
  /** Spec §4.4.4: the card only shows when the stall has strikes. */
  it('shows nothing while the stall has no strikes', async () => {
    vi.mocked(QualityReportApi.standing).mockResolvedValue({
      activeViolations: 0,
      limit: 3,
      windowDays: 90,
      extensionLockedUntil: null,
    });
    const { container } = renderCard();

    await waitFor(() => expect(QualityReportApi.standing).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('counts the strikes and links to the reports', async () => {
    vi.mocked(QualityReportApi.standing).mockResolvedValue({
      activeViolations: 2,
      limit: 3,
      windowDays: 90,
      extensionLockedUntil: null,
    });
    renderCard();

    expect(await screen.findByText('Shelf-life strikes: 2 of 3 in 90 days')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'See the reports' })).toHaveAttribute('href', '/farmer/reviews?tab=spoiled');
  });

  it('says until when longer shelf lives are locked', async () => {
    vi.mocked(QualityReportApi.standing).mockResolvedValue({
      activeViolations: 3,
      limit: 3,
      windowDays: 90,
      extensionLockedUntil: '2026-11-15T03:00:00Z',
    });
    renderCard();

    expect(await screen.findByText(/Longer shelf lives are locked until 15\/11\/2026\./)).toBeInTheDocument();
  });

  /** Ruling 14: a secondary notice — a failed read leaves the dashboard as it was. */
  it('stays out of the way when the strikes cannot be read', async () => {
    vi.mocked(QualityReportApi.standing).mockRejectedValue(new Error('network'));
    const { container } = renderCard();

    await waitFor(() => expect(QualityReportApi.standing).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 3: Chạy test để thấy fail**

Run: `docker compose exec -T frontend sh -c 'npx vitest run src/pages/farmer/ProductForm/index.test.tsx src/pages/farmer/Overview/ShelfLifeStrikes.test.tsx'`
Expected: 2 test mới của form FAIL (không có dòng khoá, nút + chưa bị khoá); `ShelfLifeStrikes.test.tsx` FAIL (`Failed to resolve import "./ShelfLifeStrikes"`). Các test cũ của form vẫn PASS.

- [ ] **Step 4: Thêm prop `lockedUntil` vào `ShelfLifeField.tsx`**

1. Import `formatDate` từ `@/lib/format`.
2. Trong `ShelfLifeFieldProps`, thêm sau `onAcknowledge`:

```ts
  /** FR-123: while the stall has 3 strikes in 90 days, when the lock ends (ISO 8601); + then stops at the suggestion. */
  lockedUntil?: string | null;
```

3. Thêm `lockedUntil` vào danh sách destructure props.
4. Thay dòng `const max = maxShelfLifeDays(suggestedDays);` bằng:

```ts
  // FR-123 (spec §4.2): a locked stall cannot go above the suggestion, so the + button stops there
  const max = lockedUntil ? suggestedDays : maxShelfLifeDays(suggestedDays);
```

5. Ngay sau `{errors.days && <span className="text-danger text-[13px] font-bold">{errors.days}</span>}`, thêm:

```tsx
        {lockedUntil && (
          <span className="text-warning-ink text-[13px] font-bold">
            {t('shelfLife.locked', { date: formatDate(new Date(lockedUntil)) })}
          </span>
        )}
```

- [ ] **Step 5: Nối vào `ProductForm/index.tsx`**

1. Import `QualityReportApi from '@/api-requests/quality-report.requests'`.
2. Ngay sau dòng `const guideGroups = guidesLoad.kind === 'ready' ? guidesLoad.data : NO_GROUPS;` (giai đoạn 1 đặt nó trước mọi `return` sớm):

```tsx
  // FR-123: 3 shelf-life strikes in 90 days lock longer shelf lives until this moment (null = not locked)
  const { state: standingLoad } = useRequest('shelf-life-standing', () => QualityReportApi.standing());
  const lockedUntil = standingLoad.kind === 'ready' ? standingLoad.data.extensionLockedUntil : null;
```

3. Trong `validate()`, ngay sau dòng `if (days > maxShelfLifeDays(suggestedDays)) next.shelfLife = …;`:

```tsx
    // The server refuses it too (409 SHELF_LIFE_EXTENSION_LOCKED); say so before sending (Ruling 12)
    if (!next.shelfLife && lockedUntil && days > suggestedDays) {
      next.shelfLife = t('shelfLife.overLock', { count: suggestedDays });
    }
```

4. Thêm prop `lockedUntil={lockedUntil}` vào phần tử `<ShelfLifeField …/>`.

409 từ server không cần xử lý riêng: nó mang detail field `shelfLifeDays`, và `SERVER_FIELDS` có sẵn map `shelfLifeDays → shelfLife`, nên câu của server hiện ngay dưới ô hạn dùng.

- [ ] **Step 6: Viết `ShelfLifeStrikes.tsx` và gắn vào trang Tổng quan**

`pages/farmer/Overview/ShelfLifeStrikes.tsx`:

```tsx
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import QualityReportApi from '@/api-requests/quality-report.requests';
import { Banner } from '@/components/ui/banner';
import useRequest from '@/hooks/useRequest';
import { formatDate } from '@/lib/format';

/**
 * FR-123 (spec §4.4.4) — "Shelf-life strikes: 2 of 3 in 90 days" on the Farmer overview, only when the stall has
 * strikes. A secondary notice (Ruling 14): nothing while loading or when the read fails; the full list with its four
 * states is the Reviews → Spoiled reports tab.
 */
export default function ShelfLifeStrikes() {
  const { t } = useTranslation('FarmerOverview');
  const { state } = useRequest('shelf-life-standing', () => QualityReportApi.standing());
  if (state.kind !== 'ready' || state.data.activeViolations === 0) return null;
  const s = state.data;
  return (
    <Banner
      variant={s.extensionLockedUntil ? 'danger' : 'warning'}
      title={t('strikes.title', { count: s.activeViolations, limit: s.limit, days: s.windowDays })}
    >
      {s.extensionLockedUntil
        ? t('strikes.locked', { date: formatDate(new Date(s.extensionLockedUntil)) })
        : t('strikes.text')}{' '}
      <Link to="/farmer/reviews?tab=spoiled" className="underline">
        {t('strikes.link')}
      </Link>
    </Banner>
  );
}
```

`pages/farmer/Overview/index.tsx`: import `ShelfLifeStrikes from './ShelfLifeStrikes'`, rồi đặt `<ShelfLifeStrikes />` ngay sau khối `{dashboard && dashboard.pendingOrders > 0 && (<Banner …>…</Banner>)}`.

- [ ] **Step 7: Chạy lại test**

Run: `docker compose exec -T frontend sh -c 'npx vitest run src/pages/farmer/ProductForm src/pages/farmer/Overview'`
Expected: toàn bộ PASS (4 test cũ + 8 test giai đoạn 1 + 2 test mới của form; 4 test của `ShelfLifeStrikes`).

- [ ] **Step 8: Kiểm và commit**

```bash
docker compose exec -T frontend sh -c 'npx prettier --write src/pages/farmer/ProductForm src/pages/farmer/Overview src/locales && npx tsc -b && npx eslint src'
git add frontend/src/pages/farmer/ProductForm frontend/src/pages/farmer/Overview \
  frontend/src/locales/*/FarmerProductForm.json frontend/src/locales/*/FarmerOverview.json
git commit -m "feat(FR-123): locked stalls see why the shelf life stops at the suggestion"
```

---

### Task 17: Seed demo, contract, tài liệu demo và kiểm toàn bộ (FR-122, FR-123)

**Files:**
- Modify: `db/seed.sql` (khối mới ở cuối file, sau khối Feedback)
- Modify: `docs/api-contract.md` (§7, §8a mới, §9, §10 — chỉ thêm)
- Modify: `docs/DEMO_CREDENTIALS.md`

**Interfaces:**
- Consumes: mọi task trước; seed giai đoạn 1 (`Rau muống` của `farmer@marketlink.vn`: Leafy greens, ngăn mát, 5 ngày so với gợi ý 3; các rau lá khác 3 ngày); seed có sẵn: đơn `ML-20260920-0007` (hoàn tất, nhận hôm nay − 10, có "Rau muống") và `ML-20260920-0010` (hoàn tất, nhận hôm nay − 4, có "Cải ngọt", "Mồng tơi"), `admin@marketlink.vn`, `customer@marketlink.vn`, chợ "Chợ Bà Chiểu" của `farmer@`.
- Produces: 3 báo hư (1 đang mở, cần xử lý; 2 đã xác nhận), 2 lỗi hạn dùng còn hiệu lực của "Vườn Út Hiền", đơn `ML-20260920-0013` hoàn tất hôm qua có 2 món báo được (Ruling 13).

- [ ] **Step 1: Thêm khối seed vào cuối `db/seed.sql`**

```sql
-- ---- Spoilage reports and shelf-life strikes (FR-122, FR-123, proposed) ----
-- The demo story: 'Vườn Út Hiền' (farmer@marketlink.vn) sold leafy greens kept in the fridge for 5
-- days against a suggestion of 3. Two reports on order 0010 were confirmed two days after pickup,
-- so the stall already has 2 strikes (those products are back at 3 days, as the shelf-life block
-- above leaves them). The report on 'Rau muống' of order 0007 is still open: it is what the admin
-- finds under "Needs a decision", and confirming it is the third strike — the stall is locked out
-- of longer shelf lives and the card offers "Suspend stall". Order 0013 was completed yesterday,
-- so customer@marketlink.vn can press "Report spoiled" on it.
-- Seed orders skip OrderItem.snapshot, so the promise of the lines used here is written by hand.
-- Re-running `make seed` puts all of this back: the reports of the three orders are deleted and
-- written again (their strikes go with them through ON DELETE CASCADE), like the reviews block.

-- Order 0013: completed yesterday at 'Chợ Bà Chiểu'; times follow the past-orders block (M-4).
INSERT INTO orders (order_code, customer_id, farmer_id, market_id, slot_id, pickup_date, pickup_start,
                    pickup_end, cutoff_at, total_amount, status, customer_note, farmer_note, created_at)
SELECT 'ML-20260920-0013', cust.id, f.id, m.id, NULL,
       DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR) - INTERVAL 1 DAY, '08:00:00', '09:00:00',
       TIMESTAMP(DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR) - INTERVAL 1 DAY, '08:00:00')
         - INTERVAL f.order_cutoff_hours HOUR,
       0, 'completed', NULL, NULL,
       TIMESTAMP(DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR) - INTERVAL 3 DAY, '08:00:00') - INTERVAL 7 HOUR
FROM users cust
JOIN users u ON u.email = 'farmer@marketlink.vn'
JOIN farmer_profiles f ON f.user_id = u.id
JOIN farmer_markets fm ON fm.farmer_id = f.id
JOIN markets m ON m.id = fm.market_id AND m.market_name = 'Chợ Bà Chiểu'
WHERE cust.email = 'customer@marketlink.vn'
ON DUPLICATE KEY UPDATE customer_id = cust.id, farmer_id = f.id, market_id = m.id, slot_id = NULL,
                        pickup_date = DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR) - INTERVAL 1 DAY,
                        pickup_start = '08:00:00', pickup_end = '09:00:00',
                        cutoff_at = TIMESTAMP(DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR) - INTERVAL 1 DAY, '08:00:00')
                                     - INTERVAL f.order_cutoff_hours HOUR,
                        status = 'completed', customer_note = NULL, farmer_note = NULL,
                        created_at = TIMESTAMP(DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR) - INTERVAL 3 DAY, '08:00:00')
                                     - INTERVAL 7 HOUR;

-- Its two lines with the promise they were sold with: 'Rau muống' 5 days in the fridge (the extended
-- product, +2 days), 'Rau dền' the suggested 3 days.
INSERT INTO order_items (order_id, product_id, product_name, unit_price, unit, quantity, subtotal,
                         shelf_life_days, storage_mode, best_before, shelf_life_extended, extended_by_days)
SELECT o.id, p.id, p.name, p.price, p.unit, x.quantity, p.price * x.quantity,
       x.days, 'chilled', o.pickup_date + INTERVAL (x.days - 1) DAY, x.days > 3, GREATEST(x.days - 3, 0)
FROM (SELECT 'Rau muống' AS product_name, 2 AS quantity, 5 AS days
      UNION ALL SELECT 'Rau dền', 2, 3) x
JOIN orders o ON o.order_code = 'ML-20260920-0013'
JOIN products p ON p.farmer_id = o.farmer_id AND p.name = x.product_name
ON DUPLICATE KEY UPDATE product_name = p.name, unit_price = p.price, unit = p.unit,
                        quantity = x.quantity, subtotal = p.price * x.quantity,
                        shelf_life_days = x.days, storage_mode = 'chilled',
                        best_before = o.pickup_date + INTERVAL (x.days - 1) DAY,
                        shelf_life_extended = x.days > 3, extended_by_days = GREATEST(x.days - 3, 0);

UPDATE orders o
JOIN (SELECT order_id, SUM(subtotal) AS total FROM order_items GROUP BY order_id) t ON t.order_id = o.id
SET o.total_amount = t.total
WHERE o.order_code = 'ML-20260920-0013';

-- Its status chain, written again on every run (no natural key), like the other seed orders.
DELETE h FROM order_status_history h
JOIN orders o ON o.id = h.order_id
WHERE o.order_code = 'ML-20260920-0013';

INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, note, changed_at)
SELECT o.id, spec.from_status, spec.to_status,
       CASE spec.actor WHEN 'customer' THEN o.customer_id ELSE fu.id END,
       NULL, TIMESTAMP(o.pickup_date + INTERVAL spec.day_delta DAY, spec.time_of_day) - INTERVAL 7 HOUR
FROM (
      SELECT NULL AS from_status, 'placed' AS to_status, 'customer' AS actor, -2 AS day_delta, '08:00:00' AS time_of_day
      UNION ALL SELECT 'placed', 'accepted', 'farmer', -1, '09:00:00'
      UNION ALL SELECT 'accepted', 'ready', 'farmer', 0, '07:30:00'
      UNION ALL SELECT 'ready', 'completed', 'farmer', 0, '08:30:00'
     ) spec
JOIN orders o ON o.order_code = 'ML-20260920-0013'
JOIN farmer_profiles f ON f.id = o.farmer_id
JOIN users fu ON fu.id = f.user_id;

-- The lines the reports are about: sold as 5 days in the fridge against 3, good until pickup + 4.
UPDATE order_items oi
JOIN orders o ON o.id = oi.order_id
JOIN (SELECT 'ML-20260920-0007' AS order_code, 'Rau muống' AS product_name
      UNION ALL SELECT 'ML-20260920-0010', 'Cải ngọt'
      UNION ALL SELECT 'ML-20260920-0010', 'Mồng tơi') x
  ON x.order_code = o.order_code AND x.product_name = oi.product_name
SET oi.shelf_life_days = 5, oi.storage_mode = 'chilled', oi.best_before = o.pickup_date + INTERVAL 4 DAY,
    oi.shelf_life_extended = TRUE, oi.extended_by_days = 2;

-- Whatever a demo added (a customer's report on 0013, a strike from confirming 0007) goes too.
DELETE r FROM quality_reports r
JOIN orders o ON o.id = r.order_id
WHERE o.order_code IN ('ML-20260920-0007', 'ML-20260920-0010', 'ML-20260920-0013');

-- created_at: the evening of the day it spoiled; the reply and the decision the next morning.
-- TIMESTAMP columns are session UTC, so Vietnam times are shifted by -7 hours (M-4).
INSERT INTO quality_reports (order_item_id, order_id, customer_id, farmer_id, product_id, spoiled_on,
                             problem, note, photo_url, before_promise, shelf_life_extended,
                             extended_by_days, status, farmer_response, farmer_responded_at,
                             decided_by, decided_at, decision_note, created_at)
SELECT oi.id, o.id, o.customer_id, o.farmer_id, oi.product_id,
       o.pickup_date + INTERVAL x.spoiled_after DAY,
       x.problem, x.note, NULL,
       (o.pickup_date + INTERVAL x.spoiled_after DAY) <= oi.best_before,
       oi.shelf_life_extended, oi.extended_by_days, x.status, x.response,
       IF(x.response IS NULL, NULL,
          TIMESTAMP(o.pickup_date + INTERVAL (x.spoiled_after + 1) DAY, '09:00:00') - INTERVAL 7 HOUR),
       IF(x.status = 'open', NULL, adm.id),
       IF(x.status = 'open', NULL,
          TIMESTAMP(o.pickup_date + INTERVAL (x.spoiled_after + 1) DAY, x.decided_time) - INTERVAL 7 HOUR),
       x.decision_note,
       TIMESTAMP(o.pickup_date + INTERVAL x.spoiled_after DAY, '20:00:00') - INTERVAL 7 HOUR
FROM (
      SELECT 'ML-20260920-0007' AS order_code, 'Rau muống' AS product_name, 2 AS spoiled_after,
             'mold' AS problem, 'Lá úng đen sau 2 ngày để ngăn mát.' AS note, 'open' AS status,
             'Khách để nhiệt độ thường, lúc giao hàng vẫn tươi.' AS response,
             NULL AS decision_note, '10:00:00' AS decided_time
      UNION ALL SELECT 'ML-20260920-0010', 'Cải ngọt', 1, 'wilted', 'Lá vàng, héo ngay hôm sau.',
             'confirmed', NULL, 'Hư sau 1 ngày, sớm hơn nhiều so với 5 ngày sạp cam kết.', '10:00:00'
      UNION ALL SELECT 'ML-20260920-0010', 'Mồng tơi', 1, 'smell', 'Có mùi chua khi mở túi.',
             'confirmed', 'Hôm đó xe giao tới trễ.', 'Hư trước hạn; sạp nhận là giao trễ.', '10:10:00'
     ) x
JOIN orders o ON o.order_code = x.order_code
JOIN order_items oi ON oi.order_id = o.id AND oi.product_name = x.product_name
JOIN users adm ON adm.email = 'admin@marketlink.vn';

-- The two strikes behind the confirmed reports, recorded when the admin decided: they count until
-- 90 days after that.
INSERT INTO farmer_violations (farmer_id, quality_report_id, product_id, extended_by_days, note,
                               created_by, created_at)
SELECT r.farmer_id, r.id, r.product_id, r.extended_by_days, r.decision_note, r.decided_by, r.decided_at
FROM quality_reports r
JOIN orders o ON o.id = r.order_id
WHERE o.order_code = 'ML-20260920-0010' AND r.status = 'confirmed';
```

- [ ] **Step 2: Nạp seed và kiểm dữ liệu**

Run: `make seed`, rồi:

```bash
docker compose exec -T mysql sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -N' <<'SQL'
SELECT o.order_code, oi.product_name, r.status, r.before_promise, r.shelf_life_extended
FROM quality_reports r
JOIN orders o ON o.id = r.order_id
JOIN order_items oi ON oi.id = r.order_item_id
ORDER BY o.order_code, oi.product_name;
SELECT COUNT(*) FROM farmer_violations v
JOIN farmer_profiles f ON f.id = v.farmer_id
JOIN users u ON u.id = f.user_id
WHERE u.email = 'farmer@marketlink.vn' AND v.created_at > NOW() - INTERVAL 90 DAY;
SELECT oi.product_name, oi.best_before >= CURDATE() FROM order_items oi
JOIN orders o ON o.id = oi.order_id
WHERE o.order_code = 'ML-20260920-0013' ORDER BY oi.product_name;
SQL
```

Expected:

```
ML-20260920-0007	Rau muống	open	1	1
ML-20260920-0010	Cải ngọt	confirmed	1	1
ML-20260920-0010	Mồng tơi	confirmed	1	1
2
Rau dền	1
Rau muống	1
```

Chạy `make seed` lần hai rồi chạy lại lệnh kiểm: kết quả không đổi (seed chạy lại được, không nhân đôi).

- [ ] **Step 3: Kiểm tay luồng chính (mật khẩu `Demo@1234`)**

1. `customer@marketlink.vn` → Đơn hàng → `ML-20260920-0013`: dưới "Rau muống" và "Rau dền" có nút "Report spoiled". Báo "Rau muống" (hư hôm nay, "Mold", kèm một ảnh JPG): dòng dưới món đổi thành "Spoilage reported · Waiting for a decision". Mở `ML-20260920-0007`: "Rau muống" ghi "Spoilage reported · Waiting for a decision", không có nút.
2. `farmer@marketlink.vn` → chuông có "A customer reported spoiled produce"; bấm vào mở Reviews → Spoiled reports: 4 báo cáo, banner "Shelf-life strikes: 2 of 3 in 90 days"; trả lời báo cáo mới và lưu. Trang Tổng quan có banner 2/3.
3. `admin@marketlink.vn` → chuông có "Spoiled produce on an extended shelf life" (từ báo cáo ở bước 1); bấm vào mở Moderation → Spoiled reports → "Needs a decision" có 2 thẻ. "Confirm violation" trên thẻ `ML-20260920-0007`: thẻ ở lại, ghi "Confirmed by an admin", số lỗi 3/3, có nút "Suspend stall"; bấm nút → trang chi tiết sạp mở dialog đình chỉ, chip "Shelf-life violations" đã chọn (bấm "Not yet" để đóng, không đình chỉ thật). Thẻ số lỗi ở trang này ghi 3/3 và ngày hết khoá. Thử "Not the stall's fault" trên thẻ còn lại mà không ghi chú: dialog báo cần ghi chú.
4. `farmer@marketlink.vn` → chuông có "A shelf-life strike on your stall" và "Longer shelf lives are locked for now"; Tổng quan hiện banner khoá kèm ngày; Products → sửa "Rau muống": hạn dùng đã về 3 ngày, nút + bị khoá ở 3, có dòng "Your stall can't go above the suggestion until …".
5. Kiểm 375 px và 1440 px cho 4 màn đã đổi (chi tiết đơn của khách, Reviews của Farmer, Moderation, chi tiết sạp): không tràn ngang.
6. `make seed` lần nữa: báo cáo của `0007` về lại "Needs a decision", số lỗi về 2/3, "Rau muống" về 5 ngày.

- [ ] **Step 4: Thêm dòng vào `docs/api-contract.md` (chỉ thêm, không sửa dòng cũ)**

§7 (Cart & Orders), dưới các ghi chú giai đoạn 1 đã thêm cho `GET /api/v1/orders/{id}`, thêm:

```markdown
- FR-122: mỗi món trong `GET /api/v1/orders/{id}` thêm `itemId` (`order_items.id`) và `qualityReport: { id, status, spoiledOn, problem } | null`.
```

Section mới ngay sau §8 (Reviews):

```markdown
## 8a. Báo hàng hư và lỗi hạn dùng — FR-122, FR-123 ⚑

> Đề xuất (FR-122, FR-123 chưa có trong `.ai/REQUIREMENTS.md`). Spec
> `docs/superpowers/specs/2026-09-27-shelf-life-deals-design.md` §4.4, §4.6; LEAD duyệt các dòng này ở spec §6 ngày
> 27/09/2026.

| Method | Path | Role | Ghi chú |
|---|---|---|---|
| POST | `/api/v1/quality-reports/photos` | Customer | multipart `file`, JPG/PNG/WebP ≤ 5 MB → 201 `{ url }`; sai loại hoặc quá cỡ → 400 field `file`. JPEG/PNG được mã hoá lại (bỏ EXIF) |
| POST | `/api/v1/orders/{id}/items/{itemId}/quality-report` | Customer | `itemId` = field `itemId` của món. `{ spoiledOn (yyyy-MM-dd, từ ngày nhận tới hôm nay), problem: "bruised" \| "mold" \| "smell" \| "wilted" \| "other", note? (≤ 500), photoUrl? }` → 201 `{ id, status, spoiledOn, problem }`. Đơn của người khác → 403; món không thuộc đơn → 404; đơn chưa `completed` → 409 `ORDER_NOT_COMPLETED`; món không có `bestBefore` hoặc quá `bestBefore + 2 ngày` → 409 `REPORT_WINDOW_CLOSED`; báo lần hai → 409 `ALREADY_REPORTED`; `spoiledOn` ngoài khoảng hoặc ảnh không phải của mình → 400 field `spoiledOn` / `photoUrl` |
| GET | `/api/v1/farmer/quality-reports` | Farmer | query `page, pageSize` → `{ standing: { activeViolations, limit, windowDays, extensionLockedUntil }, reports: { items: QualityReport[], page, pageSize, total } }`, mới nhất trước, chỉ báo cáo về sạp mình |
| PUT | `/api/v1/farmer/quality-reports/{id}/response` | Farmer | `{ response (1–500) }` → `QualityReport`; sửa được tới khi admin quyết định, sau đó 409 `REPORT_ALREADY_DECIDED`; báo cáo của sạp khác → 403. Sạp bị đình chỉ vẫn phản hồi được |
| GET | `/api/v1/admin/quality-reports` | Admin | query `status` (`open` \| `confirmed` \| `dismissed` \| `decided` = đã xử lý), `escalated` (`true` = món kéo dài hạn và hư trước hạn), `page, pageSize` → trang `QualityReport`, mới nhất trước. "Cần xử lý" = `status=open&escalated=true` |
| PATCH | `/api/v1/admin/quality-reports/{id}/confirm` | Admin | `{ note? (≤ 255) }` → `QualityReport`. Món kéo dài hạn và hư trước hạn: ghi một lỗi hạn dùng, hạn dùng của sản phẩm về mốc gợi ý. Đã xử lý → 409 `REPORT_ALREADY_DECIDED` |
| PATCH | `/api/v1/admin/quality-reports/{id}/dismiss` | Admin | `{ note (bắt buộc, ≤ 255) }` → `QualityReport`; thiếu ghi chú → 400 field `note`; đã xử lý → 409 `REPORT_ALREADY_DECIDED` |

`QualityReport`: `{ id, orderId, orderCode, farmerId, stallName, stallStatus, customerName, productId, productName, pickupDate, bestBefore, storageMode, spoiledOn, beforePromise, problem, note, photoUrl, shelfLifeExtended, extendedByDays, status: "open" | "confirmed" | "dismissed", farmerResponse, farmerRespondedAt, decisionNote, decidedAt, createdAt, stallActiveStrikes }`.

Lỗi hạn dùng còn hiệu lực 90 ngày. Từ 3 lỗi còn hiệu lực, `POST/PUT /api/v1/farmer/products` với `shelfLifeDays` lớn
hơn mốc gợi ý → **409 `SHELF_LIFE_EXTENSION_LOCKED`** (detail field `shelfLifeDays`). Khoá tự hết khi lỗi mới thứ ba
đủ 90 ngày; không có trạng thái khoá lưu riêng.
```

§9 (Notifications): sau đoạn bắt đầu bằng "`kind`: `announcement` · …", thêm:

```markdown
FR-122, FR-123 thêm: `quality_reported` (tới sạp), `quality_escalated` (tới mọi admin), `quality_decided` (tới khách và
sạp), `shelf_life_violation`, `shelf_life_locked` (tới sạp) — đều được lưu.
```

và trong danh sách dưới `NotificationPreferences`, sau dòng "- Nhóm: `messages`, …":

```markdown
- Nhóm `qualityReports` (admin, FR-122): báo hư món kéo dài hạn và hư trước hạn; chưa lưu = bật.
```

§10 (Admin), trong bảng, ngay sau dòng của `GET /api/v1/admin/farmers` (ghi chú `query approvalStatus`):

```markdown
| GET | `/api/v1/admin/farmers/{id}` | chi tiết sạp; FR-123 thêm `activeViolations` (số lỗi hạn dùng trong 90 ngày) và `extensionLockedUntil` (ISO 8601, `null` khi không bị khoá) |
```

- [ ] **Step 5: Sửa `docs/DEMO_CREDENTIALS.md`**

1. Dòng Customer: "12 đơn đủ 6 trạng thái (4 đơn `completed` để viết review)" → "13 đơn đủ 6 trạng thái (5 đơn `completed` để viết review), báo hàng hư trên đơn `ML-20260920-0013`".
2. Dòng Farmer: thêm cuối ", tab Báo hàng hư trong Reviews (2/3 lỗi hạn dùng)". Dòng Admin: thêm cuối ", tab Báo hàng hư trong Moderation".
3. Đoạn "Dữ liệu demo đi kèm": "12 đơn của `customer@marketlink.vn` (`ML-20260920-0001…0012`)" → "13 đơn của `customer@marketlink.vn` (`ML-20260920-0001…0013`)", và thêm "· 3 báo hàng hư (1 chờ admin, 2 đã xác nhận) và 2 lỗi hạn dùng của Vườn Út Hiền" trước "· 3 góp ý".
4. Danh sách "Dữ liệu dựng sẵn cho vài kịch bản", thêm:

```markdown
- Báo hàng hư (FR-122, FR-123): xác nhận báo cáo "Rau muống" của đơn `ML-20260920-0007` là lỗi thứ 3 trong 90 ngày của
  `farmer@` → sạp bị khoá kéo dài hạn dùng và thẻ báo cáo hiện nút "Suspend stall". `make seed` đưa về trạng thái ban
  đầu.
```

- [ ] **Step 6: Kiểm đủ key ở 10 ngôn ngữ (FE và thông báo)**

```bash
python3 - <<'EOF'
import json, pathlib
root = pathlib.Path('frontend/src/locales')
def keys(d, p=''):
    out = set()
    for k, v in d.items():
        out |= keys(v, p + k + '.') if isinstance(v, dict) else {p + k}
    return out
for ns in ['common', 'CustomerOrderDetail', 'FarmerReviews', 'AdminModeration', 'AdminFarmerDetail',
           'FarmerProductForm', 'FarmerOverview']:
    base = keys(json.loads((root / 'en' / f'{ns}.json').read_text()))
    for lang in ['vi', 'zh', 'ja', 'ko', 'fr', 'es', 'de', 'th', 'id']:
        other = keys(json.loads((root / lang / f'{ns}.json').read_text()))
        if base - other or other - base:
            print(ns, lang, 'missing', sorted(base - other), 'extra', sorted(other - base))
props = pathlib.Path('backend/src/main/resources/i18n')
def prop_keys(f):
    return {l.split('=', 1)[0] for l in f.read_text(encoding='utf-8').splitlines() if '=' in l and not l.startswith('#')}
en = prop_keys(props / 'notifications.properties')
print('notification keys', len(en))
for lang in ['vi', 'zh', 'ja', 'ko', 'fr', 'es', 'de', 'th', 'id']:
    other = prop_keys(props / f'notifications_{lang}.properties')
    if en != other:
        print(lang, 'missing', sorted(en - other), 'extra', sorted(other - en))
print('checked')
EOF
```

Expected: chỉ in `notification keys 35` và `checked`.

- [ ] **Step 7: Chạy toàn bộ test**

Run: `make be-test`
Expected: `BUILD SUCCESS`, `Failures: 0, Errors: 0`. Nếu JVM test bị kill giữa chừng ("The forked VM terminated without properly saying goodbye"), đó là do thiếu RAM trong Docker, không phải test fail: tắt container frontend của stack rồi chạy lại.

Run: `docker compose exec -T frontend sh -c 'npx prettier --check src && npx tsc -b && npx eslint src && npx vitest run'`
Expected: sạch và toàn bộ test PASS.

- [ ] **Step 8: Commit**

```bash
git add db/seed.sql docs/api-contract.md docs/DEMO_CREDENTIALS.md
git commit -m "chore(FR-123): seed the spoilage demo and document the report endpoints"
```

- [ ] **Step 9: Ghi chú cho PR (không push nếu chưa được phép)**

PR body (tiếng Anh) phải nêu:
- FR đề xuất FR-122, FR-123, chưa có trong `.ai/REQUIREMENTS.md` (QA/DOC thêm);
- bảng mới `quality_reports`, `farmer_violations` (migration `V20260927006` hoặc số trống kế tiếp) để LEAD cập nhật `db/schema.sql` (R-02);
- các dòng contract đã thêm (§7, §8a, §9, §10) đúng như spec §6 đã duyệt, cộng hai điểm LEAD cần biết: `itemId` trên mỗi món của đơn (Ruling 1) và `standing` nằm trong `GET /farmer/quality-reports` (Ruling 2);
- 5 kind thông báo mới và nhóm Cài đặt `qualityReports`;
- seed: đơn thứ 13 `ML-20260920-0013` và 2 lỗi hạn dùng dựng sẵn (Ruling 13), luồng kiểm tay ở Step 3;
- "đủ 7 điều kiện" của Definition of Done trong `CLAUDE.md`.

---

## Việc cố tình để lại

- **Hai admin xác nhận hai báo cáo khác nhau của cùng một sạp đúng cùng lúc** có thể cùng đếm thiếu một lỗi và một bên
  không gửi `SHELF_LIFE_LOCKED`. Khoá vẫn đúng, vì nó luôn được tính lại từ bảng lỗi; chỉ thông báo có thể thiếu. Muốn
  chặn hẳn thì khoá hàng `farmer_profiles` trong `confirm` — chưa cần cho một hàng đợi vài báo cáo.
- **Ảnh tải lên mà không gửi báo cáo** nằm lại trong `quality-report-photos/`, giống ảnh sản phẩm hiện nay. Chưa có job
  dọn.
- **Hàng đợi của admin và danh sách của sạp** tải trang đầu 50 báo cáo, chưa có nút sang trang (giống hàng đợi tin nhắn
  bị báo cáo).
- **Copy nhóm Cài đặt `orders` và `favorites`** chưa có trong `common.json` (`notify.settings.groups.*`), nên màn Cài
  đặt của khách và sạp đang hiện tên key. Đây là lỗi có sẵn từ trước giai đoạn này; plan chỉ thêm `qualityReports`.
- **Spec §12:** không hoàn tiền, không xoá lỗi đã ghi, không kháng nghị nhiều lượt.

## Self-Review

1. **Độ phủ spec:**
   - §4.4.1 (nút ở trang đơn với 4 điều kiện, dialog: ngày hư từ ngày nhận tới hôm nay, 5 lựa chọn, mô tả ≤ 500, ảnh
     JPG/PNG/WebP ≤ 5 MB; bảng `quality_reports`; `QUALITY_REPORTED` luôn tới sạp; `QUALITY_ESCALATED` chỉ khi kéo dài
     và hư trước hạn; R-06) → Task 1, 2, 4, 5, 6, 11, 12.
   - §4.4.2 (tab của sạp, phản hồi ≤ 500, sửa được tới khi admin quyết định) → Task 7, 13.
   - §4.4.3 (tab admin, bộ lọc mặc định "Cần xử lý" và hai bộ lọc còn lại, bác cần ghi chú, xác nhận: ghi lỗi, sản phẩm
     về mốc, `SHELF_LIFE_VIOLATION`, đủ 3 lỗi thì `SHELF_LIFE_LOCKED` và nút "Đình chỉ sạp" mở luồng có sẵn với lý do
     "Vi phạm hạn dùng"; xác nhận món không kéo dài chỉ đóng báo cáo) → Task 8, 14, 15.
   - §4.4.4 (`farmer_violations`, 90 ngày, khoá suy ra từ bảng lỗi, tự hết, ngày hết khoá; sạp thấy ở Tổng quan và form;
     admin thấy ở chi tiết sạp) → Task 1, 2, 7, 9, 10, 15, 16.
   - §4.2 (409 `SHELF_LIFE_EXTENSION_LOCKED`; nút + dừng ở mốc, kèm lý do) → Task 9, 16.
   - §4.6 (5 kind, nhóm `ORDERS` cho sạp và khách, nhóm mới `QUALITY_REPORTS` cho admin, mặc định bật) → Task 3, 11.
   - §5 (migration 4; seed: 1 báo hư đang mở thuộc diện kéo dài và hư trước hạn) → Task 1, 17.
   - §6 (các dòng của giai đoạn 2, kể cả `GET /admin/farmers/{id}` và `qualityReport` trên đơn) → Task 5–8, 10, 17.
   - §8: quá hạn báo 409, báo lần hai 409, đơn chưa hoàn tất 409, ảnh sai 400, sạp bị đình chỉ vẫn phản hồi, đơn cũ
     không có `best_before` thì không có nút, đổi mốc sau khi bán không ảnh hưởng báo cáo (chép từ dòng đơn) → test ở
     Task 4, 5, 7, 12.
   - §9: bảng số dùng chung BE/FE (Task 2 ↔ Task 11); MySQL: cửa sổ báo (Task 5), đếm 90 ngày và khoá (Task 1, 8, 9),
     xác nhận thì sản phẩm về mốc (Task 8); quyền: khách không báo đơn người khác (Task 5), chỉ admin xử lý (Task 8
     access test); FE: form khoá thì dừng ở mốc (Task 16).
2. **Không để trống:** không còn TBD/TODO; mỗi bước code có code đầy đủ. Các chỗ "thêm vào file của giai đoạn 1" đều nêu
   dòng neo lấy nguyên văn từ plan giai đoạn 1.
3. **Tên thống nhất:** `QualityReportResource` (26 thành phần) ↔ `QualityReportDto`; `ItemQualityReportResource(id,
   status, spoiledOn, problem)` ↔ `ItemQualityReportDto`; `ShelfLifeStandingResource(activeViolations, limit,
   windowDays, extensionLockedUntil)` ↔ `ShelfLifeStandingDto`; `OrderItemResource(…, listPrice, qualityReport, itemId)`
   ↔ `OrderItemDto.qualityReport?`, `itemId?`; tham số thông báo `product/order/stall/days/count/until` giống nhau ở
   Task 3, 5, 8; `QualityLinks` giống nhau ở Task 5, 8 và khớp route FE (`?tab=spoiled`, `?tab=quality`,
   `?suspend=shelfLifeViolations`).
4. **Review Focus:** 5 dòng, mỗi dòng có test ở Task 2, 4, 5, 7, 8, 9, 11, 12, 16 như đã ghi.
