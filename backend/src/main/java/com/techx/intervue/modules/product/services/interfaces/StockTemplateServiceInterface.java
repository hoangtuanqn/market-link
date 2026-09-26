package com.techx.intervue.modules.product.services.interfaces;

import com.techx.intervue.modules.product.requests.StockTemplateRequest;
import com.techx.intervue.modules.product.resources.ApplyTemplateResultResource;
import com.techx.intervue.modules.product.resources.StockTemplateItemResource;
import java.time.LocalDate;
import java.util.List;

/** FR-063 — weekly stock templates of the signed-in farmer (contract §5). */
public interface StockTemplateServiceInterface {

    List<StockTemplateItemResource> getTemplates(long userId);

    List<StockTemplateItemResource> saveTemplates(long userId, StockTemplateRequest request);

    ApplyTemplateResultResource applyTemplate(long userId, LocalDate targetDate);
}
