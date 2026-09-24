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
                                    "Đặt lại mật khẩu MarketLink",
                                    body(issued.fullName(), link));
                        });
    }

    private String body(String fullName, String link) {
        long minutes = config.getTokenTtlSeconds() / 60;
        String safeLink = HtmlUtils.htmlEscape(link);
        return """
                <p>Chào %s,</p>
                <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản MarketLink của bạn.</p>
                <p><a href="%s">Đặt lại mật khẩu</a></p>
                <p>Link chỉ dùng được một lần và hết hạn sau %d phút. Nếu bạn không yêu cầu, hãy bỏ qua mail này — mật khẩu của bạn không thay đổi.</p>
                <p>MarketLink</p>
                """
                .formatted(HtmlUtils.htmlEscape(fullName), safeLink, minutes);
    }
}
