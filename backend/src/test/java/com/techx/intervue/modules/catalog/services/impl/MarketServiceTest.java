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
import com.techx.intervue.modules.catalog.repositories.MarketOperatingDayRepository;
import com.techx.intervue.modules.catalog.repositories.MarketQueryRepository;
import com.techx.intervue.modules.catalog.repositories.MarketRepository;
import com.techx.intervue.modules.catalog.requests.MarketRequest;
import com.techx.intervue.modules.catalog.resources.MarketResource;
import com.techx.intervue.modules.stall.services.interfaces.StallServiceInterface;
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
    private MarketQueryRepository queryRepository;
    private StallServiceInterface stallService;
    private MarketService service;

    @BeforeEach
    void setUp() {
        repository = mock(MarketRepository.class);
        dayRepository = mock(MarketOperatingDayRepository.class);
        queryRepository = mock(MarketQueryRepository.class);
        stallService = mock(StallServiceInterface.class);
        service = new MarketService(repository, dayRepository, queryRepository, stallService);
    }

    private static MarketRequest request(List<Integer> days) {
        return new MarketRequest(
                "Chợ Bà Chiểu",
                "Bạch Đằng, Bình Thạnh",
                "Bình Thạnh",
                "TP. Hồ Chí Minh",
                new BigDecimal("10.80290000"),
                new BigDecimal("106.69920000"),
                "05:00",
                "18:00",
                null,
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

        service.create(request(List.of(0, 6)));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<Integer>> captor = ArgumentCaptor.forClass(List.class);
        verify(dayRepository).replaceDays(eq(1L), captor.capture());
        assertThat(captor.getValue()).containsExactly(0, 6);
    }

    @Test
    void createRejectsDayOutsideZeroToSix() {
        assertThatThrownBy(() -> service.create(request(List.of(0, 7))))
                .isInstanceOf(IllegalArgumentException.class)
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
                        null,
                        List.of(1));

        assertThatThrownBy(() -> service.create(bad))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("closing");
    }

    /** D-12: map_provider luôn là 'osm', client không gửi lên được. */
    @Test
    void createAlwaysStoresOsmAsMapProvider() {
        when(repository.save(any(Market.class))).thenReturn(saved());
        ArgumentCaptor<Market> captor = ArgumentCaptor.forClass(Market.class);

        service.create(request(List.of(0)));

        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getMapProvider()).isEqualTo("osm");
    }

    /** Xoá mềm — đơn hàng cũ vẫn trỏ về chợ này (orders.market_id là FK không nullable). */
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
}
