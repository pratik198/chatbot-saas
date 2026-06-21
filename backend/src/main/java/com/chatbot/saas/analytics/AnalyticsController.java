package com.chatbot.saas.analytics;

import com.chatbot.saas.chat.ConversationRepository;
import com.chatbot.saas.chat.MessageRepository;
import com.chatbot.saas.chatbot.ChatbotRepository;
import com.chatbot.saas.common.exception.ResourceNotFoundException;
import com.chatbot.saas.common.response.ApiResponse;
import com.chatbot.saas.lead.LeadRepository;
import com.chatbot.saas.user.User;
import com.chatbot.saas.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * WHY this class exists:
 *   Provides analytics data for the dashboard: conversation counts,
 *   message volumes, lead stats, and per-chatbot breakdowns.
 *
 * WHAT endpoints it provides:
 *   GET /api/analytics/overview  → total conversations, messages, leads, chatbots
 *   GET /api/analytics/chatbots  → per-chatbot stats (conversations + leads each)
 *
 * HOW it works:
 *   Uses Spring Data repository count methods and direct repository queries.
 *   No separate AnalyticsService needed — the logic is simple enough to stay here.
 */
@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final ConversationRepository conversationRepository;
    private final ChatbotRepository chatbotRepository;
    private final LeadRepository leadRepository;
    private final UserRepository userRepository;

    /**
     * GET /api/analytics/overview
     * Returns summary stats for the dashboard:
     *   totalChatbots, totalConversations, totalLeads, unreadLeads
     */
    @GetMapping("/overview")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getOverview() {
        User user = getCurrentUser();
        Long userId = user.getId();

        long totalChatbots      = chatbotRepository.countByUserId(userId);
        long totalConversations  = conversationRepository.findByUserIdOrderByUpdatedAtDesc(userId).size();
        long totalLeads          = leadRepository.findByUserIdOrderByCapturedAtDesc(userId).size();
        long unreadLeads         = leadRepository.countByUserIdAndReadFalse(userId);

        Map<String, Object> overview = new HashMap<>();
        overview.put("totalChatbots", totalChatbots);
        overview.put("totalConversations", totalConversations);
        overview.put("totalLeads", totalLeads);
        overview.put("unreadLeads", unreadLeads);

        return ResponseEntity.ok(ApiResponse.success("Overview loaded", overview));
    }

    /**
     * GET /api/analytics/chatbots
     * Returns per-chatbot stats so the owner can see which bot performs best.
     * Each item: { chatbotId, chatbotName, conversations, leads, isPublished }
     */
    @GetMapping("/chatbots")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getChatbotStats() {
        User user = getCurrentUser();

        List<Map<String, Object>> stats = new ArrayList<>();
        chatbotRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).forEach(chatbot -> {
            long conversations = conversationRepository.countByChatbotId(chatbot.getId());
            long leads = leadRepository.countByChatbotId(chatbot.getId());

            Map<String, Object> row = new HashMap<>();
            row.put("chatbotId", chatbot.getId());
            row.put("chatbotName", chatbot.getName());
            row.put("themeColor", chatbot.getThemeColor());
            row.put("isPublished", chatbot.isPublished());
            row.put("isActive", chatbot.isActive());
            row.put("conversations", conversations);
            row.put("leads", leads);
            stats.add(row);
        });

        return ResponseEntity.ok(ApiResponse.success("Stats loaded", stats));
    }

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
