package com.techx.intervue.modules.order.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.favorite.services.impl.RestockNotifier;
import com.techx.intervue.modules.notification.services.interfaces.NotificationServiceInterface;
import com.techx.intervue.modules.order.enums.OrderStatus;
import com.techx.intervue.modules.order.exceptions.OrderNotFoundException;
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
import org.springframework.security.access.AccessDeniedException;

class OrderAccessTest {

    private static final ZoneId HCM = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final long ORDER_ID = 500L;
    private static final long CUSTOMER_ID = 7L;
    private static final long OTHER_CUSTOMER_ID = 8L;
    private static final long FARMER_USER_ID = 40L;
    private static final long OTHER_FARMER_USER_ID = 41L;
    private static final long FARMER_PROFILE_ID = 10L;
    private static final LocalDateTime CUTOFF_TOMORROW = LocalDateTime.of(2026, 9, 29, 1, 0);
    private static final LocalDateTime CUTOFF_YESTERDAY = LocalDateTime.of(2026, 9, 25, 9, 0);

    private OrderQueryRepository orderQueries;
    private FarmerProfileRepository farmerRepository;
    private Clock clock;
    private OrderService service;

    @BeforeEach
    void setUp() {
        orderQueries = mock(OrderQueryRepository.class);
        farmerRepository = mock(FarmerProfileRepository.class);
        clock = Clock.fixed(ZonedDateTime.of(2026, 9, 26, 9, 0, 0, 0, HCM).toInstant(), HCM);
        service =
                new OrderService(
                        mock(UserRepository.class),
                        farmerRepository,
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
                FARMER_PROFILE_ID,
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
                "Khách 7",
                false);
    }

    private static OrderDetailRow order(
            long customerId, long farmerUserId, OrderStatus status, LocalDateTime cutoffAt) {
        return new OrderDetailRow(
                summary(),
                status,
                cutoffAt,
                customerId,
                "Khách " + customerId,
                "0900000000",
                "khach" + customerId + "@t.vn",
                farmerUserId,
                null,
                null);
    }

    private static OrderDetailRow aPlacedOrder(long customerId, long farmerUserId) {
        return order(customerId, farmerUserId, OrderStatus.PLACED, CUTOFF_TOMORROW);
    }

    @Test
    void customerCannotReadAnotherCustomersOrder() {
        when(orderQueries.findDetail(ORDER_ID))
                .thenReturn(Optional.of(aPlacedOrder(OTHER_CUSTOMER_ID, FARMER_USER_ID)));

        assertThatThrownBy(() -> service.detail(CUSTOMER_ID, ORDER_ID))
                .isInstanceOf(OrderNotYoursException.class);
    }

    @Test
    void farmerCannotReadAnOrderPlacedAtAnotherStall() {
        when(orderQueries.findDetail(ORDER_ID))
                .thenReturn(Optional.of(aPlacedOrder(CUSTOMER_ID, OTHER_FARMER_USER_ID)));

        assertThatThrownBy(() -> service.detail(FARMER_USER_ID, ORDER_ID))
                .isInstanceOf(OrderNotYoursException.class);
    }

    @Test
    void theOwningCustomerCanRead() {
        when(orderQueries.findDetail(ORDER_ID))
                .thenReturn(Optional.of(aPlacedOrder(CUSTOMER_ID, FARMER_USER_ID)));

        OrderDetailResource detail = service.detail(CUSTOMER_ID, ORDER_ID);

        assertThat(detail.summary().orderCode()).isEqualTo("ML-20260926-ABCD");
    }

    @Test
    void theOwningFarmerCanRead() {
        when(orderQueries.findDetail(ORDER_ID))
                .thenReturn(Optional.of(aPlacedOrder(CUSTOMER_ID, FARMER_USER_ID)));

        assertThat(service.detail(FARMER_USER_ID, ORDER_ID)).isNotNull();
    }

    @Test
    void onlyTheFarmerSeesTheCustomerBlock() {
        when(orderQueries.findDetail(ORDER_ID))
                .thenReturn(Optional.of(aPlacedOrder(CUSTOMER_ID, FARMER_USER_ID)));

        assertThat(service.detail(FARMER_USER_ID, ORDER_ID).customer()).isNotNull();
        assertThat(service.detail(CUSTOMER_ID, ORDER_ID).customer()).isNull();
    }

    @Test
    void canCancelIsFalseOnceCutoffHasPassed() {
        when(orderQueries.findDetail(ORDER_ID))
                .thenReturn(
                        Optional.of(
                                order(
                                        CUSTOMER_ID,
                                        FARMER_USER_ID,
                                        OrderStatus.PLACED,
                                        CUTOFF_YESTERDAY)));

        OrderDetailResource detail = service.detail(CUSTOMER_ID, ORDER_ID);

        assertThat(detail.canCancel()).isFalse();
        assertThat(detail.canModify()).isFalse();
    }

    @Test
    void aFarmerCanReadTheirOwnPurchaseAsABuyer() {
        when(orderQueries.findDetail(ORDER_ID))
                .thenReturn(Optional.of(aPlacedOrder(FARMER_USER_ID, OTHER_FARMER_USER_ID)));

        OrderDetailResource detail = service.detail(FARMER_USER_ID, ORDER_ID);

        assertThat(detail.customer()).isNull();
        assertThat(detail.canCancel()).isTrue();
    }

    @Test
    void aFarmerBuyingAtTheirOwnStallSeesBothTheCustomerBlockAndCanCancel() {
        when(orderQueries.findDetail(ORDER_ID))
                .thenReturn(Optional.of(aPlacedOrder(FARMER_USER_ID, FARMER_USER_ID)));

        OrderDetailResource detail = service.detail(FARMER_USER_ID, ORDER_ID);

        assertThat(detail.customer()).isNotNull();
        assertThat(detail.canCancel()).isTrue();
        assertThat(detail.canModify()).isTrue();
    }

    @Test
    void detailThrowsNotFoundForAnOrderThatDoesNotExist() {
        when(orderQueries.findDetail(ORDER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.detail(CUSTOMER_ID, ORDER_ID))
                .isInstanceOf(OrderNotFoundException.class);
    }

    @Test
    void myOrdersRejectsAnUnknownStatus() {
        assertThatThrownBy(() -> service.myOrders(CUSTOMER_ID, "bogus", 1, 10))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void farmerOrdersRejectsAnUnknownStatus() {
        when(farmerRepository.findByUserId(FARMER_USER_ID))
                .thenReturn(Optional.of(FarmerProfile.builder().id(FARMER_PROFILE_ID).build()));

        assertThatThrownBy(() -> service.farmerOrders(FARMER_USER_ID, "bogus", null, 1, 10))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void farmerOrdersRefusesAnAccountWithoutAStallProfile() {
        when(farmerRepository.findByUserId(FARMER_USER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.farmerOrders(FARMER_USER_ID, null, null, 1, 10))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void listRowsCarryTheCustomerNameForTheStall() {
        assertThat(OrderQueryRepository.FARMER_ORDERS_SQL)
                .contains("cu.full_name AS customer_name");
        assertThat(OrderQueryRepository.FARMER_ORDERS_SQL)
                .contains("JOIN users cu ON cu.id = o.customer_id");
    }
}
