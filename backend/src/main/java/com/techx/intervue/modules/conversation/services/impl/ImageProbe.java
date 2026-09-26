package com.techx.intervue.modules.conversation.services.impl;

import com.techx.intervue.modules.conversation.exceptions.UnsupportedImageTypeException;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;
import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageInputStream;
import javax.imageio.stream.ImageOutputStream;

/**
 * Spec §8.2: the image type is concluded from magic bytes, not from Content-Type. JPEG/PNG are
 * decoded and re-encoded as JPEG so EXIF (which may contain GPS coordinates) is dropped — same as
 * AvatarService.
 *
 * <p>WebP: OpenJDK has no ImageIO plugin that can read WebP (checked on JDK 21 and 25), so the size
 * is read straight from the RIFF header and the file is stored intact. Because it is stored as is,
 * the header must be inspected more closely than the other two formats: the RIFF size must match
 * the real file length (blocking attached tails and truncated files) and the chunk sync code /
 * signature must be right (blocking any payload disguised as an image).
 *
 * <p>The remaining consequence: an EXIF/XMP block inside an extended WebP is not stripped. Images
 * only leave through a permission-checked endpoint and only reach the recipient the sender chose,
 * so this is a conscious trade-off, not an oversight.
 */
public final class ImageProbe {

    /**
     * Block "decompression bomb" images: conclude from the header, before allocating memory for the
     * pixels.
     */
    static final int MAX_SIDE = 4096;

    static final String JPEG = "image/jpeg";
    static final String PNG = "image/png";
    static final String WEBP = "image/webp";

    private static final float JPEG_QUALITY = 0.85f;

    private ImageProbe() {}

    public record Probed(String mime, int width, int height) {}

    public static Probed probe(byte[] bytes) {
        String mime = sniff(bytes);
        Probed probed = WEBP.equals(mime) ? probeWebp(bytes) : probeWithImageIo(bytes, mime);
        if (probed.width() > MAX_SIDE || probed.height() > MAX_SIDE) {
            throw new InvalidFieldException(
                    "file", "The photo must be at most " + MAX_SIDE + " pixels on each side.");
        }
        return probed;
    }

    /** JPEG/PNG → re-encoded JPEG. WebP → as is (the JDK has no encoder for it). */
    public static byte[] normalize(byte[] bytes, String mime) {
        if (WEBP.equals(mime)) {
            return bytes;
        }
        return encodeJpeg(decode(bytes));
    }

    private static String sniff(byte[] b) {
        if (isJpeg(b)) {
            return JPEG;
        }
        if (isPng(b)) {
            return PNG;
        }
        if (isWebp(b)) {
            return WEBP;
        }
        throw new UnsupportedImageTypeException();
    }

    private static boolean isJpeg(byte[] b) {
        return b.length > 3
                && (b[0] & 0xFF) == 0xFF
                && (b[1] & 0xFF) == 0xD8
                && (b[2] & 0xFF) == 0xFF;
    }

