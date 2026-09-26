package com.techx.intervue.modules.user.resources;

/** FR-007: the email of the account the password-reset link belongs to. */
public record ResetTokenResource(String email) {}
