package com.chatbot.saas.knowledgebase;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * WHY this interface exists:
 *   Data Access Layer for Document entities.
 *   Provides all database queries needed for knowledge base management.
 *
 * WHAT it does:
 *   Custom queries for finding documents scoped to a chatbot or user.
 *   Security pattern: always filter by userId to prevent cross-user access.
 *
 * HOW Spring generates the SQL:
 *   findByChatbotIdAndUserIdOrderByCreatedAtDesc(chatbotId, userId)
 *   → SELECT * FROM documents WHERE chatbot_id=? AND user_id=? ORDER BY created_at DESC
 */
@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {

    /**
     * All documents for a specific chatbot, owned by a specific user.
     * The userId check is critical — users can only see their own chatbot's documents.
     */
    List<Document> findByChatbotIdAndUserIdOrderByCreatedAtDesc(Long chatbotId, Long userId);

    /**
     * All documents for a user across all their chatbots.
     * Used for the global knowledge base overview page.
     */
    List<Document> findByUserIdOrderByCreatedAtDesc(Long userId);

    /**
     * Get a specific document only if it belongs to this user.
     * Security: prevents accessing another user's document by guessing ID.
     */
    Optional<Document> findByIdAndUserId(Long id, Long userId);

    /**
     * Count documents for a specific chatbot.
     * Used for the chatbot card stats.
     */
    long countByChatbotId(Long chatbotId);

    /**
     * Count READY documents for a chatbot.
     * READY = successfully processed and embedded.
     * Used to show "X documents trained" on the chatbot card.
     */
    long countByChatbotIdAndStatus(Long chatbotId, Document.ProcessingStatus status);

    /** Delete all documents for a chatbot (called when chatbot is deleted) */
    void deleteByChatbotId(Long chatbotId);
}
