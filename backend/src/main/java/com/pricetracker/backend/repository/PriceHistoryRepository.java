package com.pricetracker.backend.repository;

import com.pricetracker.backend.dto.response.PriceHistoryResponseDTO;
import com.pricetracker.backend.entity.PriceHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PriceHistoryRepository extends JpaRepository<PriceHistory, Long> {
    List<PriceHistory> findByProductId(Long productId);
}
