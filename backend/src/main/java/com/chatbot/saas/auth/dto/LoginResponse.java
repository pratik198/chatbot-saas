package com.chatbot.saas.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * WHY this class exists:
 *   After a successful login or register, we send back a JWT token
 *   along with basic user info. This DTO structures that response.
 *
 * WHAT it does:
 *   Carries the JWT token and user details back to the frontend.
 *   The frontend stores the token in localStorage and uses it
 *   for all subsequent API calls.
 *
 * HOW it works:
 *   Example response JSON:
 *   {
 *     "token": "eyJhbGciOiJIUzI1NiJ9...",
 *     "tokenType": "Bearer",
 *     "userId": 1,
 *     "email": "john@example.com",
 *     "firstName": "John",
 *     "lastName": "Doe",
 *     "role": "USER"
 *   }
 *
 *   The frontend then sets the Authorization header for all API calls:
 *   Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginResponse {

    /** The JWT token — the frontend stores this and sends it on every request. */
    private String token;

    /** Always "Bearer" — this is the standard HTTP authentication scheme. */
    @Builder.Default
    private String tokenType = "Bearer";

    private Long userId;
    private String email;
    private String firstName;
    private String lastName;
    private String role;
}
