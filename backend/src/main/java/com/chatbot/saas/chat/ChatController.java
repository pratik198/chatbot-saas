package com.chatbot.saas.chat;

import com.chatbot.saas.chat.dto.*;
import com.chatbot.saas.common.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * WHY this class exists:
 *   Exposes REST endpoints for the AI chat feature.
 *   The frontend calls these endpoints to start conversations and send messages.
 *
 * WHAT endpoints it provides:
 *
 *   POST   /api/chat/{chatbotId}/conversations
 *     → Start a new conversation with a chatbot (sends first message)
 *     → Returns user msg + AI reply + conversationId
 *
 *   GET    /api/chat/{chatbotId}/conversations
 *     → List all conversations for a chatbot (for the sidebar)
 *
 *   GET    /api/chat/conversations/{id}
 *     → Get a conversation with its full message history
 *
 *   POST   /api/chat/conversations/{id}/messages
 *     → Send a new message in an existing conversation
 *     → Returns user msg + AI reply
 *
 *   DELETE /api/chat/conversations/{id}
 *     → Delete a conversation (removes all messages too)
 *
 * HOW authentication works:
 *   All endpoints require a valid JWT token (enforced by SecurityConfig).
 *   ChatService.getCurrentUser() reads the email from the JWT token.
 *   Ownership is verified in ChatService before any database operation.
 */
@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
@Slf4j
public class ChatController {

    private final ChatService chatService;

    // ─── Start a new conversation ─────────────────────────────────────────────

    /**
     * POST /api/chat/{chatbotId}/conversations
     *
     * Creates a new conversation and processes the first message.
     * The frontend calls this when the user types their first message.
     *
     * Request body: { "message": "Hello, what are your hours?" }
     * Response: { conversationId, userMessage, assistantMessage, conversationTitle }
     */
    @PostMapping("/{chatbotId}/conversations")
    public ResponseEntity<ApiResponse<SendMessageResponse>> startConversation(
            @PathVariable Long chatbotId,
            @Valid @RequestBody ChatRequest request) {

        log.info("Starting new conversation for chatbot {}", chatbotId);
        SendMessageResponse response = chatService.startConversation(chatbotId, request.getMessage());
        return ResponseEntity.ok(ApiResponse.success("Conversation started", response));
    }

    // ─── List conversations ───────────────────────────────────────────────────

    /**
     * GET /api/chat/{chatbotId}/conversations
     *
     * Returns all conversations for a chatbot, newest first.
     * Used to populate the conversation sidebar list in the UI.
     * Messages are NOT included — use GET /conversations/{id} for that.
     */
    @GetMapping("/{chatbotId}/conversations")
    public ResponseEntity<ApiResponse<List<ConversationResponse>>> listConversations(
            @PathVariable Long chatbotId) {

        List<ConversationResponse> conversations = chatService.listConversations(chatbotId);
        return ResponseEntity.ok(ApiResponse.success("Conversations loaded", conversations));
    }

    // ─── Get one conversation (with messages) ────────────────────────────────

    /**
     * GET /api/chat/conversations/{id}
     *
     * Returns a single conversation with its complete message history.
     * Called when the user clicks on a conversation in the sidebar.
     */
    @GetMapping("/conversations/{id}")
    public ResponseEntity<ApiResponse<ConversationResponse>> getConversation(
            @PathVariable Long id) {

        ConversationResponse conversation = chatService.getConversation(id);
        return ResponseEntity.ok(ApiResponse.success("Conversation loaded", conversation));
    }

    // ─── Send a message ───────────────────────────────────────────────────────

    /**
     * POST /api/chat/conversations/{id}/messages
     *
     * Sends a new message in an existing conversation.
     * This triggers the full RAG pipeline:
     *   embed → search Qdrant → build prompt → Ollama → save → return
     *
     * Request body: { "message": "Do I need a receipt for a return?" }
     * Response: { conversationId, userMessage, assistantMessage, conversationTitle }
     */
    @PostMapping("/conversations/{id}/messages")
    public ResponseEntity<ApiResponse<SendMessageResponse>> sendMessage(
            @PathVariable Long id,
            @Valid @RequestBody ChatRequest request) {

        log.info("Sending message to conversation {}", id);
        SendMessageResponse response = chatService.sendMessage(id, request.getMessage());
        return ResponseEntity.ok(ApiResponse.success("Message sent", response));
    }

    // ─── Delete conversation ──────────────────────────────────────────────────

    /**
     * DELETE /api/chat/conversations/{id}
     *
     * Permanently deletes a conversation and all its messages.
     * Called when the user clicks the delete button on a conversation.
     */
    @DeleteMapping("/conversations/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteConversation(@PathVariable Long id) {
        chatService.deleteConversation(id);
        return ResponseEntity.ok(ApiResponse.success("Conversation deleted", null));
    }
}
