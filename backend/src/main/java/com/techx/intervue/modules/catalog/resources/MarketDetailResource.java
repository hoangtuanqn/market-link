package com.techx.intervue.modules.catalog.resources;

import com.techx.intervue.modules.stall.resources.StallSummaryResource;
import java.util.List;

public record MarketDetailResource(MarketResource market, List<StallSummaryResource> farmers) {}
