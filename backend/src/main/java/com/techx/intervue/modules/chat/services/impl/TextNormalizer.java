package com.techx.intervue.modules.chat.services.impl;

import java.text.Normalizer;
import java.util.Locale;

public final class TextNormalizer {

    private TextNormalizer() {}

    /** Chữ thường, bỏ dấu tiếng Việt, đ → d, chỉ giữ chữ/số, gộp khoảng trắng. */
    public static String normalize(String text) {
        if (text == null) {
            return "";
        }
        String lower = text.toLowerCase(Locale.ROOT).replace('đ', 'd');
        String noAccent = Normalizer.normalize(lower, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return noAccent.replaceAll("[^a-z0-9]+", " ").trim();
    }
}
