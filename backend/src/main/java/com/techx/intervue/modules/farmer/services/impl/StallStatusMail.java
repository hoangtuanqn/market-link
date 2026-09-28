package com.techx.intervue.modules.farmer.services.impl;

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

/**
 * FR-071: the "your stall was suspended / is open again" letters, in the Farmer's own language and
 * in the same branded shell as the FR-009 and FR-072 mail. MailTemplates HTML-escapes every value,
 * so the admin's free-text reason can never inject markup.
 */
@Component
public class StallStatusMail {

    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");
    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final MessageSource messages;
    private final MailTemplates templates;
    private final String signInUrl;
    private final String supportEmail;

    public StallStatusMail(
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

    /** {@code until} null = it stays until an admin lifts it. */
    public Content suspended(
            String fullName, String stallName, String reason, Instant until, String language) {
        Locale locale = localeOf(language);
        String subject = text("stallSuspended.subject", locale);
        String duration =
                until == null
                        ? text("stallSuspended.durationPermanent", locale)
                        : text(
                                "stallSuspended.durationUntil",
                                locale,
                                TIME.format(until.atZone(ZONE)));
        MailTemplates.Body body =
                templates.render(
                        "stall-suspended",
                        Map.ofEntries(
                                Map.entry("lang", locale.getLanguage()),
                                Map.entry("subject", subject),
                                Map.entry("preheader", text("stallSuspended.preheader", locale)),
                                Map.entry("title", text("stallSuspended.title", locale)),
                                Map.entry(
                                        "greeting",
                                        text("stallSuspended.greeting", locale, fullName)),
                                Map.entry("intro", text("stallSuspended.intro", locale)),
                                Map.entry("stallName", stallName),
                                Map.entry(
                                        "detailsTitle",
                                        text("stallSuspended.detailsTitle", locale)),
                                Map.entry(
                                        "reasonLabel", text("stallSuspended.reasonLabel", locale)),
                                Map.entry("reason", reason),
                                Map.entry(
                                        "durationLabel",
                                        text("stallSuspended.durationLabel", locale)),
                                Map.entry("duration", duration),
                                Map.entry("whatNow", text("stallSuspended.whatNow", locale)),
                                Map.entry("ordersNote", text("stallSuspended.ordersNote", locale)),
                                Map.entry(
                                        "contact",
                                        text("stallSuspended.contact", locale, supportEmail)),
                                Map.entry("tagline", text("mail.tagline", locale)),
                                Map.entry("footerNote", text("stallStatus.footerNote", locale))));
        return new Content(subject, body.html(), body.text());
    }

    public Content reinstated(String fullName, String stallName, String language) {
        Locale locale = localeOf(language);
        String subject = text("stallReinstated.subject", locale);
        MailTemplates.Body body =
                templates.render(
                        "stall-reinstated",
                        Map.ofEntries(
                                Map.entry("lang", locale.getLanguage()),
                                Map.entry("subject", subject),
                                Map.entry("preheader", text("stallReinstated.preheader", locale)),
                                Map.entry("title", text("stallReinstated.title", locale)),
                                Map.entry(
                                        "greeting",
                                        text("stallReinstated.greeting", locale, fullName)),
                                Map.entry("intro", text("stallReinstated.intro", locale)),
                                Map.entry("stallName", stallName),
                                Map.entry(
                                        "signInLabel", text("stallReinstated.signInLabel", locale)),
                                Map.entry("signInUrl", signInUrl),
                                Map.entry("whatNow", text("stallReinstated.whatNow", locale)),
                                Map.entry(
                                        "contact",
                                        text("stallReinstated.contact", locale, supportEmail)),
                                Map.entry("tagline", text("mail.tagline", locale)),
                                Map.entry("footerNote", text("stallStatus.footerNote", locale))));
        return new Content(subject, body.html(), body.text());
    }

    private static Locale localeOf(String language) {
        return Locale.forLanguageTag(language == null || language.isBlank() ? "en" : language);
    }

    private String text(String key, Locale locale, Object... args) {
        return messages.getMessage(key, args, locale);
    }
}
