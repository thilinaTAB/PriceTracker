package com.pricetracker.backend.controller;

import com.pricetracker.backend.dto.response.ProductResponseDTO;
import com.pricetracker.backend.service.CompareService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/compare")
@RequiredArgsConstructor
@Slf4j
public class CompareController {

    private final CompareService compareService;

    @GetMapping("/search")
    public ResponseEntity<List<ProductResponseDTO>> searchAndCompare(@RequestParam String query,
                                                                     @RequestParam(required = false) Boolean isAvailable,
                                                                     @RequestParam(required = false) String sortBy) {
        log.info("Search request received for: {}", query);

        List<ProductResponseDTO> results = compareService.compareProducts(query, isAvailable, sortBy);
        return ResponseEntity.ok(results);
    }
}