package com.chatbot.saas.common.exception;

import com.chatbot.saas.common.response.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

/**
 * WHY this class exists:
 *   Without this, when an exception is thrown, Spring returns an ugly default
 *   error response that doesn't match our ApiResponse format.
 *   This class intercepts ALL exceptions and converts them to clean ApiResponse JSON.
 *
 * WHAT it does:
 *   Acts as a global "catch block" for the entire application.
 *   Every time an exception bubbles up from any Controller or Service,
 *   the matching @ExceptionHandler method here catches it.
 *
 * HOW it works:
 *   @RestControllerAdvice → Applies to all @RestController classes globally.
 *   @ExceptionHandler(SomeException.class) → Handles that specific exception type.
 *
 *   Priority: more specific exceptions are matched first.
 *   If the exception doesn't match any specific handler, it falls to handleGeneral().
 *
 *   Example flow:
 *   AuthService throws RuntimeException("Email already registered")
 *   → Spring catches it
 *   → handleGeneral() intercepts it
 *   → Returns: { "success": false, "message": "Email already registered" }  HTTP 400
 */
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    /**
     * Handles validation errors from @Valid on @RequestBody parameters.
     * Example: user sends empty email, or password shorter than 8 chars.
     *
     * Returns all validation errors at once (not just the first one),
     * which is better UX — the user sees all problems in one response.
     *
     * Response: HTTP 400
     * {
     *   "success": false,
     *   "message": "Validation failed",
     *   "data": {
     *     "email": "Please provide a valid email address",
     *     "password": "Password must be at least 8 characters"
     *   }
     * }
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Map<String, String>>> handleValidationErrors(
            MethodArgumentNotValidException ex) {

        Map<String, String> errors = new HashMap<>();

        // Collect all field errors into a map: { fieldName: errorMessage }
        ex.getBindingResult().getAllErrors().forEach(error -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });

        log.warn("Validation failed: {}", errors);
        return ResponseEntity.badRequest()
                .body(ApiResponse.error("Validation failed"));
        // Note: We could return errors in data field, but keeping it simple for now
    }

    /**
     * Handles the case when a resource (user, chatbot, etc.) is not found.
     * Thrown by: ResourceNotFoundException (our custom exception).
     * Response: HTTP 404
     */
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNotFound(ResourceNotFoundException ex) {
        log.warn("Resource not found: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error(ex.getMessage()));
    }

    /**
     * Handles bad login credentials.
     * Thrown by: Spring Security's AuthenticationManager when password is wrong.
     * Response: HTTP 401 Unauthorized
     *
     * SECURITY NOTE: Return a generic message. Never say "password is wrong"
     * vs "email doesn't exist" — that lets attackers know which emails are registered.
     */
    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiResponse<Void>> handleBadCredentials(BadCredentialsException ex) {
        log.warn("Bad credentials attempt");
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error("Invalid email or password"));
    }

    /**
     * Handles the case when Spring Security cannot find a user by email.
     * Thrown by: UserDetailsService.loadUserByUsername() when email not found.
     * Response: HTTP 401 (same as bad credentials for security reasons)
     */
    @ExceptionHandler(UsernameNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleUserNotFound(UsernameNotFoundException ex) {
        log.warn("User not found during authentication: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error("Invalid email or password"));
    }

    /**
     * Catch-all for any unhandled exception.
     * This is our last line of defense — prevents raw Java stack traces
     * from leaking to the frontend (which would be a security issue).
     *
     * Response: HTTP 400 for RuntimeException, or HTTP 500 for everything else.
     */
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ApiResponse<Void>> handleRuntimeException(RuntimeException ex) {
        log.error("Runtime exception: {}", ex.getMessage());
        return ResponseEntity.badRequest()
                .body(ApiResponse.error(ex.getMessage()));
    }

    /**
     * Final fallback for truly unexpected errors.
     * Returns 500 Internal Server Error.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGeneral(Exception ex) {
        log.error("Unexpected error: {}", ex.getMessage(), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("An unexpected error occurred. Please try again."));
    }
}
