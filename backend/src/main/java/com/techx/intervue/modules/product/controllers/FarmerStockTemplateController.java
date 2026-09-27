package com.techx.intervue.modules.product.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.product.requests.StockTemplateRequest;
import com.techx.intervue.modules.product.resources.StockTemplateResource;
import com.techx.intervue.modules.product.services.interfaces.StockTemplateServiceInterface;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import com.techx.intervue.resources.ApiResource;
import jakarta.validation.Valid;
import java.util.List;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * FR-063 — lịch tồn kho tuần của chính Farmer (contract §5). Mọi thứ tra theo user của token
 * (R-06).
 */
@RestController
@RequestMapping("/api/v1/farmer/stock-templates")
@PreAuthorize("hasRole('FARMER')")
@AllArgsConstructor
public class FarmerStockTemplateController extends BaseController {

    private final StockTemplateServiceInterface stockTemplates;

    @GetMapping
    public ResponseEntity<ApiResource<List<StockTemplateResource>>> list(
            @AuthenticationPrincipal CustomUserDetails user) {
        return ok(stockTemplates.list(user.getId()), "");
    }

    @PutMapping
    public ResponseEntity<ApiResource<List<StockTemplateResource>>> replace(
            @AuthenticationPrincipal CustomUserDetails user,
            @Valid @RequestBody StockTemplateRequest request) {
        return ok(stockTemplates.replace(user.getId(), request), "Weekly stock template saved.");
    }
}
