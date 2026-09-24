package com.techx.intervue.modules.user.services.impl;

import com.techx.intervue.config.PasswordResetConfig;
import com.techx.intervue.modules.user.services.interfaces.PasswordResetServiceInterface;
import com.techx.intervue.services.interfaces.JobHandler;
import com.techx.intervue.services.interfaces.MailServiceInterface;
import java.util.Map;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.util.HtmlUtils;

/**
 * FR-007 bước B: tạo token và gửi link đặt lại mật khẩu. Email không tồn tại thì im lặng bỏ qua.
 */
@Component
@AllArgsConstructor
public class PasswordResetLinkJob implements JobHandler {

    private final PasswordResetServiceInterface passwordResetService;
    private final MailServiceInterface mailService;
    private final PasswordResetConfig config;

    @Override
    public String type() {
        return PasswordResetService.JOB_SEND_LINK;
    }

    @Override
    public void handle(Map<String, String> payload) {
        passwordResetService
                .issueToken(payload.get("email"))
                .ifPresent(
                        issued -> {
                            // token gốc (base64url) — không phải hash
                            String link = config.getUrl() + "?token=" + issued.rawToken();
                            mailService.sendHtml(
                                    issued.email(),
                                    "Reset your MarketLink password",
                                    body(issued.fullName(), link));
                        });
    }

    private String body(String fullName, String link) {
        long minutes = config.getTokenTtlSeconds() / 60;
        String safeLink = HtmlUtils.htmlEscape(link);
        return """
                <p>Hi %s,</p>
                <p>We received a request to reset the password for your MarketLink account.</p>
                <p><a href="%s">Reset password</a></p>
                <p>The link works once and expires in %d minutes. If you did not ask for this, ignore this email — your password stays the same.</p>
                <p>MarketLink</p>
                """
                .formatted(HtmlUtils.htmlEscape(fullName), safeLink, minutes);
    }
}
