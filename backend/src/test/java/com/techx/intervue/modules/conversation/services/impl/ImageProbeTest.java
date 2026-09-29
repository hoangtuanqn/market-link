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

    private static byte[] lossyWebp(int w, int h) {
        byte[] payload = new byte[30];
        ByteBuffer body = ByteBuffer.wrap(payload).order(ByteOrder.LITTLE_ENDIAN);
        body.put(new byte[] {0x00, 0x00, 0x00});
        body.put(new byte[] {(byte) 0x9d, 0x01, 0x2a});
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

    @Test
    void rejectsAWebpWhoseVp8SyncCodeIsWrong() {
        byte[] fake = lossyWebp(20, 10);
        fake[23] = 0x00;

        assertThatThrownBy(() -> ImageProbe.probe(fake))
                .isInstanceOf(UnsupportedImageTypeException.class);
    }

    @Test
    void rejectsALosslessWebpWhoseSignatureByteIsWrong() {
        byte[] fake = losslessWebp(20, 10);
        fake[20] = 0x00;

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
        fake[4] = (byte) 0xF0;
        fake[5] = (byte) 0xFF;

        assertThatThrownBy(() -> ImageProbe.probe(fake))
                .isInstanceOf(UnsupportedImageTypeException.class);
    }

    @Test
    void rejectsAPngThatDeclaresHugeDimensionsBeforeDecodingIt() {
        byte[] bomb = pngHeaderOnly(60000, 60000);

        assertThatThrownBy(() -> ImageProbe.probe(bomb))
                .isInstanceOf(InvalidFieldException.class)
                .hasMessageContaining("30000");
    }

    @Test
    void downscalesALargePhotoWithoutRefusingIt() throws Exception {
        byte[] big = jpeg(5000, 2500);

        ImageProbe.Probed probed = ImageProbe.probe(big);
        BufferedImage stored =
                ImageIO.read(new ByteArrayInputStream(ImageProbe.normalize(big, probed.mime())));

        assertThat(probed.width()).isEqualTo(5000);
        assertThat(stored.getWidth()).isEqualTo(4096);
        assertThat(stored.getHeight()).isEqualTo(2048);
    }

    @Test
    void aPngOverTheOldLimitIsAcceptedToo() {
        assertThat(ImageProbe.probe(pngHeaderOnly(6000, 4000)).width()).isEqualTo(6000);
    }

    @Test
    void refusesAProgressiveJpegOverThePixelBudgetBeforeDecoding() {
        byte[] bomb = jpegHeaderOnly(0xC2, 10_000, 10_000);

        assertThatThrownBy(() -> ImageProbe.probe(bomb))
                .isInstanceOf(InvalidFieldException.class)
                .hasMessageContaining("too large");
    }

    @Test
    void aBaselineJpegOfTheSameSizeIsStillAccepted() {
        ImageProbe.Probed probed = ImageProbe.probe(jpegHeaderOnly(0xC0, 10_000, 10_000));

        assertThat(probed.width()).isEqualTo(10_000);
        assertThat(probed.height()).isEqualTo(10_000);
    }

    @Test
    void refusesAnyJpegOrPngOverTheTotalPixelCap() {
        assertThatThrownBy(() -> ImageProbe.probe(jpegHeaderOnly(0xC0, 25_000, 25_000)))
                .isInstanceOf(InvalidFieldException.class);
        assertThatThrownBy(() -> ImageProbe.probe(pngHeaderOnly(25_000, 25_000)))
                .isInstanceOf(InvalidFieldException.class);
    }

    @Test
    void recognisesARealProgressiveJpegAndStillTakesASmallOne() throws Exception {
        byte[] small = progressiveJpeg(64, 48);

        assertThat(ImageProbe.probe(small).width()).isEqualTo(64);
        assertThat(ImageProbe.reencode(small, "image/jpeg").width()).isEqualTo(64);
    }

    @Test
    void aSidewaysPhoneJpegIsStoredUpright() throws Exception {
        byte[] sideways = withOrientation(halves(40, 20), 6);

        ImageProbe.Normalized stored = ImageProbe.reencode(sideways, "image/jpeg");
        BufferedImage upright = ImageIO.read(new ByteArrayInputStream(stored.bytes()));

        assertThat(stored.width()).isEqualTo(20);
        assertThat(stored.height()).isEqualTo(40);
        assertThat(upright.getWidth()).isEqualTo(20);
        assertThat(upright.getHeight()).isEqualTo(40);
        assertThat(new java.awt.Color(upright.getRGB(10, 5)).getRed()).isGreaterThan(200);
        assertThat(new java.awt.Color(upright.getRGB(10, 35)).getBlue()).isGreaterThan(200);
    }

    @Test
    void everyMirroredOrRotatedOrientationComesOutWithTheRightShape() throws Exception {
        for (int orientation = 1; orientation <= 8; orientation++) {
            ImageProbe.Normalized stored =
                    ImageProbe.reencode(withOrientation(halves(40, 20), orientation), "image/jpeg");
            boolean turned = orientation >= 5;
            assertThat(stored.width()).as("orientation " + orientation).isEqualTo(turned ? 20 : 40);
            assertThat(stored.height())
                    .as("orientation " + orientation)
                    .isEqualTo(turned ? 40 : 20);
        }
    }

    @Test
    void theReportedSizeIsTheEncodedSize() throws Exception {
        ImageProbe.Normalized stored = ImageProbe.reencode(jpeg(5000, 2500), "image/jpeg");
        BufferedImage decoded = ImageIO.read(new ByteArrayInputStream(stored.bytes()));

        assertThat(stored.width()).isEqualTo(decoded.getWidth());
        assertThat(stored.height()).isEqualTo(decoded.getHeight());
    }

    private static byte[] halves(int w, int h) throws Exception {
        BufferedImage image = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        for (int x = 0; x < w; x++) {
            for (int y = 0; y < h; y++) {
                image.setRGB(x, y, x < w / 2 ? 0xFF0000 : 0x0000FF);
            }
        }
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, "jpeg", out);
        return out.toByteArray();
    }

    private static byte[] withOrientation(byte[] jpeg, int orientation) {
        ByteBuffer app1 = ByteBuffer.allocate(2 + 2 + 6 + 26).order(ByteOrder.BIG_ENDIAN);
        app1.put((byte) 0xFF).put((byte) 0xE1).putShort((short) (2 + 6 + 26));
        app1.put("Exif".getBytes(StandardCharsets.US_ASCII)).put((byte) 0).put((byte) 0);
        app1.put("MM".getBytes(StandardCharsets.US_ASCII)).putShort((short) 42).putInt(8);
        app1.putShort((short) 1);
        app1.putShort((short) 0x0112).putShort((short) 3).putInt(1);
        app1.putShort((short) orientation).putShort((short) 0);
        app1.putInt(0);
        byte[] segment = app1.array();
        byte[] out = new byte[jpeg.length + segment.length];
        System.arraycopy(jpeg, 0, out, 0, 2);
        System.arraycopy(segment, 0, out, 2, segment.length);
        System.arraycopy(jpeg, 2, out, 2 + segment.length, jpeg.length - 2);
        return out;
    }

    private static byte[] jpegHeaderOnly(int sofMarker, int w, int h) {
        ByteBuffer b = ByteBuffer.allocate(2 + 2 + 11 + 2).order(ByteOrder.BIG_ENDIAN);
        b.put((byte) 0xFF).put((byte) 0xD8);
        b.put((byte) 0xFF).put((byte) sofMarker).putShort((short) 11);
        b.put((byte) 8).putShort((short) h).putShort((short) w);
        b.put((byte) 1).put((byte) 1).put((byte) 0x11).put((byte) 0);
        b.put((byte) 0xFF).put((byte) 0xD9);
        return b.array();
    }

    private static byte[] progressiveJpeg(int w, int h) throws Exception {
        BufferedImage image = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        javax.imageio.ImageWriter writer = ImageIO.getImageWritersByFormatName("jpeg").next();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (javax.imageio.stream.ImageOutputStream ios = ImageIO.createImageOutputStream(out)) {
            writer.setOutput(ios);
            javax.imageio.ImageWriteParam param = writer.getDefaultWriteParam();
            param.setProgressiveMode(javax.imageio.ImageWriteParam.MODE_DEFAULT);
            writer.write(null, new javax.imageio.IIOImage(image, null, null), param);
        } finally {
            writer.dispose();
        }
        byte[] bytes = out.toByteArray();
        boolean sof2 = false;
        for (int i = 0; i + 1 < bytes.length; i++) {
            if ((bytes[i] & 0xFF) == 0xFF && (bytes[i + 1] & 0xFF) == 0xC2) {
                sof2 = true;
                break;
            }
        }
        assertThat(sof2).isTrue();
        return bytes;
    }

    private static byte[] jpeg(int w, int h) throws Exception {
        BufferedImage image = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, "jpeg", out);
        return out.toByteArray();
    }

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

    private static byte[] pngHeaderOnly(int w, int h) {
        java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
        out.writeBytes(new byte[] {(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'});
        ByteBuffer ihdr = ByteBuffer.allocate(13).order(ByteOrder.BIG_ENDIAN);
        ihdr.putInt(w);
        ihdr.putInt(h);
        ihdr.put((byte) 8);
        ihdr.put((byte) 2);
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
