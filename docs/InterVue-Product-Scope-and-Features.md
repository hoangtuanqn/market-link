# InterVue

## Nền tảng Tuyển dụng IT Thông minh với AI Screening

> **Trạng thái tài liệu:** Bản định hướng sản phẩm và phạm vi chức năng ban đầu  
> **Nền tảng dự kiến:** Website và ứng dụng Flutter  
> **Đối tượng chính:** Ứng viên IT, nhà tuyển dụng cá nhân/freelancer, doanh nghiệp và quản trị viên

---

## Mục lục

1. [Tổng quan sản phẩm](#1-tổng-quan-sản-phẩm)
2. [Vấn đề cần giải quyết](#2-vấn-đề-cần-giải-quyết)
3. [Giá trị cốt lõi và điểm khác biệt](#3-giá-trị-cốt-lõi-và-điểm-khác-biệt)
4. [Phạm vi và nguyên tắc xây dựng](#4-phạm-vi-và-nguyên-tắc-xây-dựng)
5. [Các vai trò trong hệ thống](#5-các-vai-trò-trong-hệ-thống)
6. [Chức năng của Candidate](#6-chức-năng-của-candidate)
7. [Chức năng của Recruiter](#7-chức-năng-của-recruiter)
8. [Organization và thành viên doanh nghiệp](#8-organization-và-thành-viên-doanh-nghiệp)
9. [Chức năng của Admin](#9-chức-năng-của-admin)
10. [Luồng tuyển dụng tổng thể](#10-luồng-tuyển-dụng-tổng-thể)
11. [Job Board và tìm kiếm việc làm](#11-job-board-và-tìm-kiếm-việc-làm)
12. [Đăng và quản lý Job](#12-đăng-và-quản-lý-job)
13. [Apply Job và quản lý Application](#13-apply-job-và-quản-lý-application)
14. [Các phương thức AI Screening](#14-các-phương-thức-ai-screening)
15. [Recruitment Pipeline](#15-recruitment-pipeline)
16. [Hồ sơ ứng viên và quản lý CV](#16-hồ-sơ-ứng-viên-và-quản-lý-cv)
17. [Xác minh danh tính và doanh nghiệp](#17-xác-minh-danh-tính-và-doanh-nghiệp)
18. [Thông báo, giao tiếp và phỏng vấn](#18-thông-báo-giao-tiếp-và-phỏng-vấn)
19. [Các tính năng AI mở rộng](#19-các-tính-năng-ai-mở-rộng)
20. [Báo cáo và kiểm duyệt](#20-báo-cáo-và-kiểm-duyệt)
21. [Mô hình doanh thu](#21-mô-hình-doanh-thu)
22. [Phân chia chức năng giữa Website và Mobile](#22-phân-chia-chức-năng-giữa-website-và-mobile)
23. [Phạm vi MVP đề xuất](#23-phạm-vi-mvp-đề-xuất)
24. [Roadmap phát triển](#24-roadmap-phát-triển)
25. [Quy tắc nghiệp vụ quan trọng](#25-quy-tắc-nghiệp-vụ-quan-trọng)
26. [Các thực thể dữ liệu chính](#26-các-thực-thể-dữ-liệu-chính)
27. [Tiêu chí đánh giá MVP thành công](#27-tiêu-chí-đánh-giá-mvp-thành-công)
28. [Kết luận](#28-kết-luận)

---

## 1. Tổng quan sản phẩm

**InterVue** là nền tảng tuyển dụng tập trung vào lĩnh vực công nghệ thông tin, kết nối ứng viên với nhà tuyển dụng cá nhân, freelancer và doanh nghiệp.

Nền tảng không chỉ đóng vai trò như một Job Board để đăng và tìm việc. InterVue còn đưa AI vào quy trình sàng lọc ứng viên nhằm hỗ trợ:

- Phân tích mức độ phù hợp giữa CV và yêu cầu công việc.
- Tạo bài đánh giá năng lực dựa trên nội dung tuyển dụng.
- Chấm và phân tích kết quả bài đánh giá.
- Giải thích điểm mạnh, điểm còn thiếu và căn cứ đề xuất ứng viên.
- Giúp Recruiter quản lý ứng viên xuyên suốt quy trình tuyển dụng.
- Hỗ trợ Candidate cải thiện CV, luyện phỏng vấn và tìm công việc phù hợp.

InterVue hướng đến một quy trình hoàn chỉnh:

> **Job Requirements → Screening Configuration → Candidate Application → AI Evaluation → Recruiter Decision → Interview → Hiring**

---

## 2. Vấn đề cần giải quyết

### 2.1. Đối với Candidate

- Khó tìm công việc phù hợp giữa quá nhiều tin tuyển dụng.
- Không biết CV của mình có đáp ứng yêu cầu công việc hay không.
- Không nhận được phản hồi rõ ràng sau khi ứng tuyển.
- Thiếu môi trường luyện bài test và phỏng vấn chuyên ngành IT.
- Khó chứng minh năng lực nếu chưa có nhiều kinh nghiệm làm việc.
- Phải quản lý nhiều CV cho nhiều định hướng nghề nghiệp khác nhau.

### 2.2. Đối với Recruiter và doanh nghiệp

- Tốn nhiều thời gian đọc và so sánh CV thủ công.
- Khó đánh giá năng lực thật chỉ từ thông tin ứng viên tự khai báo.
- Khó thiết kế bài test phù hợp với từng vị trí.
- Quy trình tuyển dụng và trạng thái ứng viên dễ bị phân tán.
- Có thể nhận số lượng lớn hồ sơ nhưng thiếu căn cứ để ưu tiên xử lý.
- Nhà tuyển dụng cá nhân hoặc freelancer thiếu một nền tảng tuyển dụng phù hợp.

### 2.3. Đối với thị trường tuyển dụng

- Tin tuyển dụng giả, lừa đảo hoặc mô tả không minh bạch.
- Hồ sơ ứng viên có thể chứa thông tin không chính xác.
- AI Screening thiếu minh bạch có thể đưa ra kết luận thiên lệch.
- Candidate thường không biết vì sao mình phù hợp hoặc chưa phù hợp.

---

## 3. Giá trị cốt lõi và điểm khác biệt

### 3.1. Giá trị cốt lõi

InterVue giúp Recruiter đưa ra quyết định nhanh hơn dựa trên bằng chứng, đồng thời giúp Candidate hiểu và cải thiện năng lực của mình.

### 3.2. Điểm khác biệt chính

InterVue không nên được định vị đơn giản là:

> “Website tìm việc IT có thêm AI.”

Điểm khác biệt thực sự là AI tham gia trực tiếp vào luồng tuyển dụng:

1. Recruiter mô tả yêu cầu của Job.
2. Recruiter chọn cách sàng lọc phù hợp.
3. AI phân tích CV hoặc tạo Assessment theo chính Job đó.
4. Hệ thống tổng hợp bằng chứng về kỹ năng và kinh nghiệm.
5. Recruiter xem kết quả, lời giải thích và tự đưa ra quyết định.

AI phải đóng vai trò **trợ lý ra quyết định**, không phải người tự động quyết định thay Recruiter.

### 3.3. Bốn trụ cột của sản phẩm

- **Job Board:** Tìm kiếm, khám phá và quản lý tin tuyển dụng.
- **Application Tracking:** Theo dõi hồ sơ ứng tuyển của Candidate.
- **Configurable AI Screening:** Cho Recruiter lựa chọn phương thức sàng lọc.
- **Recruitment Pipeline:** Quản lý Candidate từ lúc ứng tuyển đến khi được tuyển.

---

## 4. Phạm vi và nguyên tắc xây dựng

### 4.1. Phạm vi sản phẩm

InterVue phục vụ ba nhóm người dùng nghiệp vụ chính:

- Candidate tìm việc trong lĩnh vực IT.
- Recruiter cá nhân/freelancer tuyển người.
- Recruiter làm việc dưới danh nghĩa Organization.

Admin chịu trách nhiệm vận hành và kiểm duyệt nền tảng.

### 4.2. Nguyên tắc kiểm soát phạm vi

- MVP phải hoàn thành được toàn bộ vòng đời tuyển dụng cơ bản.
- Không xây một mạng xã hội nghề nghiệp giống LinkedIn trong giai đoạn đầu.
- Không tạo quá nhiều Role nhỏ như Interviewer, Hiring Manager hoặc Finance Manager trong MVP.
- AI phải đưa ra giải thích, không chỉ trả về một tỷ lệ phù hợp.
- Quyết định Shortlist hoặc Reject cuối cùng thuộc về con người.
- Candidate phải biết rõ khi nào dữ liệu của mình được AI xử lý.
- Các tính năng tạo giá trị trực tiếp được ưu tiên trước tính năng trang trí.

---

## 5. Các vai trò trong hệ thống

### 5.1. Candidate

Người tìm việc, quản lý hồ sơ nghề nghiệp, ứng tuyển, thực hiện Assessment và theo dõi tiến trình tuyển dụng.

### 5.2. Recruiter

Người đăng Job và xử lý Candidate. Recruiter có thể hoạt động:

- Với tư cách cá nhân hoặc freelancer.
- Với tư cách thành viên của một Organization.

### 5.3. Organization Member

Đây không nhất thiết là một Role hệ thống hoàn toàn tách biệt. Về bản chất, đây là Recruiter đang làm việc trong phạm vi của một Organization.

MVP chỉ cần hai cấp quyền đơn giản:

- **Owner:** Quản lý hồ sơ Organization và thành viên.
- **Recruiter Member:** Đăng Job và xử lý các Application thuộc Organization theo quyền được cấp.

### 5.4. Admin

Người quản trị nền tảng, xử lý xác minh, nội dung vi phạm, báo cáo và các vấn đề vận hành.

### 5.5. Mô hình Role đề xuất

| Role | Trách nhiệm chính | Có trong MVP |
|---|---|:---:|
| Candidate | Tìm việc, Apply và thực hiện Screening | Có |
| Recruiter | Đăng Job và tuyển Candidate | Có |
| Organization Owner/Member | Tuyển dụng dưới danh nghĩa doanh nghiệp | Có, ở mức cơ bản |
| Admin | Quản trị, xác minh và kiểm duyệt | Có |

---

## 6. Chức năng của Candidate

### 6.1. Chức năng MVP

#### Tài khoản và hồ sơ

- Đăng ký, đăng nhập và đăng xuất.
- Xác minh email hoặc số điện thoại.
- Quên và đặt lại mật khẩu.
- Cập nhật thông tin cá nhân.
- Khai báo vị trí nghề nghiệp mong muốn.
- Thêm kỹ năng chuyên môn.
- Thêm học vấn, kinh nghiệm, dự án và chứng chỉ.
- Thêm GitHub, LinkedIn và Portfolio.
- Cài đặt trạng thái sẵn sàng tìm việc.

#### CV

- Upload nhiều CV.
- Đặt tên và quản lý từng CV.
- Chọn một CV mặc định.
- Chọn CV cụ thể khi Apply.
- Xem hoặc xóa CV chưa được sử dụng trong Application.

#### Tìm việc

- Xem Job Feed hoặc Job Board.
- Tìm kiếm theo từ khóa.
- Lọc theo địa điểm, mức lương, cấp độ, loại công việc và hình thức làm việc.
- Xem Job Detail.
- Lưu hoặc bỏ lưu Job.
- Xem thông tin và trạng thái xác minh của Recruiter/Organization.

#### Ứng tuyển

- Apply bằng CV đã chọn.
- Thực hiện Assessment nếu Job yêu cầu.
- Xem trạng thái Application.
- Rút Application khi còn được phép.
- Xem lịch sử ứng tuyển.
- Nhận thông báo khi trạng thái thay đổi.

### 6.2. Chức năng mở rộng

- CV Builder và xuất PDF.
- AI review và cải thiện CV.
- AI Job Recommendation.
- Luyện phỏng vấn với AI.
- Skill-gap Analysis.
- Job Alert theo bộ lọc đã lưu.
- Chat với Recruiter.
- Quản lý lịch phỏng vấn.
- Bật/tắt khả năng được Recruiter tìm thấy trong Talent Pool.
- Hồ sơ năng lực và điểm uy tín.

---

## 7. Chức năng của Recruiter

### 7.1. Chức năng MVP

#### Tài khoản và xác minh

- Đăng ký/đăng nhập tài khoản.
- Tạo Recruiter Profile.
- Gửi yêu cầu xác minh danh tính.
- Xem trạng thái xác minh.
- Hoạt động với tư cách cá nhân hoặc dưới một Organization.

#### Quản lý Job

- Tạo Job Draft.
- Cập nhật, xem trước và Publish Job.
- Tạm dừng, đóng hoặc mở lại Job theo quy tắc.
- Xem danh sách Job đã đăng.
- Xem số lượng Application theo Job.
- Cấu hình phương thức Screening.
- Review và chỉnh sửa Assessment do AI tạo trước khi Publish.

#### Quản lý Candidate

- Xem danh sách Application.
- Tìm kiếm và lọc Candidate theo trạng thái.
- Xem Candidate Profile và CV đã nộp.
- Xem AI CV Analysis.
- Xem Assessment Result.
- Xem lời giải thích và bằng chứng đánh giá.
- Thay đổi trạng thái Application.
- Shortlist hoặc Reject Candidate.
- Ghi chú nội bộ cơ bản.

#### Dashboard cơ bản

- Số Job đang hoạt động.
- Tổng số Application.
- Số Candidate đang Screening.
- Số Candidate được Shortlist.
- Số Candidate đã được tuyển.

### 7.2. Chức năng mở rộng

- Talent Search.
- Invite Candidate to Apply.
- AI Candidate Recommendation.
- So sánh nhiều Candidate.
- Job Template có thể tái sử dụng.
- Recruiter Analytics.
- Job Boost.
- Subscription và AI Credits.
- Chat và Interview Scheduling.
- Candidate Pool dùng chung trong Organization.

---

## 8. Organization và thành viên doanh nghiệp

### 8.1. Cách mô hình hóa

Không nên coi Company là một tài khoản đăng nhập như con người. Nên xây dựng:

```text
Organization
├── Owner
└── Recruiter Member(s)
```

Mỗi người vẫn sử dụng User Account riêng. Khi thao tác, họ chọn ngữ cảnh:

- Tuyển dụng với tư cách cá nhân.
- Tuyển dụng dưới danh nghĩa Organization.

### 8.2. Chức năng MVP

- Tạo Organization.
- Cập nhật Company Profile.
- Upload logo và thông tin giới thiệu.
- Khai báo website, địa chỉ, quy mô và lĩnh vực.
- Gửi hồ sơ xác minh doanh nghiệp.
- Đăng Job dưới tên Organization.
- Xem các Job và Application thuộc Organization.
- Quản lý Owner và một nhóm Recruiter Member cơ bản.

### 8.3. Chức năng mở rộng

- Mời thành viên qua email.
- Phân quyền chi tiết theo Job hoặc Department.
- Shared Candidate Pool.
- Audit Log.
- Quản lý phòng ban và nhóm tuyển dụng.
- Employer Branding Page.
- Organization Analytics.
- Đánh giá hiệu suất Recruiter.

### 8.4. Cách giảm scope cho MVP

Nếu thời gian hạn chế, MVP có thể chỉ cho phép:

- Một Owner tạo và quản lý Organization.
- Owner đăng Job dưới tên Organization.
- Chưa cần invite member và hệ thống phân quyền phức tạp.

---

## 9. Chức năng của Admin

### 9.1. Chức năng MVP

- Đăng nhập khu vực quản trị.
- Xem Dashboard tổng quan.
- Quản lý User và trạng thái tài khoản.
- Xem Candidate, Recruiter và Organization.
- Duyệt hoặc từ chối yêu cầu xác minh Recruiter.
- Duyệt hoặc từ chối yêu cầu xác minh Organization.
- Xem và kiểm duyệt Job Post.
- Xử lý Report.
- Khóa, tạm khóa hoặc mở lại tài khoản.
- Gỡ hoặc ẩn nội dung vi phạm.
- Ghi lại lý do của quyết định kiểm duyệt.

### 9.2. Dashboard MVP

- Tổng số User.
- Tổng Candidate và Recruiter.
- Tổng Organization.
- Job đang hoạt động.
- Tổng Application.
- Yêu cầu xác minh đang chờ.
- Report chưa xử lý.

### 9.3. Chức năng mở rộng

- Quản lý Plan, Subscription và Transaction.
- Quản lý Job Boost.
- Theo dõi chi phí và mức sử dụng AI.
- Phát hiện hành vi bất thường.
- Fake Job Detection.
- Spam/Fraud Detection.
- Quản lý Dispute.
- Platform Analytics nâng cao.

---

## 10. Luồng tuyển dụng tổng thể

```text
Recruiter tạo Job
        ↓
Chọn phương thức Screening
        ↓
Review cấu hình/Assessment
        ↓
Publish Job
        ↓
Candidate tìm và xem Job
        ↓
Candidate Apply
        ↓
CV Screening / Assessment / Hybrid
        ↓
AI tạo kết quả và lời giải thích
        ↓
Recruiter xem xét
        ↓
Shortlist hoặc Reject
        ↓
Interview
        ↓
Offer
        ↓
Hired
```

### 10.1. Nguyên tắc quan trọng

- AI không tự ý tuyển hoặc loại Candidate trong MVP.
- Recruiter luôn có quyền xem bằng chứng và đưa ra quyết định cuối cùng.
- Mỗi lần thay đổi trạng thái cần được ghi nhận trong lịch sử Application.
- Candidate nhận thông báo về các thay đổi quan trọng.

---

## 11. Job Board và tìm kiếm việc làm

### 11.1. Thông tin hiển thị trên Job Card

- Job Title.
- Recruiter hoặc Organization.
- Trạng thái Verified nếu có.
- Salary Range.
- Location.
- Work Mode.
- Employment Type.
- Experience Level.
- Required Skills chính.
- Thời gian đăng và Application Deadline.

### 11.2. Tìm kiếm và bộ lọc MVP

- Từ khóa theo Job Title, kỹ năng hoặc Organization.
- Địa điểm.
- Salary Range.
- Experience Level: Intern, Fresher, Junior, Middle, Senior.
- Employment Type: Internship, Part-time, Full-time, Contract/Freelance.
- Work Mode: On-site, Hybrid, Remote.
- Required Skills.
- Ngày đăng.

### 11.3. Job Detail

- Mô tả công việc.
- Trách nhiệm.
- Yêu cầu bắt buộc và ưu tiên.
- Required Skills.
- Mức lương và quyền lợi.
- Địa điểm và hình thức làm việc.
- Số lượng cần tuyển.
- Deadline.
- Thông tin Recruiter/Organization.
- Phương thức Screening.
- Các lưu ý trước khi Apply.

---

## 12. Đăng và quản lý Job

### 12.1. Luồng tạo Job

1. Recruiter chọn đăng với tư cách cá nhân hoặc Organization.
2. Nhập thông tin cơ bản.
3. Khai báo yêu cầu công việc và kỹ năng.
4. Chọn phương thức Screening.
5. Nếu dùng Assessment, cấu hình và yêu cầu AI tạo Draft.
6. Recruiter review/chỉnh sửa Assessment.
7. Xem trước Job.
8. Lưu Draft hoặc Publish.

### 12.2. Dữ liệu Job tối thiểu

- Job Title.
- Job Description.
- Responsibilities.
- Requirements.
- Required Skills.
- Preferred Skills.
- Experience Level.
- Salary Minimum và Maximum.
- Location.
- Work Mode.
- Employment Type.
- Number of Positions.
- Application Deadline.
- Screening Method.

### 12.3. Vòng đời Job

```text
Draft → Pending Review (nếu có) → Published → Paused/Closed → Archived
```

Một Job hết Deadline phải ngừng nhận Application mới nhưng dữ liệu cũ vẫn được lưu để Recruiter tiếp tục xử lý.

---

## 13. Apply Job và quản lý Application

### 13.1. Luồng Apply cơ bản

1. Candidate mở Job Detail.
2. Nhấn **Apply**.
3. Chọn CV phù hợp.
4. Trả lời Screening Questions cơ bản nếu có.
5. Xác nhận cho phép phân tích CV bằng AI.
6. Submit Application.
7. Thực hiện Assessment ngay hoặc trước Deadline nếu Job yêu cầu.

### 13.2. Một Application nên lưu

- Candidate.
- Job.
- CV Snapshot tại thời điểm nộp.
- Câu trả lời Screening Questions.
- Screening Method.
- AI CV Analysis.
- Assessment Attempt và Result.
- Trạng thái hiện tại.
- Lịch sử trạng thái.
- Ghi chú của Recruiter.
- Thời gian Apply, Withdraw và cập nhật cuối.

### 13.3. Tại sao cần CV Snapshot?

Nếu Candidate sửa hoặc thay thế CV sau khi Apply, Recruiter vẫn cần xem đúng phiên bản đã được dùng tại thời điểm ứng tuyển.

### 13.4. Điều kiện cơ bản

- Candidate không được Apply lặp lại cùng một Job khi Application cũ còn hiệu lực.
- Candidate không thể Apply Job đã đóng hoặc hết Deadline.
- Candidate chỉ được làm Assessment trong thời hạn và số lần cho phép.
- Khi Candidate Withdraw, lịch sử Application không bị xóa.

---

## 14. Các phương thức AI Screening

Recruiter chọn một trong ba phương thức cho từng Job.

### 14.1. Phương thức A — CV Screening

#### Luồng hoạt động

```text
Job Requirements + Candidate CV
                ↓
       AI phân tích đối chiếu
                ↓
      Kết quả kèm giải thích
                ↓
        Recruiter xem xét
```

#### Kết quả nên bao gồm

- Kỹ năng phù hợp.
- Kỹ năng còn thiếu hoặc chưa có bằng chứng.
- Kinh nghiệm liên quan.
- Dự án hoặc chứng chỉ liên quan.
- Mức độ đáp ứng yêu cầu bắt buộc.
- Các điểm cần Recruiter xác minh thêm.
- Tóm tắt lý do đề xuất.

Không nên chỉ hiển thị một con số như `87% match` mà không có căn cứ.

### 14.2. Phương thức B — AI Assessment

#### Cấu hình bởi Recruiter

- Chủ đề hoặc kỹ năng cần đánh giá.
- Cấp độ: Intern/Fresher/Junior/Middle/Senior.
- Số lượng câu hỏi.
- Thời lượng.
- Loại câu hỏi.
- Điểm hoặc tiêu chí đánh giá.

#### Dạng câu hỏi gợi ý

- Multiple Choice.
- Technical Short Answer.
- Scenario/Problem-solving Question.
- Coding Question ở mức phù hợp với scope.

#### Luồng hoạt động

1. AI đọc Job Description và cấu hình.
2. AI tạo Assessment Draft.
3. Recruiter review, chỉnh sửa và phê duyệt.
4. Candidate thực hiện Assessment.
5. Hệ thống chấm phần có đáp án cố định.
6. AI phân tích phần tự luận hoặc tình huống.
7. Recruiter xem kết quả chi tiết.

### 14.3. Phương thức C — Hybrid

Hybrid kết hợp CV Screening và Assessment.

```text
Candidate Apply
      ↓
CV Screening
      ↓
AI Assessment
      ↓
Tổng hợp bằng chứng
      ↓
Recruiter Decision
```

MVP không nên để AI tự động loại Candidate sau vòng CV. Hệ thống có thể xếp thứ tự ưu tiên hoặc đưa ra Recommendation, nhưng Recruiter quyết định.

### 14.4. Nguyên tắc an toàn và minh bạch của AI

- Hiển thị rõ nội dung nào do AI tạo.
- Assessment do AI tạo phải được Recruiter review trước khi dùng.
- Kết quả phải có giải thích và dẫn chứng từ dữ liệu liên quan.
- Không sử dụng các yếu tố nhạy cảm như giới tính, tôn giáo hoặc tình trạng hôn nhân để xếp hạng.
- Cho phép Recruiter bỏ qua hoặc điều chỉnh Recommendation.
- Lưu phiên bản Prompt/Configuration hoặc thông tin cần thiết để có thể audit.
- Candidate nên có quyền yêu cầu xem hoặc báo cáo kết quả bất hợp lý ở mức phù hợp.

---

## 15. Recruitment Pipeline

### 15.1. Trạng thái đề xuất cho MVP

```text
Applied → Screening → Shortlisted → Interview → Offered → Hired
    └──────────────→ Rejected
    └──────────────→ Withdrawn
```

### 15.2. Ý nghĩa trạng thái

| Trạng thái | Ý nghĩa |
|---|---|
| Applied | Candidate đã gửi Application |
| Screening | CV hoặc Assessment đang được xử lý/xem xét |
| Shortlisted | Candidate đã vượt qua vòng sàng lọc |
| Interview | Candidate đang ở giai đoạn phỏng vấn |
| Offered | Recruiter đã gửi đề nghị tuyển dụng |
| Hired | Candidate được xác nhận tuyển |
| Rejected | Recruiter từ chối Application |
| Withdrawn | Candidate chủ động rút Application |

### 15.3. Candidate Workspace của Recruiter

Khi mở một Application, Recruiter cần xem được:

- Candidate Profile.
- CV Snapshot.
- Kỹ năng và kinh nghiệm.
- AI CV Analysis.
- Assessment Detail và Result.
- Giải thích của AI.
- Application Timeline.
- Ghi chú nội bộ.
- Các nút Shortlist, Reject hoặc chuyển giai đoạn.

---

## 16. Hồ sơ ứng viên và quản lý CV

### 16.1. Master Profile

Candidate có một hồ sơ nghề nghiệp độc lập với từng CV, bao gồm:

- Thông tin cơ bản.
- Job Title mong muốn.
- Career Summary.
- Skills.
- Work Experience.
- Education.
- Projects.
- Certifications.
- Languages.
- GitHub, LinkedIn và Portfolio.
- Trạng thái tìm việc.

### 16.2. Quản lý nhiều CV

Ví dụ Candidate có thể lưu:

- `Flutter-Developer-CV.pdf`
- `Backend-Developer-CV.pdf`
- `Fullstack-Developer-CV.pdf`

Khi Apply, Candidate chọn CV phù hợp với từng Job.

### 16.3. CV Builder — Phase 2

Luồng đề xuất:

```text
Chọn Template
      ↓
Nhập hoặc lấy dữ liệu từ Master Profile
      ↓
Chỉnh sửa từng Section
      ↓
Preview
      ↓
Export PDF
```

Các phần chính:

- Personal Information.
- Professional Summary.
- Experience.
- Education.
- Skills.
- Projects.
- Certifications.

AI có thể hỗ trợ sửa ngữ pháp, viết lại Summary, cải thiện mô tả dự án và tối ưu CV theo Job. AI chỉ nên đề xuất, không tự bịa kinh nghiệm hoặc kỹ năng.

---

## 17. Xác minh danh tính và doanh nghiệp

### 17.1. Recruiter Verification

Thông tin có thể yêu cầu:

- Họ tên và thông tin liên hệ.
- Giấy tờ định danh.
- Ảnh chân dung hoặc selfie.
- Thông tin nghề nghiệp.
- Email hoặc số điện thoại đã xác minh.

Trạng thái:

```text
Not Submitted → Pending → Verified / Rejected → Resubmitted
```

### 17.2. Organization Verification

Thông tin có thể yêu cầu:

- Tên pháp lý của doanh nghiệp.
- Mã số doanh nghiệp hoặc mã số thuế.
- Email theo tên miền doanh nghiệp.
- Website.
- Địa chỉ.
- Giấy tờ đăng ký kinh doanh.

### 17.3. Cách triển khai phù hợp với đồ án

Không bắt buộc tích hợp nhà cung cấp eKYC production thật. Có thể xây dựng đầy đủ workflow:

1. User gửi thông tin và tài liệu.
2. Hệ thống tạo Verification Request.
3. Admin xem xét.
4. Admin Approve, Reject hoặc yêu cầu bổ sung.
5. Hệ thống hiển thị Verified Badge sau khi được duyệt.

Nếu có điều kiện, có thể tích hợp sandbox của một eKYC provider ở giai đoạn mở rộng.

---

## 18. Thông báo, giao tiếp và phỏng vấn

### 18.1. Notification MVP

Candidate nhận thông báo khi:

- Application được gửi thành công.
- Assessment sắp hết hạn.
- Application thay đổi trạng thái.
- Candidate được Shortlist hoặc Reject.
- Có lịch phỏng vấn hoặc Offer.

Recruiter nhận thông báo khi:

- Có Application mới.
- Candidate hoàn thành Assessment.
- Candidate rút Application.
- Verification hoặc Job Post thay đổi trạng thái.

MVP ưu tiên In-app Notification. Email và Push Notification trên Flutter có thể triển khai sau.

### 18.2. Chat — Phase 2

- Chat chỉ mở khi Application đạt điều kiện, ví dụ Shortlisted.
- Mỗi Conversation gắn với một Application.
- Hỗ trợ tin nhắn văn bản và tệp cơ bản nếu cần.
- Có chức năng Report và Block phù hợp.

### 18.3. Interview Scheduling — Phase 2

Recruiter tạo lịch gồm:

- Ngày và giờ.
- Múi giờ.
- Online hoặc On-site.
- Địa chỉ hoặc Meeting Link.
- Ghi chú.

Candidate có thể Accept, Decline hoặc Request Reschedule.

---

## 19. Các tính năng AI mở rộng

### 19.1. AI Job Recommendation

AI đối chiếu Job với:

- Candidate Profile.
- Skills.
- CV.
- Assessment History.
- Kinh nghiệm và mong muốn công việc.

Kết quả phải giải thích lý do đề xuất, ví dụ:

- Phù hợp 5/6 kỹ năng bắt buộc.
- Kết quả Flutter Assessment tốt.
- Mức kinh nghiệm phù hợp.
- Địa điểm và Work Mode phù hợp mong muốn.

### 19.2. Reverse Matching

Hệ thống phát hiện Candidate có năng lực phù hợp với một Job ngay cả khi Candidate chưa Apply.

Recruiter có thể nhận Recommendation và gửi lời mời Apply. Candidate phải chủ động bật chế độ cho phép được tìm thấy.

### 19.3. Talent Search

Recruiter tìm Candidate theo:

- Skills.
- Experience Level.
- Location.
- Assessment Result.
- Availability.
- Work Mode mong muốn.

Recruiter chỉ xem được dữ liệu mà Candidate cho phép công khai và có thể gửi **Invite to Apply**.

### 19.4. Interview Practice

Đây là tính năng luyện tập riêng, không phải Assessment của doanh nghiệp.

Candidate chọn:

- Vị trí muốn luyện.
- Cấp độ.
- Chủ đề.
- Ngôn ngữ.

AI đặt câu hỏi, nhận câu trả lời và phản hồi:

- Điểm tốt.
- Ý còn thiếu.
- Gợi ý câu trả lời tốt hơn.
- Nhận xét về cách diễn đạt.

Voice hoặc Video AI Interview nên để giai đoạn nâng cao.

### 19.5. Skill-gap Analysis

AI so sánh năng lực hiện tại của Candidate với Job hoặc Career Goal và đề xuất:

- Kỹ năng cần bổ sung.
- Chủ đề cần ôn tập.
- Assessment nên thử.
- Loại dự án nên thực hiện để tạo bằng chứng năng lực.

---

## 20. Báo cáo và kiểm duyệt

### 20.1. Candidate có thể Report

- Fake Job.
- Scam hoặc yêu cầu chuyển tiền đáng ngờ.
- Mức lương/mô tả gây hiểu nhầm.
- Nội dung không phù hợp.
- Recruiter có hành vi đáng ngờ hoặc quấy rối.

### 20.2. Recruiter có thể Report

- Fake Profile.
- Spam Application.
- Nội dung lạm dụng.
- Hành vi gian lận Assessment.

### 20.3. Trạng thái Report

```text
Open → Reviewing → Resolved / Rejected
```

Admin cần lưu lý do xử lý, người thực hiện và thời gian xử lý.

---

## 21. Mô hình doanh thu

### 21.1. Nguyên tắc ban đầu

Không nên thu phí Candidate cho các chức năng tìm và Apply Job cơ bản. Nguồn thu chính nên đến từ Recruiter và Organization.

### 21.2. Freemium Recruiter

Ví dụ:

| Gói | Quyền lợi gợi ý |
|---|---|
| Free | Số Job hoạt động giới hạn, Screening cơ bản |
| Pro | Nhiều Job hơn, AI Screening, Talent Search, Analytics |
| Business | Nhiều thành viên, Candidate Pool, quyền nâng cao, báo cáo |

### 21.3. Job Boost

Recruiter trả phí để Job:

- Được hiển thị nổi bật.
- Xuất hiện ở vị trí ưu tiên hợp lý.
- Tiếp cận nhóm Candidate phù hợp hơn.

Nội dung được tài trợ phải được ghi nhãn rõ ràng.

### 21.4. AI Credits

Giới hạn sử dụng theo gói, ví dụ:

- Số lượt AI CV Analysis mỗi tháng.
- Số Assessment được tạo.
- Số Candidate Recommendation.

### 21.5. Candidate Premium — giai đoạn sau

- CV Template cao cấp.
- AI CV Coach nâng cao.
- Interview Coach.
- Career/Skill Analysis chuyên sâu.

Các chức năng tuyển dụng thiết yếu vẫn nên miễn phí cho Candidate.

---

## 22. Phân chia chức năng giữa Website và Mobile

Website và ứng dụng Flutter không cần chứa toàn bộ chức năng giống nhau.

### 22.1. Website

Ưu tiên trải nghiệm Recruiter và Admin:

- Create/Edit Job.
- Review CV và AI Analysis.
- Quản lý Recruitment Pipeline.
- So sánh Candidate.
- Organization Management.
- Dashboard và Analytics.
- Admin Management và Moderation.

Candidate vẫn có thể tìm việc, Apply và quản lý Profile trên web.

### 22.2. Flutter Mobile App

Ưu tiên trải nghiệm Candidate:

- Job Feed.
- Search và Filter.
- Job Detail.
- Save Job.
- Apply.
- Assessment phù hợp với mobile.
- Application Tracking.
- Notifications.
- Chat.
- Profile.

Recruiter trên mobile chỉ cần các thao tác nhanh:

- Nhận Notification.
- Xem Application và Candidate Overview.
- Chat.
- Cập nhật trạng thái cơ bản.

Không cần đưa toàn bộ Admin Dashboard lên mobile trong MVP.

---

## 23. Phạm vi MVP đề xuất

### 23.1. Core MVP

| Module | Phạm vi MVP | Ưu tiên |
|---|---|:---:|
| Authentication | Đăng ký, đăng nhập, reset password, verify contact | Bắt buộc |
| Candidate Profile | Skills, experience, education, projects, links | Bắt buộc |
| Recruiter Profile | Thông tin và trạng thái xác minh | Bắt buộc |
| Organization | Tạo profile và đăng Job dưới tên công ty | Bắt buộc, bản gọn |
| Verification | Gửi request và Admin duyệt thủ công | Bắt buộc |
| Job Board | Danh sách, detail, search và filter | Bắt buộc |
| Job Management | Draft, publish, update, pause, close | Bắt buộc |
| Apply Job | Chọn CV và submit Application | Bắt buộc |
| Multiple CVs | Upload, quản lý và chọn CV khi Apply | Bắt buộc |
| AI CV Analysis | Phân tích và giải thích mức phù hợp | Bắt buộc |
| AI Assessment | Generate draft, recruiter review, candidate submit | Bắt buộc |
| Assessment Evaluation | Chấm và phân tích kết quả | Bắt buộc |
| Recruitment Pipeline | Quản lý trạng thái Application | Bắt buộc |
| Application Tracking | Candidate theo dõi tiến trình | Bắt buộc |
| In-app Notification | Thông báo sự kiện chính | Bắt buộc |
| Admin Management | User, Job, Verification và Report | Bắt buộc |
| Report/Moderation | Gửi và xử lý Report | Nên có |

### 23.2. Có thể cắt khỏi MVP khi thiếu thời gian

- Member invitation và phân quyền Organization chi tiết.
- Chat thời gian thực.
- Interview Scheduling.
- Payment thật.
- Talent Search.
- Job Recommendation.
- CV Builder.
- Voice/Video Interview.

### 23.3. Một MVP được xem là hoàn chỉnh khi

1. Recruiter đã xác minh có thể tạo và Publish Job.
2. Candidate có thể tìm Job và Apply bằng CV.
3. Job có thể sử dụng CV Screening, Assessment hoặc Hybrid.
4. Recruiter xem được kết quả và lời giải thích.
5. Recruiter có thể xử lý Candidate trong Pipeline.
6. Candidate theo dõi được trạng thái Application.
7. Admin có thể kiểm soát xác minh và nội dung vi phạm.

---

## 24. Roadmap phát triển

### Phase 1 — Foundation

- Authentication và phân quyền.
- Candidate/Recruiter Profile.
- Organization bản cơ bản.
- Verification workflow.
- Job Board và Job Management.
- Multiple CVs và Apply Job.

### Phase 2 — Core AI Recruitment

- AI CV Analysis.
- AI Assessment Generation.
- Assessment Submission và Evaluation.
- Hybrid Screening.
- Recruitment Pipeline.
- Application Tracking.
- In-app Notification.
- Admin Moderation.

### Phase 3 — Communication and Candidate Tools

- Chat.
- Interview Scheduling.
- CV Builder.
- AI CV Improvement.
- Interview Practice.
- Job Alerts.

### Phase 4 — Matching and Monetization

- AI Job Recommendation.
- Reverse Matching.
- Talent Search.
- Invite to Apply.
- Subscription.
- AI Credits.
- Job Boost và Payment.

### Phase 5 — Advanced Platform

- Granular Organization Permissions.
- Organization/Recruiter Analytics.
- Voice/Video AI Interview.
- Advanced eKYC.
- Fraud Detection.
- AI Cost Monitoring.
- Audit và Compliance nâng cao.

---

## 25. Quy tắc nghiệp vụ quan trọng

### 25.1. User và Role

- Một User Account có thể là Candidate, Recruiter hoặc có nhiều khả năng tùy cách thiết kế, nhưng giao diện phải thể hiện rõ ngữ cảnh hiện tại.
- Chỉ Recruiter đủ điều kiện xác minh mới được Publish Job.
- Chỉ Admin được duyệt Verification Request.
- Quyền của Organization Member chỉ áp dụng trong Organization tương ứng.

### 25.2. Job

- Job phải có Deadline hợp lệ và các trường bắt buộc trước khi Publish.
- Job hết hạn hoặc Closed không nhận Application mới.
- Job đã có Application không nên bị xóa vật lý; nên Archive hoặc Soft Delete.
- Thay đổi quan trọng trong Screening sau khi đã có Candidate phải được hạn chế hoặc tạo phiên bản mới.

### 25.3. Application

- Mỗi Candidate chỉ có một Application đang hiệu lực cho mỗi Job.
- CV được lưu dưới dạng Snapshot khi Apply.
- Withdraw hoặc Reject không xóa lịch sử.
- Chuyển trạng thái phải tuân theo các bước hợp lệ hoặc yêu cầu lý do khi bỏ qua bước.

### 25.4. Assessment

- Assessment do AI tạo phải được Recruiter phê duyệt.
- Candidate chỉ được truy cập Assessment khi có Application hợp lệ.
- Hệ thống kiểm soát thời gian và số lần làm bài.
- Kết quả AI phải có phần giải thích.
- Khi Job đã nhận bài làm, Assessment không được chỉnh sửa trực tiếp làm thay đổi bài cũ.

### 25.5. Verification và Moderation

- Verified Badge chỉ hiển thị khi request đã được Approve.
- Khi Verification hết hiệu lực hoặc bị thu hồi, Badge phải được gỡ.
- Admin action cần có lý do và Audit Trail tối thiểu.
- Nội dung bị Report không nhất thiết tự động bị xóa trước khi review, trừ trường hợp nguy hiểm rõ ràng.

### 25.6. Privacy

- Candidate kiểm soát việc Profile có xuất hiện trong Talent Search hay không.
- Recruiter chỉ xem được dữ liệu cần thiết cho mục đích tuyển dụng.
- Dữ liệu định danh/eKYC cần được giới hạn quyền truy cập.
- Hệ thống phải thông báo việc sử dụng AI và xin consent phù hợp.

---

## 26. Các thực thể dữ liệu chính

Đây là danh sách khái niệm, chưa phải thiết kế database cuối cùng.

| Thực thể | Mục đích |
|---|---|
| User | Tài khoản đăng nhập chung |
| Role/Permission | Quyền truy cập hệ thống |
| CandidateProfile | Hồ sơ nghề nghiệp của Candidate |
| RecruiterProfile | Hồ sơ của Recruiter |
| Organization | Thông tin doanh nghiệp |
| OrganizationMember | Quan hệ User với Organization |
| VerificationRequest | Yêu cầu xác minh cá nhân/doanh nghiệp |
| CV | File và metadata của CV |
| Job | Tin tuyển dụng |
| JobSkill | Kỹ năng bắt buộc/ưu tiên của Job |
| SavedJob | Job được Candidate lưu |
| Application | Hồ sơ ứng tuyển |
| ApplicationStatusHistory | Lịch sử Recruitment Pipeline |
| ScreeningConfiguration | Phương thức và thiết lập Screening |
| CVAnalysis | Kết quả AI phân tích CV |
| Assessment | Bài đánh giá của Job |
| AssessmentQuestion | Câu hỏi trong Assessment |
| AssessmentAttempt | Lần làm bài của Candidate |
| AssessmentAnswer | Câu trả lời |
| AssessmentResult | Điểm và nhận xét |
| Notification | Thông báo trong hệ thống |
| Interview | Lịch phỏng vấn |
| Conversation/Message | Giao tiếp theo Application |
| Report | Báo cáo vi phạm |
| Subscription/Plan | Gói sử dụng |
| Transaction | Giao dịch thanh toán |
| AIUsage | Theo dõi lượt và chi phí AI |
| AuditLog | Lịch sử hành động quan trọng |

---

## 27. Tiêu chí đánh giá MVP thành công

### 27.1. Về nghiệp vụ

- Có ít nhất một luồng tuyển dụng hoàn chỉnh từ Publish Job đến Hired/Rejected.
- Cả Recruiter cá nhân và Organization đều có thể được thể hiện hợp lý.
- Candidate biết chính xác Application đang ở giai đoạn nào.
- Admin xử lý được xác minh và Report.

### 27.2. Về AI

- AI Analysis bám theo yêu cầu cụ thể của Job.
- Kết quả có giải thích, điểm mạnh và phần còn thiếu.
- Recruiter review được nội dung AI tạo.
- AI không tự đưa ra quyết định tuyển dụng cuối cùng.
- Có phương án xử lý khi AI lỗi hoặc chưa có kết quả.

### 27.3. Về trải nghiệm

- Candidate có thể Apply với số bước hợp lý.
- Recruiter có thể nhanh chóng tìm Application cần xử lý.
- Các trạng thái và thuật ngữ nhất quán giữa Website và Mobile.
- Notification giúp hai phía không bỏ lỡ sự kiện quan trọng.

### 27.4. Về khả năng demo đồ án

Kịch bản demo nên thể hiện được:

1. Recruiter/Organization được xác minh.
2. Recruiter tạo Job và cấu hình AI Screening.
3. Candidate tìm Job và Apply.
4. Candidate hoàn thành Assessment.
5. AI phân tích CV và bài làm.
6. Recruiter xem bằng chứng, Shortlist Candidate.
7. Recruiter chuyển Candidate qua Interview và Hired.
8. Candidate theo dõi toàn bộ tiến trình.
9. Admin xử lý một Verification hoặc Report.

---

## 28. Kết luận

InterVue nên tập trung giải quyết một bài toán rõ ràng:

> **Giúp Recruiter tuyển đúng người nhanh hơn bằng quy trình sàng lọc có bằng chứng, đồng thời giúp Candidate chứng minh và cải thiện năng lực của mình.**

Core business loop của sản phẩm là:

```text
Job Requirements
      ↓
Configurable AI Screening
      ↓
Candidate Application
      ↓
Evidence-based Evaluation
      ↓
Recruiter Decision
```

Đối với đồ án Website + Flutter, nhóm nên ưu tiên bốn trụ cột:

1. Job Board.
2. Application Tracking.
3. Configurable AI Screening.
4. Recruitment Pipeline.

CV Builder, Interview Coach, Job Recommendation, Talent Search và Monetization là hệ sinh thái mở rộng hợp lý, nhưng không nên làm ảnh hưởng đến chất lượng của core MVP.

---

## Ghi chú bổ sung về sau

> Khu vực này dùng để ghi lại các quyết định mới, câu hỏi còn mở hoặc thay đổi phạm vi trong quá trình phân tích và triển khai.

### Các câu hỏi cần chốt trước khi thiết kế chi tiết

- Một User có được chuyển đổi linh hoạt giữa Candidate và Recruiter không?
- Recruiter chưa Verified có được tạo Draft Job không, hay bị chặn hoàn toàn?
- Job có cần Admin duyệt trước khi Publish không?
- Assessment cho phép những loại câu hỏi nào trong MVP?
- Coding Question sẽ chấm bằng test case hay chỉ AI review?
- Candidate có được xem toàn bộ AI Analysis hay chỉ phần Feedback phù hợp?
- Organization Member được xem tất cả Job hay chỉ Job được giao?
- Có cần Payment thật trong đồ án hay chỉ mô phỏng Plan/Transaction?
- Dữ liệu và file CV sẽ được lưu trữ trong bao lâu?
- Ngôn ngữ chính của nền tảng là tiếng Việt, tiếng Anh hay song ngữ?

