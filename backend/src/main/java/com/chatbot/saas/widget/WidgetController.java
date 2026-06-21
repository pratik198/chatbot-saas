package com.chatbot.saas.widget;

import com.chatbot.saas.chat.Conversation;
import com.chatbot.saas.chat.ConversationRepository;
import com.chatbot.saas.chat.Message;
import com.chatbot.saas.chat.MessageRepository;
import com.chatbot.saas.chat.OllamaService;
import com.chatbot.saas.chat.dto.MessageResponse;
import com.chatbot.saas.chatbot.Chatbot;
import com.chatbot.saas.chatbot.ChatbotRepository;
import com.chatbot.saas.common.exception.ResourceNotFoundException;
import com.chatbot.saas.common.response.ApiResponse;
import com.chatbot.saas.knowledgebase.embedding.EmbeddingService;
import com.chatbot.saas.knowledgebase.qdrant.QdrantService;
import com.chatbot.saas.handoff.AgentHandoff;
import com.chatbot.saas.handoff.AgentHandoffRepository;
import com.chatbot.saas.lead.Lead;
import com.chatbot.saas.lead.LeadRepository;
import com.chatbot.saas.lead.dto.LeadRequest;
import com.chatbot.saas.lead.dto.LeadResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * WHY this class exists:
 *   The public-facing API for the embedded chat widget on external websites.
 *   Unlike all other controllers, these endpoints require NO authentication.
 *   Any website visitor can call them — the chatbot owner has NO account here.
 *
 * WHAT it does:
 *   Provides a complete chat API for anonymous visitors:
 *   - GET  /api/widget/{chatbotId}/config  → chatbot name, colors, welcome msg
 *   - POST /api/widget/{chatbotId}/session → get or create an anonymous session
 *   - POST /api/widget/{chatbotId}/message → send a message, get AI reply
 *   - POST /api/widget/{chatbotId}/lead    → submit lead form (name + email)
 *
 * HOW anonymous sessions work:
 *   Visitors don't have accounts. We track them using a UUID "session token".
 *   Flow:
 *   1. Visitor opens the widget → frontend calls POST /session
 *   2. Backend returns a sessionToken (UUID)
 *   3. Frontend stores token in localStorage: "widget_session_{chatbotId}"
 *   4. All subsequent requests include: X-Session-Token: {token}
 *   5. Backend uses this token to find/resume the conversation
 *
 * SECURITY NOTE:
 *   These endpoints are intentionally public — no auth check.
 *   We allow any chatbot by ID but only if it is PUBLISHED.
 *   Draft bots (isPublished=false) are rejected to prevent accidental exposure.
 *   SecurityConfig explicitly permits /api/widget/** paths.
 *
 * HOW to embed on any website:
 *   Add this to the website's HTML:
 *   <script src="https://your-domain.com/widget.js" data-chatbot-id="123"></script>
 */
@RestController
@RequestMapping("/api/widget")
@RequiredArgsConstructor
@Slf4j
public class WidgetController {

    private final ChatbotRepository chatbotRepository;
    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final OllamaService ollamaService;
    private final EmbeddingService embeddingService;
    private final QdrantService qdrantService;
    private final LeadRepository leadRepository;
    private final AgentHandoffRepository handoffRepository;

    // ─── GET chatbot config ────────────────────────────────────────────────────

    /**
     * GET /api/widget/{chatbotId}/config
     * Returns public info about the chatbot: name, colors, welcome message.
     * The embed widget calls this on load to customise its appearance.
     */
    @GetMapping("/{chatbotId}/config")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getConfig(
            @PathVariable Long chatbotId) {

        Chatbot chatbot = getPublishedChatbot(chatbotId);

        Map<String, Object> config = new HashMap<>();
        config.put("id", chatbot.getId());
        config.put("name", chatbot.getName());
        config.put("themeColor", chatbot.getThemeColor());
        config.put("widgetPosition", chatbot.getWidgetPosition());
        config.put("welcomeMessage", chatbot.getWelcomeMessage());
        config.put("leadFormEnabled", chatbot.isLeadFormEnabled());
        config.put("language", chatbot.getLanguage());

        return ResponseEntity.ok(ApiResponse.success("Config loaded", config));
    }

    // ─── POST create/get session ───────────────────────────────────────────────

