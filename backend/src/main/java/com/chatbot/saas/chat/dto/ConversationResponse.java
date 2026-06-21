package com.chatbot.saas.chat.dto;

import com.chatbot.saas.chat.Conversation;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * WHY this class exists:
 *   The JSON shape we send to the frontend for a conversation.
 *   Two modes:
 *     - List mode: no messages (just metadata) — used for the sidebar list
 *     - Detail mode: includes full message history — used when user opens a conversation
 *
 * HOW the frontend uses this:
 *   GET /api/chat/{chatbotId}/conversations       → list of ConversationResponse (no messages)
 *   GET /api/chat/conversations/{id}              → one ConversationResponse WITH messages
 *   POST .../messages                             → returns SendMessageResponse (see ChatController)
 */
@Data
@Builder
public class ConversationResponse {

    private Long id;
    private Long chatbotId;
    private String chatbotName;  // populated from Chatbot entity for display
    private String title;
    private int messageCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Only populated when fetching a single conversation (not in list view)
    private List<MessageResponse> messages;

    /** Converts a Conversation entity to a response (list mode — no messages) */
    public static ConversationResponse fromConversation(Conversation conv, String chatbotName) {
        return ConversationResponse.builder()
                .id(conv.getId())
                .chatbotId(conv.getChatbotId())
                .chatbotName(chatbotName)
                .title(conv.getTitle() != null ? conv.getTitle() : "New Conversation")
                .messageCount(conv.getMessageCount())
                .createdAt(conv.getCreatedAt())
                .updatedAt(conv.getUpdatedAt())
                .build();
    }

    /** Converts a Conversation entity to a response (detail mode — includes messages) */
    public static ConversationResponse fromConversationWithMessages(
            Conversation conv, String chatbotName, List<MessageResponse> messages) {
        return ConversationResponse.builder()
                .id(conv.getId())
                .chatbotId(conv.getChatbotId())
                .chatbotName(chatbotName)
                .title(conv.getTitle() != null ? conv.getTitle() : "New Conversation")
                .messageCount(conv.getMessageCount())
                .createdAt(conv.getCreatedAt())
                .updatedAt(conv.getUpdatedAt())
                .messages(messages)
                .build();
    }
}
