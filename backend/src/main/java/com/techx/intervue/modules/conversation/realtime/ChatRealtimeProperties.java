package com.techx.intervue.modules.conversation.realtime;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.chat")
public record ChatRealtimeProperties(Rabbitmq rabbitmq) {

    public record Rabbitmq(String host, int stompPort, String user, String password) {}

    public boolean relayEnabled() {
        return rabbitmq != null && rabbitmq.host() != null && !rabbitmq.host().isBlank();
    }
}
