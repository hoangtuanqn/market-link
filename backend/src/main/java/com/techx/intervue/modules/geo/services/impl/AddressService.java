package com.techx.intervue.modules.geo.services.impl;

import com.techx.intervue.modules.geo.entities.AddressColumns;
import com.techx.intervue.modules.geo.enums.AddressPolicy;
import com.techx.intervue.modules.geo.requests.AddressPartsRequest;
import com.techx.intervue.modules.geo.resources.CountryResource;
import com.techx.intervue.modules.geo.resources.ProvinceResource;
import com.techx.intervue.modules.geo.resources.WardRow;
import com.techx.intervue.modules.geo.services.interfaces.AddressServiceInterface;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import java.util.Locale;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@AllArgsConstructor
public class AddressService implements AddressServiceInterface {

    static final String VIETNAM = "VN";

    private static final int MAX_FORMATTED = 255;

    private static final String FIELD = "addressParts";

    private final GeoDirectory directory;

    @Override
    public ResolvedAddress resolve(AddressPartsRequest parts, AddressPolicy policy) {
        if (parts == null) {
            throw new InvalidFieldException(FIELD, "Choose your address.");
        }
        String countryCode = clean(parts.countryCode());
        CountryResource country =
                directory
                        .country(countryCode == null ? null : countryCode.toUpperCase(Locale.ROOT))
                        .orElseThrow(() -> invalid("countryCode", "Choose a country."));
        boolean vietnam = VIETNAM.equals(country.code());
        if (policy.isVietnamOnly() && !vietnam) {
            throw invalid("countryCode", "A market must be in Vietnam.");
        }
        String line = clean(parts.addressLine());
        ResolvedAddress resolved =
                vietnam ? vietnamese(parts, line, policy) : foreign(parts, line, country, policy);
        if (resolved.formatted().length() > MAX_FORMATTED) {
            throw invalid("addressLine", "This address is too long. Shorten the details.");
        }
        return resolved;
    }

    private ResolvedAddress vietnamese(
            AddressPartsRequest parts, String line, AddressPolicy policy) {
        String provinceCode = clean(parts.provinceCode());
        if (provinceCode == null) {
            throw invalid("provinceCode", "Choose a province or city.");
        }
        ProvinceResource province =
                directory
                        .province(provinceCode)
                        .orElseThrow(() -> invalid("provinceCode", "Choose a province or city."));
        String wardCode = clean(parts.wardCode());
        WardRow ward =
                directory
                        .ward(wardCode)
                        .filter(w -> w.provinceCode().equals(province.code()))
                        .orElseThrow(() -> invalid("wardCode", "Choose a ward or commune."));
        String street = clean(parts.streetName());
        if (street == null) {
            throw invalid("streetName", "Enter the street.");
        }
        requireLine(line, policy);
        String formatted =
                join(
                        line == null ? street : line + " " + street,
                        ward.fullName(),
                        province.fullName());
        AddressColumns columns =
                new AddressColumns(VIETNAM, province.code(), ward.code(), street, line, null, null);
        return new ResolvedAddress(columns, formatted, ward.fullName(), province.fullName());
    }

    private ResolvedAddress foreign(
            AddressPartsRequest parts, String line, CountryResource country, AddressPolicy policy) {
        String region = clean(parts.regionName());
        if (region == null) {
            throw invalid("regionName", "Enter the state or province.");
        }
        String city = clean(parts.cityName());
        if (city == null) {
            throw invalid("cityName", "Enter the city.");
        }
        requireLine(line, policy);
        String formatted = join(line, city, region, country.name());
        AddressColumns columns =
                new AddressColumns(country.code(), null, null, null, line, region, city);
        return new ResolvedAddress(columns, formatted, null, null);
    }

    private static void requireLine(String line, AddressPolicy policy) {
        if (line == null && policy.isLineRequired()) {
            throw invalid("addressLine", "Enter the house number and details.");
        }
    }

    private static String join(String... parts) {
        StringBuilder out = new StringBuilder();
        for (String part : parts) {
            if (part == null) {
                continue;
            }
            if (!out.isEmpty()) {
                out.append(", ");
            }
            out.append(part);
        }
        return out.toString();
    }

    private static String clean(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim().replaceAll("\\s+", " ");
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static InvalidFieldException invalid(String part, String message) {
        return new InvalidFieldException(FIELD + "." + part, message);
    }
}
