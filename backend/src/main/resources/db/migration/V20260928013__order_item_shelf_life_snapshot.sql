-- FR-121 (proposed): the shelf-life promise copied onto each order line when the order is placed,
-- so a later edit of the product or of the guide never changes what the customer was told.
-- list_price stays NULL until near-expiry deals exist (FR-124): the price before a discount.
ALTER TABLE order_items
    ADD COLUMN shelf_life_days INT NULL,
    ADD COLUMN storage_mode ENUM('room', 'chilled') NULL,
    ADD COLUMN best_before DATE NULL,
    ADD COLUMN shelf_life_extended BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN extended_by_days INT NOT NULL DEFAULT 0,
    ADD COLUMN list_price DECIMAL(10, 2) NULL;
