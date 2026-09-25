-- docs/prototype/admin/farmers.html + farmer.html: Admin có thể reject đơn đang PENDING (kèm lý do)
-- và reinstate (đưa lại APPROVED) một Farmer đang SUSPENDED. Tên cột khớp db/schema.sql §9 (LEAD).
ALTER TABLE farmer_profiles
    ADD COLUMN reject_reason VARCHAR(255) NULL AFTER approval_status;
