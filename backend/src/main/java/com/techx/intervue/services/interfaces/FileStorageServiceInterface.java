package com.techx.intervue.services.interfaces;

import java.nio.file.Path;
import java.util.Optional;

/**
 * Files uploaded by users (avatars, later product images FR-062). Directory names and file names
 * only consist of lowercase letters, digits, hyphens and one file extension, so they cannot escape
 * the storage directory.
 */
public interface FileStorageServiceInterface {

    /** Overwrites if a file with the same name exists. */
    void store(String folder, String fileName, byte[] content);

    /** Files currently on disk; a name that breaks the rules or does not exist gives empty. */
    Optional<Path> find(String folder, String fileName);

    /** If there is no file, skip. */
    void delete(String folder, String fileName);
}
