package com.chatbot.saas.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * WHY this class exists:
 *   This is the DTO (Data Transfer Object) for the login request.
 *   When a user logs in, the frontend sends:
 *   { "email": "john@example.com", "password": "myPassword123" }
 *   Spring maps that JSON body to this class.
 *
 * WHAT it does:
 *   Carries the email and password from the HTTP request body
 *   to the AuthService for credential verification.
 *
 * HOW it works:
 *   Same as RegisterRequest — Spring uses Jackson to deserialize the JSON,
 *   and Bean Validation to validate the fields before the method runs.
 */
@Data
public class LoginRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Please provide a valid email address")
    private String email;

    @NotBlank(message = "Password is required")
    private String password;
}
