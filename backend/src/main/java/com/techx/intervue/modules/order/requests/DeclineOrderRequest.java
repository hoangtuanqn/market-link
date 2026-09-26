package com.techx.intervue.modules.order.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * FR-065: Farmer từ chối đơn phải nêu lý do — được chép vào {@code orders.farmer_note} để khách đọc
 * lại (contract §7). Rỗng hoặc chỉ khoảng trắng → 400 VALIDATION_ERROR field {@code reason}, chặn ở
 * đây bằng {@code @Valid} tại controller, không phải trong service.
 */
public record DeclineOrderRequest(
        @NotBlank(message = "Enter a reason.")
                @Size(max = 255, message = "Keep the reason under 255 characters.")
                String reason) {}
