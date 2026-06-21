package com.chatbot.saas.knowledgebase.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * WHY this class exists:
 *   DTO for adding a plain text block to the knowledge base.
 *   Users can paste any text content (product descriptions, policies, etc.)
 *   without needing to create a PDF file.
 *
 * Example request body:
 * {
 *   "chatbotId": 1,
 *   "title": "Refund Policy",
 *   "content": "Our refund policy allows returns within 30 days..."
 * }
 */
@Data
public class AddTextRequest {

    @NotNull(message = "Chatbot ID is required")
    private Long chatbotId;

    @NotBlank(message = "Title is required")
    @Size(max = 255, message = "Title must be under 255 characters")
    private String title;

    @NotBlank(message = "Content is required")
    @Size(min = 10, max = 50000, message = "Content must be between 10 and 50,000 characters")
    private String content;
}
