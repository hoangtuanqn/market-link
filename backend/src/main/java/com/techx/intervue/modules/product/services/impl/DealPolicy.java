package com.techx.intervue.modules.product.services.impl;

import com.techx.intervue.modules.catalog.services.impl.ShelfLifePolicy;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

public final class DealPolicy {

    public static final int MIN_PERCENT = 5;
    public static final int MAX_PERCENT = 70;
    public static final int STEP = 5;

    private static final BigDecimal ONE_CENT = new BigDecimal("0.01");
    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    public enum Problem {
        PACKED_IN_FUTURE,
        FRESH,
        NOT_NEAR_EXPIRY,
        EXPIRED_BEFORE_PICKUP
    }

    public record Check(LocalDate bestBefore, int daysLeft, Problem problem) {}

    private DealPolicy() {}

    public static Check check(
            int shelfLifeDays, LocalDate packedOn, LocalDate pickupDate, LocalDate today) {
        LocalDate bestBefore = ShelfLifePolicy.bestBefore(packedOn, shelfLifeDays);
        int daysLeft = daysLeft(bestBefore, pickupDate);
        Problem problem = null;
        if (packedOn.isAfter(today)) {
            problem = Problem.PACKED_IN_FUTURE;
        } else if (!packedOn.isBefore(pickupDate)) {
            problem = Problem.FRESH;
        } else if (daysLeft < 1) {
            problem = Problem.EXPIRED_BEFORE_PICKUP;
        } else if (daysLeft > (shelfLifeDays + 1) / 2) {
            problem = Problem.NOT_NEAR_EXPIRY;
        }
        return new Check(bestBefore, daysLeft, problem);
    }

    public static int daysLeft(LocalDate bestBefore, LocalDate pickupDate) {
        return (int) ChronoUnit.DAYS.between(pickupDate, bestBefore) + 1;
    }

    public static int suggestedPercent(int daysLeft, int shelfLifeDays) {
        if (daysLeft <= 1 || 5 * daysLeft <= shelfLifeDays) {
            return 40;
        }
        if (20 * daysLeft <= 7 * shelfLifeDays) {
            return 30;
        }
        return 20;
    }

    public static boolean validPercent(int percent) {
        return percent >= MIN_PERCENT && percent <= MAX_PERCENT && percent % STEP == 0;
    }

    public static BigDecimal dealPrice(BigDecimal listPrice, int percent) {
        BigDecimal price =
                listPrice
                        .multiply(BigDecimal.valueOf(100L - percent))
                        .divide(HUNDRED, 2, RoundingMode.HALF_UP);
        return price.max(ONE_CENT).min(listPrice.setScale(2, RoundingMode.HALF_UP));
    }
}
