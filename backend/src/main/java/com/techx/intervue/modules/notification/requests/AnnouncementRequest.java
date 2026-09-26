package com.techx.intervue.modules.notification.requests;

import com.techx.intervue.modules.notification.enums.Audience;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;

/** FR-077. startsAt / endsAt only control the public banner; null = unbounded on that side. */
public record AnnouncementRequest(
        @NotBlank @Size(max = 150) String title,
        @NotBlank @Size(max = 1000) String content,
        @NotNull Audience audience,
        Instant startsAt,
        Instant endsAt) {}
