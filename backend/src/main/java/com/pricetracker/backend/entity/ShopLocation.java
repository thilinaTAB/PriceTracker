package com.pricetracker.backend.entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(
        name = "shop_locations",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_shop_location",
                        columnNames = {"shop_id", "location"}
                )
        }
)
@Data
public class ShopLocation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "shop_id",
            nullable = false,
            foreignKey = @ForeignKey(name = "fk_shop_location_shop")
    )
    private Shop shop;

    @Column(nullable = false, length = 50)
    private String location;
}