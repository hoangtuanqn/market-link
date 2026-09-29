-- FR-001, FR-073: users and markets store their address as parts that point at the master data
-- (V20260927001). `address` stays as the display string; AddressService composes it from these
-- parts on every write, so every existing reader (chatbot, directions, chat, admin screens) keeps
-- working unchanged.
--
-- Vietnam: country_code + province_code + ward_code + street_name (+ address_line, the house
-- number). Other countries: country_code + region_name + city_name + address_line.
-- Rows written before this migration keep only `address`, with every part NULL.

ALTER TABLE users
    ADD COLUMN country_code  CHAR(2)      NULL AFTER address,
    ADD COLUMN province_code VARCHAR(5)   NULL AFTER country_code,
    ADD COLUMN ward_code     VARCHAR(5)   NULL AFTER province_code,
    ADD COLUMN street_name   VARCHAR(100) NULL AFTER ward_code,
    ADD COLUMN address_line  VARCHAR(60)  NULL AFTER street_name,
    ADD COLUMN region_name   VARCHAR(60)  NULL AFTER address_line,
    ADD COLUMN city_name     VARCHAR(60)  NULL AFTER region_name,
    ADD CONSTRAINT fk_users_country FOREIGN KEY (country_code) REFERENCES countries (code),
    ADD CONSTRAINT fk_users_province FOREIGN KEY (province_code) REFERENCES provinces (code),
    -- The ward must belong to the province (wards.uq_wards_province_code)
    ADD CONSTRAINT fk_users_ward FOREIGN KEY (province_code, ward_code)
        REFERENCES wards (province_code, code),
    -- A composite foreign key skips rows with a NULL part, so a ward without its province would
    -- slip past it
    ADD CONSTRAINT chk_users_ward_has_province CHECK (ward_code IS NULL OR province_code IS NOT NULL);

-- The district/city strings are replaced by the ward/province codes.
ALTER TABLE markets
    DROP INDEX idx_markets_city_active,
    DROP COLUMN district,
    DROP COLUMN city,
    ADD COLUMN country_code  CHAR(2)      NULL AFTER address,
    ADD COLUMN province_code VARCHAR(5)   NULL AFTER country_code,
    ADD COLUMN ward_code     VARCHAR(5)   NULL AFTER province_code,
    ADD COLUMN street_name   VARCHAR(100) NULL AFTER ward_code,
    ADD COLUMN address_line  VARCHAR(60)  NULL AFTER street_name,
    ADD COLUMN region_name   VARCHAR(60)  NULL AFTER address_line,
    ADD COLUMN city_name     VARCHAR(60)  NULL AFTER region_name,
    ADD CONSTRAINT fk_markets_country FOREIGN KEY (country_code) REFERENCES countries (code),
    ADD CONSTRAINT fk_markets_province FOREIGN KEY (province_code) REFERENCES provinces (code),
    ADD CONSTRAINT fk_markets_ward FOREIGN KEY (province_code, ward_code)
        REFERENCES wards (province_code, code),
    ADD CONSTRAINT chk_markets_ward_has_province CHECK (ward_code IS NULL OR province_code IS NOT NULL),
    ADD INDEX idx_markets_ward_active (ward_code, is_active);
