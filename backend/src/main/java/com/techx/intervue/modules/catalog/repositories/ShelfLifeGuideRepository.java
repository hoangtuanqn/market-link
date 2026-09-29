package com.techx.intervue.modules.catalog.repositories;

import com.techx.intervue.modules.catalog.entities.ShelfLifeGuide;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ShelfLifeGuideRepository extends JpaRepository<ShelfLifeGuide, Long> {

    List<ShelfLifeGuide> findByCategoryIdAndActiveTrueOrderByGroupNameAscStorageModeAsc(
            Long categoryId);

    List<ShelfLifeGuide> findByCategoryIdOrderByGroupNameAscStorageModeAsc(Long categoryId);

    Optional<ShelfLifeGuide> findFirstByCategoryIdAndGroupNameOrderByIdAsc(
            Long categoryId, String groupName);
}
