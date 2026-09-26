package com.techx.intervue.modules.conversation;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Spec §8.4. Mỗi mức tính riêng cho từng user. */
@ConfigurationProperties(prefix = "app.chat.limits")
public record ChatLimitsProperties(
        int messagesPerMinute,
        int imagesPerHour,
        int conversationsPerHour,
        int typingFramesPerMinute) {}
