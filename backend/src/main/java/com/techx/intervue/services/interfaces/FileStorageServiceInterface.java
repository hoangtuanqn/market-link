package com.techx.intervue.services.interfaces;

import java.nio.file.Path;
import java.util.Optional;

public interface FileStorageServiceInterface {

    void store(String folder, String fileName, byte[] content);

    void storeFile(String folder, String fileName, Path source);

    Optional<Path> find(String folder, String fileName);

    void delete(String folder, String fileName);
}
