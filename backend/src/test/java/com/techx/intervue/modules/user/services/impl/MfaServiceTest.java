package com.techx.intervue.modules.user.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

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
import com.techx.intervue.modules.user.services.interfaces.MfaServiceInterface.PendingLogin;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

class MfaServiceTest {

    private static final long ADMIN_ID = 1L;
    private static final Instant NOW = Instant.parse("2026-09-25T03:00:10Z");

    private final Map<String, String> redis = new HashMap<>();
    private final Map<String, Long> redisTtl = new HashMap<>();
    private final Map<Long, AdminMfa> mfaRows = new HashMap<>();
    private final List<AdminMfaRecoveryCode> codeRows = new ArrayList<>();

    private final SecretCipher cipher =
            new SecretCipher(Base64.getEncoder().encodeToString(new byte[32]));
    private final TokenHashUtil hashUtil = new TokenHashUtil();
    private Clock clock = Clock.fixed(NOW, ZoneOffset.UTC);
    private MfaService service;

    @BeforeEach
    void setUp() {
        service = newService();
    }

    // ---------- bật / tắt ----------

    @Test
    void setupStoresEncryptedSecretThatIsNotYetEnabled() {
        var setup = service.setup(ADMIN_ID, "admin@marketlink.local");

        AdminMfa row = mfaRows.get(ADMIN_ID);
        assertThat(row.isEnabled()).isFalse();
        assertThat(row.getSecretEncrypted()).doesNotContain(setup.secret());
        assertThat(Totp.base32(cipher.decrypt(row.getSecretEncrypted()))).isEqualTo(setup.secret());
        assertThat(setup.otpauthUri())
                .startsWith("otpauth://totp/MarketLink:admin%40marketlink.local?secret=")
                .contains("issuer=MarketLink", "digits=6", "period=30", "algorithm=SHA1");
        assertThat(service.isEnabled(ADMIN_ID)).isFalse();
    }

    @Test
    void enableWithRightCodeTurnsOnAndReturnsTenRecoveryCodes() {
        service.setup(ADMIN_ID, "admin@marketlink.local");

        List<String> codes = service.enable(ADMIN_ID, currentCode());

        assertThat(service.isEnabled(ADMIN_ID)).isTrue();
        assertThat(codes)
                .hasSize(10)
                .allMatch(c -> c.matches("[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}"));
        assertThat(codeRows).hasSize(10).noneMatch(r -> codes.contains(r.getCodeHash()));
        assertThat(service.status(ADMIN_ID).recoveryCodesLeft()).isEqualTo(10);
    }

    @Test
    void enableWithWrongCodeKeepsItOff() {
        service.setup(ADMIN_ID, "admin@marketlink.local");

        assertThatThrownBy(() -> service.enable(ADMIN_ID, wrongCode()))
                .isInstanceOf(MfaCodeInvalidException.class);
        assertThat(service.isEnabled(ADMIN_ID)).isFalse();
    }

    @Test
    void enableWithoutSetupIsRejected() {
        assertThatThrownBy(() -> service.enable(ADMIN_ID, "123456"))
                .isInstanceOf(MfaStateException.class);
    }

    @Test
    void setupWhileEnabledIsRejected() {
        turnOn();
        assertThatThrownBy(() -> service.setup(ADMIN_ID, "admin@marketlink.local"))
                .isInstanceOf(MfaStateException.class);
    }

    @Test
    void disableWithRightCodeRemovesSecretAndRecoveryCodes() {
        turnOn();
        advance(Duration.ofSeconds(30));

        service.disable(ADMIN_ID, currentCode());

        assertThat(service.isEnabled(ADMIN_ID)).isFalse();
        assertThat(mfaRows).isEmpty();
        assertThat(codeRows).isEmpty();
    }

    @Test
    void regenerateRecoveryCodesReplacesTheOldOnes() {
        List<String> old = turnOn();
        advance(Duration.ofSeconds(30));

        List<String> fresh = service.regenerateRecoveryCodes(ADMIN_ID, currentCode());

        assertThat(fresh).hasSize(10).doesNotContainAnyElementsOf(old);
        assertThat(service.status(ADMIN_ID).recoveryCodesLeft()).isEqualTo(10);
        String token = service.startChallenge(ADMIN_ID, true);
        assertThatThrownBy(() -> service.verifyChallenge(token, null, old.get(0)))
                .isInstanceOf(MfaCodeInvalidException.class);
    }

    @Test
    void regenerateRecoveryCodesNeedsTheRightCode() {
        List<String> old = turnOn();
        advance(Duration.ofSeconds(30));

        assertThatThrownBy(() -> service.regenerateRecoveryCodes(ADMIN_ID, wrongCode()))
                .isInstanceOf(MfaCodeInvalidException.class);
        assertThat(service.status(ADMIN_ID).recoveryCodesLeft()).isEqualTo(old.size());
    }

