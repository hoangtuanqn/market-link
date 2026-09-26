package com.techx.intervue.modules.notification.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.notification.entities.NotificationPreference;
import com.techx.intervue.modules.notification.entities.NotificationSettings;
import com.techx.intervue.modules.notification.enums.NotificationKind;
import com.techx.intervue.modules.notification.exceptions.InvalidNotificationPreferenceException;
import com.techx.intervue.modules.notification.repositories.NotificationPreferenceRepository;
import com.techx.intervue.modules.notification.repositories.NotificationSettingsRepository;
import com.techx.intervue.modules.notification.requests.UpdateNotificationPreferencesRequest;
import com.techx.intervue.modules.notification.resources.Alert;
import com.techx.intervue.modules.notification.resources.NotificationPreferencesResource;
import com.techx.intervue.modules.notification.resources.NotificationPreferencesResource.CategoryPreference;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.repositories.UserRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class NotificationPreferenceServiceTest {

    private static final ZoneId VN = ZoneId.of("Asia/Ho_Chi_Minh");

    @Mock NotificationPreferenceRepository prefs;
    @Mock NotificationSettingsRepository settings;
    @Mock UserRepository users;

    NotificationPreferenceService service;

    @BeforeEach
    void setUp() {
        service = new NotificationPreferenceService(prefs, settings, users);
    }

    private static Instant at(String hhmm) {
        return LocalDate.of(2026, 9, 25).atTime(LocalTime.parse(hhmm)).atZone(VN).toInstant();
    }

    private void role(RoleType role) {
        when(users.findById(1L)).thenReturn(Optional.of(User.builder().id(1L).role(role).build()));
    }

    @ParameterizedTest(name = "{0}-{1} at {2} → quiet={3}")
    @CsvSource({
        "22:00,07:00,23:30,true",
        "22:00,07:00,00:00,true",
        "22:00,07:00,06:59,true",
        "22:00,07:00,07:00,false",
        "22:00,07:00,21:59,false",
        "22:00,07:00,22:00,true",
        "13:00,14:00,13:30,true",
        "13:00,14:00,14:00,false",
        "13:00,14:00,12:59,false",
        "08:00,08:00,08:00,false"
    })
    void quietHours(String from, String to, String now, boolean quiet) {
        assertThat(NotificationPreferenceService.inQuietHours(from, to, LocalTime.parse(now)))
                .isEqualTo(quiet);
    }

    @Test
    void everythingIsOnWhenNothingIsSaved() {
        when(settings.findById(1L)).thenReturn(Optional.empty());
        when(prefs.findByUserIdAndCategory(1L, "messages")).thenReturn(Optional.empty());

        assertThat(service.alertFor(1L, NotificationKind.MESSAGE, at("12:00")))
                .isEqualTo(new Alert(true, true, true));
    }

    @Test
    void quietHoursSilencePopupsSoundAndPush() {
        when(settings.findById(1L))
                .thenReturn(
                        Optional.of(new NotificationSettings(1L, true, true, "22:00", "07:00")));

        assertThat(service.alertFor(1L, NotificationKind.FARMER_APPROVED, at("23:00")))
                .isEqualTo(new Alert(false, false, false));
    }

    @Test
    void quietHoursThatAreSwitchedOffDoNothing() {
        when(settings.findById(1L))
                .thenReturn(
                        Optional.of(new NotificationSettings(1L, true, false, "22:00", "07:00")));
        when(prefs.findByUserIdAndCategory(1L, "account")).thenReturn(Optional.empty());

        assertThat(service.alertFor(1L, NotificationKind.FARMER_APPROVED, at("23:00")))
                .isEqualTo(new Alert(true, true, true));
    }

    @Test
    void theTestButtonAlwaysAlertsEvenInQuietHours() {
        assertThat(service.alertFor(1L, NotificationKind.TEST, at("23:00")))
                .isEqualTo(new Alert(true, true, true));
    }

    @Test
    void aDisabledChannelStaysOff() {
        when(settings.findById(1L)).thenReturn(Optional.empty());
        when(prefs.findByUserIdAndCategory(1L, "messages"))
                .thenReturn(Optional.of(new NotificationPreference(1L, "messages", true, false)));

        assertThat(service.alertFor(1L, NotificationKind.MESSAGE, at("12:00")))
                .isEqualTo(new Alert(true, false, true));
    }

    @Test
    void soundIsOffWhenBothChannelsAreOff() {
        when(settings.findById(1L)).thenReturn(Optional.empty());
        when(prefs.findByUserIdAndCategory(1L, "messages"))
                .thenReturn(Optional.of(new NotificationPreference(1L, "messages", false, false)));

        assertThat(service.alertFor(1L, NotificationKind.MESSAGE, at("12:00")))
                .isEqualTo(new Alert(false, false, false));
    }

    @Test
    void mutedSoundKeepsThePopups() {
        when(settings.findById(1L))
                .thenReturn(
                        Optional.of(new NotificationSettings(1L, false, false, "22:00", "07:00")));
        when(prefs.findByUserIdAndCategory(1L, "messages")).thenReturn(Optional.empty());

        assertThat(service.alertFor(1L, NotificationKind.MESSAGE, at("12:00")))
                .isEqualTo(new Alert(true, true, false));
    }

    @Test
    void getListsOnlyTheRolesGroupsWithDefaults() {
        role(RoleType.ADMIN);
        when(prefs.findByUserId(1L)).thenReturn(List.of());
        when(settings.findById(1L)).thenReturn(Optional.empty());

        NotificationPreferencesResource got = service.get(1L);

        assertThat(got.categories())
                .containsExactly(new CategoryPreference("farmerApplications", true, true));
        assertThat(got.sound()).isTrue();
        assertThat(got.quietOn()).isFalse();
        assertThat(got.quietFrom()).isEqualTo("22:00");
        assertThat(got.quietTo()).isEqualTo("07:00");
    }

    @Test
    void getShowsSavedChoicesForACustomer() {
        role(RoleType.CUSTOMER);
        when(prefs.findByUserId(1L))
                .thenReturn(List.of(new NotificationPreference(1L, "messages", false, true)));
        when(settings.findById(1L)).thenReturn(Optional.empty());

        assertThat(service.get(1L).categories())
                .containsExactly(
                        new CategoryPreference("messages", false, true),
                        new CategoryPreference("announcements", true, true),
                        new CategoryPreference("account", true, true),
                        new CategoryPreference("orders", true, true),
                        new CategoryPreference("favorites", true, true));
    }

    @Test
    void updateRejectsAGroupOfAnotherRole() {
        role(RoleType.CUSTOMER);
        var request =
                new UpdateNotificationPreferencesRequest(
                        List.of(new CategoryPreference("farmerApplications", true, true)),
                        true,
                        false,
                        "22:00",
                        "07:00");

        assertThatThrownBy(() -> service.update(1L, request))
                .isInstanceOf(InvalidNotificationPreferenceException.class);
        verify(prefs, never()).saveAll(anyList());
    }

    @Test
    void updateRejectsAnUnknownGroup() {
        role(RoleType.CUSTOMER);
        var request =
                new UpdateNotificationPreferencesRequest(
                        List.of(new CategoryPreference("shipping", true, true)),
                        true,
                        false,
                        "22:00",
                        "07:00");

        assertThatThrownBy(() -> service.update(1L, request))
                .isInstanceOf(InvalidNotificationPreferenceException.class);
    }

    @Test
    @SuppressWarnings("unchecked")
    void updateSavesTheRowsAndTheSettings() {
        role(RoleType.CUSTOMER);
        var request =
                new UpdateNotificationPreferencesRequest(
                        List.of(new CategoryPreference("messages", false, true)),
                        false,
                        true,
                        "21:30",
                        "06:00");
        when(prefs.findByUserId(1L))
                .thenReturn(List.of(new NotificationPreference(1L, "messages", false, true)));
        when(settings.findById(1L))
                .thenReturn(
                        Optional.of(new NotificationSettings(1L, false, true, "21:30", "06:00")));

        NotificationPreferencesResource out = service.update(1L, request);

        ArgumentCaptor<List<NotificationPreference>> rows = ArgumentCaptor.forClass(List.class);
        verify(prefs).saveAll(rows.capture());
        assertThat(rows.getValue())
                .singleElement()
                .satisfies(
                        p -> {
                            assertThat(p.getCategory()).isEqualTo("messages");
                            assertThat(p.isInApp()).isFalse();
                            assertThat(p.isBrowser()).isTrue();
                        });
        verify(settings).save(new NotificationSettings(1L, false, true, "21:30", "06:00"));
        assertThat(out.quietFrom()).isEqualTo("21:30");
        assertThat(out.sound()).isFalse();
    }
}
