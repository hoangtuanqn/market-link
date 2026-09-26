package com.techx.intervue.modules.order.services.impl;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.notification.enums.NotificationKind;
import com.techx.intervue.modules.notification.services.interfaces.NotificationServiceInterface;
import com.techx.intervue.modules.order.entities.Order;
import com.techx.intervue.modules.order.entities.OrderItem;
import com.techx.intervue.modules.order.enums.OrderStatus;
import com.techx.intervue.modules.order.repositories.CheckoutQueryRepository;
import com.techx.intervue.modules.order.repositories.OrderItemRepository;
import com.techx.intervue.modules.order.repositories.OrderQueryRepository;
import com.techx.intervue.modules.order.repositories.OrderQueryRepository.OrderDetailRow;
import com.techx.intervue.modules.order.repositories.OrderRepository;
import com.techx.intervue.modules.order.repositories.OrderStatusHistoryRepository;
import com.techx.intervue.modules.order.requests.CartLine;
import com.techx.intervue.modules.order.requests.ModifyOrderRequest;
import com.techx.intervue.modules.order.requests.OrderGroupInput;
import com.techx.intervue.modules.order.requests.PlaceOrderRequest;
import com.techx.intervue.modules.order.resources.OrderListItemResource;
import com.techx.intervue.modules.product.entities.Product;
import com.techx.intervue.modules.product.enums.ProductStatus;
import com.techx.intervue.modules.product.repositories.ProductRepository;
import com.techx.intervue.modules.stall.entities.FarmerMarket;
import com.techx.intervue.modules.stall.entities.PickupSlot;
import com.techx.intervue.modules.stall.repositories.FarmerMarketRepository;
import com.techx.intervue.modules.stall.repositories.PickupSlotRepository;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
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

/**
 * Task 5.7 (FR-042, D-11) — 6 test của brief: đặt báo Farmer (không báo khách), nhận/từ
 * chối/sẵn-sàng-lấy báo khách, huỷ báo Farmer, hoàn tất không báo ai (khách đang đứng tại quầy).
 * Repository là mock thuần, giống {@link OrderTransitionTest}; STOMP đẩy realtime kiểm bằng tay
 * (report, mục Manual check), không phải ở đây.
 */
class OrderNotificationTest {

    private static final ZoneId HCM = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final LocalDate PICKUP = LocalDate.of(2026, 9, 29);
    private static final long ORDER_ID = 500L;
    private static final long CUSTOMER_ID = 7L;
    private static final long FARMER_USER_ID = 110L;
    private static final long FARMER_PROFILE_ID = 10L;
    private static final long MARKET_ID = 2L;
    private static final long FARMER_MARKET_ID = 55L;
    private static final long SLOT_ID = 900L;
    private static final long PRODUCT_ID = 1L;

    private UserRepository userRepository;
    private FarmerProfileRepository farmerRepository;
    private FarmerMarketRepository farmerMarketRepository;
    private PickupSlotRepository slotRepository;
    private ProductRepository productRepository;
    private OrderRepository orderRepository;
    private OrderItemRepository orderItemRepository;
    private OrderStatusHistoryRepository historyRepository;
    private OrderQueryRepository orderQueries;
    private NotificationServiceInterface notifications;
    private Clock clock;
    private OrderService service;

    private final List<Order> savedOrders = new ArrayList<>();

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        farmerRepository = mock(FarmerProfileRepository.class);
        farmerMarketRepository = mock(FarmerMarketRepository.class);
        slotRepository = mock(PickupSlotRepository.class);
        productRepository = mock(ProductRepository.class);
        orderRepository = mock(OrderRepository.class);
        orderItemRepository = mock(OrderItemRepository.class);
        historyRepository = mock(OrderStatusHistoryRepository.class);
        orderQueries = mock(OrderQueryRepository.class);
        notifications = mock(NotificationServiceInterface.class);
        clock = Clock.fixed(ZonedDateTime.of(2026, 9, 26, 9, 0, 0, 0, HCM).toInstant(), HCM);
        service =
                new OrderService(
                        userRepository,
                        farmerRepository,
                        farmerMarketRepository,
                        slotRepository,
                        productRepository,
                        orderRepository,
                        orderItemRepository,
                        new OrderStatusHistoryWriter(historyRepository),
                        new OrderCodeGenerator(orderRepository, clock),
                        mock(CheckoutQueryRepository.class),
                        orderQueries,
                        clock,
                        notifications);

