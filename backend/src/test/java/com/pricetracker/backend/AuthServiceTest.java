package com.pricetracker.backend;

import com.pricetracker.backend.dto.request.LoginRequestDTO;
import com.pricetracker.backend.dto.request.RegisterRequestDTO;
import com.pricetracker.backend.dto.response.AuthResponseDTO;
import com.pricetracker.backend.entity.User;
import com.pricetracker.backend.exception.EmailAlreadyExistsException;
import com.pricetracker.backend.exception.InvalidCredentialsException;
import com.pricetracker.backend.repository.UserRepository;
import com.pricetracker.backend.security.JwtService;
import com.pricetracker.backend.service.AuthService;
import com.pricetracker.backend.util.enums.Role;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private JwtService jwtService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AuthenticationManager authenticationManager;

    @InjectMocks
    private AuthService authService;

    private User testUser;
    private RegisterRequestDTO registerRequest;
    private LoginRequestDTO loginRequest;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1L);
        testUser.setFirstName("John");
        testUser.setLastName("Doe");
        testUser.setEmail("john@test.com");
        testUser.setPassword("hashedPassword");
        testUser.setRole(Role.ROLE_CUSTOMER);
        testUser.setIsActive(true);

        registerRequest = new RegisterRequestDTO();
        registerRequest.setFirstName("John");
        registerRequest.setLastName("Doe");
        registerRequest.setEmail("john@test.com");
        registerRequest.setPassword("password123");

        loginRequest = new LoginRequestDTO();
        loginRequest.setEmail("john@test.com");
        loginRequest.setPassword("password123");
    }

    @Test
    void register_WhenEmailNotTaken_ShouldReturnToken() {
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hashedPassword");
        when(userRepository.save(any(User.class))).thenReturn(testUser);
        when(jwtService.generateToken(anyString(), anyString())).thenReturn("mockToken");

        AuthResponseDTO result = authService.register(registerRequest);

        assertNotNull(result);
        assertEquals("mockToken", result.getToken());
        assertEquals("john@test.com", result.getEmail());
        assertEquals("ROLE_CUSTOMER", result.getRole());
        verify(userRepository, times(1)).save(any(User.class));
        verify(passwordEncoder, times(1)).encode("password123");
    }

    @Test
    void register_WhenEmailAlreadyTaken_ShouldThrowException() {
        when(userRepository.existsByEmail(anyString())).thenReturn(true);

        assertThrows(EmailAlreadyExistsException.class,
                () -> authService.register(registerRequest));

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void login_WhenValidCredentials_ShouldReturnToken() {
        when(authenticationManager.authenticate(any())).thenReturn(null);
        when(userRepository.findByEmail(anyString()))
                .thenReturn(Optional.of(testUser));
        when(jwtService.generateToken(anyString(), anyString()))
                .thenReturn("mockToken");

        AuthResponseDTO result = authService.login(loginRequest);

        assertNotNull(result);
        assertEquals("mockToken", result.getToken());
        assertEquals("john@test.com", result.getEmail());
    }

    @Test
    void login_WhenInvalidCredentials_ShouldThrowException() {
        when(authenticationManager.authenticate(any()))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        assertThrows(InvalidCredentialsException.class,
                () -> authService.login(loginRequest));

        verify(userRepository, never()).findByEmail(anyString());
    }
}