package com.techx.intervue.modules.conversation.services.impl;

import com.techx.intervue.modules.conversation.exceptions.UnsupportedImageTypeException;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import java.io.IOException;
import java.io.RandomAccessFile;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * FR-115 (spec 2026-09-28-chat-media-design §2): tells what a chat upload really is from its bytes,
 * never from the file name or the Content-Type the client sent.
 *
 * <p>JPEG/PNG are re-encoded later (EXIF and any hidden payload go away). Everything else is stored
 * exactly as uploaded, so it gets a structural check here: an ISO BMFF file (AVIF, MP4, MOV) must
 * be a chain of boxes ending exactly at the end of the file, a GIF must end with its trailer byte,
 * a WebP keeps the RIFF checks of ImageProbe. That blocks attached tails and truncated files, and
 * any payload that only borrows a few magic bytes.
 *
 * <p>WebM is recognised from its EBML header and DocType only; parsing the whole Matroska element
 * tree is out of proportion for a file that only ever reaches the recipient the sender chose.
 */
public final class MediaProbe {

    public static final String GIF = "image/gif";
    public static final String AVIF = "image/avif";
    public static final String MP4 = "video/mp4";
    public static final String MOV = "video/quicktime";
    public static final String WEBM = "video/webm";

    /** Enough to sniff every format and to find an AVIF's image size in its meta box. */
    static final int HEAD_BYTES = 64 * 1024;

    private static final Set<String> AVIF_BRANDS = Set.of("avif", "avis");
    private static final Set<String> HEIF_BRANDS =
            Set.of("heic", "heix", "heim", "heis", "hevc", "hevx", "heif", "mif1", "msf1");
    private static final Set<String> LEGACY_QUICKTIME_FIRST_BOXES =
            Set.of("wide", "free", "skip", "mdat", "moov");

    private MediaProbe() {}

    public enum Handling {
        /** Decoded and re-encoded as JPEG. */
        REENCODE,
        /** Kept byte for byte after the structural check. */
        STORE_AS_IS
    }

    public record Probed(
            String mime, boolean video, Integer width, Integer height, Handling handling) {}

    public static Probed probe(Path file) {
        try {
            long length = Files.size(file);
            if (length < 12) {
                throw new UnsupportedImageTypeException();
            }
            byte[] head = readHead(file, length);
            if (isJpegOrPng(head)) {
                ImageProbe.Probed image = ImageProbe.probe(Files.readAllBytes(file));
                return new Probed(
                        image.mime(), false, image.width(), image.height(), Handling.REENCODE);
            }
            if (ascii(head, 0, 4).equals("RIFF")) {
                ImageProbe.Probed webp = ImageProbe.probe(Files.readAllBytes(file));
                return new Probed(
                        webp.mime(), false, webp.width(), webp.height(), Handling.STORE_AS_IS);
            }
            if (ascii(head, 0, 6).equals("GIF87a") || ascii(head, 0, 6).equals("GIF89a")) {
                return probeGif(file, head, length);
            }
            if (isEbml(head)) {
                return probeWebm(head);
            }
            if (head.length >= 8 && isFourCc(head, 4)) {
                return probeIso(file, head, length);
            }
            throw new UnsupportedImageTypeException();
        } catch (IOException e) {
            throw new UnsupportedImageTypeException();
        }
    }

    /** The file name the stored copy gets, after its real type. */
    static String extension(String mime) {
        return switch (mime) {
            case ImageProbe.WEBP -> ".webp";
            case GIF -> ".gif";
            case AVIF -> ".avif";
            case MP4 -> ".mp4";
            case MOV -> ".mov";
            case WEBM -> ".webm";
            default -> ".jpg";
        };
    }

    private static Probed probeGif(Path file, byte[] head, long length) throws IOException {
        // A GIF ends with the trailer 0x3B: anything after it does not belong to the picture
        if (head.length < 13 || lastByte(file, length) != 0x3B) {
            throw new UnsupportedImageTypeException();
        }
        int width = le16(head, 6);
        int height = le16(head, 8);
        requireStoredSide(width, height);
        return new Probed(GIF, false, width, height, Handling.STORE_AS_IS);
    }

    private static Probed probeWebm(byte[] head) {
        String start = ascii(head, 0, Math.min(head.length, 64));
        if (start.contains("webm")) {
            return new Probed(WEBM, true, null, null, Handling.STORE_AS_IS);
        }
        // Matroska (.mkv) shares the header but browsers do not play it
        throw new UnsupportedImageTypeException();
    }

    private static Probed probeIso(Path file, byte[] head, long length) throws IOException {
        List<String> boxes = topLevelBoxes(file, length);
        String first = boxes.getFirst();
        if (!first.equals("ftyp")) {
            // A QuickTime file from before the ftyp box existed
            if (LEGACY_QUICKTIME_FIRST_BOXES.contains(first) && boxes.contains("moov")) {
                return new Probed(MOV, true, null, null, Handling.STORE_AS_IS);
            }
            throw new UnsupportedImageTypeException();
        }
        String major = ascii(head, 8, 4);
        Set<String> brands = brands(head, major);
        if (brands.stream().anyMatch(AVIF_BRANDS::contains)) {
            return probeAvif(head);
        }
        if (brands.stream().anyMatch(HEIF_BRANDS::contains)) {
            throw new UnsupportedImageTypeException("Convert HEIC photos to JPEG before sending.");
        }
        // A video without its movie header cannot be played
        if (!boxes.contains("moov")) {
            throw new UnsupportedImageTypeException();
        }
        return new Probed(major.equals("qt  ") ? MOV : MP4, true, null, null, Handling.STORE_AS_IS);
    }

