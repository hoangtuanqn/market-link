package com.techx.intervue.modules.farmer.services.impl;

import com.techx.intervue.modules.user.entities.UserSettings;
import com.techx.intervue.modules.user.repositories.UserSettingsRepository;
import com.techx.intervue.services.interfaces.JobHandler;
import com.techx.intervue.services.interfaces.MailServiceInterface;
import java.time.Instant;
import java.util.Map;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Component;

/** FR-071: tell the Farmer their stall was suspended, why, and for how long. */
@Component
@AllArgsConstructor
public class StallSuspendedNoticeJob implements JobHandler {

    private final MailServiceInterface mailService;
    private final StallStatusMail letters;
    private final UserSettingsRepository settings;

    @Override
    public String type() {
        return FarmerService.JOB_NOTIFY_SUSPENDED;
    }

    @Override
    public void handle(Map<String, String> payload) {
        String until = payload.get("until");
        StallStatusMail.Content letter =
                letters.suspended(
                        payload.get("fullName"),
                        payload.get("stallName"),
                        payload.get("reason"),
                        until == null || until.isBlank() ? null : Instant.parse(until),
                        languageOf(payload.get("userId")));
        mailService.send(payload.get("email"), letter.subject(), letter.html(), letter.text());
    }

    /** Their own language (Settings → Language); English when they never chose one. */
    private String languageOf(String userId) {
        if (userId == null || userId.isBlank()) return "en";
        return settings.findById(Long.valueOf(userId)).map(UserSettings::getLanguage).orElse("en");
    }
}
