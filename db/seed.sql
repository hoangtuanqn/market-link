-- MarketLink — demo data (FR-100, FR-101, FR-102).
-- NOT a migration: Flyway runs in every environment, demo seed data should not.
-- Run: make seed. Safe to run repeatedly — every INSERT is idempotent by its natural key
-- (categories.slug, markets.market_name, …). Each cluster of the core-commerce plan appends its own block
-- at the end of this file, not a separate file.
-- Coordinates are the real coordinates of the 4 markets in Ho Chi Minh City.

SET NAMES utf8mb4;

-- ---- Categories (FR-076) ----
-- The eight agreed categories (PR #137, frontend/src/data/catalog.ts): names and slugs stay exactly as they are.
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

-- ---- Markets (FR-073, FR-012) ----
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

-- Operating days: "Bà Chiểu" and "Tân Định" run all week; "Thảo Điền" on weekends; "Bến Thành" Mon–Sat.
-- The table only has the key (market_id, day_of_week), so INSERT IGNORE is enough to make it re-runnable.
INSERT IGNORE INTO market_operating_days (market_id, day_of_week)
SELECT m.id, d.day
FROM markets m
JOIN (SELECT 0 AS day UNION SELECT 1 UNION SELECT 2 UNION SELECT 3
      UNION SELECT 4 UNION SELECT 5 UNION SELECT 6) d
WHERE (m.market_name IN ('Chợ Bà Chiểu', 'Chợ Tân Định'))
   OR (m.market_name = 'Chợ Thảo Điền' AND d.day IN (0, 6))
   OR (m.market_name = 'Chợ Bến Thành' AND d.day BETWEEN 1 AND 6);

-- ---- Demo accounts (FR-102) ----
-- The password of EVERY demo account: Demo@1234 (see docs/DEMO_CREDENTIALS.md). @pw is its BCrypt hash,
-- generated with `htpasswd -bnBC 10 "" 'Demo@1234'`. admin@marketlink.vn is created by AdminSeeder when the backend
-- starts; the seed overwrites the password to match the submission documents.
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


-- ---- Stall profiles (FR-060): 10 Farmers, all approved so they can sell right away (D-09) ----
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

-- ---- Farmer × market (FR-060) + pickup time windows (FR-061) ----
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

-- Time window 07:00–11:00 on the weekdays the stall is present (only weekdays the market runs). The table only has the natural key
-- (farmer_market_id, day_of_week) so INSERT IGNORE is enough to make it re-runnable.
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

-- ---- Products (FR-062, FR-064): 51 products from 10 stalls, all 6 categories, including sold_out / unavailable ----
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

-- FR-074: one listing hidden by an admin to demo the moderation screen.
UPDATE products p
JOIN farmer_profiles f ON f.id = p.farmer_id
JOIN users u ON u.id = f.user_id
SET p.is_hidden = TRUE, p.hidden_reason = 'Ảnh và mô tả không đúng sản phẩm thật (báo cáo của khách).'
WHERE u.email = 'farmer10@marketlink.vn' AND p.name = 'Sáp ong nguyên chất';

-- ---- Pickup slots (FR-032, FR-067): next 4 weeks, 60-minute windows, 5 orders per slot ----
-- Plain SQL, no backend needed: date = today in Vietnam time + 0…27 (MySQL runs UTC), only days
-- matching a weekday already declared in farmer_operating_days; window = start time + 0…11 hours, keeping only windows fully within
-- the pickup hours (a leftover partial window is dropped, like SlotService.windows). The uq_slot key (farmer_market_id, slot_date,
-- start_time) makes INSERT IGNORE enough to re-run; an existing slot — even one with orders already — is left unchanged.
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

-- ---- Demo orders (FR-101, FR-038): all 6 statuses for customer@marketlink.vn ----
-- 3 stalls ('Vườn Út Hiền' at 'Chợ Bà Chiểu', 'Trái cây Ba Tơ' at 'Chợ Bến Thành', 'Củ quả Đức Củ Chi' at
-- 'Chợ Bà Chiểu') × 4 orders per stall = 12 orders, fixed order_code ML-20260920-0001…0012 for ON DUPLICATE
-- KEY UPDATE to hold on to (20260920 is only a fixed label, not the date the seed really runs).
-- Running orders (placed/accepted/ready) sit at today+2 onwards: they pick an exact slot generated by the block
-- above with LATERAL — "the nearest upcoming day that stall is at that market, from today+2" — so they are
-- valid whatever day the seed runs. Finished/declined/cancelled orders sit back in the past (today−10…−2),
-- slot_id NULL because slots only exist from today on. cutoff_at = pickup_date + pickup_start − the farmer's
-- order_cutoff_hours, a DATETIME in local time (not converted to UTC, like cutoffAt on the Order entity).

-- Group 1: future orders on the earliest slot (OFFSET 0) — 0001 placed (farmer@, a placed order to demo the
-- Farmer's review), 0002 placed (farmer2@), 0004 accepted (farmer4@).
-- M-4: created_at (TIMESTAMP, session UTC — unlike cutoff_at/pickup_*, which are DATETIME/DATE/TIME stored in
-- local time, never converted) is set to exactly the "placed" moment of the order_status_history chain below
-- (UTC_TIMESTAMP() - days_before_now), not the time this script runs.
INSERT INTO orders (order_code, customer_id, farmer_id, market_id, slot_id, pickup_date, pickup_start,
                    pickup_end, cutoff_at, total_amount, status, customer_note, farmer_note, created_at)
SELECT x.order_code, cust.id, f.id, m.id, slot.id, slot.slot_date, slot.start_time, slot.end_time,
       TIMESTAMP(slot.slot_date, slot.start_time) - INTERVAL f.order_cutoff_hours HOUR,
       0, x.status, NULL, NULL, UTC_TIMESTAMP() - INTERVAL x.days_before_now DAY
FROM (
      SELECT 'ML-20260920-0001' AS order_code, 'farmer@marketlink.vn' AS email, 'Chợ Bà Chiểu' AS market_name, 'placed' AS status, 1 AS days_before_now
      UNION ALL SELECT 'ML-20260920-0002', 'farmer2@marketlink.vn', 'Chợ Bến Thành', 'placed', 1
      UNION ALL SELECT 'ML-20260920-0004', 'farmer4@marketlink.vn', 'Chợ Bà Chiểu', 'accepted', 2
     ) x
JOIN users cust ON cust.email = 'customer@marketlink.vn'
JOIN users u ON u.email = x.email
JOIN farmer_profiles f ON f.user_id = u.id
JOIN farmer_markets fm ON fm.farmer_id = f.id
JOIN markets m ON m.id = fm.market_id AND m.market_name = x.market_name
JOIN LATERAL (
      SELECT ps.id, ps.slot_date, ps.start_time, ps.end_time
      FROM pickup_slots ps
      WHERE ps.farmer_market_id = fm.id
        AND ps.slot_date >= DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR) + INTERVAL 2 DAY
      ORDER BY ps.slot_date, ps.start_time
      LIMIT 1 OFFSET 0
     ) slot ON TRUE
ON DUPLICATE KEY UPDATE customer_id = cust.id, farmer_id = f.id, market_id = m.id, slot_id = slot.id,
                        pickup_date = slot.slot_date, pickup_start = slot.start_time, pickup_end = slot.end_time,
                        cutoff_at = TIMESTAMP(slot.slot_date, slot.start_time) - INTERVAL f.order_cutoff_hours HOUR,
                        status = x.status, customer_note = NULL, farmer_note = NULL, total_amount = 0,
                        created_at = UTC_TIMESTAMP() - INTERVAL x.days_before_now DAY;

-- Group 2: future orders on the next slot (OFFSET 1, a different time or day from group 1) — 0003 accepted
-- (farmer@), 0005 ready (farmer2@), 0006 ready (farmer4@).
INSERT INTO orders (order_code, customer_id, farmer_id, market_id, slot_id, pickup_date, pickup_start,
                    pickup_end, cutoff_at, total_amount, status, customer_note, farmer_note, created_at)
SELECT x.order_code, cust.id, f.id, m.id, slot.id, slot.slot_date, slot.start_time, slot.end_time,
       TIMESTAMP(slot.slot_date, slot.start_time) - INTERVAL f.order_cutoff_hours HOUR,
       0, x.status, NULL, NULL, UTC_TIMESTAMP() - INTERVAL x.days_before_now DAY
FROM (
      SELECT 'ML-20260920-0003' AS order_code, 'farmer@marketlink.vn' AS email, 'Chợ Bà Chiểu' AS market_name, 'accepted' AS status, 2 AS days_before_now
      UNION ALL SELECT 'ML-20260920-0005', 'farmer2@marketlink.vn', 'Chợ Bến Thành', 'ready', 3
      UNION ALL SELECT 'ML-20260920-0006', 'farmer4@marketlink.vn', 'Chợ Bà Chiểu', 'ready', 3
     ) x
JOIN users cust ON cust.email = 'customer@marketlink.vn'
JOIN users u ON u.email = x.email
JOIN farmer_profiles f ON f.user_id = u.id
JOIN farmer_markets fm ON fm.farmer_id = f.id
JOIN markets m ON m.id = fm.market_id AND m.market_name = x.market_name
JOIN LATERAL (
      SELECT ps.id, ps.slot_date, ps.start_time, ps.end_time
      FROM pickup_slots ps
      WHERE ps.farmer_market_id = fm.id
        AND ps.slot_date >= DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR) + INTERVAL 2 DAY
      ORDER BY ps.slot_date, ps.start_time
      LIMIT 1 OFFSET 1
     ) slot ON TRUE
