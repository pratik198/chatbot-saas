package com.chatbot.saas.chatbot;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * WHY this interface exists:
 *   Data Access Layer for Chatbot. Handles all "talk to the database"
 *   operations for chatbots. Spring generates the SQL automatically.
 *
 * WHAT it does:
 *   Provides methods to query the chatbots table.
 *   Multi-tenancy note: every query filters by userId so users can
 *   NEVER accidentally see or modify another user's chatbots.
 *
 * HOW it works:
 *   Same pattern as UserRepository — Spring Data JPA reads the method
 *   name and writes the SQL for you.
 *
 *   findByUserId(Long userId)
 *     → SELECT * FROM chatbots WHERE user_id = ?
 *   findByIdAndUserId(Long id, Long userId)
 *     → SELECT * FROM chatbots WHERE id = ? AND user_id = ?
 *
 *   The AND user_id = ? in the second method is critical for security:
 *   it ensures user A can never fetch user B's chatbot, even if they
 *   know the chatbot ID.
 */
@Repository
public interface ChatbotRepository extends JpaRepository<Chatbot, Long> {

    /**
     * Get all chatbots belonging to a specific user.
     * Called when the user opens their "My Chatbots" page.
     * Ordered by newest first (createdAt DESC).
     */
    List<Chatbot> findByUserIdOrderByCreatedAtDesc(Long userId);

    /**
     * Get a single chatbot by ID — but ONLY if it belongs to this user.
     * This is the security-critical method: the AND user_id = ? prevents
     * a user from accessing another user's chatbot by guessing the ID.
     *
     * Returns Optional<Chatbot> → use .orElseThrow() to get 404 if not found.
     */
    Optional<Chatbot> findByIdAndUserId(Long id, Long userId);

    /**
     * Count how many chatbots a user has.
     * Used in the dashboard stats card.
     */
    long countByUserId(Long userId);

    /**
     * Check if this chatbot name is already used by this user.
     * Prevents a user from creating two chatbots with the same name.
     */
    boolean existsByNameAndUserId(String name, Long userId);
}
