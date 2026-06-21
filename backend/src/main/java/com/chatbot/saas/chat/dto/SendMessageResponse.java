package com.chatbot.saas.chat.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * WHY this class exists:
 *   When a user sends a message, the backend does 3 things:
 *     1. Saves the user's message
 *     2. Runs RAG (finds relevant knowledge chunks)
 *     3. Calls Ollama for the AI reply, saves and returns it
 *
 *   This DTO returns BOTH messages so the frontend can display them immediately
 *   without needing to fetch the whole conversation again.
 */
@Data
@Builder
public class SendMessageResponse {

    private Long conversationId;

    // The user's message that was saved
    private MessageResponse userMessage;

    // The AI's response
    private MessageResponse assistantMessage;

    // Updated title if this was the first message and title was auto-set
    private String conversationTitle;
}
