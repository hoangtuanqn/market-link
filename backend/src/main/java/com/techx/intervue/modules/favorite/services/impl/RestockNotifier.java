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
import com.techx.intervue.modules.product.repositories.ProductRepository;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * FR-041 — tells the accounts that favourited a product when it is back in stock. Every place that
 * raises stock calls {@link #onStockRose} inside its own transaction (farmer edit, weekly template,
 * declined / cancelled order, lowered order quantity); the notification rows are written in that
 * transaction and pushed after it commits.
 */
@Component
@RequiredArgsConstructor
public class RestockNotifier {

    private final FavoriteRepository favorites;
    private final ProductRepository products;
    private final FarmerProfileRepository farmers;
    private final NotificationServiceInterface notifications;

    /**
     * Only zero → positive is "back in stock"; the product must be on sale (not deleted, hidden or
     * paused) at an approved stall. The farmer who owns the product is never notified.
     */
    public void onStockRose(long productId, int stockBefore, int stockAfter) {
        if (stockBefore > 0 || stockAfter <= 0) {
            return;
        }
        Product product = products.findById(productId).orElse(null);
        if (product == null
                || product.isDeleted()
                || product.isHidden()
                || product.getStatus() != ProductStatus.AVAILABLE) {
            return;
        }
        FarmerProfile farmer = farmers.findById(product.getFarmerId()).orElse(null);
        if (farmer == null || farmer.getApprovalStatus() != ApprovalStatus.APPROVED) {
            return;
        }
        List<Long> recipients =
                favorites.customerIdsFavouritingProduct(productId).stream()
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
                        "/products/" + productId,
                        Map.of("product", product.getName(), "stall", farmer.getStallName())));
    }
}
