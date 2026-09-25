package com.techx.intervue.modules.user.resources;

import java.util.List;

/** FR-008: mã khôi phục, chỉ trả về đúng một lần lúc bật. */
public record MfaRecoveryCodesResource(List<String> codes) {}
