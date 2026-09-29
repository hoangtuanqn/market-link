package com.techx.intervue.modules.order.services.impl;

import com.techx.intervue.modules.catalog.services.impl.ShelfLifePolicy;
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
import com.techx.intervue.resources.PageResource;
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
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.TreeSet;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.AllArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    private final Clock clock;
    private final ProductDailyStockRepository dailyStockRepository;
    private final ProductAvailabilityResolver availability;
    private final OrderQueryRepository orderQueries;
    private final NotificationServiceInterface notifications;
    private final RestockNotifier restock;

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

        Map<Long, List<Product>> byFarmer = new LinkedHashMap<>();
        for (Long productId : wanted.keySet()) {
            Product p = products.get(productId);
            byFarmer.computeIfAbsent(p.getFarmerId(), k -> new ArrayList<>()).add(p);
        }
        Map<Long, FarmerProfile> farmers =
                farmerRepository.findAllById(byFarmer.keySet()).stream()
                        .collect(Collectors.toMap(FarmerProfile::getId, Function.identity()));
        Map<Long, List<MarketOption>> markets = checkoutQueries.marketsOf(byFarmer.keySet());
        Map<Long, LocalDate> pickupDates = request.pickupDateByFarmer();
        Map<Long, BigDecimal> undated = new HashMap<>();
        Map<Long, Map<Long, BigDecimal>> datedByFarmer = new HashMap<>();
        for (Product p : products.values()) {
            if (pickupDates.containsKey(p.getFarmerId())) {
                datedByFarmer
                        .computeIfAbsent(p.getFarmerId(), f -> new HashMap<>())
                        .put(p.getId(), p.getPrice());
            } else {
                undated.put(p.getId(), p.getPrice());
            }
        }
        Map<Long, ProductAvailabilityResolver.Availability> resolved =
                new HashMap<>(availability.resolve(undated));
        datedByFarmer.forEach(
                (farmerId, prices) ->
                        resolved.putAll(
                                availability.onDate(farmerId, prices, pickupDates.get(farmerId))));

        List<OrderGroupPreviewResource> groups = new ArrayList<>();
        byFarmer.forEach(
                (farmerId, lines) ->
                        groups.add(
                                previewGroup(
                                        farmerId,
                                        farmers.get(farmerId),
                                        lines,
                                        wanted,
                                        markets.getOrDefault(farmerId, List.of()),
                                        resolved)));
        return groups;
    }

    private static OrderGroupPreviewResource previewGroup(
            Long farmerId,
            FarmerProfile farmer,
            List<Product> lines,
            Map<Long, Integer> wanted,
            List<MarketOption> markets,
            Map<Long, ProductAvailabilityResolver.Availability> resolved) {
        Set<String> problems = new LinkedHashSet<>();
        if (farmer == null || farmer.getApprovalStatus() != ApprovalStatus.APPROVED) {
            problems.add(STALL_SUSPENDED);
        }
        List<PreviewItemResource> items = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;
        for (Product p : lines) {
            int qty = wanted.get(p.getId());
            ProductAvailabilityResolver.Availability a = resolved.get(p.getId());
            int available = a == null ? 0 : a.quantity();
            BigDecimal unitPrice = a == null ? p.getPrice() : a.price();
            String problem = problemOf(p, qty, available);
            if (problem != null) {
                problems.add(problem);
            }
            BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(qty));
            subtotal = subtotal.add(lineTotal);
            ProductAvailabilityResolver.Deal deal = a == null ? null : a.deal();
            LocalDate bestBefore =
                    a == null
                            ? null
                            : deal != null
                                    ? deal.bestBefore()
                                    : ShelfLifePolicy.bestBefore(a.date(), p.getShelfLifeDays());
            items.add(
                    new PreviewItemResource(
                            p.getId(),
                            p.getName(),
                            p.getUnit(),
                            unitPrice,
                            qty,
                            lineTotal,
                            available,
                            listed(p) ? p.getStatus().value() : UNAVAILABLE,
                            deal == null ? null : deal.listPrice(),
                            deal == null ? null : deal.discountPercent(),
                            bestBefore == null ? null : bestBefore.toString(),
                            p.getStorageMode().value()));
        }
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

    private static String problemOf(Product p, int quantity, int available) {
        if (!listed(p) || p.getStatus() == ProductStatus.UNAVAILABLE) {
            return UNAVAILABLE;
        }
        if (p.getStatus() == ProductStatus.SOLD_OUT) {
            return SOLD_OUT;
        }
        return available < quantity ? OUT_OF_STOCK : null;
    }

    private static boolean listed(Product p) {
        return !p.isDeleted() && !p.isHidden();
    }

    private static boolean sellable(Product p) {
        return listed(p) && p.getStatus() == ProductStatus.AVAILABLE;
    }

    @Override
    @Transactional
    public List<PlacedOrderResource> place(long customerUserId, PlaceOrderRequest request) {
        User customer = requireBuyer(customerUserId);

        Map<Long, PickupSlot> slots = lockSlots(request.groups());
        Map<String, ProductDailyStock> dailyStock = lockDailyStock(request.groups());
        Map<Long, Product> products = findProducts(request.groups());

        LocalDateTime now = LocalDateTime.now(clock);
        List<PlacedOrderResource> placed = new ArrayList<>();
        for (OrderGroupInput group : request.groups()) {
            placed.add(
                    placeGroup(customerUserId, customer, group, slots, dailyStock, products, now));
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
            materializeAndLock(n.productId(), n.date())
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

    private PlacedOrderResource placeGroup(
            long customerUserId,
            User customer,
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
            OrderItem item =
                    OrderItem.snapshot(p, row.getUnitPrice(), qty, subtotal, group.pickupDate());
            if (row.hasDeal()) {
                item.setListPrice(row.getListPrice());
                item.setBestBefore(row.getBestBefore());
            }
            items.add(item);
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
        if (!atThisStallAndMarket || !slotRepository.isOnOpenDay(slot.getId())) {
            throw new SlotNotAvailableException();
        }
        return slot;
    }

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

    private static Map<Long, Integer> quantities(List<CartLine> lines) {
        return lines.stream()
                .collect(
                        Collectors.toMap(
                                CartLine::productId,
                                CartLine::quantity,
                                Integer::sum,
                                LinkedHashMap::new));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResource<OrderListItemResource> myOrders(
            long userId, String status, int page, int pageSize) {
        String dbStatus = parseStatusOrNull(status);
        int safePage = Math.max(1, page);
        int safeSize = Math.min(MAX_PAGE_SIZE, Math.max(1, pageSize));
        return orderQueries.myOrders(userId, dbStatus, (safePage - 1) * safeSize, safeSize);
    }

    @Override
    @Transactional(readOnly = true)
    public OrderDetailResource detail(long userId, long orderId) {
        OrderDetailRow row =
                orderQueries
                        .findDetail(orderId)
                        .orElseThrow(() -> new OrderNotFoundException(orderId));
        boolean isBuyer = row.customerId() == userId;
        boolean isOwningFarmer = row.farmerUserId() == userId;
        boolean isAdmin =
                userRepository
                        .findById(userId)
                        .map(u -> u.getRole() == RoleType.ADMIN)
                        .orElse(false);
        if (!isBuyer && !isOwningFarmer && !isAdmin) {
            throw new OrderNotYoursException();
        }

        LocalDateTime now = LocalDateTime.now(clock);
        boolean canCancel =
                isBuyer && OrderLifecycle.canCustomerCancel(row.status(), row.cutoffAt(), now);
        boolean canModify =
                isBuyer && OrderLifecycle.canCustomerModify(row.status(), row.cutoffAt(), now);
        CustomerSummaryResource customer =
                (isOwningFarmer || isAdmin)
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

    @Override
    @Transactional
    public OrderDetailResource cancel(long userId, long orderId) {
        Order order = loadOwnedByCustomer(userId, orderId);
        assertCustomerCanStillAct(order, OrderStatus.CANCELLED);
        transition(order, OrderStatus.CANCELLED, userId, null);
        notifyFarmer(order, NotificationKind.ORDER_CANCELLED, Map.of());
        return detail(userId, orderId);
    }

    @Override
    @Transactional
    public void cancelAllForDeactivatedCustomer(long customerId, Long adminActorId) {
        List<Order> openOrders =
                orderRepository.findByCustomerIdAndStatusIn(
                        customerId, List.of(OrderStatus.PLACED, OrderStatus.ACCEPTED));
        for (Order summary : openOrders) {
            Order order = orderRepository.lockById(summary.getId()).orElseThrow();
            transition(
                    order,
                    OrderStatus.CANCELLED,
                    adminActorId,
                    "Cancelled: customer account permanently deactivated.");
            notifyFarmer(order, NotificationKind.ORDER_CANCELLED_ACCOUNT_DEACTIVATED, Map.of());
        }
    }

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

        Map<Long, Product> products =
                productRepository.findAllById(existing.keySet()).stream()
                        .collect(Collectors.toMap(Product::getId, Function.identity()));
        BigDecimal total = BigDecimal.ZERO;
        int remainingItems = 0;
        for (Long productId : new TreeSet<>(existing.keySet())) {
            OrderItem item = existing.get(productId);
            Product p = products.get(productId);
            ProductDailyStock row =
                    dailyStockRepository
                            .lockByProductIdAndStockDate(productId, order.getPickupDate())
                            .orElse(null);
            int before = item.getQuantity();
            int after = wanted.getOrDefault(productId, 0);
            int delta = after - before;

            if (delta > 0 && row == null) {
                row = materializeAndLock(productId, order.getPickupDate()).orElse(null);
            }
            if (delta > 0 && (row == null || !canRaiseBy(p, row, delta))) {
                throw new OutOfStockException(productId, p == null ? null : p.getName());
            }
            if (delta != 0 && row != null) {
                boolean wasOrderable = p != null && restock.isOrderable(p);
                row.setQuantityAvailable(row.getQuantityAvailable() - delta);
                if (p != null) {
                    restock.afterChange(p, wasOrderable, restock.isOrderable(p));
                }
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
        orderItemRepository.flush();

        if (remainingItems == 0) {
            transition(order, OrderStatus.CANCELLED, userId, "All items removed.");
            notifyFarmer(order, NotificationKind.ORDER_CANCELLED, Map.of());
            return detail(userId, orderId);
        }

        order.setTotalAmount(total);
        if (order.getStatus() == OrderStatus.ACCEPTED) {
            transition(order, OrderStatus.PLACED, userId, "Customer changed the order.");
        } else {
            orderRepository.save(order);
            orderRepository.flush();
        }
        notifyFarmer(order, NotificationKind.ORDER_CHANGED, Map.of());
        return detail(userId, orderId);
    }

    private Optional<ProductDailyStock> materializeAndLock(Long productId, LocalDate date) {
        dailyStockRepository.materialize(productId, date, date.getDayOfWeek().getValue() % 7);
        return dailyStockRepository.lockByProductIdAndStockDate(productId, date);
    }

    private static boolean canRaiseBy(Product p, ProductDailyStock row, int delta) {
        return p != null && sellable(p) && row.getQuantityAvailable() >= delta;
    }

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

    private void assertCustomerCanStillAct(Order order, OrderStatus intendedTo) {
        if (order.getStatus() != OrderStatus.PLACED && order.getStatus() != OrderStatus.ACCEPTED) {
            throw new InvalidOrderTransitionException(order.getStatus(), intendedTo);
        }
        if (!LocalDateTime.now(clock).isBefore(order.getCutoffAt())) {
            throw new CutoffPassedException(order.getId());
        }
    }

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

    private Order transition(Order order, OrderStatus to, Long actorUserId, String note) {
        OrderStatus from = order.getStatus();
        OrderLifecycle.assertTransition(from, to);

        if (OrderLifecycle.restoresStock(to)) {
            if (order.getSlotId() != null) {
                slotRepository
                        .lockById(order.getSlotId())
                        .ifPresent(s -> s.setBookedCount(Math.max(0, s.getBookedCount() - 1)));
            }
            restoreDailyStock(
                    order.getPickupDate(), orderItemRepository.findByOrderId(order.getId()));
        }

        order.setStatus(to);
        orderRepository.save(order);
        history.record(order.getId(), from, to, actorUserId, note);
        orderRepository.flush();
        return order;
    }

    private void restoreDailyStock(LocalDate pickupDate, List<OrderItem> items) {
        Map<Long, Integer> qty =
                items.stream()
                        .collect(Collectors.toMap(OrderItem::getProductId, OrderItem::getQuantity));
        Map<Long, Product> products =
                productRepository.findAllById(qty.keySet()).stream()
                        .collect(Collectors.toMap(Product::getId, Function.identity()));
        for (Long productId : new TreeSet<>(qty.keySet())) {
            ProductDailyStock row =
                    dailyStockRepository
                            .lockByProductIdAndStockDate(productId, pickupDate)
                            .orElse(null);
            if (row == null) {
                continue;
            }
            Product p = products.get(productId);
            boolean wasOrderable = p != null && restock.isOrderable(p);
            row.setQuantityAvailable(row.getQuantityAvailable() + qty.get(productId));
            if (p != null) {
                restock.afterChange(p, wasOrderable, restock.isOrderable(p));
            }
        }
    }

    private void notifyOrderPlaced(Order order, FarmerProfile farmer, User customer) {
        notifications.dispatch(
                List.of(farmer.getUserId()),
                NotificationEvent.of(
                        NotificationKind.ORDER_PLACED,
                        "/farmer/orders/" + order.getId(),
                        Map.of("order", order.getOrderCode(), "customer", customer.getFullName())));
    }

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
        boolean stallOpen =
                farmerRepository
                        .findById(order.getFarmerId())
                        .filter(f -> f.getApprovalStatus() == ApprovalStatus.APPROVED)
                        .isPresent();
        if (!stallOpen) {
            return List.of();
        }
        List<OrderItem> lines = orderItemRepository.findByOrderId(orderId);
        Map<Long, Product> byId =
                productRepository
                        .findAllById(lines.stream().map(OrderItem::getProductId).toList())
                        .stream()
                        .collect(Collectors.toMap(Product::getId, Function.identity()));
        Map<Long, BigDecimal> basePrices =
                byId.values().stream().collect(Collectors.toMap(Product::getId, Product::getPrice));
        Map<Long, ProductAvailabilityResolver.Availability> resolved =
                availability.resolve(basePrices);
        List<CartLine> cart = new ArrayList<>();
        for (OrderItem line : lines) {
            Product p = byId.get(line.getProductId());
            ProductAvailabilityResolver.Availability a = p == null ? null : resolved.get(p.getId());
            if (p == null || !sellable(p) || a == null || a.quantity() <= 0) {
                continue;
            }
            cart.add(new CartLine(p.getId(), Math.min(line.getQuantity(), a.quantity())));
        }
        return cart;
    }

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
