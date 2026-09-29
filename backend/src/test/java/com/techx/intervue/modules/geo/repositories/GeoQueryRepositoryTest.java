package com.techx.intervue.modules.geo.repositories;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.chat.services.impl.TextNormalizer;
import com.techx.intervue.modules.geo.resources.StreetResource;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class GeoQueryRepositoryTest {

    private static final String HCM = "79";

    @Autowired GeoQueryRepository repository;

    private List<String> search(List<String> words, int limit) {
        return repository.searchStreets(HCM, words, limit).stream()
                .map(StreetResource::name)
                .toList();
    }

    @Test
    void findsAStreetFromWordsTypedWithoutDiacritics() {
        assertThat(search(List.of("le", "loi"), 20)).contains("Lê Lợi");
    }

    @Test
    void everyWordMustMatch() {
        assertThat(search(List.of("nguyen", "hue"), 20))
                .isNotEmpty()
                .allSatisfy(
                        name ->
                                assertThat(name.toLowerCase())
                                        .contains("nguy")
                                        .containsAnyOf("huệ", "huê", "huề", "hue"));
    }

    @Test
    void namesStartingWithTheFirstWordComeFirst() {
        List<String> names = search(List.of("hai"), 20);

        assertThat(names).isNotEmpty();
        assertThat(TextNormalizer.normalize(names.get(0))).startsWith("hai");
    }

    @Test
    void neverReturnsMoreThanTheLimit() {
        assertThat(search(List.of("a"), 20)).hasSize(20);
        assertThat(search(List.of("a"), 5)).hasSize(5);
    }

    @Test
    void likeWildcardsInTheInputAreLiteral() {
        assertThat(search(List.of("%"), 20)).isEmpty();
        assertThat(search(List.of("_"), 20)).isEmpty();
    }

    @Test
    void theMasterDataIsLoaded() {
        assertThat(repository.provinces()).hasSize(34);
        assertThat(repository.wards()).hasSize(3321);
        assertThat(repository.countries()).hasSizeGreaterThanOrEqualTo(249);
    }
}