    @Test
    void turningOnAgainRightAfterTurningOffAcceptsTheNewKeysCode() {
        turnOn();
        advance(Duration.ofSeconds(30));
        service.disable(ADMIN_ID, currentCode());

        // cùng bước 30 giây, khoá mới → mã khác, không được coi là dùng lại
        service.setup(ADMIN_ID, "admin@marketlink.local");
        assertThat(service.enable(ADMIN_ID, currentCode())).hasSize(10);
    }

    // ---------- đăng nhập bước 2 ----------

    @Test
    void rightCodeCompletesPendingLoginOnce() {
        turnOn();
        advance(Duration.ofSeconds(30));
        String token = service.startChallenge(ADMIN_ID, false);

        PendingLogin login = service.verifyChallenge(token, currentCode(), null);

        assertThat(login).isEqualTo(new PendingLogin(ADMIN_ID, false));
        // token chờ chỉ dùng được một lần
        assertThatThrownBy(() -> service.verifyChallenge(token, currentCode(), null))
                .isInstanceOf(MfaTokenInvalidException.class);
    }

    @Test
    void pendingTokenIsStoredHashedWithFiveMinuteTtl() {
        turnOn();
        String token = service.startChallenge(ADMIN_ID, true);

        String key = "mfa:pending:" + hashUtil.hash(token);
        assertThat(redis).containsKey(key).doesNotContainKey("mfa:pending:" + token);
        assertThat(redisTtl.get(key)).isEqualTo(300L);
    }

    @Test
    void unknownTokenIsRejected() {
        assertThatThrownBy(() -> service.verifyChallenge("nope", "123456", null))
                .isInstanceOf(MfaTokenInvalidException.class);
    }

    @Test
    void codeAlreadyUsedCannotBeReplayed() {
        turnOn(); // mã hiện tại đã dùng để bật
        String token = service.startChallenge(ADMIN_ID, true);

        assertThatThrownBy(() -> service.verifyChallenge(token, currentCode(), null))
                .isInstanceOf(MfaCodeInvalidException.class);
    }

    @Test
    void wrongCodeReportsAttemptsLeftAndKeepsTokenUsable() {
        turnOn();
        advance(Duration.ofSeconds(30));
        String token = service.startChallenge(ADMIN_ID, true);

        assertThatThrownBy(() -> service.verifyChallenge(token, wrongCode(), null))
                .isInstanceOfSatisfying(
                        MfaCodeInvalidException.class,
                        e -> assertThat(e.getAttemptsLeft()).isEqualTo(4));
        assertThat(service.verifyChallenge(token, currentCode(), null).userId())
                .isEqualTo(ADMIN_ID);
    }

    @Test
    void fifthWrongCodeLocksTheAccountForFifteenMinutes() {
        turnOn();
        advance(Duration.ofSeconds(30));
        String token = service.startChallenge(ADMIN_ID, true);
        for (int i = 0; i < 4; i++) {
            assertThatThrownBy(() -> service.verifyChallenge(token, wrongCode(), null))
                    .isInstanceOf(MfaCodeInvalidException.class);
        }

        assertThatThrownBy(() -> service.verifyChallenge(token, wrongCode(), null))
                .isInstanceOfSatisfying(
                        MfaLockedException.class,
                        e -> assertThat(e.getRetryAfterSeconds()).isEqualTo(900));
        // bị khoá thì mã đúng cũng không qua
        assertThatThrownBy(() -> service.verifyChallenge(token, currentCode(), null))
                .isInstanceOf(MfaLockedException.class);
    }

    @Test
    void recoveryCodeWorksOnceAndIgnoresCaseAndDashes() {
        List<String> codes = turnOn();
        String code = codes.get(0);

        String token = service.startChallenge(ADMIN_ID, true);
        String typed = code.toUpperCase().replace("-", " ");
        assertThat(service.verifyChallenge(token, null, typed).userId()).isEqualTo(ADMIN_ID);
        assertThat(service.status(ADMIN_ID).recoveryCodesLeft()).isEqualTo(9);

        String again = service.startChallenge(ADMIN_ID, true);
        assertThatThrownBy(() -> service.verifyChallenge(again, null, code))
                .isInstanceOf(MfaCodeInvalidException.class);
    }

    // ---------- helpers ----------

    private List<String> turnOn() {
        service.setup(ADMIN_ID, "admin@marketlink.local");
        return service.enable(ADMIN_ID, currentCode());
    }

    private String currentCode() {
        byte[] secret = cipher.decrypt(mfaRows.get(ADMIN_ID).getSecretEncrypted());
        return Totp.code(secret, Totp.stepAt(clock.instant()));
    }

    private String wrongCode() {
        String right = currentCode();
        return right.equals("000000") ? "111111" : "000000";
    }

    private void advance(Duration by) {
        clock = Clock.fixed(clock.instant().plus(by), ZoneOffset.UTC);
        service = newService();
    }

