package com.techx.intervue.modules.product.services.interfaces;

import com.techx.intervue.modules.product.requests.ProductSearchCriteria;
import com.techx.intervue.modules.product.resources.ProductDetailResource;
import com.techx.intervue.modules.product.resources.ProductListItemResource;
import com.techx.intervue.resources.PageResource;

/** The public read side of products — FR-020…023. */
public interface ProductQueryServiceInterface {
    /**
     * page from 1, pageSize clamped to 1…50, sort through a whitelist, min/max price swapped if
     * reversed.
     */
    PageResource<ProductListItemResource> search(ProductSearchCriteria criteria);

    /** 404 when missing, soft-deleted, hidden or the stall is not approved. */
    ProductDetailResource detail(long id);

    /** This week's stock of a stall (GET /farmers/{id}/products). */
    PageResource<ProductListItemResource> byFarmer(
            long farmerId, Integer day, int page, int pageSize);
}
