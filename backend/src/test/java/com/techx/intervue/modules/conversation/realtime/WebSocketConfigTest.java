package com.techx.intervue.modules.conversation.realtime;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.messaging.simp.broker.SimpleBrokerMessageHandler;
import org.springframework.messaging.simp.stomp.StompBrokerRelayMessageHandler;
import org.springframework.test.context.TestPropertySource;

class WebSocketConfigTest {

    @Nested
    @SpringBootTest
    @TestPropertySource(properties = "app.chat.rabbitmq.host=")
    class WithoutRabbit {
        @Autowired ApplicationContext ctx;

        @Test
        void usesTheSimpleBrokerSoCiAndTestsNeedNoRabbit() {
            // getBeansOfType skips a NullBean: a @Bean that returns null for an unused broker still
            // has a registered
            // name
            assertThat(ctx.getBeansOfType(SimpleBrokerMessageHandler.class)).isNotEmpty();
            assertThat(ctx.getBeansOfType(StompBrokerRelayMessageHandler.class)).isEmpty();
        }
    }

    @Nested
    @SpringBootTest
    @TestPropertySource(
            properties = {
                "app.chat.rabbitmq.host=rabbitmq-that-does-not-exist",
                "app.chat.rabbitmq.stomp-port=61613"
            })
    class WithRabbitConfigured {
        @Autowired ApplicationContext ctx;

        /**
         * The relay connects TCP asynchronously and retries by itself: a wrong host must not stop
         * the context from booting.
         */
        @Test
        void usesTheRelayAndStillBootsWhenTheBrokerIsUnreachable() {
            assertThat(ctx.getBeansOfType(StompBrokerRelayMessageHandler.class)).isNotEmpty();
            assertThat(ctx.getBeansOfType(SimpleBrokerMessageHandler.class)).isEmpty();
        }
    }
}
