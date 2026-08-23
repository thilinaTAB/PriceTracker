package com.pricetracker.backend.repository;

import com.pricetracker.backend.entity.MasterProduct;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MasterProductRepository extends JpaRepository<MasterProduct, Long> {
}