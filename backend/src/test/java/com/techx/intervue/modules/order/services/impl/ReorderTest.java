package com.techx.intervue.modules.order.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.favorite.services.impl.RestockNotifier;
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
import com.techx.intervue.modules.product.repositories.ProductDailyStockRepository;
import com.techx.intervue.modules.product.repositories.ProductRepository;
import com.techx.intervue.modules.product.services.impl.ProductAvailabilityResolver;
import com.techx.intervue.modules.stall.repositories.FarmerMarketRepository;
import com.techx.intervue.modules.stall.repositories.PickupSlotRepository;
import com.techx.intervue.modules.user.repositories.UserRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * FR-037 — "Order again" turns an old order into a suggested cart; it never creates an order.
 * Quantities are capped at the nearest orderable date's availability ({@link
 * ProductAvailabilityResolver}, the same rule browse/search uses) — never {@code
 * Product.stockQuantity} (D-02 redesign): the old order carries no guarantee its own pickup date
 * still has any stock left.
 */
class ReorderTest {

    private static final ZoneId HCM = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final long ORDER_ID = 500L;
    private static final long CUSTOMER_ID = 7L;
    private static final long OTHER_CUSTOMER_ID = 8L;
    private static final LocalDate NEAREST_DATE = LocalDate.of(2026, 9, 28);

    private ProductRepository productRepository;
    private ProductAvailabilityResolver availability;
    private OrderRepository orderRepository;
    private OrderItemRepository orderItemRepository;
    private OrderService service;
    private FarmerProfileRepository farmerRepository;

    private final Map<Long, Product> productRows = new HashMap<>();
    private final Map<Long, Integer> availableQty = new HashMap<>();

    @BeforeEach
    void setUp() {
        productRepository = mock(ProductRepository.class);
        availability = mock(ProductAvailabilityResolver.class);
        farmerRepository = mock(FarmerProfileRepository.class);
        when(farmerRepository.findById(10L))
                .thenReturn(Optional.of(stall(ApprovalStatus.APPROVED)));
        orderRepository = mock(OrderRepository.class);
        orderItemRepository = mock(OrderItemRepository.class);
        Clock clock = Clock.fixed(ZonedDateTime.of(2026, 9, 26, 9, 0, 0, 0, HCM).toInstant(), HCM);
        service =
                new OrderService(
                        mock(UserRepository.class),
                        farmerRepository,
                        mock(FarmerMarketRepository.class),
                        mock(PickupSlotRepository.class),
                        productRepository,
                        orderRepository,
                        orderItemRepository,
                        new OrderStatusHistoryWriter(mock(OrderStatusHistoryRepository.class)),
                        new OrderCodeGenerator(orderRepository, clock),
                        mock(CheckoutQueryRepository.class),
                        clock,
                        mock(ProductDailyStockRepository.class),
                        availability,
                        mock(OrderQueryRepository.class),
                        mock(NotificationServiceInterface.class),
                        mock(RestockNotifier.class));
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
        when(availability.resolve(any()))
                .thenAnswer(
                        inv -> {
                            Map<Long, BigDecimal> requested = inv.getArgument(0);
                            Map<Long, ProductAvailabilityResolver.Availability> out =
                                    new HashMap<>();
                            requested
                                    .keySet()
                                    .forEach(
                                            id ->
                                                    Optional.ofNullable(availableQty.get(id))
                                                            .ifPresent(
                                                                    qty ->
                                                                            out.put(
                                                                                    id,
                                                                                    new ProductAvailabilityResolver
                                                                                            .Availability(
                                                                                            NEAREST_DATE,
                                                                                            qty,
                                                                                            BigDecimal
                                                                                                    .TEN))));
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

    /**
     * {@code stock} is the nearest orderable date's quantity, resolved via {@code availability}.
     */
    private Product product(long id, int stock, ProductStatus status) {
        Product p = new Product();
        p.setId(id);
        p.setFarmerId(10L);
        p.setName("P" + id);
        p.setPrice(BigDecimal.TEN);
        p.setUnit("kg");
        p.setStatus(status);
        productRows.put(id, p);
        availableQty.put(id, stock);
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
     * The same "can be bought" rule as placing an order: hidden, paused, sold-out or no-orderable-
     * date lines drop out.
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

    /** No orderable date within the lookahead (no active template) → the line drops out. */
    @Test
    void reorderDropsAProductWithNoOrderableDate() {
        Product p = new Product();
        p.setId(1L);
        p.setFarmerId(10L);
        p.setName("P1");
        p.setPrice(BigDecimal.TEN);
        p.setUnit("kg");
        p.setStatus(ProductStatus.AVAILABLE);
        productRows.put(1L, p);
        // Deliberately no availableQty entry: resolve() returns nothing for it.
        anOrderOf(CUSTOMER_ID, line(1, 3));

        assertThat(service.reorder(CUSTOMER_ID, ORDER_ID)).isEmpty();
    }

    @Test
    void reorderOfAMissingOrderIs404() {
        when(orderRepository.findById(ORDER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.reorder(CUSTOMER_ID, ORDER_ID))
                .isInstanceOf(OrderNotFoundException.class);
    }

    private static FarmerProfile stall(ApprovalStatus status) {
        return FarmerProfile.builder()
                .id(10L)
                .userId(40L)
                .stallName("Vườn Út Hiền")
                .contactPerson("Hiền")
                .approvalStatus(status)
                .build();
    }

    /** D-09: a suspended stall takes no orders, so nothing of its old order is suggested again. */
    @Test
    void reorderFromASuspendedStallSuggestsNothing() {
        when(farmerRepository.findById(10L))
                .thenReturn(Optional.of(stall(ApprovalStatus.SUSPENDED)));
        product(1, 50, ProductStatus.AVAILABLE);
        anOrderOf(CUSTOMER_ID, line(1, 3));

        assertThat(service.reorder(CUSTOMER_ID, ORDER_ID)).isEmpty();
    }
}