ON DUPLICATE KEY UPDATE customer_id = cust.id, farmer_id = f.id, market_id = m.id, slot_id = slot.id,
                        pickup_date = slot.slot_date, pickup_start = slot.start_time, pickup_end = slot.end_time,
                        cutoff_at = TIMESTAMP(slot.slot_date, slot.start_time) - INTERVAL f.order_cutoff_hours HOUR,
                        status = x.status, customer_note = NULL, farmer_note = NULL, total_amount = 0,
                        created_at = UTC_TIMESTAMP() - INTERVAL x.days_before_now DAY;

-- Group 3: past orders (completed ×4, declined ×1, cancelled ×1) — slot_id NULL, fixed pickup time
-- 08:00–09:00 (inside the 07:00–11:00 window of all 3 stalls).
-- M-4: created_at = the real "placed" moment of the history chain below — 2 days before pickup_date, 08:00
-- Vietnam time — converted to UTC (-7 hours) because this column is a TIMESTAMP (session UTC), unlike
-- cutoff_at/pickup_date, which are DATETIME/DATE stored in local time, never converted. Always before the
-- pickup day, even for completed/declined/cancelled orders moved back into the past.
INSERT INTO orders (order_code, customer_id, farmer_id, market_id, slot_id, pickup_date, pickup_start,
                    pickup_end, cutoff_at, total_amount, status, customer_note, farmer_note, created_at)
