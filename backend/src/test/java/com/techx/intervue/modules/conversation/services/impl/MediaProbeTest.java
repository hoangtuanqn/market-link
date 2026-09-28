package com.techx.intervue.modules.conversation.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.techx.intervue.modules.conversation.exceptions.UnsupportedImageTypeException;
import com.techx.intervue.modules.conversation.services.impl.MediaProbe.Handling;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class MediaProbeTest {

    @TempDir Path dir;

    private Path file(byte[] bytes) throws Exception {
        Path path = Files.createTempFile(dir, "upload-", ".bin");
        Files.write(path, bytes);
        return path;
    }

    private MediaProbe.Probed probe(byte[] bytes) throws Exception {
        return MediaProbe.probe(file(bytes));
    }

    @Test
    void recognisesThePhotosThatAreReencoded() throws Exception {
        MediaProbe.Probed jpeg = probe(image("jpeg", 40, 20));
        MediaProbe.Probed png = probe(image("png", 30, 10));

        assertThat(jpeg)
                .isEqualTo(new MediaProbe.Probed("image/jpeg", false, 40, 20, Handling.REENCODE));
        assertThat(png)
                .isEqualTo(new MediaProbe.Probed("image/png", false, 30, 10, Handling.REENCODE));
    }

    @Test
    void recognisesThePhotosStoredAsUploaded() throws Exception {
        assertThat(probe(lossyWebp(20, 10)))
                .isEqualTo(
                        new MediaProbe.Probed("image/webp", false, 20, 10, Handling.STORE_AS_IS));
        assertThat(probe(image("gif", 16, 8)))
                .isEqualTo(new MediaProbe.Probed("image/gif", false, 16, 8, Handling.STORE_AS_IS));
        assertThat(probe(avif(64, 48)))
                .isEqualTo(
                        new MediaProbe.Probed("image/avif", false, 64, 48, Handling.STORE_AS_IS));
    }

    @Test
    void recognisesTheVideos() throws Exception {
        assertThat(probe(iso("isom", "mp41", true)))
                .isEqualTo(
                        new MediaProbe.Probed("video/mp4", true, null, null, Handling.STORE_AS_IS));
        assertThat(probe(iso("M4V ", "mp42", true)).mime()).isEqualTo("video/mp4");
        assertThat(probe(iso("qt  ", "qt  ", true)).mime()).isEqualTo("video/quicktime");
        assertThat(probe(legacyMov()).mime()).isEqualTo("video/quicktime");
        assertThat(probe(ebml("webm")))
                .isEqualTo(
                        new MediaProbe.Probed(
                                "video/webm", true, null, null, Handling.STORE_AS_IS));
    }

    @Test
    void refusesHeicWithAHintToConvert() throws Exception {
        byte[] heic = iso("heic", "mif1", false);

        assertThatThrownBy(() -> probe(heic))
                .isInstanceOf(UnsupportedImageTypeException.class)
                .hasMessageContaining("HEIC");
    }

    /** Review Focus #1. */
    @Test
    void refusesBytesThatOnlyClaimToBeMedia() throws Exception {
        byte[] html = "<html><script>alert(1)</script></html>".getBytes(StandardCharsets.UTF_8);
        byte[] zip = concat(new byte[] {'P', 'K', 3, 4}, new byte[40]);

        for (byte[] fake : new byte[][] {html, zip, new byte[0], new byte[5]}) {
            assertThatThrownBy(() -> probe(fake)).isInstanceOf(UnsupportedImageTypeException.class);
        }
    }

    /** Review Focus #2. */
    @Test
    void refusesAStoredAsIsFileWithATail() throws Exception {
        byte[] tail = "<?php system($_GET['c']); ?>".getBytes(StandardCharsets.US_ASCII);

        assertThatThrownBy(() -> probe(concat(image("gif", 4, 4), tail)))
                .isInstanceOf(UnsupportedImageTypeException.class);
        assertThatThrownBy(() -> probe(concat(iso("isom", "mp41", true), tail)))
                .isInstanceOf(UnsupportedImageTypeException.class);
        assertThatThrownBy(() -> probe(concat(avif(8, 8), tail)))
                .isInstanceOf(UnsupportedImageTypeException.class);
    }

    @Test
    void refusesATruncatedIsoFile() throws Exception {
        byte[] whole = iso("isom", "mp41", true);

        assertThatThrownBy(() -> probe(Arrays.copyOf(whole, whole.length - 3)))
                .isInstanceOf(UnsupportedImageTypeException.class);
    }

    @Test
    void refusesAVideoWithoutAMovieHeader() throws Exception {
        assertThatThrownBy(() -> probe(iso("isom", "mp41", false)))
                .isInstanceOf(UnsupportedImageTypeException.class);
    }

    @Test
    void refusesMatroskaThatBrowsersCannotPlay() throws Exception {
        assertThatThrownBy(() -> probe(ebml("matroska")))
                .isInstanceOf(UnsupportedImageTypeException.class);
    }

    @Test
    void refusesAStoredAsIsPhotoOverTheSideLimit() throws Exception {
        assertThatThrownBy(() -> probe(gifHeader(5000, 10)))
                .isInstanceOf(InvalidFieldException.class);
        assertThatThrownBy(() -> probe(avif(5000, 10))).isInstanceOf(InvalidFieldException.class);
    }

    @Test
    void theStoredFileNameFollowsTheMime() {
        assertThat(MediaProbe.extension("image/jpeg")).isEqualTo(".jpg");
        assertThat(MediaProbe.extension("image/webp")).isEqualTo(".webp");
        assertThat(MediaProbe.extension("image/gif")).isEqualTo(".gif");
        assertThat(MediaProbe.extension("image/avif")).isEqualTo(".avif");
        assertThat(MediaProbe.extension("video/mp4")).isEqualTo(".mp4");
        assertThat(MediaProbe.extension("video/quicktime")).isEqualTo(".mov");
        assertThat(MediaProbe.extension("video/webm")).isEqualTo(".webm");
    }

    // ---------- fixtures ----------

    private static byte[] image(String format, int w, int h) throws Exception {
        BufferedImage image = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, format, out);
        return out.toByteArray();
    }

    /**
     * A GIF logical screen descriptor claiming w×h, then the trailer; enough for the header checks.
     */
    private static byte[] gifHeader(int w, int h) {
        ByteBuffer b = ByteBuffer.allocate(14).order(ByteOrder.LITTLE_ENDIAN);
        b.put("GIF89a".getBytes(StandardCharsets.US_ASCII));
        b.putShort((short) w);
        b.putShort((short) h);
        b.put(new byte[] {0, 0, 0});
        b.put((byte) 0x3B);
        return b.array();
    }

    private static byte[] lossyWebp(int w, int h) {
        byte[] payload = new byte[30];
        ByteBuffer body = ByteBuffer.wrap(payload).order(ByteOrder.LITTLE_ENDIAN);
        body.put(new byte[] {0x00, 0x00, 0x00});
        body.put(new byte[] {(byte) 0x9d, 0x01, 0x2a});
        body.putShort((short) w);
        body.putShort((short) h);
        ByteBuffer riff = ByteBuffer.allocate(20 + payload.length).order(ByteOrder.LITTLE_ENDIAN);
        riff.put("RIFF".getBytes(StandardCharsets.US_ASCII));
        riff.putInt(12 + payload.length);
        riff.put("WEBP".getBytes(StandardCharsets.US_ASCII));
        riff.put("VP8 ".getBytes(StandardCharsets.US_ASCII));
        riff.putInt(payload.length);
        riff.put(payload);
        return riff.array();
    }

    private static byte[] box(String type, byte[] payload) {
        ByteBuffer b = ByteBuffer.allocate(8 + payload.length);
        b.putInt(8 + payload.length);
        b.put(type.getBytes(StandardCharsets.US_ASCII));
        b.put(payload);
        return b.array();
    }

    private static byte[] ftyp(String major, String compatible) {
        return box(
                "ftyp",
                concat(
                        major.getBytes(StandardCharsets.US_ASCII),
                        new byte[] {0, 0, 2, 0},
                        compatible.getBytes(StandardCharsets.US_ASCII)));
    }

    /** ftyp + optional moov + mdat: the smallest shape of an ISO BMFF video or HEIF file. */
    private static byte[] iso(String major, String compatible, boolean withMoov) {
        byte[] moov = withMoov ? box("moov", new byte[16]) : new byte[0];
        return concat(ftyp(major, compatible), moov, box("mdat", new byte[32]));
    }

    private static byte[] legacyMov() {
        return concat(
                box("wide", new byte[0]), box("mdat", new byte[24]), box("moov", new byte[8]));
    }

    /** ftyp avif + meta holding an ispe box with the image size + mdat. */
    private static byte[] avif(int w, int h) {
        ByteBuffer ispe = ByteBuffer.allocate(12);
        ispe.putInt(0); // version + flags
        ispe.putInt(w);
        ispe.putInt(h);
        byte[] meta =
                box(
                        "meta",
                        concat(new byte[4], box("iprp", box("ipco", box("ispe", ispe.array())))));
        return concat(ftyp("avif", "mif1"), meta, box("mdat", new byte[16]));
    }

    /** An EBML header whose DocType element (0x4282) names the container. */
    private static byte[] ebml(String docType) {
        byte[] name = docType.getBytes(StandardCharsets.US_ASCII);
        byte[] docTypeElement =
                concat(new byte[] {0x42, (byte) 0x82, (byte) (0x80 | name.length)}, name);
        byte[] header =
                concat(
                        new byte[] {
                            0x1A,
                            0x45,
                            (byte) 0xDF,
                            (byte) 0xA3,
                            (byte) (0x80 | docTypeElement.length)
                        },
                        docTypeElement);
        return concat(header, new byte[64]);
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
