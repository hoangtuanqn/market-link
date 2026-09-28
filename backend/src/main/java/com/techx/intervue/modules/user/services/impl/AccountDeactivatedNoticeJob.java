package com.techx.intervue.modules.user.services.impl;

import com.techx.intervue.services.interfaces.JobHandler;
import com.techx.intervue.services.interfaces.MailServiceInterface;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Component;

/** FR-072 step: tell the customer their account was deactivated and why. */
@Component
@AllArgsConstructor
public class AccountDeactivatedNoticeJob implements JobHandler {

    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");
    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final MailServiceInterface mailService;

    @Override
    public String type() {
        return AdminCustomerService.JOB_NOTIFY_DEACTIVATED;
    }

    @Override
    public void handle(Map<String, String> payload) {
        String until = payload.get("until");
        String whenClause =
                until == null || until.isBlank()
                        ? "permanently"
                        : "until " + TIME.format(Instant.parse(until).atZone(ZONE));
        mailService.sendHtml(
                payload.get("email"),
                "Your MarketLink account has been deactivated",
                """
                <p>Dear %s,</p>
                <p>Your MarketLink account has been deactivated %s.</p>
                <p>Reason: %s</p>
                <p>You have been signed out on every device and cannot sign in while this is in effect.</p>
                <p>If you believe this is a mistake, please contact an administrator.</p>
                <p>MarketLink</p>
                """
                        .formatted(payload.get("fullName"), whenClause, payload.get("reason")));
    }
}
