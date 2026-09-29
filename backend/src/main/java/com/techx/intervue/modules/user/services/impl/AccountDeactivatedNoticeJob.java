package com.techx.intervue.modules.user.services.impl;

import com.techx.intervue.modules.user.entities.UserSettings;
import com.techx.intervue.modules.user.repositories.UserSettingsRepository;
import com.techx.intervue.services.interfaces.JobHandler;
import com.techx.intervue.services.interfaces.MailServiceInterface;
import java.time.Instant;
import java.util.Map;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@AllArgsConstructor
public class AccountDeactivatedNoticeJob implements JobHandler {

    private final MailServiceInterface mailService;
    private final AccountStatusMail letters;
    private final UserSettingsRepository settings;

    @Override
    public String type() {
        return AdminCustomerService.JOB_NOTIFY_DEACTIVATED;
    }

    @Override
    public void handle(Map<String, String> payload) {
        String until = payload.get("until");
        AccountStatusMail.Content letter =
                letters.deactivated(
                        payload.get("fullName"),
                        payload.get("reason"),
                        until == null || until.isBlank() ? null : Instant.parse(until),
                        languageOf(payload.get("userId")));
        mailService.send(payload.get("email"), letter.subject(), letter.html(), letter.text());
    }

    private String languageOf(String userId) {
        if (userId == null || userId.isBlank()) return "en";
        return settings.findById(Long.valueOf(userId)).map(UserSettings::getLanguage).orElse("en");
    }
}
