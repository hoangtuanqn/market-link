package com.techx.intervue.modules.product.repositories;

import com.techx.intervue.modules.product.entities.Product;
import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProductRepository extends JpaRepository<Product, Long> {
    Optional<Product> findByIdAndDeletedFalse(Long id);

    /**
     * Khoá dòng sản phẩm cho tới hết transaction. Không có nó thì hai đơn cùng đọc stock = 1, cùng
     * thấy đủ, cùng trừ, và tồn kho xuống âm (Review focus #1).
     *
     * <p>{@code order by p.id} không phải để sắp xếp kết quả: nó ép mọi transaction khoá các dòng
     * theo cùng thứ tự, nên hai đơn có chung hai sản phẩm không khoá chéo nhau thành deadlock
     * (C5-2).
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Product p where p.id in :ids order by p.id")
    List<Product> lockAllById(@Param("ids") Collection<Long> ids);
}
