package com.techx.intervue.modules.quality.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.startsWith;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.conversation.exceptions.UnsupportedImageTypeException;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import com.techx.intervue.services.interfaces.FileStorageServiceInterface;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.Optional;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockMultipartFile;

class QualityReportPhotoServiceTest {

    private static final String NAME = "7-3f2a1b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b.jpg";

    private FileStorageServiceInterface storage;
    private QualityReportPhotoService service;

    @BeforeEach
    void setUp() {
        storage = mock(FileStorageServiceInterface.class);
        service = new QualityReportPhotoService(storage, "/uploads");
    }

    private static byte[] png(int width, int height) throws IOException {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, "png", out);
        return out.toByteArray();
    }

    @Test
    void aPngIsStoredAsAJpegUnderTheUploadersName() throws IOException {
        String url =
                service.store(
                        7L, new MockMultipartFile("file", "rau.png", "image/png", png(20, 10)));

        assertThat(url).startsWith("/uploads/quality-report-photos/7-").endsWith(".jpg");
        ArgumentCaptor<byte[]> bytes = ArgumentCaptor.forClass(byte[].class);
        verify(storage).store(eq("quality-report-photos"), startsWith("7-"), bytes.capture());
        assertThat(bytes.getValue()[0] & 0xFF).isEqualTo(0xFF);
        assertThat(bytes.getValue()[1] & 0xFF).isEqualTo(0xD8);
    }

    @Test
    void aFileThatIsNotAPhotoIsRefusedAndNeverStored() {
        byte[] html = "<html><script>alert(1)</script></html>".getBytes(StandardCharsets.US_ASCII);

        assertThatThrownBy(
                        () ->
                                service.store(
                                        7L,
                                        new MockMultipartFile("file", "x.png", "image/png", html)))
                .isInstanceOf(UnsupportedImageTypeException.class);
        verify(storage, never()).store(any(), any(), any());
    }

    @Test
    void aPhotoOver5MbIsRefused() {
        byte[] big = new byte[(int) QualityReportPhotoService.MAX_BYTES + 1];

        assertThatThrownBy(
                        () ->
                                service.store(
                                        7L,
                                        new MockMultipartFile(
                                                "file", "big.jpg", "image/jpeg", big)))
                .isInstanceOf(InvalidFieldException.class)
                .hasMessage("The photo must be 5 MB or smaller.");
        verify(storage, never()).store(any(), any(), any());
    }

    @Test
    void anEmptyFileIsRefused() {
        assertThatThrownBy(
                        () ->
                                service.store(
                                        7L,
                                        new MockMultipartFile(
                                                "file", "x.png", "image/png", new byte[0])))
                .isInstanceOf(InvalidFieldException.class);
    }

    @Test
    void theUploadersOwnPhotoIsTheirs() {
        when(storage.find("quality-report-photos", NAME)).thenReturn(Optional.of(Path.of("/x")));

        assertThat(service.isOwnedBy("/uploads/quality-report-photos/" + NAME, 7L)).isTrue();
    }

    @Test
    void aPhotoOfSomeoneElseIsNotTheirs() {
        when(storage.find(any(), any())).thenReturn(Optional.of(Path.of("/x")));

        assertThat(service.isOwnedBy("/uploads/quality-report-photos/" + NAME, 8L)).isFalse();
        assertThat(service.isOwnedBy("https://example.com/" + NAME, 7L)).isFalse();
        assertThat(service.isOwnedBy("/uploads/quality-report-photos/../avatars/" + NAME, 7L))
                .isFalse();
        assertThat(service.isOwnedBy("/uploads/quality-report-photos/" + NAME + "?x=1", 7L))
                .isFalse();
        assertThat(service.isOwnedBy(null, 7L)).isFalse();
    }

    @Test
    void aPhotoNoLongerOnDiskIsNotAccepted() {
        when(storage.find(any(), any())).thenReturn(Optional.empty());

        assertThat(service.isOwnedBy("/uploads/quality-report-photos/" + NAME, 7L)).isFalse();
    }
}
