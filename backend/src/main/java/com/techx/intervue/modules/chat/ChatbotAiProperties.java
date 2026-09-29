package com.techx.intervue.modules.chat;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.chatbot.ai")
public record ChatbotAiProperties(
        String apiKey,
        String model,
        long maxTokens,
        int maxToolRounds,
        int historyMessages,
        int messagesPerHour,
        int adminMessagesPerHour,
        int platformMessagesPerDay) {

    public boolean enabled() {
        return apiKey != null && !apiKey.isBlank();
    }
}
