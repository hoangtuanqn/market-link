package com.techx.intervue.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.core.env.PropertySource;
import org.springframework.core.io.ClassPathResource;

/**
 * QA E2E v2 BUG-002: a request body Spring could not read came back with the whole Java stack
 * trace. Spring Boot 4 renamed server.error.* to spring.web.error.*, so the old keys in
 * application.yaml were silently ignored and DevTools switched the stack trace on in dev. This pins
 * the keys that are actually read.
 */
class ErrorPageConfigTest {

    @Test
    void errorPageNeverShowsInternalsUnderTheSpringBoot4Keys() throws Exception {
        List<PropertySource<?>> sources =
                new YamlPropertySourceLoader()
                        .load("application", new ClassPathResource("application.yaml"));
        PropertySource<?> yaml = sources.getFirst();

        assertThat(yaml.getProperty("spring.web.error.include-stacktrace")).hasToString("never");
        assertThat(yaml.getProperty("spring.web.error.include-message")).hasToString("never");
        assertThat(yaml.getProperty("spring.web.error.include-binding-errors"))
                .hasToString("never");
        assertThat(yaml.containsProperty("server.error.include-stacktrace")).isFalse();
    }
}
