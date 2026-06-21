package com.chatbot.saas.chatbot.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * WHY this class exists:
 *   DTO for the "create chatbot" request body.
 *   The frontend sends JSON; Spring maps it to this class.
 *   Validation annotations ensure data quality before hitting the service.
 *
 * WHAT it does:
 *   Carries all the fields a user fills in the chatbot builder form.
 *   Only the minimum required fields are @NotBlank — the rest are optional
 *   with sensible defaults applied in the service layer.
 *
 * Example request body:
 * {
 *   "name": "Support Bot",
 *   "welcomeMessage": "Hi! How can I help you today?",
 *   "description": "Customer support chatbot",
 *   "systemPrompt": "You are a helpful support agent...",
 *   "themeColor": "#2563eb",
 *   "widgetPosition": "bottom-right",
 *   "language": "en",
 *   "leadFormEnabled": false
 * }
 */
@Data
public class CreateChatbotRequest {

    @NotBlank(message = "Chatbot name is required")
    @Size(min = 2, max = 100, message = "Name must be between 2 and 100 characters")
    private String name;

    @NotBlank(message = "Welcome message is required")
    @Size(max = 500, message = "Welcome message must be under 500 characters")
    private String welcomeMessage;

    // Optional fields (nullable = use defaults in service)
    private String description;

    @Size(max = 5000, message = "System prompt must be under 5000 characters")
    private String systemPrompt;

    /**
     * @Pattern validates the hex color format: # followed by exactly 6 hex chars.
     * regexp = "#[0-9a-fA-F]{6}" matches: #2563eb, #ffffff, #FF0000
     * Does NOT match: "blue", "#gggggg", "2563eb" (missing #)
     */
    @Pattern(regexp = "^#[0-9a-fA-F]{6}$", message = "Theme color must be a valid hex code like #2563eb")
    private String themeColor;

    @Pattern(regexp = "^(bottom-right|bottom-left)$", message = "Widget position must be bottom-right or bottom-left")
    private String widgetPosition;

    @Size(max = 10, message = "Language code too long")
    private String language;

    private Boolean leadFormEnabled;
}