    private MfaService newService() {
        MfaConfig config = mock(MfaConfig.class);
        when(config.getIssuer()).thenReturn("MarketLink");
        when(config.getPendingTtlSeconds()).thenReturn(300L);
        when(config.getMaxAttempts()).thenReturn(5);
        when(config.getLockSeconds()).thenReturn(900L);
        return new MfaService(
                fakeMfaRepository(),
                fakeCodeRepository(),
                fakeRedis(),
                cipher,
                hashUtil,
                config,
                clock);
    }

    @SuppressWarnings("unchecked")
    private StringRedisTemplate fakeRedis() {
        StringRedisTemplate template = mock(StringRedisTemplate.class);
        ValueOperations<String, String> ops = mock(ValueOperations.class);
        when(template.opsForValue()).thenReturn(ops);
        when(ops.get(anyString())).thenAnswer(i -> redis.get((String) i.getArgument(0)));
        when(ops.getAndDelete(anyString()))
                .thenAnswer(i -> redis.remove((String) i.getArgument(0)));
        org.mockito.Mockito.doAnswer(
                        i -> {
                            redis.put(i.getArgument(0), i.getArgument(1));
                            redisTtl.put(
                                    i.getArgument(0), ((Duration) i.getArgument(2)).toSeconds());
                            return null;
                        })
                .when(ops)
                .set(anyString(), anyString(), any(Duration.class));
        when(ops.setIfAbsent(anyString(), anyString(), any(Duration.class)))
                .thenAnswer(i -> redis.putIfAbsent(i.getArgument(0), i.getArgument(1)) == null);
        when(ops.increment(anyString()))
                .thenAnswer(
                        i ->
                                Long.parseLong(
                                        redis.merge(
                                                i.getArgument(0),
                                                "1",
                                                (a, b) -> String.valueOf(Long.parseLong(a) + 1))));
        when(template.expire(anyString(), any(Duration.class)))
                .thenAnswer(
                        i -> {
                            redisTtl.put(
                                    i.getArgument(0), ((Duration) i.getArgument(1)).toSeconds());
                            return true;
                        });
        when(template.getExpire(anyString(), any(TimeUnit.class)))
                .thenAnswer(i -> redisTtl.getOrDefault((String) i.getArgument(0), -2L));
        when(template.delete(anyString()))
                .thenAnswer(i -> redis.remove((String) i.getArgument(0)) != null);
        return template;
    }

    private AdminMfaRepository fakeMfaRepository() {
        AdminMfaRepository repo = mock(AdminMfaRepository.class);
        when(repo.findById(anyLong()))
                .thenAnswer(i -> Optional.ofNullable(mfaRows.get(i.getArgument(0))));
        when(repo.existsByUserIdAndEnabledAtIsNotNull(anyLong()))
                .thenAnswer(
                        i -> {
                            AdminMfa row = mfaRows.get((Long) i.getArgument(0));
                            return row != null && row.isEnabled();
                        });
        when(repo.save(any(AdminMfa.class)))
                .thenAnswer(
                        i -> {
                            AdminMfa row = i.getArgument(0);
                            mfaRows.put(row.getUserId(), row);
                            return row;
                        });
        org.mockito.Mockito.doAnswer(i -> mfaRows.remove((Long) i.getArgument(0)))
                .when(repo)
                .deleteById(anyLong());
        return repo;
    }

    private AdminMfaRecoveryCodeRepository fakeCodeRepository() {
        AdminMfaRecoveryCodeRepository repo = mock(AdminMfaRecoveryCodeRepository.class);
        when(repo.findByUserIdAndCodeHashAndUsedAtIsNull(anyLong(), anyString()))
                .thenAnswer(
                        i ->
                                codeRows.stream()
                                        .filter(
                                                r ->
                                                        r.getUserId().equals(i.getArgument(0))
                                                                && r.getCodeHash()
                                                                        .equals(i.getArgument(1))
                                                                && r.getUsedAt() == null)
                                        .findFirst());
        when(repo.countByUserIdAndUsedAtIsNull(anyLong()))
                .thenAnswer(
                        i ->
                                codeRows.stream()
                                        .filter(
                                                r ->
                                                        r.getUserId().equals(i.getArgument(0))
                                                                && r.getUsedAt() == null)
                                        .count());
        when(repo.saveAll(any()))
                .thenAnswer(
                        i -> {
                            Iterable<AdminMfaRecoveryCode> rows = i.getArgument(0);
                            rows.forEach(codeRows::add);
                            return rows;
                        });
        when(repo.save(any(AdminMfaRecoveryCode.class))).thenAnswer(i -> i.getArgument(0));
        org.mockito.Mockito.doAnswer(
                        i -> codeRows.removeIf(r -> r.getUserId().equals(i.getArgument(0))))
                .when(repo)
                .deleteAllByUserId(anyLong());
        return repo;
    }
}
