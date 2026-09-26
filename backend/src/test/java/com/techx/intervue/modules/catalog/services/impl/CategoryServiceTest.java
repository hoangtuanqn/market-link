package com.techx.intervue.modules.catalog.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.catalog.entities.Category;
import com.techx.intervue.modules.catalog.exceptions.CategoryNotFoundException;
import com.techx.intervue.modules.catalog.exceptions.DuplicateCategoryException;
import com.techx.intervue.modules.catalog.repositories.CategoryRepository;
import com.techx.intervue.modules.catalog.requests.CategoryRequest;
import com.techx.intervue.modules.catalog.resources.CategoryResource;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class CategoryServiceTest {

    private CategoryRepository repository;
    private CategoryService service;

    @BeforeEach
    void setUp() {
        repository = mock(CategoryRepository.class);
        service = new CategoryService(repository);
    }

    private static Category leafyGreens() {
        Category c = new Category();
        c.setId(1L);
        c.setName("Leafy greens");
        c.setSlug("leafy-greens");
        c.setSortOrder(1);
        c.setActive(true);
        return c;
    }

    @Test
    void createDerivesSlugFromName() {
        when(repository.existsBySlug("leafy-greens")).thenReturn(false);
        when(repository.save(any(Category.class))).thenAnswer(i -> i.getArgument(0));

        CategoryResource created =
                service.create(new CategoryRequest("Leafy greens", null, null, 1));

        assertThat(created.slug()).isEqualTo("leafy-greens");
        assertThat(created.isActive()).isTrue();
    }

    @Test
    void createStripsVietnameseMarksFromSlug() {
        when(repository.existsBySlug("rau-cu")).thenReturn(false);
        when(repository.save(any(Category.class))).thenAnswer(i -> i.getArgument(0));

        CategoryResource created = service.create(new CategoryRequest("Rau củ", null, null, 0));

        assertThat(created.slug()).isEqualTo("rau-cu");
    }

    @Test
    void createRejectsDuplicateSlug() {
        when(repository.existsBySlug("leafy-greens")).thenReturn(true);

        assertThatThrownBy(() -> service.create(new CategoryRequest("Leafy greens", null, null, 1)))
                .isInstanceOf(DuplicateCategoryException.class);
        verify(repository, never()).save(any());
    }

    @Test
    void deactivateKeepsTheRowSoOldProductsStillResolve() {
        Category c = leafyGreens();
        when(repository.findById(1L)).thenReturn(Optional.of(c));

        service.deactivate(1L);

        assertThat(c.isActive()).isFalse();
        verify(repository).save(c);
    }

    @Test
    void updateOnMissingCategoryThrows() {
        when(repository.findById(77L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.update(77L, new CategoryRequest("X", null, null, 0)))
                .isInstanceOf(CategoryNotFoundException.class);
    }

    @Test
    void listActiveOrdersBySortOrderThenName() {
        Category fruit = leafyGreens();
        fruit.setId(2L);
        fruit.setName("Fruit");
        fruit.setSlug("fruit");
        fruit.setSortOrder(0);
        when(repository.findByActiveTrueOrderBySortOrderAscNameAsc())
                .thenReturn(List.of(fruit, leafyGreens()));

        List<CategoryResource> list = service.listActive();

        assertThat(list)
                .extracting(CategoryResource::slug)
                .containsExactly("fruit", "leafy-greens");
    }
}
