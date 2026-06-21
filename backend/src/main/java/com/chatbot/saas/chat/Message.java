package com.chatbot.saas.chat;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * WHY this class exists:
 *   Each individual message in a conversation — either from the user or the AI.
 *   We store every message so we can:
 *   1. Show the full conversation history in the UI
 *   2. Send recent history to Ollama for context (the AI "remembers" what was said)
 *
 * WHAT it does:
 *   Maps to the "messages" table in PostgreSQL.
 *   Each message has a role: USER (human) or ASSISTANT (AI).
 *   This matches Ollama's message format exactly:
 *     { "role": "user", "content": "..." }
 *     { "role": "assistant", "content": "..." }
 *
 * HOW role affects AI behavior:
 *   When we send history to Ollama, we format it as a list of messages
 *   with alternating user/assistant roles. The AI uses this to understand
 *   the conversation context and give coherent follow-up answers.
 *
 *   Database table: messages
 *   Relationships: Many messages → One Conversation
 */
@Entity
@Table(name = "messages")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class Message {

    /**
     * WHO sent this message.
     * - USER: the human typing in the chat
     * - ASSISTANT: the AI (Ollama llama3.2)
     *
     * Stored as a string in PostgreSQL (EnumType.STRING).
     * We send this string directly to Ollama in the messages array.
     */
    public enum Role {
        user,         // lowercase because Ollama expects "user", not "USER"
        assistant     // lowercase because Ollama expects "assistant", not "ASSISTANT"
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Which conversation this message belongs to
    @Column(name = "conversation_id", nullable = false)
    private Long conversationId;

    // USER or ASSISTANT
    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 20)
    private Role role;

    // The actual text of the message
    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
