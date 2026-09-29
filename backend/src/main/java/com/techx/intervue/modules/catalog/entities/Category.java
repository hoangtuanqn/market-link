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

    @Column(name = "min_shelf_life_days", nullable = false)
    private int minShelfLifeDays;

    @Column(name = "max_shelf_life_days", nullable = false)
    private int maxShelfLifeDays;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;
}
