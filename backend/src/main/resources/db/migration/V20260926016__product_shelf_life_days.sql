-- Chưa có FR chính thức — theo yêu cầu người dùng 2026-09-26.
-- Số ngày sản phẩm còn tươi, hiện cho Customer để minh bạch. Farmer khai lúc tạo/sửa sản phẩm
-- (ProductRequest @NotNull); FE gợi ý theo categories.min/max_shelf_life_days (V…015) nhưng không
-- chặn cứng — Farmer chọn khác thì tự chịu trách nhiệm nếu sau này có tranh chấp.
ALTER TABLE products
    ADD COLUMN shelf_life_days INT NOT NULL DEFAULT 3,
    ADD CONSTRAINT ck_products_shelf_life CHECK (shelf_life_days >= 1);
