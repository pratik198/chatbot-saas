package com.chatbot.saas.chat;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * WHY this class exists:
 *   This service handles ALL communication with Ollama (the free local AI).
 *   It abstracts away the HTTP calls so ChatService doesn't need to know
 *   the details of Ollama's REST API.
 *
 * WHAT it does:
 *   chat()  → sends a list of messages to Ollama, gets AI response
 *
 * HOW Ollama's Chat API works:
 *
 *   POST http://localhost:11434/api/chat
 *   {
 *     "model": "llama3.2",
 *     "messages": [
 *       { "role": "system",    "content": "You are a helpful assistant..." },
 *       { "role": "user",      "content": "What is your refund policy?" },
 *       { "role": "assistant", "content": "Our refund policy is 30 days..." },
 *       { "role": "user",      "content": "What if I lost my receipt?" }
 *     ],
 *     "stream": false   ← false = wait for the full response (not streaming)
 *   }
 *
 *   Response:
 *   {
 *     "model": "llama3.2",
 *     "message": {
 *       "role": "assistant",
 *       "content": "You can still get a refund by contacting..."
 *     },
 *     "done": true
 *   }
 *
 * HOW the system prompt with RAG context works:
 *   The "system" role message is the first message in the array.
 *   We inject relevant knowledge chunks here:
 *
 *   "You are a helpful customer service bot for Acme Corp.
 *   [Relevant context from knowledge base:]
 *   Chunk 1: Our return policy allows returns within 30 days.
 *   Chunk 2: Refunds take 3-5 business days.
 *   Answer questions using this context. If unsure, say so."
 *
 * TROUBLESHOOTING:
 *   If Ollama is not running: install from https://ollama.com
 *   If model not found: run `ollama pull llama3.2`
 *   To test manually: curl http://localhost:11434/api/tags
 */
@Service
@ConditionalOnProperty(prefix = "chat", name = "provider", havingValue = "ollama", matchIfMissing = true)
@Slf4j
public class OllamaService implements ChatCompletionService {

    @Value("${ollama.base-url:http://localhost:11434}")
    private String ollamaBaseUrl;

    @Value("${ollama.model:llama3.2}")
    private String ollamaModel;

    // Ollama defaults to a 2048-token context window, which the RAG-injected
    // knowledge chunks + instructions + history can easily exceed. When that
    // happens Ollama silently truncates from the START of the prompt — i.e.
    // exactly where the retrieved knowledge base context lives — so the model
    // "forgets" the very facts RAG just retrieved. Raise it explicitly.
    @Value("${ollama.num-ctx:4096}")
    private int numCtx;

    /**
     * Sends a conversation history to Ollama and gets the AI's reply.
     *
     * @param messages - full list of messages in Ollama format:
     *                   [ {"role": "system", "content": "..."}, {"role": "user", "content": "..."}, ... ]
     * @return the AI assistant's response text, or an error message if Ollama is not running
     */
    @Override
    public String chat(List<Map<String, String>> messages) {
        try {
            WebClient client = WebClient.builder()
                    .baseUrl(ollamaBaseUrl)
                    .codecs(config -> config.defaultCodecs().maxInMemorySize(10 * 1024 * 1024)) // 10MB buffer
                    .build();

            // Build the request body
            Map<String, Object> body = new HashMap<>();
            body.put("model", ollamaModel);
            body.put("messages", messages);
            body.put("stream", false);   // false = return full response, not a stream
            body.put("options", Map.of("num_ctx", numCtx));

            log.debug("Sending {} messages to Ollama model '{}'", messages.size(), ollamaModel);

            Map<?, ?> response = client.post()
                    .uri("/api/chat")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            // Extract the assistant's message from the response
            // Response structure: { "message": { "role": "assistant", "content": "..." } }
            if (response != null) {
                Map<?, ?> messageObj = (Map<?, ?>) response.get("message");
                if (messageObj != null) {
                    String content = (String) messageObj.get("content");
                    if (content != null) {
                        log.debug("Ollama responded with {} chars", content.length());
                        return content.trim();
                    }
                }
            }

            return "I apologize, but I couldn't generate a response. Please try again.";

        } catch (Exception e) {
            log.error("Ollama chat failed: {}", e.getMessage());

            // Give a helpful error message based on the exception type
            if (e.getMessage() != null && e.getMessage().contains("Connection refused")) {
                return "I'm not available right now — the AI service is not running. " +
                       "Please ensure Ollama is installed and running (https://ollama.com).";
            }

            return "I encountered an error while processing your request. Please try again.";
        }
    }

    /**
     * Checks if Ollama is running by calling its version endpoint.
     * Useful for health checks and startup validation.
     *
     * @return true if Ollama is reachable, false otherwise
     */
    public boolean isAvailable() {
        try {
            WebClient client = WebClient.builder().baseUrl(ollamaBaseUrl).build();
            client.get().uri("/api/tags").retrieve().bodyToMono(Map.class).block();
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
