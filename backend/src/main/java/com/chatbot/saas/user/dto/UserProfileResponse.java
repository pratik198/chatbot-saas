package com.chatbot.saas.user.dto;

import com.chatbot.saas.user.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * WHY this class exists:
 *   We never send the User entity directly to the frontend.
 *   The User entity contains passwordHash — we must never expose that!
 *   This DTO (Data Transfer Object) is a "safe view" of a user's profile.
 *
 * WHAT it does:
 *   Contains only the data the frontend needs to display a user's profile.
 *   Strips out sensitive fields like passwordHash.
 *
 * HOW it works:
 *   The Controller calls UserService.getProfile() which returns this DTO.
 *   Jackson serializes this to JSON and sends it to the browser.
 *
 *   DTO Pattern Rule:
 *   Entity (database model) → Service → DTO (API model) → JSON response
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileResponse {

    private Long id;
    private String email;
    private String firstName;
    private String lastName;
    private String role;
    private boolean isActive;
    private LocalDateTime createdAt;

    /**
     * Convenience factory method: creates a DTO from a User entity.
     * Keeps the mapping logic in one place (easy to find and update).
     *
     * Usage: UserProfileResponse.fromUser(user)
     */
    public static UserProfileResponse fromUser(User user) {
        return UserProfileResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .role(user.getRole().name())
                .isActive(user.isActive())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
