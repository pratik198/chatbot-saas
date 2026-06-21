package com.chatbot.saas.lead;

import com.chatbot.saas.common.response.ApiResponse;
import com.chatbot.saas.lead.dto.LeadRequest;
import com.chatbot.saas.lead.dto.LeadResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * WHY this class exists:
 *   REST endpoints for the lead capture feature.
 *   All endpoints here require authentication (dashboard owner only).
 *   Public widget lead capture is handled by WidgetController.
 *
 * ENDPOINTS:
 *   GET  /api/leads              → list all leads (newest first)
 *   GET  /api/leads/unread-count → count unread leads (for sidebar badge)
 *   POST /api/leads/{chatbotId}  → save a lead from dashboard testing
 *   PUT  /api/leads/{id}/read    → mark one lead as read
 *   PUT  /api/leads/read-all     → mark all leads as read
 */
@RestController
@RequestMapping("/api/leads")
@RequiredArgsConstructor
public class LeadController {

    private final LeadService leadService;

    /** GET /api/leads — all leads for the current user */
    @GetMapping
    public ResponseEntity<ApiResponse<List<LeadResponse>>> getAllLeads() {
        return ResponseEntity.ok(ApiResponse.success("Leads loaded", leadService.getAllLeads()));
    }

    /** GET /api/leads/unread-count — returns { count: N } for the badge */
    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getUnreadCount() {
        long count = leadService.getUnreadCount();
        return ResponseEntity.ok(ApiResponse.success("OK", Map.of("count", count)));
    }

    /** POST /api/leads/{chatbotId} — save a lead from dashboard test */
    @PostMapping("/{chatbotId}")
    public ResponseEntity<ApiResponse<LeadResponse>> saveLead(
            @PathVariable Long chatbotId,
            @Valid @RequestBody LeadRequest request) {
        LeadResponse saved = leadService.saveDashboardLead(chatbotId, request);
        return ResponseEntity.ok(ApiResponse.success("Lead saved", saved));
    }

    /** PUT /api/leads/{id}/read — mark one lead as read */
    @PutMapping("/{id}/read")
    public ResponseEntity<ApiResponse<Void>> markAsRead(@PathVariable Long id) {
        leadService.markAsRead(id);
        return ResponseEntity.ok(ApiResponse.success("Marked as read", null));
    }

    /** PUT /api/leads/read-all — mark all leads as read */
    @PutMapping("/read-all")
    public ResponseEntity<ApiResponse<Void>> markAllAsRead() {
        leadService.markAllAsRead();
        return ResponseEntity.ok(ApiResponse.success("All leads marked as read", null));
    }
}
