package com.techx.intervue.modules.user.services.impl;

import com.techx.intervue.services.interfaces.JobHandler;
import com.techx.intervue.services.interfaces.MailServiceInterface;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Component;

/** FR-007 bước D: báo cho user biết mật khẩu vừa được đổi. */
@Component
@AllArgsConstructor
public class PasswordChangedNoticeJob implements JobHandler {

    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");
    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final MailServiceInterface mailService;

    @Override
    public String type() {
        return PasswordResetService.JOB_NOTIFY_CHANGED;
    }

    @Override
    public void handle(Map<String, String> payload) {
        String at = ZonedDateTime.now(ZONE).format(TIME);
        mailService.sendHtml(
                payload.get("email"),
                "Your MarketLink password was changed",
                """
                <p>The password for your MarketLink account was changed at %s.</p>
                <p>You have been signed out on every device.</p>
                <p>If this was not you, use "Forgot password" to reset it right away and contact an administrator.</p>
                <p>MarketLink</p>
                """
                        .formatted(at));
    }
}
