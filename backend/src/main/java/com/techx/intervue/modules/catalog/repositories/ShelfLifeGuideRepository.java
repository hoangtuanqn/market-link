package com.techx.intervue.modules.catalog.repositories;

import com.techx.intervue.modules.catalog.entities.ShelfLifeGuide;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ShelfLifeGuideRepository extends JpaRepository<ShelfLifeGuide, Long> {

    /** What the product form offers: active rows only, grouped by name, room before chilled. */
    List<ShelfLifeGuide> findByCategoryIdAndActiveTrueOrderByGroupNameAscStorageModeAsc(
            Long categoryId);

    /** What the admin manages: every row of the category, turned-off ones included. */
    List<ShelfLifeGuide> findByCategoryIdOrderByGroupNameAscStorageModeAsc(Long categoryId);

    /**
     * A group of the category with this name, compared under the column's collation
     * (utf8mb4_unicode_ci ignores case and accents), so "rau THOM" finds "Rau thơm".
     */
    Optional<ShelfLifeGuide> findFirstByCategoryIdAndGroupNameOrderByIdAsc(
            Long categoryId, String groupName);
}
