package com.techx.intervue.modules.conversation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.conversation.entities.MessageAttachment;
import com.techx.intervue.modules.conversation.repositories.MessageAttachmentRepository;
import com.techx.intervue.modules.conversation.services.impl.AttachmentService;
import com.techx.intervue.services.interfaces.FileStorageServiceInterface;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

class ChatAttachmentCleanupJobTest {

    static final Instant NOW = Instant.parse("2026-09-26T08:00:00Z");
    static final Instant CUTOFF = NOW.minusSeconds(86400);

    MessageAttachmentRepository attachments;
    FileStorageServiceInterface storage;
    ChatAttachmentCleanupJob job;

    @BeforeEach
    void setUp() {
        attachments = mock(MessageAttachmentRepository.class);
        storage = mock(FileStorageServiceInterface.class);
        job =
                new ChatAttachmentCleanupJob(
                        attachments, storage, Clock.fixed(NOW, ZoneId.of("UTC")));
    }

    @Test
    void deletesTheFileAndTheRowForAnUploadOlderThanADay() {
        MessageAttachment orphan = upload(1L, "abc.jpg");
        when(attachments.findByMessageIdIsNullAndCreatedAtBefore(CUTOFF))
                .thenReturn(List.of(orphan));

        job.run();

        verify(storage).delete(AttachmentService.FOLDER, "abc.jpg");
        verify(attachments).deleteAll(List.of(orphan));
    }

    @Test
    void doesNothingWhenThereIsNothingToClean() {
        when(attachments.findByMessageIdIsNullAndCreatedAtBefore(CUTOFF)).thenReturn(List.of());

        job.run();

        verifyNoInteractions(storage);
        verify(attachments, never()).deleteAll(anyList());
    }

    /** One file that failed to delete must not hold back the whole batch. */
    @Test
    @SuppressWarnings("unchecked")
    void keepsGoingWhenOneFileCannotBeDeleted() {
        MessageAttachment a = upload(1L, "a.jpg");
        MessageAttachment b = upload(2L, "b.jpg");
        when(attachments.findByMessageIdIsNullAndCreatedAtBefore(CUTOFF)).thenReturn(List.of(a, b));
        Mockito.doThrow(new RuntimeException("disk error"))
                .when(storage)
                .delete(AttachmentService.FOLDER, "a.jpg");

        job.run();

        verify(storage).delete(AttachmentService.FOLDER, "b.jpg");
        ArgumentCaptor<List<MessageAttachment>> deleted = ArgumentCaptor.forClass(List.class);
        verify(attachments).deleteAll(deleted.capture());
        assertThat(deleted.getValue()).containsExactly(a, b);
    }

    private static MessageAttachment upload(Long id, String key) {
        return MessageAttachment.builder().id(id).uploaderId(7L).storageKey(key).build();
    }
}
