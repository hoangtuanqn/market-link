package com.techx.intervue.modules.order.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.favorite.services.impl.RestockNotifier;
import com.techx.intervue.modules.notification.services.interfaces.NotificationServiceInterface;
import com.techx.intervue.modules.order.enums.OrderStatus;
import com.techx.intervue.modules.order.exceptions.OrderNotYoursException;
import com.techx.intervue.modules.order.repositories.CheckoutQueryRepository;
import com.techx.intervue.modules.order.repositories.OrderItemRepository;
import com.techx.intervue.modules.order.repositories.OrderQueryRepository;
import com.techx.intervue.modules.order.repositories.OrderQueryRepository.OrderDetailRow;
import com.techx.intervue.modules.order.repositories.OrderRepository;
import com.techx.intervue.modules.order.repositories.OrderStatusHistoryRepository;
import com.techx.intervue.modules.order.resources.OrderDetailResource;
import com.techx.intervue.modules.order.resources.OrderListItemResource;
import com.techx.intervue.modules.product.repositories.ProductDailyStockRepository;
import com.techx.intervue.modules.product.repositories.ProductRepository;
import com.techx.intervue.modules.product.services.impl.ProductAvailabilityResolver;
import com.techx.intervue.modules.stall.repositories.FarmerMarketRepository;
import com.techx.intervue.modules.stall.repositories.PickupSlotRepository;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
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
 * D-04: an admin is read-only oversight and may read any order (with the customer block), but may
 * never act on it — {@code GET /orders/{id}} is the only order endpoint an admin can reach.
 */
class OrderAdminReadTest {

    private static final ZoneId HCM = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final long ORDER_ID = 500L;
    private static final long CUSTOMER_ID = 7L;
    private static final long OTHER_CUSTOMER_ID = 8L;
    private static final long FARMER_USER_ID = 40L;

    private OrderQueryRepository orderQueries;
    private UserRepository users;
    private OrderService service;

    @BeforeEach
    void setUp() {
        orderQueries = mock(OrderQueryRepository.class);
        users = mock(UserRepository.class);
        Clock clock = Clock.fixed(ZonedDateTime.of(2026, 9, 26, 9, 0, 0, 0, HCM).toInstant(), HCM);
        service =
                new OrderService(
                        users,
                        mock(FarmerProfileRepository.class),
                        mock(FarmerMarketRepository.class),
                        mock(PickupSlotRepository.class),
                        mock(ProductRepository.class),
                        mock(OrderRepository.class),
                        mock(OrderItemRepository.class),
                        new OrderStatusHistoryWriter(mock(OrderStatusHistoryRepository.class)),
                        new OrderCodeGenerator(mock(OrderRepository.class), clock),
                        mock(CheckoutQueryRepository.class),
                        clock,
                        mock(ProductDailyStockRepository.class),
                        mock(ProductAvailabilityResolver.class),
                        orderQueries,
                        mock(NotificationServiceInterface.class),
                        mock(RestockNotifier.class));

        when(orderQueries.items(ORDER_ID)).thenReturn(List.of());
        when(orderQueries.history(ORDER_ID)).thenReturn(List.of());
    }

    private static OrderListItemResource summary() {
        return new OrderListItemResource(
                ORDER_ID,
                "ML-20260926-ABCD",
                "placed",
                10L,
                "Vườn Út Hiền",
                2L,
                "Chợ Bà Chiểu",
                "2026-09-29",
                "07:00",
                "08:00",
                "2026-09-28T18:00:00Z",
                new BigDecimal("39000"),
                2,
                "2026-09-26T02:00:00Z",
                7L,
                "Khách 7");
    }

    private static OrderDetailRow order(long customerId, long farmerUserId) {
        return new OrderDetailRow(
                summary(),
                OrderStatus.PLACED,
                LocalDateTime.of(2026, 9, 29, 1, 0),
                customerId,
                "Khách " + customerId,
                "0900000000",
                "khach" + customerId + "@t.vn",
                farmerUserId,
                null,
                null);
    }

    private static OrderDetailRow aPlacedOrder(long customerId, long farmerUserId) {
        return order(customerId, farmerUserId);
    }

    private static User user(long id, RoleType role) {
        User user = new User();
        user.setId(id);
        user.setRole(role);
        return user;
    }

    @Test
    void anAdminCanReadAnyOrderWithTheCustomerBlock() {
        when(orderQueries.findDetail(ORDER_ID))
                .thenReturn(Optional.of(aPlacedOrder(CUSTOMER_ID, FARMER_USER_ID)));
        User admin = new User();
        admin.setId(1L);
        admin.setRole(RoleType.ADMIN);
        when(users.findById(1L)).thenReturn(Optional.of(admin));

        OrderDetailResource detail = service.detail(1L, ORDER_ID);

        assertThat(detail.customer()).isNotNull();
        assertThat(detail.canCancel()).isFalse();
    }

    @Test
    void anotherCustomerIsStillRefused() {
        when(orderQueries.findDetail(ORDER_ID))
                .thenReturn(Optional.of(aPlacedOrder(CUSTOMER_ID, FARMER_USER_ID)));
        when(users.findById(OTHER_CUSTOMER_ID))
                .thenReturn(Optional.of(user(OTHER_CUSTOMER_ID, RoleType.CUSTOMER)));

        assertThatThrownBy(() -> service.detail(OTHER_CUSTOMER_ID, ORDER_ID))
                .isInstanceOf(OrderNotYoursException.class);
    }
}
