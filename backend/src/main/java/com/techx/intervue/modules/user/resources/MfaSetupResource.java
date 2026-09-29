package com.techx.intervue.modules.user.resources;

public record MfaSetupResource(String secret, String otpauthUri) {}
