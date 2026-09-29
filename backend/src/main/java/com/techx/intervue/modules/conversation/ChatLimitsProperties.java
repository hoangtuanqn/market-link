package com.techx.intervue.modules.conversation;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.chat.limits")
public record ChatLimitsProperties(
        int messagesPerMinute,
        int imagesPerHour,
        int conversationsPerHour,
        int typingFramesPerMinute) {}
