package com.techx.intervue.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.nio.file.Path;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * @EnableScheduling: runs the @Scheduled jobs (e.g. RefreshTokenCleanupJob).
 */
@Configuration
@EnableScheduling
public class AppConfig implements WebMvcConfigurer {

    @Value("${app.uploads.dir:uploads}")
    private String uploadsDir;

    @Value("${app.uploads.base-url:/uploads}")
    private String uploadsBaseUrl;

    @Bean
    ObjectMapper objectMapper() {
        return new ObjectMapper()
                .registerModule(new JavaTimeModule())
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }

    /**
     * Images/videos from Farmer applications are stored locally (FarmerUploadService) — for
     * test/demo use, already whitelisted as public in SecurityConfig ("/uploads/**").
     */
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String location = "file:" + Path.of(uploadsDir).toAbsolutePath() + "/";
        registry.addResourceHandler(uploadsBaseUrl + "/**").addResourceLocations(location);
    }
}
