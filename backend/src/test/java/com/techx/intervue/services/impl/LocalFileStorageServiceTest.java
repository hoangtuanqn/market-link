package com.techx.intervue.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class LocalFileStorageServiceTest {

    @TempDir Path root;

    private LocalFileStorageService storage;

    @BeforeEach
    void setUp() {
        storage = new LocalFileStorageService(root.toString());
    }

    @Test
    void storesFindsAndDeletesAFile() {
        storage.store("avatars", "a1.jpg", new byte[] {1, 2, 3});

        Path file = storage.find("avatars", "a1.jpg").orElseThrow();
        assertThat(file).startsWith(root).hasBinaryContent(new byte[] {1, 2, 3});

        storage.delete("avatars", "a1.jpg");
        assertThat(storage.find("avatars", "a1.jpg")).isEmpty();
        assertThat(Files.exists(file)).isFalse();
    }

    @Test
    void missingFileIsEmptyAndDeletingItIsHarmless() {
        assertThat(storage.find("avatars", "nope.jpg")).isEmpty();
        storage.delete("avatars", "nope.jpg");
    }

    @Test
    void refusesNamesThatCouldLeaveTheStorageFolder() {
        for (String bad : new String[] {"../x.jpg", "a/b.jpg", "..", "", "A B.jpg", "x.jpg/.."}) {
            assertThatThrownBy(() -> storage.store("avatars", bad, new byte[] {1}))
                    .as(bad)
                    .isInstanceOf(IllegalArgumentException.class);
            assertThat(storage.find("avatars", bad)).as(bad).isEmpty();
        }
        assertThatThrownBy(() -> storage.store("../etc", "a.jpg", new byte[] {1}))
                .isInstanceOf(IllegalArgumentException.class);
    }

    /** FR-115: a video is copied from the upload's temp file, never read into memory. */
    @Test
    void storeFileCopiesAFileIntoPlace(@TempDir Path elsewhere) throws Exception {
        Path source = Files.write(elsewhere.resolve("upload.part"), new byte[] {4, 5, 6});

        storage.storeFile("images", "v1.mp4", source);

        assertThat(storage.find("images", "v1.mp4").orElseThrow())
                .startsWith(root)
                .hasBinaryContent(new byte[] {4, 5, 6});
    }

    @Test
    void storeFileRefusesANameThatCouldLeaveTheFolder(@TempDir Path elsewhere) throws Exception {
        Path source = Files.write(elsewhere.resolve("upload.part"), new byte[] {1});

        assertThatThrownBy(() -> storage.storeFile("images", "../v1.mp4", source))
                .isInstanceOf(RuntimeException.class);
    }
}
