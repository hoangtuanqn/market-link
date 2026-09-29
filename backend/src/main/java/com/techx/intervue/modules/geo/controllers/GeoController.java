package com.techx.intervue.modules.geo.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.geo.resources.CountryResource;
import com.techx.intervue.modules.geo.resources.ProvinceResource;
import com.techx.intervue.modules.geo.resources.StreetResource;
import com.techx.intervue.modules.geo.resources.WardResource;
import com.techx.intervue.modules.geo.services.interfaces.GeoServiceInterface;
import com.techx.intervue.resources.ApiResource;
import java.time.Duration;
import java.util.List;
import lombok.AllArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/geo")
@AllArgsConstructor
public class GeoController extends BaseController {

    private static final CacheControl LISTS = CacheControl.maxAge(Duration.ofDays(1)).cachePublic();

    private final GeoServiceInterface geoService;

    @GetMapping("/countries")
    public ResponseEntity<ApiResource<List<CountryResource>>> countries() {
        return cached(ok(geoService.countries(), ""));
    }

    @GetMapping("/provinces")
    public ResponseEntity<ApiResource<List<ProvinceResource>>> provinces() {
        return cached(ok(geoService.provinces(), ""));
    }

    @GetMapping("/provinces/{code}/wards")
    public ResponseEntity<ApiResource<List<WardResource>>> wards(@PathVariable String code) {
        return cached(ok(geoService.wards(code), ""));
    }

    @GetMapping("/provinces/{code}/streets")
    public ResponseEntity<ApiResource<List<StreetResource>>> streets(
            @PathVariable String code, @RequestParam(required = false) String q) {
        return ok(geoService.streets(code, q), "");
    }

    private static <T> ResponseEntity<T> cached(ResponseEntity<T> response) {
        return ResponseEntity.status(response.getStatusCode())
                .cacheControl(LISTS)
                .body(response.getBody());
    }
}