        when(historyRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(farmerRepository.findById(FARMER_PROFILE_ID))
                .thenReturn(Optional.of(approvedFarmer()));
        when(farmerRepository.findByUserId(FARMER_USER_ID))
                .thenReturn(Optional.of(approvedFarmer()));
        when(orderQueries.findDetail(ORDER_ID)).thenReturn(Optional.of(aDetailRow()));
        when(orderQueries.items(ORDER_ID)).thenReturn(List.of());
        when(orderQueries.history(ORDER_ID)).thenReturn(List.of());
    }

    // ---------- dữ liệu ----------

    private static FarmerProfile approvedFarmer() {
        return FarmerProfile.builder()
                .id(FARMER_PROFILE_ID)
                .userId(FARMER_USER_ID)
                .stallName("Vườn Út Hiền")
                .orderCutoffHours(2)
                .approvalStatus(ApprovalStatus.APPROVED)
                .build();
    }

    private static Order orderWithStatus(OrderStatus status) {
        Order order = new Order();
        order.setId(ORDER_ID);
        order.setOrderCode("ML-20260926-ABCD");
        order.setCustomerId(CUSTOMER_ID);
        order.setFarmerId(FARMER_PROFILE_ID);
        order.setSlotId(SLOT_ID);
        order.setStatus(status);
        return order;
    }

    private static OrderListItemResource summary() {
        return new OrderListItemResource(
                ORDER_ID,
                "ML-20260926-ABCD",
                "placed",
                FARMER_PROFILE_ID,
                "Vườn Út Hiền",
                MARKET_ID,
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
                CUSTOMER_ID,
                "Khách 7",
                "0900000000",
                "khach7@t.vn",
                FARMER_USER_ID,
                null,
                null);
    }

    private static CartLine line(long productId, int quantity) {
        return new CartLine(productId, quantity);
    }

    private static User customerUser() {
        return User.builder()
                .id(CUSTOMER_ID)
                .fullName("Khách Bảy")
                .email("khach7@t.vn")
                .role(RoleType.CUSTOMER)
                .build();
    }

    // ---------- 6 test của brief (Step 1) ----------

    @Test
    void placingNotifiesTheFarmerNotTheCustomer() {
        when(userRepository.findById(CUSTOMER_ID)).thenReturn(Optional.of(customerUser()));
        FarmerMarket link = new FarmerMarket();
        link.setId(FARMER_MARKET_ID);
        link.setFarmerId(FARMER_PROFILE_ID);
        link.setMarketId(MARKET_ID);
        link.setActive(true);
        PickupSlot slot = new PickupSlot();
        slot.setId(SLOT_ID);
        slot.setFarmerMarketId(FARMER_MARKET_ID);
        slot.setSlotDate(PICKUP);
        slot.setStartTime(LocalTime.of(7, 0));
        slot.setEndTime(LocalTime.of(8, 0));
        slot.setMaxOrders(5);
        slot.setBookedCount(0);
        slot.setActive(true);
        Product product = new Product();
        product.setId(PRODUCT_ID);
        product.setFarmerId(FARMER_PROFILE_ID);
        product.setName("Rau muống");
        product.setPrice(new BigDecimal("12000"));
        product.setUnit("bó");
        product.setStockQuantity(10);
        product.setStatus(ProductStatus.AVAILABLE);
        when(farmerMarketRepository.findById(FARMER_MARKET_ID)).thenReturn(Optional.of(link));
        when(slotRepository.lockById(SLOT_ID)).thenReturn(Optional.of(slot));
        when(productRepository.lockAllById(any())).thenReturn(List.of(product));
        when(orderRepository.save(any()))
                .thenAnswer(
                        inv -> {
                            Order o = inv.getArgument(0);
                            o.setId(ORDER_ID);
                            savedOrders.add(o);
                            return o;
                        });

        service.place(
                CUSTOMER_ID,
                new PlaceOrderRequest(
                        List.of(
                                new OrderGroupInput(
                                        FARMER_PROFILE_ID,
                                        MARKET_ID,
                                        SLOT_ID,
                                        PICKUP,
                                        List.of(line(PRODUCT_ID, 2)),
                                        null))));

        verify(notifications)
                .dispatch(
                        eq(List.of(FARMER_USER_ID)),
                        argThat(
                                e ->
                                        e.kind() == NotificationKind.ORDER_PLACED
                                                && e.link()
                                                        .equals(
                                                                "/farmer/orders/"
                                                                        + savedOrders
                                                                                .getFirst()
                                                                                .getId())
                                                && e.params().get("customer").equals("Khách Bảy")));
        verify(notifications, never()).dispatch(eq(List.of(CUSTOMER_ID)), any());
    }

