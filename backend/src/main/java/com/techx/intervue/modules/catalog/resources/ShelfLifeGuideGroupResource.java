package com.techx.intervue.modules.catalog.resources;

import java.util.List;

public record ShelfLifeGuideGroupResource(
        String groupName, String examples, List<ShelfLifeModeResource> modes) {}
