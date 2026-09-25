-- SRS §1.6 + docs/prototype/customer/become-farmer.html: form đầy đủ theo prototype.
-- Chưa có bảng categories/markets thật nên categories/preferred_market_name lưu dạng text tự do;
-- ảnh/video lưu path cục bộ (app.uploads.dir), không dùng object storage (chỉ phục vụ test/demo).
ALTER TABLE farmer_profiles
    ADD COLUMN description          TEXT NULL AFTER contact_person,
    ADD COLUMN categories           VARCHAR(255) NULL AFTER description,
    ADD COLUMN main_crops           VARCHAR(255) NULL AFTER categories,
    ADD COLUMN weekly_volume        VARCHAR(100) NULL AFTER main_crops,
    ADD COLUMN growing_method       TEXT NULL AFTER weekly_volume,
    ADD COLUMN plot_address         VARCHAR(255) NULL AFTER growing_method,
    ADD COLUMN plot_size            VARCHAR(50) NULL AFTER plot_address,
    ADD COLUMN growing_since_year   SMALLINT NULL AFTER plot_size,
    ADD COLUMN plot_latitude        DECIMAL(10, 8) NULL AFTER growing_since_year,
    ADD COLUMN plot_longitude       DECIMAL(11, 8) NULL AFTER plot_latitude,
    -- Nhiều path cách nhau bởi ';' (đơn giản hơn cột JSON cho phạm vi test/demo này).
    ADD COLUMN photo_paths          TEXT NULL AFTER plot_longitude,
    ADD COLUMN video_path           VARCHAR(255) NULL AFTER photo_paths,
    ADD COLUMN preferred_market_name VARCHAR(120) NULL AFTER video_path;
