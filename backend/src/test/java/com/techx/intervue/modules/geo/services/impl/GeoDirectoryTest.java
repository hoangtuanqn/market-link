package com.techx.intervue.modules.geo.services.impl;

import static com.techx.intervue.modules.geo.services.impl.GeoFixtures.BEN_THANH;
import static com.techx.intervue.modules.geo.services.impl.GeoFixtures.HCM;
import static com.techx.intervue.modules.geo.services.impl.GeoFixtures.TAN_DINH;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import com.techx.intervue.modules.geo.repositories.GeoQueryRepository;
import com.techx.intervue.modules.geo.resources.WardResource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class GeoDirectoryTest {

    private GeoQueryRepository repository;
    private GeoDirectory directory;

    @BeforeEach
    void setUp() {
        repository = GeoFixtures.repository();
        directory = new GeoDirectory(repository);
    }

    @Test
    void loadsTheMasterDataOnceAcrossLookups() {
        directory.country("VN");
        directory.ward(BEN_THANH);
        directory.provinces();

        verify(repository, times(1)).countries();
        verify(repository, times(1)).provinces();
        verify(repository, times(1)).wards();
    }

    @Test
    void looksUpByCode() {
        assertThat(directory.country("JP"))
                .hasValueSatisfying(c -> assertThat(c.name()).isEqualTo("Japan"));
        assertThat(directory.province(HCM))
                .hasValueSatisfying(
                        p -> assertThat(p.fullName()).isEqualTo("Thành phố Hồ Chí Minh"));
        assertThat(directory.ward(BEN_THANH))
                .hasValueSatisfying(w -> assertThat(w.provinceCode()).isEqualTo(HCM));
        assertThat(directory.ward("99999")).isEmpty();
        assertThat(directory.country(null)).isEmpty();
    }

    @Test
    void wardsOfAProvinceAreSortedByVietnameseName() {
        assertThat(directory.wardsOf(HCM))
                .extracting(WardResource::code)
                .containsExactly(BEN_THANH, TAN_DINH);
    }

    @Test
    void wardsOfAnUnknownProvinceIsEmpty() {
        assertThat(directory.wardsOf("99")).isEmpty();
    }
}
