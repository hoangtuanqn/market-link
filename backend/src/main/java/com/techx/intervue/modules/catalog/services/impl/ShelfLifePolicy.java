package com.techx.intervue.modules.catalog.services.impl;

import java.time.LocalDate;
import java.util.List;

/**
 * FR-120, FR-121: the shelf-life arithmetic shared by products, order lines and near-expiry deals
 * (spec §4.2, §4.3). Pure functions, no I/O.
 */
public final class ShelfLifePolicy {

    private ShelfLifePolicy() {}

    /** The longest shelf life a Farmer may set: twice the suggestion. */
    public static int maxDays(int suggestedDays) {
        return suggestedDays * 2;
    }

    /** Days above the suggestion; 0 when there is no suggestion or the Farmer went shorter. */
    public static int extendedBy(int days, Integer suggestedDays) {
        return suggestedDays == null ? 0 : Math.max(0, days - suggestedDays);
    }

    /**
     * The last day a product is still good when it keeps for {@code days} days starting on {@code
     * firstDay}: one day of shelf life ends on the first day itself.
     */
    public static LocalDate bestBefore(LocalDate firstDay, int days) {
        return firstDay.plusDays(days - 1L);
    }

    /** Median of whole days; an even count rounds its middle pair down; null when empty. */
    public static Integer median(List<Integer> values) {
        if (values.isEmpty()) {
            return null;
        }
        List<Integer> sorted = values.stream().sorted().toList();
        int mid = sorted.size() / 2;
        return sorted.size() % 2 == 1
                ? sorted.get(mid)
                : (sorted.get(mid - 1) + sorted.get(mid)) / 2;
    }
}
