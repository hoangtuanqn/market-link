package com.techx.intervue.modules.user.services.impl;

import com.techx.intervue.modules.user.entities.UserSettings;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import com.techx.intervue.modules.user.repositories.UserSettingsRepository;
import com.techx.intervue.modules.user.requests.UpdateSettingsRequest;
import com.techx.intervue.modules.user.resources.SettingsResource;
import com.techx.intervue.modules.user.services.interfaces.SettingsServiceInterface;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * the id comes from the access token so users can only read / edit their own preferences (R-06).
 */
@Service
@RequiredArgsConstructor
public class SettingsService implements SettingsServiceInterface {

    private static final Pattern EXTRA_KEY = Pattern.compile("[a-zA-Z][a-zA-Z0-9.]{0,39}");
    private static final int EXTRA_VALUE_MAX = 60;

    private final UserSettingsRepository repository;

    @Override
    @Transactional(readOnly = true)
    public SettingsResource get(Long userId) {
        return repository
                .findById(userId)
                .map(SettingsService::toResource)
                .orElseGet(SettingsService::defaults);
    }

    @Override
    @Transactional
    public SettingsResource update(Long userId, UpdateSettingsRequest request) {
        Map<String, String> extras = checkedExtras(request.extras());
        UserSettings row =
                repository
                        .findById(userId)
                        .orElseGet(() -> UserSettings.builder().userId(userId).build());
        row.setTheme(request.theme());
        row.setLanguage(request.language());
        row.setCurrency(request.currency());
        row.setUnits(request.units());
        row.setDateFormat(request.dateFormat());
        row.setClock(request.clock());
        row.setPreferredMarket(
                StringUtils.hasText(request.preferredMarket()) ? request.preferredMarket() : null);
        row.setExtras(extras);
        return toResource(repository.save(row));
    }

    /**
     * extras is free-form per role, so only the shape is checked: keys like "note.orderReady",
     * short values.
     */
    private static Map<String, String> checkedExtras(Map<String, String> extras) {
        Map<String, String> out = new LinkedHashMap<>();
        if (extras == null) {
            return out;
        }
        extras.forEach(
                (key, value) -> {
                    if (key == null || !EXTRA_KEY.matcher(key).matches()) {
                        throw new InvalidFieldException("extras", "Some settings are not valid.");
                    }
                    if (value == null || value.length() > EXTRA_VALUE_MAX) {
                        throw new InvalidFieldException("extras", "Some settings are too long.");
                    }
                    out.put(key, value);
                });
        return out;
    }

    private static SettingsResource defaults() {
        return SettingsResource.builder()
                .theme("light")
                .language("en")
                .currency("VND")
                .units("metric")
                .dateFormat("dmy")
                .clock("h24")
                .extras(Map.of())
                .build();
    }

    private static SettingsResource toResource(UserSettings s) {
        return SettingsResource.builder()
                .theme(s.getTheme())
                .language(s.getLanguage())
                .currency(s.getCurrency())
                .units(s.getUnits())
                .dateFormat(s.getDateFormat())
                .clock(s.getClock())
                .preferredMarket(s.getPreferredMarket())
                .extras(s.getExtras() == null ? Map.of() : s.getExtras())
                .build();
    }
}
