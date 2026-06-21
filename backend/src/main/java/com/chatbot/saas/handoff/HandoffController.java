package com.chatbot.saas.handoff;

import com.chatbot.saas.chat.ConversationRepository;
import com.chatbot.saas.chat.MessageRepository;
import com.chatbot.saas.chat.OllamaService;
import com.chatbot.saas.chat.Message;
import com.chatbot.saas.chat.dto.MessageResponse;
import com.chatbot.saas.chatbot.ChatbotRepository;
import com.chatbot.saas.common.exception.ResourceNotFoundException;
import com.chatbot.saas.common.response.ApiResponse;
import com.chatbot.saas.user.User;
import com.chatbot.saas.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * WHY this class exists:
 *   REST API for the Agent Inbox — where chatbot owners handle live visitor requests.
 *
 * ENDPOINTS (all require auth):
 *   GET  /api/handoffs               → all handoffs (pending + active)
 *   GET  /api/handoffs/pending-count → count for the sidebar badge
 *   GET  /api/handoffs/{id}          → one handoff + conversation history
 *   PUT  /api/handoffs/{id}/accept   → accept a handoff (PENDING → ACTIVE)
 *   POST /api/handoffs/{id}/reply    → agent sends a message to the visitor
 *   PUT  /api/handoffs/{id}/close    → close the session (ACTIVE → CLOSED)
 *
 * PUBLIC endpoints (in WidgetController):
 *   POST /api/widget/{chatbotId}/handoff → visitor requests a human
 */
@RestController
@RequestMapping("/api/handoffs")
@RequiredArgsConstructor
@Slf4j
public class HandoffController {

    private final AgentHandoffRepository handoffRepository;
    private final MessageRepository messageRepository;
    private final ConversationRepository conversationRepository;
    private final UserRepository userRepository;

    /** GET all handoffs (PENDING + ACTIVE), newest first */
    @GetMapping
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getHandoffs(
            @RequestParam(defaultValue = "ALL") String status) {

        User user = getCurrentUser();
        List<AgentHandoff> list;

        if ("PENDING".equals(status)) {
            list = handoffRepository.findByUserIdAndStatusOrderByRequestedAtDesc(
                    user.getId(), AgentHandoff.HandoffStatus.PENDING);
        } else if ("ACTIVE".equals(status)) {
            list = handoffRepository.findByUserIdAndStatusOrderByRequestedAtDesc(
                    user.getId(), AgentHandoff.HandoffStatus.ACTIVE);
        } else {
            list = handoffRepository.findByUserIdOrderByRequestedAtDesc(user.getId());
        }

        List<Map<String, Object>> result = list.stream().map(this::toMap).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success("Handoffs loaded", result));
    }

    /** GET /api/handoffs/pending-count → badge number */
    @GetMapping("/pending-count")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getPendingCount() {
        User user = getCurrentUser();
        long count = handoffRepository.countByUserIdAndStatus(user.getId(), AgentHandoff.HandoffStatus.PENDING);
        return ResponseEntity.ok(ApiResponse.success("OK", Map.of("count", count)));
    }

    /** GET /api/handoffs/{id} — one handoff with conversation messages */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getHandoff(@PathVariable Long id) {
        User user = getCurrentUser();
        AgentHandoff handoff = findOwned(id, user.getId());

        Map<String, Object> result = toMap(handoff);

        // Include conversation history if linked
        if (handoff.getConversationId() != null) {
            List<MessageResponse> messages = messageRepository
                    .findByConversationIdOrderByCreatedAtAsc(handoff.getConversationId())
                    .stream()
                    .map(MessageResponse::fromMessage)
                    .collect(Collectors.toList());
            result.put("messages", messages);
        }

        return ResponseEntity.ok(ApiResponse.success("Handoff loaded", result));
    }

    /** PUT /api/handoffs/{id}/accept — agent accepts the request */
    @PutMapping("/{id}/accept")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> acceptHandoff(@PathVariable Long id) {
        User user = getCurrentUser();
        AgentHandoff handoff = findOwned(id, user.getId());

        if (handoff.getStatus() != AgentHandoff.HandoffStatus.PENDING) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("This handoff is not pending"));
        }

        handoff.setStatus(AgentHandoff.HandoffStatus.ACTIVE);
        handoff.setAcceptedAt(LocalDateTime.now());
        handoffRepository.save(handoff);

        log.info("Agent {} accepted handoff {}", user.getEmail(), id);
        return ResponseEntity.ok(ApiResponse.success("Handoff accepted", toMap(handoff)));
    }

    /**
     * POST /api/handoffs/{id}/reply
     * Agent types a message visible to the visitor in the conversation.
     * The message is saved as an "assistant" message in the conversation.
     * Body: { "message": "Hello! How can I help you?" }
     */
    @PostMapping("/{id}/reply")
    @Transactional
    public ResponseEntity<ApiResponse<MessageResponse>> agentReply(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {

        User user = getCurrentUser();
        AgentHandoff handoff = findOwned(id, user.getId());

        if (handoff.getConversationId() == null) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("No conversation linked to this handoff"));
        }

        String messageText = body.get("message");
        if (messageText == null || messageText.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Message is required"));
        }

        // Save agent's reply as an assistant message in the conversation
        Message agentMessage = messageRepository.save(
                Message.builder()
                        .conversationId(handoff.getConversationId())
                        .role(Message.Role.assistant)   // shows on left side in the widget
                        .content("[Agent] " + messageText.trim())
                        .build()
        );

        return ResponseEntity.ok(ApiResponse.success("Reply sent", MessageResponse.fromMessage(agentMessage)));
    }

    /** PUT /api/handoffs/{id}/close — agent closes the session */
    @PutMapping("/{id}/close")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> closeHandoff(@PathVariable Long id) {
        User user = getCurrentUser();
        AgentHandoff handoff = findOwned(id, user.getId());

        handoff.setStatus(AgentHandoff.HandoffStatus.CLOSED);
        handoff.setClosedAt(LocalDateTime.now());
        handoffRepository.save(handoff);

        return ResponseEntity.ok(ApiResponse.success("Handoff closed", null));
    }

    // ─── Helpers ───────────────────────────────────────────────────────────────

    private AgentHandoff findOwned(Long id, Long userId) {
        return handoffRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Handoff not found: " + id));
    }

    private Map<String, Object> toMap(AgentHandoff h) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", h.getId());
        m.put("chatbotId", h.getChatbotId());
        m.put("conversationId", h.getConversationId());
        m.put("visitorName", h.getVisitorName());
        m.put("visitorEmail", h.getVisitorEmail());
        m.put("reason", h.getReason());
        m.put("status", h.getStatus().name());
        m.put("requestedAt", h.getRequestedAt());
        m.put("acceptedAt", h.getAcceptedAt());
        m.put("closedAt", h.getClosedAt());
        return m;
    }

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
