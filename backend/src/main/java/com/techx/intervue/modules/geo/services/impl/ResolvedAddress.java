package com.techx.intervue.modules.geo.services.impl;

import com.techx.intervue.modules.geo.entities.AddressColumns;

public record ResolvedAddress(
        AddressColumns columns, String formatted, String wardName, String provinceName) {}
