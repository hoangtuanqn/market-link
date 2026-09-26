package com.techx.intervue.modules.catalog.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.catalog.entities.Market;
import com.techx.intervue.modules.catalog.exceptions.MarketNotFoundException;
import com.techx.intervue.modules.catalog.repositories.MarketImageRepository;
import com.techx.intervue.modules.catalog.repositories.MarketOperatingDayRepository;
import com.techx.intervue.modules.catalog.repositories.MarketQueryRepository;
import com.techx.intervue.modules.catalog.repositories.MarketRepository;
import com.techx.intervue.modules.catalog.requests.MarketRequest;
import com.techx.intervue.modules.catalog.resources.MarketResource;
import com.techx.intervue.modules.stall.services.interfaces.StallServiceInterface;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import com.techx.intervue.resources.PageResource;
import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class MarketServiceTest {

    private MarketRepository repository;
    private MarketOperatingDayRepository dayRepository;
    private MarketImageRepository imageRepository;
    private MarketQueryRepository queryRepository;
    private StallServiceInterface stallService;
    private MarketService service;

    @BeforeEach
    void setUp() {
        repository = mock(MarketRepository.class);
        dayRepository = mock(MarketOperatingDayRepository.class);
        imageRepository = mock(MarketImageRepository.class);
        queryRepository = mock(MarketQueryRepository.class);
        stallService = mock(StallServiceInterface.class);
        service =
                new MarketService(
                        repository, dayRepository, imageRepository, queryRepository, stallService);
    }

    /** A valid images list, for tests that are not themselves about the images field. */
    private static final List<String> ONE_IMAGE = List.of("/uploads/market-images/a.jpg");

    private static MarketRequest request(List<Integer> days, List<String> images) {
        return new MarketRequest(
                "Chợ Bà Chiểu",
                "Bạch Đằng, Bình Thạnh",
                "Bình Thạnh",
                "TP. Hồ Chí Minh",
                new BigDecimal("10.80290000"),
                new BigDecimal("106.69920000"),
                "05:00",
                "18:00",
                images,
                days);
    }

    private static Market saved() {
        Market m = new Market();
        m.setId(1L);
        m.setMarketName("Chợ Bà Chiểu");
        m.setAddress("Bạch Đằng, Bình Thạnh");
        m.setCity("TP. Hồ Chí Minh");
        m.setLatitude(new BigDecimal("10.80290000"));
        m.setLongitude(new BigDecimal("106.69920000"));
        m.setOpeningTime(LocalTime.of(5, 0));
        m.setClosingTime(LocalTime.of(18, 0));
        m.setMapProvider("osm");
        m.setActive(true);
        return m;
    }

    @Test
    void createStoresOperatingDaysAsRows() {
        when(repository.save(any(Market.class))).thenReturn(saved());

        service.create(request(List.of(0, 6), ONE_IMAGE));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<Integer>> captor = ArgumentCaptor.forClass(List.class);
        verify(dayRepository).replaceDays(eq(1L), captor.capture());
        assertThat(captor.getValue()).containsExactly(0, 6);
    }

    @Test
    void createRejectsDayOutsideZeroToSix() {
        assertThatThrownBy(() -> service.create(request(List.of(0, 7), null)))
                .isInstanceOf(InvalidFieldException.class)
                .hasMessageContaining("day");
    }

    @Test
    void createRejectsClosingTimeBeforeOpeningTime() {
        MarketRequest bad =
                new MarketRequest(
                        "Chợ X",
                        "Y",
                        null,
                        "TP. Hồ Chí Minh",
                        BigDecimal.ONE,
                        BigDecimal.ONE,
                        "18:00",
                        "05:00",
                        ONE_IMAGE,
                        List.of(1));

        assertThatThrownBy(() -> service.create(bad))
                .isInstanceOf(InvalidFieldException.class)
                .hasMessageContaining("closing");
    }

    /** D-12: map_provider is always 'osm', the client cannot send it. */
    @Test
    void createAlwaysStoresOsmAsMapProvider() {
        when(repository.save(any(Market.class))).thenReturn(saved());
        ArgumentCaptor<Market> captor = ArgumentCaptor.forClass(Market.class);

        service.create(request(List.of(0), ONE_IMAGE));

        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getMapProvider()).isEqualTo("osm");
    }

    /**
     * Soft delete — old orders still point to this market (orders.market_id is a non-nullable FK).
     */
    @Test
    void deactivateFlipsIsActiveInsteadOfDeleting() {
        Market m = saved();
        when(repository.findById(1L)).thenReturn(Optional.of(m));

        service.deactivate(1L);

        assertThat(m.isActive()).isFalse();
        verify(repository).save(m);
    }

    @Test
    void detailOnUnknownMarketThrows() {
        when(queryRepository.findById(9L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.detail(9L)).isInstanceOf(MarketNotFoundException.class);
    }

    @Test
    void searchClampsPageSizeToFifty() {
        when(queryRepository.search(any(), any(), any(), any(), anyInt(), anyInt()))
                .thenReturn(new PageResource<>(List.of(), 1, 50, 0));

        PageResource<MarketResource> page = service.search(null, null, null, null, 1, 500);

        assertThat(page.pageSize()).isEqualTo(50);
        verify(queryRepository).search(null, null, null, null, 0, 50);
    }

    @Test
    void searchTreatsPageZeroAsPageOne() {
        when(queryRepository.search(any(), any(), any(), any(), anyInt(), anyInt()))
                .thenReturn(new PageResource<>(List.of(), 1, 12, 0));

        service.search(null, null, null, null, 0, 12);

        verify(queryRepository).search(null, null, null, null, 0, 12);
    }

    @Test
    void createReplacesImagesAndUsesFirstOneAsTheCover() {
        when(repository.save(any(Market.class))).thenReturn(saved());
        ArgumentCaptor<Market> captor = ArgumentCaptor.forClass(Market.class);
        List<String> urls = List.of("/uploads/market-images/a.jpg", "/uploads/market-images/b.jpg");

        service.create(request(List.of(0), urls));

        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getImageUrl()).isEqualTo("/uploads/market-images/a.jpg");
        verify(imageRepository).replaceImages(1L, urls);
    }

    @Test
    void createRejectsEmptyImages() {
        assertThatThrownBy(() -> service.create(request(List.of(0), null)))
                .isInstanceOf(InvalidFieldException.class);
        assertThatThrownBy(() -> service.create(request(List.of(0), List.of())))
                .isInstanceOf(InvalidFieldException.class);
        assertThatThrownBy(() -> service.create(request(List.of(0), List.of("   "))))
                .isInstanceOf(InvalidFieldException.class);
    }

    @Test
    void createRejectsMoreThanEightImages() {
        List<String> tooMany = List.of("1", "2", "3", "4", "5", "6", "7", "8", "9");

        assertThatThrownBy(() -> service.create(request(List.of(0), tooMany)))
                .isInstanceOf(InvalidFieldException.class);
    }

    @Test
    void createRejectsAnImageUrlLongerThanTheColumn() {
        List<String> tooLong = List.of("/uploads/market-images/" + "a".repeat(240) + ".jpg");

        assertThatThrownBy(() -> service.create(request(List.of(0), tooLong)))
                .isInstanceOf(InvalidFieldException.class);
    }

    @Test
    void updateReplacesImagesToo() {
        Market existing = saved();
        when(repository.findById(1L)).thenReturn(Optional.of(existing));
        when(repository.save(any(Market.class))).thenReturn(existing);
        List<String> urls = List.of("/uploads/market-images/c.jpg");

        service.update(1L, request(List.of(0), urls));

        verify(imageRepository).replaceImages(1L, urls);
        assertThat(existing.getImageUrl()).isEqualTo("/uploads/market-images/c.jpg");
    }

    /** QA E2E v2 MARKET-ADMIN-002: adding back a removed market's name restores that market. */
    @Test
    void createRestoresARemovedMarketWithTheSameName() {
        Market removed = saved();
        removed.setActive(false);
        when(repository.findByMarketName("Chợ Bà Chiểu")).thenReturn(Optional.of(removed));
        when(repository.saveAndFlush(any(Market.class))).thenAnswer(i -> i.getArgument(0));

        MarketResource restored = service.create(request(List.of(6), ONE_IMAGE));

        assertThat(restored.id()).isEqualTo(1L);
        assertThat(removed.isActive()).isTrue();
        verify(repository).saveAndFlush(removed);
        verify(dayRepository).replaceDays(1L, List.of(6));
        verify(imageRepository).replaceImages(1L, ONE_IMAGE);
    }

    /** An active market keeps its name: the new row is left to uq_market_name (→ 409). */
    @Test
    void createDoesNotTakeOverAnActiveMarketWithTheSameName() {
        when(repository.findByMarketName("Chợ Bà Chiểu")).thenReturn(Optional.of(saved()));
        when(repository.save(any(Market.class))).thenReturn(saved());

        service.create(request(List.of(6), ONE_IMAGE));

        ArgumentCaptor<Market> captor = ArgumentCaptor.forClass(Market.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getId()).isNull();
    }
}
