package com.techx.intervue.modules.order.services.impl;

import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.order.entities.Order;
import com.techx.intervue.modules.order.entities.OrderItem;
import com.techx.intervue.modules.order.enums.OrderStatus;
import com.techx.intervue.modules.order.exceptions.CutoffPassedException;
import com.techx.intervue.modules.order.exceptions.OutOfStockException;
import com.techx.intervue.modules.order.exceptions.SlotFullException;
import com.techx.intervue.modules.order.exceptions.SlotNotAvailableException;
import com.techx.intervue.modules.order.exceptions.StallUnavailableException;
import com.techx.intervue.modules.order.repositories.CheckoutQueryRepository;
import com.techx.intervue.modules.order.repositories.OrderItemRepository;
import com.techx.intervue.modules.order.repositories.OrderRepository;
import com.techx.intervue.modules.order.requests.CartLine;
import com.techx.intervue.modules.order.requests.OrderGroupInput;
import com.techx.intervue.modules.order.requests.PlaceOrderRequest;
import com.techx.intervue.modules.order.requests.PreviewRequest;
import com.techx.intervue.modules.order.resources.OrderGroupPreviewResource;
import com.techx.intervue.modules.order.resources.OrderGroupPreviewResource.MarketOption;
import com.techx.intervue.modules.order.resources.PlacedOrderResource;
import com.techx.intervue.modules.order.resources.PreviewItemResource;
import com.techx.intervue.modules.order.services.interfaces.OrderServiceInterface;
import com.techx.intervue.modules.product.entities.Product;
import com.techx.intervue.modules.product.entities.ProductDailyStock;
import com.techx.intervue.modules.product.enums.ProductStatus;
import com.techx.intervue.modules.product.repositories.ProductDailyStockRepository;
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
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
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
    private final Clock clock;
    private final ProductDailyStockRepository dailyStockRepository;

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
        requireBuyer(customerUserId);

        Map<Long, PickupSlot> slots = lockSlots(request.groups());
        Map<String, ProductDailyStock> dailyStock = lockDailyStock(request.groups());
        Map<Long, Product> products = findProducts(request.groups());

        LocalDateTime now = LocalDateTime.now(clock);
        List<PlacedOrderResource> placed = new ArrayList<>();
        for (OrderGroupInput group : request.groups()) {
            placed.add(placeGroup(customerUserId, group, slots, dailyStock, products, now));
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

    private Map<Long, Product> findProducts(List<OrderGroupInput> groups) {
        Set<Long> ids = new TreeSet<>();
        groups.forEach(g -> g.items().forEach(line -> ids.add(line.productId())));
        if (ids.isEmpty()) {
            return Map.of();
        }
        return productRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(Product::getId, Function.identity()));
    }

    /**
     * D-02 applied per pickup date: creates whatever daily-stock row is still missing (never
     * overwriting one that already exists), then locks it by its natural key in the same call that
     * reads it — the C5-2 anti-deadlock rule for products/slots was "ascending id order"; a fresh
     * row has no id yet before it is created, so the equivalent here is a fixed, deterministic
     * order over (productId, date) pairs, applied by every transaction the same way. Deliberately
     * does not do an unlocked find first to collect ids and lock in one batched call afterward:
     * Hibernate's first-level cache would then hand back the entity already loaded by that earlier
     * unlocked read instead of the value the lock just read, defeating the lock (reproduced live:
     * two concurrent orders for the last unit both succeeded before this fix).
     */
    private Map<String, ProductDailyStock> lockDailyStock(List<OrderGroupInput> groups) {
        record Need(Long productId, LocalDate date) {}
        Set<Need> needed =
                new TreeSet<>(Comparator.comparing(Need::productId).thenComparing(Need::date));
        groups.forEach(
                g ->
                        g.items()
                                .forEach(
                                        line ->
                                                needed.add(
                                                        new Need(
                                                                line.productId(),
                                                                g.pickupDate()))));

        Map<String, ProductDailyStock> locked = new HashMap<>();
        for (Need n : needed) {
            int dayOfWeek = n.date().getDayOfWeek().getValue() % 7;
            dailyStockRepository.materialize(n.productId(), n.date(), dayOfWeek);
            dailyStockRepository
                    .lockByProductIdAndStockDate(n.productId(), n.date())
                    .ifPresent(
                            row ->
                                    locked.put(
                                            dailyStockKey(row.getProductId(), row.getStockDate()),
                                            row));
        }
        return locked;
    }

    private static String dailyStockKey(Long productId, LocalDate date) {
        return productId + "@" + date;
    }

    /**
     * Everything is checked before anything is deducted: the slot and stock only change once this
     * group is certain to become an order. The slot and product rows are already-locked copies,
     * shared across groups, so two groups sharing a slot / a product see what the earlier group
     * already took.
     */
    private PlacedOrderResource placeGroup(
            long customerUserId,
            OrderGroupInput group,
            Map<Long, PickupSlot> slots,
            Map<String, ProductDailyStock> dailyStock,
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
            ProductDailyStock row = dailyStock.get(dailyStockKey(p.getId(), group.pickupDate()));
            if (!sellable(p) || row == null || row.getQuantityAvailable() < line.getValue()) {
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
            ProductDailyStock row = dailyStock.get(dailyStockKey(p.getId(), group.pickupDate()));
            int qty = line.getValue();
            row.setQuantityAvailable(row.getQuantityAvailable() - qty);
            BigDecimal subtotal = row.getUnitPrice().multiply(BigDecimal.valueOf(qty));
            total = total.add(subtotal);
            items.add(OrderItem.snapshot(p, row.getUnitPrice(), qty, subtotal));
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
     * the FE is not enough.
     */
    private void requireBuyer(long userId) {
        User user =
                userRepository
                        .findById(userId)
                        .orElseThrow(() -> new AccessDeniedException("Unknown account."));
        if (user.getRole() == RoleType.ADMIN) {
            throw new AccessDeniedException("Admin accounts cannot place orders.");
        }
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
}
