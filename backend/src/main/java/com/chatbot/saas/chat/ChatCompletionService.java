package com.chatbot.saas.chat;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * WHY this interface exists:
 *   ChatService needs "send these messages, get an AI reply back" — it
 *   shouldn't care whether that reply comes from Ollama running on a laptop
 *   or a hosted API like Groq. Two implementations exist:
 *     - OllamaService: local, free, no API key — used for development.
 *     - GroqService:   hosted, free tier, fast — used in production, where
 *                      there's no GPU/CPU headroom to self-host an LLM.
 *   Which one is active is controlled by the "chat.provider" property
 *   (defaults to "ollama" so nothing changes for local dev unless you
 *   explicitly opt into Groq via CHAT_PROVIDER=groq).
 */
public interface ChatCompletionService {

    /**
     * Sends a conversation to the LLM and returns its reply text.
     *
     * @param messages - [ {"role": "system"|"user"|"assistant", "content": "..."} , ... ]
     */
    String chat(List<Map<String, String>> messages);

    /** Builds one message map. Shared helper so ChatService stays provider-agnostic. */
    static Map<String, String> buildMessage(String role, String content) {
        Map<String, String> msg = new HashMap<>();
        msg.put("role", role);
        msg.put("content", content);
        return msg;
    }
}
