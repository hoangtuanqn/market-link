package com.techx.intervue.modules.conversation.services.impl;

import com.techx.intervue.helpers.TransactionHelper;
import com.techx.intervue.modules.conversation.entities.Conversation;
import com.techx.intervue.modules.conversation.entities.Message;
import com.techx.intervue.modules.conversation.entities.MessageAttachment;
import com.techx.intervue.modules.conversation.entities.MessageReport;
import com.techx.intervue.modules.conversation.enums.MessageKind;
import com.techx.intervue.modules.conversation.enums.ReportStatus;
import com.techx.intervue.modules.conversation.exceptions.ModerationOutOfScopeException;
import com.techx.intervue.modules.conversation.repositories.ConversationRepository;
import com.techx.intervue.modules.conversation.repositories.MessageAttachmentRepository;
import com.techx.intervue.modules.conversation.repositories.MessageReportRepository;
import com.techx.intervue.modules.conversation.repositories.MessageRepository;
import com.techx.intervue.modules.conversation.resources.AdminReportDetailResource;
import com.techx.intervue.modules.conversation.resources.AdminReportListItemResource;
import com.techx.intervue.modules.conversation.resources.MessageReportResource;
import com.techx.intervue.modules.conversation.resources.ModeratedMessageResource;
import com.techx.intervue.modules.conversation.services.interfaces.ChatEventPublisherInterface;
import com.techx.intervue.modules.conversation.services.interfaces.ModerationServiceInterface;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.repositories.UserRepository;
import com.techx.intervue.resources.PageResource;
import jakarta.persistence.EntityNotFoundException;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * FR-116, spec §8.3. How much an admin can read is decided by the message_reports table, not by the
 * role.
 */
@Service
@RequiredArgsConstructor
public class ModerationService implements ModerationServiceInterface {

    /** Enough to recognize which message, not enough to read the whole mailbox. */
    static final int PREVIEW_LENGTH = 80;

    static final String IMAGE_PREVIEW = "Photo";

    static final String UNKNOWN_USER = "Unknown user";

    /** Spec §8.3: "at most 5 messages immediately before and 5 immediately after". */
    static final int CONTEXT_RADIUS = 5;

    private final MessageReportRepository reports;
    private final MessageRepository messages;
    private final UserRepository users;

    private final Clock clock;
    private final ConversationRepository conversations;
    private final ChatEventPublisherInterface events;
    private final MessageAttachmentRepository attachments;

