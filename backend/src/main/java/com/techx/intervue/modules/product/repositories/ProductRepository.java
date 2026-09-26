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

    List<Product> findByFarmerIdAndDeletedFalse(Long farmerId);

    /**
     * Locks the product row until the transaction ends. Without it, two orders both read stock = 1,
     * both see enough, both deduct, and stock goes negative (Review focus #1).
     *
     * <p>{@code order by p.id} is not there to sort the result: it forces every transaction to lock
     * rows in the same order, so two orders sharing two products do not lock each other into a
     * deadlock (C5-2).
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Product p where p.id in :ids order by p.id")
    List<Product> lockAllById(@Param("ids") Collection<Long> ids);
}
