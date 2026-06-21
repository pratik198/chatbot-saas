package com.chatbot.saas.chat;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * WHY this class exists:
 *   A "conversation" is a chat session between a user and a chatbot.
 *   We store conversations so users can review past chats, and so the
 *   AI can see recent messages as context (short-term memory).
 *
 * WHAT it does:
 *   Maps to the "conversations" table in PostgreSQL.
 *   One conversation contains many messages (one-to-many).
 *   A conversation belongs to one chatbot and one user.
 *
 * HOW it fits in the system:
 *   User opens chat → creates a Conversation → sends messages back and forth.
 *   Conversation title is auto-set from the first user message.
 *
 *   Database table: conversations
 *   Relationships:
 *     Many conversations → One Chatbot
 *     Many conversations → One User
 *     One conversation → Many Messages
 */
@Entity
@Table(name = "conversations")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class Conversation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Which chatbot this conversation belongs to
    @Column(name = "chatbot_id", nullable = false)
    private Long chatbotId;

    // Which user started this conversation (dashboard owner testing their bot)
    @Column(name = "user_id", nullable = false)
    private Long userId;

    // Auto-generated from the first user message (first 80 chars)
    @Column(name = "title")
    private String title;

    // How many messages in this conversation (cached for quick display)
    @Column(name = "message_count", nullable = false)
    @Builder.Default
    private int messageCount = 0;

    /**
     * Used for ANONYMOUS widget conversations (from external websites).
     * When a visitor chats via the embed widget, they don't have an account.
     * We generate a UUID session token for them and store it here.
     * Their browser stores this token in localStorage so they can resume their conversation.
     * For authenticated conversations (dashboard), this field is null.
     */
    @Column(name = "session_token", length = 36)
    private String sessionToken;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
