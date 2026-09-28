package com.techx.intervue.modules.order.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.techx.intervue.modules.order.requests.CartLine;
import com.techx.intervue.modules.order.requests.OrderGroupInput;
import com.techx.intervue.modules.order.requests.PickupDateInput;
import com.techx.intervue.modules.order.requests.PlaceOrderRequest;
import com.techx.intervue.modules.order.requests.PreviewRequest;
import com.techx.intervue.modules.order.resources.OrderItemResource;
import com.techx.intervue.modules.order.resources.PreviewItemResource;
import com.techx.intervue.modules.product.exceptions.DateNotOrderableException;
import com.techx.intervue.modules.product.requests.DealRequest;
import com.techx.intervue.modules.product.services.impl.DealPolicy;
import com.techx.intervue.modules.product.services.interfaces.FarmerDealServiceInterface;
import com.techx.intervue.modules.report.services.impl.ReportFixture;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

/**
 * FR-124 on real MySQL (spec §8, §9): posting a deal, then previewing the cart and placing orders
 * for that day through the real locking path. The product keeps 7 days and sells at $2.00; a batch
 * packed today is past half of its shelf life on PICKUP (4 of 7 days left). Rolled back after each
 * test.
 */
@SpringBootTest
@Transactional
class DealOrderFlowTest {

    private static final LocalDate TODAY = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
    private static final LocalDate PICKUP = TODAY.plusDays(3);

    @Autowired private OrderService orders;
    @Autowired private FarmerDealServiceInterface deals;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private EntityManager entityManager;

    private ReportFixture fx;
    private long farmerUser;
    private long stall;
    private long market;
    private long customer;
    private long product;
    private long slot;

    @BeforeEach
    void setUp() {
        fx = new ReportFixture(jdbc);
        farmerUser = fx.user("farmer", "Deal seller", "x");
        stall = fx.farmer(farmerUser, "Deal stall", "approved");
        market = fx.market("Deal market");
        customer = fx.user("customer", "Deal buyer", "x");
        product = fx.product(stall, fx.category(), "Tomato", 2);
        jdbc.update("UPDATE products SET shelf_life_days = 7 WHERE id = ?", product);
        fx.everyDayTemplate(stall, product, 20);
        // A free 07:00 slot on every day from today+2 to today+13
        fx.sellsEveryDay(stall, market);
        slot =
                jdbc.queryForObject(
                        "SELECT s.id FROM pickup_slots s JOIN farmer_markets fm ON fm.id ="
                                + " s.farmer_market_id WHERE fm.farmer_id = ? AND s.slot_date = ?",
                        Long.class,
                        stall,
                        PICKUP);
    }

    @Test
    void anOrderOnADealDayPaysTheDealPriceAndKeepsTheBatchPromise() {
        deals.post(farmerUser, product, PICKUP, new DealRequest(5, TODAY, 40));

        orders.place(customer, order(2));
        entityManager.flush();

        Map<String, Object> line =
                jdbc.queryForMap(
                        "SELECT unit_price, list_price, best_before FROM order_items WHERE"
                                + " product_id = ?",
                        product);
        assertThat((BigDecimal) line.get("unit_price")).isEqualByComparingTo("1.20");
        assertThat((BigDecimal) line.get("list_price")).isEqualByComparingTo("2.00");
        assertThat(line.get("best_before").toString()).isEqualTo(TODAY.plusDays(6).toString());
        assertThat(quantityOn(PICKUP)).isEqualTo(3);
    }

    /**
     * One price, one row (spec §4.5.5): the cart previewed for the deal day shows exactly what
     * placing the order for that day then charges and copies onto its line.
     */
    @Test
    void thePreviewForTheDealDayShowsWhatThePlacedLineCopies() {
        deals.post(farmerUser, product, PICKUP, new DealRequest(5, TODAY, 40));

        PreviewItemResource previewed =
                orders.preview(
                                customer,
                                new PreviewRequest(
                                        List.of(new CartLine(product, 2)),
                                        List.of(new PickupDateInput(stall, PICKUP))))
                        .getFirst()
                        .items()
                        .getFirst();
        long orderId = orders.place(customer, order(2)).getFirst().orderId();
        entityManager.flush();
        OrderItemResource placed = orders.detail(customer, orderId).items().getFirst();

        assertThat(previewed.discountPercent()).isEqualTo(40);
        assertThat(previewed.unitPrice()).isEqualByComparingTo(placed.unitPrice());
        assertThat(previewed.listPrice()).isEqualByComparingTo(placed.listPrice());
        assertThat(previewed.bestBefore()).isEqualTo(placed.bestBefore());
        // order_items keeps no percent: the placed list price at the previewed percent must give
        // back the placed price
        assertThat(DealPolicy.dealPrice(placed.listPrice(), previewed.discountPercent()))
                .isEqualByComparingTo(placed.unitPrice());
    }

