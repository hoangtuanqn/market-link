# InterVue

### Nền tảng Tuyển dụng Thông minh — Kết hợp Đánh giá Năng lực bằng AI và Sàng lọc Ứng viên Tự động

---

## Giới thiệu

InterVue là nền tảng kết nối ứng viên và nhà tuyển dụng, trong đó quy trình sàng lọc được tự động hóa bằng AI theo hai hình thức linh hoạt: đánh giá năng lực qua bài test do AI sinh tự động, hoặc phân tích CV bằng AI. Nhà tuyển dụng toàn quyền lựa chọn hình thức sàng lọc phù hợp với từng vị trí tuyển dụng, đồng thời chỉ định số lượng ứng viên mong muốn; hệ thống tự động sàng lọc và trả về danh sách ứng viên phù hợp nhất kèm giải thích căn cứ xếp hạng. Đồng thời, hệ thống vận hành theo cơ chế hai chiều: không chỉ hỗ trợ nhà tuyển dụng tìm ứng viên, mà còn chủ động phân tích kết quả đánh giá của ứng viên để đề xuất ngược lại các vị trí tuyển dụng phù hợp và thông báo đến nhà tuyển dụng tương ứng.

---

## Vấn đề cần giải quyết

Mô hình tuyển dụng trực tuyến phổ biến hiện nay tồn tại các hạn chế sau:

- **Thông tin bất đối xứng:** Nội dung CV do ứng viên tự khai, không có cơ chế kiểm chứng độc lập.
- **Chi phí sàng lọc cao:** Nhà tuyển dụng phải xử lý thủ công số lượng lớn hồ sơ trước khi xác định ứng viên phù hợp.
- **Thiếu tiêu chí sàng lọc linh hoạt:** Đa số nền tảng chỉ hỗ trợ một hình thức sàng lọc cố định, không cho phép nhà tuyển dụng tùy chỉnh theo tính chất từng vị trí.
- **Kết nối một chiều:** Ứng viên phải chủ động tìm kiếm và ứng tuyển từng tin tuyển dụng; nhà tuyển dụng bỏ lỡ các ứng viên tiềm năng không chủ động ứng tuyển vào vị trí của mình.

InterVue giải quyết các hạn chế trên bằng cách cung cấp cơ chế sàng lọc kép (test-based hoặc CV-based) do nhà tuyển dụng chủ động lựa chọn, kết hợp AI để tự động hóa toàn bộ quy trình đánh giá, xếp hạng, và chủ động gợi ý kết nối theo cả hai chiều.

---

## Tính năng chính

### Dành cho Nhà tuyển dụng

**1. Cấu hình quy trình tuyển dụng theo từng tin tuyển dụng**

Khi đăng tin tuyển dụng, nhà tuyển dụng lựa chọn một trong hai hình thức sàng lọc:

- **Hình thức Test:** Hệ thống trích xuất yêu cầu kỹ năng từ nội dung tin tuyển dụng, tự động sinh bộ câu hỏi đánh giá tương ứng. Ứng viên thực hiện bài test dưới dạng văn bản hoặc giọng nói (giọng nói được chuyển đổi sang văn bản, cho phép chỉnh sửa trước khi nộp).
- **Hình thức CV:** Ứng viên nộp CV; AI tự động phân tích (parse) nội dung CV và chấm điểm mức độ phù hợp so với yêu cầu công việc.

**2. Khảo sát số lượng ứng viên mong muốn (Target Headcount)**

Sau khi đăng tin tuyển dụng, hệ thống khảo sát nhà tuyển dụng về số lượng ứng viên cần tuyển (N). Thông số này là đầu vào trực tiếp cho thuật toán sàng lọc — quyết định số lượng ứng viên được đưa vào danh sách kết quả cuối cùng.

**3. AI quét và chấm điểm CV**

Đối với hình thức CV, AI thực hiện trích xuất thông tin có cấu trúc từ CV (kỹ năng, kinh nghiệm, học vấn), đối chiếu với yêu cầu công việc, và chấm điểm mức độ phù hợp theo thang điểm chuẩn hóa.

