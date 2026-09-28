package com.techx.intervue.modules.catalog.resources;

import java.util.List;

/** FR-120: one storage group of a category with its ways of keeping, room before chilled. */
public record ShelfLifeGuideGroupResource(
        String groupName, String examples, List<ShelfLifeModeResource> modes) {}
