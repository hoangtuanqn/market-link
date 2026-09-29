package com.techx.intervue.modules.order.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.favorite.services.impl.RestockNotifier;
import com.techx.intervue.modules.notification.services.interfaces.NotificationServiceInterface;
import com.techx.intervue.modules.order.entities.Order;
import com.techx.intervue.modules.order.entities.OrderItem;
import com.techx.intervue.modules.order.entities.OrderStatusHistory;
import com.techx.intervue.modules.order.enums.OrderStatus;
import com.techx.intervue.modules.order.exceptions.CutoffPassedException;
import com.techx.intervue.modules.order.exceptions.InvalidOrderTransitionException;
import com.techx.intervue.modules.order.exceptions.OrderNotFoundException;
import com.techx.intervue.modules.order.exceptions.OrderNotYoursException;
import com.techx.intervue.modules.order.exceptions.OutOfStockException;
import com.techx.intervue.modules.order.exceptions.ProductNotInOrderException;
import com.techx.intervue.modules.order.repositories.CheckoutQueryRepository;
import com.techx.intervue.modules.order.repositories.OrderItemRepository;
import com.techx.intervue.modules.order.repositories.OrderQueryRepository;
import com.techx.intervue.modules.order.repositories.OrderQueryRepository.OrderDetailRow;
import com.techx.intervue.modules.order.repositories.OrderRepository;
import com.techx.intervue.modules.order.repositories.OrderStatusHistoryRepository;
import com.techx.intervue.modules.order.requests.CartLine;
import com.techx.intervue.modules.order.requests.ModifyOrderRequest;
import com.techx.intervue.modules.order.resources.OrderListItemResource;
import com.techx.intervue.modules.product.entities.Product;
import com.techx.intervue.modules.product.entities.ProductDailyStock;
import com.techx.intervue.modules.product.enums.ProductStatus;
import com.techx.intervue.modules.product.repositories.ProductDailyStockRepository;
import com.techx.intervue.modules.product.repositories.ProductRepository;
import com.techx.intervue.modules.product.services.impl.ProductAvailabilityResolver;
import com.techx.intervue.modules.stall.entities.PickupSlot;
import com.techx.intervue.modules.stall.repositories.FarmerMarketRepository;
import com.techx.intervue.modules.stall.repositories.PickupSlotRepository;
import com.techx.intervue.modules.user.repositories.UserRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;

class OrderModifyTest {

    private static final ZoneId HCM = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final long ORDER_ID = 500L;
    private static final long CUSTOMER_ID = 7L;
    private static final long OTHER_CUSTOMER_ID = 8L;
    private static final long FARMER_USER_ID = 40L;
    private static final long FARMER_PROFILE_ID = 10L;
    private static final long SLOT_ID = 900L;
    private static final long PRODUCT_A = 1L;
    private static final long PRODUCT_B = 2L;
    private static final BigDecimal TEN = BigDecimal.TEN;
    private static final LocalDate PICKUP = LocalDate.of(2026, 9, 29);
    private static final LocalDateTime CUTOFF_TOMORROW = LocalDateTime.of(2026, 9, 29, 1, 0);
    private static final LocalDateTime CUTOFF_YESTERDAY = LocalDateTime.of(2026, 9, 25, 9, 0);

    private PickupSlotRepository slotRepository;
    private ProductRepository productRepository;
    private ProductDailyStockRepository dailyStockRepository;
    private OrderRepository orderRepository;
    private OrderItemRepository orderItemRepository;
    private OrderStatusHistoryRepository historyRepository;
    private OrderQueryRepository orderQueries;
    private Clock clock;
    private OrderService service;
    private RestockNotifier restock;

    private final List<OrderStatusHistory> history = new ArrayList<>();

    @BeforeEach
    void setUp() {
        slotRepository = mock(PickupSlotRepository.class);
        productRepository = mock(ProductRepository.class);
        dailyStockRepository = mock(ProductDailyStockRepository.class);
        orderRepository = mock(OrderRepository.class);
        orderItemRepository = mock(OrderItemRepository.class);
        historyRepository = mock(OrderStatusHistoryRepository.class);
        orderQueries = mock(OrderQueryRepository.class);
        clock = Clock.fixed(ZonedDateTime.of(2026, 9, 26, 9, 0, 0, 0, HCM).toInstant(), HCM);
        restock = mock(RestockNotifier.class);
        service =
                new OrderService(
                        mock(UserRepository.class),
                        mock(FarmerProfileRepository.class),
                        mock(FarmerMarketRepository.class),
                        slotRepository,
                        productRepository,
                        orderRepository,
                        orderItemRepository,
                        new OrderStatusHistoryWriter(historyRepository),
                        new OrderCodeGenerator(orderRepository, clock),
                        mock(CheckoutQueryRepository.class),
                        clock,
                        dailyStockRepository,
                        mock(ProductAvailabilityResolver.class),
                        orderQueries,
                        mock(NotificationServiceInterface.class),
                        restock);

        when(historyRepository.save(any()))
                .thenAnswer(
                        inv -> {
                            history.add(inv.getArgument(0));
                            return inv.getArgument(0);
                        });
        when(orderQueries.findDetail(ORDER_ID)).thenReturn(Optional.of(aDetailRow()));
        when(orderQueries.items(ORDER_ID)).thenReturn(List.of());
        when(orderQueries.history(ORDER_ID)).thenReturn(List.of());
    }

