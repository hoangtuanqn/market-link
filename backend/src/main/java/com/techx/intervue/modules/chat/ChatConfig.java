package com.techx.intervue.modules.chat;

import java.time.Clock;
import java.time.ZoneId;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ChatConfig {

    /** The chatbot reads "today / tomorrow" in Vietnam time (decisions.md · "Đơn vị và locale"). */
    @Bean
    Clock chatClock() {
        return Clock.system(ZoneId.of("Asia/Ho_Chi_Minh"));
    }
}
