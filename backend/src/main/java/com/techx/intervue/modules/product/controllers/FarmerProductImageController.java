package com.techx.intervue.modules.product.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.catalog.resources.UploadedImageResource;
import com.techx.intervue.modules.product.services.impl.ProductImageUploadService;
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
 * Upload a product image before saving the main form (POST/PUT /farmer/products takes this URL back
 * in {@code imageUrl}) — same shape as AdminMarketImageController. Farmer only (role comes from the
 * token, R-06); no product check because a new product has no id yet.
 */
@RestController
@RequestMapping("/api/v1/farmer/products/images")
@PreAuthorize("hasRole('FARMER')")
@AllArgsConstructor
public class FarmerProductImageController extends BaseController {

    private final ProductImageUploadService uploadService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResource<UploadedImageResource>> upload(
            @RequestPart("file") MultipartFile file) {
        String url = uploadService.store(file);
        return created(new UploadedImageResource(url), "Image uploaded.");
    }
}
