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

    @Bean
    Clock chatClock() {
        return Clock.system(ZoneId.of("Asia/Ho_Chi_Minh"));
    }

    @Bean
    @ConditionalOnExpression("!'${app.chatbot.ai.api-key:}'.isBlank()")
    AnthropicClient anthropicClient(ChatbotAiProperties properties) {
        return AnthropicOkHttpClient.builder()
                .apiKey(properties.apiKey())
                .timeout(Duration.ofSeconds(30))
                .maxRetries(1)
                .build();
    }
}
