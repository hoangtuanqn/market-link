package com.techx.intervue.modules.geo.services.impl;

import com.techx.intervue.modules.geo.repositories.GeoQueryRepository;
import com.techx.intervue.modules.geo.resources.CountryResource;
import com.techx.intervue.modules.geo.resources.ProvinceResource;
import com.techx.intervue.modules.geo.resources.WardResource;
import com.techx.intervue.modules.geo.resources.WardRow;
import java.text.Collator;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Countries, provinces and wards held in memory (about 3,600 rows). They only change with a new
 * migration, so they are read once, on first use, and every address check or list after that is a
 * map lookup instead of a query.
 */
@Component
@RequiredArgsConstructor
public class GeoDirectory {

    private final GeoQueryRepository repository;

    private volatile Snapshot snapshot;

    public Optional<CountryResource> country(String code) {
        return code == null
                ? Optional.empty()
                : Optional.ofNullable(data().countryByCode.get(code));
    }

    public Optional<ProvinceResource> province(String code) {
        return code == null
                ? Optional.empty()
                : Optional.ofNullable(data().provinceByCode.get(code));
    }

    public Optional<WardRow> ward(String code) {
        return code == null ? Optional.empty() : Optional.ofNullable(data().wardByCode.get(code));
    }

    public List<CountryResource> countries() {
        return data().countries;
    }

    public List<ProvinceResource> provinces() {
        return data().provinces;
    }

    /** Wards of one province in Vietnamese alphabetical order; empty for an unknown province. */
    public List<WardResource> wardsOf(String provinceCode) {
        return data().wardsByProvince.getOrDefault(provinceCode, List.of());
    }

    private Snapshot data() {
        Snapshot current = snapshot;
        if (current == null) {
            synchronized (this) {
                current = snapshot;
                if (current == null) {
                    current = load();
                    snapshot = current;
                }
            }
        }
        return current;
    }

    private Snapshot load() {
        // Sorted here, not in SQL: the database collation differs between the Docker stack and CI
        Collator vietnamese = Collator.getInstance(Locale.forLanguageTag("vi"));
        List<CountryResource> countries = repository.countries();
        List<ProvinceResource> provinces =
                repository.provinces().stream()
                        .sorted(Comparator.comparing(ProvinceResource::name, vietnamese))
                        .toList();
        List<WardRow> wards = repository.wards();
        Map<String, List<WardResource>> byProvince =
                wards.stream()
                        .sorted(Comparator.comparing(WardRow::name, vietnamese))
                        .collect(
                                Collectors.groupingBy(
                                        WardRow::provinceCode,
                                        LinkedHashMap::new,
                                        Collectors.mapping(
                                                WardRow::toResource, Collectors.toList())));
        return new Snapshot(
                countries,
                index(countries, CountryResource::code),
                provinces,
                index(provinces, ProvinceResource::code),
                index(wards, WardRow::code),
                byProvince);
    }

    private static <T> Map<String, T> index(List<T> rows, Function<T, String> key) {
        return rows.stream().collect(Collectors.toMap(key, Function.identity()));
    }

    private record Snapshot(
            List<CountryResource> countries,
            Map<String, CountryResource> countryByCode,
            List<ProvinceResource> provinces,
            Map<String, ProvinceResource> provinceByCode,
            Map<String, WardRow> wardByCode,
            Map<String, List<WardResource>> wardsByProvince) {}
}
