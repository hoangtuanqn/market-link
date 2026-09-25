package com.techx.intervue.modules.conversation;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.services.interfaces.FileStorageServiceInterface;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/**
 * Spec §8.2: ảnh chat phải nằm ngoài app.storage.dir — thư mục đó được AppConfig map ra /uploads/**
 * và SecurityConfig cho permitAll. Bằng chứng đầu-cuối là bước curl trong Task 5; ở đây chỉ chốt
 * rằng bean này ghi đúng vào gốc riêng mà nó được trao.
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
