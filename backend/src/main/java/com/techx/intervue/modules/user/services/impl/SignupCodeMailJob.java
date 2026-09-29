package com.techx.intervue.modules.user.services.impl;

import com.techx.intervue.modules.user.services.interfaces.EmailVerificationServiceInterface;
import com.techx.intervue.services.interfaces.JobHandler;
import com.techx.intervue.services.interfaces.MailServiceInterface;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SignupCodeMailJob implements JobHandler {

    private final EmailVerificationServiceInterface emailVerification;
    private final SignupCodeMail signupCodeMail;
    private final MailServiceInterface mailService;

    @Override
    public String type() {
        return EmailVerificationService.JOB_SEND_CODE;
    }

    @Override
    public void handle(Map<String, String> payload) {
        emailVerification
                .issueCode(payload.get("email"))
                .ifPresent(
                        issued -> {
                            SignupCodeMail.Content mail = signupCodeMail.build(issued);
                            mailService.send(
                                    issued.pending().email(),
                                    mail.subject(),
                                    mail.html(),
                                    mail.text());
                        });
    }
}
