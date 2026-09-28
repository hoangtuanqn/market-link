package com.techx.intervue.modules.conversation.services.impl;

import com.techx.intervue.modules.conversation.exceptions.UnsupportedImageTypeException;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.geom.AffineTransform;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;
import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageReadParam;
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

    /**
     * FR-115: JPEG/PNG larger than MAX_SIDE are scaled down instead of refused; only an absurd
     * header is refused before decoding.
     */
    static final int MAX_DECODE_SIDE = 30_000;

    /**
     * Pixels decoded at most (about 96 MB for a 3-byte JPEG raster): a larger photo is read with
     * subsampling, so a 48 MP phone photo decodes at 12 MP.
     */
    static final long DECODE_PIXEL_BUDGET = 24_000_000L;

    /**
     * Final review #3: a header claiming more pixels than any phone camera (a 200 MP sensor is
     * 16320×12240) is refused before decoding, whatever its sides.
     */
    static final long MAX_DECODE_PIXELS = 200_000_000L;

    /**
     * Final review #3: a progressive JPEG is decoded with every DCT coefficient held in native
     * memory (up to about 6 bytes a pixel), which subsampling does not reduce. Phones write
     * baseline JPEGs; a progressive one this large is a web export or an attack.
     */
    static final long MAX_PROGRESSIVE_PIXELS = 24_000_000L;

    private static final String TOO_LARGE =
            "This photo is too large to process. Save it at a smaller size and try again.";

    static final String JPEG = "image/jpeg";
    static final String PNG = "image/png";
    static final String WEBP = "image/webp";

    private static final float JPEG_QUALITY = 0.85f;

    private ImageProbe() {}

    public record Probed(String mime, int width, int height) {}

    /** A re-encoded photo and the size it was actually stored at. */
    public record Normalized(byte[] bytes, int width, int height) {}

    /** What the JPEG header says before any pixel is decoded. */
    record JpegHeader(int width, int height, boolean progressive, int orientation) {}

    public static Probed probe(byte[] bytes) {
        String mime = sniff(bytes);
        JpegHeader jpeg = JPEG.equals(mime) ? readJpegHeader(bytes) : null;
        Probed probed =
                switch (mime) {
                    case WEBP -> probeWebp(bytes);
                    // Read from the header ourselves: the limits below must hold before ImageIO
                    // (and libjpeg under it) sees the file
                    case JPEG -> new Probed(JPEG, jpeg.width(), jpeg.height());
                    default -> probeWithImageIo(bytes, mime);
                };
        // WebP is stored as is, so its size is capped; JPEG/PNG are decoded and scaled down later
        int limit = WEBP.equals(mime) ? MAX_SIDE : MAX_DECODE_SIDE;
        if (probed.width() > limit || probed.height() > limit) {
            throw new InvalidFieldException(
                    "file", "The photo must be at most " + limit + " pixels on each side.");
        }
        long pixels = (long) probed.width() * probed.height();
        if (pixels > MAX_DECODE_PIXELS
                || (jpeg != null && jpeg.progressive() && pixels > MAX_PROGRESSIVE_PIXELS)) {
            throw new InvalidFieldException("file", TOO_LARGE);
        }
        return probed;
    }

    /**
     * JPEG/PNG → re-encoded JPEG, at most MAX_SIDE on the long side. WebP → as is (the JDK has no
     * encoder for it).
     */
    public static byte[] normalize(byte[] bytes, String mime) {
        if (WEBP.equals(mime)) {
            return bytes;
        }
        return reencode(bytes, mime).bytes();
    }

    /**
     * JPEG/PNG → JPEG, upright and at most MAX_SIDE on the long side. EXIF goes away with the
     * re-encode, so its Orientation is applied to the pixels first (final review #5), and the
     * returned size is the one actually encoded.
     */
    public static Normalized reencode(byte[] bytes, String mime) {
        int orientation = JPEG.equals(mime) ? readJpegHeader(bytes).orientation() : 1;
        BufferedImage upright = orient(fitWithin(decode(bytes), MAX_SIDE), orientation);
        return new Normalized(encodeJpeg(upright), upright.getWidth(), upright.getHeight());
    }

    /**
     * Walks the JPEG marker segments up to the first scan: the frame header (SOFn) gives the size
     * and whether the image is progressive, an APP1 Exif segment gives the Orientation.
     */
    static JpegHeader readJpegHeader(byte[] b) {
        int orientation = 1;
        int at = 2;
        try {
            while (at + 3 < b.length) {
                if ((b[at] & 0xFF) != 0xFF) {
                    throw new UnsupportedImageTypeException();
                }
                int marker = b[at + 1] & 0xFF;
                if (marker == 0xFF) {
                    // Fill byte before a marker
                    at++;
                    continue;
                }
                if (marker == 0x01 || (marker >= 0xD0 && marker <= 0xD7)) {
                    at += 2;
                    continue;
                }
                if (marker == 0xDA || marker == 0xD9) {
                    break;
                }
                int length = be16(b, at + 2);
                if (length < 2) {
                    throw new UnsupportedImageTypeException();
                }
                int data = at + 4;
                if (isFrameHeader(marker)) {
                    // precision (1) · height (2) · width (2) · components …
                    int height = be16(b, data + 1);
                    int width = be16(b, data + 3);
                    boolean progressive =
                            marker == 0xC2 || marker == 0xC6 || marker == 0xCA || marker == 0xCE;
                    if (width == 0 || height == 0) {
                        throw new UnsupportedImageTypeException();
                    }
                    return new JpegHeader(width, height, progressive, orientation);
                }
                if (marker == 0xE1 && orientation == 1) {
                    orientation = exifOrientation(b, data, at + 2 + length);
                }
                at += 2 + length;
            }
        } catch (ArrayIndexOutOfBoundsException e) {
            throw new UnsupportedImageTypeException();
        }
        // No frame header before the first scan: not a JPEG anything can decode
        throw new UnsupportedImageTypeException();
    }

    /** SOF0–SOF15 except DHT (C4), JPG (C8) and DAC (CC), which share the range. */
    private static boolean isFrameHeader(int marker) {
        return marker >= 0xC0
                && marker <= 0xCF
                && marker != 0xC4
                && marker != 0xC8
                && marker != 0xCC;
    }

    /**
     * "Exif\0\0" then a TIFF header (II or MM byte order, 42, offset of IFD0); tag 0x0112 in IFD0
     * is the Orientation (1–8). Anything malformed counts as 1, the photo as it is.
     */
    private static int exifOrientation(byte[] b, int start, int end) {
        if (end > b.length || end - start < 14 || !ascii(b, start, 4).equals("Exif")) {
            return 1;
        }
        int tiff = start + 6;
        boolean little = ascii(b, tiff, 2).equals("II");
        if (!little && !ascii(b, tiff, 2).equals("MM")) {
            return 1;
        }
        int ifd = tiff + (int) u32(b, tiff + 4, little);
        if (ifd < tiff || ifd + 2 > end) {
            return 1;
        }
        int entries = u16(b, ifd, little);
        for (int i = 0; i < entries; i++) {
            int entry = ifd + 2 + i * 12;
            if (entry + 12 > end) {
                return 1;
            }
            if (u16(b, entry, little) == 0x0112) {
                int value = u16(b, entry + 8, little);
                return value >= 1 && value <= 8 ? value : 1;
            }
        }
        return 1;
    }

    /**
     * Applies an EXIF Orientation: 2 mirror, 3 turn 180°, 4 flip, 5 transpose, 6 turn 90°
     * clockwise, 7 transverse, 8 turn 90° anticlockwise. 5–8 swap width and height.
     */
    private static BufferedImage orient(BufferedImage source, int orientation) {
        if (orientation <= 1 || orientation > 8) {
            return source;
        }
        int w = source.getWidth();
        int h = source.getHeight();
        AffineTransform t =
                switch (orientation) {
                    case 2 -> new AffineTransform(-1, 0, 0, 1, w, 0);
                    case 3 -> new AffineTransform(-1, 0, 0, -1, w, h);
                    case 4 -> new AffineTransform(1, 0, 0, -1, 0, h);
                    case 5 -> new AffineTransform(0, 1, 1, 0, 0, 0);
                    case 6 -> new AffineTransform(0, 1, -1, 0, h, 0);
                    case 7 -> new AffineTransform(0, -1, -1, 0, h, w);
                    default -> new AffineTransform(0, -1, 1, 0, 0, w);
                };
        boolean turned = orientation >= 5;
        BufferedImage out =
                new BufferedImage(turned ? h : w, turned ? w : h, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = out.createGraphics();
        try {
            g.setColor(Color.WHITE);
            g.fillRect(0, 0, out.getWidth(), out.getHeight());
            g.drawImage(source, t, null);
        } finally {
            g.dispose();
        }
        return out;
    }

    private static int be16(byte[] b, int at) {
        return ((b[at] & 0xFF) << 8) | (b[at + 1] & 0xFF);
    }

    private static int u16(byte[] b, int at, boolean little) {
        return little ? le16(b, at) : be16(b, at);
    }

    private static long u32(byte[] b, int at, boolean little) {
        long value =
                little ? le32(b, at) & 0xFFFFFFFFL : ((long) be16(b, at) << 16) | be16(b, at + 2);
        return value;
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

    /** Decodes with subsampling when the photo has more pixels than DECODE_PIXEL_BUDGET. */
    private static BufferedImage decode(byte[] bytes) {
        try (ImageInputStream in =
                ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
            Iterator<ImageReader> readers = in == null ? null : ImageIO.getImageReaders(in);
            if (readers == null || !readers.hasNext()) {
                throw new UnsupportedImageTypeException();
            }
            ImageReader reader = readers.next();
            try {
                reader.setInput(in, true, true);
                long width = reader.getWidth(0);
                long height = reader.getHeight(0);
                int step = 1;
                while ((width / step) * (height / step) > DECODE_PIXEL_BUDGET) {
                    step++;
                }
                ImageReadParam param = reader.getDefaultReadParam();
                if (step > 1) {
                    param.setSourceSubsampling(step, step, 0, 0);
                }
                BufferedImage image = reader.read(0, param);
                if (image == null) {
                    throw new UnsupportedImageTypeException();
                }
                return image;
            } finally {
                reader.dispose();
            }
        } catch (IOException e) {
            throw new UnsupportedImageTypeException();
        }
    }

    /** The size a photo of width×height is stored at: unchanged, or scaled to fit MAX_SIDE. */
    static int[] storedSize(int width, int height) {
        if (width <= MAX_SIDE && height <= MAX_SIDE) {
            return new int[] {width, height};
        }
        double scale = (double) MAX_SIDE / Math.max(width, height);
        return new int[] {
            Math.max(1, (int) Math.round(width * scale)),
            Math.max(1, (int) Math.round(height * scale))
        };
    }

    private static BufferedImage fitWithin(BufferedImage source, int maxSide) {
        int width = source.getWidth();
        int height = source.getHeight();
        if (width <= maxSide && height <= maxSide) {
            return source;
        }
        int[] target = storedSize(width, height);
        int targetWidth = target[0];
        int targetHeight = target[1];
        BufferedImage scaled =
                new BufferedImage(targetWidth, targetHeight, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = scaled.createGraphics();
        try {
            g.setRenderingHint(
                    RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            g.setColor(Color.WHITE);
            g.fillRect(0, 0, targetWidth, targetHeight);
            g.drawImage(source, 0, 0, targetWidth, targetHeight, null);
        } finally {
            g.dispose();
        }
        return scaled;
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
