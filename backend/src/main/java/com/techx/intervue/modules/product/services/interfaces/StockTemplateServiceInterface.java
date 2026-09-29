package com.techx.intervue.modules.product.services.interfaces;

import com.techx.intervue.modules.product.requests.StockTemplateRequest;
import com.techx.intervue.modules.product.resources.StockTemplateResource;
import java.util.List;

public interface StockTemplateServiceInterface {

    List<StockTemplateResource> list(long userId);

    List<StockTemplateResource> replace(long userId, StockTemplateRequest request);
}
