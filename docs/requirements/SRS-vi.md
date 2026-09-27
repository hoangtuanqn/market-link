**MarketLink: Nông sản tươi chỉ cách bạn một cú click**
Tài liệu Đặc tả Yêu cầu Phần mềm (SRS), Phiên bản 1.0
Tên dự án: MarketLink | Chủ đề: eGreen Basket | Hạng mục: End-to-End Web Solutions (cuộc thi TechWiz 7, Aptech)

## 1.1 Bối cảnh và sự cần thiết của ứng dụng Web

Chợ nông sản địa phương (farmers market) ngày càng được ưa chuộng vì người mua tìm kiếm nông sản tươi, theo mùa và được trồng tại địa phương. Tuy nhiên, khách hàng hiếm khi biết trước Farmer nào sẽ có mặt tại chợ vào một ngày cụ thể, họ có hàng gì và giá bao nhiêu.

Thông tin về hàng hóa thường được truyền đạt không chính thức qua bảng phấn, tờ rơi in hoặc truyền miệng. Vì vậy khách hàng thường đến nơi thì mặt hàng phổ biến đã bán hết, hoặc đi một chuyến chỉ để phát hiện Farmer nghỉ bán tuần đó.

Ngược lại, Farmer không có cách dễ dàng để công bố lượng hàng hằng tuần, nhận đặt hàng trước (pre-order) trước ngày họp chợ, hay xây dựng mối quan hệ lâu dài với khách quen. Cần có một ứng dụng Web full-stack để kết nối Farmer và khách hàng trên cùng một nền tảng. Qua nền tảng này, Farmer có thể công bố lượng hàng hằng tuần, giá cả và quản lý các pre-order đến.

Ngoài ra, khách hàng có thể tìm các chợ gần mình, xem vị trí chợ và Farmer qua bản đồ tích hợp bằng Google Maps API hoặc OpenStreetMap, duyệt các mặt hàng hiện có, giữ hàng để đến lấy (pickup) và để lại phản hồi. Việc tập trung thông tin giúp giảm các chuyến đi vô ích, giúp Farmer lên kế hoạch thu hoạch và dự trữ hàng tốt hơn, đồng thời gắn kết người sản xuất địa phương với cộng đồng.

## 1.2 Giải pháp đề xuất

Ứng dụng Web full-stack có tên "MarketLink" hướng tới một nền tảng hợp nhất kết nối Farmer tại chợ nông sản địa phương với khách hàng. Farmer có thể đăng ký, niêm yết hàng hóa và giá hằng tuần, quản lý các pre-order khách đặt để nhận tại chợ, và cung cấp vị trí gian hàng hoặc điểm nhận hàng chính xác, hiển thị qua Google Maps API hoặc OpenStreetMap.

Một số thao tác khách hàng có thể thực hiện:

- Duyệt các chợ và Farmer gần mình
- Tìm kiếm và lọc sản phẩm hiện có
- Dùng Google Maps API hoặc OpenStreetMap để định vị chợ và Farmer gần đó, xem chỉ đường và xác định điểm nhận hàng
- Đặt pre-order để đến lấy
- Theo dõi lịch sử đơn hàng
- Lưu Farmer và sản phẩm yêu thích
- Để lại đánh giá và xếp hạng

Nền tảng duy trì cơ sở dữ liệu về hàng tồn của Farmer, lịch sử đơn hàng của khách và danh sách yêu thích để giúp khách nhanh chóng tìm được hàng. Kèm theo đó là một tính năng AI cơ bản (tùy chọn), giúp khách nhận câu trả lời cho các câu hỏi thường gặp như giờ họp chợ, tình trạng có mặt của Farmer và thông tin sản phẩm. Bằng việc kết hợp quản lý tồn kho, pre-order và trợ lý AI cơ bản (tùy chọn) trong một hệ thống, MarketLink giúp việc mua sắm tại chợ nông sản trở nên thuận tiện, dễ dự đoán và mang tính cá nhân hơn.

## 1.3 Mục đích của tài liệu

Tài liệu này mô tả thiết kế, kỳ vọng chức năng, tiêu chí phi chức năng và hướng dẫn triển khai cho ứng dụng Web "MarketLink". Nó là điểm tham chiếu cho developer, tester, project manager và các bên liên quan tham gia xây dựng và đánh giá hệ thống.

