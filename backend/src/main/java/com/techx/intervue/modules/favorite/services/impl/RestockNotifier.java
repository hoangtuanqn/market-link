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
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * FR-041 — tells the accounts that favourited a product when it can be ordered again. Every write
 * that can make a product orderable captures {@link #orderable} before the change and calls {@link
 * #afterChange} after it, inside its own transaction: the farmer's edit and status toggle, the
 * admin's un-hide, a weekly template, a declined / cancelled order and a lowered order quantity.
 * The notification rows are written in that transaction and pushed after it commits.
 */
@Component
@RequiredArgsConstructor
public class RestockNotifier {

    private final FavoriteRepository favorites;
    private final FarmerProfileRepository farmers;
    private final NotificationServiceInterface notifications;

    /** Can be put in a cart right now: listed (not deleted, not hidden), available, stock left. */
    public static boolean orderable(Product p) {
        return !p.isDeleted()
                && !p.isHidden()
                && p.getStatus() == ProductStatus.AVAILABLE
                && p.getStockQuantity() > 0;
    }

    /**
     * Alerts only on "could not be ordered → can be ordered", and only at an approved stall. The
     * farmer who owns the product is never notified.
     */
    public void afterChange(Product product, boolean wasOrderable) {
        if (wasOrderable || !orderable(product)) {
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
