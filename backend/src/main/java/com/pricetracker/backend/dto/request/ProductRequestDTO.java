package com.pricetracker.backend.dto.request;

import com.pricetracker.backend.util.enums.Category;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class ProductRequestDTO {
    @NotBlank(message = "Product name cannot be empty")
    private String name;

    private String description;

    @NotNull(message = "Price cannot be empty")
    @DecimalMin(value = "0.0", message = "Price cannot be negative")
    private BigDecimal price;

    private BigDecimal previousPrice;

    @Pattern(regexp = "^https?://.*", message = "Image URL must start with http:// or https://")
    private String imageUrl;

    @NotBlank(message = "Product URL cannot be empty")
    @Pattern(regexp = "^https?://.*", message = "Product URL must start with http:// or https://")
    private String sourceUrl;

    @NotNull(message = "Must be selected a category")
    private Category category;

    private Boolean isPromotion = false;

    private Boolean isAvailable = true;

    @NotNull(message = "Shop cannot be empty")
    private Long shopId;
}
