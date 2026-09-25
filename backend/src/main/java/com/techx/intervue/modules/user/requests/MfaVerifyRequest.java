package com.techx.intervue.modules.user.requests;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.util.StringUtils;

/** FR-008: bước 2 đăng nhập admin — gửi mã 6 số hoặc một mã khôi phục. */
public record MfaVerifyRequest(
        @NotBlank(message = "Your sign-in has expired. Sign in again.") @Size(max = 128)
                String mfaToken,
        @Pattern(regexp = "\\d{6}", message = "Enter the six digits from your authenticator.")
                String code,
        @Size(max = 32, message = "Enter a recovery code in the form xxxx-xxxx-xxxx.")
                String recoveryCode) {

    @AssertTrue(message = "Type the code first.")
    public boolean isCode() {
        return StringUtils.hasText(code) || StringUtils.hasText(recoveryCode);
    }
}
