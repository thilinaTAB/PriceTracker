package com.pricetracker.backend.service;

import com.pricetracker.backend.entity.Shop;
import com.pricetracker.backend.repository.ShopRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ShopService {
    private final ShopRepository shopRepository;

    public List<Shop> getAllShops() {
        return shopRepository.findAll();
    }

    public Shop getShopById(Long id) {
        return shopRepository.findById(id).orElseThrow(() -> new RuntimeException("Shop not found with id: " + id));
    }

    public Shop createShop(Shop shop) {
        return shopRepository.save(shop);
    }

    public Shop updateShop(Long id, Shop updatedShop) {
        Shop existingShop = shopRepository.findById(id).orElseThrow(() -> new RuntimeException("Shop not found with id: " + id));

        existingShop.setName(updatedShop.getName());
        existingShop.setWebsiteUrl(updatedShop.getWebsiteUrl());
        existingShop.setLogoUrl(updatedShop.getLogoUrl());
        existingShop.setActive(updatedShop.isActive());

        return shopRepository.save(existingShop);
    }

    public void deleteShop(Long id) {
        shopRepository.deleteById(id);
    }
}