SELECT x.order_code, cust.id, f.id, m.id, NULL,
       DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR) - INTERVAL x.days_ago DAY, '08:00:00', '09:00:00',
       TIMESTAMP(DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR) - INTERVAL x.days_ago DAY, '08:00:00')
         - INTERVAL f.order_cutoff_hours HOUR,
       0, x.status, NULL, x.farmer_note,
       TIMESTAMP(DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR) - INTERVAL (x.days_ago + 2) DAY, '08:00:00')
         - INTERVAL 7 HOUR
FROM (
      SELECT 'ML-20260920-0007' AS order_code, 'farmer@marketlink.vn' AS email, 'Chợ Bà Chiểu' AS market_name, 10 AS days_ago, 'completed' AS status, NULL AS farmer_note
      UNION ALL SELECT 'ML-20260920-0008', 'farmer2@marketlink.vn', 'Chợ Bến Thành', 8, 'completed', NULL
      UNION ALL SELECT 'ML-20260920-0009', 'farmer4@marketlink.vn', 'Chợ Bà Chiểu', 6, 'completed', NULL
      UNION ALL SELECT 'ML-20260920-0010', 'farmer@marketlink.vn', 'Chợ Bà Chiểu', 4, 'completed', NULL
      UNION ALL SELECT 'ML-20260920-0011', 'farmer2@marketlink.vn', 'Chợ Bến Thành', 3, 'declined', 'Vườn hết hàng đợt này, không đủ giao đúng hẹn.'
      UNION ALL SELECT 'ML-20260920-0012', 'farmer4@marketlink.vn', 'Chợ Bà Chiểu', 2, 'cancelled', NULL
     ) x
