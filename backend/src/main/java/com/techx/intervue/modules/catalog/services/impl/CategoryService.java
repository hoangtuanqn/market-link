package com.techx.intervue.modules.catalog.services.impl;

import com.techx.intervue.modules.catalog.entities.Category;
import com.techx.intervue.modules.catalog.exceptions.CategoryNotFoundException;
import com.techx.intervue.modules.catalog.exceptions.DuplicateCategoryException;
import com.techx.intervue.modules.catalog.repositories.CategoryRepository;
import com.techx.intervue.modules.catalog.requests.CategoryRequest;
import com.techx.intervue.modules.catalog.resources.CategoryResource;
import com.techx.intervue.modules.catalog.services.interfaces.CategoryServiceInterface;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@AllArgsConstructor
public class CategoryService implements CategoryServiceInterface {

    private final CategoryRepository repository;

    /**
     * "Rau củ" -> "rau-cu". Strip Vietnamese diacritics first, then lowercase and join with
     * hyphens.
     */
    static String slugify(String name) {
        String plain =
                Normalizer.normalize(name, Normalizer.Form.NFD)
                        .replaceAll("\\p{M}", "")
                        .replace('đ', 'd')
                        .replace('Đ', 'D');
        return plain.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
    }

    @Override
    public List<CategoryResource> listActive() {
        return repository.findByActiveTrueOrderBySortOrderAscNameAsc().stream()
                .map(CategoryService::toResource)
                .toList();
    }

    @Override
    public List<CategoryResource> listAll() {
        return repository.findAllByOrderBySortOrderAscNameAsc().stream()
                .map(CategoryService::toResource)
                .toList();
    }

    @Override
    @Transactional
    public CategoryResource create(CategoryRequest request) {
        String slug = slugify(request.name());
        if (repository.existsBySlug(slug)) {
            throw new DuplicateCategoryException(slug);
        }
        Category category = new Category();
        apply(category, request, slug);
        return toResource(repository.save(category));
    }

    @Override
    @Transactional
    public CategoryResource update(long id, CategoryRequest request) {
        Category category =
                repository.findById(id).orElseThrow(() -> new CategoryNotFoundException(id));
        String slug = slugify(request.name());
        if (!slug.equals(category.getSlug()) && repository.existsBySlug(slug)) {
            throw new DuplicateCategoryException(slug);
        }
        apply(category, request, slug);
        return toResource(repository.save(category));
    }

    /**
     * Soft delete: old products can still point to it, it only disappears from the customer's
     * filter.
     */
    @Override
    @Transactional
    public void deactivate(long id) {
        Category category =
                repository.findById(id).orElseThrow(() -> new CategoryNotFoundException(id));
        category.setActive(false);
        repository.save(category);
    }

    private static void apply(Category category, CategoryRequest request, String slug) {
        if (request.maxShelfLifeDays() < request.minShelfLifeDays()) {
            throw new InvalidFieldException(
                    "maxShelfLifeDays", "Maximum shelf life must be at least the minimum.");
        }
        category.setName(request.name());
        category.setSlug(slug);
        category.setSortOrder(request.sortOrder());
        category.setMinShelfLifeDays(request.minShelfLifeDays());
        category.setMaxShelfLifeDays(request.maxShelfLifeDays());
    }

    private static CategoryResource toResource(Category c) {
        return new CategoryResource(
                c.getId(),
                c.getName(),
                c.getSlug(),
                c.getSortOrder(),
                c.isActive(),
                c.getMinShelfLifeDays(),
                c.getMaxShelfLifeDays());
    }
}
