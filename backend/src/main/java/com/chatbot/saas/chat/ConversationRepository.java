package com.chatbot.saas.chat;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * WHY this interface exists:
 *   Spring Data JPA generates all the SQL queries automatically.
 *   We just declare the method signatures and Spring creates the implementation.
 *
 * WHAT it does:
 *   Provides database operations for Conversation records.
 *   All queries include userId to enforce ownership (security).
 *
 * HOW it works:
 *   JpaRepository<Conversation, Long> gives us free methods like:
 *     save(), findById(), delete(), findAll()
 *   Our custom methods follow naming conventions Spring understands:
 *     findBy{Field}And{Field}OrderBy{Field}Desc → generates SELECT ... WHERE ... ORDER BY ...
 */
@Repository
public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    // Get all conversations for a chatbot, owned by the current user, newest first
    List<Conversation> findByChatbotIdAndUserIdOrderByUpdatedAtDesc(Long chatbotId, Long userId);

    // Get ALL conversations for a user (across all chatbots), newest first
    List<Conversation> findByUserIdOrderByUpdatedAtDesc(Long userId);

    // Find one conversation owned by the user — used to verify access before fetching messages
    Optional<Conversation> findByIdAndUserId(Long id, Long userId);

    // Count conversations for a chatbot (for dashboard stats)
    long countByChatbotId(Long chatbotId);

    // Find an anonymous widget conversation by session token + chatbot
    java.util.Optional<Conversation> findBySessionTokenAndChatbotId(String sessionToken, Long chatbotId);
}
