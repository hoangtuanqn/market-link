# REQUIREMENTS — MarketLink · nguồn sự thật duy nhất về scope

Chủ sở hữu: **QA/DOC**. Không AI nào được làm tính năng không có trong bảng này (CLAUDE.md R-07).
AI **không được tự tick DONE** — báo "đủ 7 điều kiện", QA/DOC tick.

Nhãn: **MUST** = đề ghi rõ · **SHOULD** = đề gợi ý hoặc ghi optional nhưng nằm trong mục 1.6 · **NICE** = đội tự thêm.
Trạng thái: `TODO` → `WIP` → `STAGING` → `DONE`.

Vai: `LEAD` · `BE1` (auth, RBAC, **vòng đời đơn hàng**) · `BE2` (sản phẩm, chợ, tồn kho, báo cáo, seed)
· `FE1` (design system, trang public, bản đồ, dashboard Customer) · `FE2` (dashboard Farmer + Admin, form) · `QA`

---

## A · Xác thực và phân quyền

| ID | Requirement | Nhãn | Vai | Owner | TT |
|---|---|---|---|---|---|
| FR-001 | Customer đăng ký: name, contact number, email, **address** — validation client + server | MUST | Guest | BE1/FE2 | TODO |
| FR-002 | Farmer đăng ký: stall name, contact person, contact number, email, address | MUST | Guest | BE1/FE2 | TODO |
| FR-003 | Đăng nhập, session an toàn, mật khẩu hash | MUST | All | BE1 | TODO |
| FR-004 | Admin login vào dashboard **tách riêng** khỏi view Customer/Farmer | MUST | Admin | BE1/FE2 | TODO |
| FR-005 | RBAC: mỗi role chỉ truy cập được chức năng của mình; gọi API sai quyền trả 403 | MUST | All | BE1 | TODO |
| FR-006 | Đăng xuất | MUST | All | BE1 | TODO |
| FR-007 | Quên mật khẩu / đặt lại qua token link | SHOULD | All | BE1 | TODO |

## B · Chợ, Farmer, bản đồ

| ID | Requirement | Nhãn | Vai | Owner | TT |
|---|---|---|---|---|---|
| FR-010 | Browse chợ theo **location và day**, xem danh sách Farmer tại mỗi chợ | MUST | Customer | BE2/FE1 | TODO |
| FR-011 | Xem profile Farmer: stall name, location, operating days, tồn kho tuần hiện tại | MUST | Customer | BE2/FE1 | TODO |
| FR-012 | **Bản đồ nhúng** (Leaflet+OSM) hiện marker chợ và stall Farmer | MUST | Customer | FE1 | TODO |
| FR-013 | **Chỉ đường** tới điểm pickup đã chọn | MUST | Customer | FE1 | TODO |
| FR-014 | Lưu chợ ưa thích, hiện thông tin pickup thuận đường | SHOULD | Customer | BE2/FE1 | TODO |

## C · Sản phẩm, tìm kiếm, lọc

| ID | Requirement | Nhãn | Vai | Owner | TT |
|---|---|---|---|---|---|
| FR-020 | Browse product theo category (rau, trái cây, sữa, đồ nướng…) | MUST | Customer | BE2/FE1 | TODO |
| FR-021 | Filter theo price, category, market, day | MUST | Customer | BE2/FE1 | TODO |
| FR-022 | Chi tiết sản phẩm: price, unit, quantity available, Farmer | MUST | Customer | BE2/FE1 | TODO |
| FR-023 | Search + sort toàn hệ thống (market, Farmer, product), **kết quả có dạng bản đồ** | MUST | All | BE2/FE1 | TODO |

## D · Đặt trước và vòng đời đơn hàng ⭐ đường găng

