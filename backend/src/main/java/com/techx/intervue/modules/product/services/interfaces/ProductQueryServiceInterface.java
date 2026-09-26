package com.techx.intervue.modules.product.services.interfaces;

import com.techx.intervue.modules.product.requests.ProductSearchCriteria;
import com.techx.intervue.modules.product.resources.ProductDetailResource;
import com.techx.intervue.modules.product.resources.ProductListItemResource;
import com.techx.intervue.resources.PageResource;

/** Phần đọc public của sản phẩm — FR-020…023. */
public interface ProductQueryServiceInterface {
    /** page từ 1, pageSize kẹp 1…50, sort qua whitelist, min/max giá hoán đổi nếu ngược. */
    PageResource<ProductListItemResource> search(ProductSearchCriteria criteria);

    /** 404 khi không có, xoá mềm, bị ẩn hoặc stall chưa duyệt. */
    ProductDetailResource detail(long id);

    /** Tồn kho tuần hiện tại của một stall (GET /farmers/{id}/products). */
    PageResource<ProductListItemResource> byFarmer(
            long farmerId, Integer day, int page, int pageSize);
}
