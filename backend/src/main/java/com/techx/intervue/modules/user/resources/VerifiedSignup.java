package com.techx.intervue.modules.user.resources;

/** FR-009: a code that matched; kept so the code can be given back if saving the account fails. */
public record VerifiedSignup(PendingSignup pending, String codeHash, long codeSecondsLeft) {}
