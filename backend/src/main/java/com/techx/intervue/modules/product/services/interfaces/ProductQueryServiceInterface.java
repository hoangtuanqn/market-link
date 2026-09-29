package com.techx.intervue.modules.product.services.interfaces;

import com.techx.intervue.modules.product.requests.ProductSearchCriteria;
import com.techx.intervue.modules.product.resources.ProductDetailResource;
import com.techx.intervue.modules.product.resources.ProductListItemResource;
import com.techx.intervue.resources.PageResource;

public interface ProductQueryServiceInterface {
    PageResource<ProductListItemResource> search(ProductSearchCriteria criteria);

    ProductDetailResource detail(long id);

    PageResource<ProductListItemResource> byFarmer(
            long farmerId, Integer day, int page, int pageSize);
}
