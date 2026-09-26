package com.techx.intervue.modules.conversation.exceptions;

/**
 * Spec §8.3: quyền đọc và ẩn của admin bắt nguồn từ một báo cáo, không từ vai. Tin chưa ai báo cáo
 * thì nằm ngoài tầm với — 403, và thông điệp nói thẳng ranh giới đó để chính admin biết.
 */
public class ModerationOutOfScopeException extends RuntimeException {
    public ModerationOutOfScopeException() {
        super("Admins can only act on messages that have been reported.");
    }
}
