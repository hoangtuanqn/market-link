package com.techx.intervue.modules.order.services.impl;

import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.favorite.services.impl.RestockNotifier;
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

    static final String AUTO_COMPLETE_NOTE = "Auto-completed after pickup.";

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
    private final RestockNotifier restock;

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

    // ---------- FR-033, 036, 065: reading orders for both sides ----------

    /** {@code GET /orders}: the caller's own purchases (buyer), newest first. */
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
     * {@code GET /orders/{id}}: the caller must be the order's customer (customer_id) or the user
     * of the farmer_profiles row that owns it (D-13: a Farmer also buys) — neither → {@link
     * OrderNotYoursException} (403), even when the order exists (Review focus #3, R-06). {@code
     * canCancel}/{@code canModify} are only true for the buyer; a Farmer viewing their own order
     * always sees false.
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
                customer,
                orderQueries.reviewed(orderId));
    }

    /** {@code GET /farmer/orders}: orders placed at the Farmer's own stall, by pickup time. */
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

    // ---------- FR-065, 066, 038: the Farmer changes the status ----------

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

    // ---------- FR-034, 035: the customer cancels / edits their own order before cutoff ----------

    /**
     * C5-18: wrong status (not {@code placed}/{@code accepted}) → {@link
     * InvalidOrderTransitionException} (409 INVALID_TRANSITION); right status but past {@code
     * cutoffAt} → {@link CutoffPassedException} (409 CUTOFF_PASSED) — two separate reasons, not
     * merged into one exception the way {@link OrderLifecycle#canCustomerCancel} returns a boolean.
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
     * D-07 — only lower quantities or drop items, never add a new product: compute each product's
     * difference, then add/subtract exactly that difference from stock. Cancelling and re-placing
     * would release the stock for someone else to grab in between, and would also change the {@code
     * order_code} — not what a customer who just edited wants to see.
     *
     * <p>C5-2/C5-18 — lock order: order ({@link #loadOwnedByCustomer}) → slot (if any, even though
     * this path does not change {@code booked_count}) → the products currently in the order, one
     * {@code lockAllById}, ascending id ({@link ProductRepository#lockAllById} sorts by id itself).
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
                // FR-041: lowering a quantity gives stock back
                restock.onStockRose(p.getId(), stockBefore, p.getStockQuantity());
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
        // C5: every "delete then read again in the same transaction" must flush() after the
        // delete — the order_items just deleted/changed must be out of the persistence context
        // before transition() below (the cancel branch) reads order_items again to restore stock,
        // or stock would be restored twice for a product just dropped from the order above.
        orderItemRepository.flush();

        if (remainingItems == 0) {
            // M-1: dropping every item is what cancels the order — NOT "total == 0", a 0₫ price is
            // valid (a free item still leaves something in the order). Never leave an empty order.
            transition(order, OrderStatus.CANCELLED, userId, "All items removed.");
            notifyFarmer(order, NotificationKind.ORDER_CANCELLED, Map.of());
            return detail(userId, orderId);
        }

        order.setTotalAmount(total);
        if (order.getStatus() == OrderStatus.ACCEPTED) {
            transition(order, OrderStatus.PLACED, userId, "Customer changed the order.");
        } else {
            // Status unchanged (still placed): do not go through transition() — no history,
            // nothing moved. Manual flush() because detail() reads back with raw JDBC (C5-15/17).
            orderRepository.save(order);
            orderRepository.flush();
        }
        return detail(userId, orderId);
    }

    /**
     * I-3/FR-064: raising a quantity uses exactly the same "sellable" rule as {@link #place}
     * ({@link #sellable} — also excludes a {@code sold_out} the Farmer set while stock remains, not
     * only {@code unavailable}) plus enough stock. Lowering/dropping does not go through here — it
     * is always allowed whatever the status.
     */
    private static boolean canRaiseBy(Product p, int delta) {
        return sellable(p) && p.getStockQuantity() >= delta;
    }

    /**
     * I-3/FR-064 — the rule for automatic status changes caused by a stock change, shared by {@link
     * #placeGroup}, {@link #modifyItems} and the stock-restoring branch of {@link #transition}:
     * AVAILABLE → SOLD_OUT when stock reaches 0; SOLD_OUT → AVAILABLE ONLY when the stock BEFORE
     * the change ({@code stockBefore}) was exactly 0 (sold out because it really ran out, not set
     * by the Farmer while stock remained — Review focus I-3); UNAVAILABLE (the Farmer paused
     * selling) never changes on its own, whatever the stock.
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
     * C5-8: locks the order row (PESSIMISTIC_WRITE) before reading any field. Only the buyer
     * ({@code customer_id}) may cancel / edit their own order — not even the Farmer serving that
     * order may come through this door (403). Missing order → 404.
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
     * Keeps the two 409 reasons of C5-18 apart: wrong status first ({@code intendedTo} only makes
     * the message clearer — cancelling and editing are both only allowed from {@code placed}/{@code
     * accepted}), then past the cutoff.
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
     * C5-8: locks the order row first — every status change path goes through here before doing
     * anything else. Wrong owner (including an account without {@code farmer_profiles}) → {@link
     * OrderNotYoursException} (403, R-06); missing order → {@link OrderNotFoundException} (404).
     * D-09: do NOT check {@code approval_status} here — a suspended Farmer must still be able to
     * finish orders accepted before (Review focus #5).
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
     * The single door for every status change. That way FR-038 (writing history) and D-02
     * (restoring stock) cannot be forgotten on some branch: forget to call this and the status does
     * not change either.
     *
     * <p>C5-2 — this path's lock order: the order is already locked (by {@link #lockOwnedOrder}) →
     * lock the slot (if any) → lock the products, the reverse of the task's original draft
     * (products first, then the slot) per ruling C5-2.
     *
     * <p>The final {@code flush()}: {@link #detail} reads through {@code OrderQueryRepository} with
     * raw JDBC, separate from the JPA persistence context — without a flush the changes made here
     * (status, farmer_note, stock, booked_count) are not guaranteed to show up when the public
     * methods above call {@link #detail} again to build the response in the same transaction.
     *
     * <p>C5-17: NO {@code @Transactional} here. This method is only ever self-invoked
     * (this.transition(...)) from inside the class — the call does not go through the Spring proxy,
     * so {@code @Transactional} on a private/self-invoked method creates no transaction boundary at
     * all (Spring silently ignores it); the annotation would only promise a fake atomicity. This
     * method MUST only be called inside the transaction of the public @Transactional method calling
     * it (accept/decline/markReady/complete, cancel/modifyItems) — it never opens a transaction
     * itself.
     */
    private Order transition(Order order, OrderStatus to, Long actorUserId, String note) {
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
                restock.onStockRose(p.getId(), stockBefore, p.getStockQuantity());
            }
        }

        order.setStatus(to);
        orderRepository.save(order);
        history.record(order.getId(), from, to, actorUserId, note);
        orderRepository.flush();
        return order;
    }

    // ---------- FR-042/D-11: order milestone notifications ----------

    /**
     * The Farmer gets the work once the customer has placed the order — {@code farmer} is already
     * in scope in {@link #placeGroup} (filtered to APPROVED above), no need to query again. The
     * recipient is {@code farmer_profiles.user_id}, not {@code farmer_profiles.id} (C5-19). The
     * link carries the order's numeric id (I-1) — the FE route {@code farmer/orders/:code} keeps
     * its old parameter name; whoever wires the page will read it as the id.
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
     * The customer is told when the Farmer changes the status of their order (accept/decline/ready)
     * — the link carries the order's numeric id (I-1), the FE route {@code orders/:code} keeps its
     * old parameter name.
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
     * The Farmer is told when the customer cancels their own order — the link carries the order's
     * numeric id (I-1), the FE route {@code farmer/orders/:code} keeps its old parameter name.
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
     * Whitelisted through {@link OrderStatus#valueOf} — an unknown value is a malformed request →
     * 400, never concatenated into SQL (R-04).
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

    /**
     * FR-037 — read-only: nothing is locked or reserved; the suggested cart goes through preview
     * and place like any other cart. Only the buyer may reorder (403), a missing order is 404.
     */
    @Override
    @Transactional(readOnly = true)
    public List<CartLine> reorder(long userId, long orderId) {
        Order order =
                orderRepository
                        .findById(orderId)
                        .orElseThrow(() -> new OrderNotFoundException(orderId));
        if (order.getCustomerId() != userId) {
            throw new OrderNotYoursException();
        }
        List<OrderItem> lines = orderItemRepository.findByOrderId(orderId);
        Map<Long, Product> byId =
                productRepository
                        .findAllById(lines.stream().map(OrderItem::getProductId).toList())
                        .stream()
                        .collect(Collectors.toMap(Product::getId, Function.identity()));
        List<CartLine> cart = new ArrayList<>();
        for (OrderItem line : lines) {
            Product p = byId.get(line.getProductId());
            // Same "can be bought" rule as place: deleted, hidden, paused or empty lines drop out
            if (p == null || !sellable(p) || p.getStockQuantity() <= 0) {
                continue;
            }
            cart.add(new CartLine(p.getId(), Math.min(line.getQuantity(), p.getStockQuantity())));
        }
        return cart;
    }

    /**
     * FR-039 / D-03 — the system completes a ready order once the pickup window is 24 hours behind
     * it. The order row is locked and re-read (C5-8), so an order a farmer moved meanwhile is left
     * alone. No actor on the history row and no notification (completing notifies nobody).
     */
    @Override
    @Transactional
    public boolean autoComplete(long orderId) {
        Order order = orderRepository.lockById(orderId).orElse(null);
        if (order == null || order.getStatus() != OrderStatus.READY) {
            return false;
        }
        transition(order, OrderStatus.COMPLETED, null, AUTO_COMPLETE_NOTE);
        return true;
    }
}
