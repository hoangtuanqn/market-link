package com.techx.intervue.modules.user.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.UserStatus;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.DisabledException;

class DeactivationMessageTest {

    @Test
    void aPermanentBanNamesTheReason() {
        User user =
                User.builder()
                        .status(UserStatus.INACTIVE)
                        .deactivationReason("Fake account")
                        .build();

        assertThat(DeactivationMessage.of(user))
                .contains("deactivated")
                .contains("Fake account")
                .doesNotContain("temporarily");
    }

    @Test
    void aTemporaryBanNamesTheReturnTimeAndTheReason() {
        User user =
                User.builder()
                        .status(UserStatus.INACTIVE)
                        .deactivationReason("No-shows")
                        .deactivatedUntil(Instant.parse("2026-10-05T02:00:00Z"))
                        .build();

        assertThat(DeactivationMessage.of(user))
                .contains("temporarily suspended")
                .contains("No-shows")
                .contains("09:00 05/10/2026");
    }

    @Test
    void aNonInactiveStatusKeepsTheGenericWording() {
        User user = User.builder().status(UserStatus.SUSPENDED).build();

        assertThat(DeactivationMessage.of(user)).isEqualTo(DeactivationMessage.GENERIC_LOCKED);
    }

    @Test
    void assertActiveLetsAnActiveAccountThrough() {
        assertThatCode(
                        () ->
                                DeactivationMessage.assertActive(
                                        User.builder().status(UserStatus.ACTIVE).build()))
                .doesNotThrowAnyException();
    }

    @Test
    void assertActiveRefusesADeactivatedAccountWithTheReason() {
        User banned =
                User.builder()
                        .status(UserStatus.INACTIVE)
                        .deactivationReason("Abusive messages")
                        .build();

        assertThatThrownBy(() -> DeactivationMessage.assertActive(banned))
                .isInstanceOf(DisabledException.class)
                .hasMessageContaining("Abusive messages");
    }
}
