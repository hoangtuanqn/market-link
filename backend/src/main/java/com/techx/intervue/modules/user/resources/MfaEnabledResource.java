package com.techx.intervue.modules.user.resources;

import java.util.List;

public record MfaEnabledResource(List<String> codes, String accessToken) {}
