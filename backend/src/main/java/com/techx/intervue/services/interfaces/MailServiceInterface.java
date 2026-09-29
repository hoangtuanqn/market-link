package com.techx.intervue.services.interfaces;

public interface MailServiceInterface {
    void sendHtml(String to, String subject, String html);

    void send(String to, String subject, String html, String text);
}
