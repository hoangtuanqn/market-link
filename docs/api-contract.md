# API CONTRACT — MarketLink

Chủ sở hữu: **LEAD**. Chỉ Lead sửa (CLAUDE.md R-02).
BE phải trả đúng file này, FE phải gọi đúng file này. Lệch nhau thì **sửa bên sai, không sửa contract** (R-05).

Base path: `/api` · Auth: header `Authorization: Bearer <token>`
Path `kebab-case`, danh từ số nhiều · JSON field `snake_case` khớp cột DB · Ngày giờ ISO 8601.

## Envelope — một hình dạng duy nhất

```json
// 2xx
{ "success": true, "data": {}, "message": "" }

// lỗi
{ "success": false, "data": null, "message": "Pickup slot is full",
  "errors": { "slot_id": "This slot has reached its maximum orders" } }

// danh sách có phân trang
{ "success": true, "message": "",
  "data": { "items": [], "page": 1, "page_size": 12, "total": 0 } }
```

HTTP: 200 đọc · 201 tạo · 400 validation · 401 chưa đăng nhập · 403 sai quyền · 404 không thấy · 409 xung đột trạng thái (hết hàng, slot đầy, quá cutoff).

---

## 1. Auth — FR-001…007

| Method | Path | Role | Request | data trả về |
|---|---|---|---|---|
| POST | `/api/auth/register/customer` | Guest | `{ full_name, email, phone, address, password }` | `{ user_id }` |
| POST | `/api/auth/register/farmer` | Guest | `{ stall_name, contact_person, email, phone, address, password }` | `{ user_id, approval_status:"pending" }` |
| POST | `/api/auth/login` | Guest | `{ email, password }` | `{ token, user:{ user_id, role, full_name, farmer_id? } }` |
| POST | `/api/auth/logout` | All | — | `null` |
| GET | `/api/auth/me` | All | — | `{ user_id, role, full_name, email, phone, address, farmer_id? }` |
| POST | `/api/auth/forgot-password` | Guest | `{ email }` | `null` |
| POST | `/api/auth/reset-password` | Guest | `{ token, new_password }` | `null` |

> Farmer đăng nhập được ngay nhưng `approval_status != 'approved'` thì mọi endpoint tạo/sửa sản phẩm trả **403** kèm message "Your stall is pending admin approval".

## 2. Markets — FR-010, 012, 073

| Method | Path | Role | Ghi chú |
|---|---|---|---|
| GET | `/api/markets` | Public | query: `q, day, city, district, page, page_size` → `{ market_id, market_name, address, latitude, longitude, opening_time, closing_time, operating_days:[0..6], farmer_count }` |
| GET | `/api/markets/:id` | Public | kèm `farmers[]` đang bán tại chợ |
| GET | `/api/markets/:id/farmers` | Public | query: `day` |
| POST | `/api/markets` | Admin | `{ market_name, address, district, city, latitude, longitude, opening_time, closing_time, operating_days:[] }` |
| PUT | `/api/markets/:id` | Admin | như trên |
| DELETE | `/api/markets/:id` | Admin | xoá mềm bằng `is_active=false` |

## 3. Farmers — FR-011, 060, 061

| Method | Path | Role | Ghi chú |
|---|---|---|---|
| GET | `/api/farmers` | Public | query: `q, market_id, day, page` — chỉ trả `approval_status='approved'` |
| GET | `/api/farmers/:id` | Public | `{ farmer_id, stall_name, description, logo_url, rating_avg, rating_count, markets:[{market_id, market_name, stall_code, operating_days:[{day_of_week, pickup_start_time, pickup_end_time}]}] }` |
| GET | `/api/farmers/:id/products` | Public | tồn kho tuần hiện tại |
| GET | `/api/farmer/profile` | Farmer | hồ sơ của chính mình |
| PUT | `/api/farmer/profile` | Farmer | `{ stall_name, contact_person, description, order_cutoff_hours }` |
| POST | `/api/farmer/markets` | Farmer | `{ market_id, stall_code, stall_latitude, stall_longitude }` |
| DELETE | `/api/farmer/markets/:farmer_market_id` | Farmer | |
| PUT | `/api/farmer/markets/:farmer_market_id/days` | Farmer | `{ days:[{ day_of_week, pickup_start_time, pickup_end_time }] }` |