## 1.4 Phạm vi dự án

Dự án bao gồm việc phát triển một ứng dụng Web full-stack toàn diện kết nối Farmer tại chợ nông sản với khách hàng. Ứng dụng cho phép Farmer đăng ký gian hàng, niêm yết hàng và giá hằng tuần, quản lý pre-order, và đánh dấu vị trí gian hàng hoặc điểm nhận hàng bằng Google Maps API hoặc OpenStreetMap.

Khách hàng có thể tạo tài khoản, duyệt chợ và Farmer, tìm kiếm và lọc sản phẩm, xem vị trí chợ và Farmer trên bản đồ, đặt hoặc hủy pre-order, lưu Farmer/sản phẩm yêu thích, và để lại đánh giá, xếp hạng.

Nền tảng duy trì cơ sở dữ liệu về hàng tồn của Farmer, lịch sử đơn hàng và danh sách yêu thích. Hệ thống hỗ trợ đăng ký bảo mật, phân quyền theo vai trò (role-based access) và dashboard tương tác cho cả Farmer lẫn khách hàng. Có thêm một trợ lý AI/chatbot cơ bản (tùy chọn) giúp khách tìm hàng và trả lời câu hỏi thường gặp.

Vai trò Administrator đảm nhận các tác vụ quản trị cấp cao như quản lý người dùng, tạo báo cáo, v.v.

Giải pháp Web phải responsive, trực quan và có khả năng mở rộng (scalable), đảm bảo giao tiếp trơn tru giữa Farmer và khách hàng, hiển thị tồn kho chính xác, và trải nghiệm pre-order, nhận hàng thuận tiện trên một nền tảng duy nhất.

## Sơ đồ kiến trúc MarketLink

MarketLink theo kiến trúc Web đa tầng (multi-tier) tiêu chuẩn: Web browser (client: Chrome, Firefox...) gửi Request tới Web server (xử lý request đến), Web server chuyển tới Application server (chạy logic phía server), Application server gửi Query tới Database (lưu trữ và truy xuất dữ liệu), dữ liệu và Response trả ngược lại theo chiều ngược. Sơ đồ đơn giản: End User ↔ MarketLink Web App ↔ Database.

## Sơ đồ luồng (Flow Diagram)

Sơ đồ mẫu mô tả tương tác giữa các thực thể và ứng dụng. Cả Farmer và Customer đều tương tác với MarketLink Web App trung tâm, vốn dựa trên một database dùng chung.

Luồng: Start → User Login (xác thực) → Role Identification (Admin / Vendor / Customer) → rẽ nhánh:
- Admin: Quản lý người dùng, Kiểm soát truy cập, Giám sát hệ thống, Tạo báo cáo
- Vendor: Quản lý sản phẩm, Xem đơn hàng, Phản hồi đánh giá, Cập nhật hồ sơ
- Customer: Duyệt sản phẩm, Đặt hàng, Theo dõi giao hàng, Gửi đánh giá

→ Data Processing (thao tác Database & API) → Output & Reports (kết quả & phân tích) → End.

## 1.5 Ràng buộc (Constraints)

Việc phát triển MarketLink phải tuân thủ một số ràng buộc để triển khai và vận hành thành công. Về kỹ thuật, ứng dụng phải tương thích với các trình duyệt phổ biến và responsive trên nhiều thiết bị. Có thể gặp các ràng buộc liên quan đến lưu trữ dữ liệu, đồng bộ dữ liệu và quy trình sao lưu. Việc dùng hình ảnh, video có thể chịu ràng buộc về giấy phép và bản quyền. Cần hiểu và tuân thủ để tránh rắc rối pháp lý.

Ứng dụng **không** có chức năng cổng thanh toán; pre-order được thanh toán trực tiếp khi nhận hàng. Logistics giao hàng/courier nằm ngoài phạm vi; ứng dụng chỉ hỗ trợ nhận hàng tại chợ. Việc xác minh danh tính Farmer, giấy phép, hay chứng nhận hữu cơ/an toàn thực phẩm **không** thuộc chức năng của ứng dụng.

## 1.6 Yêu cầu chức năng (Functional Requirements)

Ứng dụng được thiết kế gồm các form/trang với menu thể hiện các hoạt động có thể thực hiện.

### Tính năng cho Customer

