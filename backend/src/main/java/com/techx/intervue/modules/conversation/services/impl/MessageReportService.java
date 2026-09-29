package com.techx.intervue.modules.conversation.services.impl;

import com.techx.intervue.modules.conversation.entities.Message;
import com.techx.intervue.modules.conversation.entities.MessageReport;
import com.techx.intervue.modules.conversation.exceptions.AlreadyReportedException;
import com.techx.intervue.modules.conversation.exceptions.CannotReportOwnMessageException;
import com.techx.intervue.modules.conversation.repositories.MessageReportRepository;
import com.techx.intervue.modules.conversation.repositories.MessageRepository;
import com.techx.intervue.modules.conversation.requests.ReportMessageRequest;
import com.techx.intervue.modules.conversation.resources.MessageReportResource;
import com.techx.intervue.modules.conversation.services.interfaces.MessageReportServiceInterface;
import jakarta.persistence.EntityNotFoundException;
import java.time.Clock;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MessageReportService implements MessageReportServiceInterface {

    private final MessageReportRepository reports;
    private final MessageRepository messages;
    private final ConversationLookup lookup;
    private final Clock clock;

    @Override
    @Transactional
    public MessageReportResource report(Long meId, Long messageId, ReportMessageRequest request) {
        Message message =
                messages.findById(messageId)
                        .orElseThrow(() -> new EntityNotFoundException("Message not found."));
        lookup.requireMember(meId, message.getConversationId());
        if (message.isHidden()) {
            throw new EntityNotFoundException("Message not found.");
        }
        if (message.getSenderId().equals(meId)) {
            throw new CannotReportOwnMessageException();
        }
        if (reports.existsByMessageIdAndReportedBy(messageId, meId)) {
            throw new AlreadyReportedException();
        }

        MessageReport saved =
                reports.save(
                        MessageReport.builder()
                                .messageId(messageId)
                                .reportedBy(meId)
                                .reason(request.reason())
                                .note(note(request))
                                .createdAt(clock.instant())
                                .build());
        return MessageReportResource.from(saved);
    }

    private static String note(ReportMessageRequest request) {
        if (request.note() == null) {
            return null;
        }
        String trimmed = request.note().strip();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
