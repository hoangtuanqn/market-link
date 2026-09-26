package com.techx.intervue.modules.order.services.impl;

import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.notification.enums.NotificationKind;
import com.techx.intervue.modules.notification.resources.NotificationEvent;
import com.techx.intervue.modules.notification.services.interfaces.NotificationServiceInterface;
import com.techx.intervue.modules.order.entities.Order;
import com.techx.intervue.modules.order.entities.OrderItem;
import com.techx.intervue.modules.order.enums.OrderStatus;
import com.techx.intervue.modules.order.exceptions.CutoffPassedException;
import com.techx.intervue.modules.order.exceptions.InvalidOrderTransitionException;
import com.techx.intervue.modules.order.exceptions.OrderNotFoundException;
import com.techx.intervue.modules.order.exceptions.OrderNotYoursException;
import com.techx.intervue.modules.order.exceptions.OutOfStockException;
import com.techx.intervue.modules.order.exceptions.ProductNotInOrderException;
import com.techx.intervue.modules.order.exceptions.SlotFullException;
import com.techx.intervue.modules.order.exceptions.SlotNotAvailableException;
import com.techx.intervue.modules.order.exceptions.StallUnavailableException;
import com.techx.intervue.modules.order.repositories.CheckoutQueryRepository;
import com.techx.intervue.modules.order.repositories.OrderItemRepository;
import com.techx.intervue.modules.order.repositories.OrderQueryRepository;
import com.techx.intervue.modules.order.repositories.OrderQueryRepository.OrderDetailRow;
import com.techx.intervue.modules.order.repositories.OrderRepository;
import com.techx.intervue.modules.order.requests.CartLine;
import com.techx.intervue.modules.order.requests.ModifyOrderRequest;
import com.techx.intervue.modules.order.requests.OrderGroupInput;
import com.techx.intervue.modules.order.requests.PlaceOrderRequest;
import com.techx.intervue.modules.order.requests.PreviewRequest;
import com.techx.intervue.modules.order.resources.CustomerSummaryResource;
import com.techx.intervue.modules.order.resources.OrderDetailResource;
import com.techx.intervue.modules.order.resources.OrderGroupPreviewResource;
import com.techx.intervue.modules.order.resources.OrderGroupPreviewResource.MarketOption;
import com.techx.intervue.modules.order.resources.OrderListItemResource;
import com.techx.intervue.modules.order.resources.PlacedOrderResource;
import com.techx.intervue.modules.order.resources.PreviewItemResource;
import com.techx.intervue.modules.order.services.interfaces.OrderServiceInterface;
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
import com.techx.intervue.resources.PageResource;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeSet;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.AllArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * FR-030…032 — the cart splits by stall (D-01), stock is deducted right at order time (D-02), a
 * slot has a capacity (D-06), the cutoff is per Farmer (D-05), an admin cannot buy (D-13).
 */
@Service
@AllArgsConstructor
public class OrderService implements OrderServiceInterface {

    static final String OUT_OF_STOCK = "out_of_stock";
    static final String SOLD_OUT = "sold_out";
    static final String UNAVAILABLE = "unavailable";
    static final String STALL_SUSPENDED = "stall_suspended";
    private static final int MAX_PAGE_SIZE = 50;

    private final UserRepository userRepository;
    private final FarmerProfileRepository farmerRepository;
    private final FarmerMarketRepository farmerMarketRepository;
    private final PickupSlotRepository slotRepository;
    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final OrderStatusHistoryWriter history;
    private final OrderCodeGenerator codeGenerator;
    private final CheckoutQueryRepository checkoutQueries;
    private final OrderQueryRepository orderQueries;
    private final Clock clock;
    private final NotificationServiceInterface notifications;

