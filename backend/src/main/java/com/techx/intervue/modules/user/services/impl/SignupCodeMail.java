package com.techx.intervue.modules.user.services.impl;

import com.techx.intervue.config.EmailVerificationConfig;
import com.techx.intervue.modules.user.resources.IssuedSignupCode;
import com.techx.intervue.modules.user.resources.PendingSignup;
import com.techx.intervue.services.impl.MailTemplates;
import java.util.Locale;
import java.util.Map;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.MessageSource;
import org.springframework.stereotype.Component;

/** FR-009: the code email, in the language picked on the sign-up form. */
@Component
public class SignupCodeMail {

    private final MessageSource messages;
    private final MailTemplates templates;
    private final EmailVerificationConfig config;

    public SignupCodeMail(
            @Qualifier("mailMessages") MessageSource messages,
            MailTemplates templates,
            EmailVerificationConfig config) {
        this.messages = messages;
        this.templates = templates;
        this.config = config;
    }

    public record Content(String subject, String html, String text) {}

    public Content build(IssuedSignupCode issued) {
        PendingSignup pending = issued.pending();
        Locale locale = Locale.forLanguageTag(pending.language());
        long minutes = Math.max(1, config.getCodeTtlSeconds() / 60);
        String subject = text("signupCode.subject", locale, issued.code());
        MailTemplates.Body body =
                templates.render(
                        "signup-code",
                        Map.ofEntries(
                                Map.entry("lang", pending.language()),
                                Map.entry("subject", subject),
                                Map.entry(
                                        "preheader", text("signupCode.preheader", locale, minutes)),
                                Map.entry("title", text("signupCode.title", locale)),
                                Map.entry(
                                        "greeting",
                                        text("signupCode.greeting", locale, pending.fullName())),
                                Map.entry("intro", text("signupCode.intro", locale)),
                                Map.entry("codeLabel", text("signupCode.codeLabel", locale)),
                                Map.entry("code", issued.code()),
                                Map.entry("expiry", text("signupCode.expiry", locale, minutes)),
                                Map.entry("ignore", text("signupCode.ignore", locale)),
                                Map.entry("tagline", text("mail.tagline", locale)),
                                Map.entry(
                                        "reason",
                                        text("signupCode.reason", locale, pending.email()))));
        return new Content(subject, body.html(), body.text());
    }

    private String text(String key, Locale locale, Object... args) {
        return messages.getMessage(key, args, locale);
    }
}