JOIN users cust ON cust.email = 'customer@marketlink.vn'
JOIN users u ON u.email = x.email
JOIN farmer_profiles f ON f.user_id = u.id
JOIN farmer_markets fm ON fm.farmer_id = f.id
JOIN markets m ON m.id = fm.market_id AND m.market_name = x.market_name
ON DUPLICATE KEY UPDATE customer_id = cust.id, farmer_id = f.id, market_id = m.id, slot_id = NULL,
                        pickup_date = DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR) - INTERVAL x.days_ago DAY,
                        pickup_start = '08:00:00', pickup_end = '09:00:00',
                        cutoff_at = TIMESTAMP(DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR) - INTERVAL x.days_ago DAY, '08:00:00')
                                     - INTERVAL f.order_cutoff_hours HOUR,
                        status = x.status, customer_note = NULL, farmer_note = x.farmer_note, total_amount = 0,
                        created_at = TIMESTAMP(DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR) - INTERVAL (x.days_ago + 2) DAY, '08:00:00')
                                     - INTERVAL 7 HOUR;

-- order_items (FR-034): 2–3 products per order, a snapshot of the products' current name/unit/price. The natural
-- key is uq_order_product (order_id, product_id), so the upsert holds on to it.
INSERT INTO order_items (order_id, product_id, product_name, unit_price, unit, quantity, subtotal)
SELECT o.id, p.id, p.name, p.price, p.unit, oi.quantity, p.price * oi.quantity
FROM (
      SELECT 'ML-20260920-0001' AS order_code, 'Rau muống' AS product_name, 3 AS quantity
      UNION ALL SELECT 'ML-20260920-0001', 'Cải ngọt', 2
      UNION ALL SELECT 'ML-20260920-0002', 'Cam sành', 2
      UNION ALL SELECT 'ML-20260920-0002', 'Xoài cát Hoà Lộc', 1
      UNION ALL SELECT 'ML-20260920-0002', 'Đu đủ', 3
      UNION ALL SELECT 'ML-20260920-0003', 'Rau dền', 2
      UNION ALL SELECT 'ML-20260920-0003', 'Mồng tơi', 3
      UNION ALL SELECT 'ML-20260920-0004', 'Khoai lang mật', 2
      UNION ALL SELECT 'ML-20260920-0004', 'Cà rốt', 3
      UNION ALL SELECT 'ML-20260920-0004', 'Gừng tươi', 1
      UNION ALL SELECT 'ML-20260920-0005', 'Bưởi da xanh', 2
      UNION ALL SELECT 'ML-20260920-0005', 'Chuối sứ', 2
      UNION ALL SELECT 'ML-20260920-0006', 'Củ dền', 2
      UNION ALL SELECT 'ML-20260920-0006', 'Khoai môn', 1
      UNION ALL SELECT 'ML-20260920-0006', 'Củ cải trắng', 3
      UNION ALL SELECT 'ML-20260920-0007', 'Rau muống', 2
      UNION ALL SELECT 'ML-20260920-0007', 'Rau lang', 2
      UNION ALL SELECT 'ML-20260920-0008', 'Xoài cát Hoà Lộc', 1
      UNION ALL SELECT 'ML-20260920-0008', 'Cam sành', 3
      UNION ALL SELECT 'ML-20260920-0009', 'Cà rốt', 2
      UNION ALL SELECT 'ML-20260920-0009', 'Khoai lang mật', 2
      UNION ALL SELECT 'ML-20260920-0009', 'Củ dền', 1
      UNION ALL SELECT 'ML-20260920-0010', 'Cải ngọt', 3
      UNION ALL SELECT 'ML-20260920-0010', 'Mồng tơi', 2
      UNION ALL SELECT 'ML-20260920-0011', 'Đu đủ', 2
      UNION ALL SELECT 'ML-20260920-0011', 'Bưởi da xanh', 1
      UNION ALL SELECT 'ML-20260920-0012', 'Gừng tươi', 1
      UNION ALL SELECT 'ML-20260920-0012', 'Củ cải trắng', 2
     ) oi