    /** Spec §8: an order placed before the deal keeps its price; the next one pays the deal. */
    @Test
    void anOrderPlacedBeforeTheDealKeepsItsPrice() {
        orders.place(customer, order(1));
        deals.post(farmerUser, product, PICKUP, new DealRequest(5, TODAY, 40));
        orders.place(fx.user("customer", "Second buyer", "x"), order(1));
        entityManager.flush();

        List<Map<String, Object>> lines =
                jdbc.queryForList(
                        "SELECT unit_price, list_price FROM order_items WHERE product_id = ?"
                                + " ORDER BY id",
                        product);
        assertThat((BigDecimal) lines.get(0).get("unit_price")).isEqualByComparingTo("2.00");
        assertThat(lines.get(0).get("list_price")).isNull();
        assertThat((BigDecimal) lines.get(1).get("unit_price")).isEqualByComparingTo("1.20");
        assertThat((BigDecimal) lines.get(1).get("list_price")).isEqualByComparingTo("2.00");
    }

    /** Spec §8: editing the product's shelf life after posting leaves the batch's best-before. */
    @Test
    void editingTheShelfLifeLaterKeepsTheBatchBestBefore() {
        deals.post(farmerUser, product, PICKUP, new DealRequest(5, TODAY, 40));
        entityManager.flush();
        jdbc.update("UPDATE products SET shelf_life_days = 3 WHERE id = ?", product);
        // Read the product again, as a later request would
        entityManager.clear();

        orders.place(customer, order(1));
        entityManager.flush();

        assertThat(
                        jdbc.queryForObject(
                                "SELECT best_before FROM order_items WHERE product_id = ?",
                                LocalDate.class,
                                product))
                .isEqualTo(TODAY.plusDays(6));
    }

    @Test
    void removingTheDealRestoresThePriceAndKeepsTheQuantity() {
        deals.post(farmerUser, product, PICKUP, new DealRequest(5, TODAY, 40));
        deals.remove(farmerUser, product, PICKUP);
        entityManager.flush();

        Map<String, Object> row =
                jdbc.queryForMap(
                        "SELECT quantity_available, unit_price, list_price, discount_percent,"
                                + " packed_on, best_before FROM product_daily_stock WHERE"
                                + " product_id = ? AND stock_date = ?",
                        product,
                        PICKUP);
        assertThat(row.get("quantity_available")).isEqualTo(5);
        assertThat((BigDecimal) row.get("unit_price")).isEqualByComparingTo("2.00");
        assertThat(row.get("list_price")).isNull();
        assertThat(row.get("discount_percent")).isNull();
        assertThat(row.get("packed_on")).isNull();
        assertThat(row.get("best_before")).isNull();
    }

    /**
     * Tomorrow has no slot in this fixture (slots start at today+2), so nobody can order for it.
     */
    @Test
    void aDayWithoutASlotCannotGoOnADeal() {
        assertThatThrownBy(
                        () ->
                                deals.post(
                                        farmerUser,
                                        product,
                                        TODAY.plusDays(1),
                                        new DealRequest(5, TODAY.minusDays(3), 40)))
                .isInstanceOf(DateNotOrderableException.class);
    }

    private PlaceOrderRequest order(int quantity) {
        return new PlaceOrderRequest(
                List.of(
                        new OrderGroupInput(
                                stall,
                                market,
                                slot,
                                PICKUP,
                                List.of(new CartLine(product, quantity)),
                                null)));
    }

    private int quantityOn(LocalDate day) {
        return jdbc.queryForObject(
                "SELECT quantity_available FROM product_daily_stock WHERE product_id = ? AND"
                        + " stock_date = ?",
                Integer.class,
                product,
                day);
    }
}
