package com.techx.intervue.modules.catalog.services.impl;

import com.techx.intervue.modules.catalog.entities.MarketClosure;
import com.techx.intervue.modules.catalog.exceptions.MarketClosureNotFoundException;
import com.techx.intervue.modules.catalog.exceptions.MarketNotFoundException;
import com.techx.intervue.modules.catalog.repositories.MarketClosureRepository;
import com.techx.intervue.modules.catalog.repositories.MarketRepository;
import com.techx.intervue.modules.catalog.requests.MarketClosureRequest;
import com.techx.intervue.modules.catalog.resources.MarketClosureResource;
import com.techx.intervue.modules.catalog.services.interfaces.MarketClosureServiceInterface;
import com.techx.intervue.modules.order.enums.OrderStatus;
import com.techx.intervue.modules.order.repositories.OrderRepository;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import com.techx.intervue.modules.user.repositories.UserRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** The "Closed days" panel on the Market form (FE) — no official FR yet, see migration V…014. */
@Service
@AllArgsConstructor
public class MarketClosureService implements MarketClosureServiceInterface {

    private static final Set<String> HANDLINGS = Set.of("move", "contact", "cancel");

    private final MarketClosureRepository repository;
    private final MarketRepository marketRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;

    /** Asia/Ho_Chi_Minh (ChatConfig), so "today" is the market's own date. */
    private final Clock clock;

    @Override
    public List<MarketClosureResource> list(long marketId) {
        requireMarket(marketId);
        return repository.findByMarketIdOrderByClosedOnAsc(marketId).stream()
                .map(this::toResource)
                .toList();
    }

    @Override
    @Transactional
    public MarketClosureResource create(long marketId, MarketClosureRequest request, Long adminId) {
        requireMarket(marketId);
        // QA E2E v2 MARKET-ADMIN-007: a closure is announced ahead, never back-dated
        if (request.closedOn().isBefore(LocalDate.now(clock))) {
            throw new InvalidFieldException("closedOn", "A closed day cannot be in the past.");
        }
        String handling = request.handling() == null ? "" : request.handling().trim().toLowerCase();
        if (!HANDLINGS.contains(handling)) {
            throw new InvalidFieldException(
                    "handling", "Handling must be move, contact or cancel.");
        }

        MarketClosure closure = new MarketClosure();
        closure.setMarketId(marketId);
        closure.setClosedOn(request.closedOn());
        closure.setReason(blankToNull(request.reason()));
        closure.setHandling(handling);
        closure.setAnnounced(false);
        closure.setCreatedBy(adminId);
        closure.setCreatedAt(Instant.now());
        return toResource(repository.save(closure));
    }

    @Override
    @Transactional
    public void delete(long marketId, long closureId) {
        MarketClosure closure =
                repository
                        .findByIdAndMarketId(closureId, marketId)
                        .orElseThrow(MarketClosureNotFoundException::new);
        repository.delete(closure);
    }

    private void requireMarket(long marketId) {
        if (!marketRepository.existsById(marketId)) {
            throw new MarketNotFoundException(marketId);
        }
    }

    private MarketClosureResource toResource(MarketClosure c) {
        long ordersAffected =
                orderRepository.countByMarketIdAndPickupDateAndStatusNot(
                        c.getMarketId(), c.getClosedOn(), OrderStatus.CANCELLED);
        String createdByName =
                c.getCreatedBy() == null
                        ? "Admin"
                        : userRepository
                                .findById(c.getCreatedBy())
                                .map(u -> u.getFullName())
                                .orElse("Admin");
        return new MarketClosureResource(
                c.getId(),
                c.getMarketId(),
                c.getClosedOn(),
                c.getReason(),
                c.getHandling(),
                ordersAffected,
                c.isAnnounced(),
                createdByName,
                c.getCreatedAt());
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
