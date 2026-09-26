package com.techx.intervue.modules.catalog.services.impl;

import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import com.techx.intervue.services.interfaces.FileStorageServiceInterface;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/**
 * Ảnh chợ (Admin > Markets), lưu qua {@link FileStorageServiceInterface} dùng chung với avatar —
 * không cần thư mục riêng theo người dùng vì chỉ Admin mới gọi được (AdminMarketImageController).
 * Tên file luôn tự sinh (UUID); không bao giờ dùng tên client gửi lên.
 */
@Service
public class MarketImageUploadService {

    static final String FOLDER = "market-images";

    private static final Set<String> IMAGE_TYPES = Set.of("image/jpeg", "image/png", "image/webp");
    private static final int HEAD_BYTES = 12;
    private static final long MAX_BYTES = 8L * 1024 * 1024;

    private final FileStorageServiceInterface storage;
    private final String baseUrl;

    public MarketImageUploadService(
            FileStorageServiceInterface storage,
            @Value("${app.uploads.base-url:/uploads}") String baseUrl) {
        this.storage = storage;
        this.baseUrl = baseUrl;
    }

    public String store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidFieldException("file", "Choose a photo to upload.");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new InvalidFieldException("file", "The photo must be 8 MB or smaller.");
        }

        byte[] bytes = readAll(file);
        String extension = photoExtension(file.getContentType(), bytes);

        String fileName = UUID.randomUUID() + extension;
        storage.store(FOLDER, fileName, bytes);
        return baseUrl + "/" + FOLDER + "/" + fileName;
    }

    private static byte[] readAll(MultipartFile file) {
        try {
            return file.getBytes();
        } catch (IOException e) {
            throw new UncheckedIOException("Could not read the uploaded file.", e);
        }
    }

    /**
     * Content-Type chỉ là lời khai của client: dùng để chặn sớm loại không nhận, còn loại thật (và
     * đuôi file) kết luận từ magic bytes — giống avatar và ảnh của đơn xin thành Farmer.
     */
    private static String photoExtension(String contentType, byte[] bytes) {
        if (!IMAGE_TYPES.contains(contentType)) {
            throw new InvalidFieldException("file", "Photos must be JPEG, PNG or WEBP.");
        }
        byte[] head = head(bytes);
        if (startsWith(head, 0, 0xFF, 0xD8, 0xFF)) {
            return ".jpg";
        }
        if (startsWith(head, 0, 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n')) {
            return ".png";
        }
        if (startsWith(head, 0, 'R', 'I', 'F', 'F') && startsWith(head, 8, 'W', 'E', 'B', 'P')) {
            return ".webp";
        }
        throw new InvalidFieldException("file", "Photos must be JPEG, PNG or WEBP.");
    }

    private static byte[] head(byte[] bytes) {
        try (InputStream in = new ByteArrayInputStream(bytes)) {
            return in.readNBytes(HEAD_BYTES);
        } catch (IOException e) {
            throw new UncheckedIOException("Could not read the uploaded file.", e);
        }
    }

    private static boolean startsWith(byte[] b, int at, int... expected) {
        if (b.length < at + expected.length) {
            return false;
        }
        for (int i = 0; i < expected.length; i++) {
            if ((b[at + i] & 0xFF) != expected[i]) {
                return false;
            }
        }
        return true;
    }
}
