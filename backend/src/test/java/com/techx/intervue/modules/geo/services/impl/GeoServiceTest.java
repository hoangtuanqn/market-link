package com.techx.intervue.modules.geo.services.impl;

import static com.techx.intervue.modules.geo.services.impl.GeoFixtures.HCM;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.geo.exceptions.ProvinceNotFoundException;
import com.techx.intervue.modules.geo.repositories.GeoQueryRepository;
import com.techx.intervue.modules.geo.resources.StreetResource;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class GeoServiceTest {

    private GeoQueryRepository repository;
    private GeoService service;

    @BeforeEach
    void setUp() {
        repository = GeoFixtures.repository();
        service = new GeoService(new GeoDirectory(repository), repository);
    }

    @Test
    void streetsFoldsTheQueryIntoPlainWords() {
        when(repository.searchStreets(eq(HCM), any(), anyInt()))
                .thenReturn(List.of(new StreetResource("Lê Lợi")));

        List<StreetResource> result = service.streets(HCM, "  Lê  LỢI ");

        assertThat(result).extracting(StreetResource::name).containsExactly("Lê Lợi");
        verify(repository).searchStreets(HCM, List.of("le", "loi"), GeoService.STREET_LIMIT);
    }

    @Test
    void streetsWithABlankQueryReturnsNothingWithoutQuerying() {
        assertThat(service.streets(HCM, "   ")).isEmpty();
        assertThat(service.streets(HCM, null)).isEmpty();
        assertThat(service.streets(HCM, "!!")).isEmpty();
        verify(repository, never()).searchStreets(anyString(), any(), anyInt());
    }

    @Test
    void streetsUsesAtMostFiveWords() {
        service.streets(HCM, "a b c d e f g");

        verify(repository).searchStreets(HCM, List.of("a", "b", "c", "d", "e"), 20);
    }

    @Test
    void streetsOfAnUnknownProvinceIsNotFound() {
        assertThatThrownBy(() -> service.streets("99", "le loi"))
                .isInstanceOf(ProvinceNotFoundException.class);
    }

    @Test
    void wardsOfAnUnknownProvinceIsNotFound() {
        assertThatThrownBy(() -> service.wards("99")).isInstanceOf(ProvinceNotFoundException.class);
    }

    @Test
    void wardsOfAKnownProvince() {
        assertThat(service.wards(HCM)).hasSize(2);
    }
}
