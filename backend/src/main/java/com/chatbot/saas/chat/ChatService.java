package com.chatbot.saas.chat;

import com.chatbot.saas.chat.dto.*;
import com.chatbot.saas.chatbot.Chatbot;
import com.chatbot.saas.chatbot.ChatbotRepository;
import com.chatbot.saas.common.exception.ResourceNotFoundException;
import com.chatbot.saas.knowledgebase.embedding.EmbeddingService;
import com.chatbot.saas.knowledgebase.qdrant.QdrantService;
import com.chatbot.saas.user.User;
import com.chatbot.saas.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * WHY this class exists:
 *   This is the BRAIN of Phase 4. It orchestrates the RAG (Retrieval Augmented Generation)
 *   pipeline — the technique that makes AI chatbots answer questions using YOUR knowledge base.
 *
 * WHAT it does:
 *   - startConversation: Creates a new conversation, sends first message, gets AI reply
 *   - sendMessage: Continues an existing conversation, maintains context
 *   - listConversations: Shows all conversations for a chatbot
 *   - getConversation: Fetches one conversation with its full message history
 *   - deleteConversation: Removes a conversation and all its messages
 *
 * HOW RAG (Retrieval Augmented Generation) works:
 *
 *   Without RAG:
 *     User: "What is your return policy?"
 *     AI: "I don't have specific information about that." ← useless!
 *
 *   With RAG:
 *     1. Embed user question: [0.12, -0.45, ...] (768 numbers)
 *     2. Search Qdrant for most similar knowledge chunks
 *     3. Found chunks: "Returns accepted within 30 days", "No receipt needed"
 *     4. Inject into system prompt:
 *          "You are a helpful bot. Use this context:
 *           [1] Returns accepted within 30 days
 *           [2] No receipt needed for refunds
 *           Answer based on this information."
 *     5. Ollama reads the context + question → gives accurate answer!
 *
 * HOW conversation history works (for context-aware follow-ups):
 *   We pass the last N messages to Ollama so it "remembers" what was said.
 *   Without history, every message would be treated as a fresh question.
 *   With history:
 *     User: "What is your return policy?"
 *     AI:   "30 days, no receipt needed."
 *     User: "What if the item is broken?"     ← Ollama knows "item" = the returned item
 *     AI:   "For defective items, we offer an instant replacement."
 *
 * HOW the final Ollama prompt is structured:
 *   [
 *     { "role": "system",    "content": "<chatbot's system prompt> + <rag context>" },
 *     { "role": "user",      "content": "first user message" },
 *     { "role": "assistant", "content": "first AI reply" },
 *     { "role": "user",      "content": "second user message" },
 *     ... (last 10 messages)
 *     { "role": "user",      "content": "CURRENT new message" }
 *   ]
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ChatService {

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final ChatbotRepository chatbotRepository;
    private final UserRepository userRepository;
    private final ChatCompletionService chatCompletionService;
    private final EmbeddingService embeddingService;
    private final QdrantService qdrantService;

    // Max previous messages to include as context (from application.properties)
    @Value("${chat.history.max-messages:10}")
    private int maxHistoryMessages;

    // Max knowledge chunks to inject into the prompt (from application.properties)
    @Value("${chat.rag.top-k:3}")
    private int ragTopK;

    // If the top Qdrant match is an FAQ chunk with a similarity score at or
    // above this threshold, we treat it as a near-exact match and return its
    // stored answer directly — skipping the Ollama call entirely. This is a
    // big win on CPU-only hardware: on FAQ hits it turns a 1-2 minute LLM
    // round-trip into a near-instant DB/Qdrant lookup, with no quality loss
    // since the answer is the exact one the business owner wrote.
    @Value("${chat.rag.faq-shortcut-threshold:0.70}")
    private double faqShortcutThreshold;

    // ─── Start a new conversation ─────────────────────────────────────────────

    /**
     * Creates a new conversation and sends the first message.
     * The conversation title is automatically set from the first user message.
     *
     * @param chatbotId - which chatbot to chat with
     * @param userMessage - the first message text
     * @return both the user message and the AI reply
     */
    @Transactional
    public SendMessageResponse startConversation(Long chatbotId, String userMessage) {
        User currentUser = getCurrentUser();
        Chatbot chatbot = getChatbotOwnedByUser(chatbotId, currentUser.getId());

        // Create a new conversation, title set from first message (first 80 chars)
        String title = userMessage.length() > 80 ? userMessage.substring(0, 80) + "..." : userMessage;
        Conversation conversation = conversationRepository.save(
                Conversation.builder()
                        .chatbotId(chatbotId)
                        .userId(currentUser.getId())
                        .title(title)
                        .messageCount(0)
                        .build()
        );

        log.info("New conversation {} started for chatbot {}", conversation.getId(), chatbotId);

        // Send the first message and get AI reply
        return processMessage(conversation, chatbot, userMessage, true);
    }

    // ─── Continue an existing conversation ───────────────────────────────────

    /**
     * Sends a new message in an existing conversation.
     * Loads the recent message history for AI context.
     *
     * @param conversationId - which conversation to continue
     * @param userMessage    - the new message text
     * @return both the user message and the AI reply
     */
    @Transactional
    public SendMessageResponse sendMessage(Long conversationId, String userMessage) {
        User currentUser = getCurrentUser();

        Conversation conversation = conversationRepository.findByIdAndUserId(conversationId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found: " + conversationId));

        Chatbot chatbot = chatbotRepository.findById(conversation.getChatbotId())
                .orElseThrow(() -> new ResourceNotFoundException("Chatbot not found for this conversation"));

        return processMessage(conversation, chatbot, userMessage, false);
    }

    // ─── Core RAG + AI pipeline ───────────────────────────────────────────────

    /**
     * The main RAG pipeline. Called by both startConversation() and sendMessage().
     *
     * Steps:
     *   1. Save user's message to DB
     *   2. Embed the user's message (convert to vector)
     *   3. Search Qdrant for relevant knowledge chunks
     *   4. Build system prompt (chatbot config + rag context)
     *   5. Load recent conversation history
     *   6. Call Ollama for the AI reply
     *   7. Save the AI reply to DB
     *   8. Update conversation metadata
     *
     * @param conversation - the conversation entity
     * @param chatbot      - the chatbot entity (for systemPrompt, name, etc.)
     * @param userMessage  - the new message text
     * @param isFirstMessage - whether this is the first message (for title setting)
     *
     * NOTE: public — also called directly by WidgetController for anonymous
     * visitor chat, so the embeddable widget gets the exact same RAG pipeline
     * (FAQ shortcut, RAG tuning, system prompt) as the authenticated dashboard
     * chat, instead of maintaining a second, drifting copy of this logic.
     */
    public SendMessageResponse processMessage(
            Conversation conversation,
            Chatbot chatbot,
            String userMessage,
            boolean isFirstMessage) {

        // ── Step 1: Save the user's message ───────────────────────────────────
        Message savedUserMessage = messageRepository.save(
                Message.builder()
                        .conversationId(conversation.getId())
                        .role(Message.Role.user)
                        .content(userMessage)
                        .build()
        );
        log.debug("Saved user message {} in conversation {}", savedUserMessage.getId(), conversation.getId());

        // ── Step 2: Embed user message for RAG search ─────────────────────────
        // Convert the user's question into a vector so we can search Qdrant
        float[] queryEmbedding = null;
        try {
            queryEmbedding = embeddingService.embed(userMessage);
        } catch (Exception e) {
            log.warn("Embedding failed for RAG search: {}", e.getMessage());
        }

        // ── Step 3: Search Qdrant for relevant knowledge chunks ───────────────
        List<Map<String, Object>> relevantChunks = new ArrayList<>();
        if (queryEmbedding != null) {
            try {
                relevantChunks = qdrantService.searchSimilar(queryEmbedding, chatbot.getId(), ragTopK);
                log.debug("Found {} relevant chunks from knowledge base", relevantChunks.size());
            } catch (Exception e) {
                log.warn("Qdrant search failed (will answer without knowledge base): {}", e.getMessage());
            }
        }

        // ── Step 3b: FAQ shortcut — skip Ollama on a near-exact FAQ match ──────
        // If the closest knowledge chunk is an FAQ entry and the similarity
        // score clears our threshold, the visitor's question is essentially
        // the same question the business already answered. Return that
        // answer directly instead of paying for a full LLM generation.
        String shortcutAnswer = tryFaqShortcut(relevantChunks);

        String aiResponse;
        if (shortcutAnswer != null) {
            log.info("FAQ shortcut hit — skipping Ollama call");
            aiResponse = shortcutAnswer;
        } else {
            // ── Step 4: Build the system prompt ────────────────────────────────
            // This is what tells Ollama WHO it is and WHAT it knows
            String systemPrompt = buildSystemPrompt(chatbot, relevantChunks);

            // ── Step 5: Load recent conversation history ───────────────────────
            // Load previous messages so the AI can follow the conversation
            List<Message> history = messageRepository.findByConversationIdOrderByCreatedAtAsc(conversation.getId());

            // Keep only the last N messages to avoid overwhelming the AI context window
            // The current user message is already in the history (we just saved it)
            // We take the last maxHistoryMessages (excluding the one we just added)
            List<Message> contextMessages = getContextMessages(history, savedUserMessage.getId());

            // ── Step 6: Build the messages array for Ollama ────────────────────
            List<Map<String, String>> ollamaMessages = buildOllamaMessages(systemPrompt, contextMessages, userMessage);

            // ── Step 7: Call Ollama for the AI response ────────────────────────
            log.info("Calling Ollama with {} messages (system + {} history + current)",
                    ollamaMessages.size(), contextMessages.size());
            aiResponse = chatCompletionService.chat(ollamaMessages);
        }

        // ── Step 8: Save the AI's reply ───────────────────────────────────────
        Message savedAiMessage = messageRepository.save(
                Message.builder()
                        .conversationId(conversation.getId())
                        .role(Message.Role.assistant)
                        .content(aiResponse)
                        .build()
        );

        // ── Step 9: Update conversation metadata ──────────────────────────────
        long totalMessages = messageRepository.countByConversationId(conversation.getId());
        conversation.setMessageCount((int) totalMessages);
        conversationRepository.save(conversation);

        return SendMessageResponse.builder()
                .conversationId(conversation.getId())
                .userMessage(MessageResponse.fromMessage(savedUserMessage))
                .assistantMessage(MessageResponse.fromMessage(savedAiMessage))
                .conversationTitle(conversation.getTitle())
                .build();
    }

    // ─── FAQ shortcut ─────────────────────────────────────────────────────────

    /**
     * Checks whether the top-ranked knowledge chunk is a near-exact FAQ match.
     * FAQ chunks are stored as "Q: <question>\nA: <answer>" (see DocumentService.addFaq).
     * If the closest chunk is an FAQ and its similarity score clears the
     * configured threshold, we extract and return just the "A: " answer text.
     * Returns null if there's no confident FAQ match — caller falls back to Ollama.
     */
    private String tryFaqShortcut(List<Map<String, Object>> relevantChunks) {
        if (relevantChunks.isEmpty()) {
            return null;
        }

        Map<String, Object> topMatch = relevantChunks.get(0);
        Object scoreObj = topMatch.get("score");
        Object sourceType = topMatch.get("sourceType");

        // Chunks embedded before this feature was added won't have "sourceType"
        // in their Qdrant payload — they simply won't qualify for the shortcut.
        if (!(scoreObj instanceof Number) || !"FAQ".equals(sourceType)) {
            return null;
        }

        double score = ((Number) scoreObj).doubleValue();
        if (score < faqShortcutThreshold) {
            return null;
        }

        String text = (String) topMatch.get("text");
        if (text == null) {
            return null;
        }

        // FAQ chunks are stored as "Q: <question>\nA: <answer>" (DocumentService.addFaq),
        // but TextChunker rejoins words with single spaces when chunking — so by the
        // time this text reaches us, the newline is gone and it reads "...question A: answer".
        // Match "A: " preceded by whitespace/start-of-string rather than a literal "\n".
        java.util.regex.Matcher matcher = java.util.regex.Pattern.compile("(?:^|\\s)A:\\s").matcher(text);
        if (!matcher.find()) {
            return null; // not in the expected Q/A format — fall back to Ollama
        }

        return text.substring(matcher.end()).trim();
    }

    // ─── Build RAG-enhanced system prompt ────────────────────────────────────

    /**
     * Builds the system prompt that guides the AI's behavior.
     * If we found relevant knowledge chunks from Qdrant, we inject them here.
     *
     * The final prompt looks like:
     *   "You are {chatbotName}, an AI assistant.
     *    {user-defined system prompt}
     *
     *    Relevant information from the knowledge base:
     *    [1] Our return policy allows returns within 30 days of purchase.
     *    [2] Customers don't need a receipt — the order number is enough.
     *    [3] Refunds are processed within 3-5 business days.
     *
     *    Instructions:
     *    - Use the provided context to answer questions accurately.
     *    - If the answer isn't in the context, say so honestly.
     *    - Be helpful and concise."
     */
    private String buildSystemPrompt(Chatbot chatbot, List<Map<String, Object>> relevantChunks) {
        StringBuilder sb = new StringBuilder();

        // Start with the chatbot's configured system prompt (set in chatbot builder UI)
        String configuredPrompt = chatbot.getSystemPrompt();
        if (configuredPrompt != null && !configuredPrompt.isBlank()) {
            sb.append(configuredPrompt).append("\n\n");
        } else {
            // Default system prompt if none configured
            sb.append("You are ").append(chatbot.getName())
              .append(", a helpful AI assistant. Answer questions helpfully and concisely.\n\n");
        }

        // Inject RAG context if we found relevant chunks
        if (!relevantChunks.isEmpty()) {
            sb.append("You work for the business described below. This is YOUR business — you speak on its behalf, ")
              .append("not the visitor's. If the visitor asks about \"my business\", \"your business\", \"this company\", ")
              .append("\"this shop\", or similar, they are asking about the business described below, not themselves.\n");
            sb.append("Example: Visitor asks \"What is my business name?\" or \"What's the name of your business?\" ")
              .append("→ Both mean the same thing here: answer with the business name found below.\n\n");
            sb.append("Information about your business, from the knowledge base:\n");
            for (int i = 0; i < relevantChunks.size(); i++) {
                String text = (String) relevantChunks.get(i).get("text");
                if (text != null && !text.isBlank()) {
                    sb.append("[").append(i + 1).append("] ").append(text.trim()).append("\n");
                }
            }
            sb.append("\n");
            sb.append("Instructions:\n");
            sb.append("- Use the provided context above to answer questions accurately, speaking as the business.\n");
            sb.append("- If the answer is not in the context, be honest and say so.\n");
            sb.append("- Keep answers clear and helpful.\n");
        } else {
            sb.append("Answer questions helpfully. If you don't know the answer, say so honestly.\n");
        }

        // Respect the chatbot's configured welcome message language (if set)
        if (chatbot.getLanguage() != null && !chatbot.getLanguage().equalsIgnoreCase("en")) {
            sb.append("Respond in the same language as the user's message.\n");
        }

        return sb.toString();
    }

    // ─── Build Ollama messages array ─────────────────────────────────────────

    /**
     * Assembles the messages array for Ollama.
     * Format:
     *   [ {system}, {past user msg}, {past ai msg}, ..., {CURRENT user msg} ]
     *
     * The current user message is always last.
     * We add it separately (not from history) to ensure it's not duplicated.
     */
    private List<Map<String, String>> buildOllamaMessages(
            String systemPrompt,
            List<Message> contextMessages,
            String currentUserMessage) {

        List<Map<String, String>> messages = new ArrayList<>();

        // System message first (always)
        messages.add(ChatCompletionService.buildMessage("system", systemPrompt));

        // Add conversation history (previous exchanges)
        for (Message msg : contextMessages) {
            messages.add(ChatCompletionService.buildMessage(msg.getRole().name(), msg.getContent()));
        }

        // Add the current user message last
        messages.add(ChatCompletionService.buildMessage("user", currentUserMessage));

        return messages;
    }

    /**
     * Returns the previous messages to use as context, excluding the current user message.
     * We limit to maxHistoryMessages to avoid sending too much to Ollama.
     *
     * @param allMessages    - all messages in the conversation (including current)
     * @param currentMsgId   - ID of the current user message (exclude it — added separately)
     */
    private List<Message> getContextMessages(List<Message> allMessages, Long currentMsgId) {
        // Filter out the current user message (we add it manually in buildOllamaMessages)
        List<Message> previous = allMessages.stream()
                .filter(m -> !m.getId().equals(currentMsgId))
                .collect(Collectors.toList());

        // Take only the last N messages (keep most recent context)
        int start = Math.max(0, previous.size() - maxHistoryMessages);
        return previous.subList(start, previous.size());
    }

    // ─── List + Get conversations ─────────────────────────────────────────────

    /** Get all conversations for a chatbot, owned by the current user */
    public List<ConversationResponse> listConversations(Long chatbotId) {
        User currentUser = getCurrentUser();
        Chatbot chatbot = getChatbotOwnedByUser(chatbotId, currentUser.getId());

        return conversationRepository
                .findByChatbotIdAndUserIdOrderByUpdatedAtDesc(chatbotId, currentUser.getId())
                .stream()
                .map(conv -> ConversationResponse.fromConversation(conv, chatbot.getName()))
                .collect(Collectors.toList());
    }

    /** Get one conversation with its full message history */
    public ConversationResponse getConversation(Long conversationId) {
        User currentUser = getCurrentUser();

        Conversation conversation = conversationRepository.findByIdAndUserId(conversationId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found: " + conversationId));

        Chatbot chatbot = chatbotRepository.findById(conversation.getChatbotId())
                .orElseThrow(() -> new ResourceNotFoundException("Chatbot not found"));

        List<MessageResponse> messages = messageRepository
                .findByConversationIdOrderByCreatedAtAsc(conversationId)
                .stream()
                .map(MessageResponse::fromMessage)
                .collect(Collectors.toList());

        return ConversationResponse.fromConversationWithMessages(conversation, chatbot.getName(), messages);
    }

    // ─── Delete conversation ───────────────────────────────────────────────────

    /** Deletes a conversation and all its messages */
    @Transactional
    public void deleteConversation(Long conversationId) {
        User currentUser = getCurrentUser();

        Conversation conversation = conversationRepository.findByIdAndUserId(conversationId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found: " + conversationId));

        // Delete messages first (child records), then the conversation
        messageRepository.deleteByConversationId(conversationId);
        conversationRepository.delete(conversation);

        log.info("Deleted conversation {} with all its messages", conversationId);
    }

    // ─── Private helpers ───────────────────────────────────────────────────────

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found"));
    }

    /**
     * Loads a chatbot and verifies the current user owns it.
     * Ownership check is critical — users must not access other users' chatbots.
     */
    private Chatbot getChatbotOwnedByUser(Long chatbotId, Long userId) {
        return chatbotRepository.findByIdAndUserId(chatbotId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Chatbot not found: " + chatbotId));
    }
}
