package com.techx.intervue.modules.platform.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.platform.resources.PlatformStatusResource;
import com.techx.intervue.modules.platform.services.interfaces.PlatformStatusServiceInterface;
import com.techx.intervue.resources.ApiResource;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Whether the site is open right now — read by every visitor before anything else loads. */
@RestController
@RequestMapping("/api/v1/platform")
@AllArgsConstructor
public class PublicPlatformController extends BaseController {

    private final PlatformStatusServiceInterface platformStatus;

    @GetMapping("/status")
    public ResponseEntity<ApiResource<PlatformStatusResource>> status() {
        return ok(platformStatus.status(), "OK");
    }
}
