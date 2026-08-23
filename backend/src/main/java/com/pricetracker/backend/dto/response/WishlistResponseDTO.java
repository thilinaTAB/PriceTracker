package com.pricetracker.backend.dto.response;

import com.pricetracker.backend.util.enums.Category;
import com.pricetracker.backend.util.enums.SubCategory;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class WishlistResponseDTO {
    private Long id;
    private Long masterProductId;
    private String name;
    private String brand;
    private String modelNumber;
    private String imageUrl;
    private Category category;
    private SubCategory subCategory;
    private BigDecimal lowestPrice;
    private LocalDateTime createdAt;
}