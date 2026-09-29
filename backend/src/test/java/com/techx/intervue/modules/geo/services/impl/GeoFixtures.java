package com.techx.intervue.modules.geo.services.impl;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.geo.repositories.GeoQueryRepository;
import com.techx.intervue.modules.geo.resources.CountryResource;
import com.techx.intervue.modules.geo.resources.ProvinceResource;
import com.techx.intervue.modules.geo.resources.WardRow;
import java.util.List;

public final class GeoFixtures {

    public static final String HCM = "79";
    public static final String HANOI = "01";
    public static final String BEN_THANH = "26743";
    public static final String TAN_DINH = "26737";
    public static final String BA_DINH = "00004";

    private GeoFixtures() {}

    public static GeoQueryRepository repository() {
        GeoQueryRepository repository = mock(GeoQueryRepository.class);
        when(repository.countries())
                .thenReturn(
                        List.of(
                                new CountryResource("VN", "Vietnam"),
                                new CountryResource("JP", "Japan")));
        when(repository.provinces())
                .thenReturn(
                        List.of(
                                new ProvinceResource(HANOI, "Hà Nội", "Thành phố Hà Nội"),
                                new ProvinceResource(HCM, "Hồ Chí Minh", "Thành phố Hồ Chí Minh")));
        when(repository.wards())
                .thenReturn(
                        List.of(
                                new WardRow(BA_DINH, HANOI, "Ba Đình", "Phường Ba Đình"),
                                new WardRow(TAN_DINH, HCM, "Tân Định", "Phường Tân Định"),
                                new WardRow(BEN_THANH, HCM, "Bến Thành", "Phường Bến Thành")));
        return repository;
    }
}
