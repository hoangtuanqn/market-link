package com.techx.intervue.modules.product.services.interfaces;

import com.techx.intervue.modules.product.requests.DealSearchCriteria;
import com.techx.intervue.modules.product.resources.DealResource;
import com.techx.intervue.resources.PageResource;

public interface DealQueryServiceInterface {

    PageResource<DealResource> search(DealSearchCriteria criteria);
}
