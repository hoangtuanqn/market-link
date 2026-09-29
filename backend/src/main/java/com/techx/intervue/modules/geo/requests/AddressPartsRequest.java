package com.techx.intervue.modules.geo.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * An address as the form sends it (FR-001, FR-073). Which parts are required depends on the country
 * and on who the address is for; AddressService checks that, the annotations only bound the lengths
 * to the columns of V20260927002.
 *
 * <p>Vietnam: provinceCode + wardCode + streetName (+ addressLine, the house number). Other
 * countries: regionName + cityName + addressLine.
 */
public record AddressPartsRequest(
        @NotBlank(message = "Choose a country.") @Size(max = 2) String countryCode,
        @Size(max = 5) String provinceCode,
        @Size(max = 5) String wardCode,
        @Size(max = 100, message = "Street can be at most 100 characters.") String streetName,
        @Size(max = 60, message = "House number and details can be at most 60 characters.")
                String addressLine,
        @Size(max = 60, message = "State or province can be at most 60 characters.")
                String regionName,
        @Size(max = 60, message = "City can be at most 60 characters.") String cityName) {}
