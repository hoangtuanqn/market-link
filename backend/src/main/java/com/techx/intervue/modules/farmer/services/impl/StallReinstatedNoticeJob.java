package com.techx.intervue.modules.farmer.services.impl;

import com.techx.intervue.modules.user.entities.UserSettings;
import com.techx.intervue.modules.user.repositories.UserSettingsRepository;
import com.techx.intervue.services.interfaces.JobHandler;
import com.techx.intervue.services.interfaces.MailServiceInterface;
import java.util.Map;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Component;

/** FR-071: tell the Farmer their stall is open again (manual or auto-reinstate). */
@Component
@AllArgsConstructor
public class StallReinstatedNoticeJob implements JobHandler {

    private final MailServiceInterface mailService;
    private final StallStatusMail letters;
    private final UserSettingsRepository settings;

    @Override
    public String type() {
        return FarmerService.JOB_NOTIFY_REINSTATED;
    }

    @Override
    public void handle(Map<String, String> payload) {
        StallStatusMail.Content letter =
                letters.reinstated(
                        payload.get("fullName"),
                        payload.get("stallName"),
                        languageOf(payload.get("userId")));
        mailService.send(payload.get("email"), letter.subject(), letter.html(), letter.text());
    }

    /** Their own language (Settings → Language); English when they never chose one. */
    private String languageOf(String userId) {
        if (userId == null || userId.isBlank()) return "en";
        return settings.findById(Long.valueOf(userId)).map(UserSettings::getLanguage).orElse("en");
    }
}
