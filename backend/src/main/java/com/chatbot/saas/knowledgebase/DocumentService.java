package com.chatbot.saas.knowledgebase;

import com.chatbot.saas.chatbot.ChatbotRepository;
import com.chatbot.saas.common.exception.ResourceNotFoundException;
import com.chatbot.saas.knowledgebase.dto.AddFaqRequest;
import com.chatbot.saas.knowledgebase.dto.AddTextRequest;
import com.chatbot.saas.knowledgebase.dto.DocumentResponse;
import com.chatbot.saas.knowledgebase.embedding.EmbeddingService;
import com.chatbot.saas.knowledgebase.processor.PdfProcessor;
import com.chatbot.saas.knowledgebase.processor.TextChunker;
import com.chatbot.saas.knowledgebase.qdrant.QdrantService;
import com.chatbot.saas.user.User;
import com.chatbot.saas.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * WHY this class exists:
 *   Orchestrates the entire knowledge base workflow.
 *   This is the most complex service in Phase 3 — it coordinates:
 *   file storage, PDF parsing, text chunking, embedding generation, and Qdrant storage.
 *
 * WHAT it does:
 *   - uploadPdf:   save file → extract text → chunk → embed → store in Qdrant
 *   - addFaq:      format Q&A → chunk → embed → store in Qdrant
 *   - addText:     chunk text → embed → store in Qdrant
 *   - retrain:     re-process an existing document (if embedding failed)
 *   - delete:      remove document + chunks from DB + vectors from Qdrant
 *
 * HOW async processing works:
 *   When a PDF is uploaded, we immediately save the Document with status=PROCESSING
 *   and return 202 Accepted to the frontend. The user sees "Processing..." instantly.
 *   Then @Async processDocument() runs in a background thread:
 *     extract text → chunk → embed → update status=READY
 *   The frontend polls GET /api/knowledge until status changes.
 *
 *   WHY async? PDF processing + embedding can take 10-30 seconds for large files.
 *   Blocking the HTTP request that long would cause browser timeouts.
 *
 * @Async methods run in Spring's task executor thread pool.
 * We added @EnableAsync to ChatbotSaasApplication to enable this.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final DocumentChunkRepository chunkRepository;
    private final ChatbotRepository chatbotRepository;
    private final UserRepository userRepository;
    private final PdfProcessor pdfProcessor;
    private final TextChunker textChunker;
    private final EmbeddingService embeddingService;
    private final QdrantService qdrantService;

    @Value("${file.upload.dir:./uploads}")
    private String uploadDir;

    // ─── Upload PDF ────────────────────────────────────────────────────────

    /**
     * Handles PDF file upload.
     * Immediately returns a Document with status=PROCESSING.
     * Background thread does the actual extraction + embedding.
     *
     * @param chatbotId - which chatbot's knowledge base to add to
     * @param file      - the uploaded PDF file (from multipart/form-data request)
     * @return          - DocumentResponse with status=PROCESSING
     */
    @Transactional
    public DocumentResponse uploadPdf(Long chatbotId, MultipartFile file) throws IOException {
        User currentUser = getCurrentUser();
        validateChatbotOwnership(chatbotId, currentUser.getId());

        log.info("PDF upload started: {} for chatbot {}", file.getOriginalFilename(), chatbotId);

        // Validate file type
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || !originalFilename.toLowerCase().endsWith(".pdf")) {
            throw new RuntimeException("Only PDF files are supported. File: " + originalFilename);
        }

        // Save file to disk
        String savedPath = saveFileToDisk(file, chatbotId);

        // Create Document record (status=PROCESSING)
        Document document = Document.builder()
                .chatbotId(chatbotId)
                .userId(currentUser.getId())
                .name(originalFilename)
                .sourceType(Document.SourceType.PDF)
                .status(Document.ProcessingStatus.PROCESSING)
                .filePath(savedPath)
                .fileSize(file.getSize())
                .build();

        Document saved = documentRepository.save(document);

        // Start background processing (non-blocking — returns immediately)
        processDocumentAsync(saved.getId());

        log.info("PDF saved with ID: {}, processing in background", saved.getId());
        return DocumentResponse.fromDocument(saved);
    }

    // ─── Add FAQ ───────────────────────────────────────────────────────────

    /**
     * Adds a FAQ entry to the knowledge base.
     * FAQs are smaller and faster to process, so we do it synchronously.
     */
    @Transactional
    public DocumentResponse addFaq(AddFaqRequest request) {
        User currentUser = getCurrentUser();
        validateChatbotOwnership(request.getChatbotId(), currentUser.getId());

        // Format the FAQ as a document with a clear Q: / A: structure
        String faqContent = "Q: " + request.getQuestion().trim() + "\nA: " + request.getAnswer().trim();
        String faqName = "FAQ: " + request.getQuestion().substring(0, Math.min(80, request.getQuestion().length()));

        Document document = Document.builder()
                .chatbotId(request.getChatbotId())
                .userId(currentUser.getId())
                .name(faqName)
                .sourceType(Document.SourceType.FAQ)
                .status(Document.ProcessingStatus.PROCESSING)
                .content(faqContent)
                .fileSize((long) faqContent.length())
                .build();

        Document saved = documentRepository.save(document);

        // FAQs are small — process synchronously (no async needed)
        processAndEmbedContent(saved.getId(), faqContent);

        return DocumentResponse.fromDocument(documentRepository.findById(saved.getId()).orElse(saved));
    }

    // ─── Add Text ──────────────────────────────────────────────────────────

    /**
     * Adds a plain text block to the knowledge base.
     * Text can be product descriptions, policies, FAQs in bulk, etc.
     */
    @Transactional
    public DocumentResponse addText(AddTextRequest request) {
        User currentUser = getCurrentUser();
        validateChatbotOwnership(request.getChatbotId(), currentUser.getId());

        Document document = Document.builder()
                .chatbotId(request.getChatbotId())
                .userId(currentUser.getId())
                .name(request.getTitle())
                .sourceType(Document.SourceType.TEXT)
                .status(Document.ProcessingStatus.PROCESSING)
                .content(request.getContent())
                .fileSize((long) request.getContent().length())
                .build();

        Document saved = documentRepository.save(document);

        // Start async for large texts
        processDocumentAsync(saved.getId());

        return DocumentResponse.fromDocument(saved);
    }

    // ─── Read ──────────────────────────────────────────────────────────────

    /** Get all documents for a chatbot, owned by the current user */
    public List<DocumentResponse> getDocuments(Long chatbotId) {
        User currentUser = getCurrentUser();
        return documentRepository.findByChatbotIdAndUserIdOrderByCreatedAtDesc(chatbotId, currentUser.getId())
                .stream()
                .map(DocumentResponse::fromDocument)
                .toList();
    }

    /** Get all documents across all chatbots for the current user */
    public List<DocumentResponse> getAllMyDocuments() {
        User currentUser = getCurrentUser();
        return documentRepository.findByUserIdOrderByCreatedAtDesc(currentUser.getId())
                .stream()
                .map(DocumentResponse::fromDocument)
                .toList();
    }

    // ─── Delete ────────────────────────────────────────────────────────────

    /**
     * Deletes a document and all its associated chunks and Qdrant vectors.
     */
    @Transactional
    public void deleteDocument(Long documentId) {
        User currentUser = getCurrentUser();

        Document document = documentRepository.findByIdAndUserId(documentId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Document not found: " + documentId));

        // Collect Qdrant point IDs to delete
        List<String> pointIds = chunkRepository.findByDocumentIdOrderByChunkIndex(documentId)
                .stream()
                .filter(c -> c.getQdrantPointId() != null)
                .map(DocumentChunk::getQdrantPointId)
                .toList();

        // Delete from Qdrant first (if there are embedded chunks)
        if (!pointIds.isEmpty()) {
            qdrantService.deletePoints(pointIds);
        }

        // Delete chunks from PostgreSQL
        chunkRepository.deleteByDocumentId(documentId);

        // Delete the document record
        documentRepository.delete(document);

        // Delete the physical file from disk (if it's a PDF)
        if (document.getFilePath() != null) {
            deleteFileFromDisk(document.getFilePath());
        }

        log.info("Document {} deleted (removed {} Qdrant points)", documentId, pointIds.size());
    }

    // ─── Retrain ───────────────────────────────────────────────────────────

    /**
     * Re-processes a document. Useful when:
     * - The initial processing failed
     * - You add a new embedding model and want to re-embed all documents
     */
    @Transactional
    public DocumentResponse retrainDocument(Long documentId) {
        User currentUser = getCurrentUser();

        Document document = documentRepository.findByIdAndUserId(documentId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Document not found: " + documentId));

        // Delete existing chunks
        List<String> oldPointIds = chunkRepository.findByDocumentIdOrderByChunkIndex(documentId)
                .stream()
                .filter(c -> c.getQdrantPointId() != null)
                .map(DocumentChunk::getQdrantPointId)
                .toList();

        if (!oldPointIds.isEmpty()) {
            qdrantService.deletePoints(oldPointIds);
        }

        chunkRepository.deleteByDocumentId(documentId);

        // Reset status and start re-processing
        document.setStatus(Document.ProcessingStatus.PROCESSING);
        document.setChunkCount(0);
        document.setErrorMessage(null);
        documentRepository.save(document);

        processDocumentAsync(documentId);

        return DocumentResponse.fromDocument(document);
    }

    // ─── Private: Async Processing ─────────────────────────────────────────

    /**
     * Loads the document from DB and processes it in a background thread.
     *
     * @Async: Spring runs this in a thread pool thread, not the HTTP request thread.
     * This method returns immediately — the caller doesn't wait for it.
     * The document status is updated in the DB when processing finishes.
     */
    @Async
    public void processDocumentAsync(Long documentId) {
        // Note: can't use @Transactional with @Async in the same bean in Spring.
        // So we load the document fresh in this thread.
        Document document = documentRepository.findById(documentId).orElse(null);
        if (document == null) return;

        String content = document.getContent();

        // If no content yet (PDF), extract it from the file
        if ((content == null || content.isBlank()) && document.getFilePath() != null) {
            try {
                content = pdfProcessor.extractText(document.getFilePath());
                // Save the extracted content to the document
                document.setContent(content);
                documentRepository.save(document);
            } catch (IOException e) {
                log.error("PDF text extraction failed for document {}: {}", documentId, e.getMessage());
                markAsFailed(document, "Failed to extract text from PDF: " + e.getMessage());
                return;
            }
        }

        if (content == null || content.isBlank()) {
            markAsFailed(document, "No text content could be extracted from this document.");
            return;
        }

        processAndEmbedContent(documentId, content);
    }

    /**
     * Core processing pipeline:
     * 1. Chunk the text
     * 2. Ensure Qdrant collection exists
     * 3. For each chunk: generate embedding → store in Qdrant → save chunk to DB
     * 4. Update document status to READY
     */
    private void processAndEmbedContent(Long documentId, String content) {
        Document document = documentRepository.findById(documentId).orElse(null);
        if (document == null) return;

        try {
            // Step 1: Split text into chunks
            List<String> chunks = textChunker.chunk(content);
            log.info("Document {} split into {} chunks", documentId, chunks.size());

            if (chunks.isEmpty()) {
                markAsFailed(document, "Document is empty or contains no extractable text.");
                return;
            }

            // Step 2: Ensure Qdrant collection exists (create if first time)
            boolean qdrantAvailable = true;
            try {
                qdrantService.ensureCollectionExists();
            } catch (Exception e) {
                log.warn("Qdrant not available: {}. Chunks saved to PostgreSQL only.", e.getMessage());
                qdrantAvailable = false;
            }

            // Step 3: Process each chunk
            int embeddedCount = 0;
            for (int i = 0; i < chunks.size(); i++) {
                String chunkText = chunks.get(i);
                String pointId = UUID.randomUUID().toString();

                // Generate embedding (calls OpenAI API)
                float[] embedding = null;
                if (qdrantAvailable) {
                    embedding = embeddingService.embed(chunkText);
                }

                // Store in Qdrant if we have an embedding
                boolean embedded = false;
                if (embedding != null) {
                    Map<String, Object> payload = new HashMap<>();
                    payload.put("text", chunkText);
                    payload.put("chatbotId", document.getChatbotId());
                    payload.put("documentId", documentId);
                    payload.put("chunkIndex", i);
                    payload.put("documentName", document.getName());

                    embedded = qdrantService.upsertPoint(pointId, embedding, payload);
                    if (embedded) embeddedCount++;
                }

                // Save chunk to PostgreSQL (always — even if Qdrant fails)
                DocumentChunk chunk = DocumentChunk.builder()
                        .documentId(documentId)
                        .chatbotId(document.getChatbotId())
                        .content(chunkText)
                        .chunkIndex(i)
                        .qdrantPointId(embedded ? pointId : null)
                        .isEmbedded(embedded)
                        .build();

                chunkRepository.save(chunk);
            }

            // Step 4: Mark document as READY
            document.setStatus(Document.ProcessingStatus.READY);
            document.setChunkCount(chunks.size());
            documentRepository.save(document);

            log.info("Document {} processed: {} chunks, {} embedded in Qdrant",
                    documentId, chunks.size(), embeddedCount);

        } catch (Exception e) {
            log.error("Document processing failed for {}: {}", documentId, e.getMessage(), e);
            document = documentRepository.findById(documentId).orElse(document);
            markAsFailed(document, "Processing failed: " + e.getMessage());
        }
    }

    // ─── Private helpers ───────────────────────────────────────────────────

    /**
     * Saves an uploaded file to the local filesystem.
     * Path: {uploadDir}/chatbot-{chatbotId}/{uuid}-{originalFilename}
     * UUID prefix prevents filename collisions.
     */
    private String saveFileToDisk(MultipartFile file, Long chatbotId) throws IOException {
        // Create directory for this chatbot's files if it doesn't exist
        Path chatbotDir = Paths.get(uploadDir, "chatbot-" + chatbotId);
        Files.createDirectories(chatbotDir);

        // Generate unique filename: uuid + original name
        String uniqueFilename = UUID.randomUUID() + "-" + file.getOriginalFilename();
        Path targetPath = chatbotDir.resolve(uniqueFilename);

        // Copy the uploaded file content to disk
        Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

        log.debug("File saved to: {}", targetPath);
        return targetPath.toString();
    }

    private void deleteFileFromDisk(String filePath) {
        try {
            Files.deleteIfExists(Paths.get(filePath));
            log.debug("Deleted file: {}", filePath);
        } catch (IOException e) {
            log.warn("Could not delete file {}: {}", filePath, e.getMessage());
        }
    }

    private void markAsFailed(Document document, String errorMessage) {
        document.setStatus(Document.ProcessingStatus.FAILED);
        document.setErrorMessage(errorMessage);
        documentRepository.save(document);
        log.error("Document {} marked as FAILED: {}", document.getId(), errorMessage);
    }

    private void validateChatbotOwnership(Long chatbotId, Long userId) {
        if (!chatbotRepository.findByIdAndUserId(chatbotId, userId).isPresent()) {
            throw new ResourceNotFoundException("Chatbot not found: " + chatbotId);
        }
    }

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found"));
    }
}
