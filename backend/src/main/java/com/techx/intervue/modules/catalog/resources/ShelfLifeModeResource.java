package com.techx.intervue.modules.catalog.resources;

public record ShelfLifeModeResource(
        Long guideId,
        String storageMode,
        int suggestedDays,
        Integer peerMedianDays,
        int peerCount) {}
