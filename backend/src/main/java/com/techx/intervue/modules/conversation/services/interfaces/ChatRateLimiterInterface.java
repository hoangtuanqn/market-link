package com.techx.intervue.modules.conversation.services.interfaces;

public interface ChatRateLimiterInterface {

    enum Action {
        MESSAGE,
        IMAGE,
        CONVERSATION,
        TYPING
    }

    void check(Long userId, Action action);
}
