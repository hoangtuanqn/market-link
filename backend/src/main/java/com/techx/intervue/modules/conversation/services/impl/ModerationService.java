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

/** FR-116, spec §8.3. Admin đọc tới đâu là do bảng message_reports quyết, không do vai quyết. */
@Service
@RequiredArgsConstructor
public class ModerationService implements ModerationServiceInterface {

    /** Đủ để nhận ra tin nào, không đủ để đọc cả hộp thư. */
    static final int PREVIEW_LENGTH = 80;

    static final String IMAGE_PREVIEW = "Photo";

    static final String UNKNOWN_USER = "Unknown user";

    /** Spec §8.3: "tối đa 5 tin liền trước và 5 tin liền sau". */
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
        Collections.reverse(before); // truy vấn trả mới→cũ, hiển thị thì cũ→mới
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
        // Idempotent: hai admin cùng xử lý một hàng đợi thì người ẩn TRƯỚC là người chịu trách
        // nhiệm; ghi đè sẽ xoá mất dấu vết kiểm toán đó.
        if (!message.isHidden()) {
            message.setHiddenAt(now);
            message.setHiddenBy(adminId);
            messages.save(message);

            Conversation thread =
                    conversations
                            .findById(message.getConversationId())
                            .orElseThrow(
                                    () -> new EntityNotFoundException("Conversation not found."));
            // Chỉ phát khi đã commit, giống MessageService: không phát một thay đổi có thể rollback
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
        // markHandledBy tự bỏ qua khi status != NEW, nên gọi lại lần nữa không đổi gì
        report.markHandledBy(adminId, ReportStatus.REVIEWED, clock.instant());
        return MessageReportResource.from(report);
    }

    /**
     * `reported` đúng cho tin trung tâm, và cũng đúng cho tin ngữ cảnh nào đang có báo cáo riêng —
     * Task 7 dùng cờ này để quyết cho admin xem ảnh hay không.
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

    /** Tài khoản bị vô hiệu hoá vẫn còn hàng trong users (FR-072), nên đây là nhánh phòng thân. */
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
