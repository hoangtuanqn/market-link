package com.techx.intervue.modules.product.services.interfaces;

import com.techx.intervue.modules.product.enums.ProductStatus;
import com.techx.intervue.modules.product.requests.ProductRequest;
import com.techx.intervue.modules.product.resources.FarmerProductResource;
import com.techx.intervue.resources.PageResource;

/**
 * Phần ghi của sản phẩm — FR-062, FR-064 (Farmer) và FR-074 (Admin). Mọi method Farmer tra hồ sơ
 * theo userId (R-06).
 */
public interface ProductServiceInterface {
    PageResource<FarmerProductResource> mine(long userId, String status, int page, int pageSize);

    /** 403 STALL_NOT_APPROVED khi stall chưa duyệt / bị đình chỉ (D-09). */
    FarmerProductResource create(long userId, ProductRequest request);

    /** 403 khi sản phẩm thuộc stall khác, 404 khi không có hoặc đã xoá mềm. */
    FarmerProductResource update(long userId, long productId, ProductRequest request);

    /** Xoá mềm: is_deleted = TRUE; order_items cũ vẫn trỏ về được. */
    void softDelete(long userId, long productId);

    /** FR-064: đổi trạng thái không đụng tồn kho, không đụng cờ ẩn của admin. */
    FarmerProductResource setStatus(long userId, long productId, ProductStatus status);

    void adminHide(long productId, String reason);

    void adminUnhide(long productId);
}
