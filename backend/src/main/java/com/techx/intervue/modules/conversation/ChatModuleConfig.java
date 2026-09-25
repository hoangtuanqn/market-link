package com.techx.intervue.modules.conversation;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Cấu hình của module chat người-với-người. Không nhầm với
 * com.techx.intervue.modules.chat.ChatConfig — đó là chatbot FR-090.
 */
@Configuration
@EnableConfigurationProperties(ChatLimitsProperties.class)
public class ChatModuleConfig {}
