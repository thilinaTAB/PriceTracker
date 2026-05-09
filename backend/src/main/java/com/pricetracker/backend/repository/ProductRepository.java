package com.pricetracker.backend.repository;

import com.pricetracker.backend.entity.Product;
import com.pricetracker.backend.entity.Shop;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    List<Product> findByShop(Shop shop);
    Optional<Product> findBySourceUrl(String sourceUrl);
    List<Product> findByNameContainingIgnoreCase(String query);
}