    /**
     * Read-only, no locking, changes nothing: groups the cart by farmer_id and writes each group's
     * issues into {@code problems} instead of throwing. A product id that does not exist is a
     * malformed request → 400 (C5-12).
     */
    @Override
    @Transactional(readOnly = true)
    public List<OrderGroupPreviewResource> preview(Long userIdOrNull, PreviewRequest request) {
        if (userIdOrNull != null) {
            requireBuyer(userIdOrNull);
        }
        Map<Long, Integer> wanted = quantities(request.items());
        Map<Long, Product> products =
                productRepository.findAllById(wanted.keySet()).stream()
                        .collect(Collectors.toMap(Product::getId, Function.identity()));
        for (Long productId : wanted.keySet()) {
            if (!products.containsKey(productId)) {
                throw new IllegalArgumentException("Product " + productId + " does not exist.");
            }
        }

        // Group order follows the order stalls appear in the cart
        Map<Long, List<Product>> byFarmer = new LinkedHashMap<>();
        for (Long productId : wanted.keySet()) {
            Product p = products.get(productId);
            byFarmer.computeIfAbsent(p.getFarmerId(), k -> new ArrayList<>()).add(p);
        }
        Map<Long, FarmerProfile> farmers =
                farmerRepository.findAllById(byFarmer.keySet()).stream()
                        .collect(Collectors.toMap(FarmerProfile::getId, Function.identity()));
        Map<Long, List<MarketOption>> markets = checkoutQueries.marketsOf(byFarmer.keySet());

        List<OrderGroupPreviewResource> groups = new ArrayList<>();
        byFarmer.forEach(
                (farmerId, lines) ->
                        groups.add(
                                previewGroup(
                                        farmerId,
                                        farmers.get(farmerId),
                                        lines,
                                        wanted,
                                        markets.getOrDefault(farmerId, List.of()))));
        return groups;
    }

    private static OrderGroupPreviewResource previewGroup(
            Long farmerId,
            FarmerProfile farmer,
            List<Product> lines,
            Map<Long, Integer> wanted,
            List<MarketOption> markets) {
        Set<String> problems = new LinkedHashSet<>();
        if (farmer == null || farmer.getApprovalStatus() != ApprovalStatus.APPROVED) {
            problems.add(STALL_SUSPENDED);
        }
        List<PreviewItemResource> items = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;
        for (Product p : lines) {
            int qty = wanted.get(p.getId());
            String problem = problemOf(p, qty);
            if (problem != null) {
                problems.add(problem);
            }
            BigDecimal lineTotal = p.getPrice().multiply(BigDecimal.valueOf(qty));
            subtotal = subtotal.add(lineTotal);
            items.add(
                    new PreviewItemResource(
                            p.getId(),
                            p.getName(),
                            p.getUnit(),
                            p.getPrice(),
                            qty,
                            lineTotal,
                            p.getStockQuantity(),
                            listed(p) ? p.getStatus().value() : UNAVAILABLE));
        }
        // C5-11: the pickup market is only pre-filled when the stall sells at exactly one market;
        // otherwise the cart lets the customer choose
        MarketOption only = markets.size() == 1 ? markets.getFirst() : null;
        return new OrderGroupPreviewResource(
                farmerId,
                farmer == null ? null : farmer.getStallName(),
                only == null ? null : only.marketId(),
                only == null ? null : only.marketName(),
                farmer == null ? 0 : farmer.getOrderCutoffHours(),
                items,
                subtotal,
                List.copyOf(problems),
                markets);
    }

    /** The issue with one cart line, or null. Same rule as {@link #sellable} at order time. */
    private static String problemOf(Product p, int quantity) {
        if (!listed(p) || p.getStatus() == ProductStatus.UNAVAILABLE) {
            return UNAVAILABLE;
        }
        if (p.getStatus() == ProductStatus.SOLD_OUT) {
            return SOLD_OUT;
        }
        return p.getStockQuantity() < quantity ? OUT_OF_STOCK : null;
    }

    /**
     * Still on the shelf: not yet soft-deleted by the Farmer, not yet hidden by an admin (FR-074).
     */
    private static boolean listed(Product p) {
        return !p.isDeleted() && !p.isHidden();
    }

    private static boolean sellable(Product p) {
        return listed(p) && p.getStatus() == ProductStatus.AVAILABLE;
    }

    /**
     * D-01 + D-02 + D-06. The whole place-order call runs in one transaction: either every order in
     * the cart is created and stock / slots are deducted, or nothing happens at all.
     *
     * <p>C5-2 — the shared locking order for every write path: every slot of the whole call first
     * (ascending id), then every product of the whole call in exactly one {@code lockAllById}
     * (ascending id). No slot / product row is read before it is locked — an unlocked read could be
     * a stale snapshot.
     */
    @Override
    @Transactional
    public List<PlacedOrderResource> place(long customerUserId, PlaceOrderRequest request) {
        User customer = requireBuyer(customerUserId);

        Map<Long, PickupSlot> slots = lockSlots(request.groups());
        Map<Long, Product> products = lockProducts(request.groups());

        LocalDateTime now = LocalDateTime.now(clock);
        List<PlacedOrderResource> placed = new ArrayList<>();
        for (OrderGroupInput group : request.groups()) {
            placed.add(placeGroup(customerUserId, customer, group, slots, products, now));
        }
        return placed;
    }

