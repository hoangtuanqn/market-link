-- Site-wide maintenance mode toggle: a single row that every request checks (MaintenanceModeFilter).
-- id is pinned to 1 so the table can only ever hold the one row it needs.
CREATE TABLE platform_status (
    id TINYINT UNSIGNED NOT NULL DEFAULT 1 PRIMARY KEY,
    maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE,
    updated_by BIGINT UNSIGNED NULL,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT chk_platform_status_singleton CHECK (id = 1),
    FOREIGN KEY (updated_by) REFERENCES users(id)
);

INSERT INTO platform_status (id, maintenance_mode) VALUES (1, FALSE);
