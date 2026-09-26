package com.techx.intervue.modules.conversation;

import com.techx.intervue.services.impl.LocalFileStorageService;
import com.techx.intervue.services.interfaces.FileStorageServiceInterface;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Cấu hình của module chat người-với-người. Không nhầm với
 * com.techx.intervue.modules.chat.ChatConfig — đó là chatbot FR-090.
 */
@Configuration
@EnableConfigurationProperties(ChatLimitsProperties.class)
public class ChatModuleConfig {

    /**
     * Spec §8.2: ảnh chat KHÔNG được nằm trong app.storage.dir — thư mục đó được AppConfig map ra
     * /uploads/** và SecurityConfig cho permitAll, nên ai có link cũng tải được. Bean này dùng lại
     * đúng logic đường dẫn an toàn của LocalFileStorageService nhưng cắm vào một gốc khác.
     */
    @Bean
    public FileStorageServiceInterface chatFileStorage(
            @Value("${app.chat.upload-dir}") String dir) {
        return new LocalFileStorageService(dir);
    }
}
