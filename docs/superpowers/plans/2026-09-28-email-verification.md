# Email Verification at Sign-up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A customer account is only created after the person types the 6-digit code mailed to the address they
signed up with, with anti-spam limits, a localized code email in the project's style, a verify screen built from the
design system, and the prototype updated to match.

**Architecture:** `POST /auth/register` validates the form and parks it in Redis (`signup:pending:{email}`) behind a
`SignupStoreInterface`; `EmailVerificationService` owns every rule (cooldown, hourly caps, attempts, single use) and a
Redis-queue job generates the code, stores only its SHA-256 and mails it through `MailTemplates` + a new
`i18n/mail*.properties` bundle. `POST /auth/register/verify` turns the parked form into a `users` row and signs in
exactly like the old register did. The frontend adds a `CodeInput` component and a `/register/verify` screen.

**Tech Stack:** Spring Boot 4.1 / Java 25, Redis (`StringRedisTemplate`), Jackson 2, JavaMailSender, JUnit 5 +
Mockito + AssertJ · React 19, TypeScript, Tailwind 4, react-i18next (10 locales), vitest + Testing Library · static
HTML prototype.

**Spec:** `docs/superpowers/specs/2026-09-28-email-verification-design.md`

**Execution mode:** Native. LEAD said "lập plan rồi làm luôn": implement task by task in this session, commit after
each task, then one fresh whole-branch review before the PR.

## Global Constraints

- Work only in the worktree `techwiz7/market-link-otp`, branch `feature/FR-009-email-verification`. Never commit to
  `dev`/`main` (R-08).
- Code comments 100% English (R-09). Commit messages and PR text 100% English, `feat(FR-009): …` (R-10), ending with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Numbers (spec §5): code 6 digits `000000`–`999999`; code TTL 600 s; pending TTL 1800 s; resend cooldown 60 s;
  5 wrong tries per code; 5 sends per email per hour; 20 sends per IP per hour; window 3600 s.
- Error codes (spec §4.4): `SIGNUP_CODE_INVALID` 400 (details: `code` message + `attemptsLeft` as a number string),
  `SIGNUP_CODE_EXPIRED` 400, `SIGNUP_EXPIRED` 410, `RATE_LIMITED` 429 with `Retry-After` seconds.
- Redis keys (spec §3): `signup:pending:`, `signup:code:`, `signup:attempts:`, `signup:cooldown:`,
  `ratelimit:signup:`, `ratelimit:signup-ip:` + normalized email / IP. The raw code never goes into Redis.
- Emails are `trim().toLowerCase(Locale.ROOT)` everywhere before use as a key.
- Languages: `en vi zh ja ko fr es de th id`; anything else → `en`.
- UI: colour through tokens only, spacing tokens only (`p-1/2/3/4/6/8/12/16`, gaps likewise), copy in
  `src/locales/<lang>/*.json`, sentence case, no emoji, no `!`, a disabled button says why. Hex colours are allowed
  only inside `backend/src/main/resources/mail/*.html`.
- Host has JDK 21 and no full `node_modules`: run backend and frontend checks in the project's Docker images
  (commands below). Formatter: Spotless AOSP for Java, Prettier for the frontend.

### Commands used by every task

Run from the worktree root `…/techwiz7/market-link-otp`.

```bash
# Backend tests (one or more classes) + formatter
docker run --rm -m 2g -v "$PWD/backend:/app" -v market-link_m2-cache:/root/.m2 -w /app \
  --entrypoint sh market-link-backend:dev -c './mvnw -B -q spotless:apply && ./mvnw -B -q test -Dtest=<Classes>'

# Frontend checks (vitest file list optional)
docker run --rm -m 3g -v "$PWD/frontend:/work" --entrypoint sh market-link-frontend:dev -c \
  "cd /work && ln -sfn /app/node_modules node_modules && npx prettier --write <files> && npx eslint <files> && npx vitest run <tests>; rm -f node_modules"

# Commit: lefthook runs Prettier on the host, so lend it node_modules for the commit only
ln -sfn ../../market-link/frontend/node_modules frontend/node_modules
git add <files> && git commit -F <msgfile>
/bin/rm -f frontend/node_modules
```

If lefthook's `backend-format` (host `./mvnw spotless:apply`) cannot run on the host JDK, the same formatter has
already run in the container; commit with `LEFTHOOK_EXCLUDE=backend-format git commit …` for that commit only.

## Review Focus

1. **Email typed differently at each step** (`" Lan@Example.COM "` on the form, `lan@example.com` on resend/verify)
   must reach the same pending sign-up. Pinned in Task 4 (`emailCaseAndSpacesDoNotMatter`).
2. **Codes with leading zeros** (`004821`) must be generated as 6 characters, mailed as 6 characters and accepted.
   Pinned in Task 4 (`codesKeepTheirLeadingZeros`) and Task 5 (mail test uses `004821`).
3. **The right code sent twice** (double click, two tabs) creates one account; the second call gets
   `SIGNUP_CODE_EXPIRED`, not a 500. Pinned in Task 4 (`theRightCodeIsUsedOnceOnly`).
4. **The form re-submitted inside the cooldown** with a corrected name updates the parked data, sends no second
   mail and reports the seconds left. Pinned in Task 4 (`aSecondSubmitDuringTheCooldownUpdatesWithoutANewMail`).
5. **A pasted code with a space or dash** (`123 456`, `123-456`) and **a reload of `/register/verify`** must both
   work; opening the screen with nothing pending must go back to the form. Pinned in Task 8
   (`takes a pasted code…`) and Task 9 (`redirects to the form…`, `survives a reload…`).

---

### Task 1: Mail sending — HTML + text alternative, log when SMTP is not configured

**Files:**
- Modify: `backend/src/main/java/com/techx/intervue/services/interfaces/MailServiceInterface.java`
- Modify: `backend/src/main/java/com/techx/intervue/services/impl/MailService.java`
- Test: `backend/src/test/java/com/techx/intervue/services/impl/MailServiceTest.java` (create)

**Interfaces:**
- Produces: `MailServiceInterface.send(String to, String subject, String html, String text)`; existing
  `sendHtml(to, subject, html)` keeps its signature. Both log instead of sending when `spring.mail.username` is blank.

- [ ] **Step 1: Write the failing test**

```java
package com.techx.intervue.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.javamail.JavaMailSender;

class MailServiceTest {

    private JavaMailSender sender;

    @BeforeEach
    void setUp() {
        sender = mock(JavaMailSender.class);
        when(sender.createMimeMessage()).thenReturn(new MimeMessage((Session) null));
    }

    @Test
    void sendsHtmlWithAPlainTextAlternative() throws Exception {
        new MailService(sender, "noreply@marketlink.vn", "MarketLink")
                .send("lan@example.com", "Your code", "<p>Hi</p>", "Hi");

        ArgumentCaptor<MimeMessage> sent = ArgumentCaptor.forClass(MimeMessage.class);
        verify(sender).send(sent.capture());
        MimeMessage message = sent.getValue();
        message.saveChanges();
        ByteArrayOutputStream raw = new ByteArrayOutputStream();
        message.writeTo(raw);
        assertThat(message.getSubject()).isEqualTo("Your code");
        assertThat(message.getAllRecipients()[0].toString()).isEqualTo("lan@example.com");
        assertThat(raw.toString(StandardCharsets.UTF_8))
                .contains("multipart/alternative")
                .contains("text/plain")
                .contains("text/html");
    }

    @Test
    void logsInsteadOfSendingWhenNoAccountIsConfigured() {
        MailService service = new MailService(sender, "", "MarketLink");

        service.send("lan@example.com", "Your code", "<p>Hi</p>", "Hi");
        service.sendHtml("lan@example.com", "Reset", "<p>Link</p>");

        verify(sender, never()).send(any(MimeMessage.class));
    }
}
```

- [ ] **Step 2: Run it — expect a compile failure (`send` does not exist)**

Run the backend command with `-Dtest=MailServiceTest`. Expected: `cannot find symbol … send(…)`.

- [ ] **Step 3: Implement**

`MailServiceInterface.java` (body):

```java
public interface MailServiceInterface {
    /**
     * Send an HTML mail right away (synchronously). To avoid blocking the request, push it through
     * JobQueueInterface.
     */
    void sendHtml(String to, String subject, String html);

    /** Same, with a plain-text alternative for mail apps that do not show HTML (FR-009). */
    void send(String to, String subject, String html, String text);
}
```

`MailService.java`: add `@Slf4j`, keep the constructor, replace the body of the class after the constructor with:

```java
    @Override
    public void sendHtml(String to, String subject, String html) {
        if (notConfigured(to, subject, html)) return;
        deliver(to, subject, false, helper -> helper.setText(html, true));
    }

    @Override
    public void send(String to, String subject, String html, String text) {
        if (notConfigured(to, subject, text)) return;
        deliver(to, subject, true, helper -> helper.setText(text, html));
    }

    /**
     * No SMTP account yet (MAIL_USERNAME is empty): write the mail to the log instead, so the whole
     * flow can still be tried locally.
     */
    private boolean notConfigured(String to, String subject, String body) {
        if (StringUtils.hasText(fromAddress)) return false;
        log.warn(
                "Mail is not configured (MAIL_USERNAME is empty), so it was not sent.\nTo: {}\nSubject: {}\n{}",
                to,
                subject,
                body);
        return true;
    }

    private void deliver(String to, String subject, boolean multipart, Content content) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper =
                    new MimeMessageHelper(message, multipart, StandardCharsets.UTF_8.name());
            helper.setFrom(fromAddress, fromName);
            helper.setTo(to);
            helper.setSubject(subject);
            content.fill(helper);
            mailSender.send(message);
        } catch (MessagingException | UnsupportedEncodingException e) {
            throw new MailSendException("Could not build the email to " + to, e);
        }
    }

    @FunctionalInterface
    private interface Content {
        void fill(MimeMessageHelper helper) throws MessagingException;
    }
```

Imports to add: `lombok.extern.slf4j.Slf4j`, `org.springframework.util.StringUtils`.

- [ ] **Step 4: Run the test — expect PASS** (`-Dtest=MailServiceTest`).

- [ ] **Step 5: Commit** — `feat(FR-009): send mail with a text alternative and log it when SMTP is not set`.

---

### Task 2: Mail templates and the mail message bundle

**Files:**
- Create: `backend/src/main/java/com/techx/intervue/services/impl/MailTemplates.java`
- Create: `backend/src/main/java/com/techx/intervue/config/MailMessagesConfig.java`
- Create: `backend/src/test/resources/mail/test-sample.html`, `backend/src/test/resources/mail/test-sample.txt`
- Test: `backend/src/test/java/com/techx/intervue/services/impl/MailTemplatesTest.java` (create)

**Interfaces:**
- Produces: `MailTemplates.render(String name, Map<String,String> values) → MailTemplates.Body(String html, String text)`
  reading `classpath:mail/<name>.html` and `.txt`; bean `@Qualifier("mailMessages") MessageSource` with basename
  `i18n/mail`, `alwaysUseMessageFormat = true` (apostrophes are written `''` in every mail*.properties line).

- [ ] **Step 1: Test resources and failing test**

`test-sample.html`: `<p>Hi {{name}}</p>` · `test-sample.txt`: `Hi {{name}}`

```java
package com.techx.intervue.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Map;
import org.junit.jupiter.api.Test;

class MailTemplatesTest {

    private final MailTemplates templates = new MailTemplates();

    @Test
    void escapesValuesInTheHtmlPartOnly() {
        MailTemplates.Body body = templates.render("test-sample", Map.of("name", "<b>Lan</b> & co"));

        assertThat(body.html()).contains("&lt;b&gt;Lan&lt;/b&gt; &amp; co").doesNotContain("<b>Lan</b>");
        assertThat(body.text()).isEqualTo("Hi <b>Lan</b> & co");
    }

    @Test
    void aPlaceholderWithoutAValueIsABug() {
        assertThatThrownBy(() -> templates.render("test-sample", Map.of()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("{{name}}");
    }

    @Test
    void dollarSignsAndBackslashesInValuesAreKept() {
        assertThat(templates.render("test-sample", Map.of("name", "$1.50 \\o/")).text())
                .isEqualTo("Hi $1.50 \\o/");
    }
}
```

(The `.txt` fixture must not end with a newline, or compare with `startsWith`.)

- [ ] **Step 2: Run — expect compile failure** (`-Dtest=MailTemplatesTest`).

- [ ] **Step 3: Implement**

