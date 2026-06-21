package com.chatbot.saas.chatbot.dto;

import com.chatbot.saas.chatbot.Chatbot;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * WHY this class exists:
 *   We never return the raw Chatbot entity to the frontend.
 *   This DTO is the "public view" of a chatbot — safe to send over the wire.
 *   In future phases we might add computed fields here (e.g., message count).
 *
 * WHAT it does:
 *   A read-only representation of a chatbot sent in API responses.
 *   Used for: list all chatbots, get single chatbot, after create/update.
 *
 * HOW it works:
 *   The static fromChatbot() factory method converts a Chatbot entity → this DTO.
 *   Centralizes the mapping logic so if you add a field you change it in ONE place.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatbotResponse {

    private Long id;
    private Long userId;
    private String name;
    private String description;
    private String welcomeMessage;
    private String systemPrompt;
    private String themeColor;
    private String widgetPosition;
    private String language;
    private boolean leadFormEnabled;
    // @JsonProperty forces the "is" prefix to be kept in JSON output.
    // Without it, Lombok generates isActive() and Jackson strips "is" → sends "active".
    // The frontend reads chatbot.isActive / chatbot.isPublished so the names must match.
    @JsonProperty("isActive")
    private boolean isActive;
    @JsonProperty("isPublished")
    private boolean isPublished;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /**
     * Factory method: Chatbot entity → ChatbotResponse DTO.
     * Usage: ChatbotResponse.fromChatbot(chatbot)
     */
    public static ChatbotResponse fromChatbot(Chatbot chatbot) {
        return ChatbotResponse.builder()
                .id(chatbot.getId())
                .userId(chatbot.getUserId())
                .name(chatbot.getName())
                .description(chatbot.getDescription())
                .welcomeMessage(chatbot.getWelcomeMessage())
                .systemPrompt(chatbot.getSystemPrompt())
                .themeColor(chatbot.getThemeColor())
                .widgetPosition(chatbot.getWidgetPosition())
                .language(chatbot.getLanguage())
                .leadFormEnabled(chatbot.isLeadFormEnabled())
                .isActive(chatbot.isActive())
                .isPublished(chatbot.isPublished())
                .createdAt(chatbot.getCreatedAt())
                .updatedAt(chatbot.getUpdatedAt())
                .build();
    }
}
