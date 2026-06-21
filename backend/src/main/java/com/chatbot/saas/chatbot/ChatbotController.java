package com.chatbot.saas.chatbot;

import com.chatbot.saas.chatbot.dto.ChatbotResponse;
import com.chatbot.saas.chatbot.dto.CreateChatbotRequest;
import com.chatbot.saas.chatbot.dto.UpdateChatbotRequest;
import com.chatbot.saas.common.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * WHY this class exists:
 *   REST Controller for all chatbot endpoints.
 *   Thin layer: receives HTTP requests, calls ChatbotService, returns responses.
 *   No business logic here — that all lives in ChatbotService.
 *
 * WHAT it does:
 *   GET    /api/chatbots          → list all chatbots for current user
 *   POST   /api/chatbots          → create a new chatbot
 *   GET    /api/chatbots/{id}     → get a single chatbot
 *   PUT    /api/chatbots/{id}     → update a chatbot
 *   DELETE /api/chatbots/{id}     → delete a chatbot
 *   PATCH  /api/chatbots/{id}/publish → toggle published status
 *   GET    /api/chatbots/count    → get count for dashboard stats
 *
 * HOW authorization works:
 *   All endpoints require a valid JWT (configured in SecurityConfig).
 *   The service layer checks that the chatbot belongs to the current user.
 *   No @PreAuthorize needed here — ownership check is in ChatbotService.
 */
@RestController
@RequestMapping("/api/chatbots")
@RequiredArgsConstructor
public class ChatbotController {

    private final ChatbotService chatbotService;

    /**
     * GET /api/chatbots
     * Returns all chatbots owned by the current user.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<ChatbotResponse>>> getMyChatbots() {
        List<ChatbotResponse> chatbots = chatbotService.getMyChatbots();
        return ResponseEntity.ok(ApiResponse.success("Chatbots fetched successfully", chatbots));
    }

    /**
     * GET /api/chatbots/count
     * Returns total chatbot count for the dashboard stats card.
     * IMPORTANT: This mapping must be declared BEFORE /{id} or Spring will
     * try to parse "count" as an ID number.
     */
    @GetMapping("/count")
    public ResponseEntity<ApiResponse<Long>> getChatbotCount() {
        long count = chatbotService.getChatbotCount();
        return ResponseEntity.ok(ApiResponse.success("Count fetched", count));
    }

    /**
     * GET /api/chatbots/{id}
     * Returns a single chatbot.
     * @PathVariable Long id: Spring extracts the {id} from the URL automatically.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ChatbotResponse>> getChatbot(@PathVariable Long id) {
        ChatbotResponse chatbot = chatbotService.getChatbotById(id);
        return ResponseEntity.ok(ApiResponse.success("Chatbot fetched successfully", chatbot));
    }

    /**
     * POST /api/chatbots
     * Creates a new chatbot. Returns 201 Created.
     */
    @PostMapping
    public ResponseEntity<ApiResponse<ChatbotResponse>> createChatbot(
            @Valid @RequestBody CreateChatbotRequest request) {
        ChatbotResponse chatbot = chatbotService.createChatbot(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Chatbot created successfully", chatbot));
    }

    /**
     * PUT /api/chatbots/{id}
     * Updates an existing chatbot. Returns the updated chatbot.
     */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ChatbotResponse>> updateChatbot(
            @PathVariable Long id,
            @Valid @RequestBody UpdateChatbotRequest request) {
        ChatbotResponse chatbot = chatbotService.updateChatbot(id, request);
        return ResponseEntity.ok(ApiResponse.success("Chatbot updated successfully", chatbot));
    }

    /**
     * PATCH /api/chatbots/{id}/publish
     * Toggles the published state: draft ↔ published.
     * PATCH is used (not PUT) because we're updating only ONE field.
     * REST convention: PUT = full replace, PATCH = partial update.
     */
    @PatchMapping("/{id}/publish")
    public ResponseEntity<ApiResponse<ChatbotResponse>> togglePublish(@PathVariable Long id) {
        ChatbotResponse chatbot = chatbotService.togglePublish(id);
        String message = chatbot.isPublished() ? "Chatbot published" : "Chatbot set to draft";
        return ResponseEntity.ok(ApiResponse.success(message, chatbot));
    }

    /**
     * DELETE /api/chatbots/{id}
     * Permanently deletes a chatbot.
     * Returns 204 No Content (standard for successful deletes — no body needed).
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteChatbot(@PathVariable Long id) {
        chatbotService.deleteChatbot(id);
        return ResponseEntity.noContent().build();
    }
}
