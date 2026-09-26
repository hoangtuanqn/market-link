package com.techx.intervue.modules.order.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.favorite.services.impl.RestockNotifier;
import com.techx.intervue.modules.notification.services.interfaces.NotificationServiceInterface;
import com.techx.intervue.modules.order.enums.OrderStatus;
import com.techx.intervue.modules.order.repositories.CheckoutQueryRepository;
import com.techx.intervue.modules.order.repositories.OrderItemRepository;
import com.techx.intervue.modules.order.repositories.OrderQueryRepository;
import com.techx.intervue.modules.order.repositories.OrderQueryRepository.OrderDetailRow;
import com.techx.intervue.modules.order.repositories.OrderRepository;
import com.techx.intervue.modules.order.repositories.OrderStatusHistoryRepository;
import com.techx.intervue.modules.order.resources.OrderListItemResource;
import com.techx.intervue.modules.product.repositories.ProductRepository;
import com.techx.intervue.modules.stall.repositories.FarmerMarketRepository;
import com.techx.intervue.modules.stall.repositories.PickupSlotRepository;
import com.techx.intervue.modules.user.repositories.UserRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Task 8.3 (FR-050): {@code GET /orders/{id}} tells the customer whether they already reviewed the
 * order, so the "Write a review" button shows only on a completed, not-yet-reviewed order. The flag
 * comes from the reviews table through {@link OrderQueryRepository#reviewed}.
 */
class OrderReviewedFlagTest {

    private static final ZoneId HCM = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final long ORDER_ID = 500L;
    private static final long CUSTOMER_ID = 7L;
    private static final long FARMER_USER_ID = 40L;

    private OrderQueryRepository orderQueries;
    private OrderService service;

    @BeforeEach
    void setUp() {
        orderQueries = mock(OrderQueryRepository.class);
        Clock clock = Clock.fixed(ZonedDateTime.of(2026, 9, 26, 9, 0, 0, 0, HCM).toInstant(), HCM);
        service =
                new OrderService(
                        mock(UserRepository.class),
                        mock(FarmerProfileRepository.class),
                        mock(FarmerMarketRepository.class),
                        mock(PickupSlotRepository.class),
                        mock(ProductRepository.class),
                        mock(OrderRepository.class),
                        mock(OrderItemRepository.class),
                        new OrderStatusHistoryWriter(mock(OrderStatusHistoryRepository.class)),
                        new OrderCodeGenerator(mock(OrderRepository.class), clock),
                        mock(CheckoutQueryRepository.class),
                        orderQueries,
                        clock,
                        mock(NotificationServiceInterface.class),
                        mock(RestockNotifier.class));
        when(orderQueries.items(ORDER_ID)).thenReturn(List.of());
        when(orderQueries.history(ORDER_ID)).thenReturn(List.of());
        when(orderQueries.findDetail(ORDER_ID)).thenReturn(Optional.of(completedOrder()));
    }

    @Test
    void detailReportsReviewedWhenAReviewExistsForTheOrder() {
        when(orderQueries.reviewed(ORDER_ID)).thenReturn(true);

        assertThat(service.detail(CUSTOMER_ID, ORDER_ID).reviewed()).isTrue();
    }

    @Test
    void detailReportsNotReviewedWhenNoReviewExists() {
        when(orderQueries.reviewed(ORDER_ID)).thenReturn(false);

        assertThat(service.detail(CUSTOMER_ID, ORDER_ID).reviewed()).isFalse();
    }

    @Test
    void reviewedSqlLooksAtTheReviewsTable() {
        assertThat(OrderQueryRepository.REVIEWED_SQL).contains("FROM reviews");
    }

    private static OrderDetailRow completedOrder() {
        OrderListItemResource summary =
                new OrderListItemResource(
                        ORDER_ID,
                        "ML-20260916-ABCD",
                        "completed",
                        10L,
                        "Vườn Út Hiền",
                        2L,
                        "Chợ Bà Chiểu",
                        "2026-09-16",
                        "08:00",
                        "09:00",
                        "2026-09-15T13:00:00Z",
                        new BigDecimal("39000"),
                        2,
                        "2026-09-14T01:00:00Z");
        return new OrderDetailRow(
                summary,
                OrderStatus.COMPLETED,
                LocalDateTime.of(2026, 9, 15, 20, 0),
                CUSTOMER_ID,
                "Khách 7",
                "0900000000",
                "khach7@t.vn",
                FARMER_USER_ID,
                null,
                null);
    }
}
