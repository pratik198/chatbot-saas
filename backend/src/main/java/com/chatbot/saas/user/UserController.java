package com.chatbot.saas.user;

import com.chatbot.saas.common.response.ApiResponse;
import com.chatbot.saas.user.dto.UpdateProfileRequest;
import com.chatbot.saas.user.dto.UserProfileResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * WHY this class exists:
 *   Controllers are the "front door" of your API.
 *   They receive HTTP requests from the frontend and return HTTP responses.
 *   They delegate all business logic to the Service layer.
 *
 * WHAT it does:
 *   Handles HTTP requests for user profile operations:
 *   GET  /api/users/me          → get current user's profile
 *   PUT  /api/users/me          → update current user's profile
 *
 * HOW it works:
 *   @RestController → Combination of @Controller + @ResponseBody.
 *                     Methods return data (auto-converted to JSON), not HTML views.
 *   @RequestMapping → All endpoints in this class start with /api/users
 *   @RequiredArgsConstructor → Lombok injects UserService via constructor
 *
 *   @AuthenticationPrincipal User currentUser:
 *     Spring Security extracts the logged-in user from the JWT token
 *     and injects it directly into the method parameter.
 *     No manual token parsing needed in the controller!
 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    /**
     * GET /api/users/me
     * Returns the profile of the currently logged-in user.
     *
     * Protected endpoint: requires valid JWT token in Authorization header.
     * Spring Security blocks the request if no valid token is provided.
     *
     * @param currentUser - injected by Spring Security from the JWT token
     * @return            - 200 OK with UserProfileResponse JSON body
     */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserProfileResponse>> getMyProfile(
            @AuthenticationPrincipal User currentUser) {

        UserProfileResponse profile = userService.getProfile(currentUser.getEmail());
        return ResponseEntity.ok(ApiResponse.success("Profile fetched successfully", profile));
    }

    /**
     * PUT /api/users/me
     * Updates the first/last name of the currently logged-in user.
     *
     * @Valid triggers validation on UpdateProfileRequest fields (@NotBlank, @Size).
     * If validation fails, Spring returns 400 Bad Request before reaching this method.
     *
     * @param currentUser - injected by Spring Security from the JWT token
     * @param request     - JSON body from frontend, mapped to UpdateProfileRequest
     * @return            - 200 OK with updated UserProfileResponse
     */
    @PutMapping("/me")
    public ResponseEntity<ApiResponse<UserProfileResponse>> updateMyProfile(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody UpdateProfileRequest request) {

        UserProfileResponse updated = userService.updateProfile(currentUser.getEmail(), request);
        return ResponseEntity.ok(ApiResponse.success("Profile updated successfully", updated));
    }
}