**Đăng ký và đăng nhập**
- Khách hàng phải đăng ký, đăng nhập và truy cập dashboard một cách bảo mật.
- Khi đăng ký phải cung cấp họ tên, số điện thoại, email và địa chỉ.
- Khách có thể lưu nhiều Farmer và sản phẩm yêu thích.
- Có thể cho phép chia sẻ tài khoản giữa các thành viên gia đình (tùy chọn).

**Duyệt chợ và Farmer**
- Khách có thể duyệt các chợ gần đó theo vị trí và ngày, và xem danh sách Farmer có mặt tại mỗi chợ.
- Khách có thể xem hồ sơ Farmer gồm tên gian hàng, vị trí, ngày hoạt động và lượng hàng hiện có trong tuần.
- Khách có thể xem chợ và gian hàng Farmer trên bản đồ nhúng dùng Google Maps API hoặc OpenStreetMap, có marker vị trí và chỉ đường tới điểm nhận hàng đã chọn.

**Tìm kiếm, duyệt và lọc sản phẩm**
- Khách có thể duyệt danh mục sản phẩm (rau, trái cây, sữa, bánh nướng, v.v.) với bộ lọc theo giá, danh mục, chợ và ngày.
- Khách có thể xem chi tiết sản phẩm gồm giá, đơn vị tính, số lượng còn và Farmer bán.

**Đặt pre-order để nhận hàng**
- Khách có thể thêm sản phẩm vào giỏ và đặt pre-order dựa trên lượng hàng hiện có của Farmer.
- Khách có thể chọn ngày và khung giờ nhận hàng nằm trong các khung thời gian Farmer cho phép.
- Khách có thể xem trạng thái đơn (placed, accepted, ready for pickup, completed) và hủy hoặc sửa đơn trước thời điểm cutoff của Farmer. Không có chức năng thanh toán; đơn được trả tiền khi nhận hàng.

**Quản lý đơn hàng**
- Khách có thể: Xem đơn, Sửa đơn, Hủy đơn.

**Lịch sử đơn hàng và Yêu thích**
- Khách có thể xem đơn cũ và đặt lại nhanh các món đã mua.
- Khách có thể đánh dấu Farmer và sản phẩm yêu thích để truy cập nhanh và nhận thông báo khi có hàng lại (restock alert).
- Khách có thể lưu các vị trí chợ ưa thích và nhận thông tin nhận hàng kèm lộ trình qua Google Maps API hoặc OpenStreetMap.

**Trợ lý AI (tùy chọn)**
- Chatbot AI giúp khách tìm mặt hàng cụ thể trên các chợ và Farmer.
- Trợ lý trả lời các câu hỏi thường gặp như giờ họp chợ, Farmer có mặt không, khung giờ nhận hàng và thông tin sản phẩm.

**Đánh giá và xếp hạng**
- Khách có thể chấm điểm và review Farmer, từng sản phẩm sau khi đơn hàng hoàn tất.
- Khách có thể xem review của người khác trước khi đặt hàng.

### Tính năng cho Farmer

**Đăng ký và quản lý hồ sơ**
- Khi đăng ký, Farmer phải cung cấp tên gian hàng/doanh nghiệp, người liên hệ, số điện thoại, email và địa chỉ.
- Sau khi đăng nhập, Farmer có thể bổ sung hồ sơ: các chợ mình bán, ngày hoạt động, khung giờ nhận hàng, và thông tin vị trí như địa chỉ, map pin, latitude, longitude để hiển thị qua Google Maps API hoặc OpenStreetMap.

**Quản lý hàng hóa và giá hằng tuần**
- Farmer có thể thêm, sửa, xem, xóa sản phẩm gồm tên, danh mục, giá, đơn vị, số lượng còn, mô tả và hình ảnh.
- Farmer có thể thiết lập template hàng hóa lặp lại hằng tuần và điều chỉnh khi tình trạng hàng thay đổi.
- Farmer có thể đánh dấu mặt hàng là hết hàng (sold out) hoặc tạm ngưng.

**Quản lý pre-order**
- Farmer có thể xem pre-order đến, chấp nhận hoặc từ chối, và đánh dấu đơn đã sẵn sàng để nhận.
- Farmer có thể đặt thời điểm cutoff nhận đơn và quản lý các slot nhận hàng.

