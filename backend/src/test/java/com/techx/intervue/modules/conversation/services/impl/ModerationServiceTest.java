package com.techx.intervue.modules.conversation.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.conversation.controllers.AdminMessageReportController;
import com.techx.intervue.modules.conversation.entities.Conversation;
import com.techx.intervue.modules.conversation.entities.Message;
import com.techx.intervue.modules.conversation.entities.MessageAttachment;
import com.techx.intervue.modules.conversation.entities.MessageReport;
import com.techx.intervue.modules.conversation.enums.MessageKind;
import com.techx.intervue.modules.conversation.enums.ReportReason;
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
import java.time.ZoneId;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestMapping;

class ModerationServiceTest {

    static final Instant NOW = Instant.parse("2026-09-26T06:00:00Z");

    MessageReportRepository reports;
    MessageRepository messages;
    UserRepository users;
    ConversationRepository conversations;
    ChatEventPublisherInterface events;
    ModerationService service;
    Conversation thread;
    MessageAttachmentRepository attachments;

    @BeforeEach
    void setUp() {
        reports = mock(MessageReportRepository.class);
        messages = mock(MessageRepository.class);
        users = mock(UserRepository.class);
        conversations = mock(ConversationRepository.class);
        events = mock(ChatEventPublisherInterface.class);
        attachments = mock(MessageAttachmentRepository.class);
        service =
                new ModerationService(
                        reports,
                        messages,
                        users,
                        Clock.fixed(NOW, ZoneId.of("UTC")),
                        conversations,
                        events,
                        attachments);

        thread = Conversation.between(3L, 7L);
        thread.setId(42L);
        when(conversations.findById(42L)).thenReturn(Optional.of(thread));
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

    @Test
    void detailPutsTheReportedMessageInTheMiddleOfItsNeighbours() {
        when(reports.findById(9L)).thenReturn(Optional.of(report(ReportStatus.NEW)));
        when(messages.findByConversationIdAndIdLessThanOrderByIdDesc(eq(42L), eq(101L), any()))
                .thenReturn(List.of(textMessageWithId(100L, "before")));
        when(messages.findByConversationIdAndIdGreaterThanOrderByIdAsc(eq(42L), eq(101L), any()))
                .thenReturn(List.of(textMessageWithId(102L, "after")));

        AdminReportDetailResource detail = service.detail(9L);

        assertThat(detail.reportId()).isEqualTo(9L);
        assertThat(detail.conversationId()).isEqualTo(42L);
        assertThat(detail.reporterName()).isEqualTo("Buyer Bea");
        assertThat(detail.context())
                .extracting(ModeratedMessageResource::id)
                .containsExactly(100L, 101L, 102L);
        assertThat(detail.context())
                .filteredOn(ModeratedMessageResource::reported)
                .extracting(ModeratedMessageResource::id)
                .containsExactly(101L);
    }

    @Test
    void detailAsksForAtMostFiveMessagesOnEachSide() {
        when(reports.findById(9L)).thenReturn(Optional.of(report(ReportStatus.NEW)));
        when(messages.findByConversationIdAndIdLessThanOrderByIdDesc(eq(42L), eq(101L), any()))
                .thenReturn(List.of());
        when(messages.findByConversationIdAndIdGreaterThanOrderByIdAsc(eq(42L), eq(101L), any()))
                .thenReturn(List.of());

        service.detail(9L);

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(messages)
                .findByConversationIdAndIdLessThanOrderByIdDesc(
                        eq(42L), eq(101L), pageable.capture());
        assertThat(pageable.getValue().getPageSize()).isEqualTo(ModerationService.CONTEXT_RADIUS);
        assertThat(ModerationService.CONTEXT_RADIUS).isEqualTo(5);
    }

    /** Ngữ cảnh trả về theo thứ tự cũ → mới, dù truy vấn "trước" trả mới → cũ. */
    @Test
    void theContextReadsOldestFirst() {
        when(reports.findById(9L)).thenReturn(Optional.of(report(ReportStatus.NEW)));
        when(messages.findByConversationIdAndIdLessThanOrderByIdDesc(eq(42L), eq(101L), any()))
                .thenReturn(
                        List.of(
                                textMessageWithId(100L, "newest before"),
                                textMessageWithId(99L, "older"),
                                textMessageWithId(98L, "oldest")));
        when(messages.findByConversationIdAndIdGreaterThanOrderByIdAsc(eq(42L), eq(101L), any()))
                .thenReturn(List.of());

        assertThat(service.detail(9L).context())
                .extracting(ModeratedMessageResource::id)
                .containsExactly(98L, 99L, 100L, 101L);
    }

    @Test
    void detailShowsWhetherAContextMessageCarriesAPhotoWithoutLeakingIt() {
        when(reports.findById(9L)).thenReturn(Optional.of(report(ReportStatus.NEW)));
        when(messages.findByConversationIdAndIdLessThanOrderByIdDesc(eq(42L), eq(101L), any()))
                .thenReturn(
                        List.of(
                                Message.builder()
                                        .id(100L)
                                        .conversationId(42L)
                                        .senderId(3L)
                                        .kind(MessageKind.IMAGE)
                                        .createdAt(NOW)
                                        .build()));
        when(messages.findByConversationIdAndIdGreaterThanOrderByIdAsc(eq(42L), eq(101L), any()))
                .thenReturn(List.of());

        assertThat(service.detail(9L).context())
                .filteredOn(m -> m.id().equals(100L))
                .singleElement()
                .satisfies(
                        m -> {
                            assertThat(m.hasPhoto()).isTrue();
                            assertThat(m.body()).isNull();
                            // chưa bị báo cáo → readAsAdmin sẽ từ chối, nên không đưa id ra
                            assertThat(m.attachmentId()).isNull();
                        });
    }

    /** Ảnh của CHÍNH tin bị báo cáo: admin cần id để mở qua GET /attachments/{id} (readAsAdmin). */
    @Test
    void detailGivesTheAdminTheReportedPhoto() {
        when(reports.findById(9L)).thenReturn(Optional.of(report(ReportStatus.NEW)));
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
        when(messages.findByConversationIdAndIdLessThanOrderByIdDesc(eq(42L), eq(101L), any()))
                .thenReturn(List.of());
        when(messages.findByConversationIdAndIdGreaterThanOrderByIdAsc(eq(42L), eq(101L), any()))
                .thenReturn(List.of());
        when(attachments.findByMessageIdIn(List.of(101L)))
                .thenReturn(List.of(MessageAttachment.builder().id(5L).messageId(101L).build()));

        assertThat(service.detail(9L).context())
                .filteredOn(m -> m.id().equals(101L))
                .singleElement()
                .satisfies(m -> assertThat(m.attachmentId()).isEqualTo(5L));
    }

    /** Admin thấy tin đã bị ẩn (khác người dùng thường), kèm cờ để UI hiện khác đi. */
    @Test
    void detailMarksAHiddenNeighbourAsHidden() {
        when(reports.findById(9L)).thenReturn(Optional.of(report(ReportStatus.NEW)));
        Message hidden = textMessageWithId(100L, "hidden earlier");
        hidden.setHiddenAt(NOW);
        when(messages.findByConversationIdAndIdLessThanOrderByIdDesc(eq(42L), eq(101L), any()))
                .thenReturn(List.of(hidden));
        when(messages.findByConversationIdAndIdGreaterThanOrderByIdAsc(eq(42L), eq(101L), any()))
                .thenReturn(List.of());

        assertThat(service.detail(9L).context())
                .filteredOn(m -> m.id().equals(100L))
                .singleElement()
                .satisfies(m -> assertThat(m.hidden()).isTrue());
    }

    /** Tin ngữ cảnh nào cũng đang có báo cáo riêng thì cũng mang cờ reported. */
    @Test
    void aNeighbourThatIsAlsoReportedCarriesTheFlagToo() {
        when(reports.findById(9L)).thenReturn(Optional.of(report(ReportStatus.NEW)));
        when(reports.existsByMessageId(100L)).thenReturn(true);
        when(messages.findByConversationIdAndIdLessThanOrderByIdDesc(eq(42L), eq(101L), any()))
                .thenReturn(List.of(textMessageWithId(100L, "also reported")));
        when(messages.findByConversationIdAndIdGreaterThanOrderByIdAsc(eq(42L), eq(101L), any()))
                .thenReturn(List.of());

        assertThat(service.detail(9L).context())
                .filteredOn(ModeratedMessageResource::reported)
                .extracting(ModeratedMessageResource::id)
                .containsExactly(100L, 101L);
    }

    @Test
    void anUnknownReportIsNotFound() {
        when(reports.findById(9L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.detail(9L)).isInstanceOf(EntityNotFoundException.class);
    }

    /**
     * Review Focus #1. Thứ cần ghim là **sự vắng mặt** của một khả năng, nên test soi chính bề mặt
     * API: không method nào của service nhận một conversationId, và không đường dẫn nào của
     * controller admin nhắc tới conversation. Thêm một endpoint như vậy là phá spec §8.3.
     */
    @Test
    void adminCannotReachAThreadThatHasNoReport() {
        assertThat(ModerationServiceInterface.class.getDeclaredMethods())
                .describedAs("cửa vào duy nhất của admin là reportId / messageId")
                .noneMatch(m -> m.getName().toLowerCase(Locale.ROOT).contains("conversation"));

        String base =
                AdminMessageReportController.class.getAnnotation(RequestMapping.class).value()[0];
        assertThat(base).isEqualTo("/api/v1/admin/message-reports");
        assertThat(AdminMessageReportController.class.getDeclaredMethods())
                .allSatisfy(
                        m -> {
                            GetMapping get = m.getAnnotation(GetMapping.class);
                            PatchMapping patch = m.getAnnotation(PatchMapping.class);
                            String path =
                                    get != null && get.value().length > 0
                                            ? get.value()[0]
                                            : patch != null && patch.value().length > 0
                                                    ? patch.value()[0]
                                                    : "";
                            assertThat(path.toLowerCase(Locale.ROOT))
                                    .doesNotContain("conversation");
                        });
    }

    private static Message textMessageWithId(Long id, String body) {
        return Message.builder()
                .id(id)
                .conversationId(42L)
                .senderId(3L)
                .kind(MessageKind.TEXT)
                .body(body)
                .createdAt(NOW)
                .build();
    }

    @Test
    void hidingAMessageRecordsWhoDidItAndActionsItsReports() {
        Message message = textMessageWithId(101L, "Send me a deposit first");
        MessageReport open = report(ReportStatus.NEW);
        when(messages.findById(101L)).thenReturn(Optional.of(message));
        when(reports.existsByMessageId(101L)).thenReturn(true);
        when(reports.findByMessageId(101L)).thenReturn(List.of(open));

        ModeratedMessageResource hidden = service.hide(55L, 101L);

        assertThat(hidden.hidden()).isTrue();
        assertThat(message.getHiddenBy()).isEqualTo(55L);
        assertThat(message.getHiddenAt()).isEqualTo(NOW);
        assertThat(open.getStatus()).isEqualTo(ReportStatus.ACTIONED);
        assertThat(open.getReviewedBy()).isEqualTo(55L);
        assertThat(open.getReviewedAt()).isEqualTo(NOW);
        verify(messages).save(message);
    }

    /** Review Focus #4: hai admin cùng xử lý một hàng đợi. */
    @Test
    void hidingAnAlreadyHiddenMessageKeepsTheFirstAdminOnRecord() {
        Message message = textMessageWithId(101L, "Send me a deposit first");
        message.setHiddenAt(Instant.parse("2026-09-26T05:00:00Z"));
        message.setHiddenBy(11L);
        when(messages.findById(101L)).thenReturn(Optional.of(message));
        when(reports.existsByMessageId(101L)).thenReturn(true);
        when(reports.findByMessageId(101L)).thenReturn(List.of());

        service.hide(55L, 101L);

        assertThat(message.getHiddenBy()).isEqualTo(11L);
        assertThat(message.getHiddenAt()).isEqualTo(Instant.parse("2026-09-26T05:00:00Z"));
        verify(messages, never()).save(any(Message.class));
    }

    /** Spec §8.3: không có báo cáo thì admin không có việc gì ở đây. */
    @Test
    void anAdminCannotHideAMessageNobodyReported() {
        when(messages.findById(101L)).thenReturn(Optional.of(textMessageWithId(101L, "fine")));
        when(reports.existsByMessageId(101L)).thenReturn(false);

        assertThatThrownBy(() -> service.hide(55L, 101L))
                .isInstanceOf(ModerationOutOfScopeException.class);
        verify(messages, never()).save(any(Message.class));
    }

    @Test
    void hidingAnUnknownMessageIsNotFound() {
        when(messages.findById(101L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.hide(55L, 101L))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void dismissingAReportMarksItReviewedWithoutTouchingTheMessage() {
        MessageReport open = report(ReportStatus.NEW);
        when(reports.findById(9L)).thenReturn(Optional.of(open));

        MessageReportResource result = service.dismiss(55L, 9L);

        assertThat(result.status()).isEqualTo(ReportStatus.REVIEWED);
        assertThat(open.getReviewedBy()).isEqualTo(55L);
        assertThat(open.getReviewedAt()).isEqualTo(NOW);
        verify(messages, never()).save(any(Message.class));
    }

    /** Hai admin cùng bấm: người xử lý trước là người ở lại trong dấu vết. */
    @Test
    void dismissingAnAlreadyHandledReportChangesNothing() {
        MessageReport done = report(ReportStatus.ACTIONED);
        done.setReviewedBy(11L);
        when(reports.findById(9L)).thenReturn(Optional.of(done));

        service.dismiss(55L, 9L);

        assertThat(done.getStatus()).isEqualTo(ReportStatus.ACTIONED);
        assertThat(done.getReviewedBy()).isEqualTo(11L);
    }

    @Test
    void dismissingAnUnknownReportIsNotFound() {
        when(reports.findById(9L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.dismiss(55L, 9L))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void hidingAMessagePublishesItToBothMembers() {
        Message message = textMessageWithId(101L, "Send me a deposit first");
        when(messages.findById(101L)).thenReturn(Optional.of(message));
        when(reports.existsByMessageId(101L)).thenReturn(true);
        when(reports.findByMessageId(101L)).thenReturn(List.of());

        service.hide(55L, 101L);

        verify(events).messageHidden(thread, 101L);
    }

    @Test
    void hidingAnAlreadyHiddenMessageDoesNotPublishAgain() {
        Message message = textMessageWithId(101L, "Send me a deposit first");
        message.setHiddenAt(Instant.parse("2026-09-26T05:00:00Z"));
        message.setHiddenBy(11L);
        when(messages.findById(101L)).thenReturn(Optional.of(message));
        when(reports.existsByMessageId(101L)).thenReturn(true);
        when(reports.findByMessageId(101L)).thenReturn(List.of());

        service.hide(55L, 101L);

        verify(events, never()).messageHidden(any(), any());
    }

    /** dismiss chỉ đổi trạng thái báo cáo; tin không đổi nên không có gì để phát. */
    @Test
    void dismissingAReportPublishesNothing() {
        when(reports.findById(9L)).thenReturn(Optional.of(report(ReportStatus.NEW)));

        service.dismiss(55L, 9L);

        verify(events, never()).messageHidden(any(), any());
    }
}
