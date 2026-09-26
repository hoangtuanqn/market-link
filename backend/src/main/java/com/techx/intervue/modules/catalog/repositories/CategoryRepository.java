package com.techx.intervue.modules.catalog.repositories;

import com.techx.intervue.modules.catalog.entities.Category;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoryRepository extends JpaRepository<Category, Long> {
    boolean existsBySlug(String slug);

    Optional<Category> findBySlug(String slug);

    List<Category> findByActiveTrueOrderBySortOrderAscNameAsc();

    List<Category> findAllByOrderBySortOrderAscNameAsc();
}
