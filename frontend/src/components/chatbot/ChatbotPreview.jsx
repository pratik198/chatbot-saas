
/**
 * WHY this component exists:
 *   The chatbot builder needs a LIVE PREVIEW so the user can see exactly
 *   how their chat widget will look as they type settings.
 *   This mirrors what the real embeddable widget will look like in Phase 6.
 *
 * WHAT it does:
 *   Renders a pixel-accurate simulation of the floating chat widget.
 *   Updates in real time as the user changes: name, color, position, welcome message.
 *
 * HOW it works:
 *   Props-driven component: parent (chatbot builder page) passes the current
 *   form values as props. React re-renders this instantly on every keystroke.
 *   No API call needed — it's purely visual.
 *
 * Props:
 *   name         - chatbot display name in the header
 *   welcomeMessage - first message shown in the chat
 *   themeColor   - hex color for the header and send button
 *   widgetPosition - "bottom-right" or "bottom-left" (shown as label)
 */
export default function ChatbotPreview({ name, welcomeMessage, themeColor, widgetPosition }) {
  // Sensible defaults so the preview always looks good
  const chatName = name || 'My Chatbot';
  const welcome = welcomeMessage || 'Hi there! How can I help you today?';
  const color = themeColor || '#2563eb';

  return (
    <div className="flex flex-col items-center justify-end h-full pb-4">

      {/* Label */}
      <p className="text-xs text-gray-400 mb-3 uppercase tracking-wide font-medium">
        Live Preview · {widgetPosition || 'bottom-right'}
      </p>

      {/* Chat Window */}
      <div className="w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">

        {/* Header — uses the themeColor */}
        <div
          className="p-4 flex items-center gap-3"
          style={{ backgroundColor: color }}
        >
          {/* Bot avatar */}
          <div className="w-9 h-9 bg-white bg-opacity-20 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-bold">
              {chatName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm">{chatName}</p>
            {/* Online indicator */}
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-green-300 rounded-full"></div>
              <p className="text-white text-opacity-80 text-xs opacity-80">Online</p>
            </div>
          </div>
          {/* Minimize button decoration */}
          <div className="ml-auto flex gap-1.5">
            <div className="w-2 h-2 bg-white bg-opacity-30 rounded-full"></div>
            <div className="w-2 h-2 bg-white bg-opacity-30 rounded-full"></div>
          </div>
        </div>

        {/* Messages area */}
        <div className="p-4 bg-gray-50 min-h-40 flex flex-col gap-3">

          {/* Bot welcome message */}
          <div className="flex items-start gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
              style={{ backgroundColor: color }}
            >
              {chatName.charAt(0).toUpperCase()}
            </div>
            <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2 shadow-sm max-w-52">
              <p className="text-sm text-gray-800">{welcome}</p>
            </div>
          </div>

          {/* Example user message */}
          <div className="flex justify-end">
            <div
              className="rounded-2xl rounded-tr-sm px-3 py-2 max-w-40"
              style={{ backgroundColor: color }}
            >
              <p className="text-sm text-white">Hello!</p>
            </div>
          </div>

          {/* Typing indicator */}
          <div className="flex items-start gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
              style={{ backgroundColor: color }}
            >
              {chatName.charAt(0).toUpperCase()}
            </div>
            <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2.5 shadow-sm">
              {/* Three bouncing dots — typing indicator */}
              <div className="flex gap-1 items-center">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Input area */}
        <div className="p-3 bg-white border-t border-gray-100 flex items-center gap-2">
          <input
            readOnly
            placeholder="Type your message..."
            className="flex-1 text-sm text-gray-500 bg-gray-50 rounded-full px-3 py-2 outline-none border border-gray-200"
          />
          {/* Send button */}
          <button
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white"
            style={{ backgroundColor: color }}
          >
            <svg className="w-4 h-4 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>

        {/* Branding footer */}
        <div className="text-center py-1.5 bg-white border-t border-gray-50">
          <p className="text-xs text-gray-300">Powered by ChatBot SaaS</p>
        </div>
      </div>

      {/* Floating bubble — what the user clicks to open the chat */}
      <div className="mt-3 self-end mr-4">
        <button
          className="w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-white"
          style={{ backgroundColor: color }}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
