package com.techx.intervue.modules.product.services.impl;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class DealPolicyTest {

    @ParameterizedTest(name = "N={0} H={1} P={2} today={3} → {6}")
    @CsvSource({
        "7,  2026-09-29, 2026-10-03, 2026-09-30, 2026-10-05,  3, OK,                    20",
        "21, 2026-09-14, 2026-10-03, 2026-09-30, 2026-10-04,  2, OK,                    40",
        "7,  2026-09-30, 2026-10-03, 2026-09-30, 2026-10-06,  4, OK,                    20",
        "10, 2026-09-25, 2026-10-03, 2026-09-30, 2026-10-04,  2, OK,                    40",
        "20, 2026-09-20, 2026-10-03, 2026-09-30, 2026-10-09,  7, OK,                    30",
        "20, 2026-09-21, 2026-10-03, 2026-09-30, 2026-10-10,  8, OK,                    20",
        "2,  2026-10-02, 2026-10-03, 2026-10-02, 2026-10-03,  1, OK,                    40",
        "5,  2026-09-29, 2026-10-02, 2026-09-30, 2026-10-03,  2, OK,                    20",
        "7,  2026-12-29, 2027-01-02, 2026-12-30, 2027-01-04,  3, OK,                    20",
        "1,  2026-10-02, 2026-10-03, 2026-10-02, 2026-10-02,  0, EXPIRED_BEFORE_PICKUP,  0",
        "7,  2026-09-20, 2026-10-03, 2026-09-30, 2026-09-26, -6, EXPIRED_BEFORE_PICKUP,  0",
        "3,  2026-10-03, 2026-10-03, 2026-10-03, 2026-10-05,  3, FRESH,                  0",
        "7,  2026-10-01, 2026-10-03, 2026-09-30, 2026-10-07,  5, PACKED_IN_FUTURE,       0",
        "7,  2026-10-02, 2026-10-03, 2026-10-02, 2026-10-08,  6, NOT_NEAR_EXPIRY,        0",
        "7,  2026-09-29, 2026-10-01, 2026-09-30, 2026-10-05,  5, NOT_NEAR_EXPIRY,        0",
    })
    void checksABatchForAPickupDay(
            int shelfLife,
            LocalDate packedOn,
            LocalDate pickup,
            LocalDate today,
            LocalDate bestBefore,
            int daysLeft,
            String outcome,
            int suggested) {
        DealPolicy.Check check = DealPolicy.check(shelfLife, packedOn, pickup, today);

        assertThat(check.bestBefore()).isEqualTo(bestBefore);
        assertThat(check.daysLeft()).isEqualTo(daysLeft);
        if ("OK".equals(outcome)) {
            assertThat(check.problem()).isNull();
            assertThat(DealPolicy.suggestedPercent(daysLeft, shelfLife)).isEqualTo(suggested);
        } else {
            assertThat(check.problem()).isEqualTo(DealPolicy.Problem.valueOf(outcome));
        }
    }

    @ParameterizedTest(name = "{0} at {1}% → {2}")
    @CsvSource({
        "0.60, 20, 0.48",
        "2.60, 40, 1.56",
        "10.00, 5, 9.50",
        "1.90, 15, 1.62",
        "0.05, 70, 0.02",
        "0.01, 70, 0.01",
        "0.00, 50, 0.00",
    })
    void roundsTheDealPriceToTheCent(BigDecimal listPrice, int percent, BigDecimal expected) {
        assertThat(DealPolicy.dealPrice(listPrice, percent)).isEqualByComparingTo(expected);
    }

    @ParameterizedTest(name = "{0}% → {1}")
    @CsvSource({
        "5, true",
        "20, true",
        "70, true",
        "0, false",
        "4, false",
        "33, false",
        "75, false",
        "100, false"
    })
    void takesADiscountFrom5To70InStepsOf5(int percent, boolean valid) {
        assertThat(DealPolicy.validPercent(percent)).isEqualTo(valid);
    }
}
