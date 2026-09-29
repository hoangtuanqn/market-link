package com.techx.intervue.modules.catalog.services.impl;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

class ShelfLifePolicyTest {

    @Test
    void allowsAtMostTwiceTheSuggestion() {
        assertThat(ShelfLifePolicy.maxDays(1)).isEqualTo(2);
        assertThat(ShelfLifePolicy.maxDays(3)).isEqualTo(6);
    }

    @Test
    void countsOnlyTheDaysAboveTheSuggestion() {
        assertThat(ShelfLifePolicy.extendedBy(5, 3)).isEqualTo(2);
        assertThat(ShelfLifePolicy.extendedBy(3, 3)).isZero();
        assertThat(ShelfLifePolicy.extendedBy(2, 3)).isZero();
        assertThat(ShelfLifePolicy.extendedBy(9, null)).isZero();
    }

    @Test
    void theLastGoodDayIncludesTheFirstDay() {
        LocalDate pickup = LocalDate.of(2026, 10, 3);
        assertThat(ShelfLifePolicy.bestBefore(pickup, 1)).isEqualTo(pickup);
        assertThat(ShelfLifePolicy.bestBefore(pickup, 3)).isEqualTo(LocalDate.of(2026, 10, 5));
        assertThat(ShelfLifePolicy.bestBefore(LocalDate.of(2026, 9, 29), 7))
                .isEqualTo(LocalDate.of(2026, 10, 5));
    }

    @Test
    void takesTheMiddleValueAndRoundsAnEvenPairDown() {
        assertThat(ShelfLifePolicy.median(List.of(5, 3, 4))).isEqualTo(4);
        assertThat(ShelfLifePolicy.median(List.of(3, 4, 6, 9))).isEqualTo(5);
        assertThat(ShelfLifePolicy.median(List.of())).isNull();
    }
}