```java
package com.techx.intervue.services.impl;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.web.util.HtmlUtils;

/**
 * Mail bodies live in resources/mail/<name>.html and <name>.txt with {{key}} placeholders. Every
 * value is HTML-escaped in the HTML part; a placeholder without a value is a bug, so it throws.
 */
@Component
public class MailTemplates {

    private static final Pattern PLACEHOLDER = Pattern.compile("\\{\\{(\\w+)}}");

    private final Map<String, String> cache = new ConcurrentHashMap<>();

    public record Body(String html, String text) {}

    public Body render(String name, Map<String, String> values) {
        return new Body(
                fill(load("mail/" + name + ".html"), values, true),
                fill(load("mail/" + name + ".txt"), values, false));
    }

    private static String fill(String template, Map<String, String> values, boolean html) {
        Matcher matcher = PLACEHOLDER.matcher(template);
        StringBuilder out = new StringBuilder();
        while (matcher.find()) {
            String value = values.get(matcher.group(1));
            if (value == null) {
                throw new IllegalStateException(
                        "Mail placeholder {{" + matcher.group(1) + "}} has no value");
            }
            matcher.appendReplacement(
                    out, Matcher.quoteReplacement(html ? HtmlUtils.htmlEscape(value) : value));
        }
        matcher.appendTail(out);
        return out.toString();
    }

    private String load(String path) {
        return cache.computeIfAbsent(
                path,
                p -> {
                    try (InputStream in = new ClassPathResource(p).getInputStream()) {
                        return new String(in.readAllBytes(), StandardCharsets.UTF_8);
                    } catch (IOException e) {
                        throw new IllegalStateException("Mail template " + p + " is missing", e);
                    }
                });
    }
}
```

```java
package com.techx.intervue.config;

import org.springframework.context.MessageSource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.support.ResourceBundleMessageSource;

/** Text of the emails (i18n/mail*.properties), 10 languages like the notifications bundle. */
@Configuration
public class MailMessagesConfig {

    @Bean
    public MessageSource mailMessages() {
        ResourceBundleMessageSource source = new ResourceBundleMessageSource();
        source.setBasename("i18n/mail");
        source.setDefaultEncoding("UTF-8");
        // A missing language → mail.properties (English), not the server's locale
        source.setFallbackToSystemLocale(false);
        // Every line goes through MessageFormat, so an apostrophe is always written '' in the files
        source.setAlwaysUseMessageFormat(true);
        return source;
    }
}
```

- [ ] **Step 4: Run — expect PASS.**
- [ ] **Step 5: Commit** — `feat(FR-009): add file-based mail templates and a mail text bundle`.

---

### Task 3: Sign-up store in Redis and its settings

**Files:**
- Create: `backend/src/main/java/com/techx/intervue/config/EmailVerificationConfig.java`
- Modify: `backend/src/main/resources/application.yaml` (new block right after `app.password-reset`, same indent)
- Create: `backend/src/main/java/com/techx/intervue/modules/user/resources/PendingSignup.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/user/services/interfaces/SignupStoreInterface.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/user/services/impl/RedisSignupStore.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/user/services/impl/RedisSignupStoreTest.java`

**Interfaces:**
- Produces: `EmailVerificationConfig` getters `getCodeTtlSeconds() long`, `getPendingTtlSeconds() long`,
  `getResendCooldownSeconds() long`, `getMaxAttempts() int`, `getMaxSendsPerEmail() long`, `getMaxSendsPerIp() long`,
  `getWindowSeconds() long`.
- Produces: `record PendingSignup(String fullName, String email, String phone, String address, AddressColumns
  addressParts, String passwordHash, String language)`.
- Produces: `SignupStoreInterface` (below) and its record `SignupStoreInterface.SendCount(long count, long secondsLeft)`.

- [ ] **Step 1: Config, yaml, record, interface**

```java
package com.techx.intervue.config;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

/** FR-009: limits of the 6-digit sign-up code (spec 2026-09-28-email-verification-design §5). */
@Configuration
@Getter
public class EmailVerificationConfig {
    @Value("${app.email-verification.code-ttl-seconds:600}")
    private long codeTtlSeconds;

    /** How long an unfinished sign-up waits in Redis; every new code extends it. */
    @Value("${app.email-verification.pending-ttl-seconds:1800}")
    private long pendingTtlSeconds;

    @Value("${app.email-verification.resend-cooldown-seconds:60}")
    private long resendCooldownSeconds;

    /** Wrong codes allowed before the code is thrown away. */
    @Value("${app.email-verification.max-attempts:5}")
    private int maxAttempts;

    @Value("${app.email-verification.max-sends-per-email:5}")
    private long maxSendsPerEmail;

    /** Blocks one IP from mailing many different addresses. */
    @Value("${app.email-verification.max-sends-per-ip:20}")
    private long maxSendsPerIp;

    @Value("${app.email-verification.window-seconds:3600}")
    private long windowSeconds;
}
```

`application.yaml`:

```yaml
  # FR-009: 6-digit email code at sign-up (docs/superpowers/specs/2026-09-28-email-verification-design.md)
  email-verification:
    code-ttl-seconds: 600
    pending-ttl-seconds: 1800
    resend-cooldown-seconds: 60
    max-attempts: 5
    max-sends-per-email: 5
    max-sends-per-ip: 20
    window-seconds: 3600
```

```java
package com.techx.intervue.modules.user.resources;

import com.techx.intervue.modules.geo.entities.AddressColumns;

/** FR-009: what the sign-up form sent, held in Redis until the code mailed to `email` is entered. */
public record PendingSignup(
        String fullName,
        String email,
        String phone,
        String address,
        AddressColumns addressParts,
        String passwordHash,
        String language) {}
```

```java
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
```

- [ ] **Step 2: Failing store test**

```java
package com.techx.intervue.modules.user.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.techx.intervue.modules.geo.entities.AddressColumns;
import com.techx.intervue.modules.user.resources.PendingSignup;
import com.techx.intervue.modules.user.services.interfaces.SignupStoreInterface.SendCount;
import java.time.Duration;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

class RedisSignupStoreTest {

    private static final String EMAIL = "lan@example.com";

    private StringRedisTemplate redis;
    private ValueOperations<String, String> values;
    private RedisSignupStore store;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        redis = mock(StringRedisTemplate.class);
        values = mock(ValueOperations.class);
        when(redis.opsForValue()).thenReturn(values);
        store = new RedisSignupStore(redis, new ObjectMapper());
    }

    @Test
    void aPendingSignUpRoundTripsThroughJson() {
        PendingSignup pending =
                new PendingSignup(
                        "Lan",
                        EMAIL,
                        "0900000002",
                        "12 Lê Lợi, Phường Bến Thành, Thành phố Hồ Chí Minh",
                        new AddressColumns("VN", "79", "26743", "Lê Lợi", "12", null, null),
                        "bcrypt",
                        "vi");
        store.savePending(pending, Duration.ofSeconds(1800));
        ArgumentCaptor<String> json = ArgumentCaptor.forClass(String.class);
        verify(values).set(eq("signup:pending:" + EMAIL), json.capture(), eq(Duration.ofSeconds(1800)));
        when(values.get("signup:pending:" + EMAIL)).thenReturn(json.getValue());

        PendingSignup read = store.findPending(EMAIL).orElseThrow();

        assertThat(read).usingRecursiveComparison().isEqualTo(pending);
    }

    @Test
    void aNewCodeClearsTheWrongAttempts() {
        store.saveCode(EMAIL, "hash", Duration.ofSeconds(600));

        verify(values).set("signup:code:" + EMAIL, "hash", Duration.ofSeconds(600));
        verify(redis).delete("signup:attempts:" + EMAIL);
    }

    @Test
    void theFirstSendStartsTheHourlyWindow() {
        when(values.increment("ratelimit:signup:" + EMAIL)).thenReturn(1L);
        when(redis.getExpire("ratelimit:signup:" + EMAIL)).thenReturn(-1L);

        SendCount count = store.countEmailSend(EMAIL, Duration.ofSeconds(3600));

        verify(redis).expire("ratelimit:signup:" + EMAIL, Duration.ofSeconds(3600));
        assertThat(count).isEqualTo(new SendCount(1, 3600));
    }

    @Test
    void aCounterThatLostItsTtlGetsItBack() {
        when(values.increment("ratelimit:signup-ip:203.0.113.9")).thenReturn(4L);
        when(redis.getExpire("ratelimit:signup-ip:203.0.113.9")).thenReturn(-1L);

        store.countIpSend("203.0.113.9", Duration.ofSeconds(3600));

        verify(redis).expire("ratelimit:signup-ip:203.0.113.9", Duration.ofSeconds(3600));
    }

    @Test
    void aMissingKeyHasNoSecondsLeft() {
        when(redis.getExpire(anyString())).thenReturn(-2L);

        assertThat(store.cooldownSecondsLeft(EMAIL)).isZero();
        assertThat(store.codeSecondsLeft(EMAIL)).isZero();
    }

    @Test
    void theCooldownIsSetOnlyWhenNoneIsRunning() {
        when(values.setIfAbsent("signup:cooldown:" + EMAIL, "1", Duration.ofSeconds(60)))
                .thenReturn(true, false);

        assertThat(store.startCooldown(EMAIL, Duration.ofSeconds(60))).isTrue();
        assertThat(store.startCooldown(EMAIL, Duration.ofSeconds(60))).isFalse();
    }
}
```

- [ ] **Step 3: Run — expect compile failure** (`-Dtest=RedisSignupStoreTest`).

- [ ] **Step 4: Implement `RedisSignupStore`**

```java
package com.techx.intervue.modules.user.services.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.techx.intervue.modules.user.resources.PendingSignup;
import com.techx.intervue.modules.user.services.interfaces.SignupStoreInterface;
import java.time.Duration;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

/**
 * FR-009 sign-up state in Redis.
 *
 * <pre>
 * signup:pending:{email}      JSON of PendingSignup (TTL = pending TTL, extended on every code)
 * signup:code:{email}         sha256(email:code), never the code itself (TTL = code TTL)
 * signup:attempts:{email}     wrong codes for the current code (TTL follows the code)
 * signup:cooldown:{email}     "1" while a new code may not be sent (SET NX EX)
 * ratelimit:signup:{email}    codes sent to this address in the window
 * ratelimit:signup-ip:{ip}    codes sent from this IP in the window
 * </pre>
 */
@Component
@RequiredArgsConstructor
public class RedisSignupStore implements SignupStoreInterface {

    static final String PENDING = "signup:pending:";
    static final String CODE = "signup:code:";
    static final String ATTEMPTS = "signup:attempts:";
    static final String COOLDOWN = "signup:cooldown:";
    static final String SENDS_BY_EMAIL = "ratelimit:signup:";
    static final String SENDS_BY_IP = "ratelimit:signup-ip:";

    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;

    @Override
    public void savePending(PendingSignup pending, Duration ttl) {
        try {
            redis.opsForValue()
                    .set(PENDING + pending.email(), objectMapper.writeValueAsString(pending), ttl);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Could not store the sign-up", e);
        }
    }

    @Override
    public Optional<PendingSignup> findPending(String email) {
        String json = redis.opsForValue().get(PENDING + email);
        if (json == null) return Optional.empty();
        try {
            return Optional.of(objectMapper.readValue(json, PendingSignup.class));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("A stored sign-up could not be read", e);
        }
    }

    @Override
    public void extendPending(String email, Duration ttl) {
        redis.expire(PENDING + email, ttl);
    }

    @Override
    public void deleteAll(String email) {
        redis.delete(List.of(PENDING + email, CODE + email, ATTEMPTS + email, COOLDOWN + email));
    }

    @Override
    public void saveCode(String email, String codeHash, Duration ttl) {
        redis.opsForValue().set(CODE + email, codeHash, ttl);
        redis.delete(ATTEMPTS + email);
    }

    @Override
    public Optional<String> findCode(String email) {
        return Optional.ofNullable(redis.opsForValue().get(CODE + email));
    }

    @Override
    public Optional<String> takeCode(String email) {
        return Optional.ofNullable(redis.opsForValue().getAndDelete(CODE + email));
    }

    @Override
    public void deleteCode(String email) {
        redis.delete(CODE + email);
    }

    @Override
    public long codeSecondsLeft(String email) {
        return secondsLeft(CODE + email);
    }

    @Override
    public int failedAttempts(String email) {
        String count = redis.opsForValue().get(ATTEMPTS + email);
        return count == null ? 0 : Integer.parseInt(count);
    }

    @Override
    public int recordFailedAttempt(String email) {
        Long count = redis.opsForValue().increment(ATTEMPTS + email);
        redis.expire(ATTEMPTS + email, Duration.ofSeconds(Math.max(1, secondsLeft(CODE + email))));
        return count == null ? 0 : count.intValue();
    }

    @Override
    public boolean startCooldown(String email, Duration ttl) {
        return Boolean.TRUE.equals(redis.opsForValue().setIfAbsent(COOLDOWN + email, "1", ttl));
    }

    @Override
    public long cooldownSecondsLeft(String email) {
        return secondsLeft(COOLDOWN + email);
    }

    @Override
    public SendCount countEmailSend(String email, Duration window) {
        return count(SENDS_BY_EMAIL + email, window);
    }

    @Override
    public SendCount countIpSend(String ip, Duration window) {
        return count(SENDS_BY_IP + ip, window);
    }

    /**
     * INCR, EXPIRE on the first hit; a key that lost its TTL (a crash between the two commands) gets
     * it back — same as PasswordResetService.
     */
    private SendCount count(String key, Duration window) {
        Long count = redis.opsForValue().increment(key);
        Long ttl = redis.getExpire(key);
        if (count == null || count == 1 || ttl == null || ttl < 0) {
            redis.expire(key, window);
            ttl = window.toSeconds();
        }
        return new SendCount(count == null ? 0 : count, ttl);
    }

    private long secondsLeft(String key) {
        Long ttl = redis.getExpire(key);
        return ttl == null || ttl < 0 ? 0 : ttl;
    }
}
```

