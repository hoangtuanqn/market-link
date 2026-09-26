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

    /** Review Focus #2: the header claims a huge size, the pixels must not be decoded. */
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
     * RIFF….WEBP + a lossy "VP8 " chunk: sync code 9d 01 2a then 14-bit little-endian width/height.
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

    /**
     * Finding #6: WebP is stored as is, so if only "RIFF…WEBP" were checked then 16 valid header
     * bytes would be enough to stash any payload on the server and serve it back under Content-Type
     * image/webp. The VP8 sync code is the cheapest proof that this really is an image frame.
     */
    @Test
    void rejectsAWebpWhoseVp8SyncCodeIsWrong() {
        byte[] fake = lossyWebp(20, 10);
        fake[23] = 0x00; // the sync code must be 9d 01 2a

        assertThatThrownBy(() -> ImageProbe.probe(fake))
                .isInstanceOf(UnsupportedImageTypeException.class);
    }

    @Test
    void rejectsALosslessWebpWhoseSignatureByteIsWrong() {
        byte[] fake = losslessWebp(20, 10);
        fake[20] = 0x00; // the VP8L signature must be 0x2f

        assertThatThrownBy(() -> ImageProbe.probe(fake))
                .isInstanceOf(UnsupportedImageTypeException.class);
    }

    @Test
    void readsTheSizeOfALosslessWebp() {
        ImageProbe.Probed probed = ImageProbe.probe(losslessWebp(300, 200));

        assertThat(probed.mime()).isEqualTo("image/webp");
        assertThat(probed.width()).isEqualTo(300);
        assertThat(probed.height()).isEqualTo(200);
    }

    @Test
    void rejectsAWebpWhoseRiffSizeDoesNotMatchTheFile() {
        byte[] fake = lossyWebp(20, 10);
        // RIFF declares more than the real file: a sign of a truncated or forged payload
        fake[4] = (byte) 0xF0;
        fake[5] = (byte) 0xFF;

        assertThatThrownBy(() -> ImageProbe.probe(fake))
                .isInstanceOf(UnsupportedImageTypeException.class);
    }

    /**
     * Finding #8: the "decompression bomb" case above uses WebP, but WebP is never decoded — it
     * goes down the probeWebp branch and normalize() returns the bytes as is. The branch that
     * really needs the backstop is JPEG/PNG: a header claiming a huge size must be rejected BEFORE
     * ImageIO allocates the pixels.
     */
    @Test
    void rejectsAPngThatDeclaresHugeDimensionsBeforeDecodingIt() {
        byte[] bomb = pngHeaderOnly(60000, 60000);

        assertThatThrownBy(() -> ImageProbe.probe(bomb))
                .isInstanceOf(InvalidFieldException.class)
                .hasMessageContaining("4096");
    }

    /** RIFF….WEBP + a "VP8L" chunk: signature 0x2f then 14 bits (w-1) and 14 bits (h-1). */
    private static byte[] losslessWebp(int w, int h) {
        byte[] payload = new byte[30];
        payload[0] = 0x2f;
        int bits = ((w - 1) & 0x3FFF) | (((h - 1) & 0x3FFF) << 14);
        payload[1] = (byte) (bits & 0xFF);
        payload[2] = (byte) ((bits >> 8) & 0xFF);
        payload[3] = (byte) ((bits >> 16) & 0xFF);
        payload[4] = (byte) ((bits >> 24) & 0xFF);
        return riff("VP8L", payload);
    }

    private static byte[] riff(String fourcc, byte[] payload) {
        ByteBuffer riff =
                ByteBuffer.allocate(12 + 8 + payload.length).order(ByteOrder.LITTLE_ENDIAN);
        riff.put("RIFF".getBytes(StandardCharsets.US_ASCII));
        riff.putInt(4 + 8 + payload.length);
        riff.put("WEBP".getBytes(StandardCharsets.US_ASCII));
        riff.put(fourcc.getBytes(StandardCharsets.US_ASCII));
        riff.putInt(payload.length);
        riff.put(payload);
        return riff.array();
    }

    /**
     * A PNG with only the signature + an IHDR declaring 60000x60000. ImageIO can read the size from
     * the header without decoding any IDAT — exactly what the backstop must catch.
     */
    private static byte[] pngHeaderOnly(int w, int h) {
        java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
        out.writeBytes(new byte[] {(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'});
        ByteBuffer ihdr = ByteBuffer.allocate(13).order(ByteOrder.BIG_ENDIAN);
        ihdr.putInt(w);
        ihdr.putInt(h);
        ihdr.put((byte) 8); // bit depth
        ihdr.put((byte) 2); // colour type: truecolour
        ihdr.put((byte) 0);
        ihdr.put((byte) 0);
        ihdr.put((byte) 0);
        byte[] data = ihdr.array();
        byte[] typeAndData = new byte[4 + data.length];
        System.arraycopy("IHDR".getBytes(StandardCharsets.US_ASCII), 0, typeAndData, 0, 4);
        System.arraycopy(data, 0, typeAndData, 4, data.length);
        java.util.zip.CRC32 crc = new java.util.zip.CRC32();
        crc.update(typeAndData);
        out.writeBytes(
                ByteBuffer.allocate(4).order(ByteOrder.BIG_ENDIAN).putInt(data.length).array());
        out.writeBytes(typeAndData);
        out.writeBytes(
                ByteBuffer.allocate(4)
                        .order(ByteOrder.BIG_ENDIAN)
                        .putInt((int) crc.getValue())
                        .array());
        return out.toByteArray();
    }
}
