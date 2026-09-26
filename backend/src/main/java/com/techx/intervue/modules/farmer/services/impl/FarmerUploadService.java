package com.techx.intervue.modules.farmer.services.impl;

import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.Comparator;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Stream;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/**
 * Lưu ảnh/video của đơn xin thành Farmer vào ổ đĩa cục bộ (app.uploads.dir) — chỉ phục vụ test/demo
 * (docs/prototype/customer/become-farmer.html), không phải hạ tầng object storage cho production.
 * Tên file luôn tự sinh (UUID); không bao giờ dùng tên file client gửi lên, tránh path traversal.
 *
 * <p>Mỗi tài khoản có thư mục riêng {@code farmer-applications/<userId>/}. Nhờ vậy kiểm được "đường
 * dẫn này có phải của chính người đang nộp đơn không" mà không cần bảng phụ, và dọn file thừa của
 * một người cũng chỉ là quét đúng thư mục của họ.
 */
@Slf4j
@Service
public class FarmerUploadService {

    static final String FOLDER = "farmer-applications";

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
        this.storageDir = Path.of(uploadsDir, FOLDER);
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
    public String store(Long userId, String kind, MultipartFile file) {
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

        Path userDir = dirOf(userId);
        try {
            Files.createDirectories(userDir);
        } catch (IOException e) {
            throw new UncheckedIOException("Could not create upload directory.", e);
        }

        String filename = UUID.randomUUID() + extension;
        try {
            file.transferTo(userDir.resolve(filename));
        } catch (IOException e) {
            throw new UncheckedIOException("Could not save the uploaded file.", e);
        }
        return urlPrefix(userId) + filename;
    }

    /**
     * Đường dẫn client gửi kèm đơn có đúng là file người đó vừa tải lên không. Không kiểm thì ai
     * cũng gắn được ảnh của người khác vào đơn của mình, chỉ cần đoán ra tên file.
     */
    public boolean isOwnedBy(String url, Long userId) {
        if (url == null) {
            return true;
        }
        String prefix = urlPrefix(userId);
        // Chặn "…/<userId>/../<userId khác>/x.jpg": sau tiền tố chỉ được là một tên file phẳng.
        return url.startsWith(prefix) && !url.substring(prefix.length()).contains("/");
    }

    /**
     * Xoá những file trong thư mục của một tài khoản mà không còn đơn nào trỏ tới. Gọi sau khi nộp
     * lại hoặc rút đơn: ảnh của bản nháp cũ không còn ai đọc, giữ lại chỉ tốn ổ đĩa.
     *
     * @param keepUrls các URL vẫn còn được tham chiếu
     * @param olderThan chỉ xoá file cũ hơn mốc này, để không xoá nhầm ảnh vừa tải lên mà chưa gửi
     */
    public int deleteUnreferenced(Long userId, Set<String> keepUrls, Instant olderThan) {
        Path userDir = dirOf(userId);
        if (!Files.isDirectory(userDir)) {
            return 0;
        }
        String prefix = urlPrefix(userId);
        int removed = 0;
        try (Stream<Path> files = Files.list(userDir)) {
            for (Path file : files.sorted(Comparator.comparing(Path::toString)).toList()) {
                if (keepUrls.contains(prefix + file.getFileName())) {
                    continue;
                }
                try {
                    if (Files.getLastModifiedTime(file).toInstant().isAfter(olderThan)) {
                        continue;
                    }
                    Files.deleteIfExists(file);
                    removed++;
                } catch (IOException e) {
                    // Một file hỏng không được chặn cả mẻ; file thừa chỉ tốn chỗ, không sai dữ
                    // liệu.
                    log.warn("Could not delete farmer upload {}: {}", file, e.getMessage());
                }
            }
        } catch (IOException e) {
            log.warn("Could not list farmer uploads of user {}: {}", userId, e.getMessage());
        }
        return removed;
    }

    /** Các thư mục đang có file, để job dọn dẹp biết phải quét những tài khoản nào. */
    public Set<Long> usersWithFiles() {
        if (!Files.isDirectory(storageDir)) {
            return Set.of();
        }
        try (Stream<Path> dirs = Files.list(storageDir)) {
            return dirs.filter(Files::isDirectory)
                    .map(dir -> dir.getFileName().toString())
                    .filter(name -> name.chars().allMatch(Character::isDigit))
                    .map(Long::valueOf)
                    .collect(java.util.stream.Collectors.toSet());
        } catch (IOException e) {
            log.warn("Could not list farmer upload folders: {}", e.getMessage());
            return Set.of();
        }
    }

    private Path dirOf(Long userId) {
        return storageDir.resolve(String.valueOf(userId));
    }

    private String urlPrefix(Long userId) {
        return baseUrl + "/" + FOLDER + "/" + userId + "/";
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
