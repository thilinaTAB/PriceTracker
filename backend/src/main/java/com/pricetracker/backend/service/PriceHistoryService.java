package com.pricetracker.backend.service;

import com.pricetracker.backend.dto.response.PriceHistoryResponseDTO;
import com.pricetracker.backend.entity.PriceHistory;
import com.pricetracker.backend.repository.PriceHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PriceHistoryService {

    private final PriceHistoryRepository priceHistoryRepository;

    public List<PriceHistoryResponseDTO> getPriceHistoryByProductId(Long productId) {
        List<PriceHistory> histories = priceHistoryRepository.findByProductId(productId);
        return histories.stream()
                .map(this::convertToResponseDTO)
                .toList();
    }

    public PriceHistoryResponseDTO convertToResponseDTO(PriceHistory priceHistory) {
        PriceHistoryResponseDTO dto = new PriceHistoryResponseDTO();
        dto.setId(priceHistory.getId());
        dto.setProductId(priceHistory.getProduct().getId());
        dto.setPrice(priceHistory.getPrice());
        dto.setRecordedAt(priceHistory.getRecordedAt());

        return dto;
    }
}
