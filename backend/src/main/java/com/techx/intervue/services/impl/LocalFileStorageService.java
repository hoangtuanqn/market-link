package com.techx.intervue.services.impl;

import com.techx.intervue.services.interfaces.FileStorageServiceInterface;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Optional;
import java.util.regex.Pattern;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;

/** Stores files on disk under app.storage.dir (Docker: the uploads-data volume at /app/uploads). */
@Slf4j
@Service
// The default bean for avatars and Farmer application files. ChatModuleConfig builds a second
// bean of the same type with a different root, for chat images (spec §8.2) — @Primary so the old
// injection points are not ambiguous.
@Primary
public class LocalFileStorageService implements FileStorageServiceInterface {

    private static final Pattern FOLDER = Pattern.compile("[a-z0-9-]+");
    private static final Pattern FILE_NAME = Pattern.compile("[a-z0-9-]+(\\.[a-z0-9]+)?");

    private final Path root;

    public LocalFileStorageService(@Value("${app.storage.dir}") String dir) {
        this.root = Paths.get(dir).toAbsolutePath().normalize();
    }

    @Override
    public void store(String folder, String fileName, byte[] content) {
        Path target = resolve(folder, fileName);
        try {
            Files.createDirectories(target.getParent());
            // Write to a temp file then rename: someone downloading an image never receives half a
            // file
            Path temp = Files.createTempFile(target.getParent(), ".upload-", ".tmp");
            try {
                Files.write(temp, content);
                Files.move(
                        temp,
                        target,
                        StandardCopyOption.REPLACE_EXISTING,
                        StandardCopyOption.ATOMIC_MOVE);
            } finally {
                Files.deleteIfExists(temp);
            }
        } catch (IOException e) {
            throw new UncheckedIOException("Could not save " + folder + "/" + fileName, e);
        }
    }

    @Override
    public Optional<Path> find(String folder, String fileName) {
        if (!isValid(folder, fileName)) {
            return Optional.empty();
        }
        Path file = resolve(folder, fileName);
        return Files.isRegularFile(file) ? Optional.of(file) : Optional.empty();
    }

    @Override
    public void delete(String folder, String fileName) {
        try {
            Files.deleteIfExists(resolve(folder, fileName));
        } catch (IOException e) {
            // An orphan file only costs space, it does not break the user's request
            log.warn("Could not delete {}/{}: {}", folder, fileName, e.getMessage());
        }
    }

    private static boolean isValid(String folder, String fileName) {
        return folder != null
                && fileName != null
                && FOLDER.matcher(folder).matches()
                && FILE_NAME.matcher(fileName).matches();
    }

    private Path resolve(String folder, String fileName) {
        if (!isValid(folder, fileName)) {
            throw new IllegalArgumentException("Invalid storage path: " + folder + "/" + fileName);
        }
        Path file = root.resolve(folder).resolve(fileName).normalize();
        if (!file.startsWith(root)) {
            throw new IllegalArgumentException("Invalid storage path: " + folder + "/" + fileName);
        }
        return file;
    }
}
