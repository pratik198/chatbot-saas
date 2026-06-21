package com.chatbot.saas.chatbot.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * WHY this class exists:
 *   DTO for the "update chatbot" request.
 *   Almost identical to CreateChatbotRequest, but kept separate because:
 *   - Update might have different required/optional fields in the future
 *   - Clearer intent: this is explicitly an update operation
 *   - Separation of concerns: create ≠ update (even if they look similar now)
 *
 * WHAT it does:
 *   Carries all the chatbot fields the user can modify in the builder.
 *   Used by PUT /api/chatbots/{id}
 */
@Data
public class UpdateChatbotRequest {

    @NotBlank(message = "Chatbot name is required")
    @Size(min = 2, max = 100, message = "Name must be between 2 and 100 characters")
    private String name;

    @NotBlank(message = "Welcome message is required")
    @Size(max = 500, message = "Welcome message must be under 500 characters")
    private String welcomeMessage;

    private String description;

    @Size(max = 5000, message = "System prompt must be under 5000 characters")
    private String systemPrompt;

    @Pattern(regexp = "^#[0-9a-fA-F]{6}$", message = "Theme color must be a valid hex code like #2563eb")
    private String themeColor;

    @Pattern(regexp = "^(bottom-right|bottom-left)$", message = "Widget position must be bottom-right or bottom-left")
    private String widgetPosition;

    @Size(max = 10)
    private String language;

    private Boolean leadFormEnabled;
    private Boolean isActive;
}
