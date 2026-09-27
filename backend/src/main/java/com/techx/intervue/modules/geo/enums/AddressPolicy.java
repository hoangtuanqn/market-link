package com.techx.intervue.modules.geo.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** Who the address is for, which decides the rules AddressService applies. */
@Getter
@RequiredArgsConstructor
public enum AddressPolicy {
    /** A person's address: any country, house number required. */
    ACCOUNT(true, false),
    /**
     * A market: customers go there to pick up, so it must be in Vietnam; no house number needed.
     */
    MARKET(false, true);

    private final boolean lineRequired;
    private final boolean vietnamOnly;
}
