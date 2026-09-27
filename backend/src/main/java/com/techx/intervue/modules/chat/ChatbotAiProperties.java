package com.techx.intervue.modules.chat;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * app.chatbot.ai.* — FR-090/091, the Claude-backed assistant for signed-in customers. An empty
 * {@code apiKey} turns it off and every message goes to the keyword engine, so dev machines and CI
 * run without a key.
 *
 * @param model Claude model id; a cheap, fast one is enough for lookup and FAQ answers
 * @param maxTokens output ceiling for one Claude response
 * @param maxToolRounds tool-call rounds allowed per user message before forcing a text answer
 * @param historyMessages earlier chat_messages rows sent back to Claude as context
 * @param messagesPerHour per-account cap on Claude-answered messages for Customer and Farmer; over
 *     it, the keyword engine answers instead
 * @param adminMessagesPerHour the same cap for Admin, a small and trusted group
 * @param platformMessagesPerDay cap across the whole platform for one day. Unlike the per-account
 *     bucket this one fails closed: if Redis cannot be reached the spend cannot be measured, so the
 *     keyword engine answers rather than risk an unbounded bill
 */
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
