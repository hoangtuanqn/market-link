package com.techx.intervue.modules.farmer.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

/**
 * Content-Type do trình duyệt (hay kẻ gọi thẳng API) tự khai, nên loại file phải kết luận từ vài
 * byte đầu — giống avatar và ảnh chat.
 */
class FarmerUploadServiceTest {

    private static final byte[] PNG = {
        (byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n', 0, 0, 0, 0x0D, 'I', 'H', 'D', 'R'
    };
    private static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 0};
    private static final byte[] MP4 = {0, 0, 0, 0x18, 'f', 't', 'y', 'p', 'i', 's', 'o', 'm'};
    private static final byte[] HTML =
            "<html><script>alert(1)</script></html>".getBytes(StandardCharsets.US_ASCII);

    @TempDir Path uploads;

    FarmerUploadService service;

    @BeforeEach
    void setUp() {
        service = new FarmerUploadService(uploads.toString(), "/uploads");
    }

    private static MockMultipartFile file(String contentType, byte[] content) {
        return new MockMultipartFile("file", "x", contentType, content);
    }

    @Test
    void aRealPngIsStoredUnderTheOwnersFolder() throws Exception {
        String url = service.store(7L, "photo", file("image/png", PNG));

        assertThat(url).startsWith("/uploads/farmer-applications/7/").endsWith(".png");
        assertThat(Files.list(uploads.resolve("farmer-applications/7"))).hasSize(1);
    }

    @Test
    void htmlLabelledAsPngIsRejected() {
        assertThatThrownBy(() -> service.store(7L, "photo", file("image/png", HTML)))
                .isInstanceOf(InvalidFieldException.class);
        assertThat(uploads.resolve("farmer-applications/7/"))
                .satisfiesAnyOf(
                        dir -> assertThat(dir).doesNotExist(),
                        dir -> assertThat(dir).isEmptyDirectory());
    }

    /** Ảnh PNG đổi đuôi .jpg vẫn là ảnh thật: lưu theo loại thật, không theo lời khai. */
    @Test
    void theExtensionFollowsTheContentNotTheLabel() {
        assertThat(service.store(7L, "photo", file("image/jpeg", PNG))).endsWith(".png");
        assertThat(service.store(7L, "photo", file("image/png", JPEG))).endsWith(".jpg");
    }

    @Test
    void aVideoThatIsNotAVideoIsRejected() {
        assertThatThrownBy(() -> service.store(7L, "video", file("video/mp4", HTML)))
                .isInstanceOf(InvalidFieldException.class);
    }

    @Test
    void aRealMp4IsStored() {
        assertThat(service.store(7L, "video", file("video/mp4", MP4))).endsWith(".mp4");
    }

    @Test
    void aPhotoSentAsVideoIsRejected() {
        assertThatThrownBy(() -> service.store(7L, "video", file("video/mp4", PNG)))
                .isInstanceOf(InvalidFieldException.class);
    }
}
