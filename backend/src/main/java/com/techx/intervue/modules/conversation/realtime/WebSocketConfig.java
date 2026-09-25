package com.techx.intervue.modules.conversation.realtime;

import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/** Spec 7.2 / 7.4. Endpoint /ws, WebSocket thuần (không SockJS), mọi sự kiện đi ra theo user. */
@Slf4j
@Configuration
@EnableWebSocketMessageBroker
@EnableConfigurationProperties(ChatRealtimeProperties.class)
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    public static final String ENDPOINT = "/ws";
    public static final String APP_PREFIX = "/app";
    public static final String USER_PREFIX = "/user";

    private final ChatRealtimeProperties props;

    @Value("${app.cors.allowed-origins}")
    private List<String> allowedOrigins;

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint(ENDPOINT)
                .setAllowedOriginPatterns(allowedOrigins.toArray(String[]::new));
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.setApplicationDestinationPrefixes(APP_PREFIX);
        registry.setUserDestinationPrefix(USER_PREFIX);
        if (props.relayEnabled()) {
            ChatRealtimeProperties.Rabbitmq r = props.rabbitmq();
            registry.enableStompBrokerRelay("/queue", "/topic")
                    .setRelayHost(r.host())
                    .setRelayPort(r.stompPort())
                    .setClientLogin(r.user())
                    .setClientPasscode(r.password())
                    .setSystemLogin(r.user())
                    .setSystemPasscode(r.password())
                    // Thiếu hai dòng này thì /user/queue/* chỉ tới người nối vào đúng instance
                    // (spec 7.2)
                    .setUserDestinationBroadcast("/topic/unresolved-user")
                    .setUserRegistryBroadcast("/topic/user-registry");
            log.info("Chat realtime: STOMP relay via RabbitMQ at {}:{}", r.host(), r.stompPort());
        } else {
            registry.enableSimpleBroker("/queue", "/topic");
            log.warn(
                    "Chat realtime: app.chat.rabbitmq.host is empty, using the in-app simple broker (single instance only)");
        }
    }
}
