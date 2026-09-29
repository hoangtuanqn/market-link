package com.techx.intervue.modules.geo.services.impl;

import com.techx.intervue.modules.geo.entities.AddressColumns;

/**
 * A checked address: the columns to store, the composed {@code address} string, and the ward and
 * province names (null abroad) for responses that show them without another lookup.
 */
public record ResolvedAddress(
        AddressColumns columns, String formatted, String wardName, String provinceName) {}
