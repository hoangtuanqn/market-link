package com.techx.intervue.modules.notification.resources;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;

/** GET/PUT /api/v1/notifications/preferences — only the categories of the reader's role. */
public record NotificationPreferencesResource(
        List<CategoryPreference> categories,
        boolean sound,
        boolean quietOn,
        String quietFrom,
        String quietTo) {

    public record CategoryPreference(
            @NotBlank String category, @NotNull Boolean inApp, @NotNull Boolean browser) {}
}
