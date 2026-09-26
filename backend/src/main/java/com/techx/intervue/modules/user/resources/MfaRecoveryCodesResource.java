package com.techx.intervue.modules.user.resources;

import java.util.List;

/** FR-008: recovery codes, returned exactly once when turned on. */
public record MfaRecoveryCodesResource(List<String> codes) {}
