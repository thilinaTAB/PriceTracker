package com.pricetracker.backend.security;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final UserDetailsServiceImpl userDetailsService;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )
                .authenticationProvider(authenticationProvider())
                .authorizeHttpRequests(auth -> auth
                        // Public endpoints — no token needed
                        .requestMatchers("/api/v1/auth/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/shops/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/products/**").permitAll()

                        // Customer endpoints — token needed
                        .requestMatchers("/api/v1/compare/**").hasAnyAuthority(
                                "ROLE_CUSTOMER", "ROLE_ADMIN", "ROLE_STAFF")

                        // Admin and Staff only
                        .requestMatchers(HttpMethod.POST, "/api/v1/shops/**").hasAnyAuthority(
                                "ROLE_ADMIN", "ROLE_STAFF")
                        .requestMatchers(HttpMethod.PUT, "/api/v1/shops/**").hasAnyAuthority(
                                "ROLE_ADMIN", "ROLE_STAFF")
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/shops/**").hasAnyAuthority(
                                "ROLE_ADMIN", "ROLE_STAFF")
                        .requestMatchers(HttpMethod.POST, "/api/v1/products/**").hasAnyAuthority(
                                "ROLE_ADMIN", "ROLE_STAFF")
                        .requestMatchers(HttpMethod.PUT, "/api/v1/products/**").hasAnyAuthority(
                                "ROLE_ADMIN", "ROLE_STAFF")
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/products/**").hasAnyAuthority(
                                "ROLE_ADMIN", "ROLE_STAFF")

                        // Everything else needs authentication
                        .anyRequest().authenticated()
                )
                .addFilterBefore(
                        jwtAuthenticationFilter,
                        UsernamePasswordAuthenticationFilter.class
                );

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }
}