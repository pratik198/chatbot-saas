package com.chatbot.saas.chat;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * WHY this class exists:
 *   Groq hosts open models (Llama, etc.) on inference-specialized hardware
 *   and offers a generous free tier — used here as the production chat
 *   provider since we can't self-host an LLM on free-tier cloud compute the
 *   way we do locally with Ollama.
 *
 *   Active only when chat.provider=groq (see ChatCompletionService and
 *   OllamaService, which is the default/local-dev provider instead).
 *
 * HOW Groq's API works:
 *   Groq's chat endpoint is OpenAI-compatible — same request/response shape
 *   as OpenAI's /v1/chat/completions, just pointed at Groq's servers with a
 *   Groq API key. That's why this class's request/response handling differs
 *   from OllamaService's: Groq nests the reply under choices[0].message,
 *   not top-level message like Ollama's native API does.
 *
 *   POST https://api.groq.com/openai/v1/chat/completions
 *   Headers: Authorization: Bearer <GROQ_API_KEY>
 *   {
 *     "model": "llama-3.3-70b-versatile",
 *     "messages": [ {"role": "system", "content": "..."}, ... ]
 *   }
 *
 *   Response:
 *   { "choices": [ { "message": { "role": "assistant", "content": "..." } } ] }
 */
@Service
@ConditionalOnProperty(prefix = "chat", name = "provider", havingValue = "groq")
@Slf4j
public class GroqService implements ChatCompletionService {

    @Value("${groq.base-url:https://api.groq.com/openai/v1}")
    private String groqBaseUrl;

    @Value("${groq.api-key:}")
    private String groqApiKey;

    @Value("${groq.model:llama-3.3-70b-versatile}")
    private String groqModel;

    @Override
    public String chat(List<Map<String, String>> messages) {
        if (groqApiKey == null || groqApiKey.isBlank()) {
            log.error("Groq chat requested but GROQ_API_KEY is not set");
            return "I'm not available right now — the AI service isn't configured correctly. Please contact support.";
        }

        try {
            WebClient client = WebClient.builder()
                    .baseUrl(groqBaseUrl)
                    .codecs(config -> config.defaultCodecs().maxInMemorySize(10 * 1024 * 1024))
                    .build();

            Map<String, Object> body = new HashMap<>();
            body.put("model", groqModel);
            body.put("messages", messages);

            log.debug("Sending {} messages to Groq model '{}'", messages.size(), groqModel);

            Map<?, ?> response = client.post()
                    .uri("/chat/completions")
                    .contentType(MediaType.APPLICATION_JSON)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + groqApiKey)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            // Response structure: { "choices": [ { "message": { "content": "..." } } ] }
            if (response != null) {
                List<?> choices = (List<?>) response.get("choices");
                if (choices != null && !choices.isEmpty()) {
                    Map<?, ?> firstChoice = (Map<?, ?>) choices.get(0);
                    Map<?, ?> messageObj = (Map<?, ?>) firstChoice.get("message");
                    if (messageObj != null) {
                        String content = (String) messageObj.get("content");
                        if (content != null) {
                            log.debug("Groq responded with {} chars", content.length());
                            return content.trim();
                        }
                    }
                }
            }

            return "I apologize, but I couldn't generate a response. Please try again.";

        } catch (Exception e) {
            log.error("Groq chat failed: {}", e.getMessage());
            return "I encountered an error while processing your request. Please try again.";
        }
    }
}
