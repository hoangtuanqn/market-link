package com.techx.intervue.modules.quality.resources;

import com.techx.intervue.resources.PageResource;

public record FarmerQualityReportsResource(
        ShelfLifeStandingResource standing, PageResource<QualityReportResource> reports) {}
