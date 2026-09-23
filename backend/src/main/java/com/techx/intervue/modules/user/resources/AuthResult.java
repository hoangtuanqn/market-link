package com.techx.intervue.modules.user.resources;

public record AuthResult(String accessToken, String refreshToken, UserResource user) {}
