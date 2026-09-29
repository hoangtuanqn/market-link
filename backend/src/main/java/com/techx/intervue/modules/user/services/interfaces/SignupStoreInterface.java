package com.techx.intervue.modules.user.services.interfaces;

import com.techx.intervue.modules.user.resources.PendingSignup;
import java.time.Duration;
import java.util.Optional;

public interface SignupStoreInterface {

    void savePending(PendingSignup pending, Duration ttl);

    Optional<PendingSignup> findPending(String email);

    void extendPending(String email, Duration ttl);

    void deleteAll(String email);

    void saveCode(String email, String codeHash, Duration ttl);

    Optional<String> findCode(String email);

    Optional<String> takeCode(String email);

    void deleteCode(String email);

    long codeSecondsLeft(String email);

    int countAttempt(String email);

    boolean startCooldown(String email, Duration ttl);

    long cooldownSecondsLeft(String email);

    SendCount countEmailSend(String email, Duration window);

    SendCount countIpSend(String ip, Duration window);

    record SendCount(long count, long secondsLeft) {}
}
