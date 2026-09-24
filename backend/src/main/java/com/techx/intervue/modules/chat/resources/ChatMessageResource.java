package com.techx.intervue.modules.chat.resources;

import java.time.Instant;

public record ChatMessageResource(String role, String message, String intent, Instant createdAt) {}
