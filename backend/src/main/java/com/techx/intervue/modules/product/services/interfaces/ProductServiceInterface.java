package com.techx.intervue.modules.product.services.interfaces;

import com.techx.intervue.modules.product.enums.ProductStatus;
import com.techx.intervue.modules.product.requests.ProductRequest;
import com.techx.intervue.modules.product.resources.FarmerProductResource;
import com.techx.intervue.resources.PageResource;

public interface ProductServiceInterface {
    PageResource<FarmerProductResource> mine(long userId, String status, int page, int pageSize);

    FarmerProductResource mineOne(long userId, long productId);

    FarmerProductResource create(long userId, ProductRequest request);

    FarmerProductResource update(long userId, long productId, ProductRequest request);

    void softDelete(long userId, long productId);

    FarmerProductResource setStatus(long userId, long productId, ProductStatus status);

    PageResource<FarmerProductResource> adminHidden(int page, int pageSize);

    void adminHide(long productId, String reason);

    void adminUnhide(long productId);

    PageResource<FarmerProductResource> mineDeleted(long userId, int page, int pageSize);

    FarmerProductResource restore(long userId, long productId);
}