    private Map<Long, PickupSlot> lockSlots(List<OrderGroupInput> groups) {
        Map<Long, PickupSlot> locked = new HashMap<>();
        groups.stream()
                .map(OrderGroupInput::slotId)
                .filter(Objects::nonNull)
                .distinct()
                .sorted()
                .forEach(id -> slotRepository.lockById(id).ifPresent(s -> locked.put(id, s)));
        return locked;
    }

    private Map<Long, Product> lockProducts(List<OrderGroupInput> groups) {
        Set<Long> ids = new TreeSet<>();
        groups.forEach(g -> g.items().forEach(line -> ids.add(line.productId())));
        if (ids.isEmpty()) {
            return Map.of();
        }
        return productRepository.lockAllById(ids).stream()
                .collect(Collectors.toMap(Product::getId, Function.identity()));
    }

    /**
     * Everything is checked before anything is deducted: the slot and stock only change once this
     * group is certain to become an order. The slot and product rows are already-locked copies,
     * shared across groups, so two groups sharing a slot / a product see what the earlier group
     * already took.
     */
    private PlacedOrderResource placeGroup(
            long customerUserId,
            User customer,
            OrderGroupInput group,
            Map<Long, PickupSlot> slots,
            Map<Long, Product> products,
            LocalDateTime now) {
        FarmerProfile farmer =
                farmerRepository
                        .findById(group.farmerId())
                        .filter(f -> f.getApprovalStatus() == ApprovalStatus.APPROVED)
                        .orElseThrow(() -> new StallUnavailableException(group.farmerId()));
        PickupSlot slot = bookableSlot(group, farmer, slots);
        LocalDateTime cutoffAt =
                OrderLifecycle.cutoffAt(
                        group.pickupDate(), slot.getStartTime(), farmer.getOrderCutoffHours());
        if (!now.isBefore(cutoffAt)) {
            throw new CutoffPassedException();
        }
        if (slot.getBookedCount() >= slot.getMaxOrders()) {
            throw new SlotFullException(slot.getId());
        }

        Map<Long, Integer> wanted = quantities(group.items());
        for (Map.Entry<Long, Integer> line : wanted.entrySet()) {
            Product p = products.get(line.getKey());
            if (p == null) {
                throw new OutOfStockException(line.getKey(), null);
            }
            if (!p.getFarmerId().equals(farmer.getId())) {
                throw new IllegalArgumentException(
                        "Product " + p.getId() + " is not sold by this stall.");
            }
            if (!sellable(p) || p.getStockQuantity() < line.getValue()) {
                throw new OutOfStockException(p.getId(), p.getName());
            }
        }

        // Every check has passed: reserve the spot and deduct stock (written when the transaction
        // commits)
        slot.setBookedCount(slot.getBookedCount() + 1);
        BigDecimal total = BigDecimal.ZERO;
        List<OrderItem> items = new ArrayList<>();
        for (Map.Entry<Long, Integer> line : wanted.entrySet()) {
            Product p = products.get(line.getKey());
            int qty = line.getValue();
            int stockBefore = p.getStockQuantity();
            p.setStockQuantity(stockBefore - qty);
            adjustStatusForStockChange(p, stockBefore);
            BigDecimal subtotal = p.getPrice().multiply(BigDecimal.valueOf(qty));
            total = total.add(subtotal);
            items.add(OrderItem.snapshot(p, qty, subtotal));
        }

        Order order = new Order();
        order.setOrderCode(codeGenerator.next());
        order.setCustomerId(customerUserId);
        order.setFarmerId(farmer.getId());
        order.setMarketId(group.marketId());
        order.setSlotId(slot.getId());
        order.setPickupDate(group.pickupDate());
        order.setPickupStart(slot.getStartTime());
        order.setPickupEnd(slot.getEndTime());
        order.setCutoffAt(cutoffAt);
        order.setTotalAmount(total);
        order.setStatus(OrderStatus.PLACED);
        order.setCustomerNote(group.customerNote());
        Order saved = orderRepository.save(order);

        items.forEach(i -> i.setOrderId(saved.getId()));
        orderItemRepository.saveAll(items);
        history.record(saved.getId(), null, OrderStatus.PLACED, customerUserId, null);
        notifyOrderPlaced(saved, farmer, customer);

        return new PlacedOrderResource(
                saved.getId(),
                saved.getOrderCode(),
                saved.getStatus().value(),
                cutoffAt.atZone(clock.getZone()).toInstant().toString(),
                saved.getTotalAmount());
    }