**4. Sàng lọc và xếp hạng Top N ứng viên**

Dựa trên kết quả từ bài test hoặc điểm phân tích CV (tùy theo hình thức đã chọn), hệ thống sàng lọc và trả về đúng số lượng ứng viên (N) mà nhà tuyển dụng đã chỉ định, sắp xếp theo thứ tự phù hợp giảm dần.

**5. Giải thích căn cứ xếp hạng (Explainable Ranking)**

Mỗi ứng viên trong danh sách Top N đi kèm giải thích bằng ngôn ngữ tự nhiên về căn cứ xếp hạng — ví dụ: điểm mạnh cụ thể theo từng kỹ năng, mức độ khớp với yêu cầu công việc. Nhà tuyển dụng có cơ sở ra quyết định thay vì tiếp nhận kết quả dưới dạng không thể diễn giải.

**6. Nhận đề xuất ứng viên chủ động từ hệ thống**

Ngoài việc chủ động tìm kiếm, nhà tuyển dụng còn nhận được thông báo khi có ứng viên phù hợp với tin tuyển dụng đang mở, do hệ thống tự động phát hiện sau khi ứng viên hoàn thành bài test (chi tiết tại mục "Đề xuất công ty phù hợp" bên dưới). Thông tin liên hệ của ứng viên trong trường hợp này thuộc phạm vi tính năng có thu phí.

---

### Dành cho Ứng viên

**7. Thực hiện bài test đánh giá năng lực**

Ứng viên thực hiện bài test do AI sinh tự động, trả lời dưới dạng văn bản hoặc giọng nói (chuyển đổi sang văn bản, có thể chỉnh sửa trước khi nộp). Kết quả được chấm điểm theo rubric cấu hình sẵn và tích lũy vào hồ sơ năng lực (Skill Passport).

**8. Đề xuất công ty tuyển dụng phù hợp (Auto Job Matching)**

Ngay sau khi ứng viên hoàn thành bài test, hệ thống tự động đối chiếu kết quả năng lực vừa đạt được với toàn bộ tin tuyển dụng đang mở trên nền tảng, từ đó:

- Hiển thị cho ứng viên danh sách các công ty/vị trí đang tuyển dụng phù hợp với năng lực vừa được đánh giá, không yêu cầu ứng viên phải chủ động tìm kiếm.
- Gửi thông báo đến nhà tuyển dụng tương ứng với nội dung: có ứng viên (hiển thị dưới dạng ẩn danh, ví dụ "Ứng viên #A047") đạt mức độ phù hợp cao với tin tuyển dụng đang đăng, kèm điểm phù hợp và giải thích căn cứ.

Cơ chế này vận hành như một lớp gợi ý hai chiều, bổ sung song song với luồng tìm kiếm chủ động thông thường (ứng viên tìm việc, nhà tuyển dụng tìm ứng viên): ứng viên không cần chủ động tìm việc mọi lúc, và nhà tuyển dụng không bỏ lỡ ứng viên tiềm năng chưa từng nộp đơn vào vị trí của họ.

**9. Hồ sơ năng lực tích lũy (Skill Passport)**

Kết quả các lần đánh giá của ứng viên được lưu trữ và tích lũy theo từng kỹ năng, có thể tái sử dụng cho nhiều lượt ứng tuyển hoặc nhiều lượt được đề xuất khác nhau mà không cần thực hiện lại đánh giá từ đầu.

**10. Xác thực danh tính điện tử (eKYC)**

Ứng viên xác thực danh tính qua căn cước công dân kết hợp công nghệ phát hiện sự sống (liveness detection), đảm bảo nguyên tắc một danh tính tương ứng một tài khoản.

---

## Cơ chế thu phí: Mở khóa thông tin ứng viên (Unlock Candidate)

