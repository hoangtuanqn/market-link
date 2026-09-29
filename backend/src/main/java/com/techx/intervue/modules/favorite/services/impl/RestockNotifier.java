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

@Component
@RequiredArgsConstructor
public class RestockNotifier {

    private final FavoriteRepository favorites;
    private final FarmerProfileRepository farmers;
    private final NotificationServiceInterface notifications;
    private final ProductAvailabilityResolver availability;

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
