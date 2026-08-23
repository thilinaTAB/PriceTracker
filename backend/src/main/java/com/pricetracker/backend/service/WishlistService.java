package com.pricetracker.backend.service;

import com.pricetracker.backend.dto.response.WishlistResponseDTO;
import com.pricetracker.backend.entity.MasterProduct;
import com.pricetracker.backend.entity.User;
import com.pricetracker.backend.entity.Wishlist;
import com.pricetracker.backend.exception.ResourceNotFoundException;
import com.pricetracker.backend.exception.WishlistItemAlreadyExistsException;
import com.pricetracker.backend.repository.MasterProductRepository;
import com.pricetracker.backend.repository.ProductRepository;
import com.pricetracker.backend.repository.UserRepository;
import com.pricetracker.backend.repository.WishlistRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class WishlistService {

    private final WishlistRepository wishlistRepository;
    private final UserRepository userRepository;
    private final MasterProductRepository masterProductRepository;
    private final ProductRepository productRepository;

    @Transactional(readOnly = true)
    public List<WishlistResponseDTO> getWishlistForUser(String email) {
        User user = getUserByEmail(email);
        return wishlistRepository.findByUser(user)
                .stream()
                .map(this::convertToResponseDTO)
                .collect(Collectors.toList());
    }

    public WishlistResponseDTO addToWishlist(String email, Long masterProductId) {
        User user = getUserByEmail(email);
        MasterProduct masterProduct = masterProductRepository.findById(masterProductId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Product not found with id: " + masterProductId));

        if (wishlistRepository.existsByUserAndMasterProduct(user, masterProduct)) {
            throw new WishlistItemAlreadyExistsException(
                    "This product is already in your wishlist");
        }

        Wishlist wishlist = new Wishlist();
        wishlist.setUser(user);
        wishlist.setMasterProduct(masterProduct);

        return convertToResponseDTO(wishlistRepository.save(wishlist));
    }

    public void removeFromWishlist(String email, Long masterProductId) {
        User user = getUserByEmail(email);
        MasterProduct masterProduct = masterProductRepository.findById(masterProductId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Product not found with id: " + masterProductId));

        Wishlist wishlist = wishlistRepository.findByUserAndMasterProduct(user, masterProduct)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Wishlist item not found"));

        wishlistRepository.delete(wishlist);
    }

    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "User not found with email: " + email));
    }

    private WishlistResponseDTO convertToResponseDTO(Wishlist wishlist) {
        MasterProduct masterProduct = wishlist.getMasterProduct();

        WishlistResponseDTO dto = new WishlistResponseDTO();
        dto.setId(wishlist.getId());
        dto.setMasterProductId(masterProduct.getId());
        dto.setName(masterProduct.getName());
        dto.setBrand(masterProduct.getBrand());
        dto.setModelNumber(masterProduct.getModelNumber());
        dto.setImageUrl(masterProduct.getImageUrl());
        dto.setCategory(masterProduct.getCategory());
        dto.setSubCategory(masterProduct.getSubCategory());
        dto.setLowestPrice(productRepository.findLowestPriceByMasterProductId(masterProduct.getId()));
        dto.setCreatedAt(wishlist.getCreatedAt());
        return dto;
    }
}