package com.techx.intervue.modules.farmer.services.impl;

import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/**
 * Lưu ảnh/video của đơn xin thành Farmer vào ổ đĩa cục bộ (app.uploads.dir) — chỉ phục vụ test/demo
 * (docs/prototype/customer/become-farmer.html), không phải hạ tầng object storage cho production.
 * Tên file luôn tự sinh (UUID); không bao giờ dùng tên file client gửi lên, tránh path traversal.
 */
@Service
public class FarmerUploadService {

    private static final Set<String> PHOTO_TYPES = Set.of("image/jpeg", "image/png", "image/webp");
    private static final Set<String> VIDEO_TYPES =
            Set.of("video/mp4", "video/webm", "video/quicktime");
    private static final long PHOTO_MAX_BYTES = 8L * 1024 * 1024;
    private static final long VIDEO_MAX_BYTES = 40L * 1024 * 1024;

    private final Path storageDir;
    private final String baseUrl;

    public FarmerUploadService(
            @Value("${app.uploads.dir:uploads}") String uploadsDir,
            @Value("${app.uploads.base-url:/uploads}") String baseUrl) {
        this.storageDir = Path.of(uploadsDir, "farmer-applications");
        this.baseUrl = baseUrl;
        try {
            Files.createDirectories(storageDir);
        } catch (IOException e) {
            throw new UncheckedIOException("Could not create upload directory.", e);
        }
    }

    /**
     * @param kind "photo" hoặc "video" — quyết định content-type/kích thước cho phép.
     */
    public String store(String kind, MultipartFile file) {
        boolean isPhoto = "photo".equals(kind);
        boolean isVideo = "video".equals(kind);
        if (!isPhoto && !isVideo) {
            throw new InvalidFieldException("kind", "kind must be photo or video.");
        }
        if (file == null || file.isEmpty()) {
            throw new InvalidFieldException("file", "Choose a file.");
        }

        String contentType = file.getContentType();
        String extension = isPhoto ? photoExtension(contentType) : videoExtension(contentType);
        long maxBytes = isPhoto ? PHOTO_MAX_BYTES : VIDEO_MAX_BYTES;
        if (file.getSize() > maxBytes) {
            throw new InvalidFieldException("file", "File is too large.");
        }

        String filename = UUID.randomUUID() + extension;
        Path target = storageDir.resolve(filename);
        try {
            file.transferTo(target);
        } catch (IOException e) {
            throw new UncheckedIOException("Could not save the uploaded file.", e);
        }
        return baseUrl + "/farmer-applications/" + filename;
    }

    private static String photoExtension(String contentType) {
        if (!PHOTO_TYPES.contains(contentType)) {
            throw new InvalidFieldException("file", "Photos must be JPEG, PNG or WEBP.");
        }
        return switch (contentType) {
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            default -> ".jpg";
        };
    }

    private static String videoExtension(String contentType) {
        if (!VIDEO_TYPES.contains(contentType)) {
            throw new InvalidFieldException("file", "Video must be MP4, WEBM or MOV.");
        }
        return switch (contentType) {
            case "video/webm" -> ".webm";
            case "video/quicktime" -> ".mov";
            default -> ".mp4";
        };
    }
}
