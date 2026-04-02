package com.pricetracker.backend.dto.response;

import com.pricetracker.backend.entity.Category;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class ProductResponseDTO {
    private Long id;
    private String name;
    private String description;
    private BigDecimal price;
    private BigDecimal previousPrice;
    private String imageUrl;
    private String sourceUrl;
    private Category category;
    private Boolean isPromotion;
    private Boolean isAvailable;
    private Long shopId;
    private String shopName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

}
