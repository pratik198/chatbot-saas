package com.chatbot.saas.user;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * WHY this interface exists:
 *   This is the Data Access Layer for the User entity.
 *   It handles all "talk to the database" operations for users.
 *
 * WHAT it does:
 *   Provides ready-made methods to:
 *   - Save a user            → save(user)
 *   - Find by ID             → findById(id)
 *   - Get all users          → findAll()
 *   - Delete a user          → deleteById(id)
 *   - Count users            → count()
 *   - Custom: find by email  → findByEmail(email)
 *   - Custom: check email    → existsByEmail(email)
 *
 * HOW it works:
 *   JpaRepository<User, Long> means:
 *     - User = the entity class this repository manages
 *     - Long = the type of the primary key (our id field is Long)
 *
 *   Spring Data JPA reads method names and auto-generates SQL!
 *   findByEmail(String email)
 *     → SELECT * FROM users WHERE email = ?
 *   existsByEmail(String email)
 *     → SELECT COUNT(*) > 0 FROM users WHERE email = ?
 *
 *   You don't write a single line of SQL — Spring handles it all.
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    /**
     * Find a user by their email address.
     *
     * Returns Optional<User> because the user might not exist.
     * Optional forces you to handle the "not found" case explicitly,
     * preventing NullPointerException bugs.
     *
     * Usage example:
     *   Optional<User> user = userRepository.findByEmail("john@example.com");
     *   user.orElseThrow(() -> new RuntimeException("User not found"));
     */
    Optional<User> findByEmail(String email);

    /**
     * Check if a user with this email already exists.
     * Used during registration to prevent duplicate accounts.
     *
     * Returns boolean (not Optional<User>) because we only need YES/NO.
     *
     * Usage example:
     *   if (userRepository.existsByEmail("john@example.com")) {
     *     throw new RuntimeException("Email already taken");
     *   }
     */
    boolean existsByEmail(String email);
}
