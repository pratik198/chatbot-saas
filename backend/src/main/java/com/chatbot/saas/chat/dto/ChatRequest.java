package com.chatbot.saas.chat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * WHY this class exists:
 *   The request body when a user sends a chat message.
 *   Used for both starting a new conversation and continuing an existing one.
 *
 * HOW it's used:
 *   POST /api/chat/{chatbotId}/conversations     → { "message": "Hello!" } → creates new conv
 *   POST /api/chat/conversations/{id}/messages   → { "message": "..." }    → continues conv
 */
@Data
public class ChatRequest {

    @NotBlank(message = "Message cannot be empty")
    @Size(max = 4000, message = "Message cannot exceed 4000 characters")
    private String message;
}
