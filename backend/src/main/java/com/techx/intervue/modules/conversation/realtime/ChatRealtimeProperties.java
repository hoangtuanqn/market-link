package com.techx.intervue.modules.conversation.realtime;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * app.chat.rabbitmq.host rỗng → simple broker trong app (CI, test, máy dev không có Rabbit). Có
 * host → relay sang RabbitMQ (docker compose, production).
 */
@ConfigurationProperties(prefix = "app.chat")
public record ChatRealtimeProperties(Rabbitmq rabbitmq) {

    public record Rabbitmq(String host, int stompPort, String user, String password) {}

    public boolean relayEnabled() {
        return rabbitmq != null && rabbitmq.host() != null && !rabbitmq.host().isBlank();
    }
}
