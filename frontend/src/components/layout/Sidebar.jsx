/**
 * Sidebar — floating, glass, collapsible navigation rail.
 *
 * - Floats with a margin + rounded corners + frosted glass (premium look).
 * - Active item has a shared gradient "pill" that slides between items
 *   (Framer Motion layoutId) instead of a hard jump.
 * - Collapsible on desktop (icon-only + tooltips); slides in as a drawer on
 *   mobile with a backdrop.
 * - Grouped nav sections + user card with sign-out at the base.
 *
 * Nav targets and labels are unchanged from the original — routing/behaviour
 * is identical, only the presentation is new.
 */
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Bot, BookOpen, MessageSquare, Users, BarChart2,
  Plug, Settings, CreditCard, LogOut, Headphones, ChevronLeft, PanelLeftClose,
} from 'lucide-react';
import Logo from '@/components/brand/Logo';
import { Avatar, AvatarFallback } from '@/components/ui/Avatar';
import { Tooltip } from '@/components/ui/Tooltip';
import { logout } from '@/lib/auth';
import { cn, initials } from '@/lib/utils';

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Chatbots', href: '/chatbots', icon: Bot },
      { label: 'Knowledge Base', href: '/knowledge', icon: BookOpen },
      { label: 'Conversations', href: '/conversations', icon: MessageSquare },
    ],
  },
  {
    label: 'Growth',
    items: [
      { label: 'Leads', href: '/leads', icon: Users },
      { label: 'Agent Inbox', href: '/agent', icon: Headphones },
      { label: 'Analytics', href: '/analytics', icon: BarChart2 },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { label: 'Integrations', href: '/integrations', icon: Plug },
      { label: 'Settings', href: '/settings', icon: Settings },
      { label: 'Billing', href: '/billing', icon: CreditCard },
    ],
  },
];

function NavItem({ item, active, collapsed, onNavigate }) {
  const Icon = item.icon;
  const link = (
    <Link
      to={item.href}
      onClick={onNavigate}
      className={cn(
        'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
        collapsed && 'justify-center px-0',
        active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {active && (
        <motion.span
          layoutId="sidebar-active-pill"
          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
          className="absolute inset-0 rounded-xl bg-primary/10 ring-1 ring-primary/15"
        />
      )}
      {!active && (
        <span className="absolute inset-0 rounded-xl opacity-0 transition-opacity group-hover:opacity-100 bg-secondary" />
      )}
      <Icon className={cn('relative z-10 h-[18px] w-[18px] shrink-0 transition-transform group-hover:scale-110', active && 'text-primary')} />
      {!collapsed && <span className="relative z-10 truncate">{item.label}</span>}
      {active && !collapsed && (
        <span className="relative z-10 ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
      )}
    </Link>
  );

  return collapsed ? <Tooltip label={item.label} side="right">{link}</Tooltip> : link;
}

export default function Sidebar({ user, collapsed, onToggleCollapse, mobileOpen, onCloseMobile }) {
  const { pathname } = useLocation();
  const isActive = (href) => pathname === href || pathname.startsWith(href + '/');

  return (
    <>
      {/* Mobile backdrop */}
      <div
        onClick={onCloseMobile}
        className={cn(
          'fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm transition-opacity lg:hidden',
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      <aside
        className={cn(
          'fixed z-50 flex flex-col rounded-2xl border border-border glass-strong shadow-elevated',
          'top-3 bottom-3 left-3 transition-[width,transform] duration-300 ease-spring',
          collapsed ? 'w-[76px]' : 'w-[248px]',
          // mobile drawer behaviour
          'max-lg:w-[248px]',
          mobileOpen ? 'max-lg:translate-x-0' : 'max-lg:-translate-x-[110%]',
        )}
      >
        {/* Brand + collapse toggle */}
        <div className={cn('flex h-16 items-center px-4', collapsed ? 'justify-center' : 'justify-between')}>
          <Link to="/dashboard" onClick={onCloseMobile} className="inline-flex items-center">
            {collapsed ? <Logo size={36} /> : <Logo size={34} showWordmark wordmarkClassName="text-[17px]" />}
          </Link>
          {!collapsed && (
            <button
              onClick={onToggleCollapse}
              className="hidden lg:inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto no-scrollbar px-3 py-2">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-4">
              {!collapsed && (
                <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {group.label}
                </p>
              )}
              {collapsed && <div className="mx-auto mb-2 h-px w-8 bg-border" />}
              <ul className="space-y-1">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <NavItem item={item} active={isActive(item.href)} collapsed={collapsed} onNavigate={onCloseMobile} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Expand button when collapsed */}
        {collapsed && (
          <button
            onClick={onToggleCollapse}
            className="mx-auto mb-2 hidden lg:inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Expand sidebar"
          >
            <ChevronLeft className="h-4 w-4 rotate-180" />
          </button>
        )}

        {/* User card */}
        <div className="border-t border-border p-3">
          {user && (
            <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
              <Link to="/profile" onClick={onCloseMobile}>
                <Avatar className="h-9 w-9 ring-2 ring-border">
                  <AvatarFallback>{initials(`${user.firstName || ''} ${user.lastName || ''}`, (user.email || 'U')[0].toUpperCase())}</AvatarFallback>
                </Avatar>
              </Link>
              {!collapsed && (
                <>
                  <Link to="/profile" onClick={onCloseMobile} className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  </Link>
                  <Tooltip label="Sign out">
                    <button
                      onClick={logout}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Sign out"
                    >
                      <LogOut className="h-4 w-4" />
                    </button>
                  </Tooltip>
                </>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
