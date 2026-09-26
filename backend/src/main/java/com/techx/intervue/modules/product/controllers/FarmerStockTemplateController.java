package com.techx.intervue.modules.product.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.product.requests.ApplyTemplateRequest;
import com.techx.intervue.modules.product.requests.StockTemplateRequest;
import com.techx.intervue.modules.product.resources.ApplyTemplateResultResource;
import com.techx.intervue.modules.product.resources.StockTemplateItemResource;
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
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** FR-063 — the signed-in farmer's weekly stock templates (contract §5). */
@RestController
@RequestMapping("/api/v1/farmer/stock-templates")
@PreAuthorize("hasRole('FARMER')")
@AllArgsConstructor
public class FarmerStockTemplateController extends BaseController {

    private final StockTemplateServiceInterface stockTemplates;

    @GetMapping
    public ResponseEntity<ApiResource<List<StockTemplateItemResource>>> list(
            @AuthenticationPrincipal CustomUserDetails user) {
        return ok(stockTemplates.getTemplates(user.getId()), "");
    }

    @PutMapping
    public ResponseEntity<ApiResource<List<StockTemplateItemResource>>> save(
            @AuthenticationPrincipal CustomUserDetails user,
            @Valid @RequestBody StockTemplateRequest request) {
        return ok(stockTemplates.saveTemplates(user.getId(), request), "Stock templates saved.");
    }

    @PostMapping("/apply")
    public ResponseEntity<ApiResource<ApplyTemplateResultResource>> apply(
            @AuthenticationPrincipal CustomUserDetails user,
            @Valid @RequestBody ApplyTemplateRequest request) {
        return ok(
                stockTemplates.applyTemplate(user.getId(), request.targetDate()),
                "Stock refilled from the template.");
    }
}
