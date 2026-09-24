package com.techx.intervue.services.interfaces;

public interface MailServiceInterface {
    /** Gửi mail HTML ngay (đồng bộ). Muốn không chặn request thì đẩy qua JobQueueInterface. */
    void sendHtml(String to, String subject, String html);
}
