package com.techx.intervue.modules.farmer.services.impl;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * FR-071: the suspension letters must be the same branded mail the rest of the product sends, and
 * every placeholder must resolve — MailTemplates throws on a missing one, so a broken template
 * fails here rather than in a Farmer's inbox.
 */
@SpringBootTest
class StallStatusMailTest {

    @Autowired private StallStatusMail mail;

    @Test
    void thePermanentSuspensionLetterIsBrandedAndNamesTheReason() {
        StallStatusMail.Content c =
                mail.suspended("Trần Văn A", "Vườn Cô Tư", "Missed pickups", null, "en");

        assertThat(c.subject()).isEqualTo("Your MarketLink stall has been suspended");
        assertThat(c.html())
                .contains("<!doctype html>")
                .contains("MarketLink")
                .contains("Missed pickups")
                .contains("Until an administrator lifts it")
                .contains("admin@marketlink.vn");
        // the stall name carries a Latin-1 diacritic ("ô") that htmlEscape renders as a named
        // entity (&ocirc;) in the HTML part — correct for a browser, but not a literal substring
        // match, so the un-escaped plain-text part is where we check it survived.
        assertThat(c.text())
                .contains("Vườn Cô Tư")
                .contains("Missed pickups")
                .doesNotContain("<table");
    }

    /**
     * D-09: the letter must not imply everything stopped — accepted orders still have to be served.
     */
    @Test
    void theSuspensionLetterSaysAcceptedOrdersMustStillBeCompleted() {
        StallStatusMail.Content c =
                mail.suspended("Trần Văn A", "Vườn Cô Tư", "Complaints", null, "en");

        assertThat(c.html()).contains("already accepted");
        assertThat(c.text()).contains("already accepted");
    }

    @Test
    void aTemporarySuspensionSaysWhenItLifts() {
        StallStatusMail.Content c =
                mail.suspended(
                        "Trần Văn A",
                        "Vườn Cô Tư",
                        "No-shows",
                        Instant.parse("2026-10-05T02:00:00Z"),
                        "en");

        assertThat(c.html()).contains("09:00 05/10/2026"); // Asia/Ho_Chi_Minh
    }

    @Test
    void aReasonWithHtmlInItIsEscapedNotRendered() {
        StallStatusMail.Content c =
                mail.suspended("<script>x</script>", "Stall", "<b>bold</b>", null, "en");

        assertThat(c.html()).doesNotContain("<script>").doesNotContain("<b>bold</b>");
    }

    @Test
    void theReinstatementLetterWelcomesTheStallBack() {
        StallStatusMail.Content c = mail.reinstated("Trần Văn A", "Vườn Cô Tư", "en");

        assertThat(c.subject()).isEqualTo("Your MarketLink stall is open again");
        assertThat(c.html()).contains("http://localhost:3000/login");
        assertThat(c.text()).contains("Vườn Cô Tư");
    }

    @Test
    void anUnknownLanguageFallsBackToEnglishInsteadOfFailing() {
        StallStatusMail.Content c = mail.suspended("A", "Stall", "Spam", null, "xx");

        assertThat(c.subject()).isNotBlank();
        assertThat(c.html()).contains("Spam");
    }
}
