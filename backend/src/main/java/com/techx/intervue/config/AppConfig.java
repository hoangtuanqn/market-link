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
 * @EnableScheduling: chạy các job @Scheduled (vd. RefreshTokenCleanupJob).
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
     * Ảnh/video đơn xin thành Farmer lưu cục bộ (FarmerUploadService) — phục vụ test/demo, đã
     * whitelist public trong SecurityConfig ("/uploads/**").
     */
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String location = "file:" + Path.of(uploadsDir).toAbsolutePath() + "/";
        registry.addResourceHandler(uploadsBaseUrl + "/**").addResourceLocations(location);
    }
}
