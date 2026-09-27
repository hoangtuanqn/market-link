-- Track when an admin explicitly disables two-step verification
ALTER TABLE admin_mfa ADD COLUMN disabled_at TIMESTAMP NULL AFTER enabled_at;