| ID | Requirement | Nhãn | Vai | Owner | TT |
|---|---|---|---|---|---|
| FR-030 | Giỏ hàng: thêm/sửa/xoá item, **tách thành nhiều đơn theo Farmer** (D-01) | MUST | Customer | BE1/FE1 | TODO |
| FR-031 | Đặt pre-order **trừ vào tồn kho khả dụng** của Farmer (D-02) | MUST | Customer | BE1 | TODO |
| FR-032 | Chọn **pickup date + time slot** trong khung giờ Farmer, slot đầy thì khoá (D-06) | MUST | Customer | BE1/FE1 | TODO |
| FR-033 | Xem order status: placed / accepted / ready / completed (+declined, cancelled) | MUST | Customer | BE1/FE1 | TODO |
| FR-034 | **Huỷ đơn trước cutoff**, hoàn lại tồn kho (D-05) | MUST | Customer | BE1 | TODO |
| FR-035 | **Sửa đơn trước cutoff** → quay về `placed`, Farmer duyệt lại (D-07) | MUST | Customer | BE1 | TODO |
| FR-036 | Danh sách đơn của tôi, xem chi tiết đơn | MUST | Customer | BE1/FE1 | TODO |
| FR-037 | Lịch sử đơn + **đặt lại nhanh** sản phẩm đã mua | MUST | Customer | BE1/FE1 | TODO |
| FR-038 | Ghi `order_status_history` mọi lần đổi trạng thái | MUST | System | BE1 | TODO |
| FR-039 | Job tự chuyển `ready` → `completed` sau pickup_date + 24h (D-03) | SHOULD | System | BE1 | TODO |

## E · Yêu thích và thông báo

| ID | Requirement | Nhãn | Vai | Owner | TT |
|---|---|---|---|---|---|
| FR-040 | Đánh dấu favorite Farmer và product, truy cập nhanh | MUST | Customer | BE2/FE1 | TODO |
| FR-041 | **Restock alert**: product yêu thích có hàng lại thì báo | MUST | Customer | BE2 | TODO |
| FR-042 | Thông báo in-app khi đơn accepted / declined / ready (D-11) | MUST | Customer | BE1/FE1 | TODO |
| FR-043 | Gửi email thật cho order confirmation và ready-for-pickup | NICE | Customer | BE1 | TODO |

## F · Đánh giá

| ID | Requirement | Nhãn | Vai | Owner | TT |
|---|---|---|---|---|---|
| FR-050 | Review + rating **Farmer** sau khi đơn `completed` (D-10) | MUST | Customer | BE2/FE1 | TODO |
| FR-051 | Review + rating **sản phẩm** sau khi đơn `completed` | MUST | Customer | BE2/FE1 | TODO |
| FR-052 | Xem review của khách khác trước khi đặt | MUST | All | BE2/FE1 | TODO |
| FR-053 | Farmer **phản hồi** review | MUST | Farmer | BE2/FE2 | TODO |

## G · Farmer

| ID | Requirement | Nhãn | Vai | Owner | TT |
|---|---|---|---|---|---|
| FR-060 | Hồ sơ Farmer: chọn **các chợ** mình bán, operating days | MUST | Farmer | BE2/FE2 | TODO |
| FR-061 | Khai **pickup time windows** và toạ độ stall (map pin, lat/long) | MUST | Farmer | BE2/FE2 | TODO |
| FR-062 | CRUD sản phẩm: name, category, price, unit, quantity, description, **image** | MUST | Farmer | BE2/FE2 | TODO |
| FR-063 | **Template tồn kho tuần** lặp lại, áp dụng và điều chỉnh | MUST | Farmer | BE2/FE2 | TODO |
| FR-064 | Đánh dấu sản phẩm **sold out / tạm ngưng** | MUST | Farmer | BE2/FE2 | TODO |
| FR-065 | Xem pre-order đến, **accept / decline** | MUST | Farmer | BE1/FE2 | TODO |
| FR-066 | Đánh dấu đơn **ready for pickup** và **completed** | MUST | Farmer | BE1/FE2 | TODO |
| FR-067 | Đặt **order cutoff time** và quản slot pickup | MUST | Farmer | BE1/FE2 | TODO |
| FR-068 | Dashboard Farmer: **Total Orders, Pending Orders, Revenue Summary** | MUST | Farmer | BE2/FE2 | TODO |
| FR-069 | Lịch sử bán + **best-selling products** | MUST | Farmer | BE2/FE2 | TODO |

## H · Admin

