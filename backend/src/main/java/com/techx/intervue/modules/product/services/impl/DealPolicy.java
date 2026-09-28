package com.techx.intervue.modules.product.services.impl;

import com.techx.intervue.modules.catalog.services.impl.ShelfLifePolicy;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/**
 * FR-124 (spec §4.5.1–4.5.2): when a batch may go on a near-expiry deal for a pickup day, the
 * suggested discount and the deal price. Pure functions, no I/O; frontend/src/lib/deals.ts is the
 * same rules for the dialog. Ratios are compared in whole numbers ({@code L/N ≤ 0.2} is {@code 5L ≤
 * N}) so both sides round the same way.
 */
public final class DealPolicy {

    public static final int MIN_PERCENT = 5;
    public static final int MAX_PERCENT = 70;
    public static final int STEP = 5;

    private static final BigDecimal ONE_CENT = new BigDecimal("0.01");
    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    /** Why a batch cannot go on a deal for that day. */
    public enum Problem {
        /** H is after today. */
        PACKED_IN_FUTURE,
        /** H is the pickup day itself (or later): the produce is fresh. */
        FRESH,
        /** More than half of the shelf life is left on the pickup day. */
        NOT_NEAR_EXPIRY,
        /** The batch is no longer good on the pickup day. */
        EXPIRED_BEFORE_PICKUP
    }

    /**
     * {@code bestBefore} = B, {@code daysLeft} = L (the pickup day counts); {@code problem} is null
     * when the batch may go on a deal.
     */
    public record Check(LocalDate bestBefore, int daysLeft, Problem problem) {}

    private DealPolicy() {}

    /** B = H + N − 1, L = B − P + 1; eligible when H < P, H ≤ today and 1 ≤ L ≤ ⌈N/2⌉. */
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

    /** Days the customer can still use the batch, the pickup day included. */
    public static int daysLeft(LocalDate bestBefore, LocalDate pickupDate) {
        return (int) ChronoUnit.DAYS.between(pickupDate, bestBefore) + 1;
    }

    /** 40% at one day left or L/N ≤ 0.2, 30% at L/N ≤ 0.35, else 20%. */
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

    /**
     * list × (100 − percent) / 100, rounded half up to the cent, at least $0.01 — but never above
     * the list price, so a free product stays free.
     */
    public static BigDecimal dealPrice(BigDecimal listPrice, int percent) {
        BigDecimal price =
                listPrice
                        .multiply(BigDecimal.valueOf(100L - percent))
                        .divide(HUNDRED, 2, RoundingMode.HALF_UP);
        return price.max(ONE_CENT).min(listPrice.setScale(2, RoundingMode.HALF_UP));
    }
}
