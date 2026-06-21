/**
 * WHY this file exists:
 *   All knowledge base API calls in one place.
 *   Same pattern as chatbots.js — keeps components clean.
 */

import api from './api';

/** Get all documents. Pass chatbotId to filter by chatbot. */
export async function getDocuments(chatbotId = null) {
  const params = chatbotId ? `?chatbotId=${chatbotId}` : '';
  const response = await api.get(`/api/knowledge${params}`);
  return response.data.data;
}

/**
 * Upload a PDF file.
 * Uses FormData (not JSON) because we're sending a binary file.
 *
 * @param {number} chatbotId - which chatbot to add this to
 * @param {File} file        - the PDF File object from <input type="file">
 */
export async function uploadPdf(chatbotId, file) {
  // FormData is how browsers send files — it creates multipart/form-data
  const formData = new FormData();
  formData.append('file', file);

  // Note: don't set Content-Type header — axios sets it automatically
  // including the "boundary" parameter that multipart requires
  const response = await api.post(`/api/knowledge/pdf?chatbotId=${chatbotId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data.data;
}

/** Add a FAQ question-answer pair */
export async function addFaq(chatbotId, question, answer) {
  const response = await api.post('/api/knowledge/faq', { chatbotId, question, answer });
  return response.data.data;
}

/** Add plain text content */
export async function addText(chatbotId, title, content) {
  const response = await api.post('/api/knowledge/text', { chatbotId, title, content });
  return response.data.data;
}

/** Retrain (re-embed) a document */
export async function retrainDocument(id) {
  const response = await api.post(`/api/knowledge/${id}/retrain`);
  return response.data.data;
}

/** Delete a document */
export async function deleteDocument(id) {
  await api.delete(`/api/knowledge/${id}`);
}
