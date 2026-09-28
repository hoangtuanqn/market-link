package com.techx.intervue.helpers;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;

@Component
public class IpHelper {

    /**
     * The client address the per-IP limits key on (sign-up codes, forgot password, sign-in). Never
     * read CF-Connecting-IP / X-Forwarded-For / X-Real-IP here: any client can send them, and a new
     * value on every request walked around those limits. {@code server.forward-headers-strategy:
     * native} makes Tomcat rewrite {@code getRemoteAddr()} from X-Forwarded-For only when the
     * request comes from a trusted proxy ({@code server.tomcat.remoteip.internal-proxies}, private
     * ranges by default), so the same code is right with and without a reverse proxy in front —
     * like FeedbackController.clientKey.
     */
    public static String getClientIp(HttpServletRequest request) {
        String address = request.getRemoteAddr();
        return address == null || address.isBlank() ? "unknown" : address;
    }
}
