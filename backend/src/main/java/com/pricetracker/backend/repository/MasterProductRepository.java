package com.pricetracker.backend.repository;

import com.pricetracker.backend.entity.MasterProduct;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MasterProductRepository extends JpaRepository<MasterProduct, Long> {

    Optional<MasterProduct> findByBrandIgnoreCaseAndModelNumberIgnoreCaseAndVariantValueIgnoreCase(
            String brand,
            String modelNumber,
            String variantValue
    );

    Optional<MasterProduct> findByBrandIgnoreCaseAndModelNumberIgnoreCaseAndVariantValueIsNull(
            String brand,
            String modelNumber
    );
}