| ID | Requirement | Nhãn | Vai | Owner | TT |
|---|---|---|---|---|---|
| FR-070 | Dashboard admin: total Farmers, customers, markets, orders | MUST | Admin | BE2/FE2 | TODO |
| FR-071 | **Duyệt / từ chối / đình chỉ** đăng ký Farmer trước khi được list hàng (D-09) | MUST | Admin | BE1/FE2 | TODO |
| FR-072 | Xem, kích hoạt, vô hiệu hoá tài khoản Customer | MUST | Admin | BE1/FE2 | TODO |
| FR-073 | CRUD chợ: name, address, operating days, timings, **toạ độ bản đồ** | MUST | Admin | BE2/FE2 | TODO |
| FR-074 | Kiểm duyệt: ẩn product listing hoặc review vi phạm | MUST | Admin | BE2/FE2 | TODO |
| FR-075 | Báo cáo nền tảng: total orders, revenue theo chợ, Farmer hoạt động nhiều nhất | MUST | Admin | BE2/FE2 | TODO |
| FR-076 | Master data: quản product categories | MUST | Admin | BE2/FE2 | TODO |
| FR-077 | Publish thông báo toàn nền tảng | MUST | Admin | BE2/FE2 | TODO |

## I · Chung, UI, nội dung

| ID | Requirement | Nhãn | Vai | Owner | TT |
|---|---|---|---|---|---|
| FR-080 | Responsive 375 / 768 / 1440 px, không tràn ngang | MUST | All | FE1 | TODO |
| FR-081 | Form feedback có phân loại bug / suggestion / query | MUST | All | BE2/FE1 | TODO |
| FR-082 | Trang About Us | MUST | All | FE1 | TODO |
| FR-083 | Trang Contact Us **có bản đồ vị trí** | MUST | All | FE1 | TODO |
| FR-084 | 4 trạng thái UI mọi màn dữ liệu: loading / empty / error / có data | MUST | All | FE1/FE2 | TODO |
| FR-085 | Sitemap trên trang chủ (đề MarketLink **không** bắt buộc, vẫn làm vì rẻ) | NICE | All | FE1 | TODO |

## J · AI (đề ghi Optional — xem CLAUDE.md, coi là SHOULD)

| ID | Requirement | Nhãn | Vai | Owner | TT |
|---|---|---|---|---|---|
| FR-090 | Chatbot giúp tìm sản phẩm **xuyên các chợ và Farmer** | SHOULD | Customer | BE2 | TODO |
| FR-091 | Chatbot trả lời FAQ: giờ chợ, Farmer có mặt, pickup window, chi tiết sản phẩm | SHOULD | Customer | BE2 | TODO |
| FR-092 | Lưu `chat_messages` kèm **intent đã nhận diện** (để giải thích với giám khảo) | SHOULD | System | BE2 | TODO |

> Cách làm FR-090/091 an toàn: phân loại **intent** rồi map sang **câu SQL có sẵn với tham số**.
> Tuyệt đối không để LLM sinh SQL tự do. Giải thích được và không có rủi ro injection.

## K · Dữ liệu mẫu — rủi ro số 1 của đề này

| ID | Requirement | Nhãn | Vai | Owner | TT |
|---|---|---|---|---|---|
| FR-100 | Script seed **nhất quán quan hệ**: 4 chợ toạ độ thật TP.HCM, 10 Farmer, 50+ sản phẩm | MUST | System | BE2 | TODO |
| FR-101 | Seed đơn hàng rải **đủ 6 trạng thái**, có đơn `completed` để review mở khoá được | MUST | System | BE2 | TODO |
| FR-102 | Seed 1 tài khoản mỗi role, khớp bảng credentials trong tài liệu nộp bài | MUST | System | BE2 | TODO |

---

## Đếm scope

```
MUST:   58 tổng · ___ DONE   → cần 40% ở H38 · 80% ở H60 · 100% ở H84
SHOULD:  6 tổng · ___ DONE
NICE:    3 tổng · ___ DONE   → cắt đầu tiên khi trượt gate
```

**Không nằm trong scope** (đề miễn trừ, ghi vào ReadMe): cổng thanh toán · giao hàng/logistics
· xác thực danh tính hoặc chứng nhận organic của Farmer · multi-profile trong một tài khoản (D-08).
