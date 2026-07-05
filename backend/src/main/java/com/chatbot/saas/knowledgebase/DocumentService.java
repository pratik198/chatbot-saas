package com.chatbot.saas.knowledgebase;

import com.chatbot.saas.chatbot.ChatbotRepository;
import com.chatbot.saas.common.exception.ResourceNotFoundException;
import com.chatbot.saas.knowledgebase.dto.AddFaqRequest;
import com.chatbot.saas.knowledgebase.dto.AddTextRequest;
import com.chatbot.saas.knowledgebase.dto.BulkFaqRequest;
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
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

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

    /**
     * Self-injection, needed for @Async to actually work.
     *
     * Spring's @Async is implemented via a dynamic proxy wrapping this bean.
     * Calling an @Async method as `this.method(...)` from inside the same
     * class bypasses that proxy entirely — the call goes straight to the real
     * object, so it just runs synchronously on the caller's thread instead of
     * being handed off to the async executor. (This silently broke bulk FAQ
     * imports: a 2,000+ pair import ran inline on the HTTP request thread and
     * blew past the frontend's timeout instead of finishing in the background.)
     * Routing the call through `self` (a lazily-injected proxy reference to
     * this same bean) goes through Spring's proxy and makes @Async take effect.
     */
    @org.springframework.context.annotation.Lazy
    @org.springframework.beans.factory.annotation.Autowired
    private DocumentService self;

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
     *
     * NOTE: intentionally NOT @Transactional. This method saves the Document
     * then immediately hands off to self.processDocumentAsync() on a
     * background thread. If this method were transactional, the save
     * wouldn't actually commit until the method returns — but the async
     * thread can start querying for that row before then, see nothing
     * (READ_COMMITTED visibility), and silently no-op. Letting the save
     * commit on its own (Spring Data JPA gives every repository call its
     * own transaction when none is active) before dispatching guarantees
     * the async thread will always find the row.
     */
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
        self.processDocumentAsync(saved.getId());

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

    // ─── Add Bulk FAQs ─────────────────────────────────────────────────────

    /**
     * Safety cap on one bulk import. 50,000 short embeddings sequentially on
     * modest CPU-only hardware is already a multi-hour background job — this
     * just stops a mistaken paste/file from queuing an unbounded amount of work.
     */
    private static final int MAX_BULK_FAQ_PAIRS = 50_000;

    /** Max bulk FAQ file size — generous for 50k short "question | answer" lines. */
    private static final long MAX_BULK_FAQ_FILE_SIZE = 25L * 1024 * 1024; // 25MB

    /**
     * Adds many FAQ entries at once from pasted text — one "question | answer"
     * pair per line. Delegates to {@link #createBulkFaqDocument} — see there
     * for how this is stored and processed.
     *
     * NOTE: intentionally NOT @Transactional — see uploadPdf's note on why
     * wrapping a save-then-dispatch-async flow in a transaction causes the
     * async thread to race the commit and can silently find nothing.
     */
    public DocumentResponse addBulkFaqs(BulkFaqRequest request) {
        User currentUser = getCurrentUser();
        validateChatbotOwnership(request.getChatbotId(), currentUser.getId());

        String name = "Bulk FAQ (pasted text)";
        return createBulkFaqDocument(request.getChatbotId(), currentUser.getId(), request.getFaqText(), name);
    }

    /** Max number of files accepted by one multi-file bulk import request. */
    private static final int MAX_BULK_FAQ_FILES = 10;

    /**
     * Adds many FAQ entries at once from a single uploaded .txt or .pdf file —
     * same "question | answer" per line format. Supports up to 50,000 pairs.
     *
     * NOTE: intentionally NOT @Transactional — see uploadPdf's note.
     */
    public DocumentResponse addBulkFaqsFromFile(Long chatbotId, MultipartFile file) throws IOException {
        User currentUser = getCurrentUser();
        validateChatbotOwnership(chatbotId, currentUser.getId());
        return processSingleBulkFaqFile(chatbotId, currentUser.getId(), file);
    }

    /**
     * Adds many FAQ entries at once from up to 10 uploaded .txt/.pdf files in
     * one request — each file becomes its own bulk-import Document (so a
     * failure in one file doesn't affect the others, and each is individually
     * retrainable/deletable).
     *
     * NOTE: intentionally NOT @Transactional — this matters even more here
     * than on the single-file path. Wrapping this whole loop in one
     * transaction would mean NONE of the 10 documents commit until every
     * file has been processed and the method returns — so every one of the
     * 10 async embedding threads would race the same not-yet-committed
     * transaction and most would silently find nothing (see uploadPdf's
     * note). Leaving this non-transactional lets each file's save commit
     * immediately, before that file's async dispatch fires.
     */
    public List<DocumentResponse> addBulkFaqsFromFiles(Long chatbotId, List<MultipartFile> files) throws IOException {
        User currentUser = getCurrentUser();
        validateChatbotOwnership(chatbotId, currentUser.getId());

        if (files.size() > MAX_BULK_FAQ_FILES) {
            throw new RuntimeException("Too many files — max " + MAX_BULK_FAQ_FILES + " per upload.");
        }

        List<DocumentResponse> results = new ArrayList<>();
        for (MultipartFile file : files) {
            results.add(processSingleBulkFaqFile(chatbotId, currentUser.getId(), file));
        }
        return results;
    }

    private DocumentResponse processSingleBulkFaqFile(Long chatbotId, Long userId, MultipartFile file) throws IOException {
        String originalFilename = file.getOriginalFilename();
        String lower = originalFilename == null ? "" : originalFilename.toLowerCase();
        if (!lower.endsWith(".txt") && !lower.endsWith(".pdf")) {
            throw new RuntimeException("Only .txt or .pdf files are supported for bulk FAQ import. File: " + originalFilename);
        }
        if (file.getSize() > MAX_BULK_FAQ_FILE_SIZE) {
            throw new RuntimeException("File too large (" + originalFilename + ") — max 25MB for bulk FAQ import.");
        }

        String rawText;
        if (lower.endsWith(".pdf")) {
            String savedPath = saveFileToDisk(file, chatbotId);
            rawText = pdfProcessor.extractText(savedPath);
        } else {
            rawText = new String(file.getBytes(), java.nio.charset.StandardCharsets.UTF_8);
        }

        return createBulkFaqDocument(chatbotId, userId, rawText, "Bulk FAQ: " + originalFilename);
    }

    /**
     * Shared bulk-FAQ entry point for both the paste and file-upload paths.
     *
     * Unlike a single FAQ (its own Document), an entire bulk import is stored
     * as ONE Document row no matter how many pairs it contains — creating
     * tens of thousands of top-level rows would make the knowledge base list
     * unusable. Each individual Q&A pair still gets its own small, FAQ-tagged
     * Qdrant point (via {@link #processBulkFaqPairsAsync}) so the chat
     * instant-answer shortcut can match against it directly.
     *
     * Parsing (fast — just string splitting) happens synchronously so we can
     * report totalPairs/skippedPairs immediately; the actual embedding work
     * (slow — one Ollama call per pair) runs in the background so the HTTP
     * request returns right away instead of blocking for what can be hours
     * on CPU-only hardware at the 50,000-pair cap.
     */
    private DocumentResponse createBulkFaqDocument(Long chatbotId, Long userId, String rawText, String name) {
        List<String[]> pairs = new ArrayList<>();
        int skipped = 0;

        for (String line : rawText.split("\\r?\\n")) {
            String trimmed = line.trim();
            if (trimmed.isEmpty()) {
                continue; // blank lines are just formatting, not an error
            }

            int sep = trimmed.indexOf('|');
            String question = sep == -1 ? null : trimmed.substring(0, sep).trim();
            String answer = sep == -1 ? null : trimmed.substring(sep + 1).trim();

            if (question == null || answer == null || question.isEmpty() || answer.isEmpty()) {
                skipped++;
                continue;
            }

            if (pairs.size() >= MAX_BULK_FAQ_PAIRS) {
                skipped++;
                continue;
            }

            pairs.add(new String[]{question, answer});
        }

        Document document = Document.builder()
                .chatbotId(chatbotId)
                .userId(userId)
                .name(name + " (" + pairs.size() + " pairs)")
                .sourceType(Document.SourceType.FAQ)
                .status(Document.ProcessingStatus.PROCESSING)
                .content(rawText)
                .fileSize((long) rawText.length())
                .totalPairs(pairs.size())
                .processedPairs(0)
                .skippedPairs(skipped)
                .build();

        Document saved = documentRepository.save(document);

        log.info("Bulk FAQ import queued for chatbot {}: document {}, {} pairs to process, {} lines skipped",
                chatbotId, saved.getId(), pairs.size(), skipped);

        self.processBulkFaqPairsAsync(saved.getId(), pairs);

        return DocumentResponse.fromDocument(saved);
    }

    /**
     * Embeds and indexes each Q&A pair from a bulk import in the background.
     * Updates the parent Document's processedPairs periodically so the UI
     * can poll and show live progress on large (potentially multi-hour) imports.
     */
    @Async
    public void processBulkFaqPairsAsync(Long documentId, List<String[]> pairs) {
        Document document = documentRepository.findById(documentId).orElse(null);
        if (document == null) return;

        if (pairs.isEmpty()) {
            document.setStatus(Document.ProcessingStatus.READY);
            document.setChunkCount(0);
            documentRepository.save(document);
            return;
        }

        try {
            boolean qdrantAvailable = true;
            try {
                qdrantService.ensureCollectionExists();
            } catch (Exception e) {
                log.warn("Qdrant not available for bulk FAQ import {}: {}", documentId, e.getMessage());
                qdrantAvailable = false;
            }

            int embeddedCount = 0;
            for (int i = 0; i < pairs.size(); i++) {
                String question = pairs.get(i)[0];
                String answer = pairs.get(i)[1];
                String qaText = "Q: " + question + "\nA: " + answer;

                if (qdrantAvailable) {
                    float[] embedding = embeddingService.embed(qaText);
                    if (embedding != null) {
                        String pointId = UUID.randomUUID().toString();
                        Map<String, Object> payload = new HashMap<>();
                        payload.put("text", qaText);
                        payload.put("chatbotId", document.getChatbotId());
                        payload.put("documentId", documentId);
                        payload.put("chunkIndex", i);
                        payload.put("documentName", document.getName());
                        payload.put("sourceType", "FAQ");

                        boolean embedded = qdrantService.upsertPoint(pointId, embedding, payload);
                        if (embedded) {
                            chunkRepository.save(DocumentChunk.builder()
                                    .documentId(documentId)
                                    .chatbotId(document.getChatbotId())
                                    .content(qaText)
                                    .chunkIndex(i)
                                    .qdrantPointId(pointId)
                                    .isEmbedded(true)
                                    .build());
                            embeddedCount++;
                        }
                    }
                }

                // Persist progress every 25 pairs (not every single one) so a
                // 50,000-pair import doesn't hammer the DB with 50,000 writes.
                if ((i + 1) % 25 == 0 || i == pairs.size() - 1) {
                    document.setProcessedPairs(i + 1);
                    documentRepository.save(document);
                }
            }

            document.setStatus(Document.ProcessingStatus.READY);
            document.setChunkCount(embeddedCount);
            document.setProcessedPairs(pairs.size());
            documentRepository.save(document);

            log.info("Bulk FAQ import {} finished: {}/{} pairs embedded", documentId, embeddedCount, pairs.size());

        } catch (Exception e) {
            log.error("Bulk FAQ import {} failed: {}", documentId, e.getMessage(), e);
            document = documentRepository.findById(documentId).orElse(document);
            markAsFailed(document, "Bulk import failed: " + e.getMessage());
        }
    }

    // ─── Add Text ──────────────────────────────────────────────────────────

    /**
     * Adds a plain text block to the knowledge base.
     * Text can be product descriptions, policies, FAQs in bulk, etc.
     *
     * NOTE: intentionally NOT @Transactional — see uploadPdf's note.
     */
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
        self.processDocumentAsync(saved.getId());

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
     *
     * NOTE: intentionally NOT @Transactional — see uploadPdf's note. This
     * method's final step is always a save() followed by dispatching an
     * async re-embedding call; wrapping it all in one transaction would
     * let that async thread race the not-yet-committed status reset.
     */
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

        // Bulk FAQ imports need their own re-processing path: re-parse the
        // stored "question | answer" lines and re-embed each pair, rather
        // than running the raw text through the generic word-count chunker.
        if (document.getTotalPairs() != null) {
            List<String[]> pairs = new ArrayList<>();
            for (String line : document.getContent().split("\\r?\\n")) {
                String trimmed = line.trim();
                if (trimmed.isEmpty()) continue;
                int sep = trimmed.indexOf('|');
                if (sep == -1) continue;
                String question = trimmed.substring(0, sep).trim();
                String answer = trimmed.substring(sep + 1).trim();
                if (question.isEmpty() || answer.isEmpty()) continue;
                pairs.add(new String[]{question, answer});
            }
            document.setProcessedPairs(0);
            documentRepository.save(document);
            self.processBulkFaqPairsAsync(documentId, pairs);
            return DocumentResponse.fromDocument(document);
        }

        documentRepository.save(document);
        self.processDocumentAsync(documentId);

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
                    payload.put("sourceType", document.getSourceType().name());

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

            // Step 3b: Extract any "Q: ... A: ..." pairs embedded in the raw text
            // (common in uploaded PDFs/text that already contain an FAQ section)
            // and index each one as its own small, FAQ-tagged point. Regular
            // chunking above packs many such pairs together with unrelated
            // menu/policy text into one large chunk, which is too diluted for
            // the chat FAQ-shortcut (ChatService.tryFaqShortcut) to match
            // confidently. Indexing them individually lets a visitor's question
            // hit a clean, near-exact match and get an instant answer instead
            // of waiting on a full LLM generation.
            int qaPointsAdded = 0;
            // Skip for documents added via "Add FAQ" — those are already a
            // single, clean Q&A pair, so re-extracting would just embed a
            // near-identical duplicate point.
            if (qdrantAvailable && document.getSourceType() != Document.SourceType.FAQ) {
                List<String[]> qaPairs = extractEmbeddedFaqPairs(content);
                for (String[] pair : qaPairs) {
                    String qaText = "Q: " + pair[0] + "\nA: " + pair[1];
                    float[] qaEmbedding = embeddingService.embed(qaText);
                    if (qaEmbedding == null) continue;

                    String pointId = UUID.randomUUID().toString();
                    Map<String, Object> payload = new HashMap<>();
                    payload.put("text", qaText);
                    payload.put("chatbotId", document.getChatbotId());
                    payload.put("documentId", documentId);
                    payload.put("chunkIndex", chunks.size() + qaPointsAdded);
                    payload.put("documentName", document.getName());
                    payload.put("sourceType", "FAQ"); // tag for the shortcut, regardless of the parent document's type

                    boolean embedded = qdrantService.upsertPoint(pointId, qaEmbedding, payload);
                    if (embedded) {
                        chunkRepository.save(DocumentChunk.builder()
                                .documentId(documentId)
                                .chatbotId(document.getChatbotId())
                                .content(qaText)
                                .chunkIndex(chunks.size() + qaPointsAdded)
                                .qdrantPointId(pointId)
                                .isEmbedded(true)
                                .build());
                        qaPointsAdded++;
                    }
                }
                if (qaPointsAdded > 0) {
                    log.info("Document {} yielded {} extracted FAQ pairs for the instant-answer shortcut",
                            documentId, qaPointsAdded);
                }
            }

            // Step 4: Mark document as READY
            document.setStatus(Document.ProcessingStatus.READY);
            document.setChunkCount(chunks.size() + qaPointsAdded);
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

    // Matches "Q: <question> A: <answer>" pairs, stopping at the next "Q:" or
    // end of text. DOTALL so a pair can span multiple lines (PDF text often
    // wraps mid-sentence). Non-greedy so each match stops at the next question
    // instead of swallowing the rest of the document.
    private static final Pattern FAQ_PAIR_PATTERN =
            Pattern.compile("Q:\\s*(.+?)\\s*A:\\s*(.+?)(?=\\s*Q:|$)", Pattern.DOTALL);

    /**
     * Scans raw document text for "Q: ... A: ..." pairs that are already
     * embedded in the content (e.g. an uploaded PDF with its own FAQ section)
     * and returns them as [question, answer] pairs.
     *
     * Sanity limits (length caps, minimum pair count) guard against
     * misfiring on documents that just happen to contain the letters "Q:"
     * or "A:" without actually being formatted as a Q&A list.
     */
    private List<String[]> extractEmbeddedFaqPairs(String content) {
        List<String[]> pairs = new ArrayList<>();
        if (content == null || content.isBlank()) {
            return pairs;
        }

        Matcher matcher = FAQ_PAIR_PATTERN.matcher(content);
        while (matcher.find()) {
            String question = matcher.group(1).trim();
            String answer = matcher.group(2).trim();

            // Skip malformed or implausibly long matches (likely a mis-parse
            // rather than a real, concise FAQ entry).
            if (question.isEmpty() || answer.isEmpty()
                    || question.length() > 300 || answer.length() > 1000) {
                continue;
            }

            pairs.add(new String[]{question, answer});
        }

        return pairs;
    }

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
