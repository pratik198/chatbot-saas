/**
 * WHY this component exists:
 *   All dashboard pages share the same shell: sidebar + navbar + content area.
 *   In React Router, a parent Route with <Outlet /> acts as the layout wrapper.
 *   Child routes render inside the <Outlet /> slot.
 *
 * WHAT it does:
 *   - Checks if user is logged in (redirects to /login if not)
 *   - Renders: Sidebar (left) + Navbar (top) + page content (right)
 *   - <Outlet /> is where the actual page renders (DashboardPage, ChatbotsPage, etc.)
 *
 * HOW React Router layouts work vs Next.js:
 *   Next.js: layout.jsx wraps {children}
 *   React Router: parent Route with element={<DashboardLayout />} renders <Outlet />
 *   Both produce the same result — layout wraps page content.
 */

import { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import ChatWidget from '@/components/chat/ChatWidget';
import { isLoggedIn, getUser } from '@/lib/auth';

// Map URL paths to human-readable page titles for the Navbar
const PAGE_TITLES = {
  '/dashboard':     'Dashboard',
  '/chatbots':      'Chatbots',
  '/knowledge':     'Knowledge Base',
  '/conversations': 'Conversations',
  '/leads':         'Leads',
  '/agent':         'Agent Inbox',
  '/analytics':     'Analytics',
  '/integrations':  'Integrations',
  '/settings':      'Settings',
  '/billing':       'Billing',
  '/profile':       'Profile',
};

export default function DashboardLayout() {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setUser(getUser());
    setChecked(true);
  }, []);

  // Show spinner while checking localStorage
  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-2 text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Not logged in → redirect to login
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }

  // Determine page title from current path (strip trailing /chatbots/:id etc.)
  const basePath = '/' + location.pathname.split('/')[1];
  const pageTitle = PAGE_TITLES[basePath] || 'Dashboard';

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Fixed sidebar on the left — 256px (w-64) wide */}
      <Sidebar user={user} />

      {/* Main content area — shifted right by sidebar width */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        {/* Sticky top navbar */}
        <Navbar title={pageTitle} user={user} />

        {/* Page content — this is where child routes render */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>

      {/* Floating chat widget — visible on every dashboard page (Vodafone-style) */}
      <ChatWidget />
    </div>
  );
}
