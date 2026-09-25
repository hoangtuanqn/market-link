package com.techx.intervue.modules.user.services.impl;

import com.techx.intervue.config.MfaConfig;
import com.techx.intervue.helpers.SecretCipher;
import com.techx.intervue.helpers.TokenHashUtil;
import com.techx.intervue.helpers.Totp;
import com.techx.intervue.modules.user.entities.AdminMfa;
import com.techx.intervue.modules.user.entities.AdminMfaRecoveryCode;
import com.techx.intervue.modules.user.exceptions.MfaCodeInvalidException;
import com.techx.intervue.modules.user.exceptions.MfaLockedException;
import com.techx.intervue.modules.user.exceptions.MfaStateException;
import com.techx.intervue.modules.user.exceptions.MfaTokenInvalidException;
import com.techx.intervue.modules.user.repositories.AdminMfaRecoveryCodeRepository;
import com.techx.intervue.modules.user.repositories.AdminMfaRepository;
import com.techx.intervue.modules.user.resources.MfaSetupResource;
import com.techx.intervue.modules.user.resources.MfaStatusResource;
import com.techx.intervue.modules.user.services.interfaces.MfaServiceInterface;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.OptionalLong;
import java.util.concurrent.TimeUnit;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * FR-008: xác thực hai bước TOTP cho admin.
 *
 * <ul>
 *   <li>Bước mật khẩu không cấp phiên: chỉ lưu token chờ (băm SHA-256) trong Redis 5 phút.
 *   <li>Chặn dùng lại mã: chỉ nhận bước 30 giây lớn hơn {@code last_used_step}, thêm khoá SETNX
 *       trong Redis để hai request song song cùng mã không cùng qua.
 *   <li>Sai quá {@code max-attempts} lần trong {@code lock-seconds} → khoá, kể cả mã đúng.
 * </ul>
 */
@Service
public class MfaService implements MfaServiceInterface {

    private static final String PENDING_PREFIX = "mfa:pending:";
    private static final String FAIL_PREFIX = "mfa:fail:";
    private static final String USED_PREFIX = "mfa:used:";

    private static final int SECRET_BYTES = 20; // 160 bit, khuyến nghị của RFC 4226
    private static final int TOKEN_BYTES = 32;
    private static final int RECOVERY_CODE_COUNT = 10;
    private static final int RECOVERY_CODE_LENGTH = 12;
    // bỏ 0/o, 1/l/i để đọc chép không nhầm
    private static final char[] RECOVERY_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789".toCharArray();
    private static final SecureRandom RANDOM = new SecureRandom();

    private final AdminMfaRepository mfaRepository;
    private final AdminMfaRecoveryCodeRepository recoveryCodeRepository;
    private final StringRedisTemplate redis;
    private final SecretCipher cipher;
    private final TokenHashUtil tokenHashUtil;
    private final MfaConfig config;
    private final Clock clock;

    @Autowired
    public MfaService(
            AdminMfaRepository mfaRepository,
            AdminMfaRecoveryCodeRepository recoveryCodeRepository,
            StringRedisTemplate redis,
            @Qualifier("mfaSecretCipher") SecretCipher cipher,
            TokenHashUtil tokenHashUtil,
            MfaConfig config) {
        // TOTP tính theo epoch nên dùng UTC; không đăng ký bean Clock vì đã có chatClock
        this(
                mfaRepository,
                recoveryCodeRepository,
                redis,
                cipher,
                tokenHashUtil,
                config,
                Clock.systemUTC());
    }

    /** Test truyền đồng hồ cố định để kiểm tra bước 30 giây. */
    MfaService(
            AdminMfaRepository mfaRepository,
            AdminMfaRecoveryCodeRepository recoveryCodeRepository,
            StringRedisTemplate redis,
            SecretCipher cipher,
            TokenHashUtil tokenHashUtil,
            MfaConfig config,
            Clock clock) {
        this.mfaRepository = mfaRepository;
        this.recoveryCodeRepository = recoveryCodeRepository;
        this.redis = redis;
        this.cipher = cipher;
        this.tokenHashUtil = tokenHashUtil;
        this.config = config;
        this.clock = clock;
    }

    @Override
    public boolean isEnabled(Long userId) {
        return mfaRepository.existsByUserIdAndEnabledAtIsNotNull(userId);
    }

