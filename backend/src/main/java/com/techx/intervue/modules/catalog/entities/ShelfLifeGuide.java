package com.techx.intervue.modules.catalog.entities;

import com.techx.intervue.modules.catalog.enums.StorageMode;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * FR-120: one group of products inside a category, kept one way, with the shelf life the app
 * suggests. Master data managed by the admin. Table `shelf_life_guides` (V20260927003).
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "shelf_life_guides")
public class ShelfLifeGuide {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "category_id", nullable = false)
    private Long categoryId;

    @Column(name = "group_name", nullable = false, length = 80)
    private String groupName;

    /** Comma-separated product words shown to the Farmer and used to pick the group by name. */
    @Column(nullable = false, length = 255)
    private String examples = "";

    @Convert(converter = StorageMode.DbConverter.class)
    @Column(name = "storage_mode", nullable = false)
    private StorageMode storageMode;

    @Column(name = "suggested_days", nullable = false)
    private int suggestedDays;

    /** Soft delete, like categories: products that point to it keep their saved numbers. */
    @Column(name = "is_active", nullable = false)
    private boolean active = true;
}
