package com.techx.intervue.modules.catalog.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.catalog.resources.UploadedImageResource;
import com.techx.intervue.modules.catalog.services.impl.MarketImageUploadService;
import com.techx.intervue.resources.ApiResource;
import lombok.AllArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Upload a market image before saving the main form (POST/PUT /admin/markets takes this URL back in
 * `images`) — same shape as FarmerUploadController. Admin only (role comes from the token, R-06).
 */
@RestController
@RequestMapping("/api/v1/admin/markets/images")
@PreAuthorize("hasRole('ADMIN')")
@AllArgsConstructor
public class AdminMarketImageController extends BaseController {

    private final MarketImageUploadService uploadService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResource<UploadedImageResource>> upload(
            @RequestPart("file") MultipartFile file) {
        String url = uploadService.store(file);
        return created(new UploadedImageResource(url), "Image uploaded.");
    }
}