JOIN orders o ON o.order_code = oi.order_code
JOIN products p ON p.farmer_id = o.farmer_id AND p.name = oi.product_name
ON DUPLICATE KEY UPDATE product_name = p.name, unit_price = p.price, unit = p.unit,
                        quantity = oi.quantity, subtotal = p.price * oi.quantity;

-- total_amount = the sum of the order_items subtotals — recomputed in SQL, not typed by hand.
UPDATE orders o
JOIN (SELECT order_id, SUM(subtotal) AS total FROM order_items GROUP BY order_id) t ON t.order_id = o.id
SET o.total_amount = t.total
WHERE o.order_code LIKE 'ML-20260920-%';

-- order_status_history (FR-038): the table has no natural key, so delete the rows of exactly the 12 seed orders
-- and write the full chains again — rerunning `make seed` does not duplicate them, and it also clears the
-- "accepted" row the demo API (Steps 2/3 of the task) may add to a placed order when an examiner/QA tries
-- accepting it.
DELETE h FROM order_status_history h
JOIN orders o ON o.id = h.order_id
WHERE o.order_code LIKE 'ML-20260920-%';

-- Chains for the 6 running orders (placed/accepted/ready): timestamps step back from now (UTC_TIMESTAMP, the
-- same way the other TIMESTAMP columns in this file are read/written — see C5-15). changed_by: the customer
-- for the "placed" step, the farmer (the order's stall owner) for the accept/ready steps.
INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, note, changed_at)
SELECT o.id, spec.from_status, spec.to_status,
       CASE spec.actor WHEN 'customer' THEN cust.id ELSE fu.id END,
       spec.note, UTC_TIMESTAMP() - INTERVAL spec.days_before_now DAY
FROM (
      SELECT 'ML-20260920-0001' AS order_code, NULL AS from_status, 'placed' AS to_status, 'customer' AS actor, 1 AS days_before_now, NULL AS note
      UNION ALL SELECT 'ML-20260920-0002', NULL, 'placed', 'customer', 1, NULL
      UNION ALL SELECT 'ML-20260920-0003', NULL, 'placed', 'customer', 2, NULL
      UNION ALL SELECT 'ML-20260920-0003', 'placed', 'accepted', 'farmer', 1, NULL
      UNION ALL SELECT 'ML-20260920-0004', NULL, 'placed', 'customer', 2, NULL
      UNION ALL SELECT 'ML-20260920-0004', 'placed', 'accepted', 'farmer', 1, NULL
      UNION ALL SELECT 'ML-20260920-0005', NULL, 'placed', 'customer', 3, NULL
      UNION ALL SELECT 'ML-20260920-0005', 'placed', 'accepted', 'farmer', 2, NULL
      UNION ALL SELECT 'ML-20260920-0005', 'accepted', 'ready', 'farmer', 1, NULL
      UNION ALL SELECT 'ML-20260920-0006', NULL, 'placed', 'customer', 3, NULL
      UNION ALL SELECT 'ML-20260920-0006', 'placed', 'accepted', 'farmer', 2, NULL
      UNION ALL SELECT 'ML-20260920-0006', 'accepted', 'ready', 'farmer', 1, NULL
     ) spec
JOIN orders o ON o.order_code = spec.order_code
JOIN users cust ON cust.email = 'customer@marketlink.vn'
JOIN farmer_profiles f ON f.id = o.farmer_id
JOIN users fu ON fu.id = f.user_id;

-- Chains for the 6 past orders (completed/declined/cancelled): timestamps follow each order's real
-- pickup_date (written by the insert orders step) so the chain always comes before the pickup day, even when
-- the seed runs on another day.
-- M-4: time_of_day is Vietnam time (matching pickup_start/pickup_end, TIME is never converted) but changed_at
-- is a TIMESTAMP column (session UTC) — subtract 7 hours before writing, or the API reads it back 7 hours late.
INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, note, changed_at)
SELECT o.id, spec.from_status, spec.to_status,
       CASE spec.actor WHEN 'customer' THEN cust.id ELSE fu.id END,
       spec.note,
       TIMESTAMP(o.pickup_date + INTERVAL spec.day_delta DAY, spec.time_of_day) - INTERVAL 7 HOUR
