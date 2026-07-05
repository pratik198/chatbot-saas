/**
 * WHY this component exists:
 *   "Test Bot" needs to show the real, live chat widget without leaving
 *   the dashboard page (no new tab/window). This renders the existing
 *   /embed/:chatbotId page inside an iframe, in a centered modal —
 *   same chat experience a visitor would get, without navigating away.
 *
 * Props:
 *   chatbotId - id of the published chatbot to preview
 *   onClose   - called when the modal should close
 */
import { X } from 'lucide-react';

export default function TestBotModal({ chatbotId, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm h-[640px] max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          title="Close"
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/90 shadow
                     flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-white
                     transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <iframe
          src={`/embed/${chatbotId}`}
          title="Chatbot test preview"
          className="w-full h-full border-0"
        />
      </div>
    </div>
  );
}
