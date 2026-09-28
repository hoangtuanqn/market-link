package com.techx.intervue.modules.user.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.techx.intervue.services.interfaces.MailServiceInterface;
import java.util.Map;
import org.junit.jupiter.api.Test;

class AccountReactivatedNoticeJobTest {

    private final MailServiceInterface mail = mock(MailServiceInterface.class);
    private final AccountReactivatedNoticeJob job = new AccountReactivatedNoticeJob(mail);

    @Test
    void typeMatchesTheQueuedJobName() {
        assertThat(job.type()).isEqualTo(AdminCustomerService.JOB_NOTIFY_REACTIVATED);
    }

    @Test
    void sendsAnActiveAgainEmail() {
        job.handle(Map.of("email", "a@b.c", "fullName", "Jane Doe"));

        verify(mail)
                .sendHtml(
                        eq("a@b.c"), contains("active"), org.mockito.ArgumentMatchers.anyString());
    }
}