    private static Order anOrder(OrderStatus status, LocalDateTime cutoffAt) {
        return anOrder(CUSTOMER_ID, status, cutoffAt);
    }

    private static Order anOrder(long customerId, OrderStatus status, LocalDateTime cutoffAt) {
        Order order = new Order();
        order.setId(ORDER_ID);
        order.setOrderCode("ML-20260926-ABCD");
        order.setCustomerId(customerId);
        order.setFarmerId(FARMER_PROFILE_ID);
        order.setMarketId(2L);
        order.setSlotId(SLOT_ID);
        order.setPickupDate(PICKUP);
        order.setPickupStart(LocalTime.of(7, 0));
        order.setPickupEnd(LocalTime.of(8, 0));
        order.setCutoffAt(cutoffAt);
        order.setTotalAmount(new BigDecimal("39000"));
        order.setStatus(status);
        return order;
    }

    private static OrderItem item(long productId, int quantity, BigDecimal unitPrice) {
        OrderItem i = new OrderItem();
        i.setOrderId(ORDER_ID);
        i.setProductId(productId);
        i.setProductName("Sản phẩm " + productId);
        i.setUnitPrice(unitPrice);
        i.setUnit("bó");
        i.setQuantity(quantity);
        i.setSubtotal(unitPrice.multiply(BigDecimal.valueOf(quantity)));
        return i;
    }

    private static Product product(long id, ProductStatus status) {
        Product p = new Product();
        p.setId(id);
        p.setFarmerId(FARMER_PROFILE_ID);
        p.setName("Sản phẩm " + id);
        p.setPrice(TEN);
        p.setUnit("bó");
        p.setStatus(status);
        return p;
    }

    private static ProductDailyStock dailyStock(long productId, int quantity) {
        ProductDailyStock row = new ProductDailyStock();
        row.setProductId(productId);
        row.setStockDate(PICKUP);
        row.setQuantityAvailable(quantity);
        row.setUnitPrice(TEN);
        return row;
    }

    private void stubDailyStockLock(ProductDailyStock row) {
        when(dailyStockRepository.lockByProductIdAndStockDate(row.getProductId(), PICKUP))
                .thenReturn(Optional.of(row));
    }