- [ ] **Step 5: Run — expect PASS.**
- [ ] **Step 6: Commit** — `feat(FR-009): keep unfinished sign-ups and their codes in Redis`.

---

### Task 4: `EmailVerificationService` — every rule of the code

**Files:**
- Create exceptions in `backend/src/main/java/com/techx/intervue/modules/user/exceptions/`:
  `SignupCodeInvalidException.java`, `SignupCodeExpiredException.java`, `SignupExpiredException.java`,
  `SignupRateLimitedException.java`
- Create in `modules/user/resources/`: `SignupStartedResource.java`, `IssuedSignupCode.java`, `VerifiedSignup.java`
- Create: `modules/user/services/interfaces/EmailVerificationServiceInterface.java`
- Create: `modules/user/services/impl/EmailVerificationService.java`
- Test: `backend/src/test/java/com/techx/intervue/modules/user/services/impl/InMemorySignupStore.java` (fake) and
  `EmailVerificationServiceTest.java`

**Interfaces:**
- Consumes: `SignupStoreInterface`, `EmailVerificationConfig`, `TokenHashUtil.hash(String)`, `JobQueueInterface.enqueue`.
- Produces:
  - `record SignupStartedResource(String email, long codeExpiresInSeconds, long resendAvailableInSeconds)`
  - `record IssuedSignupCode(PendingSignup pending, String code)`
  - `record VerifiedSignup(PendingSignup pending, String codeHash, long codeSecondsLeft)`
  - `EmailVerificationService.JOB_SEND_CODE = "signup.send-code"`
  - static `EmailVerificationService.normalizeEmail(String)`, `normalizeLanguage(String)`
  - interface methods: `start(PendingSignup, String ip)`, `decoy(String email)`, `resend(String email, String ip)`
    → `SignupStartedResource`; `issueCode(String email) → Optional<IssuedSignupCode>`;
    `verify(String email, String code) → VerifiedSignup`; `discard(String email)`; `restore(VerifiedSignup)`.
  - exceptions: `SignupCodeInvalidException(int attemptsLeft)` with `getAttemptsLeft()`,
    `SignupCodeExpiredException()`, `SignupExpiredException()`, `SignupRateLimitedException(long retryAfterSeconds)`
    with `getRetryAfterSeconds()` (min 1).

- [ ] **Step 1: Records, exceptions, interface**

```java
// SignupStartedResource.java
package com.techx.intervue.modules.user.resources;

/** FR-009: answer of /auth/register and /auth/register/resend — no account yet. */
public record SignupStartedResource(
        String email, long codeExpiresInSeconds, long resendAvailableInSeconds) {}

// IssuedSignupCode.java — the raw code only travels from the worker into the mail
public record IssuedSignupCode(PendingSignup pending, String code) {}

// VerifiedSignup.java — kept so the code can be given back if saving the account fails
public record VerifiedSignup(PendingSignup pending, String codeHash, long codeSecondsLeft) {}
```

```java
// SignupCodeInvalidException.java
package com.techx.intervue.modules.user.exceptions;

import lombok.Getter;

@Getter
public class SignupCodeInvalidException extends RuntimeException {
    private final int attemptsLeft;

    public SignupCodeInvalidException(int attemptsLeft) {
        super("That code is not right.");
        this.attemptsLeft = attemptsLeft;
    }
}

// SignupCodeExpiredException.java
public class SignupCodeExpiredException extends RuntimeException {
    public SignupCodeExpiredException() {
        super("This code can no longer be used. Send a new one.");
    }
}

// SignupExpiredException.java
public class SignupExpiredException extends RuntimeException {
    public SignupExpiredException() {
        super("Your sign-up has expired. Fill in the form again.");
    }
}

// SignupRateLimitedException.java
@Getter
public class SignupRateLimitedException extends RuntimeException {
    private final long retryAfterSeconds;

    public SignupRateLimitedException(long retryAfterSeconds) {
        super("Too many codes requested. Try again later.");
        this.retryAfterSeconds = Math.max(1, retryAfterSeconds);
    }
}
```

```java
package com.techx.intervue.modules.user.services.interfaces;

import com.techx.intervue.modules.user.resources.IssuedSignupCode;
import com.techx.intervue.modules.user.resources.PendingSignup;
import com.techx.intervue.modules.user.resources.SignupStartedResource;
import com.techx.intervue.modules.user.resources.VerifiedSignup;
import java.util.Optional;

/** FR-009: the 6-digit code that proves a sign-up owns its email address. */
public interface EmailVerificationServiceInterface {

    /** Park the form and queue a code mail (unless a cooldown is running). */
    SignupStartedResource start(PendingSignup pending, String clientIp);

    /** The same answer as start, with no side effect: the honeypot field was filled in. */
    SignupStartedResource decoy(String email);

    SignupStartedResource resend(String email, String clientIp);

    /** Worker side: a new code for a sign-up that is still waiting. */
    Optional<IssuedSignupCode> issueCode(String email);

    /** Checks the code; on success the code is used up. */
    VerifiedSignup verify(String email, String code);

    /** The account now exists (or never can): forget the sign-up. */
    void discard(String email);

    /** Saving the account failed: give the code back so the person can try again. */
    void restore(VerifiedSignup verified);
}
```

- [ ] **Step 2: The in-memory fake (test source)**

```java
package com.techx.intervue.modules.user.services.impl;

import com.techx.intervue.modules.user.resources.PendingSignup;
import com.techx.intervue.modules.user.services.interfaces.SignupStoreInterface;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/** SignupStoreInterface in memory; time only passes when a test calls one of the expire* methods. */
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
```

- [ ] **Step 3: Failing service tests**

```java
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

        verify(jobQueue, times(1)).enqueue(EmailVerificationService.JOB_SEND_CODE, Map.of("email", EMAIL));
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
        assertThat(catchThrowableOfType(SignupCodeExpiredException.class, () -> service.verify(EMAIL, code)))
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
                catchThrowableOfType(SignupCodeInvalidException.class, () -> service.verify(EMAIL, wrong(code)));

        assertThat(e.getAttemptsLeft()).isEqualTo(4);
    }

    @Test
    void theFifthWrongCodeThrowsTheCodeAway() {
        service.start(pending(EMAIL, "Lan"), IP);
        String code = mailedCode(EMAIL);
        for (int left = 4; left >= 0; left--) {
            SignupCodeInvalidException e =
                    catchThrowableOfType(
                            SignupCodeInvalidException.class, () -> service.verify(EMAIL, wrong(code)));
            assertThat(e.getAttemptsLeft()).isEqualTo(left);
        }

        assertThat(catchThrowableOfType(SignupCodeExpiredException.class, () -> service.verify(EMAIL, code)))
                .isNotNull();
    }

    @Test
    void anExpiredCodeAsksForANewOne() {
        service.start(pending(EMAIL, "Lan"), IP);
        String code = mailedCode(EMAIL);
        store.expireCode(EMAIL);

        assertThat(catchThrowableOfType(SignupCodeExpiredException.class, () -> service.verify(EMAIL, code)))
                .isNotNull();
    }

    @Test
    void anExpiredSignUpAsksToStartAgain() {
        assertThat(catchThrowableOfType(SignupExpiredException.class, () -> service.verify(EMAIL, "123456")))
                .isNotNull();
        assertThat(catchThrowableOfType(SignupExpiredException.class, () -> service.resend(EMAIL, IP)))
                .isNotNull();
    }

    @Test
    void resendDuringTheCooldownGivesTheSecondsLeft() {
        service.start(pending(EMAIL, "Lan"), IP);

        SignupRateLimitedException e =
                catchThrowableOfType(SignupRateLimitedException.class, () -> service.resend(EMAIL, IP));

        assertThat(e.getRetryAfterSeconds()).isEqualTo(60);
    }

    @Test
    void aNewCodeReplacesTheOldOneAndResetsTheTries() {
        service.start(pending(EMAIL, "Lan"), IP);
        String old = mailedCode(EMAIL);
        catchThrowableOfType(SignupCodeInvalidException.class, () -> service.verify(EMAIL, wrong(old)));
        store.expireCooldown(EMAIL);

        service.resend(EMAIL, IP);
        String fresh = mailedCode(EMAIL);

        if (!fresh.equals(old)) {
            SignupCodeInvalidException e =
                    catchThrowableOfType(SignupCodeInvalidException.class, () -> service.verify(EMAIL, old));
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
                catchThrowableOfType(SignupRateLimitedException.class, () -> service.resend(EMAIL, IP));

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
        assertThat(service.decoy(" Lan@Example.com")).isEqualTo(new SignupStartedResource(EMAIL, 600, 60));
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
```

`restore` note: the fake's `takeCode` removes the TTL, so `VerifiedSignup.codeSecondsLeft` must be read **before**
`takeCode` (as the implementation below does); the fake then reports 600 s and restore puts the code back.

- [ ] **Step 4: Run — expect compile failure** (`-Dtest=EmailVerificationServiceTest`).

- [ ] **Step 5: Implement**

```java
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
```

- [ ] **Step 6: Run — expect PASS** (`-Dtest=EmailVerificationServiceTest,RedisSignupStoreTest`).
- [ ] **Step 7: Commit** — `feat(FR-009): verify sign-ups with a single-use 6-digit code and send limits`.

---

### Task 5: The code email — template, 10 languages, builder and worker job

**Files:**
- Create: `backend/src/main/resources/mail/signup-code.html`, `backend/src/main/resources/mail/signup-code.txt`
- Create: `backend/src/main/resources/i18n/mail.properties` and `mail_{vi,zh,ja,ko,fr,es,de,th,id}.properties`
- Create: `backend/src/main/java/com/techx/intervue/modules/user/services/impl/SignupCodeMail.java`
- Create: `backend/src/main/java/com/techx/intervue/modules/user/services/impl/SignupCodeMailJob.java`
- Test: `SignupCodeMailTest.java`, `SignupCodeMailJobTest.java` (same test package)

**Interfaces:**
- Consumes: `MailTemplates.render`, `@Qualifier("mailMessages") MessageSource`, `EmailVerificationConfig`,
  `EmailVerificationServiceInterface.issueCode`, `MailServiceInterface.send`, `EmailVerificationService.JOB_SEND_CODE`.
- Produces: `SignupCodeMail.build(IssuedSignupCode) → SignupCodeMail.Content(String subject, String html, String text)`.

- [ ] **Step 1: Template files**

`signup-code.html` (hex values are the light tokens of `marketlink-theme.css`; the chalkboard tag with the punched
hole is the one accent):

```html
<!doctype html>
<html lang="{{lang}}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>{{subject}}</title>
<link href="https://fonts.googleapis.com/css2?family=Chivo:wght@400;700&family=Patrick+Hand&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#dcc59d;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#dcc59d;">{{preheader}}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#dcc59d;">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#f1e5cb;border:1.5px solid #6e5a3c;border-radius:10px;box-shadow:0 2px 0 0 rgba(110,90,60,.28);">
        <tr>
          <td style="background:#2f4a2a;border-radius:8px 8px 0 0;padding:16px 24px;font-family:'Patrick Hand','Trebuchet MS',Arial,sans-serif;font-size:28px;line-height:32px;color:#f1e5cb;">MarketLink</td>
        </tr>
        <tr>
          <td style="padding:24px 24px 8px;font-family:Chivo,Arial,Helvetica,sans-serif;color:#2a2016;">
            <h1 style="margin:0 0 12px;font-size:22px;line-height:30px;font-weight:700;color:#2a2016;">{{title}}</h1>
            <p style="margin:0 0 4px;font-size:16px;line-height:24px;">{{greeting}}</p>
            <p style="margin:0;font-size:16px;line-height:24px;">{{intro}}</p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:20px 24px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="background:#2f4a2a;border-radius:10px;">
              <tr>
                <td align="center" style="padding:10px 32px 0;line-height:0;font-size:0;">
                  <span style="display:inline-block;width:12px;height:12px;border-radius:6px;background:#f1e5cb;border:2px solid #8a6a3f;"></span>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding:6px 32px 0;font-family:Chivo,Arial,Helvetica,sans-serif;font-size:13px;line-height:18px;color:#bccaa9;">{{codeLabel}}</td>
              </tr>
              <tr>
                <td align="center" style="padding:4px 22px 18px 32px;font-family:ui-monospace,Menlo,Consolas,'Courier New',monospace;font-size:34px;line-height:44px;font-weight:700;letter-spacing:10px;color:#f1e5cb;">{{code}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:0 24px 20px;font-family:Chivo,Arial,Helvetica,sans-serif;font-size:14px;line-height:21px;color:#57462f;">{{expiry}}</td>
        </tr>
        <tr>
          <td style="padding:0 24px;"><div style="border-top:1.5px dashed #c4ab7e;line-height:0;font-size:0;">&nbsp;</div></td>
        </tr>
        <tr>
          <td style="padding:16px 24px 24px;font-family:Chivo,Arial,Helvetica,sans-serif;font-size:14px;line-height:21px;color:#57462f;">{{ignore}}</td>
        </tr>
      </table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
        <tr>
          <td align="center" style="padding:16px 8px 0;font-family:Chivo,Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#57462f;">{{tagline}}<br>{{reason}}</td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>
```

