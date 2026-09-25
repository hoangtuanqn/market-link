-- Đơn xin làm Farmer rút còn 3 bước: thông tin sạp · ảnh/video · cam kết.
-- Mặt hàng, cách canh tác, thửa đất và chợ muốn bán được khai SAU khi Admin duyệt, ở panel Farmer
-- (FR-060…FR-064), nên 10 cột do V20260925008 thêm vào không còn nơi nào ghi hay đọc.
-- Bỏ chúng cũng đưa farmer_profiles về đúng db/schema.sql §2 của LEAD — bảng đích không có các cột này.
ALTER TABLE farmer_profiles
    DROP COLUMN categories,
    DROP COLUMN main_crops,
    DROP COLUMN weekly_volume,
    DROP COLUMN growing_method,
    DROP COLUMN plot_address,
    DROP COLUMN plot_size,
    DROP COLUMN growing_since_year,
    DROP COLUMN plot_latitude,
    DROP COLUMN plot_longitude,
    DROP COLUMN preferred_market_name;
