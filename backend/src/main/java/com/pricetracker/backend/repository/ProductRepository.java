package com.pricetracker.backend.repository;

import com.pricetracker.backend.entity.Product;
import com.pricetracker.backend.entity.Shop;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    List<Product> findByShop(Shop shop);
    Optional<Product> findBySourceUrl(String sourceUrl);
    List<Product> findByNameContainingIgnoreCase(String query);
    List<Product> findByIsAvailable(Boolean isAvailable);

    @Query("SELECT DISTINCT p.brand FROM Product p WHERE p.brand IS NOT NULL")
    List<String> findAllDistinctBrands();

    @Query("SELECT MIN(p.price) FROM Product p WHERE p.masterProduct.id = :masterProductId")
    BigDecimal findLowestPriceByMasterProductId(@Param("masterProductId") Long masterProductId);

    @Query("""
    SELECT DISTINCT p
    FROM Product p
    JOIN p.shop s
    JOIN s.locations l
    WHERE LOWER(l.location) = LOWER(:location)
""")
    List<Product> findByShopLocations(
            @Param("location") String location
    );

    @Query("""
    SELECT DISTINCT p
    FROM Product p
    JOIN p.shop s
    JOIN s.locations l
    WHERE p.isAvailable = :isAvailable
    AND LOWER(l.location) = LOWER(:location)
""")
    List<Product> findByIsAvailableAndShopLocations(
            @Param("isAvailable") Boolean isAvailable,
            @Param("location") String location
    );
}