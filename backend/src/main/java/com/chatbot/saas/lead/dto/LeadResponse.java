package com.chatbot.saas.lead.dto;

import com.chatbot.saas.lead.Lead;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * WHY this class exists:
 *   The JSON shape sent to the frontend for one lead.
 *   Converts Lead entity → DTO so we control what's exposed in the API.
 */
@Data
@Builder
public class LeadResponse {

    private Long id;
    private Long chatbotId;
    private String chatbotName;  // populated from Chatbot for display
    private Long conversationId;

    private String visitorName;
    private String visitorEmail;
    private String visitorPhone;
    private String initialMessage;
    private String source;
    private boolean read;
    private LocalDateTime capturedAt;

    public static LeadResponse fromLead(Lead lead, String chatbotName) {
        return LeadResponse.builder()
                .id(lead.getId())
                .chatbotId(lead.getChatbotId())
                .chatbotName(chatbotName)
                .conversationId(lead.getConversationId())
                .visitorName(lead.getVisitorName())
                .visitorEmail(lead.getVisitorEmail())
                .visitorPhone(lead.getVisitorPhone())
                .initialMessage(lead.getInitialMessage())
                .source(lead.getSource().name())
                .read(lead.isRead())
                .capturedAt(lead.getCapturedAt())
                .build();
    }
}
