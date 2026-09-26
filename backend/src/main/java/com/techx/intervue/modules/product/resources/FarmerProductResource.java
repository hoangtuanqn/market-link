package com.techx.intervue.modules.product.resources;

/**
 * A product as seen by the owning Farmer: adds the description and the admin's hide flag with its
 * reason (FR-074), so the Farmer knows why it disappeared from the public page.
 */
public record FarmerProductResource(
        ProductListItemResource item, String description, boolean hidden, String hiddenReason) {}
