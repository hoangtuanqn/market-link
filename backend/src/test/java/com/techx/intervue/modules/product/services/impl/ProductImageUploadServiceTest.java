package com.techx.intervue.modules.product.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import com.techx.intervue.services.interfaces.FileStorageServiceInterface;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

/** Cùng lý do MarketImageUploadServiceTest: loại file thật kết luận từ magic bytes. */
class ProductImageUploadServiceTest {

    private static final byte[] PNG = {
        (byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n', 0, 0, 0, 0x0D, 'I', 'H', 'D', 'R'
    };
    private static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 0};
    private static final byte[] WEBP = {'R', 'I', 'F', 'F', 0, 0, 0, 0, 'W', 'E', 'B', 'P'};
    private static final byte[] HTML =
            "<html><script>alert(1)</script></html>".getBytes(StandardCharsets.US_ASCII);

    private FileStorageServiceInterface storage;
    private ProductImageUploadService service;

    @BeforeEach
    void setUp() {
        storage = mock(FileStorageServiceInterface.class);
        service = new ProductImageUploadService(storage, "/uploads");
    }

    private static MockMultipartFile file(String contentType, byte[] content) {
        return new MockMultipartFile("file", "x", contentType, content);
    }

    @Test
    void aRealPngIsStoredAndReturnsItsPublicUrl() {
        String url = service.store(file("image/png", PNG));

        assertThat(url).startsWith("/uploads/product-images/").endsWith(".png");
        verify(storage).store(eq("product-images"), any(String.class), eq(PNG));
    }

    @Test
    void aRealJpegIsStored() {
        assertThat(service.store(file("image/jpeg", JPEG))).endsWith(".jpg");
    }

    @Test
    void aRealWebpIsStored() {
        assertThat(service.store(file("image/webp", WEBP))).endsWith(".webp");
    }

    @Test
    void htmlLabelledAsPngIsRejectedAndNeverStored() {
        assertThatThrownBy(() -> service.store(file("image/png", HTML)))
                .isInstanceOf(InvalidFieldException.class);
        verify(storage, never()).store(any(), any(), any());
    }

    @Test
    void anEmptyFileIsRejected() {
        assertThatThrownBy(
                        () ->
                                service.store(
                                        new MockMultipartFile(
                                                "file", "x", "image/png", new byte[0])))
                .isInstanceOf(InvalidFieldException.class);
    }

    @Test
    void aFileLargerThanTheLimitIsRejected() {
        byte[] tooBig = new byte[9 * 1024 * 1024];
        System.arraycopy(JPEG, 0, tooBig, 0, JPEG.length);

        assertThatThrownBy(() -> service.store(file("image/jpeg", tooBig)))
                .isInstanceOf(InvalidFieldException.class);
        verify(storage, never()).store(any(), any(), any());
    }
}
