package com.techx.intervue.modules.product.resources;

/**
 * FR-121: a product's shelf life as stored — the group it was compared with (null = the category
 * range), how it is kept, the suggestion at the time of saving and whether the Farmer went longer.
 */
public record ShelfLifeResource(
        Long guideId,
        String groupName,
        String storageMode,
        int days,
        Integer suggestedDays,
        boolean extended) {}
