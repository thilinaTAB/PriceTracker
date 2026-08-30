package com.pricetracker.backend.service;

import com.pricetracker.backend.dto.request.UpdateProfileRequestDTO;
import com.pricetracker.backend.entity.User;
import com.pricetracker.backend.exception.ResourceNotFoundException;
import com.pricetracker.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    public User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "User not found with email: " + email
                        )
                );
    }

    public User updateProfile(
            String email,
            UpdateProfileRequestDTO request
    ) {
        User user = getUserByEmail(email);

        user.setFirstName(request.getFirstName().trim());
        user.setLastName(request.getLastName().trim());

        return userRepository.save(user);
    }
}