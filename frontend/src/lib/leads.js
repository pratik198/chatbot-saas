/**
 * WHY this file exists:
 *   Centralizes all API calls for the Lead Capture feature (Phase 5).
 *   Dashboard owners use these to view and manage leads from their chatbots.
 */

import api from './api';

export async function getAllLeads() {
  const res = await api.get('/api/leads');
  return res.data.data;
}

export async function getUnreadLeadCount() {
  const res = await api.get('/api/leads/unread-count');
  return res.data.data.count;
}

export async function markLeadAsRead(leadId) {
  await api.put(`/api/leads/${leadId}/read`);
}

export async function markAllLeadsAsRead() {
  await api.put('/api/leads/read-all');
}
