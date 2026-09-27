-- ==========================================================================================
-- MarketLink — EXTENDED SEED DATA: 6-month operational history
-- ==========================================================================================
-- Appended AFTER the base seed.sql. Run: make seed-full (or pipe this after seed.sql).
-- Simulates an app launched 6 months ago (≈ March 2026) with steady growth in users,
-- orders, revenue, reviews, chat, feedback and notifications.
-- Safe to run repeatedly — every INSERT uses ON DUPLICATE KEY or NOT EXISTS guards.
-- ==========================================================================================

SET NAMES utf8mb4;

-- Reuse the same bcrypt hash for Demo@1234
SET @pw := '$2y$10$QECyiDw14FWH42GLLZE9l.wmNFH4v8ZHLz.UORUBYw3xGS4iDsTtW';

-- ===== 1. ADDITIONAL USERS =====

-- 1.1 Second admin
INSERT INTO users (email, password_hash, role, full_name, phone, address, status, created_at) VALUES
  ('admin2@marketlink.vn', @pw, 'admin', 'Phạm Minh Quang', '0900000100',
   'Quận 3, TP. Hồ Chí Minh', 'active',
   UTC_TIMESTAMP() - INTERVAL 170 DAY)
AS new
ON DUPLICATE KEY UPDATE password_hash = new.password_hash, full_name = new.full_name,
                        phone = new.phone, role = new.role, status = new.status;

-- 1.2 Fifteen customers (registered over 6 months, staggered)
INSERT INTO users (email, password_hash, role, full_name, phone, address, status, created_at) VALUES
  ('customer2@marketlink.vn',  @pw, 'customer', 'Trần Thị Bích',    '0900000201', '45 Nguyễn Huệ, Quận 1',       'active',   UTC_TIMESTAMP() - INTERVAL 165 DAY),
  ('customer3@marketlink.vn',  @pw, 'customer', 'Lê Hoàng Nam',     '0900000202', '78 Lý Tự Trọng, Quận 1',      'active',   UTC_TIMESTAMP() - INTERVAL 150 DAY),
  ('customer4@marketlink.vn',  @pw, 'customer', 'Phạm Ngọc Anh',    '0900000203', '12 Võ Văn Tần, Quận 3',       'active',   UTC_TIMESTAMP() - INTERVAL 140 DAY),
  ('customer5@marketlink.vn',  @pw, 'customer', 'Nguyễn Đức Minh',  '0900000204', '90 Cách Mạng Tháng 8, Quận 3','active',   UTC_TIMESTAMP() - INTERVAL 130 DAY),
  ('customer6@marketlink.vn',  @pw, 'customer', 'Hoàng Thị Lan',    '0900000205', '34 Điện Biên Phủ, Bình Thạnh','active',   UTC_TIMESTAMP() - INTERVAL 120 DAY),
  ('customer7@marketlink.vn',  @pw, 'customer', 'Vũ Thanh Tùng',    '0900000206', '56 Nguyễn Thị Minh Khai, Q1', 'active',   UTC_TIMESTAMP() - INTERVAL 110 DAY),
  ('customer8@marketlink.vn',  @pw, 'customer', 'Đỗ Minh Châu',     '0900000207', '23 Hai Bà Trưng, Quận 1',     'active',   UTC_TIMESTAMP() - INTERVAL 100 DAY),
  ('customer9@marketlink.vn',  @pw, 'customer', 'Bùi Thị Hồng',     '0900000208', '67 Phan Đình Phùng, Phú Nhuận','active',  UTC_TIMESTAMP() - INTERVAL 90 DAY),
  ('customer10@marketlink.vn', @pw, 'customer', 'Trương Văn Đạt',   '0900000209', '101 Nguyễn Văn Trỗi, Phú Nhuận','active', UTC_TIMESTAMP() - INTERVAL 80 DAY),
  ('customer11@marketlink.vn', @pw, 'customer', 'Lý Thị Mai',       '0900000210', '8 Lê Duẩn, Quận 1',           'active',   UTC_TIMESTAMP() - INTERVAL 70 DAY),
  ('customer12@marketlink.vn', @pw, 'customer', 'Ngô Quốc Bảo',     '0900000211', '45 Trần Hưng Đạo, Quận 5',   'active',   UTC_TIMESTAMP() - INTERVAL 60 DAY),
  ('customer13@marketlink.vn', @pw, 'customer', 'Mai Thanh Hà',      '0900000212', '19 Sương Nguyệt Ánh, Quận 1', 'active',   UTC_TIMESTAMP() - INTERVAL 45 DAY),
  ('customer14@marketlink.vn', @pw, 'customer', 'Đặng Hữu Phước',   '0900000213', '72 Nguyễn Đình Chiểu, Quận 3','active',   UTC_TIMESTAMP() - INTERVAL 30 DAY),
  ('customer15@marketlink.vn', @pw, 'customer', 'Cao Thị Tuyết',     '0900000214', '33 Pasteur, Quận 1',          'active',   UTC_TIMESTAMP() - INTERVAL 15 DAY),
  ('customer16@marketlink.vn', @pw, 'customer', 'Phan Văn Hùng',     '0900000215', '88 Bùi Viện, Quận 1',         'inactive', UTC_TIMESTAMP() - INTERVAL 50 DAY)
AS new
ON DUPLICATE KEY UPDATE password_hash = new.password_hash, full_name = new.full_name,
                        phone = new.phone, role = new.role, status = new.status;

-- 1.3 One pending farmer application (to demo admin approval queue)
INSERT INTO users (email, password_hash, role, full_name, phone, address, status, created_at) VALUES
  ('farmer-pending@marketlink.vn', @pw, 'farmer', 'Trịnh Văn Tài', '0900000301',
   'Hóc Môn, TP. Hồ Chí Minh', 'active', UTC_TIMESTAMP() - INTERVAL 3 DAY)
AS new
ON DUPLICATE KEY UPDATE password_hash = new.password_hash, full_name = new.full_name;

INSERT INTO farmer_profiles (user_id, stall_name, contact_person, description, order_cutoff_hours,
                             approval_status)
SELECT u.id, 'Rau sạch Tài Hóc Môn', u.full_name,
       'Rau ăn lá trồng theo tiêu chuẩn VietGAP ở Hóc Môn, giao sáng sớm.', 12, 'pending'
FROM users u WHERE u.email = 'farmer-pending@marketlink.vn'
ON DUPLICATE KEY UPDATE stall_name = 'Rau sạch Tài Hóc Môn', approval_status = 'pending';

-- ===== 2. HISTORICAL ORDERS (6 months of data for charts) =====

-- Helper: delete any previously seeded historical orders (ML-HIST-*) to allow re-run
DELETE h FROM order_status_history h
JOIN orders o ON o.id = h.order_id
WHERE o.order_code LIKE 'ML-HIST-%';

DELETE r FROM reviews r
JOIN orders o ON o.id = r.order_id
WHERE o.order_code LIKE 'ML-HIST-%';

DELETE oi FROM order_items oi
JOIN orders o ON o.id = oi.order_id
WHERE o.order_code LIKE 'ML-HIST-%';

DELETE FROM orders WHERE order_code LIKE 'ML-HIST-%';

