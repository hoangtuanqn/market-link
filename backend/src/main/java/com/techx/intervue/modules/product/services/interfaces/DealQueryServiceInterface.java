package com.techx.intervue.modules.product.services.interfaces;

import com.techx.intervue.modules.product.requests.DealSearchCriteria;
import com.techx.intervue.modules.product.resources.DealResource;
import com.techx.intervue.resources.PageResource;

/** FR-125 — the public near-expiry deals (spec §4.5.4). */
public interface DealQueryServiceInterface {

    /** page from 1, pageSize clamped to 1…50. */
    PageResource<DealResource> search(DealSearchCriteria criteria);
}