    @Override
    @Transactional(readOnly = true)
    public PageResource<AdminReportListItemResource> list(
            ReportStatus status, int page, int pageSize) {
        Pageable pageable = PageRequest.of(Math.max(page - 1, 0), pageSize);
        Page<MessageReport> found =
                status == null
                        ? reports.findAllByOrderByCreatedAtDesc(pageable)
                        : reports.findByStatusOrderByCreatedAtDesc(status, pageable);

        List<AdminReportListItemResource> items =
                found.getContent().stream().map(this::toItem).toList();
        return PageResource.<AdminReportListItemResource>builder()
                .items(items)
                .page(page)
                .pageSize(pageSize)
                .total(found.getTotalElements())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public AdminReportDetailResource detail(Long reportId) {
        MessageReport report =
                reports.findById(reportId)
                        .orElseThrow(() -> new EntityNotFoundException("Report not found."));
        Message reported =
                messages.findById(report.getMessageId())
                        .orElseThrow(() -> new EntityNotFoundException("Message not found."));

        Pageable window = PageRequest.of(0, CONTEXT_RADIUS);
        List<Message> before =
                new ArrayList<>(
                        messages.findByConversationIdAndIdLessThanOrderByIdDesc(
                                reported.getConversationId(), reported.getId(), window));
        Collections.reverse(before); // the query returns new→old, display is old→new
        List<Message> after =
                messages.findByConversationIdAndIdGreaterThanOrderByIdAsc(
                        reported.getConversationId(), reported.getId(), window);

        List<Message> window2 = new ArrayList<>(before);
        window2.add(reported);
        window2.addAll(after);

        List<ModeratedMessageResource> context =
                window2.stream()
                        .map(m -> toModerated(m, m.getId().equals(reported.getId())))
                        .toList();

        return new AdminReportDetailResource(
                report.getId(),
                report.getMessageId(),
                reported.getConversationId(),
                report.getReason(),
                report.getNote(),
                report.getStatus(),
                nameOf(report.getReportedBy()),
                report.getCreatedAt(),
                context);
    }

    @Override
    @Transactional
    public ModeratedMessageResource hide(Long adminId, Long messageId) {
        Message message =
                messages.findById(messageId)
                        .orElseThrow(() -> new EntityNotFoundException("Message not found."));
        if (!reports.existsByMessageId(messageId)) {
            throw new ModerationOutOfScopeException();
        }

        Instant now = clock.instant();
        // Idempotent: when two admins work the same queue, the one who hid FIRST is accountable;
        // overwriting would erase that audit trail.
        if (!message.isHidden()) {
            message.setHiddenAt(now);
            message.setHiddenBy(adminId);
            messages.save(message);

            Conversation thread =
                    conversations
                            .findById(message.getConversationId())
                            .orElseThrow(
                                    () -> new EntityNotFoundException("Conversation not found."));
            // Only publish once committed, like MessageService: do not publish a change that could
            // roll back
            TransactionHelper.afterCommit(() -> events.messageHidden(thread, messageId));
        }
        reports.findByMessageId(messageId)
                .forEach(r -> r.markHandledBy(adminId, ReportStatus.ACTIONED, now));

        return toModerated(message, true);
    }

    @Override
    @Transactional
    public MessageReportResource dismiss(Long adminId, Long reportId) {
        MessageReport report =
                reports.findById(reportId)
                        .orElseThrow(() -> new EntityNotFoundException("Report not found."));
        // markHandledBy skips itself when status != NEW, so calling it again changes nothing
        report.markHandledBy(adminId, ReportStatus.REVIEWED, clock.instant());
        return MessageReportResource.from(report);
    }

    /**
     * `reported` is true for the central message, and also for any context message that has its own
     * report — Task 7 uses this flag to decide whether the admin may see the image.
     */
    private ModeratedMessageResource toModerated(Message m, boolean isCentre) {
        boolean photo = m.getKind() == MessageKind.IMAGE;
        boolean reported = isCentre || reports.existsByMessageId(m.getId());
        return new ModeratedMessageResource(
                m.getId(),
                m.getSenderId(),
                nameOf(m.getSenderId()),
                m.getKind(),
                m.getBody(),
                photo,
                photo && reported ? attachmentIdOf(m.getId()) : null,
                reported,
                m.isHidden(),
                m.getCreatedAt());
    }

    /**
     * Ảnh của một tin bị báo cáo, để admin mở qua GET /attachments/{id}. Hiếm, nên hỏi từng tin.
     */
    private Long attachmentIdOf(Long messageId) {
        return attachments.findByMessageIdIn(List.of(messageId)).stream()
                .findFirst()
                .map(MessageAttachment::getId)
                .orElse(null);
    }

    private AdminReportListItemResource toItem(MessageReport report) {
        Message message = messages.findById(report.getMessageId()).orElse(null);
        return new AdminReportListItemResource(
                report.getId(),
                report.getMessageId(),
                message == null ? null : message.getConversationId(),
                report.getReason(),
                report.getNote(),
                report.getStatus(),
                nameOf(report.getReportedBy()),
                message == null ? null : nameOf(message.getSenderId()),
                preview(message),
                report.getCreatedAt());
    }

    /** A deactivated account still has a row in users (FR-072), so this is a defensive branch. */
    private String nameOf(Long userId) {
        return users.findById(userId).map(User::getFullName).orElse(UNKNOWN_USER);
    }

    static String preview(Message message) {
        if (message == null) {
            return null;
        }
        if (message.getKind() == MessageKind.IMAGE) {
            return IMAGE_PREVIEW;
        }
        String body = message.getBody() == null ? "" : message.getBody();
        return body.length() <= PREVIEW_LENGTH ? body : body.substring(0, PREVIEW_LENGTH);
    }
}
