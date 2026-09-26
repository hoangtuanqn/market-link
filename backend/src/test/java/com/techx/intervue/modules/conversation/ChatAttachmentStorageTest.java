package com.techx.intervue.modules.conversation;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.services.interfaces.FileStorageServiceInterface;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/**
 * Spec §8.2: chat images must live outside app.storage.dir — AppConfig maps that directory to
 * /uploads/** and SecurityConfig sets it to permitAll. The end-to-end proof is the curl step in
 * Task 5; here we only pin that this bean writes into the separate root it was given.
 */
class ChatAttachmentStorageTest {

    @Test
    void writesUnderTheChatRootItWasGivenAndNowhereElse(@TempDir Path chatDir) throws Exception {
        FileStorageServiceInterface chat =
                new ChatModuleConfig().chatFileStorage(chatDir.toString());

        chat.store("images", "abc-123.jpg", new byte[] {1, 2, 3});

        assertThat(Files.readAllBytes(chatDir.resolve("images").resolve("abc-123.jpg")))
                .containsExactly(1, 2, 3);
        assertThat(chat.find("images", "abc-123.jpg")).isPresent();
    }

    @Test
    void refusesAStorageKeyThatTriesToEscapeTheFolder(@TempDir Path chatDir) {
        FileStorageServiceInterface chat =
                new ChatModuleConfig().chatFileStorage(chatDir.toString());

        assertThat(chat.find("images", "../../etc/passwd")).isEmpty();
    }
}