    private static boolean isPng(byte[] b) {
        byte[] sig = {(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'};
        if (b.length < sig.length) {
            return false;
        }
        for (int i = 0; i < sig.length; i++) {
            if (b[i] != sig[i]) {
                return false;
            }
        }
        return true;
    }

    private static boolean isWebp(byte[] b) {
        if (b.length < 21 || !ascii(b, 0, 4).equals("RIFF") || !ascii(b, 8, 4).equals("WEBP")) {
            return false;
        }
        // The RIFF size field counts every byte after it. Declaring more than the real file means
        // the file is truncated
        // or forged; declaring less means there is a tail that does not belong to the attached
        // image.
        return le32(b, 4) == b.length - 8;
    }

    private static String ascii(byte[] b, int from, int length) {
        return new String(b, from, length, StandardCharsets.US_ASCII);
    }

    /**
     * The three WebP chunk variants (RFC 9649 §2). A 12-byte RIFF header + an 8-byte chunk header,
     * so the chunk payload starts at byte 20.
     */
    private static Probed probeWebp(byte[] b) {
        String chunk = ascii(b, 12, 4);
        try {
            return switch (chunk) {
                case "VP8 " -> {
                    // 20: frame tag (3 byte) · 23: sync code 9d 01 2a · 26: width · 28: height
                    requireBytes(b, 23, 0x9d, 0x01, 0x2a);
                    int width = le16(b, 26) & 0x3FFF;
                    int height = le16(b, 28) & 0x3FFF;
                    yield new Probed(WEBP, width, height);
                }
                case "VP8L" -> {
                    // 20: signature byte 0x2f · 21: 14 bits width-1 then 14 bits height-1
                    requireBytes(b, 20, 0x2f);
                    int bits = le32(b, 21);
                    yield new Probed(WEBP, (bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1);
                }
                // 20: 4 flag bytes · 24: canvas width-1 (3 bytes) · 27: canvas height-1 (3 bytes)
                case "VP8X" -> new Probed(WEBP, le24(b, 24) + 1, le24(b, 27) + 1);
                default -> throw new UnsupportedImageTypeException();
            };
        } catch (ArrayIndexOutOfBoundsException e) {
            throw new UnsupportedImageTypeException();
        }
    }

    /**
     * WebP is stored as is (the JDK has no encoder for it), so if we only trusted "RIFF…WEBP" then
     * 16 header bytes would be enough to stash any payload on the server and serve it back under
     * Content-Type image/webp. The sync code / signature is the cheapest evidence that this really
     * is an image frame.
     */
    private static void requireBytes(byte[] b, int at, int... expected) {
        for (int i = 0; i < expected.length; i++) {
            if ((b[at + i] & 0xFF) != expected[i]) {
                throw new UnsupportedImageTypeException();
            }
        }
    }

    private static int le16(byte[] b, int at) {
        return (b[at] & 0xFF) | ((b[at + 1] & 0xFF) << 8);
    }

    private static int le24(byte[] b, int at) {
        return le16(b, at) | ((b[at + 2] & 0xFF) << 16);
    }

    private static int le32(byte[] b, int at) {
        return le24(b, at) | ((b[at + 3] & 0xFF) << 24);
    }

    private static Probed probeWithImageIo(byte[] bytes, String mime) {
        try (ImageInputStream in =
                ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
            Iterator<ImageReader> readers = in == null ? null : ImageIO.getImageReaders(in);
            if (readers == null || !readers.hasNext()) {
                throw new UnsupportedImageTypeException();
            }
            ImageReader reader = readers.next();
            try {
                reader.setInput(in, true, true);
                return new Probed(mime, reader.getWidth(0), reader.getHeight(0));
            } finally {
                reader.dispose();
            }
        } catch (IOException e) {
            throw new UnsupportedImageTypeException();
        }
    }

    private static BufferedImage decode(byte[] bytes) {
        try {
            BufferedImage image = ImageIO.read(new ByteArrayInputStream(bytes));
            if (image == null) {
                throw new UnsupportedImageTypeException();
            }
            return image;
        } catch (IOException e) {
            throw new UnsupportedImageTypeException();
        }
    }

    /** JPEG has no alpha channel: the transparent part of a PNG becomes a white background. */
    private static byte[] encodeJpeg(BufferedImage source) {
        BufferedImage flat =
                new BufferedImage(
                        source.getWidth(), source.getHeight(), BufferedImage.TYPE_INT_RGB);
        Graphics2D g = flat.createGraphics();
        try {
            g.setColor(Color.WHITE);
            g.fillRect(0, 0, flat.getWidth(), flat.getHeight());
            g.drawImage(source, 0, 0, null);
        } finally {
            g.dispose();
        }

        ImageWriter writer = ImageIO.getImageWritersByFormatName("jpeg").next();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (ImageOutputStream ios = ImageIO.createImageOutputStream(out)) {
            writer.setOutput(ios);
            ImageWriteParam param = writer.getDefaultWriteParam();
            param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
            param.setCompressionQuality(JPEG_QUALITY);
            writer.write(null, new IIOImage(flat, null, null), param);
        } catch (IOException e) {
            throw new IllegalStateException("Could not encode the photo", e);
        } finally {
            writer.dispose();
        }
        return out.toByteArray();
    }
}
