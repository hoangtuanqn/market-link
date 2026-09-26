package com.techx.intervue.modules.conversation.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.conversation.entities.Conversation;
import com.techx.intervue.modules.conversation.entities.Message;
import com.techx.intervue.modules.conversation.entities.MessageReport;
import com.techx.intervue.modules.conversation.enums.MessageKind;
import com.techx.intervue.modules.conversation.enums.ReportReason;
import com.techx.intervue.modules.conversation.enums.ReportStatus;
import com.techx.intervue.modules.conversation.exceptions.AlreadyReportedException;
import com.techx.intervue.modules.conversation.exceptions.CannotReportOwnMessageException;
import com.techx.intervue.modules.conversation.exceptions.ConversationAccessDeniedException;
import com.techx.intervue.modules.conversation.repositories.ConversationRepository;
import com.techx.intervue.modules.conversation.repositories.MessageReportRepository;
import com.techx.intervue.modules.conversation.repositories.MessageRepository;
import com.techx.intervue.modules.conversation.requests.ReportMessageRequest;
import com.techx.intervue.modules.conversation.resources.MessageReportResource;
import jakarta.persistence.EntityNotFoundException;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class MessageReportServiceTest {

    static final Instant NOW = Instant.parse("2026-09-26T06:00:00Z");

    MessageReportRepository reports;
    MessageRepository messages;
    ConversationRepository conversations;
    MessageReportService service;
    Conversation thread;

    @BeforeEach
    void setUp() {
        reports = mock(MessageReportRepository.class);
        messages = mock(MessageRepository.class);
        conversations = mock(ConversationRepository.class);
        service =
                new MessageReportService(
                        reports,
                        messages,
                        new ConversationLookup(conversations),
                        Clock.fixed(NOW, ZoneId.of("Asia/Ho_Chi_Minh")));

        thread = Conversation.between(3L, 7L);
        thread.setId(42L);
        when(conversations.findById(42L)).thenReturn(Optional.of(thread));
        when(messages.findById(101L)).thenReturn(Optional.of(messageFrom(3L, null)));
        when(reports.save(any(MessageReport.class)))
                .thenAnswer(
                        inv -> {
                            MessageReport r = inv.getArgument(0);
                            r.setId(9L);
                            return r;
                        });
    }

    @Test
    void aMemberCanReportTheOtherPersonsMessage() {
        MessageReportResource created =
                service.report(
                        7L,
                        101L,
                        new ReportMessageRequest(ReportReason.SCAM, "asked for a deposit"));

        assertThat(created.id()).isEqualTo(9L);
        assertThat(created.messageId()).isEqualTo(101L);
        assertThat(created.reason()).isEqualTo(ReportReason.SCAM);
        assertThat(created.status()).isEqualTo(ReportStatus.NEW);

        ArgumentCaptor<MessageReport> saved = ArgumentCaptor.forClass(MessageReport.class);
        verify(reports).save(saved.capture());
        assertThat(saved.getValue().getReportedBy()).isEqualTo(7L);
        assertThat(saved.getValue().getCreatedAt()).isEqualTo(NOW);
    }

    @Test
    void aBlankNoteIsStoredAsNothingAtAll() {
        service.report(7L, 101L, new ReportMessageRequest(ReportReason.SPAM, "   "));

        ArgumentCaptor<MessageReport> saved = ArgumentCaptor.forClass(MessageReport.class);
        verify(reports).save(saved.capture());
        assertThat(saved.getValue().getNote()).isNull();
    }

    /** Review Focus #3. */
    @Test
    void reportingTheSameMessageTwiceIsRefused() {
        when(reports.existsByMessageIdAndReportedBy(101L, 7L)).thenReturn(true);

        assertThatThrownBy(
                        () ->
                                service.report(
                                        7L,
                                        101L,
                                        new ReportMessageRequest(ReportReason.SPAM, null)))
                .isInstanceOf(AlreadyReportedException.class);
        verify(reports, never()).save(any(MessageReport.class));
    }

    /**
     * Spec §8.5: a sender cannot delete a message, so they cannot report their own message either.
     */
    @Test
    void youCannotReportYourOwnMessage() {
        assertThatThrownBy(
                        () ->
                                service.report(
                                        3L,
                                        101L,
                                        new ReportMessageRequest(ReportReason.SPAM, null)))
                .isInstanceOf(CannotReportOwnMessageException.class);
        verify(reports, never()).save(any(MessageReport.class));
    }

    @Test
    void someoneOutsideTheThreadCannotReport() {
        assertThatThrownBy(
                        () ->
                                service.report(
                                        99L,
                                        101L,
                                        new ReportMessageRequest(ReportReason.SPAM, null)))
                .isInstanceOf(ConversationAccessDeniedException.class);
        verify(reports, never()).save(any(MessageReport.class));
    }

    /**
     * The permission check must run BEFORE the "already hidden" check. Otherwise an outsider gets
     * 404 for a hidden message and 403 for a visible one — i.e. they could guess the moderation
     * state of a message they have no right to know exists.
     */
    @Test
    void anOutsiderGetsForbiddenEvenWhenTheMessageIsAlreadyHidden() {
        when(messages.findById(101L)).thenReturn(Optional.of(messageFrom(3L, NOW)));

        assertThatThrownBy(
                        () ->
                                service.report(
                                        99L,
                                        101L,
                                        new ReportMessageRequest(ReportReason.SPAM, null)))
                .isInstanceOf(ConversationAccessDeniedException.class);
    }

    @Test
    void anUnknownMessageIsNotFound() {
        when(messages.findById(101L)).thenReturn(Optional.empty());

        assertThatThrownBy(
                        () ->
                                service.report(
                                        7L,
                                        101L,
                                        new ReportMessageRequest(ReportReason.SPAM, null)))
                .isInstanceOf(EntityNotFoundException.class);
    }

    /** A hidden message has already disappeared from the list; there is nothing left to report. */
    @Test
    void anAlreadyHiddenMessageIsNotFoundForAMember() {
        when(messages.findById(101L)).thenReturn(Optional.of(messageFrom(3L, NOW)));

        assertThatThrownBy(
                        () ->
                                service.report(
                                        7L,
                                        101L,
                                        new ReportMessageRequest(ReportReason.SPAM, null)))
                .isInstanceOf(EntityNotFoundException.class);
    }

    private static Message messageFrom(Long senderId, Instant hiddenAt) {
        return Message.builder()
                .id(101L)
                .conversationId(42L)
                .senderId(senderId)
                .kind(MessageKind.TEXT)
                .body("hi")
                .hiddenAt(hiddenAt)
                .createdAt(NOW)
                .build();
    }
}
