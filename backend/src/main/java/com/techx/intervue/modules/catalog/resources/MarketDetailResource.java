package com.techx.intervue.modules.catalog.resources;

import com.techx.intervue.modules.stall.resources.StallSummaryResource;
import java.util.List;

/** GET /api/v1/markets/{id}: a market together with the stalls that sell there (FR-010). */
public record MarketDetailResource(MarketResource market, List<StallSummaryResource> farmers) {}
