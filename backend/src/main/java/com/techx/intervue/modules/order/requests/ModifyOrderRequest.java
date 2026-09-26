package com.techx.intervue.modules.order.requests;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

/**
 * PUT /orders/{id}/items — sửa đơn trước cutoff (D-07): chỉ giảm số lượng hoặc bỏ item, không bao
 * giờ thêm sản phẩm mới (kiểm ở service, {@code ProductNotInOrderException}).
 */
public record ModifyOrderRequest(@NotEmpty @Valid List<CartLine> items) {}
