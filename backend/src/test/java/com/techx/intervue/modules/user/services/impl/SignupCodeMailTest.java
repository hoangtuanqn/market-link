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
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
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
        mail =
                new SignupCodeMail(
                        new MailMessagesConfig().mailMessages(), new MailTemplates(), config);
    }

    private SignupCodeMail.Content build(String language, String name) {
        PendingSignup pending =
                new PendingSignup(
                        name, "lan@example.com", "0900000002", "addr", null, "hash", language);
        return mail.build(new IssuedSignupCode(pending, "004821"));
    }

    /** Review Focus #2: the code keeps its leading zeros in every part of the mail. */
    @ParameterizedTest
    @ValueSource(strings = {"en", "vi", "zh", "ja", "ko", "fr", "es", "de", "th", "id"})
    void everyLanguageHasTheWholeMail(String language) {
        SignupCodeMail.Content content = build(language, "Lan");

        assertThat(content.subject()).contains("004821");
        for (String part : List.of(content.subject(), content.html(), content.text())) {
            assertThat(part).doesNotContain("{0}").doesNotContain("''").doesNotContain("{{");
        }
        assertThat(content.text()).contains("004821").contains("lan@example.com").contains("10");
        assertThat(content.html()).contains("lang=\"" + language + "\"").contains("004821");
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
            properties.load(new InputStreamReader(in, StandardCharsets.UTF_8));
        }
        return properties;
    }
}
