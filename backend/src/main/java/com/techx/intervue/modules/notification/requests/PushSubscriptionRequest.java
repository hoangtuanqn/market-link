package com.techx.intervue.modules.notification.requests;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Dạng PushSubscription.toJSON() của trình duyệt: { endpoint, keys: { p256dh, auth } }. */
public record PushSubscriptionRequest(
        @NotBlank @Size(max = 500) @Pattern(regexp = "^https?://\\S+$") String endpoint,
        @NotNull @Valid Keys keys) {

    public record Keys(
            @NotBlank @Size(max = 200) String p256dh, @NotBlank @Size(max = 100) String auth) {}
}
