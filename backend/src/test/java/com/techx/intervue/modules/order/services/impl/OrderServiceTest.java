package com.techx.intervue.modules.order.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
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
import com.techx.intervue.modules.order.repositories.OrderQueryRepository;
import com.techx.intervue.modules.order.repositories.OrderRepository;
import com.techx.intervue.modules.order.repositories.OrderStatusHistoryRepository;
import com.techx.intervue.modules.order.requests.CartLine;
import com.techx.intervue.modules.order.requests.OrderGroupInput;
import com.techx.intervue.modules.order.requests.PlaceOrderRequest;
import com.techx.intervue.modules.order.requests.PreviewRequest;
import com.techx.intervue.modules.order.resources.OrderGroupPreviewResource;
import com.techx.intervue.modules.order.resources.OrderGroupPreviewResource.MarketOption;
import com.techx.intervue.modules.order.resources.PlacedOrderResource;
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
import java.util.Collection;
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
 * FR-030…032 — xem trước và đặt đơn. Hôm nay (theo Clock) là thứ Bảy 26/09/2026, 09:00 giờ Việt
 * Nam; ngày nhận hàng mặc định là thứ Ba 29/09. Repository là bảng giả trong bộ nhớ: khoá và
 * rollback thật được chứng minh ở PlaceOrderConcurrencyTest.
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
    private OrderQueryRepository orderQueries;
    private Clock clock;
    private OrderService service;

    /** Các bảng giả. */
    private final Map<Long, FarmerProfile> farmers = new HashMap<>();

    private final Map<Long, FarmerMarket> links = new HashMap<>();
    private final Map<Long, PickupSlot> slots = new HashMap<>();
    private final Map<Long, Product> products = new HashMap<>();
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
                        orderQueries,
                        clock);

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

        when(farmerRepository.findById(any()))
                .thenAnswer(inv -> Optional.ofNullable(farmers.get(inv.<Long>getArgument(0))));
        when(farmerRepository.findAllById(any()))
                .thenAnswer(inv -> rows(farmers, inv.getArgument(0)));
        when(farmerMarketRepository.findById(any()))
                .thenAnswer(inv -> Optional.ofNullable(links.get(inv.<Long>getArgument(0))));
        when(slotRepository.lockById(any()))
                .thenAnswer(inv -> Optional.ofNullable(slots.get(inv.<Long>getArgument(0))));
        when(productRepository.lockAllById(any()))
                .thenAnswer(inv -> rows(products, inv.getArgument(0)));
        when(productRepository.findAllById(any()))
                .thenAnswer(inv -> rows(products, inv.getArgument(0)));
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

    // ---------- dữ liệu ----------

    /** Như database: chỉ trả dòng có thật, theo id tăng dần. */
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

    /** D-01: một giỏ, hai Farmer → hai đơn sẽ được tách, mỗi đơn tổng tiền riêng. */
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
        // chỉ đọc: không khoá, không ghi
        verify(productRepository, never()).lockAllById(any());
        verify(slotRepository, never()).lockById(any());
        verify(orderRepository, never()).save(any());
    }

    /** Xem trước phải xem được: thiếu hàng là một vấn đề của group, không phải exception. */
    @Test
    void previewFlagsItemsOverStock() {
        List<OrderGroupPreviewResource> groups =
                service.preview(CUSTOMER_ID, cart(line(RAU_MUONG, 1), line(BANH_CHUOI, 16)));

        assertThat(groupOf(groups, FARMER_B).problems()).containsExactly("out_of_stock");
        assertThat(groupOf(groups, FARMER_A).problems()).isEmpty();
        assertThat(groupOf(groups, FARMER_B).items().getFirst().stockQuantity()).isEqualTo(15);
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
     * C5-12: xoá mềm / bị ẩn / unavailable vẫn nằm trong group của stall, problem `unavailable`.
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

    /** C5-12: id sản phẩm không có trong database → 400 VALIDATION_ERROR. */
    @Test
    void previewRejectsAProductThatDoesNotExist() {
        assertThatThrownBy(
                        () -> service.preview(CUSTOMER_ID, cart(line(RAU_MUONG, 1), line(999L, 1))))
                .isInstanceOf(IllegalArgumentException.class);
    }

    /** D-09: stall bị đình chỉ vẫn hiện trong giỏ để khách thấy vì sao không đặt được. */
    @Test
    void previewFlagsASuspendedStall() {
        farmers.get(FARMER_B).setApprovalStatus(ApprovalStatus.SUSPENDED);

        List<OrderGroupPreviewResource> groups =
                service.preview(CUSTOMER_ID, cart(line(BANH_CHUOI, 1)));

        assertThat(groups.getFirst().problems()).containsExactly("stall_suspended");
    }

    /** C5-11: marketId/marketName chỉ điền khi stall bán đúng một chợ; markets luôn liệt kê đủ. */
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

    /** C5-4 / D-13: admin không mua, kể cả xem trước. */
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

    /** D-02: trừ tồn ngay khi đơn ở `placed`, trong chính transaction của lệnh đặt. */
    @Test
    void placeDeductsStockInTheSameTransaction() throws Exception {
        service.place(CUSTOMER_ID, request(group(FARMER_A, SLOT_A, line(RAU_MUONG, 3))));

        assertThat(orders.getFirst().getStatus()).isEqualTo(OrderStatus.PLACED);
        assertThat(products.get(RAU_MUONG).getStockQuantity()).isEqualTo(37);
        assertThat(
                        OrderService.class
                                .getMethod("place", long.class, PlaceOrderRequest.class)
                                .isAnnotationPresent(Transactional.class))
                .isTrue();
    }

    /** Bán hết lô cuối thì sản phẩm chuyển `sold_out`. */
    @Test
    void placeMarksAProductSoldOutWhenItsLastUnitGoes() {
        products.get(BANH_CHUOI).setStockQuantity(2);

        service.place(CUSTOMER_ID, request(group(FARMER_B, SLOT_B, line(BANH_CHUOI, 2))));

        assertThat(products.get(BANH_CHUOI).getStockQuantity()).isZero();
        assertThat(products.get(BANH_CHUOI).getStatus()).isEqualTo(ProductStatus.SOLD_OUT);
    }

    /**
     * Đặt 10, tồn 3 → 409; không có gì bị trừ (transaction rollback, và service kiểm trước khi
     * trừ).
     */
    @Test
    void placeRefusesWhenStockIsShort() {
        products.get(RAU_MUONG).setStockQuantity(3);

        assertThatThrownBy(
                        () ->
                                service.place(
                                        CUSTOMER_ID,
                                        request(group(FARMER_A, SLOT_A, line(RAU_MUONG, 10)))))
                .isInstanceOf(OutOfStockException.class);
        assertThat(products.get(RAU_MUONG).getStockQuantity()).isEqualTo(3);
        assertThat(slots.get(SLOT_A).getBookedCount()).isZero();
        verify(orderRepository, never()).save(any());
    }

    @Test
    void placeRefusesWhenSlotIsFull() {
        slots.get(SLOT_A).setBookedCount(5);

        assertThatThrownBy(() -> service.place(CUSTOMER_ID, aValidRequest()))
                .isInstanceOf(SlotFullException.class);
        assertThat(products.get(RAU_MUONG).getStockQuantity()).isEqualTo(40);
        verify(orderRepository, never()).save(any());
    }

    /** booked_count đếm đơn, không đếm item. */
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

    /** D-05: cùng giỏ, cùng giờ nhận, nhưng mỗi Farmer chốt đơn theo số giờ của riêng mình. */
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
        // contract: ISO 8601 UTC — 01:00 và 07:00 giờ Việt Nam
        assertThat(placed)
                .extracting(PlacedOrderResource::cutoffAt)
                .containsExactly("2026-09-28T18:00:00Z", "2026-09-28T00:00:00Z");
    }

    /** FR-038: dòng lịch sử đầu tiên — từ NULL sang placed, do chính khách. */
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

    /** Farmer đổi giá, đổi tên sau khi đặt → dòng đơn cũ giữ nguyên. */
    @Test
    void placeSnapshotsNameAndPrice() {
        service.place(CUSTOMER_ID, aValidRequest());
        products.get(RAU_MUONG).setPrice(new BigDecimal("99000"));
        products.get(RAU_MUONG).setName("Rau muống hữu cơ");

        OrderItem item = items.getFirst();
        assertThat(item.getProductId()).isEqualTo(RAU_MUONG);
        assertThat(item.getProductName()).isEqualTo("Rau muống");
        assertThat(item.getUnitPrice()).isEqualByComparingTo("12000");
        assertThat(item.getUnit()).isEqualTo("bó");
        assertThat(item.getQuantity()).isEqualTo(2);
        assertThat(item.getSubtotal()).isEqualByComparingTo("24000");
    }

    /** D-13 — ẩn nút không phải là biện pháp kiểm soát. Vai admin phải bị chặn ở server. */
    @Test
    void placeRefusesAnAdminAccount() {
        when(userRepository.findById(ADMIN_ID)).thenReturn(Optional.of(adminUser()));

        assertThatThrownBy(() -> service.place(ADMIN_ID, aValidRequest()))
                .isInstanceOf(AccessDeniedException.class);
        verify(orderRepository, never()).save(any());
    }

    /**
     * C5-2: mọi slot của cả lệnh bị khoá trước (id tăng dần), rồi mọi sản phẩm của cả lệnh trong
     * đúng một lần lockAllById — thứ tự khoá chung của mọi đường ghi, để không đường nào deadlock
     * với đường nào.
     */
    @Test
    void placeLocksEverySlotBeforeAnyProductInAscendingOrder() {
        service.place(
                CUSTOMER_ID,
                request(
                        group(FARMER_B, SLOT_B, line(BANH_CHUOI, 1)),
                        group(FARMER_A, SLOT_A, line(CAI_NGOT, 1), line(RAU_MUONG, 1))));

        InOrder locks = inOrder(slotRepository, productRepository);
        locks.verify(slotRepository).lockById(SLOT_A);
        locks.verify(slotRepository).lockById(SLOT_B);
        locks.verify(productRepository)
                .lockAllById(
                        argThat(
                                (Collection<Long> ids) ->
                                        List.copyOf(ids)
                                                .equals(List.of(RAU_MUONG, CAI_NGOT, BANH_CHUOI))));
        verify(productRepository, times(1)).lockAllById(any());
        verify(productRepository, never()).findAllById(any());
    }

    /** C5-5: slot phải thuộc chính stall trong group. */
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

    /** C5-5: slot của stall nhưng ở chợ khác với chợ trong group. */
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

    /** C5-5: stall đã rời chợ (farmer_markets.is_active = FALSE) thì slot ở đó không nhận đơn. */
    @Test
    void placeRefusesASlotAtAMarketTheStallHasLeft() {
        links.get(FM_A).setActive(false);

        assertThatThrownBy(() -> service.place(CUSTOMER_ID, aValidRequest()))
                .isInstanceOf(SlotNotAvailableException.class);
    }

    /** C5-5: Farmer đã tắt slot. */
    @Test
    void placeRefusesATurnedOffSlot() {
        slots.get(SLOT_A).setActive(false);

        assertThatThrownBy(() -> service.place(CUSTOMER_ID, aValidRequest()))
                .isInstanceOf(SlotNotAvailableException.class);
    }

    /** C5-5: pickupDate phải đúng ngày của slot. */
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

    /** D-01: đơn luôn có slot; thiếu slotId → 409 SLOT_UNAVAILABLE. */
    @Test
    void placeRefusesAGroupWithoutASlot() {
        OrderGroupInput noSlot =
                new OrderGroupInput(
                        FARMER_A, MARKET_ID, null, PICKUP, List.of(line(RAU_MUONG, 1)), null);

        assertThatThrownBy(() -> service.place(CUSTOMER_ID, request(noSlot)))
                .isInstanceOf(SlotNotAvailableException.class);
    }

    /**
     * C5-5 / D-05: bây giờ ≥ cutoffAt → 409. Slot 15:00 hôm nay, cutoff 6 giờ → chốt đúng 09:00 =
     * bây giờ: đúng thời điểm cutoff đã là muộn.
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
        assertThat(products.get(RAU_MUONG).getStockQuantity()).isEqualTo(40);
        assertThat(slots.get(SLOT_A).getBookedCount()).isZero();
    }

    /**
     * C5-5 / D-09: stall chưa duyệt hoặc bị đình chỉ không nhận đơn mới → 409 STALL_UNAVAILABLE.
     */
    @Test
    void placeRefusesAStallThatIsNotApproved() {
        farmers.get(FARMER_A).setApprovalStatus(ApprovalStatus.SUSPENDED);

        assertThatThrownBy(() -> service.place(CUSTOMER_ID, aValidRequest()))
                .isInstanceOf(StallUnavailableException.class);
        verify(orderRepository, never()).save(any());
    }

    /** C5-12: sản phẩm bị ẩn, đã xoá, unavailable hoặc không còn → 409 OUT_OF_STOCK. */
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

    /** Sản phẩm của stall khác trong group → 400: request sai hình dạng, không phải xung đột. */
    @Test
    void placeRefusesAProductOfAnotherStallInTheGroup() {
        assertThatThrownBy(
                        () ->
                                service.place(
                                        CUSTOMER_ID,
                                        request(group(FARMER_A, SLOT_A, line(BANH_CHUOI, 1)))))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(products.get(BANH_CHUOI).getStockQuantity()).isEqualTo(15);
    }

    // ---------- mã đơn (C5-6) ----------

    @Test
    void placeGivesEachOrderACodeOfTheAgreedShape() {
        List<PlacedOrderResource> placed = service.place(CUSTOMER_ID, aValidRequest());

        assertThat(placed.getFirst().orderCode())
                .matches("ML-20260926-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}");
        assertThat(orders.getFirst().getOrderCode()).isEqualTo(placed.getFirst().orderCode());
    }

    /** Mã trùng thì bốc lại, tối đa 5 lần, trước khi insert. */
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
