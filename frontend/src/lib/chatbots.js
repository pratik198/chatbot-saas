/**
 * WHY this file exists:
 *   All chatbot-related API calls live here.
 *   Same pattern as auth.js — keeps API calls out of components.
 *   Components import these functions instead of calling api.js directly.
 *
 * WHAT it does:
 *   Wraps each chatbot API endpoint in a named function.
 *   Each function handles the response unwrapping (response.data.data).
 *
 * HOW it works:
 *   All calls use the api.js Axios instance which auto-attaches the JWT.
 *   Usage: import { getChatbots, createChatbot } from '@/lib/chatbots'
 */

import api from './api';

/** Fetch all chatbots for the current user */
export async function getChatbots() {
  const response = await api.get('/api/chatbots');
  return response.data.data; // unwrap ApiResponse envelope → List<ChatbotResponse>
}

/** Fetch total chatbot count for dashboard stats */
export async function getChatbotCount() {
  const response = await api.get('/api/chatbots/count');
  return response.data.data; // returns a number
}

/** Fetch a single chatbot by ID */
export async function getChatbot(id) {
  const response = await api.get(`/api/chatbots/${id}`);
  return response.data.data;
}

/**
 * Create a new chatbot.
 * @param {object} data - { name, welcomeMessage, description, systemPrompt, themeColor, ... }
 */
export async function createChatbot(data) {
  const response = await api.post('/api/chatbots', data);
  return response.data.data;
}

/**
 * Update an existing chatbot.
 * @param {number} id   - chatbot ID
 * @param {object} data - fields to update
 */
export async function updateChatbot(id, data) {
  const response = await api.put(`/api/chatbots/${id}`, data);
  return response.data.data;
}

/** Toggle published ↔ draft status */
export async function togglePublish(id) {
  const response = await api.patch(`/api/chatbots/${id}/publish`);
  return response.data.data;
}

/**
 * Delete a chatbot permanently.
 * Returns nothing (backend sends 204 No Content).
 */
export async function deleteChatbot(id) {
  await api.delete(`/api/chatbots/${id}`);
}
