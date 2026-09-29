package com.techx.intervue.modules.geo.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AddressColumns {

    @Column(name = "country_code", length = 2)
    private String countryCode;

    @Column(name = "province_code", length = 5)
    private String provinceCode;

    @Column(name = "ward_code", length = 5)
    private String wardCode;

    @Column(name = "street_name", length = 100)
    private String streetName;

    @Column(name = "address_line", length = 60)
    private String addressLine;

    @Column(name = "region_name", length = 60)
    private String regionName;

    @Column(name = "city_name", length = 60)
    private String cityName;
}
