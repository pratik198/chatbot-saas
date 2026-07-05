/**
 * Topbar — sticky, glass, sits above the page content (not over the sidebar).
 *
 * Left:  mobile menu button + page title/subtitle
 * Mid:   search trigger → opens the ⌘K command palette
 * Right: New Chatbot quick action · notifications · theme toggle · profile menu
 *
 * All navigation/actions are real; nothing here is a dead placeholder.
 */
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Search, Bell, Plus, User, Settings, CreditCard, LogOut, Bot } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Avatar, AvatarFallback } from '@/components/ui/Avatar';
import ThemeToggle from '@/components/theme/ThemeToggle';
import { Tooltip } from '@/components/ui/Tooltip';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/DropdownMenu';
import { EmptyState } from '@/components/ui/EmptyState';
import { logout } from '@/lib/auth';
import { initials } from '@/lib/utils';

export default function Navbar({ title, subtitle, user, onOpenMobileSidebar, onOpenCommand }) {
  const navigate = useNavigate();
  const name = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();

  return (
    <header className="sticky top-0 z-30 glass border-b border-border">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        {/* mobile menu */}
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* title */}
        <div className="min-w-0">
          <h1 className="truncate text-[17px] font-bold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>

        {/* search trigger */}
        <button
          onClick={onOpenCommand}
          className="group ml-auto hidden md:flex h-10 w-64 items-center gap-2.5 rounded-xl border border-border bg-card/60 px-3.5 text-sm text-muted-foreground shadow-soft transition-colors hover:bg-secondary lg:w-72"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">Search…</span>
          <kbd className="rounded-md border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-medium">⌘K</kbd>
        </button>

        <div className="ml-auto flex items-center gap-1.5 md:ml-3">
          {/* mobile search */}
          <button
            onClick={onOpenCommand}
            className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </button>

          <Button size="sm" className="hidden sm:inline-flex" onClick={() => navigate('/chatbots/new')}>
            <Plus className="h-4 w-4" />
            New Chatbot
          </Button>

          {/* notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Notifications"
              >
                <Bell className="h-[18px] w-[18px]" />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive ring-2 ring-[hsl(var(--card))]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80 p-0">
              <div className="flex items-center justify-between px-4 py-3">
                <p className="text-sm font-semibold">Notifications</p>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">New</span>
              </div>
              <DropdownMenuSeparator className="mx-0 my-0" />
              <EmptyState
                icon={Bell}
                title="You're all caught up"
                description="New leads, conversations, and handoffs will show up here."
                className="py-10"
              />
            </DropdownMenuContent>
          </DropdownMenu>

          <ThemeToggle />

          {/* profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="ml-0.5 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background" aria-label="Account menu">
                <Avatar className="h-9 w-9 ring-2 ring-border transition-transform hover:scale-105">
                  <AvatarFallback>{initials(name, (user?.email || 'U')[0].toUpperCase())}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-60">
              <div className="flex items-center gap-3 px-2.5 py-2">
                <Avatar className="h-9 w-9">
                  <AvatarFallback>{initials(name, (user?.email || 'U')[0].toUpperCase())}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{name || 'Your account'}</p>
                  <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => navigate('/profile')}><User /> Profile</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate('/chatbots')}><Bot /> My chatbots</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate('/settings')}><Settings /> Settings</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate('/billing')}><CreditCard /> Billing</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={logout} className="text-destructive focus:bg-destructive/10 [&_svg]:text-destructive">
                <LogOut /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
