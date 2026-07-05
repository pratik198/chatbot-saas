/**
 * ChatbotCard — one assistant in the grid.
 * Presentational; all data + actions come from props (logic unchanged).
 * Delete now uses a styled confirm dialog instead of window.confirm.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Bot, Pencil, Trash2, Globe, EyeOff, MessageCircle, MoreVertical, BookOpen, Circle,
} from 'lucide-react';
import TestBotModal from './TestBotModal';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/DropdownMenu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from '@/components/ui/Dialog';
import { staggerItem } from '@/components/ui/PageTransition';

export default function ChatbotCard({ chatbot, onDelete, onTogglePublish }) {
  const [showTest, setShowTest] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const color = chatbot.themeColor || '#6366f1';

  const created = new Date(chatbot.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <motion.div variants={staggerItem}>
      <Card hover className="group flex h-full flex-col p-5">
        {/* header */}
        <div className="flex items-start justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm ring-1 ring-black/5"
              style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}>
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-semibold leading-tight text-foreground">{chatbot.name}</h3>
              <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                {chatbot.description || 'No description'}
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground opacity-0 transition-opacity hover:bg-secondary hover:text-foreground focus:outline-none group-hover:opacity-100 data-[state=open]:opacity-100" aria-label="More actions">
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem asChild><Link to={`/chatbots/${chatbot.id}`}><Pencil /> Edit</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to={`/knowledge?chatbotId=${chatbot.id}`}><BookOpen /> Knowledge base</Link></DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onTogglePublish(chatbot.id)}>
                {chatbot.isPublished ? <><EyeOff /> Unpublish</> : <><Globe /> Publish</>}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setConfirmOpen(true)} className="text-destructive focus:bg-destructive/10 [&_svg]:text-destructive">
                <Trash2 /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* badges */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {chatbot.isPublished
            ? <Badge variant="success" dot>Live</Badge>
            : <Badge variant="warning" dot>Draft</Badge>}
          <Badge variant="secondary">
            <Circle className="h-2 w-2" style={{ color, fill: color }} />
            {chatbot.language?.toUpperCase() || 'EN'}
          </Badge>
          <span className="ml-auto text-xs text-muted-foreground">Created {created}</span>
        </div>

        {/* actions */}
        <div className="mt-5 flex gap-2 border-t border-border pt-4">
          <Button asChild variant="outline" size="sm" className="flex-1">
            <Link to={`/chatbots/${chatbot.id}`}><Pencil className="h-3.5 w-3.5" /> Edit</Link>
          </Button>
          {chatbot.isPublished && (
            <Button variant="secondary" size="sm" className="flex-1" onClick={() => setShowTest(true)}>
              <MessageCircle className="h-3.5 w-3.5" /> Test
            </Button>
          )}
          <Button
            size="sm"
            variant={chatbot.isPublished ? 'ghost' : 'default'}
            className="flex-1"
            onClick={() => onTogglePublish(chatbot.id)}
          >
            {chatbot.isPublished ? <><EyeOff className="h-3.5 w-3.5" /> Unpublish</> : <><Globe className="h-3.5 w-3.5" /> Publish</>}
          </Button>
        </div>
      </Card>

      {showTest && <TestBotModal chatbotId={chatbot.id} onClose={() => setShowTest(false)} />}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete "{chatbot.name}"?</DialogTitle>
            <DialogDescription>
              This permanently removes the chatbot and its conversations. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button variant="destructive" onClick={() => { setConfirmOpen(false); onDelete(chatbot.id, chatbot.name); }}>
              <Trash2 className="h-4 w-4" /> Delete chatbot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
