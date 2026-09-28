-- FR-122, FR-123 (proposed, not yet in .ai/REQUIREMENTS.md): a customer's report of spoiled
-- produce on one line of a completed order, and the shelf-life strikes an admin records when a
-- report on an extended shelf life is confirmed (spec 2026-09-27-shelf-life-deals-design §4.4).
-- The "longer shelf lives locked" state is not stored: it is derived from the strikes of the last
-- 90 days, so it can never disagree with them.
CREATE TABLE quality_reports (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_item_id       BIGINT UNSIGNED NOT NULL,
    order_id            BIGINT UNSIGNED NOT NULL,
    customer_id         BIGINT UNSIGNED NOT NULL,
    farmer_id           BIGINT UNSIGNED NOT NULL,
    product_id          BIGINT UNSIGNED NOT NULL,
    spoiled_on          DATE NOT NULL,
    problem             ENUM('bruised', 'mold', 'smell', 'wilted', 'other') NOT NULL,
    note                VARCHAR(500) NULL,
    photo_url           VARCHAR(255) NULL,
    -- spoiled_on <= order_items.best_before, fixed when the report is created
    before_promise      BOOLEAN NOT NULL,
    -- Copied from the order line: a report is judged by the promise the customer was given
    shelf_life_extended BOOLEAN NOT NULL DEFAULT FALSE,
    extended_by_days    INT NOT NULL DEFAULT 0,
    status              ENUM('open', 'confirmed', 'dismissed') NOT NULL DEFAULT 'open',
    farmer_response     VARCHAR(500) NULL,
    farmer_responded_at TIMESTAMP NULL,
    decided_by          BIGINT UNSIGNED NULL,
    decided_at          TIMESTAMP NULL,
    decision_note       VARCHAR(255) NULL,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- One report per order line (spec §4.4.1)
    CONSTRAINT uq_quality_report_item UNIQUE (order_item_id),
    CONSTRAINT fk_quality_reports_item FOREIGN KEY (order_item_id) REFERENCES order_items (id) ON DELETE CASCADE,
    CONSTRAINT fk_quality_reports_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
    -- Accounts are never hard-deleted (FR-072 only deactivates), so RESTRICT stays the default
    CONSTRAINT fk_quality_reports_customer FOREIGN KEY (customer_id) REFERENCES users (id),
    CONSTRAINT fk_quality_reports_farmer FOREIGN KEY (farmer_id) REFERENCES farmer_profiles (id),
    CONSTRAINT fk_quality_reports_product FOREIGN KEY (product_id) REFERENCES products (id),
    CONSTRAINT fk_quality_reports_decider FOREIGN KEY (decided_by) REFERENCES users (id),
    CONSTRAINT ck_quality_reports_extension CHECK (extended_by_days >= 0),
    -- A decided report always says when it was decided; an open one never does
    CONSTRAINT ck_quality_reports_decision CHECK ((status = 'open') = (decided_at IS NULL)),
    INDEX idx_quality_reports_queue (status, shelf_life_extended, created_at),
    INDEX idx_quality_reports_farmer (farmer_id, created_at)
);

-- One strike per confirmed report (spec §4.4.4); it counts for 90 days from created_at.
CREATE TABLE farmer_violations (
    id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    farmer_id         BIGINT UNSIGNED NOT NULL,
    quality_report_id BIGINT UNSIGNED NOT NULL,
    product_id        BIGINT UNSIGNED NOT NULL,
    extended_by_days  INT NOT NULL,
    note              VARCHAR(255) NULL,
    created_by        BIGINT UNSIGNED NOT NULL,
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_farmer_violation_report UNIQUE (quality_report_id),
    CONSTRAINT fk_farmer_violations_farmer FOREIGN KEY (farmer_id) REFERENCES farmer_profiles (id),
    CONSTRAINT fk_farmer_violations_report FOREIGN KEY (quality_report_id) REFERENCES quality_reports (id) ON DELETE CASCADE,
    CONSTRAINT fk_farmer_violations_product FOREIGN KEY (product_id) REFERENCES products (id),
    CONSTRAINT fk_farmer_violations_admin FOREIGN KEY (created_by) REFERENCES users (id),
    INDEX idx_farmer_violations_window (farmer_id, created_at)
);
