package com.chatbot.saas.lead.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * WHY this class exists:
 *   The data a visitor submits in the lead capture form before chatting.
 *   Used for both:
 *   - POST /api/widget/{chatbotId}/lead  (from embed widget — no auth)
 *   - POST /api/leads/{chatbotId}        (dashboard test — with auth)
 */
@Data
public class LeadRequest {

    @NotBlank(message = "Name is required")
    @Size(max = 100)
    private String visitorName;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email address")
    @Size(max = 200)
    private String visitorEmail;

    @Size(max = 30)
    private String visitorPhone;  // optional

    // The first question/message the visitor typed (helps agent know context)
    @Size(max = 500)
    private String initialMessage;

    // Which conversation this lead is tied to (set after the first message is sent)
    private Long conversationId;
}
