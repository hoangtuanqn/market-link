package com.techx.intervue.modules.notification.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PushUnsubscribeRequest(@NotBlank @Size(max = 500) String endpoint) {}