## 4. Categories & Products — FR-020…023, 062…064, 076

| Method | Path | Role | Ghi chú |
|---|---|---|---|
| GET | `/api/categories` | Public | |
| POST/PUT/DELETE | `/api/categories/:id?` | Admin | master data |
| GET | `/api/products` | Public | query: `q, category_id, market_id, farmer_id, day, min_price, max_price, sort(price_asc\|price_desc\|newest\|rating), page, page_size` |
| GET | `/api/products/:id` | Public | kèm `farmer`, `reviews_summary` |
| POST | `/api/farmer/products` | Farmer | `{ category_id, name, description, price, unit, stock_quantity, image_url }` |
| PUT | `/api/farmer/products/:id` | Farmer | chỉ sản phẩm của chính mình, ngược lại 403 |
| DELETE | `/api/farmer/products/:id` | Farmer | xoá mềm `is_deleted=true` |
| PATCH | `/api/farmer/products/:id/status` | Farmer | `{ status: "available"\|"sold_out"\|"unavailable" }` |

### Template tồn kho tuần — FR-063

| Method | Path | Role |
|---|---|---|
| GET | `/api/farmer/stock-templates` | Farmer |
| PUT | `/api/farmer/stock-templates` | Farmer — `{ items:[{ product_id, day_of_week, default_quantity, default_price }] }` |
| POST | `/api/farmer/stock-templates/apply` | Farmer — `{ target_date }` → nạp tồn kho theo template của thứ tương ứng |

## 5. Slots — FR-032, 067

| Method | Path | Role | Ghi chú |
|---|---|---|---|
| GET | `/api/farmers/:id/slots` | Public | query: `market_id, date` → `{ slot_id, start_time, end_time, max_orders, booked_count, is_full }` |
| POST | `/api/farmer/slots/generate` | Farmer | `{ farmer_market_id, from_date, to_date, slot_minutes, max_orders }` sinh slot từ operating days |
| PATCH | `/api/farmer/slots/:id` | Farmer | `{ max_orders, is_active }` |

## 6. Cart & Orders — FR-030…039, 065…067 ⭐ lõi

Giỏ hàng giữ ở **client** (localStorage). Server chỉ nhận lúc checkout và tự tách theo Farmer (D-01).

| Method | Path | Role | Ghi chú |
|---|---|---|---|
| POST | `/api/orders/preview` | Customer | `{ items:[{product_id, quantity}] }` → trả **các nhóm đơn sẽ được tách** `{ groups:[{ farmer_id, stall_name, market_id, items[], subtotal }] }` |
| POST | `/api/orders` | Customer | `{ groups:[{ farmer_id, market_id, slot_id, pickup_date, items:[{product_id, quantity}], customer_note }] }` → `{ orders:[{ order_id, order_code, status, cutoff_at }] }`. **Trừ tồn kho trong cùng transaction** (D-02). Hết hàng hoặc slot đầy → **409** |
| GET | `/api/orders` | Customer | query: `status, page` — đơn của chính mình |
| GET | `/api/orders/:id` | Customer/Farmer | kèm `items[]`, `status_history[]`, `can_cancel`, `can_modify` |
| PATCH | `/api/orders/:id/cancel` | Customer | 409 nếu quá `cutoff_at`. Hoàn tồn kho |
| PUT | `/api/orders/:id/items` | Customer | `{ items:[{product_id, quantity}] }` — chỉ sửa số lượng / bỏ item, **không thêm mới** (D-07). Đơn về `placed` |
| POST | `/api/orders/:id/reorder` | Customer | tạo giỏ mới từ đơn cũ |
| GET | `/api/farmer/orders` | Farmer | query: `status, date, page` |
| PATCH | `/api/farmer/orders/:id/accept` | Farmer | `placed → accepted` |
| PATCH | `/api/farmer/orders/:id/decline` | Farmer | `placed → declined` + `{ reason }`, hoàn tồn kho |
| PATCH | `/api/farmer/orders/:id/ready` | Farmer | `accepted → ready` |
| PATCH | `/api/farmer/orders/:id/complete` | Farmer | `ready → completed` (D-03) |

