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

    long countByCategoryIdAndDeletedFalse(Long categoryId);

    @Modifying
    @Query(
            "update Product p set p.categoryId = :newCategoryId, p.shelfLifeGuideId = null"
                    + " where p.categoryId = :oldCategoryId")
    void reassignCategory(
            @Param("oldCategoryId") long oldCategoryId, @Param("newCategoryId") long newCategoryId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Product p where p.id in :ids order by p.id")
    List<Product> lockAllById(@Param("ids") Collection<Long> ids);
}
