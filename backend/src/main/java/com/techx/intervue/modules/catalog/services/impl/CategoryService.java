package com.techx.intervue.modules.catalog.services.impl;

import com.techx.intervue.modules.catalog.entities.Category;
import com.techx.intervue.modules.catalog.exceptions.CategoryNotFoundException;
import com.techx.intervue.modules.catalog.exceptions.DuplicateCategoryException;
import com.techx.intervue.modules.catalog.repositories.CategoryRepository;
import com.techx.intervue.modules.catalog.requests.CategoryRequest;
import com.techx.intervue.modules.catalog.resources.CategoryResource;
import com.techx.intervue.modules.catalog.services.interfaces.CategoryServiceInterface;
import com.techx.intervue.modules.product.repositories.ProductRepository;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@AllArgsConstructor
public class CategoryService implements CategoryServiceInterface {

    private final CategoryRepository repository;
    private final ProductRepository productRepository;

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
        return withProductCounts(repository.findByActiveTrueOrderBySortOrderAscNameAsc());
    }

    @Override
    public List<CategoryResource> listAll() {
        return withProductCounts(repository.findAllByOrderBySortOrderAscNameAsc());
    }

    /**
     * The categories table is small, admin-curated master data (a handful of rows), so one count
     * query per row is cheap and simpler than a grouped query.
     */
    private List<CategoryResource> withProductCounts(List<Category> categories) {
        return categories.stream()
                .map(
                        c ->
                                toResource(
                                        c,
                                        productRepository.countByCategoryIdAndDeletedFalse(
                                                c.getId())))
                .toList();
    }

    @Override
    @Transactional
    public CategoryResource create(CategoryRequest request) {
        String slug = slugify(request.name());
        // Seeded rows carry slugs slugify would not produce (e.g. "eggs_and_dairy"), so a removed
        // one is also looked up by its name; otherwise the insert hits the unique name.
        Optional<Category> existing =
                repository.findBySlug(slug).or(() -> repository.findByName(request.name()));
        if (existing.isPresent() && existing.get().isActive()) {
            throw new DuplicateCategoryException(slug);
        }
        // A removed category with this name comes back instead of blocking the name for good: the
        // admin cannot see removed ones, so they could never add it again (QA E2E v2
        // CATEGORY-004). Old products that still point to it resolve again.
        Category category = existing.orElseGet(Category::new);
        apply(category, request, existing.map(Category::getSlug).orElse(slug));
        category.setActive(true);
        Category saved = repository.save(category);
        return toResource(saved, productRepository.countByCategoryIdAndDeletedFalse(saved.getId()));
    }

    @Override
    @Transactional
    public CategoryResource update(long id, CategoryRequest request) {
        Category category =
                repository.findById(id).orElseThrow(() -> new CategoryNotFoundException(id));
        // Keep the stored slug unless the name really changed: links and the Home page's icons key
        // on it, and seeded slugs (e.g. "eggs_and_dairy") are not what slugify gives back.
        String slug =
                slugify(request.name()).equals(slugify(category.getName()))
                        ? category.getSlug()
                        : slugify(request.name());
        if (!slug.equals(category.getSlug()) && repository.existsBySlug(slug)) {
            throw new DuplicateCategoryException(slug);
        }
        apply(category, request, slug);
        Category saved = repository.save(category);
        return toResource(saved, productRepository.countByCategoryIdAndDeletedFalse(saved.getId()));
    }

    /**
     * Soft delete: old products can still point to it, it only disappears from the customer's
     * filter. {@code moveToCategoryId}, when given, reassigns every live product off this category
     * first so it can be retired cleanly.
     */
    @Override
    @Transactional
    public void deactivate(long id, Long moveToCategoryId) {
        Category category =
                repository.findById(id).orElseThrow(() -> new CategoryNotFoundException(id));
        if (moveToCategoryId != null) {
            if (moveToCategoryId == id) {
                throw new InvalidFieldException(
                        "moveToCategoryId", "Choose a different category to move products to.");
            }
            Category target =
                    repository
                            .findById(moveToCategoryId)
                            .orElseThrow(() -> new CategoryNotFoundException(moveToCategoryId));
            if (!target.isActive()) {
                throw new InvalidFieldException(
                        "moveToCategoryId", "The target category must be active.");
            }
            productRepository.reassignCategory(id, moveToCategoryId);
        }
        category.setActive(false);
        repository.save(category);
    }

    @Override
    @Transactional
    public CategoryResource activate(long id) {
        Category category =
                repository.findById(id).orElseThrow(() -> new CategoryNotFoundException(id));
        category.setActive(true);
        Category saved = repository.save(category);
        return toResource(saved, productRepository.countByCategoryIdAndDeletedFalse(id));
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

    private static CategoryResource toResource(Category c, long productCount) {
        return new CategoryResource(
                c.getId(),
                c.getName(),
                c.getSlug(),
                c.getSortOrder(),
                c.isActive(),
                c.getMinShelfLifeDays(),
                c.getMaxShelfLifeDays(),
                (int) productCount);
    }
}
