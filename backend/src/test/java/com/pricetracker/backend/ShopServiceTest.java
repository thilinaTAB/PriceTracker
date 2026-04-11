package com.pricetracker.backend;

import com.pricetracker.backend.dto.request.ShopRequestDTO;
import com.pricetracker.backend.dto.response.ShopResponseDTO;
import com.pricetracker.backend.entity.Shop;
import com.pricetracker.backend.exception.ResourceNotFoundException;
import com.pricetracker.backend.repository.ShopRepository;
import com.pricetracker.backend.service.ShopService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ShopServiceTest {

    @Mock
    private ShopRepository shopRepository;

    @InjectMocks
    private ShopService shopService;

    private Shop testShop;
    private ShopRequestDTO testRequest;

    @BeforeEach
    void setUp() {
        testShop = new Shop();
        testShop.setId(1L);
        testShop.setName("Keells");
        testShop.setWebsiteUrl("https://www.keells.com");
        testShop.setLogoUrl("https://www.keells.com/logo.png");
        testShop.setActive(true);
        testShop.setCreatedAt(LocalDateTime.now());

        testRequest = new ShopRequestDTO();
        testRequest.setName("Keells");
        testRequest.setWebsiteUrl("https://www.keells.com");
        testRequest.setLogoUrl("https://www.keells.com/logo.png");
        testRequest.setActive(true);
    }

    @Test
    void getAllShops_ShouldReturnListOfShops() {
        when(shopRepository.findAll()).thenReturn(List.of(testShop));

        List<ShopResponseDTO> result = shopService.getAllShops();

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("Keells", result.get(0).getName());
        verify(shopRepository, times(1)).findAll();
    }

    @Test
    void getShopById_WhenShopExists_ShouldReturnShop() {
        when(shopRepository.findById(1L)).thenReturn(Optional.of(testShop));

        ShopResponseDTO result = shopService.getShopById(1L);

        assertNotNull(result);
        assertEquals("Keells", result.getName());
        assertEquals(1L, result.getId());
    }

    @Test
    void getShopById_WhenShopNotExists_ShouldThrowException() {
        when(shopRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> shopService.getShopById(999L));
    }

    @Test
    void createShop_ShouldReturnCreatedShop() {
        when(shopRepository.save(any(Shop.class))).thenReturn(testShop);

        ShopResponseDTO result = shopService.createShop(testRequest);

        assertNotNull(result);
        assertEquals("Keells", result.getName());
        verify(shopRepository, times(1)).save(any(Shop.class));
    }

    @Test
    void deleteShop_WhenShopExists_ShouldDeleteSuccessfully() {
        when(shopRepository.findById(1L)).thenReturn(Optional.of(testShop));
        doNothing().when(shopRepository).delete(testShop);

        assertDoesNotThrow(() -> shopService.deleteShop(1L));
        verify(shopRepository, times(1)).delete(testShop);
    }

    @Test
    void deleteShop_WhenShopNotExists_ShouldThrowException() {
        when(shopRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> shopService.deleteShop(999L));
    }
}