-- Month 1: 12 completed orders (app just launched, few users)
INSERT INTO orders (order_code, customer_id, farmer_id, market_id, slot_id, pickup_date, pickup_start,
                    pickup_end, cutoff_at, total_amount, status, created_at)
SELECT x.code, c.id, f.id, m.id, NULL,
       DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR) - INTERVAL x.days_ago DAY,
       '08:00:00', '09:00:00',
       TIMESTAMP(DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR) - INTERVAL x.days_ago DAY, '08:00:00') - INTERVAL fp.order_cutoff_hours HOUR,
       x.total, x.status,
       TIMESTAMP(DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR) - INTERVAL (x.days_ago + 2) DAY, '08:00:00') - INTERVAL 7 HOUR
FROM (
  SELECT 'ML-HIST-0001' AS code, 'customer@marketlink.vn' AS cust, 'farmer@marketlink.vn' AS farm, 'Chợ Bà Chiểu' AS mkt, 175 AS days_ago, 66000.00 AS total, 'completed' AS status
  UNION ALL SELECT 'ML-HIST-0002', 'customer@marketlink.vn', 'farmer2@marketlink.vn', 'Chợ Bến Thành', 173, 185000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0003', 'customer2@marketlink.vn', 'farmer@marketlink.vn', 'Chợ Bà Chiểu', 170, 54000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0004', 'customer@marketlink.vn', 'farmer4@marketlink.vn', 'Chợ Bà Chiểu', 168, 121000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0005', 'customer2@marketlink.vn', 'farmer6@marketlink.vn', 'Chợ Thảo Điền', 166, 165000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0006', 'customer3@marketlink.vn', 'farmer@marketlink.vn', 'Chợ Thảo Điền', 163, 48000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0007', 'customer@marketlink.vn', 'farmer8@marketlink.vn', 'Chợ Tân Định', 161, 135000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0008', 'customer2@marketlink.vn', 'farmer2@marketlink.vn', 'Chợ Tân Định', 158, 95000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0009', 'customer3@marketlink.vn', 'farmer5@marketlink.vn', 'Chợ Tân Định', 156, 40000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0010', 'customer@marketlink.vn', 'farmer9@marketlink.vn', 'Chợ Thảo Điền', 153, 220000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0011', 'customer2@marketlink.vn', 'farmer7@marketlink.vn', 'Chợ Bà Chiểu', 151, 87000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0012', 'customer3@marketlink.vn', 'farmer10@marketlink.vn', 'Chợ Bến Thành', 148, 250000.00, 'completed'
) x
JOIN users c ON c.email = x.cust
JOIN users u ON u.email = x.farm
JOIN farmer_profiles f ON f.user_id = u.id
JOIN farmer_profiles fp ON fp.user_id = u.id
JOIN farmer_markets fm ON fm.farmer_id = f.id
JOIN markets m ON m.id = fm.market_id AND m.market_name = x.mkt;

-- Month 2: 18 orders (growing)
INSERT INTO orders (order_code, customer_id, farmer_id, market_id, slot_id, pickup_date, pickup_start,
                    pickup_end, cutoff_at, total_amount, status, created_at)
SELECT x.code, c.id, f.id, m.id, NULL,
       DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR) - INTERVAL x.days_ago DAY,
       '08:00:00', '09:00:00',
       TIMESTAMP(DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR) - INTERVAL x.days_ago DAY, '08:00:00') - INTERVAL fp.order_cutoff_hours HOUR,
       x.total, x.status,
       TIMESTAMP(DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR) - INTERVAL (x.days_ago + 2) DAY, '08:00:00') - INTERVAL 7 HOUR
FROM (
  SELECT 'ML-HIST-0013' AS code, 'customer@marketlink.vn' AS cust, 'farmer@marketlink.vn' AS farm, 'Chợ Bà Chiểu' AS mkt, 145 AS days_ago, 72000.00 AS total, 'completed' AS status
  UNION ALL SELECT 'ML-HIST-0014', 'customer4@marketlink.vn', 'farmer2@marketlink.vn', 'Chợ Bến Thành', 143, 130000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0015', 'customer2@marketlink.vn', 'farmer3@marketlink.vn', 'Chợ Thảo Điền', 141, 102000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0016', 'customer5@marketlink.vn', 'farmer@marketlink.vn', 'Chợ Thảo Điền', 139, 36000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0017', 'customer3@marketlink.vn', 'farmer4@marketlink.vn', 'Chợ Bến Thành', 137, 96000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0018', 'customer@marketlink.vn', 'farmer6@marketlink.vn', 'Chợ Bến Thành', 135, 155000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0019', 'customer4@marketlink.vn', 'farmer5@marketlink.vn', 'Chợ Tân Định', 133, 48000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0020', 'customer2@marketlink.vn', 'farmer8@marketlink.vn', 'Chợ Tân Định', 131, 110000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0021', 'customer5@marketlink.vn', 'farmer9@marketlink.vn', 'Chợ Thảo Điền', 129, 280000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0022', 'customer3@marketlink.vn', 'farmer7@marketlink.vn', 'Chợ Bà Chiểu', 127, 142000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0023', 'customer@marketlink.vn', 'farmer10@marketlink.vn', 'Chợ Tân Định', 125, 430000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0024', 'customer4@marketlink.vn', 'farmer@marketlink.vn', 'Chợ Bà Chiểu', 123, 60000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0025', 'customer2@marketlink.vn', 'farmer6@marketlink.vn', 'Chợ Thảo Điền', 121, 100000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0026', 'customer5@marketlink.vn', 'farmer2@marketlink.vn', 'Chợ Bến Thành', 119, 150000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0027', 'customer3@marketlink.vn', 'farmer@marketlink.vn', 'Chợ Thảo Điền', 117, 42000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0028', 'customer@marketlink.vn', 'farmer4@marketlink.vn', 'Chợ Bà Chiểu', 115, 85000.00, 'declined'
  UNION ALL SELECT 'ML-HIST-0029', 'customer4@marketlink.vn', 'farmer8@marketlink.vn', 'Chợ Bà Chiểu', 113, 90000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0030', 'customer2@marketlink.vn', 'farmer3@marketlink.vn', 'Chợ Thảo Điền', 111, 57000.00, 'cancelled'
) x
JOIN users c ON c.email = x.cust
JOIN users u ON u.email = x.farm
JOIN farmer_profiles f ON f.user_id = u.id
JOIN farmer_profiles fp ON fp.user_id = u.id
JOIN farmer_markets fm ON fm.farmer_id = f.id
JOIN markets m ON m.id = fm.market_id AND m.market_name = x.mkt;

-- Month 3: 25 orders
INSERT INTO orders (order_code, customer_id, farmer_id, market_id, slot_id, pickup_date, pickup_start,
                    pickup_end, cutoff_at, total_amount, status, created_at)
SELECT x.code, c.id, f.id, m.id, NULL,
       DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR) - INTERVAL x.days_ago DAY,
       '08:00:00', '09:00:00',
       TIMESTAMP(DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR) - INTERVAL x.days_ago DAY, '08:00:00') - INTERVAL fp.order_cutoff_hours HOUR,
       x.total, x.status,
       TIMESTAMP(DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR) - INTERVAL (x.days_ago + 2) DAY, '08:00:00') - INTERVAL 7 HOUR
