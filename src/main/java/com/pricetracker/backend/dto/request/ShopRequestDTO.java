package com.pricetracker.backend.dto.request;

import lombok.Data;

@Data
public class ShopRequestDTO {

    private String name;
    private String websiteUrl;
    private String logoUrl;
    private boolean active;

}
