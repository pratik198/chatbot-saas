package com.chatbot.saas.knowledgebase.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * WHY this class exists:
 *   Lets a chatbot owner train the bot on many question/answer pairs at
 *   once instead of adding them one at a time through the single-FAQ form.
 *
 * WHAT it does:
 *   Carries a block of pasted text — one "question | answer" pair per line —
 *   plus which chatbot to add them to.
 *
 * Example request body:
 * {
 *   "chatbotId": 1,
 *   "faqText": "What are your hours? | 9am-6pm Mon-Fri\nDo you deliver? | Yes, within 5km"
 * }
 */
@Data
public class BulkFaqRequest {

    @NotNull(message = "Chatbot ID is required")
    private Long chatbotId;

    @NotBlank(message = "FAQ text is required")
    private String faqText;
}
