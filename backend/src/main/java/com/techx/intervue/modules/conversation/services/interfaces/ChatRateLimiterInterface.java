package com.techx.intervue.modules.conversation.services.interfaces;

/**
 * Spec §8.4. Tách interface để service nghiệp vụ và test của nó không phải biết Redis hay bucket4j.
 */
public interface ChatRateLimiterInterface {

    enum Action {
        MESSAGE,
        IMAGE,
        CONVERSATION,
        TYPING
    }

    /** Hết lượt thì ném RateLimitedException (→ 429). */
    void check(Long userId, Action action);
}
