package com.techx.intervue.modules.chat.resources;

import com.techx.intervue.modules.chat.enums.ChatIntent;

public record ParsedMessage(
        ChatIntent intent,
        String normalized,
        String keyword,
        Integer dayOfWeek,
        boolean vietnamese) {}
