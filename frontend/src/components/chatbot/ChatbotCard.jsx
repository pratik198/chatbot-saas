
/**
 * WHY this component exists:
 *   Each chatbot in the list page is displayed as a card.
 *   Extracting it as a separate component makes the list page clean
 *   and makes it easy to update the card UI without touching the page.
 *
 * WHAT it does:
 *   Displays one chatbot's info: name, status badges, created date.
 *   Has action buttons: Edit, Publish toggle, Delete.
 *
 * HOW it works:
 *   Pure presentational component — all data and actions passed as props.
 *   Parent (chatbots page) manages the state and passes handlers down.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Edit2, Trash2, Globe, EyeOff, Calendar, MessageCircle } from 'lucide-react';
import TestBotModal from './TestBotModal';

export default function ChatbotCard({ chatbot, onDelete, onTogglePublish }) {
  const [showTest, setShowTest] = useState(false);

  // Format the created date for display
  const createdDate = new Date(chatbot.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="card p-5 hover:shadow-md transition-shadow">
      {/* ── Top: Icon + Name + Badges ───────────────────── */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          {/* Bot avatar with theme color */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: chatbot.themeColor + '20' }} // 20 = 12% opacity hex
          >
            <Bot className="w-5 h-5" style={{ color: chatbot.themeColor }} />
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 leading-tight">{chatbot.name}</h3>
            {chatbot.description && (
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{chatbot.description}</p>
            )}
          </div>
        </div>

        {/* Status badges */}
        <div className="flex flex-col gap-1 items-end">
          {/* Active / Inactive */}
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            chatbot.isActive
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-500'
          }`}>
            {chatbot.isActive ? 'Active' : 'Inactive'}
          </span>

          {/* Published / Draft */}
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            chatbot.isPublished
              ? 'bg-blue-100 text-blue-700'
              : 'bg-yellow-50 text-yellow-700'
          }`}>
            {chatbot.isPublished ? 'Published' : 'Draft'}
          </span>
        </div>
      </div>

      {/* ── Stats Row ────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-4 text-xs text-gray-400">
        <div className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          <span>Created {createdDate}</span>
        </div>
        <div className="flex items-center gap-1">
          <div
            className="w-3 h-3 rounded-full border border-gray-300"
            style={{ backgroundColor: chatbot.themeColor }}
          />
          <span>{chatbot.language?.toUpperCase() || 'EN'}</span>
        </div>
      </div>

      {/* ── Action Buttons ───────────────────────────────── */}
      <div className="flex gap-2 pt-3 border-t border-gray-100">

        {/* Edit button → goes to chatbot builder page */}
        <Link
          to={`/chatbots/${chatbot.id}`}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium
                     text-gray-600 hover:text-brand-600 hover:bg-brand-50
                     py-2 px-3 rounded-lg border border-gray-200 hover:border-brand-300
                     transition-colors"
        >
          <Edit2 className="w-3.5 h-3.5" />
          Edit
        </Link>

        {/* Test button → opens the live embed chat in a modal, right on this page (published bots only) */}
        {chatbot.isPublished && (
          <button
            onClick={() => setShowTest(true)}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium
                       text-green-600 hover:bg-green-50 hover:border-green-300
                       py-2 px-3 rounded-lg border border-gray-200
                       transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Test
          </button>
        )}

        {/* Publish / Unpublish toggle */}
        <button
          onClick={() => onTogglePublish(chatbot.id)}
          className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium
                      py-2 px-3 rounded-lg border transition-colors ${
            chatbot.isPublished
              ? 'text-orange-600 hover:bg-orange-50 border-orange-200 hover:border-orange-300'
              : 'text-blue-600 hover:bg-blue-50 border-blue-200 hover:border-blue-300'
          }`}
        >
          {chatbot.isPublished ? (
            <><EyeOff className="w-3.5 h-3.5" />Unpublish</>
          ) : (
            <><Globe className="w-3.5 h-3.5" />Publish</>
          )}
        </button>

        {/* Delete button */}
        <button
          onClick={() => onDelete(chatbot.id, chatbot.name)}
          className="flex items-center justify-center gap-1.5 text-xs font-medium
                     text-red-500 hover:text-red-700 hover:bg-red-50
                     py-2 px-3 rounded-lg border border-gray-200 hover:border-red-300
                     transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {showTest && (
        <TestBotModal chatbotId={chatbot.id} onClose={() => setShowTest(false)} />
      )}
    </div>
  );
}
