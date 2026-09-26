package com.techx.intervue.modules.conversation.exceptions;

/** Spec §8.5: người gửi không xoá được tin của mình, nên cũng không tự báo cáo. 400. */
public class CannotReportOwnMessageException extends RuntimeException {
    public CannotReportOwnMessageException() {
        super("You cannot report your own message.");
    }
}
