package com.pricetracker.backend.controller;

import com.pricetracker.backend.dto.request.UpdateProfileRequestDTO;
import com.pricetracker.backend.dto.response.ProfileResponseDTO;
import com.pricetracker.backend.entity.User;
import com.pricetracker.backend.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<ProfileResponseDTO> getProfile(
            Authentication authentication
    ) {
        User user = userService.getUserByEmail(
                authentication.getName()
        );

        return ResponseEntity.ok(toResponse(user));
    }

    @PutMapping("/me")
    public ResponseEntity<ProfileResponseDTO> updateProfile(
            Authentication authentication,
            @Valid @RequestBody UpdateProfileRequestDTO request
    ) {
        User user = userService.updateProfile(
                authentication.getName(),
                request
        );

        return ResponseEntity.ok(toResponse(user));
    }

    private ProfileResponseDTO toResponse(User user) {
        return new ProfileResponseDTO(
                user.getFirstName(),
                user.getLastName(),
                user.getEmail(),
                user.getRole().name(),
                user.getCreatedAt()
        );
    }
}