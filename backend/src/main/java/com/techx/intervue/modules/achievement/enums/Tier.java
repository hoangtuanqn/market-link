package com.techx.intervue.modules.achievement.enums;

import com.fasterxml.jackson.annotation.JsonValue;
import java.util.Locale;

/** Hạng thành tích của người mua, thấp → cao. Thứ tự khai báo là thứ tự xét hạng. */
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
