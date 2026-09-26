package com.techx.intervue.modules.favorite.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.catalog.repositories.MarketRepository;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.favorite.entities.Favorite;
import com.techx.intervue.modules.favorite.enums.FavoriteTargetType;
import com.techx.intervue.modules.favorite.exceptions.FavoriteNotYoursException;
import com.techx.intervue.modules.favorite.exceptions.FavoriteTargetNotFoundException;
import com.techx.intervue.modules.favorite.repositories.FavoriteQueryRepository;
import com.techx.intervue.modules.favorite.repositories.FavoriteRepository;
import com.techx.intervue.modules.favorite.requests.FavoriteRequest;
import com.techx.intervue.modules.favorite.resources.FavoriteResource;
import com.techx.intervue.modules.product.entities.Product;
import com.techx.intervue.modules.product.repositories.ProductRepository;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.repositories.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.access.AccessDeniedException;

/** FR-040, FR-014 — favourite stalls, products and markets. */
class FavoriteServiceTest {

    private static final long USER_ID = 7L;
    private static final long ADMIN_ID = 1L;
    private static final long PRODUCT_ID = 30L;
    private static final long FAVORITE_ID = 500L;

    private FavoriteRepository favorites;
    private FavoriteQueryRepository query;
    private UserRepository users;
    private ProductRepository products;
    private FavoriteService service;

    @BeforeEach
    void setUp() {
        favorites = mock(FavoriteRepository.class);
        query = mock(FavoriteQueryRepository.class);
        users = mock(UserRepository.class);
        products = mock(ProductRepository.class);
        service =
                new FavoriteService(
                        favorites,
                        query,
                        users,
                        mock(FarmerProfileRepository.class),
                        products,
                        mock(MarketRepository.class));
        when(users.findById(USER_ID)).thenReturn(Optional.of(user(USER_ID, RoleType.CUSTOMER)));
        when(users.findById(ADMIN_ID)).thenReturn(Optional.of(user(ADMIN_ID, RoleType.ADMIN)));
        when(products.findByIdAndDeletedFalse(PRODUCT_ID)).thenReturn(Optional.of(product(false)));
        when(query.one(anyLong(), anyLong()))
                .thenAnswer(inv -> Optional.of(resource(inv.getArgument(1))));
    }

    private static User user(long id, RoleType role) {
        User u =
                User.builder()
                        .fullName("U" + id)
                        .email(id + "@x.test")
                        .passwordHash("x")
                        .role(role)
                        .build();
        u.setId(id);
        return u;
    }

    private static Product product(boolean hidden) {
        Product p = new Product();
        p.setId(PRODUCT_ID);
        p.setFarmerId(10L);
        p.setName("Rau muống");
        p.setHidden(hidden);
        return p;
    }

    private static FavoriteResource resource(long id) {
        return new FavoriteResource(
                id, "product", PRODUCT_ID, "Rau muống", "Vườn Út Hiền", null, true);
    }

    private static Favorite existing(long customerId) {
        Favorite f = new Favorite();
        f.setId(FAVORITE_ID);
        f.setCustomerId(customerId);
        f.setTargetType(FavoriteTargetType.PRODUCT);
        f.setProductId(PRODUCT_ID);
        f.setTargetId(PRODUCT_ID);
        return f;
    }

    private static FavoriteRequest aProduct() {
        return new FavoriteRequest("product", null, PRODUCT_ID, null);
    }

    /** A second click on the heart returns the same favourite — no second row, no 409. */
    @Test
    void addIsIdempotent() {
        when(favorites.findByCustomerIdAndTargetTypeAndTargetId(
                        USER_ID, FavoriteTargetType.PRODUCT, PRODUCT_ID))
                .thenReturn(Optional.of(existing(USER_ID)));

        FavoriteResource out = service.add(USER_ID, aProduct());

        assertThat(out.id()).isEqualTo(FAVORITE_ID);
        verify(favorites, never()).saveAndFlush(any());
    }

    @Test
    void addStoresTheTargetIdNextToTheTypedColumn() {
        when(favorites.findByCustomerIdAndTargetTypeAndTargetId(anyLong(), any(), anyLong()))
                .thenReturn(Optional.empty());
        when(favorites.saveAndFlush(any()))
                .thenAnswer(
                        inv -> {
                            Favorite f = inv.getArgument(0);
                            f.setId(FAVORITE_ID);
                            return f;
                        });

        service.add(USER_ID, aProduct());

        ArgumentCaptor<Favorite> saved = ArgumentCaptor.forClass(Favorite.class);
        verify(favorites).saveAndFlush(saved.capture());
        assertThat(saved.getValue().getProductId()).isEqualTo(PRODUCT_ID);
        assertThat(saved.getValue().getTargetId()).isEqualTo(PRODUCT_ID);
        assertThat(saved.getValue().getFarmerId()).isNull();
        assertThat(saved.getValue().getMarketId()).isNull();
    }

    /** targetType "farmer" but a productId → 400: the id must match the type, and only one id. */
    @Test
    void addRejectsMismatchedTargetTypeAndId() {
        assertThatThrownBy(
                        () ->
                                service.add(
                                        USER_ID,
                                        new FavoriteRequest("farmer", null, PRODUCT_ID, null)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                        () ->
                                service.add(
                                        USER_ID,
                                        new FavoriteRequest("product", 3L, PRODUCT_ID, null)))
                .isInstanceOf(IllegalArgumentException.class);
        verify(favorites, never()).saveAndFlush(any());
    }

    /** Only what the public can see can be favourited: a hidden product is 404. */
    @Test
    void addRejectsAHiddenProduct() {
        when(products.findByIdAndDeletedFalse(PRODUCT_ID)).thenReturn(Optional.of(product(true)));

        assertThatThrownBy(() -> service.add(USER_ID, aProduct()))
                .isInstanceOf(FavoriteTargetNotFoundException.class);
        verify(favorites, never()).saveAndFlush(any());
    }

    /** R-06: someone else's favourite → 403 even though it exists. */
    @Test
    void removeAnotherUsersFavoriteIs403() {
        when(favorites.findById(FAVORITE_ID)).thenReturn(Optional.of(existing(99L)));

        assertThatThrownBy(() -> service.remove(USER_ID, FAVORITE_ID))
                .isInstanceOf(FavoriteNotYoursException.class);
        verify(favorites, never()).delete(any());
    }

    /**
     * The type filter is a whitelist (the SQL itself is checked in FavoriteQueryRepositoryTest).
     */
    @Test
    void listFiltersByTargetType() {
        service.list(USER_ID, "product");

        verify(query).list(USER_ID, FavoriteTargetType.PRODUCT);
    }

    @Test
    void listRejectsAnUnknownTargetType() {
        assertThatThrownBy(() -> service.list(USER_ID, "shop"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    /** D-13: admin accounts do not keep favourites — 403 from the server. */
    @Test
    void adminCannotAddFavorites() {
        assertThatThrownBy(() -> service.add(ADMIN_ID, aProduct()))
                .isInstanceOf(AccessDeniedException.class);
        verify(favorites, never()).saveAndFlush(any());
    }
}
