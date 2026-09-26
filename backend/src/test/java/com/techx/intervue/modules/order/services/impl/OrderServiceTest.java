package com.techx.intervue.modules.order.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.order.entities.Order;
import com.techx.intervue.modules.order.entities.OrderItem;
import com.techx.intervue.modules.order.entities.OrderStatusHistory;
import com.techx.intervue.modules.order.enums.OrderStatus;
import com.techx.intervue.modules.order.exceptions.CutoffPassedException;
import com.techx.intervue.modules.order.exceptions.OutOfStockException;
import com.techx.intervue.modules.order.exceptions.SlotFullException;
import com.techx.intervue.modules.order.exceptions.SlotNotAvailableException;
import com.techx.intervue.modules.order.exceptions.StallUnavailableException;
import com.techx.intervue.modules.order.repositories.CheckoutQueryRepository;
import com.techx.intervue.modules.order.repositories.OrderItemRepository;
import com.techx.intervue.modules.order.repositories.OrderRepository;
import com.techx.intervue.modules.order.repositories.OrderStatusHistoryRepository;
import com.techx.intervue.modules.order.requests.CartLine;
import com.techx.intervue.modules.order.requests.OrderGroupInput;
import com.techx.intervue.modules.order.requests.PlaceOrderRequest;
import com.techx.intervue.modules.order.requests.PreviewRequest;
import com.techx.intervue.modules.order.resources.OrderGroupPreviewResource;
import com.techx.intervue.modules.order.resources.OrderGroupPreviewResource.MarketOption;
import com.techx.intervue.modules.order.resources.PlacedOrderResource;
import com.techx.intervue.modules.order.resources.PreviewItemResource;
import com.techx.intervue.modules.product.entities.Product;
import com.techx.intervue.modules.product.entities.ProductDailyStock;
import com.techx.intervue.modules.product.enums.ProductStatus;
import com.techx.intervue.modules.product.repositories.ProductDailyStockRepository;
import com.techx.intervue.modules.product.repositories.ProductRepository;
import com.techx.intervue.modules.product.services.impl.ProductAvailabilityResolver;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.StreamSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.annotation.Transactional;

/**
 * FR-030…032 — preview and place an order. Today (by Clock) is Saturday 26/09/2026, 09:00 Vietnam
 * time; the default pickup day is Tuesday 29/09. The repository is a fake in-memory table: real
 * locking and rollback are proven in PlaceOrderConcurrencyTest.
 */
class OrderServiceTest {

    private static final ZoneId HCM = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final LocalDate TODAY = LocalDate.of(2026, 9, 26);
    private static final LocalDate PICKUP = LocalDate.of(2026, 9, 29);

    private static final long CUSTOMER_ID = 7L;
    private static final long ADMIN_ID = 1L;
    private static final long FARMER_A = 10L;
    private static final long FARMER_B = 20L;
    private static final long MARKET_ID = 2L;
    private static final long OTHER_MARKET_ID = 3L;
    private static final long FM_A = 55L;
    private static final long FM_B = 66L;
    private static final long SLOT_A = 900L;
    private static final long SLOT_B = 901L;
    private static final long RAU_MUONG = 1L;
    private static final long CAI_NGOT = 2L;
    private static final long BANH_CHUOI = 30L;

    private UserRepository userRepository;
    private FarmerProfileRepository farmerRepository;
    private FarmerMarketRepository farmerMarketRepository;
    private PickupSlotRepository slotRepository;
    private ProductRepository productRepository;
    private OrderRepository orderRepository;
    private OrderItemRepository orderItemRepository;
    private OrderStatusHistoryRepository historyRepository;
    private CheckoutQueryRepository checkoutQueries;
    private Clock clock;
    private ProductDailyStockRepository dailyStockRepository;
    private ProductAvailabilityResolver availability;
    private OrderService service;

    /** Fake tables. */
    private final Map<Long, FarmerProfile> farmers = new HashMap<>();

