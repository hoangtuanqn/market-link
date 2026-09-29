package com.techx.intervue.modules.order.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.catalog.enums.StorageMode;
import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.favorite.services.impl.RestockNotifier;
import com.techx.intervue.modules.notification.services.interfaces.NotificationServiceInterface;
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
import com.techx.intervue.modules.order.repositories.OrderQueryRepository;
import com.techx.intervue.modules.order.repositories.OrderRepository;
import com.techx.intervue.modules.order.repositories.OrderStatusHistoryRepository;
import com.techx.intervue.modules.order.requests.CartLine;
import com.techx.intervue.modules.order.requests.OrderGroupInput;
import com.techx.intervue.modules.order.requests.PickupDateInput;
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

class OrderServiceTest {

    private static final ZoneId HCM = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final LocalDate TODAY = LocalDate.of(2026, 9, 26);
    private static final LocalDate PICKUP = LocalDate.of(2026, 9, 29);
    private static final LocalDate SATURDAY = LocalDate.of(2026, 10, 3);

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
    private OrderQueryRepository orderQueries;
    private Clock clock;
    private ProductDailyStockRepository dailyStockRepository;
    private ProductAvailabilityResolver availability;
    private OrderService service;

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
        when(slotRepository.isOnOpenDay(anyLong())).thenReturn(true);
        productRepository = mock(ProductRepository.class);
        orderRepository = mock(OrderRepository.class);
        orderItemRepository = mock(OrderItemRepository.class);
        historyRepository = mock(OrderStatusHistoryRepository.class);
        checkoutQueries = mock(CheckoutQueryRepository.class);
        dailyStockRepository = mock(ProductDailyStockRepository.class);
        availability = mock(ProductAvailabilityResolver.class);
        orderQueries = mock(OrderQueryRepository.class);
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
                        availability,
                        orderQueries,
                        mock(NotificationServiceInterface.class),
                        mock(RestockNotifier.class));

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
        return new PreviewRequest(List.of(lines), null);
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
        verify(productRepository, never()).lockAllById(any());
        verify(slotRepository, never()).lockById(any());
        verify(orderRepository, never()).save(any());
    }

    @Test
    void previewFlagsItemsOverStock() {
        List<OrderGroupPreviewResource> groups =
                service.preview(CUSTOMER_ID, cart(line(RAU_MUONG, 1), line(BANH_CHUOI, 16)));

        assertThat(groupOf(groups, FARMER_B).problems()).containsExactly("out_of_stock");
        assertThat(groupOf(groups, FARMER_A).problems()).isEmpty();
        assertThat(groupOf(groups, FARMER_B).items().getFirst().stockQuantity()).isEqualTo(15);
    }

    @Test
    void previewShowsThePriceForTheResolvedDateNotTheProductsBasePrice() {
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

    @Test
    void previewRejectsAProductThatDoesNotExist() {
        assertThatThrownBy(
                        () -> service.preview(CUSTOMER_ID, cart(line(RAU_MUONG, 1), line(999L, 1))))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void previewFlagsASuspendedStall() {
        farmers.get(FARMER_B).setApprovalStatus(ApprovalStatus.SUSPENDED);

        List<OrderGroupPreviewResource> groups =
                service.preview(CUSTOMER_ID, cart(line(BANH_CHUOI, 1)));

        assertThat(groups.getFirst().problems()).containsExactly("stall_suspended");
    }

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

    @Test
    void previewRefusesAnAdminAccount() {
        when(userRepository.findById(ADMIN_ID)).thenReturn(Optional.of(adminUser()));

        assertThatThrownBy(() -> service.preview(ADMIN_ID, cart(line(RAU_MUONG, 1))))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void previewPricesAStallForTheDayItWillBePickedUp() {
        doReturn(
                        Map.of(
                                RAU_MUONG,
                                new ProductAvailabilityResolver.Availability(
                                        SATURDAY,
                                        12,
                                        new BigDecimal("7200"),
                                        new ProductAvailabilityResolver.Deal(
                                                new BigDecimal("12000"),
                                                40,
                                                LocalDate.of(2026, 9, 30),
                                                LocalDate.of(2026, 10, 4)))))
                .when(availability)
                .onDate(eq(FARMER_A), any(), eq(SATURDAY));

        List<OrderGroupPreviewResource> groups =
                service.preview(
                        CUSTOMER_ID,
                        new PreviewRequest(
                                List.of(line(RAU_MUONG, 2), line(BANH_CHUOI, 1)),
                                List.of(new PickupDateInput(FARMER_A, SATURDAY))));

        PreviewItemResource item = groupOf(groups, FARMER_A).items().getFirst();
        assertThat(item.unitPrice()).isEqualByComparingTo("7200");
        assertThat(item.stockQuantity()).isEqualTo(12);
        assertThat(item.listPrice()).isEqualByComparingTo("12000");
        assertThat(item.discountPercent()).isEqualTo(40);
        assertThat(item.bestBefore()).isEqualTo("2026-10-04");
        assertThat(groupOf(groups, FARMER_A).subtotal()).isEqualByComparingTo("14400");
        assertThat(groupOf(groups, FARMER_B).items().getFirst().unitPrice())
                .isEqualByComparingTo("35000");
        verify(availability).resolve(Map.of(BANH_CHUOI, new BigDecimal("35000")));
    }

    @Test
    void previewFlagsAProductNotSoldOnThePickedDay() {
        doReturn(Map.of()).when(availability).onDate(eq(FARMER_A), any(), eq(SATURDAY));

        List<OrderGroupPreviewResource> groups =
                service.preview(
                        CUSTOMER_ID,
                        new PreviewRequest(
                                List.of(line(RAU_MUONG, 1)),
                                List.of(new PickupDateInput(FARMER_A, SATURDAY))));

        PreviewItemResource item = groups.getFirst().items().getFirst();
        assertThat(item.stockQuantity()).isZero();
        assertThat(item.unitPrice()).isEqualByComparingTo("12000");
        assertThat(item.listPrice()).isNull();
        assertThat(item.bestBefore()).isNull();
        assertThat(groups.getFirst().problems()).containsExactly("out_of_stock");
    }

    @Test
    void previewGivesTheFreshBestBeforeOnADayWithoutADeal() {
        products.get(RAU_MUONG).setShelfLifeDays(3);
        doReturn(
                        Map.of(
                                RAU_MUONG,
                                new ProductAvailabilityResolver.Availability(
                                        SATURDAY, 40, new BigDecimal("12000"))))
                .when(availability)
                .onDate(eq(FARMER_A), any(), eq(SATURDAY));

        PreviewItemResource item =
                service.preview(
                                CUSTOMER_ID,
                                new PreviewRequest(
                                        List.of(line(RAU_MUONG, 1)),
                                        List.of(new PickupDateInput(FARMER_A, SATURDAY))))
                        .getFirst()
                        .items()
                        .getFirst();

        assertThat(item.bestBefore()).isEqualTo("2026-10-05");
        assertThat(item.listPrice()).isNull();
        assertThat(item.discountPercent()).isNull();
        assertThat(item.storageMode()).isEqualTo("room");
    }

    @Test
    void previewWithoutPickupDatesKeepsTheNearestDay() {
        products.get(RAU_MUONG).setShelfLifeDays(3);

        PreviewItemResource item =
                service.preview(CUSTOMER_ID, cart(line(RAU_MUONG, 1)))
                        .getFirst()
                        .items()
                        .getFirst();

        assertThat(item.unitPrice()).isEqualByComparingTo("12000");
        assertThat(item.listPrice()).isNull();
        assertThat(item.bestBefore()).isEqualTo(PICKUP.plusDays(2).toString());
        verify(availability, never()).onDate(anyLong(), any(), any());
    }

    @Test
    void previewIgnoresADayForAStallNotInTheCart() {
        service.preview(
                CUSTOMER_ID,
                new PreviewRequest(
                        List.of(line(RAU_MUONG, 1)),
                        List.of(new PickupDateInput(FARMER_B, SATURDAY))));

        verify(availability, never()).onDate(anyLong(), any(), any());
    }

    @Test
    void previewFlagsALineWhosePickedDayIsNotOrderable() {
        doReturn(Map.of()).when(availability).onDate(eq(FARMER_A), any(), eq(SATURDAY));

        List<OrderGroupPreviewResource> groups =
                service.preview(
                        CUSTOMER_ID,
                        new PreviewRequest(
                                List.of(line(RAU_MUONG, 1)),
                                List.of(new PickupDateInput(FARMER_A, SATURDAY))));

        PreviewItemResource item = groups.getFirst().items().getFirst();
        assertThat(item.stockQuantity()).isZero();
        assertThat(item.unitPrice()).isEqualByComparingTo("12000");
        assertThat(item.listPrice()).isNull();
        assertThat(item.discountPercent()).isNull();
        assertThat(item.bestBefore()).isNull();
        assertThat(groups.getFirst().problems()).containsExactly("out_of_stock");
    }

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

    @Test
    void placeDoesNotTouchProductStatusWhenADateSellsOut() {
        dailyStock(BANH_CHUOI, PICKUP, 2, "35000");

        service.place(CUSTOMER_ID, request(group(FARMER_B, SLOT_B, line(BANH_CHUOI, 2))));

        assertThat(dailyStock.get(BANH_CHUOI + "@" + PICKUP).getQuantityAvailable()).isZero();
        assertThat(products.get(BANH_CHUOI).getStatus()).isEqualTo(ProductStatus.AVAILABLE);
    }

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
        assertThat(placed)
                .extracting(PlacedOrderResource::cutoffAt)
                .containsExactly("2026-09-28T18:00:00Z", "2026-09-28T00:00:00Z");
    }

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

    @Test
    void placeCopiesTheShelfLifePromiseOntoEachLine() {
        Product rau = products.get(RAU_MUONG);
        rau.setShelfLifeDays(5);
        rau.setStorageMode(StorageMode.CHILLED);
        rau.setSuggestedShelfLifeDays(3);
        rau.setShelfLifeExtended(true);

        service.place(CUSTOMER_ID, request(group(FARMER_A, SLOT_A, line(RAU_MUONG, 1))));

        OrderItem line = items.getFirst();
        assertThat(line.getShelfLifeDays()).isEqualTo(5);
        assertThat(line.getStorageMode()).isEqualTo(StorageMode.CHILLED);
        assertThat(line.getBestBefore()).isEqualTo(PICKUP.plusDays(4));
        assertThat(line.isShelfLifeExtended()).isTrue();
        assertThat(line.getExtendedByDays()).isEqualTo(2);
        assertThat(line.getListPrice()).isNull();
    }

    @Test
    void placeOnADealDayKeepsTheListPriceAndTheBatchBestBefore() {
        products.get(RAU_MUONG).setShelfLifeDays(3);
        dailyStock
                .get(RAU_MUONG + "@" + PICKUP)
                .startDeal(
                        new BigDecimal("7200"),
                        40,
                        LocalDate.of(2026, 9, 26),
                        LocalDate.of(2026, 9, 30));

        service.place(CUSTOMER_ID, aValidRequest());

        OrderItem line = items.getFirst();
        assertThat(line.getUnitPrice()).isEqualByComparingTo("7200");
        assertThat(line.getListPrice()).isEqualByComparingTo("12000");
        assertThat(line.getBestBefore()).isEqualTo(LocalDate.of(2026, 9, 30));
        assertThat(orders.getFirst().getTotalAmount()).isEqualByComparingTo("14400");
    }

    @Test
    void placeRefusesAnAdminAccount() {
        when(userRepository.findById(ADMIN_ID)).thenReturn(Optional.of(adminUser()));

        assertThatThrownBy(() -> service.place(ADMIN_ID, aValidRequest()))
                .isInstanceOf(AccessDeniedException.class);
        verify(orderRepository, never()).save(any());
    }

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

    @Test
    void placeRefusesASlotOnAWeekdayTheMarketOrStallNoLongerOpens() {
        when(slotRepository.isOnOpenDay(SLOT_A)).thenReturn(false);

        assertThatThrownBy(() -> service.place(CUSTOMER_ID, aValidRequest()))
                .isInstanceOf(SlotNotAvailableException.class);
    }

    @Test
    void placeRefusesASlotAtAMarketTheStallHasLeft() {
        links.get(FM_A).setActive(false);

        assertThatThrownBy(() -> service.place(CUSTOMER_ID, aValidRequest()))
                .isInstanceOf(SlotNotAvailableException.class);
    }

    @Test
    void placeRefusesATurnedOffSlot() {
        slots.get(SLOT_A).setActive(false);

        assertThatThrownBy(() -> service.place(CUSTOMER_ID, aValidRequest()))
                .isInstanceOf(SlotNotAvailableException.class);
    }

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

    @Test
    void placeRefusesAGroupWithoutASlot() {
        OrderGroupInput noSlot =
                new OrderGroupInput(
                        FARMER_A, MARKET_ID, null, PICKUP, List.of(line(RAU_MUONG, 1)), null);

        assertThatThrownBy(() -> service.place(CUSTOMER_ID, request(noSlot)))
                .isInstanceOf(SlotNotAvailableException.class);
    }

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

    @Test
    void placeRefusesAStallThatIsNotApproved() {
        farmers.get(FARMER_A).setApprovalStatus(ApprovalStatus.SUSPENDED);

        assertThatThrownBy(() -> service.place(CUSTOMER_ID, aValidRequest()))
                .isInstanceOf(StallUnavailableException.class);
        verify(orderRepository, never()).save(any());
    }

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

    @Test
    void placeGivesEachOrderACodeOfTheAgreedShape() {
        List<PlacedOrderResource> placed = service.place(CUSTOMER_ID, aValidRequest());

        assertThat(placed.getFirst().orderCode())
                .matches("ML-20260926-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}");
        assertThat(orders.getFirst().getOrderCode()).isEqualTo(placed.getFirst().orderCode());
    }

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
