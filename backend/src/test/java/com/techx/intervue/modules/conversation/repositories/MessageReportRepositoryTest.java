package com.techx.intervue.modules.conversation.repositories;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.techx.intervue.modules.conversation.entities.Conversation;
import com.techx.intervue.modules.conversation.entities.Message;
import com.techx.intervue.modules.conversation.entities.MessageReport;
import com.techx.intervue.modules.conversation.enums.ReportReason;
import com.techx.intervue.modules.conversation.enums.ReportStatus;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.repositories.UserRepository;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;

/**
 * Runs on real MySQL like MessageAttachmentRepositoryTest — UNIQUE and FK must really be enforced.
 */
@SpringBootTest
@Transactional
class MessageReportRepositoryTest {

    @Autowired MessageReportRepository reports;
    @Autowired ConversationRepository conversations;
    @Autowired MessageRepository messages;
    @Autowired UserRepository users;

    @Test
    void onePersonCanReportOneMessageOnlyOnce() {
        User customer = user(RoleType.CUSTOMER);
        Long messageId = messageFrom(customer);

        reports.saveAndFlush(report(messageId, customer.getId(), ReportReason.SPAM));

        assertThatThrownBy(
                        () ->
                                reports.saveAndFlush(
                                        report(messageId, customer.getId(), ReportReason.ABUSE)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void twoDifferentPeopleCanReportTheSameMessage() {
        User a = user(RoleType.CUSTOMER);
        User b = user(RoleType.CUSTOMER);
        Long messageId = messageFrom(a);

        reports.saveAndFlush(report(messageId, a.getId(), ReportReason.SPAM));
        reports.saveAndFlush(report(messageId, b.getId(), ReportReason.SCAM));

        assertThat(reports.findByMessageId(messageId)).hasSize(2);
    }

    @Test
    void knowsWhetherAPersonAlreadyReportedAMessage() {
        User customer = user(RoleType.CUSTOMER);
        Long messageId = messageFrom(customer);
        reports.saveAndFlush(report(messageId, customer.getId(), ReportReason.OTHER));

        assertThat(reports.existsByMessageIdAndReportedBy(messageId, customer.getId())).isTrue();
        assertThat(reports.existsByMessageIdAndReportedBy(messageId, 999_999L)).isFalse();
    }

    /** Spec §8.3: the admin's right to read comes from this question. */
    @Test
    void knowsWhetherAMessageHasAnyReportAtAll() {
        User customer = user(RoleType.CUSTOMER);
        Long reported = messageFrom(customer);
        Long untouched = messageFrom(customer);
        reports.saveAndFlush(report(reported, customer.getId(), ReportReason.SPAM));

        assertThat(reports.existsByMessageId(reported)).isTrue();
        assertThat(reports.existsByMessageId(untouched)).isFalse();
    }

    @Test
    void listsOnlyTheStatusAskedFor() {
        User customer = user(RoleType.CUSTOMER);
        MessageReport fresh =
                reports.saveAndFlush(
                        report(messageFrom(customer), customer.getId(), ReportReason.SPAM));
        MessageReport done = report(messageFrom(customer), customer.getId(), ReportReason.ABUSE);
        done.setStatus(ReportStatus.ACTIONED);
        reports.saveAndFlush(done);

        assertThat(
                        reports.findByStatusOrderByCreatedAtDesc(
                                ReportStatus.NEW, PageRequest.of(0, 20)))
                .extracting(MessageReport::getId)
                .contains(fresh.getId())
                .doesNotContain(done.getId());
    }

    private Long messageFrom(User sender) {
        Conversation c =
                conversations.saveAndFlush(
                        Conversation.between(sender.getId(), user(RoleType.FARMER).getId()));
        return messages.saveAndFlush(
                        Message.builder()
                                .conversationId(c.getId())
                                .senderId(sender.getId())
                                .body("hello")
                                .build())
                .getId();
    }

    private static MessageReport report(Long messageId, Long reportedBy, ReportReason reason) {
        return MessageReport.builder()
                .messageId(messageId)
                .reportedBy(reportedBy)
                .reason(reason)
                .build();
    }

    private User user(RoleType role) {
        String tag = UUID.randomUUID().toString().substring(0, 8);
        return users.saveAndFlush(
                User.builder()
                        .fullName("Test " + tag)
                        .email(tag + "@report.test")
                        .phone("04" + String.format("%08d", Math.abs(tag.hashCode()) % 100_000_000))
                        .passwordHash("x")
                        .role(role)
                        .build());
    }
}
