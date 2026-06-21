package com.chatbot.saas.common.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * WHY this class exists:
 *   Consistency: every API endpoint should return the same JSON structure.
 *   Without this, some endpoints might return { "token": "..." } and others
 *   return { "data": {...} } — confusing for the frontend developer.
 *
 * WHAT it does:
 *   Wraps ALL API responses in a standard envelope:
 *   {
 *     "success": true,
 *     "message": "Login successful",
 *     "data": { ... actual response data ... }
 *   }
 *   or on error:
 *   {
 *     "success": false,
 *     "message": "Invalid credentials",
 *     "data": null
 *   }
 *
 * HOW it works:
 *   Generic class ApiResponse<T>:
 *   T is a placeholder for any type.
 *   ApiResponse<LoginResponse>  → data field holds a LoginResponse
 *   ApiResponse<UserProfile>    → data field holds a UserProfile
 *   ApiResponse<List<Chatbot>>  → data field holds a List<Chatbot>
 *
 *   @JsonInclude(NON_NULL): null fields are excluded from the JSON output.
 *   So if data is null, the "data" key won't appear in the response at all.
 *
 *   Static factory methods (success/error) make creation clean:
 *   return ApiResponse.success("OK", data);      // instead of new ApiResponse<>(...)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {

    /** true if the request succeeded, false if it failed */
    private boolean success;

    /** Human-readable message for the frontend to display */
    private String message;

    /** The actual response payload — null on error responses */
    private T data;

    /**
     * Creates a success response.
     * Usage: ApiResponse.success("User created", userProfile)
     */
    public static <T> ApiResponse<T> success(String message, T data) {
        return ApiResponse.<T>builder()
                .success(true)
                .message(message)
                .data(data)
                .build();
    }

    /**
     * Creates a success response with no data body.
     * Usage: ApiResponse.success("Deleted successfully")
     */
    public static <T> ApiResponse<T> success(String message) {
        return ApiResponse.<T>builder()
                .success(true)
                .message(message)
                .build();
    }

    /**
     * Creates an error response.
     * Usage: ApiResponse.error("Email already exists")
     */
    public static <T> ApiResponse<T> error(String message) {
        return ApiResponse.<T>builder()
                .success(false)
                .message(message)
                .build();
    }
}
