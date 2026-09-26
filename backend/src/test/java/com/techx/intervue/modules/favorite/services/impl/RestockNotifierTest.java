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
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

/** FR-041 — "back in stock" means the stock went from zero to something, nothing else. */
class RestockNotifierTest {

    private static final long PRODUCT_ID = 30L;
    private static final long FARMER_PROFILE_ID = 10L;
    private static final long FARMER_USER_ID = 40L;

    private FavoriteRepository favorites;
    private FarmerProfileRepository farmers;
    private NotificationServiceInterface notifications;
    private RestockNotifier notifier;
    private Product product;
    private FarmerProfile farmer;

    @BeforeEach
    void setUp() {
        favorites = mock(FavoriteRepository.class);
        farmers = mock(FarmerProfileRepository.class);
        notifications = mock(NotificationServiceInterface.class);
        notifier = new RestockNotifier(favorites, farmers, notifications);

        product = new Product();
        product.setId(PRODUCT_ID);
        product.setFarmerId(FARMER_PROFILE_ID);
        product.setName("Xà lách xoong");
        product.setStockQuantity(20);
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
        notifier.afterChange(product, false);

        ArgumentCaptor<NotificationEvent> event = ArgumentCaptor.forClass(NotificationEvent.class);
        verify(notifications).dispatch(any(), event.capture());
        assertThat(recipients()).containsExactlyInAnyOrder(7L, 8L, 9L);
        assertThat(event.getValue().kind()).isEqualTo(NotificationKind.RESTOCK);
    }

    /** 5 → 8 is more stock, not "back in stock": it could already be ordered. */
    @Test
    void staysQuietWhenItCouldAlreadyBeOrdered() {
        notifier.afterChange(product, true);

        verify(notifications, never()).dispatch(any(), any());
    }

    @Test
    void staysQuietWhenStockFellToZero() {
        product.setStockQuantity(0);

        notifier.afterChange(product, true);

        verify(notifications, never()).dispatch(any(), any());
    }

    /** "Back in stock" means "can be ordered again": listed, available and with stock left. */
    @Test
    void orderableMeansListedAvailableAndInStock() {
        assertThat(RestockNotifier.orderable(product)).isTrue();
        product.setStatus(ProductStatus.SOLD_OUT);
        assertThat(RestockNotifier.orderable(product)).isFalse();
        product.setStatus(ProductStatus.AVAILABLE);
        product.setStockQuantity(0);
        assertThat(RestockNotifier.orderable(product)).isFalse();
        product.setStockQuantity(3);
        product.setHidden(true);
        assertThat(RestockNotifier.orderable(product)).isFalse();
    }

    /** A farmer who favourited their own product does not get their own bell. */
    @Test
    void doesNotNotifyTheFarmerWhoOwnsTheProduct() {
        when(favorites.customerIdsFavouritingProduct(PRODUCT_ID))
                .thenReturn(List.of(7L, FARMER_USER_ID));

        notifier.afterChange(product, false);

        assertThat(recipients()).containsExactly(7L);
    }

    @Test
    void staysQuietForHiddenOrDeletedProducts() {
        product.setHidden(true);
        notifier.afterChange(product, false);
        product.setHidden(false);
        product.setDeleted(true);
        notifier.afterChange(product, false);

        verify(notifications, never()).dispatch(any(), any());
    }

    /** FR-064: a paused product has stock but cannot be ordered — no alert yet. */
    @Test
    void staysQuietWhileTheFarmerHasPausedTheProduct() {
        product.setStatus(ProductStatus.UNAVAILABLE);

        notifier.afterChange(product, false);

        verify(notifications, never()).dispatch(any(), any());
    }

    /** D-09: a suspended stall takes no orders, so its stock is no news. */
    @Test
    void staysQuietForASuspendedStall() {
        farmer.setApprovalStatus(ApprovalStatus.SUSPENDED);

        notifier.afterChange(product, false);

        verify(notifications, never()).dispatch(any(), any());
    }

    @Test
    void theAlertLinksToTheProductAndNamesItAndTheStall() {
        notifier.afterChange(product, false);

        ArgumentCaptor<NotificationEvent> event = ArgumentCaptor.forClass(NotificationEvent.class);
        verify(notifications).dispatch(any(), event.capture());
        assertThat(event.getValue().link()).isEqualTo("/products/" + PRODUCT_ID);
        assertThat(event.getValue().params())
                .containsEntry("product", "Xà lách xoong")
                .containsEntry("stall", "Vườn Út Hiền");
    }
}
