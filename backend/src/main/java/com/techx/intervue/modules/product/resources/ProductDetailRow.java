package com.techx.intervue.modules.product.resources;

/** Dòng chi tiết đọc từ SQL: item + mô tả. Service ghép thêm stall và tóm tắt đánh giá. */
public record ProductDetailRow(ProductListItemResource item, String description) {}
