package com.techx.intervue.modules.catalog.repositories;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.catalog.resources.MarketResource;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

/**
 * Runs on the real MySQL: the ward and province names come from joins, and the area filter is a
 * WHERE on the codes (FR-010, FR-073).
 */
@SpringBootTest
@Transactional
class MarketQueryRepositoryTest {

    private static final String HCM = "79";
    private static final String BEN_THANH = "26743";
    private static final String TAN_DINH = "26737";

    @Autowired MarketQueryRepository query;
    @Autowired JdbcTemplate jdbc;

    private final String tag = UUID.randomUUID().toString().substring(0, 8);
    private long benThanhId;

    private long insertMarket(String name, String ward, String street) {
        jdbc.update(
                "INSERT INTO markets (market_name, address, country_code, province_code, ward_code,"
                        + " street_name, latitude, longitude, opening_time, closing_time)"
                        + " VALUES (?, ?, 'VN', ?, ?, ?, 10.77, 106.69, '05:00:00', '18:00:00')",
                name,
                street + ", test",
                HCM,
                ward,
                street);
        return jdbc.queryForObject(
                "SELECT id FROM markets WHERE market_name = ?", Long.class, name);
    }

    @BeforeEach
    void setUp() {
        benThanhId = insertMarket("Chợ test BT " + tag, BEN_THANH, "Lê Lợi");
        insertMarket("Chợ test TD " + tag, TAN_DINH, "Hai Bà Trưng");
    }

    @Test
    void returnsTheAddressPartsWithTheWardAndProvinceNames() {
        MarketResource market = query.findById(benThanhId).orElseThrow();

        assertThat(market.wardName()).isEqualTo("Phường Bến Thành");
        assertThat(market.provinceName()).isEqualTo("Thành phố Hồ Chí Minh");
        assertThat(market.addressParts().wardCode()).isEqualTo(BEN_THANH);
        assertThat(market.addressParts().streetName()).isEqualTo("Lê Lợi");
    }

    @Test
    void filtersByWard() {
        assertThat(query.search("test", null, null, BEN_THANH, 0, 50).items())
                .extracting(MarketResource::marketName)
                .contains("Chợ test BT " + tag)
                .doesNotContain("Chợ test TD " + tag);
    }

    @Test
    void filtersByProvince() {
        assertThat(query.search("test", null, HCM, null, 0, 50).items())
                .extracting(MarketResource::marketName)
                .contains("Chợ test BT " + tag, "Chợ test TD " + tag);
        assertThat(query.search("test", null, "01", null, 0, 50).items()).isEmpty();
    }

    @Test
    void aMarketWithoutPartsHasNoNames() {
        jdbc.update(
                "INSERT INTO markets (market_name, address, latitude, longitude, opening_time,"
                        + " closing_time) VALUES (?, 'Old text', 10.8, 106.7, '05:00:00',"
                        + " '18:00:00')",
                "Chợ test old " + tag);
        long id =
                jdbc.queryForObject(
                        "SELECT id FROM markets WHERE market_name = ?",
                        Long.class,
                        "Chợ test old " + tag);

        MarketResource market = query.findById(id).orElseThrow();

        assertThat(market.addressParts()).isNull();
        assertThat(market.wardName()).isNull();
        assertThat(market.address()).isEqualTo("Old text");
    }
}