Đây là nguồn doanh thu chính của nền tảng, áp dụng thống nhất cho cả hai luồng: nhà tuyển dụng chủ động xem Top N ứng viên, và nhà tuyển dụng nhận được đề xuất ứng viên phù hợp từ hệ thống.

**Nguyên tắc phân định miễn phí/thu phí:**

| Nội dung | Chi phí |
|---|---|
| Xem điểm số, xếp hạng, giải thích căn cứ phù hợp (dưới dạng ẩn danh) | Miễn phí |
| Nhận thông báo có ứng viên phù hợp với tin tuyển dụng | Miễn phí |
| Xem thông tin liên hệ đầy đủ (số điện thoại, email, họ tên) | Thu phí (Credit) |

**Cơ chế Credit:**

- Nhà tuyển dụng mua gói tín dụng (Credit) bằng tiền thật qua cổng thanh toán.
- Mỗi lượt mở khóa thông tin liên hệ của một ứng viên cụ thể tiêu tốn 1 Credit.
- Việc mở khóa được ghi nhận vĩnh viễn theo cặp (Nhà tuyển dụng, Ứng viên) — không phát sinh chi phí cho các lần xem lại tiếp theo đối với cùng ứng viên đã mở khóa.
- Ứng viên nhận được thông báo khi thông tin liên hệ của mình được một nhà tuyển dụng mở khóa, nhằm tăng tính minh bạch.

---

## Đối tượng người dùng

| Vai trò | Mô tả |
|---|---|
| Ứng viên (Candidate) | Thực hiện bài test hoặc nộp CV, nhận đề xuất công ty phù hợp, quản lý hồ sơ năng lực |
| Nhà tuyển dụng (Recruiter) | Đăng tin tuyển dụng, cấu hình hình thức sàng lọc, chỉ định số lượng ứng viên cần, nhận đề xuất ứng viên phù hợp, mở khóa thông tin liên hệ |
| Quản trị viên (Admin) | Giám sát vận hành hệ thống, xử lý khiếu nại, xác thực thông tin doanh nghiệp |

---

## Quy trình nghiệp vụ tổng quát

### Luồng 1: Nhà tuyển dụng chủ động tìm ứng viên

```
Nhà tuyển dụng đăng tin tuyển dụng
        ↓
Chọn hình thức sàng lọc: Test hoặc CV
        ↓
Khai báo số lượng ứng viên mong muốn (N)
        ↓
┌─────────────────────┬─────────────────────┐
│   Hình thức Test     │    Hình thức CV      │
│ AI trích xuất kỹ năng│ Ứng viên nộp CV      │
│ → sinh bộ câu hỏi    │ → AI parse nội dung  │
│ → ứng viên làm bài   │ → chấm điểm phù hợp  │
│ → AI chấm điểm       │   với yêu cầu        │
└─────────────────────┴─────────────────────┘
        ↓
Hệ thống sàng lọc và xếp hạng ứng viên
        ↓
Trả về Top N ứng viên phù hợp nhất kèm giải thích căn cứ
        ↓
Nhà tuyển dụng trả Credit để mở khóa thông tin liên hệ
```

### Luồng 2: Hệ thống chủ động đề xuất (Auto Matching)

```
Ứng viên hoàn thành bài test đánh giá năng lực
        ↓
Kết quả được cộng vào Skill Passport
        ↓
Hệ thống đối chiếu năng lực với toàn bộ tin tuyển dụng đang mở
        ↓
┌─────────────────────────┬─────────────────────────┐
│   Phía Ứng viên          │   Phía Nhà tuyển dụng    │
│ Hiển thị danh sách công  │ Nhận thông báo: có ứng   │
│ ty/vị trí phù hợp,       │ viên phù hợp với tin     │
│ không cần tìm kiếm       │ tuyển dụng, kèm điểm     │
│                          │ phù hợp và giải thích    │
└─────────────────────────┴─────────────────────────┘
        ↓
Nhà tuyển dụng trả Credit để mở khóa thông tin liên hệ ứng viên
```
