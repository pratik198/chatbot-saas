/**
 * WHY this page exists:
 *   The "My Chatbots" list page — shows all chatbots with edit/delete/publish actions.
 *
 * HOW it differs from Next.js version:
 *   - Link and no router needed (navigation is in child components)
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Bot, Loader2, RefreshCw } from 'lucide-react';
import ChatbotCard from '@/components/chatbot/ChatbotCard';
import { getChatbots, deleteChatbot, togglePublish } from '@/lib/chatbots';

export default function ChatbotsPage() {
  const [chatbots, setChatbots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchChatbots = useCallback(async () => {
    try {
      setError('');
      const data = await getChatbots();
      setChatbots(data);
    } catch {
      setError('Failed to load chatbots. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchChatbots(); }, [fetchChatbots]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await deleteChatbot(id);
      setChatbots(prev => prev.filter(bot => bot.id !== id));
    } catch {
      alert('Failed to delete chatbot. Please try again.');
    }
  };

  const handleTogglePublish = async (id) => {
    try {
      const updated = await togglePublish(id);
      setChatbots(prev => prev.map(bot => bot.id === id ? updated : bot));
    } catch {
      alert('Failed to update chatbot status.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">My Chatbots</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {chatbots.length} chatbot{chatbots.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchChatbots} className="btn-secondary flex items-center gap-1.5 text-sm">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <Link to="/chatbots/new" className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Chatbot
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {chatbots.length === 0 && !error && (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mb-4">
            <Bot className="w-8 h-8 text-brand-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No chatbots yet</h3>
          <p className="text-gray-500 text-sm mb-6 max-w-sm">
            Create your first AI chatbot. Customize its personality, appearance, and connect it to your website.
          </p>
          <Link to="/chatbots/new" className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Your First Chatbot
          </Link>
        </div>
      )}

      {chatbots.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {chatbots.map(chatbot => (
            <ChatbotCard
              key={chatbot.id}
              chatbot={chatbot}
              onDelete={handleDelete}
              onTogglePublish={handleTogglePublish}
            />
          ))}
        </div>
      )}
    </div>
  );
}
