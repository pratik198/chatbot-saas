package com.chatbot.saas.lead;

import com.chatbot.saas.chatbot.Chatbot;
import com.chatbot.saas.chatbot.ChatbotRepository;
import com.chatbot.saas.common.exception.ResourceNotFoundException;
import com.chatbot.saas.lead.dto.LeadRequest;
import com.chatbot.saas.lead.dto.LeadResponse;
import com.chatbot.saas.user.User;
import com.chatbot.saas.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * WHY this class exists:
 *   Handles all lead capture business logic.
 *   Leads can be saved from two places:
 *   1. The public embed widget (anonymous visitor fills the lead form)
 *   2. The dashboard (owner tests their own bot with their info)
 *
 * WHAT it does:
 *   - captureLead:      save a lead from the embed widget (no auth — uses chatbotId)
 *   - saveDashboardLead: save a lead from dashboard testing (auth required)
 *   - listLeads:        get all leads for the current user
 *   - markAsRead:       mark a lead as read (for the unread badge)
 *   - countUnread:      count unread leads (for sidebar badge)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LeadService {

    private final LeadRepository leadRepository;
    private final ChatbotRepository chatbotRepository;
    private final UserRepository userRepository;

    // ─── Save lead from public embed widget (no auth) ─────────────────────────

    /**
     * Called by the public widget API when a visitor fills the lead form.
     * No authentication — visitors don't have accounts.
     * We validate that the chatbot exists and is published before saving.
     *
     * @param chatbotId - the chatbot's ID (from the embed script URL)
     * @param request   - visitor's name, email, phone, initial message
     * @return the saved lead
     */
    @Transactional
    public LeadResponse captureLead(Long chatbotId, LeadRequest request) {
        // Verify chatbot exists and is published (don't accept leads for draft bots)
        Chatbot chatbot = chatbotRepository.findById(chatbotId)
                .orElseThrow(() -> new ResourceNotFoundException("Chatbot not found"));

        if (!chatbot.isPublished()) {
            throw new RuntimeException("Chatbot is not published and cannot accept leads");
        }

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
        log.info("New lead captured for chatbot {}: {} ({})", chatbotId, saved.getVisitorName(), saved.getVisitorEmail());
        return LeadResponse.fromLead(saved, chatbot.getName());
    }

    // ─── Save lead from dashboard (authenticated) ─────────────────────────────

    /**
     * Called when the dashboard owner tests their own chatbot with a lead form.
     * Requires authentication — we use the logged-in user's chatbot.
     */
    @Transactional
    public LeadResponse saveDashboardLead(Long chatbotId, LeadRequest request) {
        User user = getCurrentUser();
        Chatbot chatbot = chatbotRepository.findByIdAndUserId(chatbotId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Chatbot not found"));

        Lead lead = Lead.builder()
                .chatbotId(chatbotId)
                .userId(user.getId())
                .conversationId(request.getConversationId())
                .visitorName(request.getVisitorName())
                .visitorEmail(request.getVisitorEmail())
                .visitorPhone(request.getVisitorPhone())
                .initialMessage(request.getInitialMessage())
                .source(Lead.LeadSource.DASHBOARD_TEST)
                .read(false)
                .build();

        Lead saved = leadRepository.save(lead);
        return LeadResponse.fromLead(saved, chatbot.getName());
    }

    // ─── List leads ───────────────────────────────────────────────────────────

    /** Get all leads for the current user (across all chatbots), newest first */
    public List<LeadResponse> getAllLeads() {
        User user = getCurrentUser();
        return leadRepository.findByUserIdOrderByCapturedAtDesc(user.getId())
                .stream()
                .map(lead -> {
                    String botName = chatbotRepository.findById(lead.getChatbotId())
                            .map(Chatbot::getName).orElse("Unknown Bot");
                    return LeadResponse.fromLead(lead, botName);
                })
                .collect(Collectors.toList());
    }

    /** Get leads for a specific chatbot */
    public List<LeadResponse> getLeadsForChatbot(Long chatbotId) {
        User user = getCurrentUser();
        Chatbot chatbot = chatbotRepository.findByIdAndUserId(chatbotId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Chatbot not found"));

        return leadRepository.findByChatbotIdAndUserIdOrderByCapturedAtDesc(chatbotId, user.getId())
                .stream()
                .map(lead -> LeadResponse.fromLead(lead, chatbot.getName()))
                .collect(Collectors.toList());
    }

    // ─── Read / Unread ────────────────────────────────────────────────────────

    /** Mark a single lead as read */
    @Transactional
    public void markAsRead(Long leadId) {
        User user = getCurrentUser();
        Lead lead = leadRepository.findByIdAndUserId(leadId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Lead not found"));
        lead.setRead(true);
        leadRepository.save(lead);
    }

    /** Mark ALL unread leads as read */
    @Transactional
    public void markAllAsRead() {
        User user = getCurrentUser();
        leadRepository.markAllAsRead(user.getId());
    }

    /** Returns count of unread leads for the badge in the sidebar */
    public long getUnreadCount() {
        User user = getCurrentUser();
        return leadRepository.countByUserIdAndReadFalse(user.getId());
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found"));
    }
}
