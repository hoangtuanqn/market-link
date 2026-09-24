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
                "Mật khẩu MarketLink vừa được thay đổi",
                """
                <p>Mật khẩu tài khoản MarketLink của bạn vừa được thay đổi lúc %s.</p>
                <p>Mọi phiên đăng nhập cũ đã bị đăng xuất.</p>
                <p>Nếu không phải bạn thực hiện, hãy dùng chức năng "Quên mật khẩu" để đặt lại ngay và liên hệ quản trị viên.</p>
                <p>MarketLink</p>
                """
                        .formatted(at));
    }
}
