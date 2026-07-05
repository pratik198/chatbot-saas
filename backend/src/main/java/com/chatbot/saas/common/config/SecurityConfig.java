package com.chatbot.saas.common.config;

import com.chatbot.saas.user.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * WHY this class exists:
 *   By default, Spring Security locks down EVERYTHING and rejects all requests.
 *   This configuration class tells Spring Security:
 *   - Which endpoints are public (no login needed)
 *   - Which endpoints require authentication (JWT needed)
 *   - How to verify passwords (BCrypt)
 *   - How to handle sessions (stateless — no server-side sessions)
 *   - What CORS rules to apply (so the React frontend can call the API)
 *
 * WHAT it does:
 *   Sets up the entire security layer for the application.
 *
 * HOW it works in Spring Boot 3 (Spring Security 6):
 *   The old way (pre-Spring Boot 3):
 *     extend WebSecurityConfigurerAdapter and override configure()
 *   The new way (Spring Boot 3):
 *     Create @Bean methods that return SecurityFilterChain, PasswordEncoder, etc.
 *   This class uses the NEW way.
 *
 *   @Configuration  → This class defines Spring beans (the @Bean methods)
 *   @EnableWebSecurity → Activate Spring Security
 *   @EnableMethodSecurity → Enables @PreAuthorize on controller methods (for role-based access)
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final UserService userService;

    /**
     * The core security configuration bean.
     *
     * This defines:
     * 1. Which endpoints are public vs protected
     * 2. Session policy (stateless — no cookies/server sessions, JWT only)
     * 3. Where our JWT filter sits in the filter chain
     * 4. CORS configuration (allow frontend to call backend)
     * 5. CSRF disabled (not needed for stateless JWT APIs)
     *
     * CSRF (Cross-Site Request Forgery):
     *   CSRF attacks rely on the browser sending cookies automatically.
     *   Since we use JWT in headers (not cookies), CSRF is not a concern.
     *   So we safely disable it for REST APIs.
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // Disable CSRF — not needed for stateless JWT REST APIs
            .csrf(AbstractHttpConfigurer::disable)

            // Configure CORS — allows our React frontend (port 3000) to call the API
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))

            // Define which endpoints need authentication
            .authorizeHttpRequests(auth -> auth
                // Public endpoints — no JWT needed
                .requestMatchers("/api/auth/**").permitAll()

                // Public widget API — anonymous visitors call these from external websites.
                // These endpoints validate by chatbot ID + published status, not by JWT.
                .requestMatchers("/api/widget/**").permitAll()

                // All other endpoints require a valid JWT token
                .anyRequest().authenticated()
            )

            // Stateless sessions — no HttpSession, no cookies
            // Each request must carry its own JWT — the server stores nothing between requests
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )

            // Register our custom authentication provider (uses UserService + BCrypt)
            .authenticationProvider(authenticationProvider())

            // Add our JWT filter BEFORE Spring's default username/password filter
            // This ensures JWT authentication happens first on every request
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /**
     * CORS configuration.
     * CORS (Cross-Origin Resource Sharing) controls which domains can call our API.
     *
     * WHY we need this:
     *   Browser security blocks requests from one domain to another by default.
     *   Our frontend is at http://localhost:3000
     *   Our backend is at http://localhost:8080
     *   Different ports = different "origins" = browser blocks the request.
     *   This CORS config tells the browser: "yes, localhost:3000 is allowed."
     *
     * In production, replace "http://localhost:3000" with your actual frontend URL.
     */
    @Value("${cors.allowed-origins:http://localhost:3000,http://localhost:3001}")
    private String allowedOriginsProperty;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // Allow requests from these origins (frontend URLs) — comma-separated
        // via CORS_ALLOWED_ORIGINS so production can add its real domain
        // (e.g. the Vercel URL) without touching code.
        configuration.setAllowedOrigins(Arrays.stream(allowedOriginsProperty.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList());

        // Allow these HTTP methods
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));

        // Allow these headers in requests (Authorization is needed for JWT,
        // X-Session-Token is needed by the public widget chat endpoints)
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept", "X-Session-Token"));

        // Allow credentials (needed if you ever use cookies alongside JWT)
        configuration.setAllowCredentials(true);

        // Apply this CORS config to all endpoints
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    /**
     * Password encoder bean.
     * BCrypt is the industry standard for hashing passwords.
     *
     * BCrypt properties:
     * - Slow by design: takes ~100ms to hash. Fast for one user, very slow for attackers.
     * - Salted: adds a random value before hashing, so same password → different hashes.
     * - Irreversible: cannot decrypt the hash back to the original password.
     *
     * IMPORTANT: Spring Security uses this same bean to:
     * 1. encode() passwords when registering
     * 2. matches() passwords when logging in
     * This is why AuthService and SecurityConfig use the same @Bean.
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Authentication provider bean.
     * Connects Spring Security's authentication system to our UserService and BCrypt.
     *
     * DaoAuthenticationProvider is Spring Security's standard implementation.
     * It uses a UserDetailsService to load users and a PasswordEncoder to verify passwords.
     *
     * Flow when login is called:
     * 1. DaoAuthenticationProvider calls userService.loadUserByUsername(email)
     * 2. It runs passwordEncoder.matches(rawPassword, user.getPasswordHash())
     * 3. If match → authentication succeeds
     * 4. If no match → throws BadCredentialsException
     */
    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    /**
     * Authentication manager bean.
     * AuthService calls this to trigger the authentication process during login.
     *
     * AuthenticationManager.authenticate(token) → delegates to AuthenticationProvider
     * → DaoAuthenticationProvider verifies credentials
     */
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config)
            throws Exception {
        return config.getAuthenticationManager();
    }
}
