package com.pricetracker.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AuthResponseDTO {

    private String token;
    private String email;
    private String role;
    private String firstName;
    private String lastName;
}