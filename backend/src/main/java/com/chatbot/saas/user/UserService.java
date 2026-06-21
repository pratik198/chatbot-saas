package com.chatbot.saas.user;

import com.chatbot.saas.common.exception.ResourceNotFoundException;
import com.chatbot.saas.user.dto.UpdateProfileRequest;
import com.chatbot.saas.user.dto.UserProfileResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * WHY this class exists:
 *   Service layer contains all the business logic for user management.
 *   Controllers should be thin (just receive requests and send responses).
 *   Services are where the actual work happens.
 *
 *   This class also implements UserDetailsService, which is Spring Security's
 *   contract for loading user data during authentication.
 *
 * WHAT it does:
 *   - loadUserByUsername: called by Spring Security during login to load a user
 *   - getProfile:         returns a user's profile (safe DTO, no password)
 *   - updateProfile:      updates first/last name
 *
 * HOW it works:
 *   @Service         → Marks this as a Spring-managed bean (Spring creates one instance)
 *   @RequiredArgsConstructor → Lombok generates a constructor for all `final` fields
 *                             This is called "constructor injection" — the recommended way
 *                             to inject dependencies in Spring Boot (better than @Autowired)
 *   @Slf4j           → Lombok creates a `log` field for logging (log.info, log.error, etc.)
 *   @Transactional   → If any step in the method fails, all DB changes are rolled back
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserService implements UserDetailsService {

    // Spring injects UserRepository automatically via constructor injection
    private final UserRepository userRepository;

    /**
     * Spring Security calls this method when a user tries to log in.
     * It says: "give me a UserDetails object for this email".
     * Our User class implements UserDetails so we return it directly.
     *
     * @param email   - used as the "username" in our system
     * @return        - the User object (which implements UserDetails)
     * @throws UsernameNotFoundException - if no user with this email exists
     */
    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        log.debug("Loading user by email: {}", email);
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));
    }

    /**
     * Get the profile of the currently logged-in user.
     *
     * @param email - extracted from the JWT token by the security filter
     * @return      - UserProfileResponse DTO (no sensitive data)
     */
    public UserProfileResponse getProfile(String email) {
        log.debug("Fetching profile for email: {}", email);

        // findByEmail returns Optional<User>
        // orElseThrow: if user doesn't exist, throw ResourceNotFoundException
        // (our GlobalExceptionHandler catches this and returns 404)
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Convert entity to DTO (hides passwordHash from response)
        return UserProfileResponse.fromUser(user);
    }

    /**
     * Update the profile of the currently logged-in user.
     * Only allows updating firstName and lastName (not email or password — separate flows).
     *
     * @Transactional ensures: if save() fails, nothing is changed in the DB.
     *
     * @param email   - extracted from JWT token
     * @param request - contains new firstName and lastName
     * @return        - updated UserProfileResponse DTO
     */
    @Transactional
    public UserProfileResponse updateProfile(String email, UpdateProfileRequest request) {
        log.debug("Updating profile for email: {}", email);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Update only the allowed fields
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());

        // save() triggers an UPDATE SQL: UPDATE users SET first_name=?, last_name=?, updated_at=? WHERE id=?
        // @LastModifiedDate auto-updates the updatedAt timestamp
        User savedUser = userRepository.save(user);

        log.info("Profile updated successfully for user: {}", email);
        return UserProfileResponse.fromUser(savedUser);
    }
}
