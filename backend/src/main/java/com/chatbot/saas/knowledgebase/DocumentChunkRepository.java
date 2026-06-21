package com.chatbot.saas.knowledgebase;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * WHY this interface exists:
 *   Data Access Layer for DocumentChunk entities.
 *   Chunks are the actual searchable units of the knowledge base.
 *
 * WHAT it does:
 *   Provides queries to find and delete chunks by document or chatbot.
 *
 * HOW it's used:
 *   - After processing: save all chunks for a document
 *   - On deletion: remove all chunks for a document
 *   - For Phase 4 search fallback: find chunks by chatbot if Qdrant is unavailable
 */
@Repository
public interface DocumentChunkRepository extends JpaRepository<DocumentChunk, Long> {

    /**
     * Find all chunks for a document, ordered by their position.
     * Used when re-embedding after an update.
     */
    List<DocumentChunk> findByDocumentIdOrderByChunkIndex(Long documentId);

    /**
     * Find all chunks for a chatbot.
     * Used in Phase 4 as a fallback search if Qdrant is unavailable.
     */
    List<DocumentChunk> findByChatbotId(Long chatbotId);

    /** Delete all chunks for a document (called when document is deleted) */
    void deleteByDocumentId(Long documentId);

    /** Count total chunks for a document */
    int countByDocumentId(Long documentId);
}