    /**
     * C5-5: the slot must exist, be enabled, be on the right pickup day, and belong to the right
     * stall at the right market in the group — the stall–market link must still be on. Any mismatch
     * → 409 SLOT_UNAVAILABLE.
     */
    private PickupSlot bookableSlot(
            OrderGroupInput group, FarmerProfile farmer, Map<Long, PickupSlot> slots) {
        PickupSlot slot = group.slotId() == null ? null : slots.get(group.slotId());
        if (slot == null || !slot.isActive() || !slot.getSlotDate().equals(group.pickupDate())) {
            throw new SlotNotAvailableException();
        }
        boolean atThisStallAndMarket =
                farmerMarketRepository
                        .findById(slot.getFarmerMarketId())
                        .filter(FarmerMarket::isActive)
                        .filter(fm -> fm.getFarmerId().equals(farmer.getId()))
                        .filter(fm -> fm.getMarketId().equals(group.marketId()))
                        .isPresent();
        if (!atThisStallAndMarket) {
            throw new SlotNotAvailableException();
        }
        return slot;
    }

    /**
     * D-13: only customer and farmer can buy; an admin uses their own account. Hiding the button in
     * the FE is not enough. Returns the {@link User} because {@link #place} needs the customer's
     * name for the ORDER_PLACED notification (FR-042).
     */
    private User requireBuyer(long userId) {
        User user =
                userRepository
                        .findById(userId)
                        .orElseThrow(() -> new AccessDeniedException("Unknown account."));
        if (user.getRole() == RoleType.ADMIN) {
            throw new AccessDeniedException("Admin accounts cannot place orders.");
        }
        return user;
    }

    /** The same product appearing on several lines is summed; the cart's order is kept. */
    private static Map<Long, Integer> quantities(List<CartLine> lines) {
        return lines.stream()
                .collect(
                        Collectors.toMap(
                                CartLine::productId,
                                CartLine::quantity,
                                Integer::sum,
                                LinkedHashMap::new));
    }

    // ---------- FR-033, 036, 065: đọc đơn cho cả hai phía ----------

    /** {@code GET /orders}: mua của chính người gọi (buyer), mới nhất trước. */
    @Override
    @Transactional(readOnly = true)
    public PageResource<OrderListItemResource> myOrders(
            long userId, String status, int page, int pageSize) {
        String dbStatus = parseStatusOrNull(status);
        int safePage = Math.max(1, page);
        int safeSize = Math.min(MAX_PAGE_SIZE, Math.max(1, pageSize));
        return orderQueries.myOrders(userId, dbStatus, (safePage - 1) * safeSize, safeSize);
    }

    /**
     * {@code GET /orders/{id}}: người gọi phải là khách của đơn (customer_id) hoặc user của
     * farmer_profiles sở hữu đơn (D-13: Farmer cũng mua hàng) — sai cả hai thì {@link
     * OrderNotYoursException} (403), kể cả khi đơn có thật (Review focus #3, R-06). {@code
     * canCancel}/{@code canModify} chỉ đúng cho buyer; Farmer xem đơn của mình luôn thấy false.
     */
    @Override
    @Transactional(readOnly = true)
    public OrderDetailResource detail(long userId, long orderId) {
        OrderDetailRow row =
                orderQueries
                        .findDetail(orderId)
                        .orElseThrow(() -> new OrderNotFoundException(orderId));
        boolean isBuyer = row.customerId() == userId;
        boolean isOwningFarmer = row.farmerUserId() == userId;
        if (!isBuyer && !isOwningFarmer) {
            throw new OrderNotYoursException();
        }

        LocalDateTime now = LocalDateTime.now(clock);
        boolean canCancel =
                isBuyer && OrderLifecycle.canCustomerCancel(row.status(), row.cutoffAt(), now);
        boolean canModify =
                isBuyer && OrderLifecycle.canCustomerModify(row.status(), row.cutoffAt(), now);
        CustomerSummaryResource customer =
                isOwningFarmer
                        ? new CustomerSummaryResource(
                                row.customerId(),
                                row.customerFullName(),
                                row.customerPhone(),
                                row.customerEmail())
                        : null;

        return new OrderDetailResource(
                row.summary(),
                orderQueries.items(orderId),
                orderQueries.history(orderId),
                canCancel,
                canModify,
                row.customerNote(),
                row.farmerNote(),
                customer);
    }

