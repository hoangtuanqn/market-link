package com.techx.intervue.modules.catalog.services.interfaces;

import com.techx.intervue.modules.catalog.requests.MarketRequest;
import com.techx.intervue.modules.catalog.resources.MarketDetailResource;
import com.techx.intervue.modules.catalog.resources.MarketResource;
import com.techx.intervue.resources.PageResource;

public interface MarketServiceInterface {
    /** FR-010: browse theo location (q/city/district) và day. page đếm từ 1, pageSize kẹp 1…50. */
    PageResource<MarketResource> search(
            String q, Integer day, String city, String district, int page, int pageSize);

    MarketDetailResource detail(long id);

    MarketResource create(MarketRequest request);

    MarketResource update(long id, MarketRequest request);

    /** Xoá mềm: is_active = false (contract §3). */
    void deactivate(long id);
}