`signup-code.txt`:

```
{{title}}

{{greeting}}
{{intro}}

{{codeLabel}}:

    {{code}}

{{expiry}}

{{ignore}}

--
{{tagline}}
{{reason}}
```

- [ ] **Step 2: `mail.properties` (English) and the 9 translations**

```properties
# FR-009 sign-up code email. Every line goes through MessageFormat: write an apostrophe as ''.
signupCode.subject={0} is your MarketLink code
signupCode.preheader=Enter it on the sign-up page. It expires in {0} minutes.
signupCode.title=Finish creating your account
signupCode.greeting=Hi {0},
signupCode.intro=Enter this code on the sign-up page to confirm this email is yours.
signupCode.codeLabel=Your code
signupCode.expiry=The code works once and expires in {0} minutes.
signupCode.ignore=Didn''t try to sign up? Ignore this email. Nobody can create an account with this address without the code.
signupCode.reason=You got this email because someone signed up at MarketLink with {0}.
mail.tagline=MarketLink · Farmers markets around Ho Chi Minh City
```

`mail_vi.properties`:

```properties
signupCode.subject={0} là mã MarketLink của bạn
signupCode.preheader=Nhập mã ở trang đăng ký. Mã hết hạn sau {0} phút.
signupCode.title=Hoàn tất tạo tài khoản
signupCode.greeting=Chào {0},
signupCode.intro=Nhập mã này ở trang đăng ký để xác nhận email này là của bạn.
signupCode.codeLabel=Mã của bạn
signupCode.expiry=Mã chỉ dùng được một lần và hết hạn sau {0} phút.
signupCode.ignore=Bạn không đăng ký? Hãy bỏ qua email này. Không ai tạo được tài khoản bằng địa chỉ này nếu không có mã.
signupCode.reason=Bạn nhận được email này vì có người đăng ký MarketLink bằng {0}.
mail.tagline=MarketLink · Chợ phiên nông sản quanh TP. Hồ Chí Minh
```

The other 8 files (`zh ja ko fr es de th id`) translate the same 10 keys: keep `{0}`, keep "MarketLink", write every
apostrophe as `''` (French and others), plain register, no exclamation marks. `SignupCodeMailTest` fails on a missing
key, a leftover `{0}` or a doubled apostrophe in the output.

- [ ] **Step 3: Failing tests**

```java
package com.techx.intervue.modules.user.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.techx.intervue.config.EmailVerificationConfig;
import com.techx.intervue.config.MailMessagesConfig;
import com.techx.intervue.modules.user.resources.IssuedSignupCode;
import com.techx.intervue.modules.user.resources.PendingSignup;
import com.techx.intervue.services.impl.MailTemplates;
import java.io.InputStream;
import java.util.List;
import java.util.Properties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class SignupCodeMailTest {

    private SignupCodeMail mail;

    @BeforeEach
    void setUp() {
        EmailVerificationConfig config = mock(EmailVerificationConfig.class);
        when(config.getCodeTtlSeconds()).thenReturn(600L);
        mail = new SignupCodeMail(new MailMessagesConfig().mailMessages(), new MailTemplates(), config);
    }

    private SignupCodeMail.Content build(String language, String name) {
        PendingSignup pending =
                new PendingSignup(name, "lan@example.com", "0900000002", "addr", null, "hash", language);
        return mail.build(new IssuedSignupCode(pending, "004821"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"en", "vi", "zh", "ja", "ko", "fr", "es", "de", "th", "id"})
    void everyLanguageHasTheWholeMail(String language) {
        SignupCodeMail.Content content = build(language, "Lan");

        assertThat(content.subject()).contains("004821");
        for (String part : List.of(content.subject(), content.html(), content.text())) {
            assertThat(part).doesNotContain("{0}").doesNotContain("''").doesNotContain("{{");
        }
        assertThat(content.text()).contains("004821").contains("lan@example.com").contains("10");
        assertThat(content.html()).contains("lang=\"" + language + "\"");
    }

    @ParameterizedTest
    @ValueSource(strings = {"vi", "zh", "ja", "ko", "fr", "es", "de", "th", "id"})
    void everyLanguageFileHasEveryKey(String language) throws Exception {
        assertThat(load("i18n/mail_" + language + ".properties").stringPropertyNames())
                .isEqualTo(load("i18n/mail.properties").stringPropertyNames());
    }

    @Test
    void englishReadsAsWritten() {
        SignupCodeMail.Content content = build("en", "Lan");

        assertThat(content.subject()).isEqualTo("004821 is your MarketLink code");
        assertThat(content.text()).contains("Didn't try to sign up?").contains("Hi Lan,");
    }

    @Test
    void theNameIsEscapedInTheHtml() {
        SignupCodeMail.Content content = build("en", "<script>x</script>");

        assertThat(content.html()).doesNotContain("<script>").contains("&lt;script&gt;");
    }

    private static Properties load(String path) throws Exception {
        Properties properties = new Properties();
        try (InputStream in = SignupCodeMailTest.class.getClassLoader().getResourceAsStream(path)) {
            properties.load(new java.io.InputStreamReader(in, java.nio.charset.StandardCharsets.UTF_8));
        }
        return properties;
    }
}
```

```java
package com.techx.intervue.modules.user.services.impl;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.user.resources.IssuedSignupCode;
import com.techx.intervue.modules.user.resources.PendingSignup;
import com.techx.intervue.modules.user.services.interfaces.EmailVerificationServiceInterface;
import com.techx.intervue.services.interfaces.MailServiceInterface;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class SignupCodeMailJobTest {

    private EmailVerificationServiceInterface emailVerification;
    private SignupCodeMail signupCodeMail;
    private MailServiceInterface mailService;
    private SignupCodeMailJob job;

    @BeforeEach
    void setUp() {
        emailVerification = mock(EmailVerificationServiceInterface.class);
        signupCodeMail = mock(SignupCodeMail.class);
        mailService = mock(MailServiceInterface.class);
        job = new SignupCodeMailJob(emailVerification, signupCodeMail, mailService);
    }

    @Test
    void mailsTheCodeOfASignUpThatIsStillWaiting() {
        IssuedSignupCode issued =
                new IssuedSignupCode(
                        new PendingSignup("Lan", "lan@example.com", "0900000002", "a", null, "h", "en"),
                        "004821");
        when(emailVerification.issueCode("lan@example.com")).thenReturn(Optional.of(issued));
        when(signupCodeMail.build(issued))
                .thenReturn(new SignupCodeMail.Content("004821 is your MarketLink code", "<p/>", "t"));

        job.handle(Map.of("email", "lan@example.com"));

        verify(mailService)
                .send(eq("lan@example.com"), contains("004821"), eq("<p/>"), eq("t"));
    }

    @Test
    void anExpiredSignUpGetsNoMail() {
        when(emailVerification.issueCode(any())).thenReturn(Optional.empty());

        job.handle(Map.of("email", "lan@example.com"));

        verifyNoInteractions(mailService);
    }
}
```

- [ ] **Step 4: Run — expect compile failure** (`-Dtest=SignupCodeMailTest,SignupCodeMailJobTest`).

- [ ] **Step 5: Implement**

```java
package com.techx.intervue.modules.user.services.impl;

import com.techx.intervue.config.EmailVerificationConfig;
import com.techx.intervue.modules.user.resources.IssuedSignupCode;
import com.techx.intervue.modules.user.resources.PendingSignup;
import com.techx.intervue.services.impl.MailTemplates;
import java.util.Locale;
import java.util.Map;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.MessageSource;
import org.springframework.stereotype.Component;

/** FR-009: the code email, in the language picked on the sign-up form. */
@Component
public class SignupCodeMail {

    private final MessageSource messages;
    private final MailTemplates templates;
    private final EmailVerificationConfig config;

    public SignupCodeMail(
            @Qualifier("mailMessages") MessageSource messages,
            MailTemplates templates,
            EmailVerificationConfig config) {
        this.messages = messages;
        this.templates = templates;
        this.config = config;
    }

    public record Content(String subject, String html, String text) {}

    public Content build(IssuedSignupCode issued) {
        PendingSignup pending = issued.pending();
        Locale locale = Locale.forLanguageTag(pending.language());
        long minutes = Math.max(1, config.getCodeTtlSeconds() / 60);
        String subject = text("signupCode.subject", locale, issued.code());
        MailTemplates.Body body =
                templates.render(
                        "signup-code",
                        Map.ofEntries(
                                Map.entry("lang", pending.language()),
                                Map.entry("subject", subject),
                                Map.entry("preheader", text("signupCode.preheader", locale, minutes)),
                                Map.entry("title", text("signupCode.title", locale)),
                                Map.entry(
                                        "greeting",
                                        text("signupCode.greeting", locale, pending.fullName())),
                                Map.entry("intro", text("signupCode.intro", locale)),
                                Map.entry("codeLabel", text("signupCode.codeLabel", locale)),
                                Map.entry("code", issued.code()),
                                Map.entry("expiry", text("signupCode.expiry", locale, minutes)),
                                Map.entry("ignore", text("signupCode.ignore", locale)),
                                Map.entry("tagline", text("mail.tagline", locale)),
                                Map.entry(
                                        "reason", text("signupCode.reason", locale, pending.email()))));
        return new Content(subject, body.html(), body.text());
    }

    private String text(String key, Locale locale, Object... args) {
        return messages.getMessage(key, args, locale);
    }
}
```

```java
package com.techx.intervue.modules.user.services.impl;

import com.techx.intervue.modules.user.services.interfaces.EmailVerificationServiceInterface;
import com.techx.intervue.services.interfaces.JobHandler;
import com.techx.intervue.services.interfaces.MailServiceInterface;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * FR-009 worker side: make a code for a sign-up that is still waiting and mail it. The code is
 * created here, so it never sits in the queue or in Redis in the clear.
 */
@Component
@RequiredArgsConstructor
public class SignupCodeMailJob implements JobHandler {

    private final EmailVerificationServiceInterface emailVerification;
    private final SignupCodeMail signupCodeMail;
    private final MailServiceInterface mailService;

    @Override
    public String type() {
        return EmailVerificationService.JOB_SEND_CODE;
    }

    @Override
    public void handle(Map<String, String> payload) {
        emailVerification
                .issueCode(payload.get("email"))
                .ifPresent(
                        issued -> {
                            SignupCodeMail.Content mail = signupCodeMail.build(issued);
                            mailService.send(
                                    issued.pending().email(), mail.subject(), mail.html(), mail.text());
                        });
    }
}
```

`MessageFormat` formats the `long` minutes with the locale; for 10 that is `10` in all ten languages (the test checks).

- [ ] **Step 6: Run — expect PASS.**
- [ ] **Step 7: Commit** — `feat(FR-009): mail the sign-up code in ten languages in the MarketLink style`.

---

### Task 6: Wire the API — register 202, verify, resend, errors, CORS

**Files:**
- Modify: `backend/src/main/java/com/techx/intervue/modules/user/requests/CustomerRegisterRequest.java`
- Create: `modules/user/requests/SignupVerifyRequest.java`, `modules/user/requests/SignupResendRequest.java`
- Modify: `modules/user/services/interfaces/UserServiceInterface.java`
- Modify: `modules/user/services/impl/UserService.java` (register at `:83-116`, new `completeSignup`, new field)
- Modify: `modules/user/controllers/AuthController.java` (register at `:64-79`, 2 new endpoints, new field)
- Modify: `modules/user/controllers/AuthExceptionHandler.java` (4 handlers)
- Modify: `backend/src/main/java/com/techx/intervue/config/SecurityConfig.java:59`
- Test: `UserServiceTest.java`, `CustomerRegisterRequestTest.java`, `AuthExceptionHandlerTest.java`

**Interfaces:**
- Consumes: everything from Task 4.
- Produces: `UserServiceInterface.registerCustomer(CustomerRegisterRequest, String clientIp) → SignupStartedResource`,
  `UserServiceInterface.completeSignup(String email, String code) → AuthResult`; HTTP contract of spec §4.

- [ ] **Step 1: Requests**

In `CustomerRegisterRequest`, after `confirmPassword` add:

```java
        @NotBlank(message = "Confirm your password.") String confirmPassword,
        // FR-009: language of the code email; anything unknown becomes English
        @Size(max = 16, message = "Language can be at most 16 characters.") String language,
        // FR-009: honeypot — the real form always sends it empty
        String website) {}
```

```java
package com.techx.intervue.modules.user.requests;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/** FR-009: the code from the sign-up email. */
public record SignupVerifyRequest(
        @NotBlank(message = "Enter your email.")
                @Email(regexp = RegisterRules.EMAIL_REGEX, message = RegisterRules.EMAIL_MESSAGE)
                String email,
        @NotBlank(message = "Enter the 6-digit code.")
                @Pattern(regexp = "\\d{6}", message = "Enter the 6-digit code from the email.")
                String code) {}
```

```java
package com.techx.intervue.modules.user.requests;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/** FR-009: ask for a new sign-up code. */
public record SignupResendRequest(
        @NotBlank(message = "Enter your email.")
                @Email(regexp = RegisterRules.EMAIL_REGEX, message = RegisterRules.EMAIL_MESSAGE)
                String email) {}
```

