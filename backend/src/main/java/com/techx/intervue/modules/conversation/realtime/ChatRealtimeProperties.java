package com.techx.intervue.modules.conversation.realtime;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * app.chat.rabbitmq.host empty → the in-app simple broker (CI, tests, dev machines without Rabbit).
 * With a host → relay to RabbitMQ (docker compose, production).
 */
@ConfigurationProperties(prefix = "app.chat")
public record ChatRealtimeProperties(Rabbitmq rabbitmq) {

    public record Rabbitmq(String host, int stompPort, String user, String password) {}

    public boolean relayEnabled() {
        return rabbitmq != null && rabbitmq.host() != null && !rabbitmq.host().isBlank();
    }
}
