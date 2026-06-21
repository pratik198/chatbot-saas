package com.chatbot.saas.knowledgebase;

import com.chatbot.saas.common.response.ApiResponse;
import com.chatbot.saas.knowledgebase.dto.AddFaqRequest;
import com.chatbot.saas.knowledgebase.dto.AddTextRequest;
import com.chatbot.saas.knowledgebase.dto.DocumentResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

/**
 * WHY this class exists:
 *   REST Controller for knowledge base endpoints.
 *   Handles file uploads (multipart/form-data) and text/FAQ submissions.
 *
 * WHAT it does:
 *   GET    /api/knowledge?chatbotId={id}   → list documents for a chatbot
 *   GET    /api/knowledge                  → list all documents (all chatbots)
 *   POST   /api/knowledge/pdf?chatbotId={id} → upload PDF (multipart)
 *   POST   /api/knowledge/faq             → add FAQ entry (JSON)
 *   POST   /api/knowledge/text            → add text block (JSON)
 *   DELETE /api/knowledge/{id}            → delete document
 *   POST   /api/knowledge/{id}/retrain    → re-process document
 *
 * HOW PDF upload works (multipart/form-data):
 *   The frontend sends the file as multipart/form-data (not JSON).
 *   @RequestParam MultipartFile file maps to the "file" form field.
 *   Spring automatically reads the binary data and wraps it in MultipartFile.
 *
 *   Request example:
 *   POST /api/knowledge/pdf?chatbotId=1
 *   Content-Type: multipart/form-data
 *   Body: form-data { file: [binary PDF content] }
 */
@RestController
@RequestMapping("/api/knowledge")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;

    /**
     * GET /api/knowledge?chatbotId={id}
     * Lists all documents for a specific chatbot.
     * If chatbotId not provided, returns all documents across all chatbots.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<DocumentResponse>>> getDocuments(
            @RequestParam(required = false) Long chatbotId) {

        List<DocumentResponse> docs = (chatbotId != null)
                ? documentService.getDocuments(chatbotId)
                : documentService.getAllMyDocuments();

        return ResponseEntity.ok(ApiResponse.success("Documents fetched", docs));
    }

    /**
     * POST /api/knowledge/pdf?chatbotId={id}
     * Uploads a PDF file. Immediately returns 202 Accepted with status=PROCESSING.
     * Background thread handles text extraction + embedding.
     *
     * @RequestParam MultipartFile file → the uploaded file
     * Returns 202 (not 201) because the resource isn't fully created yet — still processing.
     */
    @PostMapping("/pdf")
    public ResponseEntity<ApiResponse<DocumentResponse>> uploadPdf(
            @RequestParam Long chatbotId,
            @RequestParam("file") MultipartFile file) throws IOException {

        DocumentResponse doc = documentService.uploadPdf(chatbotId, file);
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(ApiResponse.success("PDF uploaded — processing in background", doc));
    }

    /**
     * POST /api/knowledge/faq
     * Adds a question-answer pair to the knowledge base.
     */
    @PostMapping("/faq")
    public ResponseEntity<ApiResponse<DocumentResponse>> addFaq(
            @Valid @RequestBody AddFaqRequest request) {

        DocumentResponse doc = documentService.addFaq(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("FAQ added successfully", doc));
    }

    /**
     * POST /api/knowledge/text
     * Adds a plain text block to the knowledge base.
     */
    @PostMapping("/text")
    public ResponseEntity<ApiResponse<DocumentResponse>> addText(
            @Valid @RequestBody AddTextRequest request) {

        DocumentResponse doc = documentService.addText(request);
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(ApiResponse.success("Text content added — processing", doc));
    }

    /**
     * POST /api/knowledge/{id}/retrain
     * Re-processes an existing document (useful after embedding failures).
     */
    @PostMapping("/{id}/retrain")
    public ResponseEntity<ApiResponse<DocumentResponse>> retrain(@PathVariable Long id) {
        DocumentResponse doc = documentService.retrainDocument(id);
        return ResponseEntity.ok(ApiResponse.success("Retraining started", doc));
    }

    /**
     * DELETE /api/knowledge/{id}
     * Deletes a document, its chunks, and its Qdrant vectors.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDocument(@PathVariable Long id) {
        documentService.deleteDocument(id);
        return ResponseEntity.noContent().build();
    }
}
