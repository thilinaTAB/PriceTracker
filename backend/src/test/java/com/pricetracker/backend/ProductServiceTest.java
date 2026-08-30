package com.pricetracker.backend;

import com.pricetracker.backend.dto.request.ProductRequestDTO;
import com.pricetracker.backend.dto.response.ProductResponseDTO;
import com.pricetracker.backend.entity.MasterProduct;
import com.pricetracker.backend.entity.Product;
import com.pricetracker.backend.entity.Shop;
import com.pricetracker.backend.exception.ResourceNotFoundException;
import com.pricetracker.backend.repository.MasterProductRepository;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ProductServiceTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private ShopRepository shopRepository;

    @Mock
    private MasterProductRepository masterProductRepository;

    @InjectMocks
    private ProductService productService;

    private Product testProduct;
    private Shop testShop;
    private ProductRequestDTO testProductRequestDTO;
    private MasterProduct testMasterProduct;

    @BeforeEach
    void setUp() {

        // -------------------------
        // Test Shop
        // -------------------------
        testShop = new Shop();
        testShop.setId(1L);
        testShop.setName("Nanotek");
        testShop.setWebsiteUrl("https://www.nanotek.lk");
        testShop.setLogoUrl(
                "https://www.nanotek.lk/logo.png"
        );
        testShop.setActive(true);

        // -------------------------
        // Test Master Product
        // -------------------------
        testMasterProduct = new MasterProduct();
        testMasterProduct.setId(1L);
        testMasterProduct.setName(
                "Corsair RM1200x Shift 80+ GOLD Fully Modular ATX 3.0 & PCIe 5.0"
        );
        testMasterProduct.setBrand("Corsair");
        testMasterProduct.setModelNumber(
                "RM1200x SHIFT"
        );
        testMasterProduct.setCategory(
                Category.ELECTRONICS
        );

        // -------------------------
        // Test Product
        // -------------------------
        testProduct = new Product();
        testProduct.setId(1L);
        testProduct.setName(
                "Corsair RM1200x Shift 80+ GOLD Fully Modular ATX 3.0 & PCIe 5.0"
        );
        testProduct.setBrand("Corsair");
        testProduct.setModelNumber(
                "RM1200x SHIFT"
        );
        testProduct.setDescription(
                "Corsair RM1200x Shift 80+ GOLD Fully Modular ATX 3.0 & PCIe 5.0"
        );
        testProduct.setPrice(
                BigDecimal.valueOf(80000)
        );
        testProduct.setPreviousPrice(
                BigDecimal.valueOf(85000)
        );
        testProduct.setImageUrl(
                "https://www.nanotek.lk/storage/products/486/GQxCyV6uYmopUB9orag8.jpg"
        );
        testProduct.setSourceUrl(
                "https://www.nanotek.lk/product/corsair-rm1200x-shift-80-gold-fully-modular-atx-30-pcie-50"
        );
        testProduct.setCategory(
                Category.ELECTRONICS
        );
        testProduct.setIsPromotion(true);
        testProduct.setIsAvailable(true);
        testProduct.setShop(testShop);
        testProduct.setMasterProduct(
                testMasterProduct
        );

        // -------------------------
        // Test Product Request DTO
        // -------------------------
        testProductRequestDTO =
                new ProductRequestDTO();

        testProductRequestDTO.setName(
                "Corsair RM1200x Shift 80+ GOLD Fully Modular ATX 3.0 & PCIe 5.0"
        );

        testProductRequestDTO.setBrand(
                "Corsair"
        );

        testProductRequestDTO.setModelNumber(
                "RM1200x SHIFT"
        );

        testProductRequestDTO.setDescription(
                "Corsair RM1200x Shift 80+ GOLD Fully Modular ATX 3.0 & PCIe 5.0"
        );

        testProductRequestDTO.setPrice(
                BigDecimal.valueOf(80000)
        );

        testProductRequestDTO.setPreviousPrice(
                BigDecimal.valueOf(85000)
        );

        testProductRequestDTO.setImageUrl(
                "https://www.nanotek.lk/storage/products/486/GQxCyV6uYmopUB9orag8.jpg"
        );

        testProductRequestDTO.setSourceUrl(
                "https://www.nanotek.lk/product/corsair-rm1200x-shift-80-gold-fully-modular-atx-30-pcie-50"
        );

        testProductRequestDTO.setCategory(
                Category.ELECTRONICS
        );

        testProductRequestDTO.setIsPromotion(
                true
        );

        testProductRequestDTO.setIsAvailable(
                true
        );

        testProductRequestDTO.setShopId(
                1L
        );
    }

    // =========================================================
    // GET ALL PRODUCTS
    // =========================================================

    @Test
    void getAllProducts_ShouldReturnListOfProducts() {

        when(productRepository.findAll())
                .thenReturn(List.of(testProduct));

        List<ProductResponseDTO> result =
                productService.getAllProducts(null,null);

        assertNotNull(result);

        assertEquals(
                1,
                result.size()
        );

        assertEquals(
                "Corsair RM1200x Shift 80+ GOLD Fully Modular ATX 3.0 & PCIe 5.0",
                result.getFirst().getName()
        );

        verify(
                productRepository,
                times(1)
        ).findAll();
    }

    // =========================================================
    // GET ALL PRODUCTS - AVAILABLE FILTER
    // =========================================================

    @Test
    void getAllProducts_WhenIsAvailableFilterProvided_ShouldReturnFilteredProducts() {

        when(
                productRepository.findByIsAvailable(true)
        ).thenReturn(
                List.of(testProduct)
        );

        List<ProductResponseDTO> result =
                productService.getAllProducts(true,null);

        assertNotNull(result);

        assertEquals(
                1,
                result.size()
        );

        assertEquals(
                "Corsair RM1200x Shift 80+ GOLD Fully Modular ATX 3.0 & PCIe 5.0",
                result.getFirst().getName()
        );

        verify(
                productRepository,
                times(1)
        ).findByIsAvailable(true);

        verify(
                productRepository,
                times(0)
        ).findAll();
    }

    // =========================================================
    // GET PRODUCT BY ID
    // =========================================================

    @Test
    void getProductById_WhenExists_ShouldReturnProduct() {

        when(
                productRepository.findById(1L)
        ).thenReturn(
                Optional.of(testProduct)
        );

        ProductResponseDTO result =
                productService.getProductById(1L);

        assertNotNull(result);

        assertEquals(
                "Corsair RM1200x Shift 80+ GOLD Fully Modular ATX 3.0 & PCIe 5.0",
                result.getName()
        );

        assertEquals(
                1L,
                result.getId()
        );
    }

    // =========================================================
    // GET PRODUCT BY ID - NOT FOUND
    // =========================================================

    @Test
    void getProductById_WhenNotExists_ShouldThrowException() {

        when(
                productRepository.findById(999L)
        ).thenReturn(
                Optional.empty()
        );

        assertThrows(
                ResourceNotFoundException.class,
                () ->
                        productService.getProductById(999L)
        );
    }

    // =========================================================
    // GET PRODUCTS BY SHOP
    // =========================================================

    @Test
    void getProductsByShop_WhenShopExists_ShouldReturnProducts() {

        when(
                shopRepository.findById(1L)
        ).thenReturn(
                Optional.of(testShop)
        );

        when(
                productRepository.findByShop(testShop)
        ).thenReturn(
                List.of(testProduct)
        );

        List<ProductResponseDTO> result =
                productService.getProductsByShop(1L);

        assertNotNull(result);

        assertEquals(
                1,
                result.size()
        );

        assertEquals(
                "Corsair RM1200x Shift 80+ GOLD Fully Modular ATX 3.0 & PCIe 5.0",
                result.getFirst().getName()
        );

        verify(
                productRepository,
                times(1)
        ).findByShop(testShop);
    }

    // =========================================================
    // GET PRODUCTS BY SHOP - NOT FOUND
    // =========================================================

    @Test
    void getProductsByShop_WhenShopNotExists_ShouldThrowException() {

        when(
                shopRepository.findById(999L)
        ).thenReturn(
                Optional.empty()
        );

        assertThrows(
                ResourceNotFoundException.class,
                () ->
                        productService.getProductsByShop(999L)
        );
    }

    // =========================================================
    // CREATE PRODUCT
    // =========================================================

    @Test
    void createProduct_ShouldSaveAndReturn() {

        when(
                shopRepository.findById(1L)
        ).thenReturn(
                Optional.of(testShop)
        );

        when(
                masterProductRepository
                        .findByBrandIgnoreCaseAndModelNumberIgnoreCaseAndVariantValueIsNull(
                                "Corsair",
                                "RM1200x SHIFT"
                        )
        ).thenReturn(
                Optional.of(testMasterProduct)
        );

        when(
                productRepository.save(
                        any(Product.class)
                )
        ).thenReturn(
                testProduct
        );

        ProductResponseDTO result =
                productService.createProduct(
                        testProductRequestDTO
                );

        assertNotNull(result);

        assertEquals(
                "Corsair RM1200x Shift 80+ GOLD Fully Modular ATX 3.0 & PCIe 5.0",
                result.getName()
        );

        verify(
                shopRepository,
                times(1)
        ).findById(1L);

        verify(
                masterProductRepository,
                times(1)
        )
                .findByBrandIgnoreCaseAndModelNumberIgnoreCaseAndVariantValueIsNull(
                        "Corsair",
                        "RM1200x SHIFT"
                );

        verify(
                productRepository,
                times(1)
        ).save(any(Product.class));
    }

    // =========================================================
    // DELETE PRODUCT
    // =========================================================

    @Test
    void deleteProduct_WhenExists_ShouldDeleteSuccessfully() {

        when(
                productRepository.findById(1L)
        ).thenReturn(
                Optional.of(testProduct)
        );

        doNothing()
                .when(productRepository)
                .delete(testProduct);

        assertDoesNotThrow(
                () ->
                        productService.deleteProduct(1L)
        );

        verify(
                productRepository,
                times(1)
        ).delete(testProduct);
    }

    // =========================================================
    // DELETE PRODUCT - NOT FOUND
    // =========================================================

    @Test
    void deleteProduct_WhenNotExists_ShouldThrowException() {

        when(
                productRepository.findById(999L)
        ).thenReturn(
                Optional.empty()
        );

        assertThrows(
                ResourceNotFoundException.class,
                () ->
                        productService.deleteProduct(999L)
        );
    }
}