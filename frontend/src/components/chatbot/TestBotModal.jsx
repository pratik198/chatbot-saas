/**
 * TestBotModal — renders the live /embed/:chatbotId widget inside a centered,
 * animated modal so owners can test a published bot without leaving the page.
 */
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink } from 'lucide-react';
import { createPortal } from 'react-dom';

export default function TestBotModal({ chatbotId, onClose }) {
  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="relative h-[640px] max-h-[90vh] w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card shadow-elevated"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="absolute right-3 top-3 z-10 flex gap-1.5">
            <a href={`/embed/${chatbotId}`} target="_blank" rel="noreferrer" title="Open in new tab"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow transition-colors hover:bg-white hover:text-slate-900">
              <ExternalLink className="h-4 w-4" />
            </a>
            <button onClick={onClose} title="Close"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow transition-colors hover:bg-white hover:text-slate-900">
              <X className="h-4 w-4" />
            </button>
          </div>
          <iframe src={`/embed/${chatbotId}`} title="Chatbot test preview" className="h-full w-full border-0" />
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
