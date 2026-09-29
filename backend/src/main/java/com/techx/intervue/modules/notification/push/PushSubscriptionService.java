package com.techx.intervue.modules.notification.push;

import com.techx.intervue.modules.notification.entities.PushSubscription;
import com.techx.intervue.modules.notification.repositories.PushSubscriptionRepository;
import com.techx.intervue.modules.notification.requests.PushSubscriptionRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
        s.setUserId(userId);
        s.setP256dh(request.keys().p256dh());
        s.setAuth(request.keys().auth());
        s.setUserAgent(
                userAgent == null || userAgent.length() <= USER_AGENT_MAX
                        ? userAgent
                        : userAgent.substring(0, USER_AGENT_MAX));
        subscriptions.save(s);
    }

    @Transactional
    public void unsubscribe(Long userId, String endpoint) {
        subscriptions
                .findByEndpoint(endpoint)
                .filter(s -> s.getUserId().equals(userId))
                .ifPresent(subscriptions::delete);
    }
}
