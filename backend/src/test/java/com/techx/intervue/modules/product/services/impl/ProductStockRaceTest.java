package com.techx.intervue.modules.product.services.impl;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.product.entities.Product;
import com.techx.intervue.modules.product.enums.ProductStatus;
import com.techx.intervue.modules.product.repositories.ProductRepository;
import com.techx.intervue.modules.product.services.interfaces.ProductServiceInterface;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Task 5.3b (D-02, Review Focus #1 bằng đường khác). Luồng A đóng vai {@code OrderService.place}:
 * khoá dòng sản phẩm, trừ tồn kho về 0 và đặt {@code sold_out}, rồi giữ transaction mở ~500ms trước
 * khi commit. Luồng B đóng vai Farmer đổi trạng thái ngay giữa lúc đó. Trên code cũ (chưa khoá), B
 * nạp bản snapshot cũ (tồn = 1) rồi ghi đè khi A vừa commit xong — tồn kho hồi sinh. Sau khi sửa, B
 * phải chờ khoá của A và đọc đúng tồn = 0.
 *
 * <p>Chạy trên MySQL thật (không {@code @Transactional}: mỗi luồng phải commit thật thì khoá mới có
 * nghĩa). DB dev dùng chung với seed demo, nên mọi dòng test tạo ra đều mang tên riêng và bị xoá ở
 * {@code @AfterEach} (C5-7).
 */
@SpringBootTest
class ProductStockRaceTest {

    @Autowired private ProductServiceInterface productService;
    @Autowired private ProductRepository products;
    @Autowired private PlatformTransactionManager txManager;
    @Autowired private JdbcTemplate jdbc;

    private final String tag = UUID.randomUUID().toString().substring(0, 8);
    private Long categoryId;
    private Long farmerUserId;
    private Long farmerId;
    private Long productId;

    @BeforeEach
    void setUp() {
        categoryId =
                insert(
                        "INSERT INTO categories (name, slug) VALUES (?, ?)",
                        "Khoá tồn kho " + tag,
                        "stock-lock-" + tag);
        farmerUserId =
                insert(
                        "INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?,"
                                + " 'x', 'farmer')",
                        "Race farmer " + tag,
                        "farmer-" + tag + "@stock-race.test");
        farmerId =
                insert(
                        "INSERT INTO farmer_profiles (user_id, stall_name, contact_person,"
                                + " approval_status) VALUES (?, ?, ?, 'approved')",
                        farmerUserId,
                        "Stall khoá tồn kho " + tag,
                        "Người bán " + tag);
        // status bắt đầu là 'sold_out' (Farmer tự đặt trước đó): setStatus(AVAILABLE) của luồng B
        // dưới đây vì vậy là một thay đổi thật (Hibernate không @DynamicUpdate chỉ phát UPDATE khi
        // có cột dirty) — nếu bắt đầu 'available' thì setStatus(AVAILABLE) là no-op, Hibernate bỏ
        // qua UPDATE hoàn toàn và không bao giờ đụng tới stock_quantity, che mất lỗi cần bắt.
        productId =
                insert(
                        "INSERT INTO products (farmer_id, category_id, name, price, unit,"
                                + " stock_quantity, status) VALUES (?, ?, ?, 15000, 'kg', 1,"
                                + " 'sold_out')",
                        farmerId,
                        categoryId,
                        "Lô cuối " + tag);
    }

    @AfterEach
    void tearDown() {
        jdbc.update("DELETE FROM products WHERE id = ?", productId);
        jdbc.update("DELETE FROM farmer_profiles WHERE id = ?", farmerId);
        jdbc.update("DELETE FROM users WHERE id = ?", farmerUserId);
        jdbc.update("DELETE FROM categories WHERE id = ?", categoryId);
    }

    @Test
    void statusToggleDuringAnOrderDoesNotBringStockBack() throws Exception {
        CountDownLatch stockDeducted = new CountDownLatch(1);
        TransactionTemplate orderTx = new TransactionTemplate(txManager);
        ExecutorService pool = Executors.newFixedThreadPool(2);

        var orderThread =
                pool.submit(
                        () ->
                                orderTx.executeWithoutResult(
                                        status -> {
                                            Product locked =
                                                    products.lockAllById(List.of(productId)).get(0);
                                            locked.setStockQuantity(0);
                                            locked.setStatus(ProductStatus.SOLD_OUT);
                                            products.save(locked);
                                            stockDeducted.countDown();
                                            sleepQuietly(500);
                                        }));

        var editThread =
                pool.submit(
                        () -> {
                            stockDeducted.await();
                            productService.setStatus(
                                    farmerUserId, productId, ProductStatus.AVAILABLE);
                            return null;
                        });

        orderThread.get(10, TimeUnit.SECONDS);
        editThread.get(10, TimeUnit.SECONDS);
        pool.shutdown();

        Integer stock =
                jdbc.queryForObject(
                        "SELECT stock_quantity FROM products WHERE id = ?",
                        Integer.class,
                        productId);
        assertThat(stock)
                .as("order's stock deduction must survive the concurrent status edit")
                .isZero();
    }

    private static void sleepQuietly(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(e);
        }
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
