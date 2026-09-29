package com.techx.intervue.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.core.env.PropertySource;
import org.springframework.core.io.ClassPathResource;

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
