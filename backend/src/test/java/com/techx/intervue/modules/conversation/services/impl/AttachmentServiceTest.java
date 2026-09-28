package com.techx.intervue.modules.conversation.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.conversation.entities.Message;
import com.techx.intervue.modules.conversation.entities.MessageAttachment;
import com.techx.intervue.modules.conversation.enums.MessageKind;
import com.techx.intervue.modules.conversation.exceptions.AttachmentNotYoursException;
import com.techx.intervue.modules.conversation.exceptions.AttachmentTooLargeException;
import com.techx.intervue.modules.conversation.exceptions.ConversationAccessDeniedException;
import com.techx.intervue.modules.conversation.exceptions.ModerationOutOfScopeException;
import com.techx.intervue.modules.conversation.exceptions.RateLimitedException;
import com.techx.intervue.modules.conversation.exceptions.StreamLinkInvalidException;
import com.techx.intervue.modules.conversation.exceptions.UnsupportedImageTypeException;
import com.techx.intervue.modules.conversation.repositories.MessageAttachmentRepository;
import com.techx.intervue.modules.conversation.repositories.MessageReportRepository;
import com.techx.intervue.modules.conversation.repositories.MessageRepository;
import com.techx.intervue.modules.conversation.resources.AttachmentResource;
import com.techx.intervue.modules.conversation.resources.StreamUrlResource;
import com.techx.intervue.modules.conversation.services.interfaces.AttachmentServiceInterface;
import com.techx.intervue.modules.conversation.services.interfaces.ChatRateLimiterInterface;
import com.techx.intervue.services.interfaces.FileStorageServiceInterface;
import jakarta.persistence.EntityNotFoundException;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.mock.web.MockMultipartFile;

class AttachmentServiceTest {

    static final long MAX_BYTES = 5L * 1024 * 1024;
    static final Instant NOW = Instant.parse("2026-09-28T03:00:00Z");

    final StreamLinkSigner signer = new StreamLinkSigner("test-jwt-secret");

    MessageAttachmentRepository attachments;
    FileStorageServiceInterface storage;
    ChatRateLimiterInterface rateLimiter;
    MessageRepository messages;
    ConversationLookup lookup;
    MessageReportRepository reports;
    AttachmentService service;

    @TempDir Path tmp;
    @TempDir Path uploads;
    Path fileOnDisk;

    @BeforeEach
    void setUp() throws Exception {
        attachments = mock(MessageAttachmentRepository.class);
        storage = mock(FileStorageServiceInterface.class);
        rateLimiter = mock(ChatRateLimiterInterface.class);
        messages = mock(MessageRepository.class);
        lookup = mock(ConversationLookup.class);
        reports = mock(MessageReportRepository.class);
        fileOnDisk = Files.write(tmp.resolve("x.jpg"), new byte[] {1, 2, 3});
        when(attachments.save(any(MessageAttachment.class)))
                .thenAnswer(
                        inv -> {
                            MessageAttachment a = inv.getArgument(0);
                            a.setId(55L);
                            return a;
                        });
        // The order matches the constructor: attachments, storage, rateLimiter, maxBytes, messages,
        // lookup, reports, tempDir, signer, clock, stream link TTL
        service =
                new AttachmentService(
                        attachments,
                        storage,
                        rateLimiter,
                        MAX_BYTES,
                        messages,
                        lookup,
                        reports,
                        uploads.toString(),
                        signer,
                        Clock.fixed(NOW, ZoneOffset.UTC),
                        300);
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
        // The file name must not come from the user (spec §8.2)
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

    /** Review Focus #1 at the service layer: no byte is written to disk. */
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

    /**
     * The limit must block BEFORE writing to disk and before writing to the DB — over the threshold
     * must not leave any orphan file behind.
     */
    @Test
    void refusesToStoreAnythingOnceTheHourlyPhotoLimitIsReached() throws Exception {
        Mockito.doThrow(new RateLimitedException("slow down"))
                .when(rateLimiter)
                .check(7L, ChatRateLimiterInterface.Action.IMAGE);

        assertThatThrownBy(
                        () ->
                                service.upload(
                                        7L,
                                        new MockMultipartFile(
                                                "file", "a.png", "image/png", png(40, 25))))
                .isInstanceOf(RateLimitedException.class);

        verify(storage, never()).store(anyString(), anyString(), any(byte[].class));
        verify(attachments, never()).save(any(MessageAttachment.class));
    }

    private static byte[] png(int w, int h) throws Exception {
        BufferedImage image = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, "png", out);
        return out.toByteArray();
    }

