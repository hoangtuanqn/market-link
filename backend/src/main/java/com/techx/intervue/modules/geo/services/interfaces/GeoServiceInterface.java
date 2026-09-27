package com.techx.intervue.modules.geo.services.interfaces;

import com.techx.intervue.modules.geo.resources.CountryResource;
import com.techx.intervue.modules.geo.resources.ProvinceResource;
import com.techx.intervue.modules.geo.resources.StreetResource;
import com.techx.intervue.modules.geo.resources.WardResource;
import java.util.List;

/** The lists behind the address form (FR-001, FR-073): /api/v1/geo/*. */
public interface GeoServiceInterface {

    List<CountryResource> countries();

    /** Vietnam's provinces; other countries have no list and are typed by hand. */
    List<ProvinceResource> provinces();

    /**
     * @throws com.techx.intervue.modules.geo.exceptions.ProvinceNotFoundException unknown code
     */
    List<WardResource> wards(String provinceCode);

    /**
     * Street suggestions for what the user has typed so far; a blank query suggests nothing.
     *
     * @throws com.techx.intervue.modules.geo.exceptions.ProvinceNotFoundException unknown code
     */
    List<StreetResource> streets(String provinceCode, String query);
}
