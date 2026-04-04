package com.pricetracker.backend.repository;

import com.pricetracker.backend.entity.Product;
import com.pricetracker.backend.entity.Shop;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    List<Product> findByShop(Shop shop);
}
