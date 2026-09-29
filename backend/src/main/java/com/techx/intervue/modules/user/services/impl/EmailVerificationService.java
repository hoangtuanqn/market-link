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
import java.util.Base64;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailVerificationService implements EmailVerificationServiceInterface {

    public static final String JOB_SEND_CODE = "signup.send-code";

    private static final int TOKEN_BYTES = 32;

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

    public static String normalizeLanguage(String language) {
        if (language == null) return "en";
        String base = language.trim().toLowerCase(Locale.ROOT);
        int dash = base.indexOf('-');
        if (dash > 0) base = base.substring(0, dash);
        return LANGUAGES.contains(base) ? base : "en";
    }

    @Override
    public SignupStartedResource start(PendingSignup form, String signupToken, String clientIp) {
        String email = form.email();
        Optional<PendingSignup> waiting = store.findPending(email);
        long cooldownLeft = store.cooldownSecondsLeft(email);
        if (waiting.isPresent() && holdsToken(waiting.get(), signupToken)) {
            PendingSignup corrected = form.withTokenHash(waiting.get().tokenHash());
            if (cooldownLeft > 0) {
                store.savePending(corrected, pendingTtl());
                long codeLeft = store.codeSecondsLeft(email);
                return new SignupStartedResource(
                        email,
                        codeLeft > 0 ? codeLeft : config.getCodeTtlSeconds(),
                        cooldownLeft,
                        signupToken);
            }
            enforceSendLimits(email, clientIp);
            store.savePending(corrected, pendingTtl());
            queueCode(email);
            return freshStart(email, signupToken);
        }
        if (waiting.isPresent() && cooldownLeft > 0) {
            throw new SignupRateLimitedException(cooldownLeft);
        }
        enforceSendLimits(email, clientIp);
        String token = newToken();
        store.deleteCode(email);
        store.savePending(form.withTokenHash(tokenHashUtil.hash(token)), pendingTtl());
        queueCode(email);
        return freshStart(email, token);
    }

    @Override
    public SignupStartedResource decoy(String email) {
        return freshStart(normalizeEmail(email), newToken());
    }

    @Override
    public SignupStartedResource resend(String email, String signupToken, String clientIp) {
        String normalized = normalizeEmail(email);
        waitingFor(normalized, signupToken);
        long cooldownLeft = store.cooldownSecondsLeft(normalized);
        if (cooldownLeft > 0) throw new SignupRateLimitedException(cooldownLeft);
        enforceSendLimits(normalized, clientIp);
        store.extendPending(normalized, pendingTtl());
        queueCode(normalized);
        return freshStart(normalized, signupToken);
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
    public VerifiedSignup verify(String email, String code, String signupToken) {
        String normalized = normalizeEmail(email);
        PendingSignup pending = waitingFor(normalized, signupToken);
        String expected = store.findCode(normalized).orElseThrow(SignupCodeExpiredException::new);
        int used = store.countAttempt(normalized);
        if (used > config.getMaxAttempts()) {
            store.deleteCode(normalized);
            throw new SignupCodeExpiredException();
        }
        if (!sameHash(expected, hash(normalized, code))) {
            int left = config.getMaxAttempts() - used;
            if (left == 0) store.deleteCode(normalized);
            throw new SignupCodeInvalidException(left);
        }
        long secondsLeft = store.codeSecondsLeft(normalized);
        String taken = store.takeCode(normalized).orElseThrow(SignupCodeExpiredException::new);
        if (!sameHash(taken, expected)) {
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

    String generateCode() {
        return String.format(Locale.ROOT, "%06d", secureRandom.nextInt(1_000_000));
    }

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
        if (store.startCooldown(email, Duration.ofSeconds(config.getResendCooldownSeconds()))) {
            jobQueue.enqueue(JOB_SEND_CODE, Map.of("email", email));
        }
    }

    private PendingSignup waitingFor(String email, String signupToken) {
        return store.findPending(email)
                .filter(pending -> holdsToken(pending, signupToken))
                .orElseThrow(SignupExpiredException::new);
    }

    private boolean holdsToken(PendingSignup pending, String signupToken) {
        return signupToken != null
                && pending.tokenHash() != null
                && sameHash(pending.tokenHash(), tokenHashUtil.hash(signupToken));
    }

    private String newToken() {
        byte[] bytes = new byte[TOKEN_BYTES];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private SignupStartedResource freshStart(String email, String signupToken) {
        return new SignupStartedResource(
                email, config.getCodeTtlSeconds(), config.getResendCooldownSeconds(), signupToken);
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
