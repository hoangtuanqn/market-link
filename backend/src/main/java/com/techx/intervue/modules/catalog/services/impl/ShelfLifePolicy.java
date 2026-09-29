package com.techx.intervue.modules.catalog.services.impl;

import java.time.LocalDate;
import java.util.List;

public final class ShelfLifePolicy {

    private ShelfLifePolicy() {}

    public static int maxDays(int suggestedDays) {
        return suggestedDays * 2;
    }

    public static int extendedBy(int days, Integer suggestedDays) {
        return suggestedDays == null ? 0 : Math.max(0, days - suggestedDays);
    }

    public static LocalDate bestBefore(LocalDate firstDay, int days) {
        return firstDay.plusDays(days - 1L);
    }

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
