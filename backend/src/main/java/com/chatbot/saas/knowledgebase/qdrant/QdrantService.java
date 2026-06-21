package com.chatbot.saas.knowledgebase.qdrant;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.*;

/**
 * WHY this class exists:
 *   Qdrant is a vector database — optimized for storing and searching
 *   high-dimensional float arrays (embeddings).
 *   Regular PostgreSQL can store vectors but cannot do fast similarity search.
 *   Qdrant uses HNSW (Hierarchical Navigable Small World) graph algorithm
 *   to find the nearest vectors in milliseconds, even with millions of vectors.
 *
 * WHAT it does:
 *   - ensureCollectionExists: creates the Qdrant collection if it doesn't exist
 *   - upsertPoint: stores one chunk's embedding in Qdrant
 *   - deletePoints: removes embeddings when a document is deleted
 *   - searchSimilar: given a query vector, find the most relevant chunks
 *                    (used in Phase 4 during chat)
 *
 * HOW Qdrant works (key concepts):
 *
 *   Collection = like a table in SQL
 *   Point      = one stored embedding + payload (metadata)
 *   Vector     = the float array representing the text
 *   Payload    = JSON metadata attached to a point (text content, document ID, etc.)
 *
 *   Storage structure:
 *   Collection "chatbot_knowledge" {
 *     Point {
 *       id: "550e8400-e29b-41d4-a716-446655440000",
 *       vector: [0.12, -0.45, 0.89, ...],  // 1536 floats
 *       payload: {
 *         text: "Our refund policy...",
 *         chatbotId: 1,
 *         documentId: 5,
 *         chunkIndex: 2
 *       }
 *     },
 *     ...
 *   }
 *
 * HOW we use Qdrant's REST API:
 *   We call Qdrant's HTTP endpoints using Spring's WebClient.
 *   No special library needed — just JSON over HTTP.
 *
 *   Qdrant is running at http://localhost:6333 (started via docker-compose).
 */
@Service
@Slf4j
public class QdrantService {

    @Value("${qdrant.collection.name:chatbot_knowledge}")
    private String collectionName;

    @Value("${qdrant.vector.dimension:1536}")
    private int vectorDimension;

    private final WebClient webClient;

    public QdrantService(
            @Value("${qdrant.host:localhost}") String host,
            @Value("${qdrant.port:6333}") int port) {
        this.webClient = WebClient.builder()
                .baseUrl("http://" + host + ":" + port)
                .build();
    }

    /**
     * Creates the Qdrant collection if it doesn't already exist.
     * Called once when the first document is uploaded.
     *
     * Qdrant REST call: PUT /collections/{name}
     * {
     *   "vectors": {
     *     "size": 1536,
     *     "distance": "Cosine"
     *   }
     * }
     *
     * "Cosine" distance: measures the angle between vectors.
     * Works best for text embeddings (semantic similarity).
     * Alternatives: "Dot" (inner product), "Euclid" (L2 distance).
     */
    public void ensureCollectionExists() {
        try {
            // Check if collection already exists
            webClient.get()
                    .uri("/collections/" + collectionName)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();
            log.debug("Qdrant collection '{}' already exists", collectionName);

        } catch (WebClientResponseException.NotFound e) {
            // Collection doesn't exist — create it
            log.info("Creating Qdrant collection: {}", collectionName);

            Map<String, Object> vectorsConfig = Map.of(
                    "size", vectorDimension,
                    "distance", "Cosine"
            );

            Map<String, Object> body = Map.of("vectors", vectorsConfig);

            webClient.put()
                    .uri("/collections/" + collectionName)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            log.info("Qdrant collection '{}' created with {} dimensions", collectionName, vectorDimension);

        } catch (Exception e) {
            log.error("Failed to ensure Qdrant collection exists: {}", e.getMessage());
            throw new RuntimeException("Cannot connect to Qdrant at " + webClient + ". Is Qdrant running?", e);
        }
    }

