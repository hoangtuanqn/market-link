package com.techx.intervue.modules.order.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.notification.services.interfaces.NotificationServiceInterface;
import com.techx.intervue.modules.order.entities.Order;
import com.techx.intervue.modules.order.entities.OrderItem;
import com.techx.intervue.modules.order.enums.OrderStatus;
import com.techx.intervue.modules.order.exceptions.OrderNotFoundException;
import com.techx.intervue.modules.order.exceptions.OrderNotYoursException;
import com.techx.intervue.modules.order.repositories.CheckoutQueryRepository;
import com.techx.intervue.modules.order.repositories.OrderItemRepository;
import com.techx.intervue.modules.order.repositories.OrderQueryRepository;
import com.techx.intervue.modules.order.repositories.OrderRepository;
import com.techx.intervue.modules.order.repositories.OrderStatusHistoryRepository;
import com.techx.intervue.modules.order.requests.CartLine;
import com.techx.intervue.modules.product.entities.Product;
import com.techx.intervue.modules.product.enums.ProductStatus;
import com.techx.intervue.modules.product.repositories.ProductRepository;
import com.techx.intervue.modules.stall.repositories.FarmerMarketRepository;
import com.techx.intervue.modules.stall.repositories.PickupSlotRepository;
import com.techx.intervue.modules.user.repositories.UserRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** FR-037 — "Order again" turns an old order into a suggested cart; it never creates an order. */
class ReorderTest {

    private static final ZoneId HCM = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final long ORDER_ID = 500L;
    private static final long CUSTOMER_ID = 7L;
    private static final long OTHER_CUSTOMER_ID = 8L;

    private ProductRepository productRepository;
    private OrderRepository orderRepository;
    private OrderItemRepository orderItemRepository;
    private OrderService service;

    private final Map<Long, Product> productRows = new HashMap<>();

    @BeforeEach
    void setUp() {
        productRepository = mock(ProductRepository.class);
        orderRepository = mock(OrderRepository.class);
        orderItemRepository = mock(OrderItemRepository.class);
        Clock clock = Clock.fixed(ZonedDateTime.of(2026, 9, 26, 9, 0, 0, 0, HCM).toInstant(), HCM);
        service =
                new OrderService(
                        mock(UserRepository.class),
                        mock(FarmerProfileRepository.class),
                        mock(FarmerMarketRepository.class),
                        mock(PickupSlotRepository.class),
                        productRepository,
                        orderRepository,
                        orderItemRepository,
                        new OrderStatusHistoryWriter(mock(OrderStatusHistoryRepository.class)),
                        new OrderCodeGenerator(orderRepository, clock),
                        mock(CheckoutQueryRepository.class),
                        mock(OrderQueryRepository.class),
                        clock,
                        mock(NotificationServiceInterface.class));
        when(productRepository.findAllById(any()))
                .thenAnswer(
                        inv -> {
                            Iterable<Long> ids = inv.getArgument(0);
                            List<Product> out = new ArrayList<>();
                            ids.forEach(
                                    id ->
                                            Optional.ofNullable(productRows.get(id))
                                                    .ifPresent(out::add));
                            return out;
                        });
    }

    private void anOrderOf(long customerId, OrderItem... items) {
        Order order = new Order();
        order.setId(ORDER_ID);
        order.setCustomerId(customerId);
        order.setFarmerId(10L);
        order.setStatus(OrderStatus.COMPLETED);
        when(orderRepository.findById(ORDER_ID)).thenReturn(Optional.of(order));
        when(orderItemRepository.findByOrderId(ORDER_ID)).thenReturn(List.of(items));
    }

    private static OrderItem line(long productId, int quantity) {
        OrderItem i = new OrderItem();
        i.setOrderId(ORDER_ID);
        i.setProductId(productId);
        i.setQuantity(quantity);
        i.setUnitPrice(BigDecimal.TEN);
        i.setSubtotal(BigDecimal.TEN.multiply(BigDecimal.valueOf(quantity)));
        return i;
    }

    private Product product(long id, int stock, ProductStatus status) {
        Product p = new Product();
        p.setId(id);
        p.setFarmerId(10L);
        p.setName("P" + id);
        p.setPrice(BigDecimal.TEN);
        p.setUnit("kg");
        p.setStockQuantity(stock);
        p.setStatus(status);
        productRows.put(id, p);
        return p;
    }

    @Test
    void reorderReturnsTheLinesOfTheOldOrder() {
        product(1, 50, ProductStatus.AVAILABLE);
        product(2, 50, ProductStatus.AVAILABLE);
        anOrderOf(CUSTOMER_ID, line(1, 3), line(2, 5));

        assertThat(service.reorder(CUSTOMER_ID, ORDER_ID))
                .containsExactly(new CartLine(1L, 3), new CartLine(2L, 5));
    }

    @Test
    void reorderDropsProductsThatNoLongerExist() {
        product(1, 50, ProductStatus.AVAILABLE);
        product(2, 50, ProductStatus.AVAILABLE).setDeleted(true);
        anOrderOf(CUSTOMER_ID, line(1, 3), line(2, 5));

        assertThat(service.reorder(CUSTOMER_ID, ORDER_ID)).containsExactly(new CartLine(1L, 3));
    }

    @Test
    void reorderCapsQuantityAtCurrentStock() {
        product(1, 4, ProductStatus.AVAILABLE);
        anOrderOf(CUSTOMER_ID, line(1, 10));

        assertThat(service.reorder(CUSTOMER_ID, ORDER_ID)).containsExactly(new CartLine(1L, 4));
    }

    /** R-06: someone else's order → 403 even though it exists. */
    @Test
    void reorderOnAnotherCustomersOrderIs403() {
        anOrderOf(OTHER_CUSTOMER_ID, line(1, 3));

        assertThatThrownBy(() -> service.reorder(CUSTOMER_ID, ORDER_ID))
                .isInstanceOf(OrderNotYoursException.class);
    }

    /**
     * The same "can be bought" rule as placing an order: hidden, paused or sold-out lines drop out.
     */
    @Test
    void reorderDropsHiddenPausedAndSoldOutProducts() {
        product(1, 50, ProductStatus.AVAILABLE).setHidden(true);
        product(2, 50, ProductStatus.UNAVAILABLE);
        product(3, 0, ProductStatus.SOLD_OUT);
        product(4, 50, ProductStatus.AVAILABLE);
        anOrderOf(CUSTOMER_ID, line(1, 1), line(2, 1), line(3, 1), line(4, 2));

        assertThat(service.reorder(CUSTOMER_ID, ORDER_ID)).containsExactly(new CartLine(4L, 2));
    }

    @Test
    void reorderOfAMissingOrderIs404() {
        when(orderRepository.findById(ORDER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.reorder(CUSTOMER_ID, ORDER_ID))
                .isInstanceOf(OrderNotFoundException.class);
    }
}
