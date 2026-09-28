package com.techx.intervue.modules.product.services.impl;

import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.exceptions.FarmerProfileNotFoundException;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.farmer.services.impl.StallSuspensionMessage;
import com.techx.intervue.modules.favorite.services.impl.RestockNotifier;
import com.techx.intervue.modules.product.entities.Product;
import com.techx.intervue.modules.product.entities.ProductDailyStock;
import com.techx.intervue.modules.product.exceptions.DateNotOrderableException;
import com.techx.intervue.modules.product.exceptions.ExpiredBeforePickupException;
import com.techx.intervue.modules.product.exceptions.NotNearExpiryException;
import com.techx.intervue.modules.product.exceptions.ProductNotFoundException;
import com.techx.intervue.modules.product.exceptions.ProductNotYoursException;
import com.techx.intervue.modules.product.repositories.DealQueryRepository;
import com.techx.intervue.modules.product.repositories.ProductDailyStockRepository;
import com.techx.intervue.modules.product.repositories.ProductRepository;
import com.techx.intervue.modules.product.requests.DealRequest;
import com.techx.intervue.modules.product.resources.DailyStockResource;
import com.techx.intervue.modules.product.resources.FarmerDealResource;
import com.techx.intervue.modules.product.services.interfaces.FarmerDealServiceInterface;
import com.techx.intervue.modules.stall.repositories.SlotQueryRepository;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * FR-124 (spec §4.5.3) — a Farmer puts one pickup day of their own product on a near-expiry deal.
 * The day's row is created when missing and locked by its natural key, the same lock placing an
 * order takes, so a deal and an order for that day never interleave (spec §8). Orders already
 * placed keep the price they copied.
 */
@Service
@AllArgsConstructor
public class FarmerDealService implements FarmerDealServiceInterface {

    private final ProductDailyStockRepository dailyStock;
    private final ProductRepository products;
    private final FarmerProfileRepository farmers;
    private final SlotQueryRepository slots;
    private final ProductAvailabilityResolver availability;
    private final DealQueryRepository deals;
    private final RestockNotifier restock;
    private final Clock clock;

    /** Checks run cheapest first: 403/404, then the request (400), then the day itself (409). */
    @Override
    @Transactional
    public DailyStockResource post(
            long userId, long productId, LocalDate date, DealRequest request) {
        FarmerProfile profile = profileOf(userId);
        StallSuspensionMessage.assertUsable(profile);
        Product product = owned(profile, productId);

        int percent = request.discountPercent();
        if (!DealPolicy.validPercent(percent)) {
            throw new InvalidFieldException(
                    "discountPercent", "Choose a discount from 5% to 70%, in steps of 5.");
        }
        LocalDate today = LocalDate.now(clock);
        DealPolicy.Check check =
                DealPolicy.check(product.getShelfLifeDays(), request.packedOn(), date, today);
        if (check.problem() != null) {
            throw switch (check.problem()) {
                case PACKED_IN_FUTURE ->
                        new InvalidFieldException(
                                "packedOn", "The harvest or packing date cannot be after today.");
                case FRESH ->
                        new NotNearExpiryException(
                                "Produce picked on the pickup day is fresh. Deals are for batches"
                                        + " past half their shelf life.");
                case NOT_NEAR_EXPIRY ->
                        new NotNearExpiryException(
                                "More than half of the shelf life is left on that pickup day.");
                case EXPIRED_BEFORE_PICKUP -> new ExpiredBeforePickupException();
            };
        }
        requireOrderable(profile.getId(), date, today);

        dailyStock.materialize(productId, date, date.getDayOfWeek().getValue() % 7);
        // Nothing to lock: no active template covers that weekday, the product is not sold then
        ProductDailyStock row =
                dailyStock
                        .lockByProductIdAndStockDate(productId, date)
                        .orElseThrow(DateNotOrderableException::new);

        boolean wasOrderable = restock.isOrderable(product);
        row.startDeal(
                DealPolicy.dealPrice(row.basePrice(), percent),
                percent,
                request.packedOn(),
                check.bestBefore());
        row.setQuantityAvailable(request.quantityAvailable());
        ProductDailyStock saved = dailyStock.save(row);
        // FR-041: bringing stock for a sold-out day can make the product orderable again
        restock.afterChange(product, wasOrderable, restock.isOrderable(product));
        return DailyStockResource.of(saved);
    }

    @Override
    @Transactional
    public void remove(long userId, long productId, LocalDate date) {
        FarmerProfile profile = profileOf(userId);
        StallSuspensionMessage.assertUsable(profile);
        owned(profile, productId);
        dailyStock
                .lockByProductIdAndStockDate(productId, date)
                .filter(ProductDailyStock::hasDeal)
                .ifPresent(
                        row -> {
                            row.endDeal();
                            dailyStock.save(row);
                        });
    }

    /** Read-only: a suspended stall still sees its deals (D-09 blocks writes only). */
    @Override
    public List<FarmerDealResource> mine(long userId) {
        return deals.farmerDeals(profileOf(userId).getId(), LocalDate.now(clock));
    }

    @Override
    public List<DailyStockResource> upcomingDays(long userId, long productId) {
        Product product = owned(profileOf(userId), productId);
        return availability.upcoming(product).stream().map(a -> toResource(productId, a)).toList();
    }

    /**
     * The same "can still be ordered" rule the public pages use (ProductAvailabilityResolver): a
     * free slot before its cutoff on a day the market and the stall both open, inside the 14-day
     * lookahead.
     */
    private void requireOrderable(long farmerId, LocalDate date, LocalDate today) {
        boolean inWindow =
                !date.isBefore(today)
                        && date.isBefore(
                                today.plusDays(ProductAvailabilityResolver.LOOKAHEAD_DAYS));
        boolean open =
                inWindow
                        && slots.orderableDates(
                                        Set.of(farmerId), date, date, LocalDateTime.now(clock))
                                .getOrDefault(farmerId, Set.of())
                                .contains(date);
        if (!open) {
            throw new DateNotOrderableException();
        }
    }

    private static DailyStockResource toResource(
            long productId, ProductAvailabilityResolver.Availability a) {
        ProductAvailabilityResolver.Deal deal = a.deal();
        return new DailyStockResource(
                productId,
                a.date(),
                a.quantity(),
                a.price(),
                deal == null ? null : deal.listPrice(),
                deal == null ? null : deal.discountPercent(),
                deal == null ? null : deal.packedOn(),
                deal == null ? null : deal.bestBefore());
    }

    /** R-06: the profile always comes from the token's user, never from the request. */
    private FarmerProfile profileOf(long userId) {
        return farmers.findByUserId(userId).orElseThrow(FarmerProfileNotFoundException::new);
    }

    /** Missing or deleted → 404; another stall's product → 403 (R-06). */
    private Product owned(FarmerProfile profile, long productId) {
        Product product =
                products.findByIdAndDeletedFalse(productId)
                        .orElseThrow(() -> new ProductNotFoundException(productId));
        if (!product.getFarmerId().equals(profile.getId())) {
            throw new ProductNotYoursException();
        }
        return product;
    }
}
