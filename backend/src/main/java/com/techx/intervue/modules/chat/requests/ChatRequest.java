package com.techx.intervue.modules.chat.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ChatRequest(
        @NotBlank(message = "Session key is required!")
                @Pattern(regexp = "^[A-Za-z0-9_-]{8,64}$", message = "Session key invalid!")
                String sessionKey,
        @NotBlank(message = "Message is required!")
                @Size(max = 500, message = "Maximum of 500 characters!")
                String message) {}
