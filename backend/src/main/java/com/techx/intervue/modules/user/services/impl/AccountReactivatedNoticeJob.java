package com.techx.intervue.modules.user.services.impl;

import com.techx.intervue.services.interfaces.JobHandler;
import com.techx.intervue.services.interfaces.MailServiceInterface;
import java.util.Map;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Component;

/** FR-072 step: tell the customer their account is active again (manual or auto-reactivate). */
@Component
@AllArgsConstructor
public class AccountReactivatedNoticeJob implements JobHandler {

    private final MailServiceInterface mailService;

    @Override
    public String type() {
        return AdminCustomerService.JOB_NOTIFY_REACTIVATED;
    }

    @Override
    public void handle(Map<String, String> payload) {
        mailService.sendHtml(
                payload.get("email"),
                "Your MarketLink account is active again",
                """
                <p>Dear %s,</p>
                <p>Your MarketLink account is active again — you can sign in and place orders right away.</p>
                <p>MarketLink</p>
                """
                        .formatted(payload.get("fullName")));
    }
}
