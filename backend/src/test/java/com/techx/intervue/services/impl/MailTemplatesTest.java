package com.techx.intervue.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Map;
import org.junit.jupiter.api.Test;

class MailTemplatesTest {

    private final MailTemplates templates = new MailTemplates();

    @Test
    void escapesValuesInTheHtmlPartOnly() {
        MailTemplates.Body body =
                templates.render("test-sample", Map.of("name", "<b>Lan</b> & co"));

        assertThat(body.html())
                .contains("&lt;b&gt;Lan&lt;/b&gt; &amp; co")
                .doesNotContain("<b>Lan</b>");
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
