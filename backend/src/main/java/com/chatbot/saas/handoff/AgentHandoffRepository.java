package com.chatbot.saas.handoff;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AgentHandoffRepository extends JpaRepository<AgentHandoff, Long> {

    // All handoffs for this agent, newest first
    List<AgentHandoff> findByUserIdOrderByRequestedAtDesc(Long userId);

    // Only PENDING handoffs — for the badge count and inbox list
    List<AgentHandoff> findByUserIdAndStatusOrderByRequestedAtDesc(
            Long userId, AgentHandoff.HandoffStatus status);

    // Count pending handoffs (for sidebar badge)
    long countByUserIdAndStatus(Long userId, AgentHandoff.HandoffStatus status);

    // Find one owned by user (before accepting/closing)
    Optional<AgentHandoff> findByIdAndUserId(Long id, Long userId);
}