**Lịch sử đơn và thống kê**
- Farmer có thể xem doanh số cũ, lịch sử đơn và sản phẩm bán chạy nhất. Đồng thời xem được Tổng đơn, Đơn đang chờ, Tóm tắt doanh thu.

**Phản hồi đánh giá**
- Farmer có thể xem và (tùy chọn) phản hồi review của khách về sản phẩm của mình.

### Tính năng cho Admin

**Đăng nhập và Dashboard**
- Admin đăng nhập bảo mật vào dashboard riêng, tách biệt với giao diện Customer và Farmer.
- Dashboard tóm tắt các chỉ số chính: tổng số Farmer, khách hàng, chợ và đơn hàng.

**Quản lý Farmer và Customer**
- Admin có thể xem, duyệt hoặc đình chỉ đăng ký của Farmer trước khi họ được niêm yết sản phẩm.
- Admin có thể xem, kích hoạt hoặc vô hiệu hóa tài khoản khách hàng khi vi phạm chính sách.

**Quản lý chợ**
- Admin có thể thêm, sửa, xóa chợ nông sản, gồm tên, địa chỉ, ngày hoạt động, giờ giấc và tọa độ bản đồ hoặc link bản đồ nhúng qua Google Maps API hoặc OpenStreetMap.

**Kiểm duyệt nội dung**
- Admin có thể xem và gỡ các listing sản phẩm hoặc review không phù hợp, vi phạm quy định nền tảng.

**Báo cáo và phân tích**
- Admin có thể xem báo cáo toàn nền tảng: tổng đơn, tóm tắt doanh thu theo chợ và các Farmer hoạt động tích cực nhất.

**Cấu hình hệ thống**
- Admin có thể quản lý master data như danh mục sản phẩm và đăng thông báo toàn nền tảng.

### Tính năng khác

- **Role-Based Access Control:** Người dùng chỉ truy cập được tính năng phù hợp với vai trò (Farmer hoặc Customer).
- **Search, Sort, Filter:** Khách có thể tìm chợ, Farmer hoặc sản phẩm theo bộ lọc vị trí, danh mục, giá, ngày họp chợ, với kết quả dạng bản đồ qua Google Maps API hoặc OpenStreetMap ở những nơi cần khám phá theo vị trí.
- **Responsive Design:** Ứng dụng thân thiện với mobile và truy cập được trên nhiều thiết bị.
- **Notifications:** Khách nhận email hoặc thông báo in-app khi đơn được xác nhận và khi đơn sẵn sàng để nhận.
- **Feedback and Ratings:** Người dùng có thể chấm điểm Farmer hoặc sản phẩm và để lại bình luận.
- **About Us:** Hiển thị thông tin về đội ngũ và nền tảng.
- **Contact Us:** Hiển thị thông tin liên hệ tĩnh của đội, kèm Google Maps chỉ vị trí.

### Lưu ý quan trọng về việc dùng AI

Đội thi được khuyến khích dùng công cụ AI (website builder có AI, công cụ thiết kế UI/UX, code assistant, công cụ tạo ảnh) để tăng năng suất và sáng tạo. Tuy nhiên, AI chỉ là công cụ hỗ trợ, không thay thế kỹ năng thiết kế, phát triển và giải quyết vấn đề của chính bạn.

KHÔNG dùng website template dựng sẵn hoàn toàn, vì sẽ ảnh hưởng xấu đến điểm. Thiết kế, cấu trúc và cách triển khai phải phản ánh chủ yếu kỹ năng và hiểu biết của bạn. KHÔNG nộp code hoặc nội dung do AI tạo ra mà không chỉnh sửa và hiểu thấu đáo. Gợi ý từ AI có thể dùng để định hướng, học, debug hoặc tăng năng suất, nhưng sản phẩm cuối phải thể hiện nỗ lực, logic và cách triển khai của bạn.

Phải ghi nhận tất cả công cụ AI đã dùng (ví dụ Copilot, Canva AI, Figma AI, Uizard...) trong tài liệu hoặc bài nộp.

Trong lúc chấm, giám khảo có thể yêu cầu giải thích quyết định thiết kế, cách triển khai và code. Bạn phải hiểu và bảo vệ được mọi khía cạnh của bài nộp.

Tuyệt đối cấm dùng AI để tạo toàn bộ tài liệu dự án.

Tóm lại: AI là trợ lý, không phải developer của bạn.

## 1.7 Yêu cầu phi chức năng (Non-Functional Requirements)