Update the three `new CustomerRegisterRequest(…)` calls in `CustomerRegisterRequestTest` by appending `, null, null`.

- [ ] **Step 2: Failing tests**

In `UserServiceTest`:
- add `private EmailVerificationServiceInterface emailVerification;`, create it in `setUp` with
  `mock(EmailVerificationServiceInterface.class)` and pass it as the **last** constructor argument;
- add `private static final String IP = "203.0.113.9";`;
- `signUp(...)` returns `new CustomerRegisterRequest("Nguyen Van An", phone, email, BEN_THANH, PASSWORD, PASSWORD, "vi", null)`;
- the two duplicate tests call `service.registerCustomer(signUp(EMAIL, "0900000002"), IP)`;
- replace `signUpStoresTheComposedAddressAndItsParts` with the four tests below.

```java
    private PendingSignup parked(String email) {
        return new PendingSignup(
                "Nguyen Van An",
                email,
                "0900000002",
                BEN_THANH_TEXT,
                new AddressColumns("VN", "79", "26743", "Lê Lợi", "12", null, null),
                "bcrypt",
                "vi");
    }

    @Test
    void signUpParksTheFormUntilTheCodeIsEntered() {
        addressResolves();
        when(passwordEncoder.encode(PASSWORD)).thenReturn("bcrypt");
        when(emailVerification.start(any(PendingSignup.class), eq(IP)))
                .thenReturn(new SignupStartedResource(EMAIL, 600, 60));

        SignupStartedResource started =
                service.registerCustomer(signUp("  An@Example.com ", "0900000002"), IP);

        ArgumentCaptor<PendingSignup> parked = ArgumentCaptor.forClass(PendingSignup.class);
        verify(emailVerification).start(parked.capture(), eq(IP));
        assertThat(parked.getValue().email()).isEqualTo(EMAIL);
        assertThat(parked.getValue().address()).isEqualTo(BEN_THANH_TEXT);
        assertThat(parked.getValue().addressParts().getWardCode()).isEqualTo("26743");
        assertThat(parked.getValue().passwordHash()).isEqualTo("bcrypt");
        assertThat(parked.getValue().language()).isEqualTo("vi");
        assertThat(started.codeExpiresInSeconds()).isEqualTo(600);
        verify(userRepository, never()).save(any());
    }

    @Test
    void aFilledHoneypotSendsNothing() {
        addressResolves();
        when(emailVerification.decoy(EMAIL)).thenReturn(new SignupStartedResource(EMAIL, 600, 60));
        CustomerRegisterRequest bot =
                new CustomerRegisterRequest(
                        "Bot", "0900000002", EMAIL, BEN_THANH, PASSWORD, PASSWORD, "en", "http://spam");

        service.registerCustomer(bot, IP);

        verify(emailVerification, never()).start(any(), any());
        verify(passwordEncoder, never()).encode(any());
    }

    @Test
    void theRightCodeCreatesTheAccountAndSignsIn() {
        when(emailVerification.verify(EMAIL, "123456"))
                .thenReturn(new VerifiedSignup(parked(EMAIL), "hash", 500));
        when(userRepository.save(any(User.class)))
                .thenAnswer(
                        call -> {
                            User saved = call.getArgument(0);
                            saved.setId(1L);
                            return saved;
                        });

        AuthResult result = service.completeSignup(EMAIL, "123456");

        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(saved.capture());
        assertThat(saved.getValue().getPasswordHash()).isEqualTo("bcrypt");
        assertThat(saved.getValue().getRole()).isEqualTo(RoleType.CUSTOMER);
        assertThat(saved.getValue().getAddressParts().getWardCode()).isEqualTo("26743");
        assertThat(result.accessToken()).isEqualTo("access");
        assertThat(result.user().address()).isEqualTo(BEN_THANH_TEXT);
        // No transaction in a unit test, so the after-commit clean-up runs straight away
        verify(emailVerification).discard(EMAIL);
    }

    @Test
    void aSignUpThatLostTheRaceIsDiscarded() {
        when(emailVerification.verify(EMAIL, "123456"))
                .thenReturn(new VerifiedSignup(parked(EMAIL), "hash", 500));
        when(userRepository.existsByEmail(EMAIL)).thenReturn(true);

        DuplicateAccountException e =
                catchThrowableOfType(
                        DuplicateAccountException.class, () -> service.completeSignup(EMAIL, "123456"));

        assertThat(e.getFields()).containsOnlyKeys("email");
        verify(emailVerification).discard(EMAIL);
        verify(userRepository, never()).save(any());
    }
```

In `AuthExceptionHandlerTest` add:

```java
    @Test
    void aWrongSignUpCodeCarriesTheTriesLeft() {
        ResponseEntity<ApiResource<Void>> response =
                handler.signupCodeInvalid(new SignupCodeInvalidException(3));

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(code(response)).isEqualTo("SIGNUP_CODE_INVALID");
        assertThat(response.getBody().getError().getDetails())
                .extracting(FieldErrorResource::getField, FieldErrorResource::getMessage)
                .contains(tuple("attemptsLeft", "3"));
    }

    @Test
    void usedUpCodesAndExpiredSignUpsHaveTheirOwnCodes() {
        assertThat(code(handler.signupCodeExpired(new SignupCodeExpiredException())))
                .isEqualTo("SIGNUP_CODE_EXPIRED");
        ResponseEntity<ApiResource<Void>> gone = handler.signupExpired(new SignupExpiredException());
        assertThat(gone.getStatusCode().value()).isEqualTo(410);
        assertThat(code(gone)).isEqualTo("SIGNUP_EXPIRED");
    }

    @Test
    void tooManyCodesSaysWhenToTryAgain() {
        ResponseEntity<ApiResource<Void>> response =
                handler.signupRateLimited(new SignupRateLimitedException(42));

        assertThat(response.getStatusCode().value()).isEqualTo(429);
        assertThat(code(response)).isEqualTo("RATE_LIMITED");
        assertThat(response.getHeaders().getFirst(HttpHeaders.RETRY_AFTER)).isEqualTo("42");
    }
```

- [ ] **Step 3: Run — expect compile failures**
  (`-Dtest=UserServiceTest,AuthExceptionHandlerTest,CustomerRegisterRequestTest`).

- [ ] **Step 4: Implement the service**

`UserServiceInterface`: replace the `registerCustomer` line with

```java
    /** FR-001 + FR-009: park the form and mail a code; no account exists yet. */
    SignupStartedResource registerCustomer(CustomerRegisterRequest request, String clientIp);

    /** FR-009: the right code creates the customer account and signs it in. */
    AuthResult completeSignup(String email, String code);
```

`UserService`: add the field **last** in the field list (the class uses `@AllArgsConstructor`):

```java
    private final EmailVerificationServiceInterface emailVerification;
```

Replace `registerCustomer` (`:83-116`) with:

```java
    /**
     * FR-001 + FR-009: check the form, then hold it in Redis until the code mailed to that address
     * is entered. No account exists before that.
     */
    @Override
    public SignupStartedResource registerCustomer(CustomerRegisterRequest request, String clientIp) {
        if (!request.password().equals(request.confirmPassword())) {
            throw new InvalidFieldException("confirmPassword", "Passwords do not match.");
        }
        String email = EmailVerificationService.normalizeEmail(request.email());
        String phone = request.phone().trim();
        throwIfTaken(email, phone);
        ResolvedAddress address =
                addressService.resolve(request.addressParts(), AddressPolicy.ACCOUNT);
        if (StringUtils.hasText(request.website())) {
            // Honeypot: people never see this field, so only a bot fills it in
            log.info("Sign-up honeypot filled in, request dropped");
            return emailVerification.decoy(email);
        }
        PendingSignup pending =
                new PendingSignup(
                        request.fullName().trim(),
                        email,
                        phone,
                        address.formatted(),
                        address.columns(),
                        passwordEncoder.encode(request.password()),
                        EmailVerificationService.normalizeLanguage(request.language()));
        return emailVerification.start(pending, clientIp);
    }

    /**
     * FR-009: the right code turns the parked form into an account and signs it in, like the old
     * register did. If saving fails the code is given back so the person can try again.
     */
    @Override
    @Transactional
    public AuthResult completeSignup(String email, String code) {
        VerifiedSignup verified = emailVerification.verify(email, code);
        PendingSignup pending = verified.pending();
        try {
            throwIfTaken(pending.email(), pending.phone());
        } catch (DuplicateAccountException e) {
            // Someone else finished first with this email or phone: this sign-up can never succeed
            emailVerification.discard(pending.email());
            throw e;
        }
        User user =
                userRepository.save(
                        User.builder()
                                .fullName(pending.fullName())
                                .email(pending.email())
                                .phone(pending.phone())
                                .address(pending.address())
                                .addressParts(pending.addressParts())
                                .passwordHash(pending.passwordHash())
                                .role(RoleType.CUSTOMER)
                                .build());
        TransactionHelper.afterCompletion(
                () -> emailVerification.discard(pending.email()),
                () -> emailVerification.restore(verified));
        return issueTokens(user);
    }

    /** Check both before failing, so the form marks every taken field in one go (QA BUG-005). */
    private void throwIfTaken(String email, String phone) {
        Map<String, String> taken = new LinkedHashMap<>();
        if (userRepository.existsByEmail(email)) {
            taken.put("email", "This email is already registered.");
        }
        if (userRepository.existsByPhone(phone)) {
            taken.put("phone", "This phone number is already registered.");
        }
        if (!taken.isEmpty()) {
            throw new DuplicateAccountException(taken);
        }
    }
```

Imports: `EmailVerificationService`, `EmailVerificationServiceInterface`, `PendingSignup`, `SignupStartedResource`,
`VerifiedSignup`, `TransactionHelper`, `org.springframework.util.StringUtils` (check the one already imported).

- [ ] **Step 5: Controller, handler, CORS**

`AuthController` — add the field `private final EmailVerificationServiceInterface emailVerification;` and replace the
register method:

```java
    /** FR-001 + FR-009: nothing is created yet — the account waits for the code mailed to the address. */
    @PostMapping("/register")
    public ResponseEntity<ApiResource<SignupStartedResource>> registerCustomer(
            @Valid @RequestBody CustomerRegisterRequest request, HttpServletRequest httpRequest) {
        SignupStartedResource started =
                userService.registerCustomer(request, IpHelper.getClientIp(httpRequest));
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(ApiResource.success(started, "We sent a 6-digit code to your email."));
    }

    /** FR-009: the right code creates the account and signs in — the answer the old /register gave. */
    @PostMapping("/register/verify")
    public ResponseEntity<ApiResource<RegisterResource>> verifySignup(
            @Valid @RequestBody SignupVerifyRequest request) {
        AuthResult auth = userService.completeSignup(request.email(), request.code());
        ResponseCookie refreshCookie =
                CookieHelper.buildRefreshTokenCookie(
                        auth.refreshToken(),
                        Duration.ofDays(authConfig.getRefreshTokenTTLDays()),
                        auth.rememberMe());
        RegisterResource body = new RegisterResource(auth.accessToken(), auth.user());
        return ResponseEntity.status(HttpStatus.CREATED)
                .header(HttpHeaders.SET_COOKIE, refreshCookie.toString())
                .body(ApiResource.success(body, "Account created."));
    }

    /** FR-009: a new code, after the one-minute cooldown and within the hourly limits. */
    @PostMapping("/register/resend")
    public ResponseEntity<ApiResource<SignupStartedResource>> resendSignupCode(
            @Valid @RequestBody SignupResendRequest request, HttpServletRequest httpRequest) {
        return ok(
                emailVerification.resend(request.email(), IpHelper.getClientIp(httpRequest)),
                "We sent a new code to your email.");
    }
```

`AuthExceptionHandler` — add after the MFA handlers:

```java
    /** FR-009: details carry the field message and the tries left as a number the FE translates. */
    @ExceptionHandler(SignupCodeInvalidException.class)
    ResponseEntity<ApiResource<Void>> signupCodeInvalid(SignupCodeInvalidException e) {
        return error(
                HttpStatus.BAD_REQUEST,
                "SIGNUP_CODE_INVALID",
                e.getMessage(),
                List.of(
                        FieldErrorResource.builder().field("code").message(e.getMessage()).build(),
                        FieldErrorResource.builder()
                                .field("attemptsLeft")
                                .message(String.valueOf(e.getAttemptsLeft()))
                                .build()));
    }

    @ExceptionHandler(SignupCodeExpiredException.class)
    ResponseEntity<ApiResource<Void>> signupCodeExpired(SignupCodeExpiredException e) {
        return error(HttpStatus.BAD_REQUEST, "SIGNUP_CODE_EXPIRED", e.getMessage(), List.of());
    }

    /** FR-009: the parked form is gone (30 minutes) — the person fills the form in again. */
    @ExceptionHandler(SignupExpiredException.class)
    ResponseEntity<ApiResource<Void>> signupExpired(SignupExpiredException e) {
        return error(HttpStatus.GONE, "SIGNUP_EXPIRED", e.getMessage(), List.of());
    }

    @ExceptionHandler(SignupRateLimitedException.class)
    ResponseEntity<ApiResource<Void>> signupRateLimited(SignupRateLimitedException e) {
        ErrorResource error = ErrorResource.builder().code("RATE_LIMITED").details(List.of()).build();
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .header(HttpHeaders.RETRY_AFTER, String.valueOf(e.getRetryAfterSeconds()))
                .body(ApiResource.error(error, e.getMessage()));
    }
```

