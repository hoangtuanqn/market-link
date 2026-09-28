package com.techx.intervue.modules.user.services.impl;

import com.techx.intervue.modules.user.resources.PendingSignup;
import com.techx.intervue.modules.user.services.interfaces.SignupStoreInterface;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * SignupStoreInterface in memory; time only passes when a test calls one of the expire* methods.
 */
class InMemorySignupStore implements SignupStoreInterface {

    final Map<String, PendingSignup> pending = new HashMap<>();
    final Map<String, String> codes = new HashMap<>();
    final Map<String, Long> codeTtl = new HashMap<>();
    final Map<String, Integer> attempts = new HashMap<>();
    final Map<String, Long> cooldowns = new HashMap<>();
    final Map<String, Long> sends = new HashMap<>();

    void expireCode(String email) {
        codes.remove(email);
        codeTtl.remove(email);
    }

    void expireCooldown(String email) {
        cooldowns.remove(email);
    }

    void expirePending(String email) {
        pending.remove(email);
    }

    @Override
    public void savePending(PendingSignup p, Duration ttl) {
        pending.put(p.email(), p);
    }

    @Override
    public Optional<PendingSignup> findPending(String email) {
        return Optional.ofNullable(pending.get(email));
    }

    @Override
    public void extendPending(String email, Duration ttl) {}

    @Override
    public void deleteAll(String email) {
        pending.remove(email);
        expireCode(email);
        attempts.remove(email);
        cooldowns.remove(email);
    }

    @Override
    public void saveCode(String email, String codeHash, Duration ttl) {
        codes.put(email, codeHash);
        codeTtl.put(email, ttl.toSeconds());
        attempts.remove(email);
    }

    @Override
    public Optional<String> findCode(String email) {
        return Optional.ofNullable(codes.get(email));
    }

    @Override
    public Optional<String> takeCode(String email) {
        codeTtl.remove(email);
        return Optional.ofNullable(codes.remove(email));
    }

    @Override
    public void deleteCode(String email) {
        expireCode(email);
    }

    @Override
    public long codeSecondsLeft(String email) {
        return codeTtl.getOrDefault(email, 0L);
    }

    @Override
    public int failedAttempts(String email) {
        return attempts.getOrDefault(email, 0);
    }

    @Override
    public int recordFailedAttempt(String email) {
        return attempts.merge(email, 1, Integer::sum);
    }

    @Override
    public boolean startCooldown(String email, Duration ttl) {
        return cooldowns.putIfAbsent(email, ttl.toSeconds()) == null;
    }

    @Override
    public long cooldownSecondsLeft(String email) {
        return cooldowns.getOrDefault(email, 0L);
    }

    @Override
    public SendCount countEmailSend(String email, Duration window) {
        return new SendCount(sends.merge("email:" + email, 1L, Long::sum), window.toSeconds());
    }

    @Override
    public SendCount countIpSend(String ip, Duration window) {
        return new SendCount(sends.merge("ip:" + ip, 1L, Long::sum), window.toSeconds());
    }
}
