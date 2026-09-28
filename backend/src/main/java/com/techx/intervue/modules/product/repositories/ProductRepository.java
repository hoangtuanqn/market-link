package com.techx.intervue.modules.product.repositories;

import com.techx.intervue.modules.product.entities.Product;
import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProductRepository extends JpaRepository<Product, Long> {
    Optional<Product> findByIdAndDeletedFalse(Long id);

    List<Product> findByFarmerIdAndDeletedFalse(Long farmerId);

    /** FR-076 admin category list: how many live products still point at this category. */
    long countByCategoryIdAndDeletedFalse(Long categoryId);

    /**
     * FR-076 admin "move products to another category" before deactivating the old one. FR-120: a
     * product's storage group belongs to its category, so the old category's group is cleared; the
     * product's next save takes a group of the new category, if it has any. The shelf-life numbers
     * stay as they were saved (way of keeping, days, suggestion, promise and its time): they are
     * the snapshot the Farmer agreed to, and order lines carry their own copy.
     */
    @Modifying
    @Query(
            "update Product p set p.categoryId = :newCategoryId, p.shelfLifeGuideId = null"
                    + " where p.categoryId = :oldCategoryId")
    void reassignCategory(
            @Param("oldCategoryId") long oldCategoryId, @Param("newCategoryId") long newCategoryId);

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