- **An toàn:** Không gây tải xuống mã độc hoặc file không cần thiết.
- **Accessibility:** Font chữ, phần tử giao diện và điều hướng rõ ràng, dễ đọc.
- **Thân thiện:** Dễ điều hướng, menu rõ ràng, dễ hiểu.
- **Operability:** Ổn định và hiệu quả.
- **Performance:** Tốc độ và throughput cao; thời gian tải tối thiểu, chuyển trang mượt ngay cả khi duyệt danh mục sản phẩm lớn.
- **Scalability:** Kiến trúc và hạ tầng chịu được số lượng Farmer, khách hàng và sản phẩm tăng lên, đặc biệt vào ngày họp chợ cao điểm.
- **Security:** Có cơ chế bảo mật phù hợp như xác thực; ví dụ chỉ người dùng đã đăng ký mới truy cập được một số tính năng.
- **Availability:** Hoạt động 24/7 với downtime tối thiểu, để khách có thể duyệt và đặt hàng bất cứ lúc nào trước khi nhận.
- **Compatibility:** Tương thích với trình duyệt mới nhất và nhiều thiết bị.

QUAN TRỌNG: Đây là kỳ vọng tối thiểu. BẮT BUỘC phải triển khai đủ các yêu cầu chức năng và phi chức năng trong SRS. Sau đó có thể sáng tạo thêm tính năng.

## 1.8 Yêu cầu giao diện/môi trường (Interface Requirements)

**Phần cứng:** Intel Core i5/i7 trở lên, RAM 8 GB trở lên, màn hình màu SVGA, ổ cứng 500 GB, chuột, bàn phím.

**Phần mềm:**
- IDE: phù hợp với nền tảng.
- Frontend: HTML5, CSS3, Bootstrap, ReactJS/AngularJS/Angular/TypeScript, JavaScript, jQuery, XML.
- Backend (chọn một): Java SDK với NetBeans hoặc Eclipse, Jakarta EE; HOẶC C# với ASP.NET MVC / ASP.NET Core MVC (tùy chọn), Visual Studio; HOẶC PHP với Laravel; HOẶC Python với Flask hoặc Django; HOẶC MEAN (MongoDB, Express.js, Angular, Node.js); HOẶC MERN (MongoDB, Express.js, React, Node.js).
- Database: MySQL/SQL Server/MongoDB/JSON.
- Local hosting (tùy chọn): XAMPP bản mới nhất.
- Maps và Geolocation: Google Maps API hoặc OpenStreetMap để định vị chợ và Farmer, hiển thị marker, chỉ đường, và lưu latitude/longitude cho điểm nhận hàng chính xác.
- AI Tools: Trợ lý AI/chatbot tùy chọn có thể dùng tawk.to hoặc Zapier.

### Thiết kế Database

Dựa trên đặc tả, bạn tự định nghĩa entity, attribute và quan hệ. Ví dụ:

| Bảng | Các cột gợi ý |
|---|---|
| Users | user_id (PK), username (UNIQUE), password_hash, email (UNIQUE), role, created_at |
| Products | product_id (PK), Farmer_id (FK), name, description, price DECIMAL(10,2), stock_quantity, created_at |
| Orders | order_id (PK), customer_id (FK), product_id (FK), quantity, total_amount, order_status, order_date |
| Reviews | review_id (PK), product_id (FK), customer_id (FK), rating, comment, review_date |
| Reports | report_id (PK), generated_by (FK), report_type, generated_at |
| Markets | market_id (PK), market_name, address, latitude DECIMAL(10,8), longitude DECIMAL(11,8), map_provider |

Lưu ý: Đây chỉ là ví dụ, bạn có thể tự thiết kế cấu trúc bảng theo logic của mình.

## 1.9 Sản phẩm bàn giao (Deliverables)

Nộp sản phẩm kèm báo cáo dự án đầy đủ gồm: Định nghĩa bài toán; Đặc tả thiết kế; Các sơ đồ như Flowchart cho từng hoạt động, Data Flow Diagram...; Thiết kế Database; Test data đã dùng; **Hướng dẫn cài đặt (BẮT BUỘC)**; **Tài khoản đăng nhập kèm mật khẩu cho mọi loại người dùng (BẮT BUỘC)**.

Tài liệu là phần rất quan trọng, phải đầy đủ và toàn diện. Tài liệu **không** được chứa source code.