`SecurityConfig:59`:

```java
        // Retry-After: the sign-up screen counts down after a 429 (FR-009)
        config.setExposedHeaders(List.of("X-Trace-Id", "Retry-After"));
```

- [ ] **Step 6: Run the whole user module + new classes — expect PASS**

`-Dtest='UserServiceTest,AuthExceptionHandlerTest,CustomerRegisterRequestTest,EmailVerificationServiceTest,RedisSignupStoreTest,SignupCodeMail*,MailServiceTest,MailTemplatesTest,PasswordResetServiceTest,MfaServiceTest'`

Also compile everything: `./mvnw -B -q -DskipTests compile test-compile` in the same container.

- [ ] **Step 7: Commit** — `feat(FR-009): register returns 202 and the account is created at /register/verify`.

---

### Task 7: Configuration and documents

**Files:**
- Modify: `docker-compose.yml` (backend `environment`), `docker-compose.prod.yml` (backend `environment`)
- Modify: `.env.example`, `.env.production.example`
- Modify: `docs/setup.md`, `docs/api-contract.md` (§1.1 + HTTP code table), `docs/decisions.md` (D-14),
  `.ai/REQUIREMENTS.md` (mục A)

- [ ] **Step 1: Compose and env files**

Backend `environment` in both compose files (next to the other app variables):

```yaml
      # FR-009 / FR-007: SMTP for the sign-up code and password emails; empty user → mails go to the log
      MAIL_HOST: ${MAIL_HOST:-smtp.gmail.com}
      MAIL_PORT: ${MAIL_PORT:-587}
      MAIL_USERNAME: ${MAIL_USERNAME:-}
      MAIL_PASSWORD: ${MAIL_PASSWORD:-}
```

`.env.example` and `.env.production.example`:

```bash
# ---- Mail (FR-009 sign-up code, FR-007 password reset) ----
# Gmail: turn on 2-Step Verification, create an App Password, paste it below (docs/setup.md).
# Empty MAIL_USERNAME = mails are written to the backend log instead of being sent.
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=
MAIL_PASSWORD=
```

Validate: `docker compose config -q` (must print nothing).

- [ ] **Step 2: Documents**

- `.ai/REQUIREMENTS.md`, after FR-007:
  `| FR-009 | Xác thực email bằng mã 6 số khi Customer đăng ký bằng email; chống spam gửi mã (chờ 60s, 5 lần/email/giờ, 20 lần/IP/giờ, sai tối đa 5 lần) | SHOULD | Guest | BE1/FE2 | WIP |`
- `docs/decisions.md`: add **D-14 · Xác minh email trước khi tạo tài khoản** (date 28/09/2026, LEAD): the chosen
  approach, why (no unverified rows, no squatting, login untouched), the limits table, error codes, and that Google
  sign-in and farmer upgrade are not affected. Update the "13 quyết định" count in the root `CLAUDE.md` table to 14.
- `docs/api-contract.md` §1.1: `POST /auth/register` → **202** `{email, codeExpiresInSeconds,
  resendAvailableInSeconds}` (+ optional `language`, `website`); new rows for `POST /auth/register/verify`
  (`{email, code}` → 201 `{accessToken, user}` + cookie) and `POST /auth/register/resend` (`{email}` → 200 same shape
  as register); the four error codes with HTTP status; `Retry-After` on 429; add 410 to the HTTP status table.
- `docs/setup.md`: a "Mail (SMTP)" section — Gmail App Password steps, the four variables, `make up` after editing
  `.env`, and "no SMTP yet: `docker logs -f intervue-backend | grep -A14 'Mail is not configured'` shows the code".

- [ ] **Step 3: Commit** — `docs(FR-009): contract, decision D-14, requirement row and SMTP setup`.

---

### Task 8: `CodeInput` component

**Files:**
- Create: `frontend/src/components/ui/code-input.tsx`
- Test: `frontend/src/components/ui/code-input.test.tsx`
- Create: `docs/design-system/components/CodeInput.md`

**Interfaces:**
- Produces: `export function CodeInput(props: { id: string; label: string; value: string; onChange: (value: string)
  => void; onComplete?: (code: string) => void; length?: number; invalid?: boolean; disabled?: boolean;
  describedBy?: string; ref?: Ref<HTMLInputElement> })`.

- [ ] **Step 1: Failing test**

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CodeInput } from './code-input';

afterEach(cleanup);

const Harness = ({ onComplete }: { onComplete?: (code: string) => void }) => {
  const [value, setValue] = useState('');
  return <CodeInput id="code" label="Six-digit code" value={value} onChange={setValue} onComplete={onComplete} />;
};

