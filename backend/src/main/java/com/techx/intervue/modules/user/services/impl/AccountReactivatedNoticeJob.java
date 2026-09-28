package com.techx.intervue.modules.user.services.impl;

import com.techx.intervue.modules.user.entities.UserSettings;
import com.techx.intervue.modules.user.repositories.UserSettingsRepository;
import com.techx.intervue.services.interfaces.JobHandler;
import com.techx.intervue.services.interfaces.MailServiceInterface;
import java.util.Map;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Component;

/** FR-072: tell the customer their account is active again (manual or auto-reactivate). */
@Component
@AllArgsConstructor
public class AccountReactivatedNoticeJob implements JobHandler {

    private final MailServiceInterface mailService;
    private final AccountStatusMail letters;
    private final UserSettingsRepository settings;

    @Override
    public String type() {
        return AdminCustomerService.JOB_NOTIFY_REACTIVATED;
    }

    @Override
    public void handle(Map<String, String> payload) {
        AccountStatusMail.Content letter =
                letters.reactivated(payload.get("fullName"), languageOf(payload.get("userId")));
        mailService.send(payload.get("email"), letter.subject(), letter.html(), letter.text());
    }

    /** Their own language (Settings → Language); English when they never chose one. */
    private String languageOf(String userId) {
        if (userId == null || userId.isBlank()) return "en";
        return settings.findById(Long.valueOf(userId)).map(UserSettings::getLanguage).orElse("en");
    }
}
