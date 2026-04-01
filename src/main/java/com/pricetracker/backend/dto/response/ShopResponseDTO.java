package com.pricetracker.backend.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ShopResponseDTO {

    private Long id;
    private String name;
    private String websiteUrl;
    private String logoUrl;
    private boolean active;
    private LocalDateTime createdAt;
}
