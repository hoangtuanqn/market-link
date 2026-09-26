package com.techx.intervue.modules.conversation.requests;

import com.techx.intervue.modules.conversation.enums.ReportReason;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** FR-116. note is the reporter's extra account, optional. */
public record ReportMessageRequest(
        @NotNull(message = "Choose a reason for reporting this message.") ReportReason reason,
        @Size(max = 255, message = "The note can be at most 255 characters.") String note) {}
