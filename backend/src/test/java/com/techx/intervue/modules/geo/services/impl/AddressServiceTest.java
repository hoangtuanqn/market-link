package com.techx.intervue.modules.geo.services.impl;

import static com.techx.intervue.modules.geo.services.impl.GeoFixtures.BA_DINH;
import static com.techx.intervue.modules.geo.services.impl.GeoFixtures.BEN_THANH;
import static com.techx.intervue.modules.geo.services.impl.GeoFixtures.HCM;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import com.techx.intervue.modules.geo.enums.AddressPolicy;
import com.techx.intervue.modules.geo.requests.AddressPartsRequest;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class AddressServiceTest {

    private AddressService service;

    @BeforeEach
    void setUp() {
        service = new AddressService(new GeoDirectory(GeoFixtures.repository()));
    }

    private static AddressPartsRequest vietnam(
            String province, String ward, String street, String line) {
        return new AddressPartsRequest("VN", province, ward, street, line, null, null);
    }

    private static AddressPartsRequest abroad(
            String country, String region, String city, String line) {
        return new AddressPartsRequest(country, null, null, null, line, region, city);
    }

    private InvalidFieldException rejected(AddressPartsRequest parts, AddressPolicy policy) {
        return catchThrowableOfType(
                InvalidFieldException.class, () -> service.resolve(parts, policy));
    }

    @Test
    void vietnamAddressComposesHouseStreetWardProvince() {
        ResolvedAddress resolved =
                service.resolve(vietnam(HCM, BEN_THANH, "Lê Lợi", "12"), AddressPolicy.ACCOUNT);

        assertThat(resolved.formatted())
                .isEqualTo("12 Lê Lợi, Phường Bến Thành, Thành phố Hồ Chí Minh");
        assertThat(resolved.wardName()).isEqualTo("Phường Bến Thành");
        assertThat(resolved.provinceName()).isEqualTo("Thành phố Hồ Chí Minh");
        assertThat(resolved.columns().getWardCode()).isEqualTo(BEN_THANH);
        assertThat(resolved.columns().getCountryCode()).isEqualTo("VN");
    }

    @Test
    void marketWithoutHouseNumberStartsWithTheStreet() {
        ResolvedAddress resolved =
                service.resolve(vietnam(HCM, BEN_THANH, "Lê Lợi", "  "), AddressPolicy.MARKET);

        assertThat(resolved.formatted())
                .isEqualTo("Lê Lợi, Phường Bến Thành, Thành phố Hồ Chí Minh");
        assertThat(resolved.columns().getAddressLine()).isNull();
    }

    @Test
    void wardFromAnotherProvinceIsRejectedOnWardCode() {
        InvalidFieldException e =
                rejected(vietnam(HCM, BA_DINH, "Lê Lợi", "12"), AddressPolicy.ACCOUNT);

        assertThat(e.getField()).isEqualTo("addressParts.wardCode");
    }

    @Test
    void unknownCountryIsRejected() {
        assertThat(
                        rejected(abroad("ZZ", "Tokyo", "Shibuya", "1-2-3"), AddressPolicy.ACCOUNT)
                                .getField())
                .isEqualTo("addressParts.countryCode");
    }

    @Test
    void unknownProvinceIsRejected() {
        assertThat(
                        rejected(vietnam("99", BEN_THANH, "Lê Lợi", "12"), AddressPolicy.ACCOUNT)
                                .getField())
                .isEqualTo("addressParts.provinceCode");
    }

    @Test
    void vietnamRequiresProvinceWardAndStreet() {
        assertThat(
                        rejected(vietnam(null, BEN_THANH, "Lê Lợi", "12"), AddressPolicy.ACCOUNT)
                                .getField())
                .isEqualTo("addressParts.provinceCode");
        assertThat(rejected(vietnam(HCM, " ", "Lê Lợi", "12"), AddressPolicy.ACCOUNT).getField())
                .isEqualTo("addressParts.wardCode");
        assertThat(rejected(vietnam(HCM, BEN_THANH, "", "12"), AddressPolicy.ACCOUNT).getField())
                .isEqualTo("addressParts.streetName");
    }

    @Test
    void accountRequiresAHouseNumber() {
        assertThat(
                        rejected(vietnam(HCM, BEN_THANH, "Lê Lợi", null), AddressPolicy.ACCOUNT)
                                .getField())
                .isEqualTo("addressParts.addressLine");
    }

    @Test
    void foreignAddressRequiresRegionCityAndLine() {
        assertThat(rejected(abroad("JP", "", "Shibuya", "1-2-3"), AddressPolicy.ACCOUNT).getField())
                .isEqualTo("addressParts.regionName");
        assertThat(rejected(abroad("JP", "Tokyo", null, "1-2-3"), AddressPolicy.ACCOUNT).getField())
                .isEqualTo("addressParts.cityName");
        assertThat(
                        rejected(abroad("JP", "Tokyo", "Shibuya", " "), AddressPolicy.ACCOUNT)
                                .getField())
                .isEqualTo("addressParts.addressLine");
    }

    @Test
    void foreignAddressDropsTheVietnameseParts() {
        AddressPartsRequest parts =
                new AddressPartsRequest(
                        "JP", HCM, BEN_THANH, "Lê Lợi", "1-2-3", "Tokyo", "Shibuya");

        ResolvedAddress resolved = service.resolve(parts, AddressPolicy.ACCOUNT);

        assertThat(resolved.columns().getProvinceCode()).isNull();
        assertThat(resolved.columns().getWardCode()).isNull();
        assertThat(resolved.columns().getStreetName()).isNull();
        assertThat(resolved.wardName()).isNull();
    }

    @Test
    void foreignAddressComposesLineCityRegionCountry() {
        ResolvedAddress resolved =
                service.resolve(
                        abroad("JP", "Tokyo", "Shibuya", "1-2-3 Jingumae"), AddressPolicy.ACCOUNT);

        assertThat(resolved.formatted()).isEqualTo("1-2-3 Jingumae, Shibuya, Tokyo, Japan");
    }

    @Test
    void vietnameseAddressDropsTheForeignParts() {
        AddressPartsRequest parts =
                new AddressPartsRequest("VN", HCM, BEN_THANH, "Lê Lợi", "12", "Tokyo", "Shibuya");

        ResolvedAddress resolved = service.resolve(parts, AddressPolicy.ACCOUNT);

        assertThat(resolved.columns().getRegionName()).isNull();
        assertThat(resolved.columns().getCityName()).isNull();
    }

    @Test
    void marketOutsideVietnamIsRejectedOnCountryCode() {
        assertThat(
                        rejected(abroad("JP", "Tokyo", "Shibuya", "1-2-3"), AddressPolicy.MARKET)
                                .getField())
                .isEqualTo("addressParts.countryCode");
    }

    @Test
    void trimsEveryPartAndUppercasesTheCountry() {
        AddressPartsRequest parts =
                new AddressPartsRequest(" vn ", " 79 ", " 26743 ", "  Lê Lợi ", " 12 ", null, null);

        ResolvedAddress resolved = service.resolve(parts, AddressPolicy.ACCOUNT);

        assertThat(resolved.columns().getCountryCode()).isEqualTo("VN");
        assertThat(resolved.columns().getStreetName()).isEqualTo("Lê Lợi");
        assertThat(resolved.formatted()).startsWith("12 Lê Lợi, ");
    }

    @Test
    void missingPartsAreRejectedAsAWhole() {
        assertThat(rejected(null, AddressPolicy.ACCOUNT).getField()).isEqualTo("addressParts");
    }

    @Test
    void composedAddressLongerThanTheColumnIsRejectedOnTheLine() {
        // Only reachable if the field limits are ever raised; the column is VARCHAR(255)
        String longStreet = "x".repeat(220);

        assertThat(
                        rejected(vietnam(HCM, BEN_THANH, longStreet, "12"), AddressPolicy.ACCOUNT)
                                .getField())
                .isEqualTo("addressParts.addressLine");
    }
}
