package com.techx.intervue.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.javamail.JavaMailSender;

class MailServiceTest {

    private JavaMailSender sender;

    @BeforeEach
    void setUp() {
        sender = mock(JavaMailSender.class);
        when(sender.createMimeMessage()).thenReturn(new MimeMessage((Session) null));
    }

    @Test
    void sendsHtmlWithAPlainTextAlternative() throws Exception {
        new MailService(sender, "noreply@marketlink.vn", "MarketLink")
                .send("lan@example.com", "Your code", "<p>Hi</p>", "Hi");

        ArgumentCaptor<MimeMessage> sent = ArgumentCaptor.forClass(MimeMessage.class);
        verify(sender).send(sent.capture());
        MimeMessage message = sent.getValue();
        message.saveChanges();
        ByteArrayOutputStream raw = new ByteArrayOutputStream();
        message.writeTo(raw);
        assertThat(message.getSubject()).isEqualTo("Your code");
        assertThat(message.getAllRecipients()[0].toString()).isEqualTo("lan@example.com");
        assertThat(raw.toString(StandardCharsets.UTF_8))
                .contains("multipart/alternative")
                .contains("text/plain")
                .contains("text/html");
    }

    @Test
    void logsInsteadOfSendingWhenNoAccountIsConfigured() {
        MailService service = new MailService(sender, "", "MarketLink");

        service.send("lan@example.com", "Your code", "<p>Hi</p>", "Hi");
        service.sendHtml("lan@example.com", "Reset", "<p>Link</p>");

        verify(sender, never()).send(any(MimeMessage.class));
    }
}
