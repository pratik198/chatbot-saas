package com.chatbot.saas.lead;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * WHY this class exists:
 *   A "lead" is a potential customer who interacted with your chatbot.
 *   When someone fills the lead form (name + email) before chatting,
 *   their information is captured here so you can follow up.
 *
 * WHAT it does:
 *   Maps to the "leads" table in PostgreSQL.
 *   Stores visitor contact info + which chatbot/conversation it came from.
 *
 * HOW leads are captured:
 *   Two ways:
 *   1. Lead form before chat: if chatbot.leadFormEnabled=true, the widget shows
 *      a form (name + email) before the first message. Visitor fills it → Lead saved.
 *   2. Mid-chat capture: the AI asks for the visitor's name and email.
 *      (Phase 5 covers both, but the form approach is the primary one.)
 *
 *   Dashboard owners can see all their leads in the Leads page.
 *   Future phases can integrate with CRMs (Salesforce, HubSpot) via Zapier.
 */
@Entity
@Table(name = "leads")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class Lead {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Which chatbot captured this lead
    @Column(name = "chatbot_id", nullable = false)
    private Long chatbotId;

    // The chatbot owner (used for ownership queries)
    @Column(name = "user_id", nullable = false)
    private Long userId;

    // Which conversation this lead came from (optional — null for form-before-chat)
    @Column(name = "conversation_id")
    private Long conversationId;

    // ─── Visitor Info ──────────────────────────────────────────────────────────

    @Column(name = "visitor_name", length = 100)
    private String visitorName;

    @Column(name = "visitor_email", length = 200)
    private String visitorEmail;

    @Column(name = "visitor_phone", length = 30)
    private String visitorPhone;

    // Optional: the first message the visitor sent (gives context on what they need)
    @Column(name = "initial_message", columnDefinition = "TEXT")
    private String initialMessage;

    // WHERE the lead came from: "WIDGET" (embed on external site) or "DASHBOARD_TEST"
    @Column(name = "source", length = 20)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private LeadSource source = LeadSource.WIDGET;

    // Whether the chatbot owner has seen/read this lead (for unread badge)
    @Column(name = "is_read")
    @Builder.Default
    private boolean read = false;

    @CreatedDate
    @Column(name = "captured_at", nullable = false, updatable = false)
    private LocalDateTime capturedAt;

    public enum LeadSource {
        WIDGET,           // from the embed widget on an external website
        DASHBOARD_TEST    // owner testing their own chatbot from the dashboard
    }
}