    /** {@code GET /farmer/orders}: đơn đặt tại sạp của chính Farmer, theo giờ nhận hàng. */
    @Override
    @Transactional(readOnly = true)
    public PageResource<OrderListItemResource> farmerOrders(
            long userId, String status, LocalDate date, int page, int pageSize) {
        FarmerProfile profile =
                farmerRepository
                        .findByUserId(userId)
                        .orElseThrow(() -> new AccessDeniedException("No stall for this account."));
        String dbStatus = parseStatusOrNull(status);
        int safePage = Math.max(1, page);
        int safeSize = Math.min(MAX_PAGE_SIZE, Math.max(1, pageSize));
        return orderQueries.farmerOrders(
                profile.getId(), dbStatus, date, (safePage - 1) * safeSize, safeSize);
    }

    // ---------- FR-065, 066, 038: Farmer đổi trạng thái ----------

    @Override
    @Transactional
    public OrderDetailResource accept(long userId, long orderId) {
        Order order = lockOwnedOrder(userId, orderId);
        transition(order, OrderStatus.ACCEPTED, userId, null);
        notifyBuyer(order, NotificationKind.ORDER_ACCEPTED, Map.of());
        return detail(userId, orderId);
    }

    @Override
    @Transactional
    public OrderDetailResource decline(long userId, long orderId, String reason) {
        Order order = lockOwnedOrder(userId, orderId);
        order.setFarmerNote(reason);
        transition(order, OrderStatus.DECLINED, userId, reason);
        notifyBuyer(order, NotificationKind.ORDER_DECLINED, Map.of("reason", reason));
        return detail(userId, orderId);
    }

    @Override
    @Transactional
    public OrderDetailResource markReady(long userId, long orderId) {
        Order order = lockOwnedOrder(userId, orderId);
        transition(order, OrderStatus.READY, userId, null);
        notifyBuyer(order, NotificationKind.ORDER_READY, Map.of());
        return detail(userId, orderId);
    }

    @Override
    @Transactional
    public OrderDetailResource complete(long userId, long orderId) {
        Order order = lockOwnedOrder(userId, orderId);
        transition(order, OrderStatus.COMPLETED, userId, null);
        return detail(userId, orderId);
    }

    // ---------- FR-034, 035: khách huỷ và sửa đơn của chính mình trước cutoff ----------

    /**
     * C5-18: sai trạng thái (khác {@code placed}/{@code accepted}) → {@link
     * InvalidOrderTransitionException} (409 INVALID_TRANSITION); trạng thái đúng nhưng quá {@code
     * cutoffAt} → {@link CutoffPassedException} (409 CUTOFF_PASSED) — hai lý do tách riêng, không
     * gộp chung một exception như {@link OrderLifecycle#canCustomerCancel} trả về boolean.
     */
    @Override
    @Transactional
    public OrderDetailResource cancel(long userId, long orderId) {
        Order order = loadOwnedByCustomer(userId, orderId);
        assertCustomerCanStillAct(order, OrderStatus.CANCELLED);
        transition(order, OrderStatus.CANCELLED, userId, null);
        notifyFarmer(order, NotificationKind.ORDER_CANCELLED, Map.of());
        return detail(userId, orderId);
    }