> **Mọi endpoint đổi trạng thái phải validate chuyển tiếp hợp lệ theo D-04 và ghi `order_status_history`.** Chuyển sai thứ tự → **409**, không phải 400.

## 7. Reviews — FR-050…053

| Method | Path | Role | Ghi chú |
|---|---|---|---|
| GET | `/api/products/:id/reviews` | Public | |
| GET | `/api/farmers/:id/reviews` | Public | |
| POST | `/api/reviews` | Customer | `{ order_id, target_type:"product"\|"farmer", product_id?, farmer_id?, rating, comment }` — **403 nếu đơn chưa `completed` hoặc không thuộc về mình**, 409 nếu đã review |
| POST | `/api/farmer/reviews/:id/response` | Farmer | `{ response_text }` |
| PATCH | `/api/admin/reviews/:id/hide` | Admin | kiểm duyệt |

## 8. Favorites & Notifications — FR-040…042

| Method | Path | Role |
|---|---|---|
| GET | `/api/favorites` | Customer — query `target_type` |
| POST | `/api/favorites` | Customer — `{ target_type, farmer_id? , product_id?, market_id? }` |
| DELETE | `/api/favorites/:id` | Customer |
| GET | `/api/notifications` | All — query `is_read, page` |
| PATCH | `/api/notifications/:id/read` | All |
| PATCH | `/api/notifications/read-all` | All |

## 9. Admin — FR-070…077

| Method | Path | Ghi chú |
|---|---|---|
| GET | `/api/admin/dashboard` | `{ total_farmers, total_customers, total_markets, total_orders, revenue_total, pending_farmers }` |
| GET | `/api/admin/farmers` | query `approval_status` |
| PATCH | `/api/admin/farmers/:id/approve` | |
| PATCH | `/api/admin/farmers/:id/reject` | `{ reason }` |
| PATCH | `/api/admin/farmers/:id/suspend` | D-09: ẩn sản phẩm, đơn đang chạy vẫn chạy |
| GET | `/api/admin/customers` | |
| PATCH | `/api/admin/customers/:id/status` | `{ status: "active"\|"inactive" }` |
| PATCH | `/api/admin/products/:id/hide` | kiểm duyệt listing |
| GET | `/api/admin/reports/orders` | query `from, to, market_id` |
| GET | `/api/admin/reports/revenue` | doanh thu theo chợ |
| GET | `/api/admin/reports/top-farmers` | |
| GET/POST/PUT/DELETE | `/api/admin/announcements` | |

## 10. Feedback & Chatbot — FR-081, 090…092

| Method | Path | Role | Ghi chú |
|---|---|---|---|
| POST | `/api/feedbacks` | Public | `{ type:"bug"\|"suggestion"\|"query", message }` |
| GET | `/api/admin/feedbacks` | Admin | |
| POST | `/api/chat` | Public | `{ session_key, message }` → `{ reply, intent, results?[] }` — intent → SQL có tham số, **không sinh SQL tự do** |
| GET | `/api/chat/history` | Public | query `session_key` |

---

**Quy tắc bổ sung:** mọi endpoint có `:id` phải kiểm tra quyền sở hữu trước khi trả dữ liệu — Farmer chỉ thấy đơn của mình, Customer chỉ thấy đơn của mình. Giám khảo sẽ test bằng cách đổi id trên URL.
