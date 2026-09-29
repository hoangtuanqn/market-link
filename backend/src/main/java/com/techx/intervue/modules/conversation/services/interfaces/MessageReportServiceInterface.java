package com.techx.intervue.modules.conversation.services.interfaces;

import com.techx.intervue.modules.conversation.requests.ReportMessageRequest;
import com.techx.intervue.modules.conversation.resources.MessageReportResource;

public interface MessageReportServiceInterface {

    MessageReportResource report(Long meId, Long messageId, ReportMessageRequest request);
}
