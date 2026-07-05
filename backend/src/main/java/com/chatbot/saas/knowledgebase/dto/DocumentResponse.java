package com.chatbot.saas.knowledgebase.dto;

import com.chatbot.saas.knowledgebase.Document;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * WHY this class exists:
 *   Safe public view of a Document entity for API responses.
 *   Excludes the raw content field (can be very large — up to entire PDF text).
 *   The frontend only needs metadata, not the full extracted text.
 *
 * WHAT it does:
 *   Carries document metadata: name, source type, status, chunk count, dates.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentResponse {

    private Long id;
    private Long chatbotId;
    private String name;
    private String sourceType;
    private String status;
    private int chunkCount;
    private Long fileSize;
    private String errorMessage;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Only set for bulk FAQ imports — null for PDFs, single FAQs, and pasted text.
    private Integer totalPairs;
    private Integer processedPairs;
    private Integer skippedPairs;

    public static DocumentResponse fromDocument(Document doc) {
        return DocumentResponse.builder()
                .id(doc.getId())
                .chatbotId(doc.getChatbotId())
                .name(doc.getName())
                .sourceType(doc.getSourceType().name())
                .status(doc.getStatus().name())
                .chunkCount(doc.getChunkCount())
                .fileSize(doc.getFileSize())
                .errorMessage(doc.getStatus() == Document.ProcessingStatus.FAILED ? doc.getErrorMessage() : null)
                .createdAt(doc.getCreatedAt())
                .updatedAt(doc.getUpdatedAt())
                .totalPairs(doc.getTotalPairs())
                .processedPairs(doc.getProcessedPairs())
                .skippedPairs(doc.getSkippedPairs())
                .build();
    }
}
