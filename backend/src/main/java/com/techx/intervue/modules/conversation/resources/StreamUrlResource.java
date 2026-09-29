package com.techx.intervue.modules.conversation.resources;

import java.time.Instant;

public record StreamUrlResource(String url, Instant expiresAt) {}