Toàn bộ dự án nộp dưới dạng file zip, kèm file ReadMe.doc liệt kê các giả định (nếu có) và các file SQL script (.sql) chứa định nghĩa database và bảng.

Khuyến khích host ứng dụng lên một website và gửi URL để chấm.

**Bắt buộc** nộp video (.mp4) demo toàn bộ tính năng trong phần Functional Requirements.

Ngoài đặc tả, bạn có thể sáng tạo thêm để cải thiện hệ thống.

---

# PHẦN 2: PHÂN TÍCH VÀ GIẢI THÍCH

## Bản chất bài toán

Bỏ lớp vỏ "farmers market" ra, đây là một **multi-vendor marketplace dạng reservation (click & collect)**, không có payment và không có delivery. Nghĩa là toàn bộ độ khó kỹ thuật không nằm ở checkout hay tích hợp cổng thanh toán, mà dồn vào ba chỗ: **quản lý tồn kho theo thời gian** (weekly stock), **đặt chỗ theo slot** (pickup window + cutoff), và **truy vấn theo vị trí địa lý**. Đội nào làm chắc ba chỗ này sẽ ăn điểm khi giám khảo hỏi sâu; đội nào chỉ làm CRUD đẹp sẽ lộ khi bị hỏi "hai khách cùng đặt món cuối cùng thì sao?".

## Những lỗi và mâu thuẫn trong chính SRS (cần ghi vào ReadMe dưới dạng Assumptions)

Tài liệu này có vài chỗ không nhất quán. Đề bài yêu cầu liệt kê assumptions, nên đây là cơ hội ghi điểm chứ không phải rủi ro:

1. **Flow diagram ghi "Track Deliveries"** nhưng mục 1.5 nói rõ delivery nằm ngoài phạm vi. Nên hiểu là "Track Order Status" (theo dõi trạng thái pickup).
2. **Flow diagram dùng "Vendor"**, phần còn lại dùng "Farmer". Chúng là một. Chọn một tên thống nhất trong code và tài liệu.
3. **RBAC ghi "Farmer hoặc Customer"** nhưng có Admin riêng. Thực tế có 3 role.
4. **Order status chỉ liệt kê 4 trạng thái** (placed, accepted, ready for pickup, completed), nhưng đề lại yêu cầu Farmer được *decline* và khách được *cancel*. Thiếu ít nhất `declined`, `cancelled`, và nên có `no_show` (khách đặt mà không đến lấy, rất thực tế với mô hình trả tiền khi nhận).
5. **"Revenue Summary" trong khi không có payment.** Doanh thu phải được định nghĩa là tổng `total_amount` của đơn ở trạng thái `completed` (Farmer xác nhận đã giao và thu tiền). Cần nói rõ điều này trong tài liệu, nếu không giám khảo sẽ hỏi revenue lấy từ đâu.

## Database mẫu của đề có lỗi thiết kế, đừng copy

Đây là điểm quan trọng nhất. Bảng `Orders` mẫu có `product_id` và `quantity` ngay trong đơn, tức **một đơn chỉ chứa một sản phẩm**, mâu thuẫn trực tiếp với yêu cầu "thêm sản phẩm vào giỏ" và "reorder". Cách đúng:

- Tách `orders` và `order_items` (order_item lưu `product_id`, `quantity`, **`unit_price` snapshot tại thời điểm đặt**, vì Farmer đổi giá tuần sau không được làm sai lịch sử và báo cáo doanh thu).
- **Giỏ hàng nhiều Farmer phải được split thành nhiều order**, mỗi order thuộc một Farmer, một market, một pickup slot. Vì mỗi Farmer accept/decline độc lập, có cutoff riêng, slot riêng. Nếu gộp chung một order thì state machine vỡ ngay (Farmer A accept, Farmer B decline thì order ở trạng thái gì?). Có thể thêm một `checkout_group_id` để khách thấy chúng đi chung một lần đặt.
- `Products` có `stock_quantity` toàn cục là không đủ cho mô hình "weekly stock". Nên tách **product (catalog, thông tin tĩnh)** và **weekly listing / stock entry (product × market × ngày họp chợ → quantity, price)**. Template hằng tuần là một bảng riêng mà Farmer "apply" để sinh ra listing của tuần mới.
- `Reviews` mẫu chỉ review product, nhưng đề yêu cầu review cả Farmer và chỉ sau khi đơn completed. Nên gắn review với `order_id` (hoặc order_item) để enforce "verified purchase" và chặn review trùng bằng unique constraint. Phản hồi của Farmer là một cột hoặc bảng con.
- Còn thiếu hàng loạt bảng đề yêu cầu ngầm: `farmer_profiles` (tách khỏi users, có `status` pending/approved/suspended), `market_farmer` (quan hệ n-n kèm ngày hoạt động), `pickup_slots` (có capacity), `favorites` (polymorphic Farmer/product), `categories`, `notifications`, `announcements`.