    @Test
    void acceptNotifiesTheCustomer() {
        Order order = orderWithStatus(OrderStatus.PLACED);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));

        service.accept(FARMER_USER_ID, ORDER_ID);

        verify(notifications)
                .dispatch(
                        eq(List.of(CUSTOMER_ID)),
                        argThat(
                                e ->
                                        e.kind() == NotificationKind.ORDER_ACCEPTED
                                                && e.link().equals("/orders/" + order.getId())
                                                && e.params().get("stall").equals("Vườn Út Hiền")));
    }

    @Test
    void declineNotifiesTheCustomerWithTheReason() {
        Order order = orderWithStatus(OrderStatus.PLACED);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));
        when(orderItemRepository.findByOrderId(ORDER_ID)).thenReturn(List.of());
        when(productRepository.lockAllById(any())).thenReturn(List.of());

        service.decline(FARMER_USER_ID, ORDER_ID, "Hết hàng rồi");

        verify(notifications)
                .dispatch(
                        eq(List.of(CUSTOMER_ID)),
                        argThat(
                                e ->
                                        e.kind() == NotificationKind.ORDER_DECLINED
                                                && e.params()
                                                        .get("reason")
                                                        .equals("Hết hàng rồi")));
    }

    @Test
    void readyNotifiesTheCustomer() {
        Order order = orderWithStatus(OrderStatus.ACCEPTED);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));

        service.markReady(FARMER_USER_ID, ORDER_ID);

        verify(notifications)
                .dispatch(
                        eq(List.of(CUSTOMER_ID)),
                        argThat(e -> e.kind() == NotificationKind.ORDER_READY));
    }

    @Test
    void completeNotifiesNobody() {
        Order order = orderWithStatus(OrderStatus.READY);
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));

        service.complete(FARMER_USER_ID, ORDER_ID);

        verifyNoInteractions(notifications);
    }

    @Test
    void cancelNotifiesTheFarmer() {
        Order order = orderWithStatus(OrderStatus.PLACED);
        order.setCutoffAt(LocalDateTime.of(2026, 9, 29, 1, 0));
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));

        service.cancel(CUSTOMER_ID, ORDER_ID);

        verify(notifications)
                .dispatch(
                        eq(List.of(FARMER_USER_ID)),
                        argThat(
                                e ->
                                        e.kind() == NotificationKind.ORDER_CANCELLED
                                                && e.link()
                                                        .equals(
                                                                "/farmer/orders/"
                                                                        + order.getId())));
    }

    /**
     * M-1 — sửa đơn xuống còn 0 item cũng là huỷ đơn (D-07): Farmer phải nhận {@code
     * order_cancelled} y hệt như khi khách bấm nút huỷ thẳng ({@link #cancelNotifiesTheFarmer}).
     */
    @Test
    void modifyingDownToNoItemsNotifiesTheFarmerLikeCancel() {
        Order order = orderWithStatus(OrderStatus.PLACED);
        order.setCutoffAt(LocalDateTime.of(2026, 9, 29, 1, 0));
        when(orderRepository.lockById(ORDER_ID)).thenReturn(Optional.of(order));
        OrderItem item = new OrderItem();
        item.setOrderId(ORDER_ID);
        item.setProductId(PRODUCT_ID);
        item.setProductName("Rau muống");
        item.setUnitPrice(new BigDecimal("12000"));
        item.setUnit("bó");
        item.setQuantity(2);
        item.setSubtotal(new BigDecimal("24000"));
        when(orderItemRepository.findByOrderId(ORDER_ID)).thenReturn(List.of(item));
        Product product = new Product();
        product.setId(PRODUCT_ID);
        product.setFarmerId(FARMER_PROFILE_ID);
        product.setName("Rau muống");
        product.setPrice(new BigDecimal("12000"));
        product.setUnit("bó");
        product.setStockQuantity(5);
        product.setStatus(ProductStatus.AVAILABLE);
        when(productRepository.lockAllById(any())).thenReturn(List.of(product));

        service.modifyItems(
                CUSTOMER_ID, ORDER_ID, new ModifyOrderRequest(List.of(line(PRODUCT_ID, 0))));

        verify(notifications)
                .dispatch(
                        eq(List.of(FARMER_USER_ID)),
                        argThat(
                                e ->
                                        e.kind() == NotificationKind.ORDER_CANCELLED
                                                && e.link()
                                                        .equals(
                                                                "/farmer/orders/"
                                                                        + order.getId())));
    }
}
