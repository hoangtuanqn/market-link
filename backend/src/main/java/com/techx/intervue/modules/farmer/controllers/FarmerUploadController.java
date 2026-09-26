package com.techx.intervue.modules.farmer.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.farmer.resources.UploadedFileResource;
import com.techx.intervue.modules.farmer.services.impl.FarmerUploadService;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import com.techx.intervue.resources.ApiResource;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Images/videos attached to the Farmer application (docs/prototype/customer/become-farmer.html),
 * uploaded before the main form is sent (POST /farmer/apply takes these URLs back). Only a Customer
 * about to apply can call it — the permission matches FarmerController#apply.
 */
@RestController
@RequestMapping("/api/v1/farmer/apply/uploads")
@PreAuthorize("hasRole('CUSTOMER')")
@AllArgsConstructor
public class FarmerUploadController extends BaseController {

    private final FarmerUploadService uploadService;

    @PostMapping
    public ResponseEntity<ApiResource<UploadedFileResource>> upload(
            @AuthenticationPrincipal CustomUserDetails user,
            @RequestParam String kind,
            @RequestParam MultipartFile file) {
        String url = uploadService.store(user.getId(), kind, file);
        return created(new UploadedFileResource(url), "File uploaded.");
    }
}