    /**
     * POST /api/widget/{chatbotId}/session
     * Creates a new anonymous session for a visitor.
     * Returns a sessionToken that the visitor's browser stores in localStorage.
     * If a sessionToken is provided in the request body, we reuse it
     * (visitor returning after refreshing the page).
     */
    @PostMapping("/{chatbotId}/session")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createSession(
            @PathVariable Long chatbotId,
            @RequestBody(required = false) Map<String, String> body) {

        getPublishedChatbot(chatbotId); // validate bot exists + is published

        // Reuse existing session token if provided (visitor came back)
        String sessionToken = (body != null) ? body.get("sessionToken") : null;

        if (sessionToken == null || sessionToken.isBlank()) {
            // Generate a new UUID session token for this visitor
            sessionToken = UUID.randomUUID().toString();
            log.info("New widget session created for chatbot {}: {}", chatbotId, sessionToken);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("sessionToken", sessionToken);

        // If this visitor already has a conversation, return the history
        final String token = sessionToken;
        conversationRepository.findBySessionTokenAndChatbotId(token, chatbotId)
                .ifPresent(conv -> {
                    List<MessageResponse> messages = messageRepository
                            .findByConversationIdOrderByCreatedAtAsc(conv.getId())
                            .stream()
                            .map(MessageResponse::fromMessage)
                            .collect(Collectors.toList());
                    result.put("conversationId", conv.getId());
                    result.put("messages", messages);
                });

        return ResponseEntity.ok(ApiResponse.success("Session ready", result));
    }

    // ─── POST send message ─────────────────────────────────────────────────────

    /**
     * POST /api/widget/{chatbotId}/message
     * Headers: X-Session-Token: {uuid}
     * Body: { "message": "What are your hours?" }
     *
     * The full RAG pipeline runs here (same as authenticated chat):
     *   embed → Qdrant search → build prompt → Ollama → save → return
     */
    @PostMapping("/{chatbotId}/message")
    public ResponseEntity<ApiResponse<Map<String, Object>>> sendMessage(
            @PathVariable Long chatbotId,
            @RequestHeader(value = "X-Session-Token", required = false) String sessionToken,
            @RequestBody Map<String, String> body) {

        if (sessionToken == null || sessionToken.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("X-Session-Token header is required"));
        }

        String userMessage = body.get("message");
        if (userMessage == null || userMessage.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("message is required"));
        }

        Chatbot chatbot = getPublishedChatbot(chatbotId);

        // Find or create conversation for this session
        Conversation conversation = conversationRepository
                .findBySessionTokenAndChatbotId(sessionToken, chatbotId)
                .orElseGet(() -> {
                    // First message — create a new conversation
                    String title = userMessage.length() > 80
                            ? userMessage.substring(0, 80) + "..."
                            : userMessage;
                    return conversationRepository.save(
                            Conversation.builder()
                                    .chatbotId(chatbotId)
                                    .userId(chatbot.getUserId())   // owner's userId
                                    .sessionToken(sessionToken)
                                    .title(title)
                                    .messageCount(0)
                                    .build()
                    );
                });

        // ── RAG pipeline (same as ChatService) ─────────────────────────────────
        // 1. Save user message
        Message savedUser = messageRepository.save(
                Message.builder()
                        .conversationId(conversation.getId())
                        .role(Message.Role.user)
                        .content(userMessage)
                        .build()
        );

        // 2. Embed + Qdrant search
        List<Map<String, Object>> chunks = new ArrayList<>();
        try {
            float[] embedding = embeddingService.embed(userMessage);
            if (embedding != null) {
                chunks = qdrantService.searchSimilar(embedding, chatbotId, 3);
            }
        } catch (Exception e) {
            log.warn("Widget RAG search failed: {}", e.getMessage());
        }

        // 3. Build system prompt
        String systemPrompt = buildWidgetSystemPrompt(chatbot, chunks);

        // 4. Load recent history (last 10 messages)
        List<Message> history = messageRepository.findByConversationIdOrderByCreatedAtAsc(conversation.getId());
        List<Map<String, String>> ollamaMessages = new ArrayList<>();
        ollamaMessages.add(OllamaService.buildMessage("system", systemPrompt));
        int start = Math.max(0, history.size() - 11); // exclude current
        for (int i = start; i < history.size() - 1; i++) {
            Message m = history.get(i);
            ollamaMessages.add(OllamaService.buildMessage(m.getRole().name(), m.getContent()));
        }
        ollamaMessages.add(OllamaService.buildMessage("user", userMessage));

        // 5. Call Ollama
        String aiReply = ollamaService.chat(ollamaMessages);

        // 6. Save AI reply
        Message savedAi = messageRepository.save(
                Message.builder()
                        .conversationId(conversation.getId())
                        .role(Message.Role.assistant)
                        .content(aiReply)
                        .build()
        );

        // 7. Update message count
        long total = messageRepository.countByConversationId(conversation.getId());
        conversation.setMessageCount((int) total);
        conversationRepository.save(conversation);

