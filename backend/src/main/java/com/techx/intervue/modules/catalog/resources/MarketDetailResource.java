package com.techx.intervue.modules.catalog.resources;

import com.techx.intervue.modules.stall.resources.StallSummaryResource;
import java.util.List;

/** GET /api/v1/markets/{id}: chợ kèm các stall đang bán ở đó (FR-010). */
public record MarketDetailResource(MarketResource market, List<StallSummaryResource> farmers) {}
