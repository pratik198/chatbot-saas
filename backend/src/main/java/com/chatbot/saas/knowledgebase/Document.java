package com.chatbot.saas.knowledgebase;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * WHY this class exists:
 *   Represents one piece of knowledge added to a chatbot's knowledge base.
 *   A document can be a PDF, a FAQ entry, or pasted text content.
 *   The chatbot uses these documents to answer user questions in Phase 4.
 *
 * WHAT it does:
 *   Stores metadata about an uploaded document and its extracted text content.
 *   The actual text chunks are stored in the DocumentChunk table.
 *   The vector embeddings are stored in Qdrant (vector database).
 *
 * HOW the processing flow works:
 *   1. User uploads file → Document saved with status=PROCESSING
 *   2. Background thread extracts text (from PDF) or uses raw text (FAQ/TEXT)
 *   3. Text split into chunks → saved to document_chunks table
 *   4. Each chunk sent to OpenAI API → gets back a float array (embedding)
 *   5. Embeddings stored in Qdrant with reference back to chunk
 *   6. Document status updated to READY
 *
 *   If any step fails → status=FAILED + error_message is set
 *
 * Relationship:
 *   One Chatbot → Many Documents (chatbot_id foreign key)
 *   One Document → Many DocumentChunks (document_id foreign key)
 */
@Entity
@Table(name = "documents")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class Document {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Which chatbot's knowledge base this document belongs to */
    @Column(name = "chatbot_id", nullable = false)
    private Long chatbotId;

    /** Owner of this document (same as chatbot owner — for security queries) */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** Human-readable name: PDF file name, FAQ title, or custom name */
    @Column(nullable = false, length = 255)
    private String name;

    /**
     * Where this knowledge came from.
     * PDF     → uploaded PDF file
     * FAQ     → question-answer pair entered manually
     * TEXT    → plain text pasted directly
     * WEBSITE → scraped from a URL (Phase 4+)
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false, length = 50)
    private SourceType sourceType;

    /**
     * Processing status:
     * PROCESSING → file received, background processing in progress
     * READY      → text extracted, chunks created, embeddings stored in Qdrant
     * FAILED     → something went wrong (see errorMessage)
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    @Builder.Default
    private ProcessingStatus status = ProcessingStatus.PROCESSING;

    /**
     * Path to the file on disk (only for PDF source type).
     * Example: "./uploads/chatbot-1/2024-01-15-report.pdf"
     * null for FAQ and TEXT documents (no file to store).
     */
    @Column(name = "file_path", length = 500)
    private String filePath;

    /**
     * The full extracted text content of the document.
     * For PDFs: output of PDFBox text extraction.
     * For FAQs: "Q: ... A: ..." formatted string.
     * For TEXT: the pasted content directly.
     * columnDefinition = "TEXT" uses PostgreSQL's unlimited text type.
     */
    @Column(columnDefinition = "TEXT")
    private String content;

    /** How many text chunks were created from this document */
    @Column(name = "chunk_count")
    @Builder.Default
    private int chunkCount = 0;

    /** File size in bytes (useful for displaying in the UI) */
    @Column(name = "file_size")
    private Long fileSize;

    /** If status=FAILED, stores the error message for debugging */
    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    // ─── Enums ─────────────────────────────────────────────────────────────

    public enum SourceType {
        PDF,     // Uploaded PDF file
        FAQ,     // Manually entered question-answer pairs
        TEXT,    // Pasted plain text
        WEBSITE  // Scraped URL (Phase 4+)
    }

    public enum ProcessingStatus {
        PROCESSING,  // Being processed in background
        READY,       // Ready to be used by the AI
        FAILED       // Processing failed — see errorMessage
    }
}
