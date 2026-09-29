package com.techx.intervue.modules.geo.services.interfaces;

import com.techx.intervue.modules.geo.resources.CountryResource;
import com.techx.intervue.modules.geo.resources.ProvinceResource;
import com.techx.intervue.modules.geo.resources.StreetResource;
import com.techx.intervue.modules.geo.resources.WardResource;
import java.util.List;

public interface GeoServiceInterface {

    List<CountryResource> countries();

    List<ProvinceResource> provinces();

    List<WardResource> wards(String provinceCode);

    List<StreetResource> streets(String provinceCode, String query);
}
