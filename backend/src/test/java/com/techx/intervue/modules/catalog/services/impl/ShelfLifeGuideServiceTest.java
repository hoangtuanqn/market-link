package com.techx.intervue.modules.catalog.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.catalog.entities.ShelfLifeGuide;
import com.techx.intervue.modules.catalog.enums.StorageMode;
import com.techx.intervue.modules.catalog.exceptions.CategoryNotFoundException;
import com.techx.intervue.modules.catalog.exceptions.ShelfLifeGuideNotFoundException;
import com.techx.intervue.modules.catalog.repositories.CategoryRepository;
import com.techx.intervue.modules.catalog.repositories.ShelfLifeGuideRepository;
import com.techx.intervue.modules.catalog.repositories.ShelfLifePeerQueryRepository;
import com.techx.intervue.modules.catalog.requests.ShelfLifeGuideRequest;
import com.techx.intervue.modules.catalog.resources.ShelfLifeGuideGroupResource;
import com.techx.intervue.modules.catalog.resources.ShelfLifeGuideResource;
import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ShelfLifeGuideServiceTest {

    private static final long FARMER_USER = 1L;

    private static final long ADMIN_USER = 2L;

    private ShelfLifeGuideRepository guides;
    private ShelfLifePeerQueryRepository peers;
    private CategoryRepository categories;
    private FarmerProfileRepository farmers;
    private ShelfLifeGuideService service;

    @BeforeEach
    void setUp() {
        guides = mock(ShelfLifeGuideRepository.class);
        peers = mock(ShelfLifePeerQueryRepository.class);
        categories = mock(CategoryRepository.class);
        farmers = mock(FarmerProfileRepository.class);
        service = new ShelfLifeGuideService(guides, peers, categories, farmers);
        when(farmers.findByUserId(FARMER_USER))
                .thenReturn(
                        Optional.of(FarmerProfile.builder().id(10L).userId(FARMER_USER).build()));
        when(farmers.findByUserId(ADMIN_USER)).thenReturn(Optional.empty());
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

        List<ShelfLifeGuideGroupResource> groups = service.listForCategory(1L, FARMER_USER);

        assertThat(groups)
                .extracting(ShelfLifeGuideGroupResource::groupName)
                .containsExactly("Leafy greens", "Roots and bulbs");
        assertThat(groups.getFirst().modes())
                .extracting(m -> m.storageMode() + ":" + m.suggestedDays())
                .containsExactly("room:1", "chilled:3");
        assertThat(groups.getFirst().examples()).isEqualTo("rau muống, lettuce");
    }

    @Test
    void showsWhatOtherStallsSetOnlyFromThreeProducts() {
        when(guides.findByCategoryIdAndActiveTrueOrderByGroupNameAscStorageModeAsc(1L))
                .thenReturn(
                        List.of(
                                guide(1L, "Leafy greens", StorageMode.ROOM, 1),
                                guide(2L, "Leafy greens", StorageMode.CHILLED, 3)));
        when(peers.daysByGuide(anyCollection(), eq(null)))
                .thenReturn(Map.of(1L, List.of(1, 2), 2L, List.of(3, 5, 4)));

        var modes = service.listForCategory(1L, ADMIN_USER).getFirst().modes();

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

        assertThat(service.listForCategory(1L, ADMIN_USER)).isEmpty();
    }

    @Test
    void leavesTheSignedInFarmersOwnStallOutOfTheNumbers() {
        when(guides.findByCategoryIdAndActiveTrueOrderByGroupNameAscStorageModeAsc(1L))
                .thenReturn(List.of(guide(2L, "Leafy greens", StorageMode.CHILLED, 3)));
        when(peers.daysByGuide(anyCollection(), eq(10L))).thenReturn(Map.of(2L, List.of(3, 4, 5)));
        when(peers.daysByGuide(anyCollection(), eq(null)))
                .thenReturn(Map.of(2L, List.of(3, 4, 5, 9)));

        assertThat(
                        service.listForCategory(1L, FARMER_USER)
                                .getFirst()
                                .modes()
                                .getFirst()
                                .peerCount())
                .isEqualTo(3);
        assertThat(
                        service.listForCategory(1L, ADMIN_USER)
                                .getFirst()
                                .modes()
                                .getFirst()
                                .peerCount())
                .isEqualTo(4);
    }

    private static ShelfLifeGuideRequest request(Boolean active) {
        return new ShelfLifeGuideRequest(
                1L, "  Leafy greens ", " rau muống, lettuce ", "chilled", 3, active);
    }

    @Test
    void createsAnActiveGroupWithTrimmedText() {
        when(categories.existsById(1L)).thenReturn(true);
        when(guides.saveAndFlush(any(ShelfLifeGuide.class)))
                .thenAnswer(
                        i -> {
                            ShelfLifeGuide g = i.getArgument(0);
                            g.setId(5L);
                            return g;
                        });

        ShelfLifeGuideResource created = service.create(request(null));

        assertThat(created.id()).isEqualTo(5L);
        assertThat(created.groupName()).isEqualTo("Leafy greens");
        assertThat(created.examples()).isEqualTo("rau muống, lettuce");
        assertThat(created.storageMode()).isEqualTo("chilled");
        assertThat(created.isActive()).isTrue();
    }

    @Test
    void createsWithTheSpellingOfAGroupTheCategoryAlreadyHas() {
        when(categories.existsById(1L)).thenReturn(true);
        when(guides.findFirstByCategoryIdAndGroupNameOrderByIdAsc(1L, "leafy Greens"))
                .thenReturn(Optional.of(guide(2L, "Leafy greens", StorageMode.CHILLED, 3)));
        when(guides.saveAndFlush(any(ShelfLifeGuide.class))).thenAnswer(i -> i.getArgument(0));

        ShelfLifeGuideResource created =
                service.create(
                        new ShelfLifeGuideRequest(1L, " leafy Greens ", "", "room", 1, null));

        assertThat(created.groupName()).isEqualTo("Leafy greens");
        assertThat(created.storageMode()).isEqualTo("room");
    }

    @Test
    void refusesAnUnknownCategory() {
        when(categories.existsById(1L)).thenReturn(false);

        assertThatThrownBy(() -> service.create(request(null)))
                .isInstanceOf(CategoryNotFoundException.class);
    }

    @Test
    void updatesAndCanTurnAGroupBackOn() {
        ShelfLifeGuide existing = guide(5L, "Old", StorageMode.CHILLED, 1);
        existing.setActive(false);
        when(guides.findById(5L)).thenReturn(Optional.of(existing));
        when(guides.saveAndFlush(any(ShelfLifeGuide.class))).thenAnswer(i -> i.getArgument(0));

        ShelfLifeGuideResource saved = service.update(5L, request(true));

        assertThat(saved.groupName()).isEqualTo("Leafy greens");
        assertThat(saved.suggestedDays()).isEqualTo(3);
        assertThat(saved.isActive()).isTrue();
    }

    @Test
    void refusesToMoveAGroupToAnotherCategoryOrWayOfKeeping() {
        ShelfLifeGuide existing = guide(5L, "Leafy greens", StorageMode.CHILLED, 3);
        when(guides.findById(5L)).thenReturn(Optional.of(existing));

        assertThatThrownBy(
                        () ->
                                service.update(
                                        5L,
                                        new ShelfLifeGuideRequest(
                                                2L, "Leafy greens", "", "chilled", 3, null)))
                .isInstanceOf(InvalidFieldException.class)
                .extracting("field")
                .isEqualTo("categoryId");
        assertThatThrownBy(
                        () ->
                                service.update(
                                        5L,
                                        new ShelfLifeGuideRequest(
                                                1L, "Leafy greens", "", "room", 3, null)))
                .isInstanceOf(InvalidFieldException.class)
                .extracting("field")
                .isEqualTo("storageMode");
        assertThat(existing.getCategoryId()).isEqualTo(1L);
        assertThat(existing.getStorageMode()).isEqualTo(StorageMode.CHILLED);
        verify(guides, never()).saveAndFlush(any(ShelfLifeGuide.class));
    }

    @Test
    void turnsAGroupOffAndReportsAMissingOne() {
        ShelfLifeGuide existing = guide(5L, "Leafy greens", StorageMode.ROOM, 1);
        when(guides.findById(5L)).thenReturn(Optional.of(existing));
        when(guides.findById(6L)).thenReturn(Optional.empty());

        service.deactivate(5L);

        assertThat(existing.isActive()).isFalse();
        assertThatThrownBy(() -> service.deactivate(6L))
                .isInstanceOf(ShelfLifeGuideNotFoundException.class);
    }
}
