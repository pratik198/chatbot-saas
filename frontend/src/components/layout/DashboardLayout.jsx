/**
 * DashboardLayout — the authenticated app shell.
 *
 *   Sidebar (floating, collapsible)  +  Topbar  +  routed page (<Outlet/>)
 *
 * Owns cross-cutting shell state:
 *   - auth gate (redirect to /login)
 *   - sidebar collapse (persisted) + mobile drawer
 *   - ⌘K / Ctrl+K command palette
 *   - per-route fade-in page transition
 */
import { useEffect, useState, useCallback, Suspense } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import CommandPalette from './CommandPalette';
import ChatWidget from '@/components/chat/ChatWidget';
import { LoaderPanel } from '@/components/ui/Spinner';
import { isLoggedIn, getUser } from '@/lib/auth';
import { cn } from '@/lib/utils';

const PAGE_META = {
  '/dashboard':     { title: 'Dashboard',       subtitle: "Here's what's happening across your workspace" },
  '/chatbots':      { title: 'Chatbots',        subtitle: 'Create, train, and deploy AI assistants' },
  '/knowledge':     { title: 'Knowledge Base',  subtitle: 'Feed your chatbots documents and FAQs' },
  '/conversations': { title: 'Conversations',   subtitle: 'Every chat your bots have handled' },
  '/leads':         { title: 'Leads',           subtitle: 'Contacts captured by your chatbots' },
  '/agent':         { title: 'Agent Inbox',     subtitle: 'Live handoffs waiting for a human' },
  '/analytics':     { title: 'Analytics',       subtitle: 'Understand engagement and performance' },
  '/integrations':  { title: 'Integrations',    subtitle: 'Connect Lumina to your stack' },
  '/settings':      { title: 'Settings',        subtitle: 'Workspace and account preferences' },
  '/billing':       { title: 'Billing',         subtitle: 'Plan, usage, and invoices' },
  '/profile':       { title: 'Profile',         subtitle: 'Manage your personal details' },
};

export default function DashboardLayout() {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [checked, setChecked] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('lumina-sidebar-collapsed') === '1');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);

  useEffect(() => {
    setUser(getUser());
    setChecked(true);
  }, []);

  // Close the mobile drawer whenever the route changes
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // ⌘K / Ctrl+K to toggle the command palette
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const toggleCollapse = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem('lumina-sidebar-collapsed', next ? '1' : '0');
      return next;
    });
  }, []);

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoaderPanel label="Loading your workspace…" />
      </div>
    );
  }

  if (!isLoggedIn()) return <Navigate to="/login" replace />;

  const basePath = '/' + location.pathname.split('/')[1];
  const meta = PAGE_META[basePath] || { title: 'Dashboard' };

  return (
    <div className="relative min-h-screen bg-background">
      {/* ambient background wash */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-fuchsia-500/10 blur-[120px]" />
      </div>

      <Sidebar
        user={user}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div
        className={cn(
          'flex min-h-screen flex-col transition-[padding] duration-300 ease-spring',
          collapsed ? 'lg:pl-[100px]' : 'lg:pl-[272px]',
        )}
      >
        <Navbar
          title={meta.title}
          subtitle={meta.subtitle}
          user={user}
          onOpenMobileSidebar={() => setMobileOpen(true)}
          onOpenCommand={() => setCmdOpen(true)}
        />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto w-full max-w-[1400px]"
          >
            <Suspense fallback={<LoaderPanel label="Loading…" />}>
              <Outlet />
            </Suspense>
          </motion.div>
        </main>
      </div>

      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
      <ChatWidget />
    </div>
  );
}
