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

    @Column(nullable = false, length = 255)
    private String examples = "";

    @Convert(converter = StorageMode.DbConverter.class)
    @Column(name = "storage_mode", nullable = false)
    private StorageMode storageMode;

    @Column(name = "suggested_days", nullable = false)
    private int suggestedDays;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;
}
