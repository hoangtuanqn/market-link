package com.techx.intervue.modules.favorite.services.impl;

import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.favorite.repositories.FavoriteRepository;
import com.techx.intervue.modules.notification.enums.NotificationKind;
import com.techx.intervue.modules.notification.resources.NotificationEvent;
import com.techx.intervue.modules.notification.services.interfaces.NotificationServiceInterface;
import com.techx.intervue.modules.product.entities.Product;
import com.techx.intervue.modules.product.enums.ProductStatus;
import com.techx.intervue.modules.product.services.impl.ProductAvailabilityResolver;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * FR-041 — tells the accounts that favourited a product when it can be ordered again. Every write
 * that can make a product orderable captures whether it was orderable before the change and calls
 * {@link #afterChange} after it, inside its own transaction: the farmer's edit and status toggle,
 * the admin's un-hide, a weekly template gaining a day, a farmer's per-date override, and a
 * declined / cancelled order or a lowered order quantity restoring a daily-stock row.
 *
 * <p>Orderability is per pickup date since the per-date-stock redesign (D-02): {@link #isOrderable}
 * answers "can this be put in a cart on its nearest orderable date right now" via {@link
 * ProductAvailabilityResolver}. A caller that already holds the exact {@code product_daily_stock}
 * row it just changed should compute both booleans itself instead — cheaper, and scoped to the one
 * date that actually changed.
 */
@Component
@RequiredArgsConstructor
public class RestockNotifier {

    private final FavoriteRepository favorites;
    private final FarmerProfileRepository farmers;
    private final NotificationServiceInterface notifications;
    private final ProductAvailabilityResolver availability;

    /** Listed, available, and the nearest orderable date still has stock left. */
    public boolean isOrderable(Product product) {
        if (product.isDeleted()
                || product.isHidden()
                || product.getStatus() != ProductStatus.AVAILABLE) {
            return false;
        }
        ProductAvailabilityResolver.Availability a =
                availability
                        .resolve(Map.of(product.getId(), product.getPrice()))
                        .get(product.getId());
        return a != null && a.quantity() > 0;
    }

    /**
     * Alerts only on "could not be ordered → can be ordered", and only at an approved stall. The
     * farmer who owns the product is never notified.
     */
    public void afterChange(Product product, boolean wasOrderable, boolean isOrderableNow) {
        if (wasOrderable || !isOrderableNow) {
            return;
        }
        FarmerProfile farmer = farmers.findById(product.getFarmerId()).orElse(null);
        if (farmer == null || farmer.getApprovalStatus() != ApprovalStatus.APPROVED) {
            return;
        }
        List<Long> recipients =
                favorites.customerIdsFavouritingProduct(product.getId()).stream()
                        .filter(id -> !id.equals(farmer.getUserId()))
                        .distinct()
                        .toList();
        if (recipients.isEmpty()) {
            return;
        }
        notifications.dispatch(
                recipients,
                NotificationEvent.of(
                        NotificationKind.RESTOCK,
                        "/products/" + product.getId(),
                        Map.of("product", product.getName(), "stall", farmer.getStallName())));
    }
}
