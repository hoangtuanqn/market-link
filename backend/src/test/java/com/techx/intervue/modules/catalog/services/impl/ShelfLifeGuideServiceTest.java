package com.techx.intervue.modules.catalog.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.catalog.entities.ShelfLifeGuide;
import com.techx.intervue.modules.catalog.enums.StorageMode;
import com.techx.intervue.modules.catalog.repositories.CategoryRepository;
import com.techx.intervue.modules.catalog.repositories.ShelfLifeGuideRepository;
import com.techx.intervue.modules.catalog.repositories.ShelfLifePeerQueryRepository;
import com.techx.intervue.modules.catalog.resources.ShelfLifeGuideGroupResource;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ShelfLifeGuideServiceTest {

    private ShelfLifeGuideRepository guides;
    private ShelfLifePeerQueryRepository peers;
    private CategoryRepository categories;
    private ShelfLifeGuideService service;

    @BeforeEach
    void setUp() {
        guides = mock(ShelfLifeGuideRepository.class);
        peers = mock(ShelfLifePeerQueryRepository.class);
        categories = mock(CategoryRepository.class);
        service = new ShelfLifeGuideService(guides, peers, categories);
    }

    static ShelfLifeGuide guide(long id, String group, StorageMode mode, int days) {
        ShelfLifeGuide g = new ShelfLifeGuide();
        g.setId(id);
        g.setCategoryId(1L);
        g.setGroupName(group);
        g.setExamples("rau muống, lettuce");
        g.setStorageMode(mode);
        g.setSuggestedDays(days);
        g.setActive(true);
        return g;
    }

    @Test
    void groupsTheModesUnderEachGroupInOrder() {
        when(guides.findByCategoryIdAndActiveTrueOrderByGroupNameAscStorageModeAsc(1L))
                .thenReturn(
                        List.of(
                                guide(1L, "Leafy greens", StorageMode.ROOM, 1),
                                guide(2L, "Leafy greens", StorageMode.CHILLED, 3),
                                guide(3L, "Roots and bulbs", StorageMode.ROOM, 14)));
        when(peers.daysByGuide(anyCollection(), eq(10L))).thenReturn(Map.of());

        List<ShelfLifeGuideGroupResource> groups = service.listForCategory(1L, 10L);

        assertThat(groups)
                .extracting(ShelfLifeGuideGroupResource::groupName)
                .containsExactly("Leafy greens", "Roots and bulbs");
        assertThat(groups.getFirst().modes())
                .extracting(m -> m.storageMode() + ":" + m.suggestedDays())
                .containsExactly("room:1", "chilled:3");
        assertThat(groups.getFirst().examples()).isEqualTo("rau muống, lettuce");
    }

    /** Fewer than three products and the median stays hidden, so one stall is never exposed. */
    @Test
    void showsWhatOtherStallsSetOnlyFromThreeProducts() {
        when(guides.findByCategoryIdAndActiveTrueOrderByGroupNameAscStorageModeAsc(1L))
                .thenReturn(
                        List.of(
                                guide(1L, "Leafy greens", StorageMode.ROOM, 1),
                                guide(2L, "Leafy greens", StorageMode.CHILLED, 3)));
        when(peers.daysByGuide(anyCollection(), eq(null)))
                .thenReturn(Map.of(1L, List.of(1, 2), 2L, List.of(3, 5, 4)));

        var modes = service.listForCategory(1L, null).getFirst().modes();

        assertThat(modes.get(0).peerMedianDays()).isNull();
        assertThat(modes.get(0).peerCount()).isEqualTo(2);
        assertThat(modes.get(1).peerMedianDays()).isEqualTo(4);
        assertThat(modes.get(1).peerCount()).isEqualTo(3);
    }

    @Test
    void answersAnEmptyListForACategoryWithoutGroups() {
        when(guides.findByCategoryIdAndActiveTrueOrderByGroupNameAscStorageModeAsc(1L))
                .thenReturn(List.of());
        when(peers.daysByGuide(anyCollection(), eq(null))).thenReturn(Map.of());

        assertThat(service.listForCategory(1L, null)).isEmpty();
    }
}
