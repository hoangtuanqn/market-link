package com.techx.intervue.modules.order.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.notification.services.interfaces.NotificationServiceInterface;
import com.techx.intervue.modules.order.entities.Order;
import com.techx.intervue.modules.order.entities.OrderItem;
import com.techx.intervue.modules.order.entities.OrderStatusHistory;
import com.techx.intervue.modules.order.enums.OrderStatus;
import com.techx.intervue.modules.order.exceptions.InvalidOrderTransitionException;
import com.techx.intervue.modules.order.exceptions.OrderNotFoundException;
import com.techx.intervue.modules.order.exceptions.OrderNotYoursException;
import com.techx.intervue.modules.order.repositories.CheckoutQueryRepository;
import com.techx.intervue.modules.order.repositories.OrderItemRepository;
import com.techx.intervue.modules.order.repositories.OrderQueryRepository;
import com.techx.intervue.modules.order.repositories.OrderQueryRepository.OrderDetailRow;
import com.techx.intervue.modules.order.repositories.OrderRepository;
import com.techx.intervue.modules.order.repositories.OrderStatusHistoryRepository;
import com.techx.intervue.modules.order.requests.DeclineOrderRequest;
import com.techx.intervue.modules.order.resources.OrderListItemResource;
import com.techx.intervue.modules.product.entities.Product;
import com.techx.intervue.modules.product.enums.ProductStatus;
import com.techx.intervue.modules.product.repositories.ProductRepository;
import com.techx.intervue.modules.stall.entities.PickupSlot;
import com.techx.intervue.modules.stall.repositories.FarmerMarketRepository;
import com.techx.intervue.modules.stall.repositories.PickupSlotRepository;
import com.techx.intervue.modules.user.repositories.UserRepository;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;

/**
 * Task 5.5 (FR-065, 066, 038) — {@code transition(...)} is the single door for the Farmer's order
 * status changes: every change writes history (FR-038), a wrong order of steps is always 409, not
 * 400 (D-04), and a dead order (declined/cancelled) restores stock + frees the slot spot exactly
 * once (D-02). The repository is a plain mock; the real lock (PESSIMISTIC_WRITE) is proven by a
 * manual check (curl + mysql) after seeding, not here.
 */
class OrderTransitionTest {

    private static final ZoneId HCM = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final long ORDER_ID = 500L;
    private static final long FARMER_USER_ID = 40L;
    private static final long OTHER_FARMER_USER_ID = 41L;
    private static final long FARMER_PROFILE_ID = 10L;
    private static final long OTHER_FARMER_PROFILE_ID = 11L;
    private static final long SLOT_ID = 900L;
    private static final long PRODUCT_A = 1L;
    private static final long PRODUCT_B = 2L;

    private static ValidatorFactory validatorFactory;
    private static Validator validator;

    @BeforeAll
    static void startValidator() {
        validatorFactory = Validation.buildDefaultValidatorFactory();
        validator = validatorFactory.getValidator();
    }

    @AfterAll
    static void closeValidator() {
        validatorFactory.close();
    }

    private FarmerProfileRepository farmerRepository;
    private PickupSlotRepository slotRepository;
    private ProductRepository productRepository;
    private OrderRepository orderRepository;
    private OrderItemRepository orderItemRepository;
    private OrderStatusHistoryRepository historyRepository;
    private OrderQueryRepository orderQueries;
    private Clock clock;
    private OrderService service;

    private final List<OrderStatusHistory> history = new ArrayList<>();

