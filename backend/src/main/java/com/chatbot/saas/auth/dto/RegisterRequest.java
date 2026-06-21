package com.chatbot.saas.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * WHY this class exists:
 *   When a user registers, the frontend sends JSON data.
 *   Spring maps that JSON into this Java class automatically.
 *   This is the "contract" between frontend and backend for the register endpoint.
 *
 * WHAT it does:
 *   Holds the data required to create a new user account:
 *   email, password, firstName, lastName.
 *
 * HOW it works:
 *   @Data → Lombok generates getters/setters/toString/etc.
 *
 *   Validation annotations (Bean Validation / Jakarta Validation):
 *   @NotBlank → Field cannot be null, empty, or whitespace-only
 *   @Email    → Must be a valid email format (name@domain.com)
 *   @Size     → Enforces min and max length
 *
 *   These are checked when the Controller method has @Valid on this parameter.
 *   If any check fails → Spring automatically returns HTTP 400 Bad Request
 *   with an error message — no manual if/else needed!
 *
 *   Example valid request body:
 *   {
 *     "email": "john@example.com",
 *     "password": "securePass123",
 *     "firstName": "John",
 *     "lastName": "Doe"
 *   }
 */
@Data
public class RegisterRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Please provide a valid email address")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    private String password;

    @NotBlank(message = "First name is required")
    @Size(min = 2, max = 50, message = "First name must be between 2 and 50 characters")
    private String firstName;

    @NotBlank(message = "Last name is required")
    @Size(min = 2, max = 50, message = "Last name must be between 2 and 50 characters")
    private String lastName;
}
