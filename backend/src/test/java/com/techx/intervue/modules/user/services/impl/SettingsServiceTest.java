package com.techx.intervue.modules.user.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.user.entities.UserSettings;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import com.techx.intervue.modules.user.repositories.UserSettingsRepository;
import com.techx.intervue.modules.user.requests.UpdateSettingsRequest;
import com.techx.intervue.modules.user.resources.SettingsResource;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class SettingsServiceTest {

    private UserSettingsRepository repository;
    private SettingsService service;

    @BeforeEach
    void setUp() {
        repository = mock(UserSettingsRepository.class);
        service = new SettingsService(repository);
        when(repository.save(any(UserSettings.class))).thenAnswer(i -> i.getArgument(0));
    }

    private static UpdateSettingsRequest request(Map<String, String> extras) {
        return new UpdateSettingsRequest(
                "dark", "vi", "USD", "imperial", "iso", "h12", "2", extras);
    }

    @Test
    void returnsDefaultsWhenNothingIsSaved() {
        when(repository.findById(7L)).thenReturn(Optional.empty());

        SettingsResource s = service.get(7L);

        assertThat(s.theme()).isEqualTo("light");
        assertThat(s.language()).isEqualTo("en");
        assertThat(s.currency()).isEqualTo("VND");
        assertThat(s.units()).isEqualTo("metric");
        assertThat(s.dateFormat()).isEqualTo("dmy");
        assertThat(s.clock()).isEqualTo("h24");
        assertThat(s.preferredMarket()).isNull();
        assertThat(s.extras()).isEmpty();
        verify(repository, never()).save(any());
    }

    @Test
    void createsTheRowOnFirstSave() {
        when(repository.findById(7L)).thenReturn(Optional.empty());

        SettingsResource s = service.update(7L, request(Map.of("note.orderReady", "true")));

        assertThat(s.theme()).isEqualTo("dark");
        assertThat(s.language()).isEqualTo("vi");
        assertThat(s.preferredMarket()).isEqualTo("2");
        assertThat(s.extras()).containsEntry("note.orderReady", "true");
    }

    @Test
    void replacesTheWholeSetOnLaterSaves() {
        UserSettings row =
                UserSettings.builder()
                        .userId(7L)
                        .theme("light")
                        .language("en")
                        .extras(new HashMap<>(Map.of("old", "x")))
                        .build();
        when(repository.findById(7L)).thenReturn(Optional.of(row));

        service.update(7L, request(null));

        assertThat(row.getTheme()).isEqualTo("dark");
        assertThat(row.getClock()).isEqualTo("h12");
        assertThat(row.getExtras()).isEmpty();
    }

    @Test
    void emptyPreferredMarketMeansNone() {
        when(repository.findById(7L)).thenReturn(Optional.empty());

        SettingsResource s =
                service.update(
                        7L,
                        new UpdateSettingsRequest(
                                "light", "en", "VND", "metric", "dmy", "h24", "", Map.of()));

        assertThat(s.preferredMarket()).isNull();
    }

    @Test
    void refusesExtraKeysOrValuesThatDoNotLookLikeSettings() {
        when(repository.findById(7L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.update(7L, request(Map.of("<script>", "1"))))
                .isInstanceOf(InvalidFieldException.class)
                .extracting("field")
                .isEqualTo("extras");
        assertThatThrownBy(() -> service.update(7L, request(Map.of("note.a", "x".repeat(61)))))
                .isInstanceOf(InvalidFieldException.class);
    }
}
