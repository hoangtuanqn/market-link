package com.techx.intervue.modules.product.resources;

import com.techx.intervue.modules.review.resources.ReviewSummaryResource;
import com.techx.intervue.modules.stall.resources.StallSummaryResource;

/** GET /api/v1/products/{id} (contract §5): a product with its `farmer` and `reviewsSummary`. */
public record ProductDetailResource(
        ProductListItemResource product,
        String description,
        StallSummaryResource farmer,
        ReviewSummaryResource reviewsSummary) {}
