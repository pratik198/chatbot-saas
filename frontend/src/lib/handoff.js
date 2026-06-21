import api from './api';

export async function getHandoffs(status = 'ALL') {
  const res = await api.get(`/api/handoffs?status=${status}`);
  return res.data.data;
}

export async function getPendingHandoffCount() {
  const res = await api.get('/api/handoffs/pending-count');
  return res.data.data.count;
}

export async function getHandoff(id) {
  const res = await api.get(`/api/handoffs/${id}`);
  return res.data.data;
}

export async function acceptHandoff(id) {
  const res = await api.put(`/api/handoffs/${id}/accept`);
  return res.data.data;
}

export async function agentReply(id, message) {
  const res = await api.post(`/api/handoffs/${id}/reply`, { message });
  return res.data.data;
}

export async function closeHandoff(id) {
  await api.put(`/api/handoffs/${id}/close`);
}
