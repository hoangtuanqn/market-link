package com.techx.intervue.modules.user.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/** FR-008: xác nhận mã 6 số khi bật / tắt xác thực hai bước. */
public record MfaCodeRequest(
        @NotBlank(message = "Type the code first.")
                @Pattern(
                        regexp = "\\d{6}",
                        message = "Enter the six digits from your authenticator.")
                String code) {}
