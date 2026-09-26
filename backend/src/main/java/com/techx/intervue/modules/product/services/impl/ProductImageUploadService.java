package com.techx.intervue.modules.product.services.impl;

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
 * Ảnh sản phẩm (Farmer > Products), cùng khuôn với MarketImageUploadService: loại file thật kết
 * luận từ magic bytes, tên file luôn tự sinh (UUID). Một sản phẩm chỉ có một ảnh (contract §5:
 * {@code imageUrl}), khác chợ có nhiều ảnh.
 */
@Service
public class ProductImageUploadService {

    static final String FOLDER = "product-images";

    private static final Set<String> IMAGE_TYPES = Set.of("image/jpeg", "image/png", "image/webp");
    private static final int HEAD_BYTES = 12;
    private static final long MAX_BYTES = 8L * 1024 * 1024;

    private final FileStorageServiceInterface storage;
    private final String baseUrl;

    public ProductImageUploadService(
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
     * đuôi file) kết luận từ magic bytes — giống MarketImageUploadService.
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
