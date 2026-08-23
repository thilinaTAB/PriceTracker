package com.pricetracker.backend.repository;

import com.pricetracker.backend.entity.MasterProduct;
import com.pricetracker.backend.entity.User;
import com.pricetracker.backend.entity.Wishlist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WishlistRepository extends JpaRepository<Wishlist, Long> {
    List<Wishlist> findByUser(User user);
    boolean existsByUserAndMasterProduct(User user, MasterProduct masterProduct);
    Optional<Wishlist> findByUserAndMasterProduct(User user, MasterProduct masterProduct);
}