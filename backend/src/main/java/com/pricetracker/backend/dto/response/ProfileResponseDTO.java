package com.pricetracker.backend.dto.response;

import java.time.LocalDateTime;

public record ProfileResponseDTO(
        String firstName,
        String lastName,
        String email,
        String role,
        LocalDateTime createdAt
) {
}