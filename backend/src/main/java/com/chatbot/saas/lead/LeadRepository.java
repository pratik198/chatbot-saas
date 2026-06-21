package com.chatbot.saas.lead;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * WHY this interface exists:
 *   Spring Data JPA generates all SQL automatically from method names.
 *   Provides all database operations for Lead records.
 *
 * WHAT it does:
 *   - List leads for a chatbot or across all chatbots
 *   - Count unread leads (for the badge in the sidebar)
 *   - Mark leads as read
 *   - Enforce ownership (userId) on all queries
 */
@Repository
public interface LeadRepository extends JpaRepository<Lead, Long> {

    // All leads for one chatbot, newest first
    List<Lead> findByChatbotIdAndUserIdOrderByCapturedAtDesc(Long chatbotId, Long userId);

    // All leads across all chatbots for this user
    List<Lead> findByUserIdOrderByCapturedAtDesc(Long userId);

    // Find one lead owned by user (for mark-as-read or view)
    Optional<Lead> findByIdAndUserId(Long id, Long userId);

    // Count unread leads for a user (shows badge count in sidebar)
    long countByUserIdAndReadFalse(Long userId);

    // Stats: total leads per chatbot
    long countByChatbotId(Long chatbotId);

    // Mark all leads for a chatbot as read
    @Modifying
    @Query("UPDATE Lead l SET l.read = true WHERE l.userId = :userId AND l.read = false")
    int markAllAsRead(Long userId);
}
