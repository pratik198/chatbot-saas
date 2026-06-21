package com.chatbot.saas.auth;

import com.chatbot.saas.auth.dto.LoginRequest;
import com.chatbot.saas.auth.dto.LoginResponse;
import com.chatbot.saas.auth.dto.RegisterRequest;
import com.chatbot.saas.user.User;
import com.chatbot.saas.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * WHY this class exists:
 *   This service handles the two most critical flows in our app:
 *   1. Registration: create a new account
 *   2. Login: verify credentials and issue a JWT
 *
 * WHAT it does:
 *   - register: validates email uniqueness, hashes password, saves user, returns JWT
 *   - login:    authenticates credentials, returns JWT
 *
 * HOW it works:
 *   Registration flow:
 *   1. Check if email is already taken
 *   2. Hash the password with BCrypt (never store plain text!)
 *   3. Save the new User entity to PostgreSQL
 *   4. Generate a JWT token for immediate login
 *   5. Return the token + user info to the frontend
 *
 *   Login flow:
 *   1. Call AuthenticationManager.authenticate() — Spring Security handles this
 *      It loads the user by email (via UserDetailsService), and compares
 *      the provided password against the stored BCrypt hash.
 *      If wrong → throws BadCredentialsException → 401 response
 *   2. Load the user from DB
 *   3. Generate a JWT token
 *   4. Return the token + user info to the frontend
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;        // BCryptPasswordEncoder (from SecurityConfig)
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;

    /**
     * Registers a new user and returns a JWT so they're immediately logged in.
     *
     * @Transactional: if any step fails (e.g., DB save fails), everything rolls back.
     *
     * @param request - validated RegisterRequest DTO from the controller
     * @return        - LoginResponse containing the JWT and user info
     * @throws RuntimeException if email is already registered
     */
    @Transactional
    public LoginResponse register(RegisterRequest request) {
        log.info("Registering new user with email: {}", request.getEmail());

        // Step 1: Check for duplicate email
        // existsByEmail() runs: SELECT COUNT(*) FROM users WHERE email = ?
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email is already registered: " + request.getEmail());
        }

        // Step 2: Build the User entity
        // We use the Builder pattern (from Lombok @Builder on User class)
        // user.setX() calls work too, but builder is more readable for many fields
        User user = User.builder()
                .email(request.getEmail())
                // IMPORTANT: Never store raw password! passwordEncoder.encode() applies BCrypt
                // BCrypt produces a different hash every time, but can still verify matches
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .role(User.Role.USER)         // new users always start as USER
                .isActive(true)
                .build();

        // Step 3: Save to database
        // JPA runs: INSERT INTO users (email, password_hash, first_name, ...) VALUES (?, ?, ?, ...)
        User savedUser = userRepository.save(user);
        log.info("User registered successfully with ID: {}", savedUser.getId());

        // Step 4: Generate JWT token for immediate login
        String token = jwtUtil.generateToken(savedUser);

        // Step 5: Build and return the response
        return buildLoginResponse(savedUser, token);
    }

    /**
     * Authenticates a user and returns a JWT.
     *
     * @param request - validated LoginRequest DTO (email + password)
     * @return        - LoginResponse containing the JWT and user info
     * @throws org.springframework.security.authentication.BadCredentialsException
     *         if email doesn't exist or password is wrong
     *         Spring Security throws this — our GlobalExceptionHandler catches it
     */
    public LoginResponse login(LoginRequest request) {
        log.info("Login attempt for email: {}", request.getEmail());

        // Step 1: Authenticate using Spring Security's AuthenticationManager
        // This internally:
        //   a) Calls UserDetailsService.loadUserByUsername(email) to load the user
        //   b) Runs passwordEncoder.matches(rawPassword, storedHash)
        //   c) If match: sets the user as "authenticated" in Spring's context
        //   d) If no match: throws BadCredentialsException → 401 response
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),    // principal (identifier)
                        request.getPassword()  // credentials (raw password to verify)
                )
        );

        // Step 2: Load user from DB (we need the full User object for the response)
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Step 3: Generate JWT token
        String token = jwtUtil.generateToken(user);

        log.info("User logged in successfully: {}", request.getEmail());

        // Step 4: Return token and user info
        return buildLoginResponse(user, token);
    }

    /**
     * Private helper: builds LoginResponse from a User + token.
     * Extracted to avoid duplicating this code in register() and login().
     */
    private LoginResponse buildLoginResponse(User user, String token) {
        return LoginResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .userId(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .role(user.getRole().name())
                .build();
    }
}
