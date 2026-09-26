-- MarketLink — dữ liệu demo (FR-100, FR-101, FR-102).
-- KHÔNG phải migration: Flyway chạy ở mọi môi trường, seed demo thì không.
-- Chạy: make seed. Chạy lại được nhiều lần — mọi INSERT đều idempotent theo khoá tự nhiên
-- (categories.slug, markets.market_name, …). Mỗi cụm của plan core-commerce nối thêm khối
-- của mình vào cuối file này, không tạo file riêng.
-- Toạ độ là toạ độ thật của 4 chợ ở TP. Hồ Chí Minh.

SET NAMES utf8mb4;

-- ---- Danh mục (FR-076) ----
INSERT INTO categories (name, slug, icon, sort_order, is_active) VALUES
  ('Leafy greens', 'leafy-greens', 'leaf',   1, TRUE),
  ('Fruit',        'fruit',        'apple',  2, TRUE),
  ('Root veg',     'root-veg',     'carrot', 3, TRUE),
  ('Herbs',        'herbs',        'sprout', 4, TRUE),
  ('Dairy',        'dairy',        'milk',   5, TRUE),
  ('Baked goods',  'baked-goods',  'bread',  6, TRUE)
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
