package com.techx.intervue.modules.user.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.techx.intervue.config.EmailVerificationConfig;
import com.techx.intervue.helpers.TokenHashUtil;
import com.techx.intervue.modules.geo.entities.AddressColumns;
import com.techx.intervue.modules.user.exceptions.SignupCodeExpiredException;
import com.techx.intervue.modules.user.exceptions.SignupCodeInvalidException;
import com.techx.intervue.modules.user.exceptions.SignupExpiredException;
import com.techx.intervue.modules.user.exceptions.SignupRateLimitedException;
import com.techx.intervue.modules.user.resources.PendingSignup;
import com.techx.intervue.modules.user.resources.SignupStartedResource;
import com.techx.intervue.modules.user.resources.VerifiedSignup;
import com.techx.intervue.services.interfaces.JobQueueInterface;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class EmailVerificationServiceTest {

    private static final String EMAIL = "lan@example.com";
    private static final String IP = "203.0.113.9";

    private InMemorySignupStore store;
    private JobQueueInterface jobQueue;
    private EmailVerificationService service;

    @BeforeEach
    void setUp() {
        store = new InMemorySignupStore();
        jobQueue = mock(JobQueueInterface.class);
        EmailVerificationConfig config = mock(EmailVerificationConfig.class);
        when(config.getCodeTtlSeconds()).thenReturn(600L);
        when(config.getPendingTtlSeconds()).thenReturn(1800L);
        when(config.getResendCooldownSeconds()).thenReturn(60L);
        when(config.getMaxAttempts()).thenReturn(5);
        when(config.getMaxSendsPerEmail()).thenReturn(5L);
        when(config.getMaxSendsPerIp()).thenReturn(20L);
        when(config.getWindowSeconds()).thenReturn(3600L);
        service = new EmailVerificationService(store, new TokenHashUtil(), jobQueue, config);
    }

    private static PendingSignup pending(String email, String name) {
        return new PendingSignup(
                name,
                email,
                "0900000002",
                "12 Lê Lợi, Phường Bến Thành, Thành phố Hồ Chí Minh",
                new AddressColumns("VN", "79", "26743", "Lê Lợi", "12", null, null),
                "bcrypt",
                "vi");
    }

    /** What the worker would put in the mail. */
    private String mailedCode(String email) {
        return service.issueCode(email).orElseThrow().code();
    }

    private static String wrong(String code) {
        return code.equals("000000") ? "111111" : "000000";
    }

    @Test
    void startParksTheFormAndQueuesTheMail() {
        SignupStartedResource started = service.start(pending(EMAIL, "Lan"), IP);

        assertThat(started).isEqualTo(new SignupStartedResource(EMAIL, 600, 60));
        assertThat(store.pending).containsKey(EMAIL);
        verify(jobQueue).enqueue(EmailVerificationService.JOB_SEND_CODE, Map.of("email", EMAIL));
    }

    /** Review Focus #4. */
    @Test
    void aSecondSubmitDuringTheCooldownUpdatesWithoutANewMail() {
        service.start(pending(EMAIL, "Lan"), IP);

        SignupStartedResource again = service.start(pending(EMAIL, "Lan Nguyen"), IP);

        verify(jobQueue, times(1))
                .enqueue(EmailVerificationService.JOB_SEND_CODE, Map.of("email", EMAIL));
        assertThat(store.pending.get(EMAIL).fullName()).isEqualTo("Lan Nguyen");
        assertThat(again.resendAvailableInSeconds()).isEqualTo(60);
    }

    /** Review Focus #3. */
    @Test
    void theRightCodeIsUsedOnceOnly() {
        service.start(pending(EMAIL, "Lan"), IP);
        String code = mailedCode(EMAIL);

        VerifiedSignup verified = service.verify(EMAIL, code);

        assertThat(verified.pending().fullName()).isEqualTo("Lan");
        assertThat(
                        catchThrowableOfType(
                                SignupCodeExpiredException.class,
                                () -> service.verify(EMAIL, code)))
                .isNotNull();
    }

    /** Review Focus #1. */
    @Test
    void emailCaseAndSpacesDoNotMatter() {
        service.start(pending(EMAIL, "Lan"), IP);
        String code = mailedCode(" LAN@example.com");

        assertThat(service.verify("  Lan@Example.COM ", code).pending().email()).isEqualTo(EMAIL);
    }

    /** Review Focus #2. */
    @Test
    void codesKeepTheirLeadingZeros() {
        for (int i = 0; i < 2000; i++) assertThat(service.generateCode()).matches("\\d{6}");

        EmailVerificationService zeros = spy(service);
        doReturn("004821").when(zeros).generateCode();
        zeros.start(pending(EMAIL, "Lan"), IP);
        assertThat(zeros.issueCode(EMAIL).orElseThrow().code()).isEqualTo("004821");
        assertThat(zeros.verify(EMAIL, "004821")).isNotNull();
    }

    @Test
    void aWrongCodeSaysHowManyTriesAreLeft() {
        service.start(pending(EMAIL, "Lan"), IP);
        String code = mailedCode(EMAIL);

        SignupCodeInvalidException e =
                catchThrowableOfType(
                        SignupCodeInvalidException.class, () -> service.verify(EMAIL, wrong(code)));

        assertThat(e.getAttemptsLeft()).isEqualTo(4);
    }

    @Test
    void theFifthWrongCodeThrowsTheCodeAway() {
        service.start(pending(EMAIL, "Lan"), IP);
        String code = mailedCode(EMAIL);
        for (int left = 4; left >= 0; left--) {
            SignupCodeInvalidException e =
                    catchThrowableOfType(
                            SignupCodeInvalidException.class,
                            () -> service.verify(EMAIL, wrong(code)));
            assertThat(e.getAttemptsLeft()).isEqualTo(left);
        }

        assertThat(
                        catchThrowableOfType(
                                SignupCodeExpiredException.class,
                                () -> service.verify(EMAIL, code)))
                .isNotNull();
    }

    @Test
    void anExpiredCodeAsksForANewOne() {
        service.start(pending(EMAIL, "Lan"), IP);
        String code = mailedCode(EMAIL);
        store.expireCode(EMAIL);

        assertThat(
                        catchThrowableOfType(
                                SignupCodeExpiredException.class,
                                () -> service.verify(EMAIL, code)))
                .isNotNull();
    }

    @Test
    void anExpiredSignUpAsksToStartAgain() {
        assertThat(
                        catchThrowableOfType(
                                SignupExpiredException.class,
                                () -> service.verify(EMAIL, "123456")))
                .isNotNull();
        assertThat(
                        catchThrowableOfType(
                                SignupExpiredException.class, () -> service.resend(EMAIL, IP)))
                .isNotNull();
    }

    @Test
    void resendDuringTheCooldownGivesTheSecondsLeft() {
        service.start(pending(EMAIL, "Lan"), IP);

        SignupRateLimitedException e =
                catchThrowableOfType(
                        SignupRateLimitedException.class, () -> service.resend(EMAIL, IP));

        assertThat(e.getRetryAfterSeconds()).isEqualTo(60);
    }

    @Test
    void aNewCodeReplacesTheOldOneAndResetsTheTries() {
        service.start(pending(EMAIL, "Lan"), IP);
        String old = mailedCode(EMAIL);
        catchThrowableOfType(
                SignupCodeInvalidException.class, () -> service.verify(EMAIL, wrong(old)));
        store.expireCooldown(EMAIL);

        service.resend(EMAIL, IP);
        String fresh = mailedCode(EMAIL);

        if (!fresh.equals(old)) {
            SignupCodeInvalidException e =
                    catchThrowableOfType(
                            SignupCodeInvalidException.class, () -> service.verify(EMAIL, old));
            assertThat(e.getAttemptsLeft()).isEqualTo(4);
        }
        assertThat(service.verify(EMAIL, fresh)).isNotNull();
    }

    @Test
    void theSixthCodeToOneAddressInAnHourIsRefused() {
        service.start(pending(EMAIL, "Lan"), IP);
        for (int i = 0; i < 4; i++) {
            store.expireCooldown(EMAIL);
            service.resend(EMAIL, IP);
        }
        store.expireCooldown(EMAIL);

        SignupRateLimitedException e =
                catchThrowableOfType(
                        SignupRateLimitedException.class, () -> service.resend(EMAIL, IP));

        assertThat(e.getRetryAfterSeconds()).isEqualTo(3600);
    }

    @Test
    void oneIpCannotMailTwentyOneAddresses() {
        for (int i = 0; i < 20; i++) service.start(pending("user" + i + "@example.com", "U"), IP);

        assertThat(
                        catchThrowableOfType(
                                SignupRateLimitedException.class,
                                () -> service.start(pending("user20@example.com", "U"), IP)))
                .isNotNull();
        assertThat(store.pending).doesNotContainKey("user20@example.com");
    }

    @Test
    void theDecoyAnswersLikeARealStartAndDoesNothing() {
        assertThat(service.decoy(" Lan@Example.com"))
                .isEqualTo(new SignupStartedResource(EMAIL, 600, 60));
        assertThat(store.pending).isEmpty();
        verifyNoInteractions(jobQueue);
    }

    @Test
    void restoreGivesTheCodeBackAfterAFailedSave() {
        service.start(pending(EMAIL, "Lan"), IP);
        String code = mailedCode(EMAIL);
        VerifiedSignup verified = service.verify(EMAIL, code);

        service.restore(verified);

        assertThat(service.verify(EMAIL, code)).isNotNull();
    }

    @Test
    void discardForgetsEverything() {
        service.start(pending(EMAIL, "Lan"), IP);
        mailedCode(EMAIL);

        service.discard(EMAIL);

        assertThat(store.pending).isEmpty();
        assertThat(store.codes).isEmpty();
        assertThat(store.cooldowns).isEmpty();
    }

    @Test
    void languagesOutsideTheTenFallBackToEnglish() {
        assertThat(EmailVerificationService.normalizeLanguage("fr-CA")).isEqualTo("fr");
        assertThat(EmailVerificationService.normalizeLanguage("VI")).isEqualTo("vi");
        assertThat(EmailVerificationService.normalizeLanguage("pt")).isEqualTo("en");
        assertThat(EmailVerificationService.normalizeLanguage(null)).isEqualTo("en");
    }
}
