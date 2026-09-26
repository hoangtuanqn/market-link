package com.techx.intervue.modules.conversation.services.interfaces;

import com.techx.intervue.modules.conversation.requests.ReportMessageRequest;
import com.techx.intervue.modules.conversation.resources.MessageReportResource;

public interface MessageReportServiceInterface {

    /** FR-116. Chỉ thành viên trong thread báo được, và chỉ báo tin của người kia. */
    MessageReportResource report(Long meId, Long messageId, ReportMessageRequest request);
}
