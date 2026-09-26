package com.techx.intervue.modules.catalog.services.interfaces;

import com.techx.intervue.modules.catalog.requests.MarketClosureRequest;
import com.techx.intervue.modules.catalog.resources.MarketClosureResource;
import java.util.List;

public interface MarketClosureServiceInterface {

    List<MarketClosureResource> list(long marketId);

    MarketClosureResource create(long marketId, MarketClosureRequest request, Long adminId);

    void delete(long marketId, long closureId);
}
