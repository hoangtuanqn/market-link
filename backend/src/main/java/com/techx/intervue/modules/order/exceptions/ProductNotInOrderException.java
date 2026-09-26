package com.techx.intervue.modules.order.exceptions;

/**
 * D-07: sửa đơn chỉ được giảm số lượng hoặc bỏ item, không bao giờ thêm sản phẩm mới. Khách gửi một
 * {@code productId} chưa từng có trong đơn này → request sai hình dạng → 400 PRODUCT_NOT_IN_ORDER,
 * không phải 409 (không phải xung đột trạng thái, mà là yêu cầu không hợp lệ ngay từ đầu).
 */
public class ProductNotInOrderException extends RuntimeException {
    public ProductNotInOrderException(Long productId) {
        super("Product " + productId + " is not part of this order.");
    }
}