    @BeforeEach
    void setUp() {
        farmerRepository = mock(FarmerProfileRepository.class);
        slotRepository = mock(PickupSlotRepository.class);
        productRepository = mock(ProductRepository.class);
        orderRepository = mock(OrderRepository.class);
        orderItemRepository = mock(OrderItemRepository.class);
        historyRepository = mock(OrderStatusHistoryRepository.class);
        orderQueries = mock(OrderQueryRepository.class);
        clock = Clock.fixed(ZonedDateTime.of(2026, 9, 26, 9, 0, 0, 0, HCM).toInstant(), HCM);
        service =
                new OrderService(
                        mock(UserRepository.class),
                        farmerRepository,
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
                        mock(NotificationServiceInterface.class));

        when(historyRepository.save(any()))
                .thenAnswer(
                        inv -> {
                            history.add(inv.getArgument(0));
                            return inv.getArgument(0);
                        });
        when(farmerRepository.findByUserId(FARMER_USER_ID))
                .thenReturn(Optional.of(approvedFarmer()));
        // The four public methods build the response by calling detail() again; mock enough not to
        // throw.
        when(orderQueries.findDetail(ORDER_ID)).thenReturn(Optional.of(aDetailRow()));
        when(orderQueries.items(ORDER_ID)).thenReturn(List.of());
        when(orderQueries.history(ORDER_ID)).thenReturn(List.of());
    }

    // ---------- data ----------

    private static FarmerProfile approvedFarmer() {
        return FarmerProfile.builder()
                .id(FARMER_PROFILE_ID)
                .userId(FARMER_USER_ID)
                .stallName("Vườn Út Hiền")
                .approvalStatus(ApprovalStatus.APPROVED)
                .build();
    }

    private static Order orderWithStatus(OrderStatus status) {
        Order order = new Order();
        order.setId(ORDER_ID);
        order.setOrderCode("ML-20260926-ABCD");
        order.setCustomerId(7L);
        order.setFarmerId(FARMER_PROFILE_ID);
        order.setSlotId(SLOT_ID);
        order.setStatus(status);
        return order;
    }

    private static OrderItem item(long productId, int quantity) {
        OrderItem i = new OrderItem();
        i.setOrderId(ORDER_ID);
        i.setProductId(productId);
        i.setQuantity(quantity);
        return i;
    }

