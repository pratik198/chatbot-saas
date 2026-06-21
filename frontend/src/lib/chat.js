/**
 * WHY this file exists:
 *   Centralizes all API calls for the chat feature.
 *   Instead of writing fetch() calls in every component,
 *   we define them here once and import where needed.
 *
 * WHAT it does:
 *   - startConversation:    Create a new conversation + get first AI reply
 *   - sendMessage:          Send a message in an existing conversation
 *   - listConversations:    Fetch all conversations for a chatbot
 *   - getConversation:      Fetch one conversation with full message history
 *   - deleteConversation:   Delete a conversation and all its messages
 *
 * HOW it works:
 *   Uses the api.js axios instance which:
 *   - Automatically adds Authorization: Bearer {jwt} header
 *   - Points to the backend at VITE_API_URL
 *   - Handles 401 (token expired) by redirecting to login
 */

import api from './api';

// ─── Start a new conversation ─────────────────────────────────────────────────
/**
 * Creates a new conversation with a chatbot and sends the first message.
 *
 * @param {number} chatbotId - which chatbot to chat with
 * @param {string} message   - the first message text
 * @returns {{ conversationId, userMessage, assistantMessage, conversationTitle }}
 */
export async function startConversation(chatbotId, message) {
  const response = await api.post(`/api/chat/${chatbotId}/conversations`, { message });
  return response.data.data;
}

// ─── Send a message in an existing conversation ───────────────────────────────
/**
 * Sends a message in an existing conversation.
 * The backend runs the full RAG pipeline and returns both messages.
 *
 * @param {number} conversationId - which conversation to continue
 * @param {string} message        - the message text
 * @returns {{ conversationId, userMessage, assistantMessage, conversationTitle }}
 */
export async function sendMessage(conversationId, message) {
  const response = await api.post(`/api/chat/conversations/${conversationId}/messages`, { message });
  return response.data.data;
}

// ─── List conversations ────────────────────────────────────────────────────────
/**
 * Gets all conversations for a chatbot, newest first.
 * Messages are NOT included — call getConversation() for those.
 *
 * @param {number} chatbotId - filter conversations by chatbot
 * @returns {Array} list of conversation objects
 */
export async function listConversations(chatbotId) {
  const response = await api.get(`/api/chat/${chatbotId}/conversations`);
  return response.data.data;
}

// ─── Get one conversation with messages ──────────────────────────────────────
/**
 * Gets a full conversation including all messages.
 * Called when the user clicks on a conversation in the sidebar.
 *
 * @param {number} conversationId
 * @returns {{ id, title, messages: Array }}
 */
export async function getConversation(conversationId) {
  const response = await api.get(`/api/chat/conversations/${conversationId}`);
  return response.data.data;
}

// ─── Delete conversation ──────────────────────────────────────────────────────
/**
 * Deletes a conversation and all its messages.
 *
 * @param {number} conversationId
 */
export async function deleteConversation(conversationId) {
  await api.delete(`/api/chat/conversations/${conversationId}`);
}
