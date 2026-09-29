package com.techx.intervue.modules.achievement.enums;

import com.fasterxml.jackson.annotation.JsonValue;
import java.util.Locale;

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
