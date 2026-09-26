package com.techx.intervue.modules.conversation.services.impl;

import com.techx.intervue.modules.conversation.entities.Message;
import com.techx.intervue.modules.conversation.entities.MessageReport;
import com.techx.intervue.modules.conversation.enums.MessageKind;
import com.techx.intervue.modules.conversation.enums.ReportStatus;
import com.techx.intervue.modules.conversation.repositories.MessageReportRepository;
import com.techx.intervue.modules.conversation.repositories.MessageRepository;
import com.techx.intervue.modules.conversation.resources.AdminReportListItemResource;
import com.techx.intervue.modules.conversation.services.interfaces.ModerationServiceInterface;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.repositories.UserRepository;
import com.techx.intervue.resources.PageResource;
import java.time.Clock;
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

    private final MessageReportRepository reports;
    private final MessageRepository messages;
    private final UserRepository users;

    /** Chưa dùng ở danh sách; hide() và dismiss() ở task sau cần nó để ghi reviewedAt. */
    private final Clock clock;

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
