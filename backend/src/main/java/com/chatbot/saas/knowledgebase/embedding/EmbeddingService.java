package com.chatbot.saas.knowledgebase.embedding;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;

/**
 * WHY this class exists:
 *   To do semantic search (RAG), text must be converted to "embedding" vectors —
 *   arrays of numbers that capture the MEANING of text.
 *   Similar sentences get similar vectors. This lets Qdrant find relevant
 *   knowledge chunks when a user asks a question.
 *
 * WHAT it does:
 *   Converts text → float[] using Ollama's nomic-embed-text model (FREE, local).
 *   Falls back to OpenAI if Ollama is unavailable and OpenAI key is configured.
 *   Returns null if neither is available (documents saved to DB but no RAG).
 *
 * HOW the embedding API works:
 *
 *   Ollama (PRIMARY — free, local, used in dev):
 *     POST http://localhost:11434/api/embeddings
 *     { "model": "nomic-embed-text", "prompt": "text here" }
 *     → { "embedding": [0.12, -0.45, ...] }   ← 768 floats
 *
 *   Google Gemini (FALLBACK — free tier, used in production where there's
 *   no local Ollama to fall back to; Groq has no embeddings endpoint at all,
 *   which is why chat and embeddings use different hosted providers):
 *     POST https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent
 *     Header: X-goog-api-key: <GOOGLE_API_KEY>
 *     { "content": { "parts": [{ "text": "text here" }] } }
 *     → { "embedding": { "values": [...] } }   ← 3072 floats by default
 *
 *   OpenAI (LAST-RESORT FALLBACK — paid):
 *     POST https://api.openai.com/v1/embeddings
 *     { "model": "text-embedding-3-small", "input": "text here" }
 *     → { "data": [{ "embedding": [...] }] }   ← 1536 floats
 *
 * IMPORTANT: each provider produces a different vector size (Ollama 768,
 * Google 3072, OpenAI 1536) and a Qdrant collection is locked to ONE
 * dimension for its lifetime. You CANNOT mix providers within one
 * collection/environment. Set qdrant.vector.dimension to match whichever
 * provider that environment actually uses — 768 for local dev (Ollama),
 * 3072 for production (Google).
 */
@Service
@Slf4j
public class EmbeddingService {

    @Value("${ollama.base-url:http://localhost:11434}")
    private String ollamaBaseUrl;

    @Value("${ollama.embedding.model:nomic-embed-text}")
    private String ollamaEmbeddingModel;

    @Value("${google.api.key:}")
    private String googleApiKey;

    @Value("${google.embedding.model:gemini-embedding-001}")
    private String googleEmbeddingModel;

    @Value("${openai.api.key:}")
    private String openAiApiKey;

    @Value("${openai.embedding.model:text-embedding-3-small}")
    private String openAiEmbeddingModel;

    /**
     * Converts text to a float array (embedding vector).
     *
     * @param text - a chunk of document text (500 words max)
     * @return float[] (dimension depends on whichever provider actually
     *         handled it — see class doc), or null if none are available
     */
    public float[] embed(String text) {
        if (text == null || text.isBlank()) return null;

        // Try Ollama first (free, local — this is what local dev uses;
        // it simply won't be reachable in production, falling through below)
        float[] result = embedWithOllama(text);
        if (result != null) return result;

        // Fall back to Google's free-tier embedding API (production default)
        if (googleApiKey != null && !googleApiKey.isBlank()) {
            log.debug("Ollama unavailable, falling back to Google embedding");
            result = embedWithGoogle(text);
            if (result != null) return result;
        }

        // Last resort: OpenAI, only if explicitly configured (paid)
        if (openAiApiKey != null && !openAiApiKey.isBlank()) {
            log.debug("Ollama/Google unavailable, falling back to OpenAI embedding");
            return embedWithOpenAi(text);
        }

        log.debug("No embedding provider available — chunk will be saved without vector");
        return null;
    }

    // ─── Ollama Embedding ─────────────────────────────────────────────────────

