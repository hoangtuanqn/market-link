package com.techx.intervue.modules.conversation.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.conversation.entities.Message;
import com.techx.intervue.modules.conversation.entities.MessageReport;
import com.techx.intervue.modules.conversation.enums.MessageKind;
import com.techx.intervue.modules.conversation.enums.ReportReason;
import com.techx.intervue.modules.conversation.enums.ReportStatus;
import com.techx.intervue.modules.conversation.repositories.MessageReportRepository;
import com.techx.intervue.modules.conversation.repositories.MessageRepository;
import com.techx.intervue.modules.conversation.resources.AdminReportListItemResource;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.repositories.UserRepository;
import com.techx.intervue.resources.PageResource;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

class ModerationServiceTest {

    static final Instant NOW = Instant.parse("2026-09-26T06:00:00Z");

    MessageReportRepository reports;
    MessageRepository messages;
    UserRepository users;
    ModerationService service;

    @BeforeEach
    void setUp() {
        reports = mock(MessageReportRepository.class);
        messages = mock(MessageRepository.class);
        users = mock(UserRepository.class);
        service =
                new ModerationService(reports, messages, users, Clock.fixed(NOW, ZoneId.of("UTC")));

        when(messages.findById(101L))
                .thenReturn(Optional.of(textMessage("Send me a deposit first")));
        when(users.findById(3L)).thenReturn(Optional.of(named(3L, "Seller Sam")));
        when(users.findById(7L)).thenReturn(Optional.of(named(7L, "Buyer Bea")));
    }

    @Test
    void showsWhoReportedWhatAndAShortPreview() {
        when(reports.findByStatusOrderByCreatedAtDesc(any(), any(Pageable.class)))
                .thenReturn(onePage(report(ReportStatus.NEW)));

        PageResource<AdminReportListItemResource> page = service.list(ReportStatus.NEW, 1, 20);

        assertThat(page.items())
                .singleElement()
                .satisfies(
                        item -> {
                            assertThat(item.reportId()).isEqualTo(9L);
                            assertThat(item.messageId()).isEqualTo(101L);
                            assertThat(item.conversationId()).isEqualTo(42L);
                            assertThat(item.reason()).isEqualTo(ReportReason.SCAM);
                            assertThat(item.reporterName()).isEqualTo("Buyer Bea");
                            assertThat(item.senderName()).isEqualTo("Seller Sam");
                            assertThat(item.preview()).isEqualTo("Send me a deposit first");
                        });
        assertThat(page.page()).isEqualTo(1);
        assertThat(page.total()).isEqualTo(1);
    }

    @Test
    void anImageMessageShowsAWordNotAnEmptyPreview() {
        when(messages.findById(101L))
                .thenReturn(
                        Optional.of(
                                Message.builder()
                                        .id(101L)
                                        .conversationId(42L)
                                        .senderId(3L)
                                        .kind(MessageKind.IMAGE)
                                        .createdAt(NOW)
                                        .build()));
        when(reports.findByStatusOrderByCreatedAtDesc(any(), any(Pageable.class)))
                .thenReturn(onePage(report(ReportStatus.NEW)));

        assertThat(service.list(ReportStatus.NEW, 1, 20).items())
                .singleElement()
                .satisfies(item -> assertThat(item.preview()).isEqualTo("Photo"));
    }

    /** Hàng đợi là nơi quyết định có mở ra xem không, không phải nơi đọc hàng loạt (spec §8.3). */
    @Test
    void aVeryLongMessageIsCutInTheQueue() {
        when(messages.findById(101L)).thenReturn(Optional.of(textMessage("a".repeat(500))));
        when(reports.findByStatusOrderByCreatedAtDesc(any(), any(Pageable.class)))
                .thenReturn(onePage(report(ReportStatus.NEW)));

        assertThat(service.list(ReportStatus.NEW, 1, 20).items())
                .singleElement()
                .satisfies(
                        item ->
                                assertThat(item.preview())
                                        .hasSize(ModerationService.PREVIEW_LENGTH));
    }

    @Test
    void noStatusFilterListsEverything() {
        when(reports.findAllByOrderByCreatedAtDesc(any(Pageable.class)))
                .thenReturn(onePage(report(ReportStatus.ACTIONED)));

        service.list(null, 1, 20);

        verify(reports).findAllByOrderByCreatedAtDesc(any(Pageable.class));
    }

    @Test
    void pageNumbersAreOneBasedOnTheWayInAndOnTheWayOut() {
        when(reports.findByStatusOrderByCreatedAtDesc(any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(2, 20), 0));

        PageResource<AdminReportListItemResource> page = service.list(ReportStatus.NEW, 3, 20);

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(reports).findByStatusOrderByCreatedAtDesc(any(), pageable.capture());
        assertThat(pageable.getValue().getPageNumber()).isEqualTo(2); // 1-based → 0-based
        assertThat(page.page()).isEqualTo(3);
    }

    /** FR-072 chỉ vô hiệu hoá tài khoản chứ không xoá, nên đây là nhánh phòng thân. */
    @Test
    void aMissingUserRowDoesNotBlowUpTheQueue() {
        when(users.findById(7L)).thenReturn(Optional.empty());
        when(reports.findByStatusOrderByCreatedAtDesc(any(), any(Pageable.class)))
                .thenReturn(onePage(report(ReportStatus.NEW)));

        assertThat(service.list(ReportStatus.NEW, 1, 20).items())
                .singleElement()
                .satisfies(item -> assertThat(item.reporterName()).isEqualTo("Unknown user"));
    }

    private static Page<MessageReport> onePage(MessageReport report) {
        return new PageImpl<>(List.of(report), PageRequest.of(0, 20), 1);
    }

    private static MessageReport report(ReportStatus status) {
        return MessageReport.builder()
                .id(9L)
                .messageId(101L)
                .reportedBy(7L)
                .reason(ReportReason.SCAM)
                .note("asked for a deposit")
                .status(status)
                .createdAt(NOW)
                .build();
    }

    private static Message textMessage(String body) {
        return Message.builder()
                .id(101L)
                .conversationId(42L)
                .senderId(3L)
                .kind(MessageKind.TEXT)
                .body(body)
                .createdAt(NOW)
                .build();
    }

    private static User named(Long id, String fullName) {
        return User.builder().id(id).fullName(fullName).build();
    }
}
