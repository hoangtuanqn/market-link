# Đặc tả Chức năng & Luồng hoạt động
## Nền tảng Tuyển dụng IT (Đồ án)

| Thông tin | Chi tiết |
|---|---|
| **Phiên bản** | 1.0 |
| **Ngày cập nhật** | 22/09/2026 |
| **Phạm vi** | Chức năng và luồng hoạt động của hệ thống |

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Actor trong hệ thống](#2-actor-trong-hệ-thống)
3. [Danh sách chức năng](#3-danh-sách-chức-năng)
   - 3.1 [Ứng viên](#31-ứng-viên-candidate)
   - 3.2 [Nhà tuyển dụng](#32-nhà-tuyển-dụng-recruiter)
   - 3.3 [Admin](#33-admin)
4. [Luồng hoạt động](#4-luồng-hoạt-động)
5. [Vòng đời trạng thái](#5-vòng-đời-trạng-thái)
6. [Sơ đồ tổng thể](#6-sơ-đồ-tổng-thể)
7. [Thuật ngữ](#7-thuật-ngữ)
8. [Phụ lục: Hướng dẫn bổ sung tài liệu](#8-phụ-lục-hướng-dẫn-bổ-sung-tài-liệu)
9. [Lịch sử thay đổi](#9-lịch-sử-thay-đổi)

---

## 1. Tổng quan

Nền tảng kết nối **nhà tuyển dụng** (cá nhân hoặc doanh nghiệp) với **ứng viên IT (dev)**. Hệ thống tập trung vào ba giá trị cốt lõi:

| # | Giá trị | Mô tả |
|---|---|---|
| 1 | **Tin cậy** | Nhà tuyển dụng phải xác thực danh tính (eKYC / giấy phép kinh doanh) trước khi đăng tin |
| 2 | **Đánh giá năng lực thực tế** | AI sinh bài test dựa trên JD, ứng viên làm bài ngay trên web |
| 3 | **Hỗ trợ ứng viên** | CV Builder và luyện phỏng vấn với AI |

Nền tảng hỗ trợ ba loại tin đăng: **Full-time**, **Part-time**, **Dự án freelance**.

---

## 2. Actor trong hệ thống

| Actor | Gộp từ | Mô tả |
|---|---|---|
| **Ứng viên (Candidate)** | Candidate, Freelancer | Dev tìm việc full-time hoặc nhận dự án freelance, ứng tuyển, làm test, tạo CV, luyện phỏng vấn |
| **Nhà tuyển dụng (Recruiter)** | Individual Recruiter, Company Owner, HR, Hiring Manager, Client | Một vai trò duy nhất. Khi xác thực, người dùng chọn loại **Cá nhân** (eKYC CCCD) hoặc **Doanh nghiệp** (mã số thuế, giấy phép). Tự đăng tin, tự duyệt đề, tự xử lý hồ sơ |
| **Admin** | Admin, Moderator | Duyệt xác thực, kiểm duyệt tin, xử lý báo cáo |

> **Nguyên tắc gộp actor**
> - **Doanh nghiệp và cá nhân** chỉ khác nhau ở loại xác thực, còn quyền trong hệ thống là như nhau.
> - **Freelance** là một loại tin đăng ("Dự án freelance") thay vì một hệ thống riêng. Nhà tuyển dụng đăng dự án, ứng viên ứng tuyển như bình thường.

---

## 3. Danh sách chức năng

> Mỗi chức năng có một mã định danh để tiện tham chiếu từ các luồng và khi bổ sung về sau.
> Quy ước: `C` = Candidate, `R` = Recruiter, `A` = Admin.

### 3.1. Ứng viên (Candidate)

| Mã | Nhóm | Chức năng | Mô tả |
|---|---|---|---|
| C-01 | Tài khoản | Đăng ký / Đăng nhập | Bằng email hoặc Google/GitHub; quản lý tài khoản |
| C-02 | Hồ sơ | Quản lý hồ sơ cá nhân | Kỹ năng, tech stack, kinh nghiệm, học vấn, mức lương mong muốn |
| C-03 | Hồ sơ | Upload CV | Upload PDF, AI trích xuất thông tin để tự điền vào hồ sơ |
| C-04 | CV | CV Builder | Chọn template, nhập nội dung, AI gợi ý cách viết, xuất PDF |
| C-05 | Việc làm | Tìm kiếm & lọc tin | Theo tech stack, level, lương, địa điểm, remote, loại tin |
| C-06 | Việc làm | Xem chi tiết tin | Xem tin, trang nhà tuyển dụng, huy hiệu xác thực |
| C-07 | Việc làm | Lưu tin yêu thích | Lưu lại tin để xem sau |
| C-08 | Ứng tuyển | Ứng tuyển | Bằng CV có sẵn hoặc hồ sơ trên hệ thống |
| C-09 | Ứng tuyển | Làm bài test AI | Làm bài ngay trên web nếu tin có yêu cầu |
| C-10 | Ứng tuyển | Theo dõi đơn | Xem trạng thái các đơn đã nộp; rút đơn |
| C-11 | Luyện tập | Luyện phỏng vấn AI | Chọn vị trí hoặc dán JD, AI hỏi, ứng viên trả lời, AI nhận xét và chấm điểm |
| C-12 | Thông báo | Nhận thông báo | Khi đơn đổi trạng thái hoặc có lời mời phỏng vấn |
| C-13 | Cộng đồng | Báo cáo tin | Báo cáo tin tuyển dụng đáng ngờ |

### 3.2. Nhà tuyển dụng (Recruiter)

| Mã | Nhóm | Chức năng | Mô tả |
|---|---|---|---|
| R-01 | Tài khoản | Đăng ký / Đăng nhập | Quản lý tài khoản |
| R-02 | Xác thực | Gửi hồ sơ xác thực | **Cá nhân:** CCCD + ảnh khuôn mặt. **Doanh nghiệp:** mã số thuế + giấy phép kinh doanh |
| R-03 | Hồ sơ | Quản lý trang hồ sơ | Giới thiệu, lĩnh vực, quy mô (với doanh nghiệp) |
| R-04 | Tin đăng | Tạo tin tuyển dụng | Nhập thông tin; AI hỗ trợ viết JD từ vài dòng mô tả |
| R-05 | Tin đăng | Tạo bài test bằng AI | AI sinh đề từ JD; nhà tuyển dụng xem, sửa, duyệt đề trước khi gắn vào tin |
| R-06 | Tin đăng | Quản lý tin | Sửa, tạm dừng, đóng tin |
| R-07 | Ứng viên | Xem danh sách ứng viên | CV, hồ sơ, kết quả test (điểm + nhận xét AI) theo từng tin |
| R-08 | Ứng viên | Chuyển trạng thái ứng viên | Đang xem xét, mời phỏng vấn, đạt, từ chối |
| R-09 | Ứng viên | Ghi chú đánh giá | Ghi chú cho từng ứng viên |
| R-10 | Thông báo | Gửi thông báo | Mời phỏng vấn hoặc từ chối (có mẫu sẵn) |

### 3.3. Admin

| Mã | Nhóm | Chức năng | Mô tả |
|---|---|---|---|
| A-01 | Xác thực | Duyệt hồ sơ xác thực | Duyệt hoặc từ chối (kèm lý do) |
| A-02 | Kiểm duyệt | Kiểm duyệt tin đăng | Duyệt tin trước khi hiển thị |
| A-03 | Kiểm duyệt | Xử lý báo cáo vi phạm | Bỏ qua, gỡ tin, khóa tài khoản |
| A-04 | Quản trị | Quản lý người dùng | Xem, khóa, mở khóa tài khoản |
| A-05 | Quản trị | Quản lý danh mục | Kỹ năng, tech stack, địa điểm (dữ liệu dùng chung cho bộ lọc) |
| A-06 | Thống kê | Dashboard | Số người dùng, số tin, số lượt ứng tuyển |

---

## 4. Luồng hoạt động

### Danh sách luồng

| Mã | Tên luồng | Actor chính | Chức năng liên quan |
|---|---|---|---|
| F-01 | Đăng ký và xác thực nhà tuyển dụng | Recruiter, Admin | R-01, R-02, A-01 |
| F-02 | Đăng tin tuyển dụng kèm bài test AI | Recruiter, Admin | R-04, R-05, A-02 |
| F-03 | Tìm việc và ứng tuyển | Candidate | C-05 → C-08 |
| F-04 | Làm bài test AI và chấm điểm | Candidate | C-09 |
| F-05 | Xử lý hồ sơ ứng viên | Recruiter | R-07 → R-10 |
| F-06 | Tạo CV và luyện phỏng vấn | Candidate | C-04, C-11 |
| F-07 | Báo cáo và kiểm duyệt | Candidate, Admin | C-13, A-03 |

---

### F-01: Đăng ký và xác thực nhà tuyển dụng

1. Nhà tuyển dụng đăng ký tài khoản và chọn loại **Cá nhân** hoặc **Doanh nghiệp**.
2. Nộp hồ sơ xác thực tương ứng.
3. Trạng thái tài khoản chuyển sang **Chờ duyệt**.
4. Admin kiểm tra hồ sơ và bấm **Duyệt** hoặc **Từ chối** (kèm lý do).
5. Kết quả:
   - **Được duyệt:** tài khoản nhận huy hiệu **Đã xác thực** và được đăng tin.
   - **Bị từ chối:** nhà tuyển dụng sửa lại và nộp lại.

> **Quy tắc:** Tài khoản chưa xác thực **không được đăng tin**.

---

### F-02: Đăng tin tuyển dụng kèm bài test AI

1. Nhà tuyển dụng nhập thông tin cơ bản: vị trí, level, tech stack, lương, địa điểm, loại tin.
2. *(Tùy chọn)* Bấm **"AI viết JD"**: AI sinh mô tả công việc, nhà tuyển dụng chỉnh sửa lại.
3. *(Tùy chọn)* Bấm **"Tạo bài test"**: AI sinh đề (trắc nghiệm, câu hỏi ngắn, bài code) dựa trên JD và level.
4. Nhà tuyển dụng xem, sửa, xóa câu hỏi rồi **duyệt đề**, đồng thời:
   - Đặt thời gian làm bài.
   - Chọn test là **bắt buộc** hay **tùy chọn**.
5. Gửi tin → tin chuyển sang trạng thái **Chờ kiểm duyệt**.
6. Kết quả:
   - **Admin duyệt:** tin **Đang hiển thị**.
   - **Admin từ chối:** tin quay về **Nháp** kèm lý do.

> **Quy tắc:** Đề do AI sinh ra phải được nhà tuyển dụng duyệt trước khi áp dụng cho ứng viên.

---

### F-03: Tìm việc và ứng tuyển

1. Ứng viên tìm kiếm, lọc tin và xem chi tiết.
2. Bấm **Ứng tuyển** và chọn CV:
   - File CV đã upload, hoặc
   - CV tạo từ CV Builder, hoặc
   - Hồ sơ hệ thống.
3. Hệ thống kiểm tra tin có yêu cầu test hay không:
   - **Không có test:** đơn được gửi ngay.
   - **Có test:** chuyển sang **F-04**, đơn chỉ hoàn tất khi nộp bài.
4. Nhà tuyển dụng nhận thông báo có đơn mới.

---

### F-04: Làm bài test AI và chấm điểm

1. Ứng viên xem thông tin bài test (số câu, thời gian, dạng bài) rồi bấm **Bắt đầu**.
2. Đồng hồ đếm ngược chạy. Hệ thống ghi nhận số lần chuyển tab (chống gian lận cơ bản).
3. Ứng viên làm bài và nộp, hoặc hệ thống **tự nộp khi hết giờ**.
4. Hệ thống chấm theo từng dạng bài:

   | Dạng bài | Cách chấm |
   |---|---|
   | Trắc nghiệm | Tự động theo đáp án |
   | Bài code | Chạy test case, chấm tự động |
   | Câu tự luận | AI chấm theo tiêu chí và ghi nhận xét |

5. Kết quả được lưu vào đơn ứng tuyển. Nhà tuyển dụng xem được điểm từng phần, nhận xét AI và bài làm gốc.
6. Ứng viên nhận điểm tổng và feedback ngắn.

> **Quy tắc:** Điểm AI chỉ để nhà tuyển dụng tham khảo. Hệ thống **không tự động loại** ứng viên; quyết định cuối cùng do nhà tuyển dụng đưa ra.

---

### F-05: Xử lý hồ sơ ứng viên

1. Nhà tuyển dụng mở tin và xem danh sách ứng viên, sắp xếp theo ngày nộp hoặc điểm test.
2. Xem chi tiết từng ứng viên: CV, hồ sơ, kết quả test.
3. Ghi chú và chuyển trạng thái đơn.
4. Mỗi lần đổi trạng thái, ứng viên nhận thông báo tương ứng.
   - Ví dụ: khi được **mời phỏng vấn**, ứng viên nhận thời gian, hình thức và link họp.

---

### F-06: Tạo CV và luyện phỏng vấn

**A. Tạo CV**

1. Ứng viên chọn template.
2. Nhập nội dung, hoặc lấy dữ liệu có sẵn từ hồ sơ.
3. Dùng AI gợi ý cách viết cho phần kinh nghiệm và dự án.
4. Xem trước, lưu lại, xuất PDF. CV này dùng được trực tiếp khi ứng tuyển.

**B. Luyện phỏng vấn**

1. Ứng viên chọn vị trí và level, hoặc dán một JD bất kỳ.
2. AI hỏi lần lượt từng câu (kỹ thuật và hành vi). Ứng viên trả lời bằng text.
3. Kết thúc buổi, AI tổng hợp điểm mạnh, điểm yếu và gợi ý cải thiện.
4. Lịch sử các buổi luyện được lưu lại để xem lại.

---

### F-07: Báo cáo và kiểm duyệt

1. Ứng viên báo cáo một tin đáng ngờ và chọn lý do.
2. Admin xem báo cáo và chọn một trong ba hành động:
   - **Bỏ qua**
   - **Gỡ tin**
   - **Khóa tài khoản** nhà tuyển dụng
3. Người báo cáo nhận thông báo về kết quả xử lý.

---

## 5. Vòng đời trạng thái

### 5.1. Tài khoản nhà tuyển dụng

```
Chưa xác thực → Chờ duyệt → Đã xác thực
                    ↓
                Bị từ chối → (sửa & nộp lại) → Chờ duyệt
```

| Trạng thái | Ý nghĩa | Được đăng tin? |
|---|---|---|
| Chưa xác thực | Mới đăng ký, chưa nộp hồ sơ | Không |
| Chờ duyệt | Đã nộp hồ sơ, chờ Admin | Không |
| Đã xác thực | Admin đã duyệt, có huy hiệu | Có |
| Bị từ chối | Hồ sơ không hợp lệ, có lý do kèm theo | Không |

### 5.2. Tin tuyển dụng

```
Nháp → Chờ duyệt → Đang hiển thị → Tạm dừng / Hết hạn / Đã đóng
          ↓
     (bị từ chối) → Nháp
```

| Trạng thái | Ý nghĩa | Ứng viên thấy được? |
|---|---|---|
| Nháp | Đang soạn hoặc bị Admin trả về | Không |
| Chờ duyệt | Đã gửi, chờ Admin kiểm duyệt | Không |
| Đang hiển thị | Đang nhận ứng tuyển | Có |
| Tạm dừng | Nhà tuyển dụng tạm ngưng nhận đơn | Không |
| Hết hạn | Quá deadline | Không |
| Đã đóng | Nhà tuyển dụng đóng tin, hoặc tin bị Admin gỡ | Không |

### 5.3. Đơn ứng tuyển

```
Đã nộp → Đang xem xét → Mời phỏng vấn → Đạt / Từ chối
   ↓            ↓              ↓
             Rút đơn (ứng viên tự thực hiện)
```

| Trạng thái | Người thay đổi | Ứng viên nhận thông báo? |
|---|---|---|
| Đã nộp | Hệ thống | Có |
| Đang xem xét | Nhà tuyển dụng | Có |
| Mời phỏng vấn | Nhà tuyển dụng | Có (kèm thời gian, hình thức, link họp) |
| Đạt | Nhà tuyển dụng | Có |
| Từ chối | Nhà tuyển dụng | Có |
| Rút đơn | Ứng viên | Không (nhà tuyển dụng được thông báo) |

---

## 6. Sơ đồ tổng thể

```
[Recruiter] Đăng ký → Xác thực → (Admin duyệt) → Đăng tin + AI tạo đề → (Admin duyệt tin)
                                                                              ↓
[Candidate] Tạo hồ sơ / CV → Tìm việc → Ứng tuyển → Làm test AI → AI chấm điểm
                                                                              ↓
[Recruiter] Xem hồ sơ + kết quả test → Mời phỏng vấn → Đạt / Từ chối → Thông báo cho Candidate

[Candidate] Luyện phỏng vấn AI (độc lập, dùng bất cứ lúc nào)
```

---

## 7. Thuật ngữ

| Thuật ngữ | Giải thích |
|---|---|
| **JD** (Job Description) | Mô tả công việc trong tin tuyển dụng |
| **eKYC** | Xác thực danh tính điện tử (CCCD + ảnh khuôn mặt) |
| **Tech stack** | Tập hợp công nghệ, ngôn ngữ, framework sử dụng trong công việc |
| **Level** | Cấp độ kinh nghiệm: Intern, Fresher, Junior, Middle, Senior... |
| **Test case** | Bộ dữ liệu đầu vào và kết quả mong đợi dùng để chấm bài code |
| **Huy hiệu xác thực** | Dấu hiệu hiển thị trên tin và hồ sơ cho biết nhà tuyển dụng đã được Admin duyệt |

---

## 8. Phụ lục: Hướng dẫn bổ sung tài liệu

### 8.1. Thêm chức năng mới

Thêm một dòng vào bảng của actor tương ứng ở **Mục 3**, dùng mã tiếp theo (ví dụ `C-14`, `R-11`, `A-07`):

```markdown
| C-14 | <Nhóm> | <Tên chức năng> | <Mô tả ngắn> |
```

### 8.2. Thêm luồng mới

1. Thêm một dòng vào bảng **Danh sách luồng** ở **Mục 4** với mã tiếp theo (`F-08`...).
2. Thêm một mục chi tiết theo mẫu:

```markdown
### F-08: <Tên luồng>

1. <Bước 1>
2. <Bước 2>
3. Kết quả:
   - **<Trường hợp A>:** ...
   - **<Trường hợp B>:** ...

> **Quy tắc:** <Ràng buộc nghiệp vụ nếu có>
```

### 8.3. Thêm trạng thái mới

Cập nhật cả sơ đồ và bảng trạng thái tương ứng ở **Mục 5**.

### 8.4. Ghi nhận thay đổi

Mỗi lần chỉnh sửa, thêm một dòng vào **Mục 9** và tăng số phiên bản ở đầu tài liệu.

---

## 9. Lịch sử thay đổi

| Phiên bản | Ngày | Người cập nhật | Nội dung |
|---|---|---|---|
| 1.0 | 22/09/2026 | Phạm Hoàng Tuấn | Khởi tạo tài liệu: 3 actor, 29 chức năng, 7 luồng, 3 vòng đời trạng thái |

---

### Tài liệu phiên bản trước

Tham khảo phiên bản tài liệu trước tại [INTERVUE_OVERVIEW.md](./INTERVUE_OVERVIEW.md).

