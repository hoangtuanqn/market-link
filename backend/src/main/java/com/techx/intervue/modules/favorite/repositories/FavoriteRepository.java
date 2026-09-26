package com.techx.intervue.modules.favorite.repositories;

import com.techx.intervue.modules.favorite.entities.Favorite;
import com.techx.intervue.modules.favorite.enums.FavoriteTargetType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FavoriteRepository extends JpaRepository<Favorite, Long> {

    Optional<Favorite> findByCustomerIdAndTargetTypeAndTargetId(
            Long customerId, FavoriteTargetType targetType, Long targetId);

    /** FR-041: every account that favourited this product. */
    @Query(
            "select f.customerId from Favorite f where f.targetType ="
                    + " com.techx.intervue.modules.favorite.enums.FavoriteTargetType.PRODUCT"
                    + " and f.productId = :productId")
    List<Long> customerIdsFavouritingProduct(@Param("productId") Long productId);
}
