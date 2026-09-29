package com.techx.intervue.modules.farmer.services.impl;

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

@SpringBootTest
class StallStatusNoticeJobsTest {

    @Autowired private StallStatusMail letters;

    @Test
    void theSuspendJobSendsTheBrandedLetterWithTheReason() {
        MailServiceInterface mail = mock(MailServiceInterface.class);
        UserSettingsRepository settings = mock(UserSettingsRepository.class);
        when(settings.findById(anyLong())).thenReturn(Optional.empty());
        StallSuspendedNoticeJob job = new StallSuspendedNoticeJob(mail, letters, settings);

        job.handle(
                Map.of(
                        "userId", "7",
                        "email", "a@b.c",
                        "fullName", "Jane Doe",
                        "stallName", "Green Stall",
                        "reason", "Missed pickups",
                        "until", ""));

        ArgumentCaptor<String> html = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> text = ArgumentCaptor.forClass(String.class);
        verify(mail)
                .send(
                        eq("a@b.c"),
                        eq("Your MarketLink stall has been suspended"),
                        html.capture(),
                        text.capture());
        assertThat(html.getValue()).contains("<!doctype html>").contains("Missed pickups");
        assertThat(text.getValue()).contains("Missed pickups").doesNotContain("<table");
    }

    @Test
    void theReinstateJobSendsTheWelcomeBackLetter() {
        MailServiceInterface mail = mock(MailServiceInterface.class);
        UserSettingsRepository settings = mock(UserSettingsRepository.class);
        when(settings.findById(anyLong())).thenReturn(Optional.empty());
        StallReinstatedNoticeJob job = new StallReinstatedNoticeJob(mail, letters, settings);

        job.handle(
                Map.of(
                        "userId", "7",
                        "email", "a@b.c",
                        "fullName", "Jane Doe",
                        "stallName", "Green Stall"));

        ArgumentCaptor<String> html = ArgumentCaptor.forClass(String.class);
        verify(mail)
                .send(
                        eq("a@b.c"),
                        eq("Your MarketLink stall is open again"),
                        html.capture(),
                        org.mockito.ArgumentMatchers.anyString());
        assertThat(html.getValue()).contains("http://localhost:3000/login");
    }

    @Test
    void jobTypesMatchWhatTheServiceQueues() {
        MailServiceInterface mail = mock(MailServiceInterface.class);
        UserSettingsRepository settings = mock(UserSettingsRepository.class);
        assertThat(new StallSuspendedNoticeJob(mail, letters, settings).type())
                .isEqualTo(FarmerService.JOB_NOTIFY_SUSPENDED);
        assertThat(new StallReinstatedNoticeJob(mail, letters, settings).type())
                .isEqualTo(FarmerService.JOB_NOTIFY_REINSTATED);
    }
}
