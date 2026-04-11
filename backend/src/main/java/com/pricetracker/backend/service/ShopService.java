package com.pricetracker.backend.service;

import com.pricetracker.backend.dto.request.ShopRequestDTO;
import com.pricetracker.backend.dto.response.ShopResponseDTO;
import com.pricetracker.backend.entity.Shop;
import com.pricetracker.backend.exception.ResourceNotFoundException;
import com.pricetracker.backend.repository.ShopRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ShopService {

    private final ShopRepository shopRepository;

    public List<ShopResponseDTO> getAllShops() {
        return shopRepository.findAll()
                .stream()
                .map(this::convertToResponseDTO)
                .collect(Collectors.toList());
    }

    public ShopResponseDTO getShopById(Long id) {
        Shop shop = shopRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Shop not found with id: " + id));
        return convertToResponseDTO(shop);
    }

    public ShopResponseDTO createShop(ShopRequestDTO requestDTO) {
        Shop shop = convertToEntity(requestDTO);
        return convertToResponseDTO(shopRepository.save(shop));
    }

    public ShopResponseDTO updateShop(Long id, ShopRequestDTO requestDTO) {
        Shop existingShop = shopRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Shop not found with id: " + id));

        existingShop.setName(requestDTO.getName());
        existingShop.setWebsiteUrl(requestDTO.getWebsiteUrl());
        existingShop.setLogoUrl(requestDTO.getLogoUrl());
        existingShop.setActive(requestDTO.isActive());

        return convertToResponseDTO(shopRepository.save(existingShop));
    }

    public void deleteShop(Long id) {
        Shop shop = shopRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Shop not found with id: " + id));
        shopRepository.delete(shop);
    }

    private ShopResponseDTO convertToResponseDTO(Shop shop) {
        ShopResponseDTO dto = new ShopResponseDTO();
        dto.setId(shop.getId());
        dto.setName(shop.getName());
        dto.setWebsiteUrl(shop.getWebsiteUrl());
        dto.setLogoUrl(shop.getLogoUrl());
        dto.setActive(shop.isActive());
        dto.setCreatedAt(shop.getCreatedAt());
        return dto;
    }

    private Shop convertToEntity(ShopRequestDTO dto) {
        Shop shop = new Shop();
        shop.setName(dto.getName());
        shop.setWebsiteUrl(dto.getWebsiteUrl());
        shop.setLogoUrl(dto.getLogoUrl());
        shop.setActive(dto.isActive());
        return shop;
    }
}