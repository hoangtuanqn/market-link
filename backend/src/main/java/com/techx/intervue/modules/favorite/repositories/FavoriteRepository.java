package com.techx.intervue.modules.favorite.repositories;

import com.techx.intervue.modules.favorite.entities.Favorite;
import com.techx.intervue.modules.favorite.enums.FavoriteTargetType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FavoriteRepository extends JpaRepository<Favorite, Long> {

    Optional<Favorite> findByCustomerIdAndTargetTypeAndTargetId(
            Long customerId, FavoriteTargetType targetType, Long targetId);
}