    /**
     * D-07 — chỉ giảm số lượng hoặc bỏ item, không bao giờ thêm sản phẩm mới: tính chênh lệch từng
     * sản phẩm rồi cộng/trừ tồn đúng phần chênh lệch. Huỷ rồi đặt lại sẽ nhả tồn ra cho người khác
     * cướp mất giữa chừng, và đổi cả {@code order_code} — không phải thứ khách vừa sửa muốn thấy.
     *
     * <p>C5-2/C5-18 — thứ tự khoá: đơn ({@link #loadOwnedByCustomer}) → slot (nếu có, dù nhánh này
     * không đổi {@code booked_count}) → sản phẩm hiện có trong đơn, một lần {@code lockAllById}, id
     * tăng dần ({@link ProductRepository#lockAllById} tự sắp theo id).
     */
    @Override
    @Transactional
    public OrderDetailResource modifyItems(long userId, long orderId, ModifyOrderRequest request) {
        Order order = loadOwnedByCustomer(userId, orderId);
        assertCustomerCanStillAct(order, OrderStatus.PLACED);

        if (order.getSlotId() != null) {
            slotRepository.lockById(order.getSlotId());
        }

        Map<Long, OrderItem> existing =
                orderItemRepository.findByOrderId(orderId).stream()
                        .collect(Collectors.toMap(OrderItem::getProductId, Function.identity()));
        Map<Long, Integer> wanted =
                request.items().stream()
                        .collect(
                                Collectors.toMap(
                                        CartLine::productId, CartLine::quantity, Integer::sum));
        for (Long productId : wanted.keySet()) {
            if (!existing.containsKey(productId)) {
                throw new ProductNotInOrderException(productId);
            }
        }

        List<Product> products = productRepository.lockAllById(new TreeSet<>(existing.keySet()));
        BigDecimal total = BigDecimal.ZERO;
        int remainingItems = 0;
        for (Product p : products) {
            OrderItem item = existing.get(p.getId());
            int before = item.getQuantity();
            int after = wanted.getOrDefault(p.getId(), 0);
            int delta = after - before;

            if (delta > 0 && !canRaiseBy(p, delta)) {
                throw new OutOfStockException(p.getId(), p.getName());
            }
            if (delta != 0) {
                int stockBefore = p.getStockQuantity();
                p.setStockQuantity(stockBefore - delta);
                adjustStatusForStockChange(p, stockBefore);
            }

            if (after == 0) {
                orderItemRepository.delete(item);
            } else {
                remainingItems++;
                item.setQuantity(after);
                item.setSubtotal(item.getUnitPrice().multiply(BigDecimal.valueOf(after)));
                orderItemRepository.save(item);
                total = total.add(item.getSubtotal());
            }
        }
        // C5: mọi "xoá rồi đọc lại trong cùng transaction" phải flush() sau xoá — order_items vừa
        // xoá/sửa phải chắc chắn ra khỏi persistence context trước khi transition() bên dưới (nhánh
        // huỷ đơn) tự đọc lại order_items để hoàn tồn kho, kẻo hoàn tồn hai lần cho sản phẩm vừa bị
        // bỏ khỏi đơn ở vòng lặp trên.
        orderItemRepository.flush();

        if (remainingItems == 0) {
            // M-1: bỏ hết item mới là huỷ đơn — KHÔNG phải "total == 0", giá 0₫ hợp lệ (một món
            // miễn phí vẫn còn hàng trong đơn). Đừng để lại một đơn rỗng không món nào.
            transition(order, OrderStatus.CANCELLED, userId, "All items removed.");
            notifyFarmer(order, NotificationKind.ORDER_CANCELLED, Map.of());
            return detail(userId, orderId);
        }

        order.setTotalAmount(total);
        if (order.getStatus() == OrderStatus.ACCEPTED) {
            transition(order, OrderStatus.PLACED, userId, "Customer changed the order.");
        } else {
            // Trạng thái không đổi (vẫn placed): không đi qua transition() — không ghi lịch sử vì
            // không có gì chuyển. flush() thủ công vì detail() đọc lại bằng JDBC thô (C5-15/17).
            orderRepository.save(order);
            orderRepository.flush();
        }
        return detail(userId, orderId);
    }

    /**
     * I-3/FR-064: tăng số lượng dùng đúng luật "bán được" như {@link #place} ({@link #sellable} —
     * loại cả {@code sold_out} do Farmer tự đặt dù còn tồn, không chỉ {@code unavailable}) và đủ
     * tồn. Giảm/bỏ không đi qua hàm này — luôn được phép bất kể trạng thái.
     */
    private static boolean canRaiseBy(Product p, int delta) {
        return sellable(p) && p.getStockQuantity() >= delta;
    }

    /**
     * I-3/FR-064 — luật tự động chuyển trạng thái do tồn kho đổi, dùng chung cho {@link
     * #placeGroup}, {@link #modifyItems} và nhánh hoàn tồn kho của {@link #transition}: AVAILABLE →
     * SOLD_OUT khi tồn về 0; SOLD_OUT → AVAILABLE CHỈ khi tồn TRƯỚC lúc đổi ({@code stockBefore})
     * đúng bằng 0 (sold_out do hết hàng thật, không phải Farmer tự đặt trong lúc còn tồn — Review
     * focus I-3); UNAVAILABLE (Farmer tạm ngưng bán) không bao giờ tự đổi, bất kể tồn kho.
     */
    private static void adjustStatusForStockChange(Product p, int stockBefore) {
        if (p.getStatus() == ProductStatus.UNAVAILABLE) {
            return;
        }
        if (p.getStockQuantity() == 0) {
            p.setStatus(ProductStatus.SOLD_OUT);
        } else if (p.getStatus() == ProductStatus.SOLD_OUT && stockBefore == 0) {
            p.setStatus(ProductStatus.AVAILABLE);
        }
    }

