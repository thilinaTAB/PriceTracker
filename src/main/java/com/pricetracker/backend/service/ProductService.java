package com.pricetracker.backend.service;

import com.pricetracker.backend.dto.request.ProductRequestDTO;
import com.pricetracker.backend.dto.response.ProductResponseDTO;
import com.pricetracker.backend.entity.Product;
import com.pricetracker.backend.entity.Shop;
import com.pricetracker.backend.exception.ResourceNotFoundException;
import com.pricetracker.backend.repository.ProductRepository;
import com.pricetracker.backend.repository.ShopRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final ShopRepository shopRepository;

    public List<ProductResponseDTO> getAllProducts() {
        return productRepository.findAll()
                .stream()
                .map(this::convertToResponseDTO)
                .collect(Collectors.toList());
    }

    public ProductResponseDTO getProductById(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Product not found with id: " + id));
        return convertToResponseDTO(product);
    }

    public List<ProductResponseDTO> getProductsByShop(Long shopId) {
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Shop not found with id: " + shopId));
        return productRepository.findByShop(shop)
                .stream()
                .map(this::convertToResponseDTO)
                .collect(Collectors.toList());
    }

    public ProductResponseDTO createProduct(ProductRequestDTO requestDTO) {
        Product product = convertToEntity(requestDTO);
        return convertToResponseDTO(productRepository.save(product));
    }

    public ProductResponseDTO updateProduct(Long id, ProductRequestDTO requestDTO) {
        Product existingProduct = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Product not found with id: " + id));

        Shop shop = shopRepository.findById(requestDTO.getShopId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Shop not found with id: " + requestDTO.getShopId()));

        existingProduct.setName(requestDTO.getName());
        existingProduct.setDescription(requestDTO.getDescription());
        existingProduct.setPrice(requestDTO.getPrice());
        existingProduct.setPreviousPrice(requestDTO.getPreviousPrice());
        existingProduct.setImageUrl(requestDTO.getImageUrl());
        existingProduct.setSourceUrl(requestDTO.getSourceUrl());
        existingProduct.setCategory(requestDTO.getCategory());
        existingProduct.setIsPromotion(requestDTO.getIsPromotion());
        existingProduct.setIsAvailable(requestDTO.getIsAvailable());
        existingProduct.setShop(shop);

        return convertToResponseDTO(productRepository.save(existingProduct));
    }

    public void deleteProduct(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Product not found with id: " + id));
        productRepository.delete(product);
    }

    private ProductResponseDTO convertToResponseDTO(Product product) {
        ProductResponseDTO dto = new ProductResponseDTO();
        dto.setId(product.getId());
        dto.setName(product.getName());
        dto.setDescription(product.getDescription());
        dto.setPrice(product.getPrice());
        dto.setPreviousPrice(product.getPreviousPrice());
        dto.setImageUrl(product.getImageUrl());
        dto.setSourceUrl(product.getSourceUrl());
        dto.setCategory(product.getCategory());
        dto.setIsPromotion(product.getIsPromotion());
        dto.setIsAvailable(product.getIsAvailable());
        dto.setShopId(product.getShop().getId());
        dto.setShopName(product.getShop().getName());
        dto.setCreatedAt(product.getCreatedAt());
        dto.setUpdatedAt(product.getUpdatedAt());
        return dto;
    }

    private Product convertToEntity(ProductRequestDTO dto) {
        Shop shop = shopRepository.findById(dto.getShopId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Shop not found with id: " + dto.getShopId()));

        Product product = new Product();
        product.setName(dto.getName());
        product.setDescription(dto.getDescription());
        product.setPrice(dto.getPrice());
        product.setPreviousPrice(dto.getPreviousPrice());
        product.setImageUrl(dto.getImageUrl());
        product.setSourceUrl(dto.getSourceUrl());
        product.setCategory(dto.getCategory());
        product.setIsPromotion(dto.getIsPromotion());
        product.setIsAvailable(dto.getIsAvailable());
        product.setShop(shop);
        return product;
    }
}