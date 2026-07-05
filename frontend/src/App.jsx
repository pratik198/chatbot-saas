/**
 * App — route table.
 *
 * Pages are lazy-loaded (React.lazy) so heavy dependencies (Recharts on the
 * analytics/dashboard, the chat surfaces, etc.) split into their own chunks and
 * only download when visited — keeping the initial bundle small. A Suspense
 * boundary provides a graceful fallback; DashboardLayout has its own inner
 * boundary so switching dashboard pages never blanks the shell.
 */
import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/layout/DashboardLayout';
import { LoaderPanel } from '@/components/ui/Spinner';

const LoginPage        = lazy(() => import('./pages/LoginPage'));
const RegisterPage     = lazy(() => import('./pages/RegisterPage'));
const EmbedPage        = lazy(() => import('./pages/EmbedPage'));
const DashboardPage    = lazy(() => import('./pages/DashboardPage'));
const ChatbotsPage     = lazy(() => import('./pages/ChatbotsPage'));
const ChatbotNewPage   = lazy(() => import('./pages/ChatbotNewPage'));
const ChatbotEditPage  = lazy(() => import('./pages/ChatbotEditPage'));
const KnowledgePage    = lazy(() => import('./pages/KnowledgePage'));
const ConversationsPage = lazy(() => import('./pages/ConversationsPage'));
const LeadsPage        = lazy(() => import('./pages/LeadsPage'));
const AnalyticsPage    = lazy(() => import('./pages/AnalyticsPage'));
const AgentPage        = lazy(() => import('./pages/AgentPage'));
const SettingsPage     = lazy(() => import('./pages/SettingsPage'));
const BillingPage      = lazy(() => import('./pages/BillingPage'));
const ProfilePage      = lazy(() => import('./pages/ProfilePage'));
const ComingSoonPage   = lazy(() => import('./pages/ComingSoonPage'));

function FullScreen({ label }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <LoaderPanel label={label} />
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<FullScreen label="Loading…" />}>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/embed/:chatbotId" element={<EmbedPage />} />

        {/* Protected dashboard */}
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/chatbots" element={<ChatbotsPage />} />
          <Route path="/chatbots/new" element={<ChatbotNewPage />} />
          <Route path="/chatbots/:id" element={<ChatbotEditPage />} />
          <Route path="/knowledge" element={<KnowledgePage />} />
          <Route path="/conversations" element={<ConversationsPage />} />
          <Route path="/leads" element={<LeadsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/agent" element={<AgentPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/integrations" element={<ComingSoonPage title="Integrations" phase="soon" />} />
        </Route>

        {/* Redirects */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