    @Override
    public String startChallenge(Long userId, boolean rememberMe) {
        byte[] raw = new byte[TOKEN_BYTES];
        RANDOM.nextBytes(raw);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
        redis.opsForValue()
                .set(
                        pendingKey(token),
                        userId + ":" + rememberMe,
                        Duration.ofSeconds(config.getPendingTtlSeconds()));
        return token;
    }

    @Override
    @Transactional
    public PendingLogin verifyChallenge(String mfaToken, String code, String recoveryCode) {
        String pending =
                StringUtils.hasText(mfaToken)
                        ? redis.opsForValue().get(pendingKey(mfaToken))
                        : null;
        if (pending == null) {
            throw new MfaTokenInvalidException();
        }
        int sep = pending.indexOf(':');
        Long userId = Long.valueOf(pending.substring(0, sep));
        boolean rememberMe = Boolean.parseBoolean(pending.substring(sep + 1));

        ensureNotLocked(userId);
        boolean ok =
                StringUtils.hasText(recoveryCode)
                        ? consumeRecoveryCode(userId, recoveryCode)
                        : consumeTotp(enabledMfa(userId), code);
        if (!ok) {
            throw registerFailure(userId);
        }
        // token chờ chỉ dùng một lần; getAndDelete để hai request cùng token không cùng qua
        if (redis.opsForValue().getAndDelete(pendingKey(mfaToken)) == null) {
            throw new MfaTokenInvalidException();
        }
        redis.delete(FAIL_PREFIX + userId);
        return new PendingLogin(userId, rememberMe);
    }

    @Override
    public MfaStatusResource status(Long userId) {
        boolean enabled = isEnabled(userId);
        long left = enabled ? recoveryCodeRepository.countByUserIdAndUsedAtIsNull(userId) : 0;
        return new MfaStatusResource(enabled, left);
    }

    @Override
    @Transactional
    public MfaSetupResource setup(Long userId, String email) {
        AdminMfa row = mfaRepository.findById(userId).orElse(null);
        if (row != null && row.isEnabled()) {
            throw new MfaStateException(
                    "Two-step verification is already on. Turn it off before setting it up again.");
        }
        byte[] secret = new byte[SECRET_BYTES];
        RANDOM.nextBytes(secret);
        if (row == null) {
            row = AdminMfa.builder().userId(userId).build();
        }
        row.setSecretEncrypted(cipher.encrypt(secret));
        row.setLastUsedStep(null);
        mfaRepository.save(row);

        String base32 = Totp.base32(secret);
        return new MfaSetupResource(base32, otpauthUri(email, base32));
    }

    @Override
    @Transactional
    public List<String> enable(Long userId, String code) {
        AdminMfa row =
                mfaRepository
                        .findById(userId)
                        .orElseThrow(
                                () ->
                                        new MfaStateException(
                                                "Start the set-up first to get a new key."));
        if (row.isEnabled()) {
            throw new MfaStateException("Two-step verification is already on.");
        }
        ensureNotLocked(userId);
        if (!consumeTotp(row, code)) {
            throw registerFailure(userId);
        }
        row.setEnabledAt(clock.instant());
        mfaRepository.save(row);
        redis.delete(FAIL_PREFIX + userId);
        return issueRecoveryCodes(userId);
    }

    @Override
    @Transactional
    public void disable(Long userId, String code) {
        AdminMfa row = enabledMfa(userId);
        ensureNotLocked(userId);
        if (!consumeTotp(row, code)) {
            throw registerFailure(userId);
        }
        recoveryCodeRepository.deleteAllByUserId(userId);
        mfaRepository.deleteById(userId);
        redis.delete(FAIL_PREFIX + userId);
    }

    @Override
    @Transactional
    public List<String> regenerateRecoveryCodes(Long userId, String code) {
        AdminMfa row = enabledMfa(userId);
        ensureNotLocked(userId);
        if (!consumeTotp(row, code)) {
            throw registerFailure(userId);
        }
        redis.delete(FAIL_PREFIX + userId);
        return issueRecoveryCodes(userId);
    }

    private AdminMfa enabledMfa(Long userId) {
        return mfaRepository
                .findById(userId)
                .filter(AdminMfa::isEnabled)
                .orElseThrow(() -> new MfaStateException("Two-step verification is not on."));
    }