    /**
     * C5-8: khoá dòng đơn (PESSIMISTIC_WRITE) trước khi đọc bất kỳ field nào. Chỉ người mua ({@code
     * customer_id}) mới được huỷ / sửa đơn của chính mình — kể cả Farmer đang phục vụ đơn đó cũng
     * không được đi qua cửa này (403). Đơn không tồn tại → 404.
     */
    private Order loadOwnedByCustomer(long userId, long orderId) {
        Order order =
                orderRepository
                        .lockById(orderId)
                        .orElseThrow(() -> new OrderNotFoundException(orderId));
        if (order.getCustomerId() != userId) {
            throw new OrderNotYoursException();
        }
        return order;
    }

    /**
     * Tách rõ hai lý do 409 của C5-18: sai trạng thái trước ({@code intendedTo} chỉ để lời nhắn dễ
     * hiểu hơn — huỷ hay sửa đều chỉ cho phép từ {@code placed}/{@code accepted}), rồi mới tới quá
     * giờ chốt.
     */
    private void assertCustomerCanStillAct(Order order, OrderStatus intendedTo) {
        if (order.getStatus() != OrderStatus.PLACED && order.getStatus() != OrderStatus.ACCEPTED) {
            throw new InvalidOrderTransitionException(order.getStatus(), intendedTo);
        }
        if (!LocalDateTime.now(clock).isBefore(order.getCutoffAt())) {
            throw new CutoffPassedException(order.getId());
        }
    }

    /**
     * C5-8: khoá dòng đơn trước tiên — mọi đường đổi trạng thái đi qua đây trước khi làm gì khác.
     * Sai chủ (kể cả tài khoản không có {@code farmer_profiles}) → {@link OrderNotYoursException}
     * (403, R-06); đơn không tồn tại → {@link OrderNotFoundException} (404). D-09: KHÔNG kiểm
     * {@code approval_status} ở đây — Farmer bị đình chỉ vẫn phải xong được đơn đã nhận trước đó
     * (Review focus #5).
     */
    private Order lockOwnedOrder(long farmerUserId, long orderId) {
        Order order =
                orderRepository
                        .lockById(orderId)
                        .orElseThrow(() -> new OrderNotFoundException(orderId));
        FarmerProfile farmer =
                farmerRepository
                        .findByUserId(farmerUserId)
                        .orElseThrow(OrderNotYoursException::new);
        if (!farmer.getId().equals(order.getFarmerId())) {
            throw new OrderNotYoursException();
        }
        return order;
    }

