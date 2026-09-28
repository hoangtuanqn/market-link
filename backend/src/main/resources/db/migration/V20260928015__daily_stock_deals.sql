-- FR-124 (proposed; spec docs/superpowers/specs/2026-09-27-shelf-life-deals-design.md §4.5.3): a
-- near-expiry deal is one pickup day of a product sold cheaper. That day's row keeps the price the
-- deal replaced (list_price), the discount, when the batch brought for the day was harvested or
-- packed (packed_on) and the batch's last good day (best_before, fixed when the deal is posted).
-- unit_price is then the deal price, so placing an order needs no change to read it. The four
-- columns are all set or all empty. LEAD reconciles db/schema.sql (R-02).
ALTER TABLE product_daily_stock
    ADD COLUMN list_price       DECIMAL(10, 2) NULL AFTER unit_price,
    ADD COLUMN discount_percent TINYINT        NULL AFTER list_price,
    ADD COLUMN packed_on        DATE           NULL AFTER discount_percent,
    ADD COLUMN best_before      DATE           NULL AFTER packed_on,
    ADD CONSTRAINT ck_pds_deal_all_or_none CHECK (
        (list_price IS NULL AND discount_percent IS NULL AND packed_on IS NULL AND best_before IS NULL)
        OR (list_price IS NOT NULL AND discount_percent IS NOT NULL AND packed_on IS NOT NULL
            AND best_before IS NOT NULL)),
    ADD CONSTRAINT ck_pds_deal_percent CHECK (discount_percent BETWEEN 5 AND 70),
    -- GET /deals scans deal days by date; almost no row has a deal
    ADD INDEX idx_pds_deals (discount_percent, stock_date);
