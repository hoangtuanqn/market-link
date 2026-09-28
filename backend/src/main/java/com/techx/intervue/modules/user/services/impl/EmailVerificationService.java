package com.techx.intervue.modules.user.services.impl;

import com.techx.intervue.config.EmailVerificationConfig;
import com.techx.intervue.helpers.TokenHashUtil;
import com.techx.intervue.modules.user.exceptions.SignupCodeExpiredException;
import com.techx.intervue.modules.user.exceptions.SignupCodeInvalidException;
import com.techx.intervue.modules.user.exceptions.SignupExpiredException;
import com.techx.intervue.modules.user.exceptions.SignupRateLimitedException;
import com.techx.intervue.modules.user.resources.IssuedSignupCode;
import com.techx.intervue.modules.user.resources.PendingSignup;
import com.techx.intervue.modules.user.resources.SignupStartedResource;
import com.techx.intervue.modules.user.resources.VerifiedSignup;
import com.techx.intervue.modules.user.services.interfaces.EmailVerificationServiceInterface;
import com.techx.intervue.modules.user.services.interfaces.SignupStoreInterface;
import com.techx.intervue.modules.user.services.interfaces.SignupStoreInterface.SendCount;
import com.techx.intervue.services.interfaces.JobQueueInterface;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * FR-009: a sign-up only becomes an account after the 6-digit code mailed to its address is typed
 * in. Limits: one code per minute, 5 codes per address and 20 per IP per hour, 5 wrong tries per
 * code (spec 2026-09-28-email-verification-design §5).
 */
@Service
@RequiredArgsConstructor
public class EmailVerificationService implements EmailVerificationServiceInterface {

    public static final String JOB_SEND_CODE = "signup.send-code";

    private static final Set<String> LANGUAGES =
            Set.of("en", "vi", "zh", "ja", "ko", "fr", "es", "de", "th", "id");

    private final SignupStoreInterface store;
    private final TokenHashUtil tokenHashUtil;
    private final JobQueueInterface jobQueue;
    private final EmailVerificationConfig config;
    private final SecureRandom secureRandom = new SecureRandom();

    public static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    /** The mail goes out in one of the 10 UI languages; "fr-CA" → "fr", anything else → "en". */
    public static String normalizeLanguage(String language) {
        if (language == null) return "en";
        String base = language.trim().toLowerCase(Locale.ROOT);
        int dash = base.indexOf('-');
        if (dash > 0) base = base.substring(0, dash);
        return LANGUAGES.contains(base) ? base : "en";
    }

    @Override
    public SignupStartedResource start(PendingSignup pending, String clientIp) {
        String email = pending.email();
        long cooldownLeft = store.cooldownSecondsLeft(email);
        if (cooldownLeft > 0 && store.findPending(email).isPresent()) {
            // Submitted again within the minute: keep the corrected details, send no second mail
            store.savePending(pending, pendingTtl());
            long codeLeft = store.codeSecondsLeft(email);
            return new SignupStartedResource(
                    email, codeLeft > 0 ? codeLeft : config.getCodeTtlSeconds(), cooldownLeft);
        }
        enforceSendLimits(email, clientIp);
        store.savePending(pending, pendingTtl());
        queueCode(email);
        return freshStart(email);
    }

    @Override
    public SignupStartedResource decoy(String email) {
        return freshStart(normalizeEmail(email));
    }

    @Override
    public SignupStartedResource resend(String email, String clientIp) {
        String normalized = normalizeEmail(email);
        if (store.findPending(normalized).isEmpty()) throw new SignupExpiredException();
        long cooldownLeft = store.cooldownSecondsLeft(normalized);
        if (cooldownLeft > 0) throw new SignupRateLimitedException(cooldownLeft);
        enforceSendLimits(normalized, clientIp);
        store.extendPending(normalized, pendingTtl());
        queueCode(normalized);
        return freshStart(normalized);
    }

    @Override
    public Optional<IssuedSignupCode> issueCode(String email) {
        String normalized = normalizeEmail(email);
        return store.findPending(normalized)
                .map(
                        pending -> {
                            String code = generateCode();
                            store.saveCode(
                                    normalized,
                                    hash(normalized, code),
                                    Duration.ofSeconds(config.getCodeTtlSeconds()));
                            return new IssuedSignupCode(pending, code);
                        });
    }

    @Override
    public VerifiedSignup verify(String email, String code) {
        String normalized = normalizeEmail(email);
        PendingSignup pending =
                store.findPending(normalized).orElseThrow(SignupExpiredException::new);
        String expected = store.findCode(normalized).orElseThrow(SignupCodeExpiredException::new);
        if (store.failedAttempts(normalized) >= config.getMaxAttempts()) {
            store.deleteCode(normalized);
            throw new SignupCodeExpiredException();
        }
        if (!sameHash(expected, hash(normalized, code))) {
            int left = Math.max(0, config.getMaxAttempts() - store.recordFailedAttempt(normalized));
            if (left == 0) store.deleteCode(normalized);
            throw new SignupCodeInvalidException(left);
        }
        long secondsLeft = store.codeSecondsLeft(normalized);
        // GETDEL: of two requests with the right code, only one goes on to create the account
        String taken = store.takeCode(normalized).orElseThrow(SignupCodeExpiredException::new);
        if (!sameHash(taken, expected)) {
            // A newer code arrived in between: put it back, the typed one is stale
            store.saveCode(normalized, taken, Duration.ofSeconds(Math.max(1, secondsLeft)));
            throw new SignupCodeExpiredException();
        }
        return new VerifiedSignup(pending, taken, secondsLeft);
    }

    @Override
    public void discard(String email) {
        store.deleteAll(normalizeEmail(email));
    }

    @Override
    public void restore(VerifiedSignup verified) {
        if (verified.codeSecondsLeft() <= 0) return;
        store.saveCode(
                verified.pending().email(),
                verified.codeHash(),
                Duration.ofSeconds(verified.codeSecondsLeft()));
    }

    /** Package-private so a test can pin a code with leading zeros. */
    String generateCode() {
        return String.format(Locale.ROOT, "%06d", secureRandom.nextInt(1_000_000));
    }

    /**
     * IP first: one IP cycling through many addresses stays under each per-address limit, yet still
     * fills the mail queue (same order as FR-007).
     */
    private void enforceSendLimits(String email, String clientIp) {
        Duration window = Duration.ofSeconds(config.getWindowSeconds());
        SendCount byIp = store.countIpSend(clientIp, window);
        if (byIp.count() > config.getMaxSendsPerIp()) {
            throw new SignupRateLimitedException(byIp.secondsLeft());
        }
        SendCount byEmail = store.countEmailSend(email, window);
        if (byEmail.count() > config.getMaxSendsPerEmail()) {
            throw new SignupRateLimitedException(byEmail.secondsLeft());
        }
    }

    private void queueCode(String email) {
        store.startCooldown(email, Duration.ofSeconds(config.getResendCooldownSeconds()));
        jobQueue.enqueue(JOB_SEND_CODE, Map.of("email", email));
    }

    private SignupStartedResource freshStart(String email) {
        return new SignupStartedResource(
                email, config.getCodeTtlSeconds(), config.getResendCooldownSeconds());
    }

    private String hash(String email, String code) {
        return tokenHashUtil.hash(email + ":" + code);
    }

    private static boolean sameHash(String a, String b) {
        return MessageDigest.isEqual(
                a.getBytes(StandardCharsets.UTF_8), b.getBytes(StandardCharsets.UTF_8));
    }

    private Duration pendingTtl() {
        return Duration.ofSeconds(config.getPendingTtlSeconds());
    }
}
