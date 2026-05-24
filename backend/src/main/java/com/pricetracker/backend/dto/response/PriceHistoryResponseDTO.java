package com.pricetracker.backend.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class PriceHistoryResponseDTO {
    private Long id;
    private Long productId;
    private BigDecimal price;
    private LocalDateTime recordedAt;
}