FROM (
  SELECT 'ML-HIST-0031' AS code, 'customer@marketlink.vn' AS cust, 'farmer@marketlink.vn' AS farm, 'Chợ Bà Chiểu' AS mkt, 108 AS days_ago, 78000.00 AS total, 'completed' AS status
  UNION ALL SELECT 'ML-HIST-0032', 'customer6@marketlink.vn', 'farmer2@marketlink.vn', 'Chợ Bến Thành', 106, 195000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0033', 'customer4@marketlink.vn', 'farmer3@marketlink.vn', 'Chợ Thảo Điền', 105, 45000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0034', 'customer7@marketlink.vn', 'farmer4@marketlink.vn', 'Chợ Bà Chiểu', 103, 140000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0035', 'customer5@marketlink.vn', 'farmer5@marketlink.vn', 'Chợ Tân Định', 101, 32000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0036', 'customer6@marketlink.vn', 'farmer6@marketlink.vn', 'Chợ Bến Thành', 99, 225000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0037', 'customer@marketlink.vn', 'farmer7@marketlink.vn', 'Chợ Bà Chiểu', 97, 103000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0038', 'customer7@marketlink.vn', 'farmer8@marketlink.vn', 'Chợ Tân Định', 95, 85000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0039', 'customer3@marketlink.vn', 'farmer9@marketlink.vn', 'Chợ Thảo Điền', 93, 180000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0040', 'customer4@marketlink.vn', 'farmer10@marketlink.vn', 'Chợ Bến Thành', 92, 250000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0041', 'customer6@marketlink.vn', 'farmer@marketlink.vn', 'Chợ Thảo Điền', 90, 54000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0042', 'customer@marketlink.vn', 'farmer2@marketlink.vn', 'Chợ Tân Định', 88, 170000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0043', 'customer7@marketlink.vn', 'farmer4@marketlink.vn', 'Chợ Bến Thành', 86, 60000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0044', 'customer5@marketlink.vn', 'farmer6@marketlink.vn', 'Chợ Thảo Điền', 85, 135000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0045', 'customer3@marketlink.vn', 'farmer@marketlink.vn', 'Chợ Bà Chiểu', 83, 36000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0046', 'customer6@marketlink.vn', 'farmer5@marketlink.vn', 'Chợ Tân Định', 82, 24000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0047', 'customer@marketlink.vn', 'farmer8@marketlink.vn', 'Chợ Bà Chiểu', 80, 90000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0048', 'customer7@marketlink.vn', 'farmer3@marketlink.vn', 'Chợ Thảo Điền', 79, 57000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0049', 'customer4@marketlink.vn', 'farmer9@marketlink.vn', 'Chợ Thảo Điền', 78, 60000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0050', 'customer5@marketlink.vn', 'farmer7@marketlink.vn', 'Chợ Bà Chiểu', 77, 55000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0051', 'customer6@marketlink.vn', 'farmer10@marketlink.vn', 'Chợ Tân Định', 76, 180000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0052', 'customer@marketlink.vn', 'farmer@marketlink.vn', 'Chợ Thảo Điền', 75, 30000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0053', 'customer7@marketlink.vn', 'farmer2@marketlink.vn', 'Chợ Bến Thành', 74, 65000.00, 'cancelled'
  UNION ALL SELECT 'ML-HIST-0054', 'customer3@marketlink.vn', 'farmer4@marketlink.vn', 'Chợ Bà Chiểu', 73, 45000.00, 'declined'
  UNION ALL SELECT 'ML-HIST-0055', 'customer4@marketlink.vn', 'farmer6@marketlink.vn', 'Chợ Bến Thành', 72, 200000.00, 'completed'
) x
JOIN users c ON c.email = x.cust
JOIN users u ON u.email = x.farm
JOIN farmer_profiles f ON f.user_id = u.id
JOIN farmer_profiles fp ON fp.user_id = u.id
JOIN farmer_markets fm ON fm.farmer_id = f.id
JOIN markets m ON m.id = fm.market_id AND m.market_name = x.mkt;

-- Month 4: 30 orders
INSERT INTO orders (order_code, customer_id, farmer_id, market_id, slot_id, pickup_date, pickup_start,
                    pickup_end, cutoff_at, total_amount, status, created_at)
SELECT x.code, c.id, f.id, m.id, NULL,
       DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR) - INTERVAL x.days_ago DAY,
       '08:00:00', '09:00:00',
       TIMESTAMP(DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR) - INTERVAL x.days_ago DAY, '08:00:00') - INTERVAL fp.order_cutoff_hours HOUR,
       x.total, x.status,
       TIMESTAMP(DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR) - INTERVAL (x.days_ago + 2) DAY, '08:00:00') - INTERVAL 7 HOUR
FROM (
  SELECT 'ML-HIST-0056' AS code, 'customer8@marketlink.vn' AS cust, 'farmer@marketlink.vn' AS farm, 'Chợ Bà Chiểu' AS mkt, 70 AS days_ago, 84000.00 AS total, 'completed' AS status
  UNION ALL SELECT 'ML-HIST-0057', 'customer@marketlink.vn', 'farmer2@marketlink.vn', 'Chợ Bến Thành', 69, 150000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0058', 'customer9@marketlink.vn', 'farmer3@marketlink.vn', 'Chợ Thảo Điền', 68, 90000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0059', 'customer8@marketlink.vn', 'farmer4@marketlink.vn', 'Chợ Bà Chiểu', 67, 56000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0060', 'customer6@marketlink.vn', 'farmer5@marketlink.vn', 'Chợ Tân Định', 66, 40000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0061', 'customer7@marketlink.vn', 'farmer6@marketlink.vn', 'Chợ Thảo Điền', 65, 195000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0062', 'customer@marketlink.vn', 'farmer7@marketlink.vn', 'Chợ Bà Chiểu', 64, 87000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0063', 'customer9@marketlink.vn', 'farmer8@marketlink.vn', 'Chợ Tân Định', 63, 45000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0064', 'customer8@marketlink.vn', 'farmer9@marketlink.vn', 'Chợ Thảo Điền', 62, 100000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0065', 'customer5@marketlink.vn', 'farmer10@marketlink.vn', 'Chợ Bến Thành', 61, 470000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0066', 'customer10@marketlink.vn', 'farmer@marketlink.vn', 'Chợ Thảo Điền', 60, 66000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0067', 'customer@marketlink.vn', 'farmer4@marketlink.vn', 'Chợ Bến Thành', 59, 128000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0068', 'customer9@marketlink.vn', 'farmer2@marketlink.vn', 'Chợ Tân Định', 58, 85000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0069', 'customer10@marketlink.vn', 'farmer6@marketlink.vn', 'Chợ Bến Thành', 57, 165000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0070', 'customer8@marketlink.vn', 'farmer@marketlink.vn', 'Chợ Bà Chiểu', 56, 42000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0071', 'customer6@marketlink.vn', 'farmer3@marketlink.vn', 'Chợ Thảo Điền', 55, 57000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0072', 'customer@marketlink.vn', 'farmer5@marketlink.vn', 'Chợ Tân Định', 54, 24000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0073', 'customer10@marketlink.vn', 'farmer8@marketlink.vn', 'Chợ Bà Chiểu', 53, 135000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0074', 'customer7@marketlink.vn', 'farmer9@marketlink.vn', 'Chợ Thảo Điền', 52, 220000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0075', 'customer5@marketlink.vn', 'farmer@marketlink.vn', 'Chợ Bà Chiểu', 51, 48000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0076', 'customer8@marketlink.vn', 'farmer7@marketlink.vn', 'Chợ Bà Chiểu', 50, 55000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0077', 'customer9@marketlink.vn', 'farmer10@marketlink.vn', 'Chợ Tân Định', 49, 250000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0078', 'customer@marketlink.vn', 'farmer6@marketlink.vn', 'Chợ Thảo Điền', 48, 100000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0079', 'customer10@marketlink.vn', 'farmer2@marketlink.vn', 'Chợ Bến Thành', 47, 65000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0080', 'customer6@marketlink.vn', 'farmer4@marketlink.vn', 'Chợ Bà Chiểu', 46, 75000.00, 'declined'
  UNION ALL SELECT 'ML-HIST-0081', 'customer7@marketlink.vn', 'farmer@marketlink.vn', 'Chợ Thảo Điền', 45, 30000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0082', 'customer8@marketlink.vn', 'farmer5@marketlink.vn', 'Chợ Tân Định', 44, 16000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0083', 'customer9@marketlink.vn', 'farmer3@marketlink.vn', 'Chợ Thảo Điền', 43, 140000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0084', 'customer@marketlink.vn', 'farmer8@marketlink.vn', 'Chợ Tân Định', 42, 45000.00, 'cancelled'
  UNION ALL SELECT 'ML-HIST-0085', 'customer10@marketlink.vn', 'farmer@marketlink.vn', 'Chợ Bà Chiểu', 41, 60000.00, 'completed'
) x
JOIN users c ON c.email = x.cust
JOIN users u ON u.email = x.farm
JOIN farmer_profiles f ON f.user_id = u.id
JOIN farmer_profiles fp ON fp.user_id = u.id
JOIN farmer_markets fm ON fm.farmer_id = f.id
JOIN markets m ON m.id = fm.market_id AND m.market_name = x.mkt;

