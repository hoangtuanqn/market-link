package com.techx.intervue.modules.conversation;

import com.techx.intervue.services.impl.LocalFileStorageService;
import com.techx.intervue.services.interfaces.FileStorageServiceInterface;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(ChatLimitsProperties.class)
public class ChatModuleConfig {

    @Bean
    public FileStorageServiceInterface chatFileStorage(
            @Value("${app.chat.upload-dir}") String dir) {
        return new LocalFileStorageService(dir);
    }
}
