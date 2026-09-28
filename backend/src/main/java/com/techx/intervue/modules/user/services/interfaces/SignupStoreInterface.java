package com.techx.intervue.modules.user.services.interfaces;

import com.techx.intervue.modules.user.resources.PendingSignup;
import java.time.Duration;
import java.util.Optional;

/** FR-009: Redis state of a sign-up waiting for its email code. Emails are already normalized. */
public interface SignupStoreInterface {

    void savePending(PendingSignup pending, Duration ttl);

    Optional<PendingSignup> findPending(String email);

    void extendPending(String email, Duration ttl);

    /** Pending form, code, wrong-attempt counter and cooldown. */
    void deleteAll(String email);

    /** Replaces the code and clears the wrong-attempt counter. */
    void saveCode(String email, String codeHash, Duration ttl);

    Optional<String> findCode(String email);

    /** GETDEL: of two callers only one gets the hash. */
    Optional<String> takeCode(String email);

    void deleteCode(String email);

    /** Seconds before the code expires; 0 when there is none. */
    long codeSecondsLeft(String email);

    int failedAttempts(String email);

    /** Adds one wrong attempt; the counter lives as long as the code. Returns the new count. */
    int recordFailedAttempt(String email);

    /** SET NX EX; false when a cooldown is already running. */
    boolean startCooldown(String email, Duration ttl);

    long cooldownSecondsLeft(String email);

    SendCount countEmailSend(String email, Duration window);

    SendCount countIpSend(String ip, Duration window);

    record SendCount(long count, long secondsLeft) {}
}
