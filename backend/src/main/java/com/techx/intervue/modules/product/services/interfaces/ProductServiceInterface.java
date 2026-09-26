package com.techx.intervue.modules.product.services.interfaces;

import com.techx.intervue.modules.product.enums.ProductStatus;
import com.techx.intervue.modules.product.requests.ProductRequest;
import com.techx.intervue.modules.product.resources.FarmerProductResource;
import com.techx.intervue.resources.PageResource;

/**
 * The write side of products — FR-062, FR-064 (Farmer) and FR-074 (Admin). Every Farmer method
 * looks up the profile by userId (R-06).
 */
public interface ProductServiceInterface {
    PageResource<FarmerProductResource> mine(long userId, String status, int page, int pageSize);

    /**
     * One of the Farmer's own products, to open the edit form. Does not require the stall to be
     * approved: the Farmer must be able to see their own goods even while the stall is suspended
     * (D-09), like {@link #mine}.
     */
    FarmerProductResource mineOne(long userId, long productId);

    /** 403 STALL_NOT_APPROVED when the stall is not approved / is suspended (D-09). */
    FarmerProductResource create(long userId, ProductRequest request);

    /** 403 when the product belongs to another stall, 404 when missing or soft-deleted. */
    FarmerProductResource update(long userId, long productId, ProductRequest request);

    /** Soft delete: is_deleted = TRUE; old order_items can still point back to it. */
    void softDelete(long userId, long productId);

    /** FR-064: changing the status does not touch stock or the admin's hide flag. */
    FarmerProductResource setStatus(long userId, long productId, ProductStatus status);

    void adminHide(long productId, String reason);

    void adminUnhide(long productId);
}