-- Month 5+6: 55 orders (recent, strong growth)
INSERT INTO orders (order_code, customer_id, farmer_id, market_id, slot_id, pickup_date, pickup_start,
                    pickup_end, cutoff_at, total_amount, status, created_at)
SELECT x.code, c.id, f.id, m.id, NULL,
       DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR) - INTERVAL x.days_ago DAY,
       '08:00:00', '09:00:00',
       TIMESTAMP(DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR) - INTERVAL x.days_ago DAY, '08:00:00') - INTERVAL fp.order_cutoff_hours HOUR,
       x.total, x.status,
       TIMESTAMP(DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR) - INTERVAL (x.days_ago + 1) DAY, '10:00:00') - INTERVAL 7 HOUR
FROM (
  SELECT 'ML-HIST-0086' AS code, 'customer11@marketlink.vn' AS cust, 'farmer@marketlink.vn' AS farm, 'Chợ Bà Chiểu' AS mkt, 39 AS days_ago, 90000.00 AS total, 'completed' AS status
  UNION ALL SELECT 'ML-HIST-0087', 'customer@marketlink.vn', 'farmer2@marketlink.vn', 'Chợ Bến Thành', 38, 185000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0088', 'customer12@marketlink.vn', 'farmer3@marketlink.vn', 'Chợ Thảo Điền', 38, 102000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0089', 'customer11@marketlink.vn', 'farmer4@marketlink.vn', 'Chợ Bến Thành', 37, 75000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0090', 'customer8@marketlink.vn', 'farmer5@marketlink.vn', 'Chợ Tân Định', 37, 48000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0091', 'customer9@marketlink.vn', 'farmer6@marketlink.vn', 'Chợ Thảo Điền', 36, 165000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0092', 'customer12@marketlink.vn', 'farmer7@marketlink.vn', 'Chợ Bà Chiểu', 36, 87000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0093', 'customer10@marketlink.vn', 'farmer8@marketlink.vn', 'Chợ Tân Định', 35, 45000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0094', 'customer@marketlink.vn', 'farmer9@marketlink.vn', 'Chợ Thảo Điền', 35, 260000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0095', 'customer11@marketlink.vn', 'farmer10@marketlink.vn', 'Chợ Bến Thành', 34, 430000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0096', 'customer6@marketlink.vn', 'farmer@marketlink.vn', 'Chợ Thảo Điền', 34, 36000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0097', 'customer12@marketlink.vn', 'farmer2@marketlink.vn', 'Chợ Tân Định', 33, 130000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0098', 'customer7@marketlink.vn', 'farmer4@marketlink.vn', 'Chợ Bà Chiểu', 33, 96000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0099', 'customer@marketlink.vn', 'farmer6@marketlink.vn', 'Chợ Bến Thành', 32, 200000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0100', 'customer13@marketlink.vn', 'farmer@marketlink.vn', 'Chợ Bà Chiểu', 32, 54000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0101', 'customer11@marketlink.vn', 'farmer3@marketlink.vn', 'Chợ Thảo Điền', 31, 45000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0102', 'customer8@marketlink.vn', 'farmer8@marketlink.vn', 'Chợ Bà Chiểu', 31, 90000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0103', 'customer12@marketlink.vn', 'farmer5@marketlink.vn', 'Chợ Tân Định', 30, 32000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0104', 'customer9@marketlink.vn', 'farmer7@marketlink.vn', 'Chợ Bà Chiểu', 30, 110000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0105', 'customer@marketlink.vn', 'farmer@marketlink.vn', 'Chợ Bà Chiểu', 29, 66000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0106', 'customer13@marketlink.vn', 'farmer2@marketlink.vn', 'Chợ Bến Thành', 29, 95000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0107', 'customer14@marketlink.vn', 'farmer9@marketlink.vn', 'Chợ Thảo Điền', 28, 180000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0108', 'customer11@marketlink.vn', 'farmer4@marketlink.vn', 'Chợ Bà Chiểu', 28, 128000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0109', 'customer6@marketlink.vn', 'farmer6@marketlink.vn', 'Chợ Thảo Điền', 27, 135000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0110', 'customer@marketlink.vn', 'farmer10@marketlink.vn', 'Chợ Tân Định', 27, 250000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0111', 'customer12@marketlink.vn', 'farmer@marketlink.vn', 'Chợ Thảo Điền', 26, 48000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0112', 'customer7@marketlink.vn', 'farmer3@marketlink.vn', 'Chợ Thảo Điền', 26, 57000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0113', 'customer13@marketlink.vn', 'farmer8@marketlink.vn', 'Chợ Tân Định', 25, 135000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0114', 'customer8@marketlink.vn', 'farmer5@marketlink.vn', 'Chợ Tân Định', 25, 24000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0115', 'customer9@marketlink.vn', 'farmer@marketlink.vn', 'Chợ Bà Chiểu', 24, 42000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0116', 'customer11@marketlink.vn', 'farmer7@marketlink.vn', 'Chợ Bà Chiểu', 24, 55000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0117', 'customer@marketlink.vn', 'farmer4@marketlink.vn', 'Chợ Bến Thành', 23, 60000.00, 'cancelled'
  UNION ALL SELECT 'ML-HIST-0118', 'customer12@marketlink.vn', 'farmer6@marketlink.vn', 'Chợ Bến Thành', 23, 100000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0119', 'customer13@marketlink.vn', 'farmer2@marketlink.vn', 'Chợ Tân Định', 22, 170000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0120', 'customer14@marketlink.vn', 'farmer9@marketlink.vn', 'Chợ Thảo Điền', 22, 40000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0121', 'customer6@marketlink.vn', 'farmer@marketlink.vn', 'Chợ Bà Chiểu', 21, 30000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0122', 'customer@marketlink.vn', 'farmer8@marketlink.vn', 'Chợ Bà Chiểu', 21, 45000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0123', 'customer15@marketlink.vn', 'farmer10@marketlink.vn', 'Chợ Bến Thành', 20, 500000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0124', 'customer13@marketlink.vn', 'farmer3@marketlink.vn', 'Chợ Thảo Điền', 20, 102000.00, 'declined'
  UNION ALL SELECT 'ML-HIST-0125', 'customer7@marketlink.vn', 'farmer5@marketlink.vn', 'Chợ Tân Định', 19, 16000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0126', 'customer14@marketlink.vn', 'farmer@marketlink.vn', 'Chợ Bà Chiểu', 18, 78000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0127', 'customer@marketlink.vn', 'farmer2@marketlink.vn', 'Chợ Bến Thành', 17, 195000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0128', 'customer11@marketlink.vn', 'farmer6@marketlink.vn', 'Chợ Thảo Điền', 16, 165000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0129', 'customer15@marketlink.vn', 'farmer7@marketlink.vn', 'Chợ Bà Chiểu', 15, 103000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0130', 'customer9@marketlink.vn', 'farmer8@marketlink.vn', 'Chợ Tân Định', 14, 90000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0131', 'customer14@marketlink.vn', 'farmer9@marketlink.vn', 'Chợ Thảo Điền', 13, 180000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0132', 'customer@marketlink.vn', 'farmer10@marketlink.vn', 'Chợ Bến Thành', 12, 430000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0133', 'customer13@marketlink.vn', 'farmer@marketlink.vn', 'Chợ Thảo Điền', 11, 54000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0134', 'customer15@marketlink.vn', 'farmer4@marketlink.vn', 'Chợ Bà Chiểu', 10, 96000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0135', 'customer12@marketlink.vn', 'farmer6@marketlink.vn', 'Chợ Bến Thành', 9, 200000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0136', 'customer@marketlink.vn', 'farmer@marketlink.vn', 'Chợ Bà Chiểu', 8, 30000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0137', 'customer14@marketlink.vn', 'farmer2@marketlink.vn', 'Chợ Tân Định', 7, 65000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0138', 'customer15@marketlink.vn', 'farmer9@marketlink.vn', 'Chợ Thảo Điền', 5, 220000.00, 'completed'
  UNION ALL SELECT 'ML-HIST-0139', 'customer11@marketlink.vn', 'farmer@marketlink.vn', 'Chợ Bà Chiểu', 4, 72000.00, 'declined'
  UNION ALL SELECT 'ML-HIST-0140', 'customer12@marketlink.vn', 'farmer2@marketlink.vn', 'Chợ Tân Định', 3, 85000.00, 'cancelled'
) x
JOIN users c ON c.email = x.cust
JOIN users u ON u.email = x.farm
JOIN farmer_profiles f ON f.user_id = u.id
JOIN farmer_profiles fp ON fp.user_id = u.id
JOIN farmer_markets fm ON fm.farmer_id = f.id
JOIN markets m ON m.id = fm.market_id AND m.market_name = x.mkt;

