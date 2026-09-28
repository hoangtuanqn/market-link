package com.techx.intervue.modules.quality.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.catalog.resources.UploadedImageResource;
import com.techx.intervue.modules.quality.services.impl.QualityReportPhotoService;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import com.techx.intervue.resources.ApiResource;
import lombok.AllArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * FR-122 — {@code POST /quality-reports/photos}: upload the photo before sending the report, which
 * carries the returned URL in {@code photoUrl} (spec §6).
 */
@RestController
@RequestMapping("/api/v1/quality-reports/photos")
@PreAuthorize("hasAnyRole('CUSTOMER','FARMER')")
@AllArgsConstructor
public class QualityReportPhotoController extends BaseController {

    private final QualityReportPhotoService photos;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResource<UploadedImageResource>> upload(
            @RequestPart("file") MultipartFile file,
            @AuthenticationPrincipal CustomUserDetails user) {
        return created(
                new UploadedImageResource(photos.store(user.getId(), file)), "Photo uploaded.");
    }
}
