package com.techx.intervue.modules.conversation.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.conversation.entities.MessageAttachment;
import com.techx.intervue.modules.conversation.exceptions.AttachmentTooLargeException;
import com.techx.intervue.modules.conversation.exceptions.RateLimitedException;
import com.techx.intervue.modules.conversation.exceptions.UnsupportedImageTypeException;
import com.techx.intervue.modules.conversation.repositories.MessageAttachmentRepository;
import com.techx.intervue.modules.conversation.resources.AttachmentResource;
import com.techx.intervue.modules.conversation.services.interfaces.ChatRateLimiterInterface;
import com.techx.intervue.services.interfaces.FileStorageServiceInterface;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.mock.web.MockMultipartFile;

class AttachmentServiceTest {

    static final long MAX_BYTES = 5L * 1024 * 1024;

    MessageAttachmentRepository attachments;
    FileStorageServiceInterface storage;
    ChatRateLimiterInterface rateLimiter;
    AttachmentService service;

    @BeforeEach
    void setUp() {
        attachments = mock(MessageAttachmentRepository.class);
        storage = mock(FileStorageServiceInterface.class);
        rateLimiter = mock(ChatRateLimiterInterface.class);
        when(attachments.save(any(MessageAttachment.class)))
                .thenAnswer(
                        inv -> {
                            MessageAttachment a = inv.getArgument(0);
                            a.setId(55L);
                            return a;
                        });
        service = new AttachmentService(attachments, storage, rateLimiter, MAX_BYTES);
    }

    @Test
    void storesThePhotoUnderARandomKeyAndReturnsItsSize() throws Exception {
        AttachmentResource resource =
                service.upload(
                        7L, new MockMultipartFile("file", "holiday.png", "image/png", png(40, 25)));

        assertThat(resource.attachmentId()).isEqualTo(55L);
        assertThat(resource.url()).isEqualTo("/api/v1/attachments/55");
        assertThat(resource.width()).isEqualTo(40);
        assertThat(resource.height()).isEqualTo(25);

        ArgumentCaptor<String> fileName = ArgumentCaptor.forClass(String.class);
        verify(storage).store(anyString(), fileName.capture(), any(byte[].class));
        // Tên file không được lấy từ người dùng (spec §8.2)
        assertThat(fileName.getValue()).doesNotContain("holiday").endsWith(".jpg");
    }

    @Test
    void aPngIsReEncodedToJpegSoItsMetadataIsGone() throws Exception {
        service.upload(7L, new MockMultipartFile("file", "a.png", "image/png", png(40, 25)));

        ArgumentCaptor<MessageAttachment> saved = ArgumentCaptor.forClass(MessageAttachment.class);
        verify(attachments).save(saved.capture());
        assertThat(saved.getValue().getMime()).isEqualTo("image/jpeg");
        assertThat(saved.getValue().getUploaderId()).isEqualTo(7L);
    }

    @Test
    void refusesAPhotoOverTheLimitWithoutTouchingTheDisk() {
        byte[] tooBig = new byte[(int) MAX_BYTES + 1];

        assertThatThrownBy(
                        () ->
                                service.upload(
                                        7L,
                                        new MockMultipartFile(
                                                "file", "big.jpg", "image/jpeg", tooBig)))
                .isInstanceOf(AttachmentTooLargeException.class);

        verify(storage, never()).store(anyString(), anyString(), any(byte[].class));
        verify(attachments, never()).save(any(MessageAttachment.class));
    }

    /** Review Focus #1 ở tầng service: không ghi byte nào xuống đĩa. */
    @Test
    void refusesAFileThatIsNotAnImageWhateverItsName() {
        byte[] pdf = "%PDF-1.7 not a photo".getBytes(StandardCharsets.ISO_8859_1);

        assertThatThrownBy(
                        () ->
                                service.upload(
                                        7L,
                                        new MockMultipartFile(
                                                "file", "photo.jpg", "image/jpeg", pdf)))
                .isInstanceOf(UnsupportedImageTypeException.class);

        verify(storage, never()).store(anyString(), anyString(), any(byte[].class));
    }

    @Test
    void refusesAnEmptyUpload() {
        assertThatThrownBy(
                        () ->
                                service.upload(
                                        7L,
                                        new MockMultipartFile(
                                                "file", "a.jpg", "image/jpeg", new byte[0])))
                .isInstanceOf(UnsupportedImageTypeException.class);
    }

    @Test
    void checksTheHourlyPhotoLimitBeforeDoingAnyWork() {
        Mockito.doThrow(new RateLimitedException("slow down"))
                .when(rateLimiter)
                .check(7L, ChatRateLimiterInterface.Action.IMAGE);

        assertThatThrownBy(
                        () ->
                                service.upload(
                                        7L,
                                        new MockMultipartFile(
                                                "file", "a.png", "image/png", new byte[] {1})))
                .isInstanceOf(RateLimitedException.class);

        verify(storage, never()).store(anyString(), anyString(), any(byte[].class));
    }

    private static byte[] png(int w, int h) throws Exception {
        BufferedImage image = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, "png", out);
        return out.toByteArray();
    }
}