-- ===== 3. ORDER STATUS HISTORY for all historical orders =====
INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, note, changed_at)
SELECT o.id, NULL, 'placed', o.customer_id, NULL, o.created_at
FROM orders o WHERE o.order_code LIKE 'ML-HIST-%';

INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, note, changed_at)
SELECT o.id, 'placed', 'accepted', fu.id, NULL, o.created_at + INTERVAL 4 HOUR
FROM orders o
JOIN farmer_profiles f ON f.id = o.farmer_id
JOIN users fu ON fu.id = f.user_id
WHERE o.order_code LIKE 'ML-HIST-%' AND o.status IN ('completed', 'ready', 'accepted', 'cancelled');

INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, note, changed_at)
SELECT o.id, 'accepted', 'ready', fu.id, NULL, o.created_at + INTERVAL 20 HOUR
FROM orders o
JOIN farmer_profiles f ON f.id = o.farmer_id
JOIN users fu ON fu.id = f.user_id
WHERE o.order_code LIKE 'ML-HIST-%' AND o.status IN ('completed', 'ready');

INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, note, changed_at)
SELECT o.id, 'ready', 'completed', fu.id, NULL,
       TIMESTAMP(o.pickup_date, '08:30:00') - INTERVAL 7 HOUR
FROM orders o
JOIN farmer_profiles f ON f.id = o.farmer_id
JOIN users fu ON fu.id = f.user_id
WHERE o.order_code LIKE 'ML-HIST-%' AND o.status = 'completed';

INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, note, changed_at)
SELECT o.id, 'placed', 'declined', fu.id, 'Hết hàng, không đủ giao.', o.created_at + INTERVAL 6 HOUR
FROM orders o
JOIN farmer_profiles f ON f.id = o.farmer_id
JOIN users fu ON fu.id = f.user_id
WHERE o.order_code LIKE 'ML-HIST-%' AND o.status = 'declined';

INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, note, changed_at)
SELECT o.id, 'accepted', 'cancelled', o.customer_id, 'Khách thay đổi kế hoạch.', o.created_at + INTERVAL 12 HOUR
FROM orders o
WHERE o.order_code LIKE 'ML-HIST-%' AND o.status = 'cancelled';

-- ===== 4. ORDER ITEMS for historical orders =====
INSERT IGNORE INTO order_items (order_id, product_id, product_name, unit_price, unit, quantity, subtotal)
SELECT o.id, p.id, p.name, p.price, p.unit,
       GREATEST(1, MOD(o.id, 4) + 1),
       p.price * GREATEST(1, MOD(o.id, 4) + 1)
FROM orders o
JOIN products p ON p.farmer_id = o.farmer_id AND p.is_deleted = FALSE
WHERE o.order_code LIKE 'ML-HIST-%'
  AND p.id = (SELECT MIN(p2.id) FROM products p2 WHERE p2.farmer_id = o.farmer_id AND p2.is_deleted = FALSE);

INSERT IGNORE INTO order_items (order_id, product_id, product_name, unit_price, unit, quantity, subtotal)
SELECT o.id, p.id, p.name, p.price, p.unit,
       GREATEST(1, MOD(o.id, 3) + 1),
       p.price * GREATEST(1, MOD(o.id, 3) + 1)
FROM orders o
JOIN products p ON p.farmer_id = o.farmer_id AND p.is_deleted = FALSE
WHERE o.order_code LIKE 'ML-HIST-%'
  AND p.id = (SELECT MIN(p2.id) FROM products p2
              WHERE p2.farmer_id = o.farmer_id AND p2.is_deleted = FALSE
                AND p2.id > (SELECT MIN(p3.id) FROM products p3 WHERE p3.farmer_id = o.farmer_id AND p3.is_deleted = FALSE));

