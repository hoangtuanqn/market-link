package com.techx.intervue.modules.product.resources;

import com.techx.intervue.modules.review.resources.ReviewSummaryResource;
import com.techx.intervue.modules.stall.resources.StallSummaryResource;

public record ProductDetailResource(
        ProductListItemResource product,
        String description,
        StallSummaryResource farmer,
        ReviewSummaryResource reviewsSummary,
        ShelfLifeResource shelfLife) {}
