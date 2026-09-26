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
 * Tải ảnh sản phẩm lên trước khi lưu form chính (POST/PUT /farmer/products nhận lại URL này trong
 * {@code imageUrl}) — cùng khuôn với AdminMarketImageController. Chỉ Farmer (role lấy từ token,
 * R-06); không kiểm sản phẩm nào vì lúc tạo mới còn chưa có id.
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
