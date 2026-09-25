package com.techx.intervue.controllers;

import com.techx.intervue.services.interfaces.FileStorageServiceInterface;
import java.time.Duration;
import lombok.AllArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

/**
 * File public đã tải lên (SecurityConfig: /uploads/** permitAll). Tên file là UUID và mỗi lần đổi
 * ảnh là một tên mới, nên trình duyệt được cache lâu mà không bao giờ thấy ảnh cũ.
 */
@RestController
@AllArgsConstructor
public class UploadController {

    private final FileStorageServiceInterface storage;

    @GetMapping("/uploads/avatars/{name:[0-9a-f-]{36}\\.jpg}")
    public ResponseEntity<Resource> avatar(@PathVariable String name) {
        return storage.find("avatars", name)
                .<ResponseEntity<Resource>>map(
                        file ->
                                ResponseEntity.ok()
                                        .contentType(MediaType.IMAGE_JPEG)
                                        .cacheControl(
                                                CacheControl.maxAge(Duration.ofDays(365))
                                                        .cachePublic()
                                                        .immutable())
                                        .header("X-Content-Type-Options", "nosniff")
                                        .body(new FileSystemResource(file)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
