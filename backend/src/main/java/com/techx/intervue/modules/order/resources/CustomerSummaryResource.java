package com.techx.intervue.modules.order.resources;

/**
 * Liên hệ của khách — chỉ Farmer của đơn thấy được, để gọi khách khi khách không tới lấy (FR-036).
 * Khách xem đơn của chính mình không cần biết gì thêm về chính mình ở đây.
 */
public record CustomerSummaryResource(Long userId, String fullName, String phone, String email) {}
