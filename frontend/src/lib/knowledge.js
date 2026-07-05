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

/**
 * Add many FAQ pairs at once — one "question | answer" pair per line
 * (up to 50,000 pairs). Returns a single Document with status=PROCESSING;
 * poll getDocuments() and watch totalPairs/processedPairs for progress.
 */
export async function addBulkFaqs(chatbotId, faqText) {
  const response = await api.post('/api/knowledge/faq/bulk', { chatbotId, faqText });
  return response.data.data;
}

/**
 * Same as addBulkFaqs, but the pairs come from an uploaded .txt or .pdf file
 * instead of pasted text — for imports too large to comfortably paste.
 */
export async function uploadBulkFaqFile(chatbotId, file) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post(`/api/knowledge/faq/bulk-file?chatbotId=${chatbotId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data.data;
}

/**
 * Upload up to 10 .txt/.pdf files in one request — each becomes its own
 * bulk-import document. Returns an array of Documents.
 */
export async function uploadBulkFaqFiles(chatbotId, files) {
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));
  const response = await api.post(`/api/knowledge/faq/bulk-files?chatbotId=${chatbotId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
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
