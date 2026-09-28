package com.techx.intervue.modules.quality.services.impl;

import com.techx.intervue.modules.conversation.services.impl.ImageProbe;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import com.techx.intervue.services.interfaces.FileStorageServiceInterface;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/**
 * FR-122: the photo a customer attaches to a spoilage report (spec §4.4.1: JPG, PNG or WebP, at
 * most 5 MB). Stored like product photos under /uploads with a name nobody can guess, prefixed by
 * the uploader's id so a report only accepts the reporter's own photo. JPEG and PNG go through
 * {@link ImageProbe#normalize}, which re-encodes them and drops EXIF: a phone photo can carry the
 * customer's GPS position, and this folder is public.
 */
@Service
public class QualityReportPhotoService {

    static final String FOLDER = "quality-report-photos";
    static final long MAX_BYTES = 5L * 1024 * 1024;

    private static final Pattern NAME =
            Pattern.compile(
                    "(\\d+)-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
                            + "\\.(jpg|webp)");

    private final FileStorageServiceInterface storage;
    private final String baseUrl;

    public QualityReportPhotoService(
            FileStorageServiceInterface storage,
            @Value("${app.uploads.base-url:/uploads}") String baseUrl) {
        this.storage = storage;
        this.baseUrl = baseUrl;
    }

    /** Checks the real type from the bytes and returns the URL to send with the report. */
    public String store(long userId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidFieldException("file", "Choose a photo to upload.");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new InvalidFieldException("file", "The photo must be 5 MB or smaller.");
        }
        byte[] bytes = readAll(file);
        ImageProbe.Probed probed = ImageProbe.probe(bytes);
        byte[] stored = ImageProbe.normalize(bytes, probed.mime());
        // WebP is kept as it is (the JDK cannot encode it); JPEG and PNG became a JPEG
        String extension = "image/webp".equals(probed.mime()) ? ".webp" : ".jpg";
        String fileName = userId + "-" + UUID.randomUUID() + extension;
        storage.store(FOLDER, fileName, stored);
        return prefix() + fileName;
    }

    /**
     * A URL this service gave to this same account whose file is still on disk. Anything else —
     * another customer's photo, an address on another site — is not accepted in a report.
     */
    public boolean isOwnedBy(String url, long userId) {
        String prefix = prefix();
        if (url == null || !url.startsWith(prefix)) {
            return false;
        }
        String name = url.substring(prefix.length());
        Matcher matcher = NAME.matcher(name);
        return matcher.matches()
                && matcher.group(1).equals(Long.toString(userId))
                && storage.find(FOLDER, name).isPresent();
    }

    private String prefix() {
        return baseUrl + "/" + FOLDER + "/";
    }

    private static byte[] readAll(MultipartFile file) {
        try {
            return file.getBytes();
        } catch (IOException e) {
            throw new UncheckedIOException("Could not read the uploaded file.", e);
        }
    }
}
