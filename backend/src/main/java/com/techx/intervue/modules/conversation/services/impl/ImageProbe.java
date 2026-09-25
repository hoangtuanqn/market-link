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
 * Spec §8.2: kiểu ảnh kết luận từ magic bytes, không từ Content-Type. JPEG/PNG được giải mã rồi mã
 * hoá lại thành JPEG nên EXIF (có thể chứa toạ độ GPS) rụng hết — giống AvatarService.
 *
 * <p>WebP: OpenJDK không có plugin ImageIO nào đọc được WebP (đã kiểm trên JDK 21 và 25), nên kích
 * thước đọc thẳng từ header RIFF và file được lưu nguyên vẹn. Hệ quả: khối EXIF/XMP trong một WebP
 * mở rộng không bị bóc. Ảnh chỉ ra ngoài qua endpoint có kiểm quyền và chỉ tới đúng người nhận mà
 * người gửi đã chọn, nên đây là đánh đổi có ý thức, không phải sót.
 */
public final class ImageProbe {

    /** Chặn ảnh "bom giải nén": kết luận từ header, trước khi cấp phát bộ nhớ cho điểm ảnh. */
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

    /** JPEG/PNG → JPEG mã hoá lại. WebP → nguyên si (JDK không có bộ mã hoá nào cho nó). */
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
        return b.length > 15 && ascii(b, 0, 4).equals("RIFF") && ascii(b, 8, 4).equals("WEBP");
    }

    private static String ascii(byte[] b, int from, int length) {
        return new String(b, from, length, StandardCharsets.US_ASCII);
    }

    /**
     * Ba biến thể chunk của WebP (RFC 9649 §2). Header RIFF 12 byte + chunk header 8 byte, nên
     * payload của chunk bắt đầu ở byte 20.
     */
    private static Probed probeWebp(byte[] b) {
        String chunk = ascii(b, 12, 4);
        try {
            return switch (chunk) {
                case "VP8 " -> {
                    // 20: frame tag (3 byte) · 23: sync code 9d 01 2a · 26: width · 28: height
                    int width = le16(b, 26) & 0x3FFF;
                    int height = le16(b, 28) & 0x3FFF;
                    yield new Probed(WEBP, width, height);
                }
                case "VP8L" -> {
                    // 20: signature byte 0x2f · 21: 14 bit width-1 rồi 14 bit height-1
                    int bits = le32(b, 21);
                    yield new Probed(WEBP, (bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1);
                }
                // 20: 4 byte cờ · 24: canvas width-1 (3 byte) · 27: canvas height-1 (3 byte)
                case "VP8X" -> new Probed(WEBP, le24(b, 24) + 1, le24(b, 27) + 1);
                default -> throw new UnsupportedImageTypeException();
            };
        } catch (ArrayIndexOutOfBoundsException e) {
            throw new UnsupportedImageTypeException();
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

    /** JPEG không có kênh alpha: phần trong suốt của PNG thành nền trắng. */
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
