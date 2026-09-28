package com.techx.intervue.modules.conversation.resources;

import java.time.Instant;

/**
 * FR-115 §5: a short-lived link a video element can play and seek without a token. {@code url} is
 * relative to the API origin.
 */
public record StreamUrlResource(String url, Instant expiresAt) {}
