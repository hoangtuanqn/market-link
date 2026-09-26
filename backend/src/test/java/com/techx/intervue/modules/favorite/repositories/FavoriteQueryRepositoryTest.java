package com.techx.intervue.modules.favorite.repositories;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.techx.intervue.modules.favorite.entities.Favorite;
import com.techx.intervue.modules.favorite.enums.FavoriteTargetType;
import com.techx.intervue.modules.favorite.resources.FavoriteResource;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.transaction.annotation.Transactional;

/**
 * Runs on the real MySQL: the list is one SQL query whose type filter and "available" flag must be
 * right on the real engine, and the unique key is what stops a double click from storing two rows.
 */
@SpringBootTest
@Transactional
class FavoriteQueryRepositoryTest {

    @Autowired FavoriteRepository favorites;
    @Autowired FavoriteQueryRepository query;
    @Autowired JdbcTemplate jdbc;

    private final String tag = UUID.randomUUID().toString().substring(0, 8);
    private long customerId;
    private long farmerId;
    private long marketId;
    private long categoryId;

    @BeforeEach
    void setUp() {
        customerId = insertUser("customer");
        long farmerUserId = insertUser("farmer");
        farmerId =
                insert(
                        "INSERT INTO farmer_profiles (user_id, stall_name, contact_person,"
                                + " approval_status) VALUES (?, ?, ?, 'approved')",
                        farmerUserId,
                        "Fav stall " + tag,
                        "Seller " + tag);
        marketId =
                insert(
                        "INSERT INTO markets (market_name, address, latitude, longitude,"
                                + " opening_time, closing_time)"
                                + " VALUES (?, 'Fav street', 10.8, 106.7, '05:00:00', '18:00:00')",
                        "Fav market " + tag);
        categoryId =
                insert(
                        "INSERT INTO categories (name, slug) VALUES (?, ?)",
                        "Fav " + tag,
                        "fav-" + tag);
    }

    private long insertUser(String role) {
        String email = role + "-" + tag + "-" + UUID.randomUUID().toString().substring(0, 6);
        return insert(
                "INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, 'x', ?)",
                "Fav " + email,
                email + "@favorite.test",
                role);
    }

    private long product(String name, int stock, String status) {
        return insert(
                "INSERT INTO products (farmer_id, category_id, name, price, unit, stock_quantity,"
                        + " status) VALUES (?, ?, ?, 10000, 'kg', ?, ?)",
                farmerId,
                categoryId,
                name,
                stock,
                status);
    }

    private Favorite favorite(FavoriteTargetType type, long targetId) {
        Favorite f = new Favorite();
        f.setCustomerId(customerId);
        f.setTargetType(type);
        switch (type) {
            case FARMER -> f.setFarmerId(targetId);
            case PRODUCT -> f.setProductId(targetId);
            case MARKET -> f.setMarketId(targetId);
        }
        f.setTargetId(targetId);
        return favorites.saveAndFlush(f);
    }

    @Test
    void listFiltersByTargetType() {
        long product = product("Fav greens " + tag, 5, "available");
        favorite(FavoriteTargetType.PRODUCT, product);
        favorite(FavoriteTargetType.MARKET, marketId);
        favorite(FavoriteTargetType.FARMER, farmerId);

        List<FavoriteResource> products = query.list(customerId, FavoriteTargetType.PRODUCT);
        List<FavoriteResource> all = query.list(customerId, null);

        assertThat(products)
                .extracting(FavoriteResource::targetType, FavoriteResource::targetId)
                .containsExactly(org.assertj.core.groups.Tuple.tuple("product", product));
        assertThat(all).hasSize(3);
        assertThat(all)
                .extracting(FavoriteResource::title)
                .contains("Fav greens " + tag, "Fav market " + tag, "Fav stall " + tag);
    }

    /** A sold-out product and a suspended stall stay in the list, marked unavailable. */
    @Test
    void listMarksUnavailableTargets() {
        long soldOut = product("Fav sold out " + tag, 0, "sold_out");
        long onShelf = product("Fav on shelf " + tag, 5, "available");
        favorite(FavoriteTargetType.PRODUCT, soldOut);
        favorite(FavoriteTargetType.PRODUCT, onShelf);
        favorite(FavoriteTargetType.FARMER, farmerId);
        jdbc.update(
                "UPDATE farmer_profiles SET approval_status = 'suspended' WHERE id = ?", farmerId);

        List<FavoriteResource> all = query.list(customerId, null);

        assertThat(all).hasSize(3);
        assertThat(all).allSatisfy(f -> assertThat(f.available()).isFalse());
    }

    @Test
    void anAvailableProductOfAnApprovedStallIsAvailable() {
        long onShelf = product("Fav fresh " + tag, 5, "available");
        favorite(FavoriteTargetType.PRODUCT, onShelf);

        assertThat(query.list(customerId, FavoriteTargetType.PRODUCT))
                .singleElement()
                .satisfies(
                        f -> {
                            assertThat(f.available()).isTrue();
                            assertThat(f.subtitle()).isEqualTo("Fav stall " + tag);
                        });
    }

    /** db/schema.sql's key has NULL columns and would allow duplicates; target_id closes that. */
    @Test
    void theUniqueKeyRefusesTheSameFavoriteTwice() {
        favorite(FavoriteTargetType.MARKET, marketId);

        assertThatThrownBy(() -> favorite(FavoriteTargetType.MARKET, marketId))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    /** FR-041: the accounts that favourited a product, and only for that product. */
    @Test
    void theAccountsThatFavouritedAProductAreFound() {
        long product = product("Fav watched " + tag, 0, "sold_out");
        long other = product("Fav other " + tag, 5, "available");
        favorite(FavoriteTargetType.PRODUCT, product);
        favorite(FavoriteTargetType.PRODUCT, other);

        assertThat(favorites.customerIdsFavouritingProduct(product)).containsExactly(customerId);
    }

    private long insert(String sql, Object... args) {
        KeyHolder keys = new GeneratedKeyHolder();
        jdbc.update(
                con -> {
                    PreparedStatement ps =
                            con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
                    for (int i = 0; i < args.length; i++) {
                        ps.setObject(i + 1, args[i]);
                    }
                    return ps;
                },
                keys);
        return keys.getKey().longValue();
    }
}
