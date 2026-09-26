package com.techx.intervue.modules.achievement.enums;

import com.fasterxml.jackson.annotation.JsonValue;
import java.util.Locale;

/**
 * Buyer achievement tier, low → high. Declaration order is the order in which tiers are evaluated.
 */
public enum Tier {
    BRONZE,
    SILVER,
    GOLD,
    DIAMOND;

    @JsonValue
    public String value() {
        return name().toLowerCase(Locale.ROOT);
    }
}