    /**
     * Calls Ollama's embedding API.
     * Requires Ollama to be running and nomic-embed-text to be pulled:
     *   ollama pull nomic-embed-text
     *
     * @return 768-dimensional float array, or null if Ollama is not running
     */
    private float[] embedWithOllama(String text) {
        try {
            WebClient client = WebClient.builder()
                    .baseUrl(ollamaBaseUrl)
                    .build();

            // Ollama embedding request format
            Map<String, Object> body = Map.of(
                    "model", ollamaEmbeddingModel,
                    "prompt", text   // Ollama uses "prompt", not "input"
            );

            Map<?, ?> response = client.post()
                    .uri("/api/embeddings")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            // Ollama response: { "embedding": [0.12, -0.45, ...] }
            if (response != null) {
                List<?> embeddingList = (List<?>) response.get("embedding");
                if (embeddingList != null && !embeddingList.isEmpty()) {
                    float[] embedding = new float[embeddingList.size()];
                    for (int i = 0; i < embeddingList.size(); i++) {
                        embedding[i] = ((Number) embeddingList.get(i)).floatValue();
                    }
                    log.debug("Ollama embedded {} chars → {} dims", text.length(), embedding.length);
                    return embedding;
                }
            }

            return null;

        } catch (Exception e) {
            // Ollama not running — this is expected if user hasn't set it up yet
            log.debug("Ollama embedding unavailable: {}", e.getMessage());
            return null;
        }
    }

    // ─── Google Gemini Embedding (Production fallback) ───────────────────────

    /**
     * Calls Google's Gemini embedding API.
     * Free tier, no credit card required — get a key at https://aistudio.google.com
     *
     * @return 3072-dimensional float array by default, or null on failure
     */
    private float[] embedWithGoogle(String text) {
        try {
            WebClient client = WebClient.builder()
                    .baseUrl("https://generativelanguage.googleapis.com/v1beta")
                    .build();

            Map<String, Object> body = Map.of(
                    "content", Map.of("parts", List.of(Map.of("text", text)))
            );

            Map<?, ?> response = client.post()
                    .uri("/models/" + googleEmbeddingModel + ":embedContent")
                    .header("X-goog-api-key", googleApiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            // Google response: { "embedding": { "values": [0.12, -0.45, ...] } }
            if (response != null) {
                Map<?, ?> embeddingObj = (Map<?, ?>) response.get("embedding");
                if (embeddingObj != null) {
                    List<?> values = (List<?>) embeddingObj.get("values");
                    if (values != null && !values.isEmpty()) {
                        float[] embedding = new float[values.size()];
                        for (int i = 0; i < values.size(); i++) {
                            embedding[i] = ((Number) values.get(i)).floatValue();
                        }
                        log.debug("Google embedded {} chars → {} dims", text.length(), embedding.length);
                        return embedding;
                    }
                }
            }

            return null;

        } catch (Exception e) {
            log.error("Google embedding failed: {}", e.getMessage());
            return null;
        }
    }

    // ─── OpenAI Embedding (Fallback) ─────────────────────────────────────────

    /**
     * Calls OpenAI's embedding API as a fallback.
     * Only used when Ollama is unavailable AND OPENAI_API_KEY is set.
     * NOTE: OpenAI produces 1536-dim vectors. Change qdrant.vector.dimension=1536
     * in application.properties if using this path.
     */
    private float[] embedWithOpenAi(String text) {
        try {
            WebClient client = WebClient.builder()
                    .baseUrl("https://api.openai.com/v1")
                    .build();

            Map<String, Object> body = Map.of(
                    "model", openAiEmbeddingModel,
                    "input", text
            );

            Map<?, ?> response = client.post()
                    .uri("/embeddings")
                    .header("Authorization", "Bearer " + openAiApiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            // OpenAI response: { "data": [{ "embedding": [...] }] }
            if (response != null) {
                List<?> data = (List<?>) response.get("data");
                if (data != null && !data.isEmpty()) {
                    Map<?, ?> first = (Map<?, ?>) data.get(0);
                    List<?> embeddingList = (List<?>) first.get("embedding");
                    if (embeddingList != null) {
                        float[] embedding = new float[embeddingList.size()];
                        for (int i = 0; i < embeddingList.size(); i++) {
                            embedding[i] = ((Number) embeddingList.get(i)).floatValue();
                        }
                        log.debug("OpenAI embedded {} chars → {} dims", text.length(), embedding.length);
                        return embedding;
                    }
                }
            }

            return null;

        } catch (Exception e) {
            log.error("OpenAI embedding failed: {}", e.getMessage());
            return null;
        }
    }
}
