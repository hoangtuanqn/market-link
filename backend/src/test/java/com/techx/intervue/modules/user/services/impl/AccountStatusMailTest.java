package com.techx.intervue.modules.user.services.impl;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class AccountStatusMailTest {

    @Autowired private AccountStatusMail mail;

    @Test
    void thePermanentDeactivationLetterIsBrandedAndNamesTheReason() {
        AccountStatusMail.Content c = mail.deactivated("Trần Văn A", "Fake account", null, "en");

        assertThat(c.subject()).isEqualTo("Your MarketLink account has been deactivated");
        assertThat(c.html())
                .contains("<!doctype html>")
                .contains("MarketLink")
                .contains("Fake account")
                .contains("Until an administrator restores the account")
                .contains("admin@marketlink.vn");
        assertThat(c.text()).contains("Fake account").doesNotContain("<table");
    }

    @Test
    void theTemporaryDeactivationLetterShowsWhenItLifts() {
        AccountStatusMail.Content c =
                mail.deactivated(
                        "Trần Văn A", "No-shows", Instant.parse("2026-10-05T02:00:00Z"), "en");

        assertThat(c.html()).contains("09:00 05/10/2026");
    }

    @Test
    void aReasonWithHtmlInItIsEscapedNotRendered() {
        AccountStatusMail.Content c =
                mail.deactivated("<script>x</script>", "<b>bold</b>", null, "en");

        assertThat(c.html()).doesNotContain("<script>").doesNotContain("<b>bold</b>");
    }

    @Test
    void theReactivationLetterWelcomesThemBackWithASignInLink() {
        AccountStatusMail.Content c = mail.reactivated("Trần Văn A", "en");

        assertThat(c.subject()).isEqualTo("Your MarketLink account is active again");
        assertThat(c.html()).contains("Welcome back").contains("http://localhost:3000/login");
    }

    @Test
    void anUnknownLanguageFallsBackToEnglishInsteadOfFailing() {
        AccountStatusMail.Content c = mail.deactivated("A", "Spam", null, "xx");

        assertThat(c.subject()).isNotBlank();
        assertThat(c.html()).contains("Spam");
    }
}
