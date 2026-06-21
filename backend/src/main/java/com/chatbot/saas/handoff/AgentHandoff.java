package com.chatbot.saas.handoff;

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
 *   Sometimes the AI can't help — the user asks something too complex,
 *   gets frustrated, or explicitly asks for a human agent.
 *   "Agent handoff" is the process of escalating from the AI to a real person.
 *
 * WHAT it does:
 *   Maps to the "agent_handoffs" table.
 *   Tracks requests from visitors who want to talk to a human.
 *   The chatbot owner (agent) can see these in their "Agent Inbox" page.
 *
 * HOW the handoff flow works:
 *   1. Visitor clicks "Talk to a human" in the widget
 *   2. POST /api/widget/{chatbotId}/handoff → creates AgentHandoff (status=PENDING)
 *   3. Dashboard owner sees PENDING badge in sidebar → clicks "Agent" page
 *   4. Owner clicks "Accept" → status=ACTIVE → can reply to the visitor
 *   5. Owner sees conversation history, types replies via message API
 *   6. Owner closes the session → status=CLOSED
 *
 * HOW the frontend knows about new handoffs:
 *   The AgentPage polls GET /api/handoffs every 5 seconds for new PENDING requests.
 *   This is called "polling" — simpler than WebSockets, good enough for low volume.
 */
@Entity
@Table(name = "agent_handoffs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class AgentHandoff {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "chatbot_id", nullable = false)
    private Long chatbotId;

    // The chatbot owner who will act as the human agent
    @Column(name = "user_id", nullable = false)
    private Long userId;

    // Link to the conversation — agent can read the full history
    @Column(name = "conversation_id")
    private Long conversationId;

    // Visitor info (from lead form if available)
    @Column(name = "visitor_name", length = 100)
    private String visitorName;

    @Column(name = "visitor_email", length = 200)
    private String visitorEmail;

    // Why the visitor wants a human (last AI message or visitor's typed reason)
    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    /**
     * Lifecycle of a handoff request:
     *   PENDING → ACTIVE → CLOSED
     *   PENDING: waiting for agent to accept
     *   ACTIVE:  agent is chatting with the visitor
     *   CLOSED:  conversation ended
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 10, nullable = false)
    @Builder.Default
    private HandoffStatus status = HandoffStatus.PENDING;

    @CreatedDate
    @Column(name = "requested_at", nullable = false, updatable = false)
    private LocalDateTime requestedAt;

    @Column(name = "accepted_at")
    private LocalDateTime acceptedAt;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    public enum HandoffStatus {
        PENDING,   // waiting for agent
        ACTIVE,    // agent accepted and is chatting
        CLOSED     // conversation ended
    }
}
