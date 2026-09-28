package com.techx.intervue.modules.user.services.impl;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.user.resources.IssuedSignupCode;
import com.techx.intervue.modules.user.resources.PendingSignup;
import com.techx.intervue.modules.user.services.interfaces.EmailVerificationServiceInterface;
import com.techx.intervue.services.interfaces.MailServiceInterface;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class SignupCodeMailJobTest {

    private EmailVerificationServiceInterface emailVerification;
    private SignupCodeMail signupCodeMail;
    private MailServiceInterface mailService;
    private SignupCodeMailJob job;

    @BeforeEach
    void setUp() {
        emailVerification = mock(EmailVerificationServiceInterface.class);
        signupCodeMail = mock(SignupCodeMail.class);
        mailService = mock(MailServiceInterface.class);
        job = new SignupCodeMailJob(emailVerification, signupCodeMail, mailService);
    }

    @Test
    void mailsTheCodeOfASignUpThatIsStillWaiting() {
        IssuedSignupCode issued =
                new IssuedSignupCode(
                        new PendingSignup(
                                "Lan", "lan@example.com", "0900000002", "a", null, "h", "en", "t"),
                        "004821");
        when(emailVerification.issueCode("lan@example.com")).thenReturn(Optional.of(issued));
        when(signupCodeMail.build(issued))
                .thenReturn(
                        new SignupCodeMail.Content("004821 is your MarketLink code", "<p/>", "t"));

        job.handle(Map.of("email", "lan@example.com"));

        verify(mailService).send(eq("lan@example.com"), contains("004821"), eq("<p/>"), eq("t"));
    }

    @Test
    void anExpiredSignUpGetsNoMail() {
        when(emailVerification.issueCode(any())).thenReturn(Optional.empty());

        job.handle(Map.of("email", "lan@example.com"));

        verifyNoInteractions(mailService);
    }
}