UPDATE orders o
JOIN (SELECT order_id, SUM(subtotal) AS total FROM order_items GROUP BY order_id) t ON t.order_id = o.id
SET o.total_amount = t.total
WHERE o.order_code LIKE 'ML-HIST-%';

-- ===== 5. REVIEWS on completed historical orders =====
INSERT INTO reviews (customer_id, order_id, target_type, product_id, farmer_id, rating, comment, status, created_at)
SELECT o.customer_id, o.id, 'product', oi.product_id, NULL,
       CASE MOD(o.id, 5) WHEN 0 THEN 5 WHEN 1 THEN 4 WHEN 2 THEN 5 WHEN 3 THEN 3 ELSE 4 END,
       CASE MOD(o.id, 8)
         WHEN 0 THEN 'Sản phẩm tươi ngon, đóng gói cẩn thận. Rất hài lòng!'
         WHEN 1 THEN 'Chất lượng ổn, giá hợp lý. Sẽ mua lại.'
         WHEN 2 THEN 'Hàng tươi, giao đúng hẹn, cảm ơn sạp nhiều.'
         WHEN 3 THEN 'Chất lượng tạm ổn, lần sau hy vọng tươi hơn.'
         WHEN 4 THEN 'Rau rất tươi, đúng như mô tả. 10 điểm!'
         WHEN 5 THEN 'Hàng ngon, đóng gói sạch sẽ.'
         WHEN 6 THEN 'Sản phẩm chất lượng, giá cả phải chăng.'
         ELSE 'Tốt lắm, sẽ quay lại mua tiếp.'
       END,
       'visible',
       TIMESTAMP(o.pickup_date + INTERVAL 1 DAY, '10:00:00') - INTERVAL 7 HOUR
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE o.order_code LIKE 'ML-HIST-%' AND o.status = 'completed' AND MOD(o.id, 2) = 0
  AND oi.id = (SELECT MIN(oi2.id) FROM order_items oi2 WHERE oi2.order_id = o.id)
  AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.order_id = o.id AND r.target_type = 'product');

INSERT INTO reviews (customer_id, order_id, target_type, product_id, farmer_id, rating, comment, status, created_at)
SELECT o.customer_id, o.id, 'farmer', NULL, o.farmer_id,
       CASE MOD(o.id, 5) WHEN 0 THEN 5 WHEN 1 THEN 4 WHEN 2 THEN 5 WHEN 3 THEN 4 ELSE 3 END,
       CASE MOD(o.id, 6)
         WHEN 0 THEN 'Sạp rất thân thiện, hàng sạch, sẽ ủng hộ dài dài.'
         WHEN 1 THEN 'Nhận hàng nhanh, sạp chuyên nghiệp.'
         WHEN 2 THEN 'Chủ sạp nhiệt tình, hàng luôn tươi.'
         WHEN 3 THEN 'Hơi đợi lâu nhưng hàng tốt.'
         WHEN 4 THEN 'Sạp gọn gàng, hàng đúng như hình.'
         ELSE 'Rất hài lòng với sạp này!'
       END,
       'visible',
       TIMESTAMP(o.pickup_date + INTERVAL 1 DAY, '10:05:00') - INTERVAL 7 HOUR
FROM orders o
WHERE o.order_code LIKE 'ML-HIST-%' AND o.status = 'completed' AND MOD(o.id, 3) = 0
  AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.order_id = o.id AND r.target_type = 'farmer');

INSERT INTO review_responses (review_id, farmer_id, response_text, created_at)
SELECT r.id, r.farmer_id,
       CASE MOD(r.id, 4)
         WHEN 0 THEN 'Cảm ơn quý khách đã ủng hộ! Tuần sau sạp có thêm hàng mới nhé.'
         WHEN 1 THEN 'Dạ cảm ơn, sạp sẽ cố gắng phục vụ tốt hơn ạ!'
         WHEN 2 THEN 'Cảm ơn bạn nhiều, hẹn gặp lại tuần sau!'
         ELSE 'Xin cảm ơn đánh giá của bạn, sạp rất trân trọng!'
       END,
       r.created_at + INTERVAL 5 HOUR
FROM reviews r
JOIN orders o ON o.id = r.order_id
WHERE o.order_code LIKE 'ML-HIST-%' AND r.target_type = 'farmer' AND MOD(r.id, 3) = 0
  AND NOT EXISTS (SELECT 1 FROM review_responses rr WHERE rr.review_id = r.id);

-- Recompute rating caches
UPDATE products p
SET p.rating_avg = COALESCE((SELECT ROUND(AVG(r.rating), 2) FROM reviews r
                             WHERE r.target_type = 'product' AND r.product_id = p.id AND r.status = 'visible'), 0),
    p.rating_count = (SELECT COUNT(*) FROM reviews r
                      WHERE r.target_type = 'product' AND r.product_id = p.id AND r.status = 'visible');

UPDATE farmer_profiles f
SET f.rating_avg = COALESCE((SELECT ROUND(AVG(r.rating), 2) FROM reviews r
                             WHERE r.target_type = 'farmer' AND r.farmer_id = f.id AND r.status = 'visible'), 0),
    f.rating_count = (SELECT COUNT(*) FROM reviews r
                      WHERE r.target_type = 'farmer' AND r.farmer_id = f.id AND r.status = 'visible');

-- ===== 6. ADDITIONAL FAVORITES =====
INSERT IGNORE INTO favorites (customer_id, target_type, farmer_id, product_id, market_id, target_id)
SELECT c.id, 'farmer', f.id, NULL, NULL, f.id
FROM users c
JOIN users fu ON fu.email IN ('farmer@marketlink.vn', 'farmer2@marketlink.vn', 'farmer6@marketlink.vn')
JOIN farmer_profiles f ON f.user_id = fu.id
WHERE c.email IN ('customer2@marketlink.vn', 'customer4@marketlink.vn', 'customer8@marketlink.vn',
                   'customer11@marketlink.vn', 'customer14@marketlink.vn');

INSERT IGNORE INTO favorites (customer_id, target_type, farmer_id, product_id, market_id, target_id)
SELECT c.id, 'market', NULL, NULL, m.id, m.id
FROM users c
JOIN markets m ON m.market_name IN ('Chợ Bến Thành', 'Chợ Thảo Điền')
WHERE c.email IN ('customer2@marketlink.vn', 'customer6@marketlink.vn', 'customer9@marketlink.vn',
                   'customer12@marketlink.vn', 'customer15@marketlink.vn');

