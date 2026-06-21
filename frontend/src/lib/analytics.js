import api from './api';

export async function getOverview() {
  const res = await api.get('/api/analytics/overview');
  return res.data.data;
}

export async function getChatbotStats() {
  const res = await api.get('/api/analytics/chatbots');
  return res.data.data;
}
