package com.techx.intervue.modules.farmer.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** D-09: lý do đình chỉ được hiển thị lại cho chính Farmer, nên bắt buộc và do Admin tự viết. */
public record SuspendFarmerRequest(
        @NotBlank(message = "Say why the stall is suspended.")
                @Size(max = 255, message = "Keep the reason under 255 characters.")
                String reason) {}
