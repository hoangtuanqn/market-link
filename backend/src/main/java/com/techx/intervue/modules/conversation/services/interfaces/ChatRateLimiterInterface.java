package com.techx.intervue.modules.conversation.services.interfaces;

/**
 * Spec §8.4. The interface is split out so the business service and its tests do not have to know
 * about Redis or bucket4j.
 */
public interface ChatRateLimiterInterface {

    enum Action {
        MESSAGE,
        IMAGE,
        CONVERSATION,
        TYPING
    }

    /** When the allowance runs out, throw RateLimitedException (→ 429). */
    void check(Long userId, Action action);
}
