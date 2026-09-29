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
