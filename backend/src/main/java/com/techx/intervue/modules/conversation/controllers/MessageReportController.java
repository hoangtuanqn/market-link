package com.techx.intervue.modules.conversation.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.conversation.requests.ReportMessageRequest;
import com.techx.intervue.modules.conversation.resources.MessageReportResource;
import com.techx.intervue.modules.conversation.services.interfaces.MessageReportServiceInterface;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import com.techx.intervue.resources.ApiResource;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * FR-116. The path is by message, not by thread (spec §6.1): the client already holds the messageId
 * from the message list, no need to make it repeat the conversationId.
 */
@RestController
@RequestMapping("/api/v1/messages")
@AllArgsConstructor
public class MessageReportController extends BaseController {

    private final MessageReportServiceInterface reportService;

    @PostMapping("/{id}/report")
    public ResponseEntity<ApiResource<MessageReportResource>> report(
            @PathVariable Long id,
            @Valid @RequestBody ReportMessageRequest request,
            @AuthenticationPrincipal CustomUserDetails me) {
        return created(reportService.report(me.getId(), id, request), "Report received.");
    }
}
