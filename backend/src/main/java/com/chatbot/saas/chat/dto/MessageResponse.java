package com.chatbot.saas.chat.dto;

import com.chatbot.saas.chat.Message;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * WHY this class exists:
 *   The JSON shape we send to the frontend for one message.
 *   We convert Message entity → MessageResponse DTO so we control
 *   exactly what fields are exposed in the API.
 *
 * WHAT it includes:
 *   id, role (user/assistant), content, createdAt
 *   The frontend uses "role" to decide which side to render the bubble on.
 */
@Data
@Builder
public class MessageResponse {

    private Long id;
    private String role;      // "user" or "assistant"
    private String content;
    private LocalDateTime createdAt;

    /** Converts a Message entity to a response DTO */
    public static MessageResponse fromMessage(Message message) {
        return MessageResponse.builder()
                .id(message.getId())
                .role(message.getRole().name())   // enum → lowercase string ("user"/"assistant")
                .content(message.getContent())
                .createdAt(message.getCreatedAt())
                .build();
    }
}