-- ===== 7. FEEDBACK spanning 6 months =====
INSERT INTO feedbacks (user_id, type, message, status, created_at)
SELECT u.id, x.type, x.message, x.status, UTC_TIMESTAMP() - INTERVAL x.days_ago DAY
FROM (
  SELECT 'customer2@marketlink.vn' AS email, 'bug' AS type, 'Trang giỏ hàng không hiện badge số lượng trên điện thoại Samsung.' AS message, 'resolved' AS status, 160 AS days_ago
  UNION ALL SELECT 'customer3@marketlink.vn', 'suggestion', 'Cho phép lọc sản phẩm theo khoảng cách từ vị trí hiện tại.', 'reviewed', 145
  UNION ALL SELECT NULL, 'query', 'Tôi muốn đăng ký bán hàng trên MarketLink, cần điều kiện gì?', 'resolved', 130
  UNION ALL SELECT 'customer4@marketlink.vn', 'bug', 'Nút Thêm vào yêu thích bị lỗi trên Firefox khi bấm nhanh liên tục.', 'resolved', 115
  UNION ALL SELECT 'customer5@marketlink.vn', 'suggestion', 'Thêm tính năng so sánh giá giữa các sạp cho cùng một sản phẩm.', 'new', 100
  UNION ALL SELECT 'customer6@marketlink.vn', 'query', 'Đơn hàng bị từ chối thì tiền trả lại bao lâu?', 'resolved', 85
  UNION ALL SELECT 'customer7@marketlink.vn', 'bug', 'Bản đồ chợ load chậm khi mở trên 3G.', 'reviewed', 70
  UNION ALL SELECT 'customer8@marketlink.vn', 'suggestion', 'Cho đặt hàng định kỳ hàng tuần, không cần vào đặt lại mỗi lần.', 'new', 55
  UNION ALL SELECT NULL, 'query', 'Có ship hàng về nhà không hay phải tới chợ lấy?', 'resolved', 40
  UNION ALL SELECT 'customer9@marketlink.vn', 'bug', 'Thông báo đơn hàng mới không hiện trên iOS Safari.', 'new', 30
  UNION ALL SELECT 'customer10@marketlink.vn', 'suggestion', 'Thêm mục Sản phẩm mới tuần này trên trang chủ.', 'reviewed', 20
  UNION ALL SELECT 'customer11@marketlink.vn', 'query', 'Có chương trình giảm giá cho khách mua thường xuyên không?', 'new', 12
  UNION ALL SELECT 'customer12@marketlink.vn', 'bug', 'Ảnh sản phẩm bị mờ trên iPad Pro.', 'new', 8
  UNION ALL SELECT 'customer13@marketlink.vn', 'suggestion', 'Cho phép nhắn tin với admin khi có vấn đề đơn hàng.', 'new', 5
  UNION ALL SELECT NULL, 'query', 'Ứng dụng có phiên bản trên Google Play Store không?', 'new', 2
  UNION ALL SELECT 'customer14@marketlink.vn', 'bug', 'Khi đổi ngôn ngữ sang tiếng Anh thì một số chỗ vẫn hiện tiếng Việt.', 'new', 1
  UNION ALL SELECT 'customer15@marketlink.vn', 'suggestion', 'Nên có tính năng đánh giá bằng hình ảnh (review kèm ảnh).', 'new', 1
) x
LEFT JOIN users u ON u.email = x.email
WHERE NOT EXISTS (SELECT 1 FROM feedbacks f WHERE f.message = x.message);

-- ===== 8. CHAT MESSAGES =====
INSERT INTO chat_messages (user_id, session_key, role, message, intent, created_at)
SELECT u.id, CONCAT('sess-', u.id, '-', x.sess), x.role, x.message, x.intent,
       UTC_TIMESTAMP() - INTERVAL x.days_ago DAY + INTERVAL x.minute_offset MINUTE
FROM (
  SELECT 'customer@marketlink.vn' AS email, '1' AS sess, 'user' AS role, 'Chợ nào gần Quận 1 nhất?' AS message, 'market_search' AS intent, 150 AS days_ago, 0 AS minute_offset
  UNION ALL SELECT 'customer@marketlink.vn', '1', 'bot', 'Chợ Bến Thành ở Lê Lợi, Quận 1 là gần nhất, mở cửa 06:00-19:00 từ thứ Hai đến thứ Bảy.', NULL, 150, 1
  UNION ALL SELECT 'customer@marketlink.vn', '1', 'user', 'Có bán trái cây không?', 'product_search', 150, 2
  UNION ALL SELECT 'customer@marketlink.vn', '1', 'bot', 'Có! Sạp Trái cây Ba Tơ bán bưởi, cam sành, xoài, chuối và ổi tại Chợ Bến Thành.', NULL, 150, 3
  UNION ALL SELECT 'customer2@marketlink.vn', '1', 'user', 'Tôi muốn mua rau muống, sạp nào bán?', 'product_search', 120, 0
  UNION ALL SELECT 'customer2@marketlink.vn', '1', 'bot', 'Sạp Vườn Út Hiền ở Chợ Bà Chiểu bán rau muống nước cắt sáng, giá 12,000d/bó, còn 40 bó.', NULL, 120, 1
  UNION ALL SELECT 'customer4@marketlink.vn', '1', 'user', 'Cách huỷ đơn hàng?', 'order_help', 90, 0
  UNION ALL SELECT 'customer4@marketlink.vn', '1', 'bot', 'Bạn vào Đơn hàng, chọn đơn muốn huỷ, bấm Huỷ đơn. Lưu ý: chỉ huỷ được trước giờ cutoff.', NULL, 90, 1
  UNION ALL SELECT 'customer8@marketlink.vn', '1', 'user', 'Nấm bào ngư ở đâu?', 'product_search', 60, 0
  UNION ALL SELECT 'customer8@marketlink.vn', '1', 'bot', 'Sạp Nấm sạch Thu Thảo ở Chợ Thảo Điền bán nấm bào ngư xám, giá 40,000d/kg. Còn 30 kg.', NULL, 60, 1
  UNION ALL SELECT 'customer11@marketlink.vn', '1', 'user', 'Giờ mở cửa Chợ Thảo Điền?', 'market_info', 30, 0
  UNION ALL SELECT 'customer11@marketlink.vn', '1', 'bot', 'Chợ Thảo Điền mở cửa từ 06:00 đến 20:00, chỉ hoạt động Chủ nhật và Thứ bảy.', NULL, 30, 1
  UNION ALL SELECT 'customer14@marketlink.vn', '1', 'user', 'Sạp nào bán mật ong?', 'product_search', 10, 0
  UNION ALL SELECT 'customer14@marketlink.vn', '1', 'bot', 'Sạp Mật ong U Minh bán mật ong rừng tràm (250,000d/lít) và mật ong hoa nhãn (220,000d/lít).', NULL, 10, 1
  UNION ALL SELECT 'customer14@marketlink.vn', '1', 'user', 'Có giao hàng không?', 'general', 10, 2
  UNION ALL SELECT 'customer14@marketlink.vn', '1', 'bot', 'MarketLink hiện chỉ hỗ trợ đặt trước và nhận tại sạp. Chưa có dịch vụ giao hàng tận nhà.', NULL, 10, 3
  UNION ALL SELECT 'customer15@marketlink.vn', '1', 'user', 'Làm sao tạo tài khoản farmer?', 'account_help', 5, 0
  UNION ALL SELECT 'customer15@marketlink.vn', '1', 'bot', 'Bạn vào Tài khoản, chọn Đăng ký bán hàng, điền thông tin sạp và chờ admin duyệt.', NULL, 5, 1
) x
JOIN users u ON u.email = x.email
WHERE NOT EXISTS (SELECT 1 FROM chat_messages cm WHERE cm.user_id = u.id AND cm.message = x.message);

