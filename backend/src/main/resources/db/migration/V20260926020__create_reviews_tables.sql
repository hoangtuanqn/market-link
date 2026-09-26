-- FR-050…053 (reviews and farmer responses), FR-074 (admin hides a review), D-10 (only completed orders).
-- All keys are BIGINT UNSIGNED like V20260926012 (plan S.4.1); columns follow db/schema.sql §6.
CREATE TABLE reviews (
    id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id  BIGINT UNSIGNED NOT NULL,
    order_id     BIGINT UNSIGNED NOT NULL,
    target_type  ENUM('product','farmer') NOT NULL,
    product_id   BIGINT UNSIGNED NULL,
    farmer_id    BIGINT UNSIGNED NULL,
    rating       TINYINT NOT NULL,
    comment      TEXT NULL,
    -- Admin moderation (FR-074): a hidden review leaves the public lists and the rating caches.
    status       ENUM('visible','hidden') NOT NULL DEFAULT 'visible',
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_reviews_customer FOREIGN KEY (customer_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_reviews_order    FOREIGN KEY (order_id)    REFERENCES orders (id) ON DELETE CASCADE,
    CONSTRAINT fk_reviews_product  FOREIGN KEY (product_id)  REFERENCES products (id) ON DELETE CASCADE,
    CONSTRAINT fk_reviews_farmer   FOREIGN KEY (farmer_id)   REFERENCES farmer_profiles (id) ON DELETE CASCADE,
    -- One review per target per order. MySQL treats NULLs as distinct in a UNIQUE key, so the
    -- service also checks for an existing row inside the same transaction before inserting.
    UNIQUE KEY uq_review (order_id, target_type, product_id, farmer_id),
    INDEX idx_reviews_product (product_id, status),
    INDEX idx_reviews_farmer (farmer_id, status),
    CONSTRAINT ck_reviews_rating CHECK (rating BETWEEN 1 AND 5),
    CONSTRAINT ck_reviews_target CHECK (
        (target_type = 'product' AND product_id IS NOT NULL)
     OR (target_type = 'farmer'  AND farmer_id  IS NOT NULL))
);

-- FR-053: a farmer answers a review once (1-1, review_id UNIQUE).
CREATE TABLE review_responses (
    id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    review_id     BIGINT UNSIGNED NOT NULL UNIQUE,
    farmer_id     BIGINT UNSIGNED NOT NULL,
    response_text TEXT NOT NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_responses_review FOREIGN KEY (review_id) REFERENCES reviews (id) ON DELETE CASCADE,
    CONSTRAINT fk_responses_farmer FOREIGN KEY (farmer_id) REFERENCES farmer_profiles (id) ON DELETE CASCADE
);
