package com.chatbot.saas.chatbot;

import com.chatbot.saas.chatbot.dto.ChatbotResponse;
import com.chatbot.saas.chatbot.dto.CreateChatbotRequest;
import com.chatbot.saas.chatbot.dto.UpdateChatbotRequest;
import com.chatbot.saas.common.exception.ResourceNotFoundException;
import com.chatbot.saas.user.User;
import com.chatbot.saas.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * WHY this class exists:
 *   Service layer for all chatbot operations.
 *   Contains business logic: validation, authorization checks, and data manipulation.
 *   Controllers just receive requests and call this service.
 *
 * WHAT it does:
 *   Full CRUD for chatbots:
 *   - Create a new chatbot
 *   - List all chatbots for the current user
 *   - Get a single chatbot
 *   - Update a chatbot
 *   - Delete a chatbot
 *   - Toggle publish status
 *
 * HOW security works here:
 *   Every method calls getCurrentUser() to get the logged-in user's ID.
 *   Then every DB query includes AND user_id = ? to prevent one user
 *   from accessing or modifying another user's chatbots.
 *   This pattern is called "ownership-based authorization".
 *
 *   Example attack prevented:
 *   User A makes DELETE /api/chatbots/99 (chatbot 99 belongs to User B).
 *   ChatbotRepository.findByIdAndUserId(99, userA.id) returns empty.
 *   We throw 404 → User A doesn't even know chatbot 99 exists.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ChatbotService {

    private final ChatbotRepository chatbotRepository;
    private final UserRepository userRepository;

    // ─── Create ────────────────────────────────────────────────────────────

    /**
     * Creates a new chatbot owned by the current logged-in user.
     *
     * @param request - validated CreateChatbotRequest from the controller
     * @return        - ChatbotResponse DTO of the newly created chatbot
     */
    @Transactional
    public ChatbotResponse createChatbot(CreateChatbotRequest request) {
        User currentUser = getCurrentUser();
        log.info("Creating chatbot '{}' for user {}", request.getName(), currentUser.getEmail());

        // Optional: check for duplicate name within the same user account
        if (chatbotRepository.existsByNameAndUserId(request.getName(), currentUser.getId())) {
            throw new RuntimeException("A chatbot with this name already exists. Please choose a different name.");
        }

        // Build the Chatbot entity with defaults for any optional fields not provided
        Chatbot chatbot = Chatbot.builder()
                .userId(currentUser.getId())
                .name(request.getName())
                .welcomeMessage(request.getWelcomeMessage())
                // Optional fields — use provided value, or fall back to default
                .description(request.getDescription())
                .systemPrompt(request.getSystemPrompt())
                .themeColor(request.getThemeColor() != null ? request.getThemeColor() : "#2563eb")
                .widgetPosition(request.getWidgetPosition() != null ? request.getWidgetPosition() : "bottom-right")
                .language(request.getLanguage() != null ? request.getLanguage() : "en")
                .leadFormEnabled(request.getLeadFormEnabled() != null ? request.getLeadFormEnabled() : false)
                .isActive(true)
                .isPublished(false)  // always starts as draft
                .build();

        Chatbot saved = chatbotRepository.save(chatbot);
        log.info("Chatbot created with ID: {}", saved.getId());
        return ChatbotResponse.fromChatbot(saved);
    }

    // ─── Read ──────────────────────────────────────────────────────────────

    /**
     * Returns all chatbots belonging to the current user.
     * Ordered newest-first.
     */
    public List<ChatbotResponse> getMyChatbots() {
        User currentUser = getCurrentUser();
        log.debug("Fetching chatbots for user: {}", currentUser.getEmail());

        return chatbotRepository.findByUserIdOrderByCreatedAtDesc(currentUser.getId())
                .stream()
                .map(ChatbotResponse::fromChatbot)   // convert each entity to DTO
                .toList();                            // Java 16+ .toList() — immutable list
    }

    /**
     * Returns a single chatbot by ID.
     * Throws 404 if not found OR if it doesn't belong to the current user.
     */
    public ChatbotResponse getChatbotById(Long chatbotId) {
        User currentUser = getCurrentUser();
        Chatbot chatbot = findOwnedChatbot(chatbotId, currentUser.getId());
        return ChatbotResponse.fromChatbot(chatbot);
    }

    /**
     * Returns the total count of chatbots for dashboard stats.
     */
    public long getChatbotCount() {
        User currentUser = getCurrentUser();
        return chatbotRepository.countByUserId(currentUser.getId());
    }

    // ─── Update ────────────────────────────────────────────────────────────

    /**
     * Updates all editable fields of a chatbot.
     * Uses the "fetch → modify → save" pattern (standard JPA update approach).
     */
    @Transactional
    public ChatbotResponse updateChatbot(Long chatbotId, UpdateChatbotRequest request) {
        User currentUser = getCurrentUser();
        Chatbot chatbot = findOwnedChatbot(chatbotId, currentUser.getId());

        log.info("Updating chatbot {} for user {}", chatbotId, currentUser.getEmail());

        // Check for name conflict only if the name actually changed
        if (!chatbot.getName().equals(request.getName()) &&
                chatbotRepository.existsByNameAndUserId(request.getName(), currentUser.getId())) {
            throw new RuntimeException("A chatbot with this name already exists.");
        }

        // Apply all updates
        chatbot.setName(request.getName());
        chatbot.setWelcomeMessage(request.getWelcomeMessage());
        if (request.getDescription() != null) chatbot.setDescription(request.getDescription());
        if (request.getSystemPrompt() != null) chatbot.setSystemPrompt(request.getSystemPrompt());
        if (request.getThemeColor() != null) chatbot.setThemeColor(request.getThemeColor());
        if (request.getWidgetPosition() != null) chatbot.setWidgetPosition(request.getWidgetPosition());
        if (request.getLanguage() != null) chatbot.setLanguage(request.getLanguage());
        if (request.getLeadFormEnabled() != null) chatbot.setLeadFormEnabled(request.getLeadFormEnabled());
        if (request.getIsActive() != null) chatbot.setActive(request.getIsActive());

        // save() runs UPDATE SQL; @LastModifiedDate auto-updates updatedAt
        Chatbot updated = chatbotRepository.save(chatbot);
        return ChatbotResponse.fromChatbot(updated);
    }

    /**
     * Toggle published status: draft → published → draft.
     * When isPublished = true, the widget will be visible on the owner's website.
     */
    @Transactional
    public ChatbotResponse togglePublish(Long chatbotId) {
        User currentUser = getCurrentUser();
        Chatbot chatbot = findOwnedChatbot(chatbotId, currentUser.getId());

        boolean newStatus = !chatbot.isPublished();
        chatbot.setPublished(newStatus);

        Chatbot updated = chatbotRepository.save(chatbot);
        log.info("Chatbot {} publish status set to: {}", chatbotId, newStatus);
        return ChatbotResponse.fromChatbot(updated);
    }

    // ─── Delete ────────────────────────────────────────────────────────────

    /**
     * Permanently deletes a chatbot.
     * In Phase 3+, this will also delete associated knowledge base documents.
     * @Transactional ensures that if something fails, the delete is rolled back.
     */
    @Transactional
    public void deleteChatbot(Long chatbotId) {
        User currentUser = getCurrentUser();
        Chatbot chatbot = findOwnedChatbot(chatbotId, currentUser.getId());

        log.info("Deleting chatbot {} owned by {}", chatbotId, currentUser.getEmail());
        chatbotRepository.delete(chatbot);
    }

    // ─── Private helpers ───────────────────────────────────────────────────

    /**
     * Finds a chatbot that belongs to this user.
     * Throws ResourceNotFoundException (→ HTTP 404) if not found or not owned.
     * Used by all methods to avoid repeating this pattern everywhere.
     */
    private Chatbot findOwnedChatbot(Long chatbotId, Long userId) {
        return chatbotRepository.findByIdAndUserId(chatbotId, userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Chatbot not found with id: " + chatbotId));
    }

    /**
     * Gets the currently authenticated user from Spring Security's context.
     *
     * HOW this works:
     * JwtAuthFilter ran earlier in the request pipeline.
     * It parsed the JWT and called SecurityContextHolder.getContext().setAuthentication(...)
     * Now we read that back: getAuthentication().getName() returns the email.
     * Then we load the full User from the database.
     */
    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found"));
    }
}
