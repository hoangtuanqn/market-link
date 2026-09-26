package com.techx.intervue.modules.catalog.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.catalog.entities.MarketClosure;
import com.techx.intervue.modules.catalog.exceptions.MarketClosureNotFoundException;
import com.techx.intervue.modules.catalog.exceptions.MarketNotFoundException;
import com.techx.intervue.modules.catalog.repositories.MarketClosureRepository;
import com.techx.intervue.modules.catalog.repositories.MarketRepository;
import com.techx.intervue.modules.catalog.requests.MarketClosureRequest;
import com.techx.intervue.modules.catalog.resources.MarketClosureResource;
import com.techx.intervue.modules.order.enums.OrderStatus;
import com.techx.intervue.modules.order.repositories.OrderRepository;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import com.techx.intervue.modules.user.repositories.UserRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class MarketClosureServiceTest {

    private MarketClosureRepository repository;
    private MarketRepository marketRepository;
    private OrderRepository orderRepository;
    private UserRepository userRepository;
    private MarketClosureService service;

    @BeforeEach
    void setUp() {
        repository = mock(MarketClosureRepository.class);
        marketRepository = mock(MarketRepository.class);
        orderRepository = mock(OrderRepository.class);
        userRepository = mock(UserRepository.class);
        service =
                new MarketClosureService(
                        repository, marketRepository, orderRepository, userRepository);
        when(marketRepository.existsById(1L)).thenReturn(true);
    }

    private static MarketClosure saved(long id) {
        MarketClosure c = new MarketClosure();
        c.setId(id);
        c.setMarketId(1L);
        c.setClosedOn(LocalDate.of(2026, 10, 11));
        c.setReason("Road works");
        c.setHandling("move");
        c.setAnnounced(false);
        c.setCreatedBy(9L);
        return c;
    }

    @Test
    void createRejectsMissingMarket() {
        when(marketRepository.existsById(2L)).thenReturn(false);
        MarketClosureRequest request =
                new MarketClosureRequest(LocalDate.of(2026, 10, 11), null, "move");

        assertThatThrownBy(() -> service.create(2L, request, 9L))
                .isInstanceOf(MarketNotFoundException.class);
    }

    @Test
    void createRejectsUnknownHandling() {
        MarketClosureRequest request =
                new MarketClosureRequest(LocalDate.of(2026, 10, 11), null, "postpone");

        assertThatThrownBy(() -> service.create(1L, request, 9L))
                .isInstanceOf(InvalidFieldException.class)
                .hasMessageContaining("Handling");
    }

    @Test
    void createSavesLowercasedHandlingAndBlankReasonAsNull() {
        when(repository.save(any(MarketClosure.class))).thenReturn(saved(5L));
        MarketClosureRequest request =
                new MarketClosureRequest(LocalDate.of(2026, 10, 11), "  ", "MOVE");

        service.create(1L, request, 9L);

        ArgumentCaptor<MarketClosure> captor = ArgumentCaptor.forClass(MarketClosure.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getHandling()).isEqualTo("move");
        assertThat(captor.getValue().getReason()).isNull();
        assertThat(captor.getValue().getMarketId()).isEqualTo(1L);
    }

    @Test
    void createCountsRealOrdersAffectedExcludingCancelled() {
        when(repository.save(any(MarketClosure.class))).thenReturn(saved(5L));
        when(orderRepository.countByMarketIdAndPickupDateAndStatusNot(
                        1L, LocalDate.of(2026, 10, 11), OrderStatus.CANCELLED))
                .thenReturn(3L);
        when(userRepository.findById(9L))
                .thenReturn(Optional.of(User.builder().fullName("Mai Anh").build()));
        MarketClosureRequest request =
                new MarketClosureRequest(LocalDate.of(2026, 10, 11), "Road works", "move");

        MarketClosureResource resource = service.create(1L, request, 9L);

        assertThat(resource.ordersAffected()).isEqualTo(3L);
        assertThat(resource.createdByName()).isEqualTo("Mai Anh");
    }

    @Test
    void listRejectsMissingMarket() {
        when(marketRepository.existsById(2L)).thenReturn(false);

        assertThatThrownBy(() -> service.list(2L)).isInstanceOf(MarketNotFoundException.class);
    }

    @Test
    void listReturnsClosuresOrderedByDate() {
        when(repository.findByMarketIdOrderByClosedOnAsc(1L)).thenReturn(List.of(saved(5L)));
        when(userRepository.findById(anyLong())).thenReturn(Optional.empty());

        List<MarketClosureResource> result = service.list(1L);

        assertThat(result).hasSize(1);
        assertThat(result.getFirst().createdByName()).isEqualTo("Admin");
    }

    @Test
    void deleteRejectsClosureFromAnotherMarket() {
        when(repository.findByIdAndMarketId(5L, 1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.delete(1L, 5L))
                .isInstanceOf(MarketClosureNotFoundException.class);
    }

    @Test
    void deleteRemovesTheMatchingClosure() {
        MarketClosure existing = saved(5L);
        when(repository.findByIdAndMarketId(5L, 1L)).thenReturn(Optional.of(existing));

        service.delete(1L, 5L);

        verify(repository).delete(existing);
    }
}