    /**
     * Một cửa duy nhất cho mọi lần đổi trạng thái. Nhờ vậy FR-038 (ghi lịch sử) và D-02 (hoàn tồn
     * kho) không thể bị quên ở một nhánh nào đó: quên gọi hàm này thì trạng thái cũng không đổi.
     *
     * <p>C5-2 — thứ tự khoá của đường này: đơn đã khoá trước (bởi {@link #lockOwnedOrder}) → khoá
     * slot (nếu có) → khoá sản phẩm, đảo ngược so với bản nháp ban đầu của task (khoá sản phẩm rồi
     * mới khoá slot) theo phán quyết C5-2.
     *
     * <p>{@code flush()} cuối cùng: {@link #detail} đọc qua {@code OrderQueryRepository} bằng JDBC
     * thô, tách khỏi persistence context của JPA — không flush thì thay đổi vừa làm ở đây (status,
     * farmer_note, tồn kho, booked_count) chưa chắc chắn hiện ra khi bốn method public bên trên gọi
     * lại {@link #detail} để dựng response ngay trong cùng transaction.
     *
     * <p>C5-17: KHÔNG {@code @Transactional} ở đây. Method này chỉ được gọi self-invoked
     * (this.transition(...)) từ bên trong chính lớp — lời gọi không đi qua Spring proxy, nên
     * {@code @Transactional} trên một method private/self-invoked không tạo ra ranh giới
     * transaction nào cả (Spring bỏ qua nó trong im lặng); annotation đó chỉ hứa hẹn atomicity giả.
     * Method này BẮT BUỘC chỉ được gọi từ bên trong transaction của chính method
     * public @Transactional đang gọi nó (accept/decline/ markReady/complete hôm nay; cancel/modify
     * của Task 5.6 sau này cũng vậy) — bản thân nó không tự mở transaction.
     */
    private Order transition(Order order, OrderStatus to, long actorUserId, String note) {
        OrderStatus from = order.getStatus();
        OrderLifecycle.assertTransition(from, to);

        if (OrderLifecycle.restoresStock(to)) {
            if (order.getSlotId() != null) {
                slotRepository
                        .lockById(order.getSlotId())
                        .ifPresent(s -> s.setBookedCount(Math.max(0, s.getBookedCount() - 1)));
            }
            List<OrderItem> items = orderItemRepository.findByOrderId(order.getId());
            List<Product> products =
                    productRepository.lockAllById(
                            items.stream().map(OrderItem::getProductId).toList());
            Map<Long, Integer> qty =
                    items.stream()
                            .collect(
                                    Collectors.toMap(
                                            OrderItem::getProductId, OrderItem::getQuantity));
            for (Product p : products) {
                int stockBefore = p.getStockQuantity();
                p.setStockQuantity(stockBefore + qty.get(p.getId()));
                adjustStatusForStockChange(p, stockBefore);
            }
        }

        order.setStatus(to);
        orderRepository.save(order);
        history.record(order.getId(), from, to, actorUserId, note);
        orderRepository.flush();
        return order;
    }

    // ---------- FR-042/D-11: thông báo mốc đơn hàng ----------

    /**
     * Farmer nhận việc khi khách đặt xong — {@code farmer} đã có sẵn trong scope của {@link
     * #placeGroup} (đã lọc APPROVED ở trên), không cần truy vấn lại. Người nhận là {@code
     * farmer_profiles.user_id}, không phải {@code farmer_profiles.id} (C5-19). Link mang id số của
     * đơn (I-1) — route FE {@code farmer/orders/:code} vẫn giữ tên tham số cũ, người nối trang sẽ
     * đọc nó như id.
     */
    private void notifyOrderPlaced(Order order, FarmerProfile farmer, User customer) {
        notifications.dispatch(
                List.of(farmer.getUserId()),
                NotificationEvent.of(
                        NotificationKind.ORDER_PLACED,
                        "/farmer/orders/" + order.getId(),
                        Map.of("order", order.getOrderCode(), "customer", customer.getFullName())));
    }

    /**
     * Khách nhận tin khi Farmer đổi trạng thái đơn của chính mình (accept/decline/ready) — link
     * mang id số của đơn (I-1), route FE {@code orders/:code} vẫn giữ tên tham số cũ.
     */
    private void notifyBuyer(Order order, NotificationKind kind, Map<String, String> extra) {
        Map<String, String> params = new HashMap<>(extra);
        params.put("order", order.getOrderCode());
        farmerRepository
                .findById(order.getFarmerId())
                .ifPresent(f -> params.put("stall", f.getStallName()));
        notifications.dispatch(
                List.of(order.getCustomerId()),
                NotificationEvent.of(kind, "/orders/" + order.getId(), params));
    }

    /**
     * Farmer nhận tin khi khách huỷ đơn của chính mình — link mang id số của đơn (I-1), route FE
     * {@code farmer/orders/:code} vẫn giữ tên tham số cũ.
     */
    private void notifyFarmer(Order order, NotificationKind kind, Map<String, String> extra) {
        farmerRepository
                .findById(order.getFarmerId())
                .ifPresent(
                        f -> {
                            Map<String, String> params = new HashMap<>(extra);
                            params.put("order", order.getOrderCode());
                            notifications.dispatch(
                                    List.of(f.getUserId()),
                                    NotificationEvent.of(
                                            kind, "/farmer/orders/" + order.getId(), params));
                        });
    }

    /**
     * Whitelist qua {@link OrderStatus#valueOf} — giá trị lạ là request sai hình dạng → 400, không
     * bao giờ nối chuỗi vào SQL (R-04).
     */
    private static String parseStatusOrNull(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return OrderStatus.valueOf(raw.trim().toUpperCase(Locale.ROOT)).value();
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Unknown order status: " + raw);
        }
    }
}
