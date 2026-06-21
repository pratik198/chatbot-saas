package com.chatbot.saas.common.config;

import com.chatbot.saas.auth.JwtUtil;
import com.chatbot.saas.user.UserService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * WHY this class exists:
 *   HTTP is stateless — the server doesn't remember previous requests.
 *   This filter runs on EVERY request and checks: "does this request have a valid JWT?"
 *   If yes → the request is authenticated, the user is set in the security context.
 *   If no  → Spring Security blocks the request (if the endpoint requires auth).
 *
 * WHAT it does:
 *   1. Reads the Authorization header from every incoming HTTP request
 *   2. Extracts the JWT token (removes "Bearer " prefix)
 *   3. Validates the token using JwtUtil
 *   4. Loads the user from the database
 *   5. Sets the authenticated user in Spring's SecurityContext
 *   6. Passes the request to the next filter in the chain
 *
 * HOW it works:
 *   extends OncePerRequestFilter → guarantees this filter runs exactly ONCE per request
 *   (some filters can run multiple times for redirects/forwards — OncePerRequestFilter prevents this)
 *
 *   After this filter runs, the request has the authenticated user attached.
 *   @AuthenticationPrincipal in controllers reads that authenticated user.
 *
 *   Request Flow:
 *   Browser → [JwtAuthFilter] → [UsernamePasswordAuthenticationFilter] → Controller
 *
 *   Authorization header format:
 *   Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJqb2huQGV4YW1wbGUuY29tIn0...
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserService userService;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        // Step 1: Get the Authorization header from the request
        final String authHeader = request.getHeader("Authorization");

        // Step 2: Check if the header exists and starts with "Bearer "
        // If not, skip JWT processing — let Spring Security handle it
        // (public endpoints will pass through, protected ones will be blocked)
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            // No JWT found — pass to next filter without setting authentication
            filterChain.doFilter(request, response);
            return;
        }

        // Step 3: Extract the token string (remove "Bearer " prefix — 7 characters)
        final String jwt = authHeader.substring(7);

        // Step 4: Extract the email from the JWT payload
        final String userEmail;
        try {
            userEmail = jwtUtil.extractEmail(jwt);
        } catch (Exception e) {
            // Malformed token (wrong format, invalid signature, etc.)
            log.warn("Invalid JWT token: {}", e.getMessage());
            filterChain.doFilter(request, response);
            return;
        }

        // Step 5: Only proceed if we got an email AND no authentication is set yet
        // SecurityContextHolder.getContext().getAuthentication() != null means:
        // this request was already authenticated (e.g., by a previous filter)
        if (userEmail != null && SecurityContextHolder.getContext().getAuthentication() == null) {

            // Step 6: Load the full User object from the database
            // This is important — it checks if the user is still active
            UserDetails userDetails = userService.loadUserByUsername(userEmail);

            // Step 7: Validate the token
            // isTokenValid checks: email matches AND token is not expired
            if (jwtUtil.isTokenValid(jwt, userDetails)) {

                // Step 8: Create an Authentication object and set it in the SecurityContext
                // This is how Spring Security "knows" the user is authenticated for this request
                UsernamePasswordAuthenticationToken authToken =
                        new UsernamePasswordAuthenticationToken(
                                userDetails,                          // principal (the User object)
                                null,                                 // credentials (null — already verified)
                                userDetails.getAuthorities()          // roles/permissions
                        );

                // Attach request details (IP address, session ID) to the auth token
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                // Set the authentication in the thread-local SecurityContext
                // After this line, @AuthenticationPrincipal in controllers works!
                SecurityContextHolder.getContext().setAuthentication(authToken);
                log.debug("Authenticated user: {}", userEmail);
            }
        }

        // Step 9: Continue to the next filter (and eventually the controller)
        filterChain.doFilter(request, response);
    }
}
