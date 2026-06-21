package com.chatbot.saas.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * WHY this class exists:
 *   This is the DTO for the "update profile" request body.
 *   The frontend sends JSON like: { "firstName": "John", "lastName": "Doe" }
 *   Spring maps that JSON to this Java class automatically.
 *
 * WHAT it does:
 *   Carries the data a user wants to update on their profile.
 *   Also validates that data (no blank names, reasonable length limits).
 *
 * HOW it works:
 *   @NotBlank → Field cannot be null or empty string (even spaces-only)
 *   @Size     → Enforces min/max character limits
 *   Spring's @Valid annotation on the Controller triggers these checks.
 *   If validation fails, Spring returns a 400 Bad Request automatically.
 */
@Data
public class UpdateProfileRequest {

    @NotBlank(message = "First name is required")
    @Size(min = 2, max = 50, message = "First name must be between 2 and 50 characters")
    private String firstName;

    @NotBlank(message = "Last name is required")
    @Size(min = 2, max = 50, message = "Last name must be between 2 and 50 characters")
    private String lastName;
}
