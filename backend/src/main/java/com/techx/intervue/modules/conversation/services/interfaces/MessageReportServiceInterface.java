package com.techx.intervue.modules.conversation.services.interfaces;

import com.techx.intervue.modules.conversation.requests.ReportMessageRequest;
import com.techx.intervue.modules.conversation.resources.MessageReportResource;

public interface MessageReportServiceInterface {

    /** FR-116. Only members of the thread can report, and only the other person's messages. */
    MessageReportResource report(Long meId, Long messageId, ReportMessageRequest request);
}
