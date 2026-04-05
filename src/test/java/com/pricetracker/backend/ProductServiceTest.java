package com.pricetracker.backend;

import com.pricetracker.backend.dto.request.ProductRequestDTO;
import com.pricetracker.backend.dto.response.ProductResponseDTO;
import com.pricetracker.backend.entity.Product;
import com.pricetracker.backend.entity.Shop;
import com.pricetracker.backend.exception.ResourceNotFoundException;
import com.pricetracker.backend.repository.ProductRepository;
import com.pricetracker.backend.repository.ShopRepository;
import com.pricetracker.backend.service.ProductService;
import com.pricetracker.backend.util.enums.Category;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ProductServiceTest {

    @Mock
    private ProductRepository productRepository;
    @Mock
    private ShopRepository shopRepository;

    @InjectMocks
    private ProductService productService;

    private Product testProduct;
    private Shop testShop;
    private ProductRequestDTO testProductRequestDTO;

    @BeforeEach
    void setUp() {
        testShop = new Shop();
        testShop.setId(1L);
        testShop.setName("Keells");
        testShop.setWebsiteUrl("https://www.keells.com");
        testShop.setLogoUrl("https://www.keells.com/logo.png");
        testShop.setActive(true);

        testProduct = new Product();
        testProduct.setId(1L);
        testProduct.setName("Rice 5kg");
        testProduct.setDescription("Basmati rice");
        testProduct.setPrice(BigDecimal.valueOf(500));
        testProduct.setPreviousPrice(BigDecimal.valueOf(550));
        testProduct.setImageUrl("https://www.keells.com/rice.png");
        testProduct.setSourceUrl("https://www.keells.com/rice-5kg");
        testProduct.setCategory(Category.GROCERY);
        testProduct.setIsPromotion(true);
        testProduct.setIsAvailable(true);
        testProduct.setShop(testShop);

        testProductRequestDTO = new ProductRequestDTO();
        testProductRequestDTO.setName("Rice 5kg");
        testProductRequestDTO.setDescription("Basmati rice");
        testProductRequestDTO.setPrice(BigDecimal.valueOf(500));
        testProductRequestDTO.setPreviousPrice(BigDecimal.valueOf(550));
        testProductRequestDTO.setImageUrl("https://www.keells.com/rice.png");
        testProductRequestDTO.setSourceUrl("https://www.keells.com/rice-5kg");
        testProductRequestDTO.setCategory(Category.GROCERY);
        testProductRequestDTO.setIsPromotion(true);
        testProductRequestDTO.setIsAvailable(true);
        testProductRequestDTO.setShopId(1L);
    }

    @Test
    void getAllProducts_ShouldReturnListOfProducts() {
        when(productRepository.findAll()).thenReturn(List.of(testProduct));

        List<ProductResponseDTO> result = productService.getAllProducts();

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("Rice 5kg", result.getFirst().getName());
        verify(productRepository, times(1)).findAll();
    }

    @Test
    void getProductById_WhenExists_ShouldReturnProduct() {
        when(productRepository.findById(1L)).thenReturn(Optional.of(testProduct));

        ProductResponseDTO result = productService.getProductById(1L);

        assertNotNull(result);
        assertEquals("Rice 5kg", result.getName());
        assertEquals(1L, result.getId());

    }

    @Test
    void getProductById_WhenNotExists_ShouldThrowException() {
        when(productRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> productService.getProductById(999L));
    }

    @Test
    void getProductsByShop_WhenShopExists_ShouldReturnProducts() {
        when(shopRepository.findById(1L)).thenReturn(Optional.of(testShop));
        when(productRepository.findByShop(testShop)).thenReturn(List.of(testProduct));

        List<ProductResponseDTO> result = productService.getProductsByShop(1L);

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("Rice 5kg", result.getFirst().getName());
        verify(productRepository, times(1)).findByShop(testShop);
    }

    @Test
    void getProductsByShop_WhenShopNotExists_ShouldThrowException(){
        when(shopRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> productService.getProductsByShop(999L));
    }

    @Test
    void createProduct_ShouldSaveAndReturn(){
        when(shopRepository.findById(1L)).thenReturn(Optional.of(testShop));
        when(productRepository.save(any(Product.class))).thenReturn(testProduct);

        ProductResponseDTO result = productService.createProduct(testProductRequestDTO);

        assertNotNull(result);
        assertEquals("Rice 5kg", result.getName());
        verify(shopRepository, times(1)).findById(1L);
        verify(productRepository, times(1)).save(any(Product.class));
    }

    @Test
    void  deleteProduct_WhenExists_ShouldDeleteSuccessfully(){
        when(productRepository.findById(1L)).thenReturn(Optional.of(testProduct));
        doNothing().when(productRepository).delete(testProduct);

        assertDoesNotThrow(() -> productService.deleteProduct(1L));
        verify(productRepository, times(1)).delete(testProduct);
    }

    @Test
    void  deleteProduct_WhenNotExists_ShouldThrowException(){
        when(productRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> productService.deleteProduct(999L));
    }
}
