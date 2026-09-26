-- FR-040, FR-014: a customer's favourite stalls, products and markets. Exactly one of farmer_id /
-- product_id / market_id is set, the one matching target_type; the service guarantees it.
-- Keys are BIGINT UNSIGNED with primary key `id` (plan §S.4.1), not INT as db/schema.sql writes.
-- db/schema.sql keys uniqueness on (customer_id, target_type, farmer_id, product_id, market_id), but
-- MySQL treats NULLs as distinct, so that key would let the same favourite be stored twice.
-- target_id repeats the one id that is set and carries the unique key instead. It is a plain column
-- written by the service: MySQL forbids CHECK constraints and stored generated columns on columns
-- that have ON DELETE CASCADE foreign keys.
CREATE TABLE favorites (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id BIGINT UNSIGNED NOT NULL,
    target_type ENUM('farmer', 'product', 'market') NOT NULL,
    farmer_id   BIGINT UNSIGNED NULL,
    product_id  BIGINT UNSIGNED NULL,
    market_id   BIGINT UNSIGNED NULL,
    target_id   BIGINT UNSIGNED NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_fav_customer FOREIGN KEY (customer_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_fav_farmer FOREIGN KEY (farmer_id) REFERENCES farmer_profiles (id) ON DELETE CASCADE,
    CONSTRAINT fk_fav_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
    CONSTRAINT fk_fav_market FOREIGN KEY (market_id) REFERENCES markets (id) ON DELETE CASCADE,
    UNIQUE KEY uq_fav (customer_id, target_type, target_id),
    -- FR-041: who favourited this product, when it comes back in stock
    INDEX idx_fav_product (product_id)
);
