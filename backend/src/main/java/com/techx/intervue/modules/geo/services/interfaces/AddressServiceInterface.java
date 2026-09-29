package com.techx.intervue.modules.geo.services.interfaces;

import com.techx.intervue.modules.geo.enums.AddressPolicy;
import com.techx.intervue.modules.geo.requests.AddressPartsRequest;
import com.techx.intervue.modules.geo.services.impl.ResolvedAddress;

/** The one place that checks a structured address and composes its display string. */
public interface AddressServiceInterface {

    /**
     * @throws com.techx.intervue.modules.user.exceptions.InvalidFieldException on the first
     *     offending part, named "addressParts.&lt;part&gt;" so the form shows it under that field
     */
    ResolvedAddress resolve(AddressPartsRequest parts, AddressPolicy policy);
}