    private static PickupSlot slotWith(int bookedCount) {
        PickupSlot s = new PickupSlot();
        s.setId(SLOT_ID);
        s.setBookedCount(bookedCount);
        return s;
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
                1,
                "2026-09-26T02:00:00Z",
                7L,
                "Khách 7",
                false);
    }

    private static OrderDetailRow aDetailRow() {
        return new OrderDetailRow(
                summary(),
                OrderStatus.PLACED,
                CUTOFF_TOMORROW,
                CUSTOMER_ID,
                "Khách 7",
                "0900000000",
                "khach7@t.vn",
                FARMER_USER_ID,
                null,
                null);
    }

    @Test
    void cancelBeforeCutoffRestoresStockAndSlot() {
        Order order = anOrder(OrderStatus.PLACED, CUTOFF_TOMORROW);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));
        when(orderItemRepository.findByOrderId(ORDER_ID))
                .thenReturn(List.of(item(PRODUCT_A, 2, TEN), item(PRODUCT_B, 1, TEN)));
        Product a = product(PRODUCT_A, ProductStatus.AVAILABLE);
        Product b = product(PRODUCT_B, ProductStatus.SOLD_OUT);
        when(productRepository.findAllById(any())).thenReturn(List.of(a, b));
        ProductDailyStock rowA = dailyStock(PRODUCT_A, 5);
        ProductDailyStock rowB = dailyStock(PRODUCT_B, 0);
        stubDailyStockLock(rowA);
        stubDailyStockLock(rowB);
        PickupSlot slot = slotWith(3);
        when(slotRepository.lockById(SLOT_ID)).thenReturn(Optional.of(slot));

        service.cancel(CUSTOMER_ID, ORDER_ID);

        assertThat(order.getStatus()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(rowA.getQuantityAvailable()).isEqualTo(7);
        assertThat(rowB.getQuantityAvailable()).isEqualTo(1);
        assertThat(slot.getBookedCount()).isEqualTo(2);
        assertThat(history).hasSize(1);
        assertThat(history.getFirst().getFromStatus()).isEqualTo(OrderStatus.PLACED);
        assertThat(history.getFirst().getToStatus()).isEqualTo(OrderStatus.CANCELLED);
    }

    @Test
    void cancelAfterCutoffIs409() {
        Order order = anOrder(OrderStatus.PLACED, CUTOFF_YESTERDAY);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> service.cancel(CUSTOMER_ID, ORDER_ID))
                .isInstanceOf(CutoffPassedException.class);

        assertThat(order.getStatus()).isEqualTo(OrderStatus.PLACED);
        verify(dailyStockRepository, never()).lockByProductIdAndStockDate(any(), any());
        verify(historyRepository, never()).save(any());
    }

    @Test
    void cancelOnAReadyOrderIs409() {
        Order order = anOrder(OrderStatus.READY, CUTOFF_TOMORROW);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> service.cancel(CUSTOMER_ID, ORDER_ID))
                .isInstanceOf(InvalidOrderTransitionException.class);

        assertThat(order.getStatus()).isEqualTo(OrderStatus.READY);
        verify(historyRepository, never()).save(any());
    }

    @Test
    void cancelOnAnotherCustomersOrderIs403() {
        Order order = anOrder(OTHER_CUSTOMER_ID, OrderStatus.PLACED, CUTOFF_TOMORROW);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> service.cancel(CUSTOMER_ID, ORDER_ID))
                .isInstanceOf(OrderNotYoursException.class);
        assertThat(order.getStatus()).isEqualTo(OrderStatus.PLACED);
    }

    @Test
    void cancelOnAnUnknownOrderIs404() {
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.cancel(CUSTOMER_ID, ORDER_ID))
                .isInstanceOf(OrderNotFoundException.class);
    }

    @Test
    void theOwningFarmerCannotCancelTheCustomersOrder() {
        Order order = anOrder(CUSTOMER_ID, OrderStatus.PLACED, CUTOFF_TOMORROW);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> service.cancel(FARMER_USER_ID, ORDER_ID))
                .isInstanceOf(OrderNotYoursException.class);
        assertThat(order.getStatus()).isEqualTo(OrderStatus.PLACED);
    }

    @Test
    void cancelLocksTheOrderThenTheSlotThenTheDailyStockRows() {
        Order order = anOrder(OrderStatus.PLACED, CUTOFF_TOMORROW);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));
        when(orderItemRepository.findByOrderId(ORDER_ID))
                .thenReturn(List.of(item(PRODUCT_A, 2, TEN)));
        when(productRepository.findAllById(any()))
                .thenReturn(List.of(product(PRODUCT_A, ProductStatus.AVAILABLE)));
        stubDailyStockLock(dailyStock(PRODUCT_A, 5));
        when(slotRepository.lockById(SLOT_ID)).thenReturn(Optional.of(slotWith(3)));

        service.cancel(CUSTOMER_ID, ORDER_ID);

        InOrder locks = inOrder(orderRepository, slotRepository, dailyStockRepository);
        locks.verify(orderRepository).lockById(ORDER_ID);
        locks.verify(slotRepository).lockById(SLOT_ID);
        locks.verify(dailyStockRepository).lockByProductIdAndStockDate(eq(PRODUCT_A), eq(PICKUP));
    }

    @Test
    void modifyLoweringQuantityGivesTheDifferenceBack() {
        Order order = anOrder(OrderStatus.PLACED, CUTOFF_TOMORROW);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));
        OrderItem itemA = item(PRODUCT_A, 5, TEN);
        when(orderItemRepository.findByOrderId(ORDER_ID)).thenReturn(List.of(itemA));
        Product a = product(PRODUCT_A, ProductStatus.AVAILABLE);
        when(productRepository.findAllById(any())).thenReturn(List.of(a));
        ProductDailyStock rowA = dailyStock(PRODUCT_A, 10);
        stubDailyStockLock(rowA);
        when(slotRepository.lockById(SLOT_ID)).thenReturn(Optional.of(slotWith(3)));

        service.modifyItems(
                CUSTOMER_ID, ORDER_ID, new ModifyOrderRequest(List.of(new CartLine(PRODUCT_A, 2))));

        assertThat(rowA.getQuantityAvailable()).isEqualTo(13);
        assertThat(itemA.getQuantity()).isEqualTo(2);
        assertThat(order.getTotalAmount()).isEqualByComparingTo(new BigDecimal("20"));
        assertThat(order.getStatus()).isEqualTo(OrderStatus.PLACED);
    }

    @Test
    void modifyRaisingQuantityTakesTheDifference() {
        Order order = anOrder(OrderStatus.PLACED, CUTOFF_TOMORROW);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));
        OrderItem itemA = item(PRODUCT_A, 2, TEN);
        when(orderItemRepository.findByOrderId(ORDER_ID)).thenReturn(List.of(itemA));
        Product a = product(PRODUCT_A, ProductStatus.AVAILABLE);
        when(productRepository.findAllById(any())).thenReturn(List.of(a));
        ProductDailyStock rowA = dailyStock(PRODUCT_A, 10);
        stubDailyStockLock(rowA);
        when(slotRepository.lockById(SLOT_ID)).thenReturn(Optional.of(slotWith(3)));

        service.modifyItems(
                CUSTOMER_ID, ORDER_ID, new ModifyOrderRequest(List.of(new CartLine(PRODUCT_A, 5))));

        assertThat(rowA.getQuantityAvailable()).isEqualTo(7);
        assertThat(itemA.getQuantity()).isEqualTo(5);
        assertThat(order.getTotalAmount()).isEqualByComparingTo(new BigDecimal("50"));
    }

    @Test
    void modifyLoweringAnOrderPlacedBeforePerDateStockLeavesStockAlone() {
        Order order = anOrder(OrderStatus.PLACED, CUTOFF_TOMORROW);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));
        OrderItem itemA = item(PRODUCT_A, 5, TEN);
        when(orderItemRepository.findByOrderId(ORDER_ID)).thenReturn(List.of(itemA));
        when(productRepository.findAllById(any()))
                .thenReturn(List.of(product(PRODUCT_A, ProductStatus.AVAILABLE)));
        when(dailyStockRepository.lockByProductIdAndStockDate(PRODUCT_A, PICKUP))
                .thenReturn(Optional.empty());
        when(slotRepository.lockById(SLOT_ID)).thenReturn(Optional.of(slotWith(3)));

        service.modifyItems(
                CUSTOMER_ID, ORDER_ID, new ModifyOrderRequest(List.of(new CartLine(PRODUCT_A, 2))));

        assertThat(itemA.getQuantity()).isEqualTo(2);
        assertThat(order.getTotalAmount()).isEqualByComparingTo(new BigDecimal("20"));
        verify(dailyStockRepository, never()).materialize(any(), any(), anyInt());
    }

    @Test
    void modifyRaisingAnOrderPlacedBeforePerDateStockCreatesTheRowFirst() {
        Order order = anOrder(OrderStatus.PLACED, CUTOFF_TOMORROW);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));
        OrderItem itemA = item(PRODUCT_A, 2, TEN);
        when(orderItemRepository.findByOrderId(ORDER_ID)).thenReturn(List.of(itemA));
        when(productRepository.findAllById(any()))
                .thenReturn(List.of(product(PRODUCT_A, ProductStatus.AVAILABLE)));
        ProductDailyStock created = dailyStock(PRODUCT_A, 30);
        when(dailyStockRepository.lockByProductIdAndStockDate(PRODUCT_A, PICKUP))
                .thenReturn(Optional.empty(), Optional.of(created));
        when(slotRepository.lockById(SLOT_ID)).thenReturn(Optional.of(slotWith(3)));

        service.modifyItems(
                CUSTOMER_ID, ORDER_ID, new ModifyOrderRequest(List.of(new CartLine(PRODUCT_A, 5))));

        verify(dailyStockRepository).materialize(PRODUCT_A, PICKUP, 2);
        assertThat(created.getQuantityAvailable()).isEqualTo(27);
        assertThat(itemA.getQuantity()).isEqualTo(5);
    }

    @Test
    void modifyRaisingWhenNoTemplateCoversThePickupDayIs409() {
        Order order = anOrder(OrderStatus.PLACED, CUTOFF_TOMORROW);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));
        OrderItem itemA = item(PRODUCT_A, 2, TEN);
        when(orderItemRepository.findByOrderId(ORDER_ID)).thenReturn(List.of(itemA));
        when(productRepository.findAllById(any()))
                .thenReturn(List.of(product(PRODUCT_A, ProductStatus.AVAILABLE)));
        when(dailyStockRepository.lockByProductIdAndStockDate(PRODUCT_A, PICKUP))
                .thenReturn(Optional.empty());
        when(slotRepository.lockById(SLOT_ID)).thenReturn(Optional.of(slotWith(3)));

        assertThatThrownBy(
                        () ->
                                service.modifyItems(
                                        CUSTOMER_ID,
                                        ORDER_ID,
                                        new ModifyOrderRequest(
                                                List.of(new CartLine(PRODUCT_A, 5)))))
                .isInstanceOf(OutOfStockException.class);
        assertThat(itemA.getQuantity()).isEqualTo(2);
    }

    @Test
    void modifyDroppingAnItemRemovesTheRow() {
        Order order = anOrder(OrderStatus.PLACED, CUTOFF_TOMORROW);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));
        OrderItem itemA = item(PRODUCT_A, 2, TEN);
        OrderItem itemB = item(PRODUCT_B, 3, TEN);
        when(orderItemRepository.findByOrderId(ORDER_ID)).thenReturn(List.of(itemA, itemB));
        Product a = product(PRODUCT_A, ProductStatus.AVAILABLE);
        Product b = product(PRODUCT_B, ProductStatus.SOLD_OUT);
        when(productRepository.findAllById(any())).thenReturn(List.of(a, b));
        stubDailyStockLock(dailyStock(PRODUCT_A, 10));
        ProductDailyStock rowB = dailyStock(PRODUCT_B, 0);
        stubDailyStockLock(rowB);
        when(slotRepository.lockById(SLOT_ID)).thenReturn(Optional.of(slotWith(3)));

        service.modifyItems(
                CUSTOMER_ID, ORDER_ID, new ModifyOrderRequest(List.of(new CartLine(PRODUCT_A, 2))));

        verify(orderItemRepository).delete(itemB);
        assertThat(rowB.getQuantityAvailable()).isEqualTo(3);
        assertThat(order.getTotalAmount()).isEqualByComparingTo(new BigDecimal("20"));
        assertThat(order.getStatus()).isEqualTo(OrderStatus.PLACED);
    }

    @Test
    void modifyRefusesAProductNotAlreadyInTheOrder() {
        Order order = anOrder(OrderStatus.PLACED, CUTOFF_TOMORROW);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));
        when(orderItemRepository.findByOrderId(ORDER_ID))
                .thenReturn(List.of(item(PRODUCT_A, 2, TEN)));
        when(slotRepository.lockById(SLOT_ID)).thenReturn(Optional.of(slotWith(3)));
        long strangerProductId = 999L;

        assertThatThrownBy(
                        () ->
                                service.modifyItems(
                                        CUSTOMER_ID,
                                        ORDER_ID,
                                        new ModifyOrderRequest(
                                                List.of(new CartLine(strangerProductId, 1)))))
                .isInstanceOf(ProductNotInOrderException.class);

        verify(dailyStockRepository, never()).lockByProductIdAndStockDate(any(), any());
        assertThat(order.getStatus()).isEqualTo(OrderStatus.PLACED);
    }

    @Test
    void modifyPutsAnAcceptedOrderBackToPlaced() {
        Order order = anOrder(OrderStatus.ACCEPTED, CUTOFF_TOMORROW);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));
        OrderItem itemA = item(PRODUCT_A, 5, TEN);
        when(orderItemRepository.findByOrderId(ORDER_ID)).thenReturn(List.of(itemA));
        Product a = product(PRODUCT_A, ProductStatus.AVAILABLE);
        when(productRepository.findAllById(any())).thenReturn(List.of(a));
        stubDailyStockLock(dailyStock(PRODUCT_A, 10));
        when(slotRepository.lockById(SLOT_ID)).thenReturn(Optional.of(slotWith(3)));

        service.modifyItems(
                CUSTOMER_ID, ORDER_ID, new ModifyOrderRequest(List.of(new CartLine(PRODUCT_A, 2))));

        assertThat(order.getStatus()).isEqualTo(OrderStatus.PLACED);
        assertThat(history).hasSize(1);
        assertThat(history.getFirst().getFromStatus()).isEqualTo(OrderStatus.ACCEPTED);
        assertThat(history.getFirst().getToStatus()).isEqualTo(OrderStatus.PLACED);
        assertThat(history.getFirst().getNote()).isEqualTo("Customer changed the order.");
    }

    @Test
    void modifyRaisingQuantityWithInsufficientStockIs409AndLeavesOrderUnchanged() {
        Order order = anOrder(OrderStatus.PLACED, CUTOFF_TOMORROW);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));
        OrderItem itemA = item(PRODUCT_A, 2, TEN);
        when(orderItemRepository.findByOrderId(ORDER_ID)).thenReturn(List.of(itemA));
        Product a = product(PRODUCT_A, ProductStatus.AVAILABLE);
        when(productRepository.findAllById(any())).thenReturn(List.of(a));
        ProductDailyStock rowA = dailyStock(PRODUCT_A, 2);
        stubDailyStockLock(rowA);
        when(slotRepository.lockById(SLOT_ID)).thenReturn(Optional.of(slotWith(3)));

        assertThatThrownBy(
                        () ->
                                service.modifyItems(
                                        CUSTOMER_ID,
                                        ORDER_ID,
                                        new ModifyOrderRequest(
                                                List.of(new CartLine(PRODUCT_A, 5)))))
                .isInstanceOf(OutOfStockException.class);

        assertThat(rowA.getQuantityAvailable()).isEqualTo(2);
        assertThat(itemA.getQuantity()).isEqualTo(2);
        assertThat(order.getStatus()).isEqualTo(OrderStatus.PLACED);
        verify(orderItemRepository, never()).delete(any());
        verify(historyRepository, never()).save(any());
    }

    @Test
    void modifyRaisingAnUnavailableProductIs409() {
        Order order = anOrder(OrderStatus.PLACED, CUTOFF_TOMORROW);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));
        OrderItem itemA = item(PRODUCT_A, 2, TEN);
        when(orderItemRepository.findByOrderId(ORDER_ID)).thenReturn(List.of(itemA));
        Product a = product(PRODUCT_A, ProductStatus.UNAVAILABLE);
        when(productRepository.findAllById(any())).thenReturn(List.of(a));
        ProductDailyStock rowA = dailyStock(PRODUCT_A, 50);
        stubDailyStockLock(rowA);
        when(slotRepository.lockById(SLOT_ID)).thenReturn(Optional.of(slotWith(3)));

        assertThatThrownBy(
                        () ->
                                service.modifyItems(
                                        CUSTOMER_ID,
                                        ORDER_ID,
                                        new ModifyOrderRequest(
                                                List.of(new CartLine(PRODUCT_A, 3)))))
                .isInstanceOf(OutOfStockException.class);

        assertThat(rowA.getQuantityAvailable()).isEqualTo(50);
        assertThat(itemA.getQuantity()).isEqualTo(2);
    }

    @Test
    void modifyRaisingASoldOutProductWithRemainingStockIs409() {
        Order order = anOrder(OrderStatus.PLACED, CUTOFF_TOMORROW);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));
        OrderItem itemA = item(PRODUCT_A, 2, TEN);
        when(orderItemRepository.findByOrderId(ORDER_ID)).thenReturn(List.of(itemA));
        Product a = product(PRODUCT_A, ProductStatus.SOLD_OUT);
        when(productRepository.findAllById(any())).thenReturn(List.of(a));
        ProductDailyStock rowA = dailyStock(PRODUCT_A, 50);
        stubDailyStockLock(rowA);
        when(slotRepository.lockById(SLOT_ID)).thenReturn(Optional.of(slotWith(3)));

        assertThatThrownBy(
                        () ->
                                service.modifyItems(
                                        CUSTOMER_ID,
                                        ORDER_ID,
                                        new ModifyOrderRequest(
                                                List.of(new CartLine(PRODUCT_A, 5)))))
                .isInstanceOf(OutOfStockException.class);

        assertThat(rowA.getQuantityAvailable()).isEqualTo(50);
        assertThat(a.getStatus()).isEqualTo(ProductStatus.SOLD_OUT);
        assertThat(itemA.getQuantity()).isEqualTo(2);
    }

    @Test
    void modifyWithUnchangedQuantityDoesNotTouchTheDailyStockRow() {
        Order order = anOrder(OrderStatus.PLACED, CUTOFF_TOMORROW);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));
        OrderItem itemA = item(PRODUCT_A, 2, TEN);
        when(orderItemRepository.findByOrderId(ORDER_ID)).thenReturn(List.of(itemA));
        Product a = product(PRODUCT_A, ProductStatus.UNAVAILABLE);
        when(productRepository.findAllById(any())).thenReturn(List.of(a));
        ProductDailyStock rowA = dailyStock(PRODUCT_A, 0);
        stubDailyStockLock(rowA);
        when(slotRepository.lockById(SLOT_ID)).thenReturn(Optional.of(slotWith(3)));

        service.modifyItems(
                CUSTOMER_ID, ORDER_ID, new ModifyOrderRequest(List.of(new CartLine(PRODUCT_A, 2))));

        assertThat(rowA.getQuantityAvailable()).isEqualTo(0);
        assertThat(order.getStatus()).isEqualTo(OrderStatus.PLACED);
    }

    @Test
    void modifyDroppingEveryItemCancelsTheOrder() {
        Order order = anOrder(OrderStatus.PLACED, CUTOFF_TOMORROW);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));
        OrderItem itemA = item(PRODUCT_A, 5, TEN);
        List<OrderItem> remainingItems = new ArrayList<>(List.of(itemA));
        when(orderItemRepository.findByOrderId(ORDER_ID))
                .thenAnswer(inv -> List.copyOf(remainingItems));
        doAnswer(
                        inv -> {
                            remainingItems.remove((OrderItem) inv.getArgument(0));
                            return null;
                        })
                .when(orderItemRepository)
                .delete(any());
        Product a = product(PRODUCT_A, ProductStatus.AVAILABLE);
        when(productRepository.findAllById(any())).thenReturn(List.of(a));
        ProductDailyStock rowA = dailyStock(PRODUCT_A, 10);
        stubDailyStockLock(rowA);
        when(slotRepository.lockById(SLOT_ID)).thenReturn(Optional.of(slotWith(3)));

        service.modifyItems(
                CUSTOMER_ID, ORDER_ID, new ModifyOrderRequest(List.of(new CartLine(PRODUCT_A, 0))));

        assertThat(order.getStatus()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(rowA.getQuantityAvailable()).isEqualTo(15);
        assertThat(history).hasSize(1);
        assertThat(history.getFirst().getToStatus()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(history.getFirst().getNote()).isEqualTo("All items removed.");
    }

    @Test
    void modifyingToAFreeItemKeepsTheOrderPlacedInsteadOfCancellingIt() {
        Order order = anOrder(OrderStatus.PLACED, CUTOFF_TOMORROW);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));
        OrderItem itemA = item(PRODUCT_A, 2, BigDecimal.ZERO);
        when(orderItemRepository.findByOrderId(ORDER_ID)).thenReturn(List.of(itemA));
        Product a = product(PRODUCT_A, ProductStatus.AVAILABLE);
        when(productRepository.findAllById(any())).thenReturn(List.of(a));
        stubDailyStockLock(dailyStock(PRODUCT_A, 10));
        when(slotRepository.lockById(SLOT_ID)).thenReturn(Optional.of(slotWith(3)));

        service.modifyItems(
                CUSTOMER_ID, ORDER_ID, new ModifyOrderRequest(List.of(new CartLine(PRODUCT_A, 3))));

        assertThat(order.getStatus()).isEqualTo(OrderStatus.PLACED);
        assertThat(order.getTotalAmount()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(itemA.getQuantity()).isEqualTo(3);
        assertThat(history).isEmpty();
        verify(orderItemRepository, never()).delete(any());
    }

    @Test
    void modifyingAnAcceptedOrderToAFreeItemGoesBackToPlacedInsteadOfCancelling() {
        Order order = anOrder(OrderStatus.ACCEPTED, CUTOFF_TOMORROW);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));
        OrderItem itemA = item(PRODUCT_A, 5, BigDecimal.ZERO);
        when(orderItemRepository.findByOrderId(ORDER_ID)).thenReturn(List.of(itemA));
        Product a = product(PRODUCT_A, ProductStatus.AVAILABLE);
        when(productRepository.findAllById(any())).thenReturn(List.of(a));
        stubDailyStockLock(dailyStock(PRODUCT_A, 10));
        when(slotRepository.lockById(SLOT_ID)).thenReturn(Optional.of(slotWith(3)));

        service.modifyItems(
                CUSTOMER_ID, ORDER_ID, new ModifyOrderRequest(List.of(new CartLine(PRODUCT_A, 2))));

        assertThat(order.getStatus()).isEqualTo(OrderStatus.PLACED);
        assertThat(order.getTotalAmount()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(history).hasSize(1);
        assertThat(history.getFirst().getFromStatus()).isEqualTo(OrderStatus.ACCEPTED);
        assertThat(history.getFirst().getToStatus()).isEqualTo(OrderStatus.PLACED);
    }

    @Test
    void modifyOnAPlacedOrderWritesNoHistory() {
        Order order = anOrder(OrderStatus.PLACED, CUTOFF_TOMORROW);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));
        OrderItem itemA = item(PRODUCT_A, 5, TEN);
        when(orderItemRepository.findByOrderId(ORDER_ID)).thenReturn(List.of(itemA));
        Product a = product(PRODUCT_A, ProductStatus.AVAILABLE);
        when(productRepository.findAllById(any())).thenReturn(List.of(a));
        stubDailyStockLock(dailyStock(PRODUCT_A, 10));
        when(slotRepository.lockById(SLOT_ID)).thenReturn(Optional.of(slotWith(3)));

        service.modifyItems(
                CUSTOMER_ID, ORDER_ID, new ModifyOrderRequest(List.of(new CartLine(PRODUCT_A, 3))));

        assertThat(order.getStatus()).isEqualTo(OrderStatus.PLACED);
        assertThat(history).isEmpty();
        verify(orderRepository).save(order);
        verify(orderRepository).flush();
    }

    @Test
    void modifyAfterCutoffIs409() {
        Order order = anOrder(OrderStatus.PLACED, CUTOFF_YESTERDAY);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));

        assertThatThrownBy(
                        () ->
                                service.modifyItems(
                                        CUSTOMER_ID,
                                        ORDER_ID,
                                        new ModifyOrderRequest(
                                                List.of(new CartLine(PRODUCT_A, 1)))))
                .isInstanceOf(CutoffPassedException.class);

        verify(orderItemRepository, never()).findByOrderId(any());
    }

    @Test
    void modifyOnAReadyOrderIs409() {
        Order order = anOrder(OrderStatus.READY, CUTOFF_TOMORROW);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));

        assertThatThrownBy(
                        () ->
                                service.modifyItems(
                                        CUSTOMER_ID,
                                        ORDER_ID,
                                        new ModifyOrderRequest(
                                                List.of(new CartLine(PRODUCT_A, 1)))))
                .isInstanceOf(InvalidOrderTransitionException.class);
    }

    @Test
    void modifyOnAnUnknownOrderIs404() {
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(
                        () ->
                                service.modifyItems(
                                        CUSTOMER_ID,
                                        ORDER_ID,
                                        new ModifyOrderRequest(
                                                List.of(new CartLine(PRODUCT_A, 1)))))
                .isInstanceOf(OrderNotFoundException.class);
    }

    @Test
    void modifyOnAnotherCustomersOrderIs403() {
        Order order = anOrder(OTHER_CUSTOMER_ID, OrderStatus.PLACED, CUTOFF_TOMORROW);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));

        assertThatThrownBy(
                        () ->
                                service.modifyItems(
                                        CUSTOMER_ID,
                                        ORDER_ID,
                                        new ModifyOrderRequest(
                                                List.of(new CartLine(PRODUCT_A, 1)))))
                .isInstanceOf(OrderNotYoursException.class);
    }

    @Test
    void theOwningFarmerCannotModifyTheCustomersOrder() {
        Order order = anOrder(CUSTOMER_ID, OrderStatus.PLACED, CUTOFF_TOMORROW);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));

        assertThatThrownBy(
                        () ->
                                service.modifyItems(
                                        FARMER_USER_ID,
                                        ORDER_ID,
                                        new ModifyOrderRequest(
                                                List.of(new CartLine(PRODUCT_A, 1)))))
                .isInstanceOf(OrderNotYoursException.class);
    }

    @Test
    void modifyLocksTheOrderThenTheSlotThenTheDailyStockRows() {
        Order order = anOrder(OrderStatus.PLACED, CUTOFF_TOMORROW);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));
        when(orderItemRepository.findByOrderId(ORDER_ID))
                .thenReturn(List.of(item(PRODUCT_A, 5, TEN)));
        when(productRepository.findAllById(any()))
                .thenReturn(List.of(product(PRODUCT_A, ProductStatus.AVAILABLE)));
        stubDailyStockLock(dailyStock(PRODUCT_A, 10));
        when(slotRepository.lockById(SLOT_ID)).thenReturn(Optional.of(slotWith(3)));

        service.modifyItems(
                CUSTOMER_ID, ORDER_ID, new ModifyOrderRequest(List.of(new CartLine(PRODUCT_A, 2))));

        InOrder locks = inOrder(orderRepository, slotRepository, dailyStockRepository);
        locks.verify(orderRepository).lockById(ORDER_ID);
        locks.verify(slotRepository).lockById(SLOT_ID);
        locks.verify(dailyStockRepository).lockByProductIdAndStockDate(eq(PRODUCT_A), eq(PICKUP));
    }

    @Test
    void loweringAQuantityReportsTheStockRiseForRestockAlerts() {
        Order order = anOrder(OrderStatus.PLACED, CUTOFF_TOMORROW);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));
        when(orderItemRepository.findByOrderId(ORDER_ID))
                .thenReturn(List.of(item(PRODUCT_A, 5, TEN)));
        Product a = product(PRODUCT_A, ProductStatus.AVAILABLE);
        when(productRepository.findAllById(any())).thenReturn(List.of(a));
        stubDailyStockLock(dailyStock(PRODUCT_A, 0));
        when(slotRepository.lockById(SLOT_ID)).thenReturn(Optional.of(slotWith(3)));
        when(restock.isOrderable(a)).thenReturn(false, true);

        service.modifyItems(
                CUSTOMER_ID, ORDER_ID, new ModifyOrderRequest(List.of(new CartLine(PRODUCT_A, 2))));

        verify(restock).afterChange(a, false, true);
    }
}