    /** The image size of an AVIF sits in its ispe (image spatial extents) property box. */
    private static Probed probeAvif(byte[] head) {
        int at = indexOf(head, "ispe");
        if (at < 4 || at + 16 > head.length) {
            throw new UnsupportedImageTypeException();
        }
        // "ispe" · 4 bytes version/flags · width (32-bit big endian) · height
        int width = be32(head, at + 8);
        int height = be32(head, at + 12);
        if (width <= 0 || height <= 0) {
            throw new UnsupportedImageTypeException();
        }
        requireStoredSide(width, height);
        return new Probed(AVIF, false, width, height, Handling.STORE_AS_IS);
    }

    /**
     * Walks the top-level boxes: each has a 32-bit size (1 = a 64-bit size follows, 0 = up to the
     * end of the file) and a four-letter type. The chain must stop exactly at the end of the file.
     */
    private static List<String> topLevelBoxes(Path file, long length) throws IOException {
        List<String> types = new ArrayList<>();
        byte[] header = new byte[16];
        try (RandomAccessFile raf = new RandomAccessFile(file.toFile(), "r")) {
            long offset = 0;
            while (offset < length) {
                if (length - offset < 8 || types.size() > 10_000) {
                    throw new UnsupportedImageTypeException();
                }
                raf.seek(offset);
                raf.readFully(header, 0, 8);
                if (!isFourCc(header, 4)) {
                    throw new UnsupportedImageTypeException();
                }
                long size = be32(header, 0) & 0xFFFFFFFFL;
                long headerLength = 8;
                if (size == 1) {
                    if (length - offset < 16) {
                        throw new UnsupportedImageTypeException();
                    }
                    raf.readFully(header, 8, 8);
                    size = be64(header, 8);
                    headerLength = 16;
                } else if (size == 0) {
                    size = length - offset;
                }
                if (size < headerLength || size > length - offset) {
                    throw new UnsupportedImageTypeException();
                }
                types.add(ascii(header, 4, 4));
                offset += size;
            }
        }
        return types;
    }

    private static Set<String> brands(byte[] head, String major) {
        Set<String> brands = new HashSet<>();
        brands.add(major);
        int ftypSize = be32(head, 0);
        int end = Math.min(ftypSize, head.length);
        for (int at = 16; at + 4 <= end; at += 4) {
            brands.add(ascii(head, at, 4));
        }
        return brands;
    }

    private static void requireStoredSide(int width, int height) {
        if (width > ImageProbe.MAX_SIDE || height > ImageProbe.MAX_SIDE) {
            throw new InvalidFieldException(
                    "file",
                    "The photo must be at most " + ImageProbe.MAX_SIDE + " pixels on each side.");
        }
    }

    private static boolean isJpegOrPng(byte[] b) {
        boolean jpeg = (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF;
        boolean png = (b[0] & 0xFF) == 0x89 && ascii(b, 1, 3).equals("PNG");
        return jpeg || png;
    }

    private static boolean isEbml(byte[] b) {
        return (b[0] & 0xFF) == 0x1A
                && (b[1] & 0xFF) == 0x45
                && (b[2] & 0xFF) == 0xDF
                && (b[3] & 0xFF) == 0xA3;
    }

    /** A box type is four printable ASCII characters. */
    private static boolean isFourCc(byte[] b, int at) {
        for (int i = at; i < at + 4; i++) {
            int c = b[i] & 0xFF;
            if (c < 0x20 || c > 0x7E) {
                return false;
            }
        }
        return true;
    }

    private static byte[] readHead(Path file, long length) throws IOException {
        byte[] head = new byte[(int) Math.min(HEAD_BYTES, length)];
        try (RandomAccessFile raf = new RandomAccessFile(file.toFile(), "r")) {
            raf.readFully(head);
        }
        return head;
    }

    private static int lastByte(Path file, long length) throws IOException {
        try (RandomAccessFile raf = new RandomAccessFile(file.toFile(), "r")) {
            raf.seek(length - 1);
            return raf.read();
        }
    }

    private static int indexOf(byte[] b, String needle) {
        byte[] n = needle.getBytes(StandardCharsets.US_ASCII);
        outer:
        for (int i = 0; i + n.length <= b.length; i++) {
            for (int j = 0; j < n.length; j++) {
                if (b[i + j] != n[j]) {
                    continue outer;
                }
            }
            return i;
        }
        return -1;
    }

    private static String ascii(byte[] b, int from, int length) {
        if (from + length > b.length) {
            return "";
        }
        return new String(b, from, length, StandardCharsets.US_ASCII);
    }

    private static int le16(byte[] b, int at) {
        return (b[at] & 0xFF) | ((b[at + 1] & 0xFF) << 8);
    }

    private static int be32(byte[] b, int at) {
        return ((b[at] & 0xFF) << 24)
                | ((b[at + 1] & 0xFF) << 16)
                | ((b[at + 2] & 0xFF) << 8)
                | (b[at + 3] & 0xFF);
    }

    private static long be64(byte[] b, int at) {
        return ((be32(b, at) & 0xFFFFFFFFL) << 32) | (be32(b, at + 4) & 0xFFFFFFFFL);
    }
}
