package com.techx.intervue.modules.notification.push;

import com.techx.intervue.modules.notification.entities.PushSubscription;
import com.techx.intervue.modules.notification.repositories.PushSubscriptionRepository;
import com.techx.intervue.modules.notification.requests.PushSubscriptionRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Register / cancel Web Push for the browser in use. The endpoint is unique: registering again
 * updates it.
 */
@Service
@RequiredArgsConstructor
public class PushSubscriptionService {

    private static final int USER_AGENT_MAX = 255;

    private final PushSubscriptionRepository subscriptions;

    @Transactional
    public void subscribe(Long userId, PushSubscriptionRequest request, String userAgent) {
        PushSubscription s =
                subscriptions
                        .findByEndpoint(request.endpoint())
                        .orElseGet(
                                () ->
                                        PushSubscription.builder()
                                                .endpoint(request.endpoint())
                                                .build());
        // Same browser, a different account signs in: notifications from now on belong to this
        // person
        s.setUserId(userId);
        s.setP256dh(request.keys().p256dh());
        s.setAuth(request.keys().auth());
        s.setUserAgent(
                userAgent == null || userAgent.length() <= USER_AGENT_MAX
                        ? userAgent
                        : userAgent.substring(0, USER_AGENT_MAX));
        subscriptions.save(s);
    }

    /**
     * Only delete when it is yours; someone else's is skipped without an error so that whose
     * endpoint it is is not revealed.
     */
    @Transactional
    public void unsubscribe(Long userId, String endpoint) {
        subscriptions
                .findByEndpoint(endpoint)
                .filter(s -> s.getUserId().equals(userId))
                .ifPresent(subscriptions::delete);
    }
}
