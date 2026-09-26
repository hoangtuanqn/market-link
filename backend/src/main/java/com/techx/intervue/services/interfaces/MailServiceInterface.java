package com.techx.intervue.services.interfaces;

public interface MailServiceInterface {
    /**
     * Send an HTML mail right away (synchronously). To avoid blocking the request, push it through
     * JobQueueInterface.
     */
    void sendHtml(String to, String subject, String html);
}
