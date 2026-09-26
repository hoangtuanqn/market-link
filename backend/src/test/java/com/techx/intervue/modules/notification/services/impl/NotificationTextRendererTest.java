package com.techx.intervue.modules.notification.services.impl;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.notification.config.NotificationMessagesConfig;
import com.techx.intervue.modules.notification.enums.NotificationKind;
import com.techx.intervue.modules.notification.resources.NotificationEvent;
import com.techx.intervue.modules.notification.resources.RenderedText;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class NotificationTextRendererTest {

    private final NotificationTextRenderer renderer =
            new NotificationTextRenderer(new NotificationMessagesConfig().notificationMessages());

    private static final List<NotificationKind> RENDERED =
            List.of(
                    NotificationKind.FARMER_APPLICATION,
                    NotificationKind.FARMER_APPROVED,
                    NotificationKind.FARMER_REJECTED,
                    NotificationKind.FARMER_SUSPENDED,
                    NotificationKind.FARMER_REINSTATED,
                    NotificationKind.TEST);

    @Test
    void rendersVietnameseAndFillsTheParams() {
        RenderedText t =
                renderer.render(
                        NotificationEvent.of(
                                NotificationKind.FARMER_APPROVED,
                                "/farmer",
                                Map.of("stall", "Cô Tư Garden")),
                        "vi");

        assertThat(t.title()).isEqualTo("Sạp của bạn đã được duyệt");
        assertThat(t.message()).contains("Cô Tư Garden").doesNotContain("{stall}");
    }

    @Test
    void anUnknownLanguageFallsBackToEnglish() {
        RenderedText t =
                renderer.render(
                        NotificationEvent.of(NotificationKind.TEST, "/settings", Map.of()), "xx");

        assertThat(t.title()).isEqualTo("Notifications are working");
    }

    @Test
    void aMissingLanguageFallsBackToEnglish() {
        RenderedText t =
                renderer.render(
                        NotificationEvent.of(NotificationKind.TEST, "/settings", Map.of()), null);

        assertThat(t.title()).isEqualTo("Notifications are working");
    }

    @Test
    void literalTextIsKeptAndOnlyTheMissingPartIsLookedUp() {
        NotificationEvent photo =
                new NotificationEvent(
                        NotificationKind.MESSAGE,
                        Map.of("sender", "Cô Tư"),
                        "/messages?c=1",
                        1L,
                        "Cô Tư",
                        null);

        assertThat(renderer.render(photo, "en"))
                .isEqualTo(new RenderedText("Cô Tư", "Cô Tư sent a photo"));
    }

    @Test
    void longTextIsCutToTheColumnSize() {
        NotificationEvent e =
                new NotificationEvent(
                        NotificationKind.MESSAGE,
                        Map.of(),
                        "/",
                        1L,
                        "t".repeat(200),
                        "m".repeat(600));

        RenderedText t = renderer.render(e, "en");

        assertThat(t.title()).hasSize(150).endsWith("…");
        assertThat(t.message()).hasSize(500).endsWith("…");
    }

    @Test
    void everyLanguageHasEveryKey() {
        for (String lang : List.of("en", "vi", "zh", "ja", "ko", "fr", "es", "de", "th", "id")) {
            for (NotificationKind k : RENDERED) {
                RenderedText t =
                        renderer.render(
                                NotificationEvent.of(k, "/", Map.of("stall", "S", "reason", "R")),
                                lang);
                assertThat(t.title())
                        .as(lang + " " + k)
                        .doesNotStartWith("notification.")
                        .isNotBlank();
                assertThat(t.message()).as(lang + " " + k).doesNotContain("{").isNotBlank();
            }
            RenderedText photo =
                    renderer.render(
                            new NotificationEvent(
                                    NotificationKind.MESSAGE,
                                    Map.of("sender", "S"),
                                    "/",
                                    1L,
                                    "S",
                                    null),
                            lang);
            assertThat(photo.message()).as(lang + " photo").contains("S").doesNotContain("{");
        }
    }

    @Test
    void nonEnglishBundlesAreReallyTranslated() {
        String en =
                renderer.render(NotificationEvent.of(NotificationKind.TEST, "/", Map.of()), "en")
                        .title();
        for (String lang : List.of("vi", "zh", "ja", "ko", "fr", "es", "de", "th", "id")) {
            assertThat(
                            renderer.render(
                                            NotificationEvent.of(
                                                    NotificationKind.TEST, "/", Map.of()),
                                            lang)
                                    .title())
                    .as(lang)
                    .isNotEqualTo(en);
        }
    }
}
