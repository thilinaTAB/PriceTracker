package com.pricetracker.backend.controller;

import com.pricetracker.backend.dto.request.ShopRequestDTO;
import com.pricetracker.backend.dto.response.ShopResponseDTO;
import com.pricetracker.backend.service.ShopService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/shops")
@RequiredArgsConstructor
public class ShopController {

    private final ShopService shopService;

    @GetMapping
    public ResponseEntity<List<ShopResponseDTO>> getAllShops() {
        return ResponseEntity.ok(shopService.getAllShops());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ShopResponseDTO> getShopById(@PathVariable Long id) {
        return ResponseEntity.ok(shopService.getShopById(id));
    }

    @PostMapping
    public ResponseEntity<ShopResponseDTO> createShop(@Valid @RequestBody ShopRequestDTO shop) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(shopService.createShop(shop));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ShopResponseDTO> updateShop(@PathVariable Long id,
                                                      @Valid @RequestBody ShopRequestDTO shop) {
        return ResponseEntity.ok(shopService.updateShop(id, shop));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteShop(@PathVariable Long id) {
        shopService.deleteShop(id);
        return ResponseEntity.noContent().build();
    }
}