package com.techx.intervue.modules.user.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.techx.intervue.services.interfaces.MailServiceInterface;
import java.util.Map;
import org.junit.jupiter.api.Test;

class AccountDeactivatedNoticeJobTest {

    private final MailServiceInterface mail = mock(MailServiceInterface.class);
    private final AccountDeactivatedNoticeJob job = new AccountDeactivatedNoticeJob(mail);

    @Test
    void typeMatchesTheQueuedJobName() {
        assertThat(job.type()).isEqualTo(AdminCustomerService.JOB_NOTIFY_DEACTIVATED);
    }

    @Test
    void permanentBanEmailSaysPermanentlyAndNamesTheReason() {
        job.handle(
                Map.of(
                        "email", "a@b.c",
                        "fullName", "Jane Doe",
                        "reason", "Fake reviews",
                        "until", ""));

        verify(mail).sendHtml(eq("a@b.c"), contains("deactivated"), contains("Fake reviews"));
        verify(mail)
                .sendHtml(
                        eq("a@b.c"),
                        org.mockito.ArgumentMatchers.anyString(),
                        contains("permanently"));
    }

    @Test
    void temporaryBanEmailNamesTheReturnTime() {
        job.handle(
                Map.of(
                        "email", "a@b.c",
                        "fullName", "Jane Doe",
                        "reason", "No-shows",
                        "until", "2026-10-05T09:00:00Z"));

        verify(mail)
                .sendHtml(
                        eq("a@b.c"),
                        org.mockito.ArgumentMatchers.anyString(),
                        contains("No-shows"));
    }
}
