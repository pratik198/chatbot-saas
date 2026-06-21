package com.chatbot.saas.chat;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * WHY this interface exists:
 *   Provides database access for Message records.
 *   Messages are loaded when displaying a conversation or building the
 *   AI context window (sending recent history to Ollama).
 *
 * WHAT it does:
 *   - Load all messages in a conversation (for display)
 *   - Load recent messages for AI context (last N messages)
 *   - Delete all messages when a conversation is deleted
 */
@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {

    // Get all messages in a conversation, oldest first (chronological chat order)
    List<Message> findByConversationIdOrderByCreatedAtAsc(Long conversationId);

    // Delete all messages when a conversation is deleted
    void deleteByConversationId(Long conversationId);

    // Count messages in a conversation (for updating Conversation.messageCount)
    long countByConversationId(Long conversationId);
}
