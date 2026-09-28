package com.techx.intervue.services.interfaces;

public interface MailServiceInterface {
    /**
     * Send an HTML mail right away (synchronously). To avoid blocking the request, push it through
     * JobQueueInterface.
     */
    void sendHtml(String to, String subject, String html);

    /** Same, with a plain-text alternative for mail apps that do not show HTML (FR-009). */
    void send(String to, String subject, String html, String text);
}
