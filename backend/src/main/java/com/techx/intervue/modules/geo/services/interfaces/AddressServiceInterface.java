package com.techx.intervue.modules.geo.services.interfaces;

import com.techx.intervue.modules.geo.enums.AddressPolicy;
import com.techx.intervue.modules.geo.requests.AddressPartsRequest;
import com.techx.intervue.modules.geo.services.impl.ResolvedAddress;

public interface AddressServiceInterface {

    ResolvedAddress resolve(AddressPartsRequest parts, AddressPolicy policy);
}
