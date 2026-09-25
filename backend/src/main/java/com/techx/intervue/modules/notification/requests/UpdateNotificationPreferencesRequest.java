package com.techx.intervue.modules.notification.requests;

import com.techx.intervue.modules.notification.resources.NotificationPreferencesResource.CategoryPreference;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

public record UpdateNotificationPreferencesRequest(
        @NotNull @Size(max = 10) List<@Valid @NotNull CategoryPreference> categories,
        @NotNull Boolean sound,
        @NotNull Boolean quietOn,
        @NotNull
                @Pattern(regexp = UpdateNotificationPreferencesRequest.HHMM, message = "Use HH:mm.")
                String quietFrom,
        @NotNull
                @Pattern(regexp = UpdateNotificationPreferencesRequest.HHMM, message = "Use HH:mm.")
                String quietTo) {

    public static final String HHMM = "^([01]\\d|2[0-3]):[0-5]\\d$";
}
