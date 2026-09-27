-- No FR-xxx assigned yet — extends FR-063/FR-031 (D-02): stock is now tracked per pickup date instead
-- of one shared pool for every date. Proposed for LEAD to assign an FR and reconcile db/schema.sql (R-02).
CREATE TABLE product_daily_stock (
    id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id         BIGINT UNSIGNED NOT NULL,
    stock_date         DATE NOT NULL,
    quantity_available INT NOT NULL,
    unit_price         DECIMAL(10, 2) NOT NULL,
    CONSTRAINT fk_pds_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
    UNIQUE KEY uq_product_daily_stock (product_id, stock_date),
    CONSTRAINT ck_pds_quantity CHECK (quantity_available >= 0)
);