FROM (
      SELECT 'ML-20260920-0007' AS order_code, NULL AS from_status, 'placed' AS to_status, 'customer' AS actor, -2 AS day_delta, '08:00:00' AS time_of_day, NULL AS note
      UNION ALL SELECT 'ML-20260920-0007', 'placed', 'accepted', 'farmer', -1, '09:00:00', NULL
      UNION ALL SELECT 'ML-20260920-0007', 'accepted', 'ready', 'farmer', 0, '07:30:00', NULL
      UNION ALL SELECT 'ML-20260920-0007', 'ready', 'completed', 'farmer', 0, '08:30:00', NULL
      UNION ALL SELECT 'ML-20260920-0008', NULL, 'placed', 'customer', -2, '08:00:00', NULL
      UNION ALL SELECT 'ML-20260920-0008', 'placed', 'accepted', 'farmer', -1, '09:00:00', NULL
      UNION ALL SELECT 'ML-20260920-0008', 'accepted', 'ready', 'farmer', 0, '07:30:00', NULL
      UNION ALL SELECT 'ML-20260920-0008', 'ready', 'completed', 'farmer', 0, '08:30:00', NULL
      UNION ALL SELECT 'ML-20260920-0009', NULL, 'placed', 'customer', -2, '08:00:00', NULL
      UNION ALL SELECT 'ML-20260920-0009', 'placed', 'accepted', 'farmer', -1, '09:00:00', NULL
      UNION ALL SELECT 'ML-20260920-0009', 'accepted', 'ready', 'farmer', 0, '07:30:00', NULL
      UNION ALL SELECT 'ML-20260920-0009', 'ready', 'completed', 'farmer', 0, '08:30:00', NULL
      UNION ALL SELECT 'ML-20260920-0010', NULL, 'placed', 'customer', -2, '08:00:00', NULL
      UNION ALL SELECT 'ML-20260920-0010', 'placed', 'accepted', 'farmer', -1, '09:00:00', NULL
      UNION ALL SELECT 'ML-20260920-0010', 'accepted', 'ready', 'farmer', 0, '07:30:00', NULL
      UNION ALL SELECT 'ML-20260920-0010', 'ready', 'completed', 'farmer', 0, '08:30:00', NULL
      UNION ALL SELECT 'ML-20260920-0011', NULL, 'placed', 'customer', -2, '08:00:00', NULL
      UNION ALL SELECT 'ML-20260920-0011', 'placed', 'declined', 'farmer', -1, '10:00:00', 'Vườn hết hàng đợt này, không đủ giao đúng hẹn.'
      UNION ALL SELECT 'ML-20260920-0012', NULL, 'placed', 'customer', -2, '08:00:00', NULL
      UNION ALL SELECT 'ML-20260920-0012', 'placed', 'accepted', 'farmer', -1, '09:00:00', NULL
      UNION ALL SELECT 'ML-20260920-0012', 'accepted', 'cancelled', 'customer', -1, '15:00:00', 'Khách huỷ đơn.'
     ) spec
JOIN orders o ON o.order_code = spec.order_code
JOIN users cust ON cust.email = 'customer@marketlink.vn'
JOIN farmer_profiles f ON f.id = o.farmer_id
JOIN users fu ON fu.id = f.user_id;

-- pickup_slots.booked_count (D-06): recomputed from the orders still holding a spot (placed/accepted/
-- ready/completed) for EVERY slot — cheap (768 rows) and self-correcting if an earlier run left it off (e.g.
-- an order moved to another slot because "today" changed between two seed runs).
UPDATE pickup_slots ps
LEFT JOIN (
      SELECT slot_id, COUNT(*) AS cnt
      FROM orders
      WHERE slot_id IS NOT NULL AND status IN ('placed', 'accepted', 'ready', 'completed')
      GROUP BY slot_id
     ) c ON c.slot_id = ps.id
SET ps.booked_count = COALESCE(c.cnt, 0);
