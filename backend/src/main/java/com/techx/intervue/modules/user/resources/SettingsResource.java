package com.techx.intervue.modules.user.resources;

import java.util.Map;
import lombok.Builder;

@Builder
public record SettingsResource(
        String theme,
        String language,
        String currency,
        String units,
        String dateFormat,
        String clock,
        String preferredMarket,
        /* notifications and each role's own block: saved, no feature uses them yet */
        Map<String, String> extras) {}