        Map<String, Object> result = new HashMap<>();
        result.put("conversationId", conversation.getId());
        result.put("userMessage", MessageResponse.fromMessage(savedUser));
        result.put("assistantMessage", MessageResponse.fromMessage(savedAi));

        return ResponseEntity.ok(ApiResponse.success("Message sent", result));
    }

    // ─── POST submit lead form ─────────────────────────────────────────────────

    /**
     * POST /api/widget/{chatbotId}/lead
     * Called when a visitor fills the lead form before/during chatting.
     * Saves their name + email as a Lead record for the chatbot owner.
     */
    @PostMapping("/{chatbotId}/lead")
    public ResponseEntity<ApiResponse<LeadResponse>> submitLead(
            @PathVariable Long chatbotId,
            @Valid @RequestBody LeadRequest request) {

        Chatbot chatbot = getPublishedChatbot(chatbotId);

        Lead lead = Lead.builder()
                .chatbotId(chatbotId)
                .userId(chatbot.getUserId())
                .conversationId(request.getConversationId())
                .visitorName(request.getVisitorName())
                .visitorEmail(request.getVisitorEmail())
                .visitorPhone(request.getVisitorPhone())
                .initialMessage(request.getInitialMessage())
                .source(Lead.LeadSource.WIDGET)
                .read(false)
                .build();

        Lead saved = leadRepository.save(lead);
        log.info("Lead captured via widget for chatbot {}: {} <{}>",
                chatbotId, saved.getVisitorName(), saved.getVisitorEmail());

        return ResponseEntity.ok(ApiResponse.success("Thank you! We'll be in touch.",
                LeadResponse.fromLead(saved, chatbot.getName())));
    }

    // ─── POST request human agent ─────────────────────────────────────────────

    /**
     * POST /api/widget/{chatbotId}/handoff
     * Called when a visitor clicks "Talk to a human" in the widget.
     * Creates an AgentHandoff record visible in the owner's Agent Inbox.
     * Body: { "reason": "...", "visitorName": "...", "visitorEmail": "...", "conversationId": 1 }
     */
    @PostMapping("/{chatbotId}/handoff")
    public ResponseEntity<ApiResponse<Map<String, Object>>> requestHandoff(
            @PathVariable Long chatbotId,
            @RequestBody Map<String, Object> body) {

        Chatbot chatbot = getPublishedChatbot(chatbotId);

        AgentHandoff handoff = AgentHandoff.builder()
                .chatbotId(chatbotId)
                .userId(chatbot.getUserId())
                .conversationId(body.get("conversationId") != null
                        ? Long.valueOf(body.get("conversationId").toString()) : null)
                .visitorName((String) body.get("visitorName"))
                .visitorEmail((String) body.get("visitorEmail"))
                .reason((String) body.get("reason"))
                .status(AgentHandoff.HandoffStatus.PENDING)
                .build();

        AgentHandoff saved = handoffRepository.save(handoff);
        log.info("Handoff requested for chatbot {} by visitor {}", chatbotId, saved.getVisitorEmail());

        Map<String, Object> result = new HashMap<>();
        result.put("handoffId", saved.getId());
        result.put("message", "A human agent has been notified and will join shortly.");

        return ResponseEntity.ok(ApiResponse.success("Handoff requested", result));
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private Chatbot getPublishedChatbot(Long chatbotId) {
        Chatbot chatbot = chatbotRepository.findById(chatbotId)
                .orElseThrow(() -> new ResourceNotFoundException("Chatbot not found"));
        if (!chatbot.isPublished()) {
            throw new ResourceNotFoundException("Chatbot is not available");
        }
        return chatbot;
    }

    private String buildWidgetSystemPrompt(Chatbot chatbot, List<Map<String, Object>> chunks) {
        StringBuilder sb = new StringBuilder();
        if (chatbot.getSystemPrompt() != null && !chatbot.getSystemPrompt().isBlank()) {
            sb.append(chatbot.getSystemPrompt()).append("\n\n");
        } else {
            sb.append("You are ").append(chatbot.getName()).append(", a helpful AI assistant.\n\n");
        }
        if (!chunks.isEmpty()) {
            sb.append("Relevant context:\n");
            for (int i = 0; i < chunks.size(); i++) {
                String text = (String) chunks.get(i).get("text");
                if (text != null) sb.append("[").append(i + 1).append("] ").append(text.trim()).append("\n");
            }
            sb.append("\nUse this context to answer accurately. Say so if you don't know.\n");
        }
        return sb.toString();
    }
}
