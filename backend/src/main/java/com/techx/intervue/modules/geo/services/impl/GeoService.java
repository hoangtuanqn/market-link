package com.techx.intervue.modules.geo.services.impl;

import com.techx.intervue.modules.chat.services.impl.TextNormalizer;
import com.techx.intervue.modules.geo.exceptions.ProvinceNotFoundException;
import com.techx.intervue.modules.geo.repositories.GeoQueryRepository;
import com.techx.intervue.modules.geo.resources.CountryResource;
import com.techx.intervue.modules.geo.resources.ProvinceResource;
import com.techx.intervue.modules.geo.resources.StreetResource;
import com.techx.intervue.modules.geo.resources.WardResource;
import com.techx.intervue.modules.geo.services.interfaces.GeoServiceInterface;
import java.util.Arrays;
import java.util.List;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@AllArgsConstructor
public class GeoService implements GeoServiceInterface {

    static final int STREET_LIMIT = 20;

    private static final int MAX_WORDS = 5;

    private final GeoDirectory directory;
    private final GeoQueryRepository repository;

    @Override
    public List<CountryResource> countries() {
        return directory.countries();
    }

    @Override
    public List<ProvinceResource> provinces() {
        return directory.provinces();
    }

    @Override
    public List<WardResource> wards(String provinceCode) {
        requireProvince(provinceCode);
        return directory.wardsOf(provinceCode);
    }

    @Override
    public List<StreetResource> streets(String provinceCode, String query) {
        requireProvince(provinceCode);
        List<String> words =
                Arrays.stream(TextNormalizer.normalize(query).split(" "))
                        .filter(w -> !w.isEmpty())
                        .limit(MAX_WORDS)
                        .toList();
        return words.isEmpty()
                ? List.of()
                : repository.searchStreets(provinceCode, words, STREET_LIMIT);
    }

    private void requireProvince(String code) {
        if (directory.province(code).isEmpty()) {
            throw new ProvinceNotFoundException(code);
        }
    }
}
