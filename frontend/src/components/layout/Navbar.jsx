
/**
 * WHY this component exists:
 *   The top navbar provides quick access to:
 *   - Current page title (breadcrumb)
 *   - Search
 *   - Notifications
 *   - User account menu
 *
 * WHAT it does:
 *   - Shows the current page title
 *   - Displays the logged-in user's name
 *   - Has a bell icon for notifications (Phase 7)
 *
 * HOW it works:
 *   Receives the page title as a prop from the dashboard layout.
 *   Sits at the top of the main content area (not over the sidebar).
 */

import { Bell, Search } from 'lucide-react';

export default function Navbar({ title, user }) {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-10">

      {/* ── Left: Page Title ──────────────────────────── */}
      <div>
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      </div>

      {/* ── Right: Actions ───────────────────────────── */}
      <div className="flex items-center gap-3">

        {/* Search — placeholder for Phase 7 */}
        <button
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title="Search (coming soon)"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Notifications — placeholder for Phase 7 */}
        <button
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors relative"
          title="Notifications (coming soon)"
        >
          <Bell className="w-5 h-5" />
          {/* Red dot for unread notifications */}
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* User info */}
        {user && (
          <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
            <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-brand-700">
                {user.firstName?.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-sm font-medium text-gray-700 hidden sm:block">
              {user.firstName} {user.lastName}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
