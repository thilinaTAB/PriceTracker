package com.pricetracker.backend.controller;

import com.pricetracker.backend.dto.response.WishlistResponseDTO;
import com.pricetracker.backend.service.WishlistService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/wishlist")
@RequiredArgsConstructor
public class WishlistController {

    private final WishlistService wishlistService;

    @GetMapping
    public ResponseEntity<List<WishlistResponseDTO>> getWishlist(Authentication authentication) {
        return ResponseEntity.ok(wishlistService.getWishlistForUser(authentication.getName()));
    }

    @PostMapping("/{masterProductId}")
    public ResponseEntity<WishlistResponseDTO> addToWishlist(
            @PathVariable Long masterProductId, Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(wishlistService.addToWishlist(authentication.getName(), masterProductId));
    }

    @DeleteMapping("/{masterProductId}")
    public ResponseEntity<Void> removeFromWishlist(
            @PathVariable Long masterProductId, Authentication authentication) {
        wishlistService.removeFromWishlist(authentication.getName(), masterProductId);
        return ResponseEntity.noContent().build();
    }
}