## Ba điểm kỹ thuật "hard" cần giải quyết triệt để

**Overselling / concurrency.** Khi khách đặt, phải giữ hàng ngay tại thời điểm `placed` (không đợi Farmer accept), bằng một câu update nguyên tử kiểu `UPDATE ... SET qty = qty - ? WHERE id = ? AND qty >= ?` rồi kiểm tra affected rows, hoặc `SELECT ... FOR UPDATE` trong transaction. Hoàn trả số lượng khi decline/cancel/no_show. Modify order thì tính delta, không trả hết rồi trừ lại. Đây là câu giám khảo rất hay hỏi, và câu trả lời "em check số lượng ở frontend" là mất điểm.

**Cutoff và pickup slot.** Cutoff là rule phía server, mọi thao tác modify/cancel đều phải kiểm tra lại cutoff ở backend. Slot nên có capacity để tránh 50 khách dồn vào 7h sáng. Chú ý timezone: lưu UTC, hiển thị theo giờ địa phương của chợ.

**Geo search.** "Chợ gần tôi" cần tính khoảng cách. Với quy mô cuộc thi, Haversine formula trong SQL kèm bounding-box prefilter trên lat/lng có index là đủ và dễ giải thích; MySQL 8 có `ST_Distance_Sphere` nếu dùng kiểu POINT, MongoDB có `2dsphere`. Về provider, OpenStreetMap + Leaflet miễn phí, không cần billing account, an toàn hơn cho demo; chỉ đường có thể mở link sang Google Maps với tọa độ đích thay vì tự tích hợp routing API.

## Các yêu cầu dễ bị bỏ sót khi chấm

Restock alert cho favorites (cần trigger khi Farmer cập nhật listing từ 0 lên >0 hoặc publish tuần mới), reorder từ lịch sử (phải kiểm tra lại tồn kho và giá hiện tại, không đặt lại mù quáng), Farmer phải được Admin approve **trước** khi niêm yết (cần chặn ở cả API chứ không chỉ ẩn nút), notification email khi đơn confirmed và ready, trang About Us và Contact Us có bản đồ. Video demo phải chạy qua **tất cả** functional requirements, nên hãy lập checklist từ mục 1.6 và map từng dòng vào một cảnh trong video.

## Về lựa chọn stack với profile của bạn

Đề cho phép **PHP + Laravel** và **MERN**. Với bài toán này, dữ liệu mang tính quan hệ và cần transaction mạnh (order, stock, slot), nên tôi nghiêng về **Laravel + MySQL**, frontend React (qua Inertia hoặc SPA tách riêng gọi API). Laravel cho sẵn auth, policy/gate cho RBAC, queue cho email, scheduler cho restock alert và tự động đánh `no_show`, giúp tiết kiệm thời gian cho phần nghiệp vụ.

Một điểm chưa chắc chắn cần bạn xác nhận với ban tổ chức: danh sách stack trong đề ghi cụ thể "Express.js" và "React", không nhắc NestJS, Next.js hay PostgreSQL. Về mặt kỹ thuật NestJS chạy trên Express và Next.js là React, nhưng tôi không biết cách giám khảo TechWiz diễn giải điều này. Nếu không hỏi được, chọn đúng tên trong danh sách là cách an toàn nhất.

Về AI chatbot: đề gợi ý tawk.to/Zapier, nghĩa là mức kỳ vọng thấp. Nếu muốn nổi bật, bạn có thể làm chatbot trả lời dựa trên dữ liệu thật trong DB (giờ chợ, Farmer có mặt, hàng còn), nhưng hãy nhớ quy định "hiểu và giải thích được mọi dòng code", và ghi nhận đầy đủ công cụ AI đã dùng.
