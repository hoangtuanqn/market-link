package com.techx.intervue.modules.user.services.impl;

import com.techx.intervue.services.impl.MailTemplates;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Map;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.MessageSource;
import org.springframework.stereotype.Component;

@Component
public class AccountStatusMail {

    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");
    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final MessageSource messages;
    private final MailTemplates templates;
    private final String signInUrl;
    private final String supportEmail;

    public AccountStatusMail(
            @Qualifier("mailMessages") MessageSource messages,
            MailTemplates templates,
            @Value("${app.mail.sign-in-url}") String signInUrl,
            @Value("${app.mail.support-email}") String supportEmail) {
        this.messages = messages;
        this.templates = templates;
        this.signInUrl = signInUrl;
        this.supportEmail = supportEmail;
    }

    public record Content(String subject, String html, String text) {}

    public Content deactivated(String fullName, String reason, Instant until, String language) {
        Locale locale = localeOf(language);
        String subject = text("accountDeactivated.subject", locale);
        String duration =
                until == null
                        ? text("accountDeactivated.durationPermanent", locale)
                        : text(
                                "accountDeactivated.durationUntil",
                                locale,
                                TIME.format(until.atZone(ZONE)));
        MailTemplates.Body body =
                templates.render(
                        "account-deactivated",
                        Map.ofEntries(
                                Map.entry("lang", locale.getLanguage()),
                                Map.entry("subject", subject),
                                Map.entry(
                                        "preheader", text("accountDeactivated.preheader", locale)),
                                Map.entry("title", text("accountDeactivated.title", locale)),
                                Map.entry(
                                        "greeting",
                                        text("accountDeactivated.greeting", locale, fullName)),
                                Map.entry("intro", text("accountDeactivated.intro", locale)),
                                Map.entry(
                                        "detailsTitle",
                                        text("accountDeactivated.detailsTitle", locale)),
                                Map.entry(
                                        "reasonLabel",
                                        text("accountDeactivated.reasonLabel", locale)),
                                Map.entry("reason", reason),
                                Map.entry(
                                        "durationLabel",
                                        text("accountDeactivated.durationLabel", locale)),
                                Map.entry("duration", duration),
                                Map.entry("whatNow", text("accountDeactivated.whatNow", locale)),
                                Map.entry(
                                        "contact",
                                        text("accountDeactivated.contact", locale, supportEmail)),
                                Map.entry("tagline", text("mail.tagline", locale)),
                                Map.entry("footerNote", text("accountStatus.footerNote", locale))));
        return new Content(subject, body.html(), body.text());
    }

    public Content reactivated(String fullName, String language) {
        Locale locale = localeOf(language);
        String subject = text("accountReactivated.subject", locale);
        MailTemplates.Body body =
                templates.render(
                        "account-reactivated",
                        Map.ofEntries(
                                Map.entry("lang", locale.getLanguage()),
                                Map.entry("subject", subject),
                                Map.entry(
                                        "preheader", text("accountReactivated.preheader", locale)),
                                Map.entry("title", text("accountReactivated.title", locale)),
                                Map.entry(
                                        "greeting",
                                        text("accountReactivated.greeting", locale, fullName)),
                                Map.entry("intro", text("accountReactivated.intro", locale)),
                                Map.entry(
                                        "signInLabel",
                                        text("accountReactivated.signInLabel", locale)),
                                Map.entry("signInUrl", signInUrl),
                                Map.entry("whatNow", text("accountReactivated.whatNow", locale)),
                                Map.entry(
                                        "contact",
                                        text("accountReactivated.contact", locale, supportEmail)),
                                Map.entry("tagline", text("mail.tagline", locale)),
                                Map.entry("footerNote", text("accountStatus.footerNote", locale))));
        return new Content(subject, body.html(), body.text());
    }

    private static Locale localeOf(String language) {
        return Locale.forLanguageTag(language == null || language.isBlank() ? "en" : language);
    }

    private String text(String key, Locale locale, Object... args) {
        return messages.getMessage(key, args, locale);
    }
}