    private static Product product(long id, int stock, ProductStatus status) {
        Product p = new Product();
        p.setId(id);
        p.setFarmerId(FARMER_PROFILE_ID);
        p.setName("Sản phẩm " + id);
        p.setPrice(BigDecimal.TEN);
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
                LocalDateTime.of(2026, 9, 29, 1, 0),
                7L,
                "Khách 7",
                "0900000000",
                "khach7@t.vn",
                FARMER_USER_ID,
                null,
                null);
    }

    private static Set<String> invalidFields(DeclineOrderRequest request) {
        return validator.validate(request).stream()
                .map(ConstraintViolation::getPropertyPath)
                .map(Object::toString)
                .collect(Collectors.toSet());
    }

    // ---------- the brief's 9 tests ----------

    @Test
    void acceptMovesPlacedToAccepted() {
        Order order = orderWithStatus(OrderStatus.PLACED);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));

        service.accept(FARMER_USER_ID, ORDER_ID);

        assertThat(order.getStatus()).isEqualTo(OrderStatus.ACCEPTED);
        assertThat(history).hasSize(1);
        OrderStatusHistory row = history.getFirst();
        assertThat(row.getOrderId()).isEqualTo(ORDER_ID);
        assertThat(row.getFromStatus()).isEqualTo(OrderStatus.PLACED);
        assertThat(row.getToStatus()).isEqualTo(OrderStatus.ACCEPTED);
        assertThat(row.getChangedBy()).isEqualTo(FARMER_USER_ID);
    }

    @Test
    void acceptOnAnAlreadyAcceptedOrderIs409() {
        Order order = orderWithStatus(OrderStatus.ACCEPTED);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> service.accept(FARMER_USER_ID, ORDER_ID))
                .isInstanceOf(InvalidOrderTransitionException.class);
        assertThat(history).isEmpty();
        assertThat(order.getStatus()).isEqualTo(OrderStatus.ACCEPTED);
    }

    @Test
    void declineRestoresStock() {
        Order order = orderWithStatus(OrderStatus.PLACED);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));
        Product a = product(PRODUCT_A, 5, ProductStatus.AVAILABLE);
        Product b = product(PRODUCT_B, 0, ProductStatus.SOLD_OUT);
        when(orderItemRepository.findByOrderId(ORDER_ID))
                .thenReturn(List.of(item(PRODUCT_A, 2), item(PRODUCT_B, 1)));
        when(productRepository.lockAllById(any())).thenReturn(List.of(a, b));
        PickupSlot slot = slotWith(3);
        when(slotRepository.lockById(SLOT_ID)).thenReturn(Optional.of(slot));

        service.decline(FARMER_USER_ID, ORDER_ID, "Hết hàng rồi");

        assertThat(a.getStockQuantity()).isEqualTo(7);
        assertThat(b.getStockQuantity()).isEqualTo(1);
        assertThat(b.getStatus()).isEqualTo(ProductStatus.AVAILABLE);
        assertThat(slot.getBookedCount()).isEqualTo(2);
    }

    /**
     * The rule lives on {@link DeclineOrderRequest} ({@code @NotBlank}), enforced in the controller
     * through {@code @Valid} — OrderService#decline itself does not check for an empty reason.
     * Tests the layer where the rule lives, not through the service (stated as the report asked).
     */
    @Test
    void declineRequiresAReason() {
        assertThat(invalidFields(new DeclineOrderRequest(""))).contains("reason");
        assertThat(invalidFields(new DeclineOrderRequest("   "))).contains("reason");
        assertThat(invalidFields(new DeclineOrderRequest(null))).contains("reason");
        assertThat(invalidFields(new DeclineOrderRequest("Hết hàng"))).isEmpty();
    }

    @Test
    void declineStoresTheReasonInFarmerNote() {
        Order order = orderWithStatus(OrderStatus.PLACED);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));
        when(orderItemRepository.findByOrderId(ORDER_ID)).thenReturn(List.of());
        when(productRepository.lockAllById(any())).thenReturn(List.of());
        when(slotRepository.lockById(SLOT_ID)).thenReturn(Optional.empty());

        service.decline(FARMER_USER_ID, ORDER_ID, "Vườn mất mùa");

        assertThat(order.getFarmerNote()).isEqualTo("Vườn mất mùa");
        assertThat(history.getFirst().getNote()).isEqualTo("Vườn mất mùa");
    }

    @Test
    void readyThenCompleteWalksTheHappyPath() {
        Order order = orderWithStatus(OrderStatus.PLACED);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));

        service.accept(FARMER_USER_ID, ORDER_ID);
        assertThatCode(() -> service.markReady(FARMER_USER_ID, ORDER_ID))
                .doesNotThrowAnyException();
        assertThatCode(() -> service.complete(FARMER_USER_ID, ORDER_ID)).doesNotThrowAnyException();

        assertThat(order.getStatus()).isEqualTo(OrderStatus.COMPLETED);
        assertThat(history).hasSize(3);
        assertThat(history)
                .extracting(OrderStatusHistory::getToStatus)
                .containsExactly(OrderStatus.ACCEPTED, OrderStatus.READY, OrderStatus.COMPLETED);
    }

    @Test
    void completeDoesNotRestoreStock() {
        Order order = orderWithStatus(OrderStatus.READY);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));

        service.complete(FARMER_USER_ID, ORDER_ID);

        assertThat(order.getStatus()).isEqualTo(OrderStatus.COMPLETED);
        verify(productRepository, never()).lockAllById(any());
        verify(slotRepository, never()).lockById(any());
    }

    @Test
    void anotherFarmerCannotAcceptThisOrder() {
        Order order = orderWithStatus(OrderStatus.PLACED);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));
        when(farmerRepository.findByUserId(OTHER_FARMER_USER_ID))
                .thenReturn(
                        Optional.of(
                                FarmerProfile.builder()
                                        .id(OTHER_FARMER_PROFILE_ID)
                                        .userId(OTHER_FARMER_USER_ID)
                                        .approvalStatus(ApprovalStatus.APPROVED)
                                        .build()));

        assertThatThrownBy(() -> service.accept(OTHER_FARMER_USER_ID, ORDER_ID))
                .isInstanceOf(OrderNotYoursException.class);
        assertThat(order.getStatus()).isEqualTo(OrderStatus.PLACED);
        assertThat(history).isEmpty();
    }

    @Test
    void declineAlsoReleasesTheSlotOnlyOnce() {
        Order order = orderWithStatus(OrderStatus.PLACED);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));
        when(orderItemRepository.findByOrderId(ORDER_ID)).thenReturn(List.of(item(PRODUCT_A, 2)));
        Product a = product(PRODUCT_A, 5, ProductStatus.AVAILABLE);
        when(productRepository.lockAllById(any())).thenReturn(List.of(a));
        PickupSlot slot = slotWith(3);
        when(slotRepository.lockById(SLOT_ID)).thenReturn(Optional.of(slot));

        service.decline(FARMER_USER_ID, ORDER_ID, "Hết rau");
        assertThat(slot.getBookedCount()).isEqualTo(2);

        assertThatThrownBy(() -> service.decline(FARMER_USER_ID, ORDER_ID, "Lại nữa"))
                .isInstanceOf(InvalidOrderTransitionException.class);
        assertThat(slot.getBookedCount()).isEqualTo(2);
        assertThat(a.getStockQuantity()).isEqualTo(7);
    }

    /**
     * Review focus #5 / D-09 — "Running orders still run to the end so the customer does not lose
     * what they ordered." Suspension hides products and blocks new orders; it must NOT lock orders
     * in progress.
     */
    @Test
    void aSuspendedFarmerCanStillFinishOrdersPlacedBeforeTheSuspension() {
        FarmerProfile farmer = approvedFarmer();
        farmer.setApprovalStatus(ApprovalStatus.SUSPENDED);
        when(farmerRepository.findByUserId(FARMER_USER_ID)).thenReturn(Optional.of(farmer));
        when(orderRepository.lockById(ORDER_ID))
                .thenReturn(Optional.of(orderWithStatus(OrderStatus.ACCEPTED)));

        assertThatCode(() -> service.markReady(FARMER_USER_ID, ORDER_ID))
                .doesNotThrowAnyException();
    }

    // ---------- extra rules beyond the brief's table ----------

    /** An order id that does not exist → 404, not 403 (unlike a wrong owner). */
    @Test
    void unknownOrderIs404() {
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.accept(FARMER_USER_ID, ORDER_ID))
                .isInstanceOf(OrderNotFoundException.class);
    }

    /** A FARMER-role account without farmer_profiles → fail-closed 403, no NPE. */
    @Test
    void aUserWithNoFarmerProfileCannotAccept() {
        Order order = orderWithStatus(OrderStatus.PLACED);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));
        when(farmerRepository.findByUserId(FARMER_USER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.accept(FARMER_USER_ID, ORDER_ID))
                .isInstanceOf(OrderNotYoursException.class);
    }

    /**
     * C5-2: the order is locked first, then the slot, then the products — not the original draft's
     * reverse order.
     */
    @Test
    void locksTheOrderThenTheSlotThenTheProducts() {
        Order order = orderWithStatus(OrderStatus.PLACED);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));
        when(orderItemRepository.findByOrderId(ORDER_ID)).thenReturn(List.of(item(PRODUCT_A, 1)));
        when(productRepository.lockAllById(any()))
                .thenReturn(List.of(product(PRODUCT_A, 5, ProductStatus.AVAILABLE)));
        when(slotRepository.lockById(SLOT_ID)).thenReturn(Optional.of(slotWith(3)));

        service.decline(FARMER_USER_ID, ORDER_ID, "reason");

        InOrder locks = inOrder(orderRepository, slotRepository, productRepository);
        locks.verify(orderRepository).lockById(ORDER_ID);
        locks.verify(slotRepository).lockById(SLOT_ID);
        locks.verify(productRepository).lockAllById(any());
    }

    /**
     * An unavailable product does not switch back to available on its own when stock is restored.
     */
    @Test
    void declineLeavesAnUnavailableProductUnavailable() {
        Order order = orderWithStatus(OrderStatus.PLACED);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));
        Product unavailable = product(PRODUCT_A, 0, ProductStatus.UNAVAILABLE);
        when(orderItemRepository.findByOrderId(ORDER_ID)).thenReturn(List.of(item(PRODUCT_A, 3)));
        when(productRepository.lockAllById(any())).thenReturn(List.of(unavailable));
        when(slotRepository.lockById(SLOT_ID)).thenReturn(Optional.empty());

        service.decline(FARMER_USER_ID, ORDER_ID, "reason");

        assertThat(unavailable.getStockQuantity()).isEqualTo(3);
        assertThat(unavailable.getStatus()).isEqualTo(ProductStatus.UNAVAILABLE);
    }

    /**
     * I-3/FR-064 — a product the Farmer set to {@code sold_out} while stock remained (not really
     * sold out): restoring stock on cancel/decline must not switch it back to {@code available} on
     * its own. Only a stock of exactly 0 before restoring (sold out because it ran out) switches
     * back — see {@link #declineRestoresStock()}.
     */
    @Test
    void declineDoesNotReactivateASoldOutProductThatStillHadStock() {
        Order order = orderWithStatus(OrderStatus.PLACED);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));
        Product a = product(PRODUCT_A, 5, ProductStatus.SOLD_OUT);
        when(orderItemRepository.findByOrderId(ORDER_ID)).thenReturn(List.of(item(PRODUCT_A, 2)));
        when(productRepository.lockAllById(any())).thenReturn(List.of(a));
        PickupSlot slot = slotWith(3);
        when(slotRepository.lockById(SLOT_ID)).thenReturn(Optional.of(slot));

        service.decline(FARMER_USER_ID, ORDER_ID, "reason");

        assertThat(a.getStockQuantity()).isEqualTo(7);
        assertThat(a.getStatus()).isEqualTo(ProductStatus.SOLD_OUT);
        assertThat(slot.getBookedCount()).isEqualTo(2);
    }

    /**
     * Controller ruling — a soft-deleted product ({@code is_deleted}) still has a real row in the
     * products table, so it still gets its stock back when an order dies: the old order_items
     * pointing to it stay valid even though the Farmer took it off the shelf.
     */
    @Test
    void declineRestoresStockOfASoftDeletedProduct() {
        Order order = orderWithStatus(OrderStatus.PLACED);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));
        Product deleted = product(PRODUCT_A, 5, ProductStatus.AVAILABLE);
        deleted.setDeleted(true);
        when(orderItemRepository.findByOrderId(ORDER_ID)).thenReturn(List.of(item(PRODUCT_A, 4)));
        when(productRepository.lockAllById(any())).thenReturn(List.of(deleted));
        PickupSlot slot = slotWith(3);
        when(slotRepository.lockById(SLOT_ID)).thenReturn(Optional.of(slot));

        service.decline(FARMER_USER_ID, ORDER_ID, "reason");

        assertThat(deleted.getStockQuantity()).isEqualTo(9);
        assertThat(deleted.isDeleted()).isTrue();
        assertThat(slot.getBookedCount()).isEqualTo(2);
    }

    // ---------- FR-039 auto-complete (the job calls this once per due order) ----------

    /** D-03: the system completes a ready order — history row with no actor and the fixed note. */
    @Test
    void autoCompleteMovesAReadyOrderToCompletedWithoutAnActor() {
        Order order = orderWithStatus(OrderStatus.READY);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));

        assertThat(service.autoComplete(ORDER_ID)).isTrue();

        assertThat(order.getStatus()).isEqualTo(OrderStatus.COMPLETED);
        assertThat(history).hasSize(1);
        assertThat(history.get(0).getChangedBy()).isNull();
        assertThat(history.get(0).getNote()).isEqualTo("Auto-completed after pickup.");
    }

    /**
     * The row is re-read under the lock: an order that stopped being ready meanwhile is left alone.
     */
    @Test
    void autoCompleteSkipsAnOrderThatIsNoLongerReady() {
        Order order = orderWithStatus(OrderStatus.COMPLETED);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));

        assertThat(service.autoComplete(ORDER_ID)).isFalse();

        assertThat(order.getStatus()).isEqualTo(OrderStatus.COMPLETED);
        assertThat(history).isEmpty();
    }
}