    /**
     * Stores a document chunk's embedding in Qdrant.
     *
     * Qdrant REST call: PUT /collections/{name}/points
     * {
     *   "points": [{
     *     "id": "uuid-string",
     *     "vector": [0.12, -0.45, ...],
     *     "payload": { "text": "...", "chatbotId": 1, ... }
     *   }]
     * }
     *
     * @param pointId    - unique UUID for this point (stored in DocumentChunk.qdrantPointId)
     * @param vector     - the embedding float array from EmbeddingService
     * @param payload    - metadata to store alongside the vector
     * @return           - true if stored successfully
     */
    public boolean upsertPoint(String pointId, float[] vector, Map<String, Object> payload) {
        try {
            // Convert float[] to List<Float> (JSON serialization needs List)
            List<Float> vectorList = new ArrayList<>();
            for (float v : vector) {
                vectorList.add(v);
            }

            // Build the Qdrant point structure
            Map<String, Object> point = new HashMap<>();
            point.put("id", pointId);
            point.put("vector", vectorList);
            point.put("payload", payload);

            Map<String, Object> body = Map.of("points", List.of(point));

            webClient.put()
                    .uri("/collections/" + collectionName + "/points")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            return true;

        } catch (Exception e) {
            log.error("Failed to upsert point {} to Qdrant: {}", pointId, e.getMessage());
            return false;
        }
    }

    /**
     * Deletes specific points from Qdrant by their UUIDs.
     * Called when a document is deleted — removes its chunks' vectors too.
     *
     * Qdrant REST call: POST /collections/{name}/points/delete
     * { "points": ["uuid1", "uuid2", ...] }
     *
     * @param pointIds - list of Qdrant point UUIDs to delete
     */
    public void deletePoints(List<String> pointIds) {
        if (pointIds == null || pointIds.isEmpty()) return;

        try {
            Map<String, Object> body = Map.of("points", pointIds);

            webClient.post()
                    .uri("/collections/" + collectionName + "/points/delete")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            log.info("Deleted {} points from Qdrant", pointIds.size());

        } catch (Exception e) {
            log.error("Failed to delete points from Qdrant: {}", e.getMessage());
        }
    }

    /**
     * Searches for the most semantically similar chunks to a query vector.
     * This is the HEART of RAG (Retrieval Augmented Generation) in Phase 4.
     *
     * Qdrant REST call: POST /collections/{name}/points/search
     * {
     *   "vector": [0.12, -0.45, ...],   // query embedding
     *   "limit": 5,                      // return top 5 matches
     *   "with_payload": true,
     *   "filter": {                      // only search this chatbot's documents
     *     "must": [{ "key": "chatbotId", "match": { "value": 1 } }]
     *   }
     * }
     *
     * @param queryVector - embedding of the user's question
     * @param chatbotId   - only search this chatbot's knowledge base
     * @param limit       - number of results to return (top-k)
     * @return            - list of result payloads, each containing "text" and metadata
     */
    public List<Map<String, Object>> searchSimilar(float[] queryVector, Long chatbotId, int limit) {
        try {
            List<Float> vectorList = new ArrayList<>();
            for (float v : queryVector) {
                vectorList.add(v);
            }

            // Build the filter to restrict search to this chatbot's documents
            Map<String, Object> matchCondition = Map.of(
                    "key", "chatbotId",
                    "match", Map.of("value", chatbotId)
            );
            Map<String, Object> filter = Map.of("must", List.of(matchCondition));

            Map<String, Object> body = new HashMap<>();
            body.put("vector", vectorList);
            body.put("limit", limit);
            body.put("with_payload", true);   // include the text payload in results
            body.put("filter", filter);

            Map<?, ?> response = webClient.post()
                    .uri("/collections/" + collectionName + "/points/search")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            // Extract the "result" list from the response
            if (response != null) {
                List<?> results = (List<?>) response.get("result");
                if (results != null) {
                    List<Map<String, Object>> payloads = new ArrayList<>();
                    for (Object result : results) {
                        Map<?, ?> resultMap = (Map<?, ?>) result;
                        Map<?, ?> payload = (Map<?, ?>) resultMap.get("payload");
                        if (payload != null) {
                            payloads.add(new HashMap<>((Map<String, Object>) payload));
                        }
                    }
                    return payloads;
                }
            }

            return new ArrayList<>();

        } catch (Exception e) {
            log.error("Qdrant search failed: {}", e.getMessage());
            return new ArrayList<>();
        }
    }
}
