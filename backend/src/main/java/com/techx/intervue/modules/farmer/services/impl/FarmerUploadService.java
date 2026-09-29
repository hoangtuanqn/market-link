package com.techx.intervue.modules.farmer.services.impl;

import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
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

@Slf4j
@Service
public class FarmerUploadService {

    static final String FOLDER = "farmer-applications";

    private static final Set<String> PHOTO_TYPES = Set.of("image/jpeg", "image/png", "image/webp");
    private static final Set<String> VIDEO_TYPES =
            Set.of("video/mp4", "video/webm", "video/quicktime");
    private static final Set<String> ISO_BMFF_BOXES =
            Set.of("ftyp", "moov", "mdat", "wide", "free", "skip");
    private static final int HEAD_BYTES = 12;
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
        byte[] head = head(file);
        String extension =
                isPhoto ? photoExtension(contentType, head) : videoExtension(contentType, head);
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

    public boolean isOwnedBy(String url, Long userId) {
        if (url == null) {
            return true;
        }
        String prefix = urlPrefix(userId);
        return url.startsWith(prefix) && !url.substring(prefix.length()).contains("/");
    }

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
                    log.warn("Could not delete farmer upload {}: {}", file, e.getMessage());
                }
            }
        } catch (IOException e) {
            log.warn("Could not list farmer uploads of user {}: {}", userId, e.getMessage());
        }
        return removed;
    }

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

    private static byte[] head(MultipartFile file) {
        try (InputStream in = file.getInputStream()) {
            return in.readNBytes(HEAD_BYTES);
        } catch (IOException e) {
            throw new UncheckedIOException("Could not read the uploaded file.", e);
        }
    }

    private static String photoExtension(String contentType, byte[] head) {
        if (!PHOTO_TYPES.contains(contentType)) {
            throw new InvalidFieldException("file", "Photos must be JPEG, PNG or WEBP.");
        }
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

    private static String videoExtension(String contentType, byte[] head) {
        if (!VIDEO_TYPES.contains(contentType)) {
            throw new InvalidFieldException("file", "Video must be MP4, WEBM or MOV.");
        }
        if (startsWith(head, 0, 0x1A, 0x45, 0xDF, 0xA3)) {
            return ".webm";
        }
        if (head.length >= 8 && ISO_BMFF_BOXES.contains(ascii(head, 4, 4))) {
            return "video/quicktime".equals(contentType) ? ".mov" : ".mp4";
        }
        throw new InvalidFieldException("file", "Video must be MP4, WEBM or MOV.");
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

    private static String ascii(byte[] b, int from, int length) {
        return new String(b, from, length, StandardCharsets.US_ASCII);
    }
}
