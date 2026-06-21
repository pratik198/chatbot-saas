package com.chatbot.saas.chatbot;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * WHY this class exists:
 *   This is the JPA entity for a Chatbot.
 *   Each user can create multiple chatbots.
 *   This entity stores all configuration for one chatbot — its name,
 *   what it says, how it looks, and what features it has.
 *
 * WHAT it does:
 *   Maps to the "chatbots" table in PostgreSQL.
 *   Stores everything the chatbot builder configures:
 *   - Basic info: name, description, welcome message
 *   - AI behavior: system prompt, language
 *   - Appearance: theme color, widget position
 *   - Features: lead form on/off
 *   - Status: active/inactive, published/draft
 *
 * HOW it works:
 *   userId is a foreign key — it links this chatbot to its owner (a User).
 *   We store userId as Long (not a full @ManyToOne) to keep JPA simple for now.
 *   In Phase 9 (Multi-Tenant), we'll upgrade to a full organization relationship.
 *
 *   Database table: chatbots
 *   Relationship: One User → Many Chatbots
 */
@Entity
@Table(name = "chatbots")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class Chatbot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Foreign key to the users table.
     * Stores the ID of the user who owns this chatbot.
     * We use this to filter: "only return chatbots that belong to me".
     */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    // ─── Basic Info ────────────────────────────────────────────────────────

    /** Display name of the chatbot (e.g., "Support Bot", "Sales Assistant") */
    @Column(nullable = false, length = 100)
    private String name;

    /** Optional description — helps the owner identify what this bot is for */
    @Column(columnDefinition = "TEXT")
    private String description;

    /**
     * The first message users see when they open the chat widget.
     * Example: "Hi! I'm here to help. What can I do for you today?"
     */
    @Column(name = "welcome_message", nullable = false, columnDefinition = "TEXT")
    private String welcomeMessage;

    // ─── AI Settings ───────────────────────────────────────────────────────

    /**
     * The system prompt tells the AI how to behave.
     * Example: "You are a helpful customer support agent for Acme Corp.
     *           Only answer questions about our products."
     * This will be used in Phase 4 when we integrate the AI engine.
     */
    @Column(name = "system_prompt", columnDefinition = "TEXT")
    private String systemPrompt;

    /**
     * Language code for the chatbot interface.
     * Examples: "en" (English), "es" (Spanish), "fr" (French)
     * Used in Phase 4 for multi-language AI responses.
     */
    @Column(length = 10)
    @Builder.Default
    private String language = "en";

    // ─── Appearance ────────────────────────────────────────────────────────

    /**
     * Primary theme color for the chat widget.
     * Stored as a hex color code: "#2563eb"
     * Used in Phase 6 when we build the embeddable chat widget.
     */
    @Column(name = "theme_color", length = 7)
    @Builder.Default
    private String themeColor = "#2563eb";

    /**
     * Where on the website the chat widget floats.
     * Options: "bottom-right" or "bottom-left"
     */
    @Column(name = "widget_position", length = 20)
    @Builder.Default
    private String widgetPosition = "bottom-right";

    // ─── Features ──────────────────────────────────────────────────────────

    /**
     * If true: show a lead capture form (name, email, phone) before chat.
     * If false: go straight to chat.
     * Phase 5 will fully implement lead capture.
     */
    @Column(name = "lead_form_enabled")
    @Builder.Default
    private boolean leadFormEnabled = false;

    // ─── Status ────────────────────────────────────────────────────────────

    /**
     * isActive: if false, the chatbot is disabled and won't respond to visitors.
     * Lets owners temporarily disable a bot without deleting it.
     */
    @Column(name = "is_active")
    @Builder.Default
    private boolean isActive = true;

    /**
     * isPublished: false = "draft" mode (only visible in builder, not on website).
     *              true  = deployed and visible on the owner's website.
     * Phase 6 will use this to control the embed script.
     */
    @Column(name = "is_published")
    @Builder.Default
    private boolean isPublished = false;

    // ─── Timestamps ────────────────────────────────────────────────────────

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
