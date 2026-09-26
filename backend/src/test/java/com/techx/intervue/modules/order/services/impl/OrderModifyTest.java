package com.techx.intervue.modules.order.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
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
import com.techx.intervue.modules.product.enums.ProductStatus;
import com.techx.intervue.modules.product.repositories.ProductRepository;
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
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;

/**
 * Task 5.6 (FR-034, 035) — the customer cancels and edits their own order before the cutoff. {@code
 * cancel} and {@code modifyItems} are just two new entrances to {@code transition(...)} / direct
 * changes on the locked order; the repository is a plain mock like {@link OrderTransitionTest}, the
 * real lock (PESSIMISTIC_WRITE) is proven by a manual check (curl + mysql) after seeding, not here.
 *
 * <p>Today (per the Clock) is 26/09/2026, 09:00 Vietnam time — the same moment as {@link
 * OrderTransitionTest} and {@link OrderAccessTest}.
 */
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
    private static final LocalDateTime CUTOFF_TOMORROW = LocalDateTime.of(2026, 9, 29, 1, 0);
    private static final LocalDateTime CUTOFF_YESTERDAY = LocalDateTime.of(2026, 9, 25, 9, 0);

    private PickupSlotRepository slotRepository;
    private ProductRepository productRepository;
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
                        orderQueries,
                        clock,
                        mock(NotificationServiceInterface.class),
                        restock);

        when(historyRepository.save(any()))
                .thenAnswer(
                        inv -> {
                            history.add(inv.getArgument(0));
                            return inv.getArgument(0);
                        });
        // The four public methods build the response by calling detail() again; mock enough not to
        // throw.
        when(orderQueries.findDetail(ORDER_ID)).thenReturn(Optional.of(aDetailRow()));
        when(orderQueries.items(ORDER_ID)).thenReturn(List.of());
        when(orderQueries.history(ORDER_ID)).thenReturn(List.of());
    }

    // ---------- data ----------

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
        order.setPickupDate(LocalDate.of(2026, 9, 29));
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

    private static Product product(long id, int stock, ProductStatus status) {
        Product p = new Product();
        p.setId(id);
        p.setFarmerId(FARMER_PROFILE_ID);
        p.setName("Sản phẩm " + id);
        p.setPrice(TEN);
        p.setUnit("bó");
        p.setStockQuantity(stock);
        p.setStatus(status);
        return p;
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
                "2026-09-26T02:00:00Z");
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

    // ---------- cancel: the brief's 4 tests ----------

    @Test
    void cancelBeforeCutoffRestoresStockAndSlot() {
        Order order = anOrder(OrderStatus.PLACED, CUTOFF_TOMORROW);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));
        when(orderItemRepository.findByOrderId(ORDER_ID))
                .thenReturn(List.of(item(PRODUCT_A, 2, TEN), item(PRODUCT_B, 1, TEN)));
        Product a = product(PRODUCT_A, 5, ProductStatus.AVAILABLE);
        Product b = product(PRODUCT_B, 0, ProductStatus.SOLD_OUT);
        when(productRepository.lockAllById(any())).thenReturn(List.of(a, b));
        PickupSlot slot = slotWith(3);
        when(slotRepository.lockById(SLOT_ID)).thenReturn(Optional.of(slot));

        service.cancel(CUSTOMER_ID, ORDER_ID);

        assertThat(order.getStatus()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(a.getStockQuantity()).isEqualTo(7);
        assertThat(b.getStockQuantity()).isEqualTo(1);
        assertThat(b.getStatus()).isEqualTo(ProductStatus.AVAILABLE);
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
        verify(productRepository, never()).lockAllById(any());
        verify(historyRepository, never()).save(any());
    }

    /**
     * An order already ready, even before the cutoff (D-04) — a wrong status is always 409, not the
     * cutoff.
     */
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

    // ---------- cancel: extra rules ----------

    /** An order id that does not exist → 404, not 403 (unlike a wrong owner). */
    @Test
    void cancelOnAnUnknownOrderIs404() {
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.cancel(CUSTOMER_ID, ORDER_ID))
                .isInstanceOf(OrderNotFoundException.class);
    }

    /**
     * The Farmer serving the order (order.farmer_id points to their own stall) calls the customer's
     * cancel API on that very order → still 403: the right to cancel only looks at {@code
     * customer_id}, not {@code farmer_id}.
     */
    @Test
    void theOwningFarmerCannotCancelTheCustomersOrder() {
        Order order = anOrder(CUSTOMER_ID, OrderStatus.PLACED, CUTOFF_TOMORROW);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> service.cancel(FARMER_USER_ID, ORDER_ID))
                .isInstanceOf(OrderNotYoursException.class);
        assertThat(order.getStatus()).isEqualTo(OrderStatus.PLACED);
    }

    /**
     * C5-2/C5-18: the order is locked first, then the slot, then the products (inside transition).
     */
    @Test
    void cancelLocksTheOrderThenTheSlotThenTheProducts() {
        Order order = anOrder(OrderStatus.PLACED, CUTOFF_TOMORROW);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));
        when(orderItemRepository.findByOrderId(ORDER_ID))
                .thenReturn(List.of(item(PRODUCT_A, 2, TEN)));
        when(productRepository.lockAllById(any()))
                .thenReturn(List.of(product(PRODUCT_A, 5, ProductStatus.AVAILABLE)));
        when(slotRepository.lockById(SLOT_ID)).thenReturn(Optional.of(slotWith(3)));

        service.cancel(CUSTOMER_ID, ORDER_ID);

        InOrder locks = inOrder(orderRepository, slotRepository, productRepository);
        locks.verify(orderRepository).lockById(ORDER_ID);
        locks.verify(slotRepository).lockById(SLOT_ID);
        locks.verify(productRepository).lockAllById(any());
    }

    // ---------- modify: the brief's 5 tests ----------

    /** 5 → 2: stock goes back up by exactly the difference (3), not the whole old quantity (5). */
    @Test
    void modifyLoweringQuantityGivesTheDifferenceBack() {
        Order order = anOrder(OrderStatus.PLACED, CUTOFF_TOMORROW);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));
        OrderItem itemA = item(PRODUCT_A, 5, TEN);
        when(orderItemRepository.findByOrderId(ORDER_ID)).thenReturn(List.of(itemA));
        Product a = product(PRODUCT_A, 10, ProductStatus.AVAILABLE);
        when(productRepository.lockAllById(any())).thenReturn(List.of(a));
        when(slotRepository.lockById(SLOT_ID)).thenReturn(Optional.of(slotWith(3)));

        service.modifyItems(
                CUSTOMER_ID, ORDER_ID, new ModifyOrderRequest(List.of(new CartLine(PRODUCT_A, 2))));

        assertThat(a.getStockQuantity()).isEqualTo(13);
        assertThat(itemA.getQuantity()).isEqualTo(2);
        assertThat(order.getTotalAmount()).isEqualByComparingTo(new BigDecimal("20"));
        assertThat(order.getStatus()).isEqualTo(OrderStatus.PLACED);
    }

    /** 2 → 5, enough stock: stock goes down by exactly the difference (3). */
    @Test
    void modifyRaisingQuantityTakesTheDifference() {
        Order order = anOrder(OrderStatus.PLACED, CUTOFF_TOMORROW);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));
        OrderItem itemA = item(PRODUCT_A, 2, TEN);
        when(orderItemRepository.findByOrderId(ORDER_ID)).thenReturn(List.of(itemA));
        Product a = product(PRODUCT_A, 10, ProductStatus.AVAILABLE);
        when(productRepository.lockAllById(any())).thenReturn(List.of(a));
        when(slotRepository.lockById(SLOT_ID)).thenReturn(Optional.of(slotWith(3)));

        service.modifyItems(
                CUSTOMER_ID, ORDER_ID, new ModifyOrderRequest(List.of(new CartLine(PRODUCT_A, 5))));

        assertThat(a.getStockQuantity()).isEqualTo(7);
        assertThat(itemA.getQuantity()).isEqualTo(5);
        assertThat(order.getTotalAmount()).isEqualByComparingTo(new BigDecimal("50"));
    }

    /** order_items loses the dropped line, and its stock is returned in full. */
    @Test
    void modifyDroppingAnItemRemovesTheRow() {
        Order order = anOrder(OrderStatus.PLACED, CUTOFF_TOMORROW);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));
        OrderItem itemA = item(PRODUCT_A, 2, TEN);
        OrderItem itemB = item(PRODUCT_B, 3, TEN);
        when(orderItemRepository.findByOrderId(ORDER_ID)).thenReturn(List.of(itemA, itemB));
        Product a = product(PRODUCT_A, 10, ProductStatus.AVAILABLE);
        Product b = product(PRODUCT_B, 0, ProductStatus.SOLD_OUT);
        when(productRepository.lockAllById(any())).thenReturn(List.of(a, b));
        when(slotRepository.lockById(SLOT_ID)).thenReturn(Optional.of(slotWith(3)));

        service.modifyItems(
                CUSTOMER_ID, ORDER_ID, new ModifyOrderRequest(List.of(new CartLine(PRODUCT_A, 2))));

        verify(orderItemRepository).delete(itemB);
        assertThat(b.getStockQuantity()).isEqualTo(3);
        assertThat(b.getStatus()).isEqualTo(ProductStatus.AVAILABLE);
        assertThat(order.getTotalAmount()).isEqualByComparingTo(new BigDecimal("20"));
        assertThat(order.getStatus()).isEqualTo(OrderStatus.PLACED);
    }

    /** D-07: adding a productId that was never in the order → 400 PRODUCT_NOT_IN_ORDER, not 409. */
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

        verify(productRepository, never()).lockAllById(any());
        assertThat(order.getStatus()).isEqualTo(OrderStatus.PLACED);
    }

    /**
     * D-07: editing an accepted order sends it back to placed for the Farmer to review again;
     * history records accepted → placed.
     */
    @Test
    void modifyPutsAnAcceptedOrderBackToPlaced() {
        Order order = anOrder(OrderStatus.ACCEPTED, CUTOFF_TOMORROW);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));
        OrderItem itemA = item(PRODUCT_A, 5, TEN);
        when(orderItemRepository.findByOrderId(ORDER_ID)).thenReturn(List.of(itemA));
        Product a = product(PRODUCT_A, 10, ProductStatus.AVAILABLE);
        when(productRepository.lockAllById(any())).thenReturn(List.of(a));
        when(slotRepository.lockById(SLOT_ID)).thenReturn(Optional.of(slotWith(3)));

        service.modifyItems(
                CUSTOMER_ID, ORDER_ID, new ModifyOrderRequest(List.of(new CartLine(PRODUCT_A, 2))));

        assertThat(order.getStatus()).isEqualTo(OrderStatus.PLACED);
        assertThat(history).hasSize(1);
        assertThat(history.getFirst().getFromStatus()).isEqualTo(OrderStatus.ACCEPTED);
        assertThat(history.getFirst().getToStatus()).isEqualTo(OrderStatus.PLACED);
        assertThat(history.getFirst().getNote()).isEqualTo("Customer changed the order.");
    }

    // ---------- modify: extra rules ----------

    /** Not enough stock to raise → 409 OUT_OF_STOCK, the order and stock stay as they were. */
    @Test
    void modifyRaisingQuantityWithInsufficientStockIs409AndLeavesOrderUnchanged() {
        Order order = anOrder(OrderStatus.PLACED, CUTOFF_TOMORROW);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));
        OrderItem itemA = item(PRODUCT_A, 2, TEN);
        when(orderItemRepository.findByOrderId(ORDER_ID)).thenReturn(List.of(itemA));
        Product a = product(PRODUCT_A, 2, ProductStatus.AVAILABLE);
        when(productRepository.lockAllById(any())).thenReturn(List.of(a));
        when(slotRepository.lockById(SLOT_ID)).thenReturn(Optional.of(slotWith(3)));

        assertThatThrownBy(
                        () ->
                                service.modifyItems(
                                        CUSTOMER_ID,
                                        ORDER_ID,
                                        new ModifyOrderRequest(
                                                List.of(new CartLine(PRODUCT_A, 5)))))
                .isInstanceOf(OutOfStockException.class);

        assertThat(a.getStockQuantity()).isEqualTo(2);
        assertThat(itemA.getQuantity()).isEqualTo(2);
        assertThat(order.getStatus()).isEqualTo(OrderStatus.PLACED);
        verify(orderItemRepository, never()).delete(any());
        verify(historyRepository, never()).save(any());
    }

    /**
     * A product the Farmer paused (unavailable) cannot have its quantity raised even though stock
     * shows plenty — only lowering/dropping is always allowed.
     */
    @Test
    void modifyRaisingAnUnavailableProductIs409() {
        Order order = anOrder(OrderStatus.PLACED, CUTOFF_TOMORROW);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));
        OrderItem itemA = item(PRODUCT_A, 2, TEN);
        when(orderItemRepository.findByOrderId(ORDER_ID)).thenReturn(List.of(itemA));
        Product a = product(PRODUCT_A, 50, ProductStatus.UNAVAILABLE);
        when(productRepository.lockAllById(any())).thenReturn(List.of(a));
        when(slotRepository.lockById(SLOT_ID)).thenReturn(Optional.of(slotWith(3)));

        assertThatThrownBy(
                        () ->
                                service.modifyItems(
                                        CUSTOMER_ID,
                                        ORDER_ID,
                                        new ModifyOrderRequest(
                                                List.of(new CartLine(PRODUCT_A, 3)))))
                .isInstanceOf(OutOfStockException.class);

        assertThat(a.getStockQuantity()).isEqualTo(50);
        assertThat(itemA.getQuantity()).isEqualTo(2);
    }

    /**
     * I-3/FR-064 — a product the Farmer set to {@code sold_out} while stock remained (not really
     * sold out) cannot have its quantity raised either: the same "sellable" rule as {@code place}
     * ({@code sellable(p) && stock >= delta}), not only excluding {@code unavailable}.
     */
    @Test
    void modifyRaisingASoldOutProductWithRemainingStockIs409() {
        Order order = anOrder(OrderStatus.PLACED, CUTOFF_TOMORROW);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));
        OrderItem itemA = item(PRODUCT_A, 2, TEN);
        when(orderItemRepository.findByOrderId(ORDER_ID)).thenReturn(List.of(itemA));
        Product a = product(PRODUCT_A, 50, ProductStatus.SOLD_OUT);
        when(productRepository.lockAllById(any())).thenReturn(List.of(a));
        when(slotRepository.lockById(SLOT_ID)).thenReturn(Optional.of(slotWith(3)));

        assertThatThrownBy(
                        () ->
                                service.modifyItems(
                                        CUSTOMER_ID,
                                        ORDER_ID,
                                        new ModifyOrderRequest(
                                                List.of(new CartLine(PRODUCT_A, 5)))))
                .isInstanceOf(OutOfStockException.class);

        assertThat(a.getStockQuantity()).isEqualTo(50);
        assertThat(a.getStatus()).isEqualTo(ProductStatus.SOLD_OUT);
        assertThat(itemA.getQuantity()).isEqualTo(2);
    }

    /**
     * I-3/FR-064 — resending the same old quantity (delta = 0) must not change the product status:
     * that would be a customer action flipping a status the Farmer set — an {@code unavailable}
     * product with stock 0 sent with the same quantity must stay {@code unavailable}, not be
     * switched to {@code sold_out}.
     */
    @Test
    void modifyWithUnchangedQuantityDoesNotFlipAnUnavailableProductsStatus() {
        Order order = anOrder(OrderStatus.PLACED, CUTOFF_TOMORROW);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));
        OrderItem itemA = item(PRODUCT_A, 2, TEN);
        when(orderItemRepository.findByOrderId(ORDER_ID)).thenReturn(List.of(itemA));
        Product a = product(PRODUCT_A, 0, ProductStatus.UNAVAILABLE);
        when(productRepository.lockAllById(any())).thenReturn(List.of(a));
        when(slotRepository.lockById(SLOT_ID)).thenReturn(Optional.of(slotWith(3)));

        service.modifyItems(
                CUSTOMER_ID, ORDER_ID, new ModifyOrderRequest(List.of(new CartLine(PRODUCT_A, 2))));

        assertThat(a.getStockQuantity()).isEqualTo(0);
        assertThat(a.getStatus()).isEqualTo(ProductStatus.UNAVAILABLE);
        assertThat(order.getStatus()).isEqualTo(OrderStatus.PLACED);
    }

    /**
     * @NotEmpty + @Min(1) block "an empty request" or "quantity 0" at the HTTP layer; the defensive
     * "dropping every item = cancelling the order" branch is only reachable by calling the service
     * directly (this test) with a line of quantity 0 that validation never gets to block.
     *
     * <p>{@code orderItemRepository} and {@code productRepository.lockAllById} are faked with state
     * (not a static {@code thenReturn}): this branch calls {@code transition(CANCELLED, ...)} right
     * after deleting every order_items row, and {@code transition} reads order_items again to
     * restore stock — if the mock returned the old list (not reflecting the delete), the products
     * would get their stock back TWICE. A static mock like the other tests in this class would not
     * catch that bug.
     */
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
        Product a = product(PRODUCT_A, 10, ProductStatus.AVAILABLE);
        Map<Long, Product> productsById = Map.of(PRODUCT_A, a);
        when(productRepository.lockAllById(any()))
                .thenAnswer(
                        inv -> {
                            Collection<Long> ids = inv.getArgument(0);
                            return ids.stream()
                                    .map(productsById::get)
                                    .filter(Objects::nonNull)
                                    .collect(Collectors.toList());
                        });
        when(slotRepository.lockById(SLOT_ID)).thenReturn(Optional.of(slotWith(3)));

        service.modifyItems(
                CUSTOMER_ID, ORDER_ID, new ModifyOrderRequest(List.of(new CartLine(PRODUCT_A, 0))));

        assertThat(order.getStatus()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(a.getStockQuantity()).isEqualTo(15);
        assertThat(history).hasSize(1);
        assertThat(history.getFirst().getToStatus()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(history.getFirst().getNote()).isEqualTo("All items removed.");
    }

    /**
     * M-1 — a 0₫ price is valid: an order total of 0 because a free item remains is not "dropping
     * every item", the order must stay {@code placed}, not be cancelled by mistake.
     */
    @Test
    void modifyingToAFreeItemKeepsTheOrderPlacedInsteadOfCancellingIt() {
        Order order = anOrder(OrderStatus.PLACED, CUTOFF_TOMORROW);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));
        OrderItem itemA = item(PRODUCT_A, 2, BigDecimal.ZERO);
        when(orderItemRepository.findByOrderId(ORDER_ID)).thenReturn(List.of(itemA));
        Product a = product(PRODUCT_A, 10, ProductStatus.AVAILABLE);
        when(productRepository.lockAllById(any())).thenReturn(List.of(a));
        when(slotRepository.lockById(SLOT_ID)).thenReturn(Optional.of(slotWith(3)));

        service.modifyItems(
                CUSTOMER_ID, ORDER_ID, new ModifyOrderRequest(List.of(new CartLine(PRODUCT_A, 3))));

        assertThat(order.getStatus()).isEqualTo(OrderStatus.PLACED);
        assertThat(order.getTotalAmount()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(itemA.getQuantity()).isEqualTo(3);
        assertThat(history).isEmpty();
        verify(orderItemRepository, never()).delete(any());
    }

    /** M-1 — the same rule for the {@code accepted} → {@code placed} branch: 0₫ is not a cancel. */
    @Test
    void modifyingAnAcceptedOrderToAFreeItemGoesBackToPlacedInsteadOfCancelling() {
        Order order = anOrder(OrderStatus.ACCEPTED, CUTOFF_TOMORROW);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));
        OrderItem itemA = item(PRODUCT_A, 5, BigDecimal.ZERO);
        when(orderItemRepository.findByOrderId(ORDER_ID)).thenReturn(List.of(itemA));
        Product a = product(PRODUCT_A, 10, ProductStatus.AVAILABLE);
        when(productRepository.lockAllById(any())).thenReturn(List.of(a));
        when(slotRepository.lockById(SLOT_ID)).thenReturn(Optional.of(slotWith(3)));

        service.modifyItems(
                CUSTOMER_ID, ORDER_ID, new ModifyOrderRequest(List.of(new CartLine(PRODUCT_A, 2))));

        assertThat(order.getStatus()).isEqualTo(OrderStatus.PLACED);
        assertThat(order.getTotalAmount()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(history).hasSize(1);
        assertThat(history.getFirst().getFromStatus()).isEqualTo(OrderStatus.ACCEPTED);
        assertThat(history.getFirst().getToStatus()).isEqualTo(OrderStatus.PLACED);
    }

    /**
     * A placed order is still placed after the edit — NO history, since the status did not change.
     */
    @Test
    void modifyOnAPlacedOrderWritesNoHistory() {
        Order order = anOrder(OrderStatus.PLACED, CUTOFF_TOMORROW);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));
        OrderItem itemA = item(PRODUCT_A, 5, TEN);
        when(orderItemRepository.findByOrderId(ORDER_ID)).thenReturn(List.of(itemA));
        Product a = product(PRODUCT_A, 10, ProductStatus.AVAILABLE);
        when(productRepository.lockAllById(any())).thenReturn(List.of(a));
        when(slotRepository.lockById(SLOT_ID)).thenReturn(Optional.of(slotWith(3)));

        service.modifyItems(
                CUSTOMER_ID, ORDER_ID, new ModifyOrderRequest(List.of(new CartLine(PRODUCT_A, 3))));

        assertThat(order.getStatus()).isEqualTo(OrderStatus.PLACED);
        assertThat(history).isEmpty();
        verify(orderRepository).save(order);
        verify(orderRepository).flush();
    }

    /** Past the cutoff → 409 CUTOFF_PASSED, stops before reading order_items. */
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

    /** Wrong status (ready), even before the cutoff → 409 INVALID_TRANSITION, not the cutoff. */
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

    /**
     * The Farmer serving the order cannot edit the customer's order for them — same ownership rule
     * as cancel.
     */
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

    /**
     * C5-2/C5-18: the order is locked first, then the slot (even though booked_count does not
     * change), then the products.
     */
    @Test
    void modifyLocksTheOrderThenTheSlotThenTheProducts() {
        Order order = anOrder(OrderStatus.PLACED, CUTOFF_TOMORROW);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));
        when(orderItemRepository.findByOrderId(ORDER_ID))
                .thenReturn(List.of(item(PRODUCT_A, 5, TEN)));
        when(productRepository.lockAllById(any()))
                .thenReturn(List.of(product(PRODUCT_A, 10, ProductStatus.AVAILABLE)));
        when(slotRepository.lockById(SLOT_ID)).thenReturn(Optional.of(slotWith(3)));

        service.modifyItems(
                CUSTOMER_ID, ORDER_ID, new ModifyOrderRequest(List.of(new CartLine(PRODUCT_A, 2))));

        InOrder locks = inOrder(orderRepository, slotRepository, productRepository);
        locks.verify(orderRepository).lockById(ORDER_ID);
        locks.verify(slotRepository).lockById(SLOT_ID);
        locks.verify(productRepository).lockAllById(any());
    }

    /** FR-041: lowering a quantity gives stock back, which reaches the restock alert. */
    @Test
    void loweringAQuantityReportsTheStockRiseForRestockAlerts() {
        Order order = anOrder(OrderStatus.PLACED, CUTOFF_TOMORROW);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));
        when(orderItemRepository.findByOrderId(ORDER_ID))
                .thenReturn(List.of(item(PRODUCT_A, 5, TEN)));
        Product a = product(PRODUCT_A, 0, ProductStatus.SOLD_OUT);
        when(productRepository.lockAllById(any())).thenReturn(List.of(a));
        when(slotRepository.lockById(SLOT_ID)).thenReturn(Optional.of(slotWith(3)));

        service.modifyItems(
                CUSTOMER_ID, ORDER_ID, new ModifyOrderRequest(List.of(new CartLine(PRODUCT_A, 2))));

        org.mockito.Mockito.verify(restock).afterChange(a, false);
    }
}
