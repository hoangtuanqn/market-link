package com.techx.intervue.modules.favorite.entities;

import com.techx.intervue.modules.favorite.enums.FavoriteTargetType;
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
 * FR-040, FR-014 — one favourite stall, product or market of a customer. Exactly one of farmerId /
 * productId / marketId is set (the one matching targetType), and targetId repeats it so the unique
 * key (customer_id, target_type, target_id) works (V20260926018).
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "favorites")
public class Favorite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "customer_id", nullable = false)
    private Long customerId;

    @Column(name = "target_type", nullable = false)
    private FavoriteTargetType targetType;

    @Column(name = "farmer_id")
    private Long farmerId;

    @Column(name = "product_id")
    private Long productId;

    @Column(name = "market_id")
    private Long marketId;

    @Column(name = "target_id", nullable = false)
    private Long targetId;
}
