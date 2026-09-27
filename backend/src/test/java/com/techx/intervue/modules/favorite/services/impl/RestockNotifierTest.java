package com.techx.intervue.modules.favorite.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

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
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

/**
 * FR-041 — "back in stock" means a product went from "could not be ordered" to "can be ordered",
 * nothing else. Since the per-date redesign, "can be ordered" is answered per pickup date
 * (product_daily_stock), not by a single {@code Product.stockQuantity}; {@link
 * RestockNotifier#afterChange} takes both booleans explicitly so callers can compute them either
 * from a full {@link ProductAvailabilityResolver} lookup (a product edit) or cheaply from the one
 * daily-stock row they already hold (an order restoring stock).
 */
class RestockNotifierTest {

    private static final long PRODUCT_ID = 30L;
    private static final long FARMER_PROFILE_ID = 10L;
    private static final long FARMER_USER_ID = 40L;

    private FavoriteRepository favorites;
    private FarmerProfileRepository farmers;
    private NotificationServiceInterface notifications;
    private ProductAvailabilityResolver availability;
    private RestockNotifier notifier;
    private Product product;
    private FarmerProfile farmer;

    @BeforeEach
    void setUp() {
        favorites = mock(FavoriteRepository.class);
        farmers = mock(FarmerProfileRepository.class);
        notifications = mock(NotificationServiceInterface.class);
        availability = mock(ProductAvailabilityResolver.class);
        notifier = new RestockNotifier(favorites, farmers, notifications, availability);

        product = new Product();
        product.setId(PRODUCT_ID);
        product.setFarmerId(FARMER_PROFILE_ID);
        product.setName("Xà lách xoong");
        product.setPrice(new BigDecimal("12000"));
        product.setStatus(ProductStatus.AVAILABLE);
        farmer =
                FarmerProfile.builder()
                        .id(FARMER_PROFILE_ID)
                        .userId(FARMER_USER_ID)
                        .stallName("Vườn Út Hiền")
                        .contactPerson("Hiền")
                        .approvalStatus(ApprovalStatus.APPROVED)
                        .build();
        when(farmers.findById(FARMER_PROFILE_ID)).thenReturn(Optional.of(farmer));
        when(favorites.customerIdsFavouritingProduct(PRODUCT_ID)).thenReturn(List.of(7L, 8L, 9L));
    }

    @SuppressWarnings("unchecked")
    private Collection<Long> recipients() {
        ArgumentCaptor<Collection<Long>> to = ArgumentCaptor.forClass(Collection.class);
        verify(notifications).dispatch(to.capture(), any());
        return to.getValue();
    }

    @Test
    void notifiesEveryCustomerWhoFavouritedTheProduct() {
        notifier.afterChange(product, false, true);

        ArgumentCaptor<NotificationEvent> event = ArgumentCaptor.forClass(NotificationEvent.class);
        verify(notifications).dispatch(any(), event.capture());
        assertThat(recipients()).containsExactlyInAnyOrder(7L, 8L, 9L);
        assertThat(event.getValue().kind()).isEqualTo(NotificationKind.RESTOCK);
    }

    /** 5 → 8 is more stock, not "back in stock": it could already be ordered. */
    @Test
    void staysQuietWhenItCouldAlreadyBeOrdered() {
        notifier.afterChange(product, true, true);

        verify(notifications, never()).dispatch(any(), any());
    }

    @Test
    void staysQuietWhenStockFellToZero() {
        notifier.afterChange(product, true, false);

        verify(notifications, never()).dispatch(any(), any());
    }

    /**
     * "Can be ordered right now" = listed, available, and the nearest orderable date still has
     * stock — {@link ProductAvailabilityResolver} resolves that nearest date.
     */
    @Test
    void isOrderableMeansListedAvailableAndTheNearestDateHasStock() {
        when(availability.resolve(Map.of(PRODUCT_ID, new BigDecimal("12000"))))
                .thenReturn(
                        Map.of(
                                PRODUCT_ID,
                                new ProductAvailabilityResolver.Availability(
                                        LocalDate.of(2026, 9, 28), 5, new BigDecimal("12000"))));
        assertThat(notifier.isOrderable(product)).isTrue();

        product.setStatus(ProductStatus.SOLD_OUT);
        assertThat(notifier.isOrderable(product)).isFalse();
        product.setStatus(ProductStatus.AVAILABLE);

        when(availability.resolve(Map.of(PRODUCT_ID, new BigDecimal("12000"))))
                .thenReturn(Map.of());
        assertThat(notifier.isOrderable(product)).isFalse();
    }

    @Test
    void isOrderableIsFalseWhenTheNearestDateHasZeroStock() {
        when(availability.resolve(Map.of(PRODUCT_ID, new BigDecimal("12000"))))
                .thenReturn(
                        Map.of(
                                PRODUCT_ID,
                                new ProductAvailabilityResolver.Availability(
                                        LocalDate.of(2026, 9, 28), 0, new BigDecimal("12000"))));

        assertThat(notifier.isOrderable(product)).isFalse();
    }

    @Test
    void isOrderableIsFalseForAHiddenProductEvenWithStock() {
        when(availability.resolve(Map.of(PRODUCT_ID, new BigDecimal("12000"))))
                .thenReturn(
                        Map.of(
                                PRODUCT_ID,
                                new ProductAvailabilityResolver.Availability(
                                        LocalDate.of(2026, 9, 28), 3, new BigDecimal("12000"))));
        product.setHidden(true);

        assertThat(notifier.isOrderable(product)).isFalse();
    }

    /** A farmer who favourited their own product does not get their own bell. */
    @Test
    void doesNotNotifyTheFarmerWhoOwnsTheProduct() {
        when(favorites.customerIdsFavouritingProduct(PRODUCT_ID))
                .thenReturn(List.of(7L, FARMER_USER_ID));

        notifier.afterChange(product, false, true);

        assertThat(recipients()).containsExactly(7L);
    }

    @Test
    void staysQuietForHiddenOrDeletedProducts() {
        product.setHidden(true);
        notifier.afterChange(product, false, false);
        product.setHidden(false);
        product.setDeleted(true);
        notifier.afterChange(product, false, false);

        verify(notifications, never()).dispatch(any(), any());
    }

    /** FR-064: a paused product has stock but cannot be ordered — no alert yet. */
    @Test
    void staysQuietWhileTheFarmerHasPausedTheProduct() {
        notifier.afterChange(product, false, false);

        verify(notifications, never()).dispatch(any(), any());
    }

    /** D-09: a suspended stall takes no orders, so its stock is no news. */
    @Test
    void staysQuietForASuspendedStall() {
        farmer.setApprovalStatus(ApprovalStatus.SUSPENDED);

        notifier.afterChange(product, false, true);

        verify(notifications, never()).dispatch(any(), any());
    }

    @Test
    void theAlertLinksToTheProductAndNamesItAndTheStall() {
        notifier.afterChange(product, false, true);

        ArgumentCaptor<NotificationEvent> event = ArgumentCaptor.forClass(NotificationEvent.class);
        verify(notifications).dispatch(any(), event.capture());
        assertThat(event.getValue().link()).isEqualTo("/products/" + PRODUCT_ID);
        assertThat(event.getValue().params())
                .containsEntry("product", "Xà lách xoong")
                .containsEntry("stall", "Vườn Út Hiền");
    }
}
