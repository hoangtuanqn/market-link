package com.techx.intervue.modules.chat;

import java.time.Clock;
import java.time.ZoneId;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ChatConfig {

    /** Chatbot hiểu "hôm nay / ngày mai" theo giờ Việt Nam (decisions.md · Đơn vị và locale). */
    @Bean
    Clock chatClock() {
        return Clock.system(ZoneId.of("Asia/Ho_Chi_Minh"));
    }
}