    @Test
    void theUploaderCanSeeTheirOwnPhotoBeforeItIsSent() {
        MessageAttachment upload = stored(55L, 7L, null);
        when(attachments.findById(55L)).thenReturn(Optional.of(upload));
        when(storage.find(AttachmentService.FOLDER, upload.getStorageKey()))
                .thenReturn(Optional.of(fileOnDisk));

        AttachmentServiceInterface.StoredFile file = service.read(7L, 55L);

        assertThat(file.mime()).isEqualTo("image/jpeg");
        assertThat(file.sizeBytes()).isEqualTo(100);
    }

    /**
     * Same code as attaching someone else's image to your own message: both are "this image is not
     * yours". NOT_A_MEMBER is reserved for an image ALREADY attached to a message where the
     * requester is not in the thread — that is a different idea.
     */
    @Test
    void nobodyElseCanSeeAnUploadThatIsNotOnAMessageYet() {
        when(attachments.findById(55L)).thenReturn(Optional.of(stored(55L, 7L, null)));

        assertThatThrownBy(() -> service.read(3L, 55L))
                .isInstanceOf(AttachmentNotYoursException.class);
    }

    @Test
    void aMemberOfTheThreadCanSeeAPhotoTheyDidNotUpload() {
        MessageAttachment upload = stored(55L, 7L, 101L);
        when(attachments.findById(55L)).thenReturn(Optional.of(upload));
        when(messages.findById(101L)).thenReturn(Optional.of(messageIn(101L, 42L, null)));
        when(storage.find(AttachmentService.FOLDER, upload.getStorageKey()))
                .thenReturn(Optional.of(fileOnDisk));

        assertThat(service.read(3L, 55L).mime()).isEqualTo("image/jpeg");
        verify(lookup).requireMember(3L, 42L);
    }

    @Test
    void someoneOutsideTheThreadGetsRefused() {
        when(attachments.findById(55L)).thenReturn(Optional.of(stored(55L, 7L, 101L)));
        when(messages.findById(101L)).thenReturn(Optional.of(messageIn(101L, 42L, null)));
        Mockito.doThrow(new ConversationAccessDeniedException())
                .when(lookup)
                .requireMember(99L, 42L);

        assertThatThrownBy(() -> service.read(99L, 55L))
                .isInstanceOf(ConversationAccessDeniedException.class);
        verify(storage, never()).find(anyString(), anyString());
    }

