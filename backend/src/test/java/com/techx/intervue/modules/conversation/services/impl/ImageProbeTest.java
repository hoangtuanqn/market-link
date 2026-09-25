package com.techx.intervue.modules.conversation.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.techx.intervue.modules.conversation.exceptions.UnsupportedImageTypeException;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;

class ImageProbeTest {

    @Test
    void readsTheSizeOfAPng() throws Exception {
        ImageProbe.Probed probed = ImageProbe.probe(png(40, 25));

        assertThat(probed.mime()).isEqualTo("image/png");
        assertThat(probed.width()).isEqualTo(40);
        assertThat(probed.height()).isEqualTo(25);
    }

    @Test
    void readsTheSizeOfALossyWebpWithoutDecodingIt() {
        ImageProbe.Probed probed = ImageProbe.probe(lossyWebp(300, 200));

        assertThat(probed.mime()).isEqualTo("image/webp");
        assertThat(probed.width()).isEqualTo(300);
        assertThat(probed.height()).isEqualTo(200);
    }

    /** Review Focus #1. */
    @Test
    void rejectsAFileThatIsNotAnImageWhateverItsName() {
        byte[] pdf = "%PDF-1.7\nnot a photo at all\n".getBytes(StandardCharsets.ISO_8859_1);

        assertThatThrownBy(() -> ImageProbe.probe(pdf))
                .isInstanceOf(UnsupportedImageTypeException.class);
    }

    @Test
    void rejectsAnEmptyFile() {
        assertThatThrownBy(() -> ImageProbe.probe(new byte[0]))
                .isInstanceOf(UnsupportedImageTypeException.class);
    }

    @Test
    void rejectsAFileThatStartsLikeARiffButIsNotWebp() {
        byte[] wav = new byte[20];
        System.arraycopy("RIFF".getBytes(StandardCharsets.US_ASCII), 0, wav, 0, 4);
        System.arraycopy("WAVE".getBytes(StandardCharsets.US_ASCII), 0, wav, 8, 4);

        assertThatThrownBy(() -> ImageProbe.probe(wav))
                .isInstanceOf(UnsupportedImageTypeException.class);
    }

    /** Review Focus #2: header khai kích thước khổng lồ, không được giải mã điểm ảnh. */
    @Test
    void rejectsAnImageThatIsTooLargeInPixels() {
        byte[] bomb = lossyWebp(16000, 16000);

        assertThatThrownBy(() -> ImageProbe.probe(bomb))
                .isInstanceOf(InvalidFieldException.class)
                .hasMessageContaining("4096");
    }

    @Test
    void reEncodingAPngStripsEverythingButThePixels() throws Exception {
        byte[] jpeg = ImageProbe.normalize(png(10, 10), "image/png");

        assertThat(jpeg[0] & 0xFF).isEqualTo(0xFF);
        assertThat(jpeg[1] & 0xFF).isEqualTo(0xD8);
        assertThat(ImageIO.read(new ByteArrayInputStream(jpeg)).getWidth()).isEqualTo(10);
    }

    @Test
    void aWebpIsStoredExactlyAsItArrived() {
        byte[] original = lossyWebp(20, 10);

        assertThat(ImageProbe.normalize(original, "image/webp")).isEqualTo(original);
    }

    private static byte[] png(int w, int h) throws Exception {
        BufferedImage image = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, "png", out);
        return out.toByteArray();
    }

    /**
     * RIFF….WEBP + chunk "VP8 " lossy: sync code 9d 01 2a rồi width/height 14 bit little-endian.
     */
    private static byte[] lossyWebp(int w, int h) {
        byte[] payload = new byte[30];
        ByteBuffer body = ByteBuffer.wrap(payload).order(ByteOrder.LITTLE_ENDIAN);
        body.put(new byte[] {0x00, 0x00, 0x00}); // frame tag
        body.put(new byte[] {(byte) 0x9d, 0x01, 0x2a}); // sync code
        body.putShort((short) w);
        body.putShort((short) h);

        ByteBuffer riff =
                ByteBuffer.allocate(12 + 8 + payload.length).order(ByteOrder.LITTLE_ENDIAN);
        riff.put("RIFF".getBytes(StandardCharsets.US_ASCII));
        riff.putInt(4 + 8 + payload.length);
        riff.put("WEBP".getBytes(StandardCharsets.US_ASCII));
        riff.put("VP8 ".getBytes(StandardCharsets.US_ASCII));
        riff.putInt(payload.length);
        riff.put(payload);
        return riff.array();
    }
}