describe('CodeInput', () => {
  it('keeps digits only', async () => {
    render(<Harness />);
    const input = screen.getByLabelText('Six-digit code');
    await userEvent.type(input, '4a8-2');
    expect(input).toHaveValue('482');
  });

  /** Review Focus #5. */
  it('takes a pasted code with a space or a dash', async () => {
    const onComplete = vi.fn();
    render(<Harness onComplete={onComplete} />);
    const input = screen.getByLabelText('Six-digit code');
    await userEvent.click(input);
    await userEvent.paste('123 456');
    expect(input).toHaveValue('123456');
    expect(onComplete).toHaveBeenCalledWith('123456');
  });

  it('calls onComplete once, on the last digit', async () => {
    const onComplete = vi.fn();
    render(<Harness onComplete={onComplete} />);
    const input = screen.getByLabelText('Six-digit code');
    await userEvent.type(input, '1234567');
    expect(input).toHaveValue('123456');
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('backspace removes the last digit', async () => {
    render(<Harness />);
    const input = screen.getByLabelText('Six-digit code');
    await userEvent.type(input, '123{Backspace}');
    expect(input).toHaveValue('12');
  });

  it('asks the browser for a one-time code and the number keypad', () => {
    render(<Harness />);
    const input = screen.getByLabelText('Six-digit code');
    expect(input).toHaveAttribute('autocomplete', 'one-time-code');
    expect(input).toHaveAttribute('inputmode', 'numeric');
  });
});
```

- [ ] **Step 2: Run — expect FAIL (module not found).**

- [ ] **Step 3: Implement**

```tsx
import { useState, type ChangeEvent, type Ref } from 'react';
import Helper from '@/utils/helper';

type CodeInputProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Called once, when the last digit goes in. */
  onComplete?: (code: string) => void;
  length?: number;
  invalid?: boolean;
  disabled?: boolean;
  describedBy?: string;
  ref?: Ref<HTMLInputElement>;
};

/**
 * One-time code entry (design system `CodeInput`, FR-009). One real input — so paste, the browser's one-time-code
 * autofill and screen readers behave as usual — drawn as one box per digit. No maxLength on purpose: a pasted
 * "123 456" is 7 characters and the browser would cut it before the spaces are stripped.
 */
export function CodeInput({
  id,
  label,
  value,
  onChange,
  onComplete,
  length = 6,
  invalid,
  disabled,
  describedBy,
  ref,
}: CodeInputProps) {
  const [focused, setFocused] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, length);
    onChange(digits);
    if (digits.length === length && value.length < length) onComplete?.(digits);
  };

  const active = Math.min(value.length, length - 1);

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-small text-ink font-bold">
        {label}
      </label>
      <div className="relative w-fit">
        <input
          ref={ref}
          id={id}
          value={value}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className="absolute inset-0 z-1 size-full cursor-text text-[16px] opacity-0 disabled:cursor-not-allowed"
        />
        <div aria-hidden="true" className="flex gap-2">
          {Array.from({ length }, (_, i) => (
            <span
              key={i}
              className={Helper.cn(
                'grid h-14 w-11 place-items-center rounded-sm border-[1.5px] font-mono text-[28px] sm:w-12',
                disabled ? 'bg-surface-sunken text-ink-muted' : 'bg-surface-raised text-ink',
                invalid ? 'border-danger' : 'border-line-strong',
                focused && !disabled && i === active && 'outline-focus outline-2 outline-offset-1',
              )}
            >
              {value[i] ?? ''}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
```

`CodeInput.md` (same layout as `Field.md`): purpose (one-time codes: sign-up email code; the admin 2FA screen keeps
its single `Field` for now), anatomy (label → 6 boxes → hint/error line under it, owned by the page), behaviour
(digits only, paste with spaces/dashes, `one-time-code` autofill, `onComplete` on the last digit, active box shows
the focus ring, `invalid` → danger borders, `disabled` → sunken boxes), accessibility (one labelled input, boxes are
`aria-hidden`, the page puts errors in a `Banner` and links hints with `describedBy`), do/don't (don't split into six
inputs; don't use `font-hand`; don't auto-submit without also offering a submit button).

- [ ] **Step 4: Run — expect PASS** (vitest `src/components/ui/code-input.test.tsx`, eslint, prettier).
- [ ] **Step 5: Commit** — `feat(FR-009): add a CodeInput component for one-time codes`.

---

### Task 9: Verify screen, API client, sign-up session storage

**Files:**
- Modify: `frontend/src/types/auth.types.ts` (RegisterInput + 2 types)
- Modify: `frontend/src/api-requests/auth.requests.ts` (register type, `verifySignup`, `resendSignupCode`)
- Modify: `frontend/src/utils/helper.ts` (`getRetryAfterSeconds`)
- Create: `frontend/src/lib/signup.ts`
- Modify: `frontend/src/constants/nav.ts` (`REGISTER_PATH`, `VERIFY_EMAIL_PATH`)
- Create: `frontend/src/pages/auth/VerifyEmail/index.tsx`, `frontend/src/pages/auth/VerifyEmail/index.test.tsx`
- Modify: `frontend/src/App.tsx` (route under `AuthLayout`, next to `register/customer`)
- Create: `frontend/src/locales/en/VerifyEmail.json` + the 9 other languages
- Modify: `frontend/src/i18n/resources.ts` (import + `VerifyEmail` in the `en` map)

**Interfaces:**
- Produces: `SignupStartedType = { email: string; codeExpiresInSeconds: number; resendAvailableInSeconds: number }`,
  `SignupVerifyInput = { email: string; code: string }`; `AuthApi.register(input) → ApiResponse<SignupStartedType>`,
  `AuthApi.verifySignup(input) → ApiResponse<AuthResultType>`, `AuthApi.resendSignupCode(email) →
  ApiResponse<SignupStartedType>`; `Helper.getRetryAfterSeconds(error) → number | undefined`;
  `SignupStore.{fromStarted, savePending, setPending, getPending, clearPending, saveDraft, getDraft, clear}`;
  `type PendingSignup = { email: string; codeExpiresAt: number; resendAt: number }`,
  `type SignupDraft = Pick<RegisterInput, 'fullName' | 'phone' | 'email' | 'addressParts'>`.

- [ ] **Step 1: Types, API, helper, storage, paths**

`auth.types.ts` — extend `RegisterInput` and add:

```ts
export type RegisterInput = {
  fullName: string;
  phone: string;
  email: string;
  addressParts: AddressParts;
  password: string;
  confirmPassword: string;
  /** FR-009: language of the code email (i18n.resolvedLanguage). */
  language?: string;
  /** FR-009: honeypot, always empty from a person. */
  website?: string;
};

/** FR-009: register and resend answer with this — no account exists yet. */
export type SignupStartedType = {
  email: string;
  codeExpiresInSeconds: number;
  resendAvailableInSeconds: number;
};

export type SignupVerifyInput = {
  email: string;
  code: string;
};
```

`auth.requests.ts` — replace `register` and add two methods:

```ts
  /** FR-001 + FR-009: 202, no session yet — the account is created by verifySignup. */
  static register = async (input: RegisterInput) => {
    const response = await publicApi.post<ApiResponse<SignupStartedType>>('/auth/register', input);
    return response.data;
  };

  /** FR-009: the right code creates the account; the backend signs in (accessToken + refresh cookie). */
  static verifySignup = async (input: SignupVerifyInput) => {
    const response = await publicApi.post<ApiResponse<AuthResultType>>('/auth/register/verify', input);
    return response.data;
  };

  /** FR-009: a new code; 429 RATE_LIMITED carries Retry-After. */
  static resendSignupCode = async (email: string) => {
    const response = await publicApi.post<ApiResponse<SignupStartedType>>('/auth/register/resend', { email });
    return response.data;
  };
```

`helper.ts` — add to the class:

```ts
  /** The Retry-After header of a 429, in seconds (exposed by the backend's CORS config). */
  static getRetryAfterSeconds(error: unknown): number | undefined {
    if (!(error instanceof AxiosError)) return undefined;
    const seconds = Number(error.response?.headers?.['retry-after']);
    return Number.isFinite(seconds) && seconds > 0 ? seconds : undefined;
  }
```

`lib/signup.ts`:

```ts
import type { RegisterInput, SignupStartedType } from '@/types/auth.types';

/** FR-009: what the verify screen needs after the form, kept for this tab only (sessionStorage). */
export type PendingSignup = { email: string; codeExpiresAt: number; resendAt: number };

/** The form without the passwords, so "Change email" comes back to a filled form. */
export type SignupDraft = Pick<RegisterInput, 'fullName' | 'phone' | 'email' | 'addressParts'>;

const PENDING_KEY = 'ml.signup.pending';
const DRAFT_KEY = 'ml.signup.draft';

const read = <T>(key: string): T | null => {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

const write = (key: string, value: unknown) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage blocked: the screen still works until the tab reloads
  }
};

const remove = (key: string) => {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // nothing to clean up
  }
};

const SignupStore = {
  fromStarted(started: SignupStartedType, now = Date.now()): PendingSignup {
    return {
      email: started.email,
      codeExpiresAt: now + started.codeExpiresInSeconds * 1000,
      resendAt: now + started.resendAvailableInSeconds * 1000,
    };
  },
  savePending(started: SignupStartedType): PendingSignup {
    const pending = SignupStore.fromStarted(started);
    write(PENDING_KEY, pending);
    return pending;
  },
  setPending: (pending: PendingSignup) => write(PENDING_KEY, pending),
  getPending: () => read<PendingSignup>(PENDING_KEY),
  clearPending: () => remove(PENDING_KEY),
  saveDraft: (draft: SignupDraft) => write(DRAFT_KEY, draft),
  getDraft: () => read<SignupDraft>(DRAFT_KEY),
  clear() {
    remove(PENDING_KEY);
    remove(DRAFT_KEY);
  },
};

export default SignupStore;
```

`constants/nav.ts`:

```ts
/** FR-001 / FR-009: the sign-up form and the screen that takes the emailed code. */
export const REGISTER_PATH = '/register/customer';
export const VERIFY_EMAIL_PATH = '/register/verify';
```

- [ ] **Step 2: English copy `locales/en/VerifyEmail.json`**

```json
{
  "title": "Check your email",
  "sentTo": "We sent a 6-digit code to <b>{{email}}</b>. Enter it here to finish creating your account.",
  "codeLabel": "Six-digit code",
  "expiresIn": "The code expires in {{time}}.",
  "expired": "This code has expired. Send a new one.",
  "submit": "Verify and create account",
  "submitting": "Checking the code…",
  "enterAll": "Enter all 6 digits to continue.",
  "help": "Nothing after a minute? Look in spam, or send a new code.",
  "resend": "Send a new code",
  "resendIn_one": "Send a new code in {{count}} second",
  "resendIn_other": "Send a new code in {{count}} seconds",
  "resending": "Sending…",
  "changeEmail": "Wrong email? Change it",
  "fillAgain": "Fill in the form again",
  "haveAccount": "I already have an account",
  "wrong": {
    "title": "That code is not right",
    "text_one": "Check the email and try again. You have {{count}} try left.",
    "text_other": "Check the email and try again. You have {{count}} tries left."
  },
  "usedUp": {
    "title": "This code can no longer be used",
    "text": "Send a new code and enter the one from the newest email."
  },
  "signupExpired": {
    "title": "Your sign-up has expired",
    "text": "We keep an unfinished sign-up for 30 minutes. Fill in the form again to get a new code."
  },
  "duplicate": {
    "title": "This email or phone number is taken",
    "text": "Someone finished signing up with it first. Go back and use another one."
  },
  "toast": {
    "created": "Account created.",
    "resent": "We sent a new code.",
    "tooMany_one": "Too many codes requested. Try again in {{count}} minute.",
    "tooMany_other": "Too many codes requested. Try again in {{count}} minutes.",
    "failed": "Could not check the code. Please try again."
  }
}
```

Translate into `vi zh ja ko fr es de th id` with the same keys (languages without a singular form keep only
`_other`, as the other namespaces do; `src/i18n/locales.test.ts` checks it). Register in `resources.ts`:
`import verifyEmail from '@/locales/en/VerifyEmail.json';` and `VerifyEmail: verifyEmail,` in the `en` map.

- [ ] **Step 3: Failing page test `VerifyEmail/index.test.tsx`**

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, AxiosHeaders } from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AuthApi from '@/api-requests/auth.requests';
import SignupStore from '@/lib/signup';
import Session from '@/utils/session';
import VerifyEmailPage from './index';

vi.mock('@/api-requests/auth.requests', () => ({
  default: { verifySignup: vi.fn(), resendSignupCode: vi.fn() },
}));
vi.mock('@/utils/session', () => ({ default: { save: vi.fn() } }));

const apiError = (status: number, code: string, details: { field: string; message: string }[] = [], headers = {}) =>
  new AxiosError('failed', String(status), undefined, undefined, {
    status,
    statusText: '',
    headers,
    config: { headers: new AxiosHeaders() },
    data: { success: false, message: 'x', data: null, error: { code, details } },
  });

const park = (resendInMs = 60_000) =>
  SignupStore.setPending({
    email: 'lan@example.com',
    codeExpiresAt: Date.now() + 600_000,
    resendAt: Date.now() + resendInMs,
  });

const renderAt = () =>
  render(
    <MemoryRouter initialEntries={['/register/verify']}>
      <Routes>
        <Route path="/register/verify" element={<VerifyEmailPage />} />
        <Route path="/register/customer" element={<p>the form</p>} />
        <Route path="/" element={<p>home</p>} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  sessionStorage.clear();
  vi.mocked(AuthApi.verifySignup).mockReset();
  vi.mocked(AuthApi.resendSignupCode).mockReset();
});
afterEach(cleanup);

describe('VerifyEmail', () => {
  /** Review Focus #5. */
  it('redirects to the form when nothing is pending', () => {
    renderAt();
    expect(screen.getByText('the form')).toBeInTheDocument();
  });

  /** Review Focus #5. */
  it('survives a reload: the address comes back from this tab', () => {
    park();
    renderAt();
    expect(screen.getByText('lan@example.com')).toBeInTheDocument();
  });

  it('the right code signs in and goes home', async () => {
    park();
    vi.mocked(AuthApi.verifySignup).mockResolvedValue({
      success: true,
      message: 'Account created.',
      data: { accessToken: 'a', user: { id: 1 } },
    } as never);
    renderAt();

    await userEvent.type(screen.getByLabelText('Six-digit code'), '482917');

    expect(AuthApi.verifySignup).toHaveBeenCalledWith({ email: 'lan@example.com', code: '482917' });
    expect(Session.save).toHaveBeenCalled();
    expect(await screen.findByText('home')).toBeInTheDocument();
    expect(SignupStore.getPending()).toBeNull();
  });

  it('a wrong code says how many tries are left and clears the boxes', async () => {
    park();
    vi.mocked(AuthApi.verifySignup).mockRejectedValue(
      apiError(400, 'SIGNUP_CODE_INVALID', [{ field: 'attemptsLeft', message: '3' }]),
    );
    renderAt();

    await userEvent.type(screen.getByLabelText('Six-digit code'), '111111');

    expect(await screen.findByText('That code is not right')).toBeInTheDocument();
    expect(screen.getByText(/3 tries left/)).toBeInTheDocument();
    expect(screen.getByLabelText('Six-digit code')).toHaveValue('');
  });

  it('a used-up code locks the boxes until a new code is sent', async () => {
    park(-1);
    vi.mocked(AuthApi.verifySignup).mockRejectedValue(apiError(400, 'SIGNUP_CODE_EXPIRED'));
    vi.mocked(AuthApi.resendSignupCode).mockResolvedValue({
      success: true,
      message: 'ok',
      data: { email: 'lan@example.com', codeExpiresInSeconds: 600, resendAvailableInSeconds: 60 },
    } as never);
    renderAt();

    await userEvent.type(screen.getByLabelText('Six-digit code'), '111111');
    expect(await screen.findByText('This code can no longer be used')).toBeInTheDocument();
    expect(screen.getByLabelText('Six-digit code')).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Send a new code' }));
    expect(screen.getByLabelText('Six-digit code')).toBeEnabled();
  });

  it('too many codes counts down from Retry-After', async () => {
    park(-1);
    vi.mocked(AuthApi.resendSignupCode).mockRejectedValue(
      apiError(429, 'RATE_LIMITED', [], { 'retry-after': '1800' }),
    );
    renderAt();

    await userEvent.click(screen.getByRole('button', { name: 'Send a new code' }));

    expect(await screen.findByRole('button', { name: /Send a new code in 1800 seconds/ })).toBeDisabled();
  });

  it('an expired sign-up offers the form again', async () => {
    park();
    vi.mocked(AuthApi.verifySignup).mockRejectedValue(apiError(410, 'SIGNUP_EXPIRED'));
    renderAt();

    await userEvent.type(screen.getByLabelText('Six-digit code'), '111111');
    await userEvent.click(await screen.findByRole('button', { name: 'Fill in the form again' }));

    expect(screen.getByText('the form')).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run — expect FAIL (page missing).**

- [ ] **Step 5: Implement the page**

```tsx
import { useRef, useState, type SubmitEvent } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link, Navigate, useNavigate } from 'react-router';
import AuthApi from '@/api-requests/auth.requests';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CodeInput } from '@/components/ui/code-input';
import { REGISTER_PATH } from '@/constants/nav';
import useClock from '@/hooks/useClock';
import SignupStore, { type PendingSignup } from '@/lib/signup';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';
import Session from '@/utils/session';

const CODE_LENGTH = 6;

type Status =
  | { kind: 'idle' }
  | { kind: 'wrong'; attemptsLeft: number }
  | { kind: 'usedUp' }
  | { kind: 'signupExpired' }
  | { kind: 'duplicate' };

