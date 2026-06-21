package com.chatbot.saas.common.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * WHY this class exists:
 *   When we try to find something in the DB and it doesn't exist,
 *   we should return HTTP 404 (Not Found), not HTTP 500 (Server Error).
 *   This custom exception makes that mapping explicit and clean.
 *
 * WHAT it does:
 *   A typed exception that signals "the requested resource does not exist".
 *   Example uses:
 *   - User not found by ID
 *   - Chatbot not found
 *   - Document not found
 *
 * HOW it works:
 *   @ResponseStatus(HttpStatus.NOT_FOUND) tells Spring:
 *   "if this exception escapes a controller, respond with HTTP 404".
 *
 *   extends RuntimeException: unchecked exception.
 *   This means we don't need "throws ResourceNotFoundException" on every method.
 *   Our GlobalExceptionHandler catches it and returns a consistent error response.
 */
@ResponseStatus(HttpStatus.NOT_FOUND)
public class ResourceNotFoundException extends RuntimeException {

    /**
     * @param message - describes what was not found, e.g. "User not found with id: 5"
     */
    public ResourceNotFoundException(String message) {
        super(message);
    }
}