-- ===== 9. NOTIFICATIONS =====
INSERT INTO notifications (user_id, kind, title, message, link, is_read, created_at)
SELECT u.id, x.kind, x.title, x.message, x.link, x.is_read,
       UTC_TIMESTAMP() - INTERVAL x.days_ago DAY + INTERVAL x.hour_offset HOUR
FROM (
  SELECT 'customer@marketlink.vn' AS email, 'order_accepted' AS kind, 'Đơn hàng được chấp nhận' AS title, 'Sạp Vườn Út Hiền đã chấp nhận đơn hàng của bạn.' AS message, '/customer/orders' AS link, TRUE AS is_read, 150 AS days_ago, 4 AS hour_offset
  UNION ALL SELECT 'customer@marketlink.vn', 'order_ready', 'Đơn hàng sẵn sàng', 'Đơn hàng từ Trái cây Ba Tơ đã sẵn sàng để nhận.', '/customer/orders', TRUE, 100, 20
  UNION ALL SELECT 'customer@marketlink.vn', 'order_completed', 'Đơn hoàn tất', 'Đơn từ Vườn Út Hiền đã hoàn tất. Hãy để lại đánh giá!', '/customer/orders', TRUE, 80, 8
  UNION ALL SELECT 'customer@marketlink.vn', 'order_declined', 'Đơn bị từ chối', 'Sạp Củ quả Đức Củ Chi đã từ chối đơn hàng: Hết hàng.', '/customer/orders', TRUE, 115, 6
  UNION ALL SELECT 'customer@marketlink.vn', 'order_accepted', 'Đơn mới chấp nhận', 'Sạp Mật ong U Minh đã chấp nhận đơn hàng của bạn.', '/customer/orders', FALSE, 13, 4
  UNION ALL SELECT 'customer2@marketlink.vn', 'order_completed', 'Đơn hoàn tất', 'Đơn từ Vườn Út Hiền đã hoàn tất.', '/customer/orders', TRUE, 170, 8
  UNION ALL SELECT 'customer4@marketlink.vn', 'order_accepted', 'Đơn hàng được chấp nhận', 'Sạp Trái cây Ba Tơ đã chấp nhận đơn hàng.', '/customer/orders', TRUE, 143, 4
  UNION ALL SELECT 'customer6@marketlink.vn', 'order_ready', 'Đơn hàng sẵn sàng', 'Đơn từ Lò bánh Tuấn Anh đã sẵn sàng.', '/customer/orders', TRUE, 99, 20
  UNION ALL SELECT 'customer8@marketlink.vn', 'order_completed', 'Đơn hoàn tất', 'Đơn từ Trứng gà Khánh Hòa đã hoàn tất. Đánh giá ngay!', '/customer/orders', FALSE, 10, 8
  UNION ALL SELECT 'customer11@marketlink.vn', 'order_declined', 'Đơn bị từ chối', 'Sạp Vườn Út Hiền đã từ chối đơn: Hết hàng.', '/customer/orders', FALSE, 3, 6
  UNION ALL SELECT 'customer14@marketlink.vn', 'order_accepted', 'Đơn hàng được chấp nhận', 'Sạp Nấm sạch Thu Thảo đã chấp nhận đơn hàng.', '/customer/orders', FALSE, 14, 4
  UNION ALL SELECT 'customer15@marketlink.vn', 'order_completed', 'Đơn hoàn tất', 'Đơn từ Lò bánh Tuấn Anh đã hoàn tất.', '/customer/orders', FALSE, 1, 8
  UNION ALL SELECT 'farmer@marketlink.vn', 'order_placed', 'Đơn hàng mới', 'Bạn có đơn hàng mới từ Nguyễn Văn An.', '/farmer/orders', TRUE, 150, 0
  UNION ALL SELECT 'farmer@marketlink.vn', 'order_placed', 'Đơn hàng mới 2', 'Bạn có đơn hàng mới từ Trần Thị Bích.', '/farmer/orders', TRUE, 120, 0
  UNION ALL SELECT 'farmer@marketlink.vn', 'order_placed', 'Đơn hàng mới 3', 'Bạn có đơn hàng mới từ Hoàng Thị Lan.', '/farmer/orders', FALSE, 13, 0
  UNION ALL SELECT 'farmer2@marketlink.vn', 'order_placed', 'Đơn hàng mới', 'Bạn có đơn hàng mới từ Nguyễn Văn An.', '/farmer/orders', TRUE, 173, 0
  UNION ALL SELECT 'farmer2@marketlink.vn', 'review_received', 'Đánh giá mới', 'Khách hàng đã đánh giá 5 sao cho sạp bạn.', '/farmer/reviews', FALSE, 7, 10
  UNION ALL SELECT 'farmer4@marketlink.vn', 'order_placed', 'Đơn hàng mới', 'Bạn có đơn hàng mới từ Cao Thị Tuyết.', '/farmer/orders', FALSE, 6, 0
  UNION ALL SELECT 'farmer6@marketlink.vn', 'review_received', 'Đánh giá mới', 'Khách hàng đã đánh giá 4 sao cho sạp bạn.', '/farmer/reviews', FALSE, 1, 10
  UNION ALL SELECT 'admin@marketlink.vn', 'farmer_application', 'Đơn đăng ký Farmer mới', 'Trịnh Văn Tài đã nộp đơn đăng ký bán hàng.', '/admin/farmers', FALSE, 3, 0
  UNION ALL SELECT 'admin@marketlink.vn', 'feedback_new', 'Góp ý mới', 'Có 3 góp ý mới cần xử lý.', '/admin/feedback', FALSE, 1, 0
) x
JOIN users u ON u.email = x.email
WHERE NOT EXISTS (SELECT 1 FROM notifications n WHERE n.user_id = u.id AND n.title = x.title AND n.message = x.message);

-- ===== 10. ANNOUNCEMENTS =====
INSERT INTO announcements (title, content, audience, created_by, is_active, starts_at, ends_at, created_at)
SELECT x.title, x.content, x.audience, admin.id, x.is_active, x.starts_at, x.ends_at, x.created_at
FROM (
  SELECT 'Chào mừng đến với MarketLink!' AS title,
         'MarketLink chính thức ra mắt! Đặt trước rau củ quả tươi từ các sạp nông sản tại 4 chợ lớn ở TP. Hồ Chí Minh.' AS content,
         'all' AS audience, TRUE AS is_active,
         UTC_TIMESTAMP() - INTERVAL 180 DAY AS starts_at,
         UTC_TIMESTAMP() - INTERVAL 150 DAY AS ends_at,
         UTC_TIMESTAMP() - INTERVAL 180 DAY AS created_at
  UNION ALL
  SELECT 'Ưu đãi cuối tháng 9',
         'Từ 25/09 đến 30/09, tất cả đơn hàng đầu tiên của khách mới được giảm 10%. Chia sẻ MarketLink cho bạn bè!',
         'all', TRUE,
         UTC_TIMESTAMP() - INTERVAL 2 DAY,
         UTC_TIMESTAMP() + INTERVAL 3 DAY,
         UTC_TIMESTAMP() - INTERVAL 2 DAY
) x
JOIN users admin ON admin.email = 'admin@marketlink.vn'
WHERE NOT EXISTS (SELECT 1 FROM announcements a WHERE a.title = x.title);
