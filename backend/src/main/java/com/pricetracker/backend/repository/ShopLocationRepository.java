package com.pricetracker.backend.repository;

import com.pricetracker.backend.entity.ShopLocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ShopLocationRepository
        extends JpaRepository<ShopLocation, Long> {

    List<ShopLocation> findByLocationIgnoreCase(String location);
}