const secondsUntil = (deadline: number, now: number) => Math.max(0, Math.ceil((deadline - now) / 1000));
const minSec = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/** FR-009 — the 6-digit code mailed at sign-up; the right code creates the account and signs in. */
const VerifyEmailPage = () => {
  const { t } = useTranslation('VerifyEmail');
  const navigate = useNavigate();
  const codeRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingSignup | null>(() => SignupStore.getPending());
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const now = useClock(1000).getTime();

  if (!pending) return <Navigate to={REGISTER_PATH} replace />;

  const codeLeft = secondsUntil(pending.codeExpiresAt, now);
  const resendLeft = secondsUntil(pending.resendAt, now);
  const finished = status.kind === 'signupExpired' || status.kind === 'duplicate';
  const usedUp = status.kind === 'usedUp' || codeLeft === 0;
  const locked = finished || usedUp;

  const backToForm = () => {
    SignupStore.clearPending();
    navigate(REGISTER_PATH);
  };

  const submit = async (value: string) => {
    if (value.length !== CODE_LENGTH || isSubmitting || locked) return;
    setIsSubmitting(true);
    try {
      const response = await AuthApi.verifySignup({ email: pending.email, code: value });
      Session.save(response.data);
      SignupStore.clear();
      Notification.success({ text: t('toast.created') });
      navigate('/', { replace: true });
    } catch (error) {
      setCode('');
      switch (Helper.getErrorCode(error)) {
        case 'SIGNUP_CODE_INVALID': {
          const left = Number(Helper.getFieldErrors(error).attemptsLeft ?? 0);
          setStatus(left > 0 ? { kind: 'wrong', attemptsLeft: left } : { kind: 'usedUp' });
          codeRef.current?.focus();
          break;
        }
        case 'SIGNUP_CODE_EXPIRED':
          setStatus({ kind: 'usedUp' });
          break;
        case 'SIGNUP_EXPIRED':
          setStatus({ kind: 'signupExpired' });
          break;
        case 'DUPLICATE_ACCOUNT':
          setStatus({ kind: 'duplicate' });
          break;
        default:
          Notification.error({ text: Helper.getErrorMessage(error, t('toast.failed')) });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const resend = async () => {
    setIsResending(true);
    try {
      const response = await AuthApi.resendSignupCode(pending.email);
      setPending(SignupStore.savePending(response.data));
      setStatus({ kind: 'idle' });
      setCode('');
      Notification.success({ text: t('toast.resent') });
    } catch (error) {
      const errorCode = Helper.getErrorCode(error);
      if (errorCode === 'RATE_LIMITED') {
        const wait = Helper.getRetryAfterSeconds(error) ?? 60;
        const next = { ...pending, resendAt: Date.now() + wait * 1000 };
        SignupStore.setPending(next);
        setPending(next);
        Notification.warning({ text: t('toast.tooMany', { count: Math.ceil(wait / 60) }) });
      } else if (errorCode === 'SIGNUP_EXPIRED') {
        setStatus({ kind: 'signupExpired' });
      } else {
        Notification.error({ text: Helper.getErrorMessage(error, t('toast.failed')) });
      }
    } finally {
      setIsResending(false);
    }
  };

  const onSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    submit(code);
  };

  return (
    <Card className="mx-auto my-8 flex w-full max-w-115 flex-col gap-4 p-4 md:p-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-hand text-h1">{t('title')}</h1>
        <p className="text-body">
          <Trans t={t} i18nKey="sentTo" values={{ email: pending.email }} components={{ b: <b className="break-all" /> }} />
        </p>
      </div>

      {status.kind === 'wrong' && (
        <Banner variant="danger" title={t('wrong.title')}>
          {t('wrong.text', { count: status.attemptsLeft })}
        </Banner>
      )}
      {usedUp && !finished && (
        <Banner variant="warning" title={t('usedUp.title')}>
          {t('usedUp.text')}
        </Banner>
      )}
      {status.kind === 'signupExpired' && (
        <Banner variant="warning" title={t('signupExpired.title')}>
          {t('signupExpired.text')}
        </Banner>
      )}
      {status.kind === 'duplicate' && (
        <Banner variant="danger" title={t('duplicate.title')}>
          {t('duplicate.text')}
        </Banner>
      )}

      {finished ? (
        <Button onClick={backToForm}>{t('fillAgain')}</Button>
      ) : (
        <>
          <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
            <CodeInput
              ref={codeRef}
              id="signup-code"
              label={t('codeLabel')}
              value={code}
              onChange={setCode}
              onComplete={submit}
              invalid={status.kind === 'wrong'}
              disabled={isSubmitting || locked}
              describedBy="signup-code-hint"
            />
            <p id="signup-code-hint" className="text-ink-muted -mt-2 text-[13px]">
              {codeLeft === 0 ? t('expired') : t('expiresIn', { time: minSec(codeLeft) })}
            </p>
            <Button type="submit" disabled={code.length !== CODE_LENGTH || isSubmitting || locked}>
              {isSubmitting ? t('submitting') : t('submit')}
            </Button>
            {code.length !== CODE_LENGTH && !locked && (
              <p className="text-ink-muted -mt-2 text-[13px]">{t('enterAll')}</p>
            )}
          </form>

          <div className="flex flex-col gap-2">
            <p className="text-small text-ink-muted">{t('help')}</p>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="secondary" disabled={isResending || resendLeft > 0} onClick={resend} aria-live="polite">
                {isResending ? t('resending') : resendLeft > 0 ? t('resendIn', { count: resendLeft }) : t('resend')}
              </Button>
              <Button variant="ghost" onClick={backToForm}>
                {t('changeEmail')}
              </Button>
            </div>
          </div>
        </>
      )}

      <Link to="/login" className="text-small text-brand underline">
        {t('haveAccount')}
      </Link>
    </Card>
  );
};

export default VerifyEmailPage;
```

`App.tsx` — import `VerifyEmailPage from './pages/auth/VerifyEmail'` and add under `AuthLayout`, after
`register/customer`: `<Route path="register/verify" element={<VerifyEmailPage />} />`.

`backToForm` keeps the draft (`clearPending` only). If `useClock`'s `Date` return makes the React Compiler lint rule
complain about `getTime()` in render, keep `const now = useClock(1000).getTime();` — `useClock` already re-renders
every second and its value is state, not a ref.

- [ ] **Step 6: Run — expect PASS** (vitest `src/pages/auth/VerifyEmail src/i18n`, eslint, prettier, `tsc -b`).
- [ ] **Step 7: Commit** — `feat(FR-009): add the email code screen after sign-up`.

---

### Task 10: Sign-up form sends language + honeypot and hands over to the verify screen

**Files:**
- Modify: `frontend/src/pages/auth/RegisterCustomer/index.tsx`
- Create: `frontend/src/pages/auth/RegisterCustomer/index.test.tsx`
- Modify: `frontend/src/locales/*/RegisterCustomer.json` (10 files)

**Interfaces:**
- Consumes: `AuthApi.register → SignupStartedType`, `SignupStore.savePending/saveDraft/getDraft`,
  `VERIFY_EMAIL_PATH`.

- [ ] **Step 1: Failing test**

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AuthApi from '@/api-requests/auth.requests';
import SignupStore from '@/lib/signup';
import RegisterCustomerPage from './index';

vi.mock('@/api-requests/auth.requests', () => ({ default: { register: vi.fn() } }));
// The address block loads the country and ward lists; it has its own tests
vi.mock('@/components/address/AddressFields', () => ({ default: () => null }));
vi.mock('@/lib/address', () => ({
  validateAddress: () => ({}),
  cleanAddress: (a: unknown) => a,
  addressErrorsFrom: () => ({}),
}));

const renderForm = () =>
  render(
    <MemoryRouter initialEntries={['/register/customer']}>
      <Routes>
        <Route path="/register/customer" element={<RegisterCustomerPage />} />
        <Route path="/register/verify" element={<p>verify screen</p>} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  sessionStorage.clear();
  vi.mocked(AuthApi.register).mockReset();
});
afterEach(cleanup);

describe('RegisterCustomer', () => {
  it('sends the language and an empty honeypot, then opens the code screen', async () => {
    vi.mocked(AuthApi.register).mockResolvedValue({
      success: true,
      message: 'sent',
      data: { email: 'lan@example.com', codeExpiresInSeconds: 600, resendAvailableInSeconds: 60 },
    } as never);
    renderForm();

    await userEvent.type(screen.getByLabelText(/full name/i), 'Lan');
    await userEvent.type(screen.getByLabelText(/phone number/i), '0903118218');
    await userEvent.type(screen.getByLabelText(/^email/i), 'lan@example.com');
    await userEvent.type(screen.getByLabelText(/^password/i), 'secret123');
    await userEvent.type(screen.getByLabelText(/repeat password/i), 'secret123');
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(AuthApi.register).toHaveBeenCalledWith(expect.objectContaining({ language: 'en', website: '' }));
    expect(await screen.findByText('verify screen')).toBeInTheDocument();
    expect(SignupStore.getPending()?.email).toBe('lan@example.com');
    expect(JSON.stringify(SignupStore.getDraft())).not.toContain('secret123');
  });

  it('comes back filled in after "Change email"', () => {
    SignupStore.saveDraft({
      fullName: 'Lan',
      phone: '0903118218',
      email: 'old@example.com',
      addressParts: { countryCode: 'VN' } as never,
    });
    renderForm();

    expect(screen.getByLabelText(/^email/i)).toHaveValue('old@example.com');
    expect(screen.getByLabelText(/full name/i)).toHaveValue('Lan');
  });
});
```

(If the labels differ, read them from `locales/en/RegisterCustomer.json`; the password field's show/hide button must
not match `/^password/i` — use `getByLabelText('Password', { selector: 'input' })` if it does.)

- [ ] **Step 2: Run — expect FAIL** (it still calls `Session.save` and navigates home).

- [ ] **Step 3: Implement**

In `RegisterCustomer/index.tsx`:
- `const { t, i18n } = useTranslation('RegisterCustomer');`
- initial state: `useState<RegisterInput>(() => ({ ...EMPTY_FORM, ...SignupStore.getDraft() }))`
- `const [website, setWebsite] = useState('');`
- success branch replaces `Session.save` + toast + `navigate('/')`:

```ts
      const payload = {
        ...form,
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        addressParts: cleanAddress(form.addressParts),
      };
      const response = await AuthApi.register({
        ...payload,
        language: i18n.resolvedLanguage ?? i18n.language,
        website,
      });

      // FR-009: no account yet — it is created once the emailed code is entered
      SignupStore.savePending(response.data);
      SignupStore.saveDraft({
        fullName: payload.fullName,
        phone: payload.phone,
        email: payload.email,
        addressParts: payload.addressParts,
      });
      navigate(VERIFY_EMAIL_PATH);
```

- remove the now-unused `Session` and (if unused) `Notification.success` import usage; keep `Notification.error`.
- the honeypot, placed just before the consent checkbox:

```tsx
        {/* FR-009: a trap for form-filling bots; people never see or reach it */}
        <div aria-hidden="true" className="sr-only">
          <label htmlFor="website">{t('honeypot')}</label>
          <input
            id="website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </div>
```

`RegisterCustomer.json` (all 10): add `"honeypot": "Leave this field empty"`; change `fields.emailHint` to
"Used to sign in and for order notifications. We send a code to it to confirm it is yours."; delete
`toast.created` (no longer used — the verify screen owns that toast). Translate the two strings in the 9 other
files.

- [ ] **Step 4: Run — expect PASS** (vitest `src/pages/auth src/i18n`, eslint, prettier, `tsc -b`).
- [ ] **Step 5: Commit** — `feat(FR-009): the sign-up form hands over to the email code screen`.

---

### Task 11: Prototype

**Files:**
- Create: `docs/prototype/public/verify-email.html`, `docs/prototype/public/email-signup-code.html`
- Modify: `docs/prototype/public/register-customer.html` (Create account → `verify-email.html`)
- Modify: `docs/prototype/prototype.js` (`PT.SCREENS.public`), `docs/prototype/prototype.css` (code boxes)

- [ ] **Step 1: Code boxes in `prototype.css`** (next to `.pt-otp`):

```css
/* FR-009 code entry: one real input over six boxes, same as the app's CodeInput */
.pt-code { position: relative; width: fit-content; }
.pt-code input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; font-size: 16px; cursor: text; }
.pt-code-boxes { display: flex; gap: var(--space-2); }
.pt-code-boxes span { display: grid; place-items: center; width: 44px; height: 56px; box-sizing: border-box; border: 1.5px solid var(--line-strong); border-radius: var(--radius-sm); background: var(--surface-raised); font-family: var(--font-mono); font-size: 28px; color: var(--ink); }
.pt-code-boxes span.is-active { outline: 2px solid var(--focus); outline-offset: 1px; }
.pt-code.is-invalid .pt-code-boxes span { border-color: var(--danger); }
.pt-code.is-locked .pt-code-boxes span { background: var(--surface-sunken); color: var(--ink-muted); }
```

- [ ] **Step 2: `verify-email.html`** — same head as `forgot-password.html` (title `Confirm your email — MarketLink
  prototype`, `data-role="guest"`), one `ml-card pt-auth` with: `pt-title-sm` "Check your email", the sent-to line,
  `#alert` slot, the `.pt-code` field (label "Six-digit code", input `inputmode=numeric autocomplete=one-time-code`,
  six `span`s), hint "The code expires in 9:59." (live countdown), primary "Verify and create account", secondary
  "Send a new code in 60 seconds" (live countdown, then enabled; click → toast "We sent a new code." and restart), ghost
  "Wrong email? Change it" → `register-customer.html`, and a dashed prototype-only box with "Open the email" →
  `email-signup-code.html`. Script: digits-only fill of the boxes; `123456` → toast "Account created." then go to
  `../customer/dashboard.html`; any other code → `PT.banner('danger', 'That code is not right', 'Check the email and try
  again. You have N tries left.')` with N counting 4→1, and at 0 → `PT.banner('warning', 'This code can no longer be
  used', 'Send a new code and enter the one from the newest email.')` + `.is-locked`; a "Show the expired state"
  prototype-only link sets the countdown to 0. End with `PT.boot({ active: null, announce: false });`.

- [ ] **Step 3: `email-signup-code.html`** — PT shell (title `Sign-up code email — MarketLink prototype`) with a short
  caption ("What the person receives. The backend sends this exact layout from `backend/src/main/resources/mail/
  signup-code.html`, in the language they signed up in.") and the English email markup of Task 5 Step 1 inside a
  wrapper `<div style="background:#dcc59d">` (values: code `482917`, name `Lan`, email `lan@example.com`, 10 minutes).

- [ ] **Step 4: Wire it**

`register-customer.html`: the Create account link `href="../public/verify-email.html"`.
`prototype.js` `PT.SCREENS.public`, right after the customer registration row:

```js
      ['verify-email.html', 'Confirm your email', 'FR-009'],
      ['email-signup-code.html', 'Sign-up code email', 'FR-009'],
```

- [ ] **Step 5: Check in the browser** — serve `docs/prototype` (the `prototype` launch config, port 8765) and open
  both screens at 375 and 1440 px; the Screens sheet lists them.
- [ ] **Step 6: Commit** — `docs(FR-009): prototype the email code screen and the code email`.

---

### Task 12: Whole-feature verification, review, PR

- [ ] **Step 1: Backend** — in the container: `./mvnw -B -q spotless:check`, `./mvnw -B -q -DskipTests
  test-compile`, and the unit tests listed in Task 6 Step 6. The `@SpringBootTest` classes need MySQL; CI runs them.
- [ ] **Step 2: Frontend** — in the container: `npx prettier --check src`, `npx eslint .`, `npx tsc -b`,
  `npx vitest run`, `npx vite build`; remove `dist/` afterwards.
- [ ] **Step 3: A second stack from the worktree** — compose override in the scratchpad (container names `mlotp-*`,
  ports frontend 3031, backend 8097, debug 5021, no host ports for mysql/redis/rabbitmq, `VITE_API_URL=http://localhost:8097`,
  `CORS_ALLOWED_ORIGINS=http://localhost:3031`), `docker compose -p mlotp -f docker-compose.yml -f <override> up -d
  --build`, then `make seed`-equivalent through `docker exec -i mlotp-mysql …`.
- [ ] **Step 4: Drive the flow in Chrome** — register a new customer → verify screen → read the code with
  `docker logs mlotp-backend 2>&1 | grep -A16 'Mail is not configured' | tail -20` → wrong code once → right code →
  signed in at `/`. Also: resend inside 60 s is disabled; reload keeps the screen; 375 / 768 / 1440 px; light and
  dark; no console errors.
- [ ] **Step 5: Fresh whole-branch review** (superpowers:requesting-code-review) → fix what is real.
- [ ] **Step 6: Tear down the `mlotp` stack and its volumes**, push the branch, open the PR to `dev` with the
  template, mark FR-009 `STAGING` only after merge (QA ticks DONE).
