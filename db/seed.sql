-- MarketLink — dữ liệu demo (FR-100, FR-101, FR-102).
-- KHÔNG phải migration: Flyway chạy ở mọi môi trường, seed demo thì không.
-- Chạy: make seed. Chạy lại được nhiều lần — mọi INSERT đều idempotent theo khoá tự nhiên
-- (categories.slug, markets.market_name, …). Mỗi cụm của plan core-commerce nối thêm khối
-- của mình vào cuối file này, không tạo file riêng.
-- Toạ độ là toạ độ thật của 4 chợ ở TP. Hồ Chí Minh.

SET NAMES utf8mb4;

-- ---- Danh mục (FR-076) ----
-- Tám danh mục đã thống nhất (PR #137, frontend/src/data/catalog.ts): tên và slug giữ đúng như đó.
INSERT INTO categories (name, slug, icon, sort_order, is_active) VALUES
  ('Vegetables',            'vegetables',            'leaf',    1, TRUE),
  ('Fruits',                'fruits',                'apple',   2, TRUE),
  ('Eggs & dairy',          'eggs_and_dairy',        'egg',     3, TRUE),
  ('Grains, beans & nuts',  'grains_beans_and_nuts', 'wheat',   4, TRUE),
  ('Meat & poultry',        'meat_and_poultry',      'drumstick', 5, TRUE),
  ('Seafood',               'seafood',               'fish',    6, TRUE),
  ('Mushrooms',             'mushrooms',             'mushroom', 7, TRUE),
  ('Baked goods',           'baked_goods',           'bread',   8, TRUE)
AS new
ON DUPLICATE KEY UPDATE sort_order = new.sort_order, is_active = new.is_active, icon = new.icon;

-- ---- Chợ (FR-073, FR-012) ----
INSERT INTO markets (market_name, address, district, city, latitude, longitude,
                     opening_time, closing_time, map_provider, is_active) VALUES
  ('Chợ Bà Chiểu',  'Bạch Đằng, Phường 1, Bình Thạnh',       'Bình Thạnh',  'TP. Hồ Chí Minh',
   10.80290000, 106.69920000, '05:00:00', '18:00:00', 'osm', TRUE),
  ('Chợ Thảo Điền', '10 Quốc Hương, Thảo Điền, TP. Thủ Đức', 'TP. Thủ Đức', 'TP. Hồ Chí Minh',
   10.80640000, 106.73380000, '06:00:00', '20:00:00', 'osm', TRUE),
  ('Chợ Bến Thành', 'Lê Lợi, Bến Thành, Quận 1',             'Quận 1',      'TP. Hồ Chí Minh',
   10.77250000, 106.69800000, '06:00:00', '19:00:00', 'osm', TRUE),
  ('Chợ Tân Định',  '336 Hai Bà Trưng, Tân Định, Quận 1',    'Quận 1',      'TP. Hồ Chí Minh',
   10.79050000, 106.69080000, '05:30:00', '18:30:00', 'osm', TRUE)
AS new
ON DUPLICATE KEY UPDATE address = new.address, district = new.district,
                        latitude = new.latitude, longitude = new.longitude,
                        opening_time = new.opening_time, closing_time = new.closing_time,
                        is_active = new.is_active;

-- Ngày họp: Bà Chiểu và Tân Định họp cả tuần; Thảo Điền cuối tuần; Bến Thành T2–T7.
-- Bảng chỉ có khoá (market_id, day_of_week) nên INSERT IGNORE là đủ để chạy lại.
INSERT IGNORE INTO market_operating_days (market_id, day_of_week)
SELECT m.id, d.day
FROM markets m
JOIN (SELECT 0 AS day UNION SELECT 1 UNION SELECT 2 UNION SELECT 3
      UNION SELECT 4 UNION SELECT 5 UNION SELECT 6) d
WHERE (m.market_name IN ('Chợ Bà Chiểu', 'Chợ Tân Định'))
   OR (m.market_name = 'Chợ Thảo Điền' AND d.day IN (0, 6))
   OR (m.market_name = 'Chợ Bến Thành' AND d.day BETWEEN 1 AND 6);

-- ---- Tài khoản demo (FR-102) ----
-- Mật khẩu của MỌI tài khoản demo: Demo@1234 (xem docs/DEMO_CREDENTIALS.md). @pw là hash BCrypt của nó,
-- sinh bằng `htpasswd -bnBC 10 "" 'Demo@1234'`. admin@marketlink.vn do AdminSeeder tạo lúc backend khởi
-- động; seed ghi đè mật khẩu để khớp tài liệu nộp bài.
SET @pw := '$2y$10$QECyiDw14FWH42GLLZE9l.wmNFH4v8ZHLz.UORUBYw3xGS4iDsTtW';

INSERT INTO users (email, password_hash, role, full_name, phone, address, status) VALUES
  ('admin@marketlink.vn',    @pw, 'admin',    'Trần Quản Trị', '0900000001', 'Quận 1, TP. Hồ Chí Minh', 'active'),
  ('customer@marketlink.vn', @pw, 'customer', 'Nguyễn Văn An', '0900000002', '12 Lê Lợi, Quận 1',       'active'),
  ('farmer@marketlink.vn', @pw, 'farmer', 'Lê Thị Út Hiền', '0900000003', 'TP. Hồ Chí Minh', 'active'),
  ('farmer2@marketlink.vn', @pw, 'farmer', 'Nguyễn Văn Ba', '0900000004', 'TP. Hồ Chí Minh', 'active'),
  ('farmer3@marketlink.vn', @pw, 'farmer', 'Trần Thị Mai', '0900000005', 'TP. Hồ Chí Minh', 'active'),
  ('farmer4@marketlink.vn', @pw, 'farmer', 'Phạm Hữu Đức', '0900000006', 'TP. Hồ Chí Minh', 'active'),
  ('farmer5@marketlink.vn', @pw, 'farmer', 'Võ Thị Lan', '0900000007', 'TP. Hồ Chí Minh', 'active'),
  ('farmer6@marketlink.vn', @pw, 'farmer', 'Hoàng Minh Tuấn', '0900000008', 'TP. Hồ Chí Minh', 'active'),
  ('farmer7@marketlink.vn', @pw, 'farmer', 'Đặng Thị Hoa', '0900000009', 'TP. Hồ Chí Minh', 'active'),
  ('farmer8@marketlink.vn', @pw, 'farmer', 'Bùi Quốc Khánh', '0900000010', 'TP. Hồ Chí Minh', 'active'),
  ('farmer9@marketlink.vn', @pw, 'farmer', 'Lý Thu Thảo', '0900000011', 'TP. Hồ Chí Minh', 'active'),
  ('farmer10@marketlink.vn', @pw, 'farmer', 'Ngô Đình Phúc', '0900000012', 'TP. Hồ Chí Minh', 'active')
AS new
ON DUPLICATE KEY UPDATE password_hash = new.password_hash, full_name = new.full_name,
                        phone = new.phone, role = new.role, status = new.status;


-- ---- Hồ sơ gian hàng (FR-060): 10 Farmer, tất cả đã duyệt để bán được ngay (D-09) ----
INSERT INTO farmer_profiles (user_id, stall_name, contact_person, description, order_cutoff_hours,
                             approval_status, approved_at)
SELECT u.id, s.stall_name, u.full_name, s.description, s.cutoff, 'approved', NOW()
FROM users u
JOIN (
      SELECT 'farmer@marketlink.vn' AS email, 'Vườn Út Hiền' AS stall_name, 'Rau ăn lá cắt lúc 4 giờ sáng, giao tận quầy trước 7 giờ.' AS description, 12 AS cutoff
      UNION ALL SELECT 'farmer2@marketlink.vn', 'Trái cây Ba Tơ', 'Bưởi da xanh, cam sành và xoài cát Hoà Lộc từ vườn nhà ở Bến Tre.', 24
      UNION ALL SELECT 'farmer3@marketlink.vn', 'Sữa bò Mai Long Thành', 'Sữa tươi thanh trùng và sữa chua nhà làm, giao lạnh.', 12
      UNION ALL SELECT 'farmer4@marketlink.vn', 'Củ quả Đức Củ Chi', 'Khoai lang, cà rốt, củ dền trồng không thuốc ở Củ Chi.', 6
      UNION ALL SELECT 'farmer5@marketlink.vn', 'Rau thơm Cô Lan', 'Húng quế, rau răm, ngò gai, sả — cắt buổi sáng, bó nhỏ.', 12
      UNION ALL SELECT 'farmer6@marketlink.vn', 'Lò bánh Tuấn Anh', 'Bánh mì men tự nhiên, bánh chuối nướng, ra lò lúc 5 giờ.', 12
      UNION ALL SELECT 'farmer7@marketlink.vn', 'Nông trại Hoa Đà Lạt', 'Xà lách, cải kale, cà chua bi từ Đà Lạt, xe xuống mỗi tối.', 24
      UNION ALL SELECT 'farmer8@marketlink.vn', 'Trứng gà Khánh Hòa', 'Trứng gà thả vườn, vịt và cút, thu mỗi sáng.', 12
      UNION ALL SELECT 'farmer9@marketlink.vn', 'Nấm sạch Thu Thảo', 'Nấm bào ngư, nấm mối đen, nấm rơm trồng trong nhà kín.', 12
      UNION ALL SELECT 'farmer10@marketlink.vn', 'Mật ong U Minh', 'Mật ong rừng tràm U Minh, phấn hoa và sáp ong nguyên chất.', 48
     ) s ON s.email = u.email
ON DUPLICATE KEY UPDATE stall_name = s.stall_name, description = s.description,
                        order_cutoff_hours = s.cutoff, approval_status = 'approved',
                        approved_at = COALESCE(farmer_profiles.approved_at, NOW());

-- ---- Farmer × chợ (FR-060) + khung giờ nhận hàng (FR-061) ----
INSERT INTO farmer_markets (farmer_id, market_id, stall_code, stall_latitude, stall_longitude, is_active)
SELECT f.id, m.id, x.stall_code, m.latitude + x.dlat, m.longitude + x.dlng, TRUE
FROM farmer_profiles f
JOIN users u ON u.id = f.user_id
JOIN (
      SELECT 'farmer@marketlink.vn' AS email, 'Chợ Bà Chiểu' AS market_name, 'A-12' AS stall_code, 0.00012 AS dlat, 0.00008 AS dlng
      UNION ALL SELECT 'farmer@marketlink.vn', 'Chợ Thảo Điền', 'T-03', 0.00009, -0.00011
      UNION ALL SELECT 'farmer2@marketlink.vn', 'Chợ Bến Thành', 'B-07', -0.00010, 0.00014
      UNION ALL SELECT 'farmer2@marketlink.vn', 'Chợ Tân Định', 'C-02', 0.00007, 0.00010
      UNION ALL SELECT 'farmer3@marketlink.vn', 'Chợ Thảo Điền', 'T-08', -0.00006, 0.00013
      UNION ALL SELECT 'farmer4@marketlink.vn', 'Chợ Bà Chiểu', 'A-20', -0.00014, 0.00005
      UNION ALL SELECT 'farmer4@marketlink.vn', 'Chợ Bến Thành', 'B-15', 0.00011, -0.00009
      UNION ALL SELECT 'farmer5@marketlink.vn', 'Chợ Tân Định', 'C-11', 0.00013, 0.00006
      UNION ALL SELECT 'farmer6@marketlink.vn', 'Chợ Thảo Điền', 'T-12', 0.00015, 0.00004
      UNION ALL SELECT 'farmer6@marketlink.vn', 'Chợ Bến Thành', 'B-22', -0.00008, 0.00012
      UNION ALL SELECT 'farmer7@marketlink.vn', 'Chợ Bà Chiểu', 'A-05', 0.00006, -0.00013
      UNION ALL SELECT 'farmer8@marketlink.vn', 'Chợ Tân Định', 'C-19', -0.00012, -0.00007
      UNION ALL SELECT 'farmer8@marketlink.vn', 'Chợ Bà Chiểu', 'A-31', 0.00010, 0.00011
      UNION ALL SELECT 'farmer9@marketlink.vn', 'Chợ Thảo Điền', 'T-21', -0.00013, -0.00006
      UNION ALL SELECT 'farmer10@marketlink.vn', 'Chợ Bến Thành', 'B-30', 0.00005, 0.00007
      UNION ALL SELECT 'farmer10@marketlink.vn', 'Chợ Tân Định', 'C-25', 0.00009, -0.00012
     ) x ON x.email = u.email
JOIN markets m ON m.market_name = x.market_name
ON DUPLICATE KEY UPDATE stall_code = x.stall_code, is_active = TRUE,
                        stall_latitude = m.latitude + x.dlat, stall_longitude = m.longitude + x.dlng;

-- Khung giờ 07:00–11:00 vào các thứ stall có mặt (chỉ những thứ chợ có họp). Bảng chỉ có khoá tự nhiên
-- (farmer_market_id, day_of_week) nên INSERT IGNORE là đủ để chạy lại.
INSERT IGNORE INTO farmer_operating_days (farmer_market_id, day_of_week, pickup_start_time, pickup_end_time)
SELECT fm.id, d.day, '07:00:00', '11:00:00'
FROM farmer_markets fm
JOIN farmer_profiles f ON f.id = fm.farmer_id
JOIN users u ON u.id = f.user_id
JOIN markets m ON m.id = fm.market_id
JOIN (
      SELECT 'farmer@marketlink.vn' AS email, 'Chợ Bà Chiểu' AS market_name, 0 AS day
      UNION ALL SELECT 'farmer@marketlink.vn', 'Chợ Bà Chiểu', 6
      UNION ALL SELECT 'farmer@marketlink.vn', 'Chợ Thảo Điền', 0
      UNION ALL SELECT 'farmer@marketlink.vn', 'Chợ Thảo Điền', 6
      UNION ALL SELECT 'farmer2@marketlink.vn', 'Chợ Bến Thành', 2
      UNION ALL SELECT 'farmer2@marketlink.vn', 'Chợ Bến Thành', 4
      UNION ALL SELECT 'farmer2@marketlink.vn', 'Chợ Bến Thành', 6
      UNION ALL SELECT 'farmer2@marketlink.vn', 'Chợ Tân Định', 1
      UNION ALL SELECT 'farmer2@marketlink.vn', 'Chợ Tân Định', 3
      UNION ALL SELECT 'farmer2@marketlink.vn', 'Chợ Tân Định', 5
      UNION ALL SELECT 'farmer3@marketlink.vn', 'Chợ Thảo Điền', 0
      UNION ALL SELECT 'farmer3@marketlink.vn', 'Chợ Thảo Điền', 6
      UNION ALL SELECT 'farmer4@marketlink.vn', 'Chợ Bà Chiểu', 1
      UNION ALL SELECT 'farmer4@marketlink.vn', 'Chợ Bà Chiểu', 3
      UNION ALL SELECT 'farmer4@marketlink.vn', 'Chợ Bà Chiểu', 5
      UNION ALL SELECT 'farmer4@marketlink.vn', 'Chợ Bà Chiểu', 6
      UNION ALL SELECT 'farmer4@marketlink.vn', 'Chợ Bến Thành', 2
      UNION ALL SELECT 'farmer4@marketlink.vn', 'Chợ Bến Thành', 4
      UNION ALL SELECT 'farmer5@marketlink.vn', 'Chợ Tân Định', 0
      UNION ALL SELECT 'farmer5@marketlink.vn', 'Chợ Tân Định', 1
      UNION ALL SELECT 'farmer5@marketlink.vn', 'Chợ Tân Định', 2
      UNION ALL SELECT 'farmer5@marketlink.vn', 'Chợ Tân Định', 3
      UNION ALL SELECT 'farmer5@marketlink.vn', 'Chợ Tân Định', 4
      UNION ALL SELECT 'farmer5@marketlink.vn', 'Chợ Tân Định', 5
      UNION ALL SELECT 'farmer5@marketlink.vn', 'Chợ Tân Định', 6
      UNION ALL SELECT 'farmer6@marketlink.vn', 'Chợ Thảo Điền', 0
      UNION ALL SELECT 'farmer6@marketlink.vn', 'Chợ Thảo Điền', 6
      UNION ALL SELECT 'farmer6@marketlink.vn', 'Chợ Bến Thành', 1
      UNION ALL SELECT 'farmer6@marketlink.vn', 'Chợ Bến Thành', 2
      UNION ALL SELECT 'farmer6@marketlink.vn', 'Chợ Bến Thành', 3
      UNION ALL SELECT 'farmer6@marketlink.vn', 'Chợ Bến Thành', 4
      UNION ALL SELECT 'farmer6@marketlink.vn', 'Chợ Bến Thành', 5
      UNION ALL SELECT 'farmer6@marketlink.vn', 'Chợ Bến Thành', 6
      UNION ALL SELECT 'farmer7@marketlink.vn', 'Chợ Bà Chiểu', 0
      UNION ALL SELECT 'farmer7@marketlink.vn', 'Chợ Bà Chiểu', 6
      UNION ALL SELECT 'farmer8@marketlink.vn', 'Chợ Tân Định', 0
      UNION ALL SELECT 'farmer8@marketlink.vn', 'Chợ Tân Định', 1
      UNION ALL SELECT 'farmer8@marketlink.vn', 'Chợ Tân Định', 2
      UNION ALL SELECT 'farmer8@marketlink.vn', 'Chợ Tân Định', 3
      UNION ALL SELECT 'farmer8@marketlink.vn', 'Chợ Tân Định', 4
      UNION ALL SELECT 'farmer8@marketlink.vn', 'Chợ Tân Định', 5
      UNION ALL SELECT 'farmer8@marketlink.vn', 'Chợ Tân Định', 6
      UNION ALL SELECT 'farmer8@marketlink.vn', 'Chợ Bà Chiểu', 2
      UNION ALL SELECT 'farmer8@marketlink.vn', 'Chợ Bà Chiểu', 4
      UNION ALL SELECT 'farmer9@marketlink.vn', 'Chợ Thảo Điền', 0
      UNION ALL SELECT 'farmer9@marketlink.vn', 'Chợ Thảo Điền', 6
      UNION ALL SELECT 'farmer10@marketlink.vn', 'Chợ Bến Thành', 6
      UNION ALL SELECT 'farmer10@marketlink.vn', 'Chợ Tân Định', 0
     ) d ON d.email = u.email AND d.market_name = m.market_name
JOIN market_operating_days mod_ ON mod_.market_id = m.id AND mod_.day_of_week = d.day;

-- ---- Sản phẩm (FR-062, FR-064): 51 sản phẩm của 10 stall, đủ 6 danh mục, có sold_out / unavailable ----
INSERT INTO products (farmer_id, category_id, name, description, price, unit, stock_quantity, status, is_hidden, hidden_reason)
SELECT f.id, c.id, x.name, x.description, x.price, x.unit, x.stock, x.status, FALSE, NULL
FROM (
      SELECT 'farmer@marketlink.vn' AS email, 'vegetables' AS slug, 'Rau muống' AS name, 'Rau muống nước cắt sáng, cọng non.' AS description, 12000 AS price, 'bunch' AS unit, 40 AS stock, 'available' AS status
      UNION ALL SELECT 'farmer@marketlink.vn' AS email, 'vegetables' AS slug, 'Cải ngọt' AS name, 'Cải ngọt lá mềm, luộc hoặc xào đều ngon.' AS description, 15000 AS price, 'bunch' AS unit, 30 AS stock, 'available' AS status
      UNION ALL SELECT 'farmer@marketlink.vn' AS email, 'vegetables' AS slug, 'Xà lách xoong' AS name, 'Hết hàng tuần này, tuần sau có lại.' AS description, 18000 AS price, 'bunch' AS unit, 0 AS stock, 'sold_out' AS status
      UNION ALL SELECT 'farmer@marketlink.vn' AS email, 'vegetables' AS slug, 'Rau dền' AS name, 'Rau dền đỏ nấu canh tôm.' AS description, 12000 AS price, 'bunch' AS unit, 25 AS stock, 'available' AS status
      UNION ALL SELECT 'farmer@marketlink.vn' AS email, 'vegetables' AS slug, 'Mồng tơi' AS name, NULL AS description, 12000 AS price, 'bunch' AS unit, 20 AS stock, 'available' AS status
      UNION ALL SELECT 'farmer@marketlink.vn' AS email, 'vegetables' AS slug, 'Rau lang' AS name, 'Ngọn rau lang non, luộc chấm mắm.' AS description, 10000 AS price, 'bunch' AS unit, 35 AS stock, 'available' AS status
      UNION ALL SELECT 'farmer2@marketlink.vn' AS email, 'fruits' AS slug, 'Bưởi da xanh' AS name, 'Bưởi da xanh Bến Tre, ruột hồng, ít hạt.' AS description, 65000 AS price, 'kg' AS unit, 50 AS stock, 'available' AS status
      UNION ALL SELECT 'farmer2@marketlink.vn' AS email, 'fruits' AS slug, 'Cam sành' AS name, 'Cam sành vắt nước, ngọt thanh.' AS description, 35000 AS price, 'kg' AS unit, 60 AS stock, 'available' AS status
      UNION ALL SELECT 'farmer2@marketlink.vn' AS email, 'fruits' AS slug, 'Xoài cát Hoà Lộc' AS name, 'Xoài chín cây, thơm, thịt dày.' AS description, 85000 AS price, 'kg' AS unit, 20 AS stock, 'available' AS status
      UNION ALL SELECT 'farmer2@marketlink.vn' AS email, 'fruits' AS slug, 'Chuối sứ' AS name, NULL AS description, 25000 AS price, 'bunch' AS unit, 15 AS stock, 'available' AS status
      UNION ALL SELECT 'farmer2@marketlink.vn' AS email, 'fruits' AS slug, 'Ổi nữ hoàng' AS name, 'Hết hàng.' AS description, 30000 AS price, 'kg' AS unit, 0 AS stock, 'sold_out' AS status
      UNION ALL SELECT 'farmer2@marketlink.vn' AS email, 'fruits' AS slug, 'Đu đủ' AS name, 'Đu đủ chín vừa, mua hôm nay ăn ngày mai.' AS description, 22000 AS price, 'piece' AS unit, 12 AS stock, 'available' AS status
      UNION ALL SELECT 'farmer3@marketlink.vn' AS email, 'eggs_and_dairy' AS slug, 'Sữa tươi thanh trùng' AS name, 'Sữa bò Long Thành thanh trùng, dùng trong 5 ngày.' AS description, 45000 AS price, 'litre' AS unit, 30 AS stock, 'available' AS status
      UNION ALL SELECT 'farmer3@marketlink.vn' AS email, 'eggs_and_dairy' AS slug, 'Sữa chua nhà làm' AS name, 'Hộp 100 ml, không đường hoặc có đường.' AS description, 12000 AS price, 'jar' AS unit, 60 AS stock, 'available' AS status
      UNION ALL SELECT 'farmer3@marketlink.vn' AS email, 'eggs_and_dairy' AS slug, 'Phô mai tươi' AS name, 'Hộp 250 g, làm từ sữa tươi cùng trại.' AS description, 95000 AS price, 'jar' AS unit, 8 AS stock, 'available' AS status
      UNION ALL SELECT 'farmer3@marketlink.vn' AS email, 'eggs_and_dairy' AS slug, 'Bơ lạt' AS name, 'Tạm ngưng cho tới đầu tháng sau.' AS description, 120000 AS price, 'jar' AS unit, 0 AS stock, 'unavailable' AS status
      UNION ALL SELECT 'farmer4@marketlink.vn' AS email, 'vegetables' AS slug, 'Khoai lang mật' AS name, 'Khoai lang mật Củ Chi, nướng chảy mật.' AS description, 28000 AS price, 'kg' AS unit, 70 AS stock, 'available' AS status
      UNION ALL SELECT 'farmer4@marketlink.vn' AS email, 'vegetables' AS slug, 'Cà rốt' AS name, NULL AS description, 20000 AS price, 'kg' AS unit, 50 AS stock, 'available' AS status
      UNION ALL SELECT 'farmer4@marketlink.vn' AS email, 'vegetables' AS slug, 'Củ dền' AS name, 'Củ dền đỏ, ép nước hoặc nấu canh.' AS description, 25000 AS price, 'kg' AS unit, 30 AS stock, 'available' AS status
      UNION ALL SELECT 'farmer4@marketlink.vn' AS email, 'vegetables' AS slug, 'Khoai môn' AS name, NULL AS description, 32000 AS price, 'kg' AS unit, 25 AS stock, 'available' AS status
      UNION ALL SELECT 'farmer4@marketlink.vn' AS email, 'vegetables' AS slug, 'Củ cải trắng' AS name, 'Củ cải trắng muối chua hoặc hầm.' AS description, 15000 AS price, 'kg' AS unit, 40 AS stock, 'available' AS status
      UNION ALL SELECT 'farmer4@marketlink.vn' AS email, 'vegetables' AS slug, 'Gừng tươi' AS name, 'Gừng ta, thơm, cay vừa.' AS description, 45000 AS price, 'kg' AS unit, 10 AS stock, 'available' AS status
      UNION ALL SELECT 'farmer5@marketlink.vn' AS email, 'vegetables' AS slug, 'Húng quế' AS name, 'Húng quế ăn phở, cắt sáng.' AS description, 8000 AS price, 'bunch' AS unit, 40 AS stock, 'available' AS status
      UNION ALL SELECT 'farmer5@marketlink.vn' AS email, 'vegetables' AS slug, 'Rau răm' AS name, NULL AS description, 8000 AS price, 'bunch' AS unit, 30 AS stock, 'available' AS status
      UNION ALL SELECT 'farmer5@marketlink.vn' AS email, 'vegetables' AS slug, 'Ngò gai' AS name, NULL AS description, 8000 AS price, 'bunch' AS unit, 30 AS stock, 'available' AS status
      UNION ALL SELECT 'farmer5@marketlink.vn' AS email, 'vegetables' AS slug, 'Sả cây' AS name, 'Bó 5 cây, đập dập nấu canh chua.' AS description, 10000 AS price, 'bunch' AS unit, 25 AS stock, 'available' AS status
      UNION ALL SELECT 'farmer5@marketlink.vn' AS email, 'vegetables' AS slug, 'Tía tô' AS name, NULL AS description, 8000 AS price, 'bunch' AS unit, 20 AS stock, 'available' AS status
      UNION ALL SELECT 'farmer5@marketlink.vn' AS email, 'vegetables' AS slug, 'Diếp cá' AS name, 'Hết hàng hôm nay.' AS description, 8000 AS price, 'bunch' AS unit, 0 AS stock, 'sold_out' AS status
      UNION ALL SELECT 'farmer6@marketlink.vn' AS email, 'baked_goods' AS slug, 'Bánh mì men tự nhiên' AS name, 'Ổ 700 g, ủ 24 giờ, vỏ giòn.' AS description, 65000 AS price, 'loaf' AS unit, 20 AS stock, 'available' AS status
      UNION ALL SELECT 'farmer6@marketlink.vn' AS email, 'baked_goods' AS slug, 'Bánh chuối nướng' AS name, 'Bánh chuối sứ nướng, hộp 6 miếng.' AS description, 35000 AS price, 'jar' AS unit, 15 AS stock, 'available' AS status
      UNION ALL SELECT 'farmer6@marketlink.vn' AS email, 'baked_goods' AS slug, 'Bánh quy bơ' AS name, 'Hộp 200 g, bơ động vật.' AS description, 55000 AS price, 'jar' AS unit, 25 AS stock, 'available' AS status
      UNION ALL SELECT 'farmer6@marketlink.vn' AS email, 'baked_goods' AS slug, 'Bánh bông lan trứng muối' AS name, NULL AS description, 48000 AS price, 'jar' AS unit, 10 AS stock, 'available' AS status
      UNION ALL SELECT 'farmer6@marketlink.vn' AS email, 'baked_goods' AS slug, 'Bánh mì đen' AS name, 'Bột lúa mạch đen 60 %.' AS description, 70000 AS price, 'loaf' AS unit, 8 AS stock, 'available' AS status
      UNION ALL SELECT 'farmer7@marketlink.vn' AS email, 'vegetables' AS slug, 'Xà lách lô lô' AS name, 'Xà lách Đà Lạt, trồng thuỷ canh.' AS description, 32000 AS price, 'kg' AS unit, 30 AS stock, 'available' AS status
      UNION ALL SELECT 'farmer7@marketlink.vn' AS email, 'vegetables' AS slug, 'Cải kale' AS name, 'Kale xanh, làm sinh tố hoặc salad.' AS description, 55000 AS price, 'kg' AS unit, 15 AS stock, 'available' AS status
      UNION ALL SELECT 'farmer7@marketlink.vn' AS email, 'fruits' AS slug, 'Cà chua bi' AS name, 'Cà chua bi đỏ, ngọt.' AS description, 48000 AS price, 'kg' AS unit, 40 AS stock, 'available' AS status
      UNION ALL SELECT 'farmer7@marketlink.vn' AS email, 'vegetables' AS slug, 'Bông cải xanh' AS name, NULL AS description, 45000 AS price, 'kg' AS unit, 20 AS stock, 'available' AS status
      UNION ALL SELECT 'farmer7@marketlink.vn' AS email, 'fruits' AS slug, 'Ớt chuông' AS name, 'Ớt chuông ba màu.' AS description, 60000 AS price, 'kg' AS unit, 12 AS stock, 'available' AS status
      UNION ALL SELECT 'farmer8@marketlink.vn' AS email, 'eggs_and_dairy' AS slug, 'Trứng gà thả vườn' AS name, 'Vỉ 10 trứng, gà ăn thóc.' AS description, 45000 AS price, 'tray of 30' AS unit, 50 AS stock, 'available' AS status
      UNION ALL SELECT 'farmer8@marketlink.vn' AS email, 'eggs_and_dairy' AS slug, 'Trứng vịt' AS name, 'Vỉ 10 trứng.' AS description, 40000 AS price, 'tray of 30' AS unit, 30 AS stock, 'available' AS status
      UNION ALL SELECT 'farmer8@marketlink.vn' AS email, 'eggs_and_dairy' AS slug, 'Trứng cút' AS name, 'Vỉ 30 trứng cút.' AS description, 25000 AS price, 'tray of 30' AS unit, 20 AS stock, 'available' AS status
      UNION ALL SELECT 'farmer8@marketlink.vn' AS email, 'eggs_and_dairy' AS slug, 'Trứng gà ác' AS name, 'Hết hàng, cuối tuần có lại.' AS description, 55000 AS price, 'tray of 30' AS unit, 0 AS stock, 'sold_out' AS status
      UNION ALL SELECT 'farmer9@marketlink.vn' AS email, 'mushrooms' AS slug, 'Nấm bào ngư' AS name, 'Nấm bào ngư xám, hái buổi sáng.' AS description, 40000 AS price, 'kg' AS unit, 30 AS stock, 'available' AS status
      UNION ALL SELECT 'farmer9@marketlink.vn' AS email, 'mushrooms' AS slug, 'Nấm mối đen' AS name, 'Nấm mối đen, hiếm, đặt trước.' AS description, 180000 AS price, 'kg' AS unit, 6 AS stock, 'available' AS status
      UNION ALL SELECT 'farmer9@marketlink.vn' AS email, 'mushrooms' AS slug, 'Nấm rơm' AS name, NULL AS description, 60000 AS price, 'kg' AS unit, 15 AS stock, 'available' AS status
      UNION ALL SELECT 'farmer9@marketlink.vn' AS email, 'mushrooms' AS slug, 'Nấm đông cô tươi' AS name, NULL AS description, 95000 AS price, 'kg' AS unit, 10 AS stock, 'available' AS status
      UNION ALL SELECT 'farmer9@marketlink.vn' AS email, 'mushrooms' AS slug, 'Nấm kim châm' AS name, 'Tạm ngưng.' AS description, 20000 AS price, 'bag' AS unit, 0 AS stock, 'unavailable' AS status
      UNION ALL SELECT 'farmer10@marketlink.vn' AS email, 'grains_beans_and_nuts' AS slug, 'Mật ong rừng tràm' AS name, 'Mật ong rừng tràm U Minh, đặc, thơm.' AS description, 250000 AS price, 'litre' AS unit, 12 AS stock, 'available' AS status
      UNION ALL SELECT 'farmer10@marketlink.vn' AS email, 'grains_beans_and_nuts' AS slug, 'Phấn hoa' AS name, 'Hộp 250 g.' AS description, 180000 AS price, 'jar' AS unit, 8 AS stock, 'available' AS status
      UNION ALL SELECT 'farmer10@marketlink.vn' AS email, 'grains_beans_and_nuts' AS slug, 'Sáp ong nguyên chất' AS name, NULL AS description, 120000 AS price, 'jar' AS unit, 5 AS stock, 'available' AS status
      UNION ALL SELECT 'farmer10@marketlink.vn' AS email, 'grains_beans_and_nuts' AS slug, 'Mật ong hoa nhãn' AS name, 'Mật ong hoa nhãn Hưng Yên.' AS description, 220000 AS price, 'litre' AS unit, 10 AS stock, 'available' AS status
     ) x
JOIN users u ON u.email = x.email
JOIN farmer_profiles f ON f.user_id = u.id
JOIN categories c ON c.slug = x.slug
ON DUPLICATE KEY UPDATE category_id = c.id, description = x.description, price = x.price, unit = x.unit,
                        stock_quantity = x.stock, status = x.status;

-- FR-074: một listing bị admin ẩn để demo màn kiểm duyệt.
UPDATE products p
JOIN farmer_profiles f ON f.id = p.farmer_id
JOIN users u ON u.id = f.user_id
SET p.is_hidden = TRUE, p.hidden_reason = 'Ảnh và mô tả không đúng sản phẩm thật (báo cáo của khách).'
WHERE u.email = 'farmer10@marketlink.vn' AND p.name = 'Sáp ong nguyên chất';

-- ---- Slot nhận hàng (FR-032, FR-067): 4 tuần tới, khung 60 phút, 5 đơn mỗi slot ----
-- SQL thuần, không cần backend: ngày = hôm nay theo giờ Việt Nam + 0…27 (MySQL chạy UTC), chỉ những ngày
-- trùng thứ đã khai ở farmer_operating_days; khung = giờ bắt đầu + 0…11 giờ, chỉ giữ khung nằm trọn trong
-- giờ nhận hàng (khung lẻ cuối bị bỏ, như SlotService.windows). Khoá uq_slot (farmer_market_id, slot_date,
-- start_time) nên INSERT IGNORE là đủ để chạy lại; slot đã có — kể cả đã có đơn — giữ nguyên.
INSERT IGNORE INTO pickup_slots (farmer_market_id, slot_date, start_time, end_time, max_orders)
SELECT fm.id, x.slot_date,
       ADDTIME(od.pickup_start_time, SEC_TO_TIME(h.n * 3600)),
       ADDTIME(od.pickup_start_time, SEC_TO_TIME((h.n + 1) * 3600)),
       5
FROM farmer_markets fm
JOIN farmer_operating_days od ON od.farmer_market_id = fm.id
JOIN (
      SELECT DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR) + INTERVAL (w.n * 7 + d.n) DAY AS slot_date
      FROM (SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3) w
      CROSS JOIN (SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
                  UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6) d
     ) x ON DAYOFWEEK(x.slot_date) - 1 = od.day_of_week
CROSS JOIN (SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
            UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9
            UNION ALL SELECT 10 UNION ALL SELECT 11) h
WHERE fm.is_active = TRUE
  AND ADDTIME(od.pickup_start_time, SEC_TO_TIME((h.n + 1) * 3600)) <= od.pickup_end_time;
