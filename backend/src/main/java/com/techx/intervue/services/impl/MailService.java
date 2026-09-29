package com.techx.intervue.services.impl;

import com.techx.intervue.services.interfaces.MailServiceInterface;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Slf4j
@Service
public class MailService implements MailServiceInterface {

    private final JavaMailSender mailSender;
    private final String fromAddress;
    private final String fromName;

    public MailService(
            JavaMailSender mailSender,
            @Value("${spring.mail.username}") String fromAddress,
            @Value("${app.mail.from-name:MarketLink}") String fromName) {
        this.mailSender = mailSender;
        this.fromAddress = fromAddress;
        this.fromName = fromName;
    }

    @Override
    public void sendHtml(String to, String subject, String html) {
        if (notConfigured(to, subject, html)) return;
        deliver(to, subject, false, helper -> helper.setText(html, true));
    }

    @Override
    public void send(String to, String subject, String html, String text) {
        if (notConfigured(to, subject, text)) return;
        deliver(to, subject, true, helper -> helper.setText(text, html));
    }

    private boolean notConfigured(String to, String subject, String body) {
        if (StringUtils.hasText(fromAddress)) return false;
        log.warn(
                "Mail is not configured (MAIL_USERNAME is empty), so it was not sent.\n"
                        + "To: {}\nSubject: {}\n{}",
                to,
                subject,
                body);
        return true;
    }

    private void deliver(String to, String subject, boolean multipart, Content content) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper =
                    new MimeMessageHelper(message, multipart, StandardCharsets.UTF_8.name());
            helper.setFrom(fromAddress, fromName);
            helper.setTo(to);
            helper.setSubject(subject);
            content.fill(helper);
            mailSender.send(message);
        } catch (MessagingException | UnsupportedEncodingException e) {
            throw new MailSendException("Could not build the email to " + to, e);
        }
    }

    @FunctionalInterface
    private interface Content {
        void fill(MimeMessageHelper helper) throws MessagingException;
    }
}
