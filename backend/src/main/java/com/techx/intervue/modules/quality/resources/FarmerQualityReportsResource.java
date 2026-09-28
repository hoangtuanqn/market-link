package com.techx.intervue.modules.quality.resources;

import com.techx.intervue.resources.PageResource;

/** GET /farmer/quality-reports: the stall's strikes and a page of the reports about it. */
public record FarmerQualityReportsResource(
        ShelfLifeStandingResource standing, PageResource<QualityReportResource> reports) {}
