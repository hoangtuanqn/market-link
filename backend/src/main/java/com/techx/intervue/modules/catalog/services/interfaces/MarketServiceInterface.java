package com.techx.intervue.modules.catalog.services.interfaces;

import com.techx.intervue.modules.catalog.requests.MarketRequest;
import com.techx.intervue.modules.catalog.resources.MarketDetailResource;
import com.techx.intervue.modules.catalog.resources.MarketResource;
import com.techx.intervue.resources.PageResource;

public interface MarketServiceInterface {
    /**
     * FR-010: browse by location (q/provinceCode/wardCode) and day. page counts from 1, pageSize is
     * clamped to 1…50.
     */
    PageResource<MarketResource> search(
            String q, Integer day, String provinceCode, String wardCode, int page, int pageSize);

    MarketDetailResource detail(long id);

    MarketResource create(MarketRequest request);

    MarketResource update(long id, MarketRequest request);

    /** Soft delete: is_active = false (contract §3). */
    void deactivate(long id);
}
