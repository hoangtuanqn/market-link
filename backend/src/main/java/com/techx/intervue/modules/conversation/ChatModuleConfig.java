package com.techx.intervue.modules.conversation;

import com.techx.intervue.services.impl.LocalFileStorageService;
import com.techx.intervue.services.interfaces.FileStorageServiceInterface;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration of the person-to-person chat module. Not to be confused with
 * com.techx.intervue.modules.chat.ChatConfig — that one is the FR-090 chatbot.
 */
@Configuration
@EnableConfigurationProperties(ChatLimitsProperties.class)
public class ChatModuleConfig {

    /**
     * Spec §8.2: chat images must NOT live in app.storage.dir — AppConfig maps that directory to
     * /uploads/** and SecurityConfig sets it to permitAll, so anyone with the link can download.
     * This bean reuses the safe-path logic of LocalFileStorageService but plugged into a different
     * root.
     */
    @Bean
    public FileStorageServiceInterface chatFileStorage(
            @Value("${app.chat.upload-dir}") String dir) {
        return new LocalFileStorageService(dir);
    }
}
