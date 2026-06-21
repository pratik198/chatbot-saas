
/**
 * WHY this component exists:
 *   A consistent sidebar navigation is the backbone of a SaaS dashboard.
 *   It lets users quickly jump between sections.
 *   By extracting it as a component, we write it once and use it everywhere.
 *
 * WHAT it does:
 *   - Shows the app logo/brand
 *   - Lists all navigation items with icons
 *   - Highlights the active page
 *   - Shows the logged-in user's name at the bottom
 *   - Has a logout button
 *
 * HOW it works:
 *   - usePathname() from Next.js tells us the current URL path
 *   - We compare each nav item's href to the current path to show active state
 *   - Lucide React provides clean SVG icons
 */

import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Bot,
  BookOpen,
  MessageSquare,
  Users,
  BarChart2,
  Plug,
  Settings,
  CreditCard,
  LogOut,
  Zap,
  Headphones,
} from 'lucide-react';
import { logout } from '@/lib/auth';

// ─── Navigation items ──────────────────────────────────────────────────────────
// Add new items here to extend the sidebar. The icon is a Lucide component.
const navItems = [
  { label: 'Dashboard',      href: '/dashboard',      icon: LayoutDashboard },
  { label: 'Chatbots',       href: '/chatbots',        icon: Bot },
  { label: 'Knowledge Base', href: '/knowledge',       icon: BookOpen },
  { label: 'Conversations',  href: '/conversations',   icon: MessageSquare },
  { label: 'Leads',          href: '/leads',           icon: Users },
  { label: 'Agent Inbox',    href: '/agent',           icon: Headphones },
  { label: 'Analytics',      href: '/analytics',       icon: BarChart2 },
  { label: 'Integrations',   href: '/integrations',    icon: Plug },
  { label: 'Settings',       href: '/settings',        icon: Settings },
  { label: 'Billing',        href: '/billing',         icon: CreditCard },
];

export default function Sidebar({ user }) {
  const location = useLocation();
  const pathname = location.pathname;

  return (
    <aside className="w-64 h-screen bg-white border-r border-gray-200 flex flex-col fixed left-0 top-0">

      {/* ── Logo / Brand ─────────────────────────────────── */}
      <div className="h-16 flex items-center px-6 border-b border-gray-200">
        <div className="flex items-center gap-2">
          {/* Simple icon logo — replace with real logo in production */}
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-semibold text-gray-900">ChatBot SaaS</span>
        </div>
      </div>

      {/* ── Navigation Items ─────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            // Check if this nav item is the currently active page
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
                    transition-colors duration-150
                    ${isActive
                      ? 'bg-brand-50 text-brand-700'   /* Active: blue tint + blue text */
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'  /* Inactive: gray */
                    }
                  `}
                >
                  <Icon
                    className={`w-5 h-5 flex-shrink-0 ${
                      isActive ? 'text-brand-600' : 'text-gray-400'
                    }`}
                  />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ── User Profile + Logout ─────────────────────────── */}
      <div className="border-t border-gray-200 p-4">
        {user && (
          <div className="flex items-center gap-3 mb-3">
            {/* Avatar: shows first letter of first name */}
            <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-semibold text-brand-700">
                {user.firstName?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
        )}

        {/* Logout button */}
        <button
          onClick={logout}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-red-600
                     px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors w-full"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
