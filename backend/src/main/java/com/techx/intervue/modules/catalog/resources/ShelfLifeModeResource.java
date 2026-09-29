package com.techx.intervue.modules.catalog.resources;

/**
 * FR-120: one way of keeping a group, as the product form offers it. {@code peerMedianDays} is what
 * other stalls set, null when fewer than three of their products use this guide.
 */
public record ShelfLifeModeResource(
        Long guideId,
        String storageMode,
        int suggestedDays,
        Integer peerMedianDays,
        int peerCount) {}
