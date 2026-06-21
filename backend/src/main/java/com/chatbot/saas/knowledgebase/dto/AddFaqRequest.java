package com.chatbot.saas.knowledgebase.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * WHY this class exists:
 *   DTO for adding a FAQ (Frequently Asked Question) entry to the knowledge base.
 *   FAQs are simpler than PDFs — just a question + answer pair typed directly.
 *
 * WHAT it does:
 *   Carries the FAQ question, answer, and which chatbot it belongs to.
 *
 * Example request body:
 * {
 *   "chatbotId": 1,
 *   "question": "What are your business hours?",
 *   "answer": "We're open Monday-Friday, 9am-6pm EST."
 * }
 *
 * The service will format these into:
 * "Q: What are your business hours?\nA: We're open Monday-Friday, 9am-6pm EST."
 * and treat it as a text document.
 */
@Data
public class AddFaqRequest {

    @NotNull(message = "Chatbot ID is required")
    private Long chatbotId;

    @NotBlank(message = "Question is required")
    @Size(max = 500, message = "Question must be under 500 characters")
    private String question;

    @NotBlank(message = "Answer is required")
    @Size(max = 3000, message = "Answer must be under 3000 characters")
    private String answer;
}
