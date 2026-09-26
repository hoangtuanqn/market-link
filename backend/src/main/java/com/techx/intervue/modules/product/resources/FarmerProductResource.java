package com.techx.intervue.modules.product.resources;

/**
 * Sản phẩm nhìn từ phía Farmer sở hữu: thêm mô tả và cờ ẩn của admin kèm lý do (FR-074), để Farmer
 * biết vì sao nó biến mất khỏi trang public.
 */
public record FarmerProductResource(
        ProductListItemResource item, String description, boolean hidden, String hiddenReason) {}
