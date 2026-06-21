package com.chatbot.saas.auth;

import com.chatbot.saas.auth.dto.LoginRequest;
import com.chatbot.saas.auth.dto.LoginResponse;
import com.chatbot.saas.auth.dto.RegisterRequest;
import com.chatbot.saas.common.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * WHY this class exists:
 *   This is the REST Controller for authentication endpoints.
 *   It's the "front door" for register and login requests from the frontend.
 *
 * WHAT it does:
 *   POST /api/auth/register  → create a new account
 *   POST /api/auth/login     → login with credentials
 *
 * HOW it works:
 *   These endpoints are PUBLIC (no JWT required) — configured in SecurityConfig.
 *   Anyone can call them without being logged in.
 *
 *   @Valid on the @RequestBody parameter triggers validation BEFORE reaching this code.
 *   If the request JSON fails validation (missing email, short password, etc.),
 *   Spring returns 400 Bad Request automatically — no extra code needed here.
 *
 *   The Controller's job is simple:
 *   1. Receive the validated request
 *   2. Pass it to the Service
 *   3. Wrap the result in ApiResponse and return it
 *
 *   All actual logic lives in AuthService — controllers should stay thin.
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * POST /api/auth/register
     *
     * Request body example:
     * {
     *   "email": "john@example.com",
     *   "password": "securePass123",
     *   "firstName": "John",
     *   "lastName": "Doe"
     * }
     *
     * Success response (201 Created):
     * {
     *   "success": true,
     *   "message": "Registration successful",
     *   "data": {
     *     "token": "eyJhbGci...",
     *     "userId": 1,
     *     "email": "john@example.com",
     *     ...
     *   }
     * }
     *
     * @param request - JSON body, validated by @Valid
     * @return        - 201 Created with JWT token
     */
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<LoginResponse>> register(
            @Valid @RequestBody RegisterRequest request) {

        LoginResponse response = authService.register(request);
        // 201 Created (not 200 OK) — correct HTTP status for resource creation
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Registration successful", response));
    }

    /**
     * POST /api/auth/login
     *
     * Request body example:
     * {
     *   "email": "john@example.com",
     *   "password": "securePass123"
     * }
     *
     * Success response (200 OK):
     * {
     *   "success": true,
     *   "message": "Login successful",
     *   "data": {
     *     "token": "eyJhbGci...",
     *     "userId": 1,
     *     "email": "john@example.com",
     *     ...
     *   }
     * }
     *
     * @param request - JSON body with email + password
     * @return        - 200 OK with JWT token
     */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(
            @Valid @RequestBody LoginRequest request) {

        LoginResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Login successful", response));
    }
}