    /** Review Focus #5. */
    @Test
    void hiddenMessageHidesItsPhotoToo() {
        when(attachments.findById(55L)).thenReturn(Optional.of(stored(55L, 7L, 101L)));
        when(messages.findById(101L))
                .thenReturn(
                        Optional.of(messageIn(101L, 42L, Instant.parse("2026-09-25T06:00:00Z"))));

        assertThatThrownBy(() -> service.read(3L, 55L)).isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void aRecordWithNoFileOnDiskIsNotFound() {
        MessageAttachment upload = stored(55L, 7L, null);
        when(attachments.findById(55L)).thenReturn(Optional.of(upload));
        when(storage.find(AttachmentService.FOLDER, upload.getStorageKey()))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.read(7L, 55L)).isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void anUnknownAttachmentIdIsNotFound() {
        when(attachments.findById(55L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.read(7L, 55L)).isInstanceOf(EntityNotFoundException.class);
    }

    /** Final review #5 at the service: the saved width/height are the upright, stored ones. */
    @Test
    void aSidewaysPhoneJpegIsSavedWithItsUprightSize() throws Exception {
        BufferedImage landscape = new BufferedImage(40, 20, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(landscape, "jpeg", out);
        byte[] jpeg = out.toByteArray();
        byte[] exif = {
            (byte) 0xFF,
            (byte) 0xE1,
            0,
            34,
            'E',
            'x',
            'i',
            'f',
            0,
            0,
            'M',
            'M',
            0,
            42,
            0,
            0,
            0,
            8,
            0,
            1,
            0x01,
            0x12,
            0,
            3,
            0,
            0,
            0,
            1,
            0,
            6,
            0,
            0,
            0,
            0,
            0,
            0
        };
        byte[] sideways = new byte[jpeg.length + exif.length];
        System.arraycopy(jpeg, 0, sideways, 0, 2);
        System.arraycopy(exif, 0, sideways, 2, exif.length);
        System.arraycopy(jpeg, 2, sideways, 2 + exif.length, jpeg.length - 2);

        AttachmentResource resource =
                service.upload(7L, new MockMultipartFile("file", "p.jpg", "image/jpeg", sideways));

        assertThat(resource.width()).isEqualTo(20);
        assertThat(resource.height()).isEqualTo(40);
    }

    // ---------- FR-115 §5: signed stream links ----------

    @Test
    void aMemberGetsALinkForAVideoInTheirConversation() {
        when(attachments.findById(55L)).thenReturn(Optional.of(stored(55L, 7L, 101L)));
        when(messages.findById(101L)).thenReturn(Optional.of(messageIn(101L, 42L, null)));

        StreamUrlResource link = service.streamUrl(3L, false, 55L);

        verify(lookup).requireMember(3L, 42L);
        assertThat(link.expiresAt()).isEqualTo(NOW.plusSeconds(300));
        long exp = NOW.getEpochSecond() + 300;
        assertThat(link.url())
                .isEqualTo(
                        "/api/v1/attachments/55/stream?u=3&s=u&e="
                                + exp
                                + "&t="
                                + signer.sign(55L, 3L, 'u', exp));
    }

    @Test
    void aStrangerGetsNoLink() {
        when(attachments.findById(55L)).thenReturn(Optional.of(stored(55L, 7L, 101L)));
        when(messages.findById(101L)).thenReturn(Optional.of(messageIn(101L, 42L, null)));
        Mockito.doThrow(new ConversationAccessDeniedException())
                .when(lookup)
                .requireMember(99L, 42L);

        assertThatThrownBy(() -> service.streamUrl(99L, false, 55L))
                .isInstanceOf(ConversationAccessDeniedException.class);
    }

    @Test
    void anAdminLinkOnlyForAReportedMessageAndItIsLogged() {
        when(attachments.findById(55L)).thenReturn(Optional.of(stored(55L, 7L, 101L)));
        when(messages.findById(101L)).thenReturn(Optional.of(messageIn(101L, 42L, null)));

        assertThatThrownBy(() -> service.streamUrl(1L, true, 55L))
                .isInstanceOf(ModerationOutOfScopeException.class);

        when(reports.existsByMessageId(101L)).thenReturn(true);
        assertThat(service.streamUrl(1L, true, 55L).url()).contains("u=1&s=a&");
        verify(lookup, never()).requireMember(any(), any());
    }

    @Test
    void streamServesTheFileForAValidLink() {
        MessageAttachment upload = stored(55L, 7L, 101L);
        when(attachments.findById(55L)).thenReturn(Optional.of(upload));
        when(messages.findById(101L)).thenReturn(Optional.of(messageIn(101L, 42L, null)));
        when(storage.find(AttachmentService.FOLDER, upload.getStorageKey()))
                .thenReturn(Optional.of(fileOnDisk));
        long exp = NOW.getEpochSecond() + 300;

        AttachmentServiceInterface.StoredFile file =
                service.stream(55L, 3L, 'u', exp, signer.sign(55L, 3L, 'u', exp));

        assertThat(file.mime()).isEqualTo("image/jpeg");
        verify(lookup).requireMember(3L, 42L);
    }

    @Test
    void streamRefusesAnExpiredLink() {
        long exp = NOW.getEpochSecond() - 1;

        assertThatThrownBy(() -> service.stream(55L, 3L, 'u', exp, signer.sign(55L, 3L, 'u', exp)))
                .isInstanceOf(StreamLinkInvalidException.class);
        verify(attachments, never()).findById(any());
    }

    @Test
    void streamRefusesALinkSignedForSomeoneElse() {
        long exp = NOW.getEpochSecond() + 300;

        assertThatThrownBy(() -> service.stream(55L, 99L, 'u', exp, signer.sign(55L, 3L, 'u', exp)))
                .isInstanceOf(StreamLinkInvalidException.class);
    }

    /** The link is only a ticket: the rights behind it are checked again on every request. */
    @Test
    void streamHidesAMessageHiddenAfterTheLinkWasIssued() {
        when(attachments.findById(55L)).thenReturn(Optional.of(stored(55L, 7L, 101L)));
        when(messages.findById(101L))
                .thenReturn(Optional.of(messageIn(101L, 42L, NOW.minusSeconds(10))));
        long exp = NOW.getEpochSecond() + 300;

        assertThatThrownBy(() -> service.stream(55L, 3L, 'u', exp, signer.sign(55L, 3L, 'u', exp)))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void anAdminStreamStillNeedsTheReport() {
        MessageAttachment upload = stored(55L, 7L, 101L);
        when(attachments.findById(55L)).thenReturn(Optional.of(upload));
        when(messages.findById(101L)).thenReturn(Optional.of(messageIn(101L, 42L, null)));
        when(storage.find(AttachmentService.FOLDER, upload.getStorageKey()))
                .thenReturn(Optional.of(fileOnDisk));
        long exp = NOW.getEpochSecond() + 300;
        String sig = signer.sign(55L, 1L, 'a', exp);

        assertThatThrownBy(() -> service.stream(55L, 1L, 'a', exp, sig))
                .isInstanceOf(ModerationOutOfScopeException.class);

        when(reports.existsByMessageId(101L)).thenReturn(true);
        assertThat(service.stream(55L, 1L, 'a', exp, sig).mime()).isEqualTo("image/jpeg");
    }

    private static MessageAttachment stored(Long id, Long uploaderId, Long messageId) {
        return MessageAttachment.builder()
                .id(id)
                .uploaderId(uploaderId)
                .messageId(messageId)
                .storageKey(id + "-key.jpg")
                .mime("image/jpeg")
                .sizeBytes(100)
                .width(800)
                .height(600)
                .build();
    }

    private static Message messageIn(Long id, Long conversationId, Instant hiddenAt) {
        return Message.builder()
                .id(id)
                .conversationId(conversationId)
                .senderId(7L)
                .kind(MessageKind.IMAGE)
                .hiddenAt(hiddenAt)
                .build();
    }

    /**
     * The limit of 10 images/hour must count images ACCEPTED, not attempts. An iPhone user sending
     * HEIC (the iOS default) would get 415 ten times and then lose the right to send images for a
     * whole hour, with the message "sending images too fast" while not a single one has gone
     * through.
     */
    @Test
    void aRejectedUploadDoesNotSpendAnHourlyToken() {
        byte[] pdf = "%PDF-1.7 not a photo".getBytes(StandardCharsets.ISO_8859_1);

        assertThatThrownBy(
                        () ->
                                service.upload(
                                        7L,
                                        new MockMultipartFile(
                                                "file", "photo.jpg", "image/jpeg", pdf)))
                .isInstanceOf(UnsupportedImageTypeException.class);

        verify(rateLimiter, never())
                .check(
                        org.mockito.ArgumentMatchers.anyLong(),
                        org.mockito.ArgumentMatchers.any(ChatRateLimiterInterface.Action.class));
    }

    @Test
    void anOversizedUploadDoesNotSpendAnHourlyTokenEither() {
        assertThatThrownBy(
                        () ->
                                service.upload(
                                        7L,
                                        new MockMultipartFile(
                                                "file",
                                                "big.jpg",
                                                "image/jpeg",
                                                new byte[(int) MAX_BYTES + 1])))
                .isInstanceOf(AttachmentTooLargeException.class);

        verify(rateLimiter, never())
                .check(
                        org.mockito.ArgumentMatchers.anyLong(),
                        org.mockito.ArgumentMatchers.any(ChatRateLimiterInterface.Action.class));
    }

    @Test
    void anAcceptedUploadStillSpendsAnHourlyToken() throws Exception {
        service.upload(7L, new MockMultipartFile("file", "a.png", "image/png", png(40, 25)));

        verify(rateLimiter).check(7L, ChatRateLimiterInterface.Action.IMAGE);
    }

    /** LEAD decision 26/09: an admin can view the image of a message that has been reported. */
    @Test
    void anAdminCanSeeThePhotoOfAReportedMessage() {
        MessageAttachment upload = stored(55L, 7L, 101L);
        when(attachments.findById(55L)).thenReturn(Optional.of(upload));
        when(messages.findById(101L)).thenReturn(Optional.of(messageIn(101L, 42L, null)));
        when(reports.existsByMessageId(101L)).thenReturn(true);
        when(storage.find(AttachmentService.FOLDER, upload.getStorageKey()))
                .thenReturn(Optional.of(fileOnDisk));

        assertThat(service.readAsAdmin(55L, 55L).mime()).isEqualTo("image/jpeg");
        // An admin is not a member; they take a separate, narrower path
        verify(lookup, never()).requireMember(any(), any());
    }

    /** Review Focus #2: ±5 messages are context, not the reported subject. */
    @Test
    void adminSeesThePhotoOfTheReportedMessageButNotOfItsNeighbours() {
        MessageAttachment neighbour = stored(56L, 7L, 102L);
        when(attachments.findById(56L)).thenReturn(Optional.of(neighbour));
        when(messages.findById(102L)).thenReturn(Optional.of(messageIn(102L, 42L, null)));
        when(reports.existsByMessageId(102L)).thenReturn(false);

        assertThatThrownBy(() -> service.readAsAdmin(55L, 56L))
                .isInstanceOf(ModerationOutOfScopeException.class);
        verify(storage, never()).find(anyString(), anyString());
    }

    /**
     * An admin who has just hidden a message must still be able to view the image again to verify
     * their own decision.
     */
    @Test
    void anAdminStillSeesThePhotoAfterHidingTheMessage() {
        MessageAttachment upload = stored(55L, 7L, 101L);
        when(attachments.findById(55L)).thenReturn(Optional.of(upload));
        when(messages.findById(101L))
                .thenReturn(
                        Optional.of(messageIn(101L, 42L, Instant.parse("2026-09-26T06:00:00Z"))));
        when(reports.existsByMessageId(101L)).thenReturn(true);
        when(storage.find(AttachmentService.FOLDER, upload.getStorageKey()))
                .thenReturn(Optional.of(fileOnDisk));

        assertThat(service.readAsAdmin(55L, 55L).mime()).isEqualTo("image/jpeg");
    }

    @Test
    void anAdminCannotSeeAnUploadThatIsNotOnAnyMessage() {
        when(attachments.findById(55L)).thenReturn(Optional.of(stored(55L, 7L, null)));

        assertThatThrownBy(() -> service.readAsAdmin(55L, 55L))
                .isInstanceOf(ModerationOutOfScopeException.class);
        verify(storage, never()).find(anyString(), anyString());
    }

    @Test
    void anUnknownAttachmentIsNotFoundForAnAdminEither() {
        when(attachments.findById(55L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.readAsAdmin(55L, 55L))
                .isInstanceOf(EntityNotFoundException.class);
    }

    /** An ordinary user does not get the admin branch even if the message has been reported. */
    @Test
    void aReportDoesNotOpenThePhotoToEveryone() {
        when(attachments.findById(55L)).thenReturn(Optional.of(stored(55L, 7L, 101L)));
        when(messages.findById(101L)).thenReturn(Optional.of(messageIn(101L, 42L, null)));
        when(reports.existsByMessageId(101L)).thenReturn(true);
        Mockito.doThrow(new ConversationAccessDeniedException())
                .when(lookup)
                .requireMember(99L, 42L);

        assertThatThrownBy(() -> service.read(99L, 55L))
                .isInstanceOf(ConversationAccessDeniedException.class);
    }

    // ---------- FR-115: more formats, videos, 50 MB through a temp file ----------

    @Test
    void storesAVideoExactlyAsUploaded() throws Exception {
        byte[] mp4 = mp4(200);

        AttachmentResource resource =
                service.upload(7L, new MockMultipartFile("file", "clip.mp4", "video/mp4", mp4));

        assertThat(resource.mime()).isEqualTo("video/mp4");
        assertThat(resource.width()).isNull();
        ArgumentCaptor<String> name = ArgumentCaptor.forClass(String.class);
        verify(storage).storeFile(eq(AttachmentService.FOLDER), name.capture(), any(Path.class));
        assertThat(name.getValue()).matches("[0-9a-f-]{36}\\.mp4");
        verify(storage, never()).store(anyString(), anyString(), any(byte[].class));
        ArgumentCaptor<MessageAttachment> saved = ArgumentCaptor.forClass(MessageAttachment.class);
        verify(attachments).save(saved.capture());
        assertThat(saved.getValue().getMime()).isEqualTo("video/mp4");
        assertThat(saved.getValue().getSizeBytes()).isEqualTo(mp4.length);
    }

    @Test
    void storesAGifAsUploadedSoItKeepsMoving() throws Exception {
        AttachmentResource resource =
                service.upload(
                        7L,
                        new MockMultipartFile("file", "hi.gif", "image/gif", image("gif", 12, 6)));

        assertThat(resource.mime()).isEqualTo("image/gif");
        assertThat(resource.width()).isEqualTo(12);
        verify(storage).storeFile(eq(AttachmentService.FOLDER), anyString(), any(Path.class));
    }

    @Test
    void aPhotoStillComesBackAsJpeg() throws Exception {
        AttachmentResource resource =
                service.upload(
                        7L, new MockMultipartFile("file", "a.png", "image/png", png(30, 20)));

        assertThat(resource.mime()).isEqualTo("image/jpeg");
    }

    @Test
    void heicIsRefusedWithAHintAndSpendsNoToken() {
        byte[] heic =
                concat(
                        box("ftyp", concat(ascii("heic"), new byte[4], ascii("mif1"))),
                        box("mdat", new byte[8]));

        assertThatThrownBy(
                        () ->
                                service.upload(
                                        7L,
                                        new MockMultipartFile(
                                                "file", "IMG_1.HEIC", "image/heic", heic)))
                .isInstanceOf(UnsupportedImageTypeException.class)
                .hasMessageContaining("HEIC");
        Mockito.verifyNoInteractions(rateLimiter, storage);
    }

    @Test
    void acceptsAFileOfExactlyTheLimit() throws Exception {
        byte[] exactly = mp4((int) MAX_BYTES);

        assertThat(exactly).hasSize((int) MAX_BYTES);
        assertThat(
                        service.upload(
                                        7L,
                                        new MockMultipartFile(
                                                "file", "big.mp4", "video/mp4", exactly))
                                .mime())
                .isEqualTo("video/mp4");
    }

    @Test
    void theTempCopyIsGoneWhetherTheFileIsKeptOrRefused() throws Exception {
        service.upload(7L, new MockMultipartFile("file", "clip.mp4", "video/mp4", mp4(100)));
        byte[] pdf = "%PDF-1.7 not a photo".getBytes(StandardCharsets.ISO_8859_1);
        catchThrowable(
                () ->
                        service.upload(
                                7L, new MockMultipartFile("file", "x.jpg", "image/jpeg", pdf)));

        try (var left = Files.list(uploads)) {
            assertThat(left).isEmpty();
        }
    }

    private static byte[] image(String format, int w, int h) throws Exception {
        java.awt.image.BufferedImage image =
                new java.awt.image.BufferedImage(w, h, java.awt.image.BufferedImage.TYPE_INT_RGB);
        java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
        javax.imageio.ImageIO.write(image, format, out);
        return out.toByteArray();
    }

    /** ftyp isom + moov + an mdat padded so the whole file is exactly `total` bytes. */
    private static byte[] mp4(int total) {
        byte[] head =
                concat(
                        box("ftyp", concat(ascii("isom"), new byte[4], ascii("mp41"))),
                        box("moov", new byte[8]));
        return concat(head, box("mdat", new byte[total - head.length - 8]));
    }

    private static byte[] box(String type, byte[] payload) {
        java.nio.ByteBuffer b = java.nio.ByteBuffer.allocate(8 + payload.length);
        b.putInt(8 + payload.length);
        b.put(ascii(type));
        b.put(payload);
        return b.array();
    }

    private static byte[] ascii(String text) {
        return text.getBytes(StandardCharsets.US_ASCII);
    }

    private static byte[] concat(byte[]... parts) {
        int length = 0;
        for (byte[] p : parts) length += p.length;
        byte[] out = new byte[length];
        int at = 0;
        for (byte[] p : parts) {
            System.arraycopy(p, 0, out, at, p.length);
            at += p.length;
        }
        return out;
    }
}
