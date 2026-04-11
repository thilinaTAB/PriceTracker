package com.pricetracker.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class ShopRequestDTO {

    @NotBlank(message = "Shop name cannot be empty")
    private String name;

    @NotBlank(message = "Shop URL cannot be empty")
    @Pattern(regexp = "^https?://.*", message = "Website URL must start with http:// or https://")
    private String websiteUrl;

    @NotBlank(message = "Logo URL cannot be empty")
    @Pattern(regexp = "^https?://.*", message = "Logo URL must start with http:// or https://")
    private String logoUrl;

    private boolean active;

}
