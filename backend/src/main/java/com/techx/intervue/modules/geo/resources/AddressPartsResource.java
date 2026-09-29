package com.techx.intervue.modules.geo.resources;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.techx.intervue.modules.geo.entities.AddressColumns;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record AddressPartsResource(
        String countryCode,
        String provinceCode,
        String wardCode,
        String streetName,
        String addressLine,
        String regionName,
        String cityName) {

    public static AddressPartsResource from(AddressColumns c) {
        if (c == null || c.getCountryCode() == null) {
            return null;
        }
        return new AddressPartsResource(
                c.getCountryCode(),
                c.getProvinceCode(),
                c.getWardCode(),
                c.getStreetName(),
                c.getAddressLine(),
                c.getRegionName(),
                c.getCityName());
    }
}
