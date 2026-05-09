package com.pricetracker.backend.service;

import com.pricetracker.backend.dto.response.ProductResponseDTO;
import com.pricetracker.backend.entity.Product;
import com.pricetracker.backend.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CompareService {

    private final ProductRepository productRepository;
    private final ProductService productService;

    @Transactional(readOnly = true)
    public List<ProductResponseDTO> compareProducts(String query, Boolean isAvailable, String sortBy) {
        List<Product> products = productRepository.findByNameContainingIgnoreCase(query);

        return products.stream()
                .filter(p -> isAvailable == null || p.getIsAvailable().equals(isAvailable))
                .sorted((p1, p2) -> "price".equals(sortBy) ? p1.getPrice().compareTo(p2.getPrice()) : 0)
                .map(productService::convertToResponseDTO)
                .toList();
    }
}