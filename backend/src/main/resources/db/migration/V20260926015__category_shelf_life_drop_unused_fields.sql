-- Chưa có FR chính thức — theo yêu cầu người dùng 2026-09-26, không phải R-02/03 tự đề xuất.
-- `description`/`icon` không nơi nào đọc (form Admin Category cũng không có ô cho chúng) → xoá cho
-- sạch. Thêm khoảng ngày tươi chuẩn cho mỗi category: Admin nhập lúc tạo, dùng làm gợi ý/ràng buộc
-- mềm khi Farmer khai `products.shelf_life_days` (V…016).
ALTER TABLE categories
    DROP COLUMN description,
    DROP COLUMN icon,
    -- Mặc định 1..7 cho các category đã có sẵn; category tạo mới bắt buộc Admin nhập số thật
    -- (CategoryRequest @NotNull) — cột default ở đây chỉ để backfill dữ liệu cũ.
    ADD COLUMN min_shelf_life_days INT NOT NULL DEFAULT 1,
    ADD COLUMN max_shelf_life_days INT NOT NULL DEFAULT 7,
    ADD CONSTRAINT ck_categories_shelf_life
        CHECK (min_shelf_life_days >= 1 AND max_shelf_life_days >= min_shelf_life_days);
