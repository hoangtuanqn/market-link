package com.techx.intervue.modules.product.services.interfaces;

import com.techx.intervue.modules.product.requests.StockTemplateRequest;
import com.techx.intervue.modules.product.resources.StockTemplateApplyResultResource;
import com.techx.intervue.modules.product.resources.StockTemplateResource;
import java.time.LocalDate;
import java.util.List;

/**
 * FR-063 — lịch tồn kho tuần của chính Farmer (contract §5). Mọi thứ tra theo user của token
 * (R-06).
 */
public interface StockTemplateServiceInterface {

    List<StockTemplateResource> list(long userId);

    List<StockTemplateResource> replace(long userId, StockTemplateRequest request);

    List<StockTemplateApplyResultResource> apply(long userId, LocalDate targetDate);
}
