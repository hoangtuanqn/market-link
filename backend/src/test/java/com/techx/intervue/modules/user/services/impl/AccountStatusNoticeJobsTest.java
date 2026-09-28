package com.techx.intervue.modules.user.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.user.repositories.UserSettingsRepository;
import com.techx.intervue.services.interfaces.MailServiceInterface;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * FR-072: the two job handlers turn a queued payload into the real branded letter. The mail builder
 * is the real one (a broken template must fail here, not in someone's inbox); only SMTP and the
 * settings lookup are stubbed.
 */
@SpringBootTest
class AccountStatusNoticeJobsTest {

    @Autowired private AccountStatusMail letters;

    @Test
    void theDeactivateJobSendsTheBrandedLetterWithTheReason() {
        MailServiceInterface mail = mock(MailServiceInterface.class);
        UserSettingsRepository settings = mock(UserSettingsRepository.class);
        when(settings.findById(anyLong())).thenReturn(Optional.empty());
        AccountDeactivatedNoticeJob job = new AccountDeactivatedNoticeJob(mail, letters, settings);

        job.handle(
                Map.of(
                        "userId", "7",
                        "email", "a@b.c",
                        "fullName", "Jane Doe",
                        "reason", "Fake reviews",
                        "until", ""));

        ArgumentCaptor<String> html = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> text = ArgumentCaptor.forClass(String.class);
        verify(mail)
                .send(
                        eq("a@b.c"),
                        eq("Your MarketLink account has been deactivated"),
                        html.capture(),
                        text.capture());
        assertThat(html.getValue()).contains("<!doctype html>").contains("Fake reviews");
        assertThat(text.getValue()).contains("Fake reviews").doesNotContain("<table");
    }

    @Test
    void theReactivateJobSendsTheWelcomeBackLetter() {
        MailServiceInterface mail = mock(MailServiceInterface.class);
        UserSettingsRepository settings = mock(UserSettingsRepository.class);
        when(settings.findById(anyLong())).thenReturn(Optional.empty());
        AccountReactivatedNoticeJob job = new AccountReactivatedNoticeJob(mail, letters, settings);

        job.handle(Map.of("userId", "7", "email", "a@b.c", "fullName", "Jane Doe"));

        ArgumentCaptor<String> html = ArgumentCaptor.forClass(String.class);
        verify(mail)
                .send(
                        eq("a@b.c"),
                        eq("Your MarketLink account is active again"),
                        html.capture(),
                        org.mockito.ArgumentMatchers.anyString());
        assertThat(html.getValue()).contains("Welcome back");
    }

    @Test
    void jobTypesMatchWhatTheServiceQueues() {
        MailServiceInterface mail = mock(MailServiceInterface.class);
        UserSettingsRepository settings = mock(UserSettingsRepository.class);
        assertThat(new AccountDeactivatedNoticeJob(mail, letters, settings).type())
                .isEqualTo(AdminCustomerService.JOB_NOTIFY_DEACTIVATED);
        assertThat(new AccountReactivatedNoticeJob(mail, letters, settings).type())
                .isEqualTo(AdminCustomerService.JOB_NOTIFY_REACTIVATED);
    }
}
