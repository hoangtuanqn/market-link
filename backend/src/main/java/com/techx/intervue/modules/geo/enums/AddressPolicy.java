package com.techx.intervue.modules.geo.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum AddressPolicy {
    ACCOUNT(true, false),
    MARKET(false, true);

    private final boolean lineRequired;
    private final boolean vietnamOnly;
}
