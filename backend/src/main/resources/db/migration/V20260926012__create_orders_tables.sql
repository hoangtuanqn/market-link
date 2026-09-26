-- All keys are BIGINT UNSIGNED like V20260926011
CREATE TABLE orders (
    id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_code    VARCHAR(20) NOT NULL UNIQUE,
    customer_id   BIGINT UNSIGNED NOT NULL,
    farmer_id     BIGINT UNSIGNED NOT NULL,
    market_id     BIGINT UNSIGNED NOT NULL,
    slot_id       BIGINT UNSIGNED NULL,
    pickup_date   DATE NOT NULL,
    pickup_start  TIME NOT NULL,
    pickup_end    TIME NOT NULL,
    cutoff_at     DATETIME NOT NULL,
    total_amount  DECIMAL(12, 2) NOT NULL DEFAULT 0,
    status        ENUM('placed','accepted','declined','ready','completed','cancelled')
                  NOT NULL DEFAULT 'placed',
    customer_note VARCHAR(255) NULL,
    farmer_note   VARCHAR(255) NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES users (id),
    CONSTRAINT fk_orders_farmer   FOREIGN KEY (farmer_id)   REFERENCES farmer_profiles (id),
    CONSTRAINT fk_orders_market   FOREIGN KEY (market_id)   REFERENCES markets (id),
    CONSTRAINT fk_orders_slot     FOREIGN KEY (slot_id)     REFERENCES pickup_slots (id) ON DELETE SET NULL,
    INDEX idx_orders_customer (customer_id, status),
    INDEX idx_orders_farmer (farmer_id, status),
    INDEX idx_orders_pickup (pickup_date)
);

-- Snapshot tên + giá lúc đặt: Farmer đổi giá sau đó thì đơn cũ không đổi theo.
CREATE TABLE order_items (
    id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id     BIGINT UNSIGNED NOT NULL,
    product_id   BIGINT UNSIGNED NOT NULL,
    product_name VARCHAR(150) NOT NULL,
    unit_price   DECIMAL(10, 2) NOT NULL,
    unit         VARCHAR(20) NOT NULL,
    quantity     INT NOT NULL,
    subtotal     DECIMAL(12, 2) NOT NULL,
    CONSTRAINT fk_items_order   FOREIGN KEY (order_id)   REFERENCES orders (id) ON DELETE CASCADE,
    CONSTRAINT fk_items_product FOREIGN KEY (product_id) REFERENCES products (id),
    UNIQUE KEY uq_order_product (order_id, product_id),
    INDEX idx_items_order (order_id),
    CONSTRAINT ck_items_qty CHECK (quantity > 0)
);

-- FR-038: mọi lần đổi trạng thái đều ghi lại.
CREATE TABLE order_status_history (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id    BIGINT UNSIGNED NOT NULL,
    from_status VARCHAR(20) NULL,
    to_status   VARCHAR(20) NOT NULL,
    changed_by  BIGINT UNSIGNED NULL,
    note        VARCHAR(255) NULL,
    changed_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_history_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
    CONSTRAINT fk_history_user  FOREIGN KEY (changed_by) REFERENCES users (id) ON DELETE SET NULL,
    INDEX idx_history_order (order_id, changed_at)
);
