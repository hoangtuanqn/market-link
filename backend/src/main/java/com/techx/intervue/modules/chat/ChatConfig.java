package com.techx.intervue.modules.chat;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import java.time.Clock;
import java.time.Duration;
import java.time.ZoneId;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(ChatbotAiProperties.class)
public class ChatConfig {

    /** The chatbot reads "today / tomorrow" in Vietnam time (decisions.md · "Đơn vị và locale"). */
    @Bean
    Clock chatClock() {
        return Clock.system(ZoneId.of("Asia/Ho_Chi_Minh"));
    }

    /**
     * Only created when an API key is configured; without it the assistant stays on the keyword
     * engine. The key is read from config, never from the request. Spring closes the client
     * (connection pool) on shutdown through its {@code close()} method.
     */
    @Bean
    @ConditionalOnExpression("!'${app.chatbot.ai.api-key:}'.isBlank()")
    AnthropicClient anthropicClient(ChatbotAiProperties properties) {
        return AnthropicOkHttpClient.builder()
                .apiKey(properties.apiKey())
                // A chat reply must come back quickly; on timeout the keyword engine answers
                .timeout(Duration.ofSeconds(30))
                .maxRetries(1)
                .build();
    }
}
