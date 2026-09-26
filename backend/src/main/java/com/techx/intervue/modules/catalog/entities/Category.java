package com.techx.intervue.modules.catalog.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * FR-076 master data managed by the admin; FR-020 customers filter products by it. Table
 * `categories` (V20260926008).
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "categories")
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 80)
    private String name;

    @Column(nullable = false, unique = true, length = 80)
    private String slug;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    /**
     * The category's standard shelf-life range — a suggestion and a soft constraint for
     * Product.shelfLifeDays.
     */
    @Column(name = "min_shelf_life_days", nullable = false)
    private int minShelfLifeDays;

    @Column(name = "max_shelf_life_days", nullable = false)
    private int maxShelfLifeDays;

    /**
     * Soft delete: once disabled it disappears from the customer's filter, old products can still
     * point to it.
     */
    @Column(name = "is_active", nullable = false)
    private boolean active = true;
}
