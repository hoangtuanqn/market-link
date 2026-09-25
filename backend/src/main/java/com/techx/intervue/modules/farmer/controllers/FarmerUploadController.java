package com.techx.intervue.modules.farmer.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.farmer.resources.UploadedFileResource;
import com.techx.intervue.modules.farmer.services.impl.FarmerUploadService;
import com.techx.intervue.resources.ApiResource;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Ảnh/video đính kèm đơn xin thành Farmer (docs/prototype/customer/become-farmer.html), tải lên
 * trước khi gửi form chính (POST /farmer/apply nhận lại các URL này). Chỉ Customer sắp nộp đơn mới
 * gọi được — khớp quyền với FarmerController#apply.
 */
@RestController
@RequestMapping("/api/v1/farmer/apply/uploads")
@PreAuthorize("hasRole('CUSTOMER')")
@AllArgsConstructor
public class FarmerUploadController extends BaseController {

    private final FarmerUploadService uploadService;

    @PostMapping
    public ResponseEntity<ApiResource<UploadedFileResource>> upload(
            @RequestParam String kind, @RequestParam MultipartFile file) {
        String url = uploadService.store(kind, file);
        return created(new UploadedFileResource(url), "File uploaded.");
    }
}
