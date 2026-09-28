package com.techx.intervue.modules.user.resources;

import java.util.List;

/**
 * FR-008: turning two-step verification on returns the recovery codes (exactly once) and a new
 * access token — every earlier session was signed out, the caller's included (the new refresh token
 * comes as the cookie).
 */
public record MfaEnabledResource(List<String> codes, String accessToken) {}