    /** Mã đúng và chưa dùng → ghi lại bước đã dùng. */
    private boolean consumeTotp(AdminMfa row, String code) {
        OptionalLong step =
                Totp.match(cipher.decrypt(row.getSecretEncrypted()), code, clock.instant());
        if (step.isEmpty()) {
            return false;
        }
        long matched = step.getAsLong();
        if (row.getLastUsedStep() != null && matched <= row.getLastUsedStep()) {
            return false;
        }
        Boolean first =
                redis.opsForValue()
                        .setIfAbsent(
                                // gắn cả mã: tắt rồi bật lại với khoá mới trong cùng bước thì mã
                                // khác, không bị coi là dùng lại
                                USED_PREFIX + row.getUserId() + ":" + matched + ":" + code,
                                "1",
                                Duration.ofSeconds(Totp.PERIOD_SECONDS * 3L));
        if (!Boolean.TRUE.equals(first)) {
            return false;
        }
        row.setLastUsedStep(matched);
        mfaRepository.save(row);
        return true;
    }

    private boolean consumeRecoveryCode(Long userId, String typed) {
        String normalized = normalizeRecoveryCode(typed);
        if (normalized.length() != RECOVERY_CODE_LENGTH) {
            return false;
        }
        return recoveryCodeRepository
                .findByUserIdAndCodeHashAndUsedAtIsNull(userId, tokenHashUtil.hash(normalized))
                .map(
                        row -> {
                            row.setUsedAt(clock.instant());
                            recoveryCodeRepository.save(row);
                            return true;
                        })
                .orElse(false);
    }

    private List<String> issueRecoveryCodes(Long userId) {
        recoveryCodeRepository.deleteAllByUserId(userId);
        List<String> codes = new ArrayList<>(RECOVERY_CODE_COUNT);
        List<AdminMfaRecoveryCode> rows = new ArrayList<>(RECOVERY_CODE_COUNT);
        for (int i = 0; i < RECOVERY_CODE_COUNT; i++) {
            StringBuilder raw = new StringBuilder(RECOVERY_CODE_LENGTH);
            for (int j = 0; j < RECOVERY_CODE_LENGTH; j++) {
                raw.append(RECOVERY_ALPHABET[RANDOM.nextInt(RECOVERY_ALPHABET.length)]);
            }
            String code = raw.toString();
            codes.add(code.substring(0, 4) + "-" + code.substring(4, 8) + "-" + code.substring(8));
            rows.add(
                    AdminMfaRecoveryCode.builder()
                            .userId(userId)
                            .codeHash(tokenHashUtil.hash(code))
                            .build());
        }
        recoveryCodeRepository.saveAll(rows);
        return codes;
    }

    private void ensureNotLocked(Long userId) {
        String count = redis.opsForValue().get(FAIL_PREFIX + userId);
        if (count != null && Long.parseLong(count) >= config.getMaxAttempts()) {
            throw new MfaLockedException(remainingLock(userId));
        }
    }

    /**
     * Tăng số lần sai; lần đầu đặt TTL = thời gian khoá (INCR + EXPIRE như PasswordResetService).
     */
    private RuntimeException registerFailure(Long userId) {
        String key = FAIL_PREFIX + userId;
        Long count = redis.opsForValue().increment(key);
        long attempts = count == null ? 1 : count;
        if (attempts == 1) {
            redis.expire(key, Duration.ofSeconds(config.getLockSeconds()));
        }
        if (attempts >= config.getMaxAttempts()) {
            // khoá tính từ lần sai cuối cùng
            redis.expire(key, Duration.ofSeconds(config.getLockSeconds()));
            return new MfaLockedException(config.getLockSeconds());
        }
        return new MfaCodeInvalidException((int) (config.getMaxAttempts() - attempts));
    }

    private long remainingLock(Long userId) {
        Long ttl = redis.getExpire(FAIL_PREFIX + userId, TimeUnit.SECONDS);
        return ttl == null || ttl < 0 ? config.getLockSeconds() : ttl;
    }

    private String pendingKey(String token) {
        return PENDING_PREFIX + tokenHashUtil.hash(token);
    }

    private String otpauthUri(String email, String base32) {
        String issuer = encode(config.getIssuer());
        return "otpauth://totp/"
                + issuer
                + ":"
                + encode(email)
                + "?secret="
                + base32
                + "&issuer="
                + issuer
                + "&algorithm=SHA1&digits="
                + Totp.DIGITS
                + "&period="
                + Totp.PERIOD_SECONDS;
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+", "%20");
    }

    private static String normalizeRecoveryCode(String typed) {
        return typed.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
    }
}