    private final Map<Long, FarmerMarket> links = new HashMap<>();
    private final Map<Long, PickupSlot> slots = new HashMap<>();
    private final Map<Long, Product> products = new HashMap<>();
    private final Map<String, ProductDailyStock> dailyStock = new HashMap<>();
    private final List<Order> orders = new ArrayList<>();
    private final List<OrderItem> items = new ArrayList<>();
    private final List<OrderStatusHistory> history = new ArrayList<>();

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
        checkoutQueries = mock(CheckoutQueryRepository.class);
        dailyStockRepository = mock(ProductDailyStockRepository.class);
        availability = mock(ProductAvailabilityResolver.class);
        clock = Clock.fixed(ZonedDateTime.of(TODAY, LocalTime.of(9, 0), HCM).toInstant(), HCM);
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
                        checkoutQueries,
                        clock,
                        dailyStockRepository,
                        availability);

        when(userRepository.findById(CUSTOMER_ID))
                .thenReturn(Optional.of(user(CUSTOMER_ID, RoleType.CUSTOMER)));

        farmer(FARMER_A, "Vườn Út Hiền", 12);
        farmer(FARMER_B, "Lò bánh Tuấn Anh", 12);
        link(FM_A, FARMER_A, MARKET_ID, true);
        link(FM_B, FARMER_B, MARKET_ID, true);
        slot(SLOT_A, FM_A, PICKUP, LocalTime.of(7, 0), 5, 0);
        slot(SLOT_B, FM_B, PICKUP, LocalTime.of(7, 0), 5, 0);
        product(RAU_MUONG, FARMER_A, "Rau muống", "12000", 40);
        product(CAI_NGOT, FARMER_A, "Cải ngọt", "15000", 30);
        product(BANH_CHUOI, FARMER_B, "Bánh chuối nướng", "35000", 15);
        dailyStock(RAU_MUONG, PICKUP, 40, "12000");
        dailyStock(CAI_NGOT, PICKUP, 30, "15000");
        dailyStock(BANH_CHUOI, PICKUP, 15, "35000");

        when(farmerRepository.findById(any()))
                .thenAnswer(inv -> Optional.ofNullable(farmers.get(inv.<Long>getArgument(0))));
        when(farmerRepository.findAllById(any()))
                .thenAnswer(inv -> rows(farmers, inv.getArgument(0)));
        when(farmerMarketRepository.findById(any()))
                .thenAnswer(inv -> Optional.ofNullable(links.get(inv.<Long>getArgument(0))));
        when(slotRepository.lockById(any()))
                .thenAnswer(inv -> Optional.ofNullable(slots.get(inv.<Long>getArgument(0))));
        when(productRepository.findAllById(any()))
                .thenAnswer(inv -> rows(products, inv.getArgument(0)));
        when(dailyStockRepository.materialize(any(), any(), anyInt()))
                .thenAnswer(
                        inv -> {
                            Long productId = inv.getArgument(0);
                            LocalDate date = inv.getArgument(1);
                            String key = productId + "@" + date;
                            if (dailyStock.containsKey(key)) {
                                return 0;
                            }
                            Product p = products.get(productId);
                            if (p == null) {
                                return 0;
                            }
                            ProductDailyStock row = new ProductDailyStock();
                            row.setId(5000L + dailyStock.size());
                            row.setProductId(productId);
                            row.setStockDate(date);
                            row.setQuantityAvailable(p.getStockQuantity());
                            row.setUnitPrice(p.getPrice());
                            dailyStock.put(key, row);
                            return 1;
                        });
        when(dailyStockRepository.findByProductIdAndStockDate(any(), any()))
                .thenAnswer(
                        inv ->
                                Optional.ofNullable(
                                        dailyStock.get(
                                                inv.<Long>getArgument(0)
                                                        + "@"
                                                        + inv.<LocalDate>getArgument(1))));
        when(dailyStockRepository.lockByProductIdAndStockDate(any(), any()))
                .thenAnswer(
                        inv ->
                                Optional.ofNullable(
                                        dailyStock.get(
                                                inv.<Long>getArgument(0)
                                                        + "@"
                                                        + inv.<LocalDate>getArgument(1))));
        // Passes each product's live stock/price straight through, so tests that don't care about
        // availability keep their existing PICKUP-dated expectations unchanged.
        when(availability.resolve(any()))
                .thenAnswer(
                        inv -> {
                            Map<Long, BigDecimal> in = inv.getArgument(0);
                            Map<Long, ProductAvailabilityResolver.Availability> out =
                                    new HashMap<>();
                            in.keySet()
                                    .forEach(
                                            id -> {
                                                Product p = products.get(id);
                                                if (p != null) {
                                                    out.put(
                                                            id,
                                                            new ProductAvailabilityResolver
                                                                    .Availability(
                                                                    PICKUP,
                                                                    p.getStockQuantity(),
                                                                    p.getPrice()));
                                                }
                                            });
                            return out;
                        });
        when(orderRepository.save(any()))
                .thenAnswer(
                        inv -> {
                            Order o = inv.getArgument(0);
                            o.setId(1000L + orders.size());
                            orders.add(o);
                            return o;
                        });
        when(orderItemRepository.saveAll(any()))
                .thenAnswer(
                        inv -> {
                            Iterable<OrderItem> rows = inv.getArgument(0);
                            List<OrderItem> saved = new ArrayList<>();
                            rows.forEach(saved::add);
                            items.addAll(saved);
                            return saved;
                        });
        when(historyRepository.save(any()))
                .thenAnswer(
                        inv -> {
                            history.add(inv.getArgument(0));
                            return inv.getArgument(0);
                        });
        when(checkoutQueries.marketsOf(any()))
                .thenReturn(
                        Map.of(
                                FARMER_A,
                                List.of(new MarketOption(MARKET_ID, "Chợ Bà Chiểu")),
                                FARMER_B,
                                List.of(
                                        new MarketOption(MARKET_ID, "Chợ Bà Chiểu"),
                                        new MarketOption(OTHER_MARKET_ID, "Chợ Bến Thành"))));
    }

    // ---------- data ----------

    /** Like the database: only returns real rows, ascending by id. */
    private static <T> List<T> rows(Map<Long, T> table, Iterable<Long> ids) {
        return StreamSupport.stream(ids.spliterator(), false)
                .distinct()
                .sorted()
                .map(table::get)
                .filter(Objects::nonNull)
                .toList();
    }

    private static User user(long id, RoleType role) {
        return User.builder().id(id).fullName("User " + id).email(id + "@t.vn").role(role).build();
    }

    private static User adminUser() {
        return user(ADMIN_ID, RoleType.ADMIN);
    }

    private FarmerProfile farmer(long id, String stallName, int cutoffHours) {
        FarmerProfile f =
                FarmerProfile.builder()
                        .id(id)
                        .userId(100 + id)
                        .stallName(stallName)
                        .contactPerson("Chủ " + stallName)
                        .orderCutoffHours(cutoffHours)
                        .approvalStatus(ApprovalStatus.APPROVED)
                        .build();
        farmers.put(id, f);
        return f;
    }

    private FarmerMarket link(long id, long farmerId, long marketId, boolean active) {
        FarmerMarket fm = new FarmerMarket();
        fm.setId(id);
        fm.setFarmerId(farmerId);
        fm.setMarketId(marketId);
        fm.setActive(active);
        links.put(id, fm);
        return fm;
    }

    private PickupSlot slot(
            long id, long farmerMarketId, LocalDate date, LocalTime start, int max, int booked) {
        PickupSlot s = new PickupSlot();
        s.setId(id);
        s.setFarmerMarketId(farmerMarketId);
        s.setSlotDate(date);
        s.setStartTime(start);
        s.setEndTime(start.plusHours(1));
        s.setMaxOrders(max);
        s.setBookedCount(booked);
        s.setActive(true);
        slots.put(id, s);
        return s;
    }

    private Product product(long id, long farmerId, String name, String price, int stock) {
        Product p = new Product();
        p.setId(id);
        p.setFarmerId(farmerId);
        p.setCategoryId(1L);
        p.setName(name);
        p.setPrice(new BigDecimal(price));
        p.setUnit("bó");
        p.setStockQuantity(stock);
        p.setStatus(ProductStatus.AVAILABLE);
        products.put(id, p);
        return p;
    }

    private void dailyStock(long productId, LocalDate date, int quantity, String price) {
        ProductDailyStock row = new ProductDailyStock();
        row.setId(4000L + dailyStock.size());
        row.setProductId(productId);
        row.setStockDate(date);
        row.setQuantityAvailable(quantity);
        row.setUnitPrice(new BigDecimal(price));
        dailyStock.put(productId + "@" + date, row);
    }

    private static CartLine line(long productId, int quantity) {
        return new CartLine(productId, quantity);
    }

    private static PreviewRequest cart(CartLine... lines) {
        return new PreviewRequest(List.of(lines));
    }

    private static OrderGroupInput group(long farmerId, long slotId, CartLine... lines) {
        return new OrderGroupInput(farmerId, MARKET_ID, slotId, PICKUP, List.of(lines), null);
    }

    private static PlaceOrderRequest request(OrderGroupInput... groups) {
        return new PlaceOrderRequest(List.of(groups));
    }

    private static PlaceOrderRequest aValidRequest() {
        return request(group(FARMER_A, SLOT_A, line(RAU_MUONG, 2)));
    }

    private static OrderGroupPreviewResource groupOf(
            List<OrderGroupPreviewResource> groups, long farmerId) {
        return groups.stream().filter(g -> g.farmerId() == farmerId).findFirst().orElseThrow();
    }

    // ---------- preview ----------

    /** D-01: one cart, two Farmers → two orders are split out, each with its own total. */
    @Test
    void previewSplitsCartByFarmer() {
        List<OrderGroupPreviewResource> groups =
                service.preview(
                        CUSTOMER_ID,
                        cart(line(RAU_MUONG, 2), line(BANH_CHUOI, 1), line(CAI_NGOT, 1)));

        assertThat(groups)
                .extracting(OrderGroupPreviewResource::farmerId)
                .containsExactly(FARMER_A, FARMER_B);
        OrderGroupPreviewResource a = groupOf(groups, FARMER_A);
        assertThat(a.stallName()).isEqualTo("Vườn Út Hiền");
        assertThat(a.items()).hasSize(2);
        assertThat(a.subtotal()).isEqualByComparingTo("39000");
        assertThat(a.problems()).isEmpty();
        assertThat(groupOf(groups, FARMER_B).subtotal()).isEqualByComparingTo("35000");
        // read-only: no locking, no writing
        verify(productRepository, never()).lockAllById(any());
        verify(slotRepository, never()).lockById(any());
        verify(orderRepository, never()).save(any());
    }

    /** A preview must be able to show it: missing stock is a group's problem, not an exception. */
    @Test
    void previewFlagsItemsOverStock() {
        List<OrderGroupPreviewResource> groups =
                service.preview(CUSTOMER_ID, cart(line(RAU_MUONG, 1), line(BANH_CHUOI, 16)));

        assertThat(groupOf(groups, FARMER_B).problems()).containsExactly("out_of_stock");
        assertThat(groupOf(groups, FARMER_A).problems()).isEmpty();
        assertThat(groupOf(groups, FARMER_B).items().getFirst().stockQuantity()).isEqualTo(15);
    }

    /**
     * The price a customer previews must be the same price they'll actually be charged at order
     * time — the resolved availability price for the nearest date, not the product's base price. A
     * weekly stock template can charge more or less than the base price on a given weekday.
     */
    @Test
    void previewShowsThePriceForTheResolvedDateNotTheProductsBasePrice() {
        // doReturn, not when(...).thenReturn(...): the setUp() stub is an answer that runs on
        // invocation, including the recording call inside when(...) itself, which would NPE on a
        // null argument there.
        doReturn(
                        Map.of(
                                RAU_MUONG,
                                new ProductAvailabilityResolver.Availability(
                                        PICKUP, 40, new BigDecimal("13000"))))
                .when(availability)
                .resolve(any());

        List<OrderGroupPreviewResource> groups =
                service.preview(CUSTOMER_ID, cart(line(RAU_MUONG, 2)));

        PreviewItemResource item = groupOf(groups, FARMER_A).items().getFirst();
        assertThat(item.unitPrice()).isEqualByComparingTo("13000");
        assertThat(item.subtotal()).isEqualByComparingTo("26000");
        assertThat(groupOf(groups, FARMER_A).subtotal()).isEqualByComparingTo("26000");
    }

    @Test
    void previewFlagsSoldOutProducts() {
        products.get(BANH_CHUOI).setStatus(ProductStatus.SOLD_OUT);
        products.get(BANH_CHUOI).setStockQuantity(0);

        List<OrderGroupPreviewResource> groups =
                service.preview(CUSTOMER_ID, cart(line(BANH_CHUOI, 1)));

        assertThat(groups.getFirst().problems()).containsExactly("sold_out");
        assertThat(groups.getFirst().items().getFirst().status()).isEqualTo("sold_out");
    }

    /**
     * C5-12: soft-deleted / hidden / unavailable still stays in the stall's group, as problem
     * `unavailable`.
     */
    @Test
    void previewFlagsHiddenDeletedOrUnavailableProductsAsUnavailable() {
        products.get(RAU_MUONG).setHidden(true);
        products.get(CAI_NGOT).setDeleted(true);
        products.get(BANH_CHUOI).setStatus(ProductStatus.UNAVAILABLE);

        List<OrderGroupPreviewResource> groups =
                service.preview(
                        CUSTOMER_ID,
                        cart(line(RAU_MUONG, 1), line(CAI_NGOT, 1), line(BANH_CHUOI, 1)));

        assertThat(groupOf(groups, FARMER_A).items())
                .extracting(i -> i.productId() + ":" + i.status())
                .containsExactly("1:unavailable", "2:unavailable");
        assertThat(groupOf(groups, FARMER_A).problems()).containsExactly("unavailable");
        assertThat(groupOf(groups, FARMER_B).problems()).containsExactly("unavailable");
    }

    /** C5-12: a product id not in the database → 400 VALIDATION_ERROR. */
    @Test
    void previewRejectsAProductThatDoesNotExist() {
        assertThatThrownBy(
                        () -> service.preview(CUSTOMER_ID, cart(line(RAU_MUONG, 1), line(999L, 1))))
                .isInstanceOf(IllegalArgumentException.class);
    }

    /**
     * D-09: a suspended stall still shows in the cart so the customer sees why they cannot order.
     */
    @Test
    void previewFlagsASuspendedStall() {
        farmers.get(FARMER_B).setApprovalStatus(ApprovalStatus.SUSPENDED);

        List<OrderGroupPreviewResource> groups =
                service.preview(CUSTOMER_ID, cart(line(BANH_CHUOI, 1)));

        assertThat(groups.getFirst().problems()).containsExactly("stall_suspended");
    }

    /**
     * C5-11: marketId/marketName are only filled in when the stall sells at exactly one market;
     * markets always lists every one.
     */
    @Test
    void previewListsTheMarketsOfEachStall() {
        List<OrderGroupPreviewResource> groups =
                service.preview(CUSTOMER_ID, cart(line(RAU_MUONG, 1), line(BANH_CHUOI, 1)));

        OrderGroupPreviewResource a = groupOf(groups, FARMER_A);
        assertThat(a.marketId()).isEqualTo(MARKET_ID);
        assertThat(a.marketName()).isEqualTo("Chợ Bà Chiểu");
        assertThat(a.orderCutoffHours()).isEqualTo(12);
        OrderGroupPreviewResource b = groupOf(groups, FARMER_B);
        assertThat(b.marketId()).isNull();
        assertThat(b.marketName()).isNull();
        assertThat(b.markets())
                .extracting(MarketOption::marketId)
                .containsExactly(MARKET_ID, OTHER_MARKET_ID);
    }

    /** C5-4 / D-13: an admin cannot buy, not even preview. */
    @Test
    void previewRefusesAnAdminAccount() {
        when(userRepository.findById(ADMIN_ID)).thenReturn(Optional.of(adminUser()));

        assertThatThrownBy(() -> service.preview(ADMIN_ID, cart(line(RAU_MUONG, 1))))
                .isInstanceOf(AccessDeniedException.class);
    }

    // ---------- place ----------

    @Test
    void placeCreatesOneOrderPerGroup() {
        List<PlacedOrderResource> placed =
                service.place(
                        CUSTOMER_ID,
                        request(
                                group(FARMER_A, SLOT_A, line(RAU_MUONG, 2), line(CAI_NGOT, 1)),
                                group(FARMER_B, SLOT_B, line(BANH_CHUOI, 1))));

        assertThat(orders).hasSize(2);
        assertThat(orders).extracting(Order::getFarmerId).containsExactly(FARMER_A, FARMER_B);
        assertThat(orders).extracting(Order::getCustomerId).containsOnly(CUSTOMER_ID);
        assertThat(placed)
                .extracting(PlacedOrderResource::orderId)
                .containsExactly(orders.get(0).getId(), orders.get(1).getId());
        assertThat(placed).extracting(PlacedOrderResource::status).containsOnly("placed");
        assertThat(placed.get(0).totalAmount()).isEqualByComparingTo("39000");
        assertThat(orders.get(0).getTotalAmount()).isEqualByComparingTo("39000");
        assertThat(items)
                .extracting(OrderItem::getOrderId)
                .containsExactly(
                        orders.get(0).getId(), orders.get(0).getId(), orders.get(1).getId());
    }

    /**
     * D-02: stock for that pickup date is deducted right when the order is `placed`, in the same
     * transaction as the place-order call.
     */
    @Test
    void placeDeductsStockInTheSameTransaction() throws Exception {
        service.place(CUSTOMER_ID, request(group(FARMER_A, SLOT_A, line(RAU_MUONG, 3))));

        assertThat(orders.getFirst().getStatus()).isEqualTo(OrderStatus.PLACED);
        assertThat(dailyStock.get(RAU_MUONG + "@" + PICKUP).getQuantityAvailable()).isEqualTo(37);
        assertThat(
                        OrderService.class
                                .getMethod("place", long.class, PlaceOrderRequest.class)
                                .isAnnotationPresent(Transactional.class))
                .isTrue();
    }

    /** Selling out a date's last batch does not touch Product.status — sold out is per date now. */
    @Test
    void placeDoesNotTouchProductStatusWhenADateSellsOut() {
        dailyStock(BANH_CHUOI, PICKUP, 2, "35000");

        service.place(CUSTOMER_ID, request(group(FARMER_B, SLOT_B, line(BANH_CHUOI, 2))));

        assertThat(dailyStock.get(BANH_CHUOI + "@" + PICKUP).getQuantityAvailable()).isZero();
        assertThat(products.get(BANH_CHUOI).getStatus()).isEqualTo(ProductStatus.AVAILABLE);
    }

    /**
     * Order 10, that date only has 3 left → 409; nothing is deducted (the transaction rolls back,
     * and the service checks before deducting).
     */
    @Test
    void placeRefusesWhenStockIsShort() {
        dailyStock(RAU_MUONG, PICKUP, 3, "12000");

        assertThatThrownBy(
                        () ->
                                service.place(
                                        CUSTOMER_ID,
                                        request(group(FARMER_A, SLOT_A, line(RAU_MUONG, 10)))))
                .isInstanceOf(OutOfStockException.class);
        assertThat(dailyStock.get(RAU_MUONG + "@" + PICKUP).getQuantityAvailable()).isEqualTo(3);
        assertThat(slots.get(SLOT_A).getBookedCount()).isZero();
        verify(orderRepository, never()).save(any());
    }

    /**
     * No template covers that weekday → no daily-stock row is ever created → 409 (decision D-…).
     */
    @Test
    void placeRefusesADateWithNoTemplate() {
        dailyStock.remove(RAU_MUONG + "@" + PICKUP);
        when(dailyStockRepository.materialize(eq(RAU_MUONG), eq(PICKUP), anyInt())).thenReturn(0);

        assertThatThrownBy(() -> service.place(CUSTOMER_ID, aValidRequest()))
                .isInstanceOf(OutOfStockException.class);
        verify(orderRepository, never()).save(any());
    }

    @Test
    void placeRefusesWhenSlotIsFull() {
        slots.get(SLOT_A).setBookedCount(5);

        assertThatThrownBy(() -> service.place(CUSTOMER_ID, aValidRequest()))
                .isInstanceOf(SlotFullException.class);
        assertThat(dailyStock.get(RAU_MUONG + "@" + PICKUP).getQuantityAvailable()).isEqualTo(40);
        verify(orderRepository, never()).save(any());
    }

    /** booked_count counts orders, not items. */
    @Test
    void placeIncrementsBookedCount() {
        service.place(
                CUSTOMER_ID,
                request(
                        group(FARMER_A, SLOT_A, line(RAU_MUONG, 2), line(CAI_NGOT, 3)),
                        group(FARMER_B, SLOT_B, line(BANH_CHUOI, 1))));

        assertThat(slots.get(SLOT_A).getBookedCount()).isEqualTo(1);
        assertThat(slots.get(SLOT_B).getBookedCount()).isEqualTo(1);
        assertThat(orders).extracting(Order::getSlotId).containsExactly(SLOT_A, SLOT_B);
    }

    /**
     * D-05: same cart, same pickup time, but each Farmer's cutoff is computed by their own hours.
     */
    @Test
    void placeComputesCutoffFromTheFarmersOwnHours() {
        farmers.get(FARMER_A).setOrderCutoffHours(6);
        farmers.get(FARMER_B).setOrderCutoffHours(24);

        List<PlacedOrderResource> placed =
                service.place(
                        CUSTOMER_ID,
                        request(
                                group(FARMER_A, SLOT_A, line(RAU_MUONG, 1)),
                                group(FARMER_B, SLOT_B, line(BANH_CHUOI, 1))));

        assertThat(orders.get(0).getCutoffAt()).isEqualTo(LocalDateTime.of(2026, 9, 29, 1, 0));
        assertThat(orders.get(1).getCutoffAt()).isEqualTo(LocalDateTime.of(2026, 9, 28, 7, 0));
        // contract: ISO 8601 UTC — 01:00 and 07:00 Vietnam time
        assertThat(placed)
                .extracting(PlacedOrderResource::cutoffAt)
                .containsExactly("2026-09-28T18:00:00Z", "2026-09-28T00:00:00Z");
    }

    /** FR-038: the first history row — from NULL to placed, by the customer themself. */
    @Test
    void placeWritesTheFirstHistoryRow() {
        service.place(CUSTOMER_ID, aValidRequest());

        assertThat(history).hasSize(1);
        OrderStatusHistory row = history.getFirst();
        assertThat(row.getOrderId()).isEqualTo(orders.getFirst().getId());
        assertThat(row.getFromStatus()).isNull();
        assertThat(row.getToStatus()).isEqualTo(OrderStatus.PLACED);
        assertThat(row.getChangedBy()).isEqualTo(CUSTOMER_ID);
    }

    /**
     * A Farmer changing the price, changing the name after the order → the old order row keeps the
     * price actually charged for that pickup date.
     */
    @Test
    void placeSnapshotsNameAndPrice() {
        service.place(CUSTOMER_ID, aValidRequest());
        products.get(RAU_MUONG).setPrice(new BigDecimal("99000"));
        products.get(RAU_MUONG).setName("Rau muống hữu cơ");
        dailyStock.get(RAU_MUONG + "@" + PICKUP).setUnitPrice(new BigDecimal("77000"));

        OrderItem item = items.getFirst();
        assertThat(item.getProductId()).isEqualTo(RAU_MUONG);
        assertThat(item.getProductName()).isEqualTo("Rau muống");
        assertThat(item.getUnitPrice()).isEqualByComparingTo("12000");
        assertThat(item.getUnit()).isEqualTo("bó");
        assertThat(item.getQuantity()).isEqualTo(2);
        assertThat(item.getSubtotal()).isEqualByComparingTo("24000");
    }

    /** D-13 — hiding the button is not a control. The admin role must be blocked on the server. */
    @Test
    void placeRefusesAnAdminAccount() {
        when(userRepository.findById(ADMIN_ID)).thenReturn(Optional.of(adminUser()));

        assertThatThrownBy(() -> service.place(ADMIN_ID, aValidRequest()))
                .isInstanceOf(AccessDeniedException.class);
        verify(orderRepository, never()).save(any());
    }

    /**
     * C5-2: every slot of the whole call is locked first (ascending id), then every daily-stock row
     * of the whole call, in ascending (productId, date) order — the shared locking order for every
     * write path, so no path deadlocks against another. Product is read unlocked now: nothing in
     * the place-order path mutates a Product row anymore.
     */
    @Test
    void placeLocksEverySlotBeforeAnyDailyStockRowInAscendingOrder() {
        service.place(
                CUSTOMER_ID,
                request(
                        group(FARMER_B, SLOT_B, line(BANH_CHUOI, 1)),
                        group(FARMER_A, SLOT_A, line(CAI_NGOT, 1), line(RAU_MUONG, 1))));

        InOrder locks = inOrder(slotRepository, dailyStockRepository);
        locks.verify(slotRepository).lockById(SLOT_A);
        locks.verify(slotRepository).lockById(SLOT_B);
        locks.verify(dailyStockRepository).lockByProductIdAndStockDate(RAU_MUONG, PICKUP);
        locks.verify(dailyStockRepository).lockByProductIdAndStockDate(CAI_NGOT, PICKUP);
        locks.verify(dailyStockRepository).lockByProductIdAndStockDate(BANH_CHUOI, PICKUP);
        verify(productRepository, never()).lockAllById(any());
        verify(productRepository).findAllById(any());
    }

    /** C5-5: the slot must belong to the exact stall in the group. */
    @Test
    void placeRefusesASlotThatBelongsToAnotherStall() {
        assertThatThrownBy(
                        () ->
                                service.place(
                                        CUSTOMER_ID,
                                        request(group(FARMER_A, SLOT_B, line(RAU_MUONG, 1)))))
                .isInstanceOf(SlotNotAvailableException.class);
        assertThat(slots.get(SLOT_B).getBookedCount()).isZero();
        verify(orderRepository, never()).save(any());
    }

    /** C5-5: a slot of the stall but at a different market than the one in the group. */
    @Test
    void placeRefusesASlotAtAnotherMarket() {
        OrderGroupInput atAnotherMarket =
                new OrderGroupInput(
                        FARMER_A,
                        OTHER_MARKET_ID,
                        SLOT_A,
                        PICKUP,
                        List.of(line(RAU_MUONG, 1)),
                        null);

        assertThatThrownBy(() -> service.place(CUSTOMER_ID, request(atAnotherMarket)))
                .isInstanceOf(SlotNotAvailableException.class);
    }

    /**
     * C5-5: the stall has left the market (farmer_markets.is_active = FALSE) so a slot there does
     * not accept orders.
     */
    @Test
    void placeRefusesASlotAtAMarketTheStallHasLeft() {
        links.get(FM_A).setActive(false);

        assertThatThrownBy(() -> service.place(CUSTOMER_ID, aValidRequest()))
                .isInstanceOf(SlotNotAvailableException.class);
    }

    /** C5-5: the Farmer has turned the slot off. */
    @Test
    void placeRefusesATurnedOffSlot() {
        slots.get(SLOT_A).setActive(false);

        assertThatThrownBy(() -> service.place(CUSTOMER_ID, aValidRequest()))
                .isInstanceOf(SlotNotAvailableException.class);
    }

    /** C5-5: pickupDate must match the slot's own day. */
    @Test
    void placeRefusesASlotOnAnotherDay() {
        OrderGroupInput wrongDay =
                new OrderGroupInput(
                        FARMER_A,
                        MARKET_ID,
                        SLOT_A,
                        PICKUP.plusDays(1),
                        List.of(line(RAU_MUONG, 1)),
                        null);

        assertThatThrownBy(() -> service.place(CUSTOMER_ID, request(wrongDay)))
                .isInstanceOf(SlotNotAvailableException.class);
    }

    /** D-01: an order always has a slot; a missing slotId → 409 SLOT_UNAVAILABLE. */
    @Test
    void placeRefusesAGroupWithoutASlot() {
        OrderGroupInput noSlot =
                new OrderGroupInput(
                        FARMER_A, MARKET_ID, null, PICKUP, List.of(line(RAU_MUONG, 1)), null);

        assertThatThrownBy(() -> service.place(CUSTOMER_ID, request(noSlot)))
                .isInstanceOf(SlotNotAvailableException.class);
    }

    /**
     * C5-5 / D-05: now ≥ cutoffAt → 409. A 15:00 slot today, a 6-hour cutoff → the deadline is
     * exactly 09:00 = now: the exact cutoff moment already counts as late.
     */
    @Test
    void placeRefusesAfterTheCutoff() {
        farmers.get(FARMER_A).setOrderCutoffHours(6);
        slot(SLOT_A, FM_A, TODAY, LocalTime.of(15, 0), 5, 0);
        OrderGroupInput today =
                new OrderGroupInput(
                        FARMER_A, MARKET_ID, SLOT_A, TODAY, List.of(line(RAU_MUONG, 1)), null);

        assertThatThrownBy(() -> service.place(CUSTOMER_ID, request(today)))
                .isInstanceOf(CutoffPassedException.class);
        assertThat(dailyStock.get(RAU_MUONG + "@" + TODAY).getQuantityAvailable()).isEqualTo(40);
        assertThat(slots.get(SLOT_A).getBookedCount()).isZero();
    }

    /**
     * C5-5 / D-09: a stall not approved or suspended does not accept new orders → 409
     * STALL_UNAVAILABLE.
     */
    @Test
    void placeRefusesAStallThatIsNotApproved() {
        farmers.get(FARMER_A).setApprovalStatus(ApprovalStatus.SUSPENDED);

        assertThatThrownBy(() -> service.place(CUSTOMER_ID, aValidRequest()))
                .isInstanceOf(StallUnavailableException.class);
        verify(orderRepository, never()).save(any());
    }

    /** C5-12: a product that is hidden, deleted, unavailable, or gone → 409 OUT_OF_STOCK. */
    @Test
    void placeRefusesAProductThatCannotBeSold() {
        products.get(RAU_MUONG).setHidden(true);
        assertThatThrownBy(() -> service.place(CUSTOMER_ID, aValidRequest()))
                .isInstanceOf(OutOfStockException.class);

        products.get(RAU_MUONG).setHidden(false);
        products.get(RAU_MUONG).setDeleted(true);
        assertThatThrownBy(() -> service.place(CUSTOMER_ID, aValidRequest()))
                .isInstanceOf(OutOfStockException.class);

        products.get(RAU_MUONG).setDeleted(false);
        products.get(RAU_MUONG).setStatus(ProductStatus.UNAVAILABLE);
        assertThatThrownBy(() -> service.place(CUSTOMER_ID, aValidRequest()))
                .isInstanceOf(OutOfStockException.class);

        assertThatThrownBy(
                        () ->
                                service.place(
                                        CUSTOMER_ID,
                                        request(group(FARMER_A, SLOT_A, line(999L, 1)))))
                .isInstanceOf(OutOfStockException.class);
        assertThat(slots.get(SLOT_A).getBookedCount()).isZero();
        verify(orderRepository, never()).save(any());
    }

    /** A product from another stall in the group → 400: a malformed request, not a conflict. */
    @Test
    void placeRefusesAProductOfAnotherStallInTheGroup() {
        assertThatThrownBy(
                        () ->
                                service.place(
                                        CUSTOMER_ID,
                                        request(group(FARMER_A, SLOT_A, line(BANH_CHUOI, 1)))))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(dailyStock.get(BANH_CHUOI + "@" + PICKUP).getQuantityAvailable()).isEqualTo(15);
    }

    // ---------- order code (C5-6) ----------

    @Test
    void placeGivesEachOrderACodeOfTheAgreedShape() {
        List<PlacedOrderResource> placed = service.place(CUSTOMER_ID, aValidRequest());

        assertThat(placed.getFirst().orderCode())
                .matches("ML-20260926-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}");
        assertThat(orders.getFirst().getOrderCode()).isEqualTo(placed.getFirst().orderCode());
    }

    /** A collision redraws, up to 5 times, before inserting. */
    @Test
    void orderCodeIsDrawnAgainWhenTaken() {
        OrderCodeGenerator codes = new OrderCodeGenerator(orderRepository, clock);
        when(orderRepository.existsByOrderCode(any())).thenReturn(true, true, false);

        assertThat(codes.next()).startsWith("ML-20260926-");
        verify(orderRepository, times(3)).existsByOrderCode(any());

        when(orderRepository.existsByOrderCode(any())).thenReturn(true);
        assertThatThrownBy(codes::next).isInstanceOf(IllegalStateException.class);
        verify(orderRepository, times(3 + 5)).existsByOrderCode(any());
    }
}
