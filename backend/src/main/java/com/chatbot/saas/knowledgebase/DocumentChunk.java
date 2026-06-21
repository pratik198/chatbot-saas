package com.chatbot.saas.knowledgebase;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * WHY this class exists:
 *   A 10-page PDF cannot be sent to the AI all at once — too large.
 *   We split documents into small overlapping "chunks" of ~500 words each.
 *   Each chunk gets its own embedding vector stored in Qdrant.
 *   When a user asks a question, we find the most relevant chunks and
 *   send ONLY those to the AI (efficient and focused context).
 *
 * WHAT it does:
 *   Stores one piece (chunk) of a document's text content.
 *   Also stores the Qdrant point ID so we can link chunks to vectors.
 *
 * HOW chunking works (why we need overlap):
 *   Document: "The sky is blue. Clouds form when..." (very long text)
 *
 *   Chunk 1 (chars 0-500):   "The sky is blue. Clouds form..."
 *   Chunk 2 (chars 400-900): "Clouds form when water vapor..."   ← overlaps
 *   Chunk 3 (chars 800-1300): "water vapor cools and condenses..."
 *
 *   Overlap prevents a key sentence from being split across chunk boundaries.
 *   Without overlap: a sentence split in half becomes meaningless in both chunks.
 *
 * Relationship:
 *   One Document → Many DocumentChunks
 */
@Entity
@Table(name = "document_chunks")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class DocumentChunk {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Which document this chunk belongs to */
    @Column(name = "document_id", nullable = false)
    private Long documentId;

    /** The chatbot this chunk is for (denormalized for faster vector search lookups) */
    @Column(name = "chatbot_id", nullable = false)
    private Long chatbotId;

    /** The actual text content of this chunk */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    /**
     * Position of this chunk in the original document.
     * Chunk 0 = first section, Chunk 1 = second section, etc.
     * Used for ordering when reassembling context.
     */
    @Column(name = "chunk_index", nullable = false)
    private int chunkIndex;

    /**
     * The UUID assigned to this chunk's vector point in Qdrant.
     * Format: "550e8400-e29b-41d4-a716-446655440000"
     *
     * WHY store this?
     * When we delete a document, we need to also delete its vectors from Qdrant.
     * This ID lets us find and delete the right Qdrant point.
     */
    @Column(name = "qdrant_point_id", length = 100)
    private String qdrantPointId;

    /** Whether the embedding for this chunk was successfully stored in Qdrant */
    @Column(name = "is_embedded")
    @Builder.Default
    private boolean isEmbedded = false;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
