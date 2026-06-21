/**
 * WHY this file exists:
 *   App.jsx is the root of the React component tree.
 *   It defines ALL routes (URL → Component mappings) using React Router.
 *
 * WHAT it does:
 *   - Maps each URL path to a page component
 *   - Nests dashboard pages inside DashboardLayout (sidebar + navbar)
 *   - /embed/:chatbotId is a standalone page (no dashboard chrome) for the iframe widget
 *   - Redirects / and unknown URLs to /dashboard
 *
 * HOW React Router nested routes work:
 *   <Route element={<DashboardLayout />}>       ← renders layout shell
 *     <Route path="/dashboard" element={...} /> ← layout's <Outlet /> shows this
 *   </Route>
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/layout/DashboardLayout';

// ── Auth pages ──────────────────────────────────────────────────────────────
import LoginPage    from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// ── Dashboard pages ──────────────────────────────────────────────────────────
import DashboardPage     from './pages/DashboardPage';
import ChatbotsPage      from './pages/ChatbotsPage';
import ChatbotNewPage    from './pages/ChatbotNewPage';
import ChatbotEditPage   from './pages/ChatbotEditPage';
import KnowledgePage     from './pages/KnowledgePage';
import ConversationsPage from './pages/ConversationsPage';
import ProfilePage       from './pages/ProfilePage';

// ── Phase 5: Lead Capture ───────────────────────────────────────────────────
import LeadsPage from './pages/LeadsPage';

// ── Phase 6: Embeddable Widget ──────────────────────────────────────────────
import EmbedPage from './pages/EmbedPage';

// ── Phase 7: Analytics ──────────────────────────────────────────────────────
import AnalyticsPage from './pages/AnalyticsPage';

// ── Phase 8: Agent Handoff ──────────────────────────────────────────────────
import AgentPage from './pages/AgentPage';

// ── Phase 9: Settings + Billing ─────────────────────────────────────────────
import SettingsPage from './pages/SettingsPage';
import BillingPage  from './pages/BillingPage';

// ── Placeholder for unbuilt pages ───────────────────────────────────────────
import ComingSoonPage from './pages/ComingSoonPage';

export default function App() {
  return (
    <Routes>

      {/* ── Public Routes (no auth required) ────────────────────────── */}
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* ── Embed Widget Page (standalone — no sidebar/navbar) ──────── */}
      {/* Loaded inside an iframe on external websites. No auth needed. */}
      <Route path="/embed/:chatbotId" element={<EmbedPage />} />

      {/* ── Protected Dashboard Routes (DashboardLayout adds sidebar) ── */}
      <Route element={<DashboardLayout />}>
        <Route path="/dashboard"       element={<DashboardPage />} />

        {/* Phase 2: Chatbot management */}
        <Route path="/chatbots"        element={<ChatbotsPage />} />
        <Route path="/chatbots/new"    element={<ChatbotNewPage />} />
        <Route path="/chatbots/:id"    element={<ChatbotEditPage />} />

        {/* Phase 3: Knowledge base */}
        <Route path="/knowledge"       element={<KnowledgePage />} />

        {/* Phase 4: AI Conversations */}
        <Route path="/conversations"   element={<ConversationsPage />} />

        {/* Phase 5: Lead capture */}
        <Route path="/leads"           element={<LeadsPage />} />

        {/* Phase 7: Analytics */}
        <Route path="/analytics"       element={<AnalyticsPage />} />

        {/* Phase 8: Agent handoff inbox */}
        <Route path="/agent"           element={<AgentPage />} />

        {/* Phase 9: Settings + Billing */}
        <Route path="/settings"        element={<SettingsPage />} />
        <Route path="/billing"         element={<BillingPage />} />

        {/* Profile */}
        <Route path="/profile"         element={<ProfilePage />} />

        {/* Integrations — future phase placeholder */}
        <Route path="/integrations"    element={<ComingSoonPage title="Integrations" phase="Phase 10" />} />
      </Route>

      {/* ── Redirects ────────────────────────────────────────────────── */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />

    </Routes>
  );
}
