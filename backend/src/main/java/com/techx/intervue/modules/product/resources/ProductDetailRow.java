package com.techx.intervue.modules.product.resources;

/**
 * The detail row read from SQL: item + description. The service adds the stall and the review
 * summary.
 */
public record ProductDetailRow(ProductListItemResource item, String description) {}
