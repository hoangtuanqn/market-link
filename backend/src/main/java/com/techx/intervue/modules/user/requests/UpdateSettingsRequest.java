package com.techx.intervue.modules.user.requests;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.Map;

/**
 * All preferences (PUT replaces the whole set). The list of values matches the frontend's
 * src/lib/settings.ts; adding a language or currency means editing both places.
 */
public record UpdateSettingsRequest(
        @NotNull(message = "Choose a theme.")
                @Pattern(regexp = "light|dark|system", message = "Choose a theme from the list.")
                String theme,
        @NotNull(message = "Choose a language.")
                @Pattern(
                        regexp = "en|vi|zh|ja|ko|fr|es|de|th|id",
                        message = "Choose a language from the list.")
                String language,
        @NotNull(message = "Choose a currency.")
                @Pattern(regexp = "VND|USD|EUR|JPY", message = "Choose a currency from the list.")
                String currency,
        @NotNull(message = "Choose units.")
                @Pattern(regexp = "metric|imperial", message = "Choose units from the list.")
                String units,
        @NotNull(message = "Choose a date format.")
                @Pattern(regexp = "dmy|mdy|iso", message = "Choose a date format from the list.")
                String dateFormat,
        @NotNull(message = "Choose a clock.")
                @Pattern(regexp = "h24|h12", message = "Choose a clock from the list.")
                String clock,
        @Pattern(regexp = "[a-z0-9-]{0,60}", message = "Choose a market from the list.")
                String preferredMarket,
        @Size(max = 30, message = "Too many settings.") Map<String, String> extras